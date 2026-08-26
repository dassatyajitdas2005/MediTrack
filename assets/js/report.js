/* MediTrack - Reports & Summary Controller (Single Source of Truth) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

let currentEnrolledInterns = [];
let currentDoctorsList = [];
let currentAttendanceList = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await auth.init();
    const isAllowed = await auth.checkAuth(['admin', 'supervisor']);
    if (!isAllowed) return;

    renderLayout('report');
    initReports();
  } catch (error) {
    console.error('[Reports] Initialization error:', error);
  }
});

function initReports() {
  // Export & Print bindings
  document.getElementById('export-csv-btn')?.addEventListener('click', handleExportCSV);
  document.getElementById('print-report-btn')?.addEventListener('click', handlePrintSummary);

  // Search & Filter bindings
  document.getElementById('report-search-input')?.addEventListener('input', renderInternTable);
  document.getElementById('report-course-filter')?.addEventListener('change', renderInternTable);

  loadReportData();
}

/**
 * Load all Firestore collections using the single source of truth helpers
 */
async function loadReportData() {
  try {
    const handleBgSync = () => {
      renderSummaryCards();
      renderInternTable();
      renderDoctorTable();
    };

    const [enrolledInterns, doctors, attendance] = await Promise.all([
      fbDb.getEnrolledInterns({
        onBackgroundUpdate: (fresh) => {
          currentEnrolledInterns = fresh || [];
          handleBgSync();
        }
      }),
      fbDb.getDoctors({
        onBackgroundUpdate: (fresh) => {
          currentDoctorsList = fresh || [];
          handleBgSync();
        }
      }),
      fbDb.getAttendance({
        onBackgroundUpdate: (fresh) => {
          currentAttendanceList = fresh || [];
          handleBgSync();
        }
      })
    ]);

    currentEnrolledInterns = enrolledInterns || [];
    currentDoctorsList = doctors || [];
    currentAttendanceList = attendance || [];

    renderSummaryCards();
    renderInternTable();
    renderDoctorTable();
  } catch (error) {
    console.error('[Reports] Error loading report data:', error);
    showErrorState(error.message || 'Unable to connect to database');
  }
}

/**
 * Update top 4 KPI summary cards based on shared attendance summary calculation
 */
function renderSummaryCards() {
  const summary = fbDb.getAttendanceSummary(currentAttendanceList, currentEnrolledInterns);

  // Display clearly defined metrics
  setElementText('rpt-total-logs', summary.totalValidLogs);
  setElementText('rpt-present-count', summary.presentLogs);
  setElementText('rpt-absent-count', summary.absentLogs);
  setElementText('rpt-avg-attendance', `${summary.avgInternAttendance}%`);
}

/**
 * Render Intern Training Master Report with search and course filtering
 */
function renderInternTable() {
  const tbody = document.getElementById('rpt-interns-tbody');
  if (!tbody) return;

  const searchVal = document.getElementById('report-search-input')?.value.toLowerCase().trim() || '';
  const courseVal = document.getElementById('report-course-filter')?.value.toLowerCase().trim() || '';

  if (currentEnrolledInterns.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 36px 20px; color: var(--text-muted);">
          <i class="bx bx-group" style="font-size: 36px; opacity: 0.5; margin-bottom: 8px; display: block;"></i>
          <strong>No enrolled interns found.</strong>
          <div style="font-size: 12px; margin-top: 4px;">Enroll new interns in the Intern Management module.</div>
        </td>
      </tr>
    `;
    return;
  }

  // Filter interns
  const filtered = currentEnrolledInterns.filter(intern => {
    const displayId = fbDb.formatDisplayInternId(intern).toLowerCase();
    const rawId = String(intern.internId || intern.id || intern.uid || '').toLowerCase();
    const name = String(intern.name || '').toLowerCase();
    const department = String(intern.department || '').toLowerCase();
    const course = String(intern.course || '').toLowerCase();

    const matchesSearch = !searchVal || 
      name.includes(searchVal) || 
      displayId.includes(searchVal) || 
      rawId.includes(searchVal) || 
      department.includes(searchVal) || 
      course.includes(searchVal);

    const matchesCourse = !courseVal || 
      course.includes(courseVal) || 
      courseVal.includes(course) ||
      (courseVal === 'd.pharm' && course.includes('diploma pharmacy')) ||
      (courseVal === 'diploma pharmacy' && (course.includes('d.pharm') || course.includes('diploma')));

    return matchesSearch && matchesCourse;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 32px 20px; color: var(--text-muted);">
          <i class="bx bx-search" style="font-size: 32px; opacity: 0.5; margin-bottom: 8px; display: block;"></i>
          No interns match the filter criteria "${escapeHtml(searchVal || courseVal)}".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(intern => {
    const displayId = fbDb.formatDisplayInternId(intern);
    const displayCourse = fbDb.formatCourse(intern.course);
    const progress = fbDb.getInternProgress(intern);
    const attPercent = fbDb.getInternAttendancePercentage(intern, currentAttendanceList);
    const certIssued = intern.certificateIssued === true;

    return `
      <tr>
        <td><strong>${escapeHtml(displayId)}</strong></td>
        <td>
          <div style="font-weight: 700;">${escapeHtml(intern.name || 'Unnamed Intern')}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(intern.email || intern.college || '—')}</div>
        </td>
        <td>${escapeHtml(displayCourse)}</td>
        <td>${escapeHtml(intern.department || '—')}</td>
        <td>
          <div style="font-weight: 600;">${progress.completedDays} / ${progress.totalDays} days</div>
          <div style="font-size: 11px; color: var(--text-muted);">${progress.progressPercent}% completed</div>
        </td>
        <td>
          <strong style="color: ${attPercent >= 75 ? '#059669' : attPercent >= 50 ? '#d97706' : '#dc2626'}; font-size: 14px;">
            ${attPercent}%
          </strong>
        </td>
        <td>
          <span class="cert-badge ${certIssued ? 'cert-issued' : 'cert-pending'}">
            <i class="bx ${certIssued ? 'bx-check-circle' : 'bx-time'}"></i>
            ${certIssued ? 'Issued' : 'Pending'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Doctor OPD Schedule Report from Firestore
 */
function renderDoctorTable() {
  const tbody = document.getElementById('rpt-doctors-tbody');
  if (!tbody) return;

  if (currentDoctorsList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 36px 20px; color: var(--text-muted);">
          <i class="bx bx-user-voice" style="font-size: 36px; opacity: 0.5; margin-bottom: 8px; display: block;"></i>
          <strong>No doctors found.</strong>
          <div style="font-size: 12px; margin-top: 4px;">Add OPD doctors in the Doctor OPD Schedule module.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = currentDoctorsList.map(doc => {
    const docId = doc.doctorId || doc.id || 'DOC-N/A';
    const days = Array.isArray(doc.availableDays) 
      ? doc.availableDays.join(', ') 
      : (doc.availableDays || 'All Days');
    const timing = doc.opdTiming || doc.timing || '09:00 AM - 02:00 PM';

    return `
      <tr>
        <td><strong>${escapeHtml(docId)}</strong></td>
        <td>
          <div style="font-weight: 700;">${escapeHtml(doc.name || 'Dr. Unknown')}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(doc.qualification || doc.specialization || '')}</div>
        </td>
        <td>${escapeHtml(doc.department || '—')}</td>
        <td>${escapeHtml(doc.room || doc.opdRoom || 'OPD Room')}</td>
        <td>${escapeHtml(days)}</td>
        <td>${escapeHtml(timing)}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Handle Export to CSV
 */
function handleExportCSV() {
  if (currentEnrolledInterns.length === 0 && currentDoctorsList.length === 0 && currentAttendanceList.length === 0) {
    showToast('No report records available to export.', 'error');
    return;
  }

  const csvRows = [];
  const todayStr = new Date().toISOString().split('T')[0];
  const summary = fbDb.getAttendanceSummary(currentAttendanceList, currentEnrolledInterns);

  // Title Section
  csvRows.push(['MediTrack - Hospital Training & OPD Summary Report']);
  csvRows.push([`Generated On: ${new Date().toLocaleString()}`]);
  csvRows.push([]);

  // Section 1: Summary KPIs
  csvRows.push(['--- SUMMARY METRICS ---']);
  csvRows.push(['Metric', 'Value']);
  csvRows.push(['Total Enrolled Interns', summary.totalInterns]);
  csvRows.push(['Total Valid Attendance Logs', summary.totalValidLogs]);
  csvRows.push(['Present Logs', summary.presentLogs]);
  csvRows.push(['Absent Logs', summary.absentLogs]);
  csvRows.push(['Average Intern Attendance %', `${summary.avgInternAttendance}%`]);
  csvRows.push(['Training Completion Rate %', `${summary.completionRate}%`]);
  csvRows.push([]);

  // Section 2: Intern Master Report
  csvRows.push(['--- INTERN TRAINING MASTER REPORT ---']);
  csvRows.push([
    'Intern ID',
    'Name',
    'Email',
    'Course',
    'Department',
    'Days Completed',
    'Total Training Days',
    'Progress %',
    'Attendance %',
    'Certificate Status'
  ]);

  currentEnrolledInterns.forEach(intern => {
    const displayId = fbDb.formatDisplayInternId(intern);
    const course = fbDb.formatCourse(intern.course);
    const progress = fbDb.getInternProgress(intern);
    const attPct = fbDb.getInternAttendancePercentage(intern, currentAttendanceList);
    const cert = intern.certificateIssued ? 'Issued' : 'Pending';

    csvRows.push([
      displayId,
      intern.name || '',
      intern.email || '',
      course,
      intern.department || '',
      progress.completedDays,
      progress.totalDays,
      `${progress.progressPercent}%`,
      `${attPct}%`,
      cert
    ]);
  });

  csvRows.push([]);

  // Section 3: Doctor OPD Master Report
  csvRows.push(['--- DOCTOR OPD SCHEDULE REPORT ---']);
  csvRows.push([
    'Doctor ID',
    'Name',
    'Department',
    'OPD Room',
    'Available Days',
    'OPD Timing'
  ]);

  currentDoctorsList.forEach(doc => {
    const docId = doc.doctorId || doc.id || 'DOC-N/A';
    const days = Array.isArray(doc.availableDays) ? doc.availableDays.join(', ') : (doc.availableDays || 'All Days');
    const timing = doc.opdTiming || doc.timing || '09:00 AM - 02:00 PM';

    csvRows.push([
      docId,
      doc.name || '',
      doc.department || '',
      doc.room || doc.opdRoom || 'OPD Room',
      days,
      timing
    ]);
  });

  // Convert array of rows to CSV string with RFC 4180 escaping
  const csvContent = csvRows.map(row => 
    row.map(field => {
      const val = field === undefined || field === null ? '' : String(field);
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.setAttribute('download', `meditrack_master_report_${todayStr}.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);

  showToast('Report exported successfully to CSV!', 'success');
}

/**
 * Handle Print Summary
 */
function handlePrintSummary() {
  const printTimestamp = document.getElementById('print-timestamp');
  if (printTimestamp) {
    printTimestamp.textContent = new Date().toLocaleString();
  }
  window.print();
}

/**
 * Display Error State
 */
function showErrorState(message) {
  setElementText('rpt-total-logs', '—');
  setElementText('rpt-present-count', '—');
  setElementText('rpt-absent-count', '—');
  setElementText('rpt-avg-attendance', '—');

  const internTbody = document.getElementById('rpt-interns-tbody');
  if (internTbody) {
    internTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:32px 20px; color:var(--accent-rose);">
          <i class="bx bx-error-circle" style="font-size:32px; margin-bottom:8px; display:block;"></i>
          <strong>Unable to load intern reports:</strong> ${escapeHtml(message)}
        </td>
      </tr>
    `;
  }

  const doctorTbody = document.getElementById('rpt-doctors-tbody');
  if (doctorTbody) {
    doctorTbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:32px 20px; color:var(--accent-rose);">
          <i class="bx bx-error-circle" style="font-size:32px; margin-bottom:8px; display:block;"></i>
          <strong>Unable to load doctor schedule:</strong> ${escapeHtml(message)}
        </td>
      </tr>
    `;
  }
}

function setElementText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
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
  }, 3500);
}