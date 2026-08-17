// Austrália — registro de documentos (rótulos em inglês; a UI acompanha o país).
import { gerarDataNascimento, gerarDataAdmissao } from "../documents/datas.js";
import {
  gerarNameAU, gerarTfn, gerarAbn, gerarAcn, gerarMedicare,
  gerarPostcode, gerarPhoneAU, gerarCompanyAU,
} from "../documents/au.js";

export const AU = {
  codigo: "au",
  rotulo: "Australia",
  idioma: "en",
  tipos: {
    // --- Person ---
    name: {
      rotulo: "Name", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNameAU(rng),
    },
    dateOfBirth: {
      rotulo: "Date of birth", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (rng) => gerarDataNascimento(rng),  // DD/MM/AAAA, como na Austrália
    },
    hireDate: {
      rotulo: "Hire date", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (rng) => gerarDataAdmissao(rng),
    },
    tfn: {
      rotulo: "TFN", rotuloKey: "doc_tfn", categoria: "Pessoa",
      gerar: (rng, config) => gerarTfn(rng, { mascara: config.documentos.mascara }),
    },
    medicare: {
      rotulo: "Medicare", rotuloKey: "doc_medicare", categoria: "Pessoa",
      gerar: (rng, config) => gerarMedicare(rng, { mascara: config.documentos.mascara }),
    },
    postcode: {
      rotulo: "Postcode", rotuloKey: "doc_postal", categoria: "Pessoa",
      gerar: (rng) => gerarPostcode(rng),
    },
    phone: {
      rotulo: "Phone", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarPhoneAU(rng, { mascara: config.documentos.mascara }),
    },

    // --- Company ---
    abn: {
      rotulo: "ABN", rotuloKey: "doc_abn", categoria: "Empresa",
      gerar: (rng, config) => gerarAbn(rng, { mascara: config.documentos.mascara }),
    },
    acn: {
      rotulo: "ACN", rotuloKey: "doc_acn", categoria: "Empresa",
      gerar: (rng, config) => gerarAcn(rng, { mascara: config.documentos.mascara }),
    },
    companyName: {
      rotulo: "Company name", rotuloKey: "doc_razao", categoria: "Empresa",
      gerar: (rng) => gerarCompanyAU(rng),
    },
  },
};
