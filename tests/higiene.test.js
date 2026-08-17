// Higiene do código — o que a revisão manual encontrou, agora automatizado.
//
// A limpeza de código morto envelhece: some uma aba, sobram estilos e chaves
// de tradução órfãos. Estes testes falham quando isso volta a acontecer, em
// vez de depender de alguém reparar meses depois.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");

const popupJs = ler("src/popup/popup.js");
const popupHtml = ler("src/popup/popup.html");
const popupCss = ler("src/popup/popup.css");
const i18nJs = ler("src/core/i18n.js");
const usoUI = popupJs + "\n" + popupHtml;

/** Todos os .js de src/ e tests/, para varreduras de uso. */
function arquivosJs(dir, acc = []) {
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) arquivosJs(rel, acc);
    else if (e.name.endsWith(".js")) acc.push(rel);
  }
  return acc;
}

/** Remove comentários — senão uma menção em prosa conta como uso de código. */
function semComentarios(txt) {
  return txt.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Esvazia o conteúdo de todas as strings, preservando as aspas.
 *
 * Os geradores de script carregam código Java e Python como dado — e a linha
 * `import org.openqa.selenium.chrome.ChromeDriver;` contém "chrome." sem ser
 * chamada de API nenhuma. Pelo mesmo motivo que a checagem já ignora
 * comentários, ela precisa ignorar o miolo das strings.
 */
function semLiterais(txt) {
  let saida = "";
  let aspa = null;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (aspa) {
      if (c === "\\") {
        i++; // pula o caractere escapado
        continue;
      }
      if (c === aspa) {
        aspa = null;
        saida += c;
        continue;
      }
      if (c === "\n") saida += c; // mantém as linhas alinhadas
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      aspa = c;
      saida += c;
      continue;
    }
    saida += c;
  }
  return saida;
}

// Chaves de tradução também são referidas fora do popup: `rotuloKey` nos
// registros de país, `tituloKey` nas famílias de casos-limite, e os rótulos do
// menu de contexto, que só o service worker conhece.
const usoChaves =
  ler("src/background/service-worker.js") + "\n" +
  usoUI + "\n" + arquivosJs("src/core").filter((f) => !f.endsWith("i18n.js")).map(ler).join("\n");

describe("higiene — traduções", () => {
  const blocoPt = i18nJs.slice(i18nJs.indexOf("  pt: {"), i18nJs.indexOf("  es: {"));
  const chaves = [...blocoPt.matchAll(/^\s{4}([a-zA-Z_][\w]*):/gm)].map((m) => m[1]);

  it("toda chave de tradução é usada em algum lugar", () => {
    // Chaves montadas por template (`pais_${codigo}`, `cat_${categoria}`) são
    // verificadas pelo prefixo, não pelo nome inteiro.
    const PREFIXOS_DINAMICOS = ["pais_", "cat_", "doc_", "tema_", "motivo_"];
    const orfas = chaves.filter((k) => {
      if (PREFIXOS_DINAMICOS.some((p) => k.startsWith(p))) return false;
      return !new RegExp(`["'\`]${k}["'\`]|\\b${k}\\b`).test(usoChaves);
    });
    expect(orfas, `chaves sem uso: ${orfas.join(", ")}`).toEqual([]);
  });

  it("toda chave usada no HTML/JS existe nas traduções", () => {
    const usadas = new Set();
    for (const m of popupHtml.matchAll(/data-i18n(?:-title|-aria|-ph)?="([\w]+)"/g)) {
      usadas.add(m[1]);
    }
    const faltando = [...usadas].filter((k) => !chaves.includes(k));
    expect(faltando, `chaves inexistentes: ${faltando.join(", ")}`).toEqual([]);
  });
});

describe("higiene — CSS", () => {
  it("não há classe de CSS sem uso na interface", () => {
    // Só classes "de primeiro nível" (o seletor começa na classe); variantes
    // como .x.y e pseudo-estados vêm junto do bloco principal.
    const classes = new Set(
      [...popupCss.matchAll(/^\.([a-z][\w-]*)/gm)].map((m) => m[1])
    );
    const orfas = [...classes].filter(
      (c) => !new RegExp(`["'\\s.]${c.replace(/-/g, "\\-")}["'\\s.:]`).test(usoUI)
    );
    expect(orfas, `classes sem uso: ${orfas.join(", ")}`).toEqual([]);
  });

  it("todo id estilizado existe no HTML ou é criado no JS", () => {
    const ids = new Set([...popupCss.matchAll(/^#([a-z][\w-]*)/gm)].map((m) => m[1]));
    const orfos = [...ids].filter((i) => !usoUI.includes(i));
    expect(orfos, `ids sem uso: ${orfos.join(", ")}`).toEqual([]);
  });
});

describe("higiene — o JS só busca elementos que existem", () => {
  // Bug real que este teste teria pego: o popup consultava `#secao-historico`,
  // um id que não existe. `null.hidden` lançava dentro de uma função async, e a
  // promise rejeitada levava junto o que vinha depois — o perfil parava de
  // renderizar. Erro invisível no console e nenhum teste falhava.
  // Comentários citam seletores ao explicar o histórico — só o código conta.
  const codigo = semComentarios(popupJs);
  const idsNoHtml = new Set([...popupHtml.matchAll(/\bid="([\w-]+)"/g)].map((m) => m[1]));
  const idsCriadosNoJs = new Set(
    [...codigo.matchAll(/\.id\s*=\s*["'`]([\w-]+)["'`]/g)].map((m) => m[1])
  );

  it('todo $("#id") do popup existe no HTML ou é criado em runtime', () => {
    const buscados = [...codigo.matchAll(/\$\(\s*["'`]#([\w-]+)["'`]\s*\)/g)].map((m) => m[1]);
    const inexistentes = [...new Set(buscados)].filter(
      (id) => !idsNoHtml.has(id) && !idsCriadosNoJs.has(id)
    );
    expect(inexistentes, `ids inexistentes: ${inexistentes.join(", ")}`).toEqual([]);
  });

  it("todo querySelector por id também aponta para algo real", () => {
    const buscados = [
      ...codigo.matchAll(/querySelector(?:All)?\(\s*["'`]#([\w-]+)/g),
    ].map((m) => m[1]);
    const inexistentes = [...new Set(buscados)].filter(
      (id) => !idsNoHtml.has(id) && !idsCriadosNoJs.has(id)
    );
    expect(inexistentes, `ids inexistentes: ${inexistentes.join(", ")}`).toEqual([]);
  });
});

describe("higiene — JavaScript", () => {
  it("nenhum import do popup fica sem uso", () => {
    const corpo = popupJs.replace(/^import[\s\S]*?from\s+"[^"]+";$/gm, "");
    const semUso = [];
    for (const m of popupJs.matchAll(/import\s*\{([^}]+)\}\s*from\s*"([^"]+)"/g)) {
      for (const nome of m[1].split(",").map((x) => x.trim()).filter(Boolean)) {
        if (!new RegExp(`\\b${nome}\\b`).test(corpo)) semUso.push(nome);
      }
    }
    expect(semUso, `imports sem uso: ${semUso.join(", ")}`).toEqual([]);
  });

  it("todo export de core/ é consumido em algum lugar", () => {
    const arquivos = [...arquivosJs("src"), ...arquivosJs("tests")];
    const conteudo = arquivos.map((f) => ({ f, txt: ler(f) }));
    const orfaos = [];
    for (const { f, txt } of conteudo.filter((x) => x.f.includes("core/"))) {
      for (const m of txt.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+([\w$]+)/g)) {
        const usado = conteudo.some(
          (o) => o.f !== f && new RegExp(`\\b${m[1]}\\b`).test(o.txt)
        );
        if (!usado) orfaos.push(`${m[1]} (${f})`);
      }
    }
    expect(orfaos, `exports sem consumidor: ${orfaos.join(", ")}`).toEqual([]);
  });

  it("o core não toca em DOM nem em chrome.* (precisa rodar no Node)", () => {
    // É a regra que mantém 100% do core testável sem navegador. Comentários e
    // strings podem citar chrome.storage; só o código executável conta.
    for (const f of arquivosJs("src/core")) {
      const codigo = semLiterais(semComentarios(ler(f)));
      expect(
        /\bdocument\.|\bwindow\.|\bchrome\./.test(codigo),
        `${f} usa API de navegador`
      ).toBe(false);
    }
  });
});

describe("higiene — manifest", () => {
  const manifest = JSON.parse(ler("manifest.json"));

  it("mantém exatamente as 4 permissões acordadas", () => {
    expect(new Set(manifest.permissions)).toEqual(
      new Set(["contextMenus", "storage", "activeTab", "scripting"])
    );
  });

  it("não pede host permissions amplas", () => {
    expect(manifest.host_permissions ?? []).toEqual([]);
  });

  it("é Manifest V3 e a versão está no formato x.y.z", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("popup — mudar a origem dos dados tem que aparecer na tela", () => {
  // Bug real, relatado como "preencho a seed e nada acontece": `aoMudarSeed`
  // gravava a seed nova e zerava o contador, mas nunca regerava a persona. A
  // tela continuava na pessoa anterior, e a funcionalidade que dá nome ao
  // projeto — reproduzir massa a partir da seed — ficava inutilizável pela UI.
  //
  // O invariante é o mesmo para país e seed: quem reinicia a sequência
  // determinística precisa mostrar o resultado. Um handler que só mexe no
  // storage é indistinguível de um botão quebrado.

  /**
   * Tira comentários do código.
   *
   * Sem isto o teste casa com chamada comentada e passa a mentir: foi o que
   * aconteceu na primeira versão daqui, verificada comentando a regeração —
   * o bug voltou e a suíte continuou verde.
   */
  const semComentarios = (fonte) =>
    fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  /** Corpo da função nomeada, do `async function nome(` até a chave que fecha. */
  const corpoDe = (nome) => {
    const inicio = popupJs.indexOf(`async function ${nome}(`);
    if (inicio === -1) return null;
    let i = popupJs.indexOf("{", inicio);
    let profundidade = 0;
    for (let j = i; j < popupJs.length; j++) {
      if (popupJs[j] === "{") profundidade++;
      else if (popupJs[j] === "}" && --profundidade === 0) {
        return semComentarios(popupJs.slice(inicio, j + 1));
      }
    }
    return null;
  };

  it("toda função que zera o contador também regera a persona", () => {
    const nomes = [...popupJs.matchAll(/async function (\w+)\s*\(/g)].map((m) => m[1]);
    const culpadas = [];

    for (const nome of nomes) {
      const corpo = corpoDe(nome);
      if (!corpo || !/c\.contador\s*=\s*0/.test(corpo)) continue;
      // Regerar pode ser direto (aoNovaPersona) ou delegado a um helper que o
      // faça — o que não vale é terminar no storage e não tocar na tela.
      if (!/aoNovaPersona\(\)|aplicarSeed\(/.test(corpo)) culpadas.push(nome);
    }

    expect(culpadas, `reinicia a sequência sem mostrar o resultado: ${culpadas.join(", ")}`)
      .toEqual([]);
  });

  it("os dois caminhos de seed passam pelo mesmo lugar", () => {
    // Digitar a seed e sortear uma nova têm que se comportar igual; foi a
    // duplicação entre os dois que deixou o bug passar em só um deles.
    for (const handler of ["aoMudarSeed", "aoNovaSeed"]) {
      const corpo = corpoDe(handler);
      expect(corpo, `${handler} não encontrada`).toBeTruthy();
      expect(corpo, `${handler} deveria delegar para aplicarSeed`).toMatch(/aplicarSeed\(/);
    }
  });

  it("aplicarSeed grava a seed, zera o contador e renderiza", () => {
    const corpo = corpoDe("aplicarSeed");
    expect(corpo).toBeTruthy();
    expect(corpo, "não grava a seed").toMatch(/c\.seed\s*=/);
    expect(corpo, "não reinicia a sequência").toMatch(/c\.contador\s*=\s*0/);
    expect(corpo, "não mostra o resultado").toMatch(/aoNovaPersona\(\)/);
  });
});
