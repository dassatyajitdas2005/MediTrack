/* MediTrack - Dark/Light Theme Engine */

class ThemeService {
  constructor() {
    this.themeKey = 'meditrack_theme';
    this.initTheme();
  }

  initTheme() {
    const savedTheme = localStorage.getItem(this.themeKey) || 'light';
    this.setTheme(savedTheme);
  }

  getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.themeKey, theme);
    this.updateToggleIcon();
  }

  toggleTheme() {
    const current = this.getTheme();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  updateToggleIcon() {
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    const isDark = this.getTheme() === 'dark';
    toggleBtns.forEach(btn => {
      btn.innerHTML = isDark ? '<i class="bx bx-sun"></i>' : '<i class="bx bx-moon"></i>';
      btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    });
  }
}

export const theme = new ThemeService();
