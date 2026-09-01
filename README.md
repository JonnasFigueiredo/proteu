# Proteu QA

Extensão de navegador (Chrome/Chromium, **Manifest V3**) para profissionais de
QA gerarem **massa de dados de teste** direto no navegador. Como Proteu, o deus
que muda de forma, gera dados equivalentes a vários países e formatos, com um
diferencial: **toda geração usa uma seed determinística e visível**. A mesma
seed reproduz exatamente a mesma massa, então um bug encontrado com dados
gerados deixa de ser "não reproduzível".

**[Instalar na Chrome Web Store](https://chromewebstore.google.com/detail/proteu-qa/edpjppimngkekieldgokejdccfpiehgn)**

**100% local** · sem requisições de rede · sem coleta de dados · sem dependências
em runtime · 5 permissões na instalação · Vanilla JS (sem build) · 974 testes.

Ela cobre o ciclo inteiro de quem automatiza: **gerar** a massa, **preencher** o
formulário com ela, **mapear** os elementos da tela em variáveis e **gravar** o
fluxo como script rodável.

## Índice

| | |
|---|---|
| [Diferenciais](#diferenciais) | o que ela faz que as outras não fazem |
| [Recursos](#recursos) | tabela do que cada área gera |
| [Como usar](#como-usar) | instalar, popup, painel lateral, menu de contexto, Mapear |
| [Reprodutibilidade](#reprodutibilidade-como-funciona) | o mecanismo da seed |
| [Integridade dos dados](#integridade-dos-dados-gerados) | CEP real, datas coerentes, DV oficial |
| [Arquitetura](#arquitetura) | árvore de arquivos e decisões de projeto |
| [Permissões](#permissões) | as cinco da instalação e a opcional |
| [Painel do DevTools](#painel-do-devtools) | Inspecionar, Gravador e Mapear |
| [Inserção robusta](#inserção-robusta-como-funciona) | React, Vue, Shadow DOM, iframes |
| [Testes](#testes) | como rodar |
| [Licença](#licença) | AGPL-3.0 |

**Multi-país:** um seletor de país (bandeira no cabeçalho) define de qual país
os dados gerados são equivalentes, e a interface acompanha o idioma. São **12
países**: Brasil, Estados Unidos, Canadá, Argentina, México, China, Arábia
Saudita, Índia, Alemanha, Austrália, Japão e Coreia do Sul.

> Japão e Coreia mostram a interface em inglês: o projeto ainda não tem tradução
> de UI para japonês e coreano. Os **nomes dos documentos** ficam nativos
> (マイナンバー, 주민등록번호), como CPF e CNPJ no Brasil.

---

## Diferenciais

1. **Referência determinística, copiável.** O rodapé do popup mostra `7f2a91#8`:
   a seed **e a posição** da pessoa que está na tela. Cole esse texto no
   relatório de bug e quem abrir vê exatamente a mesma pessoa. A seed sozinha
   não bastaria, porque ela abre uma *sequência*: mandar só ela entregaria o
   começo da fila, não quem você estava olhando.
2. **Detecção de campo.** Ao acionar a extensão sobre um campo, ela lê os
   atributos (`type`, `maxlength`, `min`, `max`, `pattern`, `required`,
   `inputmode`) e oferece valores de fronteira específicos daquele campo.
3. **Inserção robusta.** Funciona em campos controlados por frameworks
   (React, Vue, Angular), **Shadow DOM aberto** e **iframes de mesma origem**,
   onde as concorrentes costumam falhar.
4. **Seletor conferido, não chutado.** O painel do DevTools lista várias
   estratégias para o elemento e mostra **com quantos elementos cada uma casa**,
   conferido na página de verdade. Seletor que parece bonito mas pega 4
   elementos é um teste que falha amanhã, e aqui isso fica visível antes.
5. **Gravador que gera script rodável.** O roteiro sai em Selenium (Java e
   Python), Playwright (JavaScript e Python) e JavaScript de console, já com o
   salto de **Shadow DOM** e a troca de **iframe** que gravadores comuns omitem,
   origem de scripts que lançam `NoSuchElementException` em elementos visíveis
   na tela.
6. **Mapear a tela clicando.** Antes de escrever o teste vem a pergunta "quais
   elementos vou automatizar, e como vou chamá-los?". Liga o modo, clica nos
   elementos e o bloco de notas ao lado vai montando as **declarações de
   variável** em 9 linguagens. O nome sai do papel do elemento e da pista mais
   estável disponível, e **id gerado por build** (`css-1x2y3z`, `a3f9c21e`) é
   descartado, porque não sobrevive ao próximo deploy.

## Recursos

| Área | O que gera |
|------|------------|
| **Perfil + preencher formulário** | Uma **pessoa fictícia coerente** com **todos os documentos do país** (o e-mail sai do nome; os documentos têm DV válido) e um botão que **preenche o formulário inteiro** com ela. A persona toda é uma única geração, então a seed reproduz a pessoa completa. **Senha, readonly, disabled e upload nunca são tocados.** |
| **Exportar em lote** | Até 1000 personas em **CSV**, **JSON** ou **fixture de Playwright/Cypress**, com a **seed dentro do arquivo**, para quem receber regerar exatamente os mesmos dados. O CSV sai com BOM e separador escolhível, para abrir certo no Excel sem quebrar quem consome por script. |
| **Pessoa** | Nome · data de nascimento (sempre maior de idade) · data de admissão (**nunca antes dos 16 anos** da pessoa) · CPF · RG (SSP-SP) · CNH · **CEP que existe de verdade** · telefone fixo e celular com DDD real. |
| **Empresa** | **CNPJ numérico e alfanumérico na mesma função** (novo padrão jul/2026, incluindo o caso oficial SERPRO `12.ABC.345/01DE-35`) · **CNPJ com a mesma raiz** (matriz 0001 mais filiais 0002, 0003… compartilhando os 8 primeiros dígitos) · razão social · Inscrição Estadual (SP). Com e sem máscara. |
| **Austrália · Japão · Coreia** | TFN, ABN, ACN e Medicare · マイナンバー e 法人番号 · 주민등록번호, 사업자등록번호 e 법인등록번호, todos com o **dígito verificador oficial**. Os algoritmos australianos são conferidos contra números públicos reais (o ABN do próprio ATO e o ABN e ACN da Telstra), então um erro de implementação reprova no teste. |
| **Senha** | Aba dedicada com tamanho ajustável, escolha das classes de caractere e medidor de força em **bits de entropia**. Garante ao menos um caractere de cada classe marcada, porque senha sem dígito reprova em política que exige número e isso só apareceria no cadastro. **É a única geração que não passa pela seed**: derivá-la de uma seed visível na tela tornaria previsível algo que o medidor chama de forte. |
| **Detecção para fronteira** | Chips clicáveis a partir do campo focado: `maxlength` ±1, `number` min/max mais `1e999` e `NaN`, datas de fronteira, e-mails que passam na regex mas quebram no servidor, strings Unicode. |
| **Texto** | 9 idiomas (pt, es, ar, tr, ru, zh, hi, ja, he, cada um cobrindo um problema real de i18n) · geração **por tamanho exata** nas 4 unidades de contagem · **pseudolocale** (`Save` vira `Šávé`) com expansão, marcadores `⟦…⟧`, preservação de placeholders e modo `fakebidi`. |
| **4 unidades de contagem** | grafemas · code points · code units UTF-16 · bytes UTF-8, lado a lado, porque "100 caracteres" é ambíguo. Quem não quer entrar nesse mérito escolhe a unidade **caracteres (ASCII)**: o texto sai em ASCII puro e as quatro contagens dão o mesmo número. |
| **Casos-limite** | Arsenal de entradas que quebram sistemas, cada uma com o **porquê**: fronteiras Unicode (contagens inline), payloads XSS, SQLi e de formato (**uso defensivo**), números e datas de borda, espaços e caracteres de controle invisíveis, formatos inválidos e overflow. Busca e "copiar todos"; clicar no caso copia, e o botão ao lado insere no campo focado. |
| **Inspecionar** (DevTools) | Para o elemento selecionado, várias estratégias de seletor (`data-testid`, id, name, aria-label, texto, caminho CSS, XPath relativo e absoluto), **cada uma com a contagem real de matches**. Classe gerada por ferramenta (`css-1a2b3c`, `sc-bdVaJa`, `_ngcontent-*`) e id com hash são **rebaixados**, porque quebram no próximo build. Mostra a cadeia de **Shadow DOM** e de **iframe**, e tem um campo para testar seletor à mão com destaque na página. |
| **Mapear** (página, DevTools e painel lateral) | Modo de captura por clique: cada elemento vira uma **declaração de variável** num rascunho **editável**, ao lado da tela. **9 linguagens** (Selenium Java/Python/C#, Playwright JS/TS/Python, Cypress, Robot Framework, texto puro) e **5 convenções** de nome (camelCase, PascalCase, snake_case, UPPER_SNAKE, kebab), com o padrão de cada linguagem já escolhido. Localizador ambíguo sai **marcado na linha** com a contagem real. O quadro é **redimensionável nos oito lados**, lembra o tamanho e pode ser **encaixado no painel lateral**, arrastando-o para a borda direita. |
| **Gravador** (DevTools) | Grava a navegação e exporta **Selenium (Java/Python)**, **Playwright (JS/Python)** e **JavaScript de console**, este último com laço para gerar massa em volume sem sair da aba. A digitação vira um `fill` com o valor final, o clique que só focou o campo some, e cada passo deixa **trocar o seletor** por outro candidato. Modo verificação: clicar em algo cria uma asserção em vez de acionar a página. |

Mais: **interface em pt, es, en, zh, ar, hi e de** (segue o país por padrão, mas
o QA pode **fixar um idioma** na aba Config, o que permite gerar dados da China
e ler os rótulos dos campos em português sem precisar de mandarim),
**histórico** da sessão, cópia com um clique, **tema** claro, escuro e
automático, menu de contexto para copiar seletores e atalhos de teclado.

> Os **nomes dos documentos brasileiros** (CPF, CNPJ, RG…) não são traduzidos,
> porque são os nomes próprios dos documentos: um QA de fora testando um sistema
> brasileiro precisa deles com esse nome. A moldura da interface (abas, rótulos,
> botões, categorias, mensagens) é totalmente localizada.

## Como usar

### Instalar

[**Chrome Web Store, Proteu QA**](https://chromewebstore.google.com/detail/proteu-qa/edpjppimngkekieldgokejdccfpiehgn)

Instale, fixe o ícone na barra e clique para abrir o popup. São 5 permissões, e
nenhuma delas dá acesso a páginas. O acesso de que o menu de seletores e o modo
Mapear precisam é **opcional** e só é pedido quando você liga esses recursos.
Veja [Permissões](#permissões).

### Carregar do código-fonte

Para desenvolver, ou para rodar uma versão modificada:

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor**, no canto superior direito.
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta raiz do projeto, a que contém o `manifest.json`.
5. Fixe o ícone do Proteu QA na barra e clique para abrir o popup.

### O popup

- **Abas.** *Perfil*, *Texto*, *Senha* e *Casos-limite*. Os ícones do cabeçalho
  abrem o painel lateral, o *Histórico* e as *Configurações*. Só um bloco
  aparece por vez.
- **Perfil.** Uma pessoa fictícia com todos os documentos do país, em seções
  Pessoa e Empresa. Os essenciais ficam à vista e o resto atrás de "mais N".
  Clicar na linha copia o valor; o botão ao lado tenta inseri-lo no campo focado
  da página. Exportar em lote e Opções ficam recolhidos no rodapé da aba.
- **Referência** no rodapé, editável, no formato `seed#posição`, por exemplo
  `7f2a91#8`. Ela acompanha a pessoa que está na tela: clicar em *Nova pessoa*
  avança para `#9`. Colar uma referência traz aquela pessoa de volta, e colar só
  a seed (`7f2a91`) traz a primeira. O botão ao lado sorteia uma seed nova.
- **Mapear elementos.** Liga o modo de captura na página, descrito adiante.

### Painel lateral

O botão de painel, no cabeçalho, leva a mesma interface para a lateral do
navegador. O mesmo botão faz o caminho de volta ao popup.

A diferença que importa é que **o painel não fecha quando você clica na página**.
Para quem está preenchendo formulário, isso evita reabrir a extensão a cada
campo. Em compensação, ele não herda o `activeTab`, que é concedido por gesto e
expira quando a aba navega, então os recursos que agem sobre a página dependem
do acesso opcional aos sites. O próprio painel pede esse acesso quando falta.

### Menu de contexto para copiar seletores

Clique com o **botão direito** em qualquer elemento da página e escolha
*Proteu QA*:

| Item | O que copia |
|------|-------------|
| Copiar melhor seletor | o mais estável entre os que casam com **um só** elemento |
| Copiar id | `#email` |
| Copiar seletor CSS | o melhor CSS disponível |
| Copiar XPath relativo | `//*[@name='email']` |
| Copiar XPath absoluto | `/html/body/form/input[2]` |
| Copiar XPath por texto | `//button[normalize-space()='Salvar']` |

Um balão confirma o que foi copiado. Se o seletor escolhido casar com mais de um
elemento, o balão avisa: copiar um seletor ambíguo em silêncio é entregar um
teste que passa hoje e quebra quando a tela ganhar mais um item igual.

Este item **precisa ser ativado**, porque depende de acesso às páginas. Um aviso
no topo do popup mostra o botão de ativar enquanto a permissão não foi
concedida. Veja [Permissões](#permissões).

### Modo Mapear

Clique em **Mapear elementos** no popup, ou abra o DevTools, aba *Proteu QA*,
*Mapear*. O cursor vira mira e um bloco de notas aparece sobre a página. A
partir daí, cada clique num elemento vira uma linha:

```js
const campoEmailLogin = page.locator('[data-testid="email-login"]');
const comboUf = page.locator('#uf');
const caixaLembrar = page.locator('[name="lembrar"]');
const botaoSalvarAlteracoes = page.locator('xpath=//button[normalize-space()=\'Salvar alterações\']');
const elementoItem = page.locator('… > div.item:nth-of-type(1)');   // atenção: casa com 4 elementos
```

- **O texto é seu.** O campo é editável, não um resultado só de leitura, porque
  é dele que sai o que vai para a IDE: dá para renomear, comentar e apagar antes
  de levar. Capturas novas são **anexadas**, e trocar a linguagem não reescreve
  o que você editou. Só o botão **Regerar** faz isso, e por isso ele é explícito.
- **De onde vem o nome.** Papel do elemento (`campo`, `botao`, `combo`, `caixa`,
  `link`…) mais a pista mais estável que existir, nesta ordem: `data-testid`,
  `name`, `id`, `aria-label`, `placeholder`, texto visível, classe. A ordem não é
  estética, é de resistência a mudança de layout.
- **Acento vira a letra base.** "Salvar alterações" produz
  `botaoSalvarAlteracoes`, e não `botaoSalvarAlteraEs`.
- **Clique não aciona a página.** Mapear um botão de excluir não exclui nada, e
  mapear um link não tira você da tela que está mapeando.
- **`Esc` sai do modo.** O quadro é arrastável e redimensionável pelos oito
  lados, porque pode estar cobrindo justamente o que você quer clicar.
- **Encaixar na lateral.** Arraste o quadro até a borda direita da janela, ou
  use o botão de encaixe no cabeçalho dele, e o rascunho passa para o painel
  lateral. Em tela cheia de formulário isso tira o bloco de notas de cima do
  conteúdo. "Soltar na página" devolve o quadro flutuante.

O quadro vive num **shadow root fechado**: não herda o CSS do site, não é
alcançável pelos seletores dele e não aparece no que você está mapeando. As três
telas (página, DevTools e painel lateral) mostram **a mesma lista**, então dá
para capturar na página e editar onde preferir.

Assim como o menu de contexto, o modo Mapear **precisa do acesso às páginas**,
pelo mesmo motivo: alguém tem que estar ouvindo o clique antes de ele acontecer.

### Atalhos

Ajustáveis em `chrome://extensions/shortcuts`:

- `Ctrl+Shift+9` abre o Proteu QA.
- `Ctrl+Shift+8` insere a última geração no campo focado.

### Prévia sem instalar

Dá para ver o popup real, com o `chrome.*` simulado, sem carregar a extensão:

```bash
node tests/e2e/servir.mjs
```

Depois abra `http://localhost:8791/previa/popup`. Acrescente `?lateral=1` para
ver o mesmo popup no formato do painel lateral.

## Reprodutibilidade, como funciona

Cada geração usa um PRNG determinístico (`xmur3` alimentando `sfc32`) derivado
de `` `${seed}:${contador}` ``. O **contador** é persistido e avança a cada valor
gerado. Assim "o N-ésimo valor gerado com a seed X" é sempre o mesmo, e o
histórico só precisa guardar `(seed, contador, tipo)` para reproduzir qualquer
item.

O par `(seed, contador)` é o que a interface mostra como **`seed#posição`**. A
persona inteira é uma única geração, então a referência reproduz a pessoa
completa, com todos os documentos coerentes entre si.

Nenhuma parte da geração usa `Math.random()`, e há um teste que **falha** se
alguma passar a usar, porque uma única chamada quebraria a promessa inteira sem
que nenhuma comparação de igualdade percebesse.

## Integridade dos dados gerados

Massa de teste que satisfaz o formato mas é recusada pela validação do sistema
testado não economiza tempo: gasta. Três garantias, cada uma coberta por teste.

- **CEP existente.** O CEP sai de uma tabela de **540 CEPs reais**, 20 por UF,
  coletados e **conferidos um a um**. A coleta é ferramenta de desenvolvimento
  (`tools/coletar-ceps.mjs`) e roda fora da extensão: o que entra em `src/` é
  array literal. Quem precisa de CEP inexistente de propósito, para exercitar o
  caminho de erro, pede `sintetico: true`.

- **Datas coerentes entre si.** Nascimento e admissão saem da mesma derivação,
  com piso de 16 anos na admissão, conferindo mês e dia, não só o ano.

- **Dígito verificador oficial.** Cada documento usa o algoritmo publicado pelo
  órgão emissor. Onde existe número público real, como o ABN do próprio ATO e o
  ABN e ACN da Telstra, ele integra a suíte, de modo que um erro de
  implementação é reprovado. Limitações do algoritmo oficial ficam documentadas
  no teste: o 法人番号 japonês usa módulo 9 e não distingue 0 de 9, e a
  expectativa está fixada para que ninguém a "corrija" e passe a gerar números
  que a autoridade fiscal japonesa recusaria.

## Arquitetura

```
reproduzivel/
├── manifest.json                     # MV3, service_worker, 5 permissões
├── icons/                            # 16 / 32 / 48 / 128 px
├── empacotar.mjs                     # gera o zip da loja (Node puro, zero deps)
├── src/
│   ├── core/                         # lógica PURA: sem DOM, sem chrome.* → 100% testável
│   │   ├── seed.js                   # PRNG determinístico (xmur3 → sfc32)
│   │   ├── config.js                 # defaults + normalização/validação (tema, idioma)
│   │   ├── i18n.js                   # traduções da UI (pt/es/en/zh/ar/hi/de)
│   │   ├── tema.js                   # resolução de tema claro/escuro/automático
│   │   ├── gerador.js                # orquestrador multi-país (PAISES, gerar())
│   │   ├── persona.js                # pessoa coerente (e-mail derivado do nome)
│   │   ├── senha.js                  # senhas por crypto + força em bits
│   │   ├── mapeamento.js             # campo do form → slot da persona
│   │   ├── exportar.js               # N personas → CSV / JSON / fixture
│   │   ├── seletores.js              # elemento → candidatos de seletor + ranking
│   │   ├── mapeador.js               # elemento → nome de variável + declaração (9 linguagens)
│   │   ├── field.js                  # descritor do campo → set de fronteira
│   │   ├── gravador/                 # acoes.js (normalização), selenium.js,
│   │   │                             #   playwright.js, console.js, codigo.js (despacho)
│   │   ├── paises/                   # um arquivo por país (br us ca ar mx cn sa in de au jp kr)
│   │   ├── documents/                # nome, datas, cpf, cnpj (+raiz), rg, cnh, ie,
│   │   │                             #   cep, telefone, razao-social e os de cada país
│   │   ├── text/                     # contagem, idiomas, tamanho, pseudolocale
│   │   └── invalid/                  # casos-limite, unicode, payloads, valores-limite
│   ├── storage.js                    # adaptador chrome.storage (ponte p/ core/config)
│   ├── content/
│   │   ├── content.js                # detecção do campo + inserção robusta (sob demanda)
│   │   ├── leitura-dom.js            # leitura de DOM compartilhada (página e DevTools)
│   │   ├── seletor.js                # menu de contexto "copiar seletor"
│   │   └── mapeador.js               # modo Mapear: captura por clique + quadro flutuante
│   ├── background/service-worker.js  # menu de seletores, atalhos, roteamento da inserção
│   ├── devtools/                     # painel: abas Inspecionar, Gravador e Mapear
│   │   ├── devtools.html/.js         # registra o painel (não tem interface)
│   │   ├── painel.html/.css/.js      # a interface das três abas
│   │   └── agente.js                 # roda NA página via inspectedWindow.eval
│   └── popup/                        # popup.html/.css/.js: serve de popup E de painel lateral
├── tools/                            # ferramentas de desenvolvimento, FORA do pacote
│   ├── coletar-ceps.mjs              #   busca CEPs reais para embutir em documents/cep.js
│   └── capturar-loja.mjs             #   gera as capturas 1280x800 da listagem
└── tests/                            # Vitest (unitário) + e2e no navegador
    ├── *.test.js                     # espelha src/core + storage + service-worker
    ├── documents/  text/             # testes por documento e por módulo de texto
    └── e2e/                          # cenarios.md, demo.html, runner.html, popup-runner.html,
                                      #   painel-runner.html, mapeador-runner.html,
                                      #   screenshots.html, prova-console.html, servir.mjs
```

### Decisões de arquitetura

- **Lógica separada da UI e do DOM.** Tudo em `core/` é JavaScript puro, sem
  `document` nem `chrome.*`, e por isso roda em Node e Vitest sem navegador. O
  popup e a camada de página só orquestram.

- **Sem `content_scripts` no manifest.** Declará-los com `matches` exigiria host
  permission ampla, que este projeto não pede. O content script é **injetado sob
  demanda** via `chrome.scripting.executeScript`, aproveitando o grant de
  `activeTab` que surge quando o usuário abre o popup, usa o menu de contexto ou
  o atalho. A consequência é que a detecção vale a partir do momento em que você
  aciona a extensão na aba.

- **O content script não gera dados.** Scripts injetados via `executeScript` não
  são módulos ES. Para não duplicar `core/`, a geração roda no popup e no
  service worker, que importam `core/` como módulos, e só o **valor pronto** é
  enviado ao content script, que detecta o campo e insere.

- **Uma página para popup e painel lateral.** O painel serve a mesma
  `popup.html` com `?lateral=1`, e a marca na query é o único sinal que
  distingue os dois contextos. Duas telas separadas divergiriam na primeira
  mudança que alguém esquecesse de replicar.

- **A UI acompanha o core sozinha.** Adicionar um documento é **uma entrada** no
  registro `TIPOS` de `core/gerador.js`. O popup, com botões agrupados por
  categoria, e o menu de contexto se montam a partir dele.

- **Sem etapa de build.** Popup e service worker usam ES modules nativos, e o
  content script é um arquivo plano. Carrega direto em *Load unpacked*. O
  `package.json` existe só para o Vitest, que é devDependency.

### Permissões

Na instalação, só estas cinco:

| Permissão | Por quê |
|-----------|---------|
| `contextMenus` | menu de botão direito |
| `storage` | persistir configurações e histórico |
| `activeTab` | acesso pontual à aba ativa quando o usuário aciona a extensão |
| `scripting` | injetar o content script sob demanda |
| `sidePanel` | abrir a interface no painel lateral do navegador |

Nenhum acesso de rede, nunca.

#### A permissão opcional

`http://*/*` e `https://*/*` estão declarados como
**`optional_host_permissions`**. Não são pedidos na instalação, não aparecem na
listagem da loja, e a extensão funciona sem eles. Deliberadamente não usamos
`<all_urls>`: ele engloba `file://` e outros esquemas que o Chrome concede à
parte, e a checagem daria falso negativo com a permissão visivelmente ligada.

Dois recursos dependem desse acesso: *copiar seletor pelo botão direito* e o
*modo Mapear*. Enquanto ele não é concedido, um aviso no topo do popup mostra o
botão de ativar, com a explicação ao lado.

O motivo é uma limitação real do Chrome. O evento
`chrome.contextMenus.onClicked` não informa em qual elemento o menu foi aberto.
Quem sabe disso é um listener de `contextmenu` na página, que precisa **já estar
ouvindo** quando o clique acontece. E o `activeTab` só concede acesso depois que
o usuário aciona a extensão, quando o clique já passou. Não existe caminho sem
essa permissão. O que dá para escolher é se ela é cobrada de todo mundo ou só de
quem usa o recurso, e aqui é a segunda.

Revogar em `chrome://extensions` desliga o menu e desregistra o content script
na mesma hora.

O painel do DevTools **não custou permissão nenhuma**: `devtools_page` é uma
entrada de manifesto, não uma permissão, e `chrome.devtools.inspectedWindow.eval`
já é escopado à aba que está sendo inspecionada. Foi por isso que o painel virou
a casa do inspetor e do gravador, em vez de um overlay injetado na página, que
exigiria acesso amplo a todos os sites.

## Painel do DevTools

Abra o DevTools (F12) e vá na aba **Proteu QA**.

### Inspecionar

Selecione um elemento no painel **Elements**, ou use *Selecionar na página*, e o
painel lista as estratégias de seletor daquele elemento, cada uma com **quantos
elementos ela casa de verdade**, conferido na página e não estimado.

A ordem não é fixa: casar com **exatamente 1 elemento** vale mais que qualquer
heurística. Um caminho CSS feio que é único vence um `id` bonito que aparece
três vezes, porque é ele que a QA deve usar. Além disso:

- classe que parece gerada por ferramenta (`css-1a2b3c`, `sc-bdVaJa`,
  `_ngcontent-*`, `svelte-1x2y3z`) e id com hash (`react-aria-8837261`) são
  **rebaixados**, porque quebram no próximo build, mas continuam ofertados, já
  que às vezes são a única coisa que existe;
- o caminho CSS é **cortado no primeiro ancestral com id único**, o que evita
  seletor de doze níveis arrastando `body`;
- **Shadow DOM** e **iframe** aparecem como cadeia própria, porque mudam o
  código que o driver precisa executar.

### Gravador

Grava a navegação e gera o script em **Selenium (Java e Python)**, **Playwright
(JavaScript e Python)** e **JavaScript de console**. O que sai é um roteiro
limpo, não um despejo de eventos:

- a digitação vira **um** `fill` com o valor final, já que o navegador dispara
  um `input` por tecla;
- o clique que só serviu para focar o campo antes de digitar é descartado;
- o clique que abriu o `<select>` some, porque nenhum driver precisa abrir a
  lista para selecionar;
- cada passo deixa **trocar o seletor** por outro candidato, porque quem conhece
  a tela sabe qual atributo o time considera estável.

O formato de **console** existe para automação imediata: cola no console do
navegador e roda, sem instalar driver. Ele traz um laço opcional que repete o
fluxo com uma persona diferente a cada volta, o que resolve o caso de gerar
massa em volume numa tela que só aceita cadastro manual.

O **modo verificação** inverte o clique: em vez de acionar a página, ele cria
uma asserção sobre o texto ou o valor do elemento.

O agente que roda na página é injetado junto com `core/seletores.js`. Os
`export` são removidos e os dois viram uma IIFE só, de modo que o motor de
seletores tem **uma implementação**, compartilhada entre o painel e a página, em
vez de uma cópia de cada lado que sai de sincronia na primeira mudança.

### Mapear

A mesma lista do modo Mapear da página, com os mesmos controles de linguagem e
convenção de nome. Serve para capturar na página e editar aqui, com mais espaço
e sem o quadro sobre o conteúdo. O estado é compartilhado por
`chrome.storage.local`, que é o único ponto de encontro possível entre um
content script e uma página de extensão.

## Inserção robusta, como funciona

O content script rastreia o último campo editável focado ou clicado, via
`focusin` capturante e `composedPath()`, o que cobre **Shadow DOM aberto**, e
oferece dois modos:

- **Injetar valor.** Usa o *setter nativo* de `value` do prototype
  (`HTMLInputElement` e `HTMLTextAreaElement`) e dispara `InputEvent` mais
  `change` com `bubbles: true`, para que React, Vue e Angular registrem a
  mudança. O setter do prototype contorna o *value tracker* que os frameworks
  instalam na instância, e é isso que faz a mudança colar.
- **Simular colagem.** Insere na posição do cursor ou da seleção, preservando o
  restante do texto.

A injeção usa `allFrames: true`, então **iframes de mesma origem** também são
cobertos: o frame com o campo focado é quem insere. Um `MutationObserver`
descarta o alvo caso ele saia do DOM, o que acontece em formulários
multi-etapa.

## Testes

```bash
npm install        # instala o Vitest (única devDependency)
npm test           # roda toda a suíte unitária uma vez
npm run test:watch
```

- **Unitário (Vitest, Node).** Cobre PRNG, os geradores de Pessoa e Empresa
  (incluindo o caso oficial `12.ABC.345/01DE-35`), a detecção de fronteira, os
  módulos de texto, a massa inválida, a persistência de config e o **service
  worker** (menu de contexto, cadeia gerar, contador, histórico e inserir, mais
  o atalho). **A extensão não carrega nada disso**, porque o Vitest é só de
  desenvolvimento.

- **End-to-end (navegador).** Validam a camada de DOM que os unitários não
  alcançam: inserção nos dois modos, eventos nativos, Shadow DOM inclusive
  aninhado, iframes de mesma origem, detecção de fronteira e o mecanismo de
  React e Vue. Ver [`tests/e2e/cenarios.md`](tests/e2e/cenarios.md).

  ```bash
  node tests/e2e/servir.mjs
  # content script:     http://localhost:8791/tests/e2e/runner.html
  # popup completo:     http://localhost:8791/tests/e2e/popup-runner.html
  # popup de verdade:   http://localhost:8791/previa/popup
  # painel lateral:     http://localhost:8791/previa/popup?lateral=1
  # painel DevTools:    http://localhost:8791/tests/e2e/painel-runner.html
  # modo Mapear:        http://localhost:8791/tests/e2e/mapeador-runner.html
  # página de demo:     http://localhost:8791/tests/e2e/demo.html
  ```

  Os *runners* carregam os arquivos **reais** da extensão com o `chrome.*`
  dublado, e não uma cópia que envelhece à parte.

## Aviso sobre os payloads (uso defensivo)

A aba **Casos-limite** inclui strings de ataque (XSS básico, SQL injection,
overflow de tamanho) voltadas a **teste exploratório defensivo**. Elas existem
para você exercitar a validação e o escaping **de sistemas próprios, em
ambientes de teste sob sua responsabilidade**. **Não** as use contra sistemas de
terceiros sem autorização, porque isso pode ser ilegal. A ferramenta não realiza
nenhum ataque: apenas coloca strings em campos que você mesmo escolhe.

## Licença

**AGPL-3.0-or-later.** Veja [LICENSE](LICENSE) e [NOTICE](NOTICE).

Você pode usar, estudar, modificar e redistribuir. A contrapartida é que
qualquer versão modificada que você distribua, **ou disponibilize por rede**,
precisa sair sob a mesma licença, com o código-fonte acessível. É essa cláusula
de rede, a seção 13, que separa a AGPL da GPL comum, e é ela que impede que o
projeto seja fechado por cima.

Versões até a 1.2.0 foram publicadas sob a Apache License 2.0 e permanecem
disponíveis sob aquela licença.

O código nunca é ofuscado: cada gerador e cada dígito verificador podem ser
auditados. Para uma ferramenta que promete zero rede e zero coleta, essa
auditabilidade é o que sustenta a promessa.
