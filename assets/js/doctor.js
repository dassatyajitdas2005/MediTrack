/* MediTrack - Doctor OPD Schedule Controller */

import { db } from './db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

let currentDoctors = [];
let selectedDay = "Monday";

document.addEventListener('DOMContentLoaded', () => {
  renderLayout('doctor');
  initDoctorModule();
});

function initDoctorModule() {
  const isAdmin = auth.isAdmin();

  // Hide Add Doctor Button for non-admins
  const addBtn = document.getElementById('add-doctor-btn');
  if (addBtn && !isAdmin) {
    addBtn.style.display = 'none';
  }

  loadDoctors();

  // Day Filter Tabs (Monday - Saturday)
  document.querySelectorAll('.opd-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.opd-tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      selectedDay = e.currentTarget.getAttribute('data-day');
      renderOPDSchedule();
    });
  });

  // Modal Handlers
  document.getElementById('doctor-form')?.addEventListener('submit', handleDoctorFormSubmit);
  document.getElementById('add-doctor-btn')?.addEventListener('click', () => openDoctorModal());
  document.getElementById('close-doctor-modal')?.addEventListener('click', closeDoctorModal);
  document.getElementById('cancel-doctor-modal')?.addEventListener('click', closeDoctorModal);
}

function loadDoctors() {
  currentDoctors = db.getDoctors();
  renderOPDSchedule();
}

function renderOPDSchedule() {
  const container = document.getElementById('doctor-grid-container');
  const isAdmin = auth.isAdmin();

  if (!container) return;

  // Filter Doctors by selected day
  const availableDocs = currentDoctors.filter(d => d.availableDays.includes(selectedDay));

  if (availableDocs.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px;" class="glass-card">
        <i class="bx bx-calendar-x" style="font-size: 48px; color: var(--text-muted);"></i>
        <h4 style="margin-top: 10px; color: var(--text-muted);">No doctors scheduled for ${selectedDay}.</h4>
      </div>
    `;
    return;
  }

  // Group Doctors by Department
  const depts = {};
  availableDocs.forEach(doc => {
    if (!depts[doc.department]) depts[doc.department] = [];
    depts[doc.department].push(doc);
  });

  let html = '';
  for (const [deptName, docList] of Object.entries(depts)) {
    html += `
      <div style="grid-column: 1 / -1; margin-top: 10px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--primary-500); display: flex; align-items: center; gap: 8px;">
          <i class="bx bx-clinic"></i> ${deptName} Department
        </h3>
      </div>
    `;

    docList.forEach(doc => {
      html += `
        <div class="glass-card doctor-card animate-fade-in">
          <div class="doctor-header">
            <div class="doctor-avatar"><i class="bx bx-user-voice"></i></div>
            <div class="doctor-details">
              <h4>${doc.name}</h4>
              <p>${doc.specialization}</p>
            </div>
          </div>
          
          <div style="font-size: 13px; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
            <div><strong><i class="bx bx-building-house"></i> Room:</strong> ${doc.room}</div>
            <div><strong><i class="bx bx-time-five"></i> OPD Timing:</strong> ${doc.opdTiming}</div>
            <div><strong><i class="bx bx-calendar"></i> Days:</strong> ${doc.availableDays.join(', ')}</div>
          </div>

          ${isAdmin ? `
            <div style="display: flex; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--border-color);">
              <button class="btn btn-secondary btn-sm edit-doc-btn" data-id="${doc.doctorId}" style="flex:1;"><i class="bx bx-edit"></i> Edit</button>
              <button class="btn btn-danger btn-sm delete-doc-btn" data-id="${doc.doctorId}"><i class="bx bx-trash"></i></button>
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
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm(`Delete Doctor ${id}?`)) {
          db.deleteDoctor(id);
          loadDoctors();
        }
      });
    });
  }
}

function openDoctorModal(doctorId = null) {
  const modal = document.getElementById('doctor-modal');
  const form = document.getElementById('doctor-form');
  form.reset();

  if (doctorId) {
    const doc = currentDoctors.find(d => d.doctorId === doctorId);
    if (doc) {
      document.getElementById('doctor-id-input').value = doc.doctorId;
      document.getElementById('doc-name').value = doc.name;
      document.getElementById('doc-department').value = doc.department;
      document.getElementById('doc-specialization').value = doc.specialization;
      document.getElementById('doc-room').value = doc.room;
      document.getElementById('doc-opd-timing').value = doc.opdTiming;
      
      // Days checkboxes
      document.querySelectorAll('.day-checkbox').forEach(cb => {
        cb.checked = doc.availableDays.includes(cb.value);
      });
    }
  } else {
    document.getElementById('doctor-id-input').value = "DOC-" + (200 + currentDoctors.length + 1);
  }

  modal.classList.add('active');
}

function closeDoctorModal() {
  document.getElementById('doctor-modal').classList.remove('active');
}

function handleDoctorFormSubmit(e) {
  e.preventDefault();
  const doctorId = document.getElementById('doctor-id-input').value;
  const isEditing = currentDoctors.some(d => d.doctorId === doctorId);

  const selectedDays = Array.from(document.querySelectorAll('.day-checkbox:checked')).map(cb => cb.value);

  const formData = {
    doctorId,
    name: document.getElementById('doc-name').value,
    department: document.getElementById('doc-department').value,
    specialization: document.getElementById('doc-specialization').value,
    room: document.getElementById('doc-room').value,
    availableDays: selectedDays.length > 0 ? selectedDays : ["Monday", "Wednesday"],
    opdTiming: document.getElementById('doc-opd-timing').value
  };

  if (isEditing) db.updateDoctor(doctorId, formData);
  else db.addDoctor(formData);

  closeDoctorModal();
  loadDoctors();
}
