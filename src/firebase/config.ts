/**
 * Firebase Architecture & Setup Configuration
 * 
 * According to your Architecture Strategy:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project called "Didula Saloon"
 * 3. Add a Web App to get your configuration credentials
 * 4. Enable Authentication (Email/Password or Phone/Google)
 * 5. Create Cloud Firestore in test or production mode
 * 
 * Once ready, paste your config in an .env file or directly below:
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyMockKeyForLocalPreview",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "saloon-aquiness.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "saloon-aquiness",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "saloon-aquiness.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

export const isFirebaseConfigured = (): boolean => {
  return (
    Boolean(import.meta.env.VITE_FIREBASE_API_KEY) &&
    import.meta.env.VITE_FIREBASE_API_KEY !== "AIzaSyMockKeyForLocalPreview"
  );
};
