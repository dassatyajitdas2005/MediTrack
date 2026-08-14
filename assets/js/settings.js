/* MediTrack - Application Settings Controller */

import { auth } from './auth.js';
import { theme } from './theme.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  renderLayout('settings');
  initSettings();
});

function initSettings() {
  const user = auth.getCurrentUser();
  const userInfoDiv = document.getElementById('settings-user-info');

  if (userInfoDiv && user) {
    userInfoDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, var(--primary-500), var(--secondary-500)); color:white; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:800; flex-shrink:0;">
          ${escapeHtml(user.name ? user.name.charAt(0).toUpperCase() : 'U')}
        </div>
        <div>
          <h4 style="font-size:18px; font-weight:800;">${escapeHtml(user.name || 'User')}</h4>
          <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">${escapeHtml(user.email || '')}</p>
          <span class="role-badge ${escapeHtml(user.role || 'student')}" style="margin-top:6px; display:inline-block;">${escapeHtml(user.role || 'student')}</span>
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