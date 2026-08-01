/* MediTrack - Attendance Module Controller */

import { db } from './db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('attendance');
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
  const adminNotice = document.getElementById('admin-attendance-notice');
  const studentNotice = document.getElementById('student-attendance-notice');

  if (!isAdmin && saveBtn) {
    saveBtn.style.display = 'none';
    if (adminNotice) adminNotice.style.display = 'none';
    if (studentNotice) studentNotice.style.display = 'block';
  }

  loadAttendanceData();

  if (saveBtn && isAdmin) {
    saveBtn.addEventListener('click', handleSaveBatchAttendance);
  }
}

function loadAttendanceData() {
  const dateStr = document.getElementById('attendance-date-picker').value;
  const interns = db.getInterns();
  const attendanceList = db.getAttendance();
  const isAdmin = auth.isAdmin();
  const isStudent = auth.isStudent();
  const user = auth.getCurrentUser();

  const tbody = document.getElementById('attendance-tbody');
  if (!tbody) return;

  // Filter for Student role
  let displayInterns = interns;
  if (isStudent && user) {
    displayInterns = interns.filter(i => i.email === user.email);
    if (displayInterns.length === 0) displayInterns = [interns[0]]; // fallback
  }

  if (displayInterns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px;">No intern records to mark.</td></tr>`;
    return;
  }

  tbody.innerHTML = displayInterns.map(intern => {
    // Find record for selected date
    const record = attendanceList.find(a => a.internId === intern.internId && a.date === dateStr);
    const currentStatus = record ? record.status : 'Present';
    const remarks = record ? (record.remarks || '') : '';

    return `
      <tr>
        <td><strong>${intern.internId}</strong></td>
        <td>
          <div style="font-weight: 700;">${intern.name}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${intern.college}</div>
        </td>
        <td>${intern.department}</td>
        <td>
          ${isAdmin ? `
            <select class="form-control attendance-status-select" data-intern-id="${intern.internId}" style="width: 140px; font-weight: 700;">
              <option value="Present" ${currentStatus === 'Present' ? 'selected' : ''}>Present</option>
              <option value="Absent" ${currentStatus === 'Absent' ? 'selected' : ''}>Absent</option>
            </select>
          ` : `
            <span class="status-pill ${currentStatus.toLowerCase()}">${currentStatus}</span>
          `}
        </td>
        <td>
          ${isAdmin ? `
            <input type="text" class="form-control attendance-remarks-input" data-intern-id="${intern.internId}" value="${remarks}" placeholder="e.g. Ward duty shift">
          ` : `
            <span>${remarks || 'Regular daily shift'}</span>
          `}
        </td>
        <td>
          <strong>${intern.attendancePercentage}%</strong>
        </td>
      </tr>
    `;
  }).join('');
}

function handleSaveBatchAttendance() {
  const dateStr = document.getElementById('attendance-date-picker').value;
  const statusSelects = document.querySelectorAll('.attendance-status-select');
  const remarksInputs = document.querySelectorAll('.attendance-remarks-input');

  statusSelects.forEach(select => {
    const internId = select.getAttribute('data-intern-id');
    const status = select.value;
    const remarksInput = Array.from(remarksInputs).find(input => input.getAttribute('data-intern-id') === internId);
    const remarks = remarksInput ? remarksInput.value : '';

    db.markAttendance({
      internId,
      date: dateStr,
      status,
      remarks
    });
  });

  alert(`Attendance successfully recorded for ${dateStr}!`);
  loadAttendanceData();
}
