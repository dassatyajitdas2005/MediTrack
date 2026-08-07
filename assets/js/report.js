/* MediTrack - Reports & Export (Firebase Only) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';


document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  auth.checkAuth(['admin', 'supervisor']);
  renderLayout('report');
  // ... baaki same
});


async function initReports() {
  document.getElementById('generate-report-btn')?.addEventListener('click', generateReport);
  document.getElementById('export-csv-btn')?.addEventListener('click', exportToCSV);
  document.getElementById('export-pdf-btn')?.addEventListener('click', () => alert('PDF export: Use browser print (Ctrl+P)'));
}

async function generateReport() {
  const reportType = document.getElementById('report-type')?.value || 'all';
  const fromDate = document.getElementById('report-from')?.value;
  const toDate = document.getElementById('report-to')?.value;

  const interns = await fbDb.getInterns();
  const doctors = await fbDb.getDoctors();
  const attendance = await fbDb.getAttendance();

  let filteredAttendance = attendance;
  if (fromDate) filteredAttendance = filteredAttendance.filter(a => a.date >= fromDate);
  if (toDate) filteredAttendance = filteredAttendance.filter(a => a.date <= toDate);

  const container = document.getElementById('report-output');
  if (!container) return;

  let html = `<div class="glass-card" style="padding:24px;">`;

  if (reportType === 'all' || reportType === 'intern') {
    html += `<h3 style="margin-bottom:16px;"><i class="bx bx-user"></i> Intern Summary</h3>`;
    html += `<table class="data-table" style="margin-bottom:24px;"><thead><tr><th>ID</th><th>Name</th><th>Dept</th><th>Progress</th><th>Attendance</th><th>Status</th></tr></thead><tbody>`;
    html += interns.map(i => {
      const progress = getInternProgress(i);
      return `<tr><td>${escapeHtml(i.internId)}</td><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.department)}</td><td>${progress.progressPercent}%</td><td>${i.attendancePercentage || 0}%</td><td>${progress.status}</td></tr>`;
    }).join('');
    html += `</tbody></table>`;
  }

  if (reportType === 'all' || reportType === 'attendance') {
    html += `<h3 style="margin-bottom:16px;"><i class="bx bx-calendar-check"></i> Attendance Records (${filteredAttendance.length})</h3>`;
    html += `<table class="data-table" style="margin-bottom:24px;"><thead><tr><th>Date</th><th>Intern ID</th><th>Status</th><th>Remarks</th></tr></thead><tbody>`;
    html += filteredAttendance.map(a => `<tr><td>${escapeHtml(a.date)}</td><td>${escapeHtml(a.internId)}</td><td><span class="status-pill ${a.status.toLowerCase()}">${a.status}</span></td><td>${escapeHtml(a.remarks) || '-'}</td></tr>`).join('');
    html += `</tbody></table>`;
  }

  if (reportType === 'all' || reportType === 'doctor') {
    html += `<h3 style="margin-bottom:16px;"><i class="bx bx-plus-medical"></i> Doctor List (${doctors.length})</h3>`;
    html += `<table class="data-table"><thead><tr><th>Name</th><th>Department</th><th>Specialization</th><th>Room</th></tr></thead><tbody>`;
    html += doctors.map(d => `<tr><td>${escapeHtml(d.name)}</td><td>${escapeHtml(d.department)}</td><td>${escapeHtml(d.specialization)}</td><td>${escapeHtml(d.room)}</td></tr>`).join('');
    html += `</tbody></table>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}

function exportToCSV() {
  const reportType = document.getElementById('report-type')?.value || 'all';
  // Simple CSV export of visible table
  const table = document.querySelector('#report-output table');
  if (!table) { alert('Generate report first!'); return; }

  let csv = [];
  table.querySelectorAll('tr').forEach(row => {
    const cols = Array.from(row.querySelectorAll('td, th')).map(cell => `"${cell.innerText.replace(/"/g, '""')}"`);
    csv.push(cols.join(','));
  });

  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meditrack_report_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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