import { describe, it, expect } from "vitest";
import {
  CONVENCOES,
  LINGUAGENS,
  CONVENCAO_PADRAO,
  papelDe,
  nomearElemento,
  desambiguar,
  gerarRascunho,
  nomeArquivoRascunho,
} from "../src/core/mapeador.js";

/** Descritor no formato que leitura-dom.descreverNo devolve. */
const no = (over = {}) => ({
  tag: "input", id: null, idUnico: false, classes: [], attrs: {},
  texto: "", nth: 1, irmaosMesmaTag: 1, irmaosMesmasClasses: 1, ...over,
});

const css = (valor) => ({ valor, sintaxe: "css" });

describe("papelDe — o que o elemento é para quem automatiza", () => {
  // `input` sozinho não basta: checkbox e campo de texto se automatizam de
  // formas diferentes, e o nome da variável deveria dizer qual é.
  it.each([
    [{ tag: "button" }, "botao"],
    [{ tag: "a" }, "link"],
    [{ tag: "select" }, "combo"],
    [{ tag: "textarea" }, "campo"],
    [{ tag: "input", attrs: { type: "text" } }, "campo"],
    [{ tag: "input", attrs: { type: "checkbox" } }, "caixa"],
    [{ tag: "input", attrs: { type: "radio" } }, "radio"],
    [{ tag: "input", attrs: { type: "submit" } }, "botao"],
    [{ tag: "input" }, "campo"],
    [{ tag: "img" }, "imagem"],
    [{ tag: "table" }, "tabela"],
    [{ tag: "h2" }, "texto"],
    [{ tag: "div" }, "elemento"],
  ])("%o → %s", (parcial, esperado) => {
    expect(papelDe(no(parcial))).toBe(esperado);
  });

  it("role=button vale como botão mesmo numa div", () => {
    expect(papelDe(no({ tag: "div", attrs: { role: "button" } }))).toBe("botao");
  });

  it("aguenta descritor faltando sem quebrar", () => {
    expect(papelDe(null)).toBe("elemento");
    expect(papelDe({})).toBe("elemento");
  });
});

describe("nomearElemento — de onde sai o nome", () => {
  it("prefere data-testid a tudo", () => {
    // É o atributo que existe para automação: sobrevive a redesenho.
    const n = no({
      tag: "input", id: "x1", attrs: { "data-testid": "email-login", name: "usr" },
    });
    expect(nomearElemento(n, "camelCase")).toBe("campoEmailLogin");
  });

  it("cai para name quando não há atributo de teste", () => {
    expect(nomearElemento(no({ attrs: { name: "cpf" } }), "camelCase")).toBe("campoCpf");
  });

  it("usa o texto do botão quando é o que identifica", () => {
    const n = no({ tag: "button", texto: "Salvar alterações" });
    expect(nomearElemento(n, "camelCase")).toBe("botaoSalvarAlteracoes");
  });

  it("acento vira a letra base em vez de cortar a palavra", () => {
    // A maior parte das telas que passam por aqui está em português: se o "ç"
    // quebrasse a palavra, `botaoSalvarAlteraEs` seria o caso comum.
    const casos = [
      [{ tag: "button", texto: "Endereço" }, "botaoEndereco"],
      [{ tag: "button", texto: "Não aplicável" }, "botaoNaoAplicavel"],
      [{ tag: "input", attrs: { name: "observação" } }, "campoObservacao"],
      [{ tag: "button", texto: "Größe" }, "botaoGrosse"],
    ];
    for (const [parcial, esperado] of casos) {
      expect(nomearElemento(no(parcial), "camelCase"), JSON.stringify(parcial)).toBe(esperado);
    }
  });

  it("o nome gerado é sempre ASCII", () => {
    // Nome com acento briga com a convenção das linguagens e com ferramentas
    // que ainda tropeçam em UTF-8 no identificador.
    for (const texto of ["Ação", "Confirmação", "日本語", "مرحبا", "Grüße"]) {
      const nome = nomearElemento(no({ tag: "button", texto }), "camelCase");
      expect([...nome].every((c) => c.codePointAt(0) < 128), `${texto} → ${nome}`).toBe(true);
    }
  });

  it("usa aria-label e placeholder como pista", () => {
    expect(nomearElemento(no({ attrs: { "aria-label": "Buscar" } }), "camelCase"))
      .toBe("campoBuscar");
    expect(nomearElemento(no({ attrs: { placeholder: "Seu e-mail" } }), "camelCase"))
      .toBe("campoSeuEMail");
  });

  it("ignora id gerado por build em vez de virar nome ilegível", () => {
    // `campoA3f9c21` não é reconhecível e some no próximo deploy.
    for (const idRuim of ["a3f9c21e", "css-1x2y3z", "sc-bdVaJa", "9lives"]) {
      const nome = nomearElemento(no({ id: idRuim, attrs: { name: "email" } }), "camelCase");
      expect(nome, idRuim).toBe("campoEmail");
    }
  });

  it("descarta palavras que não distinguem nada", () => {
    const n = no({ attrs: { name: "form-control-input-email" } });
    expect(nomearElemento(n, "camelCase")).toBe("campoEmail");
  });

  it("não deixa o nome virar frase", () => {
    const n = no({ tag: "button", texto: "Confirmar o envio do formulário agora mesmo" });
    const nome = nomearElemento(n, "camelCase");
    // prefixo + no máximo 4 palavras
    expect(nome.length).toBeLessThan(45);
  });

  it("não repete o papel quando a fonte já o contém", () => {
    // "botaoBotaoSalvar" se lê mal.
    const n = no({ tag: "button", attrs: { name: "botao-salvar" } });
    expect(nomearElemento(n, "camelCase")).toBe("botaoSalvar");
  });

  it("sem pista nenhuma ainda produz nome utilizável", () => {
    const nome = nomearElemento(no({ tag: "div" }), "camelCase");
    expect(nome).toBeTruthy();
    expect(nome).toMatch(/^[A-Za-z_$]/);
  });
});

describe("nomearElemento — convenções", () => {
  const n = no({ attrs: { "data-testid": "email-login" } });

  it.each([
    ["camelCase", "campoEmailLogin"],
    ["PascalCase", "CampoEmailLogin"],
    ["snake_case", "campo_email_login"],
    ["UPPER_SNAKE", "CAMPO_EMAIL_LOGIN"],
    ["kebab-case", "campo-email-login"],
  ])("%s → %s", (conv, esperado) => {
    expect(nomearElemento(n, conv)).toBe(esperado);
  });

  it("quebra camelCase da origem em palavras antes de aplicar", () => {
    // Um `data-testid="emailLogin"` em snake_case tem que virar email_login,
    // não emaillogin.
    const camel = no({ attrs: { "data-testid": "emailLogin" } });
    expect(nomearElemento(camel, "snake_case")).toBe("campo_email_login");
  });

  it("convenção desconhecida cai no padrão em vez de estourar", () => {
    expect(() => nomearElemento(n, "klingon")).not.toThrow();
  });

  it("toda convenção declarada funciona", () => {
    for (const c of CONVENCOES) {
      const nome = nomearElemento(n, c.id);
      expect(nome, c.id).toBeTruthy();
    }
  });
});

describe("desambiguar — número só quando precisa", () => {
  it("nome único fica sem sufixo", () => {
    // `campoEmail1` quando só existe um se lê como parte do nome.
    expect(desambiguar(["campoEmail", "botaoOk"])).toEqual(["campoEmail", "botaoOk"]);
  });

  it("repetido vira 1, 2, 3 na ordem de captura", () => {
    expect(desambiguar(["campoItem", "campoItem", "campoItem"]))
      .toEqual(["campoItem1", "campoItem2", "campoItem3"]);
  });

  it("respeita o separador da convenção", () => {
    expect(desambiguar(["campo_item", "campo_item"])).toEqual(["campo_item_1", "campo_item_2"]);
    expect(desambiguar(["campo-item", "campo-item"])).toEqual(["campo-item-1", "campo-item-2"]);
  });

  it("não deixa nome duplicado passar", () => {
    // Duplicata vira erro de compilação na IDE — o oposto de rascunho útil.
    const saida = desambiguar(["a", "a", "b", "a", "b"]);
    expect(new Set(saida).size).toBe(saida.length);
  });
});

describe("gerarRascunho — uma linha por elemento", () => {
  const elementos = [
    { no: no({ attrs: { "data-testid": "email" } }), seletor: css("#email"), matches: 1 },
    { no: no({ tag: "button", texto: "Entrar" }), seletor: css(".btn-entrar"), matches: 1 },
  ];

  it("Java declara By", () => {
    const t = gerarRascunho(elementos, "java-selenium", "camelCase");
    expect(t).toContain('private final By campoEmail = By.cssSelector("#email");');
    expect(t).toContain('private final By botaoEntrar = By.cssSelector(".btn-entrar");');
  });

  it("Python Selenium usa tupla (By.X, valor)", () => {
    const t = gerarRascunho(elementos, "python-selenium", "snake_case");
    expect(t).toContain('campo_email = (By.CSS_SELECTOR, "#email")');
  });

  it("Playwright JS usa page.locator", () => {
    const t = gerarRascunho(elementos, "js-playwright", "camelCase");
    expect(t).toContain("const campoEmail = page.locator('#email');");
  });

  it("TypeScript anota o tipo Locator", () => {
    const t = gerarRascunho(elementos, "ts-playwright", "camelCase");
    expect(t).toContain("const campoEmail: Locator = page.locator('#email');");
  });

  it("Robot Framework usa a sintaxe de variável", () => {
    const t = gerarRascunho(elementos, "robot-framework", "snake_case");
    expect(t).toContain("${campo_email}    css=#email");
  });

  it("XPath ganha o prefixo que o Playwright exige", () => {
    const el = [{ no: no(), seletor: { valor: "//input[@id='x']", sintaxe: "xpath" }, matches: 1 }];
    expect(gerarRascunho(el, "js-playwright", "camelCase")).toContain("page.locator('xpath=//input");
  });

  it("XPath vira By.xpath no Selenium", () => {
    const el = [{ no: no(), seletor: { valor: "//input", sintaxe: "xpath" }, matches: 1 }];
    expect(gerarRascunho(el, "java-selenium", "camelCase")).toContain('By.xpath("//input")');
  });

  it("uma linha por elemento, sem cabeçalho para apagar", () => {
    // É rascunho para colar na IDE: imports e classe em volta seriam atrito.
    const t = gerarRascunho(elementos, "java-selenium", "camelCase");
    expect(t.split("\n")).toHaveLength(2);
    expect(t).not.toMatch(/import|class |package/);
  });

  it("lista vazia devolve string vazia, não lixo", () => {
    expect(gerarRascunho([], "java-selenium", "camelCase")).toBe("");
    expect(gerarRascunho(null, "java-selenium", "camelCase")).toBe("");
  });

  it("linguagem desconhecida cai no padrão em vez de estourar", () => {
    expect(() => gerarRascunho(elementos, "cobol", "camelCase")).not.toThrow();
  });

  it("toda linguagem declarada gera linha para todo elemento", () => {
    for (const l of LINGUAGENS) {
      const t = gerarRascunho(elementos, l.id, CONVENCAO_PADRAO[l.id]);
      expect(t.split("\n"), l.id).toHaveLength(2);
      expect(t, l.id).toContain("#email");
    }
  });
});

describe("gerarRascunho — avisa sobre localizador ambíguo", () => {
  // Copiar um seletor que casa com vários sem avisar entrega um teste que passa
  // hoje e quebra quando a tela ganhar mais um item igual. A página está aberta
  // agora; depois, na IDE, não dá mais para conferir.
  const ambiguo = [{ no: no({ tag: "button" }), seletor: css(".item"), matches: 7 }];

  it("marca a linha com o número de elementos", () => {
    const t = gerarRascunho(ambiguo, "java-selenium", "camelCase");
    expect(t).toContain("casa com 7 elementos");
  });

  it("usa o comentário certo de cada linguagem", () => {
    expect(gerarRascunho(ambiguo, "python-selenium", "snake_case")).toMatch(/#\s*atenção/);
    expect(gerarRascunho(ambiguo, "js-playwright", "camelCase")).toMatch(/\/\/\s*atenção/);
    expect(gerarRascunho(ambiguo, "robot-framework", "snake_case")).toMatch(/#\s*atenção/);
  });

  it("não marca quando o localizador é único", () => {
    const unico = [{ no: no(), seletor: css("#x"), matches: 1 }];
    expect(gerarRascunho(unico, "java-selenium", "camelCase")).not.toContain("atenção");
  });

  it("dá para desligar a anotação", () => {
    const t = gerarRascunho(ambiguo, "java-selenium", "camelCase", { anotarAmbiguos: false });
    expect(t).not.toContain("atenção");
  });

  it("sem contagem conhecida, não inventa aviso", () => {
    const sem = [{ no: no(), seletor: css(".x") }];
    expect(gerarRascunho(sem, "java-selenium", "camelCase")).not.toContain("atenção");
  });
});

describe("gerarRascunho — escape de literais", () => {
  it("aspas no seletor não quebram a linha gerada", () => {
    const el = [{ no: no(), seletor: css(`[title="ele disse \\"oi\\""]`), matches: 1 }];
    const js = gerarRascunho(el, "js-playwright", "camelCase");
    // A linha tem que ser JS válido de verdade, não só parecer.
    const literal = js.slice(js.indexOf("page.locator(") + 13, js.lastIndexOf(")"));
    expect(() => eval(literal)).not.toThrow();
  });

  it("apóstrofo vai escapado no literal JS", () => {
    const el = [{ no: no(), seletor: css("[data-x='a']"), matches: 1 }];
    const js = gerarRascunho(el, "js-playwright", "camelCase");
    const literal = js.slice(js.indexOf("page.locator(") + 13, js.lastIndexOf(")"));
    expect(eval(literal)).toBe("[data-x='a']");
  });

  it("barra invertida sobrevive no literal Java", () => {
    const el = [{ no: no(), seletor: css("a\\b"), matches: 1 }];
    expect(gerarRascunho(el, "java-selenium", "camelCase")).toContain('"a\\\\b"');
  });
});

describe("nomeArquivoRascunho", () => {
  it("usa a extensão da linguagem", () => {
    expect(nomeArquivoRascunho("java-selenium", "login")).toBe("login.java");
    expect(nomeArquivoRascunho("python-selenium", "login")).toBe("login.py");
    expect(nomeArquivoRascunho("robot-framework", "login")).toBe("login.robot");
  });

  it("limpa caracteres que não valem em nome de arquivo", () => {
    expect(nomeArquivoRascunho("texto", "Tela de Login!")).toBe("Tela-de-Login.txt");
  });

  it("nome vazio ainda gera arquivo válido", () => {
    expect(nomeArquivoRascunho("texto", "///")).toBe("elementos.txt");
  });
});

describe("mapeador — catálogo consistente", () => {
  it("toda linguagem tem convenção padrão declarada", () => {
    // Sem isto a UI abriria em camelCase para Python, que destoa da linguagem.
    for (const l of LINGUAGENS) {
      expect(CONVENCAO_PADRAO[l.id], `falta padrão para ${l.id}`).toBeTruthy();
      expect(CONVENCOES.map((c) => c.id)).toContain(CONVENCAO_PADRAO[l.id]);
    }
  });

  it("ids de linguagem e convenção são únicos", () => {
    const ids = LINGUAGENS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const cs = CONVENCOES.map((c) => c.id);
    expect(new Set(cs).size).toBe(cs.length);
  });
});
