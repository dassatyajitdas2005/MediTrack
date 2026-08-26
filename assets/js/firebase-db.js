/* MediTrack - Firestore Database Module with Smart Caching & SWR */

import { db } from "./firebase-config.js";
import { auth as firebaseAuth } from "./firebase-config.js";
import { CacheManager } from "./cache.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Export CacheManager so modules can perform explicit cache checks or invalidations
export { CacheManager };

// ==========================================
// 1. USERS COLLECTION
// ==========================================

export async function getUsers(options = {}) {
  const { forceRefresh = false, onBackgroundUpdate } = options;

  const result = await CacheManager.getOrFetch(
    'users',
    async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const users = [];
      querySnapshot.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() });
      });
      return users;
    },
    { forceRefresh, onBackgroundUpdate }
  );

  return result.data;
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
    
    // Targeted cache invalidation
    CacheManager.invalidate('users', 'merged_interns');
    return { id: uid, ...userData };
  } catch (error) {
    console.error("[Firestore] Error saving user profile:", error);
    throw error;
  }
}

export async function addUser(userData) {
  try {
    const docId = userData.id || userData.uid || "usr_" + Date.now();
    const payload = { ...userData, id: docId, createdAt: new Date().toISOString() };
    await setDoc(doc(db, "users", docId), payload, { merge: true });
    
    // Targeted cache invalidation
    CacheManager.invalidate('users', 'merged_interns');
    return payload;
  } catch (error) {
    console.error("[Firestore] Error adding user:", error);
    throw error;
  }
}

export async function updateUser(id, userData) {
  try {
    const docRef = doc(db, "users", id);
    await updateDoc(docRef, { ...userData, updatedAt: new Date().toISOString() });
    
    // Targeted cache invalidation
    CacheManager.invalidate('users', 'merged_interns');
    return { id, ...userData };
  } catch (error) {
    console.error(`[Firestore] Error updating user ${id}:`, error);
    throw error;
  }
}

export async function deleteUser(id) {
  try {
    await deleteDoc(doc(db, "users", id));
    
    // Targeted cache invalidation
    CacheManager.invalidate('users', 'merged_interns');
    return true;
  } catch (error) {
    console.error(`[Firestore] Error deleting user ${id}:`, error);
    throw error;
  }
}

export async function getStudentData(uid) {
  try {
    return await getUserById(uid);
  } catch (error) {
    console.error("[Firestore] Error fetching student data:", error);
    return null;
  }
}

export async function getStudentInternRecord(email) {
  try {
    if (!email) return null;
    const interns = await getInterns();
    return interns.find(i => i.email && i.email.toLowerCase() === email.toLowerCase()) || null;
  } catch (error) {
    console.error("[Firestore] Error fetching student intern record:", error);
    return null;
  }
}

export async function getTodaySchedule(department = "Pharmacy") {
  try {
    const trainingList = await getTraining();
    const deptSchedule = trainingList.filter(t => t.department === department);
    if (deptSchedule.length > 0) {
      return deptSchedule.map(t => ({
        time: t.timing || t.duration || "09:00 AM - 05:00 PM",
        task: t.rotationName || t.name || "Rotational Training",
        status: t.status || "Daily"
      }));
    }
    return [
      { time: "09:00 AM - 11:00 AM", task: "Outdoor Medicine Dispensing", status: "Daily" },
      { time: "11:00 AM - 01:00 PM", task: "Stock Check & Inventory", status: "Daily" },
      { time: "02:00 PM - 04:00 PM", task: "Medical Camp / Clinical Duty", status: "Weekly" },
      { time: "04:00 PM - 05:00 PM", task: "Compounding & Labeling", status: "Daily" }
    ];
  } catch (error) {
    console.error("[Firestore] Error fetching today's schedule:", error);
    return [];
  }
}

export async function getStudentAttendance(internId) {
  try {
    const attendance = await getAttendance();
    return attendance.filter(a => a.internId === internId);
  } catch (error) {
    console.error("[Firestore] Error fetching student attendance:", error);
    return [];
  }
}

// ==========================================
// 2. INTERNS COLLECTION
// ==========================================

export async function getInterns(options = {}) {
  const { forceRefresh = false, onBackgroundUpdate } = options;

  const result = await CacheManager.getOrFetch(
    'interns',
    async () => {
      const querySnapshot = await getDocs(collection(db, "interns"));
      const interns = [];
      querySnapshot.forEach((docSnap) => {
        interns.push({ id: docSnap.id, ...docSnap.data() });
      });
      return interns;
    },
    { forceRefresh, onBackgroundUpdate }
  );

  return result.data || [];
}

export async function addIntern(internData) {
  try {
    const rawInterns = await getInterns({ forceRefresh: true });
    
    // Check if an intern document already exists with this uid, userId, or email
    const match = rawInterns.find(i => {
      const matchUid = internData.uid && (i.uid === internData.uid || i.userId === internData.uid);
      const matchUserId = internData.userId && (i.uid === internData.userId || i.userId === internData.userId);
      const matchEmail = internData.email && i.email && i.email.toLowerCase().trim() === internData.email.toLowerCase().trim();
      return matchUid || matchUserId || matchEmail;
    });

    const docId = match ? match.id : (internData.id || (internData.uid ? `int_${internData.uid}` : `int_${Date.now()}`));
    
    const payload = {
      ...internData,
      id: docId,
      updatedAt: new Date().toISOString()
    };
    if (!match) {
      payload.createdAt = new Date().toISOString();
    }

    await setDoc(doc(db, "interns", docId), payload, { merge: true });

    // Targeted cache invalidation
    CacheManager.invalidate('interns', 'merged_interns', 'dashboard', 'reports', 'training');
    return payload;
  } catch (error) {
    console.error("[Firestore] Error adding/enrolling intern:", error);
    throw error;
  }
}

export async function updateIntern(id, internData, allIds = []) {
  try {
    const targetIds = new Set([id, ...(allIds || [])].filter(Boolean));
    const payload = {
      ...internData,
      updatedAt: new Date().toISOString()
    };

    for (const docId of targetIds) {
      const docRef = doc(db, "interns", docId);
      await setDoc(docRef, { ...payload, id: docId }, { merge: true });
    }

    // Targeted cache invalidation
    CacheManager.invalidate('interns', 'merged_interns', 'dashboard', 'reports', 'training');
    return payload;
  } catch (error) {
    console.error(`[Firestore] Error updating intern ${id}:`, error);
    throw error;
  }
}

export async function deleteIntern(id, allIds = []) {
  try {
    const targetIds = new Set([id, ...(allIds || [])].filter(Boolean));
    if (targetIds.size === 0) {
      throw new Error("No valid document ID specified for deletion.");
    }

    let deletedCount = 0;
    let lastError = null;

    for (const docId of targetIds) {
      try {
        await deleteDoc(doc(db, "interns", docId));
        deletedCount++;
      } catch (err) {
        console.error(`[Firestore] Error deleting document ${docId} from interns:`, err);
        lastError = err;
      }
    }

    if (deletedCount === 0 && lastError) {
      throw lastError;
    }

    // Targeted cache invalidation
    CacheManager.invalidate('interns', 'merged_interns', 'dashboard', 'reports', 'training');
    return true;
  } catch (error) {
    console.error(`[Firestore] Error deleting intern ${id}:`, error);
    throw error;
  }
}

/**
 * getMergedInternsAndStudents
 * Canonical deduplication & unified list with SWR smart caching
 */
export async function getMergedInternsAndStudents(options = {}) {
  const { forceRefresh = false, onBackgroundUpdate } = options;

  const result = await CacheManager.getOrFetch(
    'merged_interns',
    async () => {
      const [rawInterns, users] = await Promise.all([
        getInterns({ forceRefresh: true }),
        getUsers({ forceRefresh: true })
      ]);

      const normalizedRawInterns = (rawInterns || []).map(intern => {
        const docId = intern.id || intern.internId || ("int_" + Date.now());
        const internCode = intern.internId || docId;
        return {
          ...intern,
          id: docId,
          internId: internCode
        };
      });

      // Group raw intern documents by canonical student identity (UID -> userId -> email -> id)
      const internIdentityMap = new Map();

      normalizedRawInterns.forEach(intern => {
        const uid = (intern.uid || intern.userId || '').toString().trim();
        const email = (intern.email || '').toString().toLowerCase().trim();
        const internId = (intern.internId || intern.id || '').toString().trim();

        let canonicalKey = null;
        if (uid && internIdentityMap.has(`uid:${uid}`)) {
          canonicalKey = `uid:${uid}`;
        } else if (email && internIdentityMap.has(`email:${email}`)) {
          canonicalKey = `email:${email}`;
        }

        if (!canonicalKey) {
          if (uid) canonicalKey = `uid:${uid}`;
          else if (email) canonicalKey = `email:${email}`;
          else canonicalKey = `id:${internId}`;
        }

        if (!internIdentityMap.has(canonicalKey)) {
          internIdentityMap.set(canonicalKey, []);
        }
        internIdentityMap.get(canonicalKey).push(intern);
        if (uid) internIdentityMap.set(`uid:${uid}`, internIdentityMap.get(canonicalKey));
        if (email) internIdentityMap.set(`email:${email}`, internIdentityMap.get(canonicalKey));
      });

      // Collapse each group into a single canonical intern record
      const uniqueGroups = Array.from(new Set(internIdentityMap.values()));
      const canonicalInterns = uniqueGroups.map(group => {
        const canonical = { ...group[0] };
        const allAliasIds = new Set();

        group.forEach(doc => {
          if (doc.id) allAliasIds.add(doc.id);
          if (doc.internId) allAliasIds.add(doc.internId);
          if (doc.uid) allAliasIds.add(doc.uid);
          if (doc.userId) allAliasIds.add(doc.userId);

          if (!canonical.name && doc.name) canonical.name = doc.name;
          if (!canonical.email && doc.email) canonical.email = doc.email;
          if ((!canonical.course || canonical.course === 'Diploma Pharmacy') && doc.course) canonical.course = doc.course;
          if (!canonical.college && doc.college) canonical.college = doc.college;
          if (!canonical.department && doc.department) canonical.department = doc.department;
          if (!canonical.joiningDate && doc.joiningDate) canonical.joiningDate = doc.joiningDate;
          if (!canonical.endingDate && doc.endingDate) canonical.endingDate = doc.endingDate;
          if ((!canonical.totalTrainingDays || canonical.totalTrainingDays <= 0) && doc.totalTrainingDays) {
            canonical.totalTrainingDays = doc.totalTrainingDays;
          }
          if ((!canonical.completedDays || canonical.completedDays <= 0) && doc.completedDays) {
            canonical.completedDays = doc.completedDays;
          }
          if (!canonical.certificateIssued && doc.certificateIssued) {
            canonical.certificateIssued = true;
          }
          if (doc.status && doc.status !== 'pending' && canonical.status === 'pending') {
            canonical.status = doc.status;
          }
        });

        canonical.allIds = Array.from(allAliasIds);
        return canonical;
      });

      // Match student users from `users` collection
      const students = (users || []).filter(u => (u.role || '').toLowerCase() === 'student');
      const matchedCanonicalInterns = new Set();
      const merged = [];

      students.forEach(user => {
        const userUid = (user.uid || user.id || '').toString().trim();
        const userEmail = (user.email || '').toString().toLowerCase().trim();

        let matchedIntern = null;
        if (userUid) {
          matchedIntern = canonicalInterns.find(i => 
            !matchedCanonicalInterns.has(i) && 
            (i.uid === userUid || i.userId === userUid || (i.allIds && i.allIds.includes(userUid)))
          );
        }
        if (!matchedIntern && userEmail) {
          matchedIntern = canonicalInterns.find(i => 
            !matchedCanonicalInterns.has(i) && 
            i.email && i.email.toLowerCase().trim() === userEmail
          );
        }

        if (matchedIntern) {
          matchedCanonicalInterns.add(matchedIntern);
          if (userUid && !matchedIntern.uid) matchedIntern.uid = userUid;
          if (userUid && !matchedIntern.userId) matchedIntern.userId = userUid;
          merged.push(matchedIntern);
        } else {
          merged.push({
            id:                   userUid || ("usr_" + Date.now()),
            internId:             'PENDING',
            uid:                  userUid || '',
            userId:               userUid || '',
            name:                 user.name || user.email || 'Unknown',
            email:                user.email || '',
            department:           user.department || 'Pharmacy',
            course:               '',
            college:              '',
            joiningDate:          '',
            endingDate:           '',
            totalTrainingDays:    0,
            completedDays:        0,
            attendancePercentage: 0,
            certificateIssued:    false,
            status:               'pending',
            _isVirtual:           true,
            allIds:               [userUid]
          });
        }
      });

      canonicalInterns.forEach(intern => {
        if (!matchedCanonicalInterns.has(intern)) {
          merged.push(intern);
        }
      });

      return merged;
    },
    { forceRefresh, onBackgroundUpdate }
  );

  return result.data || [];
}

/**
 * getEnrolledInterns
 * Single Source of Truth for real, canonical, enrolled interns across all modules
 */
export async function getEnrolledInterns(options = {}) {
  const merged = await getMergedInternsAndStudents(options);
  return (merged || []).filter(intern => intern && !intern._isVirtual && intern.status !== 'deleted');
}

/**
 * Format Display Intern ID consistently (e.g. INT-48259)
 */
export function formatDisplayInternId(intern) {
  if (!intern) return 'INT-00000';
  const raw = String(intern.internId || intern.id || intern.uid || '');

  const match5 = raw.match(/\bINT-(\d{5})\b/i);
  if (match5) return `INT-${match5[1]}`;

  const matchExact5 = raw.match(/^\d{5}$/);
  if (matchExact5) return `INT-${matchExact5[0]}`;

  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 5) return `INT-${digits.slice(-5)}`;
  if (digits.length > 0) return `INT-${digits.padStart(5, '0')}`;

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) % 90000;
  }
  return `INT-${Math.abs(hash) + 10000}`;
}

/**
 * Format Course name consistently
 */
export function formatCourse(course) {
  if (!course) return 'General';
  const c = String(course).trim();
  if (c.toLowerCase() === 'diploma pharmacy') return 'D.Pharm';
  return c;
}

/**
 * Single source of truth for Intern Training Progress
 */
export function getInternProgress(intern) {
  if (!intern) return { completedDays: 0, totalDays: 0, progressPercent: 0, status: 'inactive' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = Number(intern.totalTrainingDays || intern.totalDays) || (
    intern.joiningDate && intern.endingDate
      ? Math.max(1, Math.ceil((new Date(intern.endingDate) - new Date(intern.joiningDate)) / (1000 * 60 * 60 * 24)))
      : 30
  );

  let completedDays = 0;
  if (intern.completedDays !== undefined && intern.completedDays !== null && Number(intern.completedDays) > 0) {
    completedDays = Number(intern.completedDays);
  } else if (intern.joiningDate) {
    const joining = new Date(intern.joiningDate);
    joining.setHours(0, 0, 0, 0);
    const ending = intern.endingDate ? new Date(intern.endingDate) : new Date(joining.getTime() + totalDays * 24 * 60 * 60 * 1000);
    ending.setHours(0, 0, 0, 0);

    if (today >= joining) {
      completedDays = Math.ceil(Math.min(today - joining, ending - joining) / (1000 * 60 * 60 * 24));
    }
  }

  completedDays = Math.max(0, Math.min(completedDays, totalDays));
  const progressPercent = totalDays > 0 ? Math.min(100, Math.round((completedDays / totalDays) * 100)) : 0;
  let status = intern.status || (progressPercent >= 100 ? 'completed' : 'active');
  if (progressPercent >= 100) status = 'completed';

  return { completedDays, totalDays, progressPercent, status };
}

/**
 * Single source of truth for Intern Attendance Percentage
 */
export function getInternAttendancePercentage(intern, allAttendanceList) {
  if (!intern || !Array.isArray(allAttendanceList)) {
    return intern?.attendancePercentage || 0;
  }

  const targetIds = new Set([
    intern.internId,
    intern.id,
    intern.uid,
    intern.userId,
    ...(intern.allIds || [])
  ].filter(Boolean));

  const todayStr = new Date().toISOString().split('T')[0];

  const recordsByDate = new Map();
  allAttendanceList.forEach(a => {
    if (!a.internId || !targetIds.has(a.internId)) return;
    if (a.date && a.date <= todayStr && a.status !== 'Not Marked') {
      recordsByDate.set(a.date, a);
    }
  });

  const internRecords = Array.from(recordsByDate.values());
  if (internRecords.length === 0) {
    return intern.attendancePercentage || 0;
  }

  let presentCredit = 0;
  internRecords.forEach(a => {
    if (a.status === 'Present') {
      presentCredit += 1;
    } else if (a.status === 'Half Day') {
      presentCredit += 0.5;
    }
  });

  return Math.round((presentCredit / internRecords.length) * 100);
}

/**
 * Single source of truth for Attendance Summary & Dashboard Stats
 */
export function getAttendanceSummary(allAttendanceList = [], enrolledInternsList = [], targetDateStr = null) {
  const dateStr = targetDateStr || new Date().toISOString().split('T')[0];

  // 1. Build a set of all valid alias IDs for the canonical enrolled interns
  const enrolledInternIdSet = new Set();
  (enrolledInternsList || []).forEach(intern => {
    if (intern.internId) enrolledInternIdSet.add(intern.internId);
    if (intern.id) enrolledInternIdSet.add(intern.id);
    if (intern.uid) enrolledInternIdSet.add(intern.uid);
    if (intern.userId) enrolledInternIdSet.add(intern.userId);
    if (intern.allIds) intern.allIds.forEach(id => enrolledInternIdSet.add(id));
  });

  // 2. Filter attendance records strictly to those belonging to canonical enrolled interns
  const enrolledAttendance = (allAttendanceList || []).filter(a => 
    a.internId && enrolledInternIdSet.has(a.internId)
  );

  // 3. Today's metrics (strictly for enrolled interns on dateStr using identical Attendance Module logic)
  const todayRecordMap = new Map();
  enrolledAttendance.forEach(a => {
    if (a.date === dateStr && a.internId) {
      todayRecordMap.set(a.internId, a.status);
    }
  });

  let presentToday = 0;
  let absentToday = 0;
  (enrolledInternsList || []).forEach(intern => {
    const targetIds = [intern.internId, intern.id, intern.uid, intern.userId, ...(intern.allIds || [])].filter(Boolean);
    let recordStatus = null;
    for (const id of targetIds) {
      if (todayRecordMap.has(id)) {
        recordStatus = todayRecordMap.get(id);
        break;
      }
    }

    const currentStatus = (recordStatus === 'Absent') ? 'Absent' : 'Present';
    if (currentStatus === 'Absent') {
      absentToday++;
    } else {
      presentToday++;
    }
  });

  const totalTodayMarked = presentToday + absentToday;
  const todayRate = totalTodayMarked > 0 ? Math.round((presentToday / totalTodayMarked) * 100) : 0;

  // 4. Historical log metrics across enrolled interns (Present & Absent only)
  const presentLogs = enrolledAttendance.filter(a => a.status === 'Present').length;
  const absentLogs = enrolledAttendance.filter(a => a.status === 'Absent').length;
  const totalValidLogs = presentLogs + absentLogs;
  const overallLogRate = totalValidLogs > 0 ? Math.round((presentLogs / totalValidLogs) * 100) : 0;
  const totalRawLogs = enrolledAttendance.length;

  // 5. Intern-level average attendance & training progress
  let totalAttPctSum = 0;
  let totalProgressPctSum = 0;
  let completedInterns = 0;

  (enrolledInternsList || []).forEach(intern => {
    const att = getInternAttendancePercentage(intern, enrolledAttendance);
    totalAttPctSum += att;

    const prog = getInternProgress(intern);
    totalProgressPctSum += prog.progressPercent;
    if (prog.progressPercent >= 100) {
      completedInterns++;
    }
  });

  const totalInterns = (enrolledInternsList || []).length;
  const avgInternAttendance = totalInterns > 0 
    ? Math.round(totalAttPctSum / totalInterns) 
    : 0;

  const avgTrainingProgress = totalInterns > 0
    ? Math.round(totalProgressPctSum / totalInterns)
    : 0;

  const completionRate = totalInterns > 0
    ? Math.round((completedInterns / totalInterns) * 100)
    : 0;

  return {
    date: dateStr,
    presentToday,
    absentToday,
    totalTodayMarked,
    todayRate,
    presentLogs,
    absentLogs,
    totalValidLogs,
    totalRawLogs,
    overallLogRate,
    avgInternAttendance,
    avgTrainingProgress,
    totalInterns,
    completedInterns,
    completionRate
  };
}

// ==========================================
// 3. DOCTORS COLLECTION
// ==========================================

export async function getDoctors(options = {}) {
  const { forceRefresh = false, onBackgroundUpdate } = options;

  const result = await CacheManager.getOrFetch(
    'doctors',
    async () => {
      const querySnapshot = await getDocs(collection(db, "doctors"));
      const doctors = [];
      querySnapshot.forEach((docSnap) => {
        doctors.push({ id: docSnap.id, ...docSnap.data() });
      });
      return doctors;
    },
    { forceRefresh, onBackgroundUpdate }
  );

  return result.data || [];
}

export async function addDoctor(doctorData) {
  try {
    const docId = doctorData.id || "doc_" + Date.now();
    const payload = { ...doctorData, id: docId, createdAt: new Date().toISOString() };
    await setDoc(doc(db, "doctors", docId), payload);

    // Targeted cache invalidation
    CacheManager.invalidate('doctors', 'dashboard', 'reports');
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

    // Targeted cache invalidation
    CacheManager.invalidate('doctors', 'dashboard', 'reports');
    return { id, ...doctorData };
  } catch (error) {
    console.error(`[Firestore] Error updating doctor ${id}:`, error);
    throw error;
  }
}

export async function deleteDoctor(id) {
  try {
    await deleteDoc(doc(db, "doctors", id));

    // Targeted cache invalidation
    CacheManager.invalidate('doctors', 'dashboard', 'reports');
    return true;
  } catch (error) {
    console.error(`[Firestore] Error deleting doctor ${id}:`, error);
    throw error;
  }
}

// ==========================================
// 4. ATTENDANCE COLLECTION
// ==========================================

export async function getAttendance(options = {}) {
  const { forceRefresh = false, onBackgroundUpdate } = options;

  const result = await CacheManager.getOrFetch(
    'attendance',
    async () => {
      const querySnapshot = await getDocs(collection(db, "attendance"));
      const records = [];
      querySnapshot.forEach((docSnap) => {
        records.push({ id: docSnap.id, ...docSnap.data() });
      });
      return records;
    },
    { forceRefresh, onBackgroundUpdate }
  );

  return result.data || [];
}

export async function markAttendance(attendanceData) {
  try {
    const currentUser = firebaseAuth.currentUser;
    const markedBy = currentUser ? currentUser.uid : 'unknown';

    const docId = attendanceData.id || (attendanceData.internId && attendanceData.date ? `att_${attendanceData.internId}_${attendanceData.date}` : "att_" + Date.now());
    const payload = {
      ...attendanceData,
      id: docId,
      markedBy,
      markedAt: serverTimestamp()
    };
    await setDoc(doc(db, "attendance", docId), payload, { merge: true });

    // Targeted cache invalidation
    CacheManager.invalidate('attendance', 'dashboard', 'reports', 'training');
    return payload;
  } catch (error) {
    console.error("[Firestore] Error marking attendance:", error);
    throw error;
  }
}

// ==========================================
// 5. TRAINING COLLECTION
// ==========================================

export async function getTraining(options = {}) {
  const { forceRefresh = false, onBackgroundUpdate } = options;

  const result = await CacheManager.getOrFetch(
    'training',
    async () => {
      const querySnapshot = await getDocs(collection(db, "training"));
      const schedules = [];
      querySnapshot.forEach((docSnap) => {
        schedules.push({ id: docSnap.id, ...docSnap.data() });
      });
      return schedules;
    },
    { forceRefresh, onBackgroundUpdate }
  );

  return result.data || [];
}

export async function updateTraining(id, trainingData) {
  try {
    const docRef = doc(db, "training", id);
    await setDoc(docRef, { ...trainingData, updatedAt: new Date().toISOString() }, { merge: true });

    // Targeted cache invalidation
    CacheManager.invalidate('training', 'dashboard', 'reports');
    return { id, ...trainingData };
  } catch (error) {
    console.error(`[Firestore] Error updating training schedule ${id}:`, error);
    throw error;
  }
}

// ==========================================
// 6. CERTIFICATES COLLECTION
// ==========================================

export async function issueCertificate(certificateData) {
  try {
    const docId = certificateData.id || "cert_" + Date.now();
    const payload = { ...certificateData, id: docId, issuedAt: new Date().toISOString() };
    await setDoc(doc(db, "certificates", docId), payload);

    // Targeted cache invalidation
    CacheManager.invalidate('certificates', 'interns', 'merged_interns', 'reports', 'dashboard');
    return payload;
  } catch (error) {
    console.error("[Firestore] Error issuing certificate:", error);
    throw error;
  }
}

// ==========================================
// 7. REPORTS GENERATION
// ==========================================

export async function getReports(options = {}) {
  const { forceRefresh = false } = options;

  const result = await CacheManager.getOrFetch(
    'reports',
    async () => {
      const [interns, attendance, training] = await Promise.all([
        getInterns({ forceRefresh: true }),
        getAttendance({ forceRefresh: true }),
        getTraining({ forceRefresh: true })
      ]);

      return {
        totalInterns: interns.length,
        attendanceRecords: attendance,
        trainingSchedules: training,
        generatedAt: new Date().toISOString()
      };
    },
    { forceRefresh }
  );

  return result.data;
}
