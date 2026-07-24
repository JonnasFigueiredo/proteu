// Contagem de texto nas 4 unidades — porque "100 caracteres" é ambíguo.
//
// As quatro respostas para "qual o tamanho deste texto?" divergem, e é
// exatamente onde bugs de limite nascem:
//   - grafemas   → o que o humano vê como "um caractere" (Intl.Segmenter)
//   - code points→ [...str].length (itera por code point, junta surrogates)
//   - code units → str.length (unidades UTF-16; emoji contam 2)
//   - bytes UTF-8→ TextEncoder().encode(str).length (o que trafega/armazena)
//
// Exemplo canônico — "👩🏽" (mulher + tom de pele médio):
//   1 grafema / 2 code points / 4 code units / 8 bytes.
// E "👩‍👩‍👧‍👦" (família com ZWJ): 1 grafema / 7 code points / 11 code units / 25 bytes.

// Segmenter é criado uma vez (custa caro) e reutilizado.
let segmentador = null;
function obterSegmentador() {
  if (segmentador) return segmentador;
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    segmentador = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  }
  return segmentador;
}

/** Conta grafemas (clusters). Cai em code points se Intl.Segmenter faltar. */
export function contarGrafemas(texto) {
  const seg = obterSegmentador();
  if (!seg) return contarCodePoints(texto);
  let n = 0;
  for (const _ of seg.segment(texto)) n++;
  return n;
}

/** Conta code points Unicode. */
export function contarCodePoints(texto) {
  return [...texto].length;
}

/** Conta code units UTF-16 (o que String.length devolve). */
export function contarCodeUnits(texto) {
  return texto.length;
}

/** Conta bytes na codificação UTF-8. */
export function contarBytes(texto) {
  return new TextEncoder().encode(texto).length;
}

/** Devolve as 4 contagens de uma vez (para exibir lado a lado na UI). */
export function contarTudo(texto) {
  const t = texto ?? "";
  return {
    grafemas: contarGrafemas(t),
    codePoints: contarCodePoints(t),
    codeUnits: contarCodeUnits(t),
    bytes: contarBytes(t),
  };
}

/** Quebra o texto em grafemas (útil para gerar/cortar por tamanho). */
export function paraGrafemas(texto) {
  const seg = obterSegmentador();
  if (!seg) return [...texto];
  return Array.from(seg.segment(texto), (s) => s.segment);
}
