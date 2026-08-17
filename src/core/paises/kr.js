// Coreia do Sul — registro de documentos (rótulos em coreano).
// A UI fica em inglês pelo mesmo motivo do Japão: não há tradução de interface
// para coreano ainda.
import { gerarDataAdmissao } from "../documents/datas.js";
import { criarRng } from "../seed.js";
import {
  gerarNameKR, gerarRrn, gerarBrn, gerarCorpKr, nascimentoKR,
  gerarPostalKR, gerarPhoneKR, gerarCompanyKR,
} from "../documents/kr.js";

export const KR = {
  codigo: "kr",
  rotulo: "대한민국",
  idioma: "en",
  tipos: {
    // --- 개인 ---
    name: {
      rotulo: "성명", rotuloKey: "doc_nome", categoria: "Pessoa",
      gerar: (rng) => gerarNameKR(rng),
    },
    // Sai da MESMA derivação que alimenta o RRN: os seis primeiros dígitos
    // dele são esta data, e as duas não podem discordar.
    saengnyeonwolil: {
      rotulo: "생년월일", rotuloKey: "doc_nascimento", categoria: "Pessoa",
      gerar: (_rng, config) => {
        const { ano, mes, dia } = nascimentoKR(criarRng, config.seed, config.contador);
        const dd = String(dia).padStart(2, "0");
        const mm = String(mes).padStart(2, "0");
        return `${ano}-${mm}-${dd}`;
      },
    },
    ipsail: {
      rotulo: "입사일", rotuloKey: "doc_admissao", categoria: "Pessoa",
      gerar: (rng) => gerarDataAdmissao(rng, { formato: "iso" }),
    },
    juminDeungnok: {
      rotulo: "주민등록번호", rotuloKey: "doc_rrn", categoria: "Pessoa",
      gerar: (rng, config) => gerarRrn(rng, {
        mascara: config.documentos.mascara,
        nascimento: nascimentoKR(criarRng, config.seed, config.contador),
      }),
    },
    upyeonBeonho: {
      rotulo: "우편번호", rotuloKey: "doc_postal", categoria: "Pessoa",
      gerar: (rng) => gerarPostalKR(rng),
    },
    jeonhwaBeonho: {
      rotulo: "전화번호", rotuloKey: "doc_telefone", categoria: "Pessoa",
      gerar: (rng, config) => gerarPhoneKR(rng, { mascara: config.documentos.mascara }),
    },

    // --- 법인 ---
    saeopjaDeungnok: {
      rotulo: "사업자등록번호", rotuloKey: "doc_brn", categoria: "Empresa",
      gerar: (rng, config) => gerarBrn(rng, { mascara: config.documentos.mascara }),
    },
    beopinDeungnok: {
      rotulo: "법인등록번호", rotuloKey: "doc_corp_kr", categoria: "Empresa",
      gerar: (rng, config) => gerarCorpKr(rng, { mascara: config.documentos.mascara }),
    },
    hoesaMyeong: {
      rotulo: "회사명", rotuloKey: "doc_razao", categoria: "Empresa",
      gerar: (rng) => gerarCompanyKR(rng),
    },
  },
};
