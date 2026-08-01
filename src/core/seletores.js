// Geração de seletores para um elemento — o motor da aba Inspecionar.
//
// Lógica pura: recebe um "contexto" serializável, montado pelo agente que roda
// na página, e devolve candidatos de seletor. NÃO toca no DOM. Quem confere se
// cada candidato casa com 1 ou com N elementos é o agente, porque só ele tem a
// página na mão. É essa divisão que torna a heurística testável.
//
// Formato do contexto (montado por src/devtools/agente.js):
//   {
//     cadeia: [alvo, pai, avô, ...]      // cada nó no formato abaixo
//     caminhoShadow: [hostDescritor...]  // do mais externo ao mais interno
//     caminhoFrame:  [frameDescritor...] // idem, para iframes aninhados
//   }
// Cada nó: { tag, id, idUnico, classes[], attrs{}, texto, nth, irmaosMesmaTag }

// Atributos que times de QA colocam de propósito para automação. São os mais
// estáveis que existem: ninguém os muda sem querer, porque só servem para isso.
export const ATRIBUTOS_DE_TESTE = [
  "data-testid", "data-test-id", "data-test", "data-cy",
  "data-qa", "data-automation-id", "data-e2e", "data-ref",
];

// Atributos descritivos: estáveis o bastante, mas podem mudar numa tradução ou
// numa troca de copy. Vêm depois dos de teste, antes de qualquer caminho.
const ATRIBUTOS_DESCRITIVOS = [
  "name", "aria-label", "placeholder", "title", "alt", "for", "href", "role", "type",
];

// Peso de cada estratégia. Número maior = seletor que sobrevive mais tempo a
// um refactor de front. A contagem de matches entra depois, em `classificar`.
const PONTOS = {
  teste: 100,
  id: 90,
  name: 78,
  "aria-label": 72,
  placeholder: 66,
  texto: 60,
  "xpath-atributo": 58,
  link: 56,
  descritivo: 54,
  "css-caminho": 34,
  "xpath-caminho": 30,
  "xpath-absoluto": 8,
};

/**
 * Classe que parece gerada por ferramenta, não escrita por gente.
 * Seletor preso a `css-1a2b3c` quebra no próximo build — não vale ofertar.
 */
export function classeSuspeita(nome) {
  if (!nome || typeof nome !== "string") return true;
  if (nome.length > 30) return true;
  // css-modules, styled-components, emotion, JSS: prefixo + hash.
  if (/^(css|sc|emotion|jss|makeStyles|tw)-[0-9a-z]{4,}$/i.test(nome)) return true;
  // Sufixo hash do CSS Modules ("Botao_primario__a1B2c"). Exige maiúscula E
  // dígito no sufixo, senão pegaríamos BEM legítimo como "card__titulo".
  if (/__(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Z])[A-Za-z0-9]{4,}$/.test(nome)) return true;
  // Qualquer coisa com um bloco hexadecimal longo no meio.
  if (/[0-9a-f]{7,}/i.test(nome)) return true;
  // Escopo de framework: Angular, Vue, Svelte.
  if (/^(ng-|_ngcontent|_nghost|v-|svelte-)/.test(nome)) return true;
  // Estado volátil: some no primeiro clique.
  if (/^(is-|has-|js-)/.test(nome)) return true;
  if (/^(active|selected|focused?|hover|open|closed|show|hide|hidden|disabled|error|loading)$/i.test(nome)) {
    return true;
  }
  return false;
}

/** Um id numérico ou com hash não identifica o elemento amanhã. */
export function idSuspeito(id) {
  if (!id || typeof id !== "string") return true;
  if (/^\d/.test(id)) return true; // id que começa com dígito nem é CSS válido
  if (/[0-9a-f]{8,}/i.test(id)) return true;
  if (/^(ember|react|mui|radix|headlessui|:r)/i.test(id)) return true;
  if (/^[a-z]+[-_]?\d{3,}$/i.test(id)) return true; // input_12345
  return false;
}

/** Escapa um valor para caber dentro de aspas duplas num seletor CSS. */
export function escaparCss(valor) {
  return String(valor).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Literal de string para XPath 1.0, que não tem escape nenhum.
 * Com os dois tipos de aspas no texto, a única saída é concat().
 */
export function literalXpath(valor) {
  const s = String(valor);
  if (!s.includes("'")) return `'${s}'`;
  if (!s.includes('"')) return `"${s}"`;
  const partes = s.split("'").map((p) => `'${p}'`);
  return `concat(${partes.join(`, "'", `)})`;
}

/** Texto curto o bastante para virar seletor sem ficar frágil. */
function textoUtil(texto) {
  if (!texto) return null;
  const limpo = String(texto).replace(/\s+/g, " ").trim();
  if (limpo.length < 2 || limpo.length > 60) return null;
  return limpo;
}

/** Fragmento CSS de um nó: tag + classes estáveis, ou tag:nth-of-type(n). */
function fragmentoCss(no) {
  const boas = (no.classes || []).filter((c) => !classeSuspeita(c));
  if (boas.length) {
    const comClasses = no.tag + boas.slice(0, 2).map((c) => "." + CSS_escapaClasse(c)).join("");
    // A classe só basta se ela realmente distingue este irmão dos outros. Numa
    // grade de campos, `div.campo > input` parece preciso e casa com todos.
    // `irmaosMesmasClasses` indefinido = descritor antigo: mantém o otimismo.
    if (no.irmaosMesmasClasses === undefined || no.irmaosMesmasClasses <= 1) {
      return comClasses;
    }
    return `${comClasses}:nth-of-type(${no.nth})`;
  }
  if (no.irmaosMesmaTag > 1) return `${no.tag}:nth-of-type(${no.nth})`;
  return no.tag;
}

/** Classe com caractere especial precisa de escape no seletor. */
function CSS_escapaClasse(nome) {
  return String(nome).replace(/([^\w-])/g, "\\$1");
}

/** Fragmento XPath de um nó, sempre posicional. */
function fragmentoXpath(no) {
  return no.irmaosMesmaTag > 1 ? `${no.tag}[${no.nth}]` : no.tag;
}

/**
 * Candidatos para um contexto de elemento.
 * @param {object} contexto
 * @returns {Array<{chave,tipo,sintaxe,valor,rotulo,pontos}>}
 */
export function gerarCandidatos(contexto) {
  if (!contexto || !Array.isArray(contexto.cadeia) || !contexto.cadeia.length) return [];
  const cadeia = contexto.cadeia;
  const alvo = cadeia[0];
  const out = [];

  // Dentro de shadow root, XPath simplesmente não existe: document.evaluate()
  // não atravessa a fronteira, e o ShadowRoot do Selenium 4 só aceita CSS —
  // By.xpath ali estoura. Ofertar seria entregar um seletor que não roda.
  const dentroDeShadow =
    Array.isArray(contexto.caminhoShadow) && contexto.caminhoShadow.length > 0;

  const add = (tipo, sintaxe, valor, rotulo, pontos) => {
    if (!valor) return;
    if (sintaxe === "xpath" && dentroDeShadow) return;
    if (out.some((c) => c.valor === valor && c.sintaxe === sintaxe)) return;
    out.push({ chave: `${sintaxe}:${valor}`, tipo, sintaxe, valor, rotulo, pontos });
  };
  const attrs = alvo.attrs || {};

  // --- 1. Atributos de teste: o melhor que pode acontecer -------------------
  for (const nome of ATRIBUTOS_DE_TESTE) {
    const v = attrs[nome];
    if (!v) continue;
    add("teste", "css", `[${nome}="${escaparCss(v)}"]`, nome, PONTOS.teste);
    add("teste", "xpath", `//*[@${nome}=${literalXpath(v)}]`, `${nome} (XPath)`, PONTOS.teste - 2);
  }

  // --- 2. id -----------------------------------------------------------------
  if (alvo.id) {
    const penalidade = idSuspeito(alvo.id) ? 45 : 0;
    add("id", "css", `#${CSS_escapaClasse(alvo.id)}`, "id", PONTOS.id - penalidade);
    add("id", "xpath", `//*[@id=${literalXpath(alvo.id)}]`, "id (XPath)", PONTOS.id - penalidade - 2);
  }

  // --- 3. Atributos descritivos ---------------------------------------------
  for (const nome of ATRIBUTOS_DESCRITIVOS) {
    const v = attrs[nome];
    if (!v || v.length > 80) continue;
    // `type` sozinho quase nunca é único; só entra combinado com a tag.
    const base = nome === "type" || nome === "role" ? alvo.tag : "";
    const pontos = PONTOS[nome] !== undefined ? PONTOS[nome] : PONTOS.descritivo;
    add(nome, "css", `${base}[${nome}="${escaparCss(v)}"]`, nome, pontos);
    add(
      nome === "name" ? "name" : "xpath-atributo",
      "xpath",
      `//${base || "*"}[@${nome}=${literalXpath(v)}]`,
      `${nome} (XPath)`,
      pontos - 4
    );
  }

  // --- 4. Texto visível -------------------------------------------------------
  const texto = textoUtil(alvo.texto);
  if (texto) {
    add("texto", "xpath", `//${alvo.tag}[normalize-space()=${literalXpath(texto)}]`,
        "texto exato", PONTOS.texto);
    add("texto", "xpath", `//${alvo.tag}[contains(normalize-space(),${literalXpath(texto)})]`,
        "texto contém", PONTOS.texto - 6);
    if (alvo.tag === "a") {
      add("link", "texto-link", texto, "link text", PONTOS.link);
    }
  }

  // --- 5. Caminho CSS, cortado no ancestral identificável ---------------------
  const partesCss = [];
  const partesXpath = [];
  let ancoraCss = null;
  for (let i = 0; i < cadeia.length; i++) {
    const no = cadeia[i];
    // Um id único acima do alvo encurta o caminho inteiro — e o encurtamento é
    // o que separa um seletor legível de um monstro de 12 níveis.
    if (i > 0 && no.id && no.idUnico && !idSuspeito(no.id)) {
      ancoraCss = `#${CSS_escapaClasse(no.id)}`;
      break;
    }
    partesCss.unshift(fragmentoCss(no));
    partesXpath.unshift(fragmentoXpath(no));
    if (no.tag === "body" || no.tag === "html") break;
  }
  if (partesCss.length) {
    const caminho = (ancoraCss ? ancoraCss + " > " : "") + partesCss.join(" > ");
    add("css-caminho", "css", caminho, "caminho CSS", PONTOS["css-caminho"]);
  }
  if (partesXpath.length) {
    const rel = "//" + partesXpath.join("/");
    add("xpath-caminho", "xpath", rel, "caminho XPath", PONTOS["xpath-caminho"]);
  }

  // --- 6. XPath absoluto: último recurso, mas sempre funciona hoje ------------
  const absoluto = "/" + cadeia.slice().reverse().map(fragmentoXpath).join("/");
  add("xpath-absoluto", "xpath", absoluto, "XPath absoluto", PONTOS["xpath-absoluto"]);

  return out.sort((a, b) => b.pontos - a.pontos);
}

/**
 * Reordena os candidatos com o que o agente descobriu na página.
 * Casar com exatamente 1 elemento vale mais do que qualquer heurística: um
 * seletor bonito que pega 4 elementos é um teste que falha amanhã.
 *
 * @param {Array} candidatos - saída de gerarCandidatos
 * @param {Record<string, number>} contagens - chave do candidato → nº de matches
 */
export function classificar(candidatos, contagens = {}) {
  return candidatos
    .map((c) => {
      const n = contagens[c.chave];
      const conhecido = typeof n === "number";
      const unico = conhecido && n === 1;
      let pontos = c.pontos;
      if (conhecido) {
        if (n === 1) pontos += 200;
        else if (n === 0) pontos -= 500; // não encontra nada: inútil
        else pontos -= 40 + Math.min(n, 20); // ambíguo, mas ainda pode servir
      }
      return { ...c, matches: conhecido ? n : null, unico, pontosFinais: pontos };
    })
    .sort((a, b) => b.pontosFinais - a.pontosFinais);
}

/** O melhor candidato: o primeiro único, ou o mais bem pontuado que exista. */
export function melhorCandidato(candidatos, contagens = {}) {
  const ordenados = classificar(candidatos, contagens);
  return ordenados.find((c) => c.unico) || ordenados[0] || null;
}
