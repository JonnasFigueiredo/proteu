// Exportação em lote — a ponte do QA manual para o automatizado.
//
// Gera N personas coerentes e serializa em CSV, JSON ou fixture de Playwright.
// O diferencial: a **seed viaja junto** com os dados. Quem receber o arquivo
// consegue regerar exatamente as mesmas personas — é o que resolve a dor de
// fixture obsoleta/"na minha máquina funciona".
//
// Lógica pura: sem DOM, sem chrome.*.

import { gerarPersona } from "./persona.js";

/** Colunas exportadas, em ordem. São os SLOTS — estáveis e independentes do
 *  idioma da interface, porque código de automação não pode depender de UI. */
export const COLUNAS = [
  "nome", "primeiroNome", "sobrenome", "email", "documento",
  "nascimento", "telefone", "postal", "empresa",
];

const MAX_LOTE = 1000;

/**
 * Gera N personas em sequência, avançando o contador a cada uma.
 * @returns {{personas: Array<object>, seed: string, pais: string, contadorInicial: number, proximoContador: number}}
 */
export function gerarLote(config, quantidade) {
  const n = Number(quantidade);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LOTE) {
    throw new Error(`Quantidade inválida: ${quantidade} (1 a ${MAX_LOTE})`);
  }
  const contadorInicial = config.contador;
  const personas = [];
  let contador = contadorInicial;

  for (let i = 0; i < n; i++) {
    const p = gerarPersona({ ...config, contador });
    // Só o que interessa para exportar: slot → valor.
    const linha = {};
    for (const col of COLUNAS) {
      if (p.porSlot[col] !== undefined) linha[col] = p.porSlot[col];
    }
    personas.push(linha);
    contador = p.proximoContador;
  }

  return {
    personas,
    seed: config.seed,
    pais: config.pais,
    contadorInicial,
    proximoContador: contador,
  };
}

/** Colunas presentes de fato no lote (nem todo país tem todos os slots). */
function colunasDo(personas) {
  return COLUNAS.filter((c) => personas.some((p) => p[c] !== undefined));
}

/** Escapa um campo conforme a RFC 4180: aspas, vírgula ou quebra de linha. */
function campoCsv(valor) {
  const s = valor === undefined || valor === null ? "" : String(valor);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * CSV (RFC 4180). Sem linha de comentário: CSV não tem comentário padrão e
 * qualquer coisa antes do cabeçalho quebraria o parser de quem consome.
 */
export function paraCsv(lote) {
  const { personas } = lote;
  const cols = colunasDo(personas);
  const linhas = [cols.join(",")];
  for (const p of personas) {
    linhas.push(cols.map((c) => campoCsv(p[c])).join(","));
  }
  return linhas.join("\n");
}

/** JSON com a seed junto — é o que torna o lote reproduzível. */
export function paraJson(lote) {
  return JSON.stringify(
    {
      seed: lote.seed,
      pais: lote.pais,
      contadorInicial: lote.contadorInicial,
      personas: lote.personas,
    },
    null,
    2
  );
}

/**
 * Fixture de Playwright/Cypress: um módulo pronto para `import`.
 * O cabeçalho registra a seed para quem for reproduzir o lote depois.
 */
export function paraPlaywright(lote) {
  const cab = [
    "// Gerado por Proteu QA — dados de teste fictícios.",
    `// seed: ${lote.seed} · país: ${lote.pais} · a partir do contador ${lote.contadorInicial}`,
    "// A mesma seed e o mesmo contador reproduzem exatamente estas personas.",
  ].join("\n");
  return `${cab}\nexport const personas = ${JSON.stringify(lote.personas, null, 2)};\n`;
}

/** Formatos oferecidos na UI: id → { rotuloKey, extensao, serializar }. */
export const FORMATOS = {
  csv: { rotuloKey: "exp_csv", extensao: "csv", serializar: paraCsv },
  json: { rotuloKey: "exp_json", extensao: "json", serializar: paraJson },
  playwright: { rotuloKey: "exp_playwright", extensao: "js", serializar: paraPlaywright },
};

/** Serializa o lote no formato pedido (cai em CSV se o id for desconhecido). */
export function serializar(lote, formato) {
  const f = FORMATOS[formato] || FORMATOS.csv;
  return f.serializar(lote);
}
