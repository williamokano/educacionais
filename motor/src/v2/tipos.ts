import { Expressao, Variante, Vista } from "../rig/types";
import { Word } from "../types";

// Roteiro v2 (roteiro.json → episode.json). Nomes em português, iguais ao JSON do roteiro.
// O vocabulário completo, com o que cada campo faz na tela, está em motor/docs/roteiro-v2.md.

/** Troca de ação/expressão/vista no meio da batida, quando começa o trecho `trecho` da fala. */
export type Mudanca = { trecho: number; acao?: string; expressao?: Expressao; vista?: Vista; atraso?: number };

export type PersonagemEmCena = {
  id: string;
  vista: Vista;
  acao: string;
  expressao: Expressao;
  x: number; // 0..1 da largura; com `de`, é onde o personagem chega
  de?: number; // x de partida: o personagem anda de `de` até `x` durante a batida
  tempoMov?: number; // segundos que leva para chegar (padrão: 85% da batida)
  acaoChegada?: string; // ação depois de chegar (padrão: "em-pe")
  vistaChegada?: Vista; // vista depois de chegar (padrão: a mesma; "frente" = vira para a câmera)
  look?: string;
  variante?: Variante;
  escala?: number;
  espelhar?: boolean; // perfil olhando para a esquerda (com `de`, sai sozinho do sentido do movimento)
  entra?: number; // índice do trecho da fala em que o personagem aparece
  muda?: Mudanca[];
  fala?: boolean | number[]; // a boca acompanha as palavras da batida (true) ou só as dos trechos listados
  olhar?: number; // -1..1: para onde as pupilas vão (- = esquerda da tela)
  mao?: string; // adereço na mão da frente (carteira, notas, documento, celular…)
  enquadramento?: string; // recorte do pacote (ex.: "fresta", um recorte próprio do pacote)
  elevacao?: number; // px acima do chão (escada, cama, telhado); sem sombra no chão quando > 0
  deElevacao?: number; // elevação de partida: vai de `deElevacao` até `elevacao` em `tempoMov`
  alvo?: string;
};

/** Diagramas e cartões são abertos: o tipo escolhe o componente (genérico ou do pacote da série). */
export type Elemento = { tipo: string; [campo: string]: any };
export type Diagrama = Elemento;
export type Cartao = Elemento;

export type Efeito = { tipo: string; alvo?: string };

export type Plano = "geral" | "medio" | "close" | "detalhe";

export type Movimento = "zoom-lento" | "zoom-saindo" | "tilt-subindo" | "pan-direita" | "pan-esquerda" | "parado";

export type Som = string | { som: string; em?: number; trecho?: number; volume?: number; fim?: number; dur?: number; abaixa?: boolean };

export type CenaV2 = {
  cenario: string;
  clima?: "neutro" | "manha" | "entardecer" | "noite" | "tensao" | "perigo" | "lembranca" | "recap";
  hud?: boolean; // false = sem HUD (cold open)
  legenda?: "topo" | "padrao"; // topo = y 420–640, quando a ação ocupa a parte de baixo
  transicao?: "fade" | "corte" | "whip";
  personagens?: PersonagemEmCena[];
  diagramas?: Diagrama[];
  cartoes?: Cartao[];
  efeitos?: Efeito[];
  sfx?: Som[];
  ambiencia?: string; // som em loop até a próxima cena que mudar de ambiência ("nenhuma" corta)
  camera?: { plano?: Plano; movimento?: Movimento; tremor?: boolean; foco?: string;
    // 3D: ponto de câmera do cenário (nome) ou { pos, alvo, fov }; sem `de`, continua da batida anterior
    de?: string | { pos: [number, number, number]; alvo: [number, number, number]; fov?: number };
    para?: string | { pos: [number, number, number]; alvo: [number, number, number]; fov?: number };
    tempo?: number; // s que a câmera leva de `de` até `para` (padrão: a batida inteira)
  };
  /** luz da cena sobre os personagens: x/y 0..1 da tela, cor, força da borda, ambiente (<1 escurece) */
  luz?: { x: number; y: number; cor?: string; forca?: number; ambiente?: number };
  [campo: string]: any; // estado do cenário (porta, painel, objetos em cena…), lido pelo componente do pacote
};

export type BatidaV2 = { start: number; end: number; segmentStarts: number[]; scene: CenaV2; words: Word[] };

export type CartaoFinal = { parte?: number; pergunta?: string; chamada?: string; [campo: string]: any };

export type EpisodioV2 = {
  version: 2;
  slug: string; // pacote do banco (banco/index.ts)
  idioma?: string; // idioma de saída (pt, de, en, es): legenda e textos fixos do motor
  series: string;
  episode: number;
  clock?: string;
  tema?: string; // sobrescreve o tema do pacote (banco/temas)
  fps: number;
  audio: string | null; // null = vídeo mudo (cena avulsa)
  endcardStart: number;
  durationInFrames: number;
  endcard: CartaoFinal | null;
  beats: BatidaV2[];
};
