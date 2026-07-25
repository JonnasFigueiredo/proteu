// Estados Unidos — registro de documentos (rótulos em inglês; a UI acompanha).
import { gerarDataNascimento, gerarDataAdmissao } from "../documents/datas.js";
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
      rotulo: "Name", categoria: "Pessoa",
      gerar: (rng) => gerarNomeUS(rng),
    },
    dob: {
      rotulo: "Date of birth", categoria: "Pessoa",
      gerar: (rng) => gerarDataNascimento(rng, { formato: "us" }),
    },
    hireDate: {
      rotulo: "Hire date", categoria: "Pessoa",
      gerar: (rng) => gerarDataAdmissao(rng, { formato: "us" }),
    },
    ssn: {
      rotulo: "SSN", categoria: "Pessoa",
      gerar: (rng, config) => gerarSsn(rng, { mascara: config.documentos.mascara }),
    },
    zip: {
      rotulo: "ZIP code", categoria: "Pessoa",
      gerar: (rng, config) => gerarZip(rng, { mascara: config.documentos.mascara }),
    },
    phone: {
      rotulo: "Phone", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefoneUS(rng, { mascara: config.documentos.mascara }),
    },

    // --- Company ---
    ein: {
      rotulo: "EIN", categoria: "Empresa",
      gerar: (rng, config) => gerarEin(rng, { mascara: config.documentos.mascara }),
    },
    companyName: {
      rotulo: "Company name", categoria: "Empresa",
      gerar: (rng) => gerarCompanyName(rng),
    },
  },
};
