/* MediTrack - Daily Training Schedule Rotator Controller */

import { db } from './db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('schedule');
  initScheduleModule();
});

function initScheduleModule() {
  const courseSelector = document.getElementById('schedule-course-selector');
  if (courseSelector) {
    courseSelector.addEventListener('change', (e) => renderScheduleForCourse(e.target.value));
    renderScheduleForCourse(courseSelector.value);
  }
}

function renderScheduleForCourse(courseName) {
  const schedules = db.getCollection('training_schedule');
  const courseData = schedules[courseName] || schedules["Diploma Pharmacy (90 Days)"];
  
  const container = document.getElementById('schedule-list-container');
  if (!container) return;

  const daysList = courseData.dailyDepartment || [];

  if (daysList.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px;" class="glass-card">
        <p style="color: var(--text-muted);">No rotational schedule published yet for ${courseName}.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = daysList.map(item => `
    <div class="glass-card animate-fade-in" style="padding: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 50px; height: 50px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--primary-500), var(--secondary-500)); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 800;">
          <span style="font-size: 10px; text-transform: uppercase;">DAY</span>
          <span style="font-size: 18px;">${item.day}</span>
        </div>
        <div>
          <h4 style="font-size: 16px; font-weight: 800; color: var(--text-main);">${item.department} Rotation</h4>
          <p style="font-size: 13px; color: var(--primary-500); font-weight: 700;">Task: ${item.assignment}</p>
          <p style="font-size: 12px; color: var(--text-muted);"><i class="bx bx-user"></i> Supervisor: ${item.supervisor}</p>
        </div>
      </div>

      <div>
        <span class="status-pill active">${item.remarks || 'Standard Rotation'}</span>
      </div>
    </div>
  `).join('');
}
