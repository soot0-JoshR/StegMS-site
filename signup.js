// Hosted Account sign-up on the website. Posts to the StegMS server's
// /hosted-account/signup-checkout and continues to Stripe checkout. A taken
// username with that account's password subscribes the existing account.
//
// Copied as-is into the site (no build step). It runs only on /hosted/signup/,
// whose Content-Security-Policy allows a connection to exactly the API origin
// given in data-api-origin and nothing else. Messages are written with
// textContent, never as HTML. The checks here mirror the server's rules so
// people get answers before a round trip; the server enforces them regardless.
(() => {
  const form = document.getElementById('hosted-signup');
  if (!form) return;

  const MAX_USERNAME = 64;
  const MIN_PASSWORD = 12;
  const apiOrigin = form.dataset.apiOrigin;
  const status = document.getElementById('signup-status');
  const submit = form.querySelector('button[type="submit"]');
  const field = name => form.elements.namedItem(name);

  const show = (message, kind = 'error') => {
    status.textContent = message;
    status.dataset.kind = kind;
  };

  const problem = ({ username, password, confirmPassword, termsAccepted }) => {
    if (!username) return 'Choose a username.';
    if (username !== username.trim()) return 'Usernames cannot start or end with a space.';
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f-\u009f]/.test(username)) return 'Usernames cannot contain control characters.';
    if (username.length > MAX_USERNAME) return `Usernames can be at most ${MAX_USERNAME} characters.`;
    // Same rule as the server (src/auth/usernamePolicy.js); the server decides.
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(username)) {
      return 'Usernames can use only the letters a–z, digits, and . _ - (starting with a letter or digit).';
    }
    if ([...password].length < MIN_PASSWORD) return `Your password must be at least ${MIN_PASSWORD} characters long.`;
    if (!/\d/.test(password)) return 'Your password needs at least one number.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!termsAccepted) return 'Confirm you are 18 or older and accept the Terms and Privacy Policy to continue.';
    return null;
  };

  // The checkout address comes from our server; still, only follow an https one.
  const safeCheckoutUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch {
      return null;
    }
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const details = {
      username: field('username').value,
      password: field('password').value,
      confirmPassword: field('confirmPassword').value,
      termsAccepted: field('termsAccepted').checked,
    };
    const local = problem(details);
    if (local) return show(local);

    submit.disabled = true;
    show('Continuing to checkout…', 'info');
    try {
      const response = await fetch(`${apiOrigin}/hosted-account/signup-checkout`, {
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

      // 201: a new account; 200: an existing account, after its password
      // was checked (the username was taken).
      if (response.status === 201 || response.status === 200) {
        const created = response.status === 201;
        const url = safeCheckoutUrl(body.url);
        if (!url) {
          return show(created
            ? 'Your account was created, but checkout could not be opened. Sign in to the StegMS app to finish.'
            : 'Checkout could not be opened. Please try again later.');
        }
        show(created ? 'Account created. Taking you to checkout…' : 'Taking you to checkout…', 'info');
        window.location.assign(url);
        return;
      }
      if (body.accountCreated) {
        return show('Your account was created, but checkout could not be started. Sign in to the StegMS app to finish.');
      }
      if (response.status === 429 && body.code !== 'PASSWORD_THROTTLED') {
        return show('Too many sign-up attempts. Please wait a few minutes and try again.');
      }
      show(typeof body.error === 'string' && body.error ? body.error : 'Sign-up is unavailable right now. Please try again later.');
    } catch {
      show('Could not reach StegMS. Check your connection and try again.');
    } finally {
      submit.disabled = false;
    }
  });
})();
