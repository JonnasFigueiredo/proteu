// Orquestrador de geração — amarra seed + contador + tipo de documento.
//
// Modelo de reprodutibilidade: cada geração usa um rng derivado de
// `${seed}:${contador}`. Assim "o N-ésimo valor gerado com a seed X" é sempre
// o mesmo, e o histórico só precisa guardar (contador, tipo) para reproduzir.
// O contador é persistido na config e avança a cada geração.

import { criarRng } from "./seed.js";
import { gerarCpf } from "./documents/cpf.js";
import { gerarCnpj } from "./documents/cnpj.js";
import { gerarRg } from "./documents/rg.js";
import { gerarCnh } from "./documents/cnh.js";
import { gerarPis } from "./documents/pis.js";
import { gerarTitulo } from "./documents/titulo.js";
import { gerarRenavam } from "./documents/renavam.js";
import { gerarIe } from "./documents/ie.js";
import { gerarCep } from "./documents/cep.js";
import { gerarTelefone } from "./documents/telefone.js";
import { gerarPlaca } from "./documents/placa.js";
import { gerarPix } from "./documents/pix.js";
import { gerarCartao } from "./documents/cartao.js";

// Registro de tipos disponíveis. Cada entrada recebe (rng, config) e retorna
// a string gerada. `categoria` é só metadado de exibição (agrupa os botões no
// popup). Adicionar um documento novo = adicionar uma linha aqui — popup e menu
// de contexto se montam a partir deste objeto.
export const TIPOS = {
  cpf: {
    rotulo: "CPF",
    categoria: "Pessoa",
    gerar: (rng, config) => gerarCpf(rng, { mascara: config.documentos.mascara }),
  },
  rg: {
    rotulo: "RG",
    categoria: "Pessoa",
    gerar: (rng, config) => gerarRg(rng, { mascara: config.documentos.mascara }),
  },
  cnh: {
    rotulo: "CNH",
    categoria: "Pessoa",
    gerar: (rng) => gerarCnh(rng),
  },
  pis: {
    rotulo: "PIS/PASEP",
    categoria: "Pessoa",
    gerar: (rng, config) => gerarPis(rng, { mascara: config.documentos.mascara }),
  },
  titulo: {
    rotulo: "Título de eleitor",
    categoria: "Pessoa",
    gerar: (rng, config) => gerarTitulo(rng, { mascara: config.documentos.mascara }),
  },
  cnpj: {
    rotulo: "CNPJ",
    categoria: "Empresa",
    gerar: (rng, config) =>
      gerarCnpj(rng, {
        mascara: config.documentos.mascara,
        alfanumerico: config.documentos.cnpjAlfanumerico,
        excluirAmbiguas: config.documentos.cnpjExcluirAmbiguas,
      }),
  },
  ie: {
    rotulo: "Inscrição Estadual (SP)",
    categoria: "Empresa",
    gerar: (rng, config) => gerarIe(rng, { mascara: config.documentos.mascara }),
  },
  renavam: {
    rotulo: "RENAVAM",
    categoria: "Veículo",
    gerar: (rng) => gerarRenavam(rng),
  },
  placa: {
    rotulo: "Placa",
    categoria: "Veículo",
    // Alterna entre os dois padrões pelo próprio rng (determinístico).
    gerar: (rng, config) =>
      gerarPlaca(rng, {
        padrao: rng.escolher(["mercosul", "antiga"]),
        mascara: config.documentos.mascara,
      }),
  },
  cep: {
    rotulo: "CEP",
    categoria: "Contato",
    gerar: (rng, config) => gerarCep(rng, { mascara: config.documentos.mascara }),
  },
  telefone: {
    rotulo: "Telefone",
    categoria: "Contato",
    gerar: (rng, config) => gerarTelefone(rng, { mascara: config.documentos.mascara }),
  },
  pix: {
    rotulo: "Chave Pix",
    categoria: "Financeiro",
    gerar: (rng) => gerarPix(rng), // sorteia um dos 4 formatos
  },
  cartao: {
    rotulo: "Cartão de crédito",
    categoria: "Financeiro",
    gerar: (rng, config) => gerarCartao(rng, { mascara: config.documentos.mascara }),
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
