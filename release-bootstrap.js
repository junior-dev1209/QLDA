(() => {
  "use strict";

  const bootFlag = "__PHUC_THINH_RELEASE_BOOTSTRAPPED";
  const appFlag = "__PHUC_THINH_RELEASE_APP_STARTED";
  const cacheName = "phuc-thinh-release-runtime-v1";
  const timeoutMs = 7000;
  const appFiles = ["people-data.js", "script.js"];

  if (window[bootFlag]) return;

  const bootstrapUrl = document.currentScript?.src || new URL("release-bootstrap.js", window.location.href).href;
  const staticBase = new URL(".", bootstrapUrl).href;
  window.PHUC_THINH_STATIC_APP_BASE = window.PHUC_THINH_STATIC_APP_BASE || staticBase;

  function staticUrl(path) {
    return new URL(path, window.PHUC_THINH_STATIC_APP_BASE).href;
  }

  function releaseEndpoint() {
    const config = window.PHUC_THINH_SUPABASE || {};
    const projectUrl = String(config.projectUrl || "").trim().replace(/\/$/, "");
    return projectUrl ? `${projectUrl}/functions/v1/kpi-sync` : "";
  }

  function apiHeaders() {
    const config = window.PHUC_THINH_SUPABASE || {};
    const key = String(config.publishableKey || config.anonKey || "").trim();
    return key ? { apikey: key } : {};
  }

  function releaseFileBase(releaseId) {
    return `${releaseEndpoint()}/release/${encodeURIComponent(releaseId)}/`;
  }

  function releaseFileUrl(releaseId, path) {
    return new URL(path, releaseFileBase(releaseId)).href;
  }

  function validRelease(value) {
    if (!value || typeof value !== "object") return false;
    if (!/^[0-9a-f-]{36}$/i.test(String(value.id || ""))) return false;
    return Array.isArray(value.files) && value.files.some((file) => file?.path === "index.html" && /^[a-f0-9]{64}$/i.test(String(file.sha256 || "")));
  }

  function releaseFile(release, path) {
    return (release.files || []).find((file) => file?.path === path) || null;
  }

  async function cacheResponse(url, response) {
    if (!("caches" in window) || !response?.ok) return;
    try {
      const cache = await caches.open(cacheName);
      await cache.put(url, response.clone());
    } catch {
      // Cache failures must not block a normal online startup.
    }
  }

  async function fetchWithCache(url, options = {}) {
    try {
      const response = await fetch(url, { cache: "no-store", ...options });
      if (response.ok) await cacheResponse(url, response);
      return response;
    } catch (error) {
      if (!("caches" in window)) throw error;
      const cache = await caches.open(cacheName);
      const cached = await cache.match(url);
      if (cached) return cached;
      throw error;
    }
  }

  async function sha256Hex(buffer) {
    if (!window.crypto?.subtle) return "";
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  async function verifiedText(release, path) {
    const file = releaseFile(release, path);
    if (!file) throw new Error(`Release is missing ${path}.`);
    const response = await fetchWithCache(releaseFileUrl(release.id, path));
    if (!response.ok) throw new Error(`Release file ${path} is unavailable.`);
    const bytes = await response.arrayBuffer();
    const hash = await sha256Hex(bytes);
    if (hash && hash !== String(file.sha256 || "").toLowerCase()) throw new Error(`Release file ${path} failed its integrity check.`);
    return new TextDecoder().decode(bytes);
  }

  async function cacheReleaseFiles(release) {
    await Promise.all((release.files || []).map(async (file) => {
      if (!file?.path) return;
      try {
        await fetchWithCache(releaseFileUrl(release.id, file.path));
      } catch {
        // Individual optional assets can be refreshed on demand.
      }
    }));
  }

  function removeScript(html, filename) {
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(`<script\\b[^>]*\\bsrc\\s*=\\s*(["'])[^"']*${escaped}(?:\\?[^"']*)?\\1[^>]*>\\s*<\\/script>`, "gi");
    return html.replace(matcher, "");
  }

  function escapedAttribute(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function remoteDocument(html, release, styles) {
    let output = html;
    ["release-bootstrap.js", "people-data.js", "supabase-config.js", "script.js"].forEach((file) => {
      output = removeScript(output, file);
    });
    output = output.replace(/<base\b[^>]*>/gi, "");
    const safeStyles = String(styles || "").replace(/<\/style/gi, "<\\/style");
    output = output.replace(/<link\b[^>]*\bhref\s*=\s*(["'])[^"']*styles\.css(?:\?[^"']*)?\1[^>]*>/gi, `<style id="phucThinhReleaseStyles">${safeStyles}</style>`);
    const head = `<base href="${escapedAttribute(releaseFileBase(release.id))}"><script src="${escapedAttribute(staticUrl("supabase-config.js"))}"></script>`;
    if (/<head\b[^>]*>/i.test(output)) return output.replace(/<head\b[^>]*>/i, (match) => `${match}${head}`);
    return `<!doctype html><html lang="vi"><head>${head}</head><body>${output}</body></html>`;
  }

  function domReady() {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${url}`));
      document.body.appendChild(script);
    });
  }

  function loadScriptSource(source, label) {
    const url = URL.createObjectURL(new Blob([source], { type: "application/javascript" }));
    return loadScript(url).finally(() => URL.revokeObjectURL(url));
  }

  async function startApplication(sourceBase, release = null) {
    if (window[appFlag]) return;
    window[appFlag] = true;
    await domReady();
    for (const file of appFiles) {
      if (release) {
        await loadScriptSource(await verifiedText(release, file), file);
      } else {
        await loadScript(new URL(file, sourceBase).href);
      }
    }
  }

  async function activeRelease() {
    const endpoint = releaseEndpoint();
    if (!endpoint) return null;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchWithCache(`${endpoint}?action=release-current`, {
        headers: apiHeaders(),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return validRelease(payload?.release) ? payload.release : null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function bootstrap() {
    const useStaticBase = new URLSearchParams(window.location.search).get("release-base") === "1";
    const release = useStaticBase ? null : await activeRelease();
    if (!release) {
      await startApplication(staticBase);
      return { mode: "static" };
    }

    window[bootFlag] = true;
    window.PHUC_THINH_ACTIVE_RELEASE = release;
    window.PHUC_THINH_RELEASE_SOURCE_BASE = releaseFileBase(release.id);
    await cacheReleaseFiles(release);
    const [html, styles] = await Promise.all([
      verifiedText(release, "index.html"),
      verifiedText(release, "styles.css"),
    ]);
    document.open();
    document.write(remoteDocument(html, release, styles));
    document.close();
    await startApplication(window.PHUC_THINH_RELEASE_SOURCE_BASE, release);
    return { mode: "release", release };
  }

  window.PHUC_THINH_RELEASE_BOOTSTRAP_READY = bootstrap().catch(async (error) => {
    window.PHUC_THINH_RELEASE_BOOT_ERROR = error?.message || "Release startup failed.";
    await startApplication(staticBase);
    return { mode: "static", error: window.PHUC_THINH_RELEASE_BOOT_ERROR };
  });
})();
