/* MediTrack - Attendance Module Controller (Single Source of Truth) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await auth.init();
    const isAllowed = await auth.checkAuth(['admin', 'student', 'supervisor']);
    if (!isAllowed) return;
    renderLayout('attendance');
    initAttendanceModule();
  } catch (error) {
    console.error('[Attendance] Init error:', error);
  }
});

function initAttendanceModule() {
  const isAdmin = auth.isAdmin();

  const datePicker = document.getElementById('attendance-date-picker');
  if (datePicker) {
    const today = new Date().toISOString().split('T')[0];
    datePicker.value = today;
    datePicker.max = today;
    datePicker.addEventListener('change', () => loadAttendanceData());
  }

  const saveBtn = document.getElementById('save-attendance-btn');

  if (!isAdmin && saveBtn) {
    saveBtn.style.display = 'none';
  } else if (isAdmin) {
    if (saveBtn) saveBtn.style.display = 'inline-flex';
  }

  loadAttendanceData();

  if (saveBtn && isAdmin) {
    saveBtn.addEventListener('click', handleSaveBatchAttendance);
  }
}

async function loadAttendanceData(forceRefresh = false) {
  const datePicker = document.getElementById('attendance-date-picker');
  const dateStr = datePicker ? datePicker.value : new Date().toISOString().split('T')[0];
  const statsBar = document.getElementById('stats-bar');
  const emptyState = document.getElementById('empty-state');
  const tbody = document.getElementById('attendance-tbody');

  try {
    let currentInterns = [];
    let currentAttendance = [];

    const handleBgSync = () => {
      renderAttendanceView(currentInterns, currentAttendance, dateStr);
    };

    const [interns, attendanceList] = await Promise.all([
      fbDb.getEnrolledInterns({
        forceRefresh,
        onBackgroundUpdate: (fresh) => {
          currentInterns = fresh || [];
          handleBgSync();
        }
      }),
      fbDb.getAttendance({
        forceRefresh,
        onBackgroundUpdate: (fresh) => {
          currentAttendance = fresh || [];
          handleBgSync();
        }
      })
    ]);

    currentInterns = interns || [];
    currentAttendance = attendanceList || [];
    renderAttendanceView(currentInterns, currentAttendance, dateStr);
  } catch (error) {
    console.error('[Attendance] Error loading data:', error);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--accent-rose);">Failed to load attendance: ${escapeHtml(error.message)}</td></tr>`;
    }
    if (emptyState) emptyState.style.display = 'none';
    if (statsBar) statsBar.style.display = 'none';
  }
}

function renderAttendanceView(interns, attendanceList, dateStr) {
  const statsBar = document.getElementById('stats-bar');
  const emptyState = document.getElementById('empty-state');
  const tbody = document.getElementById('attendance-tbody');
  const isAdmin = auth.isAdmin();
  const isStudent = auth.isStudent();
  const user = auth.getCurrentUser();

  if (!tbody) return;

  let displayInterns = interns || [];

  if (isStudent && user) {
    const userUid = user.uid || user.id;
    const userEmail = (user.email || '').toLowerCase().trim();
    displayInterns = displayInterns.filter(i => 
      (userUid && (i.uid === userUid || i.userId === userUid || (i.allIds && i.allIds.includes(userUid)))) ||
      (userEmail && i.email && i.email.toLowerCase().trim() === userEmail)
    );
  }

  if (displayInterns.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    if (statsBar) statsBar.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  const attendanceMap = new Map();
  (attendanceList || []).forEach(a => {
    if (a.date === dateStr && a.internId) {
      attendanceMap.set(a.internId, a);
    }
  });

  tbody.innerHTML = displayInterns.map(intern => {
    const targetIds = [intern.internId, intern.id, intern.uid, intern.userId, ...(intern.allIds || [])].filter(Boolean);
    let record = null;
    for (const id of targetIds) {
      if (attendanceMap.has(id)) {
        record = attendanceMap.get(id);
        break;
      }
    }

    const key = intern.internId || intern.id;
    const displayId = fbDb.formatDisplayInternId(intern);
    const displayCourse = fbDb.formatCourse(intern.course);
    
    // Status is strictly Present or Absent in the active model
    const currentStatus = (record && record.status === 'Absent') ? 'Absent' : 'Present';
    const remarks = record ? (record.remarks || '') : '';
    const attendancePercent = fbDb.getInternAttendancePercentage(intern, attendanceList);

    return `
      <tr>
        <td><strong>${escapeHtml(displayId)}</strong></td>
        <td>
          <div style="font-weight: 700;">${escapeHtml(intern.name || 'Unnamed')}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(intern.college || displayCourse)}</div>
        </td>
        <td>${escapeHtml(intern.department || '—')}</td>
        <td>
          ${isAdmin ? `
            <select class="attendance-select attendance-status-select" data-intern-id="${key}" style="width: 130px; font-weight: 700;">
              <option value="Present" ${currentStatus === 'Present' ? 'selected' : ''}>Present</option>
              <option value="Absent" ${currentStatus === 'Absent' ? 'selected' : ''}>Absent</option>
            </select>
          ` : `
            <span class="status-badge status-${currentStatus.toLowerCase()}">${escapeHtml(currentStatus)}</span>
          `}
        </td>
        <td>
          ${isAdmin ? `
            <input type="text" class="remarks-input attendance-remarks-input" data-intern-id="${key}" value="${escapeHtml(remarks)}" placeholder="e.g. Ward duty shift">
          ` : `
            <span>${escapeHtml(remarks || '—')}</span>
          `}
        </td>
        <td>
          <strong style="color: ${attendancePercent >= 75 ? '#059669' : attendancePercent >= 50 ? '#d97706' : '#dc2626'};">${attendancePercent}%</strong>
        </td>
      </tr>
    `;
  }).join('');

  updateStatsBar();

  if (isAdmin) {
    document.querySelectorAll('.attendance-status-select').forEach(select => {
      select.addEventListener('change', () => updateStatsBar());
    });
  }

  if (statsBar) statsBar.style.display = 'flex';
}

function updateStatsBar() {
  const statPresent = document.getElementById('stat-present');
  const statAbsent = document.getElementById('stat-absent');
  const statTotal = document.getElementById('stat-total');

  if (!statPresent || !statAbsent || !statTotal) return;

  const isAdmin = auth.isAdmin();
  let presentCount = 0;
  let absentCount = 0;
  let totalCount = 0;

  if (isAdmin) {
    const selects = document.querySelectorAll('.attendance-status-select');
    totalCount = selects.length;
    selects.forEach(select => {
      if (select.value === 'Present') {
        presentCount++;
      } else if (select.value === 'Absent') {
        absentCount++;
      }
    });
  } else {
    const badges = document.querySelectorAll('.status-badge');
    totalCount = badges.length;
    badges.forEach(badge => {
      const text = badge.textContent.trim();
      if (text === 'Present') {
        presentCount++;
      } else if (text === 'Absent') {
        absentCount++;
      }
    });
  }

  statPresent.textContent = presentCount;
  statAbsent.textContent = absentCount;
  statTotal.textContent = totalCount;
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
  const datePicker = document.getElementById('attendance-date-picker');
  const dateStr = datePicker ? datePicker.value : new Date().toISOString().split('T')[0];
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

      await fbDb.markAttendance({
        internId,
        date: dateStr,
        status,
        remarks
      });
    }

    // Update attendance percentage back to Firestore intern records
    const [allInterns, updatedAttendance] = await Promise.all([
      fbDb.getEnrolledInterns({ forceRefresh: true }),
      fbDb.getAttendance({ forceRefresh: true })
    ]);

    for (const intern of allInterns) {
      if (intern.id) {
        const newPct = fbDb.getInternAttendancePercentage(intern, updatedAttendance);
        await fbDb.updateIntern(intern.id, { attendancePercentage: newPct }).catch(e => {
          console.warn('[Attendance] Failed to update intern percentage:', e);
        });
      }
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
    loadAttendanceData(true);
  } else {
    showToast('Failed to save: ' + errorMsg, 'error');
  }
}