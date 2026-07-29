// O pacote enviado à Chrome Web Store.
//
// Um envio rejeitado custa dias de revisão, então as regras que o Google
// verifica ficam travadas aqui: manifest na raiz, nada de teste/dependência
// junto, e os campos obrigatórios da listagem preenchidos.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const empacotador = fs.readFileSync(path.join(RAIZ, "empacotar.mjs"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(RAIZ, "manifest.json"), "utf8"));

describe("pacote — o que entra no zip", () => {
  it("inclui só manifest, icons e src", () => {
    const m = empacotador.match(/const INCLUIR = \[([^\]]+)\]/);
    expect(m, "constante INCLUIR não encontrada").toBeTruthy();
    const itens = m[1].match(/"([^"]+)"/g).map((s) => s.replace(/"/g, ""));
    expect(itens).toEqual(["manifest.json", "icons", "src"]);
  });

  it("os arquivos listados existem de fato", () => {
    for (const alvo of ["manifest.json", "icons", "src"]) {
      expect(fs.existsSync(path.join(RAIZ, alvo)), alvo).toBe(true);
    }
  });

  it("todo arquivo que a extensão carrega está dentro do que é empacotado", () => {
    // Se um caminho do manifest apontar para fora de src/ ou icons/, o pacote
    // sai quebrado e a extensão nem carrega.
    const caminhos = [
      manifest.background?.service_worker,
      manifest.action?.default_popup,
      ...Object.values(manifest.icons || {}),
    ].filter(Boolean);
    for (const c of caminhos) {
      expect(fs.existsSync(path.join(RAIZ, c)), `${c} não existe`).toBe(true);
      expect(/^(src|icons)\//.test(c), `${c} fora das pastas empacotadas`).toBe(true);
    }
  });
});

describe("pacote — exigências da loja", () => {
  it("nome cabe em 45 caracteres e descrição em 132", () => {
    expect(manifest.name.length).toBeLessThanOrEqual(45);
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.description.length).toBeLessThanOrEqual(132);
  });

  it("tem os 4 tamanhos de ícone que a loja usa", () => {
    expect(Object.keys(manifest.icons).sort()).toEqual(["128", "16", "32", "48"]);
    for (const rel of Object.values(manifest.icons)) {
      expect(fs.statSync(path.join(RAIZ, rel)).size).toBeGreaterThan(0);
    }
  });

  it("declara o service worker como módulo ES (o core usa import)", () => {
    expect(manifest.background.type).toBe("module");
  });
});
