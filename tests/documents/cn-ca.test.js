import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import {
  gerarNomeCN, gerarIdCardCN, validarIdCardCN, gerarUscc, validarUscc,
  gerarPostalCN, gerarTelefoneCN, gerarRazaoSocialCN,
} from "../../src/core/documents/cn.js";
import {
  gerarNomeCA, gerarSin, validarSin, gerarBn, validarBn, gerarPostalCA,
  gerarCompanyNameCA, validarLuhn,
} from "../../src/core/documents/ca.js";

describe("China — nome", () => {
  it("é caracteres han e determinístico", () => {
    const n = gerarNomeCN(criarRng("cn-nome"));
    expect(n).toMatch(/^[一-鿿]{2,4}$/);
    expect(gerarNomeCN(criarRng("x"))).toBe(gerarNomeCN(criarRng("x")));
  });
});

describe("China — ID card (居民身份证) DV MOD 11-2", () => {
  it("round-trip: gerados são válidos, 18 posições", () => {
    const rng = criarRng("idcard");
    for (let i = 0; i < 500; i++) {
      const v = gerarIdCardCN(rng);
      expect(v).toMatch(/^\d{17}[\dX]$/);
      expect(validarIdCardCN(v), v).toBe(true);
    }
  });

  it("caso público conhecido é aceito e DV errado rejeitado", () => {
    expect(validarIdCardCN("440524188001010014")).toBe(true);
    expect(validarIdCardCN("440524188001010015")).toBe(false);
  });

  it("data de nascimento embutida indica maior de idade (ano <= 2007)", () => {
    const rng = criarRng("idade");
    for (let i = 0; i < 200; i++) {
      const ano = Number(gerarIdCardCN(rng).slice(6, 10));
      expect(ano).toBeLessThanOrEqual(2007);
      expect(ano).toBeGreaterThanOrEqual(1950);
    }
  });
});

describe("China — USCC (统一社会信用代码) DV MOD 31-3", () => {
  it("round-trip: 18 caracteres do alfabeto, válidos", () => {
    const rng = criarRng("uscc");
    for (let i = 0; i < 500; i++) {
      const v = gerarUscc(rng);
      expect(v).toHaveLength(18);
      expect(v).toMatch(/^[0-9A-HJ-NPQRTUWXY]{18}$/);
      expect(validarUscc(v), v).toBe(true);
    }
  });

  it("rejeita alteração de um caractere", () => {
    const v = gerarUscc(criarRng("u2"));
    const trocado = v.slice(0, -1) + (v.at(-1) === "0" ? "1" : "0");
    expect(validarUscc(trocado)).toBe(false);
  });
});

describe("China — postal, telefone, razão social", () => {
  it("postal 6 dígitos; telefone 1[3-9]xxxxxxxxx", () => {
    const rng = criarRng("cn-outros");
    expect(gerarPostalCN(rng)).toMatch(/^[1-8]\d{5}$/);
    const tel = gerarTelefoneCN(rng);
    expect(tel).toMatch(/^1[3-9]\d{9}$/);
    expect(gerarTelefoneCN(rng, { mascara: true })).toMatch(/^1\d{2} \d{4} \d{4}$/);
  });
  it("razão social termina em 公司", () => {
    expect(gerarRazaoSocialCN(criarRng("rz"))).toMatch(/公司$/);
  });
});

describe("Canadá — SIN e BN (Luhn)", () => {
  it("SIN válido (Luhn), 9 dígitos, 1º != 0/8", () => {
    const rng = criarRng("sin");
    for (let i = 0; i < 500; i++) {
      const v = gerarSin(rng, { mascara: true });
      expect(v).toMatch(/^\d{3}-\d{3}-\d{3}$/);
      expect(validarSin(v), v).toBe(true);
      const d = v.replace(/\D/g, "");
      expect(d[0]).not.toBe("0");
      expect(d[0]).not.toBe("8");
    }
  });

  it("BN válido (Luhn), com programa RT0001 na máscara", () => {
    const rng = criarRng("bn");
    for (let i = 0; i < 300; i++) {
      const v = gerarBn(rng, { mascara: true });
      expect(v).toMatch(/^\d{9} RT0001$/);
      expect(validarBn(v), v).toBe(true);
    }
  });

  it("validarLuhn: casos conhecidos", () => {
    expect(validarLuhn("4111111111111111")).toBe(true);
    expect(validarLuhn("4111111111111112")).toBe(false);
  });
});

describe("Canadá — nome, postal, company name", () => {
  it("nome + sobrenome, determinístico", () => {
    expect(gerarNomeCA(criarRng("n")).split(" ").length).toBeGreaterThanOrEqual(2);
    expect(gerarNomeCA(criarRng("x"))).toBe(gerarNomeCA(criarRng("x")));
  });
  it("postal A1A 1A1, 1ª letra sem D/F/I/O/Q/U/W/Z", () => {
    const rng = criarRng("postal");
    for (let i = 0; i < 300; i++) {
      const p = gerarPostalCA(rng);
      expect(p).toMatch(/^[A-Z]\d[A-Z] \d[A-Z]\d$/);
      expect(p[0]).not.toMatch(/[DFIOQUWZ]/);
    }
  });
  it("company name termina em sufixo societário", () => {
    expect(gerarCompanyNameCA(criarRng("co"))).toMatch(/(Inc\.|Ltd\.|Corp\.|Co\.)$/);
  });
});
