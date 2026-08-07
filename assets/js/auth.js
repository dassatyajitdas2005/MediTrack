/* MediTrack - Role-Based Authentication & Session Manager (Firebase Only) */

import * as firebaseAuth from './firebase-auth.js';

class AuthService {
  constructor() {
    this.currentUserKey = 'meditrack_firebase_user';
    // Page khulte hi immediate check — agar cache nahi hai toh login pe bhejo
    this.syncRedirect();
  }

  /**
   * Immediate sync check (localStorage cache se)
   * Firebase async hota hai, isliye pehle cache check karte hain
   */
  syncRedirect() {
    const currentPath = window.location.pathname.split('/').pop();
    const isPublicPage = ['login.html', 'signup.html', 'index.html', ''].includes(currentPath);
    const cached = localStorage.getItem(this.currentUserKey);

    if (!cached && !isPublicPage) {
      window.location.replace('login.html');
    }
  }

  /**
   * Async verification — har page ke JS mein call karo
   * Example: await auth.init();
   */
  async init() {
    return new Promise((resolve) => {
      firebaseAuth.checkSession((userData) => {
        const currentPath = window.location.pathname.split('/').pop();
        const isPublicPage = ['login.html', 'signup.html', 'index.html', ''].includes(currentPath);

        if (!userData && !isPublicPage) {
          window.location.replace('login.html');
          resolve(null);
          return;
        }
        resolve(userData);
      });
    });
  }

  getCurrentUser() {
    return firebaseAuth.getCurrentUser();
  }

  async login(email, password) {
    return await firebaseAuth.login(email, password);
  }

  async register(email, password, name, role) {
    return await firebaseAuth.registerUser(email, password, role, { name });
  }

  async logout() {
    await firebaseAuth.logout();
  }

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
  }

  isStudent() {
    const user = this.getCurrentUser();
    return user && user.role === 'student';
  }

  isSupervisor() {
    const user = this.getCurrentUser();
    return user && user.role === 'supervisor';
  }

  /**
   * Page-level route guard
   * Usage: auth.checkAuth(['admin']) → sirf admin allow
   */
  checkAuth(allowedRoles = []) {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.replace('login.html');
      return false;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      console.warn(`[Auth] Access denied for role: ${user.role}`);
      alert("Access Denied: You don't have permission to view this page.");
      window.location.replace('dashboard.html');
      return false;
    }
    return true;
  }
}

export const auth = new AuthService();