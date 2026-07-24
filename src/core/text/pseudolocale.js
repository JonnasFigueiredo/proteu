// Pseudolocalização — transforma texto ASCII para caçar problemas de i18n sem
// precisar traduzir nada:
//   - troca letras por equivalentes acentuados (Save → Šávé): revela strings
//     hard-coded (o que não muda é porque está chumbado no código);
//   - expande o comprimento (~+40%): revela layout que não acomoda idiomas
//     mais longos (alemão, finlandês);
//   - envolve em marcadores ⟦…⟧: revela concatenação e truncamento (se faltar
//     um marcador, a string foi cortada ou juntada indevidamente);
//   - PRESERVA placeholders ({{name}}, {count}, %s, %1$s, ${x}): revela quando
//     o código quebra a interpolação;
//   - modo fakebidi: embrulha em controles Unicode que forçam rendering RTL,
//     para testar telas bidirecionais sem um idioma RTL de verdade.

// Controles bidi: RLO força direita-para-esquerda; PDF encerra.
const RLO = "‮";
const PDF = "‬";

// Placeholders reconhecidos (ordem importa: os mais específicos primeiro).
const RE_PLACEHOLDER = new RegExp(
  [
    "\\{\\{[^{}]*\\}\\}", // {{handlebars}}
    "\\$\\{[^{}]*\\}", // ${template}
    "\\{[^{}]*\\}", // {icu} / {0}
    "%\\d+\\$[a-zA-Z]", // %1$s (posicional)
    "%\\([^)]*\\)[a-zA-Z]?", // %(name)s (python)
    "%[a-zA-Z]", // %s %d %f
  ].join("|"),
  "g"
);
const RE_PLACEHOLDER_INTEIRO = new RegExp(`^(?:${RE_PLACEHOLDER.source})$`);

// Mapa ASCII → acentuado (determinístico: mesma entrada, mesma saída).
const MAPA = {
  a: "á", b: "ƀ", c: "ç", d: "ð", e: "é", f: "ƒ", g: "ĝ", h: "ĥ", i: "í",
  j: "ĵ", k: "ķ", l: "ł", m: "ɱ", n: "ñ", o: "ó", p: "þ", q: "ɋ", r: "ŕ",
  s: "š", t: "ŧ", u: "ú", v: "ṽ", w: "ŵ", x: "ẋ", y: "ý", z: "ž",
  A: "Á", B: "Ɓ", C: "Ç", D: "Ð", E: "É", F: "Ƒ", G: "Ĝ", H: "Ĥ", I: "Í",
  J: "Ĵ", K: "Ķ", L: "Ł", M: "Ṁ", N: "Ñ", O: "Ó", P: "Þ", Q: "Ǫ", R: "Ŕ",
  S: "Š", T: "Ŧ", U: "Ú", V: "Ṽ", W: "Ŵ", X: "Ẋ", Y: "Ý", Z: "Ž",
};

// Vogais acentuadas para o preenchimento de expansão.
const FILLER = [..."áéíóúãẽ"];

function transliterar(texto) {
  let saida = "";
  for (const ch of texto) saida += MAPA[ch] ?? ch;
  return saida;
}

/** Expande cada palavra em ~fator, preenchendo com vogais acentuadas. */
function expandir(texto, fator) {
  return texto.replace(/\S+/g, (palavra) => {
    const alvo = Math.ceil(palavra.length * fator);
    let extra = "";
    let i = 0;
    while (palavra.length + extra.length < alvo) {
      extra += FILLER[i % FILLER.length];
      i++;
    }
    return palavra + extra;
  });
}

/**
 * Pseudolocaliza um texto.
 * @param {string} texto
 * @param {object} [opcoes]
 * @param {boolean} [opcoes.expandir=true] - expande ~+40%
 * @param {number}  [opcoes.fator=1.4] - fator de expansão
 * @param {boolean} [opcoes.marcadores=true] - envolve em ⟦…⟧
 * @param {boolean} [opcoes.fakebidi=false] - força rendering RTL
 * @returns {string}
 */
export function pseudolocalizar(
  texto,
  { expandir: comExpansao = true, fator = 1.4, marcadores = true, fakebidi = false } = {}
) {
  if (typeof texto !== "string") return "";

  // split com grupo capturante mantém os placeholders como pedaços separados.
  const partes = texto.split(new RegExp(`(${RE_PLACEHOLDER.source})`));

  const corpo = partes
    .map((parte) => {
      if (parte === "") return "";
      if (RE_PLACEHOLDER_INTEIRO.test(parte)) return parte; // preserva intacto
      let t = transliterar(parte);
      if (comExpansao) t = expandir(t, fator);
      if (fakebidi) t = RLO + t + PDF;
      return t;
    })
    .join("");

  return marcadores ? `⟦${corpo}⟧` : corpo;
}

/** Lista os placeholders detectados num texto (útil para testar preservação). */
export function extrairPlaceholders(texto) {
  return String(texto).match(RE_PLACEHOLDER) ?? [];
}
