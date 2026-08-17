import * as fbDb from './firebase-db.js';

import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  const isAllowed = await auth.checkAuth(['admin', 'student', 'supervisor']);
  if (!isAllowed) return;
  renderLayout('attendance');
  initAttendanceModule();
});

function initAttendanceModule() {
  const isAdmin = auth.isAdmin();
  const isStudent = auth.isStudent();
  const user = auth.getCurrentUser();

  const datePicker = document.getElementById('attendance-date-picker');
  if (datePicker) {
    const today = new Date().toISOString().split('T')[0];
    datePicker.value = today;
    datePicker.max = today;
    datePicker.addEventListener('change', () => loadAttendanceData());
  }

  const saveBtn = document.getElementById('save-attendance-btn');
  const adminNotice = document.getElementById('admin-notice');
  const studentNotice = document.getElementById('student-notice');

  if (!isAdmin && saveBtn) {
    saveBtn.style.display = 'none';
    if (adminNotice) adminNotice.style.display = 'none';
    if (studentNotice) studentNotice.style.display = 'block';
  } else if (isAdmin) {
    if (saveBtn) saveBtn.style.display = 'inline-flex';
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
    const [interns, attendanceList] = await Promise.all([
      fbDb.getInterns(),
      fbDb.getAttendance()
    ]);

    const isAdmin = auth.isAdmin();
    const isStudent = auth.isStudent();
    const user = auth.getCurrentUser();

    if (!tbody) return;

    let displayInterns = interns.filter(intern => intern.status !== 'completed');
    if (isStudent && user) {
      displayInterns = displayInterns.filter(i => i.email && i.email.toLowerCase() === user.email.toLowerCase());
    }

    if (displayInterns.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (statsBar) statsBar.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const attendanceMap = new Map();
    attendanceList.forEach(a => {
      if (a.date === dateStr) {
        attendanceMap.set(a.internId, a);
      }
    });

    const allAttendanceForInterns = attendanceList.filter(a => displayInterns.some(i => i.internId === a.internId));

    tbody.innerHTML = displayInterns.map(intern => {
      const record = attendanceMap.get(intern.internId);
      const currentStatus = record ? record.status : 'Not Marked';
      const remarks = record ? (record.remarks || '') : '';
      const attendancePercent = calculateAttendancePercentage(intern.internId, allAttendanceForInterns, dateStr);

      return `
        <tr>
          <td><strong>${escapeHtml(intern.internId)}</strong></td>
          <td>
            <div style="font-weight: 700;">${escapeHtml(intern.name)}</div>
            <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(intern.college)}</div>
          </td>
          <td>${escapeHtml(intern.department)}</td>
          <td>
            ${isAdmin ? `
              <select class="attendance-select attendance-status-select ${currentStatus === 'Not Marked' ? 'not-marked' : ''}" data-intern-id="${intern.internId}" style="width: 140px; font-weight: 700;">
                <option value="Not Marked" ${currentStatus === 'Not Marked' ? 'selected' : ''}>Not Marked</option>
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
              <span>${escapeHtml(remarks || '—')}</span>
            `}
          </td>
          <td>
            <strong>${attendancePercent}%</strong>
          </td>
        </tr>
      `;
    }).join('');

    if (isAdmin) {
      document.querySelectorAll('.attendance-status-select').forEach(select => {
        select.addEventListener('change', function() {
          if (this.value === 'Not Marked') {
            this.classList.add('not-marked');
          } else {
            this.classList.remove('not-marked');
          }
        });
      });
    }

    updateStatsBar(displayInterns, attendanceMap);

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

function calculateAttendancePercentage(internId, allAttendance, selectedDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(selectedDate + 'T00:00:00');

  const pastRecords = allAttendance.filter(a => {
    const recordDate = new Date(a.date + 'T00:00:00');
    return recordDate <= today;
  });

  if (pastRecords.length === 0) return 0;

  const presentCount = pastRecords.filter(a => a.status === 'Present').length;
  return Math.round((presentCount / pastRecords.length) * 100);
}

function updateStatsBar(interns, attendanceMap) {
  const statPresent = document.getElementById('stat-present');
  const statAbsent = document.getElementById('stat-absent');
  const statLeave = document.getElementById('stat-leave');
  const statHalf = document.getElementById('stat-half');
  const statNotMarked = document.getElementById('stat-not-marked');
  const statTotal = document.getElementById('stat-total');

  if (!statPresent) return;

  let present = 0, absent = 0, leave = 0, half = 0, notMarked = 0;

  interns.forEach(intern => {
    const record = attendanceMap.get(intern.internId);
    if (record) {
      switch (record.status) {
        case 'Present': present++; break;
        case 'Absent': absent++; break;
        case 'Leave': leave++; break;
        case 'Half Day': half++; break;
        case 'Not Marked': notMarked++; break;
      }
    } else {
      notMarked++;
    }
  });

  statPresent.textContent = present;
  statAbsent.textContent = absent;
  statLeave.textContent = leave;
  statHalf.textContent = half;
  statNotMarked.textContent = notMarked;
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

  const today = new Date().toISOString().split('T')[0];
  if (dateStr > today) {
    showToast('Cannot save attendance for future dates', 'error');
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
      const remarks = remarksInput ? remarksInput.value.trim() : '';

      if (status === 'Not Marked') {
        continue;
      }

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
    saveBtn.innerHTML = '<i class="bx bx-check-double"></i> Save Attendance';
  }

  if (success) {
    showToast('Attendance saved successfully.', 'success');
    loadAttendanceData();
  } else {
    showToast('Failed to save: ' + errorMsg, 'error');
  }
}