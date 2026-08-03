/* MediTrack - Reports & Analytics Aggregator Controller */
import { db, DATABASE_MODE } from './db.js';
import * as fbDb from './firebase-db.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('report');
  initReports();
});

function initReports() {
  renderAttendanceSummary();
  renderDoctorReport();
  renderInternReport();

  document.getElementById('export-csv-btn')?.addEventListener('click', exportReportsCSV);
  document.getElementById('print-report-btn')?.addEventListener('click', () => window.print());
}
async function renderAttendanceSummary() {
  const interns = DATABASE_MODE === "firebase"
    ? await fbDb.getInterns()
    : db.getInterns();

  const attendance = DATABASE_MODE === "firebase"
    ? await fbDb.getAttendance()
    : db.getAttendance();

  const totalLogs = attendance.length;
  const presentCount = attendance.filter(a => a.status === 'Present').length;
  const absentCount = attendance.filter(a => a.status === 'Absent').length;
  const avgAttendance = interns.length > 0 ? Math.round(interns.reduce((acc, i) => acc + (i.attendancePercentage || 0), 0) / interns.length) : 0;

  document.getElementById('rpt-total-logs').innerText = totalLogs;
  document.getElementById('rpt-present-count').innerText = presentCount;
  document.getElementById('rpt-absent-count').innerText = absentCount;
  document.getElementById('rpt-avg-attendance').innerText = `${avgAttendance}%`;
}

async function renderDoctorReport() {
  const doctors = DATABASE_MODE === "firebase"
    ? await fbDb.getDoctors()
    : db.getDoctors();
  const tbody = document.getElementById('rpt-doctors-tbody');
  if (!tbody) return;

  tbody.innerHTML = doctors.map(doc => `
    <tr>
      <td><strong>${doc.doctorId}</strong></td>
      <td>${doc.name}</td>
      <td>${doc.department}</td>
      <td>${doc.room}</td>
      <td>${doc.availableDays.join(', ')}</td>
      <td>${doc.opdTiming}</td>
    </tr>
  `).join('');
}

async function renderInternReport() {
  const interns = DATABASE_MODE === "firebase"
    ? await fbDb.getInterns()
    : db.getInterns();
  const tbody = document.getElementById('rpt-interns-tbody');
  if (!tbody) return;

  tbody.innerHTML = interns.map(intern => `
    <tr>
      <td><strong>${intern.internId}</strong></td>
      <td>${intern.name}</td>
      <td>${intern.course}</td>
      <td>${intern.department}</td>
      <td>${intern.completedDays} / ${intern.totalTrainingDays} Days</td>
      <td><strong>${intern.attendancePercentage}%</strong></td>
      <td>
        <span class="status-pill ${intern.certificateIssued ? 'issued' : 'pending'}">
          ${intern.certificateIssued ? 'Issued' : 'Pending'}
        </span>
      </td>
    </tr>
  `).join('');
}

async function exportReportsCSV() {
  const interns = DATABASE_MODE === "firebase"
    ? await fbDb.getInterns()
    : db.getInterns();
  let csvContent = "data:text/csv;charset=utf-8,Intern ID,Name,Course,Department,College,Completed Days,Total Days,Attendance %,Certificate Status\n";

  interns.forEach(i => {
    csvContent += `${i.internId},"${i.name}","${i.course}","${i.department}","${i.college}",${i.completedDays},${i.totalTrainingDays},${i.attendancePercentage}%,${i.certificateIssued ? 'Issued' : 'Pending'}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `MediTrack_Intern_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
