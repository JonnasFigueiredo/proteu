// Razão social (nome de empresa) — determinístico, genérico.
// Padrão: <fantasia> <ramo> <tipo societário>. Ramos e tipos são genéricos.

const FANTASIA = [
  "Aurora", "Vértice", "Horizonte", "Prisma", "Nexo", "Âncora", "Cume",
  "Delta", "Ápice", "Marco", "Norte", "Brava", "Ativa", "Central", "União",
  "Ipê", "Aroeira", "Jacarandá", "Atlântico", "Meridiano", "Orion", "Solar",
];

const RAMO = [
  "Comércio", "Serviços", "Indústria", "Tecnologia", "Consultoria",
  "Logística", "Construções", "Participações", "Engenharia", "Distribuidora",
  "Assessoria", "Empreendimentos",
];

const TIPO_SOCIETARIO = ["Ltda", "S.A.", "ME", "EIRELI", "EPP"];

/** Gera uma razão social determinística. */
export function gerarRazaoSocial(rng) {
  const fantasia = rng.escolher(FANTASIA);
  const ramo = rng.escolher(RAMO);
  const tipo = rng.escolher(TIPO_SOCIETARIO);
  return `${fantasia} ${ramo} ${tipo}`;
}
