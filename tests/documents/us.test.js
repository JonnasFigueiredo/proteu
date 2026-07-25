import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import {
  gerarNomeUS, gerarSsn, validarSsn, gerarEin, validarEin, gerarZip,
  gerarTelefoneUS, gerarCompanyName,
} from "../../src/core/documents/us.js";

describe("US — name", () => {
  it("first + last, determinístico", () => {
    const n = gerarNomeUS(criarRng("us-name"));
    expect(n.split(" ")).toHaveLength(2);
    expect(gerarNomeUS(criarRng("x"))).toBe(gerarNomeUS(criarRng("x")));
  });
});

describe("US — SSN", () => {
  it("gera SSN válido (regras de área/grupo/série)", () => {
    const rng = criarRng("ssn");
    for (let i = 0; i < 500; i++) {
      const v = gerarSsn(rng, { mascara: true });
      expect(v).toMatch(/^\d{3}-\d{2}-\d{4}$/);
      expect(validarSsn(v)).toBe(true);
    }
  });

  it("nunca gera área 000, 666 ou 900+", () => {
    const rng = criarRng("ssn2");
    for (let i = 0; i < 2000; i++) {
      const area = Number(gerarSsn(rng).slice(0, 3));
      expect(area).not.toBe(0);
      expect(area).not.toBe(666);
      expect(area).toBeLessThan(900);
    }
  });

  it("validarSsn rejeita casos inválidos", () => {
    expect(validarSsn("000-12-3456")).toBe(false);
    expect(validarSsn("666-12-3456")).toBe(false);
    expect(validarSsn("900-12-3456")).toBe(false);
    expect(validarSsn("123-00-4567")).toBe(false);
    expect(validarSsn("123-45-0000")).toBe(false);
    expect(validarSsn("12345")).toBe(false);
  });
});

describe("US — EIN", () => {
  it("XX-XXXXXXX com prefixo válido", () => {
    const rng = criarRng("ein");
    for (let i = 0; i < 300; i++) {
      const v = gerarEin(rng, { mascara: true });
      expect(v).toMatch(/^\d{2}-\d{7}$/);
      expect(validarEin(v)).toBe(true);
    }
    expect(validarEin("00-1234567")).toBe(false); // prefixo inexistente
  });
});

describe("US — ZIP e telefone", () => {
  it("ZIP 5 dígitos, ou ZIP+4 com máscara", () => {
    const rng = criarRng("zip");
    expect(gerarZip(rng)).toMatch(/^\d{5}$/);
    expect(gerarZip(rng, { mascara: true })).toMatch(/^\d{5}-\d{4}$/);
  });

  it("telefone NANP: área e central começam em 2-9", () => {
    const rng = criarRng("tel-us");
    for (let i = 0; i < 300; i++) {
      const v = gerarTelefoneUS(rng);
      expect(v).toMatch(/^\d{10}$/);
      expect(Number(v[0])).toBeGreaterThanOrEqual(2);
      expect(Number(v[3])).toBeGreaterThanOrEqual(2);
    }
    expect(gerarTelefoneUS(rng, { mascara: true })).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
  });
});

describe("US — company name", () => {
  it("termina em sufixo societário, determinístico", () => {
    const r = gerarCompanyName(criarRng("co"));
    expect(r).toMatch(/(LLC|Inc\.|Corp\.|Co\.|LLP)$/);
    expect(gerarCompanyName(criarRng("c"))).toBe(gerarCompanyName(criarRng("c")));
  });
});
