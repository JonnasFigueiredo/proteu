// Datas (nascimento e admissão) — formato DD/MM/AAAA, determinístico.
//
// Usa um ANO_BASE fixo, não a data atual: assim a mesma seed produz sempre a
// MESMA data (reprodutibilidade real, não muda com o passar do tempo). Como o
// ano de nascimento é sempre ≤ ANO_BASE − 18, o resultado é sempre de maior de
// idade, mesmo em anos futuros.

import { criarRng } from "../seed.js";

const ANO_BASE = 2026;
const IDADE_MIN = 18;
const IDADE_MAX = 75;
const ANOS_ADMISSAO = 25; // admissão dentro dos últimos ~25 anos

function ehBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function diasNoMes(mes, ano) {
  return [31, ehBissexto(ano) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
}

const p2 = (n) => String(n).padStart(2, "0");

/** Formata dia/mês/ano conforme a convenção do país. */
function formatar(dia, mes, ano, formato) {
  if (formato === "us") return `${p2(mes)}/${p2(dia)}/${ano}`; // MM/DD/AAAA
  if (formato === "iso") return `${ano}-${p2(mes)}-${p2(dia)}`; // AAAA-MM-DD
  if (formato === "de") return `${p2(dia)}.${p2(mes)}.${ano}`; // DD.MM.AAAA (Alemanha)
  return `${p2(dia)}/${p2(mes)}/${ano}`; // DD/MM/AAAA (br, padrão)
}

/** Gera uma data válida no formato pedido, com o ano no intervalo dado. */
function gerarData(rng, anoMin, anoMax, formato) {
  const ano = rng.inteiro(anoMin, anoMax);
  const mes = rng.inteiro(1, 12);
  const dia = rng.inteiro(1, diasNoMes(mes, ano));
  return formatar(dia, mes, ano, formato);
}

/** Data de nascimento — sempre de maior de idade (18 a 75 anos). */
export function gerarDataNascimento(rng, { formato = "br" } = {}) {
  return gerarData(rng, ANO_BASE - IDADE_MAX, ANO_BASE - IDADE_MIN, formato);
}

/** Data de admissão — dentro dos últimos ~25 anos. */
export function gerarDataAdmissao(rng, { formato = "br" } = {}) {
  return gerarData(rng, ANO_BASE - ANOS_ADMISSAO, ANO_BASE, formato);
}

// --- Datas coerentes entre si -------------------------------------------------
//
// As duas funções acima sorteiam cada uma a sua data, sem se enxergarem. Numa
// persona isso produzia gente admitida ANTES de nascer — vi uma nascida em 2006
// e admitida em 2003. Passava despercebido porque cada data, isolada, é válida.
//
// Aqui as duas saem do MESMO rng, derivado de (seed, contador). Assim a
// admissão pode olhar o nascimento sem que uma função precise receber a outra,
// e o resultado não depende da ORDEM em que os campos são gerados — o que
// tornava a coerência refém do arranjo do registro de cada país.

/** Idade mínima para admissão. Aprendiz no Brasil começa aos 14; 16 é o piso geral. */
const IDADE_MIN_TRABALHO = 16;

/** Compara (mês, dia) — devolve true se a for anterior a b. */
function antesNoAno(mesA, diaA, mesB, diaB) {
  return mesA < mesB || (mesA === mesB && diaA < diaB);
}

/**
 * Nascimento e admissão de uma persona, coerentes entre si.
 * @param {{seed: string, contador: number}} config
 */
export function datasDaPersona(config) {
  const r = criarRng(`${config.seed}:${config.contador}:datas`);

  const anoNasc = r.inteiro(ANO_BASE - IDADE_MAX, ANO_BASE - IDADE_MIN);
  const mesNasc = r.inteiro(1, 12);
  const diaNasc = r.inteiro(1, diasNoMes(mesNasc, anoNasc));

  // Mantém a intenção original (contratações recentes) sem deixar a admissão
  // cair antes de a pessoa poder trabalhar.
  const anoMin = Math.max(anoNasc + IDADE_MIN_TRABALHO, ANO_BASE - ANOS_ADMISSAO);
  let anoAdm = r.inteiro(anoMin, ANO_BASE);
  let mesAdm = r.inteiro(1, 12);
  let diaAdm = r.inteiro(1, diasNoMes(mesAdm, anoAdm));

  // No ano em que a pessoa completa a idade mínima, o dia importa: admitir em
  // março quem faz aniversário em outubro deixaria ela com 15.
  if (anoAdm === anoNasc + IDADE_MIN_TRABALHO &&
      antesNoAno(mesAdm, diaAdm, mesNasc, diaNasc)) {
    if (anoAdm < ANO_BASE) {
      anoAdm += 1;
    } else {
      mesAdm = mesNasc;
      diaAdm = diaNasc;
    }
    diaAdm = Math.min(diaAdm, diasNoMes(mesAdm, anoAdm));
  }

  return {
    nascimento: { ano: anoNasc, mes: mesNasc, dia: diaNasc },
    admissao: { ano: anoAdm, mes: mesAdm, dia: diaAdm },
  };
}

/** Data de nascimento da persona, já formatada. */
export function nascimentoDaPersona(config, formato = "br") {
  const { nascimento: n } = datasDaPersona(config);
  return formatar(n.dia, n.mes, n.ano, formato);
}

/** Data de admissão da persona — nunca antes de ela poder trabalhar. */
export function admissaoDaPersona(config, formato = "br") {
  const { admissao: a } = datasDaPersona(config);
  return formatar(a.dia, a.mes, a.ano, formato);
}
