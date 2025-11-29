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

// Validate configuration
if (!firebaseConfig.apiKey) {
    console.error('❌ Firebase configuration error: Missing environment variables!');
    console.error('📝 Please create a .env file based on .env.example');
    console.error('🔑 Add your Firebase credentials from Firebase Console');
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

console.log('✅ Firebase initialized:', firebaseConfig.projectId || 'No project ID');