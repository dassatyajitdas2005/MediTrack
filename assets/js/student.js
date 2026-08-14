/* MediTrack - Student Dashboard Controller */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  auth.checkAuth(['student']); // Only students allowed

  renderLayout('dashboard');
  loadStudentDashboard();
});

async function loadStudentDashboard() {
  const user = auth.getCurrentUser();
  if (!user) return;

  // Fetch student data
  const studentData = await fbDb.getStudentData(user.uid);
  const internRecord = await fbDb.getStudentInternRecord(user.email);

  // Update profile section in sidebar
  updateProfileSection(user);

  // Calculate stats
  const totalDays = internRecord?.totalTrainingDays || 30;
  const completedDays = internRecord?.completedDays || 0;
  const progressPercent = Math.round((completedDays / totalDays) * 100);
  const attendancePercent = internRecord?.attendancePercentage || 0;

  // Update Top Cards
  document.getElementById('kpi-total-days').innerText = totalDays;
  document.getElementById('kpi-completed-days').innerText = completedDays;
  document.getElementById('kpi-attendance').innerText = `${attendancePercent}%`;
  document.getElementById('kpi-progress').innerText = `${progressPercent}%`;

  // Training Progress Bar
  const progressBar = document.getElementById('training-progress-bar');
  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
  }

  // Today's Schedule
  const schedule = await fbDb.getTodaySchedule(studentData?.department || 'Pharmacy');
  renderSchedule(schedule);

  // Doctor OPD
  const doctors = await fbDb.getDoctors();
  const todayDoctors = doctors.slice(0, 3); // Show first 3 for demo
  renderDoctors(todayDoctors);

  // Attendance Summary
  if (internRecord) {
    const attendance = await fbDb.getStudentAttendance(internRecord.internId);
    renderAttendanceSummary(attendance);
  }

  // Weekly Report
  renderWeeklyReport(progressPercent, attendancePercent);
}

function updateProfileSection(user) {
  const profileName = document.getElementById('sidebar-profile-name');
  const profileRole = document.getElementById('sidebar-profile-role');

  if (profileName) profileName.innerText = user.name || 'Student';
  if (profileRole) profileRole.innerText = user.role?.toUpperCase() || 'STUDENT';
}

function renderSchedule(schedule) {
  const container = document.getElementById('schedule-list');
  if (!container) return;

  if (schedule.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">No schedule for today.</p>';
    return;
  }

  container.innerHTML = schedule.map(item => `
    <div style="display:flex; justify-content:space-between; padding:10px; 
                border-bottom:1px solid var(--border-color);">
      <div>
        <strong>${escapeHtml(item.time)}</strong>
        <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(item.task)}</div>
      </div>
      <span class="status-pill ${item.status.toLowerCase()}">${item.status}</span>
    </div>
  `).join('');
}

function renderDoctors(doctors) {
  const container = document.getElementById('doctor-list');
  if (!container) return;

  container.innerHTML = doctors.map(doc => `
    <div class="glass-card" style="padding:12px; margin-bottom:8px;">
      <div style="font-weight:700;">${escapeHtml(doc.name)}</div>
      <div style="font-size:12px; color:var(--text-muted);">
        ${escapeHtml(doc.department)} — ${escapeHtml(doc.opdTiming)}
      </div>
    </div>
  `).join('');
}

function renderAttendanceSummary(attendance) {
  const container = document.getElementById('attendance-summary');
  if (!container) return;

  const present = attendance.filter(a => a.status === 'Present').length;
  const absent = attendance.filter(a => a.status === 'Absent').length;
  const total = attendance.length;
  const percent = total > 0 ? Math.round((present / total) * 100) : 0;

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; text-align:center;">
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:24px; font-weight:800; color:var(--success);">${present}</div>
        <div style="font-size:12px; color:var(--text-muted);">Present</div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:24px; font-weight:800; color:var(--danger);">${absent}</div>
        <div style="font-size:12px; color:var(--text-muted);">Absent</div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:24px; font-weight:800; color:var(--primary);">${percent}%</div>
        <div style="font-size:12px; color:var(--text-muted);">Rate</div>
      </div>
    </div>
  `;
}

function renderWeeklyReport(progress, attendance) {
  const container = document.getElementById('weekly-report');
  if (!container) return;

  container.innerHTML = `
    <div class="glass-card" style="padding:20px;">
      <h4 style="margin-bottom:12px;">Weekly Performance</h4>
      <div style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Training Progress</span>
          <span>${progress}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${progress}%; background:var(--primary);"></div>
        </div>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Attendance Rate</span>
          <span>${attendance}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${attendance}%; background:var(--success);"></div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}