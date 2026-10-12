// Genera index.html da app.html (la stessa pagina della versione su claude.ai) aggiungendo
// intestazione da app installabile e shim.js. Uso: node build.mjs
import fs from "node:fs";

const app = fs.readFileSync("app.html", "utf8").replace(/<title>[^<]*<\/title>\s*/, "");
const shim = fs.readFileSync("shim.js", "utf8");

const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Winter arc</title>
<meta name="theme-color" content="#090b0f">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Winter arc">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/png" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}</style>
<script>${shim}</script>
</head>
<body>
${app}
</body>
</html>
`;
fs.writeFileSync("index.html", html);
console.log("index.html scritto");
