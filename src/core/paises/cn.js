// China — registro de documentos (rótulos em chinês; a UI acompanha o país).
import { nascimentoDaPersona, admissaoDaPersona } from "../documents/datas.js";
import {
  gerarNomeCN, gerarIdCardCN, gerarUscc, gerarPostalCN, gerarTelefoneCN,
  gerarRazaoSocialCN,
} from "../documents/cn.js";

export const CN = {
  codigo: "cn",
  rotulo: "China",
  idioma: "zh",
  tipos: {
    // --- 个人 (pessoa) ---
    nome: {
      rotulo: "姓名", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNomeCN(rng),
    },
    nascimento: {
      rotulo: "出生日期", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (_rng, config) => nascimentoDaPersona(config, "iso"),
    },
    admissao: {
      rotulo: "入职日期", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (_rng, config) => admissaoDaPersona(config, "iso"),
    },
    idCard: {
      rotulo: "身份证号", rotuloKey: "doc_idcard", categoria: "Pessoa",
      gerar: (rng) => gerarIdCardCN(rng),
    },
    postal: {
      rotulo: "邮政编码", rotuloKey: "doc_postal", categoria: "Pessoa",
      gerar: (rng) => gerarPostalCN(rng),
    },
    telefone: {
      rotulo: "手机号码", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefoneCN(rng, { mascara: config.documentos.mascara }),
    },

    // --- 企业 (empresa) ---
    uscc: {
      rotulo: "统一社会信用代码", rotuloKey: "doc_uscc", categoria: "Empresa",
      gerar: (rng) => gerarUscc(rng),
    },
    razaoSocial: {
      rotulo: "公司名称", rotuloKey: "doc_razao", categoria: "Empresa",
      gerar: (rng) => gerarRazaoSocialCN(rng),
    },
  },
};
