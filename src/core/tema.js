// Tema (claro / escuro / automático) — decisão pura, sem DOM.
//
// A config guarda três valores: "auto" (segue o sistema), "claro" e "escuro".
// Mas o que o usuário VÊ são só dois. Isso importa no botão de alternar:
// ciclar auto → claro → escuro → auto deixa um clique sem efeito visual,
// porque "auto" sempre coincide com "claro" ou com "escuro" conforme o
// sistema. Aqui a regra é explícita e testável.

/**
 * O tema efetivamente exibido.
 * @param {string} tema - valor da config ("auto" | "claro" | "escuro")
 * @param {boolean} sistemaEscuro - se o SO está no modo escuro
 * @returns {"claro"|"escuro"}
 */
export function temaVisivel(tema, sistemaEscuro) {
  if (tema === "claro" || tema === "escuro") return tema;
  return sistemaEscuro ? "escuro" : "claro";
}

/**
 * Próximo tema do botão de alternar: sempre o INVERSO do que está na tela,
 * para que todo clique produza uma mudança visível.
 *
 * O modo "auto" não entra neste ciclo de propósito — ele continua disponível
 * no seletor da aba Configurações, onde a escolha é explícita.
 *
 * @returns {"claro"|"escuro"}
 */
export function proximoTema(tema, sistemaEscuro) {
  return temaVisivel(tema, sistemaEscuro) === "escuro" ? "claro" : "escuro";
}
