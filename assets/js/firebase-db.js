/* MediTrack - Firestore Database Module */

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ==========================================
// 1. USERS COLLECTION (STEP 3)
// ==========================================

export async function getUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  } catch (error) {
    console.error("[Firestore] Error fetching users:", error);
    throw error;
  }
}

export async function getUserById(uid) {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error(`[Firestore] Error fetching user ${uid}:`, error);
    throw error;
  }
}

export async function saveUser(userData) {
  try {
    const uid = userData.uid || userData.id;
    if (!uid) throw new Error("User UID required for saveUser");
    await setDoc(doc(db, "users", uid), userData, { merge: true });
    return { id: uid, ...userData };
  } catch (error) {
    console.error("[Firestore] Error saving user profile:", error);
    throw error;
  }
}

// ==========================================
// 2. INTERNS COLLECTION (STEP 4)
// ==========================================

export async function getInterns() {
  try {
    const querySnapshot = await getDocs(collection(db, "interns"));
    const interns = [];
    querySnapshot.forEach((doc) => {
      interns.push({ id: doc.id, ...doc.data() });
    });
    return interns;
  } catch (error) {
    console.error("[Firestore] Error fetching interns:", error);
    return [];
  }
}

export async function addIntern(internData) {
  try {
    const docId = internData.id || "int_" + Date.now();
    const payload = { ...internData, id: docId, createdAt: new Date().toISOString() };
    await setDoc(doc(db, "interns", docId), payload);
    return payload;
  } catch (error) {
    console.error("[Firestore] Error adding intern:", error);
    throw error;
  }
}

export async function updateIntern(id, internData) {
  try {
    const docRef = doc(db, "interns", id);
    await updateDoc(docRef, internData);
    return { id, ...internData };
  } catch (error) {
    console.error(`[Firestore] Error updating intern ${id}:`, error);
    throw error;
  }
}

export async function deleteIntern(id) {
  try {
    await deleteDoc(doc(db, "interns", id));
    return true;
  } catch (error) {
    console.error(`[Firestore] Error deleting intern ${id}:`, error);
    throw error;
  }
}

// ==========================================
// 3. DOCTORS COLLECTION (STEP 5)
// ==========================================

export async function getDoctors() {
  try {
    const querySnapshot = await getDocs(collection(db, "doctors"));
    const doctors = [];
    querySnapshot.forEach((doc) => {
      doctors.push({ id: doc.id, ...doc.data() });
    });
    return doctors;
  } catch (error) {
    console.error("[Firestore] Error fetching doctors:", error);
    return [];
  }
}

export async function addDoctor(doctorData) {
  try {
    const docId = doctorData.id || "doc_" + Date.now();
    const payload = { ...doctorData, id: docId, createdAt: new Date().toISOString() };
    await setDoc(doc(db, "doctors", docId), payload);
    return payload;
  } catch (error) {
    console.error("[Firestore] Error adding doctor:", error);
    throw error;
  }
}

export async function updateDoctor(id, doctorData) {
  try {
    const docRef = doc(db, "doctors", id);
    await updateDoc(docRef, doctorData);
    return { id, ...doctorData };
  } catch (error) {
    console.error(`[Firestore] Error updating doctor ${id}:`, error);
    throw error;
  }
}

export async function deleteDoctor(id) {
  try {
    await deleteDoc(doc(db, "doctors", id));
    return true;
  } catch (error) {
    console.error(`[Firestore] Error deleting doctor ${id}:`, error);
    throw error;
  }
}

// ==========================================
// 4. ATTENDANCE COLLECTION (STEP 6)
// ==========================================

export async function getAttendance() {
  try {
    const querySnapshot = await getDocs(collection(db, "attendance"));
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return records;
  } catch (error) {
    console.error("[Firestore] Error fetching attendance:", error);
    return [];
  }
}

export async function markAttendance(attendanceData) {
  try {
    const docId = attendanceData.id || (attendanceData.internId && attendanceData.date ? `att_${attendanceData.internId}_${attendanceData.date}` : "att_" + Date.now());
    const payload = { ...attendanceData, id: docId, timestamp: new Date().toISOString() };
    await setDoc(doc(db, "attendance", docId), payload, { merge: true });

    // Automatically update attendance percentage for intern
    if (attendanceData.internId) {
      const allAtt = await getAttendance();
      const internAtt = allAtt.filter(a => a.internId === attendanceData.internId);
      if (internAtt.length > 0) {
        const presentCount = internAtt.filter(a => a.status === 'Present').length;
        const percentage = Math.round((presentCount / internAtt.length) * 100);
        await updateIntern(attendanceData.internId, {
          completedDays: internAtt.length,
          attendancePercentage: percentage
        });
      }
    }

    return payload;
  } catch (error) {
    console.error("[Firestore] Error marking attendance:", error);
    throw error;
  }
}

// ==========================================
// 5. TRAINING COLLECTION (STEP 7)
// ==========================================

export async function getTraining() {
  try {
    const querySnapshot = await getDocs(collection(db, "training"));
    const schedules = [];
    querySnapshot.forEach((doc) => {
      schedules.push({ id: doc.id, ...doc.data() });
    });
    return schedules;
  } catch (error) {
    console.error("[Firestore] Error fetching training schedules:", error);
    return [];
  }
}

export async function updateTraining(id, trainingData) {
  try {
    const docRef = doc(db, "training", id);
    await setDoc(docRef, { ...trainingData, updatedAt: new Date().toISOString() }, { merge: true });
    return { id, ...trainingData };
  } catch (error) {
    console.error(`[Firestore] Error updating training schedule ${id}:`, error);
    throw error;
  }
}

// ==========================================
// 6. CERTIFICATES COLLECTION (STEP 8)
// ==========================================

export async function issueCertificate(certificateData) {
  try {
    const docId = certificateData.id || "cert_" + Date.now();
    const payload = { ...certificateData, id: docId, issuedAt: new Date().toISOString() };
    await setDoc(doc(db, "certificates", docId), payload);
    return payload;
  } catch (error) {
    console.error("[Firestore] Error issuing certificate:", error);
    throw error;
  }
}

// ==========================================
// 7. REPORTS GENERATION (STEP 9)
// ==========================================

export async function getReports() {
  try {
    const interns = await getInterns();
    const attendance = await getAttendance();
    const training = await getTraining();

    return {
      totalInterns: interns.length,
      attendanceRecords: attendance,
      trainingSchedules: training,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("[Firestore] Error generating reports:", error);
    throw error;
  }
}
