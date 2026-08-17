// Índia — registro de documentos (rótulos em híndi; a UI acompanha o país).
// Os valores gerados (nomes, empresas) são romanizados; só os rótulos são hi.
import { nascimentoDaPersona, admissaoDaPersona } from "../documents/datas.js";
import {
  gerarNomeIN, gerarAadhaar, gerarPan, gerarGstin, gerarPinIN,
  gerarTelefoneIN, gerarRazaoSocialIN,
} from "../documents/in.js";

export const IN = {
  codigo: "in",
  rotulo: "भारत",
  idioma: "hi",
  tipos: {
    // --- व्यक्ति (pessoa) ---
    naam: {
      rotulo: "नाम", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNomeIN(rng),
    },
    janm: {
      rotulo: "जन्म तिथि", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (_rng, config) => nascimentoDaPersona(config, "iso"),
    },
    niyukti: {
      rotulo: "नियुक्ति तिथि", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (_rng, config) => admissaoDaPersona(config, "iso"),
    },
    aadhaar: {
      rotulo: "आधार संख्या", rotuloKey: "doc_aadhaar", categoria: "Pessoa",
      gerar: (rng, config) => gerarAadhaar(rng, { mascara: config.documentos.mascara }),
    },
    pan: {
      rotulo: "पैन", rotuloKey: "doc_pan", categoria: "Pessoa",
      gerar: (rng) => gerarPan(rng),
    },
    pin: {
      rotulo: "पिन कोड", rotuloKey: "doc_postal", categoria: "Pessoa",
      gerar: (rng) => gerarPinIN(rng),
    },
    mobile: {
      rotulo: "मोबाइल नंबर", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefoneIN(rng, { mascara: config.documentos.mascara }),
    },

    // --- कंपनी (empresa) ---
    gstin: {
      rotulo: "जीएसटीआईएन", rotuloKey: "doc_gstin", categoria: "Empresa",
      gerar: (rng) => gerarGstin(rng),
    },
    companyName: {
      rotulo: "कंपनी का नाम", rotuloKey: "doc_razao", categoria: "Empresa",
      gerar: (rng) => gerarRazaoSocialIN(rng),
    },
  },
};
