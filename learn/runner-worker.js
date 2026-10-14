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

import types as __types

class __VizLimit(Exception):
    pass

def __snap(v, depth=0):
    try:
        if isinstance(v, (list, tuple)) and depth < 2 and len(v) <= 40:
            return {"t": "list" if isinstance(v, list) else "tuple", "v": [__snap(x, depth + 1) for x in v], "id": id(v)}
        if isinstance(v, dict) and depth < 2 and len(v) <= 30:
            return {"t": "dict", "v": [[__snap(k, 2), __snap(x, depth + 1)] for k, x in v.items()], "id": id(v)}
        if isinstance(v, (set, frozenset)) and depth < 2 and len(v) <= 40:
            try:
                items = sorted(v)
            except Exception:
                items = list(v)
            return {"t": "set", "v": [__snap(x, 2) for x in items], "id": id(v)}
        r = repr(v)
        if len(r) > 80:
            r = r[:77] + "..."
        return {"t": "p", "v": r}
    except Exception:
        return {"t": "p", "v": "?"}

def __visible(k, v):
    if k.startswith("__"):
        return False
    return not isinstance(v, (__types.FunctionType, __types.ModuleType, type, __types.BuiltinFunctionType))

def __trace(user_code, stdin_text):
    out = io.StringIO()
    g = {"__name__": "__main__"}
    steps = []
    old_out, old_in = sys.stdout, sys.stdin
    sys.stdout = out
    sys.stdin = io.StringIO(stdin_text or "")
    error = None

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<viz>":
            return None
        if event in ("line", "return"):
            frames = []
            f = frame
            while f is not None and f.f_code.co_filename == "<viz>":
                name = f.f_code.co_name
                frames.append({
                    "name": "global" if name == "<module>" else name + "()",
                    "vars": [[k, __snap(v)] for k, v in list(f.f_locals.items()) if __visible(k, v)],
                })
                f = f.f_back
            step = {"line": frame.f_lineno, "event": event, "frames": frames[::-1], "out": len(out.getvalue())}
            if event == "return" and frame.f_code.co_name != "<module>":
                step["ret"] = __snap(arg)
            steps.append(step)
            if len(steps) >= 500:
                raise __VizLimit()
        return tracer

    try:
        code_obj = compile(user_code, "<viz>", "exec")
        sys.settrace(tracer)
        try:
            exec(code_obj, g)
        finally:
            sys.settrace(None)
    except __VizLimit:
        error = "Stopped after 500 steps. Step-through is meant for small examples."
    except BaseException as e:
        error = type(e).__name__ + ": " + str(e)
    finally:
        sys.stdout, sys.stdin = old_out, old_in
    return json.dumps({"steps": steps, "stdout": out.getvalue(), "error": error})

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
  const { id, code, tests, stdin, mode } = ev.data;
  try {
    const py = await ready;
    const fn = py.globals.get(mode === 'trace' ? '__trace' : '__run');
    const json = mode === 'trace' ? fn(code, stdin || '') : fn(code, JSON.stringify(tests || []), stdin || '');
    fn.destroy();
    postMessage({ type: 'result', id, ...JSON.parse(json) });
  } catch (e) {
    // A JS stack overflow (deep recursion through C functions such as @cache) leaves
    // Pyodide unusable, so tell the page to replace this worker.
    postMessage({ type: 'result', id, fatal: true, error: String(e), tests: [], stdout: '' });
  }
};
