// Servidor estático mínimo para rodar os cenários e2e num navegador real.
// Serve a raiz do projeto. Uso: `node tests/e2e/servir.mjs` e abra
// http://localhost:8791/tests/e2e/runner.html
//
// Também aceita POST em /gravar-icone, para o gerador de ícones
// (icons/gerar-icones.html) salvar os PNGs direto na pasta icons/. Sem isso, a
// única saída seria baixar os arquivos e movê-los à mão a cada ajuste de
// desenho — e ajuste de desenho vem sempre em série.
//
// Ferramenta de desenvolvimento: tests/ fica fora do pacote da extensão.
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

/** Só estes nomes podem ser gravados, e só dentro de icons/. */
const ICONES_PERMITIDOS = new Set(["16.png", "32.png", "48.png", "128.png"]);

function gravarIcone(req, res) {
  let corpo = "";
  req.on("data", (p) => {
    corpo += p;
    if (corpo.length > 2_000_000) req.destroy();
  });
  req.on("end", () => {
    try {
      const { nome, base64 } = JSON.parse(corpo);
      if (!ICONES_PERMITIDOS.has(nome)) {
        return res.writeHead(400).end("nome não permitido: " + nome);
      }
      const bytes = Buffer.from(base64, "base64");
      // Assinatura PNG: se não bater, algo veio truncado e não queremos
      // gravar um arquivo quebrado por cima de um que funcionava.
      if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
        return res.writeHead(400).end("não é um PNG válido");
      }
      fs.writeFileSync(path.join(raiz, "icons", nome), bytes);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, nome, bytes: bytes.length }));
      console.log(`gravado icons/${nome} — ${bytes.length} bytes`);
    } catch (e) {
      res.writeHead(500).end(e.message);
    }
  });
}

http
  .createServer((req, res) => {
    if (req.method === "POST" && req.url === "/gravar-icone") {
      return gravarIcone(req, res);
    }
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
