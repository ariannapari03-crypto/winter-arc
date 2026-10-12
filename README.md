# Winter arc

Piano di studio, percorso a caselle fino alla laurea, tesi, stage e strumento «Slide → dispensa».
App web installabile (si apre a schermo intero con la sua icona). I dati restano nel telefono: usa il **Backup** nella scheda Casa.

## File

| File | Cosa fa |
|---|---|
| `app.html` | L'app (stessa pagina della versione su claude.ai) |
| `shim.js` | Collega l'app al telefono: dati nel browser, Claude tramite `/api/claude` |
| `build.mjs` | Genera `index.html` da `app.html` + `shim.js`: `node build.mjs` |
| `api/claude.js` | Funzione Vercel che chiama Claude. La chiave API non arriva mai al browser |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installazione sulla Home e apertura offline |

## Messa online (Vercel)

1. Importa questo repository su Vercel (Add New → Project). Nessuna impostazione di build da cambiare.
2. In **Settings → Environment Variables** aggiungi:
   - `ANTHROPIC_API_KEY`: la tua chiave da console.anthropic.com
   - `APP_PASSWORD`: una password a tua scelta (l'app te la chiede la prima volta che usi l'Assistente o le slide)
3. Fai **Redeploy** perché le variabili abbiano effetto.
4. Apri l'indirizzo `…vercel.app` in Chrome sul telefono → menu ⋮ → **Installa app** (o «Aggiungi a schermata Home»).

## Costi

Hosting gratuito sul piano Hobby di Vercel. Claude si paga a consumo sulla chiave API: imposta un limite di spesa mensile nella console Anthropic.
