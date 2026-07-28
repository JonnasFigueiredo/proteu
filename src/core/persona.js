// Persona — uma pessoa fictícia COERENTE, não um punhado de campos soltos.
//
// A diferença para gerar campo a campo: aqui o e-mail sai do nome, e todos os
// valores vêm do MESMO rng, então a persona inteira é reproduzível pela seed.
// É o que permite preencher um formulário inteiro com dados que "combinam" e
// ainda passam na validação (documentos com DV correto).
//
// Multi-país sem tocar nos registros: a `rotuloKey` de cada tipo já é a chave
// semântica canônica (doc_nome, doc_telefone, doc_postal…), igual em todos os
// países. Basta procurar por ela no registro do país ativo.

import { criarRng } from "./seed.js";
import { tiposDoPais } from "./gerador.js";

// Slot da persona → rotuloKeys aceitas no registro do país (a primeira que
// existir vence). O código postal tem nome próprio em vários países — CEP no
// Brasil, ZIP nos EUA, CPA na Argentina — e todos são o mesmo slot.
const ROTULOKEYS_POR_SLOT = {
  nome: ["doc_nome"],
  nascimento: ["doc_nascimento"],
  telefone: ["doc_telefone"],
  postal: ["doc_postal", "doc_cep", "doc_zip", "doc_cpa"],
  empresa: ["doc_razao"],
};

// rotuloKeys que NÃO são o "documento principal" da pessoa (são campos comuns).
const NAO_DOCUMENTO = new Set([
  "doc_nome", "doc_nascimento", "doc_admissao", "doc_telefone",
  "doc_razao",
  ...ROTULOKEYS_POR_SLOT.postal,
]);

// Domínio reservado pela RFC 2606 — nunca aponta para um site real, e passa
// nos validadores de e-mail (ao contrário de .test/.invalid, que muitos negam).
const DOMINIO = "example.com";

/**
 * Normaliza um nome para uso em e-mail: minúsculas, sem acentos, só [a-z0-9.].
 * Nomes em escrita não-latina (chinês, árabe, devanágari) não têm
 * transliteração confiável offline — devolvem "" e o chamador usa o fallback.
 */
export function usuarioDeEmail(nome) {
  const base = String(nome || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira diacríticos
    .replace(/[^a-z0-9\s]/g, " ") // descarta o que não é latino
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (base.length === 0) return "";
  // Primeiro e último "pedaço" do nome: maria.souza (evita e-mail quilométrico).
  const partes = base.length === 1 ? base : [base[0], base[base.length - 1]];
  return partes.join(".");
}

/** Deriva o e-mail do nome; cai num usuário determinístico se o nome não for latino. */
function emailDaPersona(nome, rng) {
  const usuario = usuarioDeEmail(nome);
  if (usuario) return `${usuario}@${DOMINIO}`;
  return `usuario${rng.inteiro(1000, 9999)}@${DOMINIO}`;
}

/** Procura no registro do país o tipo de um slot (primeira rotuloKey que casar). */
function tipoDoSlot(tipos, slot) {
  const aceitas = ROTULOKEYS_POR_SLOT[slot] || [];
  for (const rotuloKey of aceitas) {
    for (const [chave, def] of Object.entries(tipos)) {
      if (def.rotuloKey === rotuloKey) return [chave, def];
    }
  }
  return null;
}

/**
 * O "documento principal" da pessoa no país: o primeiro tipo da categoria
 * Pessoa que não é um campo comum (nome/data/telefone/postal). No Brasil dá
 * CPF; nos EUA, SSN; na Índia, Aadhaar — sem precisar listar país por país.
 */
function tipoDocumentoPrincipal(tipos) {
  for (const [chave, def] of Object.entries(tipos)) {
    if (def.categoria !== "Pessoa") continue;
    if (NAO_DOCUMENTO.has(def.rotuloKey)) continue;
    return [chave, def];
  }
  return null;
}

/**
 * Gera uma persona coerente para o país da config.
 *
 * Todos os campos saem do MESMO rng (derivado de `${seed}:${contador}`), então
 * a persona inteira é reproduzível — e o contador avança uma única vez.
 *
 * @param {object} config - config normalizada (pais, seed, contador, documentos)
 * @returns {{ campos: Array<{slot,chaveTipo,rotuloKey,rotulo,valor}>, porSlot: object, contador: number, proximoContador: number }}
 */
export function gerarPersona(config) {
  if (!config || !config.seed) throw new Error("Config sem seed");
  const contador = config.contador;
  const rng = criarRng(`${config.seed}:${contador}`);
  const tipos = tiposDoPais(config.pais);

  const campos = [];
  const adicionar = (slot, achado) => {
    if (!achado) return null;
    const [chaveTipo, def] = achado;
    const valor = def.gerar(rng, config);
    campos.push({ slot, chaveTipo, rotuloKey: def.rotuloKey, rotulo: def.rotulo, valor });
    return valor;
  };

  // Ordem importa: o nome vem primeiro porque o e-mail é derivado dele.
  const nome = adicionar("nome", tipoDoSlot(tipos, "nome"));

  // E-mail não é um "tipo" de país — é derivado, e é o que dá coerência.
  const email = emailDaPersona(nome, rng);
  campos.push({ slot: "email", chaveTipo: null, rotuloKey: "pers_email", rotulo: "E-mail", valor: email });

  adicionar("documento", tipoDocumentoPrincipal(tipos));
  adicionar("nascimento", tipoDoSlot(tipos, "nascimento"));
  adicionar("telefone", tipoDoSlot(tipos, "telefone"));
  adicionar("postal", tipoDoSlot(tipos, "postal"));
  adicionar("empresa", tipoDoSlot(tipos, "empresa"));

  const porSlot = {};
  for (const c of campos) porSlot[c.slot] = c.valor;

  // Slots derivados: formulários costumam separar nome e sobrenome. Ficam fora
  // de `campos` (não poluem a exibição), mas servem para preencher.
  if (nome) {
    const partes = String(nome).trim().split(/\s+/);
    porSlot.primeiroNome = partes[0];
    porSlot.sobrenome = partes.length > 1 ? partes.slice(1).join(" ") : partes[0];
  }

  // `pais` viaja junto: quem preenche precisa dele para desambiguar a data
  // (13/10 é DD/MM no Brasil, mas 10/13 seria MM/DD nos EUA).
  return { pais: config.pais, campos, porSlot, contador, proximoContador: contador + 1 };
}
