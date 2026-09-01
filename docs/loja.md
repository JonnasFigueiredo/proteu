# Chrome Web Store: texto da listagem

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
Massa de teste, senhas, mapeamento de elementos e automação. Documentos de 12 países. 100% offline.
```

*(99 caracteres, limite 132)*

## Categoria

Ferramentas de desenvolvedor

## Idioma principal

Português (Brasil)

---

## Descrição completa

```
Proteu QA ajuda quem testa software a resolver, sem sair do navegador, as
tarefas que mais consomem tempo: criar dados de teste, preencher formulários,
identificar os elementos da tela e repetir um cadastro várias vezes para popular
um ambiente.

Tudo funciona sem conexão. A extensão não faz requisições de rede, não usa
bibliotecas externas e não coleta dado nenhum.


DADOS QUE SE REPRODUZEM

Cada pessoa gerada tem um endereço curto, mostrado no rodapé. Copie esse
endereço para o relatório de defeito e quem for reproduzir verá exatamente a
mesma pessoa, com os mesmos documentos.

É a diferença entre anotar "usei dados aleatórios" e entregar um defeito que o
time reproduz na primeira tentativa.


DOCUMENTOS DE DOZE PAÍSES

A extensão gera documentos equivalentes aos de doze países, entre eles Brasil,
Estados Unidos, Alemanha, Japão e Austrália. Cada número segue o algoritmo de
dígito verificador publicado pelo órgão que o emite, então passa nas validações
do sistema em teste.

A pessoa gerada é coerente: o e-mail deriva do nome, o endereço corresponde à
região, e a data de admissão nunca vem antes de a pessoa ter idade para
trabalhar.

Os códigos postais brasileiros existem de verdade. São endereços reais,
conferidos um a um, porque um código inventado passa no formato e é recusado por
quem consulta a base dos Correios, e aí o teste para por causa do dado, não do
sistema.


MAPEAR ELEMENTOS DA TELA

Ative o modo, clique nos elementos que pretende automatizar e um bloco de notas
ao lado monta as declarações prontas para colar no seu projeto.

O resultado sai no formato da ferramenta de automação que você usa, na convenção
de nome que preferir. O localizador respeita o destino: cada ferramenta recebe a
sintaxe que de fato executa.

O nome da variável vem do papel do elemento e da pista mais estável disponível.
Identificadores gerados automaticamente pelo build são descartados, porque não
sobrevivem ao próximo deploy.


LOCALIZADORES CONFERIDOS

Clique com o botão direito em qualquer elemento para copiar o melhor localizador
disponível.

O painel de desenvolvedor mostra cada estratégia com a quantidade real de
elementos que ela encontra, verificada na página aberta. Um localizador que
encontra quatro elementos é um teste que passa hoje e falha quando a tela ganhar
mais um item parecido, e isso fica visível antes de virar código.


PREENCHER FORMULÁRIOS

Um clique preenche os campos reconhecidos com a pessoa atual, inclusive em telas
feitas com frameworks modernos. Campos de senha, somente leitura, desabilitados
e de envio de arquivo nunca são tocados.


TEXTO E CASOS DE FRONTEIRA

Geração de texto com tamanho exato na unidade de contagem que você escolher,
porque "cem caracteres" é ambíguo e é justamente onde a validação da tela costuma
divergir da validação do servidor.

Há também uma biblioteca de entradas que costumam quebrar sistemas, cada uma
acompanhada da explicação do motivo: caracteres especiais, números e datas
extremos, espaços invisíveis e formatos inválidos.


AUTOMAÇÃO IMEDIATA

Grave um cadastro uma vez e receba um roteiro que roda no próprio navegador, sem
instalar nada e sem montar projeto.

Escolha quantas repetições quer e o roteiro executa o fluxo em sequência. A cada
volta ele usa uma pessoa diferente, porque repetir o mesmo cadastro esbarra em
duplicidade logo na segunda tentativa.

É o caminho para popular um ambiente de homologação com dezenas de registros em
minutos, sem escrever automação.

Para quem já tem uma suíte de testes, o mesmo roteiro pode ser exportado no
formato das ferramentas de automação mais usadas, incluindo a travessia de
componentes encapsulados e a troca de quadros que gravadores comuns esquecem.


GERADOR DE SENHA

Uma aba dedicada a criar senhas, com tamanho ajustável e escolha de quais tipos
de caractere entram. O medidor ao lado mostra a força em bits, e a senha sai
sempre com pelo menos um caractere de cada tipo escolhido, porque senha fora da
política do sistema só seria descoberta quando o cadastro recusa.

Diferente do restante da extensão, esta aba não é reproduzível: a senha vem de
sorteio criptográfico do próprio navegador, porque uma senha que outra pessoa
consegue prever não poderia ser chamada de forte.


AO LADO DO FORMULÁRIO

A extensão também abre no painel lateral do navegador, por um botão no
cabeçalho. Ao contrário da janela flutuante, o painel não fecha quando você
clica na página, então ele fica visível enquanto você preenche o cadastro. O
mesmo botão devolve a extensão ao formato de janela.

O bloco de notas do mapeamento pode ser encaixado nesse painel, arrastando-o
para a borda da tela, o que libera a área do formulário.


SETE IDIOMAS

A interface acompanha o país escolhido e pode ser fixada em um idioma. É possível
gerar dados de um país e ler os rótulos no seu próprio idioma.


PRIVACIDADE

Sem requisições de rede. Sem coleta. Sem dependências externas.

São cinco permissões na instalação, e nenhuma delas dá acesso ao conteúdo das
páginas. O acesso necessário para o menu de localizadores e para o mapeamento é
opcional, e só é solicitado quando você ativa esses recursos.

Código aberto sob licença AGPL-3.0, auditável em
github.com/JonnasFigueiredo/proteu
```

---

## Descrição do único propósito

Campo separado, no formulário de Privacidade. Limite de 1.000 caracteres, mas
encher o limite trabalha contra: o campo pede UM propósito claro, e um resumo de
recursos argumenta que a extensão faz muitas coisas, que é o oposto do que a
política de propósito único aceita. A lista de recursos já está na descrição.

```
Apoiar quem testa software, gerando dados fictícios para preencher formulários e identificando os elementos da página que serão automatizados.

Todo o processamento acontece no navegador do próprio usuário. A extensão não envia dados a servidor algum, não usa bibliotecas externas e não coleta nenhuma informação de uso.
```

*(310 caracteres)*

---

## Justificativa das permissões

| Permissão | Texto para o formulário |
|---|---|
| `contextMenus` | Adiciona ao menu de contexto as opções de copiar o seletor do elemento clicado. |
| `storage` | Guarda localmente as preferências do usuário (país, tema, idioma) e o histórico da sessão. |
| `activeTab` | Insere o valor gerado no campo em foco quando o usuário aciona o atalho de teclado. |
| `scripting` | Registra o content script que identifica em qual elemento o usuário clicou. |
| `sidePanel` | Abre a mesma interface da extensão no painel lateral do navegador, quando o usuário clica no botão para isso. Não lê a página nem a navegação. |
| Host (opcional) | Necessário para o menu de seletores e o modo Mapear: o navegador não informa em qual elemento o menu foi aberto, então é preciso estar observando o clique antes de ele acontecer. Solicitado apenas ao ativar esses recursos. |

**Uso de código remoto:** Não.
**Coleta de dados:** Nenhuma.
**Finalidade única:** Gerar massa de dados de teste, mapear elementos de página e
automatizar fluxos repetitivos para testes de software.
