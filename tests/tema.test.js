import { describe, it, expect } from "vitest";
import { temaVisivel, proximoTema } from "../src/core/tema.js";

describe("temaVisivel", () => {
  it("claro e escuro valem por si, independente do sistema", () => {
    expect(temaVisivel("claro", true)).toBe("claro");
    expect(temaVisivel("claro", false)).toBe("claro");
    expect(temaVisivel("escuro", true)).toBe("escuro");
    expect(temaVisivel("escuro", false)).toBe("escuro");
  });

  it("auto segue o sistema", () => {
    expect(temaVisivel("auto", true)).toBe("escuro");
    expect(temaVisivel("auto", false)).toBe("claro");
  });
});

describe("proximoTema — todo clique tem de mudar a tela", () => {
  // Regressão: o ciclo antigo era auto → claro → escuro → auto. Com o sistema
  // no escuro, "auto" e "escuro" pintavam igual, então 1 clique em cada 3 não
  // fazia nada — a sensação era "preciso clicar 3 vezes para funcionar".
  for (const sistemaEscuro of [true, false]) {
    it(`nunca repete o tema visível (sistema escuro=${sistemaEscuro})`, () => {
      let tema = "auto";
      for (let i = 0; i < 10; i++) {
        const antes = temaVisivel(tema, sistemaEscuro);
        tema = proximoTema(tema, sistemaEscuro);
        const depois = temaVisivel(tema, sistemaEscuro);
        expect(depois, `clique ${i + 1} não mudou nada`).not.toBe(antes);
      }
    });

    it(`alterna entre os dois temas visíveis (sistema escuro=${sistemaEscuro})`, () => {
      let tema = "auto";
      const vistos = [];
      for (let i = 0; i < 4; i++) {
        tema = proximoTema(tema, sistemaEscuro);
        vistos.push(temaVisivel(tema, sistemaEscuro));
      }
      expect(new Set(vistos)).toEqual(new Set(["claro", "escuro"]));
    });
  }

  it("a partir de auto, vai para o oposto do que o sistema mostra", () => {
    expect(proximoTema("auto", true)).toBe("claro"); // sistema escuro → clareia
    expect(proximoTema("auto", false)).toBe("escuro"); // sistema claro → escurece
  });

  it("o botão nunca devolve 'auto' (esse modo só existe em Configurações)", () => {
    for (const tema of ["auto", "claro", "escuro"]) {
      for (const sis of [true, false]) {
        expect(proximoTema(tema, sis)).not.toBe("auto");
      }
    }
  });
});
