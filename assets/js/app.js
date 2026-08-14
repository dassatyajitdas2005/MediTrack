/* MediTrack - Common Layout Framework & Page Inserter (Role-Based) */

import { auth } from './auth.js';
import { theme } from './theme.js';

/**
 * Get sidebar items based on user role
 */
function getSidebarItems(role) {
  const common = [
    { id: 'dashboard', icon: 'bx-grid-alt', label: 'Dashboard', href: 'dashboard.html' },
  ];

  const studentItems = [
    { id: 'training', icon: 'bx-trending-up', label: 'Training Progress', href: 'training.html' },
    { id: 'schedule', icon: 'bx-time-five', label: 'Daily Schedule', href: 'schedule.html' },
    { id: 'certificate', icon: 'bx-certification', label: 'Certificate', href: 'certificate.html' },
  ];

  const adminItems = [
    { id: 'intern', icon: 'bx-group', label: 'Intern Management', href: 'intern.html' },
    { id: 'user', icon: 'bx-user-circle', label: 'User Management', href: 'user.html' },
    { id: 'doctor', icon: 'bx-user-voice', label: 'Doctor OPD Schedule', href: 'doctor.html' },
    { id: 'attendance', icon: 'bx-calendar-check', label: 'Attendance Module', href: 'attendance.html' },
  ];

  const settingsItem = { id: 'settings', icon: 'bx-cog', label: 'Settings & Config', href: 'settings.html' };

  const adminSystemItems = [
    { id: 'report', icon: 'bx-bar-chart-alt-2', label: 'Reports & Summary', href: 'report.html' },
    settingsItem
  ];

  if (role === 'student') {
    return [...common, ...studentItems, settingsItem];
  }

  if (role === 'admin') {
    return [...common, ...adminItems, ...studentItems, ...adminSystemItems];
  }

  if (role === 'supervisor') {
    return [
      ...common,
      { id: 'attendance', icon: 'bx-calendar-check', label: 'Attendance Module', href: 'attendance.html' },
      ...studentItems,
      { id: 'report', icon: 'bx-bar-chart-alt-2', label: 'Reports & Summary', href: 'report.html' },
      settingsItem
    ];
  }

  return [...common, settingsItem];
}

export function renderLayout(activePage = 'dashboard') {
  const user = auth.getCurrentUser() || { name: "Guest User", role: "student", email: "guest@meditrack.com" };
  const role = user.role || 'student';

  const navItems = getSidebarItems(role);

  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = `
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="brand">
            <div class="brand-icon">
              <i class="bx bx-plus-medical"></i>
            </div>
            <div class="brand-name">Medi<span>Track</span></div>
          </div>
          <button class="menu-toggle mobile-only" id="close-sidebar-btn">
            <i class="bx bx-x"></i>
          </button>
        </div>

        <nav class="sidebar-nav">
          ${navItems.map(item => `
            <a href="${item.href}" class="nav-item ${activePage === item.id ? 'active' : ''}">
              <span class="icon"><i class="bx ${item.icon}"></i></span>
              <span>${item.label}</span>
            </a>
          `).join('')}
        </nav>

        <!-- Profile Section (Bottom) -->
        <div class="sidebar-footer" id="sidebar-profile-card" style="cursor:pointer;" title="View Profile">
          <div class="user-card">
            <div class="user-avatar">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
            <div class="user-info">
              <div class="user-name">${user.name}</div>
              <div class="user-role">
                <span class="role-badge ${role}">${role}</span>
              </div>
            </div>
            <button id="logout-btn" title="Logout" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:20px; z-index:2;">
              <i class="bx bx-log-out"></i>
            </button>
          </div>
        </div>
      </aside>
    `;
  }

  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    const pageTitles = {
      user: { title: "User Management", subtitle: "Manage Admin, Students & Supervisors" },
      dashboard: { title: role === 'student' ? "Student Dashboard" : "Admin Dashboard", subtitle: role === 'student' ? "Your training overview & daily schedule" : "Real-time internship & OPD analytics summary" },
      intern: { title: "Intern Management", subtitle: "Manage intern enrollment, courses, & progress" },
      doctor: { title: "Doctor OPD Schedule", subtitle: "Hospital OPD timings & day-wise availability" },
      attendance: { title: "Attendance Module", subtitle: "Mark and track daily intern attendance" },
      training: { title: "Training Progress", subtitle: "Monitor course completion & remaining duration" },
      schedule: { title: "Daily Training Schedule", subtitle: "Rotational department assignment directory" },
      report: { title: "Reports & Analytics", subtitle: "Comprehensive summary reports & records" },
      settings: { title: "System Settings", subtitle: "Firebase configuration & role access panel" },
      certificate: { title: "Certificate", subtitle: "View and download your completion certificate" }
    };

    const currentMeta = pageTitles[activePage] || { title: "MediTrack", subtitle: "Hospital Training Management System" };

    navbarContainer.innerHTML = `
      <header class="top-navbar">
        <div class="top-navbar-left">
          <button class="menu-toggle" id="open-sidebar-btn">
            <i class="bx bx-menu"></i>
          </button>
          <div class="page-title-group">
            <h1>${currentMeta.title}</h1>
            <p>${currentMeta.subtitle}</p>
          </div>
        </div>

        <div class="top-navbar-right">
          <!-- Theme Toggle -->
          <button class="theme-toggle-btn" id="theme-toggle-btn" title="Toggle Theme">
            <i class="bx bx-moon"></i>
          </button>
        </div>
      </header>
    `;
  }

  bindEvents();
  theme.updateToggleIcon();
}

function bindEvents() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => theme.toggleTheme());
  }

  // Logout Button — FIXED: Proper event listener
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      auth.logout();
    });
  }

  // Profile Card Click → Show Popup
  const profileCard = document.getElementById('sidebar-profile-card');
  if (profileCard) {
    profileCard.addEventListener('click', (e) => {
      if (e.target.closest('#logout-btn')) return;
      showProfilePopup();
    });
  }

  const openSidebarBtn = document.getElementById('open-sidebar-btn');
  const closeSidebarBtn = document.getElementById('close-sidebar-btn');
  const sidebar = document.querySelector('.sidebar');

  if (openSidebarBtn && sidebar) {
    openSidebarBtn.addEventListener('click', () => sidebar.classList.add('mobile-open'));
  }
  if (closeSidebarBtn && sidebar) {
    closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('mobile-open'));
  }
}

function showProfilePopup() {
  const user = auth.getCurrentUser();
  if (!user) return;

  let existingModal = document.getElementById('profile-modal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'profile-modal';
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:998;"></div>
    <div class="modal-content glass-card" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); 
         max-width:420px; width:90%; padding:28px; z-index:999; border-radius:var(--radius-lg);">
      
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 style="font-size:18px; font-weight:800;">My Profile</h3>
        <button id="close-profile-modal" style="background:none; border:none; font-size:24px; cursor:pointer; color:var(--text-muted);">&times;</button>
      </div>

      <div style="text-align:center; margin-bottom:24px;">
        <div style="width:72px; height:72px; border-radius:50%; margin:0 auto 12px; 
                    background:linear-gradient(135deg, var(--primary-500), var(--secondary-500)); 
                    display:flex; align-items:center; justify-content:center; color:white; 
                    font-size:28px; font-weight:700;">
          ${(user.name || 'S').charAt(0).toUpperCase()}
        </div>
        <h4 style="font-size:16px; font-weight:700;">${escapeHtml(user.name)}</h4>
        <span class="role-badge ${user.role}" style="margin-top:6px; display:inline-block; text-transform:capitalize;">
          ${user.role}
        </span>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; font-size:13px;">
        <div style="display:flex; justify-content:space-between; padding:10px 14px; 
                    background:var(--bg-secondary); border-radius:var(--radius-md);">
          <span style="color:var(--text-muted);">Email</span>
          <span style="font-weight:600;">${escapeHtml(user.email)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:10px 14px; 
                    background:var(--bg-secondary); border-radius:var(--radius-md);">
          <span style="color:var(--text-muted);">Department</span>
          <span style="font-weight:600;">${escapeHtml(user.department || 'Pharmacy')}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:10px 14px; 
                    background:var(--bg-secondary); border-radius:var(--radius-md);">
          <span style="color:var(--text-muted);">Status</span>
          <span style="font-weight:600;">${escapeHtml(user.status || 'Active')}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:10px 14px; 
                    background:var(--bg-secondary); border-radius:var(--radius-md);">
          <span style="color:var(--text-muted);">Email Verified</span>
          <span style="font-weight:600; color:${user.emailVerified ? 'var(--success)' : 'var(--warning)'};">
            ${user.emailVerified ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <button id="popup-logout-btn" class="btn btn-danger" style="width:100%; margin-top:20px;">
        <i class="bx bx-log-out"></i> Logout
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // FIXED: Proper logout event listener instead of inline onclick
  document.getElementById('popup-logout-btn').addEventListener('click', () => {
    auth.logout();
  });

  document.getElementById('close-profile-modal').addEventListener('click', () => modal.remove());
  modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}