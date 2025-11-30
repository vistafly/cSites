// Firebase Configuration
// Environment variables are loaded from .env file
// See .env.example for required variables

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// ============================================================
// DEVELOPER EMAIL - Used to determine who can finalize contracts
// Add VITE_DEVELOPER_EMAIL=your-email@gmail.com to your .env file
// ============================================================
window.VITE_DEVELOPER_EMAIL = import.meta.env.VITE_DEVELOPER_EMAIL || '';

console.log('=== FIREBASE CONFIG ===');
console.log('Project ID:', firebaseConfig.projectId || 'Not set');
console.log('Developer Email:', window.VITE_DEVELOPER_EMAIL || 'NOT SET - Add VITE_DEVELOPER_EMAIL to .env');
console.log('=======================');

// Validate configuration
if (!firebaseConfig.apiKey) {
    console.error('❌ Firebase configuration error: Missing environment variables!');
    console.error('📝 Please create a .env file based on .env.example');
    console.error('🔑 Add your Firebase credentials from Firebase Console');
}

if (!window.VITE_DEVELOPER_EMAIL) {
    console.error('❌ VITE_DEVELOPER_EMAIL not set in .env file!');
    console.error('📝 Add this line to your .env: VITE_DEVELOPER_EMAIL=your-email@gmail.com');
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

console.log('✅ Firebase initialized successfully');