/* MediTrack - Unified Dashboard Analytics Controller (Firestore Production) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  const isAllowed = await auth.checkAuth(['admin', 'student', 'supervisor']);
  if (!isAllowed) return;
  const user = auth.getCurrentUser();
  if (!user) return;

  renderLayout('dashboard');
  loadDashboardData(user);
});

async function loadDashboardData(user) {
  try {
    const interns = await fbDb.getInterns();
    const doctors = await fbDb.getDoctors();
    const attendance = await fbDb.getAttendance();

    const isAdmin = user.role === 'admin' || user.role === 'supervisor';

    if (isAdmin) {
      loadAdminDashboard(interns, doctors, attendance);
    } else {
      loadStudentDashboard(user, interns, doctors, attendance);
    }
  } catch (error) {
    console.error('[Dashboard] Error loading data:', error);
  }
}

function loadAdminDashboard(interns, doctors, attendance) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === todayStr);

  const totalInterns = interns.length;
  const presentToday = todayAttendance.filter(a => a.status === 'Present').length;
  const totalDoctors = doctors.length;
  const completedCount = interns.filter(i => (i.completedDays || 0) >= (i.totalTrainingDays || 30)).length;
  const completionRate = totalInterns > 0 ? Math.round((completedCount / totalInterns) * 100) : 0;

  // KPI Top Cards
  setElementText('kpi-total-days', totalInterns);
  setElementText('kpi-completed-days', presentToday);
  setElementText('kpi-attendance', `${totalDoctors}`);
  setElementText('kpi-progress', `${completionRate}%`);

  // Update card titles for Admin
  const titles = document.querySelectorAll('.kpi-card .kpi-title');
  const subtexts = document.querySelectorAll('.kpi-card .kpi-subtext');
  if (titles.length >= 4) {
    titles[0].textContent = 'Total Interns';
    subtexts[0].textContent = 'Enrolled interns';
    titles[1].textContent = 'Present Today';
    subtexts[1].textContent = 'Daily attendance';
    titles[2].textContent = 'OPD Doctors';
    subtexts[2].textContent = 'Active doctors';
    titles[3].textContent = 'Completion Rate';
    subtexts[3].textContent = 'Program graduates';
  }

  // Progress Bar
  const progressBar = document.getElementById('training-progress-bar');
  if (progressBar) progressBar.style.width = `${completionRate}%`;
  setElementText('progress-text', `${completionRate}%`);
  setElementText('progress-detail', `${completedCount} / ${totalInterns} interns completed`);
  setElementText('progress-status', 'Overall System Status');

  // Today's Schedule
  renderScheduleList([
    { time: '09:00 AM - 01:00 PM', task: 'Morning OPD & Medicine Dispensing Shift', status: 'Active' },
    { time: '01:00 PM - 02:00 PM', task: 'Departmental Lunch Break & Intermission', status: 'Break' },
    { time: '02:00 PM - 05:00 PM', task: 'Afternoon Ward Duty & Stock Inventory Check', status: 'Scheduled' }
  ]);

  // Doctors List
  renderDoctorList(doctors.slice(0, 4));

  // Attendance Summary
  renderAttendanceSummary(presentToday, todayAttendance.filter(a => a.status === 'Absent').length, totalInterns);

  // Weekly Report
  renderWeeklyReport(completionRate, totalInterns > 0 ? Math.round((presentToday / totalInterns) * 100) : 0);
}

function loadStudentDashboard(user, interns, doctors, attendance) {
  const studentIntern = interns.find(i => i.email && i.email.toLowerCase() === user.email.toLowerCase()) || null;

  const totalDays = studentIntern ? (studentIntern.totalTrainingDays || 90) : 0;
  const completedDays = studentIntern ? (studentIntern.completedDays || 0) : 0;
  const attendancePercent = studentIntern ? (studentIntern.attendancePercentage || 0) : 0;
  const progressPercent = totalDays > 0 ? Math.min(100, Math.round((completedDays / totalDays) * 100)) : 0;

  // KPI Top Cards
  setElementText('kpi-total-days', totalDays);
  setElementText('kpi-completed-days', completedDays);
  setElementText('kpi-attendance', `${attendancePercent}%`);
  setElementText('kpi-progress', `${progressPercent}%`);

  // Progress Bar
  const progressBar = document.getElementById('training-progress-bar');
  if (progressBar) progressBar.style.width = `${progressPercent}%`;
  setElementText('progress-text', `${progressPercent}%`);
  setElementText('progress-detail', `${completedDays} / ${totalDays} days`);
  setElementText('progress-status', progressPercent >= 100 ? 'Completed' : 'In Progress');

  // Schedule
  renderScheduleList([
    { time: '09:00 AM - 11:00 AM', task: 'Outdoor Medicine Dispensing Duty', status: 'Daily' },
    { time: '11:00 AM - 01:00 PM', task: 'Stock Verification & Inventory Log', status: 'Daily' },
    { time: '02:00 PM - 04:00 PM', task: 'Clinical Ward Duty & Counseling', status: 'Weekly' }
  ]);

  // Doctors
  renderDoctorList(doctors.slice(0, 4));

  // Attendance Summary
  const studentAttLogs = studentIntern ? attendance.filter(a => a.internId === studentIntern.internId) : [];
  const presentLogs = studentAttLogs.filter(a => a.status === 'Present').length;
  const absentLogs = studentAttLogs.filter(a => a.status === 'Absent').length;

  renderAttendanceSummary(presentLogs, absentLogs, studentAttLogs.length);

  // Weekly Report
  renderWeeklyReport(progressPercent, attendancePercent);
}

function renderScheduleList(items) {
  const container = document.getElementById('schedule-list');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:16px;">No schedule items found.</p>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-main); border-radius:var(--radius-md);">
      <div>
        <div style="font-size:13px; font-weight:700;">${escapeHtml(item.task)}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;"><i class="bx bx-time"></i> ${escapeHtml(item.time)}</div>
      </div>
      <span class="status-pill active" style="font-size:11px;">${escapeHtml(item.status)}</span>
    </div>
  `).join('');
}

function renderDoctorList(docs) {
  const container = document.getElementById('doctor-list');
  if (!container) return;

  if (!docs || docs.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:16px;">No doctors available in database.</p>`;
    return;
  }

  container.innerHTML = docs.map(doc => `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--bg-main); border-radius:var(--radius-md);">
      <div>
        <div style="font-size:13px; font-weight:700;">${escapeHtml(doc.name)}</div>
        <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(doc.department)} | ${escapeHtml(doc.specialization)}</div>
      </div>
      <span style="font-size:12px; font-weight:600; color:var(--primary-500);"><i class="bx bx-building-house"></i> ${escapeHtml(doc.room)}</span>
    </div>
  `).join('');
}

function renderAttendanceSummary(present, absent, total) {
  const container = document.getElementById('attendance-summary');
  if (!container) return;

  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; text-align:center;">
      <div style="background:var(--bg-main); padding:16px; border-radius:var(--radius-md);">
        <div style="font-size:22px; font-weight:800; color:var(--accent-emerald);">${present}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Present Days</div>
      </div>
      <div style="background:var(--bg-main); padding:16px; border-radius:var(--radius-md);">
        <div style="font-size:22px; font-weight:800; color:var(--accent-rose);">${absent}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Absent Days</div>
      </div>
      <div style="background:var(--bg-main); padding:16px; border-radius:var(--radius-md);">
        <div style="font-size:22px; font-weight:800; color:var(--primary-500);">${rate}%</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Rate</div>
      </div>
    </div>
  `;
}

function renderWeeklyReport(progress, attendance) {
  const container = document.getElementById('weekly-report');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div>
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:6px;">
          <span>Program Progress</span>
          <span>${progress}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${progress}%;"></div>
        </div>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:6px;">
          <span>Attendance Level</span>
          <span>${attendance}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${attendance}%; background:var(--accent-emerald);"></div>
        </div>
      </div>
    </div>
  `;
}

function setElementText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}