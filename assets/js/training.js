/* MediTrack - Training Progress View (Firebase Only) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';


document.addEventListener('DOMContentLoaded', async () => {
  await auth.init(); // 🔥 Login check
  renderLayout('training');
  loadTrainingData();
});


async function loadTrainingData() {
  const user = auth.getCurrentUser();
  const interns = await fbDb.getInterns();
  const schedules = await fbDb.getTraining();

  const container = document.getElementById('training-progress-container');
  if (!container) return;

  let displayInterns = interns;
  if (user && user.role === 'student') {
    displayInterns = interns.filter(i => i.email === user.email);
  }

  if (displayInterns.length === 0) {
    container.innerHTML = `<div class="glass-card" style="text-align:center;padding:40px;"><i class="bx bx-book-open" style="font-size:48px;color:var(--text-muted);"></i><h4 style="margin-top:10px;color:var(--text-muted);">No training records found.</h4></div>`;
    return;
  }

  container.innerHTML = displayInterns.map(intern => {
    const progress = getInternProgress(intern);
    const deptSchedule = schedules.find(s => s.department === intern.department) || { rotationName: 'General Training', duration: '30 days' };

    return `
      <div class="glass-card" style="padding:24px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-size:18px; font-weight:800;">${escapeHtml(intern.name)}</h3>
            <p style="font-size:13px; color:var(--text-muted);">${escapeHtml(intern.internId)} | ${escapeHtml(intern.department)}</p>
          </div>
          <span class="status-pill ${progress.status}">${progress.status === 'active' ? 'In Progress' : 'Completed'}</span>
        </div>

        <div class="progress-container" style="margin-bottom:16px;">
          <div class="progress-header">
            <span>Training Progress</span>
            <span>${progress.progressPercent}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width:${progress.progressPercent}%;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-top:4px;">
            <span>${progress.completedDays} days completed</span>
            <span>${intern.totalTrainingDays} days total</span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:13px;">
          <div><strong>Current Rotation:</strong> ${escapeHtml(deptSchedule.rotationName)}</div>
          <div><strong>Duration:</strong> ${escapeHtml(deptSchedule.duration)}</div>
          <div><strong>Attendance:</strong> ${intern.attendancePercentage || 0}%</div>
          <div><strong>Certificate:</strong> ${intern.certificateIssued ? 'Issued' : 'Pending'}</div>
        </div>
      </div>
    `;
  }).join('');
}

function getInternProgress(intern) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const joining = new Date(intern.joiningDate); joining.setHours(0, 0, 0, 0);
  const ending = new Date(intern.endingDate); ending.setHours(0, 0, 0, 0);
  let completedDays = 0;
  if (today >= joining) {
    completedDays = Math.ceil(Math.min(today - joining, ending - joining) / (1000 * 60 * 60 * 24));
  }
  completedDays = Math.max(0, Math.min(completedDays, intern.totalTrainingDays || 30));
  const totalDays = intern.totalTrainingDays || 30;
  const percent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  let status = intern.status;
  if (percent >= 100 || today > ending) status = 'completed';
  else status = 'active';
  return { completedDays, progressPercent: percent, status };
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}