# Plano: marketplace `skills-motion-videos`

Base: skills do `bunker-stories` (2026-10-28). Melhorias trazidas do `stick-videos-v2` e do `stick-videos` (v1).

## Estrutura
- [x] `plugins/motion-videos/` com as 8 skills + skill `motor`, molde de série e molde de `CLAUDE.md`
- [x] `.claude-plugin/marketplace.json` e `plugins/motion-videos/.claude-plugin/plugin.json` (versão 0.0.0 até o 1º release)
- [x] README, CHANGELOG, `regras.md`
- [x] Exportações para ChatGPT fora do plugin (`extras/chatgpt/`)

## Motor dentro do plugin
- [x] Núcleo do motor do bunker em `motor/nucleo/`, sem `src/estudo`, benchmark Entre Andares e docs do projeto
- [x] Semente (`banco/index.ts`, catálogo, avulsas, `.gitignore`) criada uma vez no projeto
- [x] `bin/motion-videos-motor` (status, instalar, atualizar, diff) com manifesto de hashes e bloqueio de conflito
- [x] `sfx.py`, `mixar.py`, `masterizar.sh` no pipeline do motor (o `trailer.py` apontava para `.claude/skills`)
- [x] Capa com `hud: false` (v2)
- [x] Tags de áudio do Eleven v3/v4 no pipeline (v1, corrigido para tags de várias palavras)

## Generalizar
- [x] Scripts por `${CLAUDE_SKILL_DIR}` / `${CLAUDE_PLUGIN_ROOT}`; skills por `/motion-videos:<skill>`
- [x] Sem nomes de séries (o `validar.sh` confere)

## Melhorias de outras versões
- [x] v2: "Depois do recap, reaja ao gancho"; caminhos pela história no B5
- [x] Informação útil em 3 modos + texto do bunker
- [x] Duração (alvo/suave/rígido) e ritmo real da voz no molde da identidade
- [x] `zumbido` documentado, 67 sons
- [x] `teste-rig` antes da folha de ações

## Release
- [x] `scripts/release.sh` (valida, versão, CHANGELOG, commit, tag; sem push) e `scripts/validar.sh`
- [x] CI: validar, tag = versão, aviso de mudança não lançada

## Revisão

Verificado em projetos descartáveis (scratchpad):
- `instalar` → `npx tsc --noEmit` ok → `narrar.py --mudo` no exemplo → folha de cenas, MP4 1080×1920 h264, capa com `hud:false`.
- Legenda sem a tag `[whispers]`; `[leve]` continua dividindo trechos; Eleven v4 recebe a tag, v2 e VoiceStudio não.
- Som: `som.py` → `mixar.py` → `masterizar.sh` (−14,05 LUFS) → `trailer.py` com os scripts no pipeline.
- `atualizar`: conflito para tudo sem copiar nada; `--forcar` guarda backup; mudança local sem conflito fica; arquivo que saiu do núcleo é apagado; arquivo do projeto fica.
- `release.sh`: recusa versão menor e CHANGELOG vazio; caminho feliz faz commit + tag.
- `claude plugin validate` ok no marketplace e no plugin.

Pendente (decisão do criador):
- Commit e push deste repositório e o 1º release (`scripts/release.sh 0.1.0`).
- Migrar os três projetos para o plugin (skill `motor`, "Adotar").
- A composição `capa` põe o título em x ≈ 70, fora da coluna segura do iPhone (x 162–918).

# Plano: episódio "Montando um ar-condicionado do zero" (3D)

Roteiro aprovado: `tasks/roteiro-ar-condicionado.md` (58 batidas). Assets no pacote `demo-3d`; o que é reutilizável vai para o núcleo `src/v3d/`.

- [x] Núcleo: `cano.tsx` (cano por caminho + bolinhas que correm e mudam de cor por trecho), `CalorIndo` (hexágonos de A para B), ações novas do Zeca (abanando, coçando a cabeça, mão na testa, braços cruzados, mexendo)
- [x] Cenário `ciclo` (casa em corte): lata, evaporador, circuito fechado, condensador, compressor, capilar, dreno, termostato, inverter, caixas do split, tudo ligado por `etapa` e campos da cena
- [x] Cenário `bancada` (analogias): mão com álcool, panela de pressão, bomba de bicicleta, copo suando
- [x] Cartões 2D: gráfico de temperatura (serrote/reta), pico de corrente, conta de luz
- [x] `motor/exemplos/ar-condicionado/roteiro.json` (58 batidas)
- [x] Verificação: `tsc`, folha de cenas, render completo na GPU, conferir quadros

## Revisão (episódio do ar-condicionado)

- `tsc` ok; `narrar.py --mudo`: 58 batidas, 3:05 com os tempos simulados (a voz real decide o tempo).
- Render completo na RTX 5090: 5.586 quadros em 56 s. Folha conferida pelo quadro do meio de cada batida.
- Corrigido depois da primeira folha: chão sob a casa, cor das bolinhas encoberta pelo cano, rastros de ar virando
  placas perto da câmera, mão ilegível sob o vapor, enquadramentos (casa, capilar, evaporador, bomba, split).
- Pendências visuais: o capilar ainda lê como uma serpentina grande; as caixas do split são translúcidas e simples;
  o Zeca não aparece no plano geral da casa.

## Versão 2: história do sofá (pedido de 29/10)

- [x] Zeca sentado no sofá em todas as cenas da casa (`sentado+<ação>`), com suor quando o vento chega quente
- [x] Cenário `ciclo` refeito em volta do sofá: ventilador e balde (etapas 0 e 1) e a serpentina soprando no Zeca
- [x] Split montado no fim: evaporadora no alto da parede do fundo, condensadora em suporte na parede de fora, dois canos atravessando
- [x] Pontos fracos: capilar como fio fino com contas, caixas sólidas, Zeca no plano geral, close do evaporador com menos bolinhas
- [x] Texto narrado reescrito (`tasks/roteiro-ar-condicionado.md` v2) e `roteiro.json` gerado; aguarda aprovação do texto
- Verificação: `tsc` ok; render completo na 5090 em ~58 s; folha pelos quadros do meio de cada batida conferida

## Versão 3: abertura no calor, narração em "você" (pedido de 29/10)

- [x] Sem cold open: abre no close do rosto suando, com o vento quente batendo ("Ventilador não esfria o ar")
- [x] Sem nome e sem "tentativas": cada peça entra como o próximo passo; narração fala com "você"
- [x] Ganchos e viradas marcados no roteiro (10 pontos, um a cada 10–25 s)
- [x] Falas reescritas para soar faladas (frases curtas, tamanhos variados, sem as palavras proibidas)
- [x] Fatos conferidos de novo: ventilador, álcool, dreno, sensor do inverter, R-32 (F8–F11 novos). Saíram os números
      sem fonte ("2 horas", "água a 24 °C"); números de cena (36, 38, 23 °C) marcados como cena, não fato
- [x] Texto do `.md` e `roteiro.json` conferidos fala a fala (56 de 56 iguais); render na GPU e folha conferidos

# Plano: episódio 2, "Como o ar-condicionado esquenta a sala com o ar gelado da rua" (3D)

Texto aprovado em 30/10/2026 (v2: válvula com clique e peça que desliza; "traz quase 3 de calor").

- [x] Núcleo: `fundo` do cenário pode depender da cena; personagem com `cobertor` (0..1) e `bafo` (vapor da respiração); ação `tremendo`
- [x] `ciclo.tsx`: `inverno` (céu cinza, grama apagada, árvores sem folha, flocos azuis na sala, ar frio entrando)
- [x] `ciclo.tsx`: válvula reversora de 4 vias (`valvula` 0..1, peça deslizando no corte, clique do solenoide). Com a
      válvula, o compressor sempre empurra no mesmo sentido e só o resto do circuito inverte (física certa)
- [x] `ciclo.tsx`: `sentido` animável (as bolinhas param e voltam sem pular); `geada` 0..1 na serpentina de fora,
      `degelo` (pingos e vapor), `ventFora` 0..1 (ventilador de fora parando)
- [x] `bancada.tsx`: `aquecedor` (resistência acendendo) e `chuveiro` (com uma condensadora pequena ao lado)
- [x] `cartoes.tsx`: `comparacao` (1 kWh → 1 contra 1 kWh → ~2,7) e `rendimento` (rendimento × temperatura, com a linha da resistência)
- [x] `motor/exemplos/bomba-de-calor/roteiro.json` (25 batidas, `"episodio": 3`), conferir falas com o `.md`
- [x] Rascunho mudo, render na GPU, quadro do meio de cada batida, ajustes
- [x] Voz, som, mix e master: `~/Videos/bomba-de-calor-3d-final.mp4` (1:32, −14,07 LUFS, −2,66 dBTP). Falta a pessoa ouvir

## Revisão (rascunho mudo do episódio 2)

- `tsc` ok; `narrar.py --mudo`: 25 batidas, 1:31 com tempos simulados; render na RTX 5090 (2.725 quadros).
- Falas do `.md` e do `roteiro.json`: 25 de 25 iguais (o `roteiro.json` é gerado a partir da tabela do `.md`).
- Física: com a válvula, os canos do compressor nunca invertem (descarga sempre vermelha, sucção sempre branca); só os
  lados das serpentinas trocam. A serpentina de dentro e o capilar invertidos agora mudam de cor no sentido certo.
- Corrigido depois da 1ª folha: solenoide atrás da válvula (o corte mostra a peça), etapa 8 sem a placa do inverter
  na frente, câmeras que atravessavam a parede (10, 20, 23), gola do cobertor, close do aquecedor, cartão e vapor do chuveiro.
- Rascunho: `~/Videos/bomba-de-calor-3d-rascunho-mudo.mp4`. Falta: a pessoa ver as imagens, depois voz, som, mix e master.

# Plano: episódios 3 (chuveiro) e 4 (energia solar), texto (pedido de 30/10)

Rumo aprovado: chuveiro → bomba de calor (precisa de tanque) → boiler com resistência de apoio → aquecedor solar
por termossifão; fim com votação: geladeira ou placa solar. Episódio 4: placa (CC) → rede e créditos → inversor
→ caixas e ligações → híbrido (bateria) → off-grid (gerador) → anti-ilhamento.

- [x] Pesquisa de fontes dos dois episódios (dois agentes em paralelo)
- [x] `tasks/roteiro-chuveiro.md` (28 batidas, ~2:00): escada, ganchos, tabela de cenas, fontes, assets
- [x] `tasks/roteiro-energia-solar.md` (29 batidas, ~2:10): idem
- [x] Aprovação do texto em 30/10/2026 (episódio 3 v3, com os dois canos e o misturador; episódio 4 v2)
- [x] Episódio 3: cenário `banho` (casa em corte com banheiro, área de serviço, caixa-d'água, boiler, aquecedor solar),
      `exemplos/chuveiro/roteiro.json` (31 batidas, `"episodio": 4`), rascunho mudo e folha conferidos
- [x] Episódio 3: voz, som, mix e master (`03-chuveiro/final.mp4`, 2:03, −14,14 LUFS); fim sem a geladeira, puxando o episódio 4
- [x] Episódio 4: cenário `solar`, personagem `eletricista`, cartão `onda`, `exemplos/energia-solar/roteiro.json` (29 batidas, `"episodio": 5`), rascunho mudo
- [x] Episódio 4 (v3, corrente de problemas e soluções): voz, som, mix, master, capa e textos no NAS (`04-energia-solar/`, 1:39, −14,12 LUFS)

- [x] Roteiro do episódio 5 (inversor por dentro): `tasks/roteiro-inversor.md`, aguardando aprovação
- [x] Textos de publicação: episódios 1, 2 e 3 (o 3 com capítulos provisórios); 4 e 5 quando forem renderizados

- [x] Episódio 5 (inversor, v3): cenário `inversor` (bancada), cartões `ponteh`, `circuito`, `aguenta` e modos novos do `onda`; voz, som, master, capa e textos no NAS (`05-inverters/`, 2:28, −14,09 LUFS)

# Plano: episódio 6, freio (tambor, disco e ABS) (pedido de 02/11/2026)

Texto aprovado em 02/11/2026 (`tasks/roteiro-abs.md` v1, 26 batidas, só a parte 1; ESC/EBD/AEB ficam de fora).

- [x] Pesquisa de fatos (dois agentes), fontes e limites no `.md`
- [x] Cenário `pista` (`pista.tsx`): asfalto molhado, chuva, carro com corte da roda (tambor, disco, pinça, sensor, controlador), figurantes
- [x] Cartões `fita` (rebobinar), `termometro`, `roda` (barra roda × carro) em `cartoes-freio.tsx`
- [x] `tasks/geradores/abs.py` → `motor/exemplos/abs/roteiro.json` (`"episodio": 7`), falas iguais ao `.md`
- [ ] Rascunho mudo, render na GPU, quadro do meio de cada batida, ajustes
- [ ] Voz, som, mix e master (a pessoa ouve)
- [x] Voz, som, mix e master do episódio 6 (freio): 1:26, −14,12 LUFS, −2,69 dBTP; aprovado pela pessoa em 02/11/2026
- [x] Capa, textos de publicação e NAS: `Videos Curtos/Educacionais/06-freio/{final.mp4,roteiro.md,publicacao/{capa.png,textos.md}}`
- [ ] Pendências da pessoa: aprovar hashtags (#freioabs #carros), definir data e horário, revisar legenda e descrição
- [ ] Ideia dela: versão mais calma (voz 1,0× e/ou frases extras em óleo/sapatas/sensor); ESC, EBD e AEB em outro episódio

# Plano: episódio 8, bunker (pedido de 03/11/2026; um episódio só, teto 2:40)

- [x] Pesquisa de fatos e fontes (CO₂, monóxido, peso da terra, concreto armado, abóbada, cal sodada, água)
- [x] `tasks/roteiro-bunker.md` v3: 31 batidas em um episódio, sem a água (gancho do próximo), com a caixa que flutua; texto aprovado em 03/11/2026
- [x] Cenário `abrigo` (`abrigo.tsx`), moradores (`moradores.ts`), cartões `peso`, `forcas`, `gas`, `cal`, `perguntaFinal` (`cartoes-bunker.tsx`), registro em `index.tsx`
- [x] `tasks/geradores/bunker.py` → `episodios/bunker/roteiro.json` (`"episodio": 8`); `npx tsc --noEmit` limpo
- [x] Rascunho mudo: 31 batidas, ≈ 2:27 estimado (teto 2:40); bunker 3,6 m de vão, parede que engrossa para fora, sala do gerador
- [x] Render conferido (quadro do meio de cada batida em `motor/out/q/folha1..5.png`, recortes dos cartões de painel em `motor/out/cartoes/`) e ajustes de visual (3 rodadas)
- [x] Visual aprovado; voz (ElevenLabs), som, mix e master: 1:59, −14,12 LUFS, −2,37 dBTP (`motor/out/final-bunker.mp4`); a pessoa aprovou em 03/11/2026 ("ficou muito bom")
- [x] Ajustes finais: gerador em sala fechada com cano de escape (chapéu para cima), painel solar de frente, sala extra com água e comida, fecho "apocalipse nuclear" (risada) e chamadas "curta, comente, compartilhe, siga"
- [x] Capa, textos de publicação (`tasks/publicacao/bunker-textos.md`), hashtags `#bunker #sobrevivencia` aprovadas e NAS `07-bunker/` (03/11/2026)
- [ ] **Publicando**: a pessoa posta quando sentir, sem data fixa

# Plano: episódio 12, procissão (pedido de 04/11/2026)

- [x] Pesquisa em `pesquisa/procissao/` e texto aprovado; fatos conferidos (quatro procissões da missa, tapete, vela do batismo); "geralmente quatro" mantido com aviso na tela
- [x] `tasks/roteiro-procissao.md` (30 batidas), decisões: Sagrado Coração, cidade do interior, Caramelo no adro, fim com envio e "siga"
- [x] Cenário `procissao` (`procissao.tsx`), pessoas (`fieis.ts`), registro em `index.tsx`, gerador `tasks/geradores/procissao.py`
- [x] Rascunho, quadros de conferência, voz (ElevenLabs), som, mix e master: `episodios/procissao/final.mp4` (2:12, −14,0 LUFS, −2,3 dBTP)
- [x] A pessoa assistiu e aprovou (03/11/2026, horário de Brasília)
- [x] Capa, textos, NAS `11-procissao/`, publisher (vídeo 21:25 BRT, story "já saiu" 21:27 BRT; sem story de aviso)
- [ ] Conferir no perfil `curiosidades_desenroladas` que o vídeo e o story saíram na conta certa; simulação do iPhone e hashtags `#procissao #tradicao` pendentes

# Plano: roteiros novos em rascunho (pedido de 04/11/2026)

Ranking em `tasks/ranking-temas.md`. Só texto (`tasks/roteiro-<tema>.md`, v1 rascunho): sem assets, voz, render nem gerador. A pessoa ajusta um a um ao lançar.

- [x] 1 Panela de pressão (`tasks/roteiro-panela-de-pressao.md`, **v2** em 04/11/2026: 27 batidas, ~370 palavras, corrente de 14 degraus, revelação na batida 20)
- [x] 2 Elevador (`tasks/roteiro-elevador.md`, 22 batidas, ~1:55–2:10, revelação na batida 17)
- [x] 3 Para-raios (`tasks/roteiro-para-raios.md`, 21 batidas, ~2:00–2:10, revelação na batida 12)
- [x] 4 Avião (`tasks/roteiro-aviao.md`, 20 batidas, ~1:55–2:10, revelação na batida 16)
- [x] 5 Descarga do vaso (`tasks/roteiro-descarga.md`, 20 batidas, ~1:55–2:05, revelação na batida 15)
- [x] 6 Hidrelétrica (`tasks/roteiro-hidreletrica.md`, 25 batidas, ~2:00–2:15, revelação na batida 18)
- [ ] 7 a 13 (submarino, cadeado, zíper, paraquedas, ponte, relógio, farol): próximo lote

# Plano: episódio 13, panela de pressão, rascunho mudo (pedido de 04/11/2026)

- [x] Cenário `panela` (`panela.tsx`, registrado em `index.tsx`), gerador `tasks/geradores/panela-de-pressao.py`, `episodios/panela-de-pressao/roteiro.json` (**v2**: 27 batidas, `"episodio": 13`)
- [x] Render mudo v2 `episodios/panela-de-pressao/rascunho-mudo.mp4` e 3 rodadas de conferência por quadros do vídeo
- [ ] Pessoa aprova o texto; depois voz, som, mix, capa, textos e publicação (não feitos de propósito)

# Plano: episódio 14, elevador, rascunho mudo (pedido de 04/11/2026)

- [x] Cenário `elevador` (`elevador.tsx`, registrado em `index.tsx`), gerador `tasks/geradores/elevador.py`, `episodios/elevador/roteiro.json` (22 batidas, `"episodio": 14`)
- [x] Render mudo `episodios/elevador/rascunho-mudo.mp4` e rodadas de conferência por quadros
- [ ] Pessoa aprova o texto; depois voz, som, mix, capa, textos e publicação (não feitos de propósito)

# Plano: episódio 15, para-raios, rascunho mudo (pedido de 04/11/2026)
- [x] Cenário `pararaios` (`pararaios.tsx`, registrado em `index.tsx`; `Auto` exportado de `pista.tsx` com `vidroOp`), gerador `tasks/geradores/para-raios.py`, `episodios/para-raios/roteiro.json` (21 batidas, `"episodio": 15`)
- [x] Render mudo `episodios/para-raios/rascunho-mudo.mp4` e conferência por quadros

# Plano: episódio 16, avião (asa + fuselagem + turbina + cauda + comandos + flap + cabine + janela), UM vídeo, rascunho mudo v3 (rodada 2, 04/11/2026)
- [x] Roteiro v2 (`tasks/roteiro-aviao.md`: 25 batidas, ~478 palavras, seção "Votação" atualizada: estol, mito e penas de volta, turbulência com homenagem ao Lito, comandos em seção mega curta); parte 2 (`roteiro-aviao-2.md`) marcada como absorvida
- [x] Cenário `aviao` (`aviao.tsx`, registrado em `index.tsx`), gerador `tasks/geradores/aviao.py`, `episodios/aviao/roteiro.json` (25 batidas, `"episodio": 16`)
- [x] Render mudo `episodios/aviao/rascunho-mudo.mp4` (~2:44) e conferência por quadros
- [ ] Pessoa aprova o texto; depois voz, som, mix, capa, textos e publicação (não feitos de propósito)

# Plano: episódio 17, descarga do vaso sanitário, rascunho mudo (pedido de 04/11/2026)
- [x] Cenário `banheiro` (`banheiro.tsx`, registrado em `index.tsx`), gerador `tasks/geradores/descarga.py`, `episodios/descarga/roteiro.json` (20 batidas, `"episodio": 17`)
- [x] Render mudo `episodios/descarga/rascunho-mudo.mp4` e conferência por quadros do vídeo (rótulos e cartões em tamanho real)
- [ ] Pessoa aprova o texto; depois voz, som, mix, capa, textos e publicação (não feitos de propósito)

## Panela de pressão (ep 13): AGENDADO (05/11/2026)

- [x] Final aprovado (1:47,9), pasta `12-panela-de-pressao/` no NAS com `publicacao/` (capa, story-horario, story-ja-saiu, textos.md)
- [x] Publisher (série `educativos`, número 12): vídeo `9658abe16004ac754cada1be3edc0d0e` sex 06/11 18:00Z (15:00 BRT; slots diários); story horário `065669bac8b64600b92ca85f2850f68d` 16:30Z (arte "Hoje às 15h"); story já saiu `1515ce9dba39f68b613bf13784437c27` 18:01Z. **Status: agendado 06/11 18:00Z.**

## Elevador (ep 14): final e agendamento (05/11/2026)
- [x] Voz ElevenLabs (cache reaproveitado na segunda passada), som, render, mix e master: 2:18,4, -14,0 LUFS, -2,9 dBTP, `episodios/elevador/final.mp4`
- [x] Gerador `tasks/geradores/elevador.py` passou a usar o tempo real das palavras/batidas (câmeras por tempo das batidas 2 e 15, curva da batida 8)
- [x] Pacote `episodios/elevador/publicacao/` e cópia no NAS `13-elevador/` (cmp ok)
- [x] Agendado 07/11 13:00Z (sáb 10:00 SP; remanejado, slots diários): vídeo `8b912604280ef3f7f7756c44e66ff290`, story horário 07/11 10:00Z (arte "Hoje às 10h") `c7c862326b288e69d05f6b7d799a4293`, já saiu 13:01Z `e9820ebbb817ee367df8faaed46c9e5d` (os 3 'pending')
- [ ] A pessoa ouvir a voz (pronúncia de "décimo quarto" e "catorze") e aprovar `#curiosidades #engenharia`

## Avião (ep 16): finalizado e agendado (05/11/2026)
- [x] Voz ElevenLabs, som, render, master (2:07,4; −14,1 LUFS; −2,9 dBTP), NAS 15-aviao, pacote de publicação
- [x] Agendado 08/11 23:00Z (dom 20:00 SP; remanejado) (vídeo `445cc98d1208bbc7caabaed9f0014377`, release `e20e8009cb30b01b7de79bb45e4e0f28`); story horário 08/11 20:00Z (17:00 SP, arte "Hoje às 20h") release `0200d92e278d9170e3ad6ae66afb5a17`; story já saiu 23:01Z release `0d02f5dd71383f1e91fe770b6f31efb9` (3 releases pending)
- [ ] Pessoa ouve a pronúncia de "estol" (STT ouviu "stall") e aprova hashtags `#aviacao`

## Submarino (ep 19, pasta 18-submarino): finalizado e agendado (05/11/2026)
- [x] Voz ElevenLabs (1 pedido, 988 créditos), som, render, master: `episodios/submarino/final.mp4` (2:08,0; −14,1 LUFS; pico −2,9 dBTP); NAS `18-submarino/` (final.mp4, roteiro.md, publicacao/; rascunho-mudo mantido; cmp ok)
- [x] Gerador `tasks/geradores/submarino.py` agora lê os tempos reais de `ep19/episode.json` (palavras e durações)
- [x] Pacote `episodios/submarino/publicacao/` (capa quadro 215, story-horario, story-ja-saiu, textos.md); título "Como pegar o chinelo no fundo do lago sem molhar o cabelo?"; hashtags `#curiosidades #oceano` (novas, precisam de aprovação)
- [x] Agendado 09/11 22:40Z (seg 19:40 SP; remanejado): vídeo `95baa1d5d8a0eabbbacd794675393135` (release `f7d000f750d81edd962b5bc8a6f6aab2`); story horário 09/11 19:40Z (arte "Hoje às 19h40") `35b98fe6b7b74c996bc768fe38abd666` (release `96d85d488fe8ae99af0e1b594d6db566`); story já saiu 22:41Z `5f733105e302064d6de05f7638818d27` (release `9d42623e7aa60b6ea629615482b7433e`); os 3 'pending'
- [ ] A hidrelétrica (outro agente) deve ficar em sex 13/11; conferir que o gancho dela puxa o submarino
- [ ] Pessoa ouve o vídeo e aprova `#oceano`

- [x] Hidrelétrica (ep 18) produzida e AGENDADO 09/11 15:20Z (seg 12:20 SP; remanejado): vídeo `0114e1a75aeda97d60995a93e9934b3d` (release `02e739d6e799ea7be1c62c936dd37b1f`), story horário `9f27ba5bda3fa12c0811b446a52ade7b` (09/11 12:20Z, arte "Hoje às 12h20", release `b0a10ec9bd56d241a4ed8904334a3681`), story já saiu `c99f49e3b6ee2911feac50a9422db259` (15:01Z, release `887475180d866da8355b2b6813fbd630`); os 3 pending. Final 2:10,8, −14,06 LUFS, −2,86 dBTP; NAS `17-hidreletrica/`. Descarga sem slot reservado (aguarda aprovação).

- [x] `para-raios` finalizado e AGENDADO 10/11 22:25Z (ter 19:25 SP; remanejado) (06/11/2026): vídeo `daf03310ae89f01b71b18a7631eb52e2`, story horário `594a5c777a81b6f8aa78bd3fa3a2440e` (10/11 19:25Z, 16:25 SP, arte "Hoje às 19h25"), story já saiu `1410249ffa0601015adc99421924eedf` (21:01Z); 3 releases pending; pacote em `episodios/para-raios/publicacao/`, NAS `14-para-raios/`.

## Cadeado (ep 20): AGENDADO (06/11/2026)
- [x] Pacote `episodios/cadeado/publicacao/` (capa, story-horario "Hoje às 6h55", story-ja-saiu, textos.md) e NAS `19-cadeado/publicacao/` (cmp ok); simulação do iPhone rodada
- [x] Publisher (série `educativos`, número 18): vídeo `9989eb2c5ec57eff212b0b1b59f0941a` ter 10/11 09:55Z (06:55 SP); story horário `ee1fe7eb83fa84ba99c26046f7230d83` 06:55Z; story já saiu `6243b9623fa3ce77f4fdfd78e255f1e8` 09:56Z. **Status: agendado 10/11 09:55Z (ter 06:55 SP; teaser 06:55Z "Hoje às 6h55"; remanejado)** (plano: vídeo on_plan, preenchido; 3 releases pending)
- [ ] A pessoa aprovar `#curiosidades #seguranca`; decidir sobre o gancho do zíper e a ordem (submarino promete o cadeado)

## Zíper (ep 21): finalizado e agendado (08/11/2026)

- [x] Voz ElevenLabs em 1 pedido (2527 caracteres), falas sem mudança; STT ouve "Você está atrasado" inteiro; gerador `tasks/geradores/ziper.py` agora lê os tempos reais de `ep21/episode.json` (com fallback para a estimativa)
- [x] Som (63 efeitos, sem ambiência), render, mix e master: `episodios/ziper/final.mp4` (2:16,8, −14,0 LUFS, pico −2,75 dBTP); sem piscadas na varredura quadro a quadro
- [x] Pacote `episodios/ziper/publicacao/` (capa quadro 132, story-horario "Hoje às 12h05", story-ja-saiu, textos.md); NAS `20-ziper/` (cmp ok)
- [x] **agendado 10/11 15:05Z** (ter 12:05 SP; teaser 12:05Z "Hoje às 12h05"; remanejado), número 19, série `educativos`: vídeo `e5fcce86ac597cfd2d6185d2bb99ea89` (release `8bd0a13d6e3facf0e8c7e3b9fb8aa8c5`, capa por set_content_cover, vídeo on_plan), story horário `a40ecf9425e136c8d50d3bea68230017` (release `0563d2e7cb753e3ca271ecdc858d4dae`, 12:05Z), story já saiu `8a967689efc84df0e1829de31d4d74c0` (release `34841b31a8ee68631c9fc1345dc7c035`, 15:06Z); 3 releases pending
- [ ] Pendências: hashtag nova `#invencoes`; o gancho final promete o paraquedas (não agendado ainda); "Sundbäck" soa como "Sandbeck"

## Agendado 08/11/2026 (descarga e farol)
- descarga: seg 09/11 10:10Z (remanejado; teaser 07:10Z "Hoje às 7h10"; vídeo `2c188c35b598793c91691e94d010a442`, número 20), já saiu 10:11Z; ids antigos: `00cfcd87448a1b546387c4ea6f981efd`, já saiu 12:01Z `7d2081653f9f330359ca1b6f80836362`.
- farol: qui 12/11 10:05Z (remanejado; teaser 07:05Z "Hoje às 7h05"; vídeo `7b6be793063fa4dce239f97ab0c6bf00`, número 21), ids: `f12a2d4448e2a5f8cecdba1e804c1d7f`, já saiu 15:01Z `47a08f816e737ea73b90ba44aeab13a7`.

## Relógio (ep 24, pasta 23-relogio): finalizado e agendado (08/11/2026)
- [x] Voz ElevenLabs: 1º pedido deixou o "Você" cortado ("Vê chegou"); regerada com `falante: abertura` (batida 1 à parte + b02-17, 938 créditos informados no b02-17). Falas sem mudança. STT ouve tudo certo (âncora, espiral, regulador, rubis, coroa)
- [x] Gerador `tasks/geradores/relogio.py` lê os tempos reais de `ep24/episode.json` (só com `narration.wav`; reserva = estimativa); tique-taque 0,05 em loop com fade só nas batidas 8-14, cliques baixos nas engrenagens
- [x] Final `episodios/relogio/final.mp4`: 2:14,0, −14,1 LUFS, pico −2,85 dBTP; sem piscadas na varredura quadro a quadro; NAS `23-relogio/` (cmp ok) com `publicacao/` (capa quadro 150, story-horario "Hoje às 19h50", story-ja-saiu, textos.md)
- [x] **agendado 11/11 22:50Z (qua 19:50 SP), número 24**: vídeo `04e71788b65334bb852e3d171ab3d70c` (release `a1828bb8b71d0c0f59b97a5789f057b6`), story horário `0f394e147b31cb4497f4e6ef22a32032` (release `896cd8dde97ee9f6c8da23506ff9037c`, 19:50Z), story já saiu `69bdc3640c215e0d41ed780d94cc1909` (release `78d13dc47032d39f417de33befdfa13b`, 22:51Z); 3 pending
- [ ] Pendências: hashtag nova `#mecanica`; gancho final puxa o farol (qui 12/11 07:05 SP; comentário diz "amanhã cedo")

## Paraquedas e ponte: finalizados e agendados (08/11/2026)
- [x] `paraquedas` (ep22, NAS `21-paraquedas/`): voz do cache (0 crédito), final `episodios/paraquedas/final.mp4` (2:23,3, −14,0 LUFS, pico −2,6 dBTP), pacote `publicacao/` (capa quadro 150). **AGENDADO qua 11/11 10:20Z (07:20 SP; teaser 07:20Z "Hoje às 7h20", já saiu 10:21Z)**, número 22: vídeo `f7e4f9af68d7ac3963d6fec25ddd7125` (release `e2969d877de07c6fb7720ea8efa1e0cb`), story horário `ce46db66fc6ad09585ef41400fab023d` (release `79f833f3b3ee702c16deadd82fc721b6`), story já saiu `7b34cd1574852d89440110d4ff002284` (release `337aab8635fd631253e62d87db16c61c`). Hashtag nova `#gravidade` (aprovar).
- [x] `ponte` (ep23, NAS `22-ponte/`): voz nova, 1 pedido de 2635 caracteres (~2.600 créditos); `tasks/geradores/ponte.py` passou a ler os tempos reais de `ep23/episode.json`; final `episodios/ponte/final.mp4` (2:23,2, −14,0 LUFS, pico −2,8 dBTP), capa quadro 400. **AGENDADO qua 11/11 15:15Z (12:15 SP; teaser 12:15Z "Hoje às 12h15", já saiu 15:16Z)**, número 23: vídeo `e0f3093d6a703f82b2caf3fc484f7779` (release `eebda5cfa55146f74f83342ba8220295`), story horário `816c68273ccb74c5993ee634be52ce6f` (release `5d0fb7b1546f2696f7e01e19d907ae73`), story já saiu `aa97ba63589d6d32721e500675c766a3` (release `c5f2abdb094315d9ddf87c3c2e8b7679`). Gancho: relógio (qua 11/11 19:50 SP). Hashtag `#engenharia` (aprovar).
