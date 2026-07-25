// Argentina — geradores de documentos de pessoa e empresa.
// Determinísticos (recebem um rng de core/seed.js). Rótulos em espanhol.

// --- Nombre ---
const NOMBRES = [
  "Juan", "María", "Carlos", "Ana", "José", "Laura", "Diego", "Sofía", "Martín",
  "Lucía", "Pablo", "Valentina", "Santiago", "Camila", "Mateo", "Julieta",
  "Nicolás", "Florencia", "Agustín", "Micaela", "Facundo", "Rocío", "Tomás",
  "Antonella", "Gonzalo", "Brenda", "Franco", "Carla", "Ezequiel", "Daniela",
];
const APELLIDOS = [
  "González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez",
  "Pérez", "García", "Sánchez", "Romero", "Sosa", "Torres", "Álvarez", "Ruiz",
  "Ramírez", "Flores", "Benítez", "Acosta", "Medina", "Herrera", "Suárez",
  "Aguirre", "Giménez", "Molina", "Silva", "Castro", "Rojas", "Ortiz", "Núñez",
];

export function gerarNombreAR(rng) {
  return `${rng.escolher(NOMBRES)} ${rng.escolher(APELLIDOS)}`;
}

// --- DNI (Documento Nacional de Identidad): 7–8 dígitos ---
export function gerarDni(rng, { mascara = false } = {}) {
  const n = rng.inteiro(4_000_000, 99_999_999);
  const s = String(n);
  if (!mascara) return s;
  // Pontos de milhar: 12.345.678
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// --- CUIT / CUIL: XX-XXXXXXXX-D (dígito verificador módulo 11) ---
const PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const PREFIXOS_PERSONA = ["20", "27", "23", "24"]; // CUIL
const PREFIXOS_EMPRESA = ["30", "33", "34"]; // CUIT

function dvCuit(dezDigitos) {
  let soma = 0;
  for (let i = 0; i < 10; i++) soma += dezDigitos[i] * PESOS_CUIT[i];
  const dv = 11 - (soma % 11);
  if (dv === 11) return 0;
  return dv; // pode ser 10 (caso especial) — o gerador evita
}

function gerarComPrefixos(rng, prefixos, mascara) {
  const prefixo = rng.escolher(prefixos);
  let corpo, dv;
  do {
    corpo = Array.from({ length: 8 }, () => rng.digito());
    dv = dvCuit([...prefixo].map(Number).concat(corpo));
  } while (dv === 10); // evita o caso especial (prefixo 23) → sempre válido
  const num = prefixo + corpo.join("") + dv;
  return mascara ? `${prefixo}-${corpo.join("")}-${dv}` : num;
}

/** CUIL (pessoa) — prefixos 20/27/23/24. */
export function gerarCuil(rng, { mascara = false } = {}) {
  return gerarComPrefixos(rng, PREFIXOS_PERSONA, mascara);
}

/** CUIT (empresa) — prefixos 30/33/34. */
export function gerarCuit(rng, { mascara = false } = {}) {
  return gerarComPrefixos(rng, PREFIXOS_EMPRESA, mascara);
}

export function validarCuit(valor) {
  const d = String(valor).replace(/\D/g, "");
  if (d.length !== 11) return false;
  const digitos = [...d].map(Number);
  const dv = dvCuit(digitos.slice(0, 10));
  if (dv === 10) return false; // caso especial fora de escopo
  return dv === digitos[10];
}

// --- Código Postal Argentino (CPA): LXXXXLLL ---
const LETRAS = "ABCDEFGHJKLMNPRSTUVWXYZ"; // províncias (sem I/O/Q para evitar ambiguidade)

export function gerarCpa(rng) {
  const provincia = rng.stringDe(LETRAS, 1);
  const digitos = Array.from({ length: 4 }, () => rng.digito()).join("");
  const sufixo = rng.stringDe(LETRAS, 3);
  return `${provincia}${digitos}${sufixo}`;
}

// --- Teléfono: (0AA) XXXX-XXXX ---
const AREAS_AR = ["11", "351", "341", "261", "223", "381", "299", "387"];

export function gerarTelefonoAR(rng, { mascara = false } = {}) {
  const area = rng.escolher(AREAS_AR);
  const restantes = 10 - area.length; // total ~10 dígitos
  const numero = Array.from({ length: restantes }, () => rng.digito()).join("");
  if (!mascara) return area + numero;
  const meio = Math.ceil(numero.length / 2);
  return `(0${area}) ${numero.slice(0, meio)}-${numero.slice(meio)}`;
}

// --- Razón social ---
const FANTASIA = [
  "Aurora", "Vértice", "Horizonte", "Delta", "Andina", "Pampa", "Litoral",
  "Sur", "Central", "Cordillera", "Río", "Costa", "Meridiano", "Nexo",
];
const RAMO = [
  "Servicios", "Comercial", "Industrial", "Tecnología", "Consultora",
  "Logística", "Construcciones", "Agropecuaria", "Distribuidora",
];
const TIPO = ["S.A.", "S.R.L.", "S.A.S."];

export function gerarRazonSocialAR(rng) {
  return `${rng.escolher(FANTASIA)} ${rng.escolher(RAMO)} ${rng.escolher(TIPO)}`;
}
