// Orquestrador de geração — amarra seed + contador + tipo de documento.
//
// Modelo de reprodutibilidade: cada geração usa um rng derivado de
// `${seed}:${contador}`. Assim "o N-ésimo valor gerado com a seed X" é sempre
// o mesmo, e o histórico só precisa guardar (contador, tipo) para reproduzir.
// O contador é persistido na config e avança a cada geração.

import { criarRng } from "./seed.js";
import { gerarCpf } from "./documents/cpf.js";
import { gerarCnpj, gerarRaizCnpj, cnpjDeRaiz } from "./documents/cnpj.js";
import { gerarRg } from "./documents/rg.js";
import { gerarCnh } from "./documents/cnh.js";
import { gerarIe } from "./documents/ie.js";
import { gerarCep } from "./documents/cep.js";
import { gerarTelefone } from "./documents/telefone.js";
import { gerarNome } from "./documents/nome.js";
import { gerarDataNascimento, gerarDataAdmissao } from "./documents/datas.js";
import { gerarRazaoSocial } from "./documents/razao-social.js";

// Registro de tipos disponíveis. Cada entrada recebe (rng, config) e retorna
// a string gerada.
//   - `rotulo`: nome em pt (usado no menu de contexto e como fallback do popup);
//   - `rotuloKey` (opcional): chave i18n para o popup traduzir o rótulo;
//     documentos com nome próprio (CPF, CNPJ…) ficam só com `rotulo`.
//   - `categoria`: metadado de exibição (agrupa os botões no popup).
// Adicionar um documento = adicionar uma linha aqui; a UI acompanha sozinha.
export const TIPOS = {
  // --- Pessoa (inclui dados de contato) ---
  nome: {
    rotulo: "Nome", rotuloKey: "doc_nome", categoria: "Pessoa",
    gerar: (rng) => gerarNome(rng),
  },
  dataNascimento: {
    rotulo: "Data de nascimento", rotuloKey: "doc_nascimento", categoria: "Pessoa",
    gerar: (rng) => gerarDataNascimento(rng),
  },
  dataAdmissao: {
    rotulo: "Data de admissão", rotuloKey: "doc_admissao", categoria: "Pessoa",
    gerar: (rng) => gerarDataAdmissao(rng),
  },
  cpf: {
    rotulo: "CPF", categoria: "Pessoa",
    gerar: (rng, config) => gerarCpf(rng, { mascara: config.documentos.mascara }),
  },
  rg: {
    rotulo: "RG", categoria: "Pessoa",
    gerar: (rng, config) => gerarRg(rng, { mascara: config.documentos.mascara }),
  },
  cnh: {
    rotulo: "CNH", categoria: "Pessoa",
    gerar: (rng) => gerarCnh(rng),
  },
  cep: {
    rotulo: "CEP", categoria: "Pessoa",
    gerar: (rng, config) => gerarCep(rng, { mascara: config.documentos.mascara }),
  },
  telefone: {
    rotulo: "Telefone", rotuloKey: "doc_telefone", categoria: "Pessoa",
    gerar: (rng, config) => gerarTelefone(rng, { mascara: config.documentos.mascara }),
  },

  // --- Empresa ---
  cnpj: {
    rotulo: "CNPJ", categoria: "Empresa",
    gerar: (rng, config) =>
      gerarCnpj(rng, {
        mascara: config.documentos.mascara,
        alfanumerico: config.documentos.cnpjAlfanumerico,
        excluirAmbiguas: config.documentos.cnpjExcluirAmbiguas,
      }),
  },
  cnpjRaiz: {
    rotulo: "CNPJ (mesma raiz)", rotuloKey: "doc_cnpj_raiz", categoria: "Empresa",
    // Gera a matriz (ordem 0001); o popup usa a raiz para gerar filiais.
    gerar: (rng, config) =>
      cnpjDeRaiz(
        gerarRaizCnpj(rng, {
          alfanumerico: config.documentos.cnpjAlfanumerico,
          excluirAmbiguas: config.documentos.cnpjExcluirAmbiguas,
        }),
        1,
        { mascara: config.documentos.mascara }
      ),
  },
  razaoSocial: {
    rotulo: "Razão social", rotuloKey: "doc_razao", categoria: "Empresa",
    gerar: (rng) => gerarRazaoSocial(rng),
  },
  ie: {
    rotulo: "Inscrição Estadual (SP)", categoria: "Empresa",
    gerar: (rng, config) => gerarIe(rng, { mascara: config.documentos.mascara }),
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
