/* MediTrack - Training Progress Controller */

import { db } from './db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('training');
  initTrainingModule();
});

function initTrainingModule() {
  loadTrainingProgress();

  document.getElementById('training-search')?.addEventListener('input', loadTrainingProgress);
  document.getElementById('training-course-filter')?.addEventListener('change', loadTrainingProgress);
}

function loadTrainingProgress() {
  const interns = db.getInterns();
  const isStudent = auth.isStudent();
  const user = auth.getCurrentUser();

  const searchVal = document.getElementById('training-search')?.value.toLowerCase() || '';
  const courseFilter = document.getElementById('training-course-filter')?.value || '';

  let filtered = interns.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(searchVal) || i.internId.toLowerCase().includes(searchVal);
    const matchCourse = !courseFilter || i.course.includes(courseFilter);
    return matchSearch && matchCourse;
  });

  if (isStudent && user) {
    filtered = filtered.filter(i => i.email === user.email);
    if (filtered.length === 0) filtered = [interns[0]];
  }

  const container = document.getElementById('training-grid-container');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px;" class="glass-card">
        <i class="bx bx-run" style="font-size: 48px; color: var(--text-muted);"></i>
        <h4 style="margin-top: 10px; color: var(--text-muted);">No training progress records found.</h4>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(intern => {
    const totalDays = intern.totalTrainingDays || 30;
    const completed = Math.min(intern.completedDays || 0, totalDays);
    const remaining = Math.max(0, totalDays - completed);
    const percent = Math.round((completed / totalDays) * 100);

    const isComplete = percent >= 100;
    const barClass = isComplete ? 'emerald' : '';

    return `
      <div class="glass-card animate-fade-in" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main);">${intern.name}</h3>
            <p style="font-size: 13px; color: var(--primary-500); font-weight: 700;">${intern.course}</p>
            <p style="font-size: 12px; color: var(--text-muted);">${intern.college}</p>
          </div>
          <span class="status-pill ${isComplete ? 'issued' : 'active'}">${isComplete ? 'Completed' : 'In Progress'}</span>
        </div>

        <div class="grid-3" style="margin-bottom: 20px; background: var(--bg-main); padding: 14px; border-radius: var(--radius-md); text-align: center;">
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Completed</div>
            <div style="font-size: 20px; font-weight: 800; color: var(--accent-emerald);">${completed} Days</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Remaining</div>
            <div style="font-size: 20px; font-weight: 800; color: var(--accent-amber);">${remaining} Days</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Attendance</div>
            <div style="font-size: 20px; font-weight: 800; color: var(--primary-500);">${intern.attendancePercentage}%</div>
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-header">
            <span>Overall Completion</span>
            <span>${percent}%</span>
          </div>
          <div class="progress-bar-bg" style="height: 12px;">
            <div class="progress-bar-fill ${barClass}" style="width: ${percent}%;"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
