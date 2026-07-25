// CNPJ — numérico E alfanumérico na MESMA função.
//
// Padrão vigente desde jul/2026:
//   - 14 posições. As 12 primeiras aceitam A–Z e 0–9; os 2 últimos (DV) são
//     sempre numéricos.
//   - DV por módulo 11, pesos de 2 a 9.
//   - Cada caractere vira número por charCodeAt(0) - 48:
//       '0'→0, '9'→9, 'A'→17, 'Z'→42.
//     Isso torna o algoritmo retrocompatível: um CNPJ 100% numérico é só o
//     caso particular em que as 12 primeiras posições usam apenas '0'–'9'.
//     Por isso UMA função só valida e gera ambos os formatos.
//
// Exemplo oficial do SERPRO (deve ser válido): 12.ABC.345/01DE-35.

// Pesos do módulo 11 (ciclo 2..9 aplicado da direita para a esquerda,
// mas escritos aqui da esquerda para a direita para casar com a ordem dos
// caracteres).
const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; // 12 posições
const PESOS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; // 13 posições

// Alfabeto base completo: dígitos + A–Z.
const ALFABETO_COMPLETO = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// Letras ambíguas removíveis via toggle (default aceita todas).
const LETRAS_AMBIGUAS = new Set(["I", "O", "U", "Q", "F"]);

/** Valor numérico de um caractere base, conforme o padrão (charCodeAt - 48). */
function valorCaractere(ch) {
  return ch.charCodeAt(0) - 48;
}

/** Calcula um DV aplicando os pesos dados aos caracteres base. */
function calcularDv(caracteres, pesos) {
  let soma = 0;
  for (let i = 0; i < pesos.length; i++) {
    soma += valorCaractere(caracteres[i]) * pesos[i];
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Aplica a máscara 00.000.000/0000-00 (posicional; serve p/ alfanumérico). */
export function mascararCnpj(cnpj) {
  return cnpj.replace(/(.{2})(.{3})(.{3})(.{4})(.{2})/, "$1.$2.$3/$4-$5");
}

/** Remove pontuação de máscara (. / -) e normaliza para maiúsculas. */
function limpar(valor) {
  return String(valor)
    .replace(/[.\-/]/g, "")
    .toUpperCase();
}

/**
 * Valida um CNPJ numérico OU alfanumérico (com ou sem máscara).
 * Rejeita sequências uniformes (ex.: AAAAAAAAAAAA / 00000000000000).
 */
export function validarCnpj(valor) {
  const limpo = limpar(valor);
  if (limpo.length !== 14) return false;
  // 12 primeiras: [0-9A-Z]; 2 últimas: dígitos.
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(limpo)) return false;
  if (/^(.)\1{13}$/.test(limpo)) return false;

  const base = limpo.slice(0, 12).split("");
  const dv1 = calcularDv(base, PESOS_DV1);
  const dv2 = calcularDv([...base, String(dv1)], PESOS_DV2);
  return dv1 === Number(limpo[12]) && dv2 === Number(limpo[13]);
}

/**
 * Gera um CNPJ válido de forma determinística — numérico ou alfanumérico.
 * @param {object} rng - gerador de core/seed.js
 * @param {object} [opcoes]
 * @param {boolean} [opcoes.alfanumerico=false] - usar A–Z além de dígitos
 * @param {boolean} [opcoes.excluirAmbiguas=false] - remover I,O,U,Q,F (só no modo alfanumérico)
 * @param {boolean} [opcoes.mascara=false] - retornar com máscara
 * @returns {string}
 */
export function gerarCnpj(
  rng,
  { alfanumerico = false, excluirAmbiguas = false, mascara = false } = {}
) {
  let alfabeto = "0123456789";
  if (alfanumerico) {
    alfabeto = excluirAmbiguas
      ? [...ALFABETO_COMPLETO].filter((c) => !LETRAS_AMBIGUAS.has(c)).join("")
      : ALFABETO_COMPLETO;
  }

  let base;
  do {
    base = Array.from({ length: 12 }, () => rng.escolher([...alfabeto]));
  } while (base.every((c) => c === base[0]));

  const dv1 = calcularDv(base, PESOS_DV1);
  const dv2 = calcularDv([...base, String(dv1)], PESOS_DV2);
  const cnpj = base.join("") + dv1 + dv2;
  return mascara ? mascararCnpj(cnpj) : cnpj;
}

/**
 * Gera apenas a RAIZ do CNPJ (8 primeiras posições) — o que identifica a
 * empresa. Matriz e filiais compartilham a mesma raiz.
 */
export function gerarRaizCnpj(rng, { alfanumerico = false, excluirAmbiguas = false } = {}) {
  let alfabeto = "0123456789";
  if (alfanumerico) {
    alfabeto = excluirAmbiguas
      ? [...ALFABETO_COMPLETO].filter((c) => !LETRAS_AMBIGUAS.has(c)).join("")
      : ALFABETO_COMPLETO;
  }
  let raiz;
  do {
    raiz = Array.from({ length: 8 }, () => rng.escolher([...alfabeto])).join("");
  } while ([...raiz].every((c) => c === raiz[0]));
  return raiz;
}

/**
 * Monta um CNPJ a partir de uma raiz (8) e uma ordem/filial (número). A ordem
 * vira 4 dígitos: 1 → "0001" (matriz), 2 → "0002" (primeira filial), etc. Os
 * DVs são recalculados. Assim é possível gerar vários CNPJs da mesma empresa.
 */
export function cnpjDeRaiz(raiz, ordem, { mascara = false } = {}) {
  const raizStr = String(raiz).toUpperCase();
  if (raizStr.length !== 8) throw new Error("Raiz deve ter 8 caracteres");
  const ordemStr = String(ordem).padStart(4, "0");
  if (ordemStr.length !== 4) throw new Error(`Ordem inválida: ${ordem}`);

  const base = [...raizStr, ...ordemStr];
  const dv1 = calcularDv(base, PESOS_DV1);
  const dv2 = calcularDv([...base, String(dv1)], PESOS_DV2);
  const cnpj = base.join("") + dv1 + dv2;
  return mascara ? mascararCnpj(cnpj) : cnpj;
}
