// Argentina — registro de documentos (rótulos em espanhol; a UI acompanha).
import { gerarDataNascimento, gerarDataAdmissao } from "../documents/datas.js";
import {
  gerarNombreAR, gerarDni, gerarCuil, gerarCuit, gerarCpa, gerarTelefonoAR,
  gerarRazonSocialAR,
} from "../documents/ar.js";

export const AR = {
  codigo: "ar",
  rotulo: "Argentina",
  idioma: "es",
  tipos: {
    // --- Persona (incluye contacto) ---
    nombre: {
      rotulo: "Nombre", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNombreAR(rng),
    },
    nacimiento: {
      rotulo: "Fecha de nacimiento", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (rng) => gerarDataNascimento(rng, { formato: "br" }),
    },
    ingreso: {
      rotulo: "Fecha de ingreso", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (rng) => gerarDataAdmissao(rng, { formato: "br" }),
    },
    dni: {
      rotulo: "DNI", rotuloKey: "doc_dni", categoria: "Pessoa",
      gerar: (rng, config) => gerarDni(rng, { mascara: config.documentos.mascara }),
    },
    cuil: {
      rotulo: "CUIL", rotuloKey: "doc_cuil", categoria: "Pessoa",
      gerar: (rng, config) => gerarCuil(rng, { mascara: config.documentos.mascara }),
    },
    cpa: {
      rotulo: "Código postal (CPA)", rotuloKey: "doc_cpa", categoria: "Pessoa",
      gerar: (rng) => gerarCpa(rng),
    },
    telefono: {
      rotulo: "Teléfono", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefonoAR(rng, { mascara: config.documentos.mascara }),
    },

    // --- Empresa ---
    cuit: {
      rotulo: "CUIT", rotuloKey: "doc_cuit", categoria: "Empresa",
      gerar: (rng, config) => gerarCuit(rng, { mascara: config.documentos.mascara }),
    },
    razonSocial: {
      rotulo: "Razón social", rotuloKey: "doc_razao", categoria: "Empresa",
      gerar: (rng) => gerarRazonSocialAR(rng),
    },
  },
};
