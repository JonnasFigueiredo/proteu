// Leitura do DOM para geração de seletores.
//
// Fica fora de core/ porque toca no DOM — core/ tem que rodar no Node puro.
// Aqui é o contrário: são só as perguntas que exigem a página aberta ("quantos
// elementos esse seletor casa?", "quais ancestrais esse elemento tem?").
// A política de qual seletor é melhor continua em core/seletores.js.
//
// Dois consumidores, dois jeitos de carregar:
//   - src/content/seletor.js  → import() dinâmico (mundo isolado do content script)
//   - src/devtools/agente.js  → concatenação, com os import/export removidos
// Por isso todo import e todo export precisam ficar no início da linha.

import { ATRIBUTOS_DE_TESTE, ATRIBUTOS_DESCRITIVOS } from "../core/seletores.js";

// Lemos exatamente o que o motor sabe transformar em seletor, mais `value`,
// que ele não usa (muda com o que o usuário digita) mas ajuda a descrever o
// elemento na interface.
const ATRIBUTOS_LIDOS = [...ATRIBUTOS_DE_TESTE, ...ATRIBUTOS_DESCRITIVOS, "value"];

/** Escapa um valor para caber dentro de aspas duplas num seletor. */
export function cssEscapa(v) {
  return String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Elemento real de um evento, atravessando Shadow DOM aberto. */
export function alvoDoEvento(ev) {
  const caminho = ev.composedPath ? ev.composedPath() : [];
  return caminho.length ? caminho[0] : ev.target;
}

/**
 * Texto próprio do elemento. Só vale para tags que costumam carregar rótulo, e
 * só quando o elemento não é contêiner — o texto de um contêiner é a soma de
 * outras coisas, e um seletor por ele acaba pegando o pai errado.
 */
export function textoProprio(el) {
  const tags = new Set([
    "a", "button", "label", "option", "h1", "h2", "h3", "h4",
    "span", "li", "td", "th", "legend", "summary",
  ]);
  if (!el.tagName || !tags.has(el.tagName.toLowerCase())) return null;
  if (el.children.length > 2) return null;
  const t = (el.textContent || "").replace(/\s+/g, " ").trim();
  return t && t.length <= 60 ? t : null;
}

/** Descreve um nó no formato que core/seletores.js espera. */
export function descreverNo(el) {
  const raiz = el.getRootNode ? el.getRootNode() : document;
  const attrs = {};
  for (const nome of ATRIBUTOS_LIDOS) {
    const v = el.getAttribute && el.getAttribute(nome);
    if (v) attrs[nome] = v;
  }
  let nth = 1;
  let irmaosMesmaTag = 1;
  let irmaosMesmasClasses = 1;
  if (el.parentElement) {
    const irmaos = Array.from(el.parentElement.children).filter(
      (c) => c.tagName === el.tagName
    );
    irmaosMesmaTag = irmaos.length;
    nth = irmaos.indexOf(el) + 1;
    // Quantos irmãos a classe NÃO distingue. Sem esse número, um caminho como
    // `div.campo > input` parece preciso e casa com os oito campos da seção.
    const minhas = Array.from(el.classList || []);
    irmaosMesmasClasses = minhas.length
      ? irmaos.filter((c) => minhas.every((k) => c.classList.contains(k))).length
      : irmaosMesmaTag;
  }
  let idUnico = false;
  if (el.id) {
    try {
      idUnico = raiz.querySelectorAll(`[id="${cssEscapa(el.id)}"]`).length === 1;
    } catch {
      idUnico = false;
    }
  }
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    idUnico,
    classes: Array.from(el.classList || []),
    attrs,
    texto: textoProprio(el),
    nth,
    irmaosMesmaTag,
    irmaosMesmasClasses,
  };
}

/** Seletor curto de um host de shadow root ou de um iframe. */
export function seletorDoHost(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const tag = el.tagName.toLowerCase();
  const pai = el.parentElement;
  if (!pai) return tag;
  const irmaos = Array.from(pai.children).filter((c) => c.tagName === el.tagName);
  if (irmaos.length === 1) return tag;
  return `${tag}:nth-of-type(${irmaos.indexOf(el) + 1})`;
}

/**
 * Contexto completo do elemento: a cadeia de ancestrais até a raiz do seu
 * documento, mais os saltos de shadow root e de iframe que um driver vai
 * precisar fazer para alcançá-lo.
 */
export function contextoDe(el) {
  const cadeia = [];
  const caminhoShadow = [];
  const caminhoFrame = [];

  // A cadeia só pode conter nós da raiz do próprio alvo. Atravessá-la produz
  // seletor que não resolve: um XPath absoluto montado com o host do shadow no
  // meio aponta para o documento de fora, e num iframe a cadeia chega a ter
  // body/html duas vezes. As travessias ficam registradas à parte, que é
  // exatamente o que o driver precisa para saltar até lá.
  let naRaizDoAlvo = true;

  let atual = el;
  let guarda = 0;
  while (atual && atual.nodeType === 1 && guarda++ < 200) {
    if (naRaizDoAlvo) cadeia.push(descreverNo(atual));
    if (atual.parentElement) {
      atual = atual.parentElement;
      continue;
    }
    // Sem pai: ou o documento acabou, ou estamos na borda de um shadow root
    // ou de um iframe. Continuamos subindo só para registrar as travessias que
    // faltam — casos aninhados (shadow dentro de iframe) dependem disso.
    const raiz = atual.getRootNode ? atual.getRootNode() : null;
    if (raiz && raiz.host) {
      caminhoShadow.unshift(seletorDoHost(raiz.host));
      atual = raiz.host;
      naRaizDoAlvo = false;
      continue;
    }
    // `raiz !== document` é o que impede a cadeia de sair do documento em que
    // este código está rodando. Sem essa guarda, o content script do clique
    // direito — que roda NO frame clicado — montaria um caminho de iframe
    // relativo ao documento de cima, e `resolverRaiz` procuraria esse iframe
    // dentro do próprio frame, onde ele não existe: toda contagem virava
    // "sem acesso" e todo seletor saía marcado como ambíguo.
    if (raiz && raiz !== document && raiz.defaultView && raiz.defaultView.frameElement) {
      const quadro = raiz.defaultView.frameElement;
      caminhoFrame.unshift(seletorDoHost(quadro));
      atual = quadro;
      naRaizDoAlvo = false;
      continue;
    }
    break;
  }
  return { cadeia, caminhoShadow, caminhoFrame };
}

/** Uma linha que descreve o elemento, no estilo do painel Elements. */
export function resumir(no) {
  let s = no.tag;
  if (no.id) s += "#" + no.id;
  const classes = (no.classes || []).slice(0, 3);
  if (classes.length) s += "." + classes.join(".");
  const extras = [];
  if (no.attrs.type) extras.push(`type=${no.attrs.type}`);
  if (no.attrs.name) extras.push(`name=${no.attrs.name}`);
  if (extras.length) s += ` [${extras.join(" ")}]`;
  return s;
}

/** Resolve a raiz de busca a partir das cadeias de shadow e iframe. */
export function resolverRaiz(caminhoShadow = [], caminhoFrame = []) {
  let raiz = document;
  for (const sel of caminhoFrame) {
    const quadro = raiz.querySelector(sel);
    if (!quadro) return null;
    try {
      if (!quadro.contentDocument) return null; // outra origem: sem acesso
      raiz = quadro.contentDocument;
    } catch {
      return null;
    }
  }
  for (const sel of caminhoShadow) {
    const host = raiz.querySelector(sel);
    if (!host || !host.shadowRoot) return null;
    raiz = host.shadowRoot;
  }
  return raiz;
}

/** Todos os elementos que um seletor casa, no contexto informado. */
export function acharTodos(valor, sintaxe, caminhoShadow, caminhoFrame) {
  const raiz = resolverRaiz(caminhoShadow, caminhoFrame);
  if (!raiz) return [];
  try {
    if (sintaxe === "xpath") {
      const doc = raiz.ownerDocument || raiz;
      const r = doc.evaluate(valor, raiz.nodeType === 9 ? raiz : doc, null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return Array.from({ length: r.snapshotLength }, (_, i) => r.snapshotItem(i));
    }
    if (sintaxe === "texto-link") {
      return Array.from(raiz.querySelectorAll("a")).filter(
        (a) => (a.textContent || "").replace(/\s+/g, " ").trim() === valor
      );
    }
    return Array.from(raiz.querySelectorAll(valor));
  } catch {
    return [];
  }
}

/**
 * Quantos elementos um seletor casa.
 * @returns {number} n >= 0, ou -1 (seletor inválido), ou -2 (contexto inacessível)
 */
export function contar(valor, sintaxe, caminhoShadow, caminhoFrame) {
  const raiz = resolverRaiz(caminhoShadow, caminhoFrame);
  if (!raiz) return -2;
  try {
    if (sintaxe === "xpath") {
      const doc = raiz.ownerDocument || raiz;
      const r = doc.evaluate(valor, raiz.nodeType === 9 ? raiz : doc, null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return r.snapshotLength;
    }
    if (sintaxe === "texto-link") {
      let n = 0;
      for (const a of raiz.querySelectorAll("a")) {
        if ((a.textContent || "").replace(/\s+/g, " ").trim() === valor) n++;
      }
      return n;
    }
    return raiz.querySelectorAll(valor).length;
  } catch {
    return -1;
  }
}

/** Conta os matches de uma lista de candidatos, devolvendo o mapa por chave. */
export function contarCandidatos(candidatos, caminhoShadow, caminhoFrame) {
  const contagens = {};
  for (const c of candidatos) {
    contagens[c.chave] = contar(c.valor, c.sintaxe, caminhoShadow, caminhoFrame);
  }
  return contagens;
}
