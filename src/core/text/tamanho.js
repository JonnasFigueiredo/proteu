// Geração de texto por tamanho, na unidade escolhida pelo usuário.
//
// "Gerar 100 caracteres" é ambíguo, então aqui o alvo é sempre acompanhado de
// uma unidade (grafemas, code points, code units UTF-16 ou bytes UTF-8) e o
// texto gerado atinge EXATAMENTE o alvo naquela unidade.
//
// Estratégia: preenche com grafemas de um "filler" enquanto couberem sem
// estourar o alvo; completa a diferença com 'x' (ASCII, que soma 1 em todas as
// unidades) para cravar o número exato. Assim o resultado é exato para qualquer
// unidade, inclusive com filler multibyte.

import { contarTudo, paraGrafemas } from "./contagem.js";

export const UNIDADES = ["grafemas", "codePoints", "codeUnits", "bytes"];

// Filler padrão: palavras latinas neutras (estilo lorem ipsum).
const FILLER_PADRAO =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor";

function contarNa(texto, unidade) {
  const c = contarTudo(texto);
  switch (unidade) {
    case "grafemas": return c.grafemas;
    case "codePoints": return c.codePoints;
    case "codeUnits": return c.codeUnits;
    case "bytes": return c.bytes;
    default: throw new Error(`Unidade desconhecida: ${unidade}`);
  }
}

/**
 * Gera texto que mede exatamente `alvo` na `unidade` escolhida.
 * @param {object} rng
 * @param {object} opcoes
 * @param {"grafemas"|"codePoints"|"codeUnits"|"bytes"} [opcoes.unidade="grafemas"]
 * @param {number} opcoes.alvo - inteiro >= 0
 * @param {string} [opcoes.filler] - texto-fonte dos grafemas (default: lorem)
 * @returns {{ texto: string, unidade: string, alvo: number, contagens: object, exato: boolean }}
 */
export function gerarPorTamanho(rng, { unidade = "grafemas", alvo, filler = FILLER_PADRAO } = {}) {
  if (!UNIDADES.includes(unidade)) throw new Error(`Unidade desconhecida: ${unidade}`);
  if (!Number.isInteger(alvo) || alvo < 0) throw new Error(`Alvo inválido: ${alvo}`);

  const grafemas = paraGrafemas(filler).filter((g) => g.trim() !== "" || g === " ");
  let texto = "";

  if (alvo > 0 && grafemas.length > 0) {
    // Adiciona grafemas que caibam; tenta algumas vezes antes de partir p/ ASCII.
    let seguranca = alvo * 8 + 200;
    while (contarNa(texto, unidade) < alvo && seguranca-- > 0) {
      let coube = false;
      for (let tentativa = 0; tentativa < 6; tentativa++) {
        const g = rng.escolher(grafemas);
        if (contarNa(texto + g, unidade) <= alvo) {
          texto += g;
          coube = true;
          break;
        }
      }
      if (!coube) break; // nenhum grafema do filler cabe: completa com ASCII
    }
  }

  // Completa a diferença com 'x' (soma exatamente 1 em qualquer unidade).
  const faltam = alvo - contarNa(texto, unidade);
  if (faltam > 0) texto += "x".repeat(faltam);

  const contagens = contarTudo(texto);
  return {
    texto,
    unidade,
    alvo,
    contagens,
    exato: contarNa(texto, unidade) === alvo,
  };
}
