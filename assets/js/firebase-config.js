// Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCO8vjY0P6AC68bSpYeNXZgjU_xDvldOt8",
    authDomain: "meditrack-e980f.firebaseapp.com",
    projectId: "meditrack-e980f",
    storageBucket: "meditrack-e980f.firebasestorage.app",
    messagingSenderId: "508836617924",
    appId: "1:508836617924:web:75381b9fd9ea4f2257f391",
    measurementId: "G-CEGFGQKDD6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Export Services
export { auth, db, googleProvider };

console.log("✅ Firebase Connected Successfully");