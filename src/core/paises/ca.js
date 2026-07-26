// Canadá — registro de documentos (rótulos em inglês; a UI acompanha o país).
import { gerarDataNascimento, gerarDataAdmissao } from "../documents/datas.js";
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
      rotulo: "Name", categoria: "Pessoa",
      gerar: (rng) => gerarNomeCA(rng),
    },
    dob: {
      rotulo: "Date of birth", categoria: "Pessoa",
      gerar: (rng) => gerarDataNascimento(rng, { formato: "iso" }),
    },
    hireDate: {
      rotulo: "Hire date", categoria: "Pessoa",
      gerar: (rng) => gerarDataAdmissao(rng, { formato: "iso" }),
    },
    sin: {
      rotulo: "SIN", categoria: "Pessoa",
      gerar: (rng, config) => gerarSin(rng, { mascara: config.documentos.mascara }),
    },
    postal: {
      rotulo: "Postal code", categoria: "Pessoa",
      gerar: (rng) => gerarPostalCA(rng),
    },
    phone: {
      rotulo: "Phone", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefoneUS(rng, { mascara: config.documentos.mascara }),
    },

    // --- Company ---
    bn: {
      rotulo: "Business Number", categoria: "Empresa",
      gerar: (rng, config) => gerarBn(rng, { mascara: config.documentos.mascara }),
    },
    companyName: {
      rotulo: "Company name", categoria: "Empresa",
      gerar: (rng) => gerarCompanyNameCA(rng),
    },
  },
};
