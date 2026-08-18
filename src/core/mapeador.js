// Mapeamento de elementos → variáveis de automação.
//
// O gravador (core/gravador/) resolve outro problema: ele grava um FLUXO e
// devolve um teste pronto. Aqui a pergunta é anterior — "quais elementos desta
// tela eu vou automatizar, e como vou chamá-los?". A QA clica nos campos que
// interessam e leva embora um rascunho de declarações para colar na IDE.
//
// Por isso a saída não é um script executável: é um bloco de notas. Nada aqui
// tenta adivinhar ação, ordem ou asserção — só nome e localizador.
//
// Lógica pura: sem DOM, sem chrome. Recebe descritores prontos e devolve texto.

/**
 * Convenções de nome. `aplicar` recebe as palavras já separadas e minúsculas.
 */
export const CONVENCOES = [
  {
    id: "camelCase",
    rotulo: "camelCase",
    aplicar: (p) => p[0] + p.slice(1).map(cap).join(""),
  },
  {
    id: "PascalCase",
    rotulo: "PascalCase",
    aplicar: (p) => p.map(cap).join(""),
  },
  {
    id: "snake_case",
    rotulo: "snake_case",
    aplicar: (p) => p.join("_"),
  },
  {
    id: "UPPER_SNAKE",
    rotulo: "UPPER_SNAKE_CASE",
    aplicar: (p) => p.join("_").toUpperCase(),
  },
  {
    id: "kebab-case",
    rotulo: "kebab-case",
    aplicar: (p) => p.join("-"),
  },
];

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

/** Convenção que cada linguagem usa por padrão, para não obrigar a escolher. */
export const CONVENCAO_PADRAO = {
  "java-selenium": "camelCase",
  "python-selenium": "snake_case",
  "js-playwright": "camelCase",
  "ts-playwright": "camelCase",
  "python-playwright": "snake_case",
  "js-cypress": "camelCase",
  "csharp-selenium": "PascalCase",
  "robot-framework": "snake_case",
  "texto": "camelCase",
};

// O prefixo diz o que o elemento É, e sobrevive à refatoração do HTML: quem lê
// `campoEmail` num arquivo do repositório entende sem abrir a tela. A tag crua
// (`input`, `div`) não acrescenta nada que o localizador já não diga.
const PREFIXO_POR_PAPEL = {
  botao: "botao",
  campo: "campo",
  combo: "combo",
  caixa: "caixa",
  radio: "radio",
  link: "link",
  texto: "texto",
  imagem: "imagem",
  lista: "lista",
  tabela: "tabela",
  elemento: "elemento",
};

/**
 * Papel do elemento a partir do descritor — o que ele é para quem automatiza.
 *
 * `input` sozinho não basta: `input[type=checkbox]` e `input[type=text]` se
 * automatizam de formas diferentes, e o nome da variável deveria dizer qual é.
 */
export function papelDe(no) {
  if (!no || !no.tag) return "elemento";
  const tag = String(no.tag).toLowerCase();
  const tipo = String((no.attrs && no.attrs.type) || "").toLowerCase();
  const role = String((no.attrs && no.attrs.role) || "").toLowerCase();

  if (tag === "button" || role === "button") return "botao";
  if (tag === "a") return "link";
  if (tag === "select") return "combo";
  if (tag === "textarea") return "campo";
  if (tag === "img") return "imagem";
  if (tag === "table") return "tabela";
  if (tag === "ul" || tag === "ol") return "lista";
  if (tag === "input") {
    if (tipo === "checkbox") return "caixa";
    if (tipo === "radio") return "radio";
    if (tipo === "submit" || tipo === "button" || tipo === "reset") return "botao";
    return "campo";
  }
  if (tag === "label" || tag === "span" || tag === "p" || /^h[1-6]$/.test(tag)) return "texto";
  return "elemento";
}

/**
 * Quebra um identificador cru em palavras: trata camelCase, kebab, snake.
 *
 * Tira o acento ANTES de separar. Sem isso "Salvar alterações" quebra no "ç" e
 * vira `salvarAlteraEs` — e como a maior parte das telas que passam por aqui
 * está em português, seria o caso comum, não a exceção. Nome de variável
 * também precisa ser ASCII para não brigar com a convenção das linguagens.
 */
function palavrasDe(bruto) {
  return String(bruto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // acentos viram a letra base
    .replace(/[ß]/g, "ss")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase → camel Case
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((p) => p.toLowerCase());
}

// Palavras que aparecem em todo lugar e não distinguem nada: mantê-las gera
// `campoFormControlInput`, que é comprido e diz menos que `campoEmail`.
const RUIDO = new Set([
  "form", "control", "input", "field", "wrapper", "container", "inner", "outer",
  "item", "element", "el", "js", "ng", "css", "ui", "box", "text", "value",
]);

/**
 * De onde tirar o nome, do mais estável para o menos.
 *
 * A ordem não é estética: é de resistência a mudança de layout. `data-testid`
 * existe justamente para automação e raramente muda; a classe muda quando
 * alguém troca o tema. Texto visível fica no meio — muda com tradução, mas
 * descreve o elemento melhor do que uma classe utilitária.
 */
function fonteDoNome(no) {
  const a = no.attrs || {};
  const candidatos = [
    a["data-testid"], a["data-test"], a["data-cy"], a["data-qa"],
    a.name,
    no.id && !ehGerado(no.id) ? no.id : null,
    a["aria-label"],
    a.placeholder,
    no.texto,
    a.title,
    a.alt,
  ];
  for (const c of candidatos) {
    const limpo = String(c || "").trim();
    if (limpo) return limpo;
  }
  // Classe é o último recurso antes de desistir: só serve se não for utilitária.
  const classe = (no.classes || []).find((k) => !ehGerado(k) && k.length > 2);
  return classe || "";
}

/**
 * Identificador gerado por build (hash) não sobrevive ao próximo deploy.
 * Usar como nome de variável entrega um `campoX1f3a9` que ninguém reconhece.
 */
function ehGerado(valor) {
  const v = String(valor || "");
  if (/^[0-9]/.test(v)) return true;
  if (/^[a-f0-9]{6,}$/i.test(v)) return true; // hash puro
  if (/[a-z]{2,}[-_]?[0-9a-f]{5,}$/i.test(v)) return true; // sufixo de hash
  if (/^(css|sc|jsx|emotion)-/i.test(v)) return true; // CSS-in-JS
  return false;
}

/** Limite de palavras no nome: mais que isso vira frase, não identificador. */
const MAX_PALAVRAS = 4;

/**
 * Nome de variável para um elemento, ainda sem desambiguação.
 * @param {object} no - descritor de leitura-dom.descreverNo
 * @param {string} convencaoId
 */
export function nomearElemento(no, convencaoId = "camelCase") {
  const convencao = CONVENCOES.find((c) => c.id === convencaoId) || CONVENCOES[0];
  const papel = papelDe(no);
  const prefixo = PREFIXO_POR_PAPEL[papel] || "elemento";

  let palavras = palavrasDe(fonteDoNome(no));
  // Tira ruído só enquanto sobrar alguma coisa: um elemento cuja única pista é
  // "input" fica melhor como `campoInput` do que como `campo` sozinho.
  const semRuido = palavras.filter((p) => !RUIDO.has(p));
  if (semRuido.length) palavras = semRuido;
  palavras = palavras.slice(0, MAX_PALAVRAS);

  // O prefixo já diz o papel; repeti-lo dá `botaoBotaoSalvar`.
  if (palavras[0] === prefixo) palavras = palavras.slice(1);

  const partes = [prefixo, ...palavras].filter(Boolean);
  return convencao.aplicar(partes);
}

/**
 * Resolve nomes repetidos numerando a partir do segundo.
 *
 * Numerar todo mundo daria `campoEmail1` mesmo quando só existe um — e um
 * sufixo que não distingue nada só atrapalha a leitura.
 */
export function desambiguar(nomes) {
  const quantos = new Map();
  for (const n of nomes) quantos.set(n, (quantos.get(n) || 0) + 1);
  const usados = new Map();
  return nomes.map((n) => {
    if (quantos.get(n) === 1) return n;
    const i = (usados.get(n) || 0) + 1;
    usados.set(n, i);
    return juntarNumero(n, i);
  });
}

/** Acrescenta o número respeitando a convenção já aplicada. */
function juntarNumero(nome, i) {
  if (nome.includes("_")) return `${nome}_${i}`;
  if (nome.includes("-")) return `${nome}-${i}`;
  return `${nome}${i}`;
}

// --- Linguagens --------------------------------------------------------------
//
// Cada uma devolve UMA linha por elemento. Sem imports, sem classe em volta: a
// QA pediu rascunho para colar na IDE, e um cabeçalho que ela vai apagar toda
// vez é atrito, não ajuda.

const aspasJava = (v) => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const aspasPy = (v) => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const aspasJs = (v) =>
  `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

// O Selenium tem estrategia dedicada para id e name: alem de mais rapidas que
// o motor de CSS, deixam a intencao explicita em quem le o Page Object. Antes
// daqui saia By.cssSelector("#login") mesmo quando By.id("login") servia.
const SO_ID = /^#([A-Za-z_][\w-]*)$/;
const SO_NAME = /^\[name="([^"\\]+)"\]$/;

/** Localizador → sintaxe do By do Selenium. */
function byJava(sel) {
  if (sel.sintaxe === "xpath") return `By.xpath(${aspasJava(sel.valor)})`;
  if (sel.sintaxe === "texto-link") return `By.linkText(${aspasJava(sel.valor)})`;
  const id = sel.valor.match(SO_ID);
  if (id) return `By.id(${aspasJava(id[1])})`;
  const nome = sel.valor.match(SO_NAME);
  if (nome) return `By.name(${aspasJava(nome[1])})`;
  return `By.cssSelector(${aspasJava(sel.valor)})`;
}

function byPython(sel) {
  if (sel.sintaxe === "xpath") return `(By.XPATH, ${aspasPy(sel.valor)})`;
  if (sel.sintaxe === "texto-link") return `(By.LINK_TEXT, ${aspasPy(sel.valor)})`;
  const id = sel.valor.match(SO_ID);
  if (id) return `(By.ID, ${aspasPy(id[1])})`;
  const nome = sel.valor.match(SO_NAME);
  if (nome) return `(By.NAME, ${aspasPy(nome[1])})`;
  return `(By.CSS_SELECTOR, ${aspasPy(sel.valor)})`;
}

function byCsharp(sel) {
  if (sel.sintaxe === "xpath") return `By.XPath(${aspasJava(sel.valor)})`;
  if (sel.sintaxe === "texto-link") return `By.LinkText(${aspasJava(sel.valor)})`;
  const id = sel.valor.match(SO_ID);
  if (id) return `By.Id(${aspasJava(id[1])})`;
  const nome = sel.valor.match(SO_NAME);
  if (nome) return `By.Name(${aspasJava(nome[1])})`;
  return `By.CssSelector(${aspasJava(sel.valor)})`;
}

/** Playwright aceita CSS direto e exige o prefixo `xpath=` para XPath. */
function alvoPlaywright(sel) {
  return sel.sintaxe === "xpath" ? `xpath=${sel.valor}` : sel.valor;
}

// --- Escolha do localizador por linguagem ------------------------------------
//
// Misturar CSS e XPath no mesmo Page Object era o comportamento antigo: a
// escolha olhava so a estabilidade e ignorava para onde o codigo ia. Isso
// produzia arquivo alternando By.cssSelector e By.xpath sem criterio visivel —
// e, pior, XPath para Cypress, que nao tem suporte nativo e nao roda sem plugin.
//
// Cada lista abaixo segue a recomendacao do proprio projeto:
//  - Selenium: id > name > CSS > XPath (id e a estrategia mais rapida e estavel)
//  - Playwright: a doc desaconselha XPath; CSS da conta
//  - Cypress: data-* primeiro, e XPath nem entra
//  - Robot Framework: aceita os tres, com prefixo
const SEM_XPATH = new Set(["js-cypress", "js-playwright", "ts-playwright", "python-playwright"]);

/**
 * Escolhe o candidato para a linguagem pedida.
 *
 * A ordem base e a do MOTOR de seletores, nao uma lista fixa de tipos. Ele ja
 * sabe coisas que uma lista nao saberia: id gerado por build leva 45 pontos de
 * penalidade, classe utilitaria idem, e casar com varios elementos derruba o
 * candidato. Uma primeira versao daqui ordenou so por tipo e jogou isso fora —
 * o resultado foi By.id("a3f9c21e") num botao cujo id morre no proximo deploy,
 * quando o motor ja tinha preferido o texto visivel.
 *
 * A linguagem entra como FILTRO, nao como nova ordem: tira o que ela nao roda.
 */
export function escolherCandidato(candidatos, linguagemId) {
  const lista = Array.isArray(candidatos) ? candidatos.filter(Boolean) : [];
  if (!lista.length) return null;

  const semX = lista.filter((c) => c.sintaxe !== "xpath");
  // Se sobrar nada sem XPath, e melhor entregar XPath com aviso do que linha
  // nenhuma: o localizador esta certo, so precisa de plugin.
  const permitidos = SEM_XPATH.has(linguagemId) && semX.length ? semX : lista;

  return [...permitidos].sort((a, b) => {
    if (!!b.unico !== !!a.unico) return b.unico ? 1 : -1;
    return (b.pontos || 0) - (a.pontos || 0);
  })[0];
}

export const LINGUAGENS = [
  {
    id: "java-selenium",
    rotulo: "Java · Selenium",
    extensao: "java",
    linha: (nome, sel) => `private final By ${nome} = ${byJava(sel)};`,
  },
  {
    id: "python-selenium",
    rotulo: "Python · Selenium",
    extensao: "py",
    linha: (nome, sel) => `${nome} = ${byPython(sel)}`,
  },
  {
    id: "csharp-selenium",
    rotulo: "C# · Selenium",
    extensao: "cs",
    linha: (nome, sel) => `private readonly By ${nome} = ${byCsharp(sel)};`,
  },
  {
    id: "js-playwright",
    rotulo: "JavaScript · Playwright",
    extensao: "js",
    linha: (nome, sel) => `const ${nome} = page.locator(${aspasJs(alvoPlaywright(sel))});`,
  },
  {
    id: "ts-playwright",
    rotulo: "TypeScript · Playwright",
    extensao: "ts",
    linha: (nome, sel) => `const ${nome}: Locator = page.locator(${aspasJs(alvoPlaywright(sel))});`,
  },
  {
    id: "python-playwright",
    rotulo: "Python · Playwright",
    extensao: "py",
    linha: (nome, sel) => `${nome} = page.locator(${aspasPy(alvoPlaywright(sel))})`,
  },
  {
    id: "js-cypress",
    rotulo: "JavaScript · Cypress",
    extensao: "js",
    // Cypress não tem XPath nativo: guardar a string e deixar o `cy.get` para
    // o uso evita gerar uma linha que não roda sem plugin.
    linha: (nome, sel) => `const ${nome} = ${aspasJs(sel.valor)};`,
  },
  {
    id: "robot-framework",
    rotulo: "Robot Framework",
    extensao: "robot",
    linha: (nome, sel) => {
      // O SeleniumLibrary aceita o prefixo id=, que e a estrategia mais direta.
      const id = sel.sintaxe !== "xpath" && sel.valor.match(SO_ID);
      const alvo = id
        ? `id=${id[1]}`
        : `${sel.sintaxe === "xpath" ? "xpath" : "css"}=${sel.valor}`;
      return `\${${nome}}    ${alvo}`;
    },
  },
  {
    id: "texto",
    rotulo: "Texto simples",
    extensao: "txt",
    linha: (nome, sel) => `${nome} = ${sel.valor}`,
  },
];

export const LINGUAGEM_PADRAO = "js-playwright";

/** Comentário de fim de linha da linguagem, para as anotações. */
function comentarioDe(linguagemId) {
  if (linguagemId === "robot-framework") return "#";
  if (linguagemId === "python-selenium" || linguagemId === "python-playwright") return "#";
  return "//";
}

/**
 * Monta o rascunho inteiro.
 *
 * @param {Array<{no: object, seletor: {valor: string, sintaxe: string}, matches?: number}>} elementos
 * @param {string} linguagemId
 * @param {string} convencaoId
 * @param {{anotarAmbiguos?: boolean}} opcoes
 * @returns {string}
 */
export function gerarRascunho(elementos, linguagemId, convencaoId, opcoes = {}) {
  const lista = Array.isArray(elementos) ? elementos : [];
  const lang = LINGUAGENS.find((l) => l.id === linguagemId) ||
    LINGUAGENS.find((l) => l.id === LINGUAGEM_PADRAO);
  const conv = convencaoId || CONVENCAO_PADRAO[lang.id] || "camelCase";

  const nomes = desambiguar(lista.map((e) => nomearElemento(e.no, conv)));
  const anotar = opcoes.anotarAmbiguos !== false;
  const cmt = comentarioDe(lang.id);

  return lista
    .map((e, i) => {
      // Elemento capturado antes desta versao so tem `seletor`; o novo tem a
      // lista e deixa a linguagem escolher.
      const sel = escolherCandidato(e.candidatos, lang.id) || e.seletor;
      if (!sel) return "";
      const linha = lang.linha(nomes[i], sel);
      // Um localizador que casa com vários elementos passa nos testes de hoje e
      // quebra quando a tela ganhar mais um item igual. Marcar na linha é o
      // único momento em que a QA ainda tem a página aberta para conferir.
      // Sobrou so XPath numa linguagem que nao executa XPath. Entregar mesmo
      // assim e melhor do que linha nenhuma — o localizador esta certo, so
      // precisa de plugin —, mas calar seria entregar codigo que nao roda.
      if (sel.sintaxe === "xpath" && SEM_XPATH.has(lang.id)) {
        return `${linha}  ${cmt} XPath: ${lang.id.includes("cypress") ? "exige plugin no Cypress" : "prefira um seletor CSS"}`;
      }
      const quantos = typeof sel.matches === "number" ? sel.matches : e.matches;
      if (anotar && typeof quantos === "number" && quantos > 1) {
        return `${linha}  ${cmt} atenção: casa com ${quantos} elementos`;
      }
      return linha;
    })
    .join("\n");
}

/** Nome de arquivo sugerido ao baixar o rascunho. */
export function nomeArquivoRascunho(linguagemId, base = "elementos") {
  const lang = LINGUAGENS.find((l) => l.id === linguagemId) ||
    LINGUAGENS.find((l) => l.id === LINGUAGEM_PADRAO);
  const limpo = String(base).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${limpo || "elementos"}.${lang.extensao}`;
}
