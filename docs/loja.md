# Chrome Web Store — texto da listagem

Conteúdo para colar no painel de desenvolvedor. A loja renderiza **texto puro**:
não há markdown, então quebras de linha e maiúsculas são a única formatação.

Item publicado:
https://chromewebstore.google.com/detail/proteu-qa/edpjppimngkekieldgokejdccfpiehgn

---

## Nome

```
Proteu QA
```

## Descrição breve (máx. 132 caracteres)

```
Massa de teste, seletores e mapeamento de elementos para QA. Documentos válidos de 12 países. 100% offline.
```

*(106 caracteres)*

## Categoria

Ferramentas de desenvolvedor

## Idioma principal

Português (Brasil)

---

## Descrição completa

```
Proteu QA reúne, numa extensão só, as quatro tarefas que consomem o tempo de quem
testa software: gerar massa de dados, preencher formulários, mapear elementos da
tela e gravar o fluxo como script.

Tudo funciona sem conexão. A extensão não faz nenhuma requisição de rede, não usa
bibliotecas de terceiros e não coleta dado nenhum.


REPRODUTIBILIDADE

Toda geração parte de uma referência visível no rodapé, no formato seed#posição
(por exemplo, 7f2a91#8). Copie essa referência para o relatório de bug e quem for
reproduzir verá exatamente a mesma pessoa, com os mesmos documentos.

A seed sozinha não bastaria: ela abre uma sequência, e a posição diz qual pessoa
dentro dela. É a diferença entre "usei dados aleatórios" e um defeito que o time
consegue reproduzir na primeira tentativa.


DOCUMENTOS DE 12 PAÍSES

Brasil, Estados Unidos, Canadá, Argentina, México, China, Arábia Saudita, Índia,
Alemanha, Austrália, Japão e Coreia do Sul.

Cada documento usa o algoritmo de dígito verificador publicado pelo órgão que o
emite — CPF, CNPJ (numérico e alfanumérico, no padrão vigente desde julho de
2026), RG, CNH, Inscrição Estadual, SSN, EIN, CUIT, CURP, Aadhaar, PAN, IBAN,
TFN, ABN, ACN, マイナンバー, 法人番号, 주민등록번호 e outros.

A persona é coerente: o e-mail deriva do nome, o CEP corresponde à UF, a data de
admissão nunca precede os 16 anos da pessoa, e filiais compartilham a raiz do
CNPJ da matriz.

Os CEPs brasileiros existem de verdade. São 540 endereços reais, conferidos um a
um — um CEP inventado passa no formato e é recusado por quem valida contra a base
dos Correios, o que interrompe o teste por culpa da massa, não do sistema.


MAPEAR ELEMENTOS

Ative o modo, clique nos elementos da tela e um bloco de notas ao lado monta as
declarações de variável prontas para colar na IDE.

São 9 alvos: Selenium (Java, Python, C#), Playwright (JavaScript, TypeScript,
Python), Cypress, Robot Framework e texto puro. Cinco convenções de nome
(camelCase, PascalCase, snake_case, UPPER_SNAKE_CASE, kebab-case), com o padrão
de cada linguagem já selecionado.

O localizador respeita o alvo: Selenium recebe By.id e By.name quando cabe,
Cypress e Playwright nunca recebem XPath. O nome da variável vem do papel do
elemento e da pista mais estável disponível, e identificadores gerados por build
são descartados por não sobreviverem ao próximo deploy.

O painel é arrastável e redimensionável pelas oito pontas, e o texto é editável:
é um rascunho seu, não um resultado fechado.


SELETORES CONFERIDOS

Clique com o botão direito em qualquer elemento para copiar o melhor seletor CSS,
XPath relativo, XPath absoluto, por id ou por texto.

O painel do DevTools mostra cada estratégia com a contagem real de elementos que
ela encontra, verificada na página. Um seletor que casa com quatro elementos é um
teste que passa hoje e falha quando a tela ganhar mais um item igual — e aqui
isso fica visível antes de virar código.

Funciona dentro de Shadow DOM aberto e de iframes de mesma origem.


PREENCHER FORMULÁRIOS

Um clique preenche todos os campos reconhecidos com a persona atual. Funciona com
React, Vue, Angular e formulários nativos. Campos de senha, somente leitura,
desabilitados e de upload nunca são tocados.


TEXTO E CASOS-LIMITE

Geração de texto com tamanho exato em grafemas, code points, code units ou bytes
UTF-8 — porque "100 caracteres" é ambíguo e é justamente onde a validação
costuma divergir do servidor.

Biblioteca de entradas que quebram sistemas, cada uma com a explicação do porquê:
Unicode de fronteira, payloads de segurança para teste defensivo, números e datas
extremos, espaços e caracteres de controle invisíveis, formatos inválidos e
sobrecarga de tamanho.


GRAVADOR

Grava a navegação e exporta o roteiro em Selenium (Java, Python) e Playwright
(JavaScript, Python), incluindo a travessia de Shadow DOM e a troca de iframe que
gravadores comuns omitem.


INTERFACE EM 7 IDIOMAS

Português, espanhol, inglês, chinês, árabe (com layout da direita para a
esquerda), hindi e alemão. O idioma acompanha o país por padrão e pode ser fixado
— é possível gerar dados da China e ler os rótulos em português.


PRIVACIDADE

Nenhuma requisição de rede. Nenhuma coleta. Nenhuma dependência externa.

Quatro permissões na instalação, e nenhuma delas dá acesso ao conteúdo das
páginas. O acesso que o menu de seletores e o modo Mapear precisam é opcional e
só é solicitado quando você liga esses recursos.

Código aberto sob Apache 2.0, auditável em github.com/JonnasFigueiredo/proteu
```

---

## Justificativa das permissões

| Permissão | Texto para o formulário |
|---|---|
| `contextMenus` | Adiciona ao menu de contexto as opções de copiar o seletor do elemento clicado. |
| `storage` | Guarda localmente as preferências do usuário (país, tema, idioma) e o histórico da sessão. |
| `activeTab` | Insere o valor gerado no campo em foco quando o usuário aciona o atalho de teclado. |
| `scripting` | Registra o content script que identifica em qual elemento o usuário clicou. |
| Host (opcional) | Necessário para o menu de seletores e o modo Mapear: o navegador não informa em qual elemento o menu foi aberto, então é preciso estar observando o clique antes de ele acontecer. Solicitado apenas ao ativar esses recursos. |

**Uso de código remoto:** Não.
**Coleta de dados:** Nenhuma.
**Finalidade única:** Gerar massa de dados de teste, copiar seletores e mapear
elementos de página para automação de testes.
