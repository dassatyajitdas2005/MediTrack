/* MediTrack - Dashboard Analytics Controller (Firebase Only) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('dashboard');
  loadDashboardData();
});

async function loadDashboardData() {
  const user = auth.getCurrentUser();

  const interns = await fbDb.getInterns();
  const doctors = await fbDb.getDoctors();
  const attendance = await fbDb.getAttendance();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === todayStr);

  const totalInterns = interns.length;
  const presentToday = todayAttendance.filter(a => a.status === 'Present').length;
  const absentToday = todayAttendance.filter(a => a.status === 'Absent').length;
  const totalDoctors = doctors.length;

  const deptSet = new Set(interns.map(i => i.department).concat(doctors.map(d => d.department)));
  const totalDepts = deptSet.size;

  const completedCount = interns.filter(i => i.completedDays >= i.totalTrainingDays).length;
  const completionPercentage = totalInterns > 0 ? Math.round((completedCount / totalInterns) * 100) : 0;

  document.getElementById('kpi-total-interns').innerText = totalInterns;
  document.getElementById('kpi-present-today').innerText = presentToday;
  document.getElementById('kpi-absent-today').innerText = absentToday;
  document.getElementById('kpi-doctors-today').innerText = totalDoctors;
  document.getElementById('kpi-departments').innerText = totalDepts;
  document.getElementById('kpi-completion-rate').innerText = `${completionPercentage}%`;

  // Student View
  if (user && user.role === 'student') {
    const internObj = interns.find(i => i.email === user.email) || interns[0];
    const studentNotice = document.getElementById('student-personal-notice');
    if (studentNotice && internObj) {
      studentNotice.style.display = 'block';
      studentNotice.innerHTML = `
        <div class="glass-card" style="padding: 20px; border-left: 4px solid var(--primary-500); margin-bottom: 24px;">
          <h3 style="font-size: 16px; font-weight: 800;">Welcome Back, ${escapeHtml(internObj.name)}!</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
            Course: <strong>${escapeHtml(internObj.course)}</strong> | Dept: <strong>${escapeHtml(internObj.department)}</strong> | Attendance: <strong>${internObj.attendancePercentage}%</strong>
          </p>
        </div>
      `;
    }
  }

  // Recent Attendance
  const recentTableBody = document.getElementById('recent-attendance-tbody');
  if (recentTableBody) {
    if (todayAttendance.length === 0) {
      recentTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No attendance records for today.</td></tr>`;
    } else {
      recentTableBody.innerHTML = todayAttendance.slice(0, 5).map(att => {
        const intern = interns.find(i => i.internId === att.internId) || { name: "Intern", department: "General" };
        return `
          <tr>
            <td><strong>${escapeHtml(att.internId)}</strong></td>
            <td>${escapeHtml(intern.name)}</td>
            <td>${escapeHtml(intern.department)}</td>
            <td><span class="status-pill ${att.status.toLowerCase()}">${att.status}</span></td>
            <td>${escapeHtml(att.remarks) || 'Normal shift'}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Today's OPD Doctors
  const doctorListContainer = document.getElementById('today-doctors-list');
  if (doctorListContainer) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = days[new Date().getDay()];
    const availableDocs = doctors.filter(d => d.availableDays.includes(currentDay));

    doctorListContainer.innerHTML = availableDocs.slice(0, 4).map(doc => `
      <div class="glass-card doctor-card">
        <div class="doctor-header">
          <div class="doctor-avatar"><i class="bx bx-user-voice"></i></div>
          <div class="doctor-details">
            <h4>${escapeHtml(doc.name)}</h4>
            <p>${escapeHtml(doc.department)} - ${escapeHtml(doc.specialization)}</p>
          </div>
        </div>
        <div class="doctor-meta">
          <span><i class="bx bx-building-house"></i> ${escapeHtml(doc.room)}</span>
          <span><i class="bx bx-time"></i> ${escapeHtml(doc.opdTiming)}</span>
        </div>
      </div>
    `).join('');
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}