// Geração de texto por tamanho, na unidade escolhida pelo usuário.
//
// "Gerar 100 caracteres" é ambíguo, então aqui o alvo é sempre acompanhado de
// uma unidade (grafemas, code points, code units UTF-16 ou bytes UTF-8) e o
// texto gerado atinge EXATAMENTE o alvo naquela unidade.
//
// A unidade "caracteres" existe para o caso em que a QA não quer entrar nesse
// mérito: ela sai em ASCII puro, onde as quatro contagens dão o mesmo número.
// Não é uma quinta forma de contar — é a garantia de que, ali, não há o que
// desambiguar.
//
// Estratégia: preenche com grafemas de um "filler" enquanto couberem sem
// estourar o alvo; completa a diferença com 'x' (ASCII, que soma 1 em todas as
// unidades) para cravar o número exato. Assim o resultado é exato para qualquer
// unidade, inclusive com filler multibyte.

import {
  contarTudo,
  paraGrafemas,
  contarGrafemas,
  contarCodePoints,
  contarCodeUnits,
  contarBytes,
} from "./contagem.js";

export const UNIDADES = ["caracteres", "grafemas", "codePoints", "codeUnits", "bytes"];

// Contador específico de cada unidade — evita computar as 4 (e o Segmenter)
// a cada grafema testado no loop de preenchimento.
//
// "caracteres" não é uma quinta forma de contar: é o caso em que a QA não quer
// pensar em Unicode e só precisa de N caracteres para bater num maxlength.
// Para essa promessa valer, o texto sai em ASCII puro — aí as quatro contagens
// coincidem e "100 caracteres" é 100 em qualquer uma delas. Contar por code
// units é indiferente aqui, justamente porque todas dão o mesmo número.
const CONTADOR = {
  caracteres: contarCodeUnits,
  grafemas: contarGrafemas,
  codePoints: contarCodePoints,
  codeUnits: contarCodeUnits,
  bytes: contarBytes,
};

/** A unidade que promete texto onde as quatro contagens batem. */
const UNIDADE_ASCII = "caracteres";

// Filler padrão: palavras latinas neutras (estilo lorem ipsum).
const FILLER_PADRAO =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor";

function contarNa(texto, unidade) {
  const contador = CONTADOR[unidade];
  if (!contador) throw new Error(`Unidade desconhecida: ${unidade}`);
  return contador(texto);
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

  // Em "caracteres" o filler do idioma é ignorado de propósito: uma palavra em
  // árabe ou chinês faria as contagens divergirem, e a única coisa que essa
  // unidade promete é justamente que elas não divergem.
  const fonte = unidade === UNIDADE_ASCII ? FILLER_PADRAO : filler;
  const grafemas = paraGrafemas(fonte).filter((g) => g.trim() !== "" || g === " ");
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
