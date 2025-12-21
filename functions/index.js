const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

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
