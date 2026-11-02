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
- [ ] **Publicando** (03/11/2026): a pessoa publica na sequência; falta capa, textos de publicação, hashtags (sugestão `#bunker #sobrevivencia` + as fixas) e NAS (`07-bunker/{final.mp4,roteiro.md,publicacao/}`)
