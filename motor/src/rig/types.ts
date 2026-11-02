// Contratos do banco de assets: personagem = corpo (fixo) + look (trocável) + pose (por batida).

export type Vista = "frente" | "perfil";

export type Estado = "nova" | "gasta" | "rasgada" | "remendada" | "suja";

/** Uma peça do guarda-roupa. As cores são semânticas do asset; o tema decide como desenhar. */
export type Peca = {
  id: string;
  cor: string;
  cor2?: string; // detalhe (faixa, gola, viseira…)
  // tronco: "faixa-refletiva", "cracha", "ziper", "gola", "bolsos", "estetoscopio", "capuz" (abaixado), "fone-pescoco",
  //         "camiseta-por-baixo" (cor2), "camisa-para-fora" (cor2), moletom: "bolso-canguru", "punhos", "cordao" (cor2)
  // pernas: "faixa-refletiva", "bermuda" · pés: "cano-alto"
  detalhes?: string[];
  cores?: Record<string, string>; // cor própria de um detalhe, ex.: { "fone-pescoco": "#D9D6CE" }
  estado?: Estado[];
};

/** Encaixes. "macacao" cobre tronco + braços + pernas de uma vez (macacão de trabalho, hazmat). */
export type Look = {
  nome: string;
  macacao?: Peca;
  tronco?: Peca;
  pernas?: Peca;
  pes: Peca;
  maos?: Peca; // luvas; sem luva = pele
  // cabeca: "bone", "gorro", "capuz" (de moletom, levantado; esconde o cabelo), "fone" (de ouvido, na cabeça),
  //         "lanterna-cabeca", "lenco", "capuz-hazmat"
  cabeca?: Peca;
  /** pulsos: "relogio" ou "pulseira", por lado do corpo do personagem */
  pulsos?: { direito?: Peca; esquerdo?: Peca };
  cintura?: Peca; // cinto de ferramentas
  costas?: Peca; // mochila
  mangaCurta?: boolean;
  /** O look pode mudar o corpo: fases do tempo (barba que cresce, mais magro). Campos ausentes vêm do corpo. */
  corpo?: Partial<Omit<Corpo, "rosto">> & { rosto?: Corpo["rosto"] };
  /** Adereços que fazem parte do look (ex.: gravata enrolada na mão). A ação pode sobrescrever. */
  aderecos?: { maoFrente?: string; maoTras?: string };
};

export type TipoCabelo =
  | "curto" | "raspado" | "cacheado" | "coque" | "careca-lados" | "platinado-curto"
  | "careca" | "longo" | "rabo-de-cavalo" | "chanel";

/** Membro do lado direito/esquerdo DO PERSONAGEM (de frente, o direito fica à esquerda da tela). */
export type Membros = {
  bracoDireito?: "ausente";
  bracoEsquerdo?: "ausente";
  pernaDireita?: "ausente" | "pau";
  pernaEsquerda?: "ausente" | "pau";
};

export type Corpo = {
  pele: string;
  altura: number; // 1 = adulto padrão
  porte: "magro" | "medio" | "forte";
  silhueta?: "masculina" | "feminina"; // padrão masculina (tronco reto)
  /** idade ajusta proporções e postura (bebê: cabeça grande, membros curtos; idoso: costas curvadas, rugas) */
  idade?: "bebe" | "crianca" | "adulto" | "idoso";
  /** sobrescreve o que a idade define: tronco e membros em fração do adulto */
  proporcao?: { tronco?: number; membros?: number };
  cabecaEscala?: number; // >1 para crianças (cabeça proporcionalmente maior)
  cabelo: { tipo: TipoCabelo; cor: string };
  // barbaTipo: padrão "queixo" · oculosTipo: padrão "grau" (só a armação); "escuro" = lentes pretas
  rosto?: {
    bigode?: string; barba?: string; barbaTipo?: "queixo" | "rala" | "cheia";
    oculos?: string; oculosTipo?: "grau" | "escuro"; brincos?: string; rugas?: boolean; cilios?: boolean;
  };
  membros?: Membros;
};

export type Personagem = {
  id: string;
  nome: string;
  corpo: Corpo;
  looks: Record<string, Look>;
};

export type Expressao =
  | "neutro" | "alerta" | "cansado" | "concentrado" | "tenso" | "medo" | "serio" | "alivio" | "suplicante"
  | "raiva" | "dor" | "sorriso" | "preocupado";

/**
 * Ângulos em graus.
 * frente: braço [abre pra fora, antebraço absoluto (0 = pra baixo, 180 = pra cima, >90 volta pra cabeça)];
 *         perna [coxa: abre pra fora (>90 = joelho acima do quadril), canela: ângulo absoluto (0 = pra baixo)].
 * perfil: 0 = pra baixo, positivo = pra frente (lado que o personagem olha);
 *         braço [ombro, cotovelo (dobra pra frente)], perna [quadril, joelho (dobra pra trás)].
 */
export type Pose = {
  vista: Vista;
  coluna?: number; // inclinação do tronco (perfil: + = pra frente; frente: + = pra direita da tela)
  cabeca?: number; // inclinação da cabeça
  bracoTras: [number, number];
  bracoFrente: [number, number];
  pernaTras: [number, number];
  pernaFrente: [number, number];
  encurtarCoxa?: number; // 1 = normal; 0.3 = coxa apontando pra câmera
  encurtarCanela?: number; // idem, para a canela (sentado de frente: pés vindo pra câmera)
  maoTras?: string; // adereço
  maoFrente?: string;
  giroAdereco?: number; // graus extras no adereço da mão da frente (ex.: girando a chave)
  deitado?: boolean;
  pulo?: number; // corpo inteiro sobe (px do rig): susto, comemoração, quique do passo
  boca?: number; // 0..1 abre a boca por cima da expressão (fala)
  olhar?: [number, number]; // desvio das pupilas, -1..1 em x (+ = direita da tela) e y (+ = baixo)
  /**
   * Ponta do apoio (muleta, bengala) no chão: x relativo ao corpo (perfil: + = à frente) e quanto a ponta
   * sobe enquanto o apoio vai para a frente. Sem isto, o apoio fica plantado ao lado do pé.
   */
  apoio?: { x: number; ergue?: number };
};

/** Ação = pose em função do tempo (s). Estáticas ignoram t; ciclos usam t. */
export type Acao = (t: number, vista: Vista) => Pose;

export type Variante = "normal" | "infectado";

export type Tema = {
  nome: string;
  contorno: number; // espessura do traço em cada peça (0 = sem contorno, como no tema "plano")
  /** membros afinando nas juntas, tronco com forma, orelhas e nariz */
  detalhado?: boolean;
  corContorno: string;
  sombraMembroTras: number; // escurece o braço/perna de trás no perfil (0..1)
  tinta: string; // olhos, sobrancelhas
  boca: string;
  infectado: { pele: string; olho: string };
};
