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
      rotulo: "Nombre", categoria: "Pessoa",
      gerar: (rng) => gerarNombreAR(rng),
    },
    nacimiento: {
      rotulo: "Fecha de nacimiento", categoria: "Pessoa",
      gerar: (rng) => gerarDataNascimento(rng, { formato: "br" }),
    },
    ingreso: {
      rotulo: "Fecha de ingreso", categoria: "Pessoa",
      gerar: (rng) => gerarDataAdmissao(rng, { formato: "br" }),
    },
    dni: {
      rotulo: "DNI", categoria: "Pessoa",
      gerar: (rng, config) => gerarDni(rng, { mascara: config.documentos.mascara }),
    },
    cuil: {
      rotulo: "CUIL", categoria: "Pessoa",
      gerar: (rng, config) => gerarCuil(rng, { mascara: config.documentos.mascara }),
    },
    cpa: {
      rotulo: "Código postal (CPA)", categoria: "Pessoa",
      gerar: (rng) => gerarCpa(rng),
    },
    telefono: {
      rotulo: "Teléfono", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefonoAR(rng, { mascara: config.documentos.mascara }),
    },

    // --- Empresa ---
    cuit: {
      rotulo: "CUIT", categoria: "Empresa",
      gerar: (rng, config) => gerarCuit(rng, { mascara: config.documentos.mascara }),
    },
    razonSocial: {
      rotulo: "Razón social", categoria: "Empresa",
      gerar: (rng) => gerarRazonSocialAR(rng),
    },
  },
};
