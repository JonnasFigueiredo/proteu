// Alemanha — registro de documentos (rótulos em alemão; a UI acompanha o país).
import { gerarDataNascimento, gerarDataAdmissao } from "../documents/datas.js";
import {
  gerarNameDE, gerarSteuerId, gerarUstId, gerarIbanDE, gerarPlz,
  gerarTelefonDE, gerarFirmennameDE,
} from "../documents/de.js";

export const DE = {
  codigo: "de",
  rotulo: "Deutschland",
  idioma: "de",
  tipos: {
    // --- Person ---
    name: {
      rotulo: "Name", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNameDE(rng),
    },
    geburtsdatum: {
      rotulo: "Geburtsdatum", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (rng) => gerarDataNascimento(rng, { formato: "de" }),
    },
    eintrittsdatum: {
      rotulo: "Eintrittsdatum", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (rng) => gerarDataAdmissao(rng, { formato: "de" }),
    },
    steuerId: {
      rotulo: "Steuer-IdNr.", rotuloKey: "doc_steuerid", categoria: "Pessoa",
      gerar: (rng) => gerarSteuerId(rng),
    },
    iban: {
      rotulo: "IBAN", rotuloKey: "doc_iban", categoria: "Pessoa",
      gerar: (rng, config) => gerarIbanDE(rng, { mascara: config.documentos.mascara }),
    },
    plz: {
      rotulo: "Postleitzahl", rotuloKey: "doc_postal", categoria: "Pessoa",
      gerar: (rng) => gerarPlz(rng),
    },
    telefon: {
      rotulo: "Telefon", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefonDE(rng, { mascara: config.documentos.mascara }),
    },

    // --- Unternehmen ---
    ustId: {
      rotulo: "USt-IdNr.", rotuloKey: "doc_ustid", categoria: "Empresa",
      gerar: (rng) => gerarUstId(rng),
    },
    firmenname: {
      rotulo: "Firmenname", rotuloKey: "doc_razao", categoria: "Empresa",
      gerar: (rng) => gerarFirmennameDE(rng),
    },
  },
};
