import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import {
  gerarNomeSA, gerarNationalIdSA, validarNationalIdSA, gerarCrSA, validarCrSA,
  gerarVatSA, validarVatSA, gerarPostalSA, gerarTelefoneSA, gerarRazaoSocialSA,
} from "../../src/core/documents/sa.js";

describe("Arábia Saudita — nome", () => {
  it("é árabe (nome + sobrenome) e determinístico", () => {
    const n = gerarNomeSA(criarRng("sa-nome"));
    expect(n).toMatch(/^[؀-ۿ]+ [؀-ۿ]+$/);
    expect(gerarNomeSA(criarRng("x"))).toBe(gerarNomeSA(criarRng("x")));
  });
});

describe("Arábia Saudita — Documento nacional (الهوية الوطنية) DV Luhn", () => {
  it("round-trip: gerados são válidos, 10 dígitos, 1º ∈ {1,2}", () => {
    const rng = criarRng("id");
    for (let i = 0; i < 500; i++) {
      const v = gerarNationalIdSA(rng);
      expect(v).toMatch(/^[12]\d{9}$/);
      expect(validarNationalIdSA(v), v).toBe(true);
    }
  });
  it("rejeita DV/dígito alterado e 1º dígito inválido", () => {
    const v = gerarNationalIdSA(criarRng("id2"));
    const trocado = v.slice(0, -1) + (v.at(-1) === "0" ? "1" : "0");
    expect(validarNationalIdSA(trocado)).toBe(false);
    expect(validarNationalIdSA("3" + v.slice(1))).toBe(false); // começa em 3
    expect(validarNationalIdSA("123")).toBe(false);
  });
});

describe("Arábia Saudita — Registro comercial (CR) e IVA (VAT)", () => {
  it("CR: 10 dígitos com prefixo de região", () => {
    const rng = criarRng("cr");
    for (let i = 0; i < 200; i++) {
      const v = gerarCrSA(rng);
      expect(v).toMatch(/^\d{10}$/);
      expect(validarCrSA(v)).toBe(true);
    }
  });
  it("VAT: 15 dígitos, começa e termina em 3 (forma canônica)", () => {
    const rng = criarRng("vat");
    for (let i = 0; i < 200; i++) {
      const v = gerarVatSA(rng);
      expect(v).toMatch(/^3\d{9}00003$/);
      expect(validarVatSA(v)).toBe(true);
      expect(v[0]).toBe("3");
      expect(v.at(-1)).toBe("3");
    }
    expect(validarVatSA("300000000000000")).toBe(false);
  });
});

describe("Arábia Saudita — postal, telefone, razão social", () => {
  it("postal 5 dígitos; celular 05X + 7 dígitos", () => {
    const rng = criarRng("sa-outros");
    expect(gerarPostalSA(rng)).toMatch(/^[1-9]\d{4}$/);
    expect(gerarTelefoneSA(rng)).toMatch(/^05[03-9]\d{7}$/);
    expect(gerarTelefoneSA(rng, { mascara: true })).toMatch(/^05\d \d{3} \d{4}$/);
  });
  it("razão social começa em شركة (árabe)", () => {
    expect(gerarRazaoSocialSA(criarRng("rz"))).toMatch(/^شركة /);
  });
});
