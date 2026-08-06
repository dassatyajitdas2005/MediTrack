/* MediTrack - Common Layout Framework & Page Inserter */

import { auth } from './auth.js';
import { theme } from './theme.js';

export function renderLayout(activePage = 'dashboard') {
  const user = auth.getCurrentUser() || { name: "Guest User", role: "admin", email: "admin@meditrack.com" };
  const role = user.role;

  // Insert Sidebar Navigation if missing
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
          <div class="nav-section-title">Main Menu</div>
          <a href="dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
            <span class="icon"><i class="bx bx-grid-alt"></i></span>
            <span>Dashboard</span>
          </a>
          <a href="intern.html" class="nav-item ${activePage === 'intern' ? 'active' : ''}">
            <span class="icon"><i class="bx bx-group"></i></span>
            <span>Intern Management</span>
          </a>


          <a href="user.html" class="nav-item ${activePage === 'user' ? 'active' : ''}">
            <span class="icon">
                <i class="bx bx-user-circle"></i>
            </span>
            <span>User Management</span>
          </a>



          <a href="doctor.html" class="nav-item ${activePage === 'doctor' ? 'active' : ''}">
            <span class="icon"><i class="bx bx-user-voice"></i></span>
            <span>Doctor OPD Schedule</span>
          </a>
          <a href="attendance.html" class="nav-item ${activePage === 'attendance' ? 'active' : ''}">
            <span class="icon"><i class="bx bx-calendar-check"></i></span>
            <span>Attendance Module</span>
          </a>

          <div class="nav-section-title">Training & Reports</div>
          <a href="training.html" class="nav-item ${activePage === 'training' ? 'active' : ''}">
            <span class="icon"><i class="bx bx-trending-up"></i></span>
            <span>Training Progress</span>
          </a>
          <a href="schedule.html" class="nav-item ${activePage === 'schedule' ? 'active' : ''}">
            <span class="icon"><i class="bx bx-time-five"></i></span>
            <span>Daily Schedule</span>
          </a>
          <a href="report.html" class="nav-item ${activePage === 'report' ? 'active' : ''}">
            <span class="icon"><i class="bx bx-bar-chart-alt-2"></i></span>
            <span>Reports & Summary</span>
          </a>
          
          <div class="nav-section-title">System</div>
          <a href="settings.html" class="nav-item ${activePage === 'settings' ? 'active' : ''}">
            <span class="icon"><i class="bx bx-cog"></i></span>
            <span>Settings & Config</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
            <div class="user-info">
              <div class="user-name">${user.name}</div>
              <div class="user-role">
                <span class="role-badge ${role}">${role}</span>
              </div>
            </div>
            <button id="logout-btn" title="Logout" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:20px;">
              <i class="bx bx-log-out"></i>
            </button>
          </div>
        </div>
      </aside>
    `;
  }

  // Insert Top Navbar if missing
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    const pageTitles = {
      user: { title: "User Management", subtitle: "Manage Admin, Students & Supervisors" },
      dashboard: { title: "Hospital Dashboard", subtitle: "Real-time internship & OPD analytics summary" },
      intern: { title: "Intern Management", subtitle: "Manage intern enrollment, courses, & progress" },
      doctor: { title: "Doctor OPD Schedule", subtitle: "Hospital OPD timings & day-wise availability" },
      attendance: { title: "Attendance Module", subtitle: "Mark and track daily intern attendance" },
      training: { title: "Training Progress", subtitle: "Monitor course completion & remaining duration" },
      schedule: { title: "Daily Training Schedule", subtitle: "Rotational department assignment directory" },
      report: { title: "Reports & Analytics", subtitle: "Comprehensive summary reports & records" },
      settings: { title: "System Settings", subtitle: "Firebase configuration & role access panel" }
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
          <!-- Role Switcher Quick Pill -->
          <div class="role-switcher-pill" title="Quick Role Switcher for Testing">
            <button class="role-switcher-btn ${role === 'admin' ? 'active' : ''}" data-role="admin">Admin</button>
            <button class="role-switcher-btn ${role === 'student' ? 'active' : ''}" data-role="student">Student</button>
            <button class="role-switcher-btn ${role === 'supervisor' ? 'active' : ''}" data-role="supervisor">Supervisor</button>
          </div>

          <!-- Theme Toggle -->
          <button class="theme-toggle-btn" id="theme-toggle-btn" title="Toggle Theme">
            <i class="bx bx-moon"></i>
          </button>
        </div>
      </header>
    `;
  }

  // Bind Event Handlers
  bindEvents();
  theme.updateToggleIcon();
}

function bindEvents() {
  // Theme Toggle Button
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => theme.toggleTheme());
  }

  // Role Switcher Buttons
  const roleBtns = document.querySelectorAll('.role-switcher-btn');
  roleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetRole = e.target.getAttribute('data-role');
      auth.switchRole(targetRole);
    });
  });

  // Logout Button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => auth.logout());
  }

  // Mobile Sidebar Toggle
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
