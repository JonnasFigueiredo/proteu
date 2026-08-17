// Japão — registro de documentos (rótulos em japonês).
//
// A interface fica em inglês: o projeto ainda não tem tradução de UI para
// japonês, e inventar rótulos meia-boca seria pior do que assumir o inglês.
// Os NOMES dos documentos ficam em japonês, como acontece com CPF/CNPJ no
// Brasil — é o nome próprio do documento.
import { gerarDataNascimento, gerarDataAdmissao } from "../documents/datas.js";
import {
  gerarNameJP, gerarMyNumber, gerarHoujinBangou,
  gerarPostalJP, gerarPhoneJP, gerarCompanyJP,
} from "../documents/jp.js";

export const JP = {
  codigo: "jp",
  rotulo: "日本",
  idioma: "en",
  tipos: {
    // --- 個人 ---
    name: {
      rotulo: "氏名", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNameJP(rng),
    },
    seinengappi: {
      rotulo: "生年月日", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (rng) => gerarDataNascimento(rng, { formato: "iso" }),
    },
    nyushabi: {
      rotulo: "入社日", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (rng) => gerarDataAdmissao(rng, { formato: "iso" }),
    },
    myNumber: {
      rotulo: "マイナンバー", rotuloKey: "doc_mynumber", categoria: "Pessoa",
      gerar: (rng, config) => gerarMyNumber(rng, { mascara: config.documentos.mascara }),
    },
    yubinBango: {
      rotulo: "郵便番号", rotuloKey: "doc_postal", categoria: "Pessoa",
      gerar: (rng, config) => gerarPostalJP(rng, { mascara: config.documentos.mascara }),
    },
    denwaBango: {
      rotulo: "電話番号", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarPhoneJP(rng, { mascara: config.documentos.mascara }),
    },

    // --- 法人 ---
    houjinBangou: {
      rotulo: "法人番号", rotuloKey: "doc_houjin", categoria: "Empresa",
      gerar: (rng, config) => gerarHoujinBangou(rng, { mascara: config.documentos.mascara }),
    },
    kaishaMei: {
      rotulo: "会社名", rotuloKey: "doc_razao", categoria: "Empresa",
      gerar: (rng) => gerarCompanyJP(rng),
    },
  },
};
