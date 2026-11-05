// Platform selector on /download. The page works without this script: every
// platform's cards are in the HTML and simply show stacked. This reveals the
// selector and shows one platform at a time.
(() => {
  const list = document.getElementById('platform-tabs');
  const panel = document.getElementById('platform-panel');
  if (!list || !panel) return;
  const tabs = [...list.querySelectorAll('[role="tab"][data-platform]')];
  if (!tabs.length) return;
  const targets = [...document.querySelectorAll('[data-platforms]')];

  // Android user agents also say "Linux", so Android is checked first. Anything
  // unrecognized starts on Windows, and the selector can change it.
  const detect = userAgent => {
    if (/android/i.test(userAgent)) return 'android';
    if (/linux|x11/i.test(userAgent) && !/cros/i.test(userAgent)) return 'linux';
    return 'windows';
  };

  const select = (platform, { focus = false } = {}) => {
    for (const tab of tabs) {
      const active = tab.dataset.platform === platform;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active) {
        panel.setAttribute('aria-labelledby', tab.id);
        if (focus) tab.focus();
      }
    }
    for (const target of targets) {
      target.hidden = !target.dataset.platforms.split(' ').includes(platform);
    }
  };

  list.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tab.dataset.platform);
  });
  list.addEventListener('keydown', event => {
    const current = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    const next = {
      ArrowRight: (current + 1) % tabs.length,
      ArrowLeft: (current - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(tabs[next].dataset.platform, { focus: true });
  });

  panel.setAttribute('role', 'tabpanel');
  list.hidden = false;
  select(detect(navigator.userAgent));
})();
