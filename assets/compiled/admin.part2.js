/* Source: assets/js/pages/admin.03.js */
Chart.defaults.font.family = "'Montserrat', sans-serif";
;
/* Source: assets/js/pages/admin.04.js */

    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  