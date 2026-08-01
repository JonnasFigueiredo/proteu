import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  gerarCandidatos,
  classificar,
  melhorCandidato,
  classeSuspeita,
  idSuspeito,
  literalXpath,
  escaparCss,
} from "../src/core/seletores.js";

/** Monta um nó no formato que o agente produz. */
function no(tag, extra = {}) {
  return {
    tag,
    id: null,
    idUnico: false,
    classes: [],
    attrs: {},
    texto: null,
    nth: 1,
    irmaosMesmaTag: 1,
    ...extra,
  };
}

const contexto = (cadeia, extra = {}) => ({
  cadeia,
  caminhoShadow: [],
  caminhoFrame: [],
  ...extra,
});

describe("seletores — higiene de classes e ids", () => {
  it("reconhece classes geradas por ferramenta", () => {
    for (const c of ["css-1a2b3c", "sc-bdVaJa", "Botao__a1B2c", "_ngcontent-abc",
                     "svelte-1x2y3z", "v-1a2b3c4", "is-active", "selected"]) {
      expect(classeSuspeita(c), c).toBe(true);
    }
  });

  it("aceita classes escritas por gente", () => {
    for (const c of ["btn", "form-control", "campo-email", "card__titulo", "primary"]) {
      expect(classeSuspeita(c), c).toBe(false);
    }
  });

  it("reconhece ids instáveis", () => {
    for (const id of ["input_12345", "react-aria-8837261", ":r3:", "ember42", "a3f9c2e81b"]) {
      expect(idSuspeito(id), id).toBe(true);
    }
    expect(idSuspeito("email")).toBe(false);
    expect(idSuspeito("form-login")).toBe(false);
  });
});

describe("seletores — literais", () => {
  it("usa aspas simples quando o texto não tem apóstrofo", () => {
    expect(literalXpath("Salvar")).toBe("'Salvar'");
  });

  it("troca para aspas duplas quando há apóstrofo", () => {
    expect(literalXpath("D'Ávila")).toBe('"D\'Ávila"');
  });

  it("cai em concat() quando há os dois tipos de aspas", () => {
    // XPath 1.0 não tem escape, então concat() é a única saída possível.
    const r = literalXpath(`d'aspas "duplas"`);
    expect(r.startsWith("concat(")).toBe(true);
    expect(r).toContain(`"'"`);
  });

  it("escapa aspas em valor CSS", () => {
    expect(escaparCss('a"b')).toBe('a\\"b');
  });
});

describe("seletores — geração de candidatos", () => {
  it("prioriza atributo de teste sobre tudo", () => {
    const c = gerarCandidatos(contexto([
      no("button", { id: "salvar", attrs: { "data-testid": "botao-salvar", name: "salvar" } }),
      no("body"),
    ]));
    expect(c[0].valor).toBe('[data-testid="botao-salvar"]');
    expect(c[0].tipo).toBe("teste");
  });

  it("rebaixa id que parece gerado, sem descartá-lo", () => {
    const gerado = gerarCandidatos(contexto([no("input", { id: "react-aria-99182734" }), no("body")]));
    const humano = gerarCandidatos(contexto([no("input", { id: "email" }), no("body")]));
    const pId = (lista) => lista.find((c) => c.tipo === "id" && c.sintaxe === "css").pontos;
    expect(pId(gerado)).toBeLessThan(pId(humano));
    // Continua ofertado: às vezes é a única coisa que existe.
    expect(pId(gerado)).toBeGreaterThan(0);
  });

  it("gera XPath por texto exato e por trecho", () => {
    const c = gerarCandidatos(contexto([no("button", { texto: "Confirmar pedido" }), no("body")]));
    const valores = c.map((x) => x.valor);
    expect(valores).toContain("//button[normalize-space()='Confirmar pedido']");
    expect(valores).toContain("//button[contains(normalize-space(),'Confirmar pedido')]");
  });

  it("oferece link text só para âncora", () => {
    const link = gerarCandidatos(contexto([no("a", { texto: "Sair" }), no("body")]));
    const botao = gerarCandidatos(contexto([no("button", { texto: "Sair" }), no("body")]));
    expect(link.some((c) => c.sintaxe === "texto-link")).toBe(true);
    expect(botao.some((c) => c.sintaxe === "texto-link")).toBe(false);
  });

  it("corta o caminho CSS no ancestral com id único", () => {
    const c = gerarCandidatos(contexto([
      no("input", { classes: ["campo"] }),
      no("div", { classes: ["linha"] }),
      no("form", { id: "checkout", idUnico: true }),
      no("body"),
    ]));
    const caminho = c.find((x) => x.tipo === "css-caminho");
    // Sem o corte, o caminho arrastaria body > form > div > input.
    expect(caminho.valor).toBe("#checkout > div.linha > input.campo");
    expect(caminho.valor).not.toContain("body");
  });

  it("desempata por posição quando a classe se repete entre irmãos", () => {
    // Numa grade de campos, todo irmão é `div.campo`: o caminho parece preciso
    // e casa com todos eles. O número de irmãos que a classe não distingue vem
    // do DOM, medido na hora da leitura.
    const c = gerarCandidatos(contexto([
      no("input"),
      no("div", { classes: ["campo"], nth: 3, irmaosMesmaTag: 8, irmaosMesmasClasses: 8 }),
      no("form", { id: "cadastro", idUnico: true }),
    ]));
    const caminho = c.find((x) => x.tipo === "css-caminho");
    expect(caminho.valor).toBe("#cadastro > div.campo:nth-of-type(3) > input");
  });

  it("classe que já distingue o irmão dispensa a posição", () => {
    const c = gerarCandidatos(contexto([
      no("input"),
      no("div", { classes: ["campo"], nth: 3, irmaosMesmaTag: 8, irmaosMesmasClasses: 1 }),
      no("form", { id: "cadastro", idUnico: true }),
    ]));
    const caminho = c.find((x) => x.tipo === "css-caminho");
    expect(caminho.valor).toBe("#cadastro > div.campo > input");
  });

  it("usa nth-of-type quando não há classe estável", () => {
    const c = gerarCandidatos(contexto([
      no("td", { classes: ["css-1a2b3c"], nth: 3, irmaosMesmaTag: 5 }),
      no("tr", { id: "linha-7", idUnico: true }),
      no("body"),
    ]));
    const caminho = c.find((x) => x.tipo === "css-caminho");
    expect(caminho.valor).toBe("#linha-7 > td:nth-of-type(3)");
  });

  it("sempre produz um XPath absoluto como rede de segurança", () => {
    const c = gerarCandidatos(contexto([
      no("span", { nth: 2, irmaosMesmaTag: 3 }),
      no("div"),
      no("body"),
      no("html"),
    ]));
    const abs = c.find((x) => x.tipo === "xpath-absoluto");
    expect(abs.valor).toBe("/html/body/div/span[2]");
    // É o último recurso: tem que ficar no fim da lista.
    expect(c[c.length - 1].tipo).toBe("xpath-absoluto");
  });

  it("não repete o mesmo seletor duas vezes", () => {
    const c = gerarCandidatos(contexto([
      no("input", { id: "email", attrs: { name: "email", "aria-label": "E-mail" } }),
      no("body"),
    ]));
    const chaves = c.map((x) => x.chave);
    expect(chaves.length).toBe(new Set(chaves).size);
  });

  it("devolve lista vazia para contexto inválido", () => {
    expect(gerarCandidatos(null)).toEqual([]);
    expect(gerarCandidatos({ cadeia: [] })).toEqual([]);
  });
});

describe("seletores — fronteiras de Shadow DOM", () => {
  const dentroDeShadow = contexto(
    [no("input", { id: "cpf", attrs: { name: "cpf" } }), no("label")],
    { caminhoShadow: ["#host"] }
  );

  it("não oferece XPath para elemento dentro de shadow root", () => {
    // document.evaluate() não atravessa a fronteira, e o ShadowRoot do
    // Selenium 4 só aceita CSS — By.xpath ali estoura. Oferecer seria
    // entregar um seletor que não roda.
    const c = gerarCandidatos(dentroDeShadow);
    expect(c.length).toBeGreaterThan(0);
    expect(c.filter((x) => x.sintaxe === "xpath")).toEqual([]);
  });

  it("continua oferecendo CSS, que é o que funciona lá", () => {
    const c = gerarCandidatos(dentroDeShadow);
    const valores = c.map((x) => x.valor);
    expect(valores).toContain("#cpf");
    expect(valores).toContain('[name="cpf"]');
  });

  it("fora de shadow root, o XPath volta", () => {
    const c = gerarCandidatos(contexto([no("input", { id: "cpf" }), no("body")]));
    expect(c.some((x) => x.sintaxe === "xpath")).toBe(true);
  });
});

describe("seletores — classificação pela contagem real", () => {
  const candidatos = gerarCandidatos(contexto([
    no("input", { id: "email", attrs: { name: "email", type: "text" } }),
    no("body"),
  ]));

  it("único vence qualquer heurística", () => {
    // O caminho CSS é a estratégia mais fraca da tabela, mas se for o único que
    // casa com um elemento só, é ele que a QA deve usar.
    const caminho = candidatos.find((c) => c.tipo === "css-caminho");
    const contagens = {};
    for (const c of candidatos) contagens[c.chave] = 4;
    contagens[caminho.chave] = 1;

    const melhor = melhorCandidato(candidatos, contagens);
    expect(melhor.chave).toBe(caminho.chave);
    expect(melhor.unico).toBe(true);
  });

  it("empurra para o fim o seletor que não encontra nada", () => {
    const contagens = {};
    for (const c of candidatos) contagens[c.chave] = 1;
    const id = candidatos.find((c) => c.tipo === "id");
    contagens[id.chave] = 0;

    const ordenados = classificar(candidatos, contagens);
    expect(ordenados[ordenados.length - 1].chave).toBe(id.chave);
    expect(ordenados[0].unico).toBe(true);
  });

  it("marca ambíguo sem descartar", () => {
    const contagens = {};
    for (const c of candidatos) contagens[c.chave] = 7;
    const ordenados = classificar(candidatos, contagens);
    expect(ordenados.every((c) => c.unico === false)).toBe(true);
    expect(ordenados.every((c) => c.matches === 7)).toBe(true);
  });

  it("sem contagem nenhuma, mantém a ordem da heurística", () => {
    const ordenados = classificar(candidatos, {});
    expect(ordenados[0].chave).toBe(candidatos[0].chave);
    expect(ordenados.every((c) => c.matches === null)).toBe(true);
  });
});

describe("seletores — contrato com o agente", () => {
  // O painel injeta este módulo na página removendo os `export` do início da
  // linha. Se alguém usar outra forma de export, o agente quebra em silêncio.
  const fonte = readFileSync(new URL("../src/core/seletores.js", import.meta.url), "utf8");

  it("só usa `export` no início da linha", () => {
    const foraDePadrao = fonte
      .split("\n")
      .filter((l) => l.includes("export") && !/^export\s+(const|function)\s/.test(l));
    expect(foraDePadrao, `formas não suportadas pela injeção: ${foraDePadrao.join(" | ")}`).toEqual([]);
  });

  it("continua válido depois de remover os export", () => {
    const semExport = fonte.replace(/^export\s+/gm, "");
    expect(() => new Function(semExport)).not.toThrow();
  });

  it("não importa nada — o agente não tem resolvedor de módulos", () => {
    expect(fonte).not.toMatch(/^\s*import\s/m);
  });
});
