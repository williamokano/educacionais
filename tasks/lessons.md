# Lições

## Conferir as ferramentas antes de dizer que falta uma

- **O que aconteceu (29/10/2026):** depois de a sessão passar da nuvem para o PC, eu disse que não havia busca na
  web, sem conferir. A busca estava disponível (ferramenta adiada, carregável com o ToolSearch).
- **Regra:** antes de afirmar que uma ferramenta não existe, procure com o ToolSearch (`select:WebSearch,WebFetch`
  ou por palavra-chave). Sessão que mudou de máquina tem outro conjunto de ferramentas: confira de novo.
- **Regra:** quando o método pede pesquisa (`regras.md`), pesquise na hora. Não devolva o trabalho com `[CONFERIR]`
  se a ferramenta para conferir existe.

## Explicador: começar na ação, não no fim

- **O que aconteceu (29/10/2026):** abri o explicador do ar-condicionado com o final (cold open) e narrei como "tentativas"
  de um personagem com nome. O pedido era o oposto: começar no calor, montar peça por peça como fluxo natural, sem nome.
- **Regra:** em explicador, os 2 primeiros segundos são o problema concreto acontecendo (36 graus, vento quente na cara),
  não um flash-forward. Cada peça entra como o próximo passo óbvio, no imperativo ("pra baixar isso, ponha…", "passe álcool na mão"), não como "tentativa".
- **Regra:** personagem sem nome a menos que a pessoa peça; a narração fala com "você".
- **Regra:** marque as viradas e os ganchos de atenção no roteiro antes de escrever as falas (pelo menos um a cada 15 s).

## Conferir antes de repetir um aviso do sistema

- **O que aconteceu (29/10/2026):** a sessão foi reaberta e o sistema avisou que o scratchpad "não estava mais
  disponível". Eu disse que ele não existia mais, sem olhar. A pasta e os arquivos estavam intactos.
- **Regra:** antes de dizer ao usuário que algo sumiu ou falhou, confira com um `ls` (ou equivalente). Aviso do sistema
  é pista, não fato verificado.

## Explicador: lúdico, sem normas técnicas

- **O que aconteceu (30/10/2026):** os roteiros dos episódios 3 e 4 citavam normas (ABNT, Inmetro), tempo de
  desligamento de norma e regras de tarifa (Fio B), e deixavam `[CONFERIR]` onde a norma paga não pôde ser lida.
- **Regra:** o explicador é lúdico e educativo. Não cite norma, portaria nem regra técnica de tarifa, nem nas falas
  nem como base das fontes. Só entra quando é gritante para a segurança, e mesmo assim como conceito, sem número de
  norma (ex.: "o inversor desliga sozinho no apagão, pela equipe da rua").
- **Regra:** se um detalhe só se confirma lendo uma norma paga, tire o detalhe em vez de deixar `[CONFERIR]`.

## Cartões: conferir de perto, não só na folha pequena

- **O que aconteceu (30/10/2026):** o cartão `comparacao` tinha altura fixa e a barra não reservava espaço para o
  rótulo: o fundo ficava menor que o conteúdo. Passou nos episódios 2 e 3 porque a folha de quadros é pequena demais
  para ver; a pessoa achou no vídeo.
- **Regra:** painel de cartão com altura automática (`altura="auto"`), nunca fixa; texto ao lado de barra com espaço
  reservado. Na revisão, além da folha, tire um recorte em tamanho real (`crop=1080:700:0:250`) de cada batida com
  cartão de painel (`comparacao`, `grafico`, `corrente`, `rendimento`) e confira bordas e sobreposições.

## Fim do episódio: gancho para o próximo (ou "siga")

- **O que aconteceu (30/10/2026):** o episódio 4 terminava com uma enquete solta ("bateria ou só a rede? Comente aí"),
  que não levava a lugar nenhum. A pessoa pediu que a pergunta final puxe o próximo episódio.
- **Regra:** a última batida é um gancho para o próximo episódio ("E como o inversor faz isso? No próximo vídeo, ele
  abre. Siga pra não perder"). Episódio independente ou sem próximo definido: "siga pra mais curiosidades" ou um gancho
  viral de outro tema ("E você sabe como uma ponte fica de pé? Siga pra descobrir"). Enquete "sim ou não" só se ela
  mesma for o gancho do próximo. Não é regra rígida: escolha o que prende mais.

## Formato do roteiro: corrente de "solução → mas → problema → solução"

- **O que aconteceu (30/10/2026):** a pessoa reescreveu a estrutura do episódio 4 como uma corrente: cada solução
  resolve o problema anterior e cria o próximo ("ligue 6 placas: 240 V… mas a TV ainda não liga"; "o inversor liga a
  TV… mas o sol vai embora"; "manda pra rede… mas a rede cai").
- **Regra:** monte a escada como corrente de ganchos: solução, "mas", problema novo, solução. Cada virada é um gancho.
  Comece pelo jeito mais ingênuo (ligar direto) e só explique o princípio quando a tentativa falhar.

## Vídeo curto tem que prender: gancho de impacto, palavras simples, vitória cedo, pedido de envio

- **O que aconteceu (31/10/2026):** o episódio 5 ensinava bem, mas começava com uma instrução ("ligue uma bateria…"),
  durava 2:28, usava palavras de livro e não explicava o porquê das quatro chaves. Os episódios 1–3 pararam em ~1.500
  views. A pessoa pediu ganchos virais e linguagem do brasileiro médio, e aprovou as versões 4 (3, 4 e 5).
- **Regra:** os 2 primeiros segundos são um gancho de impacto com risco ou contradição ("acabou a luz na hora do
  jogo", "a casa solar no escuro em pleno sol", "um quarto da conta desce pelo ralo"), de preferência um laço aberto
  respondido no meio. Uma vitória até ~30–45 s. Alvo de 60–90 s **quando o tema cabe**.
- **Correção (03/11/2026, bunker):** 60–90 s é um alvo de prender atenção, **não o limite**. O limite da série é
  **3 min, alvo 2:40** (a voz pode alongar, 3:00 é teto duro). Eu dimensionei o bunker em 3 episódios de ~1 min
  tratando 60–90 s como teto. Regra: dimensione pelo conteúdo dentro de 2:40; só divida em mais episódios se não couber
  nisso. Referência: ep. 3 = 2:03, ep. 4 = 1:39, ep. 6 = 1:26, cerca de 17 batidas por minuto.
- **Regra:** fala com palavras do dia a dia (voltagem, balde de eletricidade, peça de um sentido só, pisca-pisca,
  poste); o nome técnico só no rótulo da tela. Mostre o princípio com algo físico antes da peça (trocar os fios com a
  mão antes das quatro chaves).
- **Regra:** o fim pede **envio** ("manda pra quem…", o sinal que o Reels mais pesa) e puxa o próximo episódio ou "siga".
  Referência das técnicas: `tasks/ideias-viral-inversor.md`.

## Assets 3D com capricho: carros bonitos, peças legíveis, começo em movimento (02/11/2026, episódio 6)

- **O que aconteceu:** no 1º rascunho do episódio do freio, os carros eram caixas simples e desproporcionais; o corte da
  roda era uma mancha de peças sem nome (o pneu tapava tudo); o pé no pedal não aparecia (e o pedal girava para o lado
  errado); o vídeo abria com o carro "parado" e havia uma cena de caminhão que ninguém pediu para carro.
- **Regra:** veículo e peça principal têm que parecer bonitos mesmo em low poly: silhueta com capô, cabine em trapézio,
  vidros em cor própria, faróis, para-choques, rodas com raios (referências que a pessoa mandou: carrinhos low poly
  vermelho e azul). Nada de caixa com caixa em cima.
- **Regra:** explicar uma peça por dentro = tirar o que atrapalha (pneu, carroceria), dar uma cor por peça e **etiquetar
  em 3D cada peça** no momento em que a fala a cita. Mostrar a ação (o pé pisando) antes do efeito (o óleo, a sapata).
- **Regra:** abrir sempre em movimento (carros andando) e só então o problema acontecer; conferir o sentido das
  animações (pedal pisando = vai para a frente). Não inventar cena fora do pedido (o caminhão).

## Rótulos 3D: nunca cortar texto longo (03/11/2026, episódio 8)

- **O que aconteceu:** o rótulo "GERADOR = EMERGÊNCIA" saiu cortado nos dois lados ("RADOR = EMERGÊNC"): a etiqueta é
  um canvas de largura fixa (640 px) e o texto de 20 letras não cabia. Passou na folha pequena; a pessoa achou no vídeo.
- **Regra:** etiqueta/rótulo 3D tem que medir o texto e encolher a letra para caber (`measureText`), nunca largura fixa.
  Rótulo curto (1 a 2 palavras) é melhor que frase: "EMERGÊNCIA" ao lado do gerador diz o mesmo.
- **Regra:** na revisão, tire um quadro em tamanho real de cada batida com rótulo longo (≥ 12 letras) e leia o texto
  inteiro, como já valia para os cartões de painel.

## Método do roteiro não vai para a fala (03/11/2026, episódio 8)

- **O que aconteceu:** o fecho do bunker dizia "cada peça nasceu de um defeito" e "o bunker perfeito não existe: toda peça
  troca um defeito por outro". Isso é a técnica de montar a corrente (e o meu jeito de explicar o formato), não conteúdo
  para o espectador. A pessoa também achou "perfeito" prepotente.
- **Regra:** a narração fala do assunto, nunca do método (corrente, "mas", defeito/solução, "nenhuma peça é perfeita").
  Fecho de episódio: o que o espectador ganhou ("um bunker básico, já utilizável") e o gancho. Evite "perfeito", "ideal",
  "definitivo": diga "básico", "utilizável".

## O vídeo ensina a construir, não a operar (03/11/2026, episódio 8)

- **O que aconteceu:** no bunker eu pus cenas de uso (à noite só a bateria, "gaste pouco", "ligue o gerador se acabar",
  depois como filtrar e ferver água). O pedido era montar o bunker, peça por peça; como operar fica em aberto.
- **Regra:** em episódio de construção, cada batida é uma peça que se instala ou um problema da peça. Operação, rotina e
  racionamento ficam de fora; deixar o assunto em aberto é aceito.

## Rótulos 3D presos ao quadro, em vários momentos da janela (03/11/2026, episódio 8)

- **O que aconteceu:** a simulação do iPhone mostrou rótulos 3D (TORRE DE CAL, GERADOR) cortados na borda esquerda quando a câmera
  ainda andava; depois do ajuste à borda, ÁGUA e COMIDA grudaram, o cartão do gás cobriu o VENTILADOR e 10 rótulos de 0,6 s na
  tomada larga eram ilegíveis. Um quadro por rótulo não pegou nada disso.
- **Regra:** rótulo 3D projeta a âncora na tela e desliza para dentro da área segura (esquerda e os 12% da direita); rótulos
  que dividem a borda ficam em alturas diferentes; tomada larga usa multiplicador de largura (`etiqK`) e poucos rótulos (≤ 4,
  ≥ ~1,2 s cada, quase sem sobreposição).
- **Regra:** conferir rótulos em **três momentos** de cada janela e com o cartão de HUD da batida na tela, não em um quadro só.

## Escala dos aparelhos, o que já existe na casa e a ordem das peças (02/11/2026, episódio 9)

- **O que aconteceu:** no explicador da airfryer, o forno, a airfryer e o micro-ondas saíram gigantes ao lado do Zeca; usei um
  "forno de embutir" novo em vez do forno do próprio fogão; o forno "grande" já tinha ventilador antes de eu "ensinar" o
  ventilador; a batata aparecia em pedaços e o corte em palito só entrava no fim; e a fala dava a conta da água e o 180° para
  explicar o respingo.
- **Regra:** aparelho e móvel têm o tamanho real ao lado do Zeca (~1,7 m): airfryer ~30 cm, micro-ondas ~50 cm, forno do fogão
  na altura do joelho/cintura. Ao acertar a escala, aproxime a câmera dos objetos (≥ 45% da largura nas batidas que explicam a peça)
  e deixe o Zeca na borda ou fora do quadro, em vez de deixar o aparelho minúsculo.
- **Regra:** use o que a casa já tem (o forno do próprio fogão) antes de inventar um objeto novo na cena.
- **Regra:** uma peça só aparece na tela quando a fala a introduz. Se a cena de antes já mostra a peça (ventilador no forno),
  o "ponha um ventilador" fica sem sentido.
- **Regra:** o ingrediente já vem do jeito que a pessoa faz na vida real (batata frita é palito desde a primeira cena). Detalhe
  de preparo não vira "passo novo" no fim.
- **Regra:** o respingo do óleo é só "espirra". Nada de física da água nem de temperatura na fala quando a cena já mostra.
- **Regra:** a nota do "papel manteiga": é *parchment paper*, o termo está certo. Papel encerado/parafinado é outro produto.
  Antes de duvidar do termo da pessoa, pesquise.

## Aparelho com peças internas: centro da cavidade e carcaça em raio-X (03/11/2026, episódio 10)

- **Prato no centro da cavidade.** O prato e a tigela estavam 10 cm fora do centro (x 0,32 numa caixa de 0,22 a 0,62). Derive o centro
  da peça do centro da cavidade (`PX = CXM`, `PZ` = meio da profundidade) e não de um número solto.
- **Peça de máquina não fica na área de uso.** O magnetron estava dentro da cavidade, onde vai a comida. Ele mora na carcaça, ao lado
  da cavidade (atrás do painel), e a onda entra por uma abertura na parede. Vale para qualquer aparelho: a cavidade é só para a comida.
- **Mostrar por dentro = raio-X.** Para explicar as peças, a carcaça vira vidro com contorno (`raiox` 1) e a peça interna aparece.
  Com o aparelho fechado (uso normal), a carcaça é opaca e só a comida aparece. Nunca deixe a peça interna visível com a carcaça fechada.

## Publisher: caminho de mídia sempre relativo à pasta de conteúdo (03/11/2026)

- O servidor do publisher monta o NAS em `/content` (`/volume3/media:/content:ro`), então `media_path` e `cover_path` têm que ser **relativos**
  (`Videos Curtos/Educacionais/08-airfryer/final.mp4`), nunca `/mnt/nas-dxp6800pro/...`. Com caminho absoluto o story falhou 3 vezes
  com `FileNotFoundError` em `/tmp/ig_post_*/`.
- Cada episódio leva **dois stories**: teaser (arte `story-horario.png`) 4–5 h antes e "já saiu" 1–2 min depois do vídeo (18:01).
- Ao gerar a arte pela composição `capa`, o `episode` é `demo-3d/ep<NN>` onde NN = pasta do NAS + 1 (airfryer `ep09`, micro-ondas `ep10`).
- Conta errada no Instagram (03/11/2026): o publisher usava sessão em **cache** de outra conta; `check_connection` dizia "ok" mesmo assim (só prova que a sessão vive, não de quem é).
  Depois de mexer em credencial, a prova é um story de teste e a pessoa olhar o perfil. Antes de agendar vídeo, confirme o primeiro post na conta certa.

## Voz: `pausa` só vale entre pedidos; rótulo 3D depende da distância (04/11/2026, episódio 12)

- **O que aconteceu:** pus `pausa: 1.5` numa batida para segurar o close do cachorro em silêncio, mas a voz sai num pedido só para todas as batidas
  com a mesma configuração, e a pausa só é inserida entre pedidos: não houve silêncio. Os rótulos 3D (`etiqK`) que ficaram bons num quadro de teste saíram
  enormes no vídeo, porque a câmera andou e a letra é proporcional à distância da âncora.
- **Regra:** para ter silêncio no meio da fala, separe as batidas seguintes num `falante` com outra `seed` em `vozes` (gera outro pedido). Confira o
  `narrar` ("Gerando … em N pedido(s)").
- **Regra:** `etiqK` se confere no **vídeo final** (quadro no momento em que o rótulo aparece), nunca só nos quadros de teste; com câmera andando, escolha o
  valor pelo ponto em que o rótulo entra.
- **Regra:** cortes dentro de uma batida (vinhetas) devem seguir `trechos` e o tempo da fala, não frações da batida.

## Peça na mão, andor no ombro, rosto alegre e multidão de verdade (04/11/2026, episódio 12)

- **O que aconteceu:** no primeiro vídeo da procissão (1) a cruz e os ciriais atravessavam o corpo dos coroinhas; (2) o andor passava na altura do rosto, porque eu
  supus a altura do ombro sem medir; (3) a abertura mostrava o Zeca de costas; (4) quase todo mundo parecia triste: a expressão padrão `neutro` desse rosto tem
  pálpebra caída e eu ainda pus `preocupado` nas pessoas; (5) as velas ficaram todas na mesma altura, sem acompanhar a mão de cada pessoa; (6) a procissão tinha 8
  figurantes. A pessoa achou tudo isso vendo o vídeo, não os quadros de teste.
- **Regra:** objeto carregado fica **na frente do corpo, com as mãos nele** (pose própria dos braços), nunca no eixo do tronco. Objeto preso a uma pessoa escala
  com `altura / 1,6` do personagem (a mão muda de altura com a pessoa).
- **Regra:** altura de ombro do boneco ≈ 1,09 × (`altura`/1,6) × `esc`; para varas no ombro, iguale a altura dos carregadores (`esc = 1,06 × 1,6 / altura`) e ponha cada
  um **ao lado** da vara (x = vara ± 0,2), não embaixo dela.
- **Regra:** expressão padrão de figurante e de personagem principal é `sorriso` (ou `surpreso`); `neutro` e `preocupado` leem como tristeza. Só use triste quando a
  fala pede.
- **Regra:** procissão, torcida, fila e multidão têm **dezenas** de pessoas (30+), em fileiras; 8 parece cena de teatro. Abertura: câmera **na frente** do personagem
  principal, com o cenário atrás, nunca nas costas dele, salvo pedido.
- **Regra:** depois de mudar pose ou escala, confira o **vídeo final** em quadros de cada batida, não só os quadros de teste.

## Todo objeto levado está nas mãos, em toda vinheta; e o cenário vai para o palco certo (04/11/2026, episódio 12)

- **O que aconteceu:** depois de corrigir a cruz e os ciriais da rua, deixei objetos soltos no ar nas vinhetas: o livro do Evangelho na altura do rosto do padre, o pão e o
  vinho das ofertas, os ramos, a hóstia, a cruz da Sexta-feira Santa; os coroinhas da missa com os braços soltos ao lado dos ciriais; e o andor da festa do padroeiro
  desenhado em x = 0 enquanto o palco estava em x = 40 (só a imagem aparecia, "voando"). A boca aberta do Caramelo tinha a língua desenhada abaixo do queixo.
- **Regra:** ao corrigir um erro de um tipo (objeto na mão), procure **todas** as ocorrências do tipo no episódio, não só a que a pessoa apontou: busque cada objeto
  levado (`grep` pelo nome) e confira a pose de quem o leva (`SEGURA`, `SEGURA_D`, `COMUNHAO`).
- **Regra:** peça de cenário que não recebe `x` (andor, cruz) vai num `<group position>` do palco; confira no quadro que ela aparece junto das pessoas.
- **Regra:** boca aberta de bicho: interior escuro entre o focinho e a mandíbula, a mandíbula desce, a língua apoia nela; nunca uma faixa rosa solta abaixo do queixo.
- **Regra:** ao calcular quadros de conferência, leia o `fps` do `episode.json` (30), nunca suponha 25.

## Câmera: de vez em quando cinematográfica (04/11/2026, pedido da pessoa; ajustado no mesmo dia)

- As câmeras estavam estáticas demais, mas **nem toda batida precisa de movimento**. Regra: **de vez em quando** um ângulo ou movimento cinematográfico (diagonal três quartos, aproximação lenta, órbita curta, deslize, vista aérea, plano baixo), para o vídeo ficar com tom mais profissional.
- Dosagem: câmera parada é normal em batidas de leitura (rótulo, número, cartão); reserve o movimento para viradas, revelações, vitórias e aberturas. Evite o contrário: vídeo inteiro parado, ou vídeo inteiro balançando.
- **Diagonal** (três quartos, ~25 a 40°) como padrão em vez de "chapado" de frente; frente pura para efeito deliberado (final, cartão).
- Cenário com vida (fumaça, nuvem, luz, paralaxe) em todos os planos, mesmo com câmera parada.
- Movimento suave (easing), curto, sem cortes bruscos; a câmera serve à explicação e aproxima da peça que a fala explica.
- Referências da pessoa (reels de procissão e panela de pressão): travelling, vista aérea, close na peça.

## NUNCA gore; machucado e morte só simbólicos e leves (04/11/2026, regra permanente da série educativa)

- O canal é educativo e de tema adulto, mas os desenhos low poly parecem infantis e atraem criança. **Nunca gore**: sem sangue, ferida aberta, osso, corpo destroçado, queimadura realista.
- **Machucado pode, mas bem leve e simbólico:** o jeito aprovado é o do episódio da airfryer (o braço do Zeca fica **vermelho**, com um susto/careta). Use para simbolizar queimadura, batida, prensada etc. Sem sangue, sem curativo dramático.
- **Morte só quando o tema exigir** (ex.: não comer cogumelo da floresta): dizer na fala que "faz mal e pode matar"; se aparecer o boneco, **olhos em X (dois X)**, nada além disso, sem corpo caído em destaque, sem sangue. Estritamente quando necessário, nunca por efeito.
- O perigo continua sendo mostrado principalmente no objeto e no ambiente (teto quebrado, feijão espirrando, vapor forte, faísca, susto do Zeca recuando).
- Todo agente de roteiro/montagem recebe esta regra no prompt; vale para todas as séries educativas.
- **Estilo do machucado (04/11/2026): desenho animado, estilo Looney Tunes.** A parte atingida (ex.: mão presa na porta) **não machuca nem arranca**: ela **incha** (escala maior, em pulsos), **pulsa vermelho** e leva **efeito de impacto** (raios/estrelinhas/linhas de choque), com careta ou pulinho do Zeca. Sem sangue, sem ferida, sem deformação real. Combina com o braço vermelho da airfryer.

## Mecanismos muito bem animados: zíper e relógio (04/11/2026, pedido da pessoa)

- **Zíper:** animação de detalhe absurdo: os dentes esquerdo e direito **intercalando** em zigue-zague, o cursor juntando e separando em close/macro, cada dente entrando, fisicamente certo ao subir e descer.
- **Relógio:** monta-se **peça a peça**; as engrenagens vão **diminuindo** até virar relógio de pulso; todas as engrenagens estão lá, engrenando dente a dente, **movimento bonito e funcionando**; ponteiros certos; no fim o **vidro desce** sobre o mostrador e mostra como a **coroa (botão da direita)** funciona (puxar, acertar a hora, dar corda).
- Vale para a montagem de cena: dar tempo de tela ao mecanismo; macro em diagonal; nada de peças fingidas.

## Machucado de desenho animado: como fazer direito (elevador, 05/11/2026)

- A parte atingida **incha rápido e volta ao normal, várias vezes** (3 a 5 pulsos em ~1,5 s), pulsando vermelho, com **estrelas, raios e linhas de choque** em volta, estilo Tom & Jerry. **Uma bola vermelha parada não serve.**
- O Zeca **reage à dor**: cara de dor (olhos, boca, sobrancelha), corpo se contorcendo, pulo num pé só, sacudindo a mão, segurando o braço. **Nunca fica estático** num momento de dor ou susto.
- Cena que mostra algo acontecendo dentro de uma peça (mão encostando na parede do poço, por exemplo): câmera **dentro** da peça ou raio-X com contornos, mostrando a mão e a parede juntas e perto.

## Piscada: parede que alterna translúcida/opaca e rodapé que treme (para-raios, 05/11/2026)

- **O que aconteceu:** no rascunho do para-raios (1) em ~1:24 as paredes da casa piscavam entre translúcidas e opacas; (2) em ~1:03 o "rodapé" da casa tremia.
- **Causa 1 (opacidade):** a parede só recebe `opacity` durante o raio-X, então o material muda de `transparent={false}` para `true` no meio do vídeo. No three.js a flag
  entra no programa do shader (`opaque`, alfa fixo em 1) e mudar sem `needsUpdate` mantém o programa antigo. O render usa 16 abas em paralelo, e cada aba compilou o
  material num momento diferente: os quadros saíam opacos ou translúcidos conforme a aba. Reproduzi isolando quadros 2500-2540 (diferença média de 13 a 22 entre quadros
  vizinhos, contra ~2 depois da correção). Vale para todo material que alterna `transparent` (relogio-mec, abrigo, ponte, usina, submarino, paraquedas, ziper-mec, pista, cozinha-base...).
- **Correção:** `MateriaisEstaveis` em `motor/src/v3d/Palco.tsx` (e no plugin, `nucleo/src/v3d/Palco.tsx`): a cada commit confere `material.transparent` e põe
  `needsUpdate = true` quando mudou. Corrige o motor inteiro; nenhum cenário precisa de mudança.
- **Causa 2 (rodapé):** o piso da casa (`Caixa` 6 x 0,1 x 5) tinha o mesmo contorno externo das paredes (x ±3, z -2,6): faces coplanares com cores diferentes brigam
  (z-fighting) e piscam com a câmera. Correção: piso menor, por dentro das paredes (5,7 x 4,7).
- **Regra:** nunca deixe duas faces de cores diferentes no mesmo plano (piso, rodapé, faixa, janela, calçada): recue 1 a 3 cm ou deixe uma peça por dentro da outra.
- **Regra:** para suspeitar de piscada, renderize 30 a 70 quadros seguidos (`remotion render --sequence --frames=A-B`) e compare quadros vizinhos com PIL/numpy; saltos de diferença
  que alternam fora de cortes são piscada. Cortes e fades legítimos aparecem como 1 a 5 quadros de salto grande seguidos de volta ao normal.
- **Regra:** opacidade é função contínua do tempo (`valor`/`suave`); nunca `p > x` para trocar o material; sem `Math.random`, `Date` ou `performance.now`.

## Transição entre batidas: fusão cruzada, nunca "fade a partir do preto" (05/11/2026, pedido da pessoa)

- **O que acontecia:** toda batida entrava com opacidade 0→1 em 5 quadros sobre o fundo escuro: no corte o quadro ficava quase preto (salto de ~171 de diferença média) e depois uma rampa de ~34 por 5 quadros. Dava "piscada de preto" ~27 vezes por vídeo.
- **Agora (motor, `v2/Episodio.tsx`):** padrão é **fusão cruzada** (`transicao: "fusao"`): a batida que sai fica por baixo, congelada no último quadro (`Freeze`, componente `Fusao`), e a que entra sobe de 0 a 1 em 8 quadros (0,25 s). A linha do tempo não muda (mesmos `Sequence`, mesmas durações). A camada de baixo some depois da fusão, então só há 2 canvas WebGL por ~8 quadros.
- **Legenda** da batida que sai não aparece na camada de baixo; a da que entra fica fora da rampa (palavra no quadro certo, sem duplicar).
- **Opções:** por batida `"transicao": "corte"|"fusao"|"fade"|"whip"` e `"transicaoDur"` (s); no topo do roteiro `transicao`, `transicaoDur`, `transicaoFinal` (cartão final). Batida 1 sempre em corte. Para voltar ao comportamento antigo num episódio: `"transicao": "fade"` no topo.
- **Medição (ep16 quadros 420-510, ep13 1090-1160):** antes salto 163/173 + 5 quadros ~32-37 e luminância mínima 19,7; depois máx. 3,6 / 10,6 em torno do corte e luminância mínima 176/182. Teste sempre com `--frames=A-B` curto e PIL/numpy; não re-renderize episódio inteiro.

## Toda pessoa em cena é Boneco3D (05/11/2026, cadeado e zíper)

- Transeunte, ladrão, chefe, vizinho, figurante: **sempre personagem do rig `Boneco3D`** (zeca, homemA/B/C, mulher, menino, tio, coroinha etc., em `fieis.ts` / `usina.tsx`), com ação `andando` e braços balançando, expressão do rig e roupa própria. **Nunca cápsulas, caixas ou "duas formas geométricas".** Se o personagem não existe (chefe de camisa social e gravata), crie-o em `fieis.ts`.
- Objeto de uso (ferrolho, mola, alicate, martelo) tem que ter função legível: ferrolho entra num furo do batente (latch), mola encosta nas duas pontas, alicate-corta-vergalhão com hastes cruzadas e pivô, martelo nas duas mãos com antecipação e impacto.
- "Barbante" fica fora do vocabulário: é **corda**.

## Ambiência contínua de baixa frequência cansa (elevador, 06/11/2026, pedido da pessoa)

- **O que aconteceu:** no elevador (ep14) o loop `motor` (vol 0,1) ficou nas batidas 4 a 14 e o `zumbido` (0,06) em 15 a 17: ~82% do vídeo (113 s de 138) com um "drone" grave constante. Medido: piso de graves (40-250 Hz) a ~-27 dB entre 20 e 110 s, contra -35/-38 dB nas batidas sem ambiência.
- **Regra:** ambiência contínua de baixa frequência (motor, zumbido, drone) cansa: só nas batidas da peça (onde o motor aparece), volume baixo (~0,03-0,06) e com fade (1 s); nunca durante quase todo o vídeo. As outras batidas ficam em `nenhuma` (os sfx cuidam) ou com ar muito discreto.
- **Corrigir sem gastar voz:** editar `AMB` no gerador, o `ambiencia` do `roteiro.json` e o `som.json` (acrescentar `"fade": 1.0`), rodar `mixar.py ... --video <render sem áudio>` e `masterizar.sh`. Não rodar `narrar`. Medir antes/depois com o piso de graves por janelas de 10 s.
