import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import {
  gerarNombreAR, gerarDni, gerarCuil, gerarCuit, validarCuit, gerarCpa,
  gerarTelefonoAR, gerarRazonSocialAR,
} from "../../src/core/documents/ar.js";

describe("AR — nombre", () => {
  it("nombre + apellido, determinístico", () => {
    expect(gerarNombreAR(criarRng("n")).split(" ")).toHaveLength(2);
    expect(gerarNombreAR(criarRng("x"))).toBe(gerarNombreAR(criarRng("x")));
  });
});

describe("AR — DNI", () => {
  it("7–8 dígitos, com pontos na máscara", () => {
    const rng = criarRng("dni");
    for (let i = 0; i < 200; i++) {
      const v = gerarDni(rng);
      expect(v).toMatch(/^\d{7,8}$/);
    }
    expect(gerarDni(criarRng("m"), { mascara: true })).toMatch(/^\d{1,2}\.\d{3}\.\d{3}$/);
  });
});

describe("AR — CUIL/CUIT (dígito verificador módulo 11)", () => {
  it("CUIL (pessoa) válido, prefixo 20/27/23/24", () => {
    const rng = criarRng("cuil");
    for (let i = 0; i < 500; i++) {
      const v = gerarCuil(rng, { mascara: true });
      expect(v).toMatch(/^(20|27|23|24)-\d{8}-\d$/);
      expect(validarCuit(v), v).toBe(true);
    }
  });

  it("CUIT (empresa) válido, prefixo 30/33/34", () => {
    const rng = criarRng("cuit");
    for (let i = 0; i < 500; i++) {
      const v = gerarCuit(rng, { mascara: true });
      expect(v).toMatch(/^(30|33|34)-\d{8}-\d$/);
      expect(validarCuit(v), v).toBe(true);
    }
  });

  it("caso conhecido válido: 20-12345678-6", () => {
    expect(validarCuit("20-12345678-6")).toBe(true);
    expect(validarCuit("20-12345678-5")).toBe(false);
  });

  it("rejeita tamanho errado", () => {
    expect(validarCuit("20-1234-1")).toBe(false);
    expect(validarCuit("2012345678")).toBe(false);
  });

  it("é determinístico", () => {
    expect(gerarCuit(criarRng("d"))).toBe(gerarCuit(criarRng("d")));
  });
});

describe("AR — CPA e teléfono", () => {
  it("CPA: LXXXXLLL", () => {
    const rng = criarRng("cpa");
    for (let i = 0; i < 200; i++) {
      expect(gerarCpa(rng)).toMatch(/^[A-Z]\d{4}[A-Z]{3}$/);
    }
  });

  it("teléfono: ~10 dígitos, formatado com máscara", () => {
    const rng = criarRng("tel-ar");
    expect(gerarTelefonoAR(rng)).toMatch(/^\d{10}$/);
    expect(gerarTelefonoAR(rng, { mascara: true })).toMatch(/^\(0\d{2,3}\) \d+-\d+$/);
  });
});

describe("AR — razón social", () => {
  it("termina em tipo societario, determinístico", () => {
    const r = gerarRazonSocialAR(criarRng("rz"));
    expect(r).toMatch(/(S\.A\.|S\.R\.L\.|S\.A\.S\.)$/);
    expect(gerarRazonSocialAR(criarRng("z"))).toBe(gerarRazonSocialAR(criarRng("z")));
  });
});
