// Runs a JavaScript snippet and collects console output. The page terminates this
// worker after a few seconds, so an endless loop can't freeze the tab.
function fmt(v, depth = 0) {
  if (typeof v === 'string') return depth ? JSON.stringify(v) : v;
  if (typeof v === 'function') return `[Function: ${v.name || 'anonymous'}]`;
  if (typeof v === 'symbol' || typeof v === 'bigint') return v.toString() + (typeof v === 'bigint' ? 'n' : '');
  if (v === undefined) return 'undefined';
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (v instanceof Promise) return 'Promise { <pending or settled> }';
  if (v instanceof Map) return `Map(${v.size}) { ${[...v].map(([k, x]) => `${fmt(k, 1)} => ${fmt(x, 1)}`).join(', ')} }`;
  if (v instanceof Set) return `Set(${v.size}) { ${[...v].map((x) => fmt(x, 1)).join(', ')} }`;
  if (Array.isArray(v)) return depth > 2 ? '[Array]' : `[ ${v.map((x) => fmt(x, depth + 1)).join(', ')} ]`;
  if (v && typeof v === 'object') {
    if (depth > 2) return '[Object]';
    const entries = Object.entries(v).map(([k, x]) => `${k}: ${fmt(x, depth + 1)}`);
    return entries.length ? `{ ${entries.join(', ')} }` : '{}';
  }
  return String(v);
}

onmessage = async (ev) => {
  const lines = [];
  const push = (prefix) => (...args) => lines.push(prefix + args.map((a) => fmt(a)).join(' '));
  console.log = push(''); console.info = push(''); console.warn = push('⚠ '); console.error = push('✖ ');
  let error = null;
  self.addEventListener('unhandledrejection', (e) => { lines.push('✖ Uncaught (in promise) ' + fmt(e.reason)); e.preventDefault(); });
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction(ev.data.code)();
    // let queued timers and microtasks finish so event-loop examples print everything
    await new Promise((r) => setTimeout(r, 400));
  } catch (e) {
    error = e && e.name ? `${e.name}: ${e.message}` : String(e);
  }
  postMessage({ out: lines.join('\n'), error });
};
