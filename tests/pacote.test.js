// O que compõe a extensão distribuída.
//
// Estes testes validam o que independe da ferramenta de empacotamento: todo
// caminho declarado no manifest existe, aponta para dentro das pastas
// distribuídas, e os campos que o Google verifica estão preenchidos.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(RAIZ, "manifest.json"), "utf8"));

describe("pacote — o que a extensão carrega existe de fato", () => {
  // Um caminho quebrado no manifest impede a extensão de carregar, e o sintoma
  // aparece só na hora de instalar — depois de o pacote já ter subido.

  it("todo caminho do manifest existe e mora nas pastas distribuídas", () => {
    const caminhos = [
      manifest.background?.service_worker,
      manifest.action?.default_popup,
      manifest.devtools_page,
      ...Object.values(manifest.icons || {}),
      ...(manifest.web_accessible_resources || []).flatMap((r) => r.resources || []),
    ].filter(Boolean);

    expect(caminhos.length, "manifest sem nenhum caminho declarado").toBeGreaterThan(5);
    for (const c of caminhos) {
      expect(fs.existsSync(path.join(RAIZ, c)), `${c} não existe`).toBe(true);
      expect(/^(src\/|icons\/|devtools\.html$)/.test(c), `${c} fora do que é distribuído`)
        .toBe(true);
    }
  });

  it("LICENSE e NOTICE acompanham a distribuição", () => {
    // A AGPL exige que a licença e o aviso sigam cada cópia distribuída.
    for (const arq of ["LICENSE", "NOTICE"]) {
      expect(fs.existsSync(path.join(RAIZ, arq)), arq).toBe(true);
    }
  });

  it("o gerador de ícones não é referenciado pela extensão", () => {
    // Ele mora em icons/ mas é ferramenta de desenvolvimento: se entrasse no
    // manifest, iria junto para a loja.
    const tudo = JSON.stringify(manifest);
    expect(tudo).not.toContain("gerar-icones");
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
    // Sem <all_urls>: ele engloba file:// e outros esquemas que o Chrome
    // concede separadamente, e a checagem daria falso-negativo com a
    // permissao ligada. O menu nunca seria montado.
    expect(manifest.optional_host_permissions).toEqual(["http://*/*", "https://*/*"]);
    expect(manifest.optional_host_permissions).not.toContain("<all_urls>");
    expect(manifest.permissions).toEqual([
      "contextMenus", "storage", "activeTab", "scripting", "sidePanel",
    ]);
  });

  // A listagem da loja é traduzida por `_locales`, não pelo i18n.js do popup:
  // aquele roda no navegador, este o Chrome lê antes de instalar a extensão.
  it("a listagem localizada está completa e dentro dos limites da loja", () => {
    expect(manifest.default_locale).toBe("en");
    expect(manifest.name).toBe("__MSG_extName__");
    expect(manifest.description).toBe("__MSG_extDesc__");

    const dir = path.join(RAIZ, "_locales");
    const locales = fs.readdirSync(dir);
    expect(locales).toContain(manifest.default_locale);

    const doPadrao = new Set();
    const porLocale = {};
    for (const loc of locales) {
      const txt = fs.readFileSync(path.join(dir, loc, "messages.json"), "utf8");
      const msgs = JSON.parse(txt);
      porLocale[loc] = msgs;
      if (loc === manifest.default_locale) Object.keys(msgs).forEach((k) => doPadrao.add(k));
    }

    for (const [loc, msgs] of Object.entries(porLocale)) {
      for (const [chave, v] of Object.entries(msgs)) {
        // O Chrome recusa o pacote se um locale usar chave que o padrão não tem.
        expect(doPadrao.has(chave), `${chave} existe em ${loc} mas falta em ${manifest.default_locale}`).toBe(true);
        expect(typeof v.message, `${loc}/${chave} sem message`).toBe("string");
      }
      // Limites do campo: o nome aparece na barra do navegador e a descrição é
      // o subtítulo da loja. Estourar reprova no upload, não em revisão.
      expect([...msgs.extName.message].length, `extName de ${loc}`).toBeLessThanOrEqual(75);
      expect([...msgs.extDesc.message].length, `extDesc de ${loc}`).toBeLessThanOrEqual(132);
    }
  });

  it("o painel lateral serve a mesma página do popup, marcada com ?lateral=1", () => {
    // A marca na query é o único sinal que distingue os dois contextos: a URL é
    // idêntica no resto. Se ela sumir do manifesto, o painel abre achando que é
    // popup, fica travado em 380px de largura e ainda mostra o botão de "abrir
    // na lateral" dentro da própria lateral.
    const alvo = manifest.side_panel.default_path;
    expect(alvo.split("?")[0]).toBe(manifest.action.default_popup);
    expect(alvo).toContain("lateral=1");

    const js = fs.readFileSync(path.join(RAIZ, "src/popup/popup.js"), "utf8");
    expect(js).toMatch(/lateral["']\s*\)\s*===\s*["']1["']/);
  });
});

describe("manifest — painel do DevTools", () => {
  it("declara a página do DevTools e ela existe", () => {
    expect(manifest.devtools_page).toBe("devtools.html");
    expect(fs.existsSync(path.join(RAIZ, manifest.devtools_page))).toBe(true);
  });

  it("os caminhos de panels.create() valem a partir da raiz da extensão", () => {
    // O Chrome monta a URL do painel como origem + "/" + caminho. Escrevê-los
    // relativos ao devtools.html cria o painel apontando para um endereço
    // inexistente: a aba aparece no DevTools e abre em branco, sem erro.
    const js = fs.readFileSync(path.join(RAIZ, "src/devtools/devtools.js"), "utf8");
    const args = [...js.matchAll(/["']([^"']+\.(?:html|png))["']/g)].map((m) => m[1]);
    expect(args.length, "nenhum caminho encontrado em panels.create()").toBeGreaterThan(0);
    for (const rel of args) {
      expect(rel.startsWith("."), `${rel} é relativo ao arquivo, não à raiz`).toBe(false);
      expect(fs.existsSync(path.join(RAIZ, rel)), `${rel} não existe a partir da raiz`).toBe(true);
    }
  });

  it("o painel carrega CSS e JS que existem", () => {
    const html = fs.readFileSync(path.join(RAIZ, "src/devtools/painel.html"), "utf8");
    const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    for (const rel of refs) {
      // Estes são relativos ao próprio painel.html, e não à raiz.
      const alvo = path.join(RAIZ, "src/devtools", rel);
      expect(fs.existsSync(alvo), `${rel} não existe ao lado do painel.html`).toBe(true);
    }
  });
});

describe("manifest — origens pedidas e conferidas batem", () => {
  // O popup pede um conjunto de origens, o service worker confere outro e o
  // manifest declara um terceiro. Se os três divergirem, `request()` é
  // recusado ou `contains()` nunca casa — e o menu não aparece, sem erro.
  //
  // Foi assim com `<all_urls>`: declarado e conferido, mas o Chrome concede
  // http e https à parte, então a checagem dava falso-negativo com a permissão
  // visivelmente ligada na tela de extensões.

  const origensDe = (arquivo, ancora) => {
    const txt = fs.readFileSync(path.join(RAIZ, arquivo), "utf8");
    const i = txt.indexOf(ancora);
    expect(i, `âncora "${ancora}" sumiu de ${arquivo}`).toBeGreaterThan(-1);
    const bloco = txt.slice(i, txt.indexOf("]", i));
    return [...bloco.matchAll(/"([^"]*:\/\/[^"]*|<all_urls>)"/g)].map((m) => m[1]);
  };

  it("popup, service worker e manifest pedem as mesmas origens", () => {
    const doManifest = manifest.optional_host_permissions;
    const doWorker = origensDe("src/background/service-worker.js", "const ORIGENS = [");
    const doPopup = origensDe("src/popup/popup.js", "const PERMISSAO_SELETOR = { origins: [");

    expect(doWorker).toEqual(doManifest);
    expect(doPopup).toEqual(doManifest);
  });

  it("nenhum deles usa <all_urls>", () => {
    for (const [onde, lista] of [
      ["manifest", manifest.optional_host_permissions],
      ["service worker", origensDe("src/background/service-worker.js", "const ORIGENS = [")],
      ["popup", origensDe("src/popup/popup.js", "const PERMISSAO_SELETOR = { origins: [")],
    ]) {
      expect(lista, `${onde} voltou a usar <all_urls>`).not.toContain("<all_urls>");
    }
  });
});

describe("manifest — a página do DevTools mora na raiz", () => {
  it("devtools_page está na raiz, não dentro de src/", () => {
    // chrome.devtools.panels.create() recebe caminhos que a documentação diz
    // serem relativos à raiz da extensão, mas há versões que os resolvem
    // relativos à própria página do DevTools. Com o devtools.html na raiz, as
    // duas leituras coincidem e o painel para de depender dessa aposta.
    //
    // Errar a aposta custa caro: a aba aparece no DevTools e abre em branco.
    expect(manifest.devtools_page).toBe("devtools.html");
    expect(manifest.devtools_page).not.toContain("/");
  });

  it("os caminhos de panels.create() resolvem igual das duas formas", () => {
    const js = fs.readFileSync(path.join(RAIZ, "src/devtools/devtools.js"), "utf8");
    const dirDevtools = path.posix.dirname(manifest.devtools_page);
    for (const m of js.matchAll(/["']([^"']+\.(?:html|png))["']/g)) {
      const rel = m[1];
      const daRaiz = rel;
      const daPagina = path.posix.normalize(path.posix.join(dirDevtools, rel));
      expect(daPagina, `${rel} resolve diferente conforme a interpretação`).toBe(daRaiz);
      expect(fs.existsSync(path.join(RAIZ, rel)), `${rel} não existe`).toBe(true);
    }
  });
});
