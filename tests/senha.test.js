import { describe, it, expect } from "vitest";
import {
  gerarSenha, alfabetoDe, forcaDaSenha, CLASSES,
  TAMANHO_MIN, TAMANHO_MAX, TAMANHO_PADRAO, CHAVE_NIVEL,
} from "../src/core/senha.js";

const TODAS = { maiusculas: true, minusculas: true, numeros: true, simbolos: true };

describe("gerarSenha — o básico", () => {
  it("respeita o tamanho pedido", () => {
    for (const t of [4, 8, 16, 32, 64]) {
      expect(gerarSenha({ ...TODAS, tamanho: t })).toHaveLength(t);
    }
  });

  it("prende o tamanho aos limites em vez de estourar", () => {
    expect(gerarSenha({ ...TODAS, tamanho: 1 })).toHaveLength(TAMANHO_MIN);
    expect(gerarSenha({ ...TODAS, tamanho: 999 })).toHaveLength(TAMANHO_MAX);
    expect(gerarSenha({ ...TODAS })).toHaveLength(TAMANHO_PADRAO);
    expect(gerarSenha({ ...TODAS, tamanho: "abc" })).toHaveLength(TAMANHO_PADRAO);
  });

  it("só usa caracteres do alfabeto escolhido", () => {
    const alfabeto = new Set(alfabetoDe({ maiusculas: true, numeros: true }));
    for (let i = 0; i < 200; i++) {
      const s = gerarSenha({ maiusculas: true, numeros: true, tamanho: 20 });
      expect([...s].every((c) => alfabeto.has(c)), s).toBe(true);
    }
  });

  it("recusa gerar sem nenhuma classe marcada", () => {
    // Devolver string vazia seria pior: o campo aceitaria e o erro apareceria
    // só no cadastro.
    expect(() => gerarSenha({ tamanho: 12 })).toThrow();
  });
});

describe("gerarSenha — pelo menos um de cada classe", () => {
  // Uma senha de 16 caracteres que sai sem dígito nenhum reprova em política
  // que exige número, e quem gerou só descobre quando o formulário recusa.

  it("toda classe marcada aparece na senha", () => {
    for (let i = 0; i < 300; i++) {
      const s = gerarSenha({ ...TODAS, tamanho: 8 });
      expect([...s].some((c) => CLASSES.maiusculas.includes(c)), s).toBe(true);
      expect([...s].some((c) => CLASSES.minusculas.includes(c)), s).toBe(true);
      expect([...s].some((c) => CLASSES.numeros.includes(c)), s).toBe(true);
      expect([...s].some((c) => CLASSES.simbolos.includes(c)), s).toBe(true);
    }
  });

  it("classe desmarcada nunca aparece", () => {
    for (let i = 0; i < 300; i++) {
      const s = gerarSenha({ minusculas: true, numeros: true, tamanho: 16 });
      expect([...s].some((c) => CLASSES.simbolos.includes(c)), s).toBe(false);
      expect([...s].some((c) => CLASSES.maiusculas.includes(c)), s).toBe(false);
    }
  });

  it("com tamanho menor que o número de classes, não estoura", () => {
    // 4 classes e tamanho 4: cabe uma de cada, no limite.
    const s = gerarSenha({ ...TODAS, tamanho: 4 });
    expect(s).toHaveLength(4);
  });
});

describe("gerarSenha — qualidade da aleatoriedade", () => {
  it("os caracteres garantidos não ficam sempre no começo", () => {
    // Sem embaralhar, a senha começaria com maiúscula, minúscula, dígito e
    // símbolo nessa ordem — padrão fixo que reduz a entropia real.
    const primeiras = new Set();
    for (let i = 0; i < 200; i++) {
      primeiras.add(gerarSenha({ ...TODAS, tamanho: 12 })[0]);
    }
    expect(primeiras.size).toBeGreaterThan(10);
  });

  it("não repete a senha", () => {
    const vistas = new Set();
    for (let i = 0; i < 500; i++) vistas.add(gerarSenha({ ...TODAS, tamanho: 16 }));
    expect(vistas.size).toBe(500);
  });

  it("a distribuição não favorece o começo do alfabeto", () => {
    // `aleatorio % teto` enviesa quando 256 não é múltiplo do alfabeto — o que
    // é quase sempre. Com alfabeto de 10, a primeira metade apareceria mais.
    const conta = new Map();
    for (let i = 0; i < 400; i++) {
      for (const c of gerarSenha({ numeros: true, tamanho: 40 })) {
        conta.set(c, (conta.get(c) || 0) + 1);
      }
    }
    const valores = [...conta.values()];
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const pior = Math.max(...valores.map((v) => Math.abs(v - media) / media));
    expect(conta.size, "nem todos os dígitos apareceram").toBe(10);
    expect(pior, "distribuição enviesada").toBeLessThan(0.2);
  });
});

describe("excluir ambíguos", () => {
  it("tira os caracteres que se confundem à vista", () => {
    const alfabeto = alfabetoDe({ ...TODAS, excluirAmbiguos: true });
    for (const c of "Il1O0S5B8Z2") expect(alfabeto, c).not.toContain(c);
  });

  it("a senha gerada respeita a exclusão", () => {
    for (let i = 0; i < 200; i++) {
      const s = gerarSenha({ ...TODAS, tamanho: 24, excluirAmbiguos: true });
      expect([...s].some((c) => "Il1O0S5B8Z2".includes(c)), s).toBe(false);
    }
  });

  it("continua garantindo uma de cada classe", () => {
    for (let i = 0; i < 200; i++) {
      const s = gerarSenha({ ...TODAS, tamanho: 8, excluirAmbiguos: true });
      expect([...s].some((c) => CLASSES.numeros.includes(c)), s).toBe(true);
    }
  });
});

describe("forcaDaSenha", () => {
  it("cresce com o tamanho e com o alfabeto", () => {
    const curta = forcaDaSenha(8, 26);
    const longa = forcaDaSenha(20, 26);
    const rica = forcaDaSenha(8, 94);
    expect(longa.bits).toBeGreaterThan(curta.bits);
    expect(rica.bits).toBeGreaterThan(curta.bits);
  });

  it("classifica em faixas conhecidas", () => {
    expect(forcaDaSenha(6, 26).nivel).toBe("fraca");      // ~28 bits
    expect(forcaDaSenha(12, 26).nivel).toBe("media");     // ~56 bits
    expect(forcaDaSenha(12, 94).nivel).toBe("forte");     // ~79 bits
    expect(forcaDaSenha(20, 94).nivel).toBe("excelente"); // ~131 bits
  });

  it("a proporção da barra fica entre 0 e 1", () => {
    for (const [t, a] of [[4, 10], [16, 62], [64, 94], [0, 0]]) {
      const f = forcaDaSenha(t, a);
      expect(f.proporcao).toBeGreaterThanOrEqual(0);
      expect(f.proporcao).toBeLessThanOrEqual(1);
    }
  });

  it("entrada inválida não vira NaN na tela", () => {
    for (const f of [forcaDaSenha(0, 0), forcaDaSenha(null, null), forcaDaSenha("x", "y")]) {
      expect(Number.isFinite(f.bits)).toBe(true);
      expect(f.nivel).toBe("fraca");
    }
  });

  it("todo nível tem chave de tradução", () => {
    for (const nivel of ["fraca", "media", "forte", "excelente"]) {
      expect(CHAVE_NIVEL[nivel], nivel).toBeTruthy();
    }
  });
});

describe("a senha NÃO é derivada da seed", () => {
  it("gerar duas vezes com as mesmas opções dá senhas diferentes", () => {
    // O resto do projeto é determinístico de propósito. Aqui não pode ser:
    // a seed fica visível na interface, e uma senha reproduzível por quem lê
    // a tela não poderia ser chamada de forte.
    const opcoes = { ...TODAS, tamanho: 16 };
    expect(gerarSenha(opcoes)).not.toBe(gerarSenha(opcoes));
  });

  it("não aceita rng como entrada", () => {
    // Se alguém voltar a passar um rng achando que funciona, o resultado
    // continua aleatório em vez de virar reproduzível em silêncio.
    const rngFalso = { inteiro: () => 0 };
    const a = gerarSenha({ ...TODAS, tamanho: 16, rng: rngFalso });
    const b = gerarSenha({ ...TODAS, tamanho: 16, rng: rngFalso });
    expect(a).not.toBe(b);
  });
});
