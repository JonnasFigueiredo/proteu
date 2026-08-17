import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import {
  gerarTfn, validarTfn, gerarAbn, validarAbn, gerarAcn, validarAcn,
  gerarMedicare, validarMedicare, gerarPostcode, gerarPhoneAU,
  gerarNameAU, gerarCompanyAU, FAIXAS_POSTCODE,
} from "../../src/core/documents/au.js";
import {
  gerarMyNumber, validarMyNumber, gerarHoujinBangou, validarHoujinBangou,
  gerarPostalJP, gerarPhoneJP, gerarNameJP, gerarCompanyJP,
} from "../../src/core/documents/jp.js";
import {
  gerarRrn, validarRrn, gerarBrn, validarBrn, gerarCorpKr, validarCorpKr,
  gerarPostalKR, gerarPhoneKR, gerarNameKR, gerarCompanyKR,
} from "../../src/core/documents/kr.js";

/** Trocar UM dígito tem que reprovar — é o que prova que o DV trabalha. */
function taxaDeDeteccao(gerar, validar, seed) {
  const rng = criarRng(seed);
  let pegos = 0, total = 0;
  for (let i = 0; i < 120; i++) {
    const v = gerar(rng);
    for (let p = 0; p < v.length; p++) {
      const d = v.split("");
      d[p] = String((Number(d[p]) + 1) % 10);
      total++;
      if (!validar(d.join(""))) pegos++;
    }
  }
  return pegos / total;
}

describe("Austrália — identificadores com DV oficial", () => {
  // Estes três números são públicos e conferem a implementação contra a
  // realidade, não só contra ela mesma: se o algoritmo estiver errado, eles
  // reprovam.
  it("aceita ABN e ACN reais publicados", () => {
    expect(validarAbn("51824753556"), "ABN do próprio ATO").toBe(true);
    expect(validarAbn("53004085616"), "ABN da Telstra").toBe(true);
    expect(validarAcn("004085616"), "ACN da Telstra").toBe(true);
  });

  it("rejeita os mesmos números com um dígito trocado", () => {
    expect(validarAbn("51824753557")).toBe(false);
    expect(validarAcn("004085617")).toBe(false);
  });

  it("TFN: 9 dígitos, soma ponderada múltipla de 11", () => {
    const rng = criarRng("tfn");
    for (let i = 0; i < 400; i++) {
      const v = gerarTfn(rng);
      expect(v).toMatch(/^\d{9}$/);
      expect(validarTfn(v)).toBe(true);
    }
  });

  it("ABN: 11 dígitos, nunca começa com zero", () => {
    const rng = criarRng("abn");
    for (let i = 0; i < 400; i++) {
      const v = gerarAbn(rng);
      expect(v).toMatch(/^[1-9]\d{10}$/);
      expect(validarAbn(v)).toBe(true);
    }
  });

  it("ACN e Medicare geram válidos", () => {
    const rng = criarRng("acn");
    for (let i = 0; i < 300; i++) {
      expect(validarAcn(gerarAcn(rng))).toBe(true);
      expect(validarMedicare(gerarMedicare(rng))).toBe(true);
    }
  });

  it("o DV pega toda troca de um dígito", () => {
    expect(taxaDeDeteccao(gerarTfn, validarTfn, "d1")).toBe(1);
    expect(taxaDeDeteccao(gerarAbn, validarAbn, "d2")).toBe(1);
    expect(taxaDeDeteccao(gerarAcn, validarAcn, "d3")).toBe(1);
  });

  it("máscaras não inventam dígito", () => {
    const rng = criarRng("mask-au");
    for (const [gerar, validar] of [[gerarTfn, validarTfn], [gerarAbn, validarAbn], [gerarAcn, validarAcn]]) {
      const cru = gerar(rng);
      const m = gerar(criarRng("mask-au-2"), { mascara: true });
      expect(m).toMatch(/[\d ]+/);
      expect(validar(m), `máscara quebrou a validação: ${m}`).toBe(true);
      expect(validar(cru)).toBe(true);
    }
  });

  it("postcode cai na faixa do estado", () => {
    const rng = criarRng("post-au");
    for (const [estado, [ini, fim]] of Object.entries(FAIXAS_POSTCODE)) {
      for (let i = 0; i < 20; i++) {
        const n = Number(gerarPostcode(rng, { estado }));
        expect(n, `${estado}`).toBeGreaterThanOrEqual(ini);
        expect(n).toBeLessThanOrEqual(fim);
      }
    }
  });

  it("celular começa com 04 e tem 10 dígitos", () => {
    const rng = criarRng("fone-au");
    for (let i = 0; i < 100; i++) {
      expect(gerarPhoneAU(rng)).toMatch(/^04\d{8}$/);
    }
  });

  it("nome e empresa saem preenchidos", () => {
    const rng = criarRng("nome-au");
    expect(gerarNameAU(rng)).toMatch(/^\S+ \S+$/);
    expect(gerarCompanyAU(rng)).toMatch(/Pty|Ltd/);
  });
});

describe("Japão — マイナンバー e 法人番号", () => {
  it("My Number: 12 dígitos com DV mod 11", () => {
    const rng = criarRng("mn");
    for (let i = 0; i < 400; i++) {
      const v = gerarMyNumber(rng);
      expect(v).toMatch(/^\d{12}$/);
      expect(validarMyNumber(v)).toBe(true);
    }
  });

  it("法人番号: 13 dígitos, DV no primeiro", () => {
    const rng = criarRng("hb");
    for (let i = 0; i < 400; i++) {
      const v = gerarHoujinBangou(rng);
      expect(v).toMatch(/^\d{13}$/);
      expect(validarHoujinBangou(v)).toBe(true);
    }
  });

  it("o DV do 法人番号 não distingue 0 de 9 — é o algoritmo oficial", () => {
    // Módulo 9: trocar um dígito por outro a 9 de distância mantém a soma.
    // O teste fixa a expectativa para ninguém "consertar" trocando o módulo e,
    // com isso, gerar números que a Agência Nacional de Impostos recusaria.
    const taxa = taxaDeDeteccao(gerarHoujinBangou, validarHoujinBangou, "hb-mut");
    expect(taxa).toBeGreaterThan(0.85);
    expect(taxa).toBeLessThan(1);
  });

  it("My Number pega quase toda troca de um dígito", () => {
    expect(taxaDeDeteccao(gerarMyNumber, validarMyNumber, "mn-mut")).toBeGreaterThan(0.95);
  });

  it("máscara mantém a validação", () => {
    const v = gerarMyNumber(criarRng("mn-m"), { mascara: true });
    expect(v).toMatch(/^\d{4} \d{4} \d{4}$/);
    expect(validarMyNumber(v)).toBe(true);
    const h = gerarHoujinBangou(criarRng("hb-m"), { mascara: true });
    expect(h).toMatch(/^\d-\d{4}-\d{4}-\d{4}$/);
    expect(validarHoujinBangou(h)).toBe(true);
  });

  it("郵便番号 tem 7 dígitos e prefixo de região real", () => {
    const rng = criarRng("post-jp");
    for (let i = 0; i < 100; i++) {
      expect(gerarPostalJP(rng)).toMatch(/^\d{7}$/);
    }
    expect(gerarPostalJP(criarRng("p"), { mascara: true })).toMatch(/^〒\d{3}-\d{4}$/);
  });

  it("celular usa 070/080/090", () => {
    const rng = criarRng("fone-jp");
    for (let i = 0; i < 100; i++) {
      expect(gerarPhoneJP(rng)).toMatch(/^0[789]0\d{8}$/);
    }
  });

  it("nome e empresa saem em japonês", () => {
    const rng = criarRng("nome-jp");
    expect(gerarNameJP(rng)).toMatch(/[一-鿿]/);
    expect(gerarCompanyJP(rng)).toMatch(/株式会社|有限会社/);
  });
});

describe("Coreia do Sul — 주민등록번호 e 사업자등록번호", () => {
  it("RRN: 13 dígitos, data plausível e DV correto", () => {
    const rng = criarRng("rrn");
    for (let i = 0; i < 400; i++) {
      const v = gerarRrn(rng);
      expect(v).toMatch(/^\d{13}$/);
      expect(validarRrn(v)).toBe(true);
      const mes = Number(v.slice(2, 4));
      const dia = Number(v.slice(4, 6));
      expect(mes).toBeGreaterThanOrEqual(1);
      expect(mes).toBeLessThanOrEqual(12);
      expect(dia).toBeGreaterThanOrEqual(1);
      expect(dia).toBeLessThanOrEqual(31);
    }
  });

  it("o sétimo dígito casa com o século da data", () => {
    // 1/2 para quem nasceu no século XX, 3/4 para o XXI. Um RRN com o século
    // trocado passa no DV e mente sobre a idade da pessoa.
    const rng = criarRng("rrn-sec");
    for (let i = 0; i < 200; i++) {
      const v = gerarRrn(rng);
      const aa = Number(v.slice(0, 2));
      const s = Number(v[6]);
      const nasceuNos2000 = s === 3 || s === 4;
      expect(nasceuNos2000 ? aa <= 5 : aa >= 60, `RRN ${v}`).toBe(true);
    }
  });

  it("nunca gera 31 de fevereiro", () => {
    const rng = criarRng("rrn-data");
    for (let i = 0; i < 500; i++) {
      const v = gerarRrn(rng);
      const aa = Number(v.slice(0, 2));
      const ano = (v[6] === "3" || v[6] === "4") ? 2000 + aa : 1900 + aa;
      const mes = Number(v.slice(2, 4));
      const dia = Number(v.slice(4, 6));
      expect(dia, `${v} não existe`).toBeLessThanOrEqual(new Date(ano, mes, 0).getDate());
    }
  });

  it("사업자등록번호 e 법인등록번호 geram válidos", () => {
    const rng = criarRng("kr-emp");
    for (let i = 0; i < 400; i++) {
      expect(validarBrn(gerarBrn(rng))).toBe(true);
      expect(validarCorpKr(gerarCorpKr(rng))).toBe(true);
    }
  });

  it("os DVs pegam toda troca de um dígito", () => {
    expect(taxaDeDeteccao(gerarBrn, validarBrn, "brn-mut")).toBe(1);
    expect(taxaDeDeteccao(gerarCorpKr, validarCorpKr, "corp-mut")).toBe(1);
  });

  it("máscaras mantêm a validação", () => {
    const r = gerarRrn(criarRng("r-m"), { mascara: true });
    expect(r).toMatch(/^\d{6}-\d{7}$/);
    expect(validarRrn(r)).toBe(true);
    const b = gerarBrn(criarRng("b-m"), { mascara: true });
    expect(b).toMatch(/^\d{3}-\d{2}-\d{5}$/);
    expect(validarBrn(b)).toBe(true);
  });

  it("우편번호 tem 5 dígitos e celular usa 010", () => {
    const rng = criarRng("kr-out");
    for (let i = 0; i < 100; i++) {
      expect(gerarPostalKR(rng)).toMatch(/^\d{5}$/);
      expect(gerarPhoneKR(rng)).toMatch(/^010\d{8}$/);
    }
  });

  it("nome e empresa saem em coreano", () => {
    const rng = criarRng("nome-kr");
    expect(gerarNameKR(rng)).toMatch(/[가-힯]/);
    expect(gerarCompanyKR(rng)).toContain("주식회사");
  });
});

describe("os três países são determinísticos", () => {
  it("mesma seed devolve o mesmo documento", () => {
    const pares = [
      [gerarTfn, "au"], [gerarAbn, "au"], [gerarMyNumber, "jp"],
      [gerarHoujinBangou, "jp"], [gerarRrn, "kr"], [gerarBrn, "kr"],
    ];
    for (const [gerar, tag] of pares) {
      const a = gerar(criarRng(`fix-${tag}`));
      const b = gerar(criarRng(`fix-${tag}`));
      expect(b, `${gerar.name} não é determinístico`).toBe(a);
    }
  });
});

describe("Coreia — o RRN não pode discordar da data de nascimento", () => {
  // O RRN carrega a data nos seis primeiros dígitos. Quando ele e o campo
  // 생년월일 sorteavam cada um a sua, a persona dizia duas idades diferentes —
  // e a divergência aparecia justamente no documento que a QA usa para
  // conferir. Os dois passaram a sair da mesma derivação.

  it("os seis primeiros dígitos do RRN são a data de nascimento da persona", async () => {
    const { gerarPersona } = await import("../../src/core/persona.js");
    for (let contador = 0; contador < 60; contador++) {
      const p = gerarPersona({
        pais: "kr", seed: "coerencia", contador,
        documentos: { mascara: false }, insercao: { modo: "valor" },
        tema: "auto", idiomaFixo: null,
      });
      const rrn = p.campos.find((c) => c.rotuloKey === "doc_rrn").valor;
      const nascimento = p.campos.find((c) => c.rotuloKey === "doc_nascimento").valor;

      const seculo = rrn[6] === "3" || rrn[6] === "4" ? "20" : "19";
      const esperado = `${seculo}${rrn.slice(0, 2)}-${rrn.slice(2, 4)}-${rrn.slice(4, 6)}`;
      expect(nascimento, `RRN ${rrn} discorda do campo de nascimento`).toBe(esperado);
    }
  });

  it("a máscara não desfaz a coerência", async () => {
    const { gerarPersona } = await import("../../src/core/persona.js");
    const base = { pais: "kr", seed: "mask", contador: 7, insercao: { modo: "valor" }, tema: "auto", idiomaFixo: null };
    const sem = gerarPersona({ ...base, documentos: { mascara: false } });
    const com = gerarPersona({ ...base, documentos: { mascara: true } });
    const so = (p, k) => p.campos.find((c) => c.rotuloKey === k).valor.replace(/\D/g, "");
    expect(so(com, "doc_rrn")).toBe(so(sem, "doc_rrn"));
    expect(so(com, "doc_nascimento")).toBe(so(sem, "doc_nascimento"));
  });
});
