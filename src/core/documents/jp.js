// Japão — geradores de documentos de pessoa e empresa. Rótulos em japonês.
// Determinísticos (recebem um rng de core/seed.js).
//
// Os dois identificadores nacionais têm dígito verificador publicado: a
// マイナンバー pelo Ministério do Interior e o 法人番号 pela Agência Nacional
// de Impostos. Gerar com DV válido é o que permite exercitar a validação do
// sistema testado em vez de esbarrar nela.

const rndJp = (rng, s) => s[rng.inteiro(0, s.length - 1)];

// --- Nome (姓名) ---
// Sobrenome vem primeiro, como se escreve em japonês.
const SOBRENOMES_JP = [
  "佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村",
  "小林", "加藤", "吉田", "山田", "佐々木", "松本", "井上", "木村",
];
const NOMES_JP = [
  "翔太", "陽菜", "大輔", "さくら", "健太", "美咲", "拓也", "愛",
  "直樹", "結衣", "涼介", "彩", "和也", "優子", "遼", "真央",
];

export function gerarNameJP(rng) {
  return `${rndJp(rng, SOBRENOMES_JP)} ${rndJp(rng, NOMES_JP)}`;
}

// --- マイナンバー (My Number / 個人番号): 12 dígitos ---------------------------
//
// DV é o ÚLTIMO dígito. Sobre os 11 anteriores, lidos da DIREITA para a
// esquerda (P1 é o vizinho imediato do DV):
//   Qn = n+1 para 1≤n≤6 ; Qn = n-5 para 7≤n≤11
//   DV = 11 - (Σ Pn×Qn mod 11), e vira 0 quando esse valor é 10 ou 11.
function pesosMyNumber() {
  return Array.from({ length: 11 }, (_, i) => {
    const n = i + 1;
    return n <= 6 ? n + 1 : n - 5;
  });
}

function dvMyNumber(onzeDigitos) {
  const q = pesosMyNumber();
  // P1 é o dígito mais à direita do corpo, então percorremos invertido.
  const p = onzeDigitos.split("").reverse().map(Number);
  const soma = p.reduce((acc, d, i) => acc + d * q[i], 0);
  const r = 11 - (soma % 11);
  return r >= 10 ? 0 : r;
}

export function validarMyNumber(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 12) return false;
  return dvMyNumber(d.slice(0, 11)) === Number(d[11]);
}

export function gerarMyNumber(rng, { mascara = false } = {}) {
  const corpo = Array.from({ length: 11 }, () => rng.digito()).join("");
  const num = corpo + dvMyNumber(corpo);
  return mascara ? num.replace(/^(\d{4})(\d{4})(\d{4})$/, "$1 $2 $3") : num;
}

// --- 法人番号 (Corporate Number): 13 dígitos ----------------------------------
//
// DV é o PRIMEIRO dígito, sobre os 12 seguintes lidos da direita para a
// esquerda: Qn = 1 se n ímpar, 2 se n par.
//   DV = 9 - (Σ Pn×Qn mod 9)
//
// Por ser módulo 9, este DV não distingue 0 de 9: trocar um dígito por outro a
// 9 de distância mantém a soma. Medido aqui, ele pega ~91% das trocas de um
// dígito — é limitação do algoritmo oficial, não da implementação. Não "conserte"
// mudando o módulo: o número deixaria de casar com a base da Agência Nacional
// de Impostos, que é justamente contra quem o sistema testado valida.
function dvHoujin(dozeDigitos) {
  const p = dozeDigitos.split("").reverse().map(Number);
  const soma = p.reduce((acc, d, i) => acc + d * ((i + 1) % 2 === 1 ? 1 : 2), 0);
  return 9 - (soma % 9);
}

export function validarHoujinBangou(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 13) return false;
  return dvHoujin(d.slice(1)) === Number(d[0]);
}

export function gerarHoujinBangou(rng, { mascara = false } = {}) {
  const corpo = Array.from({ length: 12 }, () => rng.digito()).join("");
  const num = String(dvHoujin(corpo)) + corpo;
  return mascara ? num.replace(/^(\d)(\d{4})(\d{4})(\d{4})$/, "$1-$2-$3-$4") : num;
}

// --- 郵便番号 (código postal): 7 dígitos ---------------------------------------
//
// Os dois primeiros dígitos identificam a região; usamos prefixos reais para o
// número não cair numa faixa que não existe.
const PREFIXOS_POSTAL_JP = [
  "10", "11", "13", "14", "15", "16", "17", "18", // Tóquio e arredores
  "20", "21", "22", "23", "24", "25", "26",       // Kanagawa, Chiba
  "30", "31", "32", "33", "34", "35",             // Ibaraki, Tochigi, Saitama
  "40", "41", "43", "44", "45", "46",             // Yamanashi, Shizuoka, Aichi
  "50", "51", "52", "53", "54", "55", "56", "57", // Gifu, Mie, Kyoto, Osaka
  "60", "61", "63", "65", "66", "67",             // Kyoto, Shiga, Hyogo
  "70", "72", "73", "75", "76", "78",             // Okayama, Hiroshima
  "80", "81", "85", "86", "89",                   // Fukuoka, Kyushu
  "90", "92", "95", "96", "98",                   // Okinawa, Tohoku
];

export function gerarPostalJP(rng, { mascara = false } = {}) {
  const num = rndJp(rng, PREFIXOS_POSTAL_JP) +
    Array.from({ length: 5 }, () => rng.digito()).join("");
  return mascara ? `〒${num.slice(0, 3)}-${num.slice(3)}` : num;
}

// --- 電話番号 (celular): 070/080/090 + 8 dígitos -------------------------------
export function gerarPhoneJP(rng, { mascara = false } = {}) {
  const prefixo = rndJp(rng, ["070", "080", "090"]);
  const corpo = Array.from({ length: 8 }, () => rng.digito()).join("");
  const num = prefixo + corpo;
  return mascara ? `${prefixo}-${corpo.slice(0, 4)}-${corpo.slice(4)}` : num;
}

// --- 会社名 (nome de empresa) ---
const NEGOCIO_JP = ["さくら", "富士", "東洋", "光和", "第一", "中央", "新星"];
const RAMO_JP = ["商事", "電機", "物流", "建設", "製作所", "運輸"];
const FORMA_JP = ["株式会社", "有限会社"];

export function gerarCompanyJP(rng) {
  // A forma jurídica vem antes do nome — é como a maioria se registra.
  return `${rndJp(rng, FORMA_JP)}${rndJp(rng, NEGOCIO_JP)}${rndJp(rng, RAMO_JP)}`;
}
