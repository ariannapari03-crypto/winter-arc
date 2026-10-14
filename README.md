# Winter arc

Piano di studio, percorso a caselle fino alla laurea, tesi, stage e strumento «Slide → dispensa».
App web installabile (si apre a schermo intero con la sua icona). Con il database Upstash collegato, telefono e PC usano gli stessi dati; senza, i dati restano sul dispositivo. Il **Backup** è nella scheda Altro.

## File

| File | Cosa fa |
|---|---|
| `app.html` | L'app (stessa pagina della versione su claude.ai) |
| `shim.js` | Collega l'app al telefono: dati nel browser, Claude tramite `/api/claude` |
| `build.mjs` | Genera `index.html` da `app.html` + `shim.js`: `node build.mjs` |
| `api/claude.js` | Funzione Vercel che chiama Claude. La chiave API non arriva mai al browser |
| `api/db.js` | Sincronizzazione tra dispositivi su Upstash Redis, protetta dalla stessa password |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installazione sulla Home e apertura offline |

## Messa online (Vercel)

1. Importa questo repository su Vercel (Add New → Project). Nessuna impostazione di build da cambiare.
2. In **Settings → Environment Variables** aggiungi:
   - `ANTHROPIC_API_KEY`: la tua chiave da console.anthropic.com
   - `APP_PASSWORD`: una password a tua scelta (l'app te la chiede la prima volta che usi l'Assistente o le slide)
3. Per sincronizzare telefono e PC: **Storage** (o Marketplace) → **Upstash** → Redis, piano gratuito → collegalo al progetto. Vercel aggiunge da solo `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
4. Fai **Redeploy** perché le variabili abbiano effetto.
5. Apri l'indirizzo `…vercel.app` in Chrome sul telefono → menu ⋮ → **Installa app** (o «Aggiungi a schermata Home»).

## Costi

Hosting gratuito sul piano Hobby di Vercel. Claude si paga a consumo sulla chiave API: imposta un limite di spesa mensile nella console Anthropic.
