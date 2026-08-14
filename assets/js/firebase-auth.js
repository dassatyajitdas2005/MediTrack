/* MediTrack - Firebase Authentication Module (Student Focused) */

import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const CURRENT_USER_KEY = "meditrack_firebase_user";

/**
 * Login → Verify email → Fetch role → Allow access
 */
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Reload user to get latest emailVerified status
    await reload(user);

    // Check email verification
    if (!user.emailVerified) {
      // Still return user but flag as unverified
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      let userData = userDoc.exists() ? userDoc.data() : {
        uid: user.uid, email: user.email, role: "student", name: "Student"
      };

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
      return { userData, emailVerified: false };
    }

    // Email is verified → fetch full profile
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    let userData;
    if (userDoc.exists()) {
      userData = userDoc.data();
      // Update emailVerified status in Firestore
      await setDoc(userDocRef, { emailVerified: true }, { merge: true });
    } else {
      userData = {
        uid: user.uid,
        email: user.email,
        role: "student",
        name: user.email.split("@")[0],
        department: "Pharmacy",
        status: "active",
        emailVerified: true,
        createdAt: new Date().toISOString()
      };
      await setDoc(userDocRef, userData);
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
    return { userData, emailVerified: true };

  } catch (error) {
    console.error("[FirebaseAuth] Login Error:", error.code, error.message);
    throw error;
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  await sendEmailVerification(user);
  return "Verification email resent!";
}

/**
 * Logout
 */
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("[FirebaseAuth] Logout Error:", error);
  } finally {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = "login.html";
  }
}

/**
 * Get cached user
 */
export function getCurrentUser() {
  const cached = localStorage.getItem(CURRENT_USER_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { return null; }
  }
  return null;
}

/**
 * Background session check
 */
export function checkSession(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await reload(user); // Refresh emailVerified status
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists()
        ? { ...userDoc.data(), emailVerified: user.emailVerified }
        : { uid: user.uid, email: user.email, role: "student", name: "Student", emailVerified: user.emailVerified };

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
      if (callback) callback(userData);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
      if (callback) callback(null);
    }
  });
}