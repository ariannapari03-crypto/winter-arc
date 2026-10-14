// Fuori da claude.ai: stessa interfaccia che l'app usa dentro gli artifact (claude.use),
// ma i dati restano nel telefono e Claude si chiama tramite /api/claude.
(function () {
  if (window.claude) return;
  const CHIAVE_PW = "winter-arc-password";
  const leggiPw = () => { try { return localStorage.getItem(CHIAVE_PW); } catch (e) { return null; } };
  const password = () => {
    let p = leggiPw();
    if (!p) {
      p = window.prompt("Password dell'app (quella che hai messo in APP_PASSWORD su Vercel)");
      if (p) try { localStorage.setItem(CHIAVE_PW, p); } catch (e) {}
    }
    return p;
  };
  const inBase64 = (blob) => new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.onerror = ko;
    r.readAsDataURL(blob);
  });

  async function chiama(input, opts = {}) {
    const prompt = typeof input === "string" ? input : input.map((m) => m.content).join("\n\n");
    const images = opts.images
      ? await Promise.all([...opts.images].map(async (b) => ({ media_type: b.type || "image/jpeg", data: await inBase64(b) })))
      : [];
    const pw = password();
    if (!pw) throw { code: "password" };
    let r;
    try {
      r = await fetch("/api/claude", {
        method: "POST",
        headers: { "content-type": "application/json", "x-app-password": pw },
        body: JSON.stringify({ prompt, images, tier: opts.modelTier || "default" }),
        signal: opts.signal,
      });
    } catch (e) {
      throw { code: e && e.name === "AbortError" ? "cancelled" : "upstream_error" };
    }
    const j = await r.json().catch(() => ({ code: "upstream_error" }));
    if (r.status === 401) { try { localStorage.removeItem(CHIAVE_PW); } catch (e) {} throw { code: "password" }; }
    if (!r.ok) throw { code: j.code || "upstream_error", message: j.message };
    if (j.code === "refusal") throw { code: "refusal" };
    if (opts.onText) opts.onText({ text: j.text, delta: j.text });
    return { text: j.text, truncated: !!j.truncated };
  }

  const sample = (input, opts) => chiama(input, opts);
  sample.json = async (input, opts) => {
    const { text, truncated } = await chiama(input, opts);
    if (truncated) throw { code: "invalid_json", text };
    const t = text.trim();
    const a = t.search(/[\[{]/), b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    const prove = [t, (t.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1], a >= 0 && b > a ? t.slice(a, b + 1) : null];
    for (const x of prove) { if (!x) continue; try { return JSON.parse(x); } catch (e) {} }
    throw { code: "invalid_json", text };
  };
  sample.limits = async () => ({ maxPromptBytes: 262144, images: { maxCount: 4, maxInputBytes: 5e6, mediaTypes: ["image/jpeg", "image/png", "image/webp"] } });

  const downloads = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return { saved: true };
    },
  };

  // Archivio condiviso tra dispositivi (/api/db). Se non è configurato su Vercel, l'app resta sul dispositivo.
  async function dbApi(body) {
    const pw = password();
    if (!pw) throw { code: "not_granted" };
    let r;
    try {
      r = await fetch("/api/db", { method: "POST", headers: { "content-type": "application/json", "x-app-password": pw }, body: JSON.stringify(body) });
    } catch (e) { throw { code: "unavailable" }; }
    if (r.status === 401) { try { localStorage.removeItem(CHIAVE_PW); } catch (e) {} throw { code: "not_granted" }; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw { code: r.status === 501 ? "capability_disabled" : j.code || "unavailable" };
    return j;
  }
  const istantanea = (id, data) => ({ id, exists: data != null, data: () => (data == null ? undefined : data), metadata: { fromCache: false, hasPendingWrites: false } });
  function documento(path) {
    const i = path.lastIndexOf("/"), col = path.slice(0, i), id = path.slice(i + 1);
    const leggi = async () => istantanea(id, (await dbApi({ op: "get", col, id })).data);
    return {
      id, path,
      get: leggi,
      set: async (data) => { await dbApi({ op: "set", col, id, data }); },
      update: async (parte) => { const s = await leggi(); await dbApi({ op: "set", col, id, data: { ...(s.data() || {}), ...parte } }); },
      delete: async () => { await dbApi({ op: "del", col, id }); },
      onSnapshot(next, errore) {
        // Controlla quando l'app torna in primo piano e ogni 20 secondi mentre è aperta.
        let ultimo = null;
        const giro = async () => {
          try { const s = await leggi(); const t = JSON.stringify(s.data() ?? null); if (t !== ultimo) { ultimo = t; next(s); } }
          catch (e) { if (errore && e && e.code === "not_granted") errore(e); }
        };
        giro();
        const timer = setInterval(() => { if (document.visibilityState === "visible") giro(); }, 20000);
        const visibile = () => { if (document.visibilityState === "visible") giro(); };
        document.addEventListener("visibilitychange", visibile);
        return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visibile); };
      },
    };
  }
  const collezione = (path) => ({
    path,
    doc: (id) => documento(path + "/" + id),
    get: async () => { const docs = Object.entries((await dbApi({ op: "list", col: path })).data || {}).map(([id, d]) => istantanea(id, d)); return { docs, size: docs.length, empty: !docs.length }; },
  });
  const db = { doc: documento, collection: collezione };
  const utente = { id: async () => "io", isOwner: () => true, canEdit: () => true, can: () => true };
  let dbPronto = null;
  const usaDb = () => (dbPronto ||= dbApi({ op: "ping" }).then(() => db).catch(() => null));

  window.claude = {
    use: async (n) => (n === "sample" ? sample : n === "downloads" ? downloads : n === "db" ? usaDb() : n === "user" ? usaDb().then((d) => (d ? utente : null)) : null),
  };
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
})();
