// Detecção de campo → set de fronteira.
//
// Recebe o descritor lido pelo content script (atributos do campo focado) e
// devolve valores de fronteira específicos daquele campo, em vez de dado
// genérico. Lógica pura: sem DOM, sem chrome.*, determinística (não usa rng —
// fronteira é derivada dos atributos, não sorteada).
//
// Cada item do set: { rotulo, valor } — o rótulo vira o chip na UI.

/** Preenchimento previsível para strings de tamanho exato. */
function stringDeTamanho(n) {
  return "x".repeat(n);
}

/** Converte atributo numérico (string|null) em número, ou null. */
function numero(attr) {
  if (attr === null || attr === undefined || attr === "") return null;
  const n = Number(attr);
  return Number.isFinite(n) ? n : null;
}

/** Soma dias a uma data ISO (YYYY-MM-DD) sem depender de fuso. */
function somarDiasIso(iso, dias) {
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return null;
  const data = new Date(Date.UTC(a, m - 1, d));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

// Strings de fronteira Unicode — pequenas o bastante para chips, escolhidas
// por quebrarem contagem/normalização ingênuas:
//   - emoji com modificador ZWJ (1 grafema, vários code points)
//   - zero-width space no meio (invisível a olho nu)
//   - RTL override (inverte a renderização do que vem depois)
//   - homoglifos cirílicos (parecem latinos, não são)
const FRONTEIRA_UNICODE = [
  { rotulo: "emoji ZWJ", valor: "a👩‍👩‍👧‍👦b" },
  { rotulo: "zero-width", valor: "ab​cd" },
  { rotulo: "RTL override", valor: "abc‮def" },
  { rotulo: "homoglifos", valor: "раypal" }, // 'р' e 'а' são cirílicos
];

// E-mails que passam em regexes comuns de front mas costumam quebrar no
// servidor (tamanho, aspas, plus-addressing, IDN).
const EMAILS_TRAICOEIROS = [
  { rotulo: "e-mail +tag", valor: "usuario+tag@example.com" },
  { rotulo: "e-mail c/ aspas", valor: '"nome sobrenome"@example.com' },
  { rotulo: "local 64 chars", valor: `${"a".repeat(64)}@example.com` },
  { rotulo: "domínio IDN", valor: "usuario@exãmple.com" },
  { rotulo: "subdomínio-hífen", valor: "u@sub-dominio.example.com" },
];

/**
 * Gera o set de fronteira para um descritor de campo.
 * @param {object|null} descritor - saída de DETECTAR do content script
 * @returns {Array<{rotulo: string, valor: string}>}
 */
export function gerarSetFronteira(descritor) {
  if (!descritor || typeof descritor !== "object") return [];
  const itens = [];
  const tipo = (descritor.type || "").toLowerCase();

  // --- required: o primeiro teste é sempre "e se ficar vazio?" -------------
  if (descritor.required) {
    itens.push({ rotulo: "vazio", valor: "" });
    itens.push({ rotulo: "só espaços", valor: "   " });
  }

  // --- maxlength / minlength ------------------------------------------------
  const maxlen = numero(descritor.maxlength);
  if (maxlen !== null && maxlen > 0) {
    itens.push({ rotulo: `${maxlen - 1} chars`, valor: stringDeTamanho(maxlen - 1) });
    itens.push({ rotulo: `${maxlen} chars (limite)`, valor: stringDeTamanho(maxlen) });
    itens.push({ rotulo: `${maxlen + 1} chars (estoura)`, valor: stringDeTamanho(maxlen + 1) });
  }
  const minlen = numero(descritor.minlength);
  if (minlen !== null && minlen > 0) {
    itens.push({ rotulo: `${minlen} chars (mínimo)`, valor: stringDeTamanho(minlen) });
    if (minlen > 1) {
      itens.push({ rotulo: `${minlen - 1} chars (abaixo)`, valor: stringDeTamanho(minlen - 1) });
    }
  }

  // --- number / range -------------------------------------------------------
  if (tipo === "number" || tipo === "range" || descritor.inputmode === "numeric") {
    const max = numero(descritor.max);
    const min = numero(descritor.min);
    if (max !== null) {
      itens.push({ rotulo: `máx (${max})`, valor: String(max) });
      itens.push({ rotulo: `máx+1 (${max + 1})`, valor: String(max + 1) });
    }
    if (min !== null) {
      itens.push({ rotulo: `mín (${min})`, valor: String(min) });
      itens.push({ rotulo: `mín−1 (${min - 1})`, valor: String(min - 1) });
    }
    itens.push({ rotulo: "-1", valor: "-1" });
    itens.push({ rotulo: "0", valor: "0" });
    itens.push({ rotulo: "1e999 (Infinity)", valor: "1e999" });
    itens.push({ rotulo: "NaN", valor: "NaN" });
    itens.push({ rotulo: "decimal", valor: "0.1" });
  }

  // --- date ------------------------------------------------------------------
  if (tipo === "date") {
    const max = descritor.max;
    const min = descritor.min;
    if (max) {
      itens.push({ rotulo: `máx (${max})`, valor: max });
      const aposMax = somarDiasIso(max, 1);
      if (aposMax) itens.push({ rotulo: "máx+1 dia", valor: aposMax });
    }
    if (min) {
      itens.push({ rotulo: `mín (${min})`, valor: min });
      const antesMin = somarDiasIso(min, -1);
      if (antesMin) itens.push({ rotulo: "mín−1 dia", valor: antesMin });
    }
    itens.push({ rotulo: "29/fev bissexto", valor: "2024-02-29" });
    itens.push({ rotulo: "29/fev inválido", valor: "2023-02-29" });
    itens.push({ rotulo: "limite inferior", valor: "0001-01-01" });
    itens.push({ rotulo: "limite superior", valor: "9999-12-31" });
  }

  // --- e-mail (type ou pattern com @) ----------------------------------------
  const pattern = descritor.pattern || "";
  if (tipo === "email" || pattern.includes("@")) {
    itens.push(...EMAILS_TRAICOEIROS);
  }

  // --- url ---------------------------------------------------------------------
  if (tipo === "url") {
    itens.push({ rotulo: "sem protocolo", valor: "www.example.com" });
    itens.push({ rotulo: "com credenciais", valor: "https://user:pass@example.com" });
    itens.push({ rotulo: "IDN", valor: "https://exãmple.com" });
    itens.push({ rotulo: "porta alta", valor: "https://example.com:65536" });
  }

  // --- texto genérico: fronteiras Unicode -------------------------------------
  const ehTextoLivre =
    tipo === "" || tipo === "text" || tipo === "search" || tipo === "textarea" ||
    descritor.tag === "textarea" || descritor.contenteditable;
  if (ehTextoLivre) {
    itens.push(...FRONTEIRA_UNICODE);
  }

  // Dedup por valor, preservando a ordem (o primeiro rótulo vence).
  const vistos = new Set();
  return itens.filter((i) => {
    if (vistos.has(i.valor)) return false;
    vistos.add(i.valor);
    return true;
  });
}
