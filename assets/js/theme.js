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
    return localStorage.getItem(this.themeKey) || 'light';
  }

  getEffectiveTheme() {
    const saved = this.getTheme();
    if (saved === 'system') {
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    return saved;
  }

  setTheme(themeName) {
    const effectiveTheme = themeName === 'system' 
      ? ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light')
      : themeName;

    document.documentElement.setAttribute('data-theme', effectiveTheme);
    localStorage.setItem(this.themeKey, themeName);
    this.updateToggleIcon();
  }

  toggleTheme() {
    const current = this.getEffectiveTheme();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  updateToggleIcon() {
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    const isDark = this.getEffectiveTheme() === 'dark';
    toggleBtns.forEach(btn => {
      btn.innerHTML = isDark ? '<i class="bx bx-sun"></i>' : '<i class="bx bx-moon"></i>';
      btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    });
  }
}

export const theme = new ThemeService();
