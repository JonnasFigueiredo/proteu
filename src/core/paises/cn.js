// China — registro de documentos (rótulos em chinês; a UI acompanha o país).
import { gerarDataNascimento, gerarDataAdmissao } from "../documents/datas.js";
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
      rotulo: "姓名", categoria: "Pessoa",
      gerar: (rng) => gerarNomeCN(rng),
    },
    nascimento: {
      rotulo: "出生日期", categoria: "Pessoa",
      gerar: (rng) => gerarDataNascimento(rng, { formato: "iso" }),
    },
    admissao: {
      rotulo: "入职日期", categoria: "Pessoa",
      gerar: (rng) => gerarDataAdmissao(rng, { formato: "iso" }),
    },
    idCard: {
      rotulo: "身份证号", categoria: "Pessoa",
      gerar: (rng) => gerarIdCardCN(rng),
    },
    postal: {
      rotulo: "邮政编码", categoria: "Pessoa",
      gerar: (rng) => gerarPostalCN(rng),
    },
    telefone: {
      rotulo: "手机号码", categoria: "Pessoa",
      gerar: (rng, config) => gerarTelefoneCN(rng, { mascara: config.documentos.mascara }),
    },

    // --- 企业 (empresa) ---
    uscc: {
      rotulo: "统一社会信用代码", categoria: "Empresa",
      gerar: (rng) => gerarUscc(rng),
    },
    razaoSocial: {
      rotulo: "公司名称", categoria: "Empresa",
      gerar: (rng) => gerarRazaoSocialCN(rng),
    },
  },
};
