# Roteiro: "Como montar uma panela que cozinha feijão em minutos?" (explicador 3D, rascunho)

**Versão 1, rascunho, aguardando ajustes da pessoa** (04/11/2026). Mesmo molde dos episódios 9, 10 e 11: a pessoa monta o aparelho peça
por peça, sem dizer o que é; **o nome "panela de pressão" só aparece na batida 15**, nas falas, nos rótulos, na capa e nos textos de
publicação. Antes disso a peça é só "panela" e "tampa", e cada peça nova é dita pelo que faz (borracha, peso, saída de reserva, trava).

21 batidas, ~275 palavras: deve ficar perto de **1:45 a 1:55** com a voz a 1,2× (teto da série: 3 min, alvo 2:40; sobra folga, veja "Se sobrar
tempo"). Estimativa feita pela referência da série (cerca de 2,8 palavras por segundo com pausas), a confirmar com a voz.

Regras que valem (de `tasks/lessons.md`): abre em movimento com risco, "você" no imperativo, personagem sem nome (id `zeca`), palavras do dia a
dia (o nome técnico só no rótulo), vitória até ~30 s, **sem normas**, todo fato com fonte ou "cena", a fala fala do assunto e nunca do método,
o vídeo ensina a **construir** (não a operar: nada de tempo de cozinha, quanto encher, como abrir depois), **peça só aparece quando a fala a
introduz**, escala real ao lado do `zeca`, fim pede envio e puxa o próximo.

**A corrente:** panela fechada na marra, fogo no máximo → *mas* o vapor foge pelas frestas e a água não passa de 100 graus (feijão duro) →
borracha na borda → vapor preso vira pressão e a água ferve mais quente (vitória: feijão em minutos) → *mas* a pressão não para de subir e a
tampa voa (e Papin, 1679, as primeiras explodiam) → furo na tampa tapado por um peso → *mas* o furo entope → saída de reserva → *mas* dá para
abrir com pressão lá dentro → trava → **panela de pressão**.

## Ganchos e viradas

| s (aprox.) | Batida | Tipo | O que prende |
|---|---|---|---|
| 0 | 1 | gancho | panela fechada na marra, fogo no máximo, a tampa treme (vai voar?) |
| 5 | 2 | virada | o vapor foge e a água não passa de 100 graus, feijão duro |
| 17 | 4 | virada | o vapor preso vira pressão |
| 24 | 6 | impacto | a água ferve mais quente, uns 120 graus |
| 28 | 7 | vitória | o feijão amolece em minutos (barras: comum × fechada) |
| 33 | 8 | virada | a pressão não para de subir e empurra a tampa |
| 38 | 9 | impacto | a tampa voa e fura o teto (laço do gancho fechado) |
| 43 | 10 | virada | em 1679 já era assim: as primeiras explodiam |
| 51 | 11 | solução | furo na tampa tapado por um peso |
| 60 | 12 | virada | o furo entope: segunda saída |
| 68 | 13 | virada | e se você abrir com pressão lá dentro? jato de vapor |
| 76 | 14 | solução | trava: só abre quando a pressão acaba |
| 81 | 15 | **revelação** | "você acabou de inventar a panela de pressão" |
| 98 | 19 | gancho | manda pra quem…; siga pra descobrir |

## A escada

| # | Solução | …mas | Princípio que fica |
|---|---|---|---|
| 1 | Tampa presa com força, fogo no máximo | o vapor foge pelas frestas e a água aberta não passa de 100 graus | **com a água aberta, mais fogo só faz mais vapor, não água mais quente** |
| 2 | Borracha na borda da tampa | a pressão não para de subir e empurra a tampa | **vapor preso = pressão; com pressão, a água ferve mais quente e o feijão amolece rápido** |
| 3 | Furo na tampa tapado por um peso | o furo pode entupir | **o peso levanta quando passa da conta e deixa o excesso sair: a pressão fica no ponto** |
| 4 | Segunda saída (reserva) | dá para abrir a tampa com pressão lá dentro | **se a primeira trancar, a segunda alivia** |
| 5 | Trava na tampa | (fecha a corrente) | **com pressão dentro, a tampa não abre** |

## Linguagem visual

- **Cenário:** a **cozinha dos episódios 9, 10 e 11** (`cozinha-base.tsx`, `cozinha-fogao.tsx`): fogão a gás com a boca acesa, bancada, teto
  baixo visível (para o furo). O fogão a gás já existe. Peças novas listadas em "Assets 3D que faltam".
- **Escala (regra do ep. 9):** o `zeca` tem ~1,7 m; a panela é de tamanho de verdade (cerca de 22 cm de diâmetro, **cena**), a tampa, a borracha,
  o peso (~3 cm) e a trava são pequenos e aparecem em **lupas** (zoom em círculo) e em raio-X, nunca do tamanho da cozinha. Panela sempre
  em primeiro plano, `zeca` na borda do quadro ou fora dele, câmera ≥ 45% da largura nas batidas que explicam uma peça.
- **Abertura (batida 1), em movimento:** câmera na **frente** do `zeca`, que prende a tampa com as duas mãos e abre um passo para trás; fogo no
  máximo, a tampa treme, vapor assobia pelas bordas. Sem flash-forward: o teto sem furo está acima.
- **Batida 2:** termômetro 3D dentro da água marcando 100, a agulha parada mesmo com a chama grande; o vapor escapa pelas frestas como setas
  brancas; relógio ao lado em 1 h; feijão duro numa colher. Rótulo 100 °C.
- **Batidas 3–6:** corte da panela (raio-X): o aro de borracha (cor própria) assenta entre a panela e a tampa e o vapor fica preso (setas voltam).
  Medidor de pressão como ponteiro (de **cena**, sem escala em número). Termômetro sobe de 100 até ~120. Rótulos BORRACHA · PRESSÃO.
- **Batida 7 (vitória):** feijão amolece na colher; cartão `comparacao` com duas barras: PANELA COMUM (comprida) e PANELA FECHADA (um terço),
  barras **de cena**; sem número na tela além de "em minutos".
- **Batidas 8–9:** o ponteiro vai ao vermelho, a tampa estufa, as travas do aro esticam; o `zeca` se abaixa; a tampa dispara, fura o teto (buraco
  limpo, estilizado), chove feijão na cozinha; o `zeca` coberto de feijão, `surpreso`/`sorriso` (nunca `triste` por padrão). Sem machucados.
- **Batida 10:** vinheta curta de 1679: sala de pedra, mesa de madeira, panela de ferro espessa com tampa presa por barra; cartão `ano` 1679; a
  panela estufa e estoura de lado (sem gente por perto). O texto "DENIS PAPIN" aparece no cartão.
- **Batida 11:** lupa na tampa: um furo; um peso cilíndrico assenta em cima; a pressão passa da conta, o peso levanta, chia, o vapor sai e o
  peso assenta de novo. Rótulo PESO.
- **Batida 12:** o furo entupido por um grão de feijão (cinza); a pressão sobe; um segundo plugue (cor própria) se abre e solta o vapor. Rótulo
  RESERVA.
- **Batida 13:** o `zeca` gira a tampa para abrir; jato de vapor sai pela fresta na direção da mão, ele recua (estilizado, sem queimadura).
- **Batida 14:** em raio-X, um pino sobe com a pressão e prende a tampa à borda; ao fim da pressão ele desce e a tampa solta. Rótulo TRAVA.
- **Revelação (batida 15):** as peças piscam com rótulos (BORRACHA, PESO, RESERVA, TRAVA); o título sobe.
- **Fim (batidas 19–21):** panela inteira na bancada, vapor suave pelo pino; o ponto de interrogação sobe e vira a geladeira (gancho). Chamadas.
- **Rótulos 3D:** curtos (1 a 2 palavras), medidos pelo texto, dentro da coluna segura (x 162–918 de 1080), conferidos em três momentos, com o
  `etiqK` conferido no vídeo final (lessons.md).

## Tabela de cenas

`*palavra*` = destaque amarelo, `_palavra_` = vermelho. `[leve]` divide os trechos da batida.
Tags do ElevenLabs só nos ganchos e viradas.

| # | Fala | Tela | Pessoa | Cartões |
|---|---|---|---|---|
| 1 | [excited] Panela *fechada* na marra, [leve] fogo no máximo: [leve] a tampa _treme_. | Cozinha; o `zeca` prende a tampa com as duas mãos e se afasta; chama grande; a tampa vibra, vapor assobia pelas bordas; o teto liso acima. | animado | — |
| 2 | [curious] Mas o vapor _foge_ pelas frestas [leve] e a água não passa de *100 graus*. [leve] O feijão continua duro. | Termômetro na água parado em 100; setas de vapor saem pelas frestas; relógio em 1 h; colher com feijão duro. | decepção | rótulo 100 °C |
| 3 | Então tape as frestas [leve] com uma *borracha* [leve] em volta da tampa. | Corte: o aro de borracha assenta na borda; o vapor não sai mais. | eureka | rótulo BORRACHA |
| 4 | [curious] Agora o vapor fica _preso_ [leve] e empurra tudo: [leve] é a *pressão*. | Setas voltam e empurram as paredes; ponteiro de pressão sobe. | surpreso | rótulo PRESSÃO |
| 5 | Com a pressão em cima, [leve] a água custa a virar vapor [leve] e precisa de mais *calor*. | Lupa na superfície: bolhas empurradas de volta pelas setas; só sobem quando a chama aperta mais. | satisfeito | — |
| 6 | [amazed] Ela ferve mais *quente*: [leve] uns _120 graus_. | Termômetro passa de 100 e sobe até ~120; água em ebulição forte. | animado | rótulo 120 °C (cena: ~) |
| 7 | [excited] E o feijão amolece em *minutos*, [leve] não em uma hora. | A colher afunda no feijão macio; barras PANELA COMUM (comprida) e PANELA FECHADA (um terço). | comemorando | barras COMUM · FECHADA (de cena) |
| 8 | [curious] Mas a pressão _não para de subir_ [leve] e empurra a tampa. | Ponteiro no vermelho; a tampa estufa; o aro estica; o `zeca` olha de lado e se abaixa. | medo | — |
| 9 | [excited] E a tampa _voa_ [leve] e fura o *teto*! | A tampa dispara, fura o teto; chove feijão; o `zeca` coberto, boca aberta. | surpreso | — |
| 10 | [curious] Já em *1679*, [leve] o francês Denis Papin fez uma assim. [leve] E ela _explodia_. | Sala de pedra, panela de ferro com tampa presa por barra; estufa e estoura de lado, ninguém perto. | curioso | ano 1679 · DENIS PAPIN |
| 11 | A saída dele: [leve] um *furo* na tampa [leve] tapado por um *peso*. [leve] Passou da conta, [leve] o peso levanta [leve] e o vapor _sai_. | Lupa: furo e peso; o peso sobe, chia, volta a assentar. | eureka | rótulo PESO |
| 12 | [curious] Mas o furo _entope_ com a comida. [leve] Faça uma *segunda saída*, [leve] que abre se a primeira trancar. | Grão de feijão entope o furo; pressão sobe; um segundo plugue abre e solta vapor. | decepção, depois alívio | rótulo RESERVA |
| 13 | [curious] E se você _abrir_ a tampa [leve] com pressão lá dentro? | O `zeca` gira a tampa; jato de vapor na direção da mão; ele recua. | medo | — |
| 14 | Então *trave* a tampa: [leve] só abre quando a pressão _acaba_. | Raio-X: o pino sobe com a pressão e prende a tampa; a pressão cai, o pino desce, a tampa solta. | eureka | rótulo TRAVA |
| 15 | [amazed] Parabéns! [leve] Você acabou de inventar a *panela de pressão*! | As peças piscam com os rótulos; o título sobe. | comemorando | PANELA DE PRESSÃO |
| 16 | Borracha que *veda*, [leve] peso que *alivia*, [leve] saída de reserva [leve] e trava: [leve] quatro peças numa tampa. | Raio-X da panela; as quatro peças acendem uma a uma. | satisfeito | — |
| 17 | O _chiado_ que você ouve [leve] é o vapor que sobra saindo pelo peso, [leve] segurando a pressão no ponto. | Close no peso chiando; o ponteiro estável. | brincalhão | — |
| 18 | E o feijão cozinha em até *um terço* do tempo. | Relógio gira rápido; a panela chia; a bancada com o prato servido. | satisfeito | — |
| 19 | [curious] Manda pra quem ainda _tem medo_ [leve] de panela de pressão. | O `zeca` sorri e acena; a panela chia ao fundo. | brincalhão | — |
| 20 | [curious] E você sabe como a *geladeira* gela? [leve] Siga pra _descobrir_. | O ponto de interrogação sobe e vira uma geladeira; a cozinha ao fundo. | curioso | — |
| 21 | *Curta.* [leve] *Comente* se você já ouviu o chiado: [leve] a primeira panela dessas, de 1679, explodia. [leve] *Compartilhe* [leve] e *siga* pra saber [leve] como as coisas *funcionam*. | A panela inteira; as quatro chamadas entram uma a uma. | — | chamadas: CURTA · COMENTE · COMPARTILHE · SIGA |

## Contas e cuidados com a física (feitos na hora)

- **Por que a pressão sobe a fervura:** a água ferve quando a pressão do vapor das bolhas empata com a pressão em cima dela. Com a tampa
  vedada o vapor fica preso, a pressão sobe e a água precisa de mais calor para ferver. A fala diz isso em palavras simples (batida 5) e
  não dá fórmula.
- **100 graus no ar livre:** em panela aberta, a água em ebulição fica em 100 °C no nível do mar; mais fogo vira mais vapor, não água mais
  quente. A fala diz "não passa de 100 graus", sem dizer "nível do mar" (o ponto exato cai um pouco em cidades altas). Correto no sentido
  geral.
- **120 graus:** com cerca de 1 bar acima da pressão do ar (15 psi), a água ferve a ~120 °C. A fala diz "uns 120 graus". A panela da casa
  brasileira trabalha numa pressão parecida, mas a fala **não** dá número de pressão (a faixa de pressão de trabalho vem de uma fonte comercial
  e de norma; fica fora).
- **A primeira que explodiu:** Papin usou a primeira válvula de segurança conhecida porque os modelos anteriores explodiam. A fala só diz
  "ela explodia" e "a saída dele foi o furo com peso". Não diz que a válvula foi o primeiro uso no mundo.
- **Segunda saída e trava:** conceito de segurança, sem número nem norma: se a saída principal trancar, a reserva alivia; a tampa não abre com
  pressão dentro.
- **Desenho de cena:** a tampa que fura o teto é um exagero de cena (gag); a fala não diz que isso acontece em panelas de verdade.
- **Um terço do tempo:** a referência geral é "de um quarto a metade" ou "um terço" do tempo de fervura comum; a fala diz "em até um terço". Os
  tempos de feijão (comum 40 a 60 min, pressão 10 a 15 min com feijão de molho) vêm de fontes de culinária (fracas) e **não** vão na fala nem na
  tela; a barra é de cena.

## Fontes (pesquisadas em 04/11/2026)

Nada de norma. Números de tela (tamanho da panela, barras, ponteiro) são **de cena**.

- **[F1] Denis Papin, 1679, digestor, válvula de segurança.** Papin construiu em 1679 um vaso fechado de tampa justa; os modelos anteriores
  explodiam e a válvula (peso numa alavanca que levanta quando a pressão passa do limite) foi acrescentada para evitar isso
  ([Wikipédia, Steam digester](https://en.wikipedia.org/wiki/Steam_digester), que cita *Science and Society Picture Library* e Farey 1827;
  [Britannica, Denis Papin](https://www.britannica.com/biography/Denis-Papin); [Britannica, Pressure cooker](https://www.britannica.com/technology/pressure-cooker),
  ambos dando 1679 e a válvula de segurança). O Smithsonian **não** foi achado; o link do Correio Braziliense, mencionado no pedido, não foi
  aberto: o fato (1679, válvula) está confirmado na Britannica. Fonte mais forte: Britannica.
- **[F2] Água aberta em 100 °C; pressão sobe a fervura; ~120 °C com 15 psi acima da atmosfera.** Panela aberta: depois dos 100 °C o calor extra
  vira vapor, não temperatura; "o ponto de ebulição sobe com a pressão"; ~15 psi acima da pressão do ar dá ~120 °C
  ([Wikipédia, Pressure cooking](https://en.wikipedia.org/wiki/Pressure_cooking),
  [ScienceABC](https://www.scienceabc.com/innovation/pressure-cooker-work),
  [Modernist Cuisine](https://modernistcuisine.com/mc/how-pressure-cookers-work/)).
- **[F3] Borracha de vedação.** O anel entre a tampa e a panela torna a vedação hermética; sem ele a panela não sobe de pressão
  ([Wikipédia, Pressure cooking](https://en.wikipedia.org/wiki/Pressure_cooking),
  [O Povo, panela de pressão](https://www.opovo.com.br/trends/panela-de-pressao-travada-pode-soltar-a-tampa-apos-resfriamento-lateral-mas-so-depois-de-a-pressao-interna-acabar/)).
- **[F4] Peso/válvula que libera e segura a pressão; segunda válvula de segurança se a principal trancar; trava da tampa.** Um peso ou mola na
  tampa deixa o vapor sair no limite e mantém a pressão estável; válvulas extras de reserva liberam se a principal estiver bloqueada; a tampa
  tem trava que impede abrir enquanto houver pressão ([Wikipédia, Pressure cooking](https://en.wikipedia.org/wiki/Pressure_cooking),
  [O Povo](https://www.opovo.com.br/trends/panela-de-pressao-travada-pode-soltar-a-tampa-apos-resfriamento-lateral-mas-so-depois-de-a-pressao-interna-acabar/),
  [manual Tramontina](https://assets.tramontina.com.br/upload/tramon/imagens/FAR/62416220MIM001.pdf), **PDF não lido**: o texto não pôde ser extraído).
- **[F5] Entupimento por resíduo de comida.** Válvula de trabalho entupida por resíduo e panela cheia demais são as causas mais citadas de
  problema ([O Povo](https://www.opovo.com.br/trends/?p=29336), fonte de imprensa, fraca; a fala só diz "o furo entope com a comida").
- **[F6] Um terço do tempo.** "Pode levar um terço do tempo" ([Wikipédia, Pressure cooking](https://en.wikipedia.org/wiki/Pressure_cooking));
  tempos de feijão (comum 40 a 60 min, pressão 10 a 15 min com feijão de molho) de sites de culinária
  ([Tudo Gostoso](https://www.tudogostoso.com.br/noticias/da-para-fazer-feijao-sem-panela-de-pressao-esse-e-o-passo-a-passo-para-ter-um-bom-resultado-usando-uma-panela-comum-a26975.htm),
  [Receiteria](https://www.receiteria.com.br/dicas/tempo-de-cozimento-panela-de-pressao/)), fonte fraca; não entra na fala.

**O que NÃO confirmei (fora do vídeo, de propósito):** o artigo do Smithsonian (não achei); o link do Correio Braziliense (não abri); o texto do
manual da Tramontina (PDF sem texto extraível); a pressão de trabalho exata das panelas brasileiras (só fonte comercial); qualquer regra de
fabricação (norma; fica fora por regra); o tempo exato do feijão (varia com variedade e molho); o limite de enchimento (operação).

## Passos que eu escolhi (além do tema)

1. **Abertura com a tampa tremendo, não com a explosão:** o risco aparece no 1º segundo (a tampa treme) e a explosão só vem na batida 9, como
   consequência do que a pessoa acabou de montar. Sem flash-forward.
2. **Vitória na batida 7 (~28 s):** o feijão amolece em minutos, antes de mostrar o perigo.
3. **Papin (batida 10):** dá cara de história ao peso, sem mudar a corrente; o ano volta no cartão final como fato do comentário.
4. **Revelação na batida 15 (~71%).** As batidas 16–18 mostram o conjunto e o ganho; a 17 (chiado) explica o som que todo mundo conhece.
5. **Gancho (20):** geladeira, só uma sugestão; troque pelo próximo tema que a pessoa escolher.

## Se sobrar tempo (a pessoa escolhe) e cortes naturais

Se passar de 2:40, corte nesta ordem:
1. **Batida 17 (chiado)**: repete a ideia do peso.
2. **Batida 5 (por que a água custa a ferver)**: a 4 e a 6 já levam o raciocínio.
3. **Batida 10 (Papin)**: vira só o cartão 1679 na batida 11.

Se faltar conteúdo: (a) por que a panela precisa de um aro e não de parafuso? (sem fonte ainda); (b) a tampa entra pela boca e apoia por dentro
(sem fonte ainda, tirei); (c) o vapor também cozinha o feijão por fora do líquido (sem fonte).

## Assets 3D que faltam

- **Cenário:** a cozinha existente (`cozinha-base` + `cozinha-fogao`) serve; falta teto visível com possibilidade de **furo** (animação de
  buraco limpo) e a vinheta de 1679 (sala de pedra, mesa de madeira, panela de ferro com barra na tampa e estouro lateral). Campos de cenário
  novo: `teto` (furo sim/não), `epoca` (hoje/1679).
- **Peças novas:** panela de pressão desmontável (corpo, tampa, aro de borracha, furo, peso, plugue de reserva, pino de trava), termômetro
  3D, ponteiro de pressão, colher, feijão (chuva), setas de vapor, lupa, versão de 1679.
- **Cartões:** rótulos curtos (100 °C, BORRACHA, PRESSÃO, 120 °C, PESO, RESERVA, TRAVA, PANELA DE PRESSÃO), `ano` (1679 · DENIS PAPIN),
  barras COMUM × FECHADA (de cena); chamadas finais já existem.
