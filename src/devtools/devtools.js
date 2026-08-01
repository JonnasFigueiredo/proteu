// Registra o painel da Proteu QA no DevTools.
//
// Esta página não tem interface: ela só existe para criar o painel. Roda uma
// vez por aba com o DevTools aberto.

// Os dois caminhos são resolvidos a partir da RAIZ da extensão, não deste
// arquivo: o Chrome monta a URL como origem + "/" + caminho. Escrevê-los
// relativos ao devtools.html cria o painel apontando para um endereço que não
// existe — a aba aparece no DevTools e abre em branco, sem erro visível.
chrome.devtools.panels.create(
  "Proteu QA",
  "icons/32.png",
  "src/devtools/painel.html"
);
