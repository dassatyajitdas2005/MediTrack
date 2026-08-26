/* MediTrack - Unified Dashboard Analytics Controller (Single Source of Truth) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await auth.init();
    const isAllowed = await auth.checkAuth(['admin', 'student', 'supervisor']);
    if (!isAllowed) return;
    const user = auth.getCurrentUser();
    if (!user) return;

    renderLayout('dashboard');

    if (!auth.isEmailVerified()) {
      const banner = document.getElementById('verify-banner');
      if (banner) banner.style.display = 'flex';
      document.getElementById('resend-verify')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await auth.resendOTP();
          alert('Verification OTP sent! Check your inbox.');
        } catch (err) {
          alert(err.message);
        }
      });
    }

    loadDashboardData(user);
  } catch (error) {
    console.error('[Dashboard] Init error:', error);
  }
});

async function loadDashboardData(user) {
  const refreshUI = (internsList, docsList, attList) => {
    const isAdmin = user.role === 'admin' || user.role === 'supervisor';
    if (isAdmin) {
      loadAdminDashboard(internsList, docsList, attList);
    } else {
      loadStudentDashboard(user, internsList, docsList, attList);
    }
  };

  try {
    let currentInterns = [];
    let currentDoctors = [];
    let currentAttendance = [];

    const handleBgUpdate = () => {
      refreshUI(currentInterns, currentDoctors, currentAttendance);
    };

    const [enrolledInterns, doctors, attendance] = await Promise.all([
      fbDb.getEnrolledInterns({
        onBackgroundUpdate: (fresh) => {
          currentInterns = fresh || [];
          handleBgUpdate();
        }
      }),
      fbDb.getDoctors({
        onBackgroundUpdate: (fresh) => {
          currentDoctors = fresh || [];
          handleBgUpdate();
        }
      }),
      fbDb.getAttendance({
        onBackgroundUpdate: (fresh) => {
          currentAttendance = fresh || [];
          handleBgUpdate();
        }
      })
    ]);

    currentInterns = enrolledInterns || [];
    currentDoctors = doctors || [];
    currentAttendance = attendance || [];

    refreshUI(currentInterns, currentDoctors, currentAttendance);
  } catch (error) {
    console.error('[Dashboard] Error loading data:', error);
    showErrorState(error.message || 'Failed to load dashboard data');
  }
}

function loadAdminDashboard(interns, doctors, attendance) {
  const todayStr = new Date().toISOString().split('T')[0];
  const summary = fbDb.getAttendanceSummary(attendance, interns, todayStr);
  const totalDoctors = (doctors || []).length;

  // 1. KPI Top Cards (strictly 4 cards, no absent card added)
  setElementText('kpi-total-days', summary.totalInterns);
  setElementText('kpi-completed-days', summary.presentToday);
  setElementText('kpi-attendance', `${totalDoctors}`);
  setElementText('kpi-progress', `${summary.completionRate}%`);

  // Update card titles & subtexts for Admin
  const titles = document.querySelectorAll('.kpi-card .kpi-title');
  const subtexts = document.querySelectorAll('.kpi-card .kpi-subtext');
  if (titles.length >= 4) {
    titles[0].textContent = 'Total Interns';
    if (subtexts[0]) subtexts[0].textContent = 'Enrolled interns';
    titles[1].textContent = 'Present Today';
    if (subtexts[1]) subtexts[1].textContent = `Today: ${todayStr}`;
    titles[2].textContent = 'OPD Doctors';
    if (subtexts[2]) subtexts[2].textContent = 'Active doctors';
    titles[3].textContent = 'Completion Rate';
    if (subtexts[3]) subtexts[3].textContent = `${summary.completedInterns} / ${summary.totalInterns} completed`;
  }

  // 2. Training Progress Bar
  const progressBar = document.getElementById('training-progress-bar');
  if (progressBar) progressBar.style.width = `${summary.completionRate}%`;
  setElementText('progress-text', `${summary.completionRate}%`);
  setElementText('progress-detail', `${summary.completedInterns} / ${summary.totalInterns} interns completed`);
  setElementText('progress-status', summary.completionRate >= 100 ? 'All Completed' : 'In Progress');

  // 3. Today's Rotational Schedule
  renderScheduleList([
    { time: '09:00 AM - 01:00 PM', task: 'Morning OPD & Medicine Dispensing Shift', status: 'Active' },
    { time: '01:00 PM - 02:00 PM', task: 'Departmental Lunch Break & Intermission', status: 'Break' },
    { time: '02:00 PM - 05:00 PM', task: 'Afternoon Ward Duty & Stock Inventory Check', status: 'Scheduled' }
  ]);

  // 4. Doctors List
  renderDoctorList((doctors || []).slice(0, 4));

  // 5. Attendance Summary (Present Days, Absent Days, Rate — exactly consistent with Reports)
  renderAdminAttendanceSummary(summary);

  // 6. Weekly Performance Report
  renderWeeklyReport(summary.completionRate, summary.avgInternAttendance);
}

function loadStudentDashboard(user, interns, doctors, attendance) {
  const userUid = user.uid || user.id;
  const userEmail = (user.email || '').toLowerCase().trim();

  const studentIntern = (interns || []).find(i => 
    (userUid && (i.uid === userUid || i.userId === userUid || (i.allIds && i.allIds.includes(userUid)))) ||
    (userEmail && i.email && i.email.toLowerCase().trim() === userEmail)
  ) || null;

  let totalDays = 0;
  let completedDays = 0;
  let progressPercent = 0;
  let statusText = 'Not Enrolled';

  if (studentIntern) {
    const prog = fbDb.getInternProgress(studentIntern);
    totalDays = prog.totalDays;
    completedDays = prog.completedDays;
    progressPercent = prog.progressPercent;
    statusText = prog.progressPercent >= 100 ? 'Completed' : 'In Progress';
  }

  const attendancePercent = studentIntern 
    ? fbDb.getInternAttendancePercentage(studentIntern, attendance) 
    : 0;

  // KPI Top Cards for Student
  setElementText('kpi-total-days', totalDays);
  setElementText('kpi-completed-days', completedDays);
  setElementText('kpi-attendance', `${attendancePercent}%`);
  setElementText('kpi-progress', `${progressPercent}%`);

  const titles = document.querySelectorAll('.kpi-card .kpi-title');
  const subtexts = document.querySelectorAll('.kpi-card .kpi-subtext');
  if (titles.length >= 4) {
    titles[0].textContent = 'Total Training Days';
    if (subtexts[0]) subtexts[0].textContent = 'Program duration';
    titles[1].textContent = 'Completed Days';
    if (subtexts[1]) subtexts[1].textContent = 'Days finished';
    titles[2].textContent = 'Attendance';
    if (subtexts[2]) subtexts[2].textContent = 'Overall rate';
    titles[3].textContent = 'Progress';
    if (subtexts[3]) subtexts[3].textContent = 'Program completion';
  }

  // Progress Bar
  const progressBar = document.getElementById('training-progress-bar');
  if (progressBar) progressBar.style.width = `${progressPercent}%`;
  setElementText('progress-text', `${progressPercent}%`);
  setElementText('progress-detail', `${completedDays} / ${totalDays} days`);
  setElementText('progress-status', statusText);

  // Schedule
  renderScheduleList([
    { time: '09:00 AM - 11:00 AM', task: 'Outdoor Medicine Dispensing Duty', status: 'Daily' },
    { time: '11:00 AM - 01:00 PM', task: 'Stock Verification & Inventory Log', status: 'Daily' },
    { time: '02:00 PM - 04:00 PM', task: 'Clinical Ward Duty & Counseling', status: 'Weekly' }
  ]);

  // Doctors
  renderDoctorList((doctors || []).slice(0, 4));

  // Student Attendance Summary
  let presentDays = 0;
  let absentDays = 0;

  if (studentIntern) {
    const targetIds = new Set([
      studentIntern.internId,
      studentIntern.id,
      studentIntern.uid,
      studentIntern.userId,
      ...(studentIntern.allIds || [])
    ].filter(Boolean));

    const todayStr = new Date().toISOString().split('T')[0];
    const recordsByDate = new Map();

    (attendance || []).forEach(a => {
      if (!a.internId || !targetIds.has(a.internId)) return;
      if (a.date && a.date <= todayStr && a.status !== 'Not Marked') {
        recordsByDate.set(a.date, a);
      }
    });

    Array.from(recordsByDate.values()).forEach(a => {
      if (a.status === 'Present') presentDays++;
      else if (a.status === 'Absent') absentDays++;
      else if (a.status === 'Half Day') presentDays += 0.5;
    });
  }

  renderStudentAttendanceSummary(presentDays, absentDays, attendancePercent);

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
        <div style="font-size:13px; font-weight:700;">${escapeHtml(doc.name || 'Dr. Unknown')}</div>
        <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(doc.department || 'General')} | ${escapeHtml(doc.specialization || doc.qualification || 'OPD')}</div>
      </div>
      <span style="font-size:12px; font-weight:600; color:var(--primary-500);"><i class="bx bx-building-house"></i> ${escapeHtml(doc.room || doc.opdRoom || 'OPD')}</span>
    </div>
  `).join('');
}

function renderAdminAttendanceSummary(summary) {
  const container = document.getElementById('attendance-summary');
  if (!container) return;

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; text-align:center;">
      <div style="background:var(--bg-main); padding:16px; border-radius:var(--radius-md);">
        <div style="font-size:22px; font-weight:800; color:var(--accent-emerald);">${summary.presentLogs}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Present Days</div>
      </div>
      <div style="background:var(--bg-main); padding:16px; border-radius:var(--radius-md);">
        <div style="font-size:22px; font-weight:800; color:var(--accent-rose);">${summary.absentLogs}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Absent Days</div>
      </div>
      <div style="background:var(--bg-main); padding:16px; border-radius:var(--radius-md);">
        <div style="font-size:22px; font-weight:800; color:var(--primary-500);">${summary.overallLogRate}%</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Rate</div>
      </div>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:12px; border-top:1px solid var(--border-color); font-size:12px; color:var(--text-muted);">
      <span>Today's Attendance: <strong>${summary.presentToday} Present</strong> / <strong>${summary.absentToday} Absent</strong></span>
      <span>Avg Intern Attendance: <strong style="color:var(--primary-500);">${summary.avgInternAttendance}%</strong></span>
    </div>
  `;
}

function renderStudentAttendanceSummary(present, absent, rate) {
  const container = document.getElementById('attendance-summary');
  if (!container) return;

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
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Attendance Rate</div>
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
          <span>Program Completion Level</span>
          <span>${progress}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${progress}%;"></div>
        </div>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:6px;">
          <span>Average Attendance Level</span>
          <span>${attendance}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${attendance}%; background:var(--accent-emerald);"></div>
        </div>
      </div>
    </div>
  `;
}

function showErrorState(message) {
  setElementText('kpi-total-days', '—');
  setElementText('kpi-completed-days', '—');
  setElementText('kpi-attendance', '—');
  setElementText('kpi-progress', '—');

  const summary = document.getElementById('attendance-summary');
  if (summary) {
    summary.innerHTML = `<p style="color:var(--accent-rose); text-align:center; padding:16px;">Unable to load attendance summary: ${escapeHtml(message)}</p>`;
  }
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