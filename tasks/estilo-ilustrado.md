# Estilo ilustrado animado (referência: vídeo do @cronicasdosbarros)

Análise de um vídeo de 1:44 (1080×1920, 30 fps), com quadros seguidos a 6 por segundo em cinco planos, e um plano
para fazer esse estilo no motor.

## O que o vídeo faz

- **Cada plano é um clipe curto de vídeo gerado (imagem para vídeo) a partir de uma ilustração.** São uns 25 planos
  de 2 a 7 s. Na amostra densa:
  - o vapor da cafeteira sobe e a chama passa de azul para laranja;
  - no plano geral da sala, a câmera anda de verdade: a bicicleta se desloca contra a parede do fundo (paralaxe),
    coisa que um zoom 2D não faz;
  - o personagem de costas mexe os braços e a cabeça.

  Há sinais típicos de modelo de vídeo: uma mancha escura que aparece e some perto da bicicleta, e a textura que
  "ferve" de leve.
- **O movimento é pequeno de propósito:** câmera lenta, um gesto, fumaça, luz. Ninguém atravessa a cena, nada
  vira de lado e nenhum rosto fala. É o regime em que esses modelos quase não erram.
- **O primeiro quadro de cada clipe é uma ilustração aprovada.** O mesmo apartamento aparece pelo menos 3 vezes com
  o mesmo desenho (azul de manhã, abajur quente à noite, personagem em outro lugar). A continuidade sai das imagens
  de partida, não do modelo de vídeo. As variações vêm de edição de imagem com referência ("mesma sala, ele em pé no
  meio com as mãos na cabeça").
- **O personagem não tem como sair diferente.** A cabeça é uma esfera branca lisa (olhos e sobrancelhas só às
  vezes), e a roupa é simples: jaqueta escura com faixa refletiva e luvas. O modelo de vídeo não tem rosto para
  deformar nem detalhe para esquecer. O pai, mais detalhado, só aparece num retrato pequeno e fixo.
- **A interface é feita por código, por cima do vídeo**, com as mesmas fontes (condensada + monoespaçada):
  - HUD com relógio, "SOBREVIVA 72H", água, comida e bateria;
  - painel de missões com checklist e carimbo "MISSÃO CONCLUÍDA";
  - inventário;
  - celular com áudio;
  - caixa de diálogo com retrato e texto sendo digitado;
  - onomatopeias e toques na tela.
  É nítida e nunca alucina, e conta metade da história. Por isso bastam poucos clipes.

**Por que não parece IA:** clipes curtos com pouco movimento, todos partindo de ilustrações aprovadas no mesmo
traço, um personagem sem rosto e tudo o que precisa ser exato (texto, números, interface) feito por código.

## Como montar no motor

O motor já tem a camada de cima: HUD, cartões, legenda palavra a palavra, `sfx`, `ambiencia` e o tempo pela voz.
Falta a camada de baixo, que é clipe gerado por batida.

1. **Bíblia de arte da série** (`series/<slug>/arte/`):
   - folha do personagem: frente, costas, perfil e 3 poses;
   - cada locação em 2 ou 3 ângulos;
   - os adereços que voltam.
   Tudo com status no catálogo (rascunho → aprovado). Um personagem fácil de manter igual (silhueta forte, rosto
   mínimo) é decisão de design da `nova-serie`, não detalhe.
2. **Quadro-chave por batida** (`pipeline/arte.py`):
   - cada plano é a **edição** de uma placa aprovada, não uma imagem do zero;
   - o prompt de estilo fica fixo na `identidade.md`, com cache por hash e uma folha de variantes para aprovar;
   - provedores com a interface do `pipeline/voz/`: ComfyUI local na 5090 (FLUX.1 Kontext, Qwen-Image-Edit) ou
     API (gpt-image, Gemini/Nano Banana, Seedream).
3. **Movimento por batida** (`pipeline/movimento.py`):
   - imagem para vídeo a partir do quadro-chave, com a duração da batida (que sai da voz);
   - o prompt de movimento vem do roteiro e é curto e pequeno ("câmera empurra devagar, vapor sobe, ele leva as
     mãos à cabeça");
   - quando o plano seguinte continua o mesmo, usar primeiro e último quadro (FLF2V) para o clipe terminar onde o
     próximo começa;
   - cada batida sai com 2 a 4 sementes e uma folha de contato para escolher; a que deformar é refeita ou volta
     para a placa parada com push por código;
   - na 5090: Wan 2.2 I2V/FLF2V (14B em fp8) ou LTX-Video no ComfyUI, em 720p, com upscale para 1080×1920;
   - por API: Kling, Veo, Seedance, Runway.
4. **LoRA da série** (na 5090): com 20 a 30 imagens aprovadas, um LoRA do traço e do personagem para o gerador de
   imagem, e se der, também para o de vídeo. Isso trava o estilo.
5. **Cenário genérico `clipe` no motor:** toca o MP4 da batida (`OffthreadVideo`) cortado e ajustado à duração,
   com `brilhos` e partículas opcionais por código, e o HUD, os cartões e a legenda por cima.
6. **Cartões de jogo** no pacote da série: missão, inventário, diálogo com retrato e digitação, celular, toque na
   tela, onomatopeia.

Ordem sugerida:
1. cenário `clipe` com clipes feitos à mão, para testar ritmo e interface;
2. cartões de jogo;
3. `pipeline/arte.py` e `pipeline/movimento.py` com um provedor por API;
4. ComfyUI local (Wan 2.2) e LoRA na 5090.
