import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import {
  gerarNomeIN, gerarAadhaar, validarAadhaar, validarVerhoeff, gerarPan,
  validarPan, gerarGstin, validarGstin, gerarPinIN, gerarTelefoneIN,
  gerarRazaoSocialIN,
} from "../../src/core/documents/in.js";

describe("Índia — Verhoeff (Aadhaar)", () => {
  it("vetor conhecido: 236 → dígito 3 (2363 é válido)", () => {
    expect(validarVerhoeff("2363")).toBe(true);
    expect(validarVerhoeff("2364")).toBe(false);
  });

  it("Aadhaar round-trip: 12 dígitos, 1º 2–9, Verhoeff válido", () => {
    const rng = criarRng("aadhaar");
    for (let i = 0; i < 500; i++) {
      const v = gerarAadhaar(rng);
      expect(v).toMatch(/^[2-9]\d{11}$/);
      expect(validarAadhaar(v), v).toBe(true);
    }
  });

  it("máscara agrupa 4-4-4 e continua válido; DV trocado é rejeitado", () => {
    const rng = criarRng("aad2");
    const m = gerarAadhaar(rng, { mascara: true });
    expect(m).toMatch(/^\d{4} \d{4} \d{4}$/);
    expect(validarAadhaar(m)).toBe(true);
    const v = gerarAadhaar(rng);
    const trocado = v.slice(0, -1) + ((Number(v.at(-1)) + 1) % 10);
    expect(validarAadhaar(trocado)).toBe(false);
  });
});

describe("Índia — PAN (estrutural)", () => {
  it("round-trip: formato AAAAA9999A com tipo de titular válido", () => {
    const rng = criarRng("pan");
    for (let i = 0; i < 300; i++) {
      const v = gerarPan(rng);
      expect(v).toMatch(/^[A-Z]{5}\d{4}[A-Z]$/);
      expect(validarPan(v), v).toBe(true);
    }
  });
  it("rejeita formato inválido", () => {
    expect(validarPan("ABC1234567")).toBe(false);
    expect(validarPan("ABCDE1234F")).toBe(false); // 4º char 'D' não é tipo válido
  });
});

describe("Índia — GSTIN (DV base-36)", () => {
  it("round-trip: 15 chars válidos, termina no DV correto", () => {
    const rng = criarRng("gstin");
    for (let i = 0; i < 400; i++) {
      const v = gerarGstin(rng);
      expect(v).toMatch(/^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/);
      expect(validarGstin(v), v).toBe(true);
    }
  });
  it("rejeita DV alterado", () => {
    const v = gerarGstin(criarRng("g2"));
    const trocado = v.slice(0, -1) + (v.at(-1) === "0" ? "1" : "0");
    expect(validarGstin(trocado)).toBe(false);
  });
});

describe("Índia — nome, PIN, celular, razão social", () => {
  it("nome romanizado (nome + sobrenome), determinístico", () => {
    expect(gerarNomeIN(criarRng("n")).split(" ").length).toBe(2);
    expect(gerarNomeIN(criarRng("x"))).toBe(gerarNomeIN(criarRng("x")));
  });
  it("PIN 6 dígitos; celular 10 dígitos (6–9)", () => {
    const rng = criarRng("in-outros");
    expect(gerarPinIN(rng)).toMatch(/^[1-8]\d{5}$/);
    expect(gerarTelefoneIN(rng)).toMatch(/^[6-9]\d{9}$/);
    expect(gerarTelefoneIN(rng, { mascara: true })).toMatch(/^\d{5} \d{5}$/);
  });
  it("razão social termina em sufixo societário indiano", () => {
    expect(gerarRazaoSocialIN(criarRng("rz"))).toMatch(/(Private Limited|Pvt\. Ltd\.|LLP|Limited)$/);
  });
});
