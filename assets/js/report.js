/* MediTrack - Reports & Summary Controller */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  const isAllowed = await auth.checkAuth(['admin', 'supervisor']);
  if (!isAllowed) return;
  renderLayout('report');
  initReports();
});

async function initReports() {
  document.getElementById('export-csv-btn')?.addEventListener('click', exportToCSV);
  document.getElementById('print-report-btn')?.addEventListener('click', () => window.print());

  await loadReportData();
}

async function loadReportData() {
  try {
    const interns = await fbDb.getInterns();
    const doctors = await fbDb.getDoctors();
    const attendance = await fbDb.getAttendance();

    const totalLogs = attendance.length;
    const presentLogs = attendance.filter(a => a.status === 'Present').length;
    const absentLogs = attendance.filter(a => a.status === 'Absent').length;

    let totalAttPct = 0;
    interns.forEach(i => totalAttPct += (i.attendancePercentage || 0));
    const avgAttendance = interns.length > 0 ? Math.round(totalAttPct / interns.length) : 0;

    // Update KPI Metrics
    setElementText('rpt-total-logs', totalLogs);
    setElementText('rpt-present-count', presentLogs);
    setElementText('rpt-absent-count', absentLogs);
    setElementText('rpt-avg-attendance', `${avgAttendance}%`);

    // Render Intern Master Table
    const internTbody = document.getElementById('rpt-interns-tbody');
    if (internTbody) {
      if (interns.length === 0) {
        internTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No intern records found in Firestore.</td></tr>`;
      } else {
        internTbody.innerHTML = interns.map(intern => {
          const completed = intern.completedDays || 0;
          const total = intern.totalTrainingDays || 30;
          return `
            <tr>
              <td><strong>${escapeHtml(intern.internId)}</strong></td>
              <td>${escapeHtml(intern.name)}</td>
              <td>${escapeHtml(intern.course)}</td>
              <td>${escapeHtml(intern.department)}</td>
              <td>${completed} / ${total} days</td>
              <td><strong>${intern.attendancePercentage || 0}%</strong></td>
              <td>
                <span class="status-pill ${intern.certificateIssued ? 'active' : 'warning'}">
                  ${intern.certificateIssued ? 'Issued' : 'Pending'}
                </span>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Render Doctor OPD Master Table
    const doctorTbody = document.getElementById('rpt-doctors-tbody');
    if (doctorTbody) {
      if (doctors.length === 0) {
        doctorTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No doctor records found in Firestore.</td></tr>`;
      } else {
        doctorTbody.innerHTML = doctors.map(doc => {
          const days = Array.isArray(doc.availableDays) ? doc.availableDays.join(', ') : 'N/A';
          return `
            <tr>
              <td><strong>${escapeHtml(doc.id || doc.doctorId)}</strong></td>
              <td>${escapeHtml(doc.name)}</td>
              <td>${escapeHtml(doc.department)}</td>
              <td>${escapeHtml(doc.room || 'N/A')}</td>
              <td>${escapeHtml(days)}</td>
              <td>${escapeHtml(doc.opdTiming || 'N/A')}</td>
            </tr>
          `;
        }).join('');
      }
    }

  } catch (error) {
    console.error('[Reports] Error loading report data:', error);
  }
}

function exportToCSV() {
  const tables = document.querySelectorAll('.data-table');
  if (!tables || tables.length === 0) {
    alert('No data available to export!');
    return;
  }

  let csv = [];
  tables.forEach(table => {
    table.querySelectorAll('tr').forEach(row => {
      const cols = Array.from(row.querySelectorAll('td, th')).map(cell => `"${cell.innerText.replace(/"/g, '""')}"`);
      csv.push(cols.join(','));
    });
    csv.push(''); // Blank line between tables
  });

  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meditrack_master_report_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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