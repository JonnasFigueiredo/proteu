// Chave Pix — os 4 formatos aceitos pelo BCB:
//   cpf        → CPF válido, sem máscara (como o DICT registra)
//   email      → e-mail sintético em domínio reservado a teste
//   telefone   → +55 + DDD + celular (formato E.164)
//   aleatoria  → UUID v4 (com bits de versão/variante corretos), tirado do rng

import { gerarCpf } from "./cpf.js";
import { gerarTelefone } from "./telefone.js";

export const FORMATOS_PIX = ["cpf", "email", "telefone", "aleatoria"];

// Domínios reservados pela IANA para teste — nunca entregam e-mail real.
const NOMES = ["maria", "joao", "ana", "carlos", "julia", "pedro", "clara", "lucas"];
const SOBRENOMES = ["silva", "santos", "souza", "lima", "costa", "oliveira"];
const DOMINIOS = ["example.com", "example.org", "test.example"];

function gerarEmail(rng) {
  const nome = rng.escolher(NOMES);
  const sobrenome = rng.escolher(SOBRENOMES);
  const n = rng.inteiro(1, 999);
  const dominio = rng.escolher(DOMINIOS);
  return `${nome}.${sobrenome}${n}@${dominio}`;
}

function gerarUuidV4(rng) {
  const hex = "0123456789abcdef";
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) uuid += "-";
    else if (i === 14) uuid += "4"; // versão 4
    else if (i === 19) uuid += hex[8 + rng.inteiro(0, 3)]; // variante 10xx → 8..b
    else uuid += hex[rng.inteiro(0, 15)];
  }
  return uuid;
}

/** Confere se uma string tem cara de chave Pix em algum dos 4 formatos. */
export function formatoDaChave(chave) {
  const s = String(chave);
  if (/^\d{11}$/.test(s)) return "cpf";
  if (/^\+55\d{11}$/.test(s)) return "telefone";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s)) {
    return "aleatoria";
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "email";
  return null;
}

/**
 * Gera uma chave Pix de forma determinística.
 * @param {object} rng
 * @param {{formato?: "cpf"|"email"|"telefone"|"aleatoria"}} [opcoes]
 *   Sem formato definido, sorteia um.
 */
export function gerarPix(rng, { formato = null } = {}) {
  const escolhido = formato ?? rng.escolher(FORMATOS_PIX);
  switch (escolhido) {
    case "cpf":
      return gerarCpf(rng, { mascara: false });
    case "email":
      return gerarEmail(rng);
    case "telefone":
      return "+55" + gerarTelefone(rng, { celular: true, mascara: false });
    case "aleatoria":
      return gerarUuidV4(rng);
    default:
      throw new Error(`Formato de chave Pix desconhecido: ${formato}`);
  }
}
