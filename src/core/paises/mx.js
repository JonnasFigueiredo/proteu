// México — registro de documentos (rótulos em espanhol; a UI acompanha o país).
import { gerarDataNascimento, gerarDataAdmissao } from "../documents/datas.js";
import {
  gerarNombreMX, gerarCurpMX, gerarRfcMX, gerarRfcMoralMX, gerarNssMX,
  gerarCpMX, gerarTelefonoMX, gerarRazonSocialMX,
} from "../documents/mx.js";

export const MX = {
  codigo: "mx",
  rotulo: "México",
  idioma: "es",
  tipos: {
    // --- Persona ---
    nombre: {
      rotulo: "Nombre", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNombreMX(rng),
    },
    nacimiento: {
      rotulo: "Fecha de nacimiento", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (rng) => gerarDataNascimento(rng, { formato: "br" }),
    },
    ingreso: {
      rotulo: "Fecha de ingreso", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (rng) => gerarDataAdmissao(rng, { formato: "br" }),
    },
    curp: {
      rotulo: "CURP", rotuloKey: "doc_curp", categoria: "Pessoa",
      gerar: (rng) => gerarCurpMX(rng),
    },
    rfc: {
      rotulo: "RFC", rotuloKey: "doc_rfc", categoria: "Pessoa",
      gerar: (rng) => gerarRfcMX(rng),
    },
    nss: {
      rotulo: "NSS", rotuloKey: "doc_nss", categoria: "Pessoa",
      gerar: (rng) => gerarNssMX(rng),
    },
    cp: {
      rotulo: "Código postal", rotuloKey: "doc_postal", categoria: "Pessoa",
      gerar: (rng) => gerarCpMX(rng),
    },
    telefono: {
      rotulo: "Teléfono", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefonoMX(rng, { mascara: config.documentos.mascara }),
    },

    // --- Empresa ---
    rfcMoral: {
      rotulo: "RFC (empresa)", rotuloKey: "doc_rfc_moral", categoria: "Empresa",
      gerar: (rng) => gerarRfcMoralMX(rng),
    },
    razonSocial: {
      rotulo: "Razón social", rotuloKey: "doc_razao", categoria: "Empresa",
      gerar: (rng) => gerarRazonSocialMX(rng),
    },
  },
};
