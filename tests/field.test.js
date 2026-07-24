import { describe, it, expect } from "vitest";
import { gerarSetFronteira } from "../src/core/field.js";

function descritorBase(extra = {}) {
  return {
    tag: "input",
    type: "text",
    maxlength: null,
    minlength: null,
    min: null,
    max: null,
    pattern: null,
    required: false,
    inputmode: null,
    contenteditable: false,
    ...extra,
  };
}

describe("gerarSetFronteira", () => {
  it("descritor nulo/ausente devolve lista vazia", () => {
    expect(gerarSetFronteira(null)).toEqual([]);
    expect(gerarSetFronteira(undefined)).toEqual([]);
  });

  it("maxlength=14 → valores de 13, 14 e 15 caracteres", () => {
    const set = gerarSetFronteira(descritorBase({ maxlength: "14" }));
    const tamanhos = set.map((i) => i.valor.length);
    expect(tamanhos).toContain(13);
    expect(tamanhos).toContain(14);
    expect(tamanhos).toContain(15);
  });

  it("type=number com max=100 → 100, 101, -1, 1e999, NaN", () => {
    const set = gerarSetFronteira(
      descritorBase({ type: "number", max: "100" })
    );
    const valores = set.map((i) => i.valor);
    expect(valores).toContain("100");
    expect(valores).toContain("101");
    expect(valores).toContain("-1");
    expect(valores).toContain("1e999");
    expect(valores).toContain("NaN");
  });

  it("type=number com min → min e min−1", () => {
    const set = gerarSetFronteira(
      descritorBase({ type: "number", min: "10" })
    );
    const valores = set.map((i) => i.valor);
    expect(valores).toContain("10");
    expect(valores).toContain("9");
  });

  it("required → vazio e só-espaços vêm primeiro", () => {
    const set = gerarSetFronteira(descritorBase({ required: true }));
    expect(set[0].valor).toBe("");
    expect(set[1].valor.trim()).toBe("");
  });

  it("type=email → e-mails que passam em regex simples", () => {
    const set = gerarSetFronteira(descritorBase({ type: "email" }));
    expect(set.length).toBeGreaterThanOrEqual(4);
    for (const item of set) {
      expect(item.valor).toContain("@");
    }
  });

  it("pattern com @ também ativa o set de e-mail", () => {
    const set = gerarSetFronteira(
      descritorBase({ pattern: "[a-z]+@[a-z]+\\.com" })
    );
    expect(set.some((i) => i.valor.includes("@"))).toBe(true);
  });

  it("type=date com max → máx e máx+1 dia (sem bug de fuso)", () => {
    const set = gerarSetFronteira(
      descritorBase({ type: "date", max: "2026-12-31" })
    );
    const valores = set.map((i) => i.valor);
    expect(valores).toContain("2026-12-31");
    expect(valores).toContain("2027-01-01");
  });

  it("texto livre inclui fronteiras Unicode", () => {
    const set = gerarSetFronteira(descritorBase());
    const rotulos = set.map((i) => i.rotulo);
    expect(rotulos).toContain("emoji ZWJ");
    expect(rotulos).toContain("zero-width");
    expect(rotulos).toContain("RTL override");
    expect(rotulos).toContain("homoglifos");
  });

  it("não repete valores (dedupe)", () => {
    const set = gerarSetFronteira(
      descritorBase({ required: true, maxlength: "3", minlength: "3" })
    );
    const valores = set.map((i) => i.valor);
    expect(new Set(valores).size).toBe(valores.length);
  });

  it("é determinístico: mesmo descritor, mesmo set", () => {
    const d = descritorBase({ type: "number", max: "5", required: true });
    expect(gerarSetFronteira(d)).toEqual(gerarSetFronteira(d));
  });
});
