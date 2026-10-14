/* Prep Notebook — lesson viewer, Python runner and per-browser progress. */
(function () {
  'use strict';
  const COURSES = window.COURSES || [];
  const KEY = 'prep-notebook.v1';
  const RUN_LIMIT_MS = 8000;

  // ---------- progress (localStorage, never trusted to exist) ----------
  const state = load();
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') return { read: {}, solved: {}, code: {}, ...s }; } catch (e) {}
    return { read: {}, solved: {}, code: {}, last: null };
  }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 150);
  }

  // ---------- indexing ----------
  const flat = []; // every lesson in reading order, per course
  COURSES.forEach((c) => c.modules.forEach((m) => m.lessons.forEach((l) => {
    l.key = `${c.id}/${m.id}/${l.id}`; l.course = c; l.module = m;
    (l.exercises || []).forEach((e) => { e.key = `${l.key}/${e.id}`; });
    flat.push(l);
  })));
  const byKey = Object.fromEntries(flat.map((l) => [l.key, l]));

  function lessonStatus(l) {
    if (!l.md) return 'locked';
    const ex = l.exercises || [];
    const solved = ex.filter((e) => state.solved[e.key]).length;
    // a lesson with exercises is done when every exercise passes; a reading-only lesson when marked read
    if (ex.length ? solved === ex.length : state.read[l.key]) return 'done';
    if (solved > 0 || state.read[l.key]) return 'partial';
    return 'todo';
  }
  function countDone(lessons) { return lessons.filter((l) => lessonStatus(l) === 'done').length; }
  function available(lessons) { return lessons.filter((l) => l.md); }

  // ---------- markdown ----------
  marked.setOptions({ gfm: true, breaks: false });
  function md(text) {
    const div = document.createElement('div');
    div.innerHTML = marked.parse(text || '');
    div.querySelectorAll('pre code').forEach((el) => {
      const cls = el.className || '';
      if (/language-(python|py)\b/.test(cls) || cls === '') {
        const src = el.textContent; el.textContent = '';
        try { CodeMirror.runMode(src, 'python', el); } catch (e) { el.textContent = src; }
      }
    });
    div.querySelectorAll('a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
    return div;
  }
  const stars = (l) => (l.stars ? `<span class="stars" title="Priority ${l.stars} of 3">${'★'.repeat(l.stars)}</span> ` : '');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Python runner (worker, restartable) ----------
  let worker = null, workerReady = null, seq = 0;
  const pending = new Map();
  function startWorker() {
    worker = new Worker('runner-worker.js');
    workerReady = new Promise((resolve, reject) => {
      worker.onmessage = (ev) => {
        const d = ev.data;
        if (d.type === 'ready') resolve();
        else if (d.type === 'loadError') reject(new Error(d.message));
        else if (d.type === 'result' && pending.has(d.id)) { pending.get(d.id).resolve(d); pending.delete(d.id); }
      };
      worker.onerror = (e) => reject(new Error(e.message || 'Python failed to load'));
    });
    workerReady.catch(() => {});
  }
  function runPython(code, tests, stdin) {
    if (!worker) startWorker();
    const id = ++seq;
    return new Promise((resolve, reject) => {
      let timer = null;
      workerReady.then(() => {
        pending.set(id, { resolve: (r) => {
          clearTimeout(timer);
          if (r.fatal) { worker.terminate(); worker = null; } // next run starts a fresh interpreter
          resolve(r);
        } });
        timer = setTimeout(() => {
          pending.delete(id);
          worker.terminate(); worker = null; // a fresh interpreter for the next run
          resolve({ timeout: true, tests: [], stdout: '' });
        }, RUN_LIMIT_MS);
        worker.postMessage({ id, code, tests, stdin });
      }, (err) => { worker = null; reject(err); });
    });
  }

  // ---------- navigation ----------
  const nav = document.getElementById('nav');
  const view = document.getElementById('view');
  const openMods = new Set();

  function renderNav(filter) {
    const q = (filter || '').trim().toLowerCase();
    const current = location.hash.replace(/^#\//, '');
    nav.innerHTML = '';
    COURSES.forEach((c) => {
      const t = document.createElement('section'); t.className = 'track';
      const all = c.modules.flatMap((m) => m.lessons);
      const avail = available(all);
      t.innerHTML = `<div class="track-title">${esc(c.title)}<small>${avail.length ? `${countDone(avail)}/${avail.length}` : 'coming'}</small></div>`;
      let lastGroup = null;
      c.modules.forEach((m) => {
        const lessons = m.lessons.filter((l) => !q || l.title.toLowerCase().includes(q) || m.title.toLowerCase().includes(q) || (l.md || '').toLowerCase().includes(q));
        if (q && !lessons.length) return;
        if (m.group && m.group !== lastGroup) { lastGroup = m.group; const g = document.createElement('div'); g.className = 'group'; g.textContent = m.group; t.appendChild(g); }
        const mid = `${c.id}/${m.id}`;
        const isOpen = q || openMods.has(mid) || current.startsWith(mid + '/');
        const box = document.createElement('div'); box.className = 'mod' + (isOpen ? ' open' : '');
        const av = available(m.lessons);
        const label = m.title;
        box.innerHTML = `<button aria-expanded="${!!isOpen}"><span class="chev" aria-hidden="true">›</span><span>${esc(label)}</span><span class="count">${av.length ? `${countDone(av)}/${av.length}` : m.lessons.length}</span></button>`;
        const ul = document.createElement('ul');
        lessons.forEach((l) => {
          const li = document.createElement('li');
          const st = lessonStatus(l);
          if (st === 'locked') { li.innerHTML = `<span class="lock">${stars(l)}${esc(l.title)}</span>`; }
          else li.innerHTML = `<a href="#/${l.key}" class="${current === l.key ? 'current' : ''}"><span class="dot ${st}" aria-hidden="true"></span><span>${stars(l)}${esc(l.title)}</span></a>`;
          ul.appendChild(li);
        });
        box.appendChild(ul);
        box.firstChild.addEventListener('click', () => {
          if (openMods.has(mid)) openMods.delete(mid); else openMods.add(mid);
          box.classList.toggle('open'); box.firstChild.setAttribute('aria-expanded', box.classList.contains('open'));
        });
        t.appendChild(box);
      });
      nav.appendChild(t);
    });
  }

  function route() {
    const path = location.hash.replace(/^#\/?/, '');
    document.getElementById('sidebar').classList.remove('open');
    if (byKey[path] && byKey[path].md) { renderLesson(byKey[path]); state.last = path; save(); }
    else renderHome();
    renderNav(document.getElementById('search').value);
    window.scrollTo(0, 0);
  }

  // ---------- home ----------
  function renderHome() {
    document.title = 'Prep Notebook';
    document.getElementById('topTitle').textContent = 'Prep Notebook';
    const last = state.last && byKey[state.last];
    let html = `<div class="home"><h1>Learn it once, properly.</h1>
      <p class="lede">Python for DSA first, with code you run right here and tests that tell you when it works. The interview-prep topics from your tracker follow, in the same order of leverage.</p>`;
    if (last) html += `<a class="btn resume" href="#/${last.key}">Continue: ${esc(last.title)}</a>`;
    html += '<div class="tracks">';
    COURSES.forEach((c) => {
      const all = c.modules.flatMap((m) => m.lessons); const avail = available(all);
      const pct = avail.length ? Math.round((countDone(avail) / avail.length) * 100) : 0;
      html += `<section class="track-card"><h2>${esc(c.title)}<small>${avail.length ? `${countDone(avail)} of ${avail.length} lessons done` : `${all.length} topics planned`}</small></h2><p>${esc(c.blurb || '')}</p>`;
      if (avail.length) html += `<div class="bar" role="img" aria-label="${pct}% complete"><i style="width:${pct}%"></i></div>`;
      html += '<ul class="mod-list">';
      let lastGroup = null;
      c.modules.forEach((m) => {
        if (m.group && m.group !== lastGroup) { lastGroup = m.group; html += `</ul><h3 class="group-h">${esc(m.group)}</h3><ul class="mod-list">`; }
        const av = available(m.lessons); const first = av[0];
        const label = m.title;
        html += first
          ? `<li><a href="#/${first.key}">${esc(label)}</a><span class="count">${countDone(av)}/${av.length}</span></li>`
          : `<li class="soon">${esc(label)}<span class="count">${m.lessons.length}</span></li>`;
      });
      html += '</ul></section>';
    });
    html += '</div></div>';
    view.innerHTML = html;
  }

  // ---------- lesson ----------
  function renderLesson(l) {
    document.title = `${l.title} · Prep Notebook`;
    document.getElementById('topTitle').textContent = l.title;
    view.innerHTML = '';
    const head = document.createElement('div');
    head.innerHTML = `<div class="crumbs"><a href="#/">${esc(l.course.title)}</a> / ${esc(l.module.title)}</div><h1 class="lesson-title">${esc(l.title)}</h1>`;
    view.appendChild(head);
    const body = md(l.md); body.className = 'prose'; view.appendChild(body);

    const ex = l.exercises || [];
    if (ex.length) {
      const sec = document.createElement('section'); sec.className = 'exercises';
      sec.innerHTML = `<h2>Practice</h2><p>Write the code, then run the tests. Ctrl/⌘ + Enter runs from inside the editor.</p>`;
      ex.forEach((e) => sec.appendChild(renderExercise(e)));
      view.appendChild(sec);
    }

    const mr = document.createElement('div'); mr.className = 'mark-read';
    const btn = document.createElement('button'); btn.className = 'btn ghost';
    const setBtn = () => { btn.textContent = state.read[l.key] ? 'Marked as read' : 'Mark lesson as read'; btn.setAttribute('aria-pressed', !!state.read[l.key]); };
    setBtn();
    btn.onclick = () => { state.read[l.key] = !state.read[l.key]; if (!state.read[l.key]) delete state.read[l.key]; save(); setBtn(); renderNav(document.getElementById('search').value); };
    mr.appendChild(btn); view.appendChild(mr);

    const list = flat.filter((x) => x.course === l.course && x.md);
    const i = list.indexOf(l);
    const foot = document.createElement('nav'); foot.className = 'lesson-foot'; foot.setAttribute('aria-label', 'Lesson navigation');
    if (list[i - 1]) foot.innerHTML += `<a href="#/${list[i - 1].key}"><small>Previous</small><span>${esc(list[i - 1].title)}</span></a>`;
    if (list[i + 1]) foot.innerHTML += `<a class="next" href="#/${list[i + 1].key}"><small>Next</small><span>${esc(list[i + 1].title)}</span></a>`;
    view.appendChild(foot);
  }

  function renderExercise(e) {
    const box = document.createElement('article'); box.className = 'ex' + (state.solved[e.key] ? ' solved' : '');
    box.innerHTML = `<div class="ex-head"><h3>${esc(e.title)}</h3><span class="badge">${state.solved[e.key] ? 'Solved' : ''}</span></div>`;
    const prompt = md(e.prompt); prompt.className = 'ex-prompt prose'; box.appendChild(prompt);
    const wrap = document.createElement('div'); wrap.className = 'editor-wrap'; box.appendChild(wrap);
    const cm = CodeMirror(wrap, {
      value: state.code[e.key] ?? e.starter ?? '', mode: 'python', lineNumbers: true, indentUnit: 4, tabSize: 4,
      matchBrackets: true, viewportMargin: Infinity,
      extraKeys: {
        Tab: (c) => c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ', 'end'),
        'Shift-Tab': (c) => c.indentSelection('subtract'),
        'Ctrl-Enter': () => run(), 'Cmd-Enter': () => run(),
      },
    });
    cm.on('change', () => { state.code[e.key] = cm.getValue(); save(); });
    requestAnimationFrame(() => cm.refresh()); // measure once the box is attached to the page

    const bar = document.createElement('div'); bar.className = 'ex-bar';
    const runBtn = document.createElement('button'); runBtn.className = 'btn'; runBtn.textContent = 'Run tests';
    const resetBtn = document.createElement('button'); resetBtn.className = 'btn ghost'; resetBtn.textContent = 'Reset code';
    const strip = document.createElement('div'); strip.className = 'strip'; strip.setAttribute('aria-hidden', 'true');
    strip.innerHTML = e.tests.map(() => '<span class="sq"></span>').join('');
    const kbd = document.createElement('span'); kbd.className = 'kbd'; kbd.textContent = `${e.tests.length} test${e.tests.length === 1 ? '' : 's'}`;
    bar.append(runBtn, resetBtn, strip, kbd); box.appendChild(bar);
    const out = document.createElement('div'); out.className = 'out'; out.setAttribute('role', 'status'); box.appendChild(out);

    if (e.hints && e.hints.length) {
      const d = document.createElement('details'); d.className = 'hint';
      d.innerHTML = `<summary>Hint${e.hints.length > 1 ? 's' : ''}</summary>` + e.hints.map((h) => md(h).innerHTML).join('');
      box.appendChild(d);
    }
    if (e.solution) {
      const d = document.createElement('details'); d.className = 'sol';
      d.innerHTML = '<summary>Show a reference solution</summary>';
      const pre = document.createElement('pre'); const code = document.createElement('code');
      try { CodeMirror.runMode(e.solution, 'python', code); } catch (err) { code.textContent = e.solution; }
      pre.appendChild(code); d.appendChild(pre); box.appendChild(d);
    }

    resetBtn.onclick = () => { if (confirm('Replace your code with the starter code?')) { cm.setValue(e.starter || ''); delete state.code[e.key]; save(); } };

    async function run() {
      runBtn.disabled = true; runBtn.textContent = worker ? 'Running…' : 'Loading Python…';
      strip.classList.add('running'); strip.querySelectorAll('.sq').forEach((s) => (s.className = 'sq'));
      out.innerHTML = '';
      try {
        const r = await runPython(cm.getValue(), e.tests, e.stdin || '');
        strip.classList.remove('running');
        let html = '';
        if (r.timeout) html += `<pre class="err">Stopped after ${RUN_LIMIT_MS / 1000} seconds. Look for a loop that never ends or recursion that never reaches its base case.</pre>`;
        if (r.stdout) html += `<pre>${esc(r.stdout.length > 4000 ? r.stdout.slice(0, 4000) + '\n… output cut at 4000 characters' : r.stdout)}</pre>`;
        if (r.fatal && /call stack/i.test(r.error)) html += `<pre class="err">Recursion went deeper than Python in the browser allows. Functions wrapped in @cache or @lru_cache can nest about 450 calls here (plain functions go much deeper, and LeetCode allows more). Try a smaller input, or rewrite it bottom-up or with an explicit stack.</pre>`;
        else if (r.error) html += `<pre class="err">${esc(r.error)}</pre>`;
        const sqs = strip.querySelectorAll('.sq');
        if (r.tests.length) {
          html += '<ul class="results">' + r.tests.map((t, i) => {
            sqs[i] && (sqs[i].className = 'sq ' + (t.ok ? 'ok' : 'bad'));
            return `<li><span class="sq ${t.ok ? 'ok' : 'bad'}"></span><span><code>${esc(t.label)}</code>${t.ok ? '' : `<span class="why">${esc(t.msg)}</span>`}</span></li>`;
          }).join('') + '</ul>';
        } else if (r.error || r.timeout) sqs.forEach((s) => (s.className = 'sq bad'));
        const passed = r.tests.length === e.tests.length && r.tests.every((t) => t.ok) && !r.error && !r.timeout;
        const n = r.tests.filter((t) => t.ok).length;
        if (!r.error && !r.timeout) html += `<div class="verdict ${passed ? 'ok' : ''}">${passed ? 'All tests pass.' : `${n} of ${e.tests.length} tests pass.`}</div>`;
        out.innerHTML = html;
        if (passed && !state.solved[e.key]) {
          state.solved[e.key] = true; save();
          box.classList.add('solved'); box.querySelector('.badge').textContent = 'Solved';
          renderNav(document.getElementById('search').value);
        }
      } catch (err) {
        strip.classList.remove('running');
        out.innerHTML = `<pre class="err">Python could not load: ${esc(err.message)}. The runner downloads from cdn.jsdelivr.net on first use, so check your connection or any blocker, then run again.</pre>`;
      }
      runBtn.disabled = false; runBtn.textContent = 'Run tests';
    }
    runBtn.onclick = run;
    return box;
  }

  // ---------- chrome ----------
  document.getElementById('search').addEventListener('input', (ev) => renderNav(ev.target.value));
  document.getElementById('openNav').onclick = () => document.getElementById('sidebar').classList.add('open');
  document.getElementById('closeNav').onclick = () => document.getElementById('sidebar').classList.remove('open');

  const dlg = document.getElementById('backupDlg'); const txt = document.getElementById('backupText'); const msg = document.getElementById('backupMsg');
  document.getElementById('backupBtn').onclick = () => { txt.value = JSON.stringify(state); msg.textContent = ''; dlg.showModal(); };
  document.getElementById('restoreBtn').onclick = () => {
    try {
      const s = JSON.parse(txt.value);
      if (!s || typeof s !== 'object' || !s.solved) throw new Error('not a backup');
      Object.assign(state, { read: {}, solved: {}, code: {} }, s); save();
      msg.textContent = 'Restored.'; route();
    } catch (e) { msg.textContent = 'That text is not a Prep Notebook backup. Paste the whole JSON you saved.'; }
  };
  document.getElementById('downloadBtn').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    a.download = `prep-notebook-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };

  window.addEventListener('hashchange', route);
  route();
})();
