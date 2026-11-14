'use strict';
{
  const menu = document.getElementById('nav-toggle');
  const navigation = document.getElementById('mission-nav');
  const setMenu = open => menu.setAttribute('aria-expanded', String(open));
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) {
      if (menu.getAttribute('aria-expanded') === 'true') menu.focus();
      setMenu(false);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menu.focus();
    }
  });
  const links = Array.from(navigation.querySelectorAll('a'));
  function highlight() {
    links.forEach(link => {
      if (link.hash === location.hash) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange',highlight);
  highlight();

  for (const button of document.querySelectorAll('[data-fullscreen]')) {
    const section = document.getElementById(button.dataset.fullscreen);
    if (!document.fullscreenEnabled || !section.requestFullscreen) continue;
    button.hidden = false;
    button.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement === section) await document.exitFullscreen();
        else await section.requestFullscreen();
      } catch {
        button.textContent = 'Fullscreen unavailable';
      }
    });
    document.addEventListener('fullscreenchange', () => {
      button.textContent = document.fullscreenElement === section ? 'Exit fullscreen' : 'Fullscreen';
    });
  }
}

{
  const panel = byId('aster-chat');
  const launcher = byId('aster-launch');
  let opener = launcher;
  function closeAster(restoreFocus = true) {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded','false');
    if (restoreFocus) opener.focus();
  }
  document.querySelectorAll('[data-open-aster]').forEach(button => {
    button.addEventListener('click', () => {
      opener = button;
      panel.hidden = false;
      launcher.setAttribute('aria-expanded','true');
      byId('nav-toggle').setAttribute('aria-expanded','false');
      byId('question').focus({preventScroll:true});
    });
  });
  byId('aster-close').addEventListener('click', () => closeAster());
  panel.addEventListener('click', event => {
    if (event.target.closest('#aster-mission,[data-aster-close]')) {
      const target = byId(event.target.closest('a').hash.slice(1));
      closeAster(false);
      target.tabIndex = -1;
      target.focus({preventScroll:true});
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) closeAster();
  });
}
