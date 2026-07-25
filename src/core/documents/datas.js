// Datas (nascimento e admissão) — formato DD/MM/AAAA, determinístico.
//
// Usa um ANO_BASE fixo, não a data atual: assim a mesma seed produz sempre a
// MESMA data (reprodutibilidade real, não muda com o passar do tempo). Como o
// ano de nascimento é sempre ≤ ANO_BASE − 18, o resultado é sempre de maior de
// idade, mesmo em anos futuros.

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

/** Gera uma data válida DD/MM/AAAA com o ano no intervalo dado. */
function gerarData(rng, anoMin, anoMax) {
  const ano = rng.inteiro(anoMin, anoMax);
  const mes = rng.inteiro(1, 12);
  const dia = rng.inteiro(1, diasNoMes(mes, ano));
  return `${p2(dia)}/${p2(mes)}/${ano}`;
}

/** Data de nascimento — sempre de maior de idade (18 a 75 anos). */
export function gerarDataNascimento(rng) {
  return gerarData(rng, ANO_BASE - IDADE_MAX, ANO_BASE - IDADE_MIN);
}

/** Data de admissão — dentro dos últimos ~25 anos. */
export function gerarDataAdmissao(rng) {
  return gerarData(rng, ANO_BASE - ANOS_ADMISSAO, ANO_BASE);
}
