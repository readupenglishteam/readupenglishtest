
  if (localStorage.theme==='dark'||(!('theme' in localStorage)&&matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
