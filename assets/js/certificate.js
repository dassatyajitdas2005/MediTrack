/* MediTrack - Certificate Module (Firebase Only) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

let currentInterns = [];

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init(); // 🔥 Login check
  renderLayout('certificate');
  loadCertificates();
});

async function loadCertificates() {
  const user = auth.getCurrentUser();
  const interns = await fbDb.getInterns();

  let displayInterns = interns;
  if (user && user.role === 'student') {
    displayInterns = interns.filter(i => i.email === user.email);
  }

  currentInterns = displayInterns;
  renderCertificateList(displayInterns);
}

function renderCertificateList(interns) {
  const container = document.getElementById('certificate-list');
  if (!container) return;

  if (interns.length === 0) {
    container.innerHTML = `<div class="glass-card" style="text-align:center;padding:40px;"><i class="bx bx-certification" style="font-size:48px;color:var(--text-muted);"></i><h4 style="margin-top:10px;color:var(--text-muted);">No certificate records found.</h4></div>`;
    return;
  }

  container.innerHTML = interns.map(intern => {
    const isEligible = intern.certificateIssued || (intern.attendancePercentage >= 75 && intern.completedDays >= intern.totalTrainingDays);
    const statusBadge = intern.certificateIssued
      ? `<span class="status-pill issued"><i class="bx bx-check-circle"></i> Issued</span>`
      : isEligible
        ? `<span class="status-pill active"><i class="bx bx-time"></i> Eligible</span>`
        : `<span class="status-pill pending"><i class="bx bx-x-circle"></i> Not Eligible</span>`;

    return `
      <div class="glass-card" style="padding:24px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <h3 style="font-size:18px; font-weight:800;">${escapeHtml(intern.name)}</h3>
            <p style="font-size:13px; color:var(--text-muted);">${escapeHtml(intern.internId)} | ${escapeHtml(intern.course)}</p>
          </div>
          ${statusBadge}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; font-size:13px; margin-bottom:16px;">
          <div><strong>Attendance:</strong> ${intern.attendancePercentage || 0}%</div>
          <div><strong>Days:</strong> ${intern.completedDays || 0}/${intern.totalTrainingDays}</div>
          <div><strong>Dept:</strong> ${escapeHtml(intern.department)}</div>
        </div>
        ${intern.certificateIssued ? `
          <button class="btn btn-primary btn-sm" onclick="printCertificate('${intern.internId}')">
            <i class="bx bx-printer"></i> Print Certificate
          </button>
        ` : `
          <button class="btn btn-secondary btn-sm" disabled>
            <i class="bx bx-lock"></i> Certificate Not Ready
          </button>
        `}
      </div>
    `;
  }).join('');
}

window.printCertificate = function (internId) {
  const intern = currentInterns.find(i => i.internId === internId);
  if (!intern) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
    <head><title>Certificate - ${intern.name}</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; padding: 40px; text-align: center; }
      .cert { border: 8px solid #0ea5e9; padding: 60px; max-width: 800px; margin: 0 auto; }
      h1 { color: #0ea5e9; font-size: 36px; margin-bottom: 20px; }
      .name { font-size: 28px; font-weight: bold; margin: 30px 0; color: #1e293b; }
      .details { font-size: 16px; color: #64748b; margin: 20px 0; }
      .footer { margin-top: 60px; display: flex; justify-content: space-between; }
    </style></head>
    <body>
      <div class="cert">
        <h1>CERTIFICATE OF COMPLETION</h1>
        <p style="font-size: 18px;">This is to certify that</p>
        <div class="name">${intern.name}</div>
        <p class="details">has successfully completed the internship program in<br>
        <strong>${intern.department}</strong> (${intern.course})<br>
        from ${intern.joiningDate} to ${intern.endingDate}</p>
        <p class="details">Attendance: ${intern.attendancePercentage}% | Status: Completed</p>
        <div class="footer">
          <div>Date: ${new Date().toLocaleDateString()}</div>
          <div>Authorized Signatory</div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
};

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}