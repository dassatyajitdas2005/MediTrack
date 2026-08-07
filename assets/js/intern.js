/* MediTrack - Intern Management Controller (Firebase Only) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

let currentInterns = [];
let editingFirestoreId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  auth.checkAuth(['admin', 'supervisor']);
  renderLayout('intern');
  // ... baaki same
});

function initInternModule() {
  const isAdmin = auth.isAdmin();
  const addBtn = document.getElementById('add-intern-btn');
  if (addBtn && !isAdmin) addBtn.style.display = 'none';

  loadInterns();

  document.getElementById('intern-search-input')?.addEventListener('input', filterInterns);
  document.getElementById('intern-dept-filter')?.addEventListener('change', filterInterns);
  document.getElementById('intern-course-filter')?.addEventListener('change', filterInterns);

  document.getElementById('intern-form')?.addEventListener('submit', handleInternFormSubmit);
  document.getElementById('add-intern-btn')?.addEventListener('click', () => openInternModal());
  document.getElementById('close-intern-modal')?.addEventListener('click', closeInternModal);
  document.getElementById('cancel-intern-modal')?.addEventListener('click', closeInternModal);
}

async function loadInterns() {
  currentInterns = await fbDb.getInterns();
  renderInternTable(currentInterns);
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

function renderInternTable(interns) {
  const tbody = document.getElementById('intern-tbody');
  const isAdmin = auth.isAdmin();
  if (!tbody) return;

  if (interns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">No intern records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = interns.map(intern => {
    const progress = getInternProgress(intern);
    const certBadge = intern.certificateIssued
      ? `<span class="status-pill issued"><i class="bx bx-check-circle"></i> Issued</span>`
      : `<span class="status-pill pending"><i class="bx bx-time"></i> Pending</span>`;
    const statusPill = progress.status === 'active'
      ? `<span class="status-pill active">Active</span>`
      : `<span class="status-pill warning">Completed</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(intern.internId)}</strong></td>
        <td>
          <div style="font-weight:700;">${escapeHtml(intern.name)}</div>
          <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(intern.college)}</div>
        </td>
        <td>${escapeHtml(intern.course)}</td>
        <td>${escapeHtml(intern.department)}</td>
        <td>${escapeHtml(intern.joiningDate)} to ${escapeHtml(intern.endingDate)}</td>
        <td>
          <div class="progress-container" style="width:120px;">
            <div class="progress-header"><span>${progress.completedDays}/${intern.totalTrainingDays}d</span><span>${progress.progressPercent}%</span></div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${progress.progressPercent}%;"></div></div>
          </div>
        </td>
        <td><strong>${intern.attendancePercentage || 0}%</strong></td>
        <td>${certBadge}</td>
        <td>
          <div style="display:flex; gap:6px;">
            ${isAdmin ? `
              <button class="btn btn-secondary btn-sm edit-intern-btn" data-id="${escapeHtml(intern.internId)}"><i class="bx bx-edit"></i></button>
              <button class="btn btn-danger btn-sm delete-intern-btn" data-id="${escapeHtml(intern.internId)}"><i class="bx bx-trash"></i></button>
            ` : `<button class="btn btn-secondary btn-sm" disabled><i class="bx bx-show"></i></button>`}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (isAdmin) {
    document.querySelectorAll('.edit-intern-btn').forEach(btn => {
      btn.addEventListener('click', (e) => openInternModal(e.currentTarget.getAttribute('data-id')));
    });
    document.querySelectorAll('.delete-intern-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!confirm(`Delete intern ${id}?`)) return;
        const intern = currentInterns.find(i => i.internId === id);
        await fbDb.deleteIntern(intern?.id || id);
        await loadInterns();
      });
    });
  }
}

function filterInterns() {
  const query = document.getElementById('intern-search-input').value.toLowerCase();
  const deptFilter = document.getElementById('intern-dept-filter').value;
  const courseFilter = document.getElementById('intern-course-filter').value;

  const filtered = currentInterns.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(query) || i.internId.toLowerCase().includes(query) || i.college.toLowerCase().includes(query);
    return matchesSearch && (!deptFilter || i.department === deptFilter) && (!courseFilter || i.course.includes(courseFilter));
  });
  renderInternTable(filtered);
}

function openInternModal(internId = null) {
  const modal = document.getElementById('intern-modal');
  const modalTitle = document.getElementById('intern-modal-title');
  document.getElementById('intern-form').reset();
  editingFirestoreId = null;

  if (internId) {
    const intern = currentInterns.find(i => i.internId === internId || i.id === internId);
    if (intern) {
      editingFirestoreId = intern.id || null;
      modalTitle.innerText = `Edit Intern (${internId})`;
      document.getElementById('intern-id-input').value = intern.internId;
      document.getElementById('intern-name').value = intern.name;
      document.getElementById('intern-email').value = intern.email || '';
      document.getElementById('intern-course').value = intern.course;
      document.getElementById('intern-college').value = intern.college;
      document.getElementById('intern-department').value = intern.department;
      document.getElementById('intern-joining').value = intern.joiningDate;
      document.getElementById('intern-ending').value = intern.endingDate;
      document.getElementById('intern-total-days').value = intern.totalTrainingDays;
      document.getElementById('intern-cert-issued').checked = intern.certificateIssued;
    }
  } else {
    modalTitle.innerText = "Add New Intern";
    document.getElementById('intern-id-input').value = "INT-" + Date.now().toString().slice(-5);
  }
  modal.classList.add('active');
}

function closeInternModal() {
  document.getElementById('intern-modal').classList.remove('active');
  editingFirestoreId = null;
}

async function handleInternFormSubmit(e) {
  e.preventDefault();
  const internId = document.getElementById('intern-id-input').value;
  const isEditing = currentInterns.some(i => i.internId === internId || i.id === internId);
  const certIssued = document.getElementById('intern-cert-issued').checked;
  const existingIntern = currentInterns.find(i => i.internId === internId || i.id === internId);
  const firestoreId = editingFirestoreId || existingIntern?.id || internId;

  const formData = {
    internId,
    name: document.getElementById('intern-name').value,
    email: document.getElementById('intern-email').value,
    course: document.getElementById('intern-course').value,
    college: document.getElementById('intern-college').value,
    department: document.getElementById('intern-department').value,
    joiningDate: document.getElementById('intern-joining').value,
    endingDate: document.getElementById('intern-ending').value,
    totalTrainingDays: parseInt(document.getElementById('intern-total-days').value) || 30,
    completedDays: isEditing ? (existingIntern?.completedDays || 0) : 0,
    attendancePercentage: isEditing ? (existingIntern?.attendancePercentage || 0) : 0,
    certificateIssued: certIssued,
    status: certIssued ? 'completed' : 'active'
  };

  if (isEditing) await fbDb.updateIntern(firestoreId, formData);
  else await fbDb.addIntern(formData);

  closeInternModal();
  await loadInterns();
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}