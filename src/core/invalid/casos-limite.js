// Casos-limite — reúne, numa estrutura única e ordenada, as famílias de
// entradas que costumam quebrar sistemas. Consumido pela aba do popup.
//
// Cada família: { id, tituloKey (i18n), perigo?, contar?, casos: [...] }.
// - perigo: true  → payloads (uso defensivo), estilizados como alerta.
// - contar: true  → mostra as 4 contagens (grafema/code point/unit/byte) por caso.
// A família "Tamanho / overflow" é um gerador paramétrico e vive direto na UI.

import { FRONTEIRAS_UNICODE } from "./unicode.js";
import { XSS, SQLI, FORMATO } from "./payloads.js";
import { NUMEROS_DATAS, ESPACOS_CONTROLE, FORMATOS_INVALIDOS } from "./valores-limite.js";

export const FAMILIAS_LIMITE = [
  { id: "unicode", tituloKey: "lim_fam_unicode", contar: true, casos: FRONTEIRAS_UNICODE },
  { id: "seguranca", tituloKey: "lim_fam_seguranca", perigo: true, casos: [...XSS, ...SQLI, ...FORMATO] },
  { id: "numeros", tituloKey: "lim_fam_numeros", casos: NUMEROS_DATAS },
  { id: "espacos", tituloKey: "lim_fam_espacos", casos: ESPACOS_CONTROLE },
  { id: "formatos", tituloKey: "lim_fam_formatos", casos: FORMATOS_INVALIDOS },
];

/** Todos os casos achatados (para testes e buscas globais). */
export function todosCasos() {
  return FAMILIAS_LIMITE.flatMap((f) => f.casos);
}
