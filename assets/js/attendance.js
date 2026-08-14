import * as fbDb from './firebase-db.js';

import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  renderLayout('attendance');
  await auth.init();
  initAttendanceModule();
});

function initAttendanceModule() {
  const isAdmin = auth.isAdmin();
  const isStudent = auth.isStudent();
  const user = auth.getCurrentUser();

  // Set default date picker to today
  const datePicker = document.getElementById('attendance-date-picker');
  if (datePicker) {
    datePicker.value = new Date().toISOString().split('T')[0];
    datePicker.addEventListener('change', () => loadAttendanceData());
  }

  // Admin save button vs Student notification
  const saveBtn = document.getElementById('save-attendance-btn');
  const adminNotice = document.getElementById('admin-notice');
  const studentNotice = document.getElementById('student-notice');

  if (!isAdmin && saveBtn) {
    saveBtn.style.display = 'none';
    if (adminNotice) adminNotice.style.display = 'none';
    if (studentNotice) studentNotice.style.display = 'block';
  } else if (isAdmin) {
    if (adminNotice) adminNotice.style.display = 'inline-flex';
    if (studentNotice) studentNotice.style.display = 'none';
  }

  loadAttendanceData();

  if (saveBtn && isAdmin) {
    saveBtn.addEventListener('click', handleSaveBatchAttendance);
  }
}

async function loadAttendanceData() {
  const dateStr = document.getElementById('attendance-date-picker').value;
  const statsBar = document.getElementById('stats-bar');
  const emptyState = document.getElementById('empty-state');
  const tbody = document.getElementById('attendance-tbody');

  try {
    const interns = await fbDb.getInterns();
    const attendanceList = await fbDb.getAttendance();

    const isAdmin = auth.isAdmin();
    const isStudent = auth.isStudent();
    const user = auth.getCurrentUser();

    if (!tbody) return;

    // Filter for Student role
    let displayInterns = interns;
    if (isStudent && user) {
      displayInterns = interns.filter(i => i.email && i.email.toLowerCase() === user.email.toLowerCase());
    }

    if (displayInterns.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (statsBar) statsBar.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = displayInterns.map(intern => {
      // Find record for selected date
      const record = attendanceList.find(a => a.internId === intern.internId && a.date === dateStr);
      const currentStatus = record ? record.status : 'Present';
      const remarks = record ? (record.remarks || '') : '';

      return `
        <tr>
          <td><strong>${intern.internId}</strong></td>
          <td>
            <div style="font-weight: 700;">${escapeHtml(intern.name)}</div>
            <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(intern.college)}</div>
          </td>
          <td>${escapeHtml(intern.department)}</td>
          <td>
            ${isAdmin ? `
              <select class="attendance-select attendance-status-select" data-intern-id="${intern.internId}" style="width: 140px; font-weight: 700;">
                <option value="Present" ${currentStatus === 'Present' ? 'selected' : ''}>Present</option>
                <option value="Absent" ${currentStatus === 'Absent' ? 'selected' : ''}>Absent</option>
                <option value="Leave" ${currentStatus === 'Leave' ? 'selected' : ''}>Leave</option>
                <option value="Half Day" ${currentStatus === 'Half Day' ? 'selected' : ''}>Half Day</option>
              </select>
            ` : `
              <span class="status-badge status-${currentStatus.toLowerCase().replace(' ', '-')}">${escapeHtml(currentStatus)}</span>
            `}
          </td>
          <td>
            ${isAdmin ? `
              <input type="text" class="remarks-input attendance-remarks-input" data-intern-id="${intern.internId}" value="${escapeHtml(remarks)}" placeholder="e.g. Ward duty shift">
            ` : `
              <span>${escapeHtml(remarks || 'Regular daily shift')}</span>
            `}
          </td>
          <td>
            <strong>${intern.attendancePercentage || 0}%</strong>
          </td>
        </tr>
      `;
    }).join('');

    // Update stats bar
    updateStatsBar(displayInterns, attendanceList, dateStr);

    if (statsBar) statsBar.style.display = 'flex';

  } catch (error) {
    console.error('[Attendance] Error loading data:', error);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--danger);">Failed to load attendance: ${error.message}</td></tr>`;
    }
    if (emptyState) emptyState.style.display = 'none';
    if (statsBar) statsBar.style.display = 'none';
  }
}

function updateStatsBar(interns, attendanceList, dateStr) {
  const statPresent = document.getElementById('stat-present');
  const statAbsent = document.getElementById('stat-absent');
  const statLeave = document.getElementById('stat-leave');
  const statHalf = document.getElementById('stat-half');
  const statTotal = document.getElementById('stat-total');

  if (!statPresent) return;

  let present = 0, absent = 0, leave = 0, half = 0;

  interns.forEach(intern => {
    const record = attendanceList.find(a => a.internId === intern.internId && a.date === dateStr);
    if (record) {
      switch (record.status) {
        case 'Present': present++; break;
        case 'Absent': absent++; break;
        case 'Leave': leave++; break;
        case 'Half Day': half++; break;
      }
    }
  });

  statPresent.textContent = present;
  statAbsent.textContent = absent;
  statLeave.textContent = leave;
  statHalf.textContent = half;
  statTotal.textContent = interns.length;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = 'toast ' + (type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : '');
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

async function handleSaveBatchAttendance() {
  const dateStr = document.getElementById('attendance-date-picker').value;
  const statusSelects = document.querySelectorAll('.attendance-status-select');
  const remarksInputs = document.querySelectorAll('.attendance-remarks-input');
  const saveBtn = document.getElementById('save-attendance-btn');

  if (!dateStr) {
    showToast('Please select a date', 'error');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i> Saving...';
  }

  let success = true;
  let errorMsg = '';

  try {
    for (const select of statusSelects) {
      const internId = select.getAttribute('data-intern-id');
      const status = select.value;
      const remarksInput = Array.from(remarksInputs).find(input => input.getAttribute('data-intern-id') === internId);
      const remarks = remarksInput ? remarksInput.value : '';

      await fbDb.markAttendance({
        internId,
        date: dateStr,
        status,
        remarks
      });
    }
  } catch (error) {
    console.error('[Attendance] Save error:', error);
    success = false;
    errorMsg = error.message;
  }

  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="bx bx-check-double"></i> Save Attendance Batch';
  }

  if (success) {
    showToast('Attendance saved successfully.', 'success');
    loadAttendanceData();
  } else {
    showToast('Failed to save: ' + errorMsg, 'error');
  }
}