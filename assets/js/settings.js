/* MediTrack - Settings Page (Firebase Only) */

import { auth } from './auth.js';
import { renderLayout } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
    await auth.init(); // 🔥 Login check
    auth.checkAuth(['admin']); // 🔥 Sirf Admin allowed
    renderLayout('settings');
    initSettings();
});

function initSettings() {
    const user = auth.getCurrentUser();
    if (!auth.isAdmin()) {
        document.getElementById('admin-settings-panel').style.display = 'none';
    }

    // Display current user info
    if (user) {
        document.getElementById('settings-user-name').value = user.name || '';
        document.getElementById('settings-user-email').value = user.email || '';
        document.getElementById('settings-user-role').value = user.role || '';
    }

    document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        alert('Profile update: Connect to Firebase Auth updateProfile if needed.');
    });

    document.getElementById('clear-cache-btn')?.addEventListener('click', () => {
        localStorage.clear();
        alert('Local cache cleared! You will be redirected to login.');
        window.location.href = 'login.html';
    });
}