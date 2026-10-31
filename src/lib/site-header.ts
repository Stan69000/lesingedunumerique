const header = document.querySelector<HTMLElement>('[data-site-header]');
if (header) {
  const theme = header.querySelector<HTMLButtonElement>('#theme-toggle')!;
  const mobileTheme = header.querySelector<HTMLButtonElement>('#mobile-theme-btn')!;
  const trigger = header.querySelector<HTMLButtonElement>('#burger-btn')!;
  const menu = header.querySelector<HTMLDialogElement>('#mobile-menu')!;
  let savedTheme: string | null = null;
  try { savedTheme = localStorage.getItem('theme'); } catch { /* Navigation privée ou stockage indisponible. */ }
  if (savedTheme === 'light' || (!savedTheme && matchMedia('(prefers-color-scheme: light)').matches)) document.body.classList.add('light-mode');
  const syncTheme = () => {
    const light = document.body.classList.contains('light-mode');
    const label = light ? 'Activer le thème sombre' : 'Activer le thème clair';
    theme.firstElementChild!.textContent = light ? '☀️' : '🌙';
    for (const control of [theme, mobileTheme]) {
      control.setAttribute('aria-pressed', String(light));
      control.setAttribute('aria-label', label);
    }
    mobileTheme.textContent = label;
  };
  const toggleTheme = () => {
    document.body.classList.toggle('light-mode');
    try { localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark'); } catch { /* Le thème fonctionne aussi sans stockage. */ }
    syncTheme();
  };
  syncTheme();
  theme.addEventListener('click', toggleTheme);
  mobileTheme.addEventListener('click', toggleTheme);
  trigger.addEventListener('click', () => {
    if (menu.open) { menu.close(); return; }
    menu.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-label', 'Fermer le menu principal');
  });
  header.querySelector('[data-site-menu-close]')!.addEventListener('click', () => menu.close());
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menu.close()));
  menu.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Ouvrir le menu principal');
  });
  matchMedia('(min-width: 1101px)').addEventListener('change', event => { if (event.matches && menu.open) menu.close(); });
}
