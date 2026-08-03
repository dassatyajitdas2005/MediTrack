/* MediTrack - Firebase Authentication Module */

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
 * Register a new user in Firebase Auth and Firestore users collection
 */
export async function registerUser(email, password, role = "student", extraData = {}) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData = {
      uid: user.uid,
      email: email.toLowerCase(),
      role: "student",
      name: extraData.name || email.split("@")[0].toUpperCase(),
      department: extraData.department || (role === "admin" ? "Administration" : "Pharmacy"),
      createdAt: new Date().toISOString(),
      ...extraData
    };

    // Store user metadata profile in Firestore
    await setDoc(doc(db, "users", user.uid), userData);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));

    return userData;
  } catch (error) {
    console.error("[FirebaseAuth] Registration Error:", error);
    throw error;
  }
}

/**
 * Main Firebase Login Function
 */
export async function login(email, password, role = "student") {

  console.log("======== LOGIN ========");
  console.log("Project:", auth.app.options.projectId);
  console.log("Email:", email);
  console.log("Password:", password);

  try {

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch user profile from Firestore 'users' collection
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    let userData;

    if (userDoc.exists()) {

      userData = userDoc.data();

    } else {

      // Fallback profile if record not yet created in Firestore
      userData = {
        uid: user.uid,
        email: user.email,
        role: role,
        name: email.split("@")[0].toUpperCase(),
        department: role === "admin" ? "Administration" : "Pharmacy"
      };

      await setDoc(userDocRef, userData);

    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));

    return userData;

  } catch (error) {

    console.log("Error Code:", error.code);
    console.log("Error Message:", error.message);
    console.log(error);

    throw error;

  }

}

/**
 * Dedicated Admin Login helper
 */
export async function adminLogin(email, password) {
  return await login(email, password, "admin");
}

/**
 * Dedicated Student Login helper
 */
export async function studentLogin(email, password) {
  return await login(email, password, "student");
}

/**
 * Dedicated Supervisor Login helper
 */
export async function supervisorLogin(email, password) {
  return await login(email, password, "supervisor");
}

/**
 * Logout user from Firebase & clear local session cache
 */
export async function logout() {
  try {
    await signOut(auth);
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = "login.html";
  } catch (error) {
    console.error("[FirebaseAuth] Logout Error:", error);
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = "login.html";
  }
}

/**
 * Get cached/active authenticated user profile
 */
export function getCurrentUser() {
  const cachedUser = localStorage.getItem(CURRENT_USER_KEY);
  if (cachedUser) {
    return JSON.parse(cachedUser);
  }
  return auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : null;
}

/**
 * Check and listen to Firebase auth session state changes
 */
export function checkSession(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : { uid: user.uid, email: user.email };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
      if (callback) callback(userData);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
      if (callback) callback(null);
    }
  });
}
