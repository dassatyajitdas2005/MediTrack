/* MediTrack - Role-Based Authentication & Session Manager */

import { db, DATABASE_MODE } from './db.js';
import * as firebaseAuth from './firebase-auth.js';

class AuthService {
  constructor() {
    this.currentUserKey = 'meditrack_current_user';
    this.initSession();
  }


  getCurrentUser() {

    if (DATABASE_MODE === "firebase") {
      return firebaseAuth.getCurrentUser();
    }

    const userJson = localStorage.getItem(this.currentUserKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  setUser(user) {
    localStorage.setItem(this.currentUserKey, JSON.stringify(user));
  }

  async login(email, password = "", role = "admin") {
    if (DATABASE_MODE === "firebase") {
      return await firebaseAuth.login(email, password);
    }
    const users = db.getCollection('users');
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Create user session dynamically if email provided
      user = {
        uid: 'usr_' + Date.now(),
        name: email.split('@')[0].toUpperCase(),
        email: email,
        role: role,
        department: role === 'admin' ? 'Administration' : 'Pharmacy'
      };
    }
    this.setUser(user);
    return user;
  }

  switchRole(targetRole) {
    const users = db.getCollection('users');
    let user = users.find(u => u.role === targetRole);

    if (!user) {
      user = {
        uid: 'usr_switch_' + targetRole,
        name: `Demo ${targetRole.toUpperCase()}`,
        email: `${targetRole}@meditrack.com`,
        role: targetRole,
        department: targetRole === 'admin' ? 'Administration' : 'Pharmacy',
        internId: targetRole === 'student' ? 'INT-101' : null
      };
    }

    this.setUser(user);
    console.log(`[MediTrack Auth] Switched active session role to: ${targetRole}`);
    window.location.reload();
  }

  async logout() {

    if (DATABASE_MODE === "firebase") {
      return await firebaseAuth.logout();
    }

    localStorage.removeItem(this.currentUserKey);
    window.location.href = 'login.html';
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

  checkAuth(allowedRoles = []) {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return false;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      console.warn(`[MediTrack Auth] User role ${user.role} restricted for this page.`);
    }
    return true;
  }
}

export const auth = new AuthService();
