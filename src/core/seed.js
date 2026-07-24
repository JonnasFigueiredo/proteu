// PRNG determinístico com seed.
//
// A seed é uma string curta em hexadecimal (ex.: "7f2a91"), visível na UI.
// A mesma seed + a mesma sequência de chamadas produz sempre a mesma saída —
// é isso que torna qualquer massa gerada reproduzível.
//
// Nenhum módulo de geração pode usar Math.random(); todos recebem um rng
// criado por criarRng().

// Hash xmur3: transforma a string da seed em quatro inteiros de 32 bits
// para alimentar o estado inicial do sfc32.
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

// sfc32: PRNG rápido de 128 bits de estado, com boa distribuição
// para o volume de dados que uma extensão gera.
function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Cria um gerador determinístico a partir de uma seed string.
 * Retorna um objeto com utilitários que todos os geradores consomem.
 */
export function criarRng(seed) {
  if (typeof seed !== "string" || seed.length === 0) {
    throw new Error("Seed deve ser uma string não vazia");
  }
  const gerarEstado = xmur3(seed);
  const proximo = sfc32(gerarEstado(), gerarEstado(), gerarEstado(), gerarEstado());

  return {
    seed,

    /** Número em [0, 1), como Math.random(). */
    numero() {
      return proximo();
    },

    /** Inteiro em [min, max], inclusivo nas duas pontas. */
    inteiro(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
        throw new Error(`Intervalo inválido: [${min}, ${max}]`);
      }
      return min + Math.floor(proximo() * (max - min + 1));
    },

    /** Um dígito decimal (0–9). */
    digito() {
      return Math.floor(proximo() * 10);
    },

    /** Elemento aleatório de um array não vazio. */
    escolher(itens) {
      if (!Array.isArray(itens) || itens.length === 0) {
        throw new Error("escolher() exige um array não vazio");
      }
      return itens[Math.floor(proximo() * itens.length)];
    },

    /** String de `tamanho` caracteres sorteados de `alfabeto`. */
    stringDe(alfabeto, tamanho) {
      let saida = "";
      for (let i = 0; i < tamanho; i++) {
        saida += alfabeto[Math.floor(proximo() * alfabeto.length)];
      }
      return saida;
    },
  };
}

/**
 * Valida/normaliza uma seed digitada pelo usuário: 1 a 16 caracteres hex.
 * Retorna a seed em minúsculas ou null se inválida.
 */
export function normalizarSeed(texto) {
  if (typeof texto !== "string") return null;
  const limpa = texto.trim().toLowerCase();
  return /^[0-9a-f]{1,16}$/.test(limpa) ? limpa : null;
}
