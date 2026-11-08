import React from "react";
import * as THREE from "three";
import { clamp01, lerp } from "../../../src/v3d/anima";

// Mecanismo do relógio (episódio 24): matemática do trem de engrenagens, do escape de âncora (pêndulo e roda de balanço), do pinhão deslizante da coroa e as peças 3D.
// Tudo no plano XY (z para a câmera), em "unidades de maquete" (mu). Módulo de todas as rodas: MOD (largura do dente igual em todas, para engrenar de verdade).
// Trem: barrilete (40) → pinhão da central (6) · central (48) → pinhão da terceira (6) · terceira (45) → pinhão da quarta (6) · quarta (60) → pinhão do escape (6) · escape (15 dentes).
//   central = 1 volta/h; quarta = 1 volta/min (48/6 × 45/6 = 60); minuteria: pinhão-canhão (10) → roda dos minutos (30) · pinhão (8) → roda das horas (32): 12:1.

export type P2 = [number, number];
export const MOD = 0.035;
export const rz = (n: number) => (MOD * n) / 2;
export const NB = 40, NC = 48, PC = 6, N3 = 45, P3 = 6, N4 = 60, P4 = 6, P5 = 6, NE = 15;
export const PCAN = 10, NMIN = 30, PMIN = 8, NHOR = 32;
export const NR = 30, NCWS = 12, NSWS = 12, NFACE = 12, NS = 8; // catraca, roda de coroa (borda), roda de acerto (borda), dentes de face das duas, pinhão deslizante

const ang = (a: P2, b: P2) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const pol = (c: P2, a: number, r: number): P2 => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];

export const POS: Record<string, P2> = {};
POS.C = [0, 0];
POS.F = [0, -1.05];
{
  const dCT = rz(NC) + rz(P3), dTF = rz(N3) + rz(P4);
  const y = (dTF * dTF - dCT * dCT - 1.05 * 1.05) / 2.1;
  POS.T = [-Math.sqrt(dCT * dCT - y * y), y];
}
export const ANEL = 0.13; // raio do anel de dentes de face (contrates)
export const SLIDE = 0.24;
POS.SW = [1.0, 0]; // roda de acerto (interna)
POS.CW = [POS.SW[0] + 2 * ANEL + SLIDE, 0]; // roda de coroa (externa)
{
  const dCB = rz(NB) + rz(PC), dBR = rz(NR) + rz(NCWS), x = POS.CW[0];
  const bx = (dCB * dCB + x * x - dBR * dBR) / (2 * x);
  POS.B = [bx, Math.sqrt(dCB * dCB - bx * bx)];
  const dCM = rz(PCAN) + rz(NMIN), dMS = rz(NSWS) + rz(NMIN), s = POS.SW[0];
  const nu = Math.acos((s * s + dCM * dCM - dMS * dMS) / (2 * s * dCM));
  POS.M = [dCM * Math.cos(nu), -dCM * Math.sin(nu)];
}
POS.E = pol(POS.F, (190 * Math.PI) / 180, rz(N4) + rz(P5));
export const RE = 0.52; // raio da ponta dos dentes do escape
export const PSI = (100 * Math.PI) / 180; // direção escape → pivô da âncora
export const DELTA = Math.PI / 6;
export const RHO0 = RE + 0.04;
export const DA = RHO0 / Math.cos(DELTA);
POS.A = pol(POS.E, PSI, DA);
export const LF = 0.7; // pivô da âncora → centro da roda de balanço
POS.W = pol(POS.A, PSI, LF);
export const ALFA = 0.035 / (RHO0 * Math.tan(DELTA)); // meia excursão da âncora
export const RPIN = 0.11; // raio do pino de impulso
export const PAL0: P2[] = [pol(POS.E, PSI + DELTA, RHO0), pol(POS.E, PSI - DELTA, RHO0)];
const palAng = [PSI + DELTA, PSI - DELTA];
const girar = (c: P2, p: P2, f: number): P2 => { const dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * Math.cos(f) - dy * Math.sin(f), c[1] + dx * Math.sin(f) + dy * Math.cos(f)]; };
export const palete = (i: number, fi: number): P2 => girar(POS.A, PAL0[i], fi);
/** índice da palheta travada (a que está mais para dentro) com a âncora em `fi` */
export const travada = (fi: number) => (Math.hypot(...(palete(0, fi).map((v, k) => v - POS.E[k]) as P2)) < Math.hypot(...(palete(1, fi).map((v, k) => v - POS.E[k]) as P2)) ? 0 : 1);
export const EPS = 0.1;

// parâmetros dos dois reguladores
export const A_PEND = 0.19, TH_IMP = 0.085, A_BAL = 3.5;
export const L_PEND = 3.9;
export const B_IMP = Math.asin(Math.min(1, (ALFA * LF) / RPIN));
export const PAR_CORDA = 0; // (reservado)
const sat = (x: number) => Math.max(-1, Math.min(1, x));

/** engrenamento: dado o ângulo do dente 0 da roda 1, devolve o da roda 2 (c = direção do centro 1 ao centro 2). Exato para todo ângulo. */
export const eng = (t1: number, n1: number, n2: number, c: number) => c + Math.PI + Math.PI / n2 - (n1 / n2) * (t1 - c);

export type Angs = { E: number; F: number; T: number; C: number; B: number };
const dir = (a: string, b: string) => ang(POS[a], POS[b]);
export const deE = (e: number): Angs => { const F = eng(e, P5, N4, dir("E", "F")); const T = eng(F, P4, N3, dir("F", "T")); const C = eng(T, P3, NC, dir("T", "C")); const B = eng(C, PC, NB, dir("C", "B")); return { E: e, F, T, C, B }; };
export const deB = (b: number): Angs => { const C = eng(b, NB, PC, dir("B", "C")); const T = eng(C, NC, P3, dir("C", "T")); const F = eng(T, N3, P4, dir("T", "F")); const E = eng(F, N4, P5, dir("F", "E")); return { E, F, T, C, B: b }; };
export const deC = (c: number): Angs => { const B = eng(c, PC, NB, dir("C", "B")); const T = eng(c, NC, P3, dir("C", "T")); const F = eng(T, N3, P4, dir("T", "F")); const E = eng(F, N4, P5, dir("F", "E")); return { E, F, T, C: c, B }; };

export type Reg = "pend" | "bal";
/** sinal de comando (-1..1) do escape: pêndulo = ângulo/folga; roda de balanço = pino no garfo */
export const comando = (reg: Reg, u: number, amp: number) => {
  if (reg === "pend") return sat((A_PEND * amp * Math.sin(Math.PI * u)) / TH_IMP);
  return sat((RPIN * Math.sin(A_BAL * amp * Math.sin(Math.PI * u))) / (LF * ALFA));
};
/** passos do escape (1 por oscilação do regulador), contínuo: platô entre os giros, avanço de meio passo enquanto a âncora vira */
export const passos = (reg: Reg, u: number, amp: number) => {
  const k = Math.floor(u + 0.5);
  const x = comando(reg, u, amp);
  return k - 1 + (1 + (k % 2 === 0 ? 1 : -1) * x) / 2;
};
export const phiDe = (reg: Reg, x: number) => (reg === "pend" ? 1 : -1) * ALFA * x;
export const thE0 = (reg: Reg) => {
  const fi0 = phiDe(reg, 1);
  return palAng[travada(fi0)] - EPS; // CCW: o dente vem de ângulos menores
};
export const lerpA = lerp;
export { clamp01 };

/* ------------------------------ geometria das rodas ------------------------------ */
const geoCache = new Map<string, THREE.BufferGeometry>();
type Tipo = "r" | "e" | "t" | "anel";
export const geoRoda = (N: number, r: number, esp: number, raios: number, tipo: Tipo = "r"): THREE.BufferGeometry => {
  const key = `${N}|${r.toFixed(4)}|${esp}|${raios}|${tipo}`;
  const c = geoCache.get(key);
  if (c) return c;
  const sh = new THREE.Shape();
  const p = (2 * Math.PI) / N;
  const pts: P2[] = [];
  let rr = r - 1.25 * MOD;
  if (tipo === "r" || tipo === "anel") {
    const ro = r + MOD;
    for (let i = 0; i < N; i++) { const a = i * p; pts.push(pol([0, 0], a - 0.29 * p, rr), pol([0, 0], a - 0.17 * p, ro), pol([0, 0], a + 0.17 * p, ro), pol([0, 0], a + 0.29 * p, rr)); }
  } else if (tipo === "e") {
    rr = r - 0.17;
    for (let i = 0; i < N; i++) { const a = i * p; pts.push(pol([0, 0], a - 0.78 * p, rr), pol([0, 0], a, r), pol([0, 0], a + 0.1 * p, rr)); }
  } else {
    rr = r - 0.07;
    for (let i = 0; i < N; i++) { const a = i * p; pts.push(pol([0, 0], a - 0.1 * p, rr), pol([0, 0], a, r + 0.04), pol([0, 0], a + 0.7 * p, rr)); }
  }
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  sh.closePath();
  const rim = Math.max(0.05, r * 0.1);
  const hb = Math.max(0.09, r * 0.17);
  if (tipo === "anel") {
    const h = new THREE.Path();
    h.absarc(0, 0, rr - 0.04, 0, Math.PI * 2, false);
    sh.holes.push(h);
  } else if (raios > 0 && rr - rim > hb + 0.08) {
    const gap = Math.min(0.22, (hb + 0.05) / (rr * 0.5));
    for (let k = 0; k < raios; k++) {
      const a0 = (k * 2 * Math.PI) / raios + gap, a1 = ((k + 1) * 2 * Math.PI) / raios - gap;
      const h = new THREE.Path();
      const s = pol([0, 0], a0, hb);
      h.moveTo(s[0], s[1]);
      h.absarc(0, 0, hb, a0, a1, false);
      const e = pol([0, 0], a1, rr - rim);
      h.lineTo(e[0], e[1]);
      h.absarc(0, 0, rr - rim, a1, a0, true);
      h.closePath();
      sh.holes.push(h);
    }
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: esp, bevelEnabled: false, curveSegments: 20 });
  g.translate(0, 0, -esp / 2);
  geoCache.set(key, g);
  return g;
};

export const Roda: React.FC<{ N: number; r: number; a: number; pos: P2; z: number; cor: string; esp?: number; raios?: number; tipo?: Tipo; blur?: number; op?: number; met?: number }> = ({ N, r, a, pos, z, cor, esp = 0.07, raios = 0, tipo = "r", blur = 0, op = 1, met = 0.55 }) => {
  const geo = geoRoda(N, r, esp, raios, tipo);
  const o = op * (1 - 0.8 * blur);
  return (
    <group position={[pos[0], pos[1], z]} rotation={[0, 0, a]}>
      <mesh geometry={geo}><meshStandardMaterial color={cor} metalness={met} roughness={0.32} transparent={o < 0.99} opacity={o} depthWrite={o > 0.9} /></mesh>
      {blur > 0.05 && <mesh><circleGeometry args={[r, 40]} /><meshBasicMaterial color={cor} transparent opacity={0.55 * blur * op} depthWrite={false} /></mesh>}
    </group>
  );
};

export const Eixo: React.FC<{ pos: P2; z0: number; z1: number; r?: number; cor?: string }> = ({ pos, z0, z1, r = 0.028, cor = "#e3e8ec" }) => (
  <mesh position={[pos[0], pos[1], (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[r, r, Math.abs(z1 - z0), 12]} /><meshStandardMaterial color={cor} metalness={0.85} roughness={0.2} /></mesh>
);

export const Barra: React.FC<{ a: P2; b: P2; w: number; esp?: number; z: number; cor: string; met?: number; op?: number }> = ({ a, b, w, esp = 0.05, z, cor, met = 0.5, op = 1 }) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  if (L < 1e-4) return null;
  return <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z]} rotation={[0, 0, Math.atan2(dy, dx)]}><boxGeometry args={[L, w, esp]} /><meshStandardMaterial color={cor} metalness={met} roughness={0.35} transparent={op < 1} opacity={op} /></mesh>;
};

/** espiral de Arquimedes com a ponta de dentro girada por `twist` (a de fora fica presa); `corte` (0..1) = fração da espiral que respira (o regulador encurta) */
export const Espiral: React.FC<{ r0: number; r1: number; voltas: number; twist?: number; corte?: number; z: number; cor: string; w?: number; pot?: number; ang0?: number }> = ({ r0, r1, voltas, twist = 0, corte = 1, z, cor, w = 0.01, pot = 1, ang0 = 0 }) => {
  const key = `${r0.toFixed(3)}|${r1.toFixed(3)}|${voltas}|${twist.toFixed(2)}|${corte.toFixed(2)}|${w}|${pot.toFixed(2)}|${ang0}`;
  const geo = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const N = Math.max(24, Math.round(voltas * 22));
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const wt = u < corte ? Math.pow(1 - u / corte, 1.1) : 0;
      const a = ang0 + u * voltas * Math.PI * 2 + twist * wt;
      const r = r0 + (r1 - r0) * Math.pow(u, pot);
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, w, 5, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <mesh geometry={geo} position={[0, 0, z]}><meshStandardMaterial color={cor} metalness={0.7} roughness={0.3} /></mesh>;
};

/** ponteiro (apontando para +y no seu eixo); `rot` em rad (CCW) */
const handCache = new Map<string, THREE.BufferGeometry>();
export const Ponteiro: React.FC<{ rot: number; len: number; w: number; tail: number; z: number; cor: string; pos?: P2; esp?: number }> = ({ rot, len, w, tail, z, cor, pos = [0, 0], esp = 0.025 }) => {
  const key = `${len}|${w}|${tail}|${esp}`;
  let g = handCache.get(key);
  if (!g) {
    const s = new THREE.Shape();
    s.moveTo(0, len); s.lineTo(-w, len * 0.2); s.lineTo(-w * 0.45, -tail); s.lineTo(w * 0.45, -tail); s.lineTo(w, len * 0.2); s.closePath();
    g = new THREE.ExtrudeGeometry(s, { depth: esp, bevelEnabled: false });
    handCache.set(key, g);
  }
  return <mesh geometry={g} position={[pos[0], pos[1], z]} rotation={[0, 0, rot - Math.PI / 2 + Math.PI / 2]}><meshStandardMaterial color={cor} metalness={0.6} roughness={0.3} /></mesh>;
};

/** joia (rubi) engastada no topo de um eixo */
export const Rubi: React.FC<{ pos: P2; z: number; k: number; r?: number }> = ({ pos, z, k, r = 0.085 }) => {
  if (k <= 0.02) return null;
  return (
    <group position={[pos[0], pos[1], z]} scale={k}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[r * 1.55, r * 1.55, 0.04, 20]} /><meshStandardMaterial color="#e0b44a" metalness={0.8} roughness={0.25} /></mesh>
      <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[r, r, 0.05, 18]} /><meshStandardMaterial color="#e5173f" emissive="#a0001f" emissiveIntensity={0.9} metalness={0.2} roughness={0.15} /></mesh>
      <mesh position={[0, 0, 0.08]}><sphereGeometry args={[r * 0.35, 8, 6]} /><meshBasicMaterial color="#ffd0d6" transparent opacity={0.8} /></mesh>
    </group>
  );
};

// transferência dos segundos (1:1): 24 (na quarta) → 12 · 8 → 16 (no centro): o ponteiro longo dos segundos sai do centro
export const NX1 = 24, NX2 = 12, NX2B = 8, NX3 = 16;
POS.X2 = [0, POS.F[1] + rz(NX1) + rz(NX2)];
