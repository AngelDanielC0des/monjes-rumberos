(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');

  if (menuButton && mobileMenu) {
    const closeMenu = () => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Abrir menú');
      mobileMenu.hidden = true;
    };
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Abrir menú' : 'Cerrar menú');
      mobileMenu.hidden = isOpen;
    });
    mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menuButton.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (!mobileMenu.hidden && !mobileMenu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
  }

  const revealItems = document.querySelectorAll('[data-reveal]');
  if (!reduceMotion && 'IntersectionObserver' in window && revealItems.length) {
    document.body.classList.add('reveal-ready');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04, rootMargin: '0px 0px 0px 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const form = document.querySelector('#booking-form');
  const status = document.querySelector('#form-status');
  if (form && status) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.classList.remove('is-error');
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const lines = [
        'SOLICITUD DE BOOKING — MONJES RUMBEROS',
        '----------------------------------------',
        `Nombre: ${values.get('name') || 'No indicado'}`,
        `Correo: ${values.get('email') || 'No indicado'}`,
        `Formato: ${values.get('eventType') || 'No indicado'}`,
        `Fecha aproximada: ${values.get('date') || 'Por definir'}`,
        '',
        'DETALLES',
        String(values.get('message') || '').trim(),
      ];
      const requestText = lines.join('\n');
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(requestText);
        } else {
          const helper = document.createElement('textarea');
          helper.value = requestText;
          helper.setAttribute('readonly', '');
          helper.style.position = 'fixed';
          helper.style.opacity = '0';
          document.body.appendChild(helper);
          helper.select();
          const copied = document.execCommand('copy');
          helper.remove();
          if (!copied) throw new Error('clipboard-unavailable');
        }
        status.textContent = 'Solicitud copiada. Ya puedes pegarla en tu canal habitual de contacto.';
        form.querySelector('button[type="submit"]').classList.add('is-copied');
      } catch (_error) {
        status.textContent = 'No se ha podido copiar automáticamente. Revisa los campos y vuelve a intentarlo desde un navegador con permisos de portapapeles.';
        status.classList.add('is-error');
      }
    });
  }

  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
