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

  window.claude = { use: async (n) => (n === "sample" ? sample : n === "downloads" ? downloads : null) };
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
})();
