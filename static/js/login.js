(function () {
  'use strict';
  const api = window.PH_API;
  const $ = s => document.querySelector(s);
  let mode = 'login';
  let canRegister = true, firstRun = false;

  function showError(msg) {
    const box = $('#error');
    box.textContent = msg;
    box.hidden = !msg;
  }

  function setMode(m) {
    mode = m;
    const setup = m === 'setup';
    $('#title').textContent = setup ? 'Create account' : 'Log in';
    $('#lead').textContent = setup
      ? (firstRun ? 'First run. An account protects access to your projects. ' : 'A new account has its own, separate projects. ') +
        'The password is stored only as a hash, so nobody can read it from the database. You also get a guide project with instructions.'
      : 'Enter your details to open the project catalog.';
    $('#switchBox').hidden = !(canRegister && !firstRun);
    $('#switchText').textContent = setup ? 'Already have an account?' : 'No account yet?';
    $('#switchBtn').textContent = setup ? 'Log in' : 'Create account';
    showError('');
    $('#submit').textContent = setup ? 'Create account' : 'Log in';
    $('#confirmField').hidden = !setup;
    $('#pwHint').hidden = !setup;
    $('#password').autocomplete = setup ? 'new-password' : 'current-password';
    $('#confirm').required = setup;
    document.title = setup ? 'ProjectHub: account creation' : 'ProjectHub: log in';
  }

  async function init() {
    if (api.MOCK) { $('#demoNote').hidden = false; $('#demoBtn').hidden = false; }
    try {
      const st = await api.authStatus();
      if (st.authenticated) { location.replace('index.html'); return; }
      canRegister = st.registration !== 'closed';
      firstRun = !st.configured;
      setMode(st.configured ? 'login' : 'setup');
    } catch (err) {
      setMode('login');
      showError(err.message);
    }
    $('#username').focus();
  }

  $('#authForm').addEventListener('submit', async e => {
    e.preventDefault();
    showError('');
    const username = $('#username').value.trim();
    const password = $('#password').value;

    if (!username) { showError('Enter the username.'); $('#username').focus(); return; }
    if (!password) { showError('Enter the password.'); $('#password').focus(); return; }
    if (mode === 'setup') {
      if (password.length < 8) { showError('The password is too short. Use at least 8 characters.'); $('#password').focus(); return; }
      if (password !== $('#confirm').value) { showError('The passwords do not match. Enter them again.'); $('#confirm').focus(); return; }
    }

    const btn = $('#submit');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = mode === 'setup' ? 'Creating account…' : 'Logging in…';
    try {
      if (mode === 'setup') await api.register(username, password);
      else await api.login(username, password);
      location.href = 'index.html';
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = label;
      $('#password').select();
    }
  });

  $('#switchBtn').addEventListener('click', () => { setMode(mode === 'setup' ? 'login' : 'setup'); $('#username').focus(); });

  $('#demoBtn').addEventListener('click', async () => {
    await api.enterDemo();
    location.href = 'index.html';
  });

  init();
})();
