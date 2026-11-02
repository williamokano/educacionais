# Como continuar numa sessão nova (explicadores 3D)

Leia isto e `tasks/lessons.md` antes de mexer nos vídeos. Atualizado em 02/11/2026 (repositório `educacionais`; antes isto
morava no repositório do plugin, na branch `feat/motor-3d`).

## Onde as coisas estão

- **Plugin e motor:** o motor (Remotion, rig, pipeline de voz e som) e as skills vêm do plugin `motion-videos`
  (`~/Workspace/Personal/skills-motion-videos`). Instalação e atualização: veja o `README.md` deste repositório.
  O contrato do roteiro 3D está em `motor/docs/roteiro-3d.md` (depois de instalar o motor).
- **Lições:** `tasks/lessons.md`. Leia primeiro: são as correções que a pessoa já fez.
- **Plano e histórico:** `tasks/todo.md`.
- **Episódios prontos** (cada um com o texto aprovado em `tasks/`, o roteiro em `episodios/<tema>/roteiro.json` e os
  textos de publicação em `tasks/publicacao/<tema>-textos.md`):
  1. `ar-condicionado`: "Como um ar-condicionado gela a sua sala" (`"episodio": 2`). Sem gerador: o `roteiro.json` foi escrito à mão.
  2. `bomba-de-calor`: "Como o ar-condicionado esquenta a sala com o ar gelado da rua" (`"episodio": 3`). Idem.
  3. `chuveiro`: "Dá pra trocar o chuveiro elétrico por uma bomba de calor?" (`"episodio": 4`), cenário `banho`.
  4. `energia-solar`: "Por que a casa com placa solar apaga no apagão" (`"episodio": 5`), cenário `solar`, personagem `eletricista`.
  5. `inversor`: "Dá pra ligar a TV na bateria do carro?" (`"episodio": 6`), cenário `inversor`, cartões `ponteh`, `circuito`, `aguenta`.
  6. `abs`: "Por que o carro não para?" (freio de tambor, disco e ABS; `"episodio": 7`), cenário `pista`, cartões
     `fita` (rebobinar), `termometro`, `roda` e `chamada` (curta, comente, compartilhe e siga). 1:26, −14,1 LUFS.
     ESC, EBD, AEB e controle de tração ficaram de fora (pesquisa em `tasks/roteiro-abs.md`, "Fora do vídeo").
- **Gerador do roteiro.json:** `tasks/geradores/<tema>.py` lê a tabela do `.md` (as falas sempre iguais) e monta as
  cenas, os efeitos (`SFX`) e as ambiências por batida. Uso (da raiz do repositório):
  `python3 tasks/geradores/abs.py episodios/abs/roteiro.json`.
- **Pacote da série:** `motor/banco/series/explicadores/` (slug `demo-3d`, registrado em `motor/banco/index.ts`):
  - `sala.tsx` (sala do balde e peças reaproveitadas: ventilador, árvore), `ciclo.tsx` (casa em corte; campo `etapa` 0–10
    monta o aparelho; `sentido: -1` inverte o ciclo), `bancada.tsx` (analogias e o inversor), `banho.tsx`, `solar.tsx`,
    `inversor.tsx`, `pista.tsx` (pista molhada, carro com corte da roda, pedal suspenso, Zeca ao volante, etiquetas 3D).
    A lista de campos de cada cenário está no comentário do topo do arquivo.
  - `cartoes.tsx` e `cartoes-freio.tsx`: gráficos, onda, ponte H, circuito, termômetro, barra roda × carro, chamadas finais.
    `index.tsx` registra tudo e define `rotulo` e `medida`.
  - A pessoa é o personagem `zeca` (id só no código; o nome nunca aparece no vídeo); `eletricista` no episódio 4.
- **Publicação:** hashtags aprovadas em 30/10/2026 (as três últimas fixas: `#comofunciona #fisica #ciencia`; as duas
  primeiras mudam com o tema e precisam de aprovação). NAS: `smb://dxp6800pro-9e4e.local/media/Videos Curtos/Educacionais`
  (montado em `/mnt/nas-dxp6800pro/`), **uma pasta por episódio** (`01-ar-condicionado/` … `05-inverters/`, `06-freio/`), cada
  uma com `final.mp4`, `roteiro.md` e `publicacao/{capa.png,textos.md}`. Nada solto na raiz.
  `git commit` em pasta montada por CIFS quebra (`COMMIT_EDITMSG`): commit só nas pastas locais.

## Fazer o vídeo (do roteiro.json ao MP4 final)

Veja o `README.md` ("Fazer um vídeo"). Pontos que já deram problema:

- Com `| tail` no meio da cadeia o erro de um passo some e o seguinte roda com arquivo velho. Use `set -eo pipefail`.
- Efeito de som (`SFX`) aponta para um **trecho** da batida (separado por `[leve]`): se a fala mudar, confira os trechos.
- Com mais de ~16 batidas 3D, a folha de cenas estoura o limite de contextos WebGL. Renderize o vídeo e tire o quadro do
  meio de cada batida com o `ffmpeg` (`tile`). Leia os quadros antes de entregar. Para uma batida só:
  `npx remotion still src/index.ts episodio out/q.png --frame=<N> --scale=0.4 --props='{"episode":"demo-3d/ep07"}'`.
- A capa usa a composição `capa` (`quadro`, `titulo`, `sub`, `selo`, `legenda:false`, `hud:false`); o quadro tem que ser
  anterior aos cartões da batida. Simulação do iPhone: `bash tools/simular-iphone.sh <video.mp4> <saida.png>`.
- Chave da voz: `ELEVEN_API_KEY` no ambiente. O `narrar.py` reaproveita a voz do cache quando o texto não muda.

## Voz (decidida pela pessoa)

- ElevenLabs, voz feminina `RGymW84CSmfVugnA5tvA`, modelo `eleven_v4`, `"velocidade": 1.2`.
- O `eleven_v4` ignora a velocidade da API; o pipeline gera em 1,0 e acelera com `ffmpeg atempo` (mesmo tom). Não troque
  de modelo: a pessoa gostou da emoção. A pessoa quer, no próximo, um ritmo um pouco mais calmo (1,0× e/ou frases extras).
- Tags de emoção só nos ganchos e viradas: `[excited]`, `[curious]`, `[amazed]`. Não são faladas nem legendadas.

## Como a pessoa quer os roteiros (resumo de `tasks/lessons.md`)

- Começa direto no problema, impactante nos 2 primeiros segundos, **com as coisas em movimento**.
- Narração fala com "você", **no imperativo**. Personagem sem nome.
- Corrente "solução → mas → problema → solução": cada peça é o próximo passo, nunca "tentativa".
- Objetivo e curto: 60–90 s (teto da série: 3 min, alvo 2:40). Ganchos e viradas marcados, um a cada 10–25 s.
- **Todo número e fato com fonte**, pesquisada na hora. Números de cena ficam marcados como cena. Sem normas técnicas.
- A física tem que estar certa (circuito fechado sem bomba não circula; pedal pisando vai para a frente).
- Assets bonitos mesmo em low poly (carro com capô e cabine, boneco inteiro, peça etiquetada em 3D).
- Aprovação do texto antes de assets e render.
- Fim pede envio e puxa o próximo episódio ou "siga pra mais"; o episódio 6 fecha com curta, comente (com um fato do tema),
  compartilhe e siga.

## Regras de trabalho

- Commits **sem** `Co-Authored-By`.
- Antes de dizer que algo sumiu ou não existe, confira (`ls`, ToolSearch). Aviso do sistema é pista, não fato.
- Esperas longas (render, voz) em segundo plano, nunca com `sleep`.
- O código não ouve o áudio: diga isso e peça para a pessoa ouvir.
- Mudança no motor (`motor/src`, `pipeline`, `tools`) vai para o plugin, não para este repositório.

## Próximos passos

1. Próximo tema: a definir com a pessoa. Candidatos já pesquisados no episódio 6: ESC, EBD, AEB.
2. Versão mais calma do episódio 6 (se a pessoa pedir): voz em 1,0× e/ou frases extras (óleo, sapatas, sensor).
3. Formato de todo roteiro novo: corrente "solução → mas → problema → solução", fim com gancho para o próximo (ou
   "siga pra mais"), sem normas (`tasks/lessons.md`).
