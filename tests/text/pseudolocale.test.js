import { describe, it, expect } from "vitest";
import {
  pseudolocalizar,
  extrairPlaceholders,
} from "../../src/core/text/pseudolocale.js";

describe("pseudolocalizar — transformação básica", () => {
  it("troca letras ASCII por acentuadas (Save → algo diferente, sem ASCII original)", () => {
    const r = pseudolocalizar("Save", { expandir: false, marcadores: false });
    expect(r).not.toBe("Save");
    expect(r).not.toMatch(/[A-Za-z]/); // nenhuma letra ASCII sobrou
  });

  it("envolve em marcadores ⟦…⟧ por padrão", () => {
    const r = pseudolocalizar("hello");
    expect(r.startsWith("⟦")).toBe(true);
    expect(r.endsWith("⟧")).toBe(true);
  });

  it("marcadores podem ser desligados", () => {
    const r = pseudolocalizar("hi", { marcadores: false });
    expect(r.startsWith("⟦")).toBe(false);
  });

  it("é determinístico (função pura)", () => {
    expect(pseudolocalizar("Configuração X")).toBe(pseudolocalizar("Configuração X"));
  });
});

describe("pseudolocalizar — preservação de placeholders", () => {
  const casos = [
    "Olá {{name}}",
    "Você tem {count} mensagens",
    "Erro: %s na linha %d",
    "Posição %1$s e %2$s",
    "Python %(user)s",
    "Template ${valor}",
  ];

  it("mantém cada placeholder intacto no resultado", () => {
    for (const texto of casos) {
      const r = pseudolocalizar(texto);
      for (const ph of extrairPlaceholders(texto)) {
        expect(r.includes(ph), `"${ph}" sumiu de "${r}"`).toBe(true);
      }
    }
  });

  it("texto ao redor do placeholder é transformado, o placeholder não", () => {
    const r = pseudolocalizar("Hello {{name}} world", { expandir: false });
    expect(r).toContain("{{name}}");
    expect(r).not.toContain("Hello");
    expect(r).not.toContain("world");
  });

  it("extrairPlaceholders acha os formatos suportados", () => {
    expect(extrairPlaceholders("{{a}} {b} %s %1$s %(c)s ${d}")).toEqual([
      "{{a}}", "{b}", "%s", "%1$s", "%(c)s", "${d}",
    ]);
  });
});

describe("pseudolocalizar — expansão", () => {
  it("expande o comprimento (~+40%) do conteúdo", () => {
    const base = "internationalization readiness";
    const semExp = pseudolocalizar(base, { expandir: false, marcadores: false });
    const comExp = pseudolocalizar(base, { expandir: true, marcadores: false });
    expect(comExp.length).toBeGreaterThan(semExp.length);
    // Pelo menos ~30% maior (fator 1.4 arredondado por palavra).
    expect(comExp.length).toBeGreaterThanOrEqual(Math.floor(semExp.length * 1.3));
  });

  it("não expande placeholders", () => {
    const r = pseudolocalizar("{{name}}", { expandir: true });
    expect(r).toBe("⟦{{name}}⟧");
  });
});

describe("pseudolocalizar — fakebidi", () => {
  it("insere controles RTL (RLO/PDF) no conteúdo transformado", () => {
    const r = pseudolocalizar("abc", { fakebidi: true, expandir: false });
    expect(r).toContain("‮"); // RLO
    expect(r).toContain("‬"); // PDF
  });

  it("sem fakebidi, não há controles bidi", () => {
    const r = pseudolocalizar("abc", { fakebidi: false });
    expect(r).not.toContain("‮");
  });
});

describe("pseudolocalizar — bordas", () => {
  it("string vazia vira só os marcadores", () => {
    expect(pseudolocalizar("")).toBe("⟦⟧");
  });

  it("não string devolve string vazia", () => {
    expect(pseudolocalizar(null)).toBe("");
    expect(pseudolocalizar(42)).toBe("");
  });

  it("pontuação e dígitos passam sem transliteração", () => {
    const r = pseudolocalizar("1, 2, 3!", { expandir: false, marcadores: false });
    expect(r).toContain("1");
    expect(r).toContain("!");
  });
});
