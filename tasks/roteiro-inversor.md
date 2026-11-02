# Roteiro: "Dá pra ligar a TV na bateria do carro?" (explicador 3D, episódio 5)

Versão 4, texto aprovado em 31/10/2026 (com o fecho "manda pra quem não sabia disso"). Reescrita para prender mais (pedido de 31/10/2026): alternativa
A de `tasks/ideias-viral-inversor.md` ("acabou a luz", risco concreto, vitória no meio, pedido de envio) com o
**truque das mãos** da alternativa D para explicar as quatro chaves. Palavras do dia a dia; o nome técnico só aparece
no rótulo da tela. 20 batidas; com a voz a 1,2×, perto de 1:20 (a versão 3 tinha 2:28).
Responde o gancho do episódio 4 ("como o inversor transforma contínua em alternada?").

**A corrente:** acabou a luz, só tem a bateria do carro → a TV não liga → a bateria empurra num sentido, a tomada vai
e volta → troque os fios com a mão: a corrente vira → 60 vezes por segundo? ninguém tem mão → quatro chaves (duas
normal, duas trocado) → mas só 12 volts → bobina → mas pesaria mais de 6 quilos → troque 40 mil vezes por segundo →
sai tremendo → peça de um sentido só + balde de eletricidade: 311 volts → mas num sentido só de novo → mais quatro
chaves → **a TV liga** → mas o ventilador chia → pisque a chave: a média vira curva → bobina e balde alisam → cabe numa
caixinha: o inversor. Sem normas.

## Ganchos e viradas

| s (aprox.) | Batida | Tipo | O que prende |
|---|---|---|---|
| 0 | 1 | gancho | acabou a luz na hora do jogo; só sobrou a bateria do carro |
| 4 | 2 | laço aberto | a TV não liga… "mas dá pra fazer funcionar" |
| 12 | 5 | revelação | troque os fios de lugar: a corrente vira |
| 16 | 6 | surpresa | 60 vezes por segundo = a corrente da tomada |
| 20 | 7 | problema/solução | ninguém tem mão pra isso: quatro chaves |
| 26 | 8–9 | problema | a TV continua apagada: 12 contra 311 |
| 36 | 11 | problema | a bobina pesaria mais de 6 quilos |
| 40 | 12 | solução | 40 mil vezes por segundo: cabe na mão |
| 50 | 14 | virada | num sentido só de novo?! |
| 55 | 15 | vitória | a TV liga, na hora do gol |
| 58 | 16 | problema | o ventilador esquenta e chia |
| 64 | 17–18 | revelação | piscar a chave: a média vira curva |
| 76 | 20 | fecho | o inversor; "manda pra quem não sabia disso" + siga |

## A escada

| # | Solução | …mas | Princípio que fica |
|---|---|---|---|
| 0 | Bateria na TV | a bateria vai num sentido; a tomada vai e volta | **contínua × alternada** |
| 1 | Trocar os fios com a mão | 60 vezes por segundo ninguém consegue | **inverter os fios = corrente que vai e volta** |
| 2 | Quatro chaves (duas normal, duas trocado) | só 12 volts; a tomada chega a 311 | ponte H |
| 3 | Bobina | a 60 por segundo, pesaria mais de 6 kg | transformador multiplica |
| 4 | Trocar 40 mil vezes por segundo | sai tremendo | **mais rápido = bobina menor** |
| 5 | Peça de um sentido só + balde de eletricidade | 311 V, mas num sentido só | retificador + capacitor |
| 6 | Mais quatro chaves | onda em degraus: ventilador chia | — |
| 7 | Piscar a chave (fraco, forte, fraco) | ainda pulsos | **a média dos pulsos é a curva** (PWM) |
| 8 | Bobina e balde na saída | — | filtro |

## Linguagem visual

- **Começo na casa do episódio 4, de noite e sem luz** (o poste apagado, a TV preta, o jogo prestes a começar) e,
  da batida 3 em diante, a bancada iluminada por uma lanterna/lampião (o "laboratório" do apagão).
- **As mãos** segurando os dois fios da bateria e trocando de lugar (asset novo); as bolinhas no fio mudam de sentido
  a cada troca.
- Quatro chaves de alavanca com o esquema 2D da ponte H rotulado **NORMAL / TROCADO** (o cartão `ponteh` com outros
  rótulos).
- Osciloscópio (cartão `onda`) só onde ajuda: reta × curva (3), degraus (16), pisca-pisca virando curva (17–18).
- **Ventilador** na bancada (o de `sala.tsx`), chiando e esquentando com a onda em degraus e liso no fim.

## Tabela de cenas

`*palavra*` = destaque amarelo, `_palavra_` = vermelho. `[leve]` divide os trechos da batida.
Tags do ElevenLabs (`[excited]`, `[curious]`, `[amazed]`) só nos ganchos e viradas.

| # | Fala | Tela | Pessoa | Cartões |
|---|---|---|---|---|
| 1 | [excited] Acabou a luz [leve] bem na hora do jogo. [leve] Só sobrou [leve] a bateria do carro. | Casa do episódio 4 de noite: o poste apaga, a TV apaga, a pessoa no sofá no escuro. | surpreso | ACABOU A LUZ |
| 2 | Ligue a TV nela: [leve] _nada_. [leve] [curious] Mas dá pra fazer funcionar. [leve] Olha só. | A bateria no chão da sala, fios até a TV; a tela continua preta. | cansado | — |
| 3 | A bateria empurra a corrente [leve] num sentido só. [leve] A tomada [leve] *vai e volta*. | Bancada; osciloscópio: a reta da bateria ao lado da curva da tomada. | — | onda: reta × curva |
| 4 | Então pegue os dois fios [leve] e encoste na TV. [leve] A corrente vai pra um lado. | Mãos segurando os fios; as bolinhas andam num sentido. | — | — |
| 5 | [amazed] Agora *troque os fios de lugar*. [leve] Ela vai pro outro lado. | As mãos trocam os fios; as bolinhas invertem. | surpreso | — |
| 6 | Troque e destroque [leve] *60 vezes por segundo*: [leve] pronto, [leve] você fez a corrente da tomada. | As mãos trocando cada vez mais rápido, até virar borrão. | eureka | 60 TROCAS POR SEGUNDO |
| 7 | [curious] Só que ninguém tem mão pra isso. [leve] Ponha *quatro chaves*: [leve] duas ligam normal, [leve] duas ligam *trocado*. | As mãos somem; quatro chaves de alavanca no lugar; esquema 2D NORMAL / TROCADO. | — | esquema: NORMAL / TROCADO |
| 8 | Elas revezam sozinhas [leve] e a corrente vai e volta. [leve] [curious] Mas a TV continua apagada. | As chaves alternando; as bolinhas indo e voltando; a TV preta. | pensativo | rótulo PONTE H |
| 9 | A bateria tem *12 volts*. [leve] A tomada diz 220, [leve] mas no pico [leve] chega a _311_. | Osciloscópio: a onda pequena de 12 ao lado da curva alta, com as marcas +311 e −311. | — | 12 V × PICO DE 311 V |
| 10 | Pra subir a voltagem, [leve] use uma *bobina*: [leve] poucas voltas de um lado, [leve] muitas do outro. [leve] Ela multiplica. | A bobina aparece; contador de voltas de cada lado; a voltagem subindo. | — | rótulo TRANSFORMADOR |
| 11 | [curious] Mas trocando só 60 vezes por segundo, [leve] essa bobina pesaria [leve] _mais de 6 quilos_. | A bobina grande na balança. | preocupado | MAIS DE 6 kg |
| 12 | [amazed] Então troque *mais rápido*: [leve] 40 mil vezes por segundo. [leve] Aí ela cabe na mão. | As chaves viram borrão; a bobina encolhe na balança. | eureka | 40 MIL POR SEGUNDO |
| 13 | Sai voltagem alta, [leve] mas tremendo. [leve] Uma peça que só deixa passar num sentido [leve] e um *balde de eletricidade* [leve] deixam tudo liso: [leve] *311 volts*. | Osciloscópio tremendo; os diodos desviam as bolinhas; o capacitor enche como um balde; a reta alta. | — | rótulos RETIFICADOR · CAPACITOR |
| 14 | [curious] Só que agora ela vai num sentido só [leve] *de novo*. [leve] Fácil: [leve] mais quatro chaves, [leve] trocando 60 vezes por segundo. | A segunda ponte de chaves depois do balde. | coçando a cabeça | — |
| 15 | [excited] E a TV liga! [leve] Bem na hora do gol. | A tela acende com o jogo; a pessoa comemora. | comemorando | — |
| 16 | [curious] Mas ligue um ventilador: [leve] ele esquenta e chia. [leve] A corrente saiu em *degraus*. [leve] A da tomada faz *curva*. | O ventilador na bancada chiando, o motor vermelho; osciloscópio: degraus × curva. | preocupado | onda: degraus · chuveiro ✓ ventilador ✗ |
| 17 | Chave só liga e desliga. [leve] O truque é *piscar*: [leve] ligada pouco tempo, fraco. [leve] Muito tempo, forte. | Uma chave piscando; pulsos finos e largos; a barra da média subindo. | pensando | onda: pisca-pisca (média) |
| 18 | [amazed] Pisque fraco, forte, fraco… [leve] e a média [leve] vira *curva*. | Os pulsos e, por cima, a curva aparecendo. | eureka | onda: pulsos → curva |
| 19 | Uma bobina e um balde na saída [leve] alisam o resto. [leve] Ventilador liso, [leve] sem chiar. | O filtro; o ventilador gira liso e esfria. | sorriso | rótulo FILTRO |
| 20 | Tudo isso cabe numa caixinha: [leve] o *inversor*. [leve] Manda pra quem não sabia disso. [leve] E siga pra mais. | O circuito inteiro acendendo etapa por etapa; corta para a caixinha do inversor fechada. | sorriso | esquema do circuito · SIGA |

## Fontes (pesquisadas em 30/10/2026)

Números de cena, sem fonte por não serem fatos: o jogo na TV; os mil watts implícitos na bobina de "mais de 6 quilos"
(batida 11, a potência do exemplo).

- **[F1]** 127 V e 220 V são valores eficazes (RMS): a tensão contínua que dissiparia a mesma potência numa
  resistência (esquenta igual). Numa senoide, pico = eficaz × √2: 220 V → ~311 V (conta); a onda vai de +311 a −311.
  [Electronics Tutorials, RMS](https://www.electronics-tutorials.ws/accircuits/rms-voltage.html).
- **[F2]** Ponte H: quatro chaves; fechar os pares em diagonal inverte a corrente na carga; alternar dá uma onda
  quadrada de ±tensão da bateria. "Inversor: inverte o sentido da corrente contínua muito rápido."
  [UT Austin, EE462L](https://users.ece.utexas.edu/~kwasinski/_10_EE462L_Spring2013_PWM_Inverter_Control_Circuit.pdf),
  [energy.gov, inversores](https://www.energy.gov/cmei/systems/solar-integration-inverters-and-grid-services-basics).
- **[F3]** Transformador não funciona com contínua: o campo precisa variar; ligado em contínua, o primário puxa
  corrente enorme, esquenta e pode queimar. A relação de espiras dá a relação de tensões.
  [Electronics Tutorials, transformador](https://www.electronics-tutorials.ws/transformer/transformer-basics.html),
  [Texas Instruments, SPRABW0](https://www.ti.com/lit/pdf/sprabw0).
- **[F4]** Tamanho × frequência: frequência maior pede menos fluxo por ciclo e um núcleo menor. Um transformador
  toroidal de 1.000 VA a 50/60 Hz pesa de 6,5 a 8,4 kg (catálogo); o de alta frequência é "muito pequeno e leve".
  [Texas Instruments, SPRABW0](https://www.ti.com/lit/pdf/sprabw0),
  [RS, toroidal 1.000 VA](https://uk.rs-online.com/web/p/toroidal-transformers/1234051).
- **[F5]** Arquitetura de alta frequência num inversor de 1 kVA com bateria de 12 V: ponte a 40 kHz → transformador
  de alta frequência → ponte de diodos e filtro → barramento contínuo de 380 V → segunda ponte com PWM senoidal →
  filtro. A fala diz "uns 311" (o pico de 220 V, o mínimo para a senoide). [Texas Instruments, SPRABW0](https://www.ti.com/lit/pdf/sprabw0).
- **[F6]** Onda quadrada (ou modificada, em degraus) esquenta mais motores, ventiladores e micro-ondas e pode fazer
  zumbido; com senoide pura eles rodam mais frios e
  silenciosos. Que o chuveiro (resistência) não liga para a forma é inferência: ele só quer a potência.
  [Samlex, senoidal pura × modificada](https://samlexamerica.com/?p=931).
- **[F7]** PWM: a fração do tempo em que a chave fica ligada (ciclo de trabalho) define a tensão média. PWM senoidal:
  comparar a senoide com uma triangular rápida dá pulsos cuja largura acompanha a senoide (senoide acima = chave
  para o mais; abaixo = para o menos); triangular mais rápida = curva mais fiel e mais fácil de filtrar; o
  filtro (bobina + capacitor) tira o chaveamento e deixa os 60 Hz.
  [UT Austin, EE462L](https://users.ece.utexas.edu/~kwasinski/_10_EE462L_Spring2013_PWM_Inverter_Control_Circuit.pdf),
  [Renesas, inversor senoidal](https://www.renesas.com/en/document/apn/cm-374-sine-wave-based-inverter).
- **[F8]** As chaves são transistores, sem peça móvel.
  [energy.gov, inversores](https://www.energy.gov/cmei/systems/solar-integration-inverters-and-grid-services-basics).
- **[F9]** O inversor ligado à rede segue o sinal da rede para decidir quando chavear; a versão com transformador de
  alta frequência é a mesma fila de peças.
  [energy.gov](https://www.energy.gov/cmei/systems/solar-integration-inverters-and-grid-services-basics),
  [Texas Instruments, SPRABW0](https://www.ti.com/lit/pdf/sprabw0).

## Assets 3D que faltam

- **Mãos** segurando os dois fios da bateria e trocando de lugar (velocidade animável até virar borrão).
- **Casa no apagão** (batidas 1–2): o cenário `solar` de noite com `rede: 0` já serve; a bateria no chão da sala.
- **Luz de apagão** na bancada (lanterna/lampião) e o **ventilador** (de `sala.tsx`) chiando/esquentando e liso.
- Cartão `ponteh` com rótulos configuráveis (NORMAL / TROCADO); `aguenta` com "ventilador" no lugar de "motor".
- Já prontos: bancada, chaves, bobina, balança, retificador, capacitor, filtro, osciloscópio, esquema do circuito.
