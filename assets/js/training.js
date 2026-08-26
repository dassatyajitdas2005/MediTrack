/* MediTrack - Training Progress Controller (Single Source of Truth) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

let allInterns = [];
let allAttendance = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await auth.init();
    const isAllowed = await auth.checkAuth(['admin', 'student', 'supervisor']);
    if (!isAllowed) return;
    renderLayout('training');
    initTrainingModule();
  } catch (error) {
    console.error('[Training] Init error:', error);
  }
});

async function initTrainingModule() {
  document.getElementById('training-search')?.addEventListener('input', filterAndRenderTraining);
  document.getElementById('training-course-filter')?.addEventListener('change', filterAndRenderTraining);

  await loadTrainingData();
}

async function loadTrainingData() {
  try {
    const handleBgSync = () => {
      filterAndRenderTraining();
    };

    const [enrolledInterns, attendanceList] = await Promise.all([
      fbDb.getEnrolledInterns({
        onBackgroundUpdate: (fresh) => {
          allInterns = fresh || [];
          handleBgSync();
        }
      }),
      fbDb.getAttendance({
        onBackgroundUpdate: (fresh) => {
          allAttendance = fresh || [];
          handleBgSync();
        }
      })
    ]);

    allInterns = enrolledInterns || [];
    allAttendance = attendanceList || [];

    filterAndRenderTraining();
  } catch (error) {
    console.error('[Training] Error loading training data:', error);
    const container = document.getElementById('training-grid-container');
    if (container) {
      container.innerHTML = `<div class="glass-card" style="grid-column:1/-1; text-align:center; padding:40px; color:var(--accent-rose);">Failed to load training records: ${escapeHtml(error.message)}</div>`;
    }
  }
}

function filterAndRenderTraining() {
  const user = auth.getCurrentUser();
  const searchVal = document.getElementById('training-search')?.value.toLowerCase().trim() || '';
  const courseVal = document.getElementById('training-course-filter')?.value.toLowerCase().trim() || '';

  const container = document.getElementById('training-grid-container');
  if (!container) return;

  let displayInterns = allInterns;

  // Student role: show only own record
  if (user && user.role === 'student') {
    const userUid = user.uid || user.id;
    const userEmail = (user.email || '').toLowerCase().trim();
    displayInterns = allInterns.filter(i => 
      (userUid && (i.uid === userUid || i.userId === userUid || (i.allIds && i.allIds.includes(userUid)))) ||
      (userEmail && i.email && i.email.toLowerCase().trim() === userEmail)
    );
  }

  // Apply filters
  const filtered = displayInterns.filter(intern => {
    const displayId = fbDb.formatDisplayInternId(intern).toLowerCase();
    const rawId = (intern.internId || intern.id || '').toLowerCase();
    const name = (intern.name || '').toLowerCase();
    const college = (intern.college || '').toLowerCase();
    const course = (intern.course || '').toLowerCase();

    const nameMatch = !searchVal || 
      name.includes(searchVal) || 
      displayId.includes(searchVal) || 
      rawId.includes(searchVal) || 
      college.includes(searchVal) ||
      course.includes(searchVal);

    const courseMatch = !courseVal || 
      course.includes(courseVal) || 
      courseVal.includes(course) ||
      (courseVal === 'd.pharm' && course.includes('diploma pharmacy')) ||
      (courseVal === 'diploma pharmacy' && (course.includes('d.pharm') || course.includes('diploma')));

    return nameMatch && courseMatch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-card" style="grid-column:1/-1; text-align:center; padding:50px 20px;">
        <i class="bx bx-book-open" style="font-size:48px; color:var(--text-muted); opacity:0.6;"></i>
        <h4 style="margin-top:12px; color:var(--text-main); font-weight:700;">No training records found</h4>
        <p style="font-size:13px; color:var(--text-muted); margin-top:4px;">No intern matches the selected filter criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(intern => {
    const displayId = fbDb.formatDisplayInternId(intern);
    const displayCourse = fbDb.formatCourse(intern.course);
    const progress = fbDb.getInternProgress(intern);
    const attPercent = fbDb.getInternAttendancePercentage(intern, allAttendance);
    const certIssued = intern.certificateIssued === true;

    return `
      <div class="glass-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="training-card-header">
            <div>
              <h3 class="intern-title">${escapeHtml(intern.name || 'Unnamed Intern')}</h3>
              <div class="intern-subtitle">
                <span>${escapeHtml(displayId)}</span>
                <span>·</span>
                <span>${escapeHtml(displayCourse)}</span>
              </div>
            </div>
            <span class="status-pill ${progress.status === 'active' ? 'active' : 'completed'}">
              ${progress.status === 'active' ? 'In Progress' : 'Completed'}
            </span>
          </div>

          <div class="progress-container" style="margin-bottom: 18px;">
            <div class="progress-header" style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 6px;">
              <span>Training Progress</span>
              <span style="color: var(--primary-500); font-weight: 800;">${progress.progressPercent}%</span>
            </div>
            <div class="progress-bar-bg" style="height: 8px; border-radius: 4px; background: var(--border-color); overflow: hidden;">
              <div class="progress-bar-fill" style="width: ${progress.progressPercent}%; height: 100%; border-radius: 4px; background: var(--primary-500); transition: width 0.4s ease;"></div>
            </div>
            <div class="progress-meta">
              <span>${progress.completedDays} Days Completed</span>
              <span>${progress.totalDays} Days</span>
            </div>
          </div>
        </div>

        <div class="training-stats-grid">
          <div><span style="color: var(--text-muted);">Course Duration:</span> <strong>${progress.totalDays} Days</strong></div>
          <div><span style="color: var(--text-muted);">Attendance:</span> <strong style="color: ${attPercent >= 75 ? '#059669' : attPercent >= 50 ? '#d97706' : '#dc2626'};">${attPercent}%</strong></div>
          <div style="grid-column: span 2; display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--text-muted);">Certificate:</span>
            <span class="cert-badge ${certIssued ? 'cert-issued' : 'cert-pending'}">
              <i class="bx ${certIssued ? 'bx-check-circle' : 'bx-time'}"></i>
              ${certIssued ? 'Issued' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}