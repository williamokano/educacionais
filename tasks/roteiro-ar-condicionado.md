# Roteiro: "Como um ar-condicionado gela a sua sala" (explicador 3D)

Versão 3, para aprovação do texto (regra de ouro 1). 33 batidas de 2 a 5 s; voz a 1,2× (o máximo do ElevenLabs); a voz real decide a duração.

**A história:** 36 graus. Uma pessoa no sofá, o ventilador soprando ar quente nela, suor escorrendo. Sem
abertura de fim, sem nome e sem "tentativas": o aparelho vai sendo montado como o próximo passo óbvio
("pra baixar isso, você põe…"), e cada peça resolve o problema da anterior e cria o próximo. A narração fala com
"você". A reação da pessoa no sofá (suando ou aliviada) mostra se o vento chega quente ou gelado.
Cenários: `ciclo` (sala com o sofá e a rua, em corte) e `bancada` (analogias), do pacote `demo-3d`.

## Ganchos e viradas

| s (aprox.) | Batida | Tipo | O que prende |
|---|---|---|---|
| 0 | 1 | gancho | "Ventilador não esfria o ar." Contraria o que todo mundo acha, com o vento quente na cara |
| 18 | 6 | virada | o calor não sumiu: só foi parar no balde |
| 32 | 10 | virada | "funciona… até a lata secar" |
| 36 | 11 | virada | fechou a lata: a pressão sobe e o líquido para de ferver |
| 50 | 14 | virada | levar o gás para fora piora: o calor da rua entra |
| 68 | 20 | gancho | "mas tem um problema": a pressão chega na sala |
| 82 | 24 | virada | começa a pingar água no chão (e por que todo ar pinga lá fora) |
| 88 | 26 | virada | o termostato resolve e cria o liga e desliga |
| 108 | 31 | revelação | ele não fabrica frio, carrega calor |
| 112 | 32–33 | gancho final | e se o caminho fosse ao contrário? Sim ou não (puxa o próximo vídeo) |

## A escada (a ordem e por quê)

Cada degrau resolve o problema do anterior e cria o próximo. A ordem não é arbitrária: é a ordem em que a física
cobra cada peça.

| # | Solução | Funciona porque… | …e quebra porque | Princípio que fica |
|---|---|---|---|---|
| 0 | Ventilador | mexe o ar | o ar continua a 36 °C | ventilar não esfria o ar |
| 1 | Balde de gelo na frente do ventilador | o calor vai do ar (quente) para o gelo (frio) | o gelo derrete, e o calor fica dentro de casa (vira água morna) | esfriar é **tirar calor** de um lugar e pôr em outro |
| 2 | Fluido que ferve muito frio, evaporando numa serpentina | para virar gás, ele "rouba" calor de tudo em volta | o gás escapa e a lata seca | **evaporar absorve calor** |
| 3 | Circuito fechado (o cano volta para a lata) | o gás não se perde | o gás não tem pra onde ir: a pressão sobe em segundos, o líquido **para de ferver**, e sem bomba nada circula | o ponto de fervura **depende da pressão** |
| 4 | Serpentina lá fora para esfriar o gás e ele voltar a ser líquido | a ideia é certa: tirar o calor que o gás carregou | o gás está a ~10 °C e a rua a 38 °C: o calor **entra** no gás em vez de sair | o calor só vai do quente para o frio |
| 5 | Compressor (motor que espreme o gás) | espremer esquenta (bomba de bicicleta): o gás passa dos 45 °C, mais quente que a rua; com pressão alta ele vira líquido mesmo quente; e ele é a bomba que faz o fluido circular | a pressão alta vaza pelo cano até a serpentina de dentro, e lá dentro o fluido também para de ferver | **comprimir esquenta e condensa** |
| 6 | Tubo capilar (cano fininho) ou válvula de expansão | segura a pressão: alta antes, baixa depois; o líquido passa, a pressão cai, e ele ferve gelado de novo | ciclo completo, mas pinga água na sala | **a pressão decide onde ferve (dentro) e onde condensa (fora)** |
| 7 | Bandeja e dreno | a serpentina gelada "sua" como um copo gelado; a água sai pelo dreno (e o ar fica mais seco) | gela sem parar e gasta energia o tempo todo | — |
| 8 | Termostato | desliga o motor quando a sala chega na temperatura | liga e desliga o dia todo: cada partida puxa um pico de corrente e desgasta o motor, e a temperatura fica num serrote | — |
| 9 | Inverter + placa controladora | em vez de desligar, o motor roda mais devagar; uma placa lê a temperatura da sala e decide acelerar ou desacelerar | — | **ajustar a velocidade em vez de ligar e desligar** |
| 10 | Duas caixas e dois canos | evaporadora dentro, condensadora fora: é o split da parede | — | **ele não fabrica frio, carrega calor** |

Fecho: se ele carrega calor de dentro para fora, invertendo o caminho ele esquenta a casa no inverno? É a bomba de
calor (válvula reversora), e fica como pergunta para o próximo vídeo.

Os degraus 8 e 9 andam juntos: o termostato existe para criar o problema que o inverter resolve. O degrau 0 não sai:
é o gancho de abertura.
Extra, se sobrar tempo: "líquido no compressor quebra o motor", que explica por que o fluido precisa evaporar inteiro
antes de voltar.

## Linguagem visual (sempre igual)

- Hexágonos **laranja** = calor. Traços **azuis** = ar frio. Traços **bege** = ar quente.
- Bolinhas no cano, por estado do fluido:
  - **azul**: líquido frio;
  - **branca**: gás frio;
  - **vermelha**: gás quente comprimido;
  - **laranja**: líquido quente.
- Cartões: termômetro em pílula ("SALA: 32 °C"), manômetro ("PRESSÃO: ALTA" / "BAIXA"), rótulo amarelo com o nome da
  peça na primeira vez que ela aparece.
- A pessoa fica no sofá; as peças aparecem na mesa ao lado dela. A câmera vai para fora (casa em corte) quando a peça é externa.

## Tabela de cenas

`*palavra*` = destaque amarelo, `_palavra_` = vermelho. `[leve]` divide os trechos da batida.
A pessoa fica no sofá o tempo todo; a coluna "No sofá" diz a ação, a expressão e o suor.
Tags de emoção do ElevenLabs (`[excited]`, `[curious]`, `[amazed]`) só nos ganchos e viradas: não são faladas nem entram na legenda.

Versão 4 (30/10): cortes do que repetia um princípio ou não ajudava a entender como a sala gela (51 → 33 batidas).

| # | Fala | Tela | No sofá | Cartões |
|---|---|---|---|---|
| 1 | [excited] Ventilador não esfria o ar. [leve] Com 36 graus na sala, [leve] ele só joga ar quente na sua cara. | Close no rosto suando, traços bege batendo; a câmera abre para a sala. | abanando, cansado, suor | SALA: 36 °C |
| 2 | [excited] Pra baixar isso, [leve] ponha *um balde de gelo* na frente do ventilador. | Balde no banquinho entre o ventilador e o sofá. | apontando, alerta, suor | rótulo BALDE DE GELO |
| 3 | O ar bate no gelo [leve] e chega gelado. [leve] Alívio. | Traços entram bege no balde e saem azuis até o sofá. | relaxado, alívio, o suor some | GELO: 0 °C |
| 4 | O calor sempre anda do quente pro frio. [leve] Aqui, do ar *pro gelo*. | Close: hexágonos voando para dentro do gelo. | — | — |
| 5 | Só que o gelo derrete. [leve] Horas depois, água morna. | Gelo derretendo até virar água; o ar volta bege. | relaxado → neutro | rótulo HORAS DEPOIS |
| 6 | [curious] Repare: [leve] o calor _não saiu da sala_. [leve] Só foi parar no balde. | Hexágonos dentro do balde; a pessoa volta a suar. | coçando a cabeça, preocupado, suor | — |
| 7 | [excited] Tem coisa melhor que gelo: [leve] o fluido do ar-condicionado. [leve] Aberto no ar, ele ferve a _52 graus negativos_. | Da pessoa suando para a lata de fluido na mesa. | pensando, pensativo, suor | rótulo R-32 · FERVE A −52 °C |
| 8 | Coloque ele numa serpentina, [leve] com o ventilador atrás. | Serpentina na mesa, ventilador soprando por ela para o sofá. | abanando, cansado, suor | rótulo EVAPORADOR |
| 9 | Pra virar gás, [leve] ele *rouba calor* de tudo em volta. [leve] E o vento sai gelado. | Bolinhas azuis virando brancas, calor entrando no cano; traços azuis até o sofá. | relaxado, alívio, o suor some | — |
| 10 | Funciona. [leve] Até a lata _secar_. | A lata esvazia; gás branco saindo pela ponta do cano. | relaxado, sorriso | — |
| 11 | Ligue o cano de volta na lata. [leve] [amazed] Mas o gás não tem pra onde ir: [leve] a pressão sobe [leve] e o líquido *para de ferver*. | O cano volta para a lata; o gás enche a lata e as bolinhas param. | relaxado → neutro | rótulo CIRCUITO FECHADO · PRESSÃO: SUBINDO |
| 12 | Pra gelar de novo, [leve] o gás precisa largar o calor [leve] e virar líquido. | A pessoa suando; câmera vai para a serpentina parada. | mão na testa, preocupado, suor | — |
| 13 | Leve o gás pra fora, [leve] numa serpentina com ventilador. | Câmera atravessa a parede: serpentina e ventilador na rua. | abanando, cansado, suor | rótulo CONDENSADOR |
| 14 | Mas ele tá a 10 graus, [leve] e a rua a _38_: [leve] o calor *entra*. | Close no condensador: hexágonos da rua entrando no cano. | — | GÁS: 10 °C · RUA: 38 °C |
| 15 | Ele precisa ficar *mais quente que a rua*. | A pessoa suando no sofá. | mão na testa, cansado, suor | — |
| 16 | Espremer gás esquenta: [leve] é por isso que a bomba de pneu fica *quente*. | Bancada: bomba de bicicleta subindo e descendo, o ar dentro avermelhando. | — | — |
| 17 | [excited] É isso que o *compressor* faz. [leve] Um motor que espreme o gás [leve] e faz ele circular. | Compressor lá fora entrando no circuito; as bolinhas voltam a correr. | — | rótulo COMPRESSOR |
| 18 | O gás sai dele passando dos 45 graus [leve] e larga o calor na rua. | Bolinhas vermelhas saindo do compressor; calor e ar quente saindo do condensador para a rua. | — | GÁS: +45 °C · RUA: 38 °C |
| 19 | E espremido assim, [leve] ele vira *líquido* mesmo quente. | Bolinhas vermelhas viram laranja no fim do condensador. | — | PRESSÃO: ALTA |
| 20 | [curious] Mas tem um problema: [leve] essa pressão chega na serpentina da sala [leve] e o fluido _não ferve_. | Câmera segue o cano até a serpentina da sala: bolinhas laranja, sem ferver. | braços cruzados, cansado, suor | — |
| 21 | Estreite o caminho: [leve] ponha um cano *fininho* [leve] ou uma válvula. | Capilar enrolado ao lado do cano grosso, com um grafite de lapiseira encostado. | — | rótulo TUBO CAPILAR · ~0,8 mm · OU VÁLVULA DE EXPANSÃO |
| 22 | Ele segura a pressão: [leve] antes, alta. [leve] Depois, baixa, [leve] e o fluido ferve gelado *de novo*. | Contas laranja entram no capilar e saem azuis; a serpentina da sala volta a ferver. | relaxado, alívio, o suor some | ANTES: ALTA · DEPOIS: BAIXA |
| 23 | [excited] Fechou o ciclo. [leve] Vento gelado *sem parar*. | Sala inteira, traços azuis no sofá. | comemorando, eureka | SALA: 23 °C |
| 24 | [curious] Mas aí começa a pingar _água no chão_: [leve] a serpentina gelada sua, [leve] igual copo de água gelada. | Gota caindo da serpentina, poça no chão. | relaxado, surpreso | — |
| 25 | Ponha uma bandeja e um *dreno*: [leve] eles levam essa água pra fora. [leve] É por isso que todo ar pinga lá fora. | Bandeja sob a serpentina, mangueira saindo pela parede. | relaxado, sorriso | rótulo DRENO |
| 26 | Um *termostato* desliga o motor quando a sala gela. [leve] Só que aí ele liga e desliga o dia inteiro: [leve] frio, [leve] calor, [leve] frio. | Termostato na parede; o compressor liga e desliga. | relaxado ↔ abanando | rótulo TERMOSTATO · gráfico em serrote |
| 27 | Com *inverter*, o motor não desliga: [leve] um sensor lê a sala [leve] e ele só roda mais devagar. | Placa do inverter acende; o compressor gira mais devagar. | — | rótulo INVERTER |
| 28 | A sala fica nos 23, [leve] e a conta de luz *cai*. | A pessoa relaxada; o gráfico vira reta e a conta encolhe. | relaxado, sorriso | gráfico reta · 11% A 44% MENOS |
| 29 | Agora feche tudo em duas caixas [leve] e prenda na parede. | As peças somem; a evaporadora aparece no alto da parede e a condensadora no suporte lá fora. | relaxado, sorriso | — |
| 30 | Dois canos atravessam a parede. [leve] Um leva líquido. [leve] O outro traz gás. | Os dois canos com bolinhas atravessando a parede. | — | — |
| 31 | [amazed] Ou seja: [leve] ele não fabrica frio. [leve] Ele *pega o calor* da sala e joga na rua. | Casa em corte: azul no sofá, hexágonos e ar quente indo para a rua. | relaxado, sorriso | — |
| 32 | [curious] Agora pense: [leve] e se o caminho fosse ao contrário? | O ar do split fica laranja; o calor da rua entra. | relaxado, surpreso | — |
| 33 | Ele esquentaria a sala no inverno? [leve] *Sim* ou *não*? Comente aí. | Escolha com dois ícones. | pensando | escolha SIM / NÃO · COMENTE |

## Som (no `roteiro.json`: `ambiencia` e `sfx` por batida)

8 efeitos e uma ambiência por lugar; os tempos saem da narração real (`som.py`).

- **Ambiências:** `vento` 0,25 na sala (o ventilador); `dia` 0,3 nas cenas de fora; nenhuma na bancada.
- **Efeitos:**
  - 1 `sopro` no "ar quente na sua cara";
  - 2 `metal` no balde;
  - 6 `impacto` em "o calor não saiu da sala";
  - 11 `impacto_seco` em "para de ferver";
  - 17 `clique` no compressor ligando;
  - 23 `ding` em "fechou o ciclo";
  - 24 `agua` pingando;
  - 31 `impacto` em "ele não fabrica frio".

## Fontes (pesquisadas em 29/10/2026, conferidas de novo na versão 3)

Números de cena, sem fonte por não serem fatos: 36 °C na sala, 38 °C na rua, 23 °C no termostato e "horas
depois" para o gelo (antes era "2 horas", número que não dava para sustentar; o cartão "ÁGUA: 24 °C" saiu pelo
mesmo motivo). Conferência da versão 3:

- **[F8]** Ventilador não baixa a temperatura do ar (o motor até esquenta um pouco); ele refresca porque ajuda o suor
  a evaporar. Perto dos 35–36 °C o efeito diminui e pode até inverter. A fala diz só "não esfria o ar".
  [TechRadar](https://www.techradar.com/home/air-quality/can-fans-cool-a-room),
  [Science Times](https://www.sciencetimes.com/articles/62361/20260811/how-fans-cool-your-body-down-even-though-they-dont-actually-cool-air.htm).
- **[F9]** Evaporar rouba calor: para virar gás, o líquido tira calor do que está em volta (é o mesmo efeito do álcool
  que gela a pele). A mão com álcool saiu do roteiro em 30/10; o asset continua no pacote (`bancada`, `objeto: "mao"`).
  [Indiana Public Media](https://indianapublicmedia.org/amomentofscience/why-does-rubbing-alcohol-feel-cold.php),
  [Science Buddies](https://www.sciencebuddies.org/stem-activities/evaporative-cooling-with-liquids).
- **[F10]** A água que condensa na serpentina cai numa bandeja embaixo da unidade de dentro e sai pelo dreno.
  [IRSAP](https://www.irsap.com/en/blog/air-conditioner-not-draining-water),
  [InspectAPedia](https://inspectapedia.com/aircond/Split_System_AC_Condensate_Leak.php).
- **[F11]** O sensor de temperatura fica na unidade de dentro; a placa compara com a temperatura escolhida e muda a
  frequência (a velocidade) do compressor: quanto maior a diferença, mais rápido.
  [Patente US 5568732](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5568732),
  [Patente US 6508072](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6508072).
- **R-32** (rótulo da batida 12): é o fluido que substitui o R-410A nos splits novos. "Aberto no ar" = à pressão atmosférica, a condição do ponto de ebulição de −51,7 °C ([F1]).
- **Rua a 38 °C** e gás "passando dos 45": o fluido condensa perto de 45 °C no projeto de referência ([F2]), acima
  dos 38 da rua, então a conta continua de pé.


- **[F1]** Ponto de ebulição do R-32 a 1 atm: −61 °F (−51,7 °C). O R-410A fica na mesma faixa (cerca de −52 °C),
  com pequena diferença entre as fontes. A narração diz "abaixo de 50 graus negativos", o que vale para os dois.
  [Hudson Technologies, tabela P-T do R-32](https://hudsontech.com/pdfs/pt-charts/R-32-Pressure-Temperature-Chart.pdf),
  [tabela P-T do R-410A](https://hudsontech.com/pdfs/pt-charts/R-410A-Pressure-Temperature-Chart.pdf).
- **[F2]** Valores de projeto de um ar-condicionado residencial: o fluido evapora a 5 °C e condensa a 45 °C, com
  ~5 °C de superaquecimento na saída do evaporador (daí "uns 10 graus" no gás que volta).
  [MathWorks, Refrigeration Cycle (System-Level)](https://www.mathworks.com/help/hydro/ug/refrigeration-system-level.html).
  O gás que sai do compressor está acima da temperatura de condensação. O limite de serviço é 225 °F (107 °C)
  ([ACHR News](https://www.achrnews.com/articles/152881-what-causes-high-compressor-discharge-temperatures)), mas
  nenhuma fonte deu um valor típico. Por isso a narração diz "passando dos 45 graus", e não "70 graus".
- **[F3]** Pressão em que o R-32 deixa de ferver à temperatura da sala: cerca de 303 psig (~21 bar) a 35 °C. Numa
  lata fechada ligada à serpentina, o pouco que ferve enche o espaço e a pressão chega lá em segundos; daí líquido e
  gás ficam em equilíbrio e nada mais ferve. Sem bomba e sem um ponto mais frio que a sala onde o gás condense, o
  fluido também não circula (um termossifão precisaria dessa diferença de temperatura). A panela de pressão saiu do
  roteiro em 29/10; o asset continua no pacote (`bancada`, `objeto: "panela"`).
  [Hudson Technologies, tabela P-T do R-32](https://hudsontech.com/pdfs/pt-charts/R-32-Pressure-Temperature-Chart.pdf),
  [Loughborough University, tabela P-T do R-32](https://lbas.lboro.ac.uk/chart/r32-pressure-temperature-chart.html).
- **[F5]** Diâmetro interno de capilar: de 0,5 a 2,3 mm. Para split pequeno, cerca de 0,79 mm (0,031 pol.), a
  grossura de um grafite de lapiseira. Um fio de cabelo é ~10 vezes mais fino, por isso a comparação mudou.
  [tesisat.org](https://www.tesisat.org/en/capillary-tube-and-selection.html),
  [Supco BC4](https://jacksonsystems.com/product/supco-bc4/).
- **Capilar ou válvula:** splits inverter usam principalmente válvula de expansão eletrônica; o capilar aparece nos
  mais baratos. A batida 38 cita os dois.
  [Patente US 2015/0276286](https://patents.justia.com/patent/20150276286),
  [IIR, capilar vs. válvula eletrônica](https://iifiir.org/en/fridoc/comparative-analysis-between-a-capillary-tube-and-an-electronic-23746).

- **[F6]** Pico de corrente na partida do compressor: as fontes variam de 2,5 a 10 vezes a corrente de regime, e o
  pico dura frações de segundo. Exemplo de placa de um compressor Trane: 26,4 A rodando, 134 A de rotor travado
  (~5×). Como os números divergem, a narração diz "várias vezes", sem cravar um valor.
  [Mike Holt Forum](https://forums.mikeholt.com/goto/post?id=2702980),
  [Coastal Climate Control](https://www.coastalclimatecontrol.com/blog/start-em-up-marine-air-conditioning).
  Desgaste por liga e desliga (calor e esforço em enrolamento, isolamento, mancais e válvulas a cada partida):
  [CP Compressors](https://compressors.cp.com/en-in/expert-corner/blog/why-does-my-compressor-start-and-stop-continuously),
  [Kaishan](https://kaishanusa.com/how-often-should-an-air-compressor-cycle/).
- **[F7]** Economia do inverter sobre o de velocidade fixa: de 11% a 38% num teste em escritórios de Istambul
  (Energy and Buildings, 2014) e até 44% num teste de 108 dias na Arábia Saudita (Springer, 2020). Os dois estudos
  dizem que o ganho depende do clima e da carga, e que abaixo da potência mínima o inverter também liga e desliga.
  [ITU, Energy and Buildings 2014](https://research.itu.edu.tr/en/publications/an-experimental-investigation-of-energy-saving-potentials-for-roo/),
  [Springer 2020](https://link.springer.com/article/10.1007/s41825-020-00033-y).
