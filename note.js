/* The note for one tracker item, as a full page: read it, edit it, paste Excalidraw drawings and images.
   Opened from the tracker in a new tab as note.html?id=<item id>[&href=<built-in link>].
   It reads and writes the tracker's saved plan directly; the tracker tab picks up changes through
   the browser's 'storage' event. */
(function () {
  'use strict';
  const KEY = 'prep-tracker-v3';
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || '';
  const builtin = params.get('href') || '';
  const PATTERNS = window.PATTERNS || [];
  const page = document.getElementById('page');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const patternName = (pid) => (PATTERNS.find((p) => p.id === pid) || {}).name || '';
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (k === 'html') n.innerHTML = v; else n.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach((c) => { if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c)); });
    return n;
  };

  // ---------- the saved plan ----------
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  const find = (plan) => {
    for (const m of (plan && plan.modules) || []) {
      const it = (m.items || []).find((i) => i.id === id);
      if (it) return { m, it };
    }
    return null;
  };
  function persist(fields) {           // re-read first, so changes made in the tracker meanwhile are kept
    const plan = load(); const f = find(plan);
    if (!f) throw new Error('This item is no longer in your plan.');
    Object.keys(fields).forEach((k) => { if (fields[k] === undefined) delete f.it[k]; else f.it[k] = fields[k]; });
    localStorage.setItem(KEY, JSON.stringify(plan));
  }

  // ---------- Excalidraw drawings and images ----------
  let lib = null;
  function loadExcalidraw() {
    if (!lib) {
      window.EXCALIDRAW_ASSET_PATH = new URL('vendor/excalidraw/', location.href).href;
      lib = import(new URL('vendor/excalidraw/index.js', location.href).href).catch((err) => { lib = null; throw err; });
    }
    return lib;
  }
  const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches; };
  function parseExcalidraw(text) {
    if (!text || text.length < 20 || text.trimStart()[0] !== '{' || text.indexOf('excalidraw') < 0) return null;
    try {
      const j = JSON.parse(text);
      if (!j || (j.type !== 'excalidraw/clipboard' && j.type !== 'excalidraw') || !Array.isArray(j.elements)) return null;
      const elements = j.elements.filter((x) => x && !x.isDeleted);
      return elements.length ? { kind: 'excalidraw', elements, files: j.files || {} } : null;
    } catch (e) { return null; }
  }
  function imageToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        let q = 0.85, out = c.toDataURL('image/webp', q);
        while (out.length > 400000 && q > 0.4) { q -= 0.15; out = c.toDataURL('image/webp', q); }
        resolve(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not an image')); };
      img.src = url;
    });
  }
  function drawing(data) {
    const box = el('div', { class: 'drawing' }, el('div', { class: 'drawing-msg' }, 'Drawing it…'));
    loadExcalidraw()
      .then((m) => m.exportToSvg({ elements: data.elements, files: data.files || {}, exportPadding: 20,
        appState: { exportBackground: true, viewBackgroundColor: '#ffffff', exportWithDarkMode: isDark() } }))   // Excalidraw inverts the white for dark mode
      .then((svg) => { svg.style.maxWidth = '100%'; svg.style.height = 'auto'; svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Excalidraw drawing'); box.replaceChildren(svg); })
      .catch(() => box.replaceChildren(el('div', { class: 'drawing-msg' }, "Couldn't load the drawing viewer. Check your connection and reload the page.")));
    return box;
  }
  function copyForExcalidraw(m, btn) {
    const txt = JSON.stringify({ type: 'excalidraw/clipboard', elements: m.elements, files: m.files || {} });
    navigator.clipboard.writeText(txt).then(() => {
      btn.textContent = 'Copied. Paste it in Excalidraw';
      setTimeout(() => { btn.textContent = 'Copy for Excalidraw'; }, 2500);
    }, () => { btn.textContent = "Couldn't copy"; });
  }
  function mediaList(media, onRemove) {
    return el('div', { class: 'media-list' }, media.map((m, k) => {
      const copy = m.kind === 'excalidraw' && el('button', { class: 'nbtn', type: 'button', title: 'Copies the drawing so you can paste it back into Excalidraw and edit it' }, 'Copy for Excalidraw');
      if (copy) copy.addEventListener('click', () => copyForExcalidraw(m, copy));
      return el('figure', { class: 'media' },
        m.kind === 'excalidraw' ? drawing(m) : el('img', { src: m.src, alt: 'Pasted image', loading: 'lazy' }),
        el('figcaption', null, el('span', null, m.kind === 'excalidraw' ? 'Excalidraw drawing' : 'Image'), copy,
          onRemove && el('button', { class: 'nbtn danger', type: 'button', onclick: () => onRemove(k) }, 'Remove')));
    }));
  }

  // ---------- page ----------
  let editing = false, dirty = false;
  const hasNote = (it) => !!(it.note || (it.media && it.media.length));

  function header(m, it) {
    const title = it.title.replace(/^★+\s*/, '');
    document.title = `${title} · Note`;
    const link = it.link || builtin;
    const label = !link ? '' : link.includes('leetcode.com') ? 'Open on LeetCode' : link.startsWith('learn/') ? 'Open the lesson' : 'Open the link';
    return [
      el('a', { class: 'np-back', href: './' }, '← Back to the tracker'),
      el('div', { class: 'np-crumb' }, `${m.section} · ${m.name}`),
      el('h1', { class: 'np-title' }, title),
      { link, label },
    ];
  }

  function render() {
    const f = find(load());
    if (!f) {
      page.replaceChildren(el('a', { class: 'np-back', href: './' }, '← Back to the tracker'),
        el('div', { class: 'np-empty', style: 'margin-top:24px' }, el('p', null, "This note's problem isn't in your plan in this browser. Open the note from the tracker on the device where you made it.")));
      return;
    }
    editing ? renderEdit(f) : renderRead(f);
  }

  function renderRead({ m, it }) {
    const [back, crumb, h1, { link, label }] = header(m, it);
    const bar = el('div', { class: 'np-bar' },
      it.pattern && patternName(it.pattern) && el('span', { class: 'note-pat' }, patternName(it.pattern)),
      el('span', { class: 'grow' }),
      link && el('a', { class: 'btn ghost small', href: link, target: '_blank', rel: 'noopener' }, label),
      hasNote(it) && el('button', { class: 'btn small', type: 'button', onclick: () => { editing = true; render(); } }, 'Edit note'));
    const body = hasNote(it)
      ? [it.note && el('div', { class: 'note-body' }, it.note), it.media && it.media.length && mediaList(it.media)]
      : [el('div', { class: 'np-empty' }, el('p', null, 'No note yet. Write what you learned, or paste an Excalidraw drawing or an image.'),
          el('button', { class: 'btn', type: 'button', onclick: () => { editing = true; render(); } }, 'Write a note'))];
    let armed = false;
    const del = hasNote(it) && el('button', { class: 'nbtn danger', type: 'button' }, 'Delete note');
    if (del) del.addEventListener('click', () => {
      if (!armed) { armed = true; del.textContent = 'Click again to delete'; return; }
      persist({ note: undefined, media: undefined, pattern: undefined }); render();
    });
    page.replaceChildren(back, crumb, h1, bar, ...body.filter(Boolean), del ? el('div', { class: 'np-actions static' }, del) : '');
  }

  function renderEdit({ m, it }) {
    const [back, crumb, h1, { link, label }] = header(m, it);
    const isDsa = m.track === 'dsa';
    let media = (it.media || []).slice();
    const status = el('span', { class: 'np-saved', role: 'status' });
    const sel = isDsa && PATTERNS.length > 0 && el('select', { 'aria-label': 'Pattern' },
      el('option', { value: '' }, 'None picked'), PATTERNS.map((p) => el('option', { value: p.id, selected: p.id === it.pattern }, p.name)));
    const ta = el('textarea', { rows: 12, placeholder: isDsa ? "What gave the pattern away, and the trick that made it work.\nBrute force → the move → final complexity." : 'Key points, a definition, an example you want to remember' });
    ta.value = it.note || '';
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(260, ta.scrollHeight + 4) + 'px'; };
    const holder = el('div');
    const saveBtn = el('button', { class: 'btn', type: 'button' }, 'Save note');
    const refresh = () => {
      holder.replaceChildren(media.length ? mediaList(media, (k) => { media.splice(k, 1); dirty = true; refresh(); }) : '');
      saveBtn.disabled = !ta.value.trim() && !media.length && !hasNote(it);
    };
    const add = (x) => { media.push(x); dirty = true; status.textContent = x.kind === 'excalidraw' ? 'Drawing added.' : 'Image added.'; refresh(); holder.lastElementChild && holder.scrollIntoView({ block: 'end', behavior: 'smooth' }); };
    const addFile = (file) => imageToDataUrl(file).then((src) => add({ kind: 'image', src }), () => { status.textContent = "That file isn't an image this browser can read."; });
    const fileInput = el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (ev) => { const f = ev.target.files && ev.target.files[0]; if (f) addFile(f); ev.target.value = ''; } });
    ta.addEventListener('input', () => { dirty = true; grow(); refresh(); });
    if (sel) sel.addEventListener('change', () => { dirty = true; });
    const save = () => {
      if (saveBtn.disabled) return;
      const note = ta.value.trim(), md = media.length ? media : undefined;
      try {
        persist({ note: note || undefined, media: md, pattern: !(note || md) ? undefined : sel ? (sel.value || undefined) : it.pattern });
      } catch (err) {
        status.style.color = 'var(--red)';
        status.textContent = /quota/i.test(String(err && err.name)) || /quota/i.test(String(err))
          ? "Not saved: your browser's storage for this site is full. Remove some images (drawings take far less space)."
          : String(err.message || err);
        return;
      }
      dirty = false; editing = false; render();
    };
    saveBtn.addEventListener('click', save);
    const cancel = el('button', { class: 'btn ghost', type: 'button', onclick: () => {
      if (dirty && !confirm('Discard your changes to this note?')) return;
      dirty = false; editing = false; render();
    } }, hasNote(it) ? 'Cancel' : 'Discard');
    onPaste = (ev) => {
      const cd = ev.clipboardData; if (!cd) return;
      const d = parseExcalidraw(cd.getData('text/plain'));
      if (d) { ev.preventDefault(); add(d); return; }
      const item = [...(cd.items || [])].find((x) => x.kind === 'file' && x.type.startsWith('image/'));
      if (item) { ev.preventDefault(); addFile(item.getAsFile()); }
    };
    onKey = (ev) => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); save(); } };
    page.replaceChildren(back, crumb, h1,
      el('div', { class: 'np-bar' }, el('span', { class: 'grow' }), link && el('a', { class: 'btn ghost small', href: link, target: '_blank', rel: 'noopener' }, label)),
      el('div', { class: 'np-edit' },
        sel && el('label', { class: 'note-field' }, 'Pattern', sel),
        el('label', { class: 'note-field' }, isDsa ? 'The giveaway and the trick, in your own words' : 'What to remember', ta),
        el('div', { class: 'paste-hint' },
          el('span', null, 'Paste an Excalidraw selection (Ctrl+C in Excalidraw, then Ctrl+V anywhere on this page) or an image.'),
          el('label', { class: 'nbtn' }, 'Add image', fileInput)),
        holder),
      el('div', { class: 'np-actions' }, saveBtn, cancel, status, el('span', { class: 'note-hint' }, 'Ctrl + Enter saves')));
    refresh(); grow(); ta.focus();
  }

  let onPaste = null, onKey = null;
  document.addEventListener('paste', (ev) => { if (editing && onPaste) onPaste(ev); });
  document.addEventListener('keydown', (ev) => { if (editing && onKey) onKey(ev); });
  window.addEventListener('beforeunload', (ev) => { if (editing && dirty) { ev.preventDefault(); ev.returnValue = ''; } });
  window.addEventListener('storage', (ev) => { if (ev.key === KEY && !editing) render(); });   // the tracker changed something
  document.getElementById('themeBtn').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('prep-notebook.theme', next); } catch (e) {}
    if (!editing) render();
  });

  const f = find(load());
  editing = !!(f && !hasNote(f.it));       // a new note opens straight into the editor
  render();
})();
