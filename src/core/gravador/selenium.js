// Gerador de código Selenium WebDriver (Java e Python).
//
// Lógica pura: recebe as ações normalizadas e devolve texto. Nada de DOM.
//
// Duas coisas que gravador comum erra e que aqui são tratadas:
//   - Shadow DOM: CSS não atravessa shadow root. O Selenium 4 resolve com
//     getShadowRoot() encadeado, então emitimos a cadeia de hosts.
//   - iframe: exige switchTo().frame(...) antes e defaultContent() depois.
//     Sem isso o script estoura NoSuchElementException num elemento visível.

/** Escapa uma string para literal Java. */
function javaStr(v) {
  return `"${String(v ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/** Escapa uma string para literal Python. */
function pyStr(v) {
  return `"${String(v ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/** By.* do Selenium a partir da sintaxe do seletor. */
function byJava(sel) {
  if (sel.sintaxe === "xpath") return `By.xpath(${javaStr(sel.valor)})`;
  if (sel.sintaxe === "texto-link") return `By.linkText(${javaStr(sel.valor)})`;
  return `By.cssSelector(${javaStr(sel.valor)})`;
}

function byPython(sel) {
  if (sel.sintaxe === "xpath") return `By.XPATH, ${pyStr(sel.valor)}`;
  if (sel.sintaxe === "texto-link") return `By.LINK_TEXT, ${pyStr(sel.valor)}`;
  return `By.CSS_SELECTOR, ${pyStr(sel.valor)}`;
}

// O papel do elemento no fluxo diz mais sobre ele do que a tag: num arquivo
// que vai para o repositório do time, `campoEmail` se lê e `inputc22` não.
const PREFIXO_POR_ACAO = {
  preencher: "campo",
  tecla: "campo",
  selecionar: "combo",
  marcar: "caixa",
  clicar: "botao",
  submeter: "form",
  verificar: "alvo",
};

/** Nome de variável legível a partir do alvo, ainda sem desambiguação. */
function nomeBase(acao) {
  const rotulo = acao.rotuloAlvo || "";
  // Do mais específico para o menos: id, name, classe, tag. A tag é o pior de
  // todos — `botaoButton` não diz nada que o tipo da ação já não diga.
  const bruto =
    (rotulo.match(/#([\w-]+)/) || [])[1] ||
    (rotulo.match(/name=([\w-]+)/) || [])[1] ||
    (rotulo.match(/\.([\w-]+)/) || [])[1] ||
    (rotulo.match(/^([a-z]+)/) || [])[1] ||
    "elemento";
  const sufixo = bruto
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
    .join("");
  return `${PREFIXO_POR_ACAO[acao.tipo] || "elemento"}${sufixo || "Alvo"}`;
}

/**
 * Nomes finais para o roteiro inteiro. O número só entra quando o mesmo nome
 * aparece duas vezes — senão todo passo viraria `campoC11`, que se lê como
 * "campo C11" e não como "o primeiro campo c1".
 */
function mapearNomes(acoes) {
  const quantos = new Map();
  for (const a of acoes) {
    const base = nomeBase(a);
    quantos.set(base, (quantos.get(base) || 0) + 1);
  }
  const usados = new Map();
  return acoes.map((a) => {
    const base = nomeBase(a);
    if (quantos.get(base) === 1) return base;
    const n = (usados.get(base) || 0) + 1;
    usados.set(base, n);
    return `${base}${n}`;
  });
}

/** camelCase → snake_case, para o dialeto Python. */
function paraSnake(nome) {
  return nome.replace(/([A-Z])/g, (m) => "_" + m.toLowerCase());
}

// --- Java --------------------------------------------------------------------

function acaoJava(acao, i, ctx, v) {
  const L = [];
  const ind = "        ";
  const sel = acao.seletor;

  // Entrar nos iframes que o elemento exige.
  const frames = acao.caminhoFrame || [];
  if (JSON.stringify(frames) !== JSON.stringify(ctx.frames)) {
    if (ctx.frames.length) L.push(`${ind}driver.switchTo().defaultContent();`);
    for (const f of frames) {
      L.push(`${ind}driver.switchTo().frame(driver.findElement(By.cssSelector(${javaStr(f)})));`);
    }
    ctx.frames = frames.slice();
  }

  if (acao.tipo === "navegar") {
    if (acao.resultante) {
      L.push(`${ind}espera.until(ExpectedConditions.urlContains(${javaStr(acao.valor)}));`);
    } else {
      L.push(`${ind}driver.get(${javaStr(acao.valor)});`);
    }
    return L.join("\n");
  }

  if (!sel) return `${ind}// ação sem seletor: ${acao.tipo}`;

  const sombra = acao.caminhoShadow || [];
  if (sombra.length) {
    // Cada fronteira de shadow root precisa de um salto explícito.
    L.push(`${ind}SearchContext ctx${i} = driver.findElement(By.cssSelector(${javaStr(sombra[0])})).getShadowRoot();`);
    for (let k = 1; k < sombra.length; k++) {
      L.push(`${ind}ctx${i} = ctx${i}.findElement(By.cssSelector(${javaStr(sombra[k])})).getShadowRoot();`);
    }
    L.push(`${ind}WebElement ${v} = ctx${i}.findElement(${byJava(sel)});`);
  } else {
    L.push(`${ind}WebElement ${v} = espera.until(ExpectedConditions.presenceOfElementLocated(${byJava(sel)}));`);
  }

  switch (acao.tipo) {
    case "clicar":
      L.push(`${ind}${v}.click();`);
      break;
    case "preencher":
      L.push(`${ind}${v}.clear();`);
      L.push(`${ind}${v}.sendKeys(${javaStr(acao.valor)});`);
      break;
    case "selecionar":
      L.push(`${ind}new Select(${v}).selectByValue(${javaStr(acao.valor)});`);
      break;
    case "marcar":
      L.push(`${ind}if (${v}.isSelected() != ${acao.valor ? "true" : "false"}) ${v}.click();`);
      break;
    case "tecla":
      L.push(`${ind}${v}.sendKeys(Keys.${String(acao.valor).toUpperCase()});`);
      break;
    case "submeter":
      L.push(`${ind}${v}.submit();`);
      break;
    case "verificar":
      if (acao.modo === "valor") {
        L.push(`${ind}Assertions.assertEquals(${javaStr(acao.valor)}, ${v}.getAttribute("value"));`);
      } else {
        L.push(`${ind}Assertions.assertEquals(${javaStr(acao.valor)}, ${v}.getText().trim());`);
      }
      break;
    default:
      L.push(`${ind}// tipo não suportado: ${acao.tipo}`);
  }
  return L.join("\n");
}

/**
 * Gera uma classe de teste JUnit 5 + Selenium 4.
 * @param {Array} acoes
 * @param {{nome?: string, urlInicial?: string}} opcoes
 */
export function paraSeleniumJava(acoes, opcoes = {}) {
  const nome = sanitizarClasse(opcoes.nome || "FluxoGravado");
  const ctx = { frames: [] };
  const lista = acoes || [];
  const nomes = mapearNomes(lista);
  const corpo = lista.map((a, i) => acaoJava(a, i, ctx, nomes[i])).join("\n\n");
  const fecha = ctx.frames.length ? "\n        driver.switchTo().defaultContent();" : "";

  return `// Gerado pela Proteu QA — gravador de ações.
// Selenium 4 + JUnit 5. Reveja os seletores antes de commitar: o gravador
// escolheu o mais estável que encontrou, mas quem conhece a tela é você.

import java.time.Duration;
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;

public class ${nome} {

    private WebDriver driver;
    private WebDriverWait espera;

    @BeforeEach
    void abrir() {
        driver = new ChromeDriver();
        driver.manage().window().maximize();
        espera = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @AfterEach
    void fechar() {
        if (driver != null) driver.quit();
    }

    @Test
    void fluxo() {
${corpo}${fecha}
    }
}
`;
}

// --- Python ------------------------------------------------------------------

function acaoPython(acao, i, ctx, v) {
  const L = [];
  const ind = "    ";
  const sel = acao.seletor;

  const frames = acao.caminhoFrame || [];
  if (JSON.stringify(frames) !== JSON.stringify(ctx.frames)) {
    if (ctx.frames.length) L.push(`${ind}driver.switch_to.default_content()`);
    for (const f of frames) {
      L.push(`${ind}driver.switch_to.frame(driver.find_element(By.CSS_SELECTOR, ${pyStr(f)}))`);
    }
    ctx.frames = frames.slice();
  }

  if (acao.tipo === "navegar") {
    if (acao.resultante) {
      L.push(`${ind}espera.until(EC.url_contains(${pyStr(acao.valor)}))`);
    } else {
      L.push(`${ind}driver.get(${pyStr(acao.valor)})`);
    }
    return L.join("\n");
  }

  if (!sel) return `${ind}# ação sem seletor: ${acao.tipo}`;

  const sombra = acao.caminhoShadow || [];
  if (sombra.length) {
    L.push(`${ind}ctx = driver.find_element(By.CSS_SELECTOR, ${pyStr(sombra[0])}).shadow_root`);
    for (let k = 1; k < sombra.length; k++) {
      L.push(`${ind}ctx = ctx.find_element(By.CSS_SELECTOR, ${pyStr(sombra[k])}).shadow_root`);
    }
    L.push(`${ind}${v} = ctx.find_element(${byPython(sel)})`);
  } else {
    L.push(`${ind}${v} = espera.until(EC.presence_of_element_located((${byPython(sel)})))`);
  }

  switch (acao.tipo) {
    case "clicar":
      L.push(`${ind}${v}.click()`);
      break;
    case "preencher":
      L.push(`${ind}${v}.clear()`);
      L.push(`${ind}${v}.send_keys(${pyStr(acao.valor)})`);
      break;
    case "selecionar":
      L.push(`${ind}Select(${v}).select_by_value(${pyStr(acao.valor)})`);
      break;
    case "marcar":
      L.push(`${ind}if ${v}.is_selected() != ${acao.valor ? "True" : "False"}:`);
      L.push(`${ind}    ${v}.click()`);
      break;
    case "tecla":
      L.push(`${ind}${v}.send_keys(Keys.${String(acao.valor).toUpperCase()})`);
      break;
    case "submeter":
      L.push(`${ind}${v}.submit()`);
      break;
    case "verificar":
      if (acao.modo === "valor") {
        L.push(`${ind}assert ${v}.get_attribute("value") == ${pyStr(acao.valor)}`);
      } else {
        L.push(`${ind}assert ${v}.text.strip() == ${pyStr(acao.valor)}`);
      }
      break;
    default:
      L.push(`${ind}# tipo não suportado: ${acao.tipo}`);
  }
  return L.join("\n");
}

/** Gera um teste pytest + Selenium 4. */
export function paraSeleniumPython(acoes, opcoes = {}) {
  const nome = sanitizarFuncao(opcoes.nome || "fluxo_gravado");
  const ctx = { frames: [] };
  const lista = acoes || [];
  const nomes = mapearNomes(lista).map(paraSnake);
  const corpo = lista.map((a, i) => acaoPython(a, i, ctx, nomes[i])).join("\n\n");
  const fecha = ctx.frames.length ? "\n    driver.switch_to.default_content()" : "";

  return `# Gerado pela Proteu QA — gravador de ações.
# Selenium 4 + pytest. Reveja os seletores antes de commitar: o gravador
# escolheu o mais estável que encontrou, mas quem conhece a tela é você.

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait


@pytest.fixture
def driver():
    navegador = webdriver.Chrome()
    navegador.maximize_window()
    yield navegador
    navegador.quit()


def test_${nome}(driver):
    espera = WebDriverWait(driver, 10)

${corpo}${fecha}
`;
}

function sanitizarClasse(nome) {
  const limpo = String(nome).replace(/[^A-Za-z0-9]+/g, " ").trim().split(" ")
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : "")).join("");
  return limpo || "FluxoGravado";
}

function sanitizarFuncao(nome) {
  const limpo = String(nome).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return limpo || "fluxo_gravado";
}
