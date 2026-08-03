/* MediTrack - Intern Management Controller */

import { db, DATABASE_MODE } from './db.js';
import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

let currentInterns = [];

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('intern');
  initInternModule();
});

function initInternModule() {
  const user = auth.getCurrentUser();
  const isAdmin = auth.isAdmin();

  // Hide Add Intern Button for non-admins
  const addBtn = document.getElementById('add-intern-btn');
  if (addBtn && !isAdmin) {
    addBtn.style.display = 'none';
  }

  loadInterns();

  // Search & Filter Listeners
  document.getElementById('intern-search-input')?.addEventListener('input', filterInterns);
  document.getElementById('intern-dept-filter')?.addEventListener('change', filterInterns);
  document.getElementById('intern-course-filter')?.addEventListener('change', filterInterns);

  // Form Submit Handler
  document.getElementById('intern-form')?.addEventListener('submit', handleInternFormSubmit);
  document.getElementById('add-intern-btn')?.addEventListener('click', () => openInternModal());
  document.getElementById('close-intern-modal')?.addEventListener('click', closeInternModal);
  document.getElementById('cancel-intern-modal')?.addEventListener('click', closeInternModal);
}

async function loadInterns() {
  if (DATABASE_MODE === 'firebase') {
    const fsInterns = await fbDb.getInterns();
    currentInterns = fsInterns.length > 0 ? fsInterns : db.getInterns();
  } else {
    currentInterns = db.getInterns();
  }
  renderInternTable(currentInterns);
}

function renderInternTable(interns) {
  const tbody = document.getElementById('intern-tbody');
  const isAdmin = auth.isAdmin();

  if (!tbody) return;

  if (interns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 30px; color: var(--text-muted);">No intern records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = interns.map(intern => {
    const certBadge = intern.certificateIssued 
      ? `<span class="status-pill issued"><i class="bx bx-check-circle"></i> Issued</span>` 
      : `<span class="status-pill pending"><i class="bx bx-time"></i> Pending</span>`;
    
    const statusPill = intern.status === 'active' 
      ? `<span class="status-pill active">Active</span>` 
      : `<span class="status-pill warning">Completed</span>`;

    return `
      <tr>
        <td><strong>${intern.internId}</strong></td>
        <td>
          <div style="font-weight: 700;">${intern.name}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${intern.college}</div>
        </td>
        <td>${intern.course}</td>
        <td>${intern.department}</td>
        <td>${intern.joiningDate} to ${intern.endingDate}</td>
        <td>
          <div class="progress-container" style="width: 120px;">
            <div class="progress-header">
              <span>${intern.completedDays}/${intern.totalTrainingDays}d</span>
              <span>${Math.round((intern.completedDays/intern.totalTrainingDays)*100)}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${Math.round((intern.completedDays/intern.totalTrainingDays)*100)}%;"></div>
            </div>
          </div>
        </td>
        <td><strong>${intern.attendancePercentage}%</strong></td>
        <td>${certBadge}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            ${isAdmin ? `
              <button class="btn btn-secondary btn-sm edit-intern-btn" data-id="${intern.internId}" title="Edit"><i class="bx bx-edit"></i></button>
              <button class="btn btn-danger btn-sm delete-intern-btn" data-id="${intern.internId}" title="Delete"><i class="bx bx-trash"></i></button>
            ` : `
              <button class="btn btn-secondary btn-sm view-intern-btn" data-id="${intern.internId}" title="View Details"><i class="bx bx-show"></i></button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind Actions
  if (isAdmin) {
    document.querySelectorAll('.edit-intern-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openInternModal(id);
      });
    });

    document.querySelectorAll('.delete-intern-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm(`Are you sure you want to delete intern ${id}?`)) {
          if (DATABASE_MODE === 'firebase') {
            await fbDb.deleteIntern(id);
          } else {
            db.deleteIntern(id);
          }
          await loadInterns();
        }
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
    const matchesDept = !deptFilter || i.department === deptFilter;
    const matchesCourse = !courseFilter || i.course.includes(courseFilter);
    return matchesSearch && matchesDept && matchesCourse;
  });

  renderInternTable(filtered);
}

function openInternModal(internId = null) {
  const modal = document.getElementById('intern-modal');
  const modalTitle = document.getElementById('intern-modal-title');
  const form = document.getElementById('intern-form');

  form.reset();

  if (internId) {
    const intern = db.getInternById(internId);
    if (intern) {
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
    document.getElementById('intern-id-input').value = "INT-" + (100 + currentInterns.length + 1);
  }

  modal.classList.add('active');
}

function closeInternModal() {
  document.getElementById('intern-modal').classList.remove('active');
}

async function handleInternFormSubmit(e) {
  e.preventDefault();
  const internId = document.getElementById('intern-id-input').value;
  const isEditing = currentInterns.some(i => i.internId === internId || i.id === internId);
  const certIssued = document.getElementById('intern-cert-issued').checked;

  const existingIntern = currentInterns.find(i => i.internId === internId || i.id === internId);

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
    attendancePercentage: isEditing ? (existingIntern?.attendancePercentage || 100) : 100,
    certificateIssued: certIssued,
    status: certIssued ? 'completed' : 'active'
  };

  if (DATABASE_MODE === 'firebase') {
    if (isEditing) {
      await fbDb.updateIntern(internId, formData);
    } else {
      await fbDb.addIntern(formData);
    }
  } else {
    if (isEditing) {
      db.updateIntern(internId, formData);
    } else {
      db.addIntern(formData);
    }
    if (certIssued) {
      db.setCertificateIssued(internId, true);
    } else {
      db.setCertificateIssued(internId, false);
    }
  }

  closeInternModal();
  await loadInterns();
}
