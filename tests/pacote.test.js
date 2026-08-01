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

const ESPERADO_NO_PACOTE = ["manifest.json", "icons", "src", "LICENSE", "NOTICE"];

describe("pacote — o que entra no zip", () => {
  it("inclui o que a extensão roda, mais LICENSE e NOTICE", () => {
    const m = empacotador.match(/const INCLUIR = \[([^\]]+)\]/);
    expect(m, "constante INCLUIR não encontrada").toBeTruthy();
    const itens = m[1].match(/"([^"]+)"/g).map((s) => s.replace(/"/g, ""));
    expect(itens).toEqual(ESPERADO_NO_PACOTE);
  });

  it("os arquivos listados existem de fato", () => {
    for (const alvo of ESPERADO_NO_PACOTE) {
      expect(fs.existsSync(path.join(RAIZ, alvo)), alvo).toBe(true);
    }
  });

  it("a licença acompanha a distribuição (Apache 2.0, seção 4a)", () => {
    // Distribuir o zip sem a licença descumpriria a própria licença escolhida.
    const m = empacotador.match(/const INCLUIR = \[([^\]]+)\]/);
    const itens = m[1].match(/"([^"]+)"/g).map((s) => s.replace(/"/g, ""));
    expect(itens).toContain("LICENSE");
    expect(itens).toContain("NOTICE");
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

describe("manifest — recursos acessíveis pela página", () => {
  // O content script do menu de contexto carrega o motor de seletores por
  // import() dinâmico. Módulo que não está em web_accessible_resources não
  // carrega, e o import falha em silêncio: clicar no menu não faz nada.
  //
  // Já aconteceu — `leitura-dom.js` era importado e não estava declarado.

  const acessiveis = new Set(
    (manifest.web_accessible_resources || []).flatMap((r) => r.resources || [])
  );

  /** Resolve um caminho relativo entre módulos, no estilo do navegador. */
  function resolver(deArquivo, relativo) {
    const base = path.posix.dirname(deArquivo);
    return path.posix.normalize(path.posix.join(base, relativo));
  }

  it("todo módulo carregado por getURL() está declarado", () => {
    const faltando = [];
    for (const arquivo of ["src/content/seletor.js", "src/content/content.js"]) {
      const txt = fs.readFileSync(path.join(RAIZ, arquivo), "utf8");
      for (const m of txt.matchAll(/getURL\(\s*["'`]([^"'`]+)["'`]/g)) {
        if (!acessiveis.has(m[1])) faltando.push(`${m[1]} (usado em ${arquivo})`);
      }
    }
    expect(faltando, `faltam em web_accessible_resources: ${faltando.join(", ")}`).toEqual([]);
  });

  it("os imports desses módulos também estão declarados", () => {
    // Um módulo acessível que importa outro arrasta o segundo junto: o
    // navegador vai buscá-lo, e ele precisa ser acessível também.
    const faltando = [];
    for (const rel of acessiveis) {
      if (!rel.endsWith(".js")) continue;
      const txt = fs.readFileSync(path.join(RAIZ, rel), "utf8");
      for (const m of txt.matchAll(/^import\s[^"']*["']([^"']+)["']/gm)) {
        if (!m[1].startsWith(".")) continue; // pacote externo: não existe aqui
        const alvo = resolver(rel, m[1]);
        if (!acessiveis.has(alvo)) faltando.push(`${alvo} (importado por ${rel})`);
      }
    }
    expect(faltando, `imports em cadeia não declarados: ${faltando.join(", ")}`).toEqual([]);
  });

  it("todo recurso declarado existe de verdade", () => {
    for (const rel of acessiveis) {
      expect(fs.existsSync(path.join(RAIZ, rel)), `${rel} não existe`).toBe(true);
    }
  });

  it("a permissão de host é opcional, não obrigatória", () => {
    // É o que mantém a instalação padrão sem o aviso de "ler todos os seus
    // dados". Promovê-la para `host_permissions` mudaria a listagem na loja.
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.optional_host_permissions).toEqual(["<all_urls>"]);
    expect(manifest.permissions).toEqual(["contextMenus", "storage", "activeTab", "scripting"]);
  });
});
