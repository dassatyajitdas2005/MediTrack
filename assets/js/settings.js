/* MediTrack - Application Settings Controller */

import { auth } from './auth.js';
import { theme } from './theme.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await auth.init();
    const isAllowed = await auth.checkAuth(['admin', 'student', 'supervisor']);
    if (!isAllowed) return;
    renderLayout('settings');
    initSettings();
  } catch (error) {
    console.error('[Settings] Error initializing:', error);
  }
});

function initSettings() {
  const user = auth.getCurrentUser();
  const userInfoDiv = document.getElementById('settings-user-info');
  const roleDisplay = document.getElementById('settings-role-display');
  const emailVerifDisplay = document.getElementById('settings-email-verification');
  const lastLoginDisplay = document.getElementById('settings-last-login');

  if (userInfoDiv && user) {
    const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    const roleUpper = (user.role || 'student').toString().toUpperCase();

    userInfoDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, var(--primary-500), var(--secondary-500)); color:white; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:800; flex-shrink:0;">
          ${escapeHtml(initials)}
        </div>
        <div>
          <h4 style="font-size:18px; font-weight:800;">${escapeHtml(user.name || 'User')}</h4>
          <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">${escapeHtml(user.email || '')}</p>
          <span class="role-badge ${escapeHtml((user.role || 'student').toLowerCase())}" style="margin-top:6px; display:inline-block;">${escapeHtml(roleUpper)}</span>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px; font-size:13px; margin-top:20px;">
        <div style="display:flex; justify-content:space-between; padding:10px 14px; background:var(--bg-main); border-radius:var(--radius-md);">
          <span style="color:var(--text-muted);">Department</span>
          <span style="font-weight:700;">${escapeHtml(user.department || 'Pharmacy')}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:10px 14px; background:var(--bg-main); border-radius:var(--radius-md);">
          <span style="color:var(--text-muted);">Email Status</span>
          <span style="font-weight:700; color:${user.emailVerified ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">
            ${user.emailVerified ? 'Verified' : 'Pending Verification'}
          </span>
        </div>
      </div>
    `;

    if (roleDisplay) {
      const roleStr = (user.role || 'student').toString().trim();
      roleDisplay.textContent = roleStr.charAt(0).toUpperCase() + roleStr.slice(1).toLowerCase();
    }

    if (emailVerifDisplay) {
      emailVerifDisplay.textContent = user.emailVerified ? 'Verified' : 'Pending Verification';
      emailVerifDisplay.style.color = user.emailVerified ? 'var(--accent-emerald)' : 'var(--accent-amber)';
    }

    if (lastLoginDisplay) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      lastLoginDisplay.textContent = `Today, ${timeStr}`;
    }
  }

  // Theme Toggles
  document.getElementById('theme-btn-light')?.addEventListener('click', () => {
    theme.setTheme('light');
  });

  document.getElementById('theme-btn-dark')?.addEventListener('click', () => {
    theme.setTheme('dark');
  });

  // Logout Button
  document.getElementById('settings-logout-btn')?.addEventListener('click', () => {
    auth.logout();
  });
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}