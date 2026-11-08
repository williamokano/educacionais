# Roteiro v2 (`roteiro.json`): o contrato entre roteiro, voz e motor

Uma batida = um trecho da fala + o que aparece na tela enquanto ele é falado. É a tabela de cenas do `roteiro.md`
escrita no vocabulário do motor. Mora em `series/<slug>/episodios/epNN/roteiro.json`. Exemplo completo e testado:
`series/<slug>/episodios/ep01/roteiro.json`.

```
roteiro.json ──pipeline/narrar.py──> public/<slug>/epNN/{narration.mp3, episode.json} ──remotion──> MP4
                                                         └──pipeline/som.py──> roteiro-som.json ──mixar.py──> final
```

## Cabeçalho

```json
{
  "slug": "<slug>",          // = pasta da série = pacote em banco/index.ts
  "serie": "NOME DA SÉRIE",               // nome no cartão final
  "episodio": 1,
  "relogio": "DIA 1 · 18:40",             // opcional
  "voz": { "tts": "voicestudio", "stt": "voicestudio", "motor": "omnivoice", "perfil": "<profile_id>",   // ou tts elevenlabs + id
           "velocidade": 1.08, "seed": 11, "idioma": "pt" },
  "cartaoFinal": { "parte": 1, "pergunta": "…?", "chamada": "SIGA" },   // null = sem cartão final
  "batidas": [ … ]
}
```

A voz vem da `identidade.md` da série (mesma voz e ajustes em todos os episódios). O bloco `voz` escolhe o
provedor e vai por cima de `pipeline/voz/padrao.json` (padrão: VoiceStudio local, para teste e ajuste fino):

| `tts` | Chaves | Como sai o tempo |
|---|---|---|
| `voicestudio` | `motor` (ex.: `omnivoice`), `perfil` (profile_id), `velocidade`, `seed`, `referencias` (opcional) | uma batida por pedido, conferida pelo STT (nova seed se não bater) |
| `elevenlabs` | `id` (voice_id), `modelo`, `velocidade` (0,7–1,2), `estabilidade`, `similaridade`, `estilo` | texto inteiro num pedido, com o tempo de cada caractere. Nos modelos v3/v4 a API ignora a velocidade: o áudio sai em 1,0 e é acelerado depois (ffmpeg `atempo`, mesmo tom), com os tempos na mesma escala |
| `openai` | `base` (qualquer servidor compatível com `/v1/audio/speech`), `modelo`, `voz`, `chave_env` | uma batida por pedido + STT |

`stt`: `voicestudio` (padrão), `whisper-local` (faster-whisper na CPU) ou `openai` (`stt_base`, `stt_modelo`).
Provedor novo = um módulo em `pipeline/voz/` que segue a interface de `pipeline/voz/base.py`, registrado em
`pipeline/voz/__init__.py`.

## Idiomas

O roteiro mestre é em pt-BR. Cada idioma de saída é um `roteiro.<idioma>.json` com a mesma estrutura, gerado por
`pipeline/idioma.py` (extrair → preencher a tabela → aplicar → verificar), com `"idioma"` e `"pasta": "epNN-<idioma>"`.
O motor troca a legenda (palavras que não fecham bloco), os textos fixos (SIGA/FOLGEN/FOLLOW, COMENTE…, OU, PARTE)
e o formato dos números pelo idioma do `episode.json`. Idiomas prontos: `pt`, `de`, `en`, `es` (`src/v2/idioma.ts`).

## Batida

```json
{ "texto": "Dentro: [leve] *novecentos reais*, [leve] um RG [leve] e a foto de uma criança.",
  "duracao": 3.0,                          // só no modo --mudo
  "cena": { … } }
```

- `texto`: o trecho exato da fala. Juntando todas as batidas sai a narração inteira, sem pular nem repetir.
- `*palavras*` = destaque amarelo (dica), `_palavras_` = vermelho (perigo). No máximo um destaque por batida.
- Tags de áudio do ElevenLabs v3/v4 (`[whispers]`, `[sighs]`, `[speaks softly]`): qualquer colchete que não seja marca
  de pausa. Vão para a voz só com `tts: "elevenlabs"` e `modelo` `eleven_v3`/`eleven_v4`; nunca entram na legenda, no
  STT nem nos outros provedores (o `narrar.py` tira).
- `[leve]`, `[media]`, `[longa]`… dividem a batida em **trechos** (0, 1, 2…). Os trechos servem para `entra`,
  `muda`, `fala`, `sfx.trecho` e para os cenários que reagem ao texto. No ElevenLabs, quem faz a pausa é a pontuação.
- Uma batida dura 2–4 s (nunca mais de 5). O `narrar.py` avisa as que passarem.

### Recap (batida com o áudio de um episódio anterior)

```json
{ "recorte": { "episodio": 1, "batida": 9, "trecho": 2 }, "falante": "radio",
  "texto": "Ela sabia o seu nome…",
  "cena": { "cenario": "radio", "clima": "recap", "linhas": [ … ],
            "cartoes": [{ "tipo": "lembra", "texto": "LEMBRA DO EP. 1?", "zona": "hud" }] } }
```

- O `narrar.py` corta o áudio já narrado da batida `batida` (contada a partir de 1, como na folha de cenas) do
  episódio `episodio`, a partir do trecho `trecho` (opcional, a partir de 0), na pasta do mesmo idioma
  (`ep02-de` → `ep01-de`). Não chama o provedor de voz e não gasta crédito; os tempos das palavras vêm do
  `episode.json` daquele episódio. O episódio de origem precisa ter sido narrado (não `--mudo`).
- `texto` = o que foi dito lá, palavra por palavra (a legenda sai dele; o `narrar.py` confere e avisa se não bater).
- O nome e a seed dos pedaços de voz contam só as batidas sem `recorte`: pôr um recap num episódio já narrado
  reaproveita o cache e não gera a voz de novo.
- No recap em cinza, o filtro tira a cor de tudo; `"recapDestaque": true` na cena faz o cenário do pacote redesenhar só o destaque por cima, com a cor original (o cenário lê `cena.soDestaque`: sem fundo, só as linhas/objetos coloridos).
- Não use `"hud": false` no recap: ele também esconde o selo `lembra`. Sem cartão `rec`/`relogio`, o HUD fica só com o selo.

### Cartão final com pergunta

`"cartaoFinal": { "parte": 2, "pergunta": "WOHER KANNTE DIE STIMME IHREN NAMEN?" }`: a pergunta aparece entre
PARTE/TEIL N → N+1 e SIGA/FOLGEN. É só texto (entra na transcriação), sem fala: trocar depois da voz pronta pede
só `narrar.py` com o cache (ou editar o `endcard` do `episode.json`) e um novo render.

## Cena

| Campo | Valores | O que faz |
|---|---|---|
| `cenario` | genéricos: `escuro`, `cor-solida` (`cor`) · o resto vem do pacote da série | fundo e objetos |
| `clima` | `neutro` `manha` `entardecer` `noite` `tensao` `perigo` `lembranca` `recap` | tinta por cima; tensão/perigo com vinheta; lembrança (flashback) em sépia; recap do episódio anterior em cinza, escuro, com vinheta e grão |
| `hud` | `false` | esconde o HUD (cold open) |
| `transicao` | `fusao` (padrão: fusão cruzada, a cena que sai fica embaixo congelada no último quadro e a nova sobe de 0 a 1 em ~0,25 s, sem passar pelo preto) · `corte` (seco) · `fade` (legado, sobe a partir do escuro) · `whip` | entrada da batida; a primeira batida sempre abre em corte. `transicaoDur` (s) muda a duração da fusão. No topo do roteiro: `transicao`, `transicaoDur` e `transicaoFinal` (`fusao`/`corte`, entrada do cartão final) valem como padrão das batidas que não dizem a sua |
| `camera.plano` | `geral` `medio` (padrão) `close` `detalhe` | tamanho dos personagens e linha do chão |
| `camera.movimento` | push lento (padrão) · `zoom-lento` `zoom-saindo` `pan-direita` `pan-esquerda` `tilt-subindo` `parado` | nenhuma cena fica parada |
| `camera.tremor` | `true` | tremor |
| `camera.foco` | id de personagem | o zoom vai na direção dele |
| `personagens` | lista (abaixo) | |
| `cartoes` | ver "Cartões" abaixo | HUD na faixa y 160–330 (empilham); centro na faixa da ação |
| `diagramas` | `contador` (`de`, `ate`, `prefixo`, `sufixo`, `rotulo`, `cor`, `y`) · `cota` (`valor`, `y`) · os do pacote | números e medidas na tela |
| `efeitos` | `vinheta`, `tremor` · `foco-luz` (`alvo` ou `x`/`y`, `raio`) · `lanterna` (`padrao` em morse, `x`/`y`) · `errado` / `certo` (`alvo` ou `x`/`y`, `tamanho`) · todos aceitam `trecho` | círculo de luz no escuro, luz piscando, X vermelho / ✓ verde |
| `legenda` | `"topo"` | legenda em y 420–640, quando a ação ocupa a parte de baixo |
| `ambiencia` | nome de som (ou `{som, volume}`) · `"nenhuma"` | loop até a próxima batida que mudar |
| `sfx` | `"whoosh"` ou `{som, trecho, em, volume, abaixa}` | efeito no início da batida ou do trecho |
| outros campos | definidos pelo cenário do pacote (`carteira`, `foco`, `porta`…) | estado do cenário |

## Cartões

Todo cartão aceita `trecho` (entra no início do trecho k da fala, com a animação começando ali), `ateTrecho`
(sai no trecho k) e `zona: "hud" | "centro"` (para trocar a faixa padrão).

| Cartão | Faixa | Campos | Para quê |
|---|---|---|---|
| `relogio` | HUD | `dia`, `hora`, `sub` (subtítulo de estado: "FALTAM 2 DIAS"), `subCor` | tempo contínuo da história |
| `etiqueta` | HUD | `texto`, `icone`, `corIcone`, `marca` (`check`/`x`), `cor: "branco"` | fatos curtos que se empilham ("PORTA DE METAL", "+4 PESSOAS"), reações ("TRAVOU") |
| `ficha` | HUD | `titulo`, `sub` | apresentar personagem |
| `cronometro` | HUD | `de`, `ate` ("mm:ss") | contagem |
| `medidor` | HUD | `itens: [{rotulo, de, ate, cor, icone}]`, `sufixo`, `maximo` | o porquê em números, barras animando (100% × 4%) |
| `versus` | HUD | `a`/`b`: `{valor, rotulo, cor}` | "1% VOCÊ vs 99% CHUVA" |
| `lembra` | HUD | `texto` | callback: "↩ LEMBRA DO EP. 9?" |
| `termometro` | HUD | `valor`, `rotulo`, `nivel` (0..1), `cor` | febre, temperatura, nível |
| `titulo` | centro | `texto`, `sub`, `grande` (cartão-palavra), `cor`, `revela: {trecho, texto, cor}` | "ANDE." / "A PALAVRA ERA…" → "LINDA" |
| `regra` | centro | `titulo`, `numero`, `texto` | cartão de regra numerado |
| `prancheta` | centro | `titulo`, `itens: [{rotulo, valor, status: ok/alerta/perigo, icone, trecho}]`, `muda: [{trecho, item, valor, status}]`, `carimbo: {texto, trecho, cor}` | "No papel…": a conta que parece fechar; no `muda` o valor velho é riscado e o novo entra em vermelho |
| `escolha` | centro | `a`/`b`: `{texto, icone}`, `chamada` | dilema final + COMENTE |

Ícones grandes (`escolha`): `carteira`, `delegacia`, `entregar`, `check`, `x`, `interrogacao`.
Ícones pequenos (etiqueta, medidor, prancheta): `check` `x` `alerta` `relogio` `gota` `comida` `pessoa` `porta`
`janela` `cadeado` `chuva` `passos` `gelo` `riso` `volta` `bateria` (`src/v2/Informacao.tsx`).

Exemplo de todos, com a técnica da prancheta (no papel → contraponto → conta refeita → abre o próximo):
`motor/benchmark/cartoes.json`.

## Personagem em cena

```json
{ "id": "otavio", "vista": "perfil", "acao": "correndo", "expressao": "tenso",
  "de": 1.15, "x": 0.72, "tempoMov": 1.0, "entra": 1,
  "vistaChegada": "frente", "acaoChegada": "em-pe",
  "muda": [{ "trecho": 2, "expressao": "raiva", "acao": "mao-estendida" }],
  "fala": [1, 2], "olhar": -0.9, "mao": "carteira" }
```

| Campo | O que faz |
|---|---|
| `x` | 0..1 da largura (nada importante depois de 0,88) |
| `de` + `tempoMov` | anda de `de` até `x`; vira sozinho para o lado do movimento; ao chegar, troca para `acaoChegada`/`vistaChegada` |
| `entra` | aparece no início do trecho k |
| `muda` | troca ação, expressão ou vista no trecho k (`atraso` em s); a pose transiciona em 0,35 s |
| `fala` | `true` ou lista de trechos: a boca acompanha as palavras |
| `olhar` | −1..1: pupilas para a esquerda/direita da tela |
| `mao` | adereço na mão: `carteira` `notas` `documento` `celular` `molho-chaves` `chave-triangular` `walkie` `lanterna` `gravata-mao` |
| `look`, `variante`, `escala`, `espelhar` | look do banco, `infectado`, tamanho, perfil olhando para a esquerda |

**Continuidade automática:** se o mesmo personagem está na batida anterior, no mesmo cenário e no mesmo plano, ele
não "pula": a pose e o `x` saem de onde ele estava.

**Ações** (`src/rig/acoes.ts`): `em-pe` `olhando-em-volta` `andando` `correndo` `mancando` `acenando` `gesticulando`
`pensando` `bracos-cruzados` `susto` `comemorando` `olhando-celular` `segurando` `mao-estendida` `apontando`
`segurando-chaves` `girando-chave` `ouvido-na-porta` `segurando-walkie` `tapando-ouvidos` `mao-erguida`
`negando-com-a-cabeca` `abracando` `encostado` `sentado` `agachado`. Andar, correr e mancar são de perfil.

**Expressões:** `neutro` `alerta` `cansado` `concentrado` `tenso` `medo` `serio` `alivio` `suplicante` `raiva` `dor` `sorriso`.

Ação, cenário, cartão ou adereço que não existe faz o render parar com a lista dos que existem. Asset novo é
criado no pacote da série (cenário, cartão) ou no rig (ação, adereço, peça de roupa) e passa pela folha de revisão.

## Revisão

```bash
npx remotion still src/index.ts revisao out/<slug>_epNN_cenas.png --props='{"episode":"<slug>/epNN"}' --scale=0.7
npx remotion still src/index.ts tira out/<slug>_epNN_b02.png --props='{"episode":"<slug>/epNN","batida":2,"passo":4}' --scale=0.6
```

`revisao` = um quadro de cada batida (contact sheet). `tira` = 12 quadros seguidos de uma batida (movimento).
