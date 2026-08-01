/* MediTrack - Dashboard Analytics Controller */

import { db } from './db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('dashboard');
  loadDashboardData();
});

function loadDashboardData() {
  const user = auth.getCurrentUser();
  const interns = db.getInterns();
  const doctors = db.getDoctors();
  const attendance = db.getAttendance();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === todayStr || true); // fallback demo

  // KPI Calculations
  const totalInterns = interns.length;
  const presentToday = todayAttendance.filter(a => a.status === 'Present').length;
  const absentToday = todayAttendance.filter(a => a.status === 'Absent').length;
  const totalDoctors = doctors.length;
  
  // Unique Departments
  const deptSet = new Set(interns.map(i => i.department).concat(doctors.map(d => d.department)));
  const totalDepts = deptSet.size;

  // Training Completion Rate
  const completedCount = interns.filter(i => i.completedDays >= i.totalTrainingDays).length;
  const completionPercentage = totalInterns > 0 ? Math.round((completedCount / totalInterns) * 100) : 0;

  // Update KPI Cards
  document.getElementById('kpi-total-interns').innerText = totalInterns;
  document.getElementById('kpi-present-today').innerText = presentToday;
  document.getElementById('kpi-absent-today').innerText = absentToday;
  document.getElementById('kpi-doctors-today').innerText = totalDoctors;
  document.getElementById('kpi-departments').innerText = totalDepts;
  document.getElementById('kpi-completion-rate').innerText = `${completionPercentage}%`;

  // Student Personalized View Header
  if (user && user.role === 'student') {
    const internObj = interns.find(i => i.email === user.email) || interns[0];
    const studentNotice = document.getElementById('student-personal-notice');
    if (studentNotice) {
      studentNotice.style.display = 'block';
      studentNotice.innerHTML = `
        <div class="glass-card" style="padding: 20px; border-left: 4px solid var(--primary-500); margin-bottom: 24px;">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main);">Welcome Back, ${internObj.name}!</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
            Course: <strong>${internObj.course}</strong> | Department: <strong>${internObj.department}</strong> | Attendance: <strong>${internObj.attendancePercentage}%</strong>
          </p>
        </div>
      `;
    }
  }

  // Populate Recent Attendance Table
  const recentTableBody = document.getElementById('recent-attendance-tbody');
  if (recentTableBody) {
    if (todayAttendance.length === 0) {
      recentTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No attendance records for today.</td></tr>`;
    } else {
      recentTableBody.innerHTML = todayAttendance.slice(0, 5).map(att => {
        const intern = interns.find(i => i.internId === att.internId) || { name: "Intern", department: "General" };
        const statusClass = att.status.toLowerCase();
        return `
          <tr>
            <td><strong>${att.internId}</strong></td>
            <td>${intern.name}</td>
            <td>${intern.department}</td>
            <td><span class="status-pill ${statusClass}">${att.status}</span></td>
            <td>${att.remarks || 'Normal shift'}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Populate Doctor OPD Today List
  const doctorListContainer = document.getElementById('today-doctors-list');
  if (doctorListContainer) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = days[new Date().getDay()] || "Monday";
    const availableDocs = doctors.filter(d => d.availableDays.includes(currentDay) || d.availableDays.includes("Monday"));

    doctorListContainer.innerHTML = availableDocs.slice(0, 4).map(doc => `
      <div class="glass-card doctor-card">
        <div class="doctor-header">
          <div class="doctor-avatar"><i class="bx bx-user-voice"></i></div>
          <div class="doctor-details">
            <h4>${doc.name}</h4>
            <p>${doc.department} - ${doc.specialization}</p>
          </div>
        </div>
        <div class="doctor-meta">
          <span><i class="bx bx-building-house"></i> ${doc.room}</span>
          <span><i class="bx bx-time"></i> ${doc.opdTiming}</span>
        </div>
      </div>
    `).join('');
  }
}
