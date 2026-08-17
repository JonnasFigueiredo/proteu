// Arábia Saudita — registro de documentos (rótulos em árabe; a UI acompanha o
// país, e a interface é RTL quando o idioma é árabe).
import { nascimentoDaPersona, admissaoDaPersona } from "../documents/datas.js";
import {
  gerarNomeSA, gerarNationalIdSA, gerarCrSA, gerarVatSA, gerarPostalSA,
  gerarTelefoneSA, gerarRazaoSocialSA,
} from "../documents/sa.js";

export const SA = {
  codigo: "sa",
  rotulo: "المملكة العربية السعودية",
  idioma: "ar",
  tipos: {
    // --- الأفراد (pessoa) ---
    nome: {
      rotulo: "الاسم", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNomeSA(rng),
    },
    nascimento: {
      rotulo: "تاريخ الميلاد", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (_rng, config) => nascimentoDaPersona(config, "iso"),
    },
    admissao: {
      rotulo: "تاريخ التعيين", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (_rng, config) => admissaoDaPersona(config, "iso"),
    },
    nationalId: {
      rotulo: "الهوية الوطنية", rotuloKey: "doc_nationalid", categoria: "Pessoa",
      gerar: (rng) => gerarNationalIdSA(rng),
    },
    postal: {
      rotulo: "الرمز البريدي", rotuloKey: "doc_postal", categoria: "Pessoa",
      gerar: (rng) => gerarPostalSA(rng),
    },
    telefone: {
      rotulo: "رقم الجوال", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefoneSA(rng, { mascara: config.documentos.mascara }),
    },

    // --- الشركات (empresa) ---
    cr: {
      rotulo: "السجل التجاري", rotuloKey: "doc_cr", categoria: "Empresa",
      gerar: (rng) => gerarCrSA(rng),
    },
    vat: {
      rotulo: "الرقم الضريبي", rotuloKey: "doc_vat", categoria: "Empresa",
      gerar: (rng) => gerarVatSA(rng),
    },
    razaoSocial: {
      rotulo: "اسم الشركة", rotuloKey: "doc_razao", categoria: "Empresa",
      gerar: (rng) => gerarRazaoSocialSA(rng),
    },
  },
};
