/* MediTrack - Unified Database Storage Engine (Firestore + Standalone Local DB) */

// Initial Seed Data for Demo Mode
const INITIAL_DATA = {
  users: [
    { uid: "usr_admin_01", name: "Dr. A. K. Sharma", email: "admin@meditrack.com", role: "admin", department: "Hospital Administration" },
    { uid: "usr_student_01", name: "Rahul Verma", email: "intern@meditrack.com", role: "student", department: "Pharmacy", internId: "INT-101" },
    { uid: "usr_sup_01", name: "Dr. Sunita Rao", email: "supervisor@meditrack.com", role: "supervisor", department: "General Medicine" }
  ],
  interns: [
    {
      internId: "INT-101",
      name: "Rahul Verma",
      email: "intern@meditrack.com",
      course: "Diploma Pharmacy (90 Days)",
      college: "Apex Institute of Pharmacy",
      department: "Pharmacy",
      joiningDate: "2026-06-01",
      endingDate: "2026-08-29",
      totalTrainingDays: 90,
      completedDays: 62,
      attendancePercentage: 95,
      certificateIssued: false,
      status: "active"
    },
    {
      internId: "INT-102",
      name: "Priya Patel",
      email: "priya.patel@example.com",
      course: "B.Pharm (30 Days)",
      college: "City College of Pharmacy",
      department: "OPD Store",
      joiningDate: "2026-07-01",
      endingDate: "2026-07-31",
      totalTrainingDays: 30,
      completedDays: 30,
      attendancePercentage: 98,
      certificateIssued: true,
      status: "completed"
    },
    {
      internId: "INT-103",
      name: "Ankit Kumar",
      email: "ankit.k@example.com",
      course: "Nursing (30 Days)",
      college: "State College of Nursing",
      department: "General Surgery",
      joiningDate: "2026-07-15",
      endingDate: "2026-08-15",
      totalTrainingDays: 30,
      completedDays: 18,
      attendancePercentage: 90,
      certificateIssued: false,
      status: "active"
    },
    {
      internId: "INT-104",
      name: "Sneha Gupta",
      email: "sneha.g@example.com",
      course: "DMLT",
      college: "Metropolitan Paramedical College",
      department: "Pathology Lab",
      joiningDate: "2026-06-15",
      endingDate: "2026-09-15",
      totalTrainingDays: 90,
      completedDays: 48,
      attendancePercentage: 92,
      certificateIssued: false,
      status: "active"
    },
    {
      internId: "INT-105",
      name: "Vikram Singh",
      email: "vikram.s@example.com",
      course: "Physiotherapy",
      college: "National Institute of Rehab",
      department: "Physiotherapy OPD",
      joiningDate: "2026-07-01",
      endingDate: "2026-08-30",
      totalTrainingDays: 60,
      completedDays: 32,
      attendancePercentage: 88,
      certificateIssued: false,
      status: "active"
    }
  ],
  doctors: [
    { doctorId: "DOC-201", name: "Dr. Rajesh Khanna", department: "Medicine", specialization: "Senior General Physician", room: "OPD Room 101", availableDays: ["Monday", "Wednesday", "Friday"], opdTiming: "09:00 AM - 01:00 PM" },
    { doctorId: "DOC-202", name: "Dr. Meena Deshmukh", department: "ENT", specialization: "Otolaryngologist Specialist", room: "OPD Room 104", availableDays: ["Monday", "Tuesday", "Thursday", "Saturday"], opdTiming: "10:00 AM - 02:00 PM" },
    { doctorId: "DOC-203", name: "Dr. Suresh Malhotra", department: "General Surgery", specialization: "Chief General Surgeon", room: "OPD Room 202", availableDays: ["Tuesday", "Wednesday", "Friday"], opdTiming: "09:30 AM - 01:30 PM" },
    { doctorId: "DOC-204", name: "Dr. Anita Roy", department: "Pediatrics", specialization: "Senior Child Specialist", room: "OPD Room 108", availableDays: ["Monday", "Wednesday", "Thursday", "Saturday"], opdTiming: "09:00 AM - 01:00 PM" },
    { doctorId: "DOC-205", name: "Dr. Vikas Joshi", department: "Orthopedics", specialization: "Orthopedic Surgeon", room: "OPD Room 205", availableDays: ["Monday", "Tuesday", "Friday", "Saturday"], opdTiming: "10:00 AM - 02:30 PM" },
    { doctorId: "DOC-206", name: "Dr. Preeti Saxena", department: "Dermatology", specialization: "Skin & Cosmetology Specialist", room: "OPD Room 110", availableDays: ["Wednesday", "Thursday", "Saturday"], opdTiming: "11:00 AM - 03:00 PM" }
  ],
  attendance: [
    { attendanceId: "ATT-1001", internId: "INT-101", date: "2026-08-01", status: "Present", remarks: "Completed OPD rotation" },
    { attendanceId: "ATT-1002", internId: "INT-102", date: "2026-08-01", status: "Present", remarks: "Training finished" },
    { attendanceId: "ATT-1003", internId: "INT-103", date: "2026-08-01", status: "Present", remarks: "Assisted in Surgery Ward" },
    { attendanceId: "ATT-1004", internId: "INT-104", date: "2026-08-01", status: "Absent", remarks: "Leave application submitted" },
    { attendanceId: "ATT-1005", internId: "INT-105", date: "2026-08-01", status: "Present", remarks: "Physio OPD session" }
  ],
  training_schedule: {
    "Diploma Pharmacy (90 Days)": {
      totalDays: 90,
      dailyDepartment: [
        { day: 1, department: "Central Medical Store", assignment: "Indent processing & stock entry", supervisor: "Dr. Sunita Rao", remarks: "Stock verification" },
        { day: 2, department: "OPD Dispensary", assignment: "Patient prescription dispensing", supervisor: "Dr. Sunita Rao", remarks: "Counseling rules" },
        { day: 3, department: "IPD Pharmacy", assignment: "Ward drug distribution", supervisor: "Dr. Rajesh Khanna", remarks: "Cold storage check" },
        { day: 4, department: "Quality & Compounding", assignment: "Ointment preparation & labeling", supervisor: "Dr. Sunita Rao", remarks: "Sterility check" },
        { day: 5, department: "Emergency Ward Store", assignment: "Life-saving drug inventory", supervisor: "Dr. Suresh Malhotra", remarks: "Emergency kit check" }
      ]
    },
    "B.Pharm (30 Days)": {
      totalDays: 30,
      dailyDepartment: [
        { day: 1, department: "Main Hospital Pharmacy", assignment: "Introduction & SOPs review", supervisor: "Dr. Sunita Rao", remarks: "Orientation" },
        { day: 2, department: "OPD Counter", assignment: "OPD billing & drug issue", supervisor: "Dr. Sunita Rao", remarks: "Billing system" }
      ]
    },
    "Nursing": {
      totalDays: 30,
      dailyDepartment: [
        { day: 1, department: "Female Medical Ward", assignment: "Vitals recording & patient care", supervisor: "Nurse Incharge", remarks: "Handover check" },
        { day: 2, department: "ICU / Emergency", assignment: "Emergency vitals monitoring", supervisor: "Dr. Rajesh Khanna", remarks: "ICU protocol" }
      ]
    }
  },
  certificates: [
    { internId: "INT-102", issued: true, issuedDate: "2026-07-31", approvedBy: "Dr. A. K. Sharma (Medical Superintendent)" }
  ]
};

// Database Service Facade
class DatabaseService {
  constructor() {
    this.initLocalStorage();
  }

  initLocalStorage() {
    if (!localStorage.getItem('meditrack_db_initialized')) {
      console.log("[MediTrack DB] Initializing Local Data Store with Hospital Seed Data...");
      localStorage.setItem('meditrack_users', JSON.stringify(INITIAL_DATA.users));
      localStorage.setItem('meditrack_interns', JSON.stringify(INITIAL_DATA.interns));
      localStorage.setItem('meditrack_doctors', JSON.stringify(INITIAL_DATA.doctors));
      localStorage.setItem('meditrack_attendance', JSON.stringify(INITIAL_DATA.attendance));
      localStorage.setItem('meditrack_training_schedule', JSON.stringify(INITIAL_DATA.training_schedule));
      localStorage.setItem('meditrack_certificates', JSON.stringify(INITIAL_DATA.certificates));
      localStorage.setItem('meditrack_db_initialized', 'true');
    }
  }

  // Getters
  getCollection(key) {
    const data = localStorage.getItem(`meditrack_${key}`);
    return data ? JSON.parse(data) : [];
  }

  saveCollection(key, data) {
    localStorage.setItem(`meditrack_${key}`, JSON.stringify(data));
  }

  // Intern CRUD
  getInterns() { return this.getCollection('interns'); }
  
  getInternById(internId) {
    const interns = this.getInterns();
    return interns.find(i => i.internId === internId);
  }

  addIntern(internData) {
    const interns = this.getInterns();
    interns.unshift(internData);
    this.saveCollection('interns', interns);
    return internData;
  }

  updateIntern(internId, updatedData) {
    let interns = this.getInterns();
    interns = interns.map(i => i.internId === internId ? { ...i, ...updatedData } : i);
    this.saveCollection('interns', interns);
  }

  deleteIntern(internId) {
    let interns = this.getInterns();
    interns = interns.filter(i => i.internId !== internId);
    this.saveCollection('interns', interns);
  }

  // Doctor CRUD
  getDoctors() { return this.getCollection('doctors'); }

  addDoctor(doctorData) {
    const doctors = this.getDoctors();
    doctors.unshift(doctorData);
    this.saveCollection('doctors', doctors);
    return doctorData;
  }

  updateDoctor(doctorId, updatedData) {
    let doctors = this.getDoctors();
    doctors = doctors.map(d => d.doctorId === doctorId ? { ...d, ...updatedData } : d);
    this.saveCollection('doctors', doctors);
  }

  deleteDoctor(doctorId) {
    let doctors = this.getDoctors();
    doctors = doctors.filter(d => d.doctorId !== doctorId);
    this.saveCollection('doctors', doctors);
  }

  // Attendance
  getAttendance() { return this.getCollection('attendance'); }

  markAttendance(record) {
    let attendance = this.getAttendance();
    const existingIndex = attendance.findIndex(a => a.internId === record.internId && a.date === record.date);
    if (existingIndex >= 0) {
      attendance[existingIndex] = { ...attendance[existingIndex], ...record };
    } else {
      attendance.unshift({ attendanceId: 'ATT-' + Date.now(), ...record });
    }
    this.saveCollection('attendance', attendance);
    this.recalculateInternAttendance(record.internId);
  }

  recalculateInternAttendance(internId) {
    const attendance = this.getAttendance().filter(a => a.internId === internId);
    if (attendance.length === 0) return;

    const totalDaysRecorded = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'Present').length;
    const percentage = Math.round((presentCount / totalDaysRecorded) * 100);

    this.updateIntern(internId, {
      completedDays: totalDaysRecorded,
      attendancePercentage: percentage
    });
  }

  // Certificate Status Toggle (Admin Only)
  setCertificateIssued(internId, isIssued, approvedBy = "Dr. A. K. Sharma (Medical Superintendent)") {
    this.updateIntern(internId, { certificateIssued: isIssued, status: isIssued ? 'completed' : 'active' });
    let certs = this.getCollection('certificates');
    const existingIndex = certs.findIndex(c => c.internId === internId);
    
    if (isIssued) {
      const certObj = { internId, issued: true, issuedDate: new Date().toISOString().split('T')[0], approvedBy };
      if (existingIndex >= 0) certs[existingIndex] = certObj;
      else certs.push(certObj);
    } else {
      if (existingIndex >= 0) certs.splice(existingIndex, 1);
    }
    this.saveCollection('certificates', certs);
  }

  getCertificate(internId) {
    const certs = this.getCollection('certificates');
    return certs.find(c => c.internId === internId);
  }

  // Reset to seed data
  resetDatabase() {
    localStorage.removeItem('meditrack_db_initialized');
    this.initLocalStorage();
  }
}

export const DATABASE_MODE = localStorage.getItem('meditrack_db_mode') || 'demo';
export const db = new DatabaseService();
