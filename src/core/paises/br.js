// Brasil — registro de documentos de Pessoa e Empresa.
//
// Cada entrada: { rotulo (pt, fallback), rotuloKey? (i18n), categoria, gerar }.
// Adicionar um país = criar um arquivo como este e registrá-lo em gerador.js.

import { gerarCpf } from "../documents/cpf.js";
import { gerarCnpj, gerarRaizCnpj, cnpjDeRaiz } from "../documents/cnpj.js";
import { gerarRg } from "../documents/rg.js";
import { gerarCnh } from "../documents/cnh.js";
import { gerarIe } from "../documents/ie.js";
import { gerarCep } from "../documents/cep.js";
import { gerarTelefone } from "../documents/telefone.js";
import { gerarNome } from "../documents/nome.js";
import { nascimentoDaPersona, admissaoDaPersona } from "../documents/datas.js";
import { gerarRazaoSocial } from "../documents/razao-social.js";

export const BR = {
  codigo: "br",
  rotulo: "Brasil",
  idioma: "pt",
  opcoesCnpj: true, // mostra os toggles de CNPJ alfanumérico no popup
  tipos: {
    // --- Pessoa (inclui contato) ---
    nome: {
      rotulo: "Nome", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNome(rng),
    },
    dataNascimento: {
      rotulo: "Data de nascimento", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (_rng, config) => nascimentoDaPersona(config),
    },
    dataAdmissao: {
      rotulo: "Data de admissão", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (_rng, config) => admissaoDaPersona(config),
    },
    cpf: {
      rotulo: "CPF", rotuloKey: "doc_cpf", categoria: "Pessoa",
      gerar: (rng, config) => gerarCpf(rng, { mascara: config.documentos.mascara }),
    },
    rg: {
      rotulo: "RG", rotuloKey: "doc_rg", categoria: "Pessoa",
      gerar: (rng, config) => gerarRg(rng, { mascara: config.documentos.mascara }),
    },
    cnh: {
      rotulo: "CNH", rotuloKey: "doc_cnh", categoria: "Pessoa",
      gerar: (rng) => gerarCnh(rng),
    },
    cep: {
      rotulo: "CEP", rotuloKey: "doc_cep", categoria: "Pessoa",
      gerar: (rng, config) => gerarCep(rng, { mascara: config.documentos.mascara }),
    },
    telefone: {
      rotulo: "Telefone", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefone(rng, { mascara: config.documentos.mascara }),
    },

    // --- Empresa ---
    cnpj: {
      rotulo: "CNPJ", rotuloKey: "doc_cnpj", categoria: "Empresa",
      gerar: (rng, config) =>
        gerarCnpj(rng, {
          mascara: config.documentos.mascara,
          alfanumerico: config.documentos.cnpjAlfanumerico,
          excluirAmbiguas: config.documentos.cnpjExcluirAmbiguas,
        }),
    },
    cnpjRaiz: {
      rotulo: "CNPJ (mesma raiz)", rotuloKey: "doc_cnpj_raiz", categoria: "Empresa",
      raiz: true, // documento com comportamento de "matriz + filiais" no popup
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
      rotulo: "Inscrição Estadual (SP)", rotuloKey: "doc_ie", categoria: "Empresa",
      gerar: (rng, config) => gerarIe(rng, { mascara: config.documentos.mascara }),
    },
  },
};
