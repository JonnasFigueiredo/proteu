// Normalização das ações gravadas.
//
// O agente na página captura tudo que acontece, cru. Aqui isso vira um roteiro
// limpo. É esta etapa que separa um gravador usável de um que cospe 400 linhas
// de ruído: navegador dispara muito evento que não é intenção de ninguém.
//
// Lógica pura: sem DOM, sem chrome.*. Entra array de eventos crus, sai array de
// ações. Determinística, então dá para testar cada regra de limpeza.

/** Teclas que carregam intenção. O resto é digitação, já coberta por preencher. */
const TECLAS_UTEIS = new Set(["Enter", "Escape", "Tab", "ArrowUp", "ArrowDown", "PageDown", "PageUp"]);

/** Tipos que representam entrada de texto contínua. */
const TIPOS_TEXTO = new Set(["preencher"]);

/**
 * Limpa e agrupa os eventos crus.
 * @param {Array} crus - eventos do agente, em ordem cronológica
 * @returns {Array} ações prontas para virar código
 */
export function normalizar(crus) {
  if (!Array.isArray(crus)) return [];
  const saida = [];

  for (const ev of crus) {
    if (!ev || !ev.tipo) continue;
    const anterior = saida[saida.length - 1];

    // --- Digitação: o agente manda um evento por tecla. Só o valor final
    //     importa, então colapsamos tudo que for do mesmo campo em seguida.
    if (TIPOS_TEXTO.has(ev.tipo) && anterior && TIPOS_TEXTO.has(anterior.tipo) &&
        anterior.alvoId === ev.alvoId) {
      anterior.valor = ev.valor;
      anterior.em = ev.em;
      continue;
    }

    // --- Clique que só serviu para focar o campo antes de digitar. Manter
    //     esse clique não deixa o teste mais fiel, só mais longo.
    if (TIPOS_TEXTO.has(ev.tipo) && anterior && anterior.tipo === "clicar" &&
        anterior.alvoId === ev.alvoId) {
      saida.pop();
    }

    // --- Clique em <select> seguido de escolha: o clique abre a lista, e
    //     nenhum driver precisa abrir a lista para selecionar.
    if (ev.tipo === "selecionar" && anterior && anterior.tipo === "clicar" &&
        anterior.alvoId === ev.alvoId) {
      saida.pop();
    }

    // --- Clique em checkbox/radio: o agente já emite "marcar"; o clique que
    //     veio junto é o mesmo gesto contado duas vezes.
    if (ev.tipo === "marcar" && anterior && anterior.tipo === "clicar" &&
        anterior.alvoId === ev.alvoId) {
      saida.pop();
    }

    // --- Teclas: só as que mudam o fluxo.
    if (ev.tipo === "tecla") {
      if (!TECLAS_UTEIS.has(ev.valor)) continue;
      // Tab imediatamente antes de digitar em outro campo é só navegação.
      if (ev.valor === "Tab") continue;
    }

    // --- Navegação repetida para a mesma URL não é uma segunda ação.
    if (ev.tipo === "navegar") {
      if (anterior && anterior.tipo === "navegar" && anterior.valor === ev.valor) continue;
      // Navegação que só troca o fragmento (#) não recarrega nada.
      if (anterior && anterior.tipo === "navegar" &&
          semFragmento(anterior.valor) === semFragmento(ev.valor)) {
        anterior.valor = ev.valor;
        continue;
      }
    }

    // --- Submit logo depois de um clique no próprio botão de submit: o clique
    //     já causou o submit, então são o mesmo evento visto de dois ângulos.
    if (ev.tipo === "submeter" && anterior && anterior.tipo === "clicar") continue;

    saida.push({ ...ev });
  }

  // Uma navegação no fim, depois da última interação, costuma ser o resultado
  // da ação anterior — vira uma espera, não um `driver.get`.
  return saida.map((a, i) => (a.tipo === "navegar" && i > 0 ? { ...a, resultante: true } : a));
}

function semFragmento(url) {
  return String(url || "").split("#")[0];
}

/** Rótulo legível de uma ação, para a lista na interface. */
export function descrever(acao) {
  if (!acao) return "";
  const alvo = acao.rotuloAlvo || (acao.seletor && acao.seletor.valor) || "elemento";
  switch (acao.tipo) {
    case "navegar":
      return acao.resultante ? `aguardar navegação → ${acao.valor}` : `abrir ${acao.valor}`;
    case "clicar":
      return `clicar em ${alvo}`;
    case "preencher":
      return `preencher ${alvo} com "${acao.valor}"`;
    case "selecionar":
      return `selecionar "${acao.texto || acao.valor}" em ${alvo}`;
    case "marcar":
      return `${acao.valor ? "marcar" : "desmarcar"} ${alvo}`;
    case "tecla":
      return `pressionar ${acao.valor} em ${alvo}`;
    case "submeter":
      return `enviar formulário ${alvo}`;
    case "verificar":
      return `verificar que ${alvo} ${acao.modo === "valor" ? "tem valor" : "exibe"} "${acao.valor}"`;
    default:
      return `${acao.tipo} ${alvo}`;
  }
}

/** Ações que não precisam de seletor para virar código. */
const SEM_ALVO = new Set(["navegar"]);

/**
 * Confere se o roteiro está pronto para gerar código.
 * @returns {{ok: boolean, problemas: Array<{indice: number, motivo: string}>}}
 */
export function validar(acoes) {
  const problemas = [];
  (acoes || []).forEach((a, indice) => {
    if (SEM_ALVO.has(a.tipo)) return;
    if (!a.seletor || !a.seletor.valor) {
      problemas.push({ indice, motivo: "sem seletor" });
    }
  });
  return { ok: problemas.length === 0, problemas };
}
