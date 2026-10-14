// Sincronizzazione tra dispositivi: un piccolo archivio di documenti JSON su Upstash Redis.
// Le credenziali arrivano dall'integrazione Upstash di Vercel (variabili d'ambiente), mai dal browser.
import { passwordOk } from "./_auth.js";

const URL_REDIS = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const MAX_DOC = 900_000; // byte per documento
const nomeValido = (s) => typeof s === "string" && s.length > 0 && s.length <= 200 && !/\s/.test(s);

async function redis(comando) {
  const r = await fetch(URL_REDIS, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(comando),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`);
  return j.result;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!passwordOk(req)) return res.status(401).json({ code: "password" });
  if (!URL_REDIS || !TOKEN) return res.status(501).json({ code: "non_configurato" });

  const { op, col, id, data } = req.body || {};
  try {
    if (op === "ping") return res.status(200).json({ ok: true });
    if (!nomeValido(col)) return res.status(400).json({ code: "invalid_argument" });
    const chiave = "wa:" + col;
    if (op === "list") {
      const piatto = (await redis(["HGETALL", chiave])) || [];
      const docs = {};
      for (let i = 0; i < piatto.length; i += 2) docs[piatto[i]] = JSON.parse(piatto[i + 1]);
      return res.status(200).json({ data: docs });
    }
    if (!nomeValido(id)) return res.status(400).json({ code: "invalid_argument" });
    if (op === "get") {
      const v = await redis(["HGET", chiave, id]);
      return res.status(200).json({ data: v == null ? null : JSON.parse(v) });
    }
    if (op === "set") {
      const testo = JSON.stringify(data);
      if (!data || typeof data !== "object" || testo.length > MAX_DOC) return res.status(400).json({ code: "invalid_argument" });
      await redis(["HSET", chiave, id, testo]);
      return res.status(200).json({ ok: true });
    }
    if (op === "del") {
      await redis(["HDEL", chiave, id]);
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ code: "invalid_argument" });
  } catch (e) {
    return res.status(502).json({ code: "unavailable" });
  }
}
