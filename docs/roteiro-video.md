# Roteiro do vídeo de lançamento

Vídeo curto para o feed do LinkedIn. Duração alvo: **45 segundos**.

A meta não é mostrar tudo que a extensão faz. É fazer um QA parar de rolar o
feed e reconhecer um problema que ele já viveu. Três recursos, no máximo.
Senha, exportação em lote e painel lateral ficam de fora de propósito: cada item
a mais rouba tempo dos que importam e derruba a retenção, que é o sinal mais
forte para vídeo.

---

## Antes de gravar

**Cenário.** Use a página feita para gravar:

```bash
node tests/e2e/servir.mjs
```

Depois abra `http://localhost:8791/tests/e2e/cenario-video.html`. São quatro
telas, uma por trecho do roteiro, trocadas pela seta no canto ou pelas setas do
teclado. `?tela=3` abre direto naquela, o que ajuda a refazer uma tomada sem
passar pelas anteriores.

| Tela | Trecho |
|---|---|
| 1 · Novo cliente | o gancho: preencher tudo com um clique |
| 2 · Chamado de defeito | a seed, com a referência dentro do chamado |
| 3 · Lista de clientes | o mapeamento, com elementos variados |
| 4 · Fechamento | os últimos segundos |

A tecla `R` limpa o formulário para a próxima tomada. Recarregar a página também
limparia, mas derruba o content script do modo Mapear junto.

**Preparo da tela**

- Zoom do navegador em **150%**. O vídeo vai ser assistido num celular: no zoom
  padrão os rótulos dos campos ficam ilegíveis.
- Esconda a barra de favoritos (`Ctrl+Shift+B`) e feche as outras abas. Aba com
  nome de cliente ou de projeto interno vaza informação que você não quer no
  feed.
- Tema claro na extensão. Contrasta melhor com o feed e com a miniatura.
- Cursor visível e movimento lento. Movimento rápido demais some na compressão
  do LinkedIn.

**Formato.** Grave em paisagem 1920x1080 e recorte depois para **1080x1350**,
proporção 4:5. É quase vertical, ocupa bastante altura no feed, e recortar 4:5
de uma captura em paisagem é viável. Tentar 9:16 direto obriga a uma janela de
navegador alta e estreita que não cabe na maioria das telas.

**Sem áudio.** O feed começa mudo. Toda a informação vai na legenda queimada.
Se quiser trilha, que seja decorativa, sem nada essencial no som.

---

## Roteiro

### 0s a 3s · O gancho

**Tela:** formulário de cliente da página de demonstração, todo vazio, já
visível quando o vídeo começa. A extensão aberta ao lado. O cursor vai até
"Preencher formulário" e clica. Todos os campos se completam de uma vez.

**Legenda:** `Um clique. Formulário inteiro.`

Sem introdução, sem logo, sem "olá pessoal". Estes três segundos decidem se o
resto vai ser assistido. O preenchimento instantâneo é a coisa mais visual que a
extensão faz, então ela vem antes de qualquer explicação.

### 3s a 11s · O problema

**Tela:** dá para segurar o formulário preenchido e passar o mouse pelos campos,
ou cortar para o CPF em destaque.

**Legendas, uma por vez:**

```
CPF, CNPJ, CEP, datas.
Tudo com dígito verificador válido.
Nada de gerador aleatório da internet.
```

### 11s a 27s · A seed, que é o diferencial

Este é o trecho mais importante do vídeo. É o único que a concorrência não tem,
e é o que faz um QA reconhecer uma dor própria.

**Tela:**

1. Aponte para a referência no rodapé do popup, algo como `7f2a91#8`. Selecione
   e copie.
2. Abra outra janela do navegador, limpa, com a extensão instalada.
3. Cole a referência no campo de seed.
4. A **mesma pessoa** aparece, com os mesmos documentos.
5. Mostre os dois lados lado a lado por um segundo.

**Legendas:**

```
Achou um bug com esses dados?
Copie esta referência.
Cole. Mesma pessoa, mesmos documentos.
Bug reproduzível, não "não reproduz aqui".
```

A última linha é a frase que vale o vídeo inteiro. É a única que fala a língua
de quem abre chamado e recebe "não consigo reproduzir" de volta.

### 27s a 40s · Mapear

**Tela:** ligue o modo Mapear e clique em três elementos da página de
demonstração, nesta ordem, porque a variedade mostra mais que a repetição:

1. um campo comum, como o de e-mail
2. o botão que tem `data-testid`
3. o elemento cujo `id` é gerado por build

As declarações aparecem no bloco de notas ao lado enquanto você clica.

**Legendas:**

```
Precisa dos seletores?
Clique nos elementos.
Variáveis prontas para a IDE.
Id gerado por build é descartado.
```

A última linha é técnica de propósito. É o detalhe que faz quem entende do
assunto comentar, e comentário pesa mais que curtida.

### 40s a 45s · Fechamento

**Tela:** o popup inteiro, parado, ou a página da extensão na loja.

**Legendas:**

```
Proteu QA
Grátis, offline, código aberto.
Chrome Web Store
```

Sem "deixe seu like", sem "comenta aí". O convite ao comentário vai no texto do
post, não dentro do vídeo.

---

## Legendas

Regras que valem para todas:

- No máximo **6 palavras por linha** e 2 linhas por vez.
- Fonte grande, com fundo sólido ou contorno forte. Legenda fina sobre tela
  clara some no celular.
- Posicione no **terço inferior**, acima da área que a interface do LinkedIn
  cobre.
- Escreva você mesmo, não use a transcrição automática. Ela erra em "seed",
  "XPath" e "CNPJ", e legenda errada em vídeo técnico custa credibilidade.

O arquivo [legendas-video.srt](legendas-video.srt) tem os tempos prontos para
importar no editor.

---

## Depois de publicar

- Responda todo comentário na primeira hora.
- Leve para onde há QA reunido: comunidades de automação de testes, grupos da
  área, o time. Vinte comentários de gente da área valem mais que duzentas
  curtidas de conhecido.
- Não edite o post nas primeiras horas.
- O link da loja vai no primeiro comentário, não no corpo do post.
