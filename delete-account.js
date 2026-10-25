// Hosted Account deletion on the website. Posts to the StegMS server's
// /hosted-account/delete (src/server/hostedWebsiteDeletion.js).
//
// Copied as-is into the site (no build step). It runs only on
// /delete-account/, whose Content-Security-Policy allows a connection to
// exactly the API origin given in data-api-origin and nothing else. Messages
// are written with textContent, never as HTML. The server makes every decision.
(() => {
  const form = document.getElementById('account-deletion');
  if (!form) return;

  const CONFIRMATION = 'DELETE';
  const apiOrigin = form.dataset.apiOrigin;
  const status = document.getElementById('deletion-status');
  const submit = form.querySelector('button[type="submit"]');
  const field = name => form.elements.namedItem(name);

  const show = (message, kind = 'error') => {
    status.textContent = message;
    status.dataset.kind = kind;
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const details = {
      username: field('username').value.trim(),
      password: field('password').value,
      confirmation: field('confirmation').value.trim(),
    };
    if (!details.username) return show('Enter your username.');
    if (!details.password) return show('Enter your password.');
    if (details.confirmation !== CONFIRMATION) return show(`Type ${CONFIRMATION} to confirm.`);

    submit.disabled = true;
    show('Deleting your account…', 'info');
    try {
      const response = await fetch(`${apiOrigin}/hosted-account/delete`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      let body = {};
      try {
        body = await response.json();
      } catch {
        // A non-JSON answer is reported below as unavailable.
      }

      if (response.ok && body.deleted) {
        form.reset();
        form.querySelectorAll('input, button').forEach(element => { element.disabled = true; });
        return show('Your account has been deleted, and its subscription cancelled.', 'info');
      }
      if (response.status === 429) {
        return show(typeof body.error === 'string' && body.error ? body.error : 'Too many attempts. Please wait and try again.');
      }
      show(typeof body.error === 'string' && body.error ? body.error : 'Account deletion is unavailable right now. Please try again later.');
    } catch {
      show('Could not reach StegMS. Check your connection and try again.');
    } finally {
      if (!form.querySelector('input:disabled')) submit.disabled = false;
    }
  });
})();
