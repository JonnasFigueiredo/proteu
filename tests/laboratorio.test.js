import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gerar } from "../src/core/gerador.js";

// A página de laboratório (tests/e2e/laboratorio.html) valida os documentos com
// implementações PRÓPRIAS, que não importam nada de src/. É de propósito: se um
// gerador quebrar, ela acusa por um caminho independente.
//
// Estes testes garantem as duas pontas: que a página continua executável e que
// os dois lados continuam concordando.

const HTML = readFileSync(new URL("./e2e/laboratorio.html", import.meta.url), "utf8");
const SCRIPT = HTML.match(/<script>([\s\S]*?)<\/script>/)[1];

describe("página de laboratório — sanidade do fonte", () => {
  it("o script inteiro é sintaticamente válido", () => {
    // Um erro de sintaxe mata o <script> inteiro em silêncio: a página abre
    // bonita e nada funciona. Já aconteceu — o regex de invisíveis, escrito com
    // os caracteres literais, ficou sem o `/` de fechamento.
    expect(() => new Function(SCRIPT)).not.toThrow();
  });

  it("não tem caracteres invisíveis literais no fonte", () => {
    const proibidos = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;
    const achados = [...SCRIPT.matchAll(proibidos)].map(
      (m) => "U+" + m[0].codePointAt(0).toString(16).toUpperCase()
    );
    expect(achados, `use escapes \\uXXXX, não o caractere: ${achados.join(" ")}`).toEqual([]);
  });

  it("todo campo de validação tem o selo correspondente", () => {
    const tipos = [...HTML.matchAll(/data-valida="(\w+)"/g)].map((m) => m[1]);
    expect(tipos.length).toBeGreaterThan(0);
    for (const tipo of tipos) {
      expect(HTML, `falta <span id="sel-v-${tipo}">`).toContain(`id="sel-v-${tipo}"`);
      expect(SCRIPT, `VALIDADORES não tem "${tipo}"`).toMatch(new RegExp(`\\b${tipo}:`));
    }
  });
});

// Extrai só o bloco dos validadores e o executa isolado, sem DOM.
function carregarValidadores() {
  const inicio = SCRIPT.indexOf("// ---------- Validadores independentes");
  const fim = SCRIPT.indexOf("// ---------- Contagens");
  expect(inicio, "marcador de início dos validadores sumiu").toBeGreaterThan(-1);
  expect(fim, "marcador de fim dos validadores sumiu").toBeGreaterThan(inicio);
  return new Function(SCRIPT.slice(inicio, fim) + "\n return VALIDADORES;")();
}

describe("página de laboratório — validação cruzada com os geradores", () => {
  const V = carregarValidadores();

  // [rótulo do validador, país, tipo do gerador]
  const CASOS = [
    ["cpf", "br", "cpf"],
    ["cnpj", "br", "cnpj"],
    ["iban", "de", "iban"],
    ["luhn", "ca", "sin"],
    ["verhoeff", "in", "aadhaar"],
    ["mod1110", "de", "steuerId"],
  ];

  it.each(CASOS)("%s: aceita 50 valores gerados de verdade", (validador, pais, tipo) => {
    for (let contador = 0; contador < 50; contador++) {
      const { valor } = gerar(tipo, { pais, seed: "lab", contador, documentos: { mascara: true } });
      expect(V[validador](valor), `${tipo} recusado: ${valor}`).toBe(true);
    }
  });

  it.each(CASOS)("%s: recusa o mesmo valor com um dígito trocado", (validador, pais, tipo) => {
    // Sem esta metade, um validador que só retorna `true` passaria no teste
    // de cima e a página daria "válido" para qualquer lixo.
    for (let contador = 0; contador < 50; contador++) {
      const { valor } = gerar(tipo, { pais, seed: "lab", contador, documentos: { mascara: true } });
      const adulterado = valor.replace(/(\d)(\D*)$/, (_, d, cauda) => String((Number(d) + 1) % 10) + cauda);
      expect(adulterado, "adulteração não mudou nada").not.toBe(valor);
      expect(V[validador](adulterado), `${tipo} aceitou adulterado: ${adulterado}`).toBe(false);
    }
  });

  it("recusa entrada vazia, curta e não numérica", () => {
    for (const [nome, fn] of Object.entries(V)) {
      for (const lixo of ["", "   ", "abc", "0", "000000000000000000"]) {
        expect(fn(lixo), `${nome} aceitou "${lixo}"`).toBe(false);
      }
    }
  });
});
