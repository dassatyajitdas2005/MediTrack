/* MediTrack - Auth with Email OTP (EmailJS + Firebase) */

import { auth as firebaseAuth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const CACHE_KEY = "meditrack_firebase_user";

/* ========== TOAST UTILITY ========== */
function showToast(message, type = "info") {
  const container = document.getElementById('toast-container') || (() => {
    const div = document.createElement('div');
    div.id = 'toast-container';
    div.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:8px;';
    document.body.appendChild(div);
    return div;
  })();

  const colors = {
    success: 'var(--success, #10b981)',
    error: 'var(--danger, #ef4444)',
    warning: 'var(--warning, #f59e0b)',
    info: 'var(--primary, #0ea5e9)'
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: var(--bg-card, #1e293b);
    color: var(--text-main, #f1f5f9);
    padding: 12px 16px;
    border-radius: var(--radius-md, 8px);
    border-left: 4px solid ${colors[type] || colors.info};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-size: 14px;
    max-width: 320px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* Keyframe styles injected once */
if (!document.getElementById('toast-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `
    @keyframes slideIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
  `;
  document.head.appendChild(style);
}

/* ========== EMAILJS CONFIG ========== */
const EMAILJS_SERVICE_ID = "service_uo94xqw";
const EMAILJS_TEMPLATE_ID = "template_o20d58n";
const EMAILJS_PUBLIC_KEY = "LulSbKJYpK3hD76AA";

/* ========== HELPERS ========== */
function saveCache(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); }
  catch { return null; }
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getExpiry(minutes = 10) {
  return new Date(Date.now() + minutes * 60000).toISOString();
}

/* ========== EMAILJS INIT & SEND ========== */
function initEmailJS() {
  if (window.emailjs && !window.emailjs._initialized) {
    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    window.emailjs._initialized = true;
  }
}

async function sendOTPEmail(email, otp, name) {
  initEmailJS();

  if (!window.emailjs) {
    console.warn("EmailJS not loaded. TEST OTP:", otp);
    return { testMode: true, otp };
  }

  try {
    const result = await window.emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        email: email,           // Matches {{email}} in template
        to_name: name || email.split("@")[0],  // Matches {{to_name}}
        otp: otp                // Matches {{otp}}
      }
    );
    console.log("EmailJS success:", result);
    return { success: true };
  } catch (err) {
    console.error("EmailJS error:", err);
    throw new Error("Failed to send OTP. Please try again.");
  }
}

/* ========== AUTH SERVICE ========== */
class AuthService {
  constructor() {
    this._redirectIfNeeded();
  }

  _redirectIfNeeded() {
    const page = window.location.pathname.split("/").pop();
    const publicPages = ["login.html", "signup.html", "verify-otp.html", "index.html", ""];
    if (!readCache() && !publicPages.includes(page)) {
      window.location.replace("login.html");
    }
  }

  async init() {
    return new Promise((resolve) => {
      onAuthStateChanged(firebaseAuth, async (user) => {
        if (!user) {
          clearCache();
          resolve(null);
          return;
        }
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) saveCache(snap.data());
        } catch (err) {
          console.warn("Firestore sync failed:", err);
        }
        resolve(readCache());
      });
    });
  }

  getCurrentUser() {
    return readCache();
  }

  isEmailVerified() {
    const user = readCache();
    return user ? user.emailVerified === true : false;
  }

  isAdmin() {
    const user = readCache();
    return user ? user.role === 'admin' : false;
  }

  isStudent() {
    const user = readCache();
    return user ? user.role === 'student' : false;
  }

  /* ========== LOGIN ========== */
  async login(email, password) {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const firebaseUser = cred.user;

    let userData;
    try {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      userData = snap.exists() ? snap.data() : null;
    } catch (err) {
      console.warn("Firestore read failed");
    }

    if (!userData) {
      userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.email.split("@")[0],
        role: "student",
        department: "Pharmacy",
        status: "active",
        emailVerified: false
      };
    }

    saveCache(userData);

    if (!userData.emailVerified) {
      await this._createAndSendOTP(firebaseUser.uid, firebaseUser.email, userData.name);
      return { userData, needsVerification: true };
    }

    return { userData, needsVerification: false };
  }

  /* ========== REGISTER ========== */
  async register(email, password, name) {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const firebaseUser = cred.user;

    const profile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: name || firebaseUser.email.split("@")[0],
      role: "student",
      department: "Pharmacy",
      status: "active",
      emailVerified: false,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "users", firebaseUser.uid), profile);
    } catch (err) {
      console.warn("Firestore write failed:", err);
    }

    saveCache({ ...profile, emailVerified: false, createdAt: new Date().toISOString() });

    const result = await this._createAndSendOTP(firebaseUser.uid, firebaseUser.email, profile.name);
    return { uid: firebaseUser.uid, ...result, message: "OTP sent to your email!" };
  }

  /* ========== OTP INTERNAL ========== */
  async _createAndSendOTP(uid, email, name) {
    const otp = generateOTP();
    const expiresAt = getExpiry(10);

    await setDoc(doc(db, "otps", uid), {
      code: otp,
      email: email,
      expiresAt: expiresAt,
      createdAt: serverTimestamp(),
      attempts: 0
    });

    return await sendOTPEmail(email, otp, name);
  }

  /* ========== VERIFY OTP ========== */
  async verifyOTP(enteredOTP) {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error("Session expired. Please login again.");

    const otpDocRef = doc(db, "otps", user.uid);
    const otpSnap = await getDoc(otpDocRef);

    if (!otpSnap.exists()) {
      throw new Error("OTP expired. Please resend.");
    }

    const data = otpSnap.data();

    if (new Date() > new Date(data.expiresAt)) {
      await deleteDoc(otpDocRef);
      throw new Error("OTP expired. Please resend.");
    }

    if ((data.attempts || 0) >= 3) {
      await deleteDoc(otpDocRef);
      throw new Error("Too many failed attempts. Please resend.");
    }

    if (data.code !== enteredOTP.trim()) {
      await updateDoc(otpDocRef, { attempts: (data.attempts || 0) + 1 });
      throw new Error(`Invalid OTP. ${3 - (data.attempts || 0)} attempts left.`);
    }

    await updateDoc(doc(db, "users", user.uid), { emailVerified: true });
    await deleteDoc(otpDocRef);

    const cached = readCache();
    if (cached) {
      cached.emailVerified = true;
      saveCache(cached);
    }

    return "Email verified successfully!";
  }

  /* ========== RESEND OTP ========== */
  async resendOTP() {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error("Please login first.");

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const name = userSnap.exists() ? userSnap.data().name : user.email;

    return await this._createAndSendOTP(user.uid, user.email, name);
  }

  /* ========== LOGOUT ========== */
  async logout() {
    await signOut(firebaseAuth);
    clearCache();
    window.location.href = "login.html";
  }

  /* ========== GUARD ========== */
  async checkAuth(allowedRoles = []) {

    const user = await this.init(); // 🔥 Firestore se latest data

    if (!user) {
      window.location.replace("login.html");
      return false;
    }

    const page = window.location.pathname.split("/").pop();

    if (!this.isEmailVerified() && page !== "verify-otp.html") {
      window.location.replace("verify-otp.html");
      return false;
    }

    // 🔥 ROLE CHECK (FIXED)
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      showToast("Access Denied"); // alert hata diya
      window.location.replace("dashboard.html");
      return false;
    }

    return true;
  }
}

export const auth = new AuthService();