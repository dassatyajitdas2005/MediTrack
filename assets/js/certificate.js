/* MediTrack - Certificate Module Controller */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

let allInterns = [];

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  const isAllowed = await auth.checkAuth(['admin', 'student', 'supervisor']);
  if (!isAllowed) return;
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
    const renderData = () => {
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
    };

    allInterns = await fbDb.getInterns({
      onBackgroundUpdate: (fresh) => {
        allInterns = fresh;
        renderData();
      }
    });

    renderData();
  } catch (error) {
    console.error('[Certificate] Load error:', error);
  }
}

function renderStudentCertificate(user) {
  const container = document.getElementById('certificate-container') || document.getElementById('certificate-list');
  if (!container) return;

  const userUid = user.uid || user.id;
  const userEmail = (user.email || '').toLowerCase().trim();

  const intern = allInterns.find(i => 
    (userUid && (i.uid === userUid || i.userId === userUid || (i.allIds && i.allIds.includes(userUid)))) ||
    (userEmail && i.email && i.email.toLowerCase().trim() === userEmail)
  ) || null;

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

  const fullName = intern.name || user.name || user.email.split('@')[0];
  const displayId = String(intern.internId || intern.id || '').slice(-5);
  const prog = fbDb.getInternProgress(intern);
  const completed = prog.completedDays;
  const total = prog.totalDays;
  const attendance = fbDb.getInternAttendancePercentage(intern, []);
  const progressPct = prog.progressPercent;
  const isEligible = intern.certificateIssued === true || progressPct >= 100 || (attendance >= 75 && completed >= total);

  if (intern.certificateIssued || isEligible) {
    container.innerHTML = `
      <div class="glass-card certificate-card" style="padding: 40px; text-align: center; border: 2px solid var(--accent-emerald);">
        <i class="bx bx-check-circle" style="font-size: 64px; color: var(--accent-emerald);"></i>
        <h3 style="font-size: 24px; font-weight: 800; color: var(--accent-emerald); margin-top: 12px;">Certificate Clearance Approved!</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">Congratulations ${escapeHtml(fullName)}, your official completion certificate is ready.</p>

        <div style="background: var(--bg-main); padding: 20px; border-radius: var(--radius-md); max-width: 480px; margin: 0 auto 24px; text-align: left; font-size: 13px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Student Name:</span><strong>${escapeHtml(fullName)}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Student ID:</span><strong>${escapeHtml(displayId)}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Course:</span><strong>${escapeHtml(fbDb.formatCourse(intern.course))}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Department:</span><strong>${escapeHtml(intern.department || 'Pharmacy')}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Attendance:</span><strong>${attendance}%</strong></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Completed Days:</span><strong>${completed} / ${total} days</strong></div>
        </div>

        <button type="button" class="btn btn-success" style="padding: 12px 28px; font-size: 15px;" onclick="window.printCertificate('${intern.id || intern.internId}')">
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
            <span>Completed: ${completed} / ${total} days</span>
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
    const prog = fbDb.getInternProgress(intern);
    const isEligible = (intern.attendancePercentage || 0) >= 75 && prog.progressPercent >= 100;

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
    const prog = fbDb.getInternProgress(intern);
    const completed = prog.completedDays;
    const total = prog.totalDays;
    const attendance = intern.attendancePercentage || 0;
    const isEligible = attendance >= 75 && prog.progressPercent >= 100;
    const displayId = String(intern.internId || intern.id || '').slice(-5);

    let statusBadge = intern.certificateIssued
      ? `<span class="status-pill active"><i class="bx bx-check-circle"></i> Issued</span>`
      : isEligible
        ? `<span class="status-pill warning"><i class="bx bx-time"></i> Eligible</span>`
        : `<span class="status-pill pending"><i class="bx bx-x-circle"></i> Not Eligible</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(displayId)}</strong></td>
        <td>
          <div style="font-weight:700;">${escapeHtml(intern.name)}</div>
          <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(intern.college || '')}</div>
        </td>
        <td>${escapeHtml(fbDb.formatCourse(intern.course))}</td>
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
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.printCertificate('${intern.id || intern.internId}')">
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

window.printCertificate = function (targetId) {
  const user = auth.getCurrentUser();
  const intern = allInterns.find(i => 
    i.id === targetId || 
    i.internId === targetId || 
    (i.allIds && i.allIds.includes(targetId))
  ) || (user ? allInterns.find(i => i.email && i.email.toLowerCase() === user.email.toLowerCase()) : null);

  if (!intern) {
    alert('Certificate details not found.');
    return;
  }

  const fullName = intern.name || (user ? user.name : 'Student');
  const displayId = String(intern.internId || intern.id || '').slice(-5);
  const prog = fbDb.getInternProgress(intern);
  const completed = prog.completedDays;
  const total = prog.totalDays;
  const attendance = intern.attendancePercentage || 0;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Completion Certificate - ${escapeHtml(fullName)}</title>
      <style>
        @page {
          size: landscape;
          margin: 0;
        }
        @media print {
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
          }
        }
        * { box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #ffffff;
          margin: 0;
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .cert-border {
          border: 8px double #0ea5e9;
          padding: 40px;
          width: 100%;
          max-width: 900px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          text-align: center;
        }
        .cert-inner {
          border: 2px solid #e2e8f0;
          padding: 36px 30px;
          border-radius: 8px;
        }
        h1 { color: #0ea5e9; font-size: 34px; font-weight: 800; letter-spacing: 2px; margin: 0 0 8px 0; }
        h2 { color: #475569; font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 4px; margin: 0 0 24px 0; }
        .student-name { font-size: 30px; font-weight: 800; color: #0f172a; margin: 16px 0; border-bottom: 2px solid #0ea5e9; display: inline-block; padding-bottom: 6px; }
        .description { font-size: 15px; color: #475569; line-height: 1.8; max-width: 680px; margin: 0 auto 24px; }
        .meta-grid { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: left; }
      </style>
    </head>
    <body>
      <div class="cert-border">
        <div class="cert-inner">
          <h1>CERTIFICATE OF COMPLETION</h1>
          <h2>Hospital Internship Training Program</h2>
          <p style="font-size: 15px; color: #64748b; margin: 0;">This is to certify that</p>
          <div class="student-name">${escapeHtml(fullName)}</div>
          <p class="description">
            has successfully completed the hospital training and internship program in department of
            <strong>${escapeHtml(intern.department || 'Pharmacy')}</strong> (${escapeHtml(fbDb.formatCourse(intern.course))}) at <strong>Belda SSH Hospital</strong>.
            <br>Attendance: <strong>${attendance}%</strong> | Total Days: <strong>${completed} / ${total} days</strong>.
          </p>
          <div class="meta-grid">
            <div>
              <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}<br>
              <strong>Certificate No:</strong> ${escapeHtml(displayId)}
            </div>
            <div style="text-align: right;">
              <strong>Authorized Signatory</strong><br>
              Belda Hospital Administration
            </div>
          </div>
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
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