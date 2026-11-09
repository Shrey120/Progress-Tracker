/* Cloud sync for Prep Notebook (tracker, note pages and the Learn site).
   Progress stays in this browser's localStorage as before; when you're signed in, each saved copy is
   also kept in your Supabase account (table public.prep_sync, readable only by you), so a new laptop
   or browser gets everything back after signing in.
   - Every few seconds it checks whether this browser's copy changed and uploads it.
   - On load, on returning to the tab, and every minute it checks the cloud for a newer copy.
   - If both changed, it asks which to keep; the other one is saved to prep_sync_history first.
   No library: plain fetch calls to Supabase Auth and PostgREST. */
(function () {
  'use strict';
  const SUPABASE_URL = 'https://dcdnwpcvvgyklcqdndmt.supabase.co';
  const API_KEY = 'sb_publishable_8J1XnsN-m6V4msuimMCyiw_arfBPiaJ';   // public by design; data is protected by row-level security
  const KEYS = { tracker: 'prep-tracker-v3', learn: 'prep-notebook.v2' };
  const SESSION = 'prep-sync-session', META = 'prep-sync-meta';
  const here = location.pathname.includes('/learn/') ? 'learn' : 'tracker';   // which copy this page shows

  // ---------- small helpers ----------
  const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const json = (k, d) => { try { return JSON.parse(read(k)) || d; } catch (e) { return d; } };
  const hash = (s) => { if (s == null) return ''; let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + s.length; };
  const device = (() => {
    const ua = navigator.userAgent;
    const b = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : '';
    return os ? `${b} on ${os}` : b;
  })();
  const ago = (iso) => {
    if (!iso) return 'never';
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago'; return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- session ----------
  let session = json(SESSION, null);
  const saveSession = (s) => { session = s; if (s) write(SESSION, JSON.stringify(s)); else { try { localStorage.removeItem(SESSION); } catch (e) {} } };
  async function auth(path, body, token) {
    const r = await fetch(SUPABASE_URL + '/auth/v1/' + path, {
      method: 'POST', headers: { apikey: API_KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body || {}),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.msg || data.error_description || data.message || ('Sign-in failed (' + r.status + ')'));
    return data;
  }
  const fromToken = (d) => ({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000, user_id: d.user.id, email: d.user.email });
  async function token() {
    session = json(SESSION, null);                  // another tab may have refreshed it
    if (!session) return null;
    if (Date.now() < session.expires_at - 60000) return session.access_token;
    try { saveSession(fromToken(await auth('token?grant_type=refresh_token', { refresh_token: session.refresh_token }))); return session.access_token; }
    catch (e) { if (navigator.onLine) { saveSession(null); setStatus('signedout', 'Your sign-in expired. Sign in again to keep syncing.'); } throw e; }
  }
  async function rest(path, opts) {
    const t = await token();
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      ...opts, headers: { apikey: API_KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', ...((opts && opts.headers) || {}) },
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || ('Sync failed (' + r.status + ')')); }
    const text = await r.text();                    // return=minimal answers 201 with an empty body
    return text ? JSON.parse(text) : null;
  }

  // ---------- what counts as real progress (so an empty new browser never overwrites the cloud) ----------
  function meaningful(key, str) {
    try {
      const d = JSON.parse(str);
      if (key === 'tracker') return (d.modules || []).some((m) => m.custom || (m.items || []).some((i) => (i.status && i.status !== 'backlog') || i.note || i.media || i.rev || i.link));
      return ['done', 'solved', 'code', 'seen'].some((k) => d[k] && Object.keys(d[k]).length);
    } catch (e) { return false; }
  }

  // ---------- sync ----------
  let meta = json(META, {});
  const saveMeta = () => write(META, JSON.stringify(meta));
  let status = session ? 'idle' : 'signedout', statusMsg = '', busy = false, asking = false, lastSync = null;

  async function upload(key, str) {
    const rows = await rest('prep_sync?on_conflict=user_id,key', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify([{ user_id: session.user_id, key, data: str, device }]),
    });
    const row = rows && rows[0];
    meta[key] = { syncedAt: row ? row.updated_at : new Date().toISOString(), hash: hash(str) }; saveMeta();
    lastSync = new Date().toISOString();
  }
  const keepCopy = (key, str, dev, reason) => rest('prep_sync_history', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{ user_id: session.user_id, key, data: str, device: dev || device, reason }]),
  });
  function adopt(key, row) {
    const before = read(KEYS[key]);
    if (!write(KEYS[key], row.data)) { setStatus('error', "This browser's storage is full, so the cloud copy couldn't be loaded."); return false; }
    meta[key] = { syncedAt: row.updated_at, hash: hash(row.data) }; saveMeta();
    lastSync = new Date().toISOString();
    return key === here && before !== row.data;      // the page showing this copy needs a reload
  }

  async function syncNow(opts) {
    session = json(SESSION, null); meta = json(META, {});   // shared with other open tabs
    if (!session || busy || asking) { if (!session) setStatus('signedout'); return; }
    busy = true; setStatus('syncing');
    let reload = false;
    try {
      const rows = await rest('prep_sync?select=key,data,device,updated_at', { method: 'GET' });
      const remote = Object.fromEntries((rows || []).map((r) => [r.key, r]));
      for (const key of Object.keys(KEYS)) {
        const local = read(KEYS[key]);
        const m = meta[key] || {};
        const r = remote[key];
        const localChanged = local != null && hash(local) !== m.hash;
        if (!r) { if (local != null && meaningful(key, local)) await upload(key, local); continue; }
        if (local === r.data) { meta[key] = { syncedAt: r.updated_at, hash: hash(local) }; saveMeta(); continue; }
        const remoteChanged = r.updated_at !== m.syncedAt;
        if (!m.syncedAt) {                                   // first sync in this browser
          if (local == null || !meaningful(key, local)) reload = adopt(key, r) || reload;
          else if (!meaningful(key, r.data)) await upload(key, local);
          else { busy = false; reload = (await resolve(key, local, r)) || reload; busy = true; }
        } else if (remoteChanged && !localChanged) reload = adopt(key, r) || reload;
        else if (localChanged && !remoteChanged) await upload(key, local);
        else if (localChanged && remoteChanged) { busy = false; reload = (await resolve(key, local, r)) || reload; busy = true; }
      }
      lastSync = new Date().toISOString();
      setStatus('ok');
    } catch (e) {
      if (session) setStatus(navigator.onLine ? 'error' : 'offline', navigator.onLine ? e.message : "You're offline. Changes are saved in this browser and will sync when you're back.");
    } finally { busy = false; }
    if (reload && !(opts && opts.noReload)) { sessionStorage.setItem('prep-sync-reloaded', '1'); location.reload(); }
  }

  // only uploads; runs every few seconds and costs nothing when nothing changed
  async function pushIfChanged() {
    session = json(SESSION, null); meta = json(META, {});
    if (!session || busy || asking) return;
    const dirty = Object.keys(KEYS).filter((k) => { const v = read(KEYS[k]); return v != null && meta[k] && meta[k].syncedAt && hash(v) !== meta[k].hash; });
    if (!dirty.length) return;
    busy = true; setStatus('syncing');
    try {
      const rows = await rest('prep_sync?select=key,updated_at', { method: 'GET' });
      const remote = Object.fromEntries((rows || []).map((r) => [r.key, r]));
      let needFull = false;
      for (const k of dirty) {
        if (remote[k] && remote[k].updated_at !== meta[k].syncedAt) { needFull = true; continue; }   // another device saved meanwhile
        await upload(k, read(KEYS[k]));
      }
      setStatus('ok');
      busy = false;
      if (needFull) await syncNow();
    } catch (e) {
      setStatus(navigator.onLine ? 'error' : 'offline', navigator.onLine ? e.message : "You're offline. Changes are saved in this browser and will sync when you're back.");
    } finally { busy = false; }
  }

  // ---------- conflict: changed here and elsewhere ----------
  function resolve(key, local, row) {
    asking = true;
    const name = key === 'tracker' ? 'tracker progress and notes' : 'Learn-site progress';
    return new Promise((done) => {
      const box = modal(`
        <h3>Which copy should we keep?</h3>
        <p>Your ${esc(name)} changed in this browser and also on another device (${esc(row.device || 'another browser')}, ${esc(ago(row.updated_at))}).</p>
        <p class="ps-small">The copy you don't keep is saved in your account's history, so it can still be recovered.</p>
        <div class="ps-actions">
          <button class="ps-btn solid" data-keep="cloud">Keep the cloud copy</button>
          <button class="ps-btn" data-keep="local">Keep this browser's copy</button>
        </div>`, false);
      box.addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-keep]'); if (!b) return;
        box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        try {
          if (b.dataset.keep === 'cloud') { await keepCopy(key, local, device, 'replaced on this device'); asking = false; closeModal(); done(adopt(key, row)); }
          else { await keepCopy(key, row.data, row.device, 'replaced by another device'); await upload(key, local); asking = false; closeModal(); done(false); }
        } catch (e) { asking = false; closeModal(); setStatus('error', e.message); done(false); }
      });
    });
  }

  // ---------- UI: a button in the top bar and a small dialog ----------
  const css = `
    .ps-chip{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg-2);color:var(--text-2);font:600 13.5px var(--sans, system-ui);cursor:pointer;white-space:nowrap}
    .ps-chip:hover{border-color:var(--line-2);color:var(--text)}
    .ps-dot{width:8px;height:8px;border-radius:50%;background:var(--text-3);flex:none}
    .ps-chip[data-s=ok] .ps-dot{background:var(--green)} .ps-chip[data-s=syncing] .ps-dot{background:var(--blue);animation:ps-pulse 1s infinite}
    .ps-chip[data-s=error] .ps-dot,.ps-chip[data-s=offline] .ps-dot{background:var(--red)} .ps-chip[data-s=signedout] .ps-dot{background:var(--yellow)}
    @keyframes ps-pulse{50%{opacity:.3}}
    .ps-scrim{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px;background:color-mix(in srgb,var(--bg) 70%,transparent);backdrop-filter:blur(3px)}
    .ps-modal{width:100%;max-width:440px;background:var(--bg-2);color:var(--text);border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:var(--shadow);font:15px/1.55 var(--sans, system-ui)}
    .ps-modal h3{margin:0 0 8px;font:700 21px var(--display, system-ui)}
    .ps-modal p{margin:0 0 12px;color:var(--text-2)} .ps-small{font-size:13px;color:var(--text-3)!important}
    .ps-modal label{display:grid;gap:5px;font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:12px}
    .ps-modal input{font:inherit;color:var(--text);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
    .ps-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
    .ps-btn{font:700 14px var(--sans, system-ui);padding:9px 16px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);cursor:pointer}
    .ps-btn.solid{background:var(--blue);border-color:var(--blue);color:#fff} .ps-btn:disabled{opacity:.6;cursor:default}
    .ps-btn.link{border:none;background:none;color:var(--text-2);text-decoration:underline;padding:9px 4px}
    .ps-err{color:var(--red)!important;font-size:13.5px} .ps-rows{display:grid;gap:4px;margin:4px 0 14px;font-size:13.5px;color:var(--text-2)}
    @media (max-width:620px){.ps-chip .ps-label{display:none}.ps-chip{padding:0 11px}}`;
  let chip = null;
  function mount() {
    if (!document.getElementById('ps-style')) { const st = document.createElement('style'); st.id = 'ps-style'; st.textContent = css; document.head.appendChild(st); }
    const slot = document.getElementById('sync-slot');
    if (!slot || slot.querySelector('.ps-chip')) return !!slot;
    chip = document.createElement('button'); chip.type = 'button'; chip.className = 'ps-chip';
    chip.addEventListener('click', openPanel);
    slot.appendChild(chip); render(); return true;
  }
  function render() {
    if (!chip || !chip.isConnected) { chip = null; mount(); if (!chip) return; }
    const label = { signedout: 'Sign in to sync', syncing: 'Syncing…', ok: 'Synced', idle: 'Synced', error: 'Sync problem', offline: 'Offline' }[status];
    chip.dataset.s = status;
    chip.innerHTML = `<span class="ps-dot"></span><span class="ps-label">${label}</span>`;
    chip.title = status === 'signedout' ? 'Sign in to keep your progress in your account' : (statusMsg || ('Last synced ' + ago(lastSync)));
    chip.setAttribute('aria-label', label + (statusMsg ? ': ' + statusMsg : ''));
  }
  function setStatus(s, msg) { status = s; statusMsg = msg || ''; render(); }

  let scrim = null;
  function modal(html, dismissable) {
    closeModal();
    scrim = document.createElement('div'); scrim.className = 'ps-scrim';
    scrim.innerHTML = `<div class="ps-modal" role="dialog" aria-modal="true">${html}</div>`;
    if (dismissable) {
      scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) closeModal(); });
      scrim.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    }
    document.body.appendChild(scrim);
    const f = scrim.querySelector('input, button.solid, button'); if (f) f.focus();
    return scrim.firstElementChild;
  }
  function closeModal() { if (scrim) { scrim.remove(); scrim = null; } }

  function openPanel() {
    if (!session) return openSignIn();
    const rows = Object.keys(KEYS).map((k) => `<div>${k === 'tracker' ? 'Tracker and notes' : 'Learn site'}: ${meta[k] && meta[k].syncedAt ? 'saved ' + esc(ago(meta[k].syncedAt)) : 'not saved yet'}</div>`).join('');
    const box = modal(`
      <h3>Synced to your account</h3>
      <p>Signed in as <b>${esc(session.email)}</b>. Your progress, notes and drawings are saved to your account and in this browser.</p>
      <div class="ps-rows">${rows}</div>
      ${statusMsg ? `<p class="ps-err">${esc(statusMsg)}</p>` : ''}
      <div class="ps-actions"><button class="ps-btn solid" data-a="sync">Sync now</button><button class="ps-btn" data-a="close">Close</button><button class="ps-btn link" data-a="out">Sign out</button></div>
      <p class="ps-small" style="margin-top:14px">On a new laptop or browser, open the site and sign in with the same email; everything comes back.</p>`, true);
    box.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'close') closeModal();
      if (a.dataset.a === 'sync') { closeModal(); await syncNow(); }
      if (a.dataset.a === 'out') {
        try { await auth('logout', {}, session.access_token); } catch (err) {}
        saveSession(null); meta = {}; saveMeta(); setStatus('signedout'); closeModal();
      }
    });
  }
  function openSignIn(mode) {
    const signup = mode === 'signup';
    const box = modal(`
      <h3>${signup ? 'Create an account' : 'Sign in to sync'}</h3>
      <p>${signup ? 'Use an email you will keep for years, like your personal Gmail.' : 'Keep your progress, notes and drawings in your account, so a new laptop or browser gets them back. Use the same email and password as your fitness site.'}</p>
      <form>
        <label>Email<input type="email" name="email" autocomplete="email" required></label>
        <label>Password<input type="password" name="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required></label>
        <p class="ps-err" hidden></p>
        <div class="ps-actions"><button class="ps-btn solid" type="submit">${signup ? 'Create account' : 'Sign in'}</button><button class="ps-btn" type="button" data-a="close">Cancel</button>
          <button class="ps-btn link" type="button" data-a="${signup ? 'signin' : 'signup'}">${signup ? 'I already have an account' : 'Create an account'}</button></div>
      </form>
      <p class="ps-small" style="margin-top:12px">Your progress stays in this browser too; signing in adds a copy in your account.</p>`, true);
    const err = box.querySelector('.ps-err');
    box.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'close') closeModal();
      if (a.dataset.a === 'signup') openSignIn('signup');
      if (a.dataset.a === 'signin') openSignIn('signin');
    });
    box.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target), email = String(f.get('email')).trim(), password = String(f.get('password'));
      const btn = box.querySelector('button[type=submit]'); btn.disabled = true; err.hidden = true;
      try {
        if (signup) {
          const d = await auth('signup', { email, password });
          if (!d.access_token) {
            box.innerHTML = `<h3>Check your email</h3><p>We sent a confirmation link to <b>${esc(email)}</b>. Click it (the page it opens may show an error; that's fine), then come back here and sign in.</p><div class="ps-actions"><button class="ps-btn solid" data-a="signin">Sign in</button></div>`;
            return;
          }
          saveSession(fromToken(d));
        } else saveSession(fromToken(await auth('token?grant_type=password', { email, password })));
        meta = {}; saveMeta();               // compare everything afresh against the account
        closeModal(); setStatus('idle'); await syncNow();
      } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
    });
  }

  // ---------- start ----------
  window.PrepSync = { syncNow, open: openPanel, get signedIn() { return !!session; } };
  const start = () => {
    if (!mount()) { const obs = new MutationObserver(() => { if (mount()) obs.disconnect(); }); obs.observe(document.body, { childList: true, subtree: true }); }
    new MutationObserver(() => { if (chip && !chip.isConnected) render(); }).observe(document.body, { childList: true, subtree: true });
    if (session) syncNow(sessionStorage.getItem('prep-sync-reloaded') ? { noReload: true } : null).then(() => sessionStorage.removeItem('prep-sync-reloaded'));
    setInterval(pushIfChanged, 4000);
    setInterval(() => { if (!document.hidden) syncNow(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
    window.addEventListener('online', () => syncNow());
    window.addEventListener('pagehide', () => { pushIfChanged(); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
