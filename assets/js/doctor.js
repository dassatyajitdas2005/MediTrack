/* MediTrack - Doctor OPD Schedule Controller (Firebase Only) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

let currentDoctors = [];
let selectedDay = "Monday";
let editingFirestoreId = null;



document.addEventListener('DOMContentLoaded', async () => {
  await auth.init(); // 🔥 Login check
  renderLayout('doctor');
  initDoctorModule();
});

function initDoctorModule() {
  const isAdmin = auth.isAdmin();
  const addBtn = document.getElementById('add-doctor-btn');
  if (addBtn && !isAdmin) addBtn.style.display = 'none';

  loadDoctors();

  document.querySelectorAll('.opd-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.opd-tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      selectedDay = e.currentTarget.getAttribute('data-day');
      renderOPDSchedule();
    });
  });

  document.getElementById('doctor-form')?.addEventListener('submit', handleDoctorFormSubmit);
  document.getElementById('add-doctor-btn')?.addEventListener('click', () => openDoctorModal());
  document.getElementById('close-doctor-modal')?.addEventListener('click', closeDoctorModal);
  document.getElementById('cancel-doctor-modal')?.addEventListener('click', closeDoctorModal);
}

async function loadDoctors() {
  currentDoctors = await fbDb.getDoctors();
  renderOPDSchedule();
}

function renderOPDSchedule() {
  const container = document.getElementById('doctor-grid-container');
  const isAdmin = auth.isAdmin();
  if (!container) return;

  const availableDocs = currentDoctors.filter(d => d.availableDays.includes(selectedDay));

  if (availableDocs.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;" class="glass-card"><i class="bx bx-calendar-x" style="font-size:48px; color:var(--text-muted);"></i><h4 style="margin-top:10px; color:var(--text-muted);">No doctors scheduled for ${selectedDay}.</h4></div>`;
    return;
  }

  const depts = {};
  availableDocs.forEach(doc => {
    if (!depts[doc.department]) depts[doc.department] = [];
    depts[doc.department].push(doc);
  });

  let html = '';
  for (const [deptName, docList] of Object.entries(depts)) {
    html += `<div style="grid-column:1/-1; margin-top:10px;"><h3 style="font-size:16px; font-weight:800; color:var(--primary-500);"><i class="bx bx-clinic"></i> ${escapeHtml(deptName)}</h3></div>`;
    docList.forEach(doc => {
      html += `
        <div class="glass-card doctor-card animate-fade-in">
          <div class="doctor-header">
            <div class="doctor-avatar"><i class="bx bx-user-voice"></i></div>
            <div class="doctor-details"><h4>${escapeHtml(doc.name)}</h4><p>${escapeHtml(doc.specialization)}</p></div>
          </div>
          <div style="font-size:13px; color:var(--text-muted); display:flex; flex-direction:column; gap:4px; margin-top:4px;">
            <div><strong><i class="bx bx-building-house"></i> Room:</strong> ${escapeHtml(doc.room)}</div>
            <div><strong><i class="bx bx-time-five"></i> Timing:</strong> ${escapeHtml(doc.opdTiming)}</div>
            <div><strong><i class="bx bx-calendar"></i> Days:</strong> ${doc.availableDays.map(d => escapeHtml(d)).join(', ')}</div>
          </div>
          ${isAdmin ? `
            <div style="display:flex; gap:8px; margin-top:12px; padding-top:10px; border-top:1px dashed var(--border-color);">
              <button class="btn btn-secondary btn-sm edit-doc-btn" data-id="${escapeHtml(doc.doctorId)}" style="flex:1;"><i class="bx bx-edit"></i> Edit</button>
              <button class="btn btn-danger btn-sm delete-doc-btn" data-id="${escapeHtml(doc.doctorId)}"><i class="bx bx-trash"></i></button>
            </div>
          ` : ''}
        </div>
      `;
    });
  }

  container.innerHTML = html;

  if (isAdmin) {
    document.querySelectorAll('.edit-doc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => openDoctorModal(e.currentTarget.getAttribute('data-id')));
    });
    document.querySelectorAll('.delete-doc-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!confirm(`Delete Doctor ${id}?`)) return;
        const doc = currentDoctors.find(d => d.doctorId === id);
        await fbDb.deleteDoctor(doc?.id || id);
        await loadDoctors();
      });
    });
  }
}

function openDoctorModal(doctorId = null) {
  const modal = document.getElementById('doctor-modal');
  document.getElementById('doctor-form').reset();
  editingFirestoreId = null;

  if (doctorId) {
    const doc = currentDoctors.find(d => d.doctorId === doctorId || d.id === doctorId);
    if (doc) {
      editingFirestoreId = doc.id || null;
      document.getElementById('doctor-id-input').value = doc.doctorId;
      document.getElementById('doc-name').value = doc.name;
      document.getElementById('doc-department').value = doc.department;
      document.getElementById('doc-specialization').value = doc.specialization;
      document.getElementById('doc-room').value = doc.room;
      document.getElementById('doc-opd-timing').value = doc.opdTiming;
      document.querySelectorAll('.day-checkbox').forEach(cb => cb.checked = doc.availableDays.includes(cb.value));
    }
  } else {
    document.getElementById('doctor-id-input').value = "DOC-" + Date.now().toString().slice(-5);
  }
  modal.classList.add('active');
}

function closeDoctorModal() {
  document.getElementById('doctor-modal').classList.remove('active');
  editingFirestoreId = null;
}

async function handleDoctorFormSubmit(e) {
  e.preventDefault();
  const doctorId = document.getElementById('doctor-id-input').value;
  const isEditing = currentDoctors.some(d => d.doctorId === doctorId || d.id === doctorId);
  const existingDoc = currentDoctors.find(d => d.doctorId === doctorId || d.id === doctorId);
  const firestoreId = editingFirestoreId || existingDoc?.id || doctorId;

  const selectedDays = Array.from(document.querySelectorAll('.day-checkbox:checked')).map(cb => cb.value);
  if (selectedDays.length === 0) { alert("Please select at least one day!"); return; }

  const formData = {
    doctorId,
    name: document.getElementById('doc-name').value,
    department: document.getElementById('doc-department').value,
    specialization: document.getElementById('doc-specialization').value,
    room: document.getElementById('doc-room').value,
    availableDays: selectedDays,
    opdTiming: document.getElementById('doc-opd-timing').value
  };

  if (isEditing) {
    await fbDb.updateDoctor(firestoreId, formData);
  } else {
    await fbDb.addDoctor(formData);
  }

  closeDoctorModal();
  await loadDoctors();
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}