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

// Países implementados (com geradores prontos).
export const PAISES = {
  br: BR,
  us: US,
  ar: AR,
};

export const PAIS_PADRAO = "br";

// Catálogo para o seletor (inclui países ainda não implementados → "em breve").
// A ordem é a de exibição no modal.
export const PAISES_DISPONIVEIS = [
  { codigo: "br", rotulo: "Brasil", idioma: "pt", implementado: true },
  { codigo: "us", rotulo: "Estados Unidos", idioma: "en", implementado: true },
  { codigo: "ar", rotulo: "Argentina", idioma: "es", implementado: true },
  { codigo: "cl", rotulo: "Chile", idioma: "es", implementado: false },
  { codigo: "mx", rotulo: "México", idioma: "es", implementado: false },
  { codigo: "uy", rotulo: "Uruguai", idioma: "es", implementado: false },
  { codigo: "py", rotulo: "Paraguai", idioma: "es", implementado: false },
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
