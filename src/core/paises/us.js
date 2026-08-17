// Estados Unidos — registro de documentos (rótulos em inglês; a UI acompanha).
import { nascimentoDaPersona, admissaoDaPersona } from "../documents/datas.js";
import {
  gerarNomeUS, gerarSsn, gerarEin, gerarZip, gerarTelefoneUS, gerarCompanyName,
} from "../documents/us.js";

export const US = {
  codigo: "us",
  rotulo: "United States",
  idioma: "en",
  tipos: {
    // --- Person (inclui contato) ---
    name: {
      rotulo: "Name", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNomeUS(rng),
    },
    dob: {
      rotulo: "Date of birth", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (_rng, config) => nascimentoDaPersona(config, "us"),
    },
    hireDate: {
      rotulo: "Hire date", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (_rng, config) => admissaoDaPersona(config, "us"),
    },
    ssn: {
      rotulo: "SSN", rotuloKey: "doc_ssn", categoria: "Pessoa",
      gerar: (rng, config) => gerarSsn(rng, { mascara: config.documentos.mascara }),
    },
    zip: {
      rotulo: "ZIP code", rotuloKey: "doc_zip", categoria: "Pessoa",
      gerar: (rng, config) => gerarZip(rng, { mascara: config.documentos.mascara }),
    },
    phone: {
      rotulo: "Phone", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefoneUS(rng, { mascara: config.documentos.mascara }),
    },

    // --- Company ---
    ein: {
      rotulo: "EIN", rotuloKey: "doc_ein", categoria: "Empresa",
      gerar: (rng, config) => gerarEin(rng, { mascara: config.documentos.mascara }),
    },
    companyName: {
      rotulo: "Company name", rotuloKey: "doc_razao", categoria: "Empresa",
      gerar: (rng) => gerarCompanyName(rng),
    },
  },
};
