// Unico punto in cui l'app parla con Claude. La chiave sta solo nelle variabili d'ambiente di Vercel
// (ANTHROPIC_API_KEY), mai nel browser. APP_PASSWORD impedisce a chi trova l'indirizzo di consumare il credito.
import Anthropic from "@anthropic-ai/sdk";
import { passwordOk } from "./_auth.js";

export const config = { maxDuration: 300 };

const client = new Anthropic();
const SFORZO = { quick: "low", default: "medium", complex: "high" };
const MAX_IMMAGINI = 6;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!passwordOk(req)) return res.status(401).json({ code: "password" });

  const { prompt, images = [], tier = "default" } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ code: "invalid_request" });

  const content = [
    ...images.slice(0, MAX_IMMAGINI).map((i) => ({
      type: "image",
      source: { type: "base64", media_type: i.media_type, data: i.data },
    })),
    { type: "text", text: prompt },
  ];

  try {
    // Streaming lato server: le letture di slide possono durare a lungo e così non si va in timeout.
    const stream = client.beta.messages.stream({
      model: "claude-opus-5-5",
      max_tokens: 32000,
      output_config: { effort: SFORZO[tier] || "medium" },
      // Se il modello rifiuta una richiesta, il server la ripete su un modello di riserva.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") return res.status(200).json({ code: "refusal", text: "" });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return res.status(200).json({ text, truncated: msg.stop_reason === "max_tokens" });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ code: "rate_limited" });
    if (e instanceof Anthropic.BadRequestError) return res.status(400).json({ code: "invalid_request", message: e.message });
    if (e instanceof Anthropic.AuthenticationError) return res.status(500).json({ code: "config", message: "ANTHROPIC_API_KEY non valida" });
    if (e instanceof Anthropic.APIError) return res.status(502).json({ code: "upstream_error", message: e.message });
    return res.status(500).json({ code: "upstream_error" });
  }
}
