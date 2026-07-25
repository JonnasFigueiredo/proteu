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

/** Formata dia/mês/ano conforme a convenção do país. */
function formatar(dia, mes, ano, formato) {
  if (formato === "us") return `${p2(mes)}/${p2(dia)}/${ano}`; // MM/DD/AAAA
  if (formato === "iso") return `${ano}-${p2(mes)}-${p2(dia)}`; // AAAA-MM-DD
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
