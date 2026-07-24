// Placa veicular — padrão Mercosul (ABC1D23) e antigo (ABC-1234).
//
// A conversão oficial antigo→Mercosul troca o 2º dígito por letra, por isso o
// formato LLLNLNN. Para massa de teste geramos qualquer combinação nesses
// moldes.

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Valida placa nos dois padrões (aceita com ou sem hífen no antigo). */
export function validarPlaca(valor) {
  const limpo = String(valor).replace(/-/g, "").toUpperCase();
  return /^[A-Z]{3}\d[A-Z]\d{2}$/.test(limpo) || /^[A-Z]{3}\d{4}$/.test(limpo);
}

/**
 * Gera uma placa de forma determinística.
 * @param {object} rng
 * @param {{padrao?: "mercosul"|"antiga", mascara?: boolean}} [opcoes]
 *   mascara só afeta o padrão antigo (ABC-1234); Mercosul não usa separador.
 */
export function gerarPlaca(rng, { padrao = "mercosul", mascara = false } = {}) {
  const letras = rng.stringDe(LETRAS, 3);
  if (padrao === "antiga") {
    const numeros = Array.from({ length: 4 }, () => rng.digito()).join("");
    return mascara ? `${letras}-${numeros}` : letras + numeros;
  }
  const d1 = rng.digito();
  const letra = rng.stringDe(LETRAS, 1);
  const d23 = Array.from({ length: 2 }, () => rng.digito()).join("");
  return `${letras}${d1}${letra}${d23}`;
}
