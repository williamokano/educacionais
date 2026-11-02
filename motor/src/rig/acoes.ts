import { Acao, Pose, Vista } from "./types";

// Biblioteca de ações. Ângulos explicados em types.ts (Pose).
// Ciclos usam t em segundos; frequência ~1,6 passo/s andando, ~2,6 correndo.
// Ações de um golpe só (susto) contam t a partir do instante em que a ação começou.

const L1 = 62; // braço (igual a Boneco.tsx)
const L2 = 56; // antebraço
const OMBRO: Record<Vista, (lado: -1 | 1) => [number, number]> = {
  frente: (lado) => [47 * lado, 150], // meia largura do porte médio; nos outros portes a mão erra por poucos px
  perfil: () => [2, 154],
};
const grau = (r: number) => (r * 180) / Math.PI;
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

/**
 * Cinemática inversa do braço: devolve os ângulos que levam a mão até `alvo` (coordenadas do boneco:
 * cabeça em y≈72, ombro em y≈150, quadril em y≈285; x + = direita da tela de frente, + = para onde olha de perfil).
 * cotovelo "baixo" dobra para baixo (natural); "fora" abre para o lado.
 */
export const alcancar = (vista: Vista, lado: -1 | 1, alvo: [number, number], cotovelo: "baixo" | "fora" = "baixo"): [number, number] => {
  const [ox, oy] = OMBRO[vista](lado);
  let dx = alvo[0] - ox;
  let dy = alvo[1] - oy;
  let d = Math.hypot(dx, dy);
  const max = (L1 + L2) * 0.995;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  const [ux, uy] = [dx / d, dy / d];
  const [px, py] = [ox + ux * a, oy + uy * a];
  const op1: [number, number] = [px - uy * h, py + ux * h];
  const op2: [number, number] = [px + uy * h, py - ux * h];
  const fora = (p: [number, number]) => (vista === "frente" ? lado * p[0] : -p[0]);
  const [ex, ey] = cotovelo === "baixo"
    ? (op1[1] >= op2[1] ? op1 : op2)
    : (fora(op1) >= fora(op2) ? op1 : op2);
  const [hx, hy] = [ox + dx - ex, oy + dy - ey];
  if (vista === "frente") {
    return [grau(Math.atan2(lado * (ex - ox), ey - oy)), grau(Math.atan2(-lado * hx, hy))];
  }
  const a1 = grau(Math.atan2(ex - ox, ey - oy));
  return [a1, grau(Math.atan2(hx, hy)) - a1];
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const par = (a: [number, number], b: [number, number], k: number): [number, number] => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

/** Transição entre duas poses da mesma vista (k: 0 = a, 1 = b). Adereços trocam na metade. */
export const misturarPoses = (a: Pose, b: Pose, k: number): Pose => {
  if (k >= 1 || a.vista !== b.vista) return b;
  const n = (x?: number, y?: number, padrao = 0) => lerp(x ?? padrao, y ?? padrao, k);
  return {
    ...(k < 0.5 ? a : b),
    vista: b.vista,
    coluna: n(a.coluna, b.coluna),
    cabeca: n(a.cabeca, b.cabeca),
    bracoTras: par(a.bracoTras, b.bracoTras, k),
    bracoFrente: par(a.bracoFrente, b.bracoFrente, k),
    pernaTras: par(a.pernaTras, b.pernaTras, k),
    pernaFrente: par(a.pernaFrente, b.pernaFrente, k),
    encurtarCoxa: n(a.encurtarCoxa, b.encurtarCoxa, 1),
    encurtarCanela: n(a.encurtarCanela, b.encurtarCanela, 1),
    giroAdereco: n(a.giroAdereco, b.giroAdereco),
    pulo: n(a.pulo, b.pulo),
    boca: n(a.boca, b.boca),
    olhar: par(a.olhar ?? [0, 0], b.olhar ?? [0, 0], k),
    apoio: a.apoio || b.apoio
      ? { x: n(a.apoio?.x, b.apoio?.x, 30), ergue: n(a.apoio?.ergue, b.apoio?.ergue) }
      : undefined,
  };
};

const parado = (vista: Vista): Pose =>
  vista === "frente"
    ? { vista, bracoTras: [10, 0], bracoFrente: [10, 0], pernaTras: [3, 0], pernaFrente: [3, 0] }
    : { vista, bracoTras: [-4, 6], bracoFrente: [4, 8], pernaTras: [-3, 0], pernaFrente: [3, 0] };

const respirar = (t: number) => Math.sin(t * 2.2) * 1.2;

const ciclo = (t: number, freq: number, amp: number, joelho: number, braco: number, mancando = false): Pose => {
  const f = Math.sin(t * Math.PI * 2 * freq);
  const g = Math.sin(t * Math.PI * 2 * freq + Math.PI);
  // O joelho dobra quando a perna vai PRA FRENTE (recolhe pra dar o passo, derivada do quadril > 0)
  // e fica esticado quando o pé está no chão empurrando o corpo (perna indo pra trás).
  // Com a fase invertida o movimento é lido como andar de ré.
  // A perna ruim (frente) quase não dobra quando mancando.
  const kFrente = mancando ? 4 : Math.max(0, Math.cos(t * Math.PI * 2 * freq)) * joelho;
  const kTras = Math.max(0, Math.cos(t * Math.PI * 2 * freq + Math.PI)) * joelho;
  return {
    vista: "perfil",
    coluna: mancando ? 6 + Math.max(0, f) * 6 : amp > 30 ? 12 : 3,
    cabeca: mancando ? -4 : 0,
    pernaFrente: [f * amp * (mancando ? 0.6 : 1), kFrente],
    pernaTras: [g * amp, kTras],
    // quique: o corpo sobe quando a perna de apoio passa por baixo do quadril (duas vezes por ciclo)
    pulo: Math.abs(Math.cos(t * Math.PI * 2 * freq)) * (amp > 30 ? 9 : 4),
    bracoFrente: [g * braco, amp > 30 ? 70 : 12],
    bracoTras: [f * braco, amp > 30 ? 70 : 12],
    // bengala (se houver) acompanha a perna da frente: plantada enquanto ela empurra, erguida enquanto ela avança
    apoio: { x: 30 + f * amp * 1.2, ergue: Math.max(0, Math.cos(t * Math.PI * 2 * freq)) * 10 },
  };
};

/**
 * Andar de muleta (uma perna): em metade do ciclo as muletas estão plantadas e o corpo balança para a frente
 * com a perna no ar; na outra metade a perna está no chão e as muletas vão para a frente, erguidas.
 */
const andandoDeMuleta = (t: number, vista: Vista): Pose => {
  if (vista === "frente") return { ...parado(vista), apoio: { x: 0 } };
  const u = (t * 1.1) % 1;
  if (u < 0.5) {
    // muletas plantadas lá na frente; o corpo passa entre elas e a perna balança para a frente
    const s = u / 0.5;
    const a = -24 + 54 * s;
    const pe: [number, number] = [a, 34 * Math.sin(Math.PI * s)];
    return { vista, coluna: 14 - 8 * s, cabeca: -4, pernaFrente: pe, pernaTras: pe, bracoFrente: [20, 10], bracoTras: [20, 10], apoio: { x: 70 - 90 * s, ergue: 0 } };
  }
  // perna no chão empurrando; as muletas sobem e vão para a frente
  const s = (u - 0.5) / 0.5;
  const pe: [number, number] = [30 - 54 * s, 0];
  return {
    vista, coluna: 6 + 8 * s, cabeca: 0, pernaFrente: pe, pernaTras: pe, bracoFrente: [20, 10], bracoTras: [20, 10],
    apoio: { x: -20 + 90 * s, ergue: 22 * Math.sin(Math.PI * s) },
  };
};

const ACOES: Record<string, Acao> = {
  "em-pe": (t, vista) => ({ ...parado(vista), cabeca: respirar(t) }),

  andando: (t, vista) =>
    vista === "perfil"
      ? ciclo(t, 0.8, 24, 38, 22)
      : { ...parado(vista), bracoTras: [10 + Math.sin(t * 5) * 6, 0], bracoFrente: [10 - Math.sin(t * 5) * 6, 0] },

  mancando: (t) => ciclo(t, 0.55, 18, 30, 10, true),

  "andando-de-muleta": andandoDeMuleta,

  // de bruços no chão, braços cobrindo a cabeça (clarão, explosão). Sempre de perfil.
  "deitado-de-brucos": (t) => ({
    vista: "perfil", deitado: true, cabeca: -6 + Math.sin(t * 2.2) * 1.5,
    bracoFrente: [168, 34], bracoTras: [160, 30], pernaFrente: [2, 0], pernaTras: [-3, 0],
  }),

  // agachado diante de uma roda (escotilha, válvula), as duas mãos nela
  "segurando-roda": (_t, vista) =>
    vista === "perfil"
      ? { vista, coluna: 30, cabeca: 12, pernaFrente: [95, 140], pernaTras: [70, 150], bracoFrente: [62, 26], bracoTras: [56, 30] }
      : { vista, pernaTras: [25, 0], pernaFrente: [25, 0], encurtarCoxa: 0.25, bracoTras: [12, 70], bracoFrente: [12, 70] },

  // girando a roda: as mãos sobem e descem em fases opostas
  "girando-roda": (t, vista) => {
    const g = Math.sin(t * 5.5);
    return vista === "perfil"
      ? { vista, coluna: 30 + g * 3, cabeca: 12, pernaFrente: [95, 140], pernaTras: [70, 150], bracoFrente: [62 + g * 18, 26 - g * 14], bracoTras: [56 - g * 18, 30 + g * 14] }
      : { vista, pernaTras: [25, 0], pernaFrente: [25, 0], encurtarCoxa: 0.25, bracoTras: [12 + g * 10, 70 - g * 20], bracoFrente: [12 - g * 10, 70 + g * 20] };
  },

  // descendo (ou subindo) escada de mão, de perfil, de frente para os degraus; o deslocamento vertical vem da cena
  // (elevacao / deElevacao do personagem)
  "descendo-escada": (t) => {
    const p = Math.sin(t * Math.PI * 1.6);
    const a = 22 + 38 * (0.5 + 0.5 * p);
    const b = 22 + 38 * (0.5 - 0.5 * p);
    return {
      vista: "perfil", coluna: 6, cabeca: 18,
      bracoFrente: [128 + 22 * p, 30 - 8 * p], bracoTras: [128 - 22 * p, 30 + 8 * p],
      pernaFrente: [a, a], pernaTras: [b, b],
    };
  },

  correndo: (t, vista) =>
    vista === "perfil"
      ? ciclo(t, 1.3, 40, 80, 55)
      : { ...parado(vista), bracoTras: [25, 60], bracoFrente: [25, 60] },

  agachado: (_t, vista) =>
    vista === "perfil"
      ? { vista, coluna: 25, cabeca: -15, pernaFrente: [95, 140], pernaTras: [70, 150], bracoFrente: [40, 60], bracoTras: [30, 50] }
      : { vista, pernaTras: [25, 0], pernaFrente: [25, 0], encurtarCoxa: 0.25, bracoTras: [20, 60], bracoFrente: [20, 60] },

  // sentado no chão, joelhos dobrados, braços apoiados nos joelhos
  sentado: (t, vista) =>
    vista === "perfil"
      ? { vista, coluna: -4, cabeca: respirar(t), pernaFrente: [120, 77], pernaTras: [112, 68], bracoFrente: [31, 0], bracoTras: [26, 4] }
      : { vista, cabeca: respirar(t), pernaTras: [160, 8], pernaFrente: [160, 8], encurtarCoxa: 0.45, encurtarCanela: 0.6, bracoTras: [14, 30], bracoFrente: [14, 30] },

  encostado: (t, vista) =>
    vista === "perfil"
      ? { vista, coluna: -8, cabeca: -6 + respirar(t), pernaFrente: [12, 6], pernaTras: [-14, 0], bracoFrente: [-20, 100], bracoTras: [-20, 100] }
      : { vista, cabeca: -5 + respirar(t), bracoTras: [-10, 95], bracoFrente: [-10, 95], pernaTras: [3, 0], pernaFrente: [-6, 0] },

  apontando: (_t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), bracoFrente: [90, 0], coluna: 4 }
      : { ...parado(vista), bracoFrente: [95, -90] },

  "segurando-chaves": (t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), bracoFrente: [35, 70], maoFrente: "molho-chaves", giroAdereco: Math.sin(t * 3) * 8 }
      : { ...parado(vista), bracoFrente: [25, 140], maoFrente: "molho-chaves", giroAdereco: Math.sin(t * 3) * 8 },

  "girando-chave": (t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), coluna: 6, bracoFrente: [82, 8], bracoTras: [10, 30], maoFrente: "chave-triangular", giroAdereco: Math.min(t * 120, 90) }
      : { ...parado(vista), bracoFrente: [70, 90], maoFrente: "chave-triangular", giroAdereco: Math.min(t * 120, 90) },

  "ouvido-na-porta": (t, vista) =>
    vista === "perfil"
      ? { vista, coluna: 14, cabeca: 10 + respirar(t), bracoFrente: [70, 40], bracoTras: [20, 30], pernaFrente: [10, 4], pernaTras: [-14, 0] }
      : { ...parado(vista), cabeca: 14, bracoFrente: [120, 137] },

  "segurando-walkie": (t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), bracoFrente: [30, 80], maoFrente: "walkie" }
      : { ...parado(vista), cabeca: respirar(t), bracoTras: [10, 80], maoTras: "walkie" },

  "tapando-ouvidos": (_t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), coluna: 8, cabeca: 6, bracoFrente: [140, 100], bracoTras: [130, 110] }
      : { ...parado(vista), cabeca: 4, bracoTras: [135, 132], bracoFrente: [135, 132] },

  "mao-erguida": (t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), bracoFrente: [150, 160] }
      : { ...parado(vista), bracoFrente: [150 + Math.sin(t * 4) * 6, 175] },

  "negando-com-a-cabeca": (t, vista) => ({ ...parado(vista), cabeca: Math.sin(t * 9) * 9 }),

  // procura alguém: a cabeça e o olhar varrem de um lado para o outro
  "olhando-em-volta": (t, vista) => ({
    ...parado(vista),
    cabeca: Math.sin(t * 2.2) * (vista === "perfil" ? 4 : 7),
    olhar: [Math.sin(t * 2.2 + 0.4), -0.1],
    bracoFrente: vista === "perfil" ? [4, 8] : [12, 4],
  }),

  acenando: (t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), bracoFrente: [150, 20 + Math.sin(t * 9) * 25], cabeca: Math.sin(t * 2) * 2 }
      : { ...parado(vista), bracoFrente: [148 + Math.sin(t * 2) * 4, 172 + Math.sin(t * 9) * 26], cabeca: Math.sin(t * 2) * 3 },

  // mãos na altura do peito, cada uma num ritmo: quem explica ou discute.
  // De frente, a mão balança na vertical do ombro: com o cotovelo "baixo" a solução mais baixa alternava entre fora e
  // dentro do peito (salto de até 107 px entre dois quadros). "fora" mantém o cotovelo sempre aberto para o lado.
  gesticulando: (t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), coluna: 3, cabeca: Math.sin(t * 1.7) * 3,
          bracoFrente: alcancar(vista, 1, [52 + Math.sin(t * 3.3) * 14, 208 + Math.sin(t * 4.1) * 14]),
          bracoTras: alcancar(vista, -1, [30 + Math.sin(t * 2.9 + 1) * 10, 222 + Math.cos(t * 3.7) * 10]) }
      : { ...parado(vista), cabeca: Math.sin(t * 1.7) * 4,
          bracoFrente: alcancar(vista, 1, [34 + Math.sin(t * 3.3) * 14, 214 + Math.sin(t * 4.1) * 16], "fora"),
          bracoTras: alcancar(vista, -1, [-34 + Math.sin(t * 2.9 + 1) * 14, 220 + Math.cos(t * 3.7) * 14], "fora") },

  pensando: (t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), cabeca: -6 + Math.sin(t * 1.3) * 2, bracoFrente: alcancar(vista, 1, [40, 114]), bracoTras: alcancar(vista, -1, [26, 214]), olhar: [0.3, -0.7] }
      : { ...parado(vista), cabeca: 6 + Math.sin(t * 1.3) * 2, bracoFrente: alcancar(vista, 1, [8, 112]), bracoTras: alcancar(vista, -1, [24, 226], "fora"), olhar: [0.6, -0.7] },

  "bracos-cruzados": (t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), coluna: -3, cabeca: Math.sin(t * 2.2) * 1.2, bracoFrente: alcancar(vista, 1, [34, 212]), bracoTras: alcancar(vista, -1, [30, 206]) }
      : { ...parado(vista), cabeca: Math.sin(t * 2.2) * 1.2, bracoFrente: alcancar(vista, 1, [-28, 214], "fora"), bracoTras: alcancar(vista, -1, [28, 204], "fora") },

  // um golpe: pulinho para trás com os braços abertos, depois fica tenso tremendo
  susto: (t, vista) => {
    const k = clamp01(t / 0.18);
    const pulo = 26 * Math.sin(clamp01(t / 0.38) * Math.PI);
    const treme = t > 0.4 ? Math.sin(t * 31) * 1.6 : 0;
    return vista === "perfil"
      ? { ...parado(vista), coluna: lerp(0, -12, k), cabeca: lerp(0, -10, k), pulo,
          bracoFrente: [lerp(4, 70, k) + treme, lerp(8, 60, k)], bracoTras: [lerp(-4, 50, k), lerp(6, 70, k)], olhar: [0.2, -0.2] }
      : { ...parado(vista), cabeca: lerp(0, -4, k) + treme, pulo,
          bracoFrente: [lerp(10, 115, k) + treme, lerp(0, 150, k)], bracoTras: [lerp(10, 115, k) - treme, lerp(0, 150, k)], olhar: [0, -0.3] };
  },

  comemorando: (t, vista) => ({
    ...parado(vista),
    pulo: Math.abs(Math.sin(t * 6)) * 20,
    bracoFrente: vista === "perfil" ? [165 + Math.sin(t * 12) * 8, 10] : [160 + Math.sin(t * 12) * 8, 180],
    bracoTras: vista === "perfil" ? [155 + Math.sin(t * 12 + 1) * 8, 10] : [160 + Math.sin(t * 12 + 1) * 8, 180],
  }),

  "olhando-celular": (t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), cabeca: 12, bracoFrente: alcancar(vista, 1, [46, 196]), maoFrente: "celular", olhar: [0.4, 1] }
      : { ...parado(vista), cabeca: Math.sin(t * 1.1) * 2, bracoFrente: alcancar(vista, 1, [10, 196]), maoFrente: "celular", olhar: [0.2, 1] },

  // segura um objeto na frente do peito com as duas mãos (carteira, notas, documento: maoFrente vem da cena)
  segurando: (t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), cabeca: 10, bracoFrente: alcancar(vista, 1, [50, 200]), bracoTras: alcancar(vista, -1, [40, 206]), olhar: [0.4, 1], giroAdereco: Math.sin(t * 2) * 4 }
      : { ...parado(vista), bracoFrente: alcancar(vista, 1, [14, 200]), bracoTras: alcancar(vista, -1, [-14, 204]), olhar: [0, 1], giroAdereco: Math.sin(t * 2) * 4 },

  "mao-estendida": (t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), coluna: 6, bracoFrente: [78 + Math.sin(t * 5) * 3, 8] }
      : { ...parado(vista), bracoFrente: [62 + Math.sin(t * 5) * 3, 30] },

  abracando: (_t, vista) =>
    vista === "perfil"
      ? { ...parado(vista), coluna: 8, bracoFrente: [70, 110], bracoTras: [60, 110] }
      : { ...parado(vista), bracoTras: [30, 110], bracoFrente: [30, 110] },
};

export const NOMES_ACOES = Object.keys(ACOES);

export const poseDe = (acao: string, t: number, vista: Vista): Pose => {
  const fn = ACOES[acao];
  if (!fn) throw new Error(`ação desconhecida no banco: "${acao}" (existem: ${NOMES_ACOES.join(", ")})`);
  return fn(t, vista);
};
