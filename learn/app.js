/* Prep Notebook — topics by level, lessons as slides, runnable code, revision list. */
(function () {
  'use strict';
  const COURSES = window.COURSES || [];
  const KEY = 'prep-notebook.v2';
  const RUN_LIMIT_MS = 8000;
  const REVIEW_DAYS = [1, 3, 7, 14, 30, 60];
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------- state ----------------
  const state = load();
  function load() {
    const empty = { done: {}, seen: {}, slide: {}, revise: {}, solved: {}, code: {}, last: null, track: null };
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s === 'object') return { ...empty, ...s };
      const old = JSON.parse(localStorage.getItem('prep-notebook.v1')); // carry over solved exercises and code
      if (old && typeof old === 'object') return { ...empty, solved: old.solved || {}, code: migrateCode(old.code || {}) };
    } catch (e) {}
    return empty;
  }
  function migrateCode(c) { return c; }
  let saveTimer = null;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 120); }

  // ---------------- index ----------------
  const lessons = [];
  const byKey = {};
  const exByOldKey = {};
  COURSES.forEach((c) => c.modules.forEach((m) => {
    m.course = c; m.key = `${c.id}/${m.id}`;
    m.lessons.forEach((l, i) => {
      l.course = c; l.module = m; l.index = i; l.key = `${c.id}/${m.id}/${l.id}`;
      (l.exercises || []).forEach((e) => { e.key = `${c.id}/${e.oldModule || m.id}/${e.oldLesson || l.id}/${e.id}`; exByOldKey[e.key] = e; });
      lessons.push(l); byKey[l.key] = l;
    });
  }));
  const modByKey = Object.fromEntries(COURSES.flatMap((c) => c.modules.map((m) => [m.key, m])));
  const written = (ls) => ls.filter((l) => l.md);
  const levelOf = (m) => (m.course.levels || []).find((lv) => lv.id === m.level) || { id: m.level || '', color: 'blue' };
  const colorVar = (name) => `var(--${name || 'blue'})`;

  // ---------------- slides ----------------
  function splitSlides(md) {
    const out = []; let cur = []; let fence = false;
    for (const line of (md || '').split('\n')) {
      if (/^(```|~~~)/.test(line)) fence = !fence;
      if (!fence && /^## /.test(line) && cur.join('').trim()) { out.push(cur.join('\n')); cur = []; }
      cur.push(line);
    }
    if (cur.join('').trim()) out.push(cur.join('\n'));
    return out;
  }
  function slidesOf(l) {
    if (l._slides) return l._slides;
    const s = splitSlides(l.md).map((md) => ({ kind: 'text', md }));
    (l.exercises || []).forEach((e) => s.push({ kind: 'ex', ex: e }));
    s.push({ kind: 'finish' });
    return (l._slides = s);
  }

  // ---------------- status ----------------
  const isDone = (l) => !!state.done[l.key];
  function seenFrac(l) { const s = state.seen[l.key]; if (!s) return 0; return Math.min(1, (s + 1) / slidesOf(l).length); }
  function stats(ls) { const w = written(ls); const d = w.filter(isDone).length; return { total: w.length, done: d, pct: w.length ? Math.round((d / w.length) * 100) : 0 }; }
  function dueInfo(key) {
    const r = state.revise[key]; if (!r) return null;
    const days = REVIEW_DAYS[Math.min(r.n || 0, REVIEW_DAYS.length - 1)];
    const dueAt = (r.last || r.added) + days * 864e5;
    return { due: Date.now() >= dueAt, dueAt, days };
  }
  const dueCount = () => Object.keys(state.revise).filter((k) => byKey[k] && dueInfo(k).due).length;

  // ---------------- markdown + code ----------------
  marked.setOptions({ gfm: true, breaks: false });
  const MODES = { python: 'python', py: 'python', pyrun: 'python', js: 'javascript', javascript: 'javascript', jsrun: 'javascript', ts: 'text/typescript', typescript: 'text/typescript', tsx: 'text/typescript-jsx', jsx: 'text/jsx', sql: 'text/x-sql', sqlrun: 'text/x-sql', html: 'htmlmixed', htmlrun: 'htmlmixed', css: 'css', json: 'application/json', bash: null, sh: null, text: null, '': 'python' };
  function highlight(el, lang) {
    const mode = MODES[lang] !== undefined ? MODES[lang] : null;
    const src = el.textContent;
    if (!mode) return;
    el.textContent = '';
    try { CodeMirror.runMode(src, mode, el); } catch (e) { el.textContent = src; }
  }
  function md(text) {
    const div = document.createElement('div');
    div.innerHTML = marked.parse(text || '');
    div.querySelectorAll('pre > code').forEach((el) => {
      const lang = ((el.className || '').match(/language-(\S+)/) || [, ''])[1];
      const src = el.textContent.replace(/\n$/, '');
      highlight(el, lang);
      if (lang === 'pyrun' || lang === 'jsrun' || lang === 'sqlrun') makeRunnable(el.parentElement, src, { pyrun: 'python', jsrun: 'js', sqlrun: 'sql' }[lang]);
      if (lang === 'htmlrun') makePreview(el.parentElement, src);
    });
    div.querySelectorAll('a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
    return div;
  }

  // ---------------- runners ----------------
  let pyWorker = null, pyReady = null, seq = 0; const pending = new Map();
  function startPy() {
    pyWorker = new Worker('runner-worker.js');
    pyReady = new Promise((resolve, reject) => {
      pyWorker.onmessage = (ev) => {
        const d = ev.data;
        if (d.type === 'ready') resolve();
        else if (d.type === 'loadError') reject(new Error(d.message));
        else if (d.type === 'result' && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
      };
      pyWorker.onerror = (e) => reject(new Error(e.message || 'Python failed to load'));
    });
    pyReady.catch(() => {});
  }
  function runPython(code, opts = {}) {
    if (!pyWorker) startPy();
    const id = ++seq;
    return new Promise((resolve, reject) => {
      pyReady.then(() => {
        const timer = setTimeout(() => { pending.delete(id); pyWorker.terminate(); pyWorker = null; resolve({ timeout: true, tests: [], stdout: '' }); }, RUN_LIMIT_MS);
        pending.set(id, (r) => { clearTimeout(timer); if (r.fatal) { pyWorker.terminate(); pyWorker = null; } resolve(r); });
        pyWorker.postMessage({ id, code, tests: opts.tests || [], stdin: opts.stdin || '', mode: opts.mode || 'run' });
      }, (err) => { pyWorker = null; reject(err); });
    });
  }
  function runJS(code) {
    return new Promise((resolve) => {
      const w = new Worker('js-worker.js');
      const t = setTimeout(() => { w.terminate(); resolve({ timeout: true, out: '' }); }, 4000);
      w.onmessage = (ev) => { clearTimeout(t); w.terminate(); resolve(ev.data); };
      w.onerror = (e) => { clearTimeout(t); w.terminate(); resolve({ out: '', error: e.message }); e.preventDefault(); };
      w.postMessage({ code });
    });
  }
  function runSQL(code) {
    return new Promise((resolve) => {
      const w = new Worker('sql-worker.js');
      const t = setTimeout(() => { w.terminate(); resolve({ results: [], error: 'Stopped after 5 seconds.' }); }, 5000);
      w.onmessage = (ev) => { clearTimeout(t); w.terminate(); resolve(ev.data); };
      w.onerror = (e) => { clearTimeout(t); w.terminate(); resolve({ results: [], error: e.message }); e.preventDefault(); };
      w.postMessage({ code });
    });
  }
  function sqlTable(r) {
    if (r.error) return `<div class="err-line">✖ ${esc(r.sql.split('\n')[0].slice(0, 70))}<br>&nbsp;&nbsp;${esc(r.error)}</div>`;
    if (!r.columns) return /^(BEGIN|COMMIT|ROLLBACK|CREATE|DROP|ALTER|SAVEPOINT|RELEASE)/i.test(r.sql) ? `<div class="muted">${esc(r.sql.split('\n')[0].slice(0, 60))} ✓</div>` : `<div class="muted">${esc(r.sql.split('\n')[0].slice(0, 60))} → ${r.changes} row${r.changes === 1 ? '' : 's'} changed</div>`;
    const cell = (v) => (v === null ? '<i class="muted">NULL</i>' : esc(v));
    return `<div class="sql-res"><table><thead><tr>${r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.rows.map((row) => `<tr>${row.map((v) => `<td>${cell(v)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${r.columns.length}" class="muted">no rows</td></tr>`}</tbody></table><div class="muted">${r.rows.length} row${r.rows.length === 1 ? '' : 's'}</div></div>`;
  }
  const STACK_MSG = 'Recursion went deeper than Python in the browser allows. Functions wrapped in @cache can nest about 450 calls here (plain functions go much deeper, and LeetCode allows more).';
  const loadMsg = (err) => `Python could not load: ${err.message}. It downloads from cdn.jsdelivr.net the first time, so check your connection or any blocker, then try again.`;

  function makeRunnable(pre, src, lang) {
    const wrap = document.createElement('div'); wrap.className = 'runnable';
    pre.replaceWith(wrap); wrap.appendChild(pre);
    const bar = document.createElement('div'); bar.className = 'run-bar';
    const run = document.createElement('button'); run.className = 'btn small'; run.textContent = '▶ Run';
    bar.appendChild(run);
    let stepBtn = null;
    if (lang === 'python') { stepBtn = document.createElement('button'); stepBtn.className = 'btn small yellow'; stepBtn.textContent = 'Step through'; bar.appendChild(stepBtn); }
    const tag = document.createElement('span'); tag.className = 'lang'; tag.textContent = { python: 'python', js: 'javascript', sql: 'sqlite · shop database' }[lang]; bar.appendChild(tag);
    wrap.appendChild(bar);
    const out = document.createElement('div'); out.className = 'run-out'; out.hidden = true; wrap.appendChild(out);
    let viz = null;
    run.onclick = async () => {
      run.disabled = true; run.textContent = lang === 'python' && !pyWorker ? 'Loading Python…' : 'Running…';
      out.hidden = false; out.className = 'run-out'; out.textContent = '';
      try {
        if (lang === 'python') {
          const r = await runPython(src);
          const text = (r.stdout || '') + (r.timeout ? '\nStopped after 8 seconds.' : '') + (r.error ? (r.stdout ? '\n' : '') + (r.fatal && /call stack/i.test(r.error) ? STACK_MSG : r.error) : '');
          out.innerHTML = `<span class="ok-label">${r.error || r.timeout ? 'Output and error' : 'Output'}</span>`;
          out.appendChild(document.createTextNode(text || '(no output)'));
          if (r.error || r.timeout) out.classList.add('err');
        } else if (lang === 'sql') {
          const r = await runSQL(src);
          out.innerHTML = `<span class="ok-label">${r.error ? 'Result and error' : 'Result'}</span>` + r.results.map(sqlTable).join('') + (r.error ? `<div class="err-line">✖ ${esc(r.error)}</div>` : '');
          if (r.error && !r.results.length) out.classList.add('err');
        } else {
          const r = await runJS(src);
          out.innerHTML = `<span class="ok-label">${r.error || r.timeout ? 'Console and error' : 'Console'}</span>`;
          out.appendChild(document.createTextNode((r.out || '') + (r.timeout ? '\nStopped after 4 seconds.' : '') + (r.error ? (r.out ? '\n' : '') + '✖ ' + r.error : '') || '(nothing logged)'));
          if (r.error || r.timeout) out.classList.add('err');
        }
      } catch (err) { out.classList.add('err'); out.textContent = loadMsg(err); }
      run.disabled = false; run.textContent = '▶ Run';
    };
    if (stepBtn) stepBtn.onclick = async () => {
      if (viz) { viz.remove(); viz = null; stepBtn.textContent = 'Step through'; return; }
      stepBtn.disabled = true; stepBtn.textContent = pyWorker ? 'Tracing…' : 'Loading Python…';
      try {
        const r = await runPython(src, { mode: 'trace' });
        viz = buildViz(src, r); wrap.appendChild(viz); stepBtn.textContent = 'Close steps';
      } catch (err) { out.hidden = false; out.className = 'run-out err'; out.textContent = loadMsg(err); stepBtn.textContent = 'Step through'; }
      stepBtn.disabled = false;
    };
  }

  // ---------------- live HTML/CSS preview ----------------
  function makePreview(pre, src) {
    const wrap = document.createElement('div'); wrap.className = 'runnable';
    pre.replaceWith(wrap); wrap.appendChild(pre);
    const bar = document.createElement('div'); bar.className = 'run-bar';
    bar.innerHTML = '<button class="btn small ghost" data-edit>Edit</button><button class="btn small" data-apply hidden>▶ Update preview</button><span class="lang">html + css · live preview</span>';
    wrap.appendChild(bar);
    const frame = document.createElement('iframe');
    frame.className = 'preview'; frame.setAttribute('sandbox', 'allow-scripts allow-modals allow-forms'); frame.title = 'Preview';
    const doc = (code) => `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:15px/1.5 system-ui,sans-serif;margin:12px;color:#1b2033;background:#fff}</style>${code}`;
    frame.srcdoc = doc(src);
    wrap.appendChild(frame);
    let ta = null;
    bar.addEventListener('click', (e) => {
      if (e.target.closest('[data-edit]')) {
        if (ta) return;
        ta = document.createElement('textarea'); ta.className = 'preview-edit'; ta.value = src; ta.spellcheck = false;
        ta.rows = Math.min(18, src.split('\n').length + 1);
        pre.replaceWith(ta); $('[data-apply]', bar).hidden = false; e.target.hidden = true; ta.focus();
      }
      if (e.target.closest('[data-apply]') && ta) frame.srcdoc = doc(ta.value);
    });
  }

  // ---------------- step-through visualizer ----------------
  function renderVal(v, aliases, name) {
    if (!v) return '';
    if (v.t === 'p') return `<span class="val">${esc(v.v)}</span>`;
    let alias = '';
    if (v.id != null && aliases) { const first = aliases.get(v.id); if (first && first !== name) alias = ` <span class="muted">← same object as <code>${esc(first)}</code></span>`; else if (!first) aliases.set(v.id, name); }
    if (v.t === 'list' || v.t === 'tuple') {
      if (!v.v.length) return `<span class="val">${v.t === 'list' ? '[]' : '()'}</span>${alias}`;
      const nested = v.v.some((x) => x.t !== 'p');
      if (nested) return `<span class="val">${v.t === 'list' ? '[' : '('}</span><div style="padding-left:12px">${v.v.map((x, i) => `<div><span class="muted">${i}:</span> ${renderVal(x)}</div>`).join('')}</div><span class="val">${v.t === 'list' ? ']' : ')'}</span>${alias}`;
      return `<span class="cells">${v.v.map((x, i) => `<span class="cell"><b>${esc(x.v)}</b><i>${i}</i></span>`).join('')}</span>${v.t === 'tuple' ? ' <span class="muted">tuple</span>' : ''}${alias}`;
    }
    if (v.t === 'set') return `<span class="val">{${v.v.map((x) => esc(x.v)).join(', ')}}</span> <span class="muted">set</span>${alias}`;
    if (v.t === 'dict') {
      if (!v.v.length) return `<span class="val">{}</span>${alias}`;
      return `<span class="kv">${v.v.map(([k, x]) => `<b>${esc(k.v)}</b><span>${x.t === 'p' ? esc(x.v) : renderVal(x)}</span>`).join('')}</span>${alias}`;
    }
    return '';
  }
  function buildViz(src, r) {
    const box = document.createElement('div'); box.className = 'viz';
    const steps = r.steps || [];
    const lines = src.split('\n');
    if (!steps.length) { box.innerHTML = `<div class="viz-state" style="grid-column:1/-1">${esc(r.error || 'Nothing to step through.')}</div>`; return box; }
    box.innerHTML = `<div class="viz-code">${lines.map((t, i) => `<div data-l="${i + 1}"><span>${i + 1}</span><span>${esc(t) || ' '}</span></div>`).join('')}</div>
      <div class="viz-state"></div>
      <div class="viz-ctrl">
        <button class="btn small ghost" data-a="first" aria-label="First step">⏮</button>
        <button class="btn small ghost" data-a="prev" aria-label="Previous step">◀</button>
        <button class="btn small" data-a="next" aria-label="Next step">▶ Next</button>
        <button class="btn small ghost" data-a="play">Play</button>
        <input type="range" min="0" max="${steps.length - 1}" value="0" aria-label="Step">
        <span class="step-n"></span>
      </div>
      <div class="viz-out"></div>`;
    const stateEl = $('.viz-state', box), range = $('input', box), stepN = $('.step-n', box), outEl = $('.viz-out', box);
    let i = 0, timer = null;
    function prevVals(k) { const m = new Map(); if (k < 0) return m; steps[k].frames.forEach((f, fi) => f.vars.forEach(([n, v]) => m.set(fi + ':' + n, JSON.stringify(v)))); return m; }
    function show(k) {
      i = Math.max(0, Math.min(steps.length - 1, k));
      const s = steps[i];
      box.querySelectorAll('.viz-code div').forEach((d) => { d.className = +d.dataset.l === s.line ? 'cur' : (i > 0 && +d.dataset.l === steps[i - 1].line ? 'prev' : ''); });
      const before = prevVals(i - 1); const aliases = new Map();
      stateEl.innerHTML = `<h4>${s.event === 'return' ? 'Returning from' : 'About to run line ' + s.line}</h4>` + s.frames.map((f, fi) => `
        <div class="frame"><div class="frame-name">${esc(f.name)}</div>${f.vars.length ? f.vars.map(([n, v]) => `<div class="var ${before.size && before.get(fi + ':' + n) !== JSON.stringify(v) ? 'changed' : ''}"><code>${esc(n)}</code><div>${renderVal(v, aliases, n)}</div></div>`).join('') : '<span class="muted">no variables yet</span>'}
        ${fi === s.frames.length - 1 && s.ret ? `<div class="var changed"><code>return</code><div>${renderVal(s.ret)}</div></div>` : ''}</div>`).join('');
      stepN.textContent = `step ${i + 1} / ${steps.length}`;
      range.value = i;
      outEl.textContent = r.stdout.slice(0, s.out) + (i === steps.length - 1 && r.error ? '\n✖ ' + r.error : '');
      const cur = $('.viz-code .cur', box); if (cur) cur.scrollIntoView({ block: 'nearest' });
    }
    function stop() { clearInterval(timer); timer = null; $('[data-a=play]', box).textContent = 'Play'; }
    box.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const act = a.dataset.a;
      if (act === 'play') { if (timer) return stop(); a.textContent = 'Pause'; timer = setInterval(() => { if (i >= steps.length - 1) stop(); else show(i + 1); }, 650); return; }
      stop();
      if (act === 'first') show(0); if (act === 'prev') show(i - 1); if (act === 'next') show(i + 1);
    });
    range.addEventListener('input', () => { stop(); show(+range.value); });
    show(0);
    return box;
  }

  // ---------------- routing ----------------
  const view = $('#view');
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    document.querySelectorAll('.top-nav a[data-nav]').forEach((a) => a.classList.remove('active'));
    updatePill();
    if (parts[0] === 'revise') { $('[data-nav=revise]').classList.add('active'); return renderRevise(); }
    if (parts[0] === 't' && modByKey[`${parts[1]}/${parts[2]}`]) {
      const m = modByKey[`${parts[1]}/${parts[2]}`];
      const l = written(m.lessons).find((x) => !isDone(x)) || written(m.lessons)[0] || m.lessons[0];
      return go(`#/${l.key}`, true);
    }
    const l = byKey[parts.slice(0, 3).join('/')];
    if (l) return renderTopic(l, parts[3] != null ? +parts[3] : null);
    $('[data-nav=home]').classList.add('active');
    renderHome();
  }
  function go(hash, replace) { if (replace) { history.replaceState(null, '', hash); route(); } else location.hash = hash; }
  function updatePill() { const n = dueCount(); const p = $('#reviseCount'); p.hidden = !n; p.textContent = n; }

  // ---------------- home ----------------
  function renderHome() {
    document.title = 'Prep Notebook';
    const track = COURSES.find((c) => c.id === state.track) || COURSES[0];
    const last = state.last && byKey[state.last];
    const all = lessons;
    const dueKeys = Object.keys(state.revise).filter((k) => byKey[k] && dueInfo(k).due);
    let h = `<section class="hero">
      <h1>Learn <span class="py">${track.id === 'python' ? 'Python' : 'interviews'}</span>,<br>one slide at a time.</h1>
      <p>${esc(track.heroText || track.blurb || '')}</p>
      <div class="hero-actions">
        ${last ? `<a class="btn" href="#/${last.key}">Continue: ${esc(last.title)}</a>` : `<a class="btn" href="#/t/${track.modules[0].key}">Start with ${esc(track.modules[0].title)}</a>`}
        <div class="tabs" role="tablist" aria-label="Track">${COURSES.map((c) => `<button role="tab" data-track="${c.id}" aria-selected="${c === track}">${esc(c.short || c.title)}</button>`).join('')}</div>
      </div></section>`;
    const st = stats(track.modules.flatMap((m) => m.lessons));
    h += `<section class="panel progress-panel" aria-label="Your progress"><div class="big-num">${st.pct}%<small>${st.done} of ${st.total} lessons complete</small></div><div class="level-bars">`;
    (track.levels || []).forEach((lv) => {
      const s = stats(track.modules.filter((m) => m.level === lv.id).flatMap((m) => m.lessons));
      h += `<div class="lb"><span>${esc(lv.id)}</span><div class="bar" style="--c:${colorVar(lv.color)}"><i style="width:${s.pct}%"></i></div><span class="n">${s.done}/${s.total}</span></div>`;
    });
    h += '</div></section>';
    if (dueKeys.length) {
      h += `<div class="section-h" style="--c:var(--pink)"><h2>Due for revision</h2><p>${dueKeys.length} lesson${dueKeys.length > 1 ? 's' : ''}</p><a class="pct" href="#/revise">See all</a></div><div class="strip">`;
      dueKeys.slice(0, 8).forEach((k) => { const l = byKey[k]; h += `<a class="strip-card" href="#/${k}"><small>${esc(l.module.icon || '')} ${esc(l.module.title)}</small><b>${esc(l.title)}</b></a>`; });
      h += '</div>';
    }
    (track.levels || []).forEach((lv) => {
      const mods = track.modules.filter((m) => m.level === lv.id);
      if (!mods.length) return;
      const s = stats(mods.flatMap((m) => m.lessons));
      h += `<div class="section-h" style="--c:${colorVar(lv.color)}"><h2>${esc(lv.id)}</h2><p>${esc(lv.blurb || '')}</p><span class="pct">${s.pct}%</span></div><div class="cards">`;
      mods.forEach((m) => {
        const ms = stats(m.lessons); const w = written(m.lessons).length;
        h += `<a class="card ${ms.total && ms.done === ms.total ? 'done' : ''}" href="#/t/${m.key}" style="--c:${colorVar(lv.color)}">
          <span class="badge">${esc(lv.id)}</span><span class="ic" aria-hidden="true">${m.icon || '📘'}</span>
          <h3>${esc(m.title)}</h3><p>${esc(m.tagline || '')}</p>
          <div class="meta"><span>${w ? `${m.lessons.length} lessons` : 'Coming soon'}</span><span>${ms.total && ms.done === ms.total ? '<span class="check">✓ Complete</span>' : `${ms.done}/${ms.total || m.lessons.length}`}</span></div>
          <div class="bar"><i style="width:${ms.pct}%"></i></div></a>`;
      });
      h += '</div>';
    });
    view.innerHTML = h;
    view.querySelectorAll('[data-track]').forEach((b) => b.addEventListener('click', () => { state.track = b.dataset.track; save(); renderHome(); }));
    window.scrollTo(0, 0);
  }

  // ---------------- topic + slide player ----------------
  let keyHandler = null;
  function renderTopic(l, slideIdx, keep) {
    const m = l.module; const lv = levelOf(m);
    if (!l.md) { // not written yet
      view.innerHTML = `<a class="back" href="#/">← All topics</a><div class="empty"><div class="big">🛠️</div><h2>${esc(l.title)}</h2><p>This lesson hasn't been written yet.</p></div>`;
      return;
    }
    const slides = slidesOf(l);
    let i = slideIdx != null && !isNaN(slideIdx) ? slideIdx : (state.slide[l.key] || 0);
    i = Math.max(0, Math.min(slides.length - 1, i));
    state.last = l.key; state.slide[l.key] = i; state.seen[l.key] = Math.max(state.seen[l.key] || 0, i); save();
    document.title = `${l.title} · ${m.title}`;
    const ms = stats(m.lessons);
    const samePage = view.dataset.topic === m.key;
    if (!samePage) {
      view.dataset.topic = m.key;
      view.innerHTML = `<a class="back" href="#/">← All topics</a>
        <div class="topic-head" style="--c:${colorVar(lv.color)}"><span class="ic" aria-hidden="true">${m.icon || '📘'}</span>
          <div><h1>${esc(m.title)}</h1><div class="sub"><span class="tag">${esc(lv.id)}</span><span id="modProg"></span></div></div></div>
        <div class="topic-layout"><nav class="lesson-list" aria-label="Lessons in this topic"></nav><section class="player" aria-live="polite"></section></div>
        <p class="kbd-hint">← → to move between slides</p>`;
      window.scrollTo(0, 0);
    }
    $('#modProg').textContent = `${ms.done} of ${ms.total} lessons complete`;
    const list = $('.lesson-list');
    list.innerHTML = m.lessons.map((x) => {
      if (!x.md) return `<a aria-disabled="true" style="opacity:.5"><span class="st"></span><span>${x.stars ? `<span class="stars">${'★'.repeat(x.stars)}</span> ` : ''}${esc(x.title)}</span><span></span></a>`;
      const cls = isDone(x) ? 'done' : (state.seen[x.key] != null ? 'seen' : '');
      return `<a href="#/${x.key}" class="${x === l ? 'current' : ''}" ${x === l ? 'aria-current="page"' : ''}><span class="st ${cls}" style="--p:${Math.round(seenFrac(x) * 100)}%">${isDone(x) ? '✓' : ''}</span><span>${x.stars ? `<span class="stars">${'★'.repeat(x.stars)}</span> ` : ''}${esc(x.title)}</span>${state.revise[x.key] ? '<span class="flag" title="Marked for revision">↻</span>' : '<span></span>'}</a>`;
    }).join('');
    const cur = $('.current', list); if (cur && !samePage) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    const player = $('.player');
    const s = slides[i];
    // keep the current slide (editor, output, open visualizer) when only the chrome changes
    const kept = keep && player.dataset.at === `${l.key}#${i}` ? $('.slide', player) : null;
    player.dataset.at = `${l.key}#${i}`;
    player.innerHTML = `<div class="player-top"><h2>${esc(l.title)}</h2><div class="dots" role="tablist" aria-label="Slides">${slides.map((x, k) => {
      const cls = [k === i ? 'on' : '', k <= (state.seen[l.key] || 0) ? 'seen' : '', x.kind === 'ex' ? 'ex' : '', x.kind === 'ex' && state.solved[x.ex.key] ? 'solved' : ''].join(' ');
      return `<button class="${cls}" data-k="${k}" aria-label="Slide ${k + 1}${x.kind === 'ex' ? ' (practice)' : ''}" ${k === i ? 'aria-current="step"' : ''}></button>`;
    }).join('')}</div></div><div class="slide" style="--dir:${(renderTopic.lastI ?? i) > i ? '-12px' : '12px'}"></div>
      <div class="player-bot">
        <button class="btn ghost" data-act="prev" ${i === 0 ? 'disabled' : ''}>← Previous</button>
        <span class="grow"></span>
        <button class="btn ghost ${state.revise[l.key] ? 'on-revise' : ''}" data-act="revise" aria-pressed="${!!state.revise[l.key]}">↻ ${state.revise[l.key] ? 'In revision' : 'Revise later'}</button>
        <button class="btn ghost ${isDone(l) ? 'on-done' : ''}" data-act="done" aria-pressed="${isDone(l)}">${isDone(l) ? '✓ Completed' : '○ Mark complete'}</button>
        <span class="grow"></span>
        ${i < slides.length - 1 ? `<button class="btn" data-act="next">Next →</button>` : nextLessonBtn(l)}
      </div>`;
    renderTopic.lastI = i;
    let slideEl = $('.slide', player);
    if (kept) { slideEl.replaceWith(kept); slideEl = null; }
    if (!slideEl) { /* kept slide reused */ }
    else if (s.kind === 'text') { const d = md(s.md); d.className = 'prose'; slideEl.appendChild(d); }
    else if (s.kind === 'ex') slideEl.appendChild(renderExercise(s.ex, l));
    else slideEl.appendChild(renderFinish(l));

    player.onclick = (e) => {
      const dot = e.target.closest('[data-k]'); if (dot) return go(`#/${l.key}/${dot.dataset.k}`);
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'prev') go(`#/${l.key}/${i - 1}`);
      if (act === 'next') go(`#/${l.key}/${i + 1}`);
      if (act === 'done' || act === 'finish-done') { state.done[l.key] ? delete state.done[l.key] : (state.done[l.key] = Date.now()); save(); renderTopic(l, i, act === 'done'); }
      if (act === 'revise') { toggleRevise(l.key); renderTopic(l, i, !b.closest('.finish')); }
      if (act === 'nextlesson') { const n = nextLesson(l); if (!isDone(l)) { state.done[l.key] = Date.now(); save(); } go(n ? `#/${n.key}/0` : '#/'); }
    };
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = (e) => {
      if (e.target.closest('input, textarea, .CodeMirror, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight' && i < slides.length - 1) { e.preventDefault(); go(`#/${l.key}/${i + 1}`); }
      if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); go(`#/${l.key}/${i - 1}`); }
    };
    document.addEventListener('keydown', keyHandler);
    if (samePage) player.scrollIntoView({ block: 'nearest' });
  }
  function nextLesson(l) {
    const all = written(lessons.filter((x) => x.course === l.course));
    return all[all.indexOf(l) + 1] || null;
  }
  function nextLessonBtn(l) { const n = nextLesson(l); return `<button class="btn" data-act="nextlesson">${n ? (n.module === l.module ? 'Next lesson →' : 'Next topic →') : 'Finish →'}</button>`; }
  function toggleRevise(key) {
    if (state.revise[key]) delete state.revise[key]; else state.revise[key] = { added: Date.now(), last: Date.now(), n: 0 };
    save(); updatePill();
  }
  function renderFinish(l) {
    const d = document.createElement('div'); d.className = 'finish';
    const ex = l.exercises || []; const solved = ex.filter((e) => state.solved[e.key]).length;
    const n = nextLesson(l);
    d.innerHTML = `<div class="big">${isDone(l) ? '🎉' : '🏁'}</div><h2>${isDone(l) ? 'Lesson complete' : 'End of the lesson'}</h2>
      <p>${ex.length ? `You solved ${solved} of ${ex.length} practice problem${ex.length > 1 ? 's' : ''}. ` : ''}${n ? `Up next: <b>${esc(n.title)}</b>${n.module !== l.module ? ` in ${esc(n.module.title)}` : ''}.` : 'That was the last lesson in this track.'}</p>
      <div class="row">${isDone(l) ? '' : '<button class="btn ghost" data-act="finish-done">○ Mark complete</button>'}
      <button class="btn ghost ${state.revise[l.key] ? 'on-revise' : ''}" data-act="revise">↻ ${state.revise[l.key] ? 'In revision' : 'Add to revision'}</button></div>`;
    return d;
  }

  // ---------------- exercises ----------------
  function renderExercise(e, l) {
    const box = document.createElement('div');
    box.innerHTML = `<div class="slide-kicker">Practice</div><h2 class="ex-title">${esc(e.title)} ${state.solved[e.key] ? '<span class="solved-tag">Solved</span>' : ''}</h2>`;
    const prompt = md(e.prompt); prompt.className = 'prose'; box.appendChild(prompt);
    const wrap = document.createElement('div'); wrap.className = 'editor-wrap'; box.appendChild(wrap);
    const cm = CodeMirror(wrap, {
      value: state.code[e.key] ?? e.starter ?? '', mode: 'python', lineNumbers: true, indentUnit: 4, tabSize: 4, matchBrackets: true, viewportMargin: Infinity,
      extraKeys: { Tab: (c) => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ', 'end')), 'Shift-Tab': (c) => c.indentSelection('subtract'), 'Ctrl-Enter': () => run(), 'Cmd-Enter': () => run() },
    });
    cm.on('change', () => { state.code[e.key] = cm.getValue(); save(); });
    requestAnimationFrame(() => cm.refresh());
    const bar = document.createElement('div'); bar.className = 'ex-bar';
    bar.innerHTML = `<button class="btn" data-x="run">▶ Run tests</button><button class="btn yellow" data-x="step">Step through</button><button class="btn ghost" data-x="reset">Reset</button><span class="squares" aria-hidden="true">${e.tests.map(() => '<span class="sq"></span>').join('')}</span><span class="ex-count">${e.tests.length} tests · Ctrl/⌘ + Enter</span>`;
    wrap.appendChild(bar);
    const out = document.createElement('div'); out.className = 'out'; out.setAttribute('role', 'status'); box.appendChild(out);
    const extra = document.createElement('div'); extra.className = 'ex-extra';
    if (e.hints && e.hints.length) { const d = document.createElement('details'); d.innerHTML = `<summary>💡 Hint${e.hints.length > 1 ? 's' : ''}</summary>` + e.hints.map((h) => md(h).innerHTML).join(''); extra.appendChild(d); }
    if (e.solution) { const d = document.createElement('details'); d.innerHTML = '<summary>👀 Reference solution</summary>'; const pre = document.createElement('pre'); const c = document.createElement('code'); c.textContent = e.solution; highlight(c, 'python'); pre.appendChild(c); d.appendChild(pre); extra.appendChild(d); }
    box.appendChild(extra);
    const runBtn = $('[data-x=run]', bar), stepBtn = $('[data-x=step]', bar), squares = $('.squares', bar);
    let viz = null;
    bar.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === 'run') run();
      if (b.dataset.x === 'reset' && confirm('Replace your code with the starter code?')) { cm.setValue(e.starter || ''); delete state.code[e.key]; save(); }
      if (b.dataset.x === 'step') {
        if (viz) { viz.remove(); viz = null; stepBtn.textContent = 'Step through'; return; }
        stepBtn.disabled = true; stepBtn.textContent = pyWorker ? 'Tracing…' : 'Loading Python…';
        // trace the code plus the first test, so there is something to watch
        const t0 = e.tests[0] ? e.tests[0].code : '';
        const call = /^assert\s+(.+?)\s+==\s+/.exec(t0);
        const code = cm.getValue() + '\n' + (call && !t0.includes(';') ? `print(${call[1]})` : '');
        try { const r = await runPython(code, { mode: 'trace', stdin: e.stdin }); viz = buildViz(code, r); wrap.appendChild(viz); stepBtn.textContent = 'Close steps'; }
        catch (err) { out.innerHTML = `<pre class="err">${esc(loadMsg(err))}</pre>`; stepBtn.textContent = 'Step through'; }
        stepBtn.disabled = false;
      }
    });
    async function run() {
      runBtn.disabled = true; runBtn.textContent = pyWorker ? 'Running…' : 'Loading Python…';
      squares.classList.add('running'); squares.querySelectorAll('.sq').forEach((q) => (q.className = 'sq')); out.innerHTML = '';
      try {
        const r = await runPython(cm.getValue(), { tests: e.tests, stdin: e.stdin });
        squares.classList.remove('running');
        let html = '';
        if (r.timeout) html += `<pre class="err">Stopped after ${RUN_LIMIT_MS / 1000} seconds. Look for a loop that never ends or recursion with no base case.</pre>`;
        if (r.stdout) html += `<pre>${esc(r.stdout.length > 4000 ? r.stdout.slice(0, 4000) + '\n… output cut at 4000 characters' : r.stdout)}</pre>`;
        if (r.error) html += `<pre class="err">${esc(r.fatal && /call stack/i.test(r.error) ? STACK_MSG : r.error)}</pre>`;
        const sqs = squares.querySelectorAll('.sq');
        if (r.tests.length) {
          html += '<ul class="results">' + r.tests.map((t, k) => { sqs[k] && (sqs[k].className = 'sq ' + (t.ok ? 'ok' : 'bad')); return `<li><span class="sq ${t.ok ? 'ok' : 'bad'}"></span><span><code>${esc(t.label)}</code>${t.ok ? '' : `<span class="why">${esc(t.msg)}</span>`}</span></li>`; }).join('') + '</ul>';
        } else if (r.error || r.timeout) sqs.forEach((q) => (q.className = 'sq bad'));
        const passed = r.tests.length === e.tests.length && r.tests.every((t) => t.ok) && !r.error && !r.timeout;
        if (!r.error && !r.timeout) html += `<div class="verdict ${passed ? 'ok' : ''}">${passed ? '🎉 All tests pass.' : `${r.tests.filter((t) => t.ok).length} of ${e.tests.length} tests pass.`}</div>`;
        out.innerHTML = html;
        if (passed && !state.solved[e.key]) {
          state.solved[e.key] = true; save();
          const t = $('.ex-title', box); if (t && !$('.solved-tag', t)) t.insertAdjacentHTML('beforeend', ' <span class="solved-tag">Solved</span>');
          renderTopic(l, state.slide[l.key], true);
        }
      } catch (err) { squares.classList.remove('running'); out.innerHTML = `<pre class="err">${esc(loadMsg(err))}</pre>`; }
      runBtn.disabled = false; runBtn.textContent = '▶ Run tests';
    }
    return box;
  }

  // ---------------- revise page ----------------
  function renderRevise() {
    document.title = 'Revise · Prep Notebook'; delete view.dataset.topic;
    const keys = Object.keys(state.revise).filter((k) => byKey[k]).sort((a, b) => dueInfo(a).dueAt - dueInfo(b).dueAt);
    let h = `<div class="page-h"><h1>Revise</h1><p>Lessons you marked for another look. Each time you revise one, the next reminder moves further out: 1, 3, 7, 14, 30, then 60 days.</p></div>`;
    if (!keys.length) h += `<div class="empty"><div class="big">↻</div><p>Nothing here yet. Press <b>Revise later</b> on any lesson to add it.</p></div>`;
    else {
      h += '<div class="rev-list">';
      keys.forEach((k) => {
        const l = byKey[k]; const d = dueInfo(k); const r = state.revise[k];
        const when = d.due ? '<span class="due">Due now</span>' : `Next in ${Math.ceil((d.dueAt - Date.now()) / 864e5)} day(s)`;
        h += `<div class="rev"><span class="ic">${l.module.icon || '📘'}</span><div><a href="#/${k}/0">${esc(l.title)}</a><small>${esc(l.module.title)} · revised ${r.n || 0}× · ${when}</small></div>
          <div class="rev-actions"><button class="btn small" data-rev="${esc(k)}">✓ Revised today</button><button class="btn small ghost" data-unrev="${esc(k)}">Remove</button></div></div>`;
      });
      h += '</div>';
    }
    view.innerHTML = h;
    view.querySelectorAll('[data-rev]').forEach((b) => b.addEventListener('click', () => { const r = state.revise[b.dataset.rev]; r.n = (r.n || 0) + 1; r.last = Date.now(); save(); route(); }));
    view.querySelectorAll('[data-unrev]').forEach((b) => b.addEventListener('click', () => { delete state.revise[b.dataset.unrev]; save(); route(); }));
    window.scrollTo(0, 0);
  }

  // ---------------- search ----------------
  const sDlg = $('#searchDlg'), sIn = $('#searchInput'), sRes = $('#searchResults');
  function openSearch() { sIn.value = ''; sRes.innerHTML = ''; sDlg.showModal(); sIn.focus(); }
  $('#searchBtn').onclick = openSearch;
  sIn.addEventListener('input', () => {
    const q = sIn.value.trim().toLowerCase();
    if (q.length < 2) { sRes.innerHTML = ''; return; }
    const hits = lessons.filter((l) => l.md).map((l) => {
      const t = l.title.toLowerCase(); const body = (l.md || '').toLowerCase();
      const score = (t.includes(q) ? 10 : 0) + (l.module.title.toLowerCase().includes(q) ? 4 : 0) + (body.includes(q) ? 1 : 0);
      return { l, score };
    }).filter((x) => x.score).sort((a, b) => b.score - a.score).slice(0, 30);
    sRes.innerHTML = hits.length ? hits.map(({ l }) => `<li><a href="#/${l.key}/0">${esc(l.title)}<small>${esc(l.module.icon || '')} ${esc(l.module.title)} · ${esc(l.course.short || l.course.title)}</small></a></li>`).join('') : '<li class="muted" style="padding:10px">No lessons match.</li>';
  });
  sIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = $('a', sRes); if (a) { location.hash = a.getAttribute('href'); sDlg.close(); } } });
  sRes.addEventListener('click', (e) => { if (e.target.closest('a')) sDlg.close(); });
  sDlg.addEventListener('click', (e) => { if (e.target === sDlg) sDlg.close(); });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !e.target.closest('input, textarea, .CodeMirror')) { e.preventDefault(); openSearch(); } });

  // ---------------- theme + backup ----------------
  $('#themeBtn').onclick = () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next; try { localStorage.setItem('prep-notebook.theme', next); } catch (e) {}
  };
  const bDlg = $('#backupDlg'), bTxt = $('#backupText'), bMsg = $('#backupMsg');
  $('#backupBtn').onclick = () => { bTxt.value = JSON.stringify(state); bMsg.textContent = ''; bDlg.showModal(); };
  $('#restoreBtn').onclick = () => {
    try { const s = JSON.parse(bTxt.value); if (!s || typeof s !== 'object' || !('solved' in s)) throw 0; Object.keys(state).forEach((k) => delete state[k]); Object.assign(state, load(), s); save(); bMsg.textContent = 'Restored.'; route(); }
    catch (e) { bMsg.textContent = 'That text is not a Prep Notebook backup. Paste the whole JSON you saved.'; }
  };
  $('#downloadBtn').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); a.download = `prep-notebook-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); };

  window.addEventListener('hashchange', route);
  route();
})();
