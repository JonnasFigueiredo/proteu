import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import {
  gerarNombreMX, gerarCurpMX, validarCurpMX, gerarRfcMX, gerarRfcMoralMX,
  validarRfcMX, gerarNssMX, validarNssMX, gerarCpMX, gerarTelefonoMX,
  gerarRazonSocialMX,
} from "../../src/core/documents/mx.js";

describe("México — nome", () => {
  it("é nome + 2 sobrenomes e determinístico", () => {
    expect(gerarNombreMX(criarRng("n")).split(" ").length).toBeGreaterThanOrEqual(3);
    expect(gerarNombreMX(criarRng("x"))).toBe(gerarNombreMX(criarRng("x")));
  });
});

describe("México — CURP (DV mod 10)", () => {
  it("round-trip: gerados são válidos (18, formato oficial)", () => {
    const rng = criarRng("curp");
    for (let i = 0; i < 500; i++) {
      const v = gerarCurpMX(rng);
      expect(v).toHaveLength(18);
      expect(validarCurpMX(v), v).toBe(true);
    }
  });
  it("rejeita dígito verificador alterado", () => {
    const v = gerarCurpMX(criarRng("c2"));
    const trocado = v.slice(0, -1) + (v.at(-1) === "0" ? "1" : "0");
    expect(validarCurpMX(trocado)).toBe(false);
  });
});

describe("México — RFC (DV mod 11)", () => {
  it("caso público conhecido é aceito (GODE561231GR8)", () => {
    expect(validarRfcMX("GODE561231GR8")).toBe(true);
    expect(validarRfcMX("GODE561231GR7")).toBe(false);
  });
  it("round-trip física (13) e moral (12)", () => {
    const rng = criarRng("rfc");
    for (let i = 0; i < 400; i++) {
      const f = gerarRfcMX(rng);
      expect(f).toMatch(/^[A-ZÑ&]{4}\d{6}[A-Z\d]{3}$/);
      expect(validarRfcMX(f), f).toBe(true);
      const m = gerarRfcMoralMX(rng);
      expect(m).toMatch(/^[A-ZÑ&]{3}\d{6}[A-Z\d]{3}$/);
      expect(validarRfcMX(m), m).toBe(true);
    }
  });
});

describe("México — NSS (Luhn)", () => {
  it("round-trip: 11 dígitos válidos por Luhn", () => {
    const rng = criarRng("nss");
    for (let i = 0; i < 500; i++) {
      const v = gerarNssMX(rng);
      expect(v).toMatch(/^\d{11}$/);
      expect(validarNssMX(v), v).toBe(true);
    }
  });
  it("rejeita dígito trocado", () => {
    const v = gerarNssMX(criarRng("n2"));
    const trocado = v.slice(0, -1) + ((Number(v.at(-1)) + 1) % 10);
    expect(validarNssMX(trocado)).toBe(false);
  });
});

describe("México — CP, telefone, razón social", () => {
  it("CP 5 dígitos; telefone 10 dígitos", () => {
    const rng = criarRng("mx-outros");
    expect(gerarCpMX(rng)).toMatch(/^\d{5}$/);
    expect(gerarTelefonoMX(rng)).toMatch(/^[2-9]\d{9}$/);
    expect(gerarTelefonoMX(rng, { mascara: true })).toMatch(/^\d{2} \d{4} \d{4}$/);
  });
  it("razón social termina em tipo societário mexicano", () => {
    expect(gerarRazonSocialMX(criarRng("rz"))).toMatch(/(S\.A\. de C\.V\.|S\. de R\.L\. de C\.V\.|S\.C\.)$/);
  });
});
