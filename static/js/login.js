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
    $('#title').textContent = setup ? 'Utwórz konto' : 'Zaloguj się';
    $('#lead').textContent = setup
      ? (firstRun ? 'Pierwsze uruchomienie. Konto chroni dostęp do Twoich projektów. ' : 'Nowe konto ma własne, osobne projekty. ') +
        'Hasło jest zapisywane wyłącznie jako hash, więc nikt go nie odczyta z bazy. Dostaniesz też projekt-przewodnik z instrukcją.'
      : 'Wpisz dane, żeby otworzyć katalog projektów.';
    $('#switchBox').hidden = !(canRegister && !firstRun);
    $('#switchText').textContent = setup ? 'Masz już konto?' : 'Nie masz konta?';
    $('#switchBtn').textContent = setup ? 'Zaloguj się' : 'Utwórz konto';
    showError('');
    $('#submit').textContent = setup ? 'Utwórz konto' : 'Zaloguj';
    $('#confirmField').hidden = !setup;
    $('#pwHint').hidden = !setup;
    $('#password').autocomplete = setup ? 'new-password' : 'current-password';
    $('#confirm').required = setup;
    document.title = setup ? 'ProjectHub: tworzenie konta' : 'ProjectHub: logowanie';
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

    if (!username) { showError('Wpisz login.'); $('#username').focus(); return; }
    if (!password) { showError('Wpisz hasło.'); $('#password').focus(); return; }
    if (mode === 'setup') {
      if (password.length < 8) { showError('Hasło jest za krótkie. Użyj co najmniej 8 znaków.'); $('#password').focus(); return; }
      if (password !== $('#confirm').value) { showError('Hasła nie są takie same. Wpisz je jeszcze raz.'); $('#confirm').focus(); return; }
    }

    const btn = $('#submit');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = mode === 'setup' ? 'Tworzenie konta…' : 'Logowanie…';
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
