// Runs Python with Pyodide off the main thread. The page kills and recreates this
// worker if a run exceeds its time limit, so an infinite loop never freezes the tab.
// A local copy (vendor/pyodide, git-ignored) is used for offline testing; otherwise the CDN.
let indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
try { importScripts('vendor/pyodide/pyodide.js'); indexURL = new URL('vendor/pyodide/', self.location).href; }
catch (e) { importScripts(indexURL + 'pyodide.js'); }

const ready = loadPyodide({ indexURL }).then(async (py) => {
  await py.runPythonAsync(`
import sys, io, traceback, json, ast

def __exec_test(code, g):
    # assert a == b with no message: report what was expected and what came back
    tree = ast.parse(code)
    node = tree.body[0] if len(tree.body) == 1 else None
    if (isinstance(node, ast.Assert) and node.msg is None and isinstance(node.test, ast.Compare)
            and len(node.test.ops) == 1 and isinstance(node.test.ops[0], ast.Eq)):
        got = eval(compile(ast.Expression(node.test.left), "test", "eval"), g)
        exp = eval(compile(ast.Expression(node.test.comparators[0]), "test", "eval"), g)
        if got != exp:
            raise AssertionError("expected " + repr(exp) + ", got " + repr(got))
    else:
        exec(compile(tree, "test", "exec"), g)

def __run(user_code, tests_json, stdin_text):
    tests = json.loads(tests_json)
    out = io.StringIO()
    g = {"__name__": "__main__"}
    old_out, old_in = sys.stdout, sys.stdin
    sys.stdout = out
    sys.stdin = io.StringIO(stdin_text or "")
    result = {"error": None, "tests": []}
    try:
        try:
            exec(compile(user_code, "solution.py", "exec"), g)
        except SystemExit:
            pass
        except BaseException:
            tb = traceback.format_exc()
            # hide this runner's frame from the traceback
            lines = [l for l in tb.splitlines() if "<exec>" not in l]
            result["error"] = "\\n".join(lines)
            return json.dumps(result | {"stdout": out.getvalue()})
        for t in tests:
            entry = {"label": t["label"], "ok": False, "msg": ""}
            try:
                sys.stdin = io.StringIO(t.get("stdin", ""))
                __exec_test(t["code"], g)
                entry["ok"] = True
            except AssertionError as e:
                entry["msg"] = str(e) or "assertion failed"
            except BaseException as e:
                entry["msg"] = type(e).__name__ + ": " + str(e)
            result["tests"].append(entry)
    finally:
        sys.stdout, sys.stdin = old_out, old_in
    result["stdout"] = out.getvalue()
    return json.dumps(result)
`);
  return py;
});

ready.then(() => postMessage({ type: 'ready' }), (e) => postMessage({ type: 'loadError', message: String(e) }));

onmessage = async (ev) => {
  const { id, code, tests, stdin } = ev.data;
  try {
    const py = await ready;
    const fn = py.globals.get('__run');
    const json = fn(code, JSON.stringify(tests || []), stdin || '');
    fn.destroy();
    postMessage({ type: 'result', id, ...JSON.parse(json) });
  } catch (e) {
    // A JS stack overflow (deep recursion through C functions such as @cache) leaves
    // Pyodide unusable, so tell the page to replace this worker.
    postMessage({ type: 'result', id, fatal: true, error: String(e), tests: [], stdout: '' });
  }
};
