import { describe, it, expect } from "vitest";
import { paraConsole } from "../src/core/gravador/console.js";
import { gerarCodigo, FORMATOS } from "../src/core/gravador/codigo.js";

const sel = (v) => ({ valor: v, sintaxe: "css" });
const ACOES = [
  { tipo: "preencher", alvoId: "a1", valor: "X", seletor: sel("#nome") },
  { tipo: "preencher", alvoId: "a2", valor: "Y", seletor: sel("#cpf") },
  { tipo: "selecionar", alvoId: "a3", valor: "SP", seletor: sel("#uf") },
  { tipo: "marcar", alvoId: "a4", valor: true, seletor: sel("#aceito") },
  { tipo: "clicar", alvoId: "a5", seletor: sel("#salvar") },
];

/** O script tem que ser JS válido — senão colar no console só produz erro. */
const parseia = (src) => { new Function(src); return true; };

describe("script de console — o gerado precisa rodar", () => {
  it("o resultado é JavaScript válido", () => {
    expect(parseia(paraConsole(ACOES))).toBe(true);
  });

  it("continua válido com roteiro vazio", () => {
    expect(parseia(paraConsole([]))).toBe(true);
    expect(parseia(paraConsole(null))).toBe(true);
  });

  it("não depende de import nem de runner", () => {
    // É o que separa este formato dos outros: ele roda onde foi colado.
    const src = paraConsole(ACOES);
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/require\(/);
    expect(src).not.toMatch(/from ["']playwright|selenium/i);
  });

  it("traduz cada tipo de ação para a API do DOM", () => {
    const src = paraConsole(ACOES);
    expect(src).toContain('await _preencher("#nome"');
    expect(src).toContain('await _selecionar("#uf", "SP")');
    expect(src).toContain('await _marcar("#aceito", true)');
    expect(src).toContain('await _clicar("#salvar")');
  });

  it("escreve pelo setter nativo, para React e Vue perceberem", () => {
    // Atribuir .value direto atualiza o DOM e não o estado do framework: o
    // valor some no próximo render e o cadastro sai vazio.
    const src = paraConsole(ACOES);
    expect(src).toContain("getOwnPropertyDescriptor");
    expect(src).toContain('dispatchEvent(new Event("input"');
  });

  it("espera o elemento aparecer antes de agir", () => {
    // Em SPA a tela raramente responde no mesmo tick; sem espera o script
    // corre na frente e falha em elemento que ia existir.
    expect(paraConsole(ACOES)).toContain("_esperar");
  });
});

describe("script de console — repetição e massa", () => {
  it("repete o número de vezes pedido", () => {
    expect(paraConsole(ACOES, { repeticoes: 30 })).toContain("const REPETICOES = 30;");
  });

  it("nunca gera menos de uma volta", () => {
    for (const ruim of [0, -5, null, undefined, "abc"]) {
      expect(paraConsole(ACOES, { repeticoes: ruim })).toContain("const REPETICOES = 1;");
    }
  });

  it("consome uma persona por volta", () => {
    // Repetir o mesmo dado esbarra em unicidade (CPF, e-mail) na segunda volta.
    const src = paraConsole(ACOES, {
      personas: [{ nome: "Ana", cpf: "111" }, { nome: "Bruno", cpf: "222" }],
      mapaDeCampos: { a1: "nome", a2: "cpf" },
    });
    expect(src).toContain("PERSONAS[i % PERSONAS.length]");
    expect(src).toContain('await _preencher("#nome", d["nome"])');
    expect(src).toContain('await _preencher("#cpf", d["cpf"])');
    expect(src).toContain('"nome": "Ana"');
  });

  it("campo fora do mapa mantém o valor gravado", () => {
    const src = paraConsole(ACOES, {
      personas: [{ nome: "Ana" }],
      mapaDeCampos: { a1: "nome" },
    });
    expect(src).toContain('await _preencher("#cpf", "Y")'); // literal, não d[...]
  });

  it("sem personas, o script ainda roda com os valores gravados", () => {
    const src = paraConsole(ACOES, { repeticoes: 3 });
    expect(parseia(src)).toBe(true);
    expect(src).toContain('await _preencher("#nome", "X")');
  });

  it("para no primeiro erro por padrão, e segue se pedirem", () => {
    // Trinta cadastros falhando em sequência enchem a base de lixo.
    expect(paraConsole(ACOES, { repeticoes: 5 })).toContain("return;");
    const segue = paraConsole(ACOES, { repeticoes: 5, pararNoErro: false });
    expect(segue).toContain("segue para a proxima volta");
  });

  it("respeita a pausa entre voltas", () => {
    expect(paraConsole(ACOES, { pausaMs: 1500 })).toContain("const PAUSA_MS = 1500;");
    expect(paraConsole(ACOES, { pausaMs: -10 })).toContain("const PAUSA_MS = 0;");
  });
});

describe("script de console — o que ele não consegue fazer", () => {
  it("XPath roda: o navegador tem document.evaluate nativo", () => {
    // Uma primeira versão comentava a linha por achar que só querySelector
    // existia — e o valor digitado se perdia junto, deixando o cadastro
    // incompleto sem aviso.
    const src = paraConsole([
      { tipo: "preencher", valor: "s3nh@", seletor: { valor: "//input[@name='senha']", sintaxe: "xpath" } },
      { tipo: "clicar", seletor: { valor: "//button", sintaxe: "xpath" } },
    ]);
    expect(parseia(src)).toBe(true);
    expect(src).toContain("document.evaluate");
    expect(src, "o valor digitado sumiu").toContain("s3nh@");
    expect(src).toContain('await _clicar("//button")');
  });

  it("deixa a navegação comentada em vez de recarregar sozinho", () => {
    // Recarregar a página no meio mataria o próprio script.
    const src = paraConsole([{ tipo: "navegar", valor: "https://exemplo.test/novo" }]);
    expect(src).toContain("// location.href");
    expect(parseia(src)).toBe(true);
  });

  it("ação sem seletor vira comentário, não erro de sintaxe", () => {
    expect(parseia(paraConsole([{ tipo: "clicar" }]))).toBe(true);
  });

  it("aspas e barras no valor não quebram o script", () => {
    const src = paraConsole([
      { tipo: "preencher", valor: 'ele disse "oi" \ fim', seletor: sel("#x") },
    ]);
    expect(parseia(src)).toBe(true);
  });
});

describe("script de console — registrado como formato", () => {
  it("aparece na lista do gravador", () => {
    expect(FORMATOS.map((f) => f.id)).toContain("console-js");
  });

  it("gerarCodigo despacha para ele", () => {
    const src = gerarCodigo(ACOES, "console-js", { jaNormalizado: true, repeticoes: 2 });
    expect(parseia(src)).toBe(true);
    expect(src).toContain("const REPETICOES = 2;");
  });
});
