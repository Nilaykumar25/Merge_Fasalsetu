import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxPNWr35PBf-t4nUUnR7PLzI08YzxaG6E",
  authDomain: "annavriddhi-a5d62.firebaseapp.com",
  projectId: "annavriddhi-a5d62",
  storageBucket: "annavriddhi-a5d62.firebasestorage.app",
  messagingSenderId: "1043662956447",
  appId: "1:1043662956447:web:bcff07c1ba961527307faa",
  measurementId: "G-EM935DCMTP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics (only in browser environment)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Auth provider - Google only
export const googleProvider = new GoogleAuthProvider();

export default app;
