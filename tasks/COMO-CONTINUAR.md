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
  7. `bunker`: "Como montar um bunker, peça por peça" (`"episodio": 8`), cenário `abrigo`, cartões `peso`, `forcas`, `gas`, `cal`
     e `perguntaFinal`. Texto aprovado em `tasks/roteiro-bunker.md` (31 batidas; gerador numa sala fechada (cano de escape, isolamento, detector)
     que fica até o fim, apagado, como emergência; painel solar (2 painéis, face para a câmera); à noite a bateria cheia mantém a luz; sala extra de água e comida; sem a água; fecha com "preparado pro seu apocalipse nuclear?" e "siga pra saber como as coisas funcionam").
     **Status: PUBLICANDO (03/11/2026).** Vídeo final aprovado pela pessoa: voz, som, mix e master prontos (1:59, −14,12 LUFS,
     −2,37 dBTP, `motor/out/final-bunker.mp4`). A pessoa publica na sequência; capa, textos (`tasks/publicacao/bunker-textos.md`), hashtags
     (`#bunker #sobrevivencia` + as fixas, aprovadas) e a pasta `07-bunker/` no NAS **prontos**; a pessoa posta quando sentir. Gerador:
     `python3 tasks/geradores/bunker.py episodios/bunker/roteiro.json`. Fecho com risada (`[laughs]` no `eleven_v4`) e 27,5 efeitos/min (aprovados).
  8. `airfryer`: "Como fritar batata sem fritura?" (revela a **airfryer** só na batida 24; `"episodio": 9`), cenário `cozinha` (fogão com forno,
     caixinha na bancada, airfryer, micro-ondas), cartão `atencao`. Texto v2 em `tasks/roteiro-airfryer.md` (30 batidas). **Status: vídeo
     pronto para a pessoa assistir (02/11/2026)**, `motor/out/final-airfryer.mp4`, 1:56, −14,1 LUFS, −2,4 dBTP. **Aprovado pela pessoa (03/11/2026)**, pasta `08-airfryer/` no NAS pronta. Publisher (série `educativos`, conta `curiosidades_desenroladas`, terça/quinta/sábado 18:00): conteúdo cadastrado como rascunho (id `10ffd41a590a349f484a1f50ff4ad36b`); **publicado em 03/11/2026** (aviso 18:14, vídeo 18:31 e story "já saiu" 18:31, na conta certa; o dia foi movido de 04/11 para 03/11). O micro-ondas já está agendado para 06/11 18:00 (id do conteúdo `287e858af4a6a34f6083be6eb8b8aee0`). Stories: aviso (arte de horário) 4–5 h antes e "já saiu" 1 min depois do vídeo (sem link). **Primeiro comentário fixado** (revela o nome do aparelho, pergunta algo e avisa o próximo) configurado nos dois vídeos via `update_content`; episódios novos precisam do próprio `first_comment` (a série não tem padrão). Publisher: `http://192.168.178.79:9090/mcp`; se as ferramentas sumirem, `/mcp` e reconectar. Gerador:
     `python3 tasks/geradores/airfryer.py episodios/airfryer/roteiro.json`. Gancho final: micro-ondas (próximo episódio).
  9. `microondas`: "Como esquentar comida sem fogo?" (revela o **micro-ondas** só na batida 15; `"episodio": 10`), cenário `microondas`
     (reaproveita `cozinha-*`; lupas com a molécula de água, magnetron, caixa de metal, tela da porta, prato giratório), cartão `contador245`.
     Texto aprovado em `tasks/roteiro-microondas.md` (22 batidas). **Status: vídeo pronto para a pessoa assistir (02/11/2026)**,
     `motor/out/final-microondas.mp4`, 1:34, −14,2 LUFS, pico −3,8 dBFS (remasterizado em 03/11/2026 com limite de −3 dBTP, porque o
     pico passava de −2 depois do AAC). Capa (`episodios/microondas/publicacao/capa.png`), textos (`tasks/publicacao/microondas-textos.md`)
     e a pasta `09-microondas/` no NAS **prontos (03/11/2026)**. **Refeito em 03/11/2026** a pedido da pessoa: prato centralizado, magnetron dentro da carcaça (ao lado da cavidade) e carcaça em raio-X só nas batidas 15, 16 e 22 (campo `raiox`); NAS atualizado. Falta: a pessoa ouvir e aprovar as hashtags `#cozinha #curiosidades`. Gerador: `python3 tasks/geradores/microondas.py
     episodios/microondas/roteiro.json`. Gancho final: fogão de indução (próximo episódio).
  10. `inducao`: "Como esquentar a panela sem esquentar a mão?" (revela o **fogão de indução** só na batida 16; `"episodio": 11` no roteiro, número 10 no publisher), cenário
     `inducao` (acampamento, gás, cooktop de vidro, bobina em raio-X, lupa das correntes, ímã). Texto em `tasks/roteiro-inducao.md` (20 batidas; sem gancho do
     celular: o fim é "siga pra descobrir"). Gerador: `python3 tasks/geradores/inducao.py episodios/inducao/roteiro.json`. **Vídeo gerado (03/11/2026)**:
     `episodios/inducao/final.mp4` (1:23, −14,4 LUFS, pico −3,4 dBFS), NAS `10-inducao/`. Publisher: cadastrado e agendado para 04/11 18:00 (aviso 13:30, "já saiu"
     18:01); **aprovado pela pessoa (03/11/2026)**; ainda pendente de publicação. **Pontos fracos conhecidos:** o Zeca fica atrás dos botões do Reels em várias batidas; a bobina em raio-X quase não se vê; fogueira pequena na faixa da legenda.
     Regras: tudo do episódio sempre dentro da pasta do episódio (repo e NAS); cada episódio leva dois stories (aviso 4–5 h antes, "já saiu" 1 min depois);
     caminho de mídia no publisher é relativo (`Videos Curtos/...`). Se o story sair na conta errada, suspeitar de cache do publisher (foi o que aconteceu em 03/11).
- **Gerador do roteiro.json:** `tasks/geradores/<tema>.py` lê a tabela do `.md` (as falas sempre iguais) e monta as
  cenas, os efeitos (`SFX`) e as ambiências por batida. Uso (da raiz do repositório):
  `python3 tasks/geradores/abs.py episodios/abs/roteiro.json`.
- **Pacote da série:** `motor/banco/series/explicadores/` (slug `demo-3d`, registrado em `motor/banco/index.ts`):
  - `sala.tsx` (sala do balde e peças reaproveitadas: ventilador, árvore), `ciclo.tsx` (casa em corte; campo `etapa` 0–10
    monta o aparelho; `sentido: -1` inverte o ciclo), `bancada.tsx` (analogias e o inversor), `banho.tsx`, `solar.tsx`,
    `inversor.tsx`, `pista.tsx` (pista molhada, carro com corte da roda, pedal suspenso, Zeca ao volante, etiquetas 3D),
    `abrigo.tsx` (quintal e terreno em corte; buraco, caixa de concreto, abóbada, canos, torre de cal, gerador, painel; os
    personagens são desenhados pelo próprio cenário, campo `gente`; `moradores.ts` tem a vizinha, o menino e a vovó).
    A lista de campos de cada cenário está no comentário do topo do arquivo.
  - `cartoes.tsx`, `cartoes-freio.tsx` e `cartoes-bunker.tsx`: gráficos, onda, ponte H, circuito, termômetro, barra roda × carro, chamadas finais.
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
