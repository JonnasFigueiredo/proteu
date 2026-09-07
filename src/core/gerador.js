// Orquestrador de geração — multi-país.
//
// Modelo de reprodutibilidade: cada geração usa um rng derivado de
// `${seed}:${contador}`. Assim "o N-ésimo valor gerado com a seed X" é sempre
// o mesmo, e o histórico só precisa guardar (contador, tipo) para reproduzir.
//
// Cada país é um arquivo em paises/ que exporta { codigo, rotulo, idioma, tipos }.
// Adicionar um país = criar o arquivo e registrá-lo em PAISES aqui.

import { criarRng } from "./seed.js";
import { BR } from "./paises/br.js";
import { US } from "./paises/us.js";
import { AR } from "./paises/ar.js";
import { CA } from "./paises/ca.js";
import { CN } from "./paises/cn.js";
import { SA } from "./paises/sa.js";
import { MX } from "./paises/mx.js";
import { IN } from "./paises/in.js";
import { DE } from "./paises/de.js";
import { AU } from "./paises/au.js";
import { JP } from "./paises/jp.js";
import { KR } from "./paises/kr.js";

// Países implementados (com geradores prontos).
export const PAISES = {
  br: BR,
  us: US,
  ca: CA,
  ar: AR,
  cn: CN,
  sa: SA,
  mx: MX,
  in: IN,
  de: DE,
  au: AU,
  jp: JP,
  kr: KR,
};

export const PAIS_PADRAO = "br";

// Catálogo para o seletor (inclui países ainda não implementados → "em breve").
// A ordem é a de exibição no modal.
export const PAISES_DISPONIVEIS = [
  { codigo: "br", rotulo: "Brasil", idioma: "pt", implementado: true },
  { codigo: "us", rotulo: "Estados Unidos", idioma: "en", implementado: true },
  { codigo: "ca", rotulo: "Canadá", idioma: "en", implementado: true },
  { codigo: "ar", rotulo: "Argentina", idioma: "es", implementado: true },
  { codigo: "cn", rotulo: "China", idioma: "zh", implementado: true },
  { codigo: "sa", rotulo: "Arábia Saudita", idioma: "ar", implementado: true },
  { codigo: "mx", rotulo: "México", idioma: "es", implementado: true },
  { codigo: "in", rotulo: "Índia", idioma: "hi", implementado: true },
  { codigo: "de", rotulo: "Alemanha", idioma: "de", implementado: true },
  { codigo: "au", rotulo: "Austrália", idioma: "en", implementado: true },
  { codigo: "jp", rotulo: "Japão", idioma: "en", implementado: true },
  { codigo: "kr", rotulo: "Coreia do Sul", idioma: "en", implementado: true },
];

/** Devolve o registro de tipos do país (cai no padrão se desconhecido). */
export function tiposDoPais(pais) {
  return (PAISES[pais] || PAISES[PAIS_PADRAO]).tipos;
}

/** Idioma da interface associado ao país (default pt). */
export function idiomaDoPais(pais) {
  const p = PAISES_DISPONIVEIS.find((x) => x.codigo === pais);
  return p ? p.idioma : "pt";
}

// Idioma do navegador quando ele não traz região, ou traz uma que não
// atendemos. Espanha e Portugal não estão na lista, então "es" cai no México e
// "pt" no Brasil, que são os maiores falantes entre os países implementados.
const PAIS_DO_IDIOMA = {
  pt: "br",
  en: "us",
  es: "mx",
  de: "de",
  zh: "cn",
  ar: "sa",
  hi: "in",
  ja: "jp",
  ko: "kr",
  fr: "ca", // único país implementado com francês oficial
};

/**
 * País dos dados a partir do idioma do navegador, para o primeiro uso.
 *
 * Antes o primeiro uso cravava Brasil. Com a listagem da loja traduzida, quem
 * instala vendo um título em inglês abria a extensão em português gerando CPF,
 * e a promessa da vitrine não se cumpria na primeira tela.
 *
 * A região tem prioridade sobre o idioma: `en-AU` é Austrália, não Estados
 * Unidos, e `es-AR` é Argentina, não México. Só quando a região não é atendida
 * é que o idioma decide.
 *
 * Cuidado que o código exige: "ar" é árabe como idioma e Argentina como região.
 * Conferir a região primeiro resolve os dois casos sem ambiguidade, porque
 * `es-AR` traz região e `ar` sozinho não.
 */
export function paisDoIdioma(locale) {
  if (typeof locale !== "string" || !locale) return PAIS_PADRAO;

  const [idioma, regiao] = locale.toLowerCase().replace(/_/g, "-").split("-");

  const implementados = new Set(
    PAISES_DISPONIVEIS.filter((p) => p.implementado).map((p) => p.codigo)
  );
  if (regiao && implementados.has(regiao)) return regiao;

  const porIdioma = PAIS_DO_IDIOMA[idioma];
  return porIdioma && implementados.has(porIdioma) ? porIdioma : PAIS_PADRAO;
}

/** Se o país tem as opções de CNPJ alfanumérico (só o Brasil, por ora). */
export function paisMostraOpcoesCnpj(pais) {
  return !!(PAISES[pais] || {}).opcoesCnpj;
}

/**
 * Gera um valor de forma determinística a partir da config atual (país + seed +
 * contador). NÃO muta a config; devolve o próximo contador para persistir.
 *
 * @param {string} tipo - chave em tiposDoPais(config.pais)
 * @param {object} config - config normalizada (com pais, seed e contador)
 * @returns {{ tipo: string, valor: string, contador: number, proximoContador: number }}
 */
export function gerar(tipo, config) {
  if (!config || !config.seed) throw new Error("Config sem seed");
  const tipos = tiposDoPais(config.pais || PAIS_PADRAO);
  const def = tipos[tipo];
  if (!def) throw new Error(`Tipo de documento desconhecido no país: ${tipo}`);

  const contador = config.contador;
  const rng = criarRng(`${config.seed}:${contador}`);
  const valor = def.gerar(rng, config);

  return { tipo, valor, contador, proximoContador: contador + 1 };
}
