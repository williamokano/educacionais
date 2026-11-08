import { JUNTAS, misturar3D, poseDe3D } from "./acoes";
import { suave } from "./anima";
import { Expressao3D, Pose3D } from "./tipos";

// Pose do personagem (o Zeca) dentro de um cenário 3D, SEM saltos. Os cenários guardam `gente` com
//   acao: "pulo" | [[progresso_fim, "acao", "exp"?], ...]      pose: {juntas} | [[progresso_fim, {juntas}], ...]
// e cada chave vale até o seu progresso_fim; na virada para a próxima ela é INTERPOLADA em ~0,3 s (ease), em todas as
// juntas, em vez de trocar de uma vez. Além disso, `ant` (gravado pelo gerador, tasks/geradores/_base.py: suavizar)
// diz de onde o personagem veio na batida anterior: a pose de entrada, que se desfaz nos primeiros `entradaDur`
// segundos, e a posição, que desliza se `ant.mover`. O corte de câmera continua sendo o único salto.

export const MISTURA_GENTE = 0.3;

export type PoseChaves = Pose3D | [number | string, Pose3D][];
export type AcaoChaves = string | [number | string, string, string?][];
export type Anterior = { acao: string; exp?: string; pose?: Pose3D; incl?: number; x?: number; y?: number; z?: number; rot?: number; dur?: number; mover?: boolean };
export type GenteBase = { acao?: AcaoChaves; exp?: string; pose?: PoseChaves; ant?: Anterior; entradaDur?: number };

/** `t` = segundos desde o início da batida; `tAbs` = desde o início do episódio; `abs` = o ciclo da ação anda com tAbs (senão com t); `vel` multiplica o tempo do ciclo */
export type OpcoesGente = { p: number; t: number; tAbs: number; abs?: boolean; vel?: number; incl?: number; chv?: (k: any) => number };

/** posição da chave ativa no progresso p e quanto ela já substituiu a anterior (0..1) */
const chave = <T extends [number | string, ...unknown[]]>(lista: T[], p: number, dur: number, f: (k: any) => number): { i: number; k: number } => {
  let i = lista.findIndex((x) => p <= f(x[0]));
  if (i < 0) i = lista.length - 1;
  const k = i > 0 ? suave(((p - f(lista[i - 1][0])) * dur) / MISTURA_GENTE) : 1;
  return { i, k };
};

const sobrepor = (a: Pose3D, b: Pose3D, base: Pose3D, k: number): Pose3D => {
  const out: Pose3D = {};
  for (const j of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[j] ?? base[j] ?? 0;
    const vb = b[j] ?? base[j] ?? 0;
    out[j] = va + (vb - va) * k;
  }
  return out;
};

/** Ação, expressão e pose (já com `incl` somado) no instante pedido. */
export const poseGente = (g: GenteBase, o: OpcoesGente): { acao: string; exp: Expressao3D; pose: Pose3D } => {
  const dur = o.p > 0.002 ? o.t / o.p : 3; // duração da batida (os cenários só trazem t e progresso)
  const f = o.chv ?? ((k: number) => k);
  const tc = (o.abs ? o.tAbs : o.t) * (o.vel ?? 1);
  let exp = (g.exp ?? "sorriso") as Expressao3D;
  let acao = "em-pe";
  let base: Pose3D;
  if (Array.isArray(g.acao)) {
    const { i, k } = chave(g.acao, o.p, dur, f);
    acao = g.acao[i][1];
    if (g.acao[i][2]) exp = g.acao[i][2] as Expressao3D;
    base = poseDe3D(acao, tc);
    if (k < 1) base = misturar3D(poseDe3D(g.acao[i - 1][1], tc), base, k);
  } else {
    acao = g.acao ?? "em-pe";
    base = poseDe3D(acao, tc);
  }
  let pose: Pose3D = base;
  if (Array.isArray(g.pose)) {
    const { i, k } = chave(g.pose, o.p, dur, f);
    pose = { ...base, ...(k < 1 ? sobrepor(g.pose[i - 1][1], g.pose[i][1], base, k) : g.pose[i][1]) };
  } else if (g.pose) {
    pose = { ...base, ...g.pose };
  }
  pose = { ...pose };
  const incl = o.incl ?? 0;
  if (incl) pose["tronco.x"] = (pose["tronco.x"] ?? 0) + incl;

  // entrada: parte da pose final da batida anterior
  const a = g.ant;
  if (a) {
    const tEntrada = g.entradaDur ?? MISTURA_GENTE + 0.05;
    if (o.t < tEntrada) {
      const tFim = a.dur ?? 3;
      const t0 = o.abs ? o.tAbs - o.t : tFim; // fim da batida anterior, na escala de tempo do ciclo
      const antes: Pose3D = { ...poseDe3D(a.acao, t0 * (o.vel ?? 1)), ...(a.pose ?? {}) };
      if (a.incl) antes["tronco.x"] = (antes["tronco.x"] ?? 0) + a.incl;
      pose = misturar3D(antes, pose, suave(o.t / tEntrada));
    }
  }
  for (const j of JUNTAS) if (pose[j] === undefined) pose[j] = 0;
  return { acao, exp, pose };
};

export type Posicao = { x: number; y: number; z: number; rot: number };

/** Posição que desliza do ponto onde o personagem estava no fim da batida anterior (`ant.mover`). */
export const posicaoGente = (g: GenteBase, t: number, atual: Posicao): Posicao => {
  const a = g.ant;
  if (!a || !a.mover) return atual;
  const tEntrada = g.entradaDur ?? MISTURA_GENTE + 0.05;
  if (t >= tEntrada) return atual;
  const k = suave(t / tEntrada);
  const l = (de: number | undefined, para: number) => (de ?? para) + (para - (de ?? para)) * k;
  const dr = Math.atan2(Math.sin(atual.rot - (a.rot ?? atual.rot)), Math.cos(atual.rot - (a.rot ?? atual.rot)));
  return { x: l(a.x, atual.x), y: l(a.y, atual.y), z: l(a.z, atual.z), rot: atual.rot - dr * (1 - k) };
};
