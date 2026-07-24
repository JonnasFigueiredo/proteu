// Strings de fronteira Unicode — feitas para quebrar contagem, normalização,
// truncamento e comparação ingênuos. Conjunto estático (não usa rng): a graça
// é ter sempre os mesmos casos canônicos à mão.

export const FRONTEIRAS_UNICODE = [
  {
    rotulo: "emoji ZWJ (família)",
    valor: "👩‍👩‍👧‍👦",
    nota: "1 grafema, 7 code points, 11 code units, 25 bytes",
  },
  {
    rotulo: "emoji + tom de pele",
    valor: "👍🏾",
    nota: "modificador Fitzpatrick; 1 grafema, 4 code units",
  },
  {
    rotulo: "zero-width space",
    valor: "in​visível",
    nota: "U+200B no meio: parece 'invisível' mas tem char extra",
  },
  {
    rotulo: "zero-width joiner solto",
    valor: "a‍b",
    nota: "ZWJ sem contexto de emoji",
  },
  {
    rotulo: "RTL override",
    valor: "abc‮def",
    nota: "U+202E inverte a renderização do que vem depois",
  },
  {
    rotulo: "combining (Zalgo leve)",
    valor: "ẹ́̀̂̃̈",
    nota: "1 base + 6 marcas combinantes = 1 grafema, 7 code points",
  },
  {
    rotulo: "NFD (decomposto)",
    valor: "café",
    nota: "'é' como e + acento; != 'café' NFC byte a byte",
  },
  {
    rotulo: "homoglifos cirílicos",
    valor: "pауpal",
    nota: "'а' e 'у' cirílicos passando por 'paypal'",
  },
  {
    rotulo: "surrogate solto",
    valor: "a\uD800b",
    nota: "metade de par surrogate: quebra encode/serialização",
  },
  {
    rotulo: "não-caractere",
    valor: "x￾y",
    nota: "U+FFFE é permanentemente reservado (non-character)",
  },
  {
    rotulo: "BOM no meio",
    valor: "a﻿b",
    nota: "U+FEFF (BOM) inesperado dentro do texto",
  },
];

/** Só os valores (para uso rápido em listas). */
export function valoresUnicode() {
  return FRONTEIRAS_UNICODE.map((i) => i.valor);
}
