import { describe, it, expect } from "vitest";
import { normalizar, descrever, validar } from "../src/core/gravador/acoes.js";
import { gerarCodigo, nomeArquivo, FORMATOS } from "../src/core/gravador/codigo.js";

const sel = (valor, sintaxe = "css") => ({ valor, sintaxe, chave: `${sintaxe}:${valor}` });

const ev = (tipo, extra = {}) => ({
  tipo,
  em: extra.em ?? Date.now(),
  alvoId: extra.alvoId ?? "e1",
  seletor: extra.seletor ?? sel("#campo"),
  ...extra,
});

describe("gravador — normalização", () => {
  it("colapsa a digitação num único preenchimento com o valor final", () => {
    // O navegador dispara um `input` por tecla; o teste só quer o valor final.
    const crus = "joao".split("").map((_, i) =>
      ev("preencher", { alvoId: "e1", valor: "joao".slice(0, i + 1), em: i })
    );
    const r = normalizar(crus);
    expect(r).toHaveLength(1);
    expect(r[0].valor).toBe("joao");
  });

  it("não junta digitação de campos diferentes", () => {
    const r = normalizar([
      ev("preencher", { alvoId: "e1", valor: "joao", em: 1 }),
      ev("preencher", { alvoId: "e2", valor: "silva", em: 2 }),
    ]);
    expect(r).toHaveLength(2);
    expect(r.map((a) => a.valor)).toEqual(["joao", "silva"]);
  });

  it("descarta o clique que só serviu para focar o campo", () => {
    const r = normalizar([
      ev("clicar", { alvoId: "e1", em: 1 }),
      ev("preencher", { alvoId: "e1", valor: "x", em: 2 }),
    ]);
    expect(r.map((a) => a.tipo)).toEqual(["preencher"]);
  });

  it("mantém o clique quando o preenchimento é de outro campo", () => {
    const r = normalizar([
      ev("clicar", { alvoId: "e1", em: 1 }),
      ev("preencher", { alvoId: "e2", valor: "x", em: 2 }),
    ]);
    expect(r.map((a) => a.tipo)).toEqual(["clicar", "preencher"]);
  });

  it("descarta o clique que abriu o select antes da escolha", () => {
    const r = normalizar([
      ev("clicar", { alvoId: "e3", em: 1 }),
      ev("selecionar", { alvoId: "e3", valor: "sp", texto: "São Paulo", em: 2 }),
    ]);
    expect(r.map((a) => a.tipo)).toEqual(["selecionar"]);
  });

  it("não conta o mesmo gesto duas vezes em checkbox", () => {
    const r = normalizar([
      ev("clicar", { alvoId: "e4", em: 1 }),
      ev("marcar", { alvoId: "e4", valor: true, em: 2 }),
    ]);
    expect(r.map((a) => a.tipo)).toEqual(["marcar"]);
  });

  it("guarda só as teclas que mudam o fluxo", () => {
    const r = normalizar([
      ev("tecla", { valor: "a", em: 1 }),
      ev("tecla", { valor: "Shift", em: 2 }),
      ev("tecla", { valor: "Tab", em: 3 }),
      ev("tecla", { valor: "Enter", em: 4 }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].valor).toBe("Enter");
  });

  it("não repete navegação para a mesma URL", () => {
    const r = normalizar([
      { tipo: "navegar", valor: "https://a.com/x", em: 1 },
      { tipo: "navegar", valor: "https://a.com/x", em: 2 },
    ]);
    expect(r).toHaveLength(1);
  });

  it("trata mudança de fragmento como a mesma página", () => {
    const r = normalizar([
      { tipo: "navegar", valor: "https://a.com/x", em: 1 },
      { tipo: "navegar", valor: "https://a.com/x#secao", em: 2 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].valor).toBe("https://a.com/x#secao");
  });

  it("marca navegação posterior como resultado da ação anterior", () => {
    const r = normalizar([
      { tipo: "navegar", valor: "https://a.com/login", em: 1 },
      ev("clicar", { em: 2 }),
      { tipo: "navegar", valor: "https://a.com/home", em: 3 },
    ]);
    expect(r[0].resultante).toBeUndefined();
    expect(r[2].resultante).toBe(true);
  });

  it("não duplica o submit causado pelo próprio clique", () => {
    const r = normalizar([
      ev("clicar", { alvoId: "e9", em: 1 }),
      ev("submeter", { alvoId: "e10", em: 2 }),
    ]);
    expect(r.map((a) => a.tipo)).toEqual(["clicar"]);
  });

  it("aguenta entrada inválida sem quebrar", () => {
    expect(normalizar(null)).toEqual([]);
    expect(normalizar([null, undefined, {}])).toEqual([]);
  });
});

describe("gravador — descrição e validação", () => {
  it("descreve cada tipo em português legível", () => {
    expect(descrever(ev("clicar", { rotuloAlvo: "button#salvar" }))).toBe("clicar em button#salvar");
    expect(descrever(ev("preencher", { rotuloAlvo: "input#cpf", valor: "111" })))
      .toBe('preencher input#cpf com "111"');
    expect(descrever({ tipo: "navegar", valor: "https://a.com" })).toBe("abrir https://a.com");
    expect(descrever({ tipo: "navegar", valor: "https://a.com", resultante: true }))
      .toBe("aguardar navegação → https://a.com");
  });

  it("acusa passo sem seletor", () => {
    const r = validar([
      { tipo: "navegar", valor: "https://a.com" },
      { tipo: "clicar", seletor: null },
    ]);
    expect(r.ok).toBe(false);
    expect(r.problemas).toEqual([{ indice: 1, motivo: "sem seletor" }]);
  });

  it("navegação não precisa de seletor", () => {
    expect(validar([{ tipo: "navegar", valor: "https://a.com" }]).ok).toBe(true);
  });
});

// Roteiro usado por todos os geradores, para comparar os quatro lado a lado.
const ROTEIRO = [
  { tipo: "navegar", valor: "https://loja.example.com/login", em: 1 },
  { tipo: "preencher", seletor: sel('[data-testid="email"]'), rotuloAlvo: "input#email",
    valor: "ana@example.com", em: 2, alvoId: "e1" },
  { tipo: "preencher", seletor: sel("//input[@name='senha']", "xpath"), rotuloAlvo: "input#senha",
    valor: "s3nh@", em: 3, alvoId: "e2" },
  { tipo: "marcar", seletor: sel("#lembrar"), rotuloAlvo: "input#lembrar", valor: true, em: 4, alvoId: "e3" },
  { tipo: "selecionar", seletor: sel("#uf"), rotuloAlvo: "select#uf", valor: "sp", texto: "São Paulo", em: 5, alvoId: "e4" },
  { tipo: "clicar", seletor: sel("button.entrar"), rotuloAlvo: "button.entrar", em: 6, alvoId: "e5" },
  { tipo: "navegar", valor: "https://loja.example.com/home", em: 7 },
  { tipo: "verificar", seletor: sel(".saudacao"), rotuloAlvo: "div.saudacao",
    valor: "Olá, Ana", modo: "texto", em: 8, alvoId: "e6" },
];

describe("gravador — geração de código", () => {
  it.each(FORMATOS.map((f) => f.id))("%s produz um arquivo não vazio e com todos os passos", (id) => {
    const codigo = gerarCodigo(ROTEIRO, id, { nome: "login com sucesso" });
    expect(codigo.length).toBeGreaterThan(200);
    // Todo valor digitado tem que aparecer no script, senão o passo se perdeu.
    expect(codigo).toContain("ana@example.com");
    expect(codigo).toContain("s3nh@");
    expect(codigo).toContain("https://loja.example.com/login");
    expect(codigo).toContain("Olá, Ana");
    // Nenhum marcador de "não sei fazer isso".
    expect(codigo).not.toContain("tipo não suportado");
    expect(codigo).not.toContain("undefined");
  });

  it("Selenium Java monta a classe com o nome do arquivo", () => {
    const codigo = gerarCodigo(ROTEIRO, "selenium-java", { nome: "login com sucesso" });
    expect(codigo).toContain("public class LoginComSucesso {");
    expect(codigo).toContain("By.cssSelector(\"[data-testid=\\\"email\\\"]\")");
    expect(codigo).toContain("By.xpath(\"//input[@name='senha']\")");
    expect(codigo).toContain("new Select(");
    expect(nomeArquivo("selenium-java", "login com sucesso")).toBe("LoginComSucesso.java");
  });

  it("nomeia as variáveis pelo papel do elemento, não pela tag", () => {
    // O script gerado vai para o repositório do time: `campoEmail` se lê,
    // `inputc22` não.
    const codigo = gerarCodigo(ROTEIRO, "selenium-java", {});
    expect(codigo).toMatch(/WebElement campoEmail\b/);
    expect(codigo).toMatch(/WebElement botaoEntrar\b/);
    expect(codigo).toMatch(/WebElement caixaLembrar\b/);
    expect(codigo).toMatch(/WebElement comboUf\b/);
  });

  it("só numera a variável quando o mesmo nome se repete", () => {
    const duasVezesNoMesmoCampo = [
      { tipo: "preencher", seletor: sel("#busca"), rotuloAlvo: "input#busca", valor: "a", em: 1, alvoId: "e1" },
      { tipo: "clicar", seletor: sel("#ok"), rotuloAlvo: "button#ok", em: 2, alvoId: "e2" },
      { tipo: "preencher", seletor: sel("#busca"), rotuloAlvo: "input#busca", valor: "b", em: 3, alvoId: "e1" },
    ];
    const codigo = gerarCodigo(duasVezesNoMesmoCampo, "selenium-java", {});
    expect(codigo).toContain("WebElement campoBusca1");
    expect(codigo).toContain("WebElement campoBusca2");
    // O botão aparece uma vez só, então não ganha número.
    expect(codigo).toContain("WebElement botaoOk ");
    expect(codigo).not.toContain("botaoOk1");
  });

  it("Selenium Python usa a API snake_case", () => {
    const codigo = gerarCodigo(ROTEIRO, "selenium-python", { nome: "login com sucesso" });
    expect(codigo).toContain("def test_login_com_sucesso(driver):");
    expect(codigo).toContain("By.CSS_SELECTOR");
    expect(codigo).toContain("By.XPATH");
    expect(codigo).toContain("send_keys");
    expect(nomeArquivo("selenium-python", "login")).toBe("login.py");
  });

  it("Playwright JS prefixa XPath e não emite espera manual", () => {
    const codigo = gerarCodigo(ROTEIRO, "playwright-js", { nome: "login" });
    expect(codigo).toContain("await page.locator('xpath=//input[@name=\\'senha\\']')");
    expect(codigo).toContain(".fill(");
    expect(codigo).toContain("await expect(");
    // Sleep é o que deixa suite instável; o locator já espera sozinho.
    // Procuramos a chamada, não a palavra — ela aparece no comentário do topo.
    expect(codigo).not.toMatch(/waitForTimeout\s*\(/);
    expect(codigo).not.toMatch(/\bsleep\s*\(/);
  });

  it("Playwright Python idem", () => {
    const codigo = gerarCodigo(ROTEIRO, "playwright-python", { nome: "login" });
    expect(codigo).toContain("def test_login(page: Page):");
    expect(codigo).toContain('page.locator("xpath=//input[@name=\'senha\']")');
    expect(codigo).not.toMatch(/\bsleep\s*\(/);
  });

  it("formato desconhecido cai no padrão em vez de estourar", () => {
    const codigo = gerarCodigo(ROTEIRO, "nao-existe", { nome: "x" });
    expect(codigo).toContain("@playwright/test");
  });

  it("roteiro vazio ainda gera um esqueleto compilável", () => {
    for (const f of FORMATOS) {
      const codigo = gerarCodigo([], f.id, { nome: "vazio" });
      expect(codigo.length).toBeGreaterThan(100);
    }
  });
});

describe("gravador — Shadow DOM e iframe no código", () => {
  const dentroDeShadow = [{
    tipo: "clicar", seletor: sel("#botao"), rotuloAlvo: "button#botao",
    caminhoShadow: ["meu-componente"], em: 1, alvoId: "e1",
  }];
  const dentroDeFrame = [{
    tipo: "preencher", seletor: sel("#cpf"), rotuloAlvo: "input#cpf", valor: "123",
    caminhoFrame: ["iframe#pagamento"], em: 1, alvoId: "e1",
  }];

  it("Selenium Java salta o shadow root com getShadowRoot()", () => {
    // CSS não atravessa shadow root: sem este salto o script estoura
    // NoSuchElementException num elemento que está visível na tela.
    const codigo = gerarCodigo(dentroDeShadow, "selenium-java", {});
    expect(codigo).toContain(".getShadowRoot()");
    expect(codigo).toContain('By.cssSelector("meu-componente")');
  });

  it("Selenium Python usa .shadow_root", () => {
    const codigo = gerarCodigo(dentroDeShadow, "selenium-python", {});
    expect(codigo).toContain(".shadow_root");
  });

  it("Playwright não precisa de sintaxe especial para shadow aberto", () => {
    const codigo = gerarCodigo(dentroDeShadow, "playwright-js", {});
    expect(codigo).toContain("Shadow DOM");
    expect(codigo).toContain("page.locator('#botao')");
  });

  it("Selenium troca de frame e volta ao final", () => {
    const codigo = gerarCodigo(dentroDeFrame, "selenium-java", {});
    expect(codigo).toContain("switchTo().frame(");
    expect(codigo).toContain("switchTo().defaultContent();");
  });

  it("Playwright usa frameLocator", () => {
    const codigo = gerarCodigo(dentroDeFrame, "playwright-js", {});
    expect(codigo).toContain("frameLocator('iframe#pagamento')");
  });

  it("Selenium não troca de frame quando não há iframe nenhum", () => {
    const codigo = gerarCodigo(dentroDeShadow, "selenium-java", {});
    expect(codigo).not.toContain("switchTo().frame(");
  });
});

describe("gravador — escape de literais", () => {
  const VALOR = 'ele disse "oi" e saiu\\';
  const comAspas = [{
    tipo: "preencher", seletor: sel("#nome"), rotuloAlvo: "input#nome",
    valor: VALOR, em: 1, alvoId: "e1",
  }];

  /**
   * Decodifica todos os literais de string de uma linha, andando caractere a
   * caractere. Contar aspas com regex não serve: `\\"` fecha o literal e `\"`
   * não, e nenhum lookbehind simples distingue os dois.
   */
  function literaisDa(linha, aspa) {
    const achados = [];
    let dentro = false;
    let atual = "";
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (dentro && c === "\\") {
        const proximo = linha[i + 1];
        atual += proximo === "n" ? "\n" : proximo;
        i++;
        continue;
      }
      if (c === aspa) {
        if (dentro) achados.push(atual);
        dentro = !dentro;
        atual = "";
        continue;
      }
      if (dentro) atual += c;
    }
    // Sobrou literal aberto: algum escape comeu a aspa de fechamento.
    return dentro ? null : achados;
  }

  it.each([
    ["selenium-java", '"'],
    ["selenium-python", '"'],
    ["playwright-js", "'"],
    ["playwright-python", '"'],
  ])("%s escapa aspas e barra invertida sem corromper o valor", (id, aspa) => {
    const codigo = gerarCodigo(comAspas, id, {});
    const linha = codigo.split("\n").find((l) => l.includes("ele disse"));
    expect(linha, "o valor não apareceu no script").toBeTruthy();

    const literais = literaisDa(linha, aspa);
    expect(literais, `literal sem fechamento em ${id}: ${linha}`).not.toBeNull();
    expect(literais, `valor corrompido em ${id}: ${linha}`).toContain(VALOR);
  });

  it("o literal JS gerado é de fato executável", () => {
    // Só o dialeto JS dá para conferir de verdade dentro do Node.
    const codigo = gerarCodigo(comAspas, "playwright-js", {});
    const linha = codigo.split("\n").find((l) => l.includes("ele disse"));
    const literal = linha.slice(linha.indexOf(".fill(") + 6, linha.lastIndexOf(")"));
    expect(new Function(`return ${literal};`)()).toBe(VALOR);
  });
});
