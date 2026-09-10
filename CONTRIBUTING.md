# Contribuir com o Proteu QA

O Proteu QA é uma extensão Chrome MV3 em Vanilla JS, **sem etapa de build**:
popup e service worker usam ES modules nativos, e o content script é um arquivo
plano. O `package.json` existe só para o Vitest, a única devDependency.

Este documento reúne como carregar do código-fonte, rodar os testes e as
decisões de arquitetura do projeto.

## Carregar do código-fonte

Para desenvolver, ou para rodar uma versão modificada:

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor**, no canto superior direito.
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta raiz do projeto, a que contém o `manifest.json`.
5. Fixe o ícone do Proteu QA na barra e clique para abrir o popup.

## Prévia sem instalar

Dá para ver o popup real, com o `chrome.*` simulado, sem carregar a extensão:

```bash
node tests/e2e/servir.mjs
```

Depois abra `http://localhost:8791/previa/popup`. Acrescente `?lateral=1` para
ver o mesmo popup no formato do painel lateral.

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

## Arquitetura

```
proteu/
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

### A permissão opcional aos sites

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

