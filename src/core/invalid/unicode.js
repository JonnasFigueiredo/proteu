// Strings de fronteira Unicode — feitas para quebrar contagem, normalização,
// truncamento e comparação ingênuos. Conjunto estático (não usa rng): a graça
// é ter sempre os mesmos casos canônicos à mão.
//
// Cada caso: { rotulo, valor, porque (o bug que expõe), tags }.

export const FRONTEIRAS_UNICODE = [
  {
    rotulo: "emoji ZWJ (família)",
    valor: "👩‍👩‍👧‍👦",
    porque: "1 grafema para o olho, mas 7 code points e 25 bytes — estoura maxlength e trunca no meio do emoji.",
    tags: ["contagem", "truncamento"],
  },
  {
    rotulo: "emoji + tom de pele",
    valor: "👍🏾",
    porque: "Modificador Fitzpatrick: 1 grafema formado por 2 code points.",
    tags: ["contagem"],
  },
  {
    rotulo: "zero-width space",
    valor: "in​visível",
    porque: "U+200B no meio: parece 'invisível' mas tem um caractere extra — quebra busca e deduplicação.",
    tags: ["invisível", "comparação"],
  },
  {
    rotulo: "zero-width joiner solto",
    valor: "a‍b",
    porque: "ZWJ (U+200D) sem contexto de emoji — passa despercebido e altera o valor.",
    tags: ["invisível"],
  },
  {
    rotulo: "RTL override",
    valor: "abc‮def",
    porque: "U+202E inverte a renderização do que vem depois — mascara extensão de arquivo (ex.: 'foto‮gpj.exe').",
    tags: ["exibição", "segurança"],
  },
  {
    rotulo: "combining (Zalgo leve)",
    valor: "ẹ́̀̂̃̈",
    porque: "1 base + 6 marcas combinantes = 1 grafema em 7 code points — quebra layout e limites.",
    tags: ["contagem", "exibição"],
  },
  {
    rotulo: "NFD (decomposto)",
    valor: "café",
    porque: "'é' como e + acento (NFD): diferente de 'café' NFC byte a byte — quebra busca, dedupe e chave única.",
    tags: ["normalização", "comparação"],
  },
  {
    rotulo: "homóglifos cirílicos",
    valor: "pауpal",
    porque: "'а' e 'у' cirílicos imitam 'paypal' — testa anti-spoofing e filtros de nome.",
    tags: ["segurança", "comparação"],
  },
  {
    rotulo: "surrogate solto",
    valor: "a\uD800b",
    porque: "Metade de par surrogate: quebra encode/serialização (ex.: JSON.stringify).",
    tags: ["serialização"],
  },
  {
    rotulo: "não-caractere",
    valor: "x￾y",
    porque: "U+FFFE é permanentemente reservado (non-character) — muitos parsers rejeitam ou corrompem.",
    tags: ["serialização"],
  },
  {
    rotulo: "BOM no meio",
    valor: "a﻿b",
    porque: "U+FEFF (BOM) inesperado dentro do texto — vira caractere fantasma em imports/CSV.",
    tags: ["invisível", "serialização"],
  },
];

/** Só os valores (para uso rápido em listas). */
export function valoresUnicode() {
  return FRONTEIRAS_UNICODE.map((i) => i.valor);
}
