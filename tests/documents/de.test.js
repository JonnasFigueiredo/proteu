import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import {
  gerarNameDE, gerarSteuerId, validarSteuerId, gerarUstId, validarUstId,
  gerarIbanDE, validarIbanDE, gerarPlz, gerarTelefonDE, gerarFirmennameDE,
} from "../../src/core/documents/de.js";

describe("Alemanha — nome", () => {
  it("é Vorname + Nachname e determinístico", () => {
    expect(gerarNameDE(criarRng("n")).split(" ").length).toBe(2);
    expect(gerarNameDE(criarRng("x"))).toBe(gerarNameDE(criarRng("x")));
  });
});

describe("Alemanha — IBAN (mod-97-10)", () => {
  it("caso público conhecido é aceito", () => {
    expect(validarIbanDE("DE89370400440532013000")).toBe(true);
    expect(validarIbanDE("DE89 3704 0044 0532 0130 00")).toBe(true); // com espaços
    expect(validarIbanDE("DE88370400440532013000")).toBe(false); // DV errado
  });
  it("round-trip: 22 chars, válido; máscara agrupa de 4 em 4", () => {
    const rng = criarRng("iban");
    for (let i = 0; i < 500; i++) {
      const v = gerarIbanDE(rng);
      expect(v).toMatch(/^DE\d{20}$/);
      expect(validarIbanDE(v), v).toBe(true);
    }
    expect(gerarIbanDE(criarRng("m"), { mascara: true })).toMatch(/^DE\d{2}( \d{4}){4} \d{2}$/);
  });
});

describe("Alemanha — Steuer-IdNr (ISO 7064 MOD 11,10)", () => {
  it("caso público conhecido é aceito (86095742719)", () => {
    expect(validarSteuerId("86095742719")).toBe(true);
    expect(validarSteuerId("86095742718")).toBe(false);
  });
  it("round-trip: 11 dígitos, 1º ≠ 0, DV válido", () => {
    const rng = criarRng("steuer");
    for (let i = 0; i < 500; i++) {
      const v = gerarSteuerId(rng);
      expect(v).toMatch(/^[1-9]\d{10}$/);
      expect(validarSteuerId(v), v).toBe(true);
    }
  });
});

describe("Alemanha — USt-IdNr (MOD 11,10)", () => {
  it("round-trip: DE + 9 dígitos, DV válido", () => {
    const rng = criarRng("ust");
    for (let i = 0; i < 400; i++) {
      const v = gerarUstId(rng);
      expect(v).toMatch(/^DE\d{9}$/);
      expect(validarUstId(v), v).toBe(true);
    }
  });
  it("rejeita DV alterado", () => {
    const v = gerarUstId(criarRng("u2"));
    const trocado = v.slice(0, -1) + ((Number(v.at(-1)) + 1) % 10);
    expect(validarUstId(trocado)).toBe(false);
  });
});

describe("Alemanha — PLZ, telefone, Firmenname", () => {
  it("PLZ 5 dígitos; celular 01[567]x + 8 dígitos", () => {
    const rng = criarRng("de-outros");
    expect(gerarPlz(rng)).toMatch(/^\d{5}$/);
    expect(gerarTelefonDE(rng)).toMatch(/^01[567]\d{8}$/);
    expect(gerarTelefonDE(rng, { mascara: true })).toMatch(/^01[567]\d \d{7}$/);
  });
  it("Firmenname termina em Rechtsform alemã", () => {
    expect(gerarFirmennameDE(criarRng("rz"))).toMatch(/(GmbH|AG|GmbH & Co\. KG|UG \(haftungsbeschränkt\))$/);
  });
});
