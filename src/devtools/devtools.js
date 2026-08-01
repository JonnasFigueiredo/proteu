// Registra o painel da Proteu QA no DevTools.
//
// Esta página não tem interface: ela só existe para criar o painel. Roda uma
// vez por aba com o DevTools aberto.

chrome.devtools.panels.create(
  "Proteu QA",
  "../../icons/32.png",
  "painel.html"
);
