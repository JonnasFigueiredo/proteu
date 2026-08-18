// Gerador de senha.
//
// Diferente do resto do projeto, esta aba NÃO é determinística — e é de
// propósito. Derivar a senha da seed a tornaria reproduzível por quem lê a
// seed, que fica visível na interface, e aí chamá-la de forte seria mentira.
// Aqui a fonte é sempre `crypto.getRandomValues`.
//
// Lógica pura: sem DOM, sem chrome. `crypto` existe no Node e no navegador.

export const CLASSES = {
  maiusculas: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  minusculas: "abcdefghijklmnopqrstuvwxyz",
  numeros: "0123456789",
  simbolos: "!@#$%^&*()-_=+[]{};:,.<>?/~",
};

/** Parecidos entre si em fonte comum — atrapalham quem copia à mão. */
const AMBIGUOS = new Set("Il1O0S5B8Z2");

export const TAMANHO_MIN = 4;
export const TAMANHO_MAX = 64;
export const TAMANHO_PADRAO = 16;

/**
 * Sorteia um inteiro em [0, teto) sem viés.
 *
 * `aleatorio % teto` parece inofensivo e favorece os primeiros caracteres do
 * alfabeto sempre que 256 não é múltiplo do tamanho dele — o que é quase
 * sempre. Descartar os bytes da faixa incompleta custa alguns sorteios a mais
 * e devolve distribuição uniforme de verdade.
 */
function sortear(teto) {
  const limite = Math.floor(256 / teto) * teto;
  const buf = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limite) return buf[0] % teto;
  }
}

/** Remove os caracteres ambíguos de um conjunto. */
const semAmbiguos = (s) => [...s].filter((c) => !AMBIGUOS.has(c)).join("");

/** Monta o alfabeto a partir das classes escolhidas. */
export function alfabetoDe(opcoes = {}) {
  let alfabeto = "";
  for (const [nome, chars] of Object.entries(CLASSES)) {
    if (opcoes[nome]) alfabeto += chars;
  }
  return opcoes.excluirAmbiguos ? semAmbiguos(alfabeto) : alfabeto;
}

/** As classes ativas, já filtradas — cada uma precisa aparecer na senha. */
function classesAtivas(opcoes) {
  const saida = [];
  for (const [nome, chars] of Object.entries(CLASSES)) {
    if (!opcoes[nome]) continue;
    const conjunto = opcoes.excluirAmbiguos ? semAmbiguos(chars) : chars;
    if (conjunto) saida.push(conjunto);
  }
  return saida;
}

/**
 * Gera uma senha aleatória.
 *
 * @param {{
 *   tamanho?: number, maiusculas?: boolean, minusculas?: boolean,
 *   numeros?: boolean, simbolos?: boolean, excluirAmbiguos?: boolean
 * }} opcoes
 */
export function gerarSenha(opcoes = {}) {
  const tamanho = Math.min(TAMANHO_MAX, Math.max(TAMANHO_MIN,
    Number(opcoes.tamanho) || TAMANHO_PADRAO));

  const alfabeto = alfabetoDe(opcoes);
  if (!alfabeto) throw new Error("escolha ao menos um tipo de caractere");

  // Garante ao menos um de cada classe pedida: uma senha de 16 caracteres que
  // sai sem nenhum dígito reprova em política que exige número, e quem gerou
  // só descobre quando o formulário recusa.
  const chars = classesAtivas(opcoes)
    .slice(0, tamanho)
    .map((conjunto) => conjunto[sortear(conjunto.length)]);

  while (chars.length < tamanho) {
    chars.push(alfabeto[sortear(alfabeto.length)]);
  }

  // Sem embaralhar, os caracteres garantidos ficariam sempre no começo, na
  // ordem das classes — um padrão fixo que reduz a entropia real.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = sortear(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

/**
 * Força da senha, em bits de entropia.
 *
 * Mede o espaço de busca (alfabeto elevado ao comprimento), que é o que um
 * ataque de força bruta enfrenta. Só vale para senha SORTEADA: uma senha de
 * dicionário daria a mesma conta e seria muito mais fraca.
 */
export function forcaDaSenha(tamanho, tamanhoAlfabeto) {
  const n = Number(tamanho) || 0;
  const a = Number(tamanhoAlfabeto) || 0;
  if (n <= 0 || a <= 1) return { bits: 0, nivel: "fraca", proporcao: 0 };

  const bits = n * Math.log2(a);

  // Abaixo de 50 bits cai rápido a ataque offline; 80 ou mais é considerado
  // confortável hoje.
  let nivel = "fraca";
  if (bits >= 100) nivel = "excelente";
  else if (bits >= 75) nivel = "forte";
  else if (bits >= 50) nivel = "media";

  return { bits: Math.round(bits), nivel, proporcao: Math.min(1, bits / 120) };
}

/** Rótulo traduzível de cada nível. */
export const CHAVE_NIVEL = {
  fraca: "senha_fraca",
  media: "senha_media",
  forte: "senha_forte",
  excelente: "senha_excelente",
};
