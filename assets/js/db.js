/* MediTrack - Database Abstraction Layer (Firestore Production) */

import * as fbDb from './firebase-db.js';

export const DATABASE_MODE = 'firebase';

const db = {
  getInterns() {
    return fbDb.getInterns();
  },

  addIntern(data) {
    return fbDb.addIntern(data);
  },

  updateIntern(id, data) {
    return fbDb.updateIntern(id, data);
  },

  deleteIntern(id) {
    return fbDb.deleteIntern(id);
  },

  getDoctors() {
    return fbDb.getDoctors();
  },

  addDoctor(data) {
    return fbDb.addDoctor(data);
  },

  updateDoctor(id, data) {
    return fbDb.updateDoctor(id, data);
  },

  deleteDoctor(id) {
    return fbDb.deleteDoctor(id);
  },

  getAttendance() {
    return fbDb.getAttendance();
  },

  markAttendance(data) {
    return fbDb.markAttendance(data);
  },

  getTraining() {
    return fbDb.getTraining();
  },

  updateTraining(id, data) {
    return fbDb.updateTraining(id, data);
  },

  getUsers() {
    return fbDb.getUsers();
  },

  getUserById(uid) {
    return fbDb.getUserById(uid);
  },

  saveUser(userData) {
    return fbDb.saveUser(userData);
  },

  addUser(userData) {
    return fbDb.addUser(userData);
  },

  updateUser(id, userData) {
    return fbDb.updateUser(id, userData);
  },

  deleteUser(id) {
    return fbDb.deleteUser(id);
  },

  resetDatabase() {
    console.warn('[MediTrack] Local demo reset disabled in production Firestore mode.');
    return Promise.resolve();
  }
};

export { db };