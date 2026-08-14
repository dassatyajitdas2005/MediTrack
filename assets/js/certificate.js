/* MediTrack - Certificate Module Controller */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

let allInterns = [];

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  renderLayout('certificate');
  initCertificateModule();
});

async function initCertificateModule() {
  document.getElementById('cert-search-input')?.addEventListener('input', renderAdminTable);
  document.getElementById('cert-status-filter')?.addEventListener('change', renderAdminTable);
  document.getElementById('close-issue-modal')?.addEventListener('click', closeIssueModal);
  document.getElementById('cancel-issue')?.addEventListener('click', closeIssueModal);

  await loadCertificates();
}

async function loadCertificates() {
  const user = auth.getCurrentUser();
  const isAdmin = user && (user.role === 'admin' || user.role === 'supervisor');

  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  const adminSection = document.getElementById('admin-section');

  try {
    allInterns = await fbDb.getInterns();

    if (isAdmin) {
      if (pageTitle) pageTitle.textContent = 'Certificate Management';
      if (pageSubtitle) pageSubtitle.textContent = 'Authorize and issue training completion clearance.';
      if (adminSection) adminSection.style.display = 'block';
      renderAdminTable();
    } else {
      if (pageTitle) pageTitle.textContent = 'My Certificate Clearance';
      if (pageSubtitle) pageSubtitle.textContent = 'View and download your official completion certificate.';
      if (adminSection) adminSection.style.display = 'none';
      renderStudentCertificate(user);
    }
  } catch (error) {
    console.error('[Certificate] Load error:', error);
  }
}

function renderStudentCertificate(user) {
  const container = document.getElementById('certificate-container') || document.getElementById('certificate-list');
  if (!container) return;

  const intern = allInterns.find(i => i.email && i.email.toLowerCase() === user.email.toLowerCase()) || null;

  if (!intern) {
    container.innerHTML = `
      <div class="glass-card" style="padding: 60px; text-align: center;">
        <i class="bx bx-error-circle" style="font-size: 64px; color: var(--accent-amber);"></i>
        <h3 style="margin-top: 20px; font-size: 20px;">No Intern Record Found</h3>
        <p style="color: var(--text-muted); margin-top: 8px;">Your internship enrollment details are pending admin assignment.</p>
      </div>
    `;
    return;
  }

  const completed = intern.completedDays || 0;
  const total = intern.totalTrainingDays || 30;
  const attendance = intern.attendancePercentage || 0;
  const progressPct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const isEligible = intern.certificateIssued === true || (attendance >= 75 && completed >= total);

  if (intern.certificateIssued || isEligible) {
    container.innerHTML = `
      <div class="glass-card certificate-card" style="padding: 40px; text-align: center; border: 2px solid var(--accent-emerald);">
        <i class="bx bx-check-circle" style="font-size: 64px; color: var(--accent-emerald);"></i>
        <h3 style="font-size: 24px; font-weight: 800; color: var(--accent-emerald); margin-top: 12px;">Certificate Clearance Approved!</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">Congratulations ${escapeHtml(intern.name)}, your official completion certificate is ready.</p>

        <div style="background: var(--bg-main); padding: 20px; border-radius: var(--radius-md); max-width: 480px; margin: 0 auto 24px; text-align: left; font-size: 13px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Intern ID:</span><strong>${escapeHtml(intern.internId)}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Course:</span><strong>${escapeHtml(intern.course)}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Department:</span><strong>${escapeHtml(intern.department)}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Attendance:</span><strong>${attendance}%</strong></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Completed Days:</span><strong>${completed} / ${total} days</strong></div>
        </div>

        <button type="button" class="btn btn-success" style="padding: 12px 28px; font-size: 15px;" onclick="window.printCertificate('${intern.internId}')">
          <i class="bx bx-printer"></i> Print / Download Certificate
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="glass-card" style="padding: 40px; text-align: center; border: 2px dashed var(--accent-amber);">
        <i class="bx bx-time" style="font-size: 64px; color: var(--accent-amber);"></i>
        <h3 style="font-size: 22px; font-weight: 800; color: var(--accent-amber); margin-top: 12px;">Certificate Pending</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Complete required training duration and attendance threshold to unlock certificate clearance.</p>
        
        <div style="max-width: 400px; margin: 0 auto;">
          <div class="progress-bar-bg" style="height: 10px;">
            <div class="progress-bar-fill" style="width: ${progressPct}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-top: 6px;">
            <span>${completed}/${total} Days</span>
            <span>Attendance: ${attendance}% (Req: 75%)</span>
          </div>
        </div>
      </div>
    `;
  }
}

function renderAdminTable() {
  const searchInput = document.getElementById('cert-search-input');
  const statusFilter = document.getElementById('cert-status-filter');
  const certTbody = document.getElementById('cert-tbody');
  const emptyState = document.getElementById('admin-empty-state');

  if (!certTbody) return;

  const search = searchInput?.value.toLowerCase() || '';
  const status = statusFilter?.value || '';

  const filtered = allInterns.filter(intern => {
    const matchSearch = !search ||
      (intern.name && intern.name.toLowerCase().includes(search)) ||
      (intern.internId && intern.internId.toLowerCase().includes(search));

    const isIssued = intern.certificateIssued === true;
    const isEligible = (intern.attendancePercentage || 0) >= 75 && (intern.completedDays || 0) >= (intern.totalTrainingDays || 30);

    let matchStatus = true;
    if (status === 'issued') matchStatus = isIssued;
    else if (status === 'pending') matchStatus = !isIssued && isEligible;
    else if (status === 'not-eligible') matchStatus = !isIssued && !isEligible;

    return matchSearch && matchStatus;
  });

  if (filtered.length === 0) {
    certTbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  certTbody.innerHTML = filtered.map(intern => {
    const completed = intern.completedDays || 0;
    const total = intern.totalTrainingDays || 30;
    const attendance = intern.attendancePercentage || 0;
    const isEligible = attendance >= 75 && completed >= total;

    let statusBadge = intern.certificateIssued
      ? `<span class="status-pill active"><i class="bx bx-check-circle"></i> Issued</span>`
      : isEligible
        ? `<span class="status-pill warning"><i class="bx bx-time"></i> Eligible</span>`
        : `<span class="status-pill pending"><i class="bx bx-x-circle"></i> Not Eligible</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(intern.internId)}</strong></td>
        <td>
          <div style="font-weight:700;">${escapeHtml(intern.name)}</div>
          <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(intern.college || '')}</div>
        </td>
        <td>${escapeHtml(intern.course)}</td>
        <td>${escapeHtml(intern.department)}</td>
        <td>${completed} / ${total} days</td>
        <td><strong>${attendance}%</strong></td>
        <td>${statusBadge}</td>
        <td>
          ${!intern.certificateIssued ? `
            <button type="button" class="btn btn-success btn-sm" onclick="window.issueCertificateAction('${intern.id}')">
              <i class="bx bx-award"></i> Issue
            </button>
          ` : `
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.printCertificate('${intern.internId}')">
              <i class="bx bx-printer"></i> Print
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

window.issueCertificateAction = async function (internFirestoreId) {
  if (!confirm('Grant certificate clearance for this intern?')) return;
  try {
    await fbDb.updateIntern(internFirestoreId, {
      certificateIssued: true,
      certificateIssuedAt: new Date().toISOString()
    });
    alert('Certificate clearance granted successfully!');
    await loadCertificates();
  } catch (error) {
    alert('Failed to issue certificate: ' + error.message);
  }
};

window.printCertificate = function (internId) {
  const intern = allInterns.find(i => i.internId === internId || i.id === internId);
  if (!intern) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Completion Certificate - ${escapeHtml(intern.name)}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8fafc; padding: 40px; text-align: center; }
        .cert-border { border: 10px solid #0ea5e9; padding: 50px; max-width: 850px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .cert-inner { border: 2px solid #e2e8f0; padding: 40px; border-radius: 8px; }
        h1 { color: #0ea5e9; font-size: 38px; font-weight: 800; letter-spacing: 2px; margin-bottom: 8px; }
        h2 { color: #475569; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 30px; }
        .student-name { font-size: 32px; font-weight: 800; color: #0f172a; margin: 24px 0; border-bottom: 2px solid #0ea5e9; display: inline-block; padding-bottom: 8px; }
        .description { font-size: 16px; color: #475569; line-height: 1.8; max-width: 650px; margin: 0 auto 30px; }
        .meta-grid { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 30px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="cert-border">
        <div class="cert-inner">
          <h1>CERTIFICATE OF COMPLETION</h1>
          <h2>Hospital Internship Training Program</h2>
          <p style="font-size: 16px; color: #64748b;">This is to certify that</p>
          <div class="student-name">${escapeHtml(intern.name)}</div>
          <p class="description">
            has successfully completed the hospital training and internship program in department of
            <strong>${escapeHtml(intern.department)}</strong> (${escapeHtml(intern.course)}) at MediTrack Hospital.
            <br>Attendance: <strong>${intern.attendancePercentage || 0}%</strong> | Total Days: <strong>${intern.completedDays || intern.totalTrainingDays || 30} days</strong>.
          </p>
          <div class="meta-grid">
            <div>
              <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}<br>
              <strong>Certificate No:</strong> ${escapeHtml(intern.internId)}
            </div>
            <div>
              <strong>Authorized Signatory</strong><br>
              MediTrack Hospital Administration
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
};

function closeIssueModal() {
  const modal = document.getElementById('issue-modal-overlay');
  if (modal) modal.classList.remove('active');
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}