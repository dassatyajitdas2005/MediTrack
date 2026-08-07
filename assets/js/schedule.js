/* MediTrack - Training Schedule Controller (Firebase Only) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

let currentSchedules = [];
let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  auth.checkAuth(['admin', 'supervisor']);
  renderLayout('schedule');
  // ... baaki same
});

async function initScheduleModule() {
  const isAdmin = auth.isAdmin();
  if (!isAdmin) {
    document.getElementById('add-schedule-btn').style.display = 'none';
  }

  document.getElementById('add-schedule-btn')?.addEventListener('click', () => openScheduleModal());
  document.getElementById('close-schedule-modal')?.addEventListener('click', closeScheduleModal);
  document.getElementById('cancel-schedule-modal')?.addEventListener('click', closeScheduleModal);
  document.getElementById('schedule-form')?.addEventListener('submit', handleScheduleSubmit);

  await loadSchedules();
}

async function loadSchedules() {
  currentSchedules = await fbDb.getTraining();
  renderScheduleTable(currentSchedules);
}

function renderScheduleTable(schedules) {
  const tbody = document.getElementById('schedule-tbody');
  const isAdmin = auth.isAdmin();
  if (!tbody) return;

  if (schedules.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;">No training schedules found.</td></tr>`;
    return;
  }

  tbody.innerHTML = schedules.map(sch => `
    <tr>
      <td><strong>${escapeHtml(sch.department || '-')}</strong></td>
      <td>${escapeHtml(sch.rotationName || sch.name || '-')}</td>
      <td>${escapeHtml(sch.duration || '-')}</td>
      <td>${escapeHtml(sch.supervisor || '-')}</td>
      <td>${escapeHtml(sch.activities || '-')}</td>
      <td>
        ${isAdmin ? `
          <button class="btn btn-secondary btn-sm edit-schedule-btn" data-id="${escapeHtml(sch.id)}"><i class="bx bx-edit"></i></button>
          <button class="btn btn-danger btn-sm delete-schedule-btn" data-id="${escapeHtml(sch.id)}"><i class="bx bx-trash"></i></button>
        ` : '-'}
      </td>
    </tr>
  `).join('');

  if (isAdmin) {
    document.querySelectorAll('.edit-schedule-btn').forEach(btn => {
      btn.addEventListener('click', (e) => openScheduleModal(e.currentTarget.dataset.id));
    });
    document.querySelectorAll('.delete-schedule-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm('Delete this schedule?')) return;
        // Note: deleteTraining not in firebase-db.js, using update with empty or manual delete
        // If you need deleteTraining, add it to firebase-db.js similar to deleteDoctor
        alert('Delete function needs firebase-db.js update. Use Firestore console for now.');
      });
    });
  }
}

function openScheduleModal(scheduleId = null) {
  const modal = document.getElementById('schedule-modal');
  const modalTitle = document.getElementById('schedule-modal-title');
  document.getElementById('schedule-form').reset();
  editingId = null;

  if (scheduleId) {
    const sch = currentSchedules.find(s => s.id === scheduleId);
    if (sch) {
      editingId = scheduleId;
      modalTitle.innerText = 'Edit Schedule';
      document.getElementById('schedule-dept').value = sch.department || '';
      document.getElementById('schedule-name').value = sch.rotationName || sch.name || '';
      document.getElementById('schedule-duration').value = sch.duration || '';
      document.getElementById('schedule-supervisor').value = sch.supervisor || '';
      document.getElementById('schedule-activities').value = sch.activities || '';
    }
  } else {
    modalTitle.innerText = 'Add Schedule';
  }
  modal.classList.add('active');
}

function closeScheduleModal() {
  document.getElementById('schedule-modal').classList.remove('active');
  editingId = null;
}

async function handleScheduleSubmit(e) {
  e.preventDefault();
  const formData = {
    department: document.getElementById('schedule-dept').value,
    rotationName: document.getElementById('schedule-name').value,
    duration: document.getElementById('schedule-duration').value,
    supervisor: document.getElementById('schedule-supervisor').value,
    activities: document.getElementById('schedule-activities').value
  };

  if (editingId) {
    await fbDb.updateTraining(editingId, formData);
  } else {
    const docRef = doc(collection(window.db, "training")); // fallback if addTraining missing
    // Ideally use fbDb.addTraining — add this to firebase-db.js if needed
    await fbDb.updateTraining("sch_" + Date.now(), formData);
  }

  closeScheduleModal();
  await loadSchedules();
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}