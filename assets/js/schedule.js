/* MediTrack - Training Schedule Controller (Student Friendly) */

import * as fbDb from './firebase-db.js';
import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  // 🔥 FIX: Students can also view schedule
  auth.checkAuth(['student', 'admin', 'supervisor']);
  renderLayout('schedule');
  loadSchedule();
});

async function loadSchedule() {
  const user = auth.getCurrentUser();
  if (!user) return;

  // For students, show their department-specific schedule
  const department = user.department || 'Pharmacy';

  // 🔥 Pharmacy Student Daily Tasks (as requested)
  const pharmacyTasks = [
    {
      time: "09:00 AM - 11:00 AM",
      title: "Outdoor Medicine Dispensing",
      description: "Dispense medicines to patients at outdoor counter. Check prescriptions and provide correct dosage.",
      department: "Pharmacy",
      status: "Daily",
      icon: "bx-capsule"
    },
    {
      time: "11:00 AM - 01:00 PM",
      title: "Stock Check & Inventory",
      description: "Check medicine stock availability, expiry dates, and update inventory records.",
      department: "Pharmacy",
      status: "Daily",
      icon: "bx-package"
    },
    {
      time: "02:00 PM - 04:00 PM",
      title: "Medical Camp Duty",
      description: "Visit medical camps with senior pharmacist. Assist in dispensing and patient counseling.",
      department: "Pharmacy",
      status: "Weekly",
      icon: "bx-first-aid"
    },
    {
      time: "04:00 PM - 05:00 PM",
      title: "Compounding & Labeling",
      description: "Prepare compound medicines and label them correctly under supervision.",
      department: "Pharmacy",
      status: "Daily",
      icon: "bx-flask"
    },
    {
      time: "Friday Only",
      title: "Pharmacology Seminar",
      description: "Attend weekly seminar on drug interactions and pharmacology updates.",
      department: "Pharmacy",
      status: "Weekly",
      icon: "bx-book"
    },
    {
      time: "Saturday",
      title: "Hospital Pharmacy Rotation",
      description: "Rotate through different pharmacy sections: IPD, OPD, and Emergency.",
      department: "Pharmacy",
      status: "Weekly",
      icon: "bx-building"
    }
  ];

  const container = document.getElementById('schedule-container');
  if (!container) return;

  // Render tasks
  container.innerHTML = pharmacyTasks.map((task, index) => `
    <div class="glass-card" style="padding:20px; margin-bottom:16px; display:flex; gap:16px; align-items:flex-start;">
      <div style="width:48px; height:48px; border-radius:var(--radius-md); 
                  background:linear-gradient(135deg, var(--primary-500), var(--secondary-500)); 
                  display:flex; align-items:center; justify-content:center; color:white; font-size:24px; flex-shrink:0;">
        <i class="bx ${task.icon}"></i>
      </div>
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <h4 style="font-size:16px; font-weight:700;">${task.title}</h4>
          <span class="status-pill ${task.status === 'Daily' ? 'active' : 'warning'}" style="font-size:11px;">
            ${task.status}
          </span>
        </div>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:8px; line-height:1.5;">
          ${task.description}
        </p>
        <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--primary-500); font-weight:600;">
          <i class="bx bx-time"></i> ${task.time}
        </div>
      </div>
    </div>
  `).join('');

  // Also fetch Firestore training data if available
  try {
    const trainingData = await fbDb.getTraining();
    if (trainingData && trainingData.length > 0) {
      const extraContainer = document.getElementById('extra-training');
      if (extraContainer) {
        extraContainer.innerHTML = trainingData.map(t => `
          <div class="glass-card" style="padding:16px; margin-bottom:12px;">
            <h4 style="font-size:14px; font-weight:700;">${t.rotationName || t.name}</h4>
            <p style="font-size:12px; color:var(--text-muted);">${t.department} | ${t.duration}</p>
          </div>
        `).join('');
      }
    }
  } catch (e) {
    console.log("No additional training data");
  }
}