import { describe, it, expect } from "vitest";
import { criarRng } from "../../src/core/seed.js";
import { gerarPorTamanho, UNIDADES } from "../../src/core/text/tamanho.js";
import { contarTudo } from "../../src/core/text/contagem.js";

describe("gerarPorTamanho — exatidão por unidade", () => {
  // "caracteres" é um modo de geração (ASCII puro), não uma quinta forma de
  // contar: `contarTudo` continua devolvendo as quatro de sempre. Como em ASCII
  // todas dão o mesmo número, conferir por code units serve para as duas.
  const CHAVE_DE_CONTAGEM = { caracteres: "codeUnits" };

  for (const unidade of UNIDADES) {
    it(`atinge exatamente o alvo em ${unidade} (vários tamanhos)`, () => {
      const rng = criarRng(`tam-${unidade}`);
      const chave = CHAVE_DE_CONTAGEM[unidade] || unidade;
      for (const alvo of [1, 5, 10, 37, 100, 255]) {
        const r = gerarPorTamanho(rng, { unidade, alvo });
        expect(r.exato, `${unidade}=${alvo} gerou "${r.texto}"`).toBe(true);
        expect(contarTudo(r.texto)[chave]).toBe(alvo);
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

describe("tamanho — unidade 'caracteres'", () => {
  // Existe para quem não quer entrar no mérito de qual contagem usar: sai em
  // ASCII puro, onde as quatro dão o mesmo número. Se divergirem, a opção está
  // mentindo — e mentir sobre contagem é justamente o que o resto do módulo
  // foi escrito para evitar.

  const gerar = (alvo, filler) =>
    gerarPorTamanho(criarRng("caracteres", 1), { unidade: "caracteres", alvo, filler });

  it("está na lista de unidades", () => {
    expect(UNIDADES).toContain("caracteres");
  });

  it.each([0, 1, 7, 40, 100, 255, 1000])("com alvo %i, as quatro contagens batem", (alvo) => {
    const r = gerar(alvo);
    expect(r.contagens.grafemas).toBe(alvo);
    expect(r.contagens.codePoints).toBe(alvo);
    expect(r.contagens.codeUnits).toBe(alvo);
    expect(r.contagens.bytes).toBe(alvo);
    expect(r.exato).toBe(true);
  });

  it("o texto é ASCII puro", () => {
    const { texto } = gerar(300);
    const foraDoAscii = [...texto].filter((c) => c.codePointAt(0) > 127);
    expect(foraDoAscii, `saiu do ASCII: ${foraDoAscii.join("")}`).toEqual([]);
  });

  it("ignora filler não-ASCII em vez de quebrar a promessa", () => {
    // O popup passa as palavras do idioma como filler. Em árabe ou chinês isso
    // faria bytes divergir de grafemas, que é o oposto do que a unidade vende.
    for (const filler of ["مرحبا بالعالم", "你好世界", "こんにちは", "👨‍👩‍👧‍👦 emoji"]) {
      const r = gerar(120, filler);
      expect(r.contagens.bytes, `filler ${filler}`).toBe(120);
      expect(r.contagens.grafemas).toBe(120);
      expect([...r.texto].every((c) => c.codePointAt(0) <= 127)).toBe(true);
    }
  });

  it("as outras unidades continuam respeitando o filler do idioma", () => {
    // A exceção vale só para "caracteres"; quebrar isso tiraria o sentido de
    // gerar texto em outro alfabeto.
    const r = gerarPorTamanho(criarRng("outra", 1), {
      unidade: "grafemas",
      alvo: 40,
      filler: "你好世界",
    });
    expect(r.contagens.grafemas).toBe(40);
    expect(r.contagens.bytes).toBeGreaterThan(40); // multibyte de verdade
  });

  it("é determinística como as demais", () => {
    const a = gerarPorTamanho(criarRng("seed-fixa", 3), { unidade: "caracteres", alvo: 64 });
    const b = gerarPorTamanho(criarRng("seed-fixa", 3), { unidade: "caracteres", alvo: 64 });
    expect(b.texto).toBe(a.texto);
  });
});
