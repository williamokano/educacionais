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
