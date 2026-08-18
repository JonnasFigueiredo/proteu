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
  escolherCandidato,
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
    // #email vira By.id: e a estrategia nativa, e o teste acompanha a mudanca.
    expect(t).toContain('private final By campoEmail = By.id("email");');
    expect(t).toContain('private final By botaoEntrar = By.cssSelector(".btn-entrar");');
  });

  it("Python Selenium usa tupla (By.X, valor)", () => {
    const t = gerarRascunho(elementos, "python-selenium", "snake_case");
    expect(t).toContain('campo_email = (By.ID, "email")');
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
    expect(t).toContain("${campo_email}    id=email");
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
      // Selenium e Robot passam a usar a estrategia de id; os demais seguem com CSS.
      expect(t, l.id).toMatch(/#email|"email"|id=email/);
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

describe("escolha do localizador por linguagem", () => {
  // Bug relatado testando: o rascunho alternava CSS e XPath sem critério
  // visível. A escolha antiga olhava só a estabilidade e ignorava para onde o
  // código ia — e chegava a entregar XPath para Cypress, que não executa XPath
  // sem plugin.

  /** Mesmo elemento oferecendo XPath primeiro, id e name depois. */
  const comId = {
    no: no({ attrs: { name: "email" } }),
    candidatos: [
      // Pontos como o motor atribui: id 90, name 78, texto 60, todos +200 por
      // serem únicos. A ordem da lista é de propósito a "errada", para provar
      // que a escolha não é posicional.
      { tipo: "texto", sintaxe: "xpath", valor: '//input[@name="email"]', matches: 1, unico: true, pontos: 260 },
      { tipo: "id", sintaxe: "css", valor: "#login-email", matches: 1, unico: true, pontos: 290 },
      { tipo: "name", sintaxe: "css", valor: '[name="email"]', matches: 1, unico: true, pontos: 278 },
    ],
  };

  it("Selenium usa a estratégia nativa de id, não cssSelector", () => {
    // By.id é mais rápido que o motor de CSS e diz a intenção a quem lê.
    expect(gerarRascunho([comId], "java-selenium", "camelCase"))
      .toContain('By.id("login-email")');
    expect(gerarRascunho([comId], "python-selenium", "snake_case"))
      .toContain('(By.ID, "login-email")');
    expect(gerarRascunho([comId], "csharp-selenium", "PascalCase"))
      .toContain('By.Id("login-email")');
  });

  it("Selenium usa By.name quando a âncora é o name", () => {
    const soName = { no: no(), candidatos: [
      { tipo: "name", sintaxe: "css", valor: '[name="cpf"]', matches: 1, unico: true, pontos: 278 },
    ] };
    expect(gerarRascunho([soName], "java-selenium", "camelCase")).toContain('By.name("cpf")');
    expect(gerarRascunho([soName], "python-selenium", "snake_case")).toContain('(By.NAME, "cpf")');
  });

  it("Robot Framework usa o prefixo id=", () => {
    expect(gerarRascunho([comId], "robot-framework", "snake_case")).toContain("id=login-email");
  });

  it("o id vence o XPath mesmo vindo depois na lista", () => {
    for (const l of LINGUAGENS) {
      const t = gerarRascunho([comId], l.id, CONVENCAO_PADRAO[l.id]);
      expect(t, `${l.id} preferiu XPath a id`).not.toContain("//input");
    }
  });

  it("Cypress e Playwright nunca recebem XPath quando existe CSS", () => {
    for (const l of ["js-cypress", "js-playwright", "ts-playwright", "python-playwright"]) {
      expect(gerarRascunho([comId], l, CONVENCAO_PADRAO[l]), l).not.toContain("xpath");
    }
  });

  it("sem CSS disponível, entrega o XPath mas avisa", () => {
    // Calar seria entregar código que não roda; omitir a linha seria perder o
    // elemento que a QA mapeou. Entregar com aviso é o único caminho honesto.
    const soXpath = { no: no({ tag: "button" }), candidatos: [
      { tipo: "texto", sintaxe: "xpath", valor: '//button[.="Salvar"]', matches: 1, unico: true, pontos: 260 },
    ] };
    const cy = gerarRascunho([soXpath], "js-cypress", "camelCase");
    expect(cy).toContain("//button");
    expect(cy).toContain("plugin");
  });

  it("único sempre vence ambíguo, mesmo com tipo pior", () => {
    const misto = { no: no(), candidatos: [
      { tipo: "id", sintaxe: "css", valor: "#repetido", matches: 4, unico: false, pontos: 46 },
      { tipo: "css-caminho", sintaxe: "css", valor: "form > input:nth-of-type(2)", matches: 1, unico: true, pontos: 234 },
    ] };
    const t = gerarRascunho([misto], "java-selenium", "camelCase");
    expect(t).toContain("nth-of-type(2)");
    expect(t).not.toContain("#repetido");
  });

  it("escolherCandidato aguenta lista vazia ou ausente", () => {
    expect(escolherCandidato([], "java-selenium")).toBeNull();
    expect(escolherCandidato(null, "java-selenium")).toBeNull();
    expect(escolherCandidato(undefined, "js-cypress")).toBeNull();
  });

  it("elemento capturado antes desta versão continua gerando", () => {
    // Só tem `seletor`, sem a lista de candidatos. Perder essas linhas apagaria
    // o rascunho de quem já estava usando.
    const antigo = { no: no({ attrs: { name: "cpf" } }), seletor: css("#cpf"), matches: 1 };
    expect(gerarRascunho([antigo], "java-selenium", "camelCase")).toContain("cpf");
  });
});

describe("a preferência da linguagem não atropela o motor", () => {
  // Regressão real: uma primeira versão ordenou por uma lista fixa de tipos e
  // jogou fora a pontuação do motor. O resultado foi By.id("a3f9c21e") num
  // botão cujo id é hash de build — o motor já tinha penalizado esse id em 45
  // pontos e preferido o texto visível, e a ordenação por tipo desfez isso.

  it("id gerado por build perde para o texto, mesmo sendo 'id'", () => {
    const el = { no: no({ tag: "button", texto: "Salvar" }), candidatos: [
      // 90 − 45 (penalidade de id suspeito) + 200 (único) = 245
      { tipo: "id", sintaxe: "css", valor: "#a3f9c21e", matches: 1, unico: true, pontos: 245 },
      // 60 + 200 = 260
      { tipo: "texto", sintaxe: "xpath", valor: '//button[.="Salvar"]', matches: 1, unico: true, pontos: 260 },
    ] };
    const t = gerarRascunho([el], "java-selenium", "camelCase");
    expect(t, "voltou a usar o id de build").not.toContain("a3f9c21e");
    expect(t).toContain("By.xpath");
  });

  it("id normal continua ganhando do texto", () => {
    const el = { no: no(), candidatos: [
      { tipo: "id", sintaxe: "css", valor: "#salvar", matches: 1, unico: true, pontos: 290 },
      { tipo: "texto", sintaxe: "xpath", valor: '//button[.="Salvar"]', matches: 1, unico: true, pontos: 260 },
    ] };
    expect(gerarRascunho([el], "java-selenium", "camelCase")).toContain('By.id("salvar")');
  });

  it("a linguagem filtra, não reordena", () => {
    // Cypress descarta o XPath e fica com o melhor CSS restante — não com o
    // primeiro CSS que aparecer na lista.
    const el = { no: no(), candidatos: [
      { tipo: "texto", sintaxe: "xpath", valor: "//b", matches: 1, unico: true, pontos: 260 },
      { tipo: "css-caminho", sintaxe: "css", valor: "div > b", matches: 1, unico: true, pontos: 234 },
      { tipo: "id", sintaxe: "css", valor: "#alvo", matches: 1, unico: true, pontos: 290 },
    ] };
    expect(gerarRascunho([el], "js-cypress", "camelCase")).toContain("#alvo");
  });
});
