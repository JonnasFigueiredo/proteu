# Publicar na Chrome Web Store

Tudo o que o formulário do Google pede, pronto para copiar. O pacote sai de
`node empacotar.mjs` → `dist/proteu-qa-<versão>.zip`.

---

## Antes de começar (uma vez só)

1. Conta de desenvolvedor em https://chrome.google.com/webstore/devconsole
   — taxa **única** de US$ 5, paga com cartão.
2. Aceitar o contrato de desenvolvedor.
3. Preencher os dados de contato e **verificar o e-mail** (sem isso o item não
   pode ser publicado).

---

## Campos da listagem

### Nome
```
Proteu QA
```

### Descrição breve (máx. 132 caracteres)
```
Dados de teste, seletores e preenchimento de formulários para QA. 100% offline, sem coleta de dados.
```

### Descrição completa
```
Proteu QA gera massa de dados de teste direto no navegador, para quem trabalha
com QA e precisa preencher formulários o dia inteiro.

O QUE MUDA EM RELAÇÃO A OUTROS GERADORES

• Seed determinística. Toda geração vem de uma seed visível no rodapé. A mesma
  seed reproduz exatamente os mesmos dados — então um bug encontrado com dados
  gerados deixa de ser "não reproduzível". Anexe a seed ao relatório e quem for
  investigar gera a mesma massa.

• Documentos que passam na validação. Os dígitos verificadores são calculados
  de verdade (CPF, CNPJ, SSN, SIN, CUIT, CURP, RFC, Aadhaar, GSTIN, IBAN,
  Steuer-IdNr…), não são números aleatórios que o sistema rejeita no primeiro
  clique.

• Perfil coerente. Em vez de campos soltos, uma pessoa fictícia completa: o
  e-mail sai do nome, os documentos são da mesma pessoa, a empresa tem CNPJ e
  razão social que combinam. Um clique preenche o formulário inteiro.

RECURSOS

• 9 países: Brasil, Estados Unidos, Canadá, Argentina, China, Arábia Saudita,
  México, Índia e Alemanha. A interface acompanha o idioma do país — ou você
  fixa um idioma e lê os rótulos em português mesmo gerando dados da China.

• Preencher formulário: reconhece os campos por autocomplete, type e pelo texto
  do rótulo (português, inglês, espanhol e alemão). Campos de senha, somente
  leitura, desabilitados e de upload nunca são tocados.

• Exportar em lote: até 1000 registros em CSV, JSON ou fixture de
  Playwright/Cypress, com a seed dentro do arquivo para regerar os mesmos dados.

• Casos-limite: arsenal de entradas que quebram sistemas, cada uma explicando
  qual bug expõe — fronteiras Unicode (emoji ZWJ, zero-width, RTL override,
  homóglifos), números e datas de borda, espaços invisíveis, formatos inválidos
  e overflow de tamanho.

• Texto em 9 idiomas com geração por tamanho exato nas 4 unidades de contagem
  (grafemas, code points, code units e bytes), além de pseudolocalização.

PRIVACIDADE

Tudo roda no seu navegador. A extensão não faz nenhuma requisição de rede, não
tem servidor, não coleta nem transmite dado nenhum. O código é aberto e nunca é
ofuscado.

Código-fonte: https://github.com/JonnasFigueiredo/proteu
```

### Categoria
`Ferramentas para desenvolvedores`

### Idioma principal
`Português (Brasil)`

---

## Justificativa das permissões

O Google exige uma frase por permissão. É aqui que a maioria das extensões
volta para correção — cada texto precisa ligar a permissão a um recurso visível.

| Permissão | Justificativa |
|---|---|
| `contextMenus` | Adiciona o menu "Proteu QA" ao clicar com o botão direito num campo editável, para inserir um dado gerado sem abrir o popup. |
| `storage` | Guarda as preferências do usuário (seed, país, idioma, tema, modo de inserção) e o histórico da sessão. Fica tudo no dispositivo. |
| `activeTab` | Permite inserir o valor gerado no campo da aba que o usuário está vendo, apenas quando ele aciona a extensão. |
| `scripting` | Injeta sob demanda o script que detecta o campo em foco e escreve o valor. É injetado só na aba ativa, no momento do clique. |

**Por que não há host permissions:** a extensão nunca roda sozinha em nenhum
site. O script é injetado apenas quando o usuário aciona a extensão, usando o
acesso temporário de `activeTab`.

### Uso de código remoto
`Não` — todo o código está no pacote. Não há `eval`, nem CDN, nem módulo
baixado em tempo de execução.

---

## Privacidade

### Finalidade única
```
Gerar massa de dados de teste fictícios e inseri-los em campos de formulário
para atividades de teste de software.
```

### Coleta de dados
Marcar **nenhuma** das categorias. E declarar:

- ✅ Não vendo nem transfiro dados a terceiros fora dos usos aprovados
- ✅ Não uso nem transfiro dados para finalidade não relacionada à função única
- ✅ Não uso nem transfiro dados para avaliar crédito ou para empréstimos

### Política de privacidade
A loja exige uma URL pública. O texto pronto está em
[`docs/privacy-policy.md`](docs/privacy-policy.md) — publique-o no GitHub Pages
e use a URL resultante:
```
https://<seu-usuario>.github.io/proteu-qa/privacy-policy
```
> ⚠️ O repositório está **privado**. Torne-o público antes de enviar, ou
> publique a política em outra URL acessível (GitHub Pages, Gist público).

---

## Imagens

| Item | Tamanho | Obrigatório |
|---|---|---|
| Ícone da loja | 128×128 PNG | sim — já existe em `icons/128.png` |
| Captura de tela | 1280×800 ou 640×400 | sim, pelo menos 1 (até 5) |
| Bloco pequeno | 440×280 | não |
| Bloco marquee | 1400×560 | não |

As capturas já estão montadas em `tests/e2e/screenshots.html` — 7 slides de
1280×800 com o popup real embutido:

```bash
node tests/e2e/servir.mjs
# abra http://localhost:8791/tests/e2e/screenshots.html
```

Para salvar cada uma em PNG exato: F12 → clique direito no `<div class="slide">`
→ **Capture node screenshot**.

| # | Slide |
|---|-------|
| 1 | Perfil — persona com os documentos do país |
| 2 | Texto — geração por tamanho exato |
| 3 | Casos-limite — entradas que quebram sistemas |
| 4 | Mapear/seletores — menu de contexto com o retorno do que foi copiado |
| 5 | Seletores inteligentes — data-testid, desambiguação, Shadow DOM |
| 6 | Interface em 7 idiomas |
| 7 | 100% offline — zero rede, zero coleta |

---

## Depois do envio

- **Primeira revisão:** costuma levar de alguns dias a ~2 semanas. Extensões
  com poucas permissões e sem host permissions costumam passar mais rápido.
- **Atualizações:** muito mais simples. Suba a versão no `manifest.json`, rode
  `node empacotar.mjs` e envie o novo zip no mesmo item. O Chrome distribui
  sozinho para quem já instalou, normalmente em algumas horas. Não precisa
  refazer a listagem nem as justificativas.
- **A versão nunca pode repetir nem regredir** — o Google recusa um zip cuja
  versão seja menor ou igual à publicada.
