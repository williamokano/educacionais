import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { clamp01 } from "../../../src/v3d/anima";
import { Liga } from "./cozinha-base";

// Mecanismo do zíper (episódio 21): matemática do encaixe, dentes, carrinho, fitas e espiral.
//
// MODELO (tudo é função da posição do carrinho `ys`, nada é keyframe solto):
//  - Cada fileira tem passo P. Dente esquerdo k em y = Y0 + k·P; dente direito k em y = Y0 + P/2 + k·P (meio passo: zigue-zague).
//  - `s = y - ys` é a altura do dente acima da saída (bico) do carrinho. A abertura de cada fita é op(s): 0 abaixo de SJ (encaixado) e,
//    acima, os dois braços do Y (inclinação SLOPE) até o teto CAP. O dente gira junto com a fita (ângulo = atan(op')).
//  - As duas fileiras se encaixam em camadas: a esquerda atrás (z < 0), a direita na frente (z > 0). A cunha (lâmina) do carrinho passa
//    entre as camadas. Perto do carrinho as camadas se afastam (zs(s) = 1); longe, voltam ao plano do pano (zs = 0).
//  - Cada dente tem um calombo (frente do esquerdo, costas do direito) e uma cavidade. O calombo do esquerdo k entra na cavidade do direito k,
//    e o calombo do direito k entra na cavidade do esquerdo k+1. Ao se aproximar, o calombo sobe na placa do vizinho (as placas se afastam: dz)
//    e "estala" na cavidade, com um balanço que se apaga abaixo do bico. Ao descer, o mesmo caminho ao contrário: a cunha abre cada par.

export const P = 0.15;
export const NP = 16;
export const Y0 = 1.05;
export const YB = 0.6;
export const YT = 4.15;
export const HS = 0.5; // altura do corpo do carrinho
export const YS0 = 0.98; // carrinho todo embaixo
export const YS1 = 3.45; // carrinho todo em cima (batente)
export const ZS = 0.034; // meia separação entre as duas camadas
export const SJ = 0.15;
const EPS = 0.03;
const SLOPE = 0.45;
const CAP = 0.55;
export const AZUL = "#4d8fd6";
export const LARANJA = "#f08a3c";
export const OURO = "#d9b44a";
export const CREME = "#eadba0";

export const sm = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
export const hash = (i: number) => { const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };

/** abertura de cada fita (distância do centro ao fio da fita, menos g0) na altura s acima do bico */
export const op = (s: number) => {
  const u = s - SJ;
  const h = 0.5 * (u + Math.sqrt(u * u + EPS * EPS));
  return CAP * Math.tanh((SLOPE * h) / CAP);
};
/** camadas separadas (1) perto do carrinho, planas (0) no pano solto */
export const zs = (s: number) => sm((s - 0.1) / 0.12) * (1 - sm((s - 0.46) / 0.5));
/** afastamento extra das placas: calombo subindo na placa do vizinho + balanço depois do estalo */
export const dzf = (s: number) => {
  const tt = 0.12 - s;
  return tt > 0 ? 0.004 * Math.exp(-tt / 0.1) * Math.sin(30 * tt) : 0;
};

export type Par = {
  ys: number; g0: number; t: number;
  solto: number; dobra: number; fr: number;
};

export const extraOp = (y: number, s: number, par: Par) => (par.solto > 0 ? par.solto * sm(s / 0.3) * (0.1 + 0.07 * Math.sin(3.1 * y + 2.3 * par.t)) : 0);
/** vão extra entre botões (só abaixo do fecho) */
export const fresta = (y: number, par: Par) => {
  if (par.fr <= 0 || y < 0.9 || y > par.ys) return 0;
  const k = Math.sin((Math.PI * (y - 1.0)) / 0.4);
  return par.fr * 0.2 * k * k;
};
export const abertura = (y: number, par: Par) => {
  const s = y - par.ys;
  return op(s) + extraOp(y, s, par) + fresta(y, par);
};
export const dAbertura = (y: number, par: Par) => (abertura(y + 0.004, par) - abertura(y - 0.004, par)) / 0.008;
export const ondaZ = (y: number, par: Par) => par.dobra * 0.1 * Math.sin(2.4 * y + 3 * par.t);
export const dOndaZ = (y: number, par: Par) => par.dobra * 0.1 * 2.4 * Math.cos(2.4 * y + 3 * par.t);

export const yDente = (lado: -1 | 1, k: number) => Y0 + k * P + (lado > 0 ? P / 2 : 0);

/** posição e orientação de um dente (centro do fecho = linha do centro quando fechado) */
export const poseDente = (lado: -1 | 1, k: number, par: Par) => {
  const y = yDente(lado, k);
  const s = y - par.ys;
  const o = abertura(y, par);
  const ang = Math.atan(dAbertura(y, par));
  const z = lado * (ZS * zs(s) + dzf(s)) + ondaZ(y, par);
  return { y, s, o, ang, z, x: lado * (par.g0 + o), tilt: Math.atan(dOndaZ(y, par)) };
};

/* ---------------- geometrias ---------------- */

/** contorno do dente esquerdo no plano x-y (origem = linha do centro): pescoço, cabeça oval, calombo de bolinha em cima e cavidade (buraco de fechadura) embaixo */
const contornoDente = (): [number, number][] => {
  const pts: [number, number][] = [];
  const a = 0.075, b = 0.034, cx = -0.01, hn = 0.018;
  const BC = 0.048, BR = 0.0115, CC = -0.027, CR = 0.0125;
  pts.push([-0.152, -hn]);
  const t0 = Math.PI + Math.asin(hn / b), t1 = 3 * Math.PI - Math.asin(hn / b);
  const N = 160;
  let cav = false, bump = false;
  for (let i = 0; i <= N; i++) {
    const t = t0 + ((t1 - t0) * i) / N;
    const x = cx + a * Math.cos(t), y = b * Math.sin(t);
    if (y < 0 && Math.abs(x) <= 0.0104) {
      if (!cav) {
        cav = true;
        for (let j = 0; j <= 24; j++) { const ang = ((214 - (248 * j) / 24) * Math.PI) / 180; pts.push([CR * Math.cos(ang), CC + CR * Math.sin(ang)]); }
      }
      continue;
    }
    if (y > 0 && Math.abs(x) <= 0.005) {
      if (!bump) {
        bump = true;
        for (let j = 0; j <= 28; j++) { const ang = ((-64.2 + (308.4 * j) / 28) * Math.PI) / 180; pts.push([BR * Math.cos(ang), BC + BR * Math.sin(ang)]); }
      }
      continue;
    }
    pts.push([x, y]);
  }
  pts.push([-0.152, hn]);
  return pts;
};
const GEOS_DENTE: Record<string, THREE.ExtrudeGeometry> = {};
const geoDente = (espelho: boolean) => {
  const k = espelho ? "m" : "e";
  if (GEOS_DENTE[k]) return GEOS_DENTE[k];
  let pts = contornoDente();
  if (espelho) pts = pts.map(([x, y]) => [-x, y] as [number, number]).reverse();
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => (i === 0 ? sh.moveTo(x, y) : sh.lineTo(x, y)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.044, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelOffset: -0.003, bevelSegments: 1, curveSegments: 8 });
  g.translate(0, 0, -0.022);
  GEOS_DENTE[k] = g;
  return g;
};

/** Um dente de metal (todos no MESMO plano z = 0; o direito é o espelho do esquerdo). Cabeça com calombo em cima e cavidade embaixo; atrás, a garra (grampo) que prensa a fita: `garra` 0 aberta .. 1 fechada. Origem = linha do centro do fecho. */
export const Dente: React.FC<{ lado: -1 | 1; cor?: string; esc?: number; vidro?: number; garra?: number }> = ({ lado, cor, esc = 1, vidro = 0, garra = 1 }) => {
  const c = cor ?? (lado < 0 ? AZUL : LARANJA);
  const g = geoDente(lado > 0);
  const gap = 0.034 * (1 - clamp01(garra));
  const mat = <meshStandardMaterial color={c} metalness={0.55} roughness={0.32} transparent={vidro > 0} opacity={1 - 0.55 * vidro} />;
  const x0 = lado * 0.205;
  return (
    <group scale={esc}>
      <mesh geometry={g}>{mat}</mesh>
      {[1, -1].map((f) => <mesh key={f} position={[x0, 0, f * (0.013 + gap)]}><boxGeometry args={[0.11, 0.072, 0.012]} />{mat}</mesh>)}
      <mesh position={[lado * 0.155, 0, 0]}><boxGeometry args={[0.012, 0.072, 0.038 + 2 * gap]} />{mat}</mesh>
    </group>
  );
};

let GEO_ALCA: THREE.TubeGeometry | null = null;
/** Uma volta de espiral de plástico (laço oval no plano x-z). Origem = linha do centro. */
export const Laco: React.FC<{ lado: -1 | 1; cor?: string; esc?: number }> = ({ lado, cor = "#1fb5a3", esc = 1 }) => {
  const g = useMemo(() => {
    if (GEO_ALCA) return GEO_ALCA;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      pts.push(new THREE.Vector3(-0.09 + 0.155 * Math.cos(a), 0, 0.034 * Math.sin(a)));
    }
    GEO_ALCA = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 56, 0.016, 8, true);
    return GEO_ALCA;
  }, []);
  return (
    <group scale={esc} rotation={[0, lado > 0 ? Math.PI : 0, 0]}>
      <mesh geometry={g}><meshStandardMaterial color={cor} roughness={0.38} metalness={0.05} /></mesh>
    </group>
  );
};

/* ---------------- fitas e panos (faixas deformadas pela posição do carrinho) ---------------- */

export const Faixa: React.FC<{ lado: -1 | 1; par: Par; cols: number[]; wz: number[]; cor: string; yMin?: number; yMax?: number; dz?: number; rug?: number; chave?: string }> = ({ lado, par, cols, wz, cor, yMin = YB, yMax = YT, dz = 0, rug = 0.9, chave = "" }) => {
  const key = [lado, par.ys.toFixed(4), par.g0.toFixed(3), par.solto.toFixed(3), par.fr.toFixed(3), par.dobra.toFixed(3), par.dobra > 0 || par.solto > 0 ? par.t.toFixed(3) : 0, yMin.toFixed(3), yMax.toFixed(3), dz, cols.join(","), chave].join("|");
  const geo = useMemo(() => {
    const M = 150;
    const nc = cols.length;
    const pos = new Float32Array((M + 1) * nc * 3);
    const idx: number[] = [];
    for (let i = 0; i <= M; i++) {
      const y = yMin + ((yMax - yMin) * i) / M;
      const s = y - par.ys;
      const o = abertura(y, par);
      const zl = lado * ZS * zs(s);
      const zw = ondaZ(y, par);
      for (let j = 0; j < nc; j++) {
        const b = (i * nc + j) * 3;
        pos[b] = lado * (par.g0 + o + cols[j]);
        pos[b + 1] = y;
        pos[b + 2] = zl * wz[j] + zw + dz;
      }
    }
    for (let i = 0; i < M; i++) for (let j = 0; j < nc - 1; j++) {
      const a = i * nc + j, b = a + 1, c = a + nc, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo}><meshStandardMaterial color={cor} roughness={rug} side={THREE.DoubleSide} /></mesh>;
};

/* ---------------- carrinho ---------------- */

const contorno = (inset: number): THREE.Shape => {
  const k = inset;
  const sh = new THREE.Shape();
  sh.moveTo(-0.3 + k, k);
  sh.lineTo(0.3 - k, k);
  sh.lineTo(0.3 - k, 0.14 + k * 0.6);
  sh.lineTo(0.44 - k, HS - k);
  sh.lineTo(-0.44 + k, HS - k);
  sh.lineTo(-0.3 + k, 0.14 + k * 0.6);
  sh.closePath();
  return sh;
};
let GEO_PLACA: THREE.ExtrudeGeometry | null = null;
let GEO_MOLDURA: THREE.ExtrudeGeometry | null = null;
let GEO_LAMINA: THREE.ExtrudeGeometry | null = null;
let GEO_ALCA2: THREE.ExtrudeGeometry | null = null;
const geos = () => {
  if (!GEO_PLACA) {
    GEO_PLACA = new THREE.ExtrudeGeometry(contorno(0), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
    const fr = contorno(0);
    fr.holes.push(contorno(0.035));
    GEO_MOLDURA = new THREE.ExtrudeGeometry(fr, { depth: 0.034, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.004, bevelSegments: 2 });
    const l = new THREE.Shape();
    l.moveTo(0, SJ);
    l.lineTo(0.0525, 0.3);
    l.lineTo(0.0525, HS - 0.02);
    l.lineTo(-0.0525, HS - 0.02);
    l.lineTo(-0.0525, 0.3);
    l.closePath();
    GEO_LAMINA = new THREE.ExtrudeGeometry(l, { depth: 0.008, bevelEnabled: false });
    GEO_LAMINA.translate(0, 0, -0.004);
    const a = new THREE.Shape();
    const hw = 0.055, L = 0.46, r = 0.05;
    a.moveTo(-hw, 0);
    a.lineTo(hw, 0);
    a.lineTo(hw, -L + r);
    a.absarc(0, -L + r, hw, 0, -Math.PI, true);
    a.lineTo(-hw, 0);
    const hole = new THREE.Path();
    hole.absarc(0, -L + 0.12, 0.032, 0, Math.PI * 2, true);
    a.holes.push(hole);
    GEO_ALCA2 = new THREE.ExtrudeGeometry(a, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
  }
  return { placa: GEO_PLACA!, moldura: GEO_MOLDURA!, lamina: GEO_LAMINA!, alca: GEO_ALCA2! };
};

/** Carrinho do zíper com canal em Y. Origem = o bico de saída, no centro (y = ys). `rx` 0..1: placa da frente vira vidro. `tab` = ângulo do puxador (0 pendurado, π/2 em pé, π para cima). */
export const ob = (x: number) => { const u = clamp01(x) - 1; return 1 + 2.7 * u * u * u + 1.7 * u * u; };
/** Carrinho do zíper com canal em Y. Origem = o bico de saída, no centro (y = ys). `rx` 0..1: placa da frente vira vidro. `tab` = ângulo do puxador. `mont` 0..1: montagem (placa de trás, lâmina e pilar, placa da frente, puxador entram em ordem, com estalo). */
export const Carrinho: React.FC<{ rx?: number; tab?: number; trava?: number; setaY?: number; cor?: string; mont?: number }> = ({ rx = 0, tab = 2.4, trava = 0, setaY = 0, cor = OURO, mont = 1 }) => {
  const G = geos();
  const vid = clamp01(rx);
  const e1 = ob(mont / 0.25), e2 = ob((mont - 0.2) / 0.25), e3 = ob((mont - 0.42) / 0.25), e4 = ob((mont - 0.68) / 0.3);
  const v = (x: number) => x > 0.002;
  return (
    <group>
      {v(e1) && <mesh geometry={G.placa} position={[-0.5 * (1 - e1), 0.5 * (1 - e1), -0.12 - 1.0 * (1 - e1)]} rotation={[0.9 * (1 - e1), 0.6 * (1 - e1), 0]}><meshStandardMaterial color={cor} metalness={0.8} roughness={0.3} /></mesh>}
      {v(e3) && <group position={[0.6 * (1 - e3), 0, 1.3 * (1 - e3)]} rotation={[0, -0.7 * (1 - e3), 0]}>
        <mesh geometry={G.placa} position={[0, 0, 0.09]}>
          <meshStandardMaterial color={vid > 0 ? "#fff3c0" : cor} metalness={vid > 0 ? 0.1 : 0.8} roughness={vid > 0 ? 0.15 : 0.3} transparent={vid > 0.01} opacity={1 - 0.88 * vid} depthWrite={vid < 0.5} />
        </mesh>
        {vid > 0.01 && <mesh geometry={G.moldura} position={[0, 0, 0.088]}><meshStandardMaterial color={cor} metalness={0.8} roughness={0.28} transparent opacity={vid} /></mesh>}
      </group>}
      {v(e2) && <group position={[0, 1.0 * (1 - e2), 0]}>
        <mesh geometry={G.lamina}><meshStandardMaterial color="#ffcf40" metalness={0.5} roughness={0.35} /></mesh>
        <mesh position={[0, HS - 0.035, 0]}><boxGeometry args={[0.085, 0.07, 0.2]} /><meshStandardMaterial color={cor} metalness={0.8} roughness={0.3} /></mesh>
      </group>}
      {setaY > 0.02 && e3 > 0.9 && <group>
        <Liga a={[0, 0.0, 0.126]} b={[0, SJ, 0.126]} w={0.028} cil cor="#ffe14a" basico op={setaY} />
        <Liga a={[0, SJ, 0.126]} b={[-0.27, HS - 0.06, 0.126]} w={0.028} cil cor="#ffe14a" basico op={setaY} />
        <Liga a={[0, SJ, 0.126]} b={[0.27, HS - 0.06, 0.126]} w={0.028} cil cor="#ffe14a" basico op={setaY} />
      </group>}
      {v(e4) && <group position={[0, HS - 0.05 + 1.2 * (1 - e4), 0.13]} rotation={[-(tab + 1.6 * (1 - e4)), 0, 0]}>
        <mesh geometry={G.alca}><meshStandardMaterial color="#e5473a" metalness={0.4} roughness={0.35} /></mesh>
      </group>}
      {trava > 0.01 && (() => {
        const zf = 0.2 - 0.29 * trava;
        return <group position={[-0.115, 0.08, 0]}>
          <mesh position={[0, 0, (zf + 0.2) / 2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.028, 0.028, 0.2 - zf + 0.05, 14]} /><meshStandardMaterial color="#ff6a5a" metalness={0.4} roughness={0.4} /></mesh>
          <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.03, 14]} /><meshStandardMaterial color="#ff6a5a" metalness={0.4} roughness={0.4} /></mesh>
          {Array.from({ length: 6 }).map((_, i) => <mesh key={i} position={[0, 0, 0.2 + (0.03 * i) * (1 - 0.35 * (1 - trava))]}><torusGeometry args={[0.045, 0.008, 6, 14]} /><meshStandardMaterial color="#c9d3da" metalness={0.8} roughness={0.3} /></mesh>)}
        </group>;
      })()}
    </group>
  );
};
