// Canadá — registro de documentos (rótulos em inglês; a UI acompanha o país).
import { nascimentoDaPersona, admissaoDaPersona } from "../documents/datas.js";
import { gerarTelefoneUS } from "../documents/us.js"; // NANP, igual ao dos EUA
import {
  gerarNomeCA, gerarSin, gerarBn, gerarPostalCA, gerarCompanyNameCA,
} from "../documents/ca.js";

export const CA = {
  codigo: "ca",
  rotulo: "Canada",
  idioma: "en",
  tipos: {
    // --- Person ---
    name: {
      rotulo: "Name", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNomeCA(rng),
    },
    dob: {
      rotulo: "Date of birth", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (_rng, config) => nascimentoDaPersona(config, "iso"),
    },
    hireDate: {
      rotulo: "Hire date", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (_rng, config) => admissaoDaPersona(config, "iso"),
    },
    sin: {
      rotulo: "SIN", rotuloKey: "doc_sin", categoria: "Pessoa",
      gerar: (rng, config) => gerarSin(rng, { mascara: config.documentos.mascara }),
    },
    postal: {
      rotulo: "Postal code", rotuloKey: "doc_postal", categoria: "Pessoa",
      gerar: (rng) => gerarPostalCA(rng),
    },
    phone: {
      rotulo: "Phone", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefoneUS(rng, { mascara: config.documentos.mascara }),
    },

    // --- Company ---
    bn: {
      rotulo: "Business Number", rotuloKey: "doc_bn", categoria: "Empresa",
      gerar: (rng, config) => gerarBn(rng, { mascara: config.documentos.mascara }),
    },
    companyName: {
      rotulo: "Company name", rotuloKey: "doc_razao", categoria: "Empresa",
      gerar: (rng) => gerarCompanyNameCA(rng),
    },
  },
};
