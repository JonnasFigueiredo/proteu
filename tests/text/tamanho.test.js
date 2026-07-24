import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import { gerarPorTamanho, UNIDADES } from "../../src/core/text/tamanho.js";
import { contarTudo } from "../../src/core/text/contagem.js";

describe("gerarPorTamanho — exatidão por unidade", () => {
  for (const unidade of UNIDADES) {
    it(`atinge exatamente o alvo em ${unidade} (vários tamanhos)`, () => {
      const rng = criarRng(`tam-${unidade}`);
      for (const alvo of [1, 5, 10, 37, 100, 255]) {
        const r = gerarPorTamanho(rng, { unidade, alvo });
        expect(r.exato, `${unidade}=${alvo} gerou "${r.texto}"`).toBe(true);
        expect(contarTudo(r.texto)[unidade]).toBe(alvo);
      }
    });
  }

  it("exatidão em bytes mesmo com filler multibyte", () => {
    const rng = criarRng("mb");
    for (const alvo of [3, 8, 20, 50]) {
      const r = gerarPorTamanho(rng, {
        unidade: "bytes",
        alvo,
        filler: "café 日本語 привет ção",
      });
      expect(contarTudo(r.texto).bytes, `alvo ${alvo}: "${r.texto}"`).toBe(alvo);
    }
  });
});

describe("gerarPorTamanho — determinismo e bordas", () => {
  it("mesma seed → mesmo texto", () => {
    const a = gerarPorTamanho(criarRng("s"), { unidade: "grafemas", alvo: 40 });
    const b = gerarPorTamanho(criarRng("s"), { unidade: "grafemas", alvo: 40 });
    expect(a.texto).toBe(b.texto);
  });

  it("alvo 0 devolve string vazia", () => {
    const r = gerarPorTamanho(criarRng("z"), { unidade: "bytes", alvo: 0 });
    expect(r.texto).toBe("");
    expect(r.contagens.bytes).toBe(0);
  });

  it("devolve as 4 contagens do texto gerado", () => {
    const r = gerarPorTamanho(criarRng("c"), { unidade: "grafemas", alvo: 12 });
    expect(r.contagens).toHaveProperty("grafemas");
    expect(r.contagens).toHaveProperty("bytes");
    expect(r.contagens.grafemas).toBe(12);
  });

  it("rejeita unidade e alvo inválidos", () => {
    expect(() => gerarPorTamanho(criarRng("e"), { unidade: "palmos", alvo: 5 })).toThrow();
    expect(() => gerarPorTamanho(criarRng("e"), { unidade: "bytes", alvo: -1 })).toThrow();
    expect(() => gerarPorTamanho(criarRng("e"), { unidade: "bytes", alvo: 1.5 })).toThrow();
  });
});
