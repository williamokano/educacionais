import { Pose3D } from "./tipos";

// Ações do personagem 3D: cada uma é uma função do tempo (s) que devolve ângulos por junta (rad).
// Convenções (personagem olhando para +z):
//   tronco.x > 0 inclina para a frente; cabeca.x > 0 olha para baixo, cabeca.y > 0 vira para a esquerda dele
//   ombroE/ombroD.x < 0 levanta o braço para a frente; ombroE.z > 0 e ombroD.z < 0 abrem o braço para o lado
//   cotoveloE/D.x < 0 dobra o antebraço para a frente; cotoveloE.z > 0 / cotoveloD.z < 0 dobra para fora
//   pernaE/D.x < 0 leva a coxa para a frente; joelhoE/D.x > 0 dobra o joelho
//   quadril.y = sobe/desce (m); dedo = 0..1 (indicador esticado); maos = 0..1 (mãos abertas)

export const JUNTAS = [
  "quadril.y", "quadril.x", "tronco.x", "tronco.y", "tronco.z", "cabeca.x", "cabeca.y", "cabeca.z",
  "ombroE.x", "ombroE.z", "ombroD.x", "ombroD.z", "cotoveloE.x", "cotoveloE.z", "cotoveloD.x", "cotoveloD.z",
  "pernaE.x", "pernaE.z", "pernaD.x", "pernaD.z", "joelhoE.x", "joelhoD.x", "dedo", "maos",
] as const;

const respira = (t: number): Pose3D => ({ "tronco.x": 0.02 + Math.sin(t * 2.1) * 0.012, "cabeca.x": Math.sin(t * 2.1 + 0.6) * 0.015 });

const braçosSoltos: Pose3D = { "ombroE.z": 0.12, "ombroD.z": -0.12, "cotoveloE.x": -0.18, "cotoveloD.x": -0.18 };

export const ACOES_3D: Record<string, (t: number) => Pose3D> = {
  "em-pe": (t) => ({ ...braçosSoltos, ...respira(t), "maos": 0.2 }),

  acenando: (t) => ({
    ...respira(t), "ombroE.z": 0.12, "cotoveloE.x": -0.18,
    "ombroD.z": -2.0, "ombroD.x": -0.25, "cotoveloD.z": -0.9 + Math.sin(t * 9) * 0.38, "maos": 1,
    "cabeca.z": Math.sin(t * 4.5) * 0.04, "tronco.z": 0.03,
  }),

  apontando: (t) => ({
    ...respira(t), "ombroE.z": 0.1, "cotoveloE.x": -0.2,
    "ombroD.x": -1.2 + Math.sin(t * 1.6) * 0.03, "ombroD.z": -0.85, "cotoveloD.x": -0.1, "dedo": 1,
    "tronco.y": -0.15, "cabeca.y": -0.45,
  }),

  explicando: (t) => {
    const g = Math.sin(t * 3.2);
    const h = Math.sin(t * 3.2 + 1.3);
    return {
      ...respira(t),
      "ombroE.x": -0.35 + g * 0.08, "ombroE.z": 0.32, "cotoveloE.x": -1.15 - g * 0.18, "cotoveloE.z": 0.25,
      "ombroD.x": -0.4 + h * 0.08, "ombroD.z": -0.32, "cotoveloD.x": -1.1 - h * 0.2, "cotoveloD.z": -0.25,
      "maos": 1, "cabeca.x": Math.sin(t * 3.2 + 0.4) * 0.04, "cabeca.z": Math.sin(t * 1.4) * 0.05,
    };
  },

  pensando: (t) => ({
    ...respira(t),
    // mão direita no queixo, braço esquerdo cruzado segurando o cotovelo
    "ombroD.x": -0.95, "ombroD.z": 0.4, "cotoveloD.x": -2.35, "cotoveloD.z": 0.15,
    "ombroE.x": -0.45, "ombroE.z": -0.1, "cotoveloE.x": -1.55, "cotoveloE.z": -0.55,
    "cabeca.z": 0.12 + Math.sin(t * 1.2) * 0.02, "cabeca.x": -0.08, "tronco.y": 0.05,
  }),

  comemorando: (t) => {
    const pulo = Math.max(0, Math.sin(t * 7.5));
    return {
      "quadril.y": pulo * 0.09, "tronco.x": -0.06,
      "ombroE.z": 2.55 + Math.sin(t * 7.5) * 0.12, "ombroD.z": -2.55 - Math.sin(t * 7.5) * 0.12,
      "cotoveloE.z": 0.25, "cotoveloD.z": -0.25, "maos": 1,
      "pernaE.x": -pulo * 0.25, "pernaD.x": -pulo * 0.25, "joelhoE.x": pulo * 0.5, "joelhoD.x": pulo * 0.5,
      "cabeca.x": -0.12,
    };
  },

  andando: (t) => {
    const c = t * 6.8; // passos por segundo ~ 1,1
    const s = Math.sin(c);
    return {
      "quadril.y": Math.abs(Math.cos(c)) * 0.035 - 0.02, "tronco.x": 0.06, "tronco.y": s * 0.06,
      "pernaE.x": s * 0.5, "pernaD.x": -s * 0.5,
      "joelhoE.x": Math.max(0, -Math.cos(c)) * 0.75 + 0.05, "joelhoD.x": Math.max(0, Math.cos(c)) * 0.75 + 0.05,
      "ombroE.x": -s * 0.45, "ombroD.x": s * 0.45, "ombroE.z": 0.1, "ombroD.z": -0.1,
      "cotoveloE.x": -0.35, "cotoveloD.x": -0.35, "cabeca.y": -s * 0.04,
    };
  },

  sentado: (t) => ({
    ...braçosSoltos, ...respira(t),
    "quadril.y": -0.16, "pernaE.x": -1.5, "pernaD.x": -1.5, "joelhoE.x": 1.5, "joelhoD.x": 1.5,
    "ombroE.x": -0.5, "ombroD.x": -0.5, "cotoveloE.x": -0.7, "cotoveloD.x": -0.7,
  }),

  // mão direita abanando a camisa perto do peito (calor)
  abanando: (t) => ({
    ...respira(t), "ombroE.z": 0.12, "cotoveloE.x": -0.2,
    "ombroD.x": -0.55, "ombroD.z": 0.25, "cotoveloD.x": -1.9 + Math.sin(t * 14) * 0.25, "cotoveloD.z": 0.2, "maos": 1,
    "cabeca.x": -0.12, "cabeca.z": Math.sin(t * 2) * 0.04,
  }),

  // coçando a cabeça (dúvida)
  "cocando-cabeca": (t) => ({
    ...respira(t), "ombroE.z": 0.12, "cotoveloE.x": -0.2,
    "ombroD.z": -2.25, "ombroD.x": -0.35, "cotoveloD.x": -1.9, "cotoveloD.z": -0.9 + Math.sin(t * 9) * 0.12,
    "cabeca.z": 0.12, "cabeca.x": 0.05,
  }),

  // mão na testa (deu errado)
  "mao-na-testa": (t) => ({
    ...respira(t), "ombroE.z": 0.15, "cotoveloE.x": -0.25,
    "ombroD.x": -1.45, "ombroD.z": 0.35, "cotoveloD.x": -2.2, "cotoveloD.z": 0.3, "maos": 1,
    "cabeca.x": 0.22, "tronco.x": 0.08,
  }),

  "bracos-cruzados": (t) => ({
    ...respira(t),
    "ombroE.x": -0.55, "ombroE.z": -0.05, "cotoveloE.x": -1.75, "cotoveloE.z": -0.75,
    "ombroD.x": -0.55, "ombroD.z": 0.05, "cotoveloD.x": -1.65, "cotoveloD.z": 0.7,
    "cabeca.x": -0.04, "cabeca.z": Math.sin(t * 1.3) * 0.03,
  }),

  // as duas mãos trabalhando numa bancada (montar, soldar, girar uma válvula)
  mexendo: (t) => {
    const g = Math.sin(t * 6);
    return {
      ...respira(t), "tronco.x": 0.18, "cabeca.x": 0.3,
      "ombroE.x": -0.75 + g * 0.06, "ombroE.z": 0.1, "cotoveloE.x": -0.9, "cotoveloE.z": 0.3,
      "ombroD.x": -0.8 - g * 0.06, "ombroD.z": -0.1, "cotoveloD.x": -0.85, "cotoveloD.z": -0.3, "maos": 0.6,
    };
  },

  // encostado, braços abertos sobre o encosto (alívio, conforto)
  relaxado: (t) => ({
    ...respira(t), "tronco.x": -0.12,
    "ombroE.z": 1.15, "ombroE.x": 0.3, "cotoveloE.x": -0.35, "cotoveloE.z": 0.2,
    "ombroD.z": -1.15, "ombroD.x": 0.3, "cotoveloD.x": -0.35, "cotoveloD.z": -0.2,
    "cabeca.x": -0.1, "maos": 0.5,
  }),

  // abraçando o próprio corpo, ombros encolhidos, tremendo de frio
  tremendo: (t) => {
    const b = Math.sin(t * 38) * 0.025;
    return {
      ...respira(t), "tronco.x": 0.1, "tronco.z": b,
      "ombroE.x": -0.75, "ombroE.z": -0.12 + b, "cotoveloE.x": -1.85, "cotoveloE.z": -0.8,
      "ombroD.x": -0.7, "ombroD.z": 0.12 - b, "cotoveloD.x": -1.8, "cotoveloD.z": 0.78,
      "cabeca.x": 0.12, "cabeca.z": -b * 1.4, "maos": 0.3,
    };
  },

  surpreso: (t) => ({
    ...respira(t), "tronco.x": -0.1, "cabeca.x": -0.1,
    "ombroE.z": 0.55, "ombroD.z": -0.55, "cotoveloE.x": -1.6, "cotoveloD.x": -1.6, "cotoveloE.z": 0.5, "cotoveloD.z": -0.5, "maos": 1,
  }),
};

/** Juntas que a pose "sentado" decide quando combinada com outra ação ("sentado+abanando"). */
const PERNAS = ["quadril.y", "quadril.x", "pernaE.x", "pernaE.z", "pernaD.x", "pernaD.z", "joelhoE.x", "joelhoD.x"] as const;

export const poseDe3D = (acao: string, t: number): Pose3D => {
  // "sentado+X": pernas e quadril sentados, tronco, braços e cabeça da ação X
  if (acao.startsWith("sentado+")) {
    const cima = poseDe3D(acao.slice(8), t);
    const base = ACOES_3D.sentado(t);
    const out: Pose3D = { ...cima };
    for (const j of PERNAS) out[j] = base[j];
    return out;
  }
  const f = ACOES_3D[acao];
  if (!f) throw new Error(`ação 3D desconhecida: "${acao}" (existem: ${Object.keys(ACOES_3D).join(", ")})`);
  return f(t);
};

export const misturar3D = (a: Pose3D, b: Pose3D, k: number): Pose3D => {
  const out: Pose3D = {};
  for (const j of JUNTAS) out[j] = (a[j] ?? 0) + ((b[j] ?? 0) - (a[j] ?? 0)) * k;
  return out;
};
