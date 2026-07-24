// Orquestrador de geração — amarra seed + contador + tipo de documento.
//
// Modelo de reprodutibilidade: cada geração usa um rng derivado de
// `${seed}:${contador}`. Assim "o N-ésimo valor gerado com a seed X" é sempre
// o mesmo, e o histórico só precisa guardar (contador, tipo) para reproduzir.
// O contador é persistido na config e avança a cada geração.

import { criarRng } from "./seed.js";
import { gerarCpf } from "./documents/cpf.js";
import { gerarCnpj } from "./documents/cnpj.js";

// Registro de tipos disponíveis. Cada entrada recebe (rng, config) e retorna
// a string gerada. Adicionar um documento novo = adicionar uma linha aqui.
export const TIPOS = {
  cpf: {
    rotulo: "CPF",
    gerar: (rng, config) => gerarCpf(rng, { mascara: config.documentos.mascara }),
  },
  cnpj: {
    rotulo: "CNPJ",
    gerar: (rng, config) =>
      gerarCnpj(rng, {
        mascara: config.documentos.mascara,
        alfanumerico: config.documentos.cnpjAlfanumerico,
        excluirAmbiguas: config.documentos.cnpjExcluirAmbiguas,
      }),
  },
};

/**
 * Gera um valor de forma determinística a partir da config atual.
 * NÃO muta a config; devolve o próximo contador para o chamador persistir.
 *
 * @param {string} tipo - chave em TIPOS (ex.: "cpf")
 * @param {object} config - config normalizada (com seed e contador)
 * @returns {{ tipo: string, valor: string, contador: number, proximoContador: number }}
 */
export function gerar(tipo, config) {
  const def = TIPOS[tipo];
  if (!def) throw new Error(`Tipo de documento desconhecido: ${tipo}`);
  if (!config || !config.seed) throw new Error("Config sem seed");

  const contador = config.contador;
  const rng = criarRng(`${config.seed}:${contador}`);
  const valor = def.gerar(rng, config);

  return { tipo, valor, contador, proximoContador: contador + 1 };
}
