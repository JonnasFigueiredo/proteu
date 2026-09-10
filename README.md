# Proteu QA

Extensão de navegador (Chrome/Chromium, Manifest V3) para QA gerar massa de dados
de teste, mapear os elementos da tela em seletores e exportar o fluxo como script
rodável, tudo dentro do navegador. Como o deus que muda de forma, gera dados
equivalentes a 12 países, e cada geração usa uma seed determinística e visível: a
mesma seed reproduz a mesma massa, então um bug encontrado com dados gerados deixa
de ser "não reproduzível".

**[Instalar na Chrome Web Store](https://chromewebstore.google.com/detail/proteu-qa/edpjppimngkekieldgokejdccfpiehgn)**

100% local · sem requisições de rede · sem coleta de dados · Vanilla JS · 974 testes

<!-- gif do produto entra aqui -->

## Diferenciais

- **Referência determinística e copiável.** O rodapé mostra `7f2a91#8`: a seed e a
  posição da pessoa na tela. Cole no relatório de bug e quem abrir vê exatamente a
  mesma pessoa. A seed sozinha não bastaria, porque ela abre uma sequência.
- **Seletor com contagem real de matches.** Para cada elemento, o painel lista as
  estratégias de seletor e mostra com quantos elementos cada uma casa, conferido na
  página de verdade. Seletor que parece bonito mas pega 4 elementos é um teste que
  falha amanhã, e aqui isso fica visível antes. Classe de build (`css-1a2b3c`) e id
  com hash são rebaixados, porque não sobrevivem ao próximo deploy.
- **Mapear a tela clicando.** Liga o modo, clica nos elementos, e cada um vira uma
  declaração de variável em 9 linguagens (Selenium, Playwright, Cypress, Robot
  Framework), com o nome saindo do papel do elemento e da pista mais estável
  disponível.
- **Inserção robusta em frameworks.** Preenche campos controlados por React, Vue e
  Angular, Shadow DOM aberto e iframes de mesma origem, onde as concorrentes
  costumam falhar.

## Recursos

- **Perfil completo por país.** Uma pessoa fictícia coerente, com documentos de
  dígito verificador oficial (CPF, CNPJ, RG, CNH...), CEP que existe de verdade, e um
  botão que preenche o formulário inteiro. Senha, readonly, disabled e upload nunca
  são tocados.
- **12 países**, do Brasil ao Japão, Coreia e Austrália, cada documento conferido
  contra o algoritmo do órgão emissor.
- **Exportar em lote.** Até 1000 personas em CSV, JSON ou fixture de
  Playwright/Cypress, com a seed dentro do arquivo.
- **Texto e i18n.** Geração por tamanho exato em 4 unidades de contagem (grafema,
  code point, UTF-16, UTF-8), pseudolocale e 9 idiomas, cada um cobrindo um problema
  real de internacionalização.
- **Casos-limite.** Arsenal de entradas que quebram sistemas, cada uma com o porquê:
  fronteiras Unicode, payloads de XSS e SQLi (uso defensivo), datas de borda,
  caracteres de controle invisíveis.
- **DevTools.** Painel próprio com o inspetor de seletores, o gravador de fluxo (que
  exporta Selenium e Playwright) e o modo Mapear.

## Como usar

Instale pela [Chrome Web Store](https://chromewebstore.google.com/detail/proteu-qa/edpjppimngkekieldgokejdccfpiehgn),
fixe o ícone e clique para abrir. São 5 permissões, e nenhuma delas dá acesso a
páginas: o acesso que o mapeamento de seletores precisa é opcional e só é pedido
quando você liga o recurso.

O fluxo segue o ciclo de quem automatiza: gerar a massa, preencher o formulário com
ela, mapear os elementos da tela em variáveis e gravar o fluxo como script. A
interface abre no popup ou no painel lateral, que não fecha quando você clica na
página.

Para carregar do código-fonte, rodar os testes ou entender a arquitetura, veja
[CONTRIBUTING.md](CONTRIBUTING.md).

## Reprodutibilidade

Cada geração usa um PRNG determinístico derivado de `seed:contador`. O contador
avança a cada valor gerado, então "o N-ésimo valor da seed X" é sempre o mesmo, e a
interface mostra esse par como `seed#posição`. A persona inteira é uma única
geração, então a referência reproduz a pessoa completa, com todos os documentos
coerentes entre si. Nada usa `Math.random()`, e um teste falha se alguma parte
passar a usar.

## Privacidade e permissões

Nenhum acesso de rede, nunca. As cinco permissões da instalação (`contextMenus`,
`storage`, `activeTab`, `scripting`, `sidePanel`) não incluem acesso a páginas. O
acesso aos sites é uma permissão opcional, pedida só quando você usa o copiar-seletor
ou o modo Mapear, e revogável a qualquer momento. O código nunca é ofuscado: cada
gerador e cada dígito verificador podem ser auditados, que é o que sustenta a
promessa de zero rede e zero coleta.

## Aviso: payloads defensivos

A aba Casos-limite inclui strings de ataque (XSS, SQL injection) para teste
exploratório defensivo dos seus próprios sistemas, em ambientes sob sua
responsabilidade. A ferramenta não realiza ataque nenhum: só coloca strings em
campos que você mesmo escolhe. Não as use contra sistemas de terceiros sem
autorização.

## Licença

AGPL-3.0-or-later. Você pode usar, estudar, modificar e redistribuir; versões
modificadas distribuídas ou disponibilizadas por rede saem sob a mesma licença, com
o código acessível. Versões até a 1.2.0 permanecem sob Apache 2.0.
