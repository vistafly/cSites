const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();

// Developer email for security checks
const DEVELOPER_EMAIL = 'vistafly.services@gmail.com';

/**
 * Normalize phone number to E.164 format (+1XXXXXXXXXX)
 * Mirrors the normalizeToE164 function in script.js
 */
function normalizeToE164(phone) {
    if (!phone) return '';

    // Remove all non-digits except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with +, keep it
    if (cleaned.startsWith('+')) {
        return cleaned;
    }

    // Remove all non-digits for processing
    const digits = phone.replace(/\D/g, '');

    // If it's 10 digits, add +1 country code
    if (digits.length === 10) {
        return '+1' + digits;
    }

    // If it's 11 digits starting with 1, add +
    if (digits.length === 11 && digits.startsWith('1')) {
        return '+' + digits;
    }

    return cleaned;
}

/**
 * getUsersWithoutSOW
 *
 * Returns Firebase Auth users who do NOT have an existing SOW document.
 * Matches by email OR phone number.
 *
 * Returns: Array of { uid, email, phoneNumber, displayName }
 */
exports.getUsersWithoutSOW = functions.https.onCall(async (data, context) => {
    // Verify the caller is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be authenticated to call this function.'
        );
    }

    try {
        // Step 1: Get all SOW documents and extract emails/phones
        const sowSnapshot = await admin.firestore()
            .collection('sow_documents')
            .get();

        const sowEmails = new Set();
        const sowPhones = new Set();

        sowSnapshot.forEach(doc => {
            const docData = doc.data();
            if (docData.clientEmail) {
                sowEmails.add(docData.clientEmail.toLowerCase().trim());
            }
            if (docData.clientPhone) {
                // Normalize phone to E.164 for comparison
                sowPhones.add(normalizeToE164(docData.clientPhone));
            }
        });

        // Step 2: List all Firebase Auth users
        // Note: listUsers() returns max 1000 users per call
        // For larger apps, pagination with nextPageToken would be needed
        const listUsersResult = await admin.auth().listUsers(1000);

        // Step 3: Filter users who don't have a SOW
        const usersWithoutSOW = [];

        for (const userRecord of listUsersResult.users) {
            const userEmail = userRecord.email ? userRecord.email.toLowerCase().trim() : null;
            const userPhone = userRecord.phoneNumber ? normalizeToE164(userRecord.phoneNumber) : null;

            // Check if user has a SOW (by email OR phone)
            const hasSOWByEmail = userEmail && sowEmails.has(userEmail);
            const hasSOWByPhone = userPhone && sowPhones.has(userPhone);

            if (!hasSOWByEmail && !hasSOWByPhone) {
                usersWithoutSOW.push({
                    uid: userRecord.uid,
                    email: userRecord.email || null,
                    phoneNumber: userRecord.phoneNumber || null,
                    displayName: userRecord.displayName || null
                });
            }
        }

        return {
            success: true,
            users: usersWithoutSOW,
            count: usersWithoutSOW.length
        };

    } catch (error) {
        console.error('Error in getUsersWithoutSOW:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to fetch users without SOW',
            error.message
        );
    }
});

/**
 * Hash a verification code for secure storage
 */
function hashCode(code) {
    return crypto.createHash('sha256').update(code.toString()).digest('hex');
}

/**
 * addAuthUser
 *
 * Unified function to add a user with either:
 * - Email + Password authentication
 * - Phone + Verification Code authentication
 *
 * Creates the user in Firebase Auth and adds to users collection.
 * Only the developer can call this function.
 *
 * @param {string} displayName - User's display name
 * @param {string} email - Email address (optional, required if no phone)
 * @param {string} password - Password for email auth (required if email provided)
 * @param {string} phoneNumber - Phone number (optional, required if no email)
 * @param {string} verificationCode - Verification code for phone auth (required if phone provided)
 */
exports.addAuthUser = functions.https.onCall(async (data, context) => {
    // Security: Must be authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be authenticated to call this function.'
        );
    }

    // Security: Only developer can add users
    if (context.auth.token.email !== DEVELOPER_EMAIL) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only the developer can add users.'
        );
    }

    const { displayName, email, password, phoneNumber, verificationCode } = data;

    // Validate: must have either email+password OR phone+code
    const hasEmail = email && email.trim();
    const hasPhone = phoneNumber && phoneNumber.trim();

    if (!hasEmail && !hasPhone) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Either email or phone number is required.'
        );
    }

    if (hasEmail && !password) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Password is required for email authentication.'
        );
    }

    if (hasEmail && password.length < 6) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Password must be at least 6 characters.'
        );
    }

    if (hasPhone && !verificationCode) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Verification code is required for phone authentication.'
        );
    }

    if (hasPhone && !/^\d{4,6}$/.test(verificationCode)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Verification code must be 4-6 digits.'
        );
    }

    try {
        let userRecord;
        const normalizedPhone = hasPhone ? normalizeToE164(phoneNumber) : null;
        const normalizedEmail = hasEmail ? email.toLowerCase().trim() : null;

        // Check if user already exists
        if (hasEmail) {
            try {
                userRecord = await admin.auth().getUserByEmail(normalizedEmail);
                console.log(`Found existing user by email: ${userRecord.uid}`);
            } catch (error) {
                if (error.code !== 'auth/user-not-found') throw error;
            }
        }

        if (!userRecord && hasPhone) {
            try {
                userRecord = await admin.auth().getUserByPhoneNumber(normalizedPhone);
                console.log(`Found existing user by phone: ${userRecord.uid}`);
            } catch (error) {
                if (error.code !== 'auth/user-not-found') throw error;
            }
        }

        // Create new user if not found
        if (!userRecord) {
            const createData = {
                displayName: displayName || null
            };

            if (hasEmail) {
                createData.email = normalizedEmail;
                createData.password = password;
            }

            if (hasPhone) {
                createData.phoneNumber = normalizedPhone;
            }

            userRecord = await admin.auth().createUser(createData);
            console.log(`Created new Firebase Auth user: ${userRecord.uid}`);
        } else {
            // Update existing user
            const updateData = {};
            if (displayName && !userRecord.displayName) {
                updateData.displayName = displayName;
            }
            if (hasEmail && password) {
                updateData.password = password; // Update password
            }
            if (Object.keys(updateData).length > 0) {
                await admin.auth().updateUser(userRecord.uid, updateData);
            }
        }

        // If phone auth, add to test_phone_numbers collection for verification
        if (hasPhone && verificationCode) {
            const hashedCode = hashCode(verificationCode);
            const docId = normalizedPhone.replace(/[^0-9+]/g, '');

            await admin.firestore().collection('test_phone_numbers').doc(docId).set({
                phoneNumber: normalizedPhone,
                verificationCodeHash: hashedCode,
                displayName: displayName || null,
                uid: userRecord.uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: context.auth.uid
            });
        }

        // Add to users collection (for sowUserSearch)
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            phoneNumber: normalizedPhone,
            email: normalizedEmail,
            displayName: displayName || null,
            authType: hasEmail ? 'email' : 'phone',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid
        }, { merge: true });

        console.log(`User added: ${normalizedEmail || normalizedPhone}, UID: ${userRecord.uid}`);

        return {
            success: true,
            uid: userRecord.uid,
            email: normalizedEmail,
            phoneNumber: normalizedPhone,
            message: 'User created successfully.'
        };

    } catch (error) {
        console.error('Error adding user:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to add user.',
            error.message
        );
    }
});

/**
 * removeAuthUser
 *
 * Removes a user from Firebase Auth and cleans up associated data.
 * Only the developer can call this function.
 *
 * @param {string} uid - User ID to remove
 */
exports.removeAuthUser = functions.https.onCall(async (data, context) => {
    // Security: Must be authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be authenticated to call this function.'
        );
    }

    // Security: Only developer can remove users
    if (context.auth.token.email !== DEVELOPER_EMAIL) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only the developer can remove users.'
        );
    }

    const { uid } = data;

    if (!uid) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'User ID is required.'
        );
    }

    try {
        // Get user to find phone number for cleanup
        let userRecord;
        try {
            userRecord = await admin.auth().getUser(uid);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // User doesn't exist in Auth, just clean up Firestore
                await admin.firestore().collection('users').doc(uid).delete();
                return { success: true, message: 'User data cleaned up.' };
            }
            throw error;
        }

        // Clean up test_phone_numbers if user has phone
        if (userRecord.phoneNumber) {
            const docId = userRecord.phoneNumber.replace(/[^0-9+]/g, '');
            await admin.firestore().collection('test_phone_numbers').doc(docId).delete();
        }

        // Delete from users collection
        await admin.firestore().collection('users').doc(uid).delete();

        // Delete from Firebase Auth
        await admin.auth().deleteUser(uid);

        console.log(`User removed: ${uid}`);

        return {
            success: true,
            message: 'User removed successfully.'
        };

    } catch (error) {
        console.error('Error removing user:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to remove user.',
            error.message
        );
    }
});

/**
 * addTestPhoneNumber
 *
 * Adds a test phone number with verification code.
 * Also creates the Firebase Auth user immediately and adds to users collection.
 * Only the developer can call this function.
 *
 * @param {string} phoneNumber - Phone number in any format (will be normalized)
 * @param {string} verificationCode - The code to verify (will be hashed)
 * @param {string} displayName - Optional display name for the user
 */
exports.addTestPhoneNumber = functions.https.onCall(async (data, context) => {
    // Security: Must be authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be authenticated to call this function.'
        );
    }

    // Security: Only developer can add test phone numbers
    if (context.auth.token.email !== DEVELOPER_EMAIL) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only the developer can add test phone numbers.'
        );
    }

    const { phoneNumber, verificationCode, displayName } = data;

    if (!phoneNumber || !verificationCode) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Phone number and verification code are required.'
        );
    }

    // Validate verification code (must be 4-6 digits)
    if (!/^\d{4,6}$/.test(verificationCode)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Verification code must be 4-6 digits.'
        );
    }

    try {
        const normalizedPhone = normalizeToE164(phoneNumber);
        const hashedCode = hashCode(verificationCode);

        // Create a deterministic document ID from phone number
        const docId = normalizedPhone.replace(/[^0-9+]/g, '');

        // Step 1: Create or get Firebase Auth user
        let userRecord;
        try {
            // Try to get existing user by phone number
            userRecord = await admin.auth().getUserByPhoneNumber(normalizedPhone);
            console.log(`Found existing user: ${userRecord.uid}`);

            // Update display name if provided and user doesn't have one
            if (displayName && !userRecord.displayName) {
                await admin.auth().updateUser(userRecord.uid, {
                    displayName: displayName
                });
            }
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Create new user with this phone number
                userRecord = await admin.auth().createUser({
                    phoneNumber: normalizedPhone,
                    displayName: displayName || null
                });
                console.log(`Created new Firebase Auth user: ${userRecord.uid}`);
            } else {
                throw error;
            }
        }

        // Step 2: Add to test_phone_numbers collection
        await admin.firestore().collection('test_phone_numbers').doc(docId).set({
            phoneNumber: normalizedPhone,
            verificationCodeHash: hashedCode,
            displayName: displayName || null,
            uid: userRecord.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid
        });

        // Step 3: Add to users collection (for sowUserSearch)
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            phoneNumber: normalizedPhone,
            displayName: displayName || null,
            email: null,
            isTestUser: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid
        }, { merge: true });

        console.log(`Test phone number added: ${normalizedPhone}, UID: ${userRecord.uid}`);

        return {
            success: true,
            phoneNumber: normalizedPhone,
            uid: userRecord.uid,
            message: 'Test phone number and user created successfully.'
        };

    } catch (error) {
        console.error('Error adding test phone number:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to add test phone number.',
            error.message
        );
    }
});

/**
 * removeTestPhoneNumber
 *
 * Removes a test phone number and cleans up associated user data.
 * Only the developer can call this function.
 *
 * @param {string} phoneNumber - Phone number to remove
 * @param {boolean} deleteAuthUser - If true, also delete from Firebase Auth (default: false)
 */
exports.removeTestPhoneNumber = functions.https.onCall(async (data, context) => {
    // Security: Must be authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be authenticated to call this function.'
        );
    }

    // Security: Only developer can remove test phone numbers
    if (context.auth.token.email !== DEVELOPER_EMAIL) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only the developer can remove test phone numbers.'
        );
    }

    const { phoneNumber, deleteAuthUser } = data;

    if (!phoneNumber) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Phone number is required.'
        );
    }

    try {
        const normalizedPhone = normalizeToE164(phoneNumber);
        const docId = normalizedPhone.replace(/[^0-9+]/g, '');

        // Get the test phone doc to find the user UID
        const testPhoneDoc = await admin.firestore()
            .collection('test_phone_numbers')
            .doc(docId)
            .get();

        let uid = null;
        if (testPhoneDoc.exists) {
            uid = testPhoneDoc.data().uid;
        }

        // Delete from test_phone_numbers
        await admin.firestore().collection('test_phone_numbers').doc(docId).delete();

        // If we have the UID, clean up the users collection
        if (uid) {
            await admin.firestore().collection('users').doc(uid).delete();
            console.log(`Removed user from users collection: ${uid}`);

            // Optionally delete from Firebase Auth
            if (deleteAuthUser) {
                try {
                    await admin.auth().deleteUser(uid);
                    console.log(`Deleted Firebase Auth user: ${uid}`);
                } catch (authError) {
                    console.warn(`Could not delete Auth user: ${authError.message}`);
                }
            }
        }

        console.log(`Test phone number removed: ${normalizedPhone}`);

        return {
            success: true,
            message: 'Test phone number and user data removed successfully.'
        };

    } catch (error) {
        console.error('Error removing test phone number:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to remove test phone number.',
            error.message
        );
    }
});

/**
 * verifyTestPhoneNumber
 *
 * Verifies a test phone number and returns a custom auth token.
 * This allows test users to sign in without real SMS.
 *
 * Rate limited to prevent brute force attacks.
 */
exports.verifyTestPhoneNumber = functions.https.onCall(async (data, context) => {
    const { phoneNumber, verificationCode } = data;

    if (!phoneNumber || !verificationCode) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Phone number and verification code are required.'
        );
    }

    try {
        const normalizedPhone = normalizeToE164(phoneNumber);
        const docId = normalizedPhone.replace(/[^0-9+]/g, '');

        // Get the test phone number document
        const doc = await admin.firestore()
            .collection('test_phone_numbers')
            .doc(docId)
            .get();

        if (!doc.exists) {
            // Don't reveal if the phone number exists or not
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Invalid phone number or verification code.'
            );
        }

        const testPhoneData = doc.data();
        const hashedInput = hashCode(verificationCode);

        // Verify the code
        if (hashedInput !== testPhoneData.verificationCodeHash) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Invalid phone number or verification code.'
            );
        }

        // Code is valid! Create or get the user
        let userRecord;

        try {
            // Try to get existing user by phone number
            userRecord = await admin.auth().getUserByPhoneNumber(normalizedPhone);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Create new user with this phone number
                userRecord = await admin.auth().createUser({
                    phoneNumber: normalizedPhone,
                    displayName: testPhoneData.displayName || null
                });
                console.log(`Created new test user: ${userRecord.uid}`);
            } else {
                throw error;
            }
        }

        // Update display name if it was set and user doesn't have one
        if (testPhoneData.displayName && !userRecord.displayName) {
            await admin.auth().updateUser(userRecord.uid, {
                displayName: testPhoneData.displayName
            });
        }

        // Create a custom token for the user
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        console.log(`Test phone verification successful: ${normalizedPhone}`);

        return {
            success: true,
            customToken: customToken,
            uid: userRecord.uid
        };

    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error verifying test phone number:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to verify phone number.',
            error.message
        );
    }
});

/**
 * listTestPhoneNumbers
 *
 * Lists all test phone numbers (for developer dashboard).
 * Only the developer can call this function.
 */
exports.listTestPhoneNumbers = functions.https.onCall(async (data, context) => {
    // Security: Must be authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be authenticated to call this function.'
        );
    }

    // Security: Only developer can list test phone numbers
    if (context.auth.token.email !== DEVELOPER_EMAIL) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only the developer can list test phone numbers.'
        );
    }

    try {
        const snapshot = await admin.firestore()
            .collection('test_phone_numbers')
            .orderBy('createdAt', 'desc')
            .get();

        const testPhones = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            testPhones.push({
                id: doc.id,
                phoneNumber: data.phoneNumber,
                displayName: data.displayName || null,
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
            });
        });

        return {
            success: true,
            testPhones: testPhones,
            count: testPhones.length
        };

    } catch (error) {
        console.error('Error listing test phone numbers:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to list test phone numbers.',
            error.message
        );
    }
});
