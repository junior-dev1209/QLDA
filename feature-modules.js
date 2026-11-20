(() => {
  const paths = Object.freeze({
    "tasks-board": "frontend/tasks-board.js",
    "tasks-details": "frontend/tasks-details.js",
    "tasks-editor": "frontend/tasks-editor.js",
    "tasks-import": "frontend/tasks-import.js",
    "tasks-form": "frontend/tasks-form.js",
    "tasks-catalog": "frontend/tasks-catalog.js",
    "tasks-reader": "frontend/tasks-reader.js",
  });
  const dependencies = Object.freeze({ "tasks-details": ["tasks-form"], "tasks-editor": ["tasks-form"] });
  const modules = new Map();
  const pending = new Map();
  let configuration = null;
  function configure(version, base) {
    if (configuration && configuration.version !== version) throw new Error("Feature runtime version changed.");
    configuration = { version: String(version), base: new URL(base).href };
  }
  function register(id, version, api) {
    if (!configuration || version !== configuration.version || !Object.hasOwn(paths, id) || !api || typeof api !== "object") {
      throw new Error(`Feature module version mismatch: ${id}`);
    }
    if (!modules.has(id)) modules.set(id, Object.freeze(api));
  }
  function get(id) { return modules.get(id); }
  function load(id) {
    if (!configuration || !Object.hasOwn(paths, id)) return Promise.reject(new Error("Unknown feature module."));
    if (modules.has(id)) return Promise.resolve(modules.get(id));
    if (pending.has(id)) return pending.get(id);
    const start = () => new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const url = new URL(paths[id], configuration.base);
      url.searchParams.set("v", configuration.version);
      script.src = url.href;
      script.async = true;
      script.dataset.featureModule = id;
      let timer;
      const fail = () => { clearTimeout(timer); script.remove(); reject(new Error(`Unable to load feature module: ${id}`)); };
      script.onload = () => { clearTimeout(timer); modules.has(id) ? resolve(modules.get(id)) : fail(); };
      script.onerror = fail;
      timer = setTimeout(fail, 15000);
      document.head.append(script);
    });
    const promise = (dependencies[id] ? Promise.all(dependencies[id].map(load)).then(start) : start())
      .finally(() => pending.delete(id));
    pending.set(id, promise);
    return promise;
  }
  globalThis.QldaFeatures = Object.freeze({ configure, register, get, load });
})();
