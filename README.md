# educacionais

Vídeos curtos educacionais (9:16, ~1:30) em estilo explicador 3D: "como funciona" cada coisa do dia a dia, peça por peça,
com o Zeca Parafuso. Este repositório guarda **só o que é dos vídeos**: roteiros, geradores, cenários 3D da série e os
textos de publicação. O motor de render e as skills vêm do plugin
[`motion-videos`](https://github.com/williamokano/skills-motion-videos) (marketplace `skills-motion-videos`).

## Episódios

| # | Pasta (`episodios/`) | Tema | `"episodio"` no roteiro |
|---|---|---|---|
| 1 | `ar-condicionado` | Como um ar-condicionado gela a sua sala | 2 |
| 2 | `bomba-de-calor` | Como o ar-condicionado esquenta a sala com o ar gelado da rua | 3 |
| 3 | `chuveiro` | Dá pra trocar o chuveiro elétrico por uma bomba de calor? | 4 |
| 4 | `energia-solar` | Por que a casa com placa solar apaga no apagão | 5 |
| 5 | `inversor` | Dá pra ligar a TV na bateria do carro? (o inversor por dentro) | 6 |
| 6 | `abs` | Por que o carro não para? (freio de tambor, disco e ABS) | 7 |
| 7 | `bunker` | Como montar um bunker, peça por peça (caixa, abóbada, ar e luz), **publicando** | 8 |

Cada episódio tem o texto aprovado em `tasks/roteiro-<tema>.md`, o roteiro do motor em `episodios/<tema>/roteiro.json`
(gerado por `tasks/geradores/<tema>.py` a partir da tabela do `.md`, para as falas ficarem sempre iguais) e os textos de
publicação em `tasks/publicacao/<tema>-textos.md`. Os vídeos finais ficam no NAS (veja `tasks/COMO-CONTINUAR.md`).

## Instalar o plugin e o motor (uma vez por máquina)

Na raiz deste repositório:

```bash
claude plugin marketplace add williamokano/skills-motion-videos --scope project
claude plugin install motion-videos@skills-motion-videos --scope project
```

Isso grava `.claude/settings.json` (vai para o git). Para testar uma versão do plugin ainda não lançada, use o clone
local como marketplace: `claude plugin marketplace add ~/Workspace/Personal/skills-motion-videos`.

Depois instale o motor (Remotion + rig + pipeline de voz e som) e as dependências:

```bash
motion-videos-motor instalar        # ou, numa sessão do Claude Code: /motion-videos:motor
cd motor && npm ci && npx tsc --noEmit
```

O `instalar` copia o núcleo para `motor/` e **não toca** no que é deste projeto: `motor/banco/index.ts`,
`motor/banco/series/` (o pacote `explicadores` com os cenários, cartões e personagens), `motor/public/` e `motor/out/`.
Para trazer o motor novo depois de atualizar o plugin: `motion-videos-motor atualizar`.

Chave da voz: `export ELEVEN_API_KEY=...` (ElevenLabs; `narrar.py` reaproveita o áudio em cache quando o texto não muda).

## Fazer um vídeo (do roteiro.json ao MP4 final)

A partir de `motor/`:

```bash
ROT=../episodios/abs/roteiro.json
EP=demo-3d/ep07                                   # slug "demo-3d" + "episodio": 7 do roteiro

python3 pipeline/narrar.py $ROT --mudo            # rascunho sem voz (tempos simulados)
python3 pipeline/narrar.py $ROT                   # voz de verdade
python3 pipeline/som.py public/$EP/episode.json -o out/roteiro-som.json
npx remotion render src/index.ts episodio out/video.mp4 --props="{\"episode\":\"$EP\"}"
python3 pipeline/mixar.py out/roteiro-som.json -o out/mix.mp4 --video out/video.mp4
bash pipeline/masterizar.sh out/mix.mp4 out/final.mp4    # −14 LUFS, −2 dBTP
```

Rode cada passo com `set -eo pipefail` (um `| tail` esconde o erro do passo anterior). O guia completo, com as regras que
a pessoa já pediu, as pastas do NAS e o que ainda falta, está em [`tasks/COMO-CONTINUAR.md`](tasks/COMO-CONTINUAR.md) e
[`tasks/lessons.md`](tasks/lessons.md).

## Estrutura

```
episodios/<tema>/roteiro.json     roteiro do motor de cada episódio
motor/banco/index.ts              registro de pacotes (slug "demo-3d" = série dos explicadores)
motor/banco/series/explicadores/  cenários 3D (ciclo, bancada, banho, solar, inversor, pista, abrigo), cartões, Zeca, eletricista, moradores
motor/                            núcleo do motor, instalado pelo plugin (não editar à mão: mudança vale no plugin)
tasks/                            textos aprovados, geradores, publicação, lições, plano
```
