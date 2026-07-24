// Servidor estático mínimo para rodar os cenários e2e num navegador real.
// Serve a raiz do projeto. Uso: `node tests/e2e/servir.mjs` e abra
// http://localhost:8791/tests/e2e/runner.html
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const tipos = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".png": "image/png",
};

http
  .createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]);
    const arquivo = path.resolve(raiz, "." + rel);
    if (!arquivo.startsWith(raiz)) return res.writeHead(403).end("403");
    fs.readFile(arquivo, (err, dados) => {
      if (err) return res.writeHead(404).end("404 " + rel);
      res.writeHead(200, { "Content-Type": tipos[path.extname(arquivo)] || "application/octet-stream" });
      res.end(dados);
    });
  })
  .listen(8791, () => console.log("servindo em http://localhost:8791 — abra /tests/e2e/runner.html"));
