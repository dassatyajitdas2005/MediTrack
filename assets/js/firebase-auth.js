/* MediTrack - Firebase Authentication Module (Production) */

import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const CURRENT_USER_KEY = "meditrack_firebase_user";

/**
 * Register new user → Firebase Auth + Firestore profile
 */
export async function registerUser(email, password, role = "student", extraData = {}) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData = {
      uid: user.uid,
      email: email.toLowerCase(),
      role: role,
      name: extraData.name || email.split("@")[0].toUpperCase(),
      department: extraData.department || (role === "admin" ? "Administration" : "Pharmacy"),
      status: "Active",
      createdAt: new Date().toISOString(),
      ...extraData
    };

    await setDoc(doc(db, "users", user.uid), userData);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));

    return userData;
  } catch (error) {
    console.error("[FirebaseAuth] Registration Error:", error.code, error.message);
    throw error;
  }
}

/**
 * Login → Firebase Auth verify → Firestore se profile fetch
 * Role client se nahi aata, Firestore se aata hai (Security)
 */
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    let userData;
    if (userDoc.exists()) {
      userData = userDoc.data();
    } else {
      // Agar Firestore doc missing hai (rare case)
      userData = {
        uid: user.uid,
        email: user.email,
        role: "student",
        name: user.email.split("@")[0].toUpperCase(),
        department: "Pharmacy",
        status: "Active",
        createdAt: new Date().toISOString()
      };
      await setDoc(userDocRef, userData);
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
    return userData;

  } catch (error) {
    console.error("[FirebaseAuth] Login Error:", error.code, error.message);
    throw error;
  }
}

/**
 * Logout → Firebase se + local cache clear
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
 * Sync access ke liye cached user
 */
export function getCurrentUser() {
  const cachedUser = localStorage.getItem(CURRENT_USER_KEY);
  if (cachedUser) {
    try {
      return JSON.parse(cachedUser);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Background verification — har page load pe Firebase se confirm karta hai
 */
export function checkSession(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists()
        ? userDoc.data()
        : { uid: user.uid, email: user.email, role: "student", name: "User" };

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
      if (callback) callback(userData);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
      if (callback) callback(null);
    }
  });
}