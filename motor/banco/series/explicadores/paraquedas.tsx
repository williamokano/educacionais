import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Anterior, poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Expressao3D, Pose3D } from "../../../src/v3d/tipos";
import { Etiqueta, Halo, Liga, Seta, Texto3D } from "./cozinha-base";
import { Ctx, Dome, EtiqDef, V, mkCtx, mistura, nv } from "./rasc";
import { homemA } from "./fieis";
import { zeca } from "./zeca";
import { FONT } from "../../../src/theme";

// Paraquedas (episódio 22 v2, "como um pano segura uma pessoa caindo do céu?"). Dois palcos no mesmo mundo:
//   palco "ceu" (padrão): o Zeca em x = 0, de frente, pés em y = 0; as nuvens passam subindo (queda) e o solo sobe ao longe.
//   palco "rua" (x = 60): prédio de dois andares (janela do segundo andar em y 3,3), rua, o amigo, o guarda-chuva e o efeito de fita (PAUSA, rebobina).
// REGRA: o nome "paraquedas" só aparece a partir da batida 13 (fala e cartão).
// Campos (número, { de, para, ini, fim } ou chaves [[progresso, valor], ...]):
//   céu    vel (m/s, queda: integra e move as nuvens) · solo (m, altura do solo em relação aos pés; -30 longe, 0 = pouso) · riscos 0..1 (riscos de vento) · cidade 0..1 (casinhas lá embaixo) · amigoSolo 0..1 (prédio e amigo na cidade)
//   pano   pano 0..1 · forma 0..1 (0 plano, 1 domo) · embola 0..1 · tam (raio, m) · cordas 0..1 · arnes 0..1 · ar 0..1 (setas) · furo 0..1 · seda 0..1 (cor de seda → náilon) · murcho 0..1 (pano que falhou) · gira (rad, giro do domo) · inclina (rad)
//          balanca (rad) · comando 0..1 (cordinhas) · puxa -1..1 (puxa o comando esquerdo/direito) · vento 0..1 (setas de vento) · freio 0..1 (0 = quadrado em cima, 1 = embaixo) · freioVis 0..1 · tranco 0..1 (sacode)
//   mochila mochila 0..1 · piloto 0..1 (pano pequeno que puxa) · sai 0..1 (o pano sai da mochila)
//   reserva reserva 0..1 (domo menor) · peito 0..1 (mochila da reserva no peito) · alca 0..1 (brilho na alça) · solta 0..1 (o principal voa embora) · aad 0..1 (caixinha com luz)
//   história leonardo 0..1 · torre 0..1 · papel 0..1 (papel antigo) · letras 0..1 (PARA + CHUTE) · ponte 0..1
//   asa    asa 0..1 · infla 0..1 (células enchem do centro às pontas) · perfil 0..1 (corte transversal de uma célula) · arAsa 0..1 (setas nas entradas) · puxaE/puxaD 0..1 · batoques 0..1 · freio 0..1 · freioVis 0..1
//   rua    amigoY, amigoZ (chaves) · guardaVira 0..1 · fita 0..1 (efeito de fita) · pausa 0..1 · rebob 0..1
//   gente  lista de { x, y, z, rot, acao, exp, pose, incl, esc, quem: "zeca" | "amigo", enjoo, queda } · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax

const HARN = 1.5; // altura dos ombros (arnês)
const ALT = 4.4; // altura da borda do pano acima dos pés quando aberto
const PALCO_X: Record<string, number> = { ceu: 0, rua: 60 };

/* ---------- pessoas ---------- */

type GenteE = { x?: unknown; y?: unknown; z?: unknown; rot?: unknown; acao?: string | [number, string, string?][]; exp?: Expressao3D; ant?: Anterior; entradaDur?: number; pose?: Pose3D | [number, Pose3D][]; incl?: unknown; esc?: number; quem?: string; enjoo?: unknown; tranco?: unknown };

const Pessoa: React.FC<{ g: GenteE; C: Ctx }> = ({ g, C }) => {
  const p = C.p;
  const tAbs = C.tEp;
  const { acao, exp, pose } = poseGente(g, { p, t: C.t, tAbs, abs: true, incl: nv(g.incl, p, 0) });
  const { x, y, z, rot } = posicaoGente(g, C.t, { x: nv(g.x, p, 0), y: nv(g.y, p, 0), z: nv(g.z, p, 0), rot: nv(g.rot, p, 0) });
  const pers = g.quem === "amigo" ? homemA : zeca;
  const esc = g.esc ?? 1.06;
  const tr = nv(g.tranco, p, 0);
  const enjoo = nv(g.enjoo, p, 0);
  // o tranco estica o corpo para cima e treme
  const sy = 1 + 0.35 * tr * Math.abs(Math.sin(tAbs * 14));
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={[esc, esc * sy, esc]}>
      <Boneco3D p={pers} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} t={tAbs} />
      {pers === zeca && (g as { mochila?: boolean }).mochila !== false && <MochilaCostas C={C} />}
      {enjoo > 0.02 && <Halo p={[0, 1.55, 0.3]} r={0.45} cor="#6dff5a" op={0.3 * enjoo} />}
    </group>
  );
};

/* ---------- o pano e as peças do equipamento ---------- */

const COR_NANO = "#e5473a";
const COR_SEDA = "#efe3c2";


/* ---------- física de pano: malhas deformadas por funções (sem engine) ---------- */

/** Superfície de pano: grade (nu x nv) cujos vértices vêm de fn(u, v) a cada quadro (ondulação, arco, respiração). */
const Retalho: React.FC<{ nu: number; nv: number; fn: (u: number, v: number) => V; cor: string; op?: number }> = ({ nu, nv, fn, cor, op = 1 }) => {
  const geo = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((nu + 1) * (nv + 1) * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j; const b = (i + 1) * (nv + 1) + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    g.setIndex(idx);
    return g;
  }, [nu, nv]);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const p = fn(i / nu, j / nv); pos.setXYZ(i * (nv + 1) + j, p[0], p[1], p[2]); }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return <mesh geometry={geo} frustumCulled={false}><meshStandardMaterial color={cor} side={THREE.DoubleSide} roughness={0.85} transparent={op < 1} opacity={op} depthWrite={op >= 1} /></mesh>;
};

/** Corda esticada que vibra de leve. */
const Corda: React.FC<{ a: V; b: V; i: number; t: number; op?: number; w?: number; cor?: string }> = ({ a, b, i, t, op = 1, w = 0.022, cor = "#ffffff" }) => {
  const m: V = [(a[0] + b[0]) / 2 + 0.022 * Math.sin(t * 9 + i * 1.7), (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 + 0.022 * Math.cos(t * 8 + i)];
  return (
    <group>
      <Liga a={a} b={m} w={w} cil cor={cor} op={op} basico />
      <Liga a={m} b={b} w={w} cil cor={cor} op={op} basico />
    </group>
  );
};

/** Domo redondo (ou pano plano arqueado, com forma = 0) feito de 8 gomos com ondulação, bordas que tremulam e respiração.
 *  `furo` 0..1 abre a chaminé de verdade: os gomos começam um pouco abaixo do topo (sem triângulos no centro), a borda do buraco leva um aro (costura reforçada) e o céu aparece por ele. */
const Domo: React.FC<{ r: number; h: number; forma?: number; t: number; amp?: number; murcho?: number; emb?: number; c1: string; c2: string; furo?: number; gores?: number }> = ({ r: r0, h, forma = 1, t, amp = 0.05, murcho = 0, emb = 0, c1, c2, furo = 0, gores = 8 }) => {
  const r = r0 * (1 + 0.012 * Math.sin(t * 2.6));
  const ampE = amp * (r0 / 2.2) * (1 + 3 * murcho) * (1 + 0.6 * Math.sin(t * 1.3));
  const kf = suave(forma);
  const v0 = kf > 0.5 ? 0.2 * suave(furo) : 0;
  const fn = (g: number, u: number, v0_: number): V => {
    const v = v0 + v0_ * (1 - v0);
    const th = ((g + u) / gores) * Math.PI * 2;
    const phi = v * (Math.PI / 2) * 0.97;
    const sp = Math.sin(phi);
    const cp = Math.cos(phi);
    const w = v * v;
    const rip = ampE * Math.sin(th * 5 + t * 2.4 + v * 5) * w + ampE * 0.5 * Math.sin(th * 9 + t * 6.5) * Math.max(0, v - 0.8) * 5;
    const rho = r * sp * (1 + 0.07 * Math.sin(Math.PI * u) * sp) + rip;
    const yd = h * cp + ampE * 0.6 * Math.sin(th * 3 - t * 2 + v * 4) * w;
    const rf = r * v;
    const xf = rf * Math.cos(th);
    const zf = rf * Math.sin(th) * 0.85;
    const yf = r * 0.2 * (1 - (xf / r) ** 2) + ampE * Math.sin(t * 3 + xf * 1.3 + zf) * w * 1.4;
    let x = lerp(xf, rho * Math.cos(th), kf);
    let z = lerp(zf, rho * Math.sin(th), kf);
    let y = lerp(yf, yd, kf);
    if (emb > 0.01) {
      const m = emb * 0.35 * r * Math.sin(th * 3 + v * 6 + t * 4) * Math.sin(v * 5 + 0.4);
      x += m * Math.cos(th);
      z += m * Math.sin(th);
      y += m * 0.5 * Math.sin(th * 2 + t * 3);
    }
    return [x, y, z];
  };
  // aro do buraco: sobre o anel de vértices v = v0 (u = 0 de cada gomo), com a mesma ondulação
  const aro: V[] = Array.from({ length: 24 }).map((_, i) => { const g = Math.floor((i / 24) * gores); const u = ((i / 24) * gores) % 1; return fn(g, u, 0); });
  return (
    <group>
      {Array.from({ length: gores }).map((_, g) => <Retalho key={g} nu={4} nv={10} fn={(u, v) => fn(g, u, v)} cor={g % 2 ? c2 : c1} />)}
      {v0 > 0.02 && aro.map((a, i) => <Liga key={i} a={a} b={aro[(i + 1) % aro.length]} w={0.07 * (r / 2.2) + 0.03} cil cor="#fff6dc" basico />)}
    </group>
  );
};

/** Bolha de pano amassado (o velame que sai embolado da mochila). */
const Blob: React.FC<{ r: number; t: number; cor: string }> = ({ r, t, cor }) => (
  <Retalho nu={16} nv={10} cor={cor} fn={(u, v) => { const th = u * Math.PI * 2; const ph = v * Math.PI; const rr = r * (1 + 0.28 * Math.sin(3 * th + t * 4 + 2 * ph) + 0.2 * Math.sin(5 * ph - t * 3)); return [rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph) * 0.9, rr * Math.sin(ph) * Math.sin(th)]; }} />
);

/** Faixa de pano que sai da mochila em zigue-zague e vai se esticando em ordem até o velame. */
const Faixa: React.FC<{ a: V; b: V; k: number; t: number; cor: string }> = ({ a, b, k, t, cor }) => {
  if (k < 0.02) return null;
  return (
    <Retalho nu={3} nv={14} cor={cor} fn={(u, v) => {
      const s = v * k;
      const dobra = (1 - k * 0.9) * 0.22 * Math.sin(v * 16 + t * 5) * (1 - v * 0.3);
      return [lerp(a[0], b[0], s) + (u - 0.5) * (0.5 + 0.6 * k) + dobra, lerp(a[1], b[1], s), lerp(a[2], b[2], s) + dobra * 0.8];
    }} />
  );
};

const Pano: React.FC<{ C: Ctx; tam: number }> = ({ C, tam }) => {
  const { n, tEp } = C;
  const vis = n("pano", 0);
  if (vis < 0.02) return null;
  const forma = n("forma", 1);
  const emb = n("embola", 0);
  const furo = n("furo", 0);
  const cordas = n("cordas", 0);
  const ar = n("ar", 0);
  const sai = n("sai", 1);
  const murcho = n("murcho", 0);
  const seda = n("seda", 0);
  const gira = n("gira", 0);
  const incl = n("inclina", 0);
  const comando = n("comando", 0);
  const puxa = n("puxa", 0);
  const vento = n("vento", 0);
  const k = vis * (1 - 0.55 * emb) * lerp(0.35, 1, sai) * (1 - 0.2 * murcho);
  const r = tam * k;
  const h = lerp(0.12, 0.95, forma) * r * (1 - 0.3 * emb) * (1 - 0.55 * murcho);
  const cy = lerp(HARN + 1.3, ALT, forma) - 0.7 * murcho;
  const Nb = 8;
  const cor = mistura(COR_NANO, COR_SEDA, seda);
  const cor2 = mistura("#f4f1ea", "#d9c9a0", seda);
  const rim = Array.from({ length: Nb }).map((_, i) => {
    const a = (i / Nb) * Math.PI * 2 + gira;
    return [Math.cos(a) * r, cy, Math.sin(a) * r * 0.35] as V;
  });
  const ombro = (px: number): V => [px > 0 ? 0.28 : -0.28, HARN, 0.08];
  return (
    <group rotation={[0, 0, incl]} position={[0, 0, 0]}>
      <group position={[0, cy, 0]} rotation={[0, gira, 0]}>
        <Domo r={r} h={Math.max(h, 0.02)} forma={forma} t={tEp} amp={0.05 + 0.04 * Math.abs(n("balanca", 0))} murcho={murcho} emb={emb} c1={cor} c2={cor2} furo={furo} />
      </group>
      {forma < 0.3 && (n("rasgo", 0) > 0.02 || n("tecido", 0) > 0.02) && (() => {
        const rs = n("rasgo", 0);
        const par = n("trama", 0);
        const hx = r * 0.85;
        const comp = Math.min(1.5, 1.3 * rs) * (par > 0.5 ? 0.7 : 1);
        return (
          <group position={[0, cy + 0.06, 0]} rotation={[-Math.PI / 2 + 0.1 * Math.sin(tEp * 3), 0, 0]}>
            {rs > 0.02 && <mesh position={[hx - comp / 2, 0.15 * Math.sin(tEp * 12) * 0.1, 0.02]} scale={[comp * 1.4, 0.35 + 0.3 * rs, 1]}><circleGeometry args={[1, 3]} /><meshBasicMaterial color="#14141c" /></mesh>}
            {par > 0.02 && <mesh position={[hx - comp - 0.05, 0, 0.03]}><planeGeometry args={[0.05, 0.7]} /><meshBasicMaterial color="#ffffff" /></mesh>}
          </group>
        );
      })()}
      {n("lupaTrama", 0) > 0.02 && (
        <group position={[r * 0.1, cy + 1.5, 1.6]} scale={suave(n("lupaTrama", 0)) * 1.0}>
          <mesh><circleGeometry args={[0.95, 28]} /><meshBasicMaterial color="#f4ead8" /></mesh>
          {Array.from({ length: 11 }).map((_, i) => { const o = -0.8 + i * 0.16; const grosso = i % 3 === 1; return <group key={i}><mesh position={[0, o, 0.01]}><planeGeometry args={[1.6, grosso ? 0.045 : 0.012]} /><meshBasicMaterial color={grosso ? "#b83a30" : "#c9a79a"} /></mesh><mesh position={[o, 0, 0.011]}><planeGeometry args={[grosso ? 0.045 : 0.012, 1.6]} /><meshBasicMaterial color={grosso ? "#b83a30" : "#c9a79a"} /></mesh></group>; })}
          <mesh position={[0.35, 0.0, 0.03]} rotation={[0, 0, 0.1]} scale={[0.5, 0.07, 1]}><circleGeometry args={[1, 3]} /><meshBasicMaterial color="#14141c" /></mesh>
          <mesh position={[-0.0, 0, 0.04]}><planeGeometry args={[0.05, 1.5]} /><meshBasicMaterial color="#b83a30" /></mesh>
          <mesh position={[0, 0, 0.005]}><ringGeometry args={[0.93, 1.02, 28]} /><meshBasicMaterial color="#555b66" /></mesh>
        </group>
      )}
      {cordas > 0.02 && rim.map((q, i) => <Corda key={i} a={q} b={ombro(q[0])} i={i} t={tEp} op={cordas} />)}
      {cordas < 0.02 && vis > 0.3 && [-1, 1].map((s, i) => <Liga key={i} a={[s * r * 0.5, cy - 0.2, 0]} b={[s * 0.25, HARN, 0.05]} w={0.022} cil cor="#ffffff" basico />)}
      {/* cordinhas de comando até as mãos */}
      {comando > 0.02 && [-1, 1].map((s, i) => {
        const pull = puxa * s > 0 ? Math.abs(puxa) : 0;
        const mao: V = [s * 0.5, 1.15 - pull * 0.35, 0.3];
        const topo: V = [s * r * 0.95, cy - 0.05 - pull * 0.5, 0.0];
        return (
          <group key={i}>
            <Liga a={topo} b={mao} w={0.024} cil cor="#ffd23f" op={comando} basico />
            <mesh position={mao} scale={0.07 * comando}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#ffd23f" /></mesh>
            {pull > 0.1 && <Halo p={mao} r={0.5} cor="#ffe27a" op={0.6} />}
          </group>
        );
      })}
      {ar > 0.02 && [-0.55, 0, 0.55].map((x, i) => <Seta key={i} a={[x * r, cy - 1.6 - 0.15 * Math.sin(tEp * 6 + i), 0.2]} b={[x * r, cy - 0.35, 0.2]} cor="#8fd0ff" w={0.07} op={ar} />)}
      {furo > 0.02 && [-0.25, 0, 0.25].map((x, i) => <Seta key={i} a={[x, cy + h * 0.15, 0.08 * (i - 1)]} b={[x * 1.4, cy + h + 1.1, 0.08 * (i - 1)]} cor="#bfe9ff" w={0.035} op={furo} />)}
      {vento > 0.02 && [0, 1, 2].map((i) => <Seta key={i} a={[-3.6 + 0.2 * Math.sin(tEp * 3 + i), cy - 0.6 + i * 0.5, -0.3]} b={[-1.6, cy - 0.6 + i * 0.5, -0.3]} cor="#d6f0ff" w={0.06} op={vento} />)}
    </group>
  );
};


/* ---------- velame de asa (ram-air): dois panos, divisórias, células que enchem uma a uma ---------- */

const NC = 9;
const SPAN = 5.2;
const CH0 = 2.1;
const ASA_Y = 4.5;
const THK = 0.55;
const SLIDER_TOPO = ASA_Y - 0.35;
const SLIDER_BAIXO = HARN + 0.75;
const PERFIL_P: V = [0, 3.45, 1.3];

const eN = (x: number) => Math.min(1, Math.abs((2 * x) / SPAN));
const archY = (x: number) => -0.85 * eN(x) ** 2;
const chordX = (x: number) => CH0 * (1 - 0.34 * eN(x) ** 3);
const zFront = (x: number) => CH0 / 2 - 0.3 * eN(x) ** 2;
const zAt = (x: number, zu: number) => zFront(x) - (1 - zu) * chordX(x);
/** Perfil da célula (s = 0 na borda de ataque, 1 na de fuga): face de cima abaulada, com o nariz redondo; a de baixo quase plana. */
const perfilTopo = (s: number) => 0.3 * (1 - s) ** 0.7 + 0.7 * Math.sin(Math.PI * s ** 0.55);
const perfilBase = (s: number) => -0.06 * Math.sin(Math.PI * Math.min(1, s) ** 0.8);
const COR_CEL = (i: number) => (i % 2 ? "#f6a21e" : "#2a6fd0");

const asaPose = (C: Ctx) => {
  const pE = C.n("puxaE", 0);
  const pD = C.n("puxaD", 0);
  const yaw = (pE - pD) * 0.55 + C.n("asaYaw", 0);
  const roll = -(pE - pD) * 0.22 + C.n("asaRoll", 0);
  const pitch = -0.17 + (pE + pD) * 0.18;
  const solta = C.n("soltaAsa", 0);
  const centro: V = [-4.2 * solta, ASA_Y + 7 * solta * solta - 0.8 * C.n("murcho2", 0), -1.5 * solta];
  return { yaw, roll, pitch, centro, solta };
};

type AsaP = { t: number; amp: number; defE: number; defD: number };
/** Ponto da superfície (x ao longo da envergadura, zu = 1 na frente e 0 atrás, T = espessura da célula ali). */
const asaSup = (x: number, zu: number, topo: boolean, T: number, p: AsaP): V => {
  const s = 1 - zu;
  const e = eN(x);
  const esc = chordX(x) / CH0;
  const rip = p.amp * Math.sin(p.t * 6 + x * 1.6 + zu * 4) * (0.2 + s * s) * (1 + 1.6 * e * e);
  const base = archY(x);
  let y = topo ? base + 0.014 + T * esc * perfilTopo(s) + rip : base - 0.014 + T * esc * perfilBase(s) + 0.35 * rip;
  const lado = x < 0 ? p.defE : p.defD;
  const d = lado * clamp01((e - 0.08) / 0.7) * Math.pow(s, 2.2);
  y -= 0.75 * d;
  return [x, y, zAt(x, zu) - 0.15 * d];
};

/** Corte transversal de uma célula (em perfil): os dois panos, a divisória ao fundo e a entrada de ar na frente. */
const PerfilCelula: React.FC<{ k: number; e: number; ar: number; t: number }> = ({ k, e, ar, t }) => {
  const { camera } = useThree();
  if (k < 0.02) return null;
  const yaw = Math.atan2(camera.position.x - PERFIL_P[0], camera.position.z - PERFIL_P[2]);
  const W = 0.95;
  const Tp = Math.max(0.05, 0.95 * suave(e));
  const xs = (s: number) => -W + 2 * W * s;
  const yt = (s: number) => -0.4 + Tp * perfilTopo(s);
  const yb = (s: number) => -0.4 + Tp * perfilBase(s);
  const fita = (topo: boolean, esp: number) => (u: number, v: number): V => {
    const s = v * v;
    const f = topo ? yt : yb;
    const s1 = Math.min(1, s + 0.012);
    const s0 = Math.max(0, s - 0.012);
    const tx = xs(s1) - xs(s0);
    const ty = f(s1) - f(s0);
    const L = Math.hypot(tx, ty) || 1;
    const o = (u - 0.5) * esp;
    return [xs(s) - (ty / L) * o, f(s) + (tx / L) * o, 0.03];
  };
  const yEnt = (a: number) => -0.4 + Tp * 0.3 * a;
  return (
    <group position={PERFIL_P} rotation={[0, yaw, 0]} scale={suave(k)}>
      <mesh position={[0, 0, -0.01]}><planeGeometry args={[2.72, 1.78]} /><meshBasicMaterial color="#555b66" /></mesh>
      <mesh position={[0, 0, 0]}><planeGeometry args={[2.6, 1.66]} /><meshBasicMaterial color="#f4ead8" /></mesh>
      <Retalho nu={1} nv={28} cor="#ffe9a8" fn={(u, v) => { const s = v * v; return [xs(s), lerp(yb(s), yt(s), u), 0.012]; }} />
      <Retalho nu={1} nv={28} cor="#2a6fd0" fn={fita(true, 0.1)} />
      <Retalho nu={1} nv={28} cor="#173f78" fn={fita(false, 0.08)} />
      {[0.22, 0.5, 0.78].map((a, i) => <Seta key={i} a={[xs(0) - 0.85 + 0.1 * Math.sin(t * 7 + i), yEnt(a), 0.05]} b={[xs(0) + 0.35, yEnt(a), 0.05]} cor="#2a8fff" w={0.04} op={ar} />)}
      <Seta a={[xs(0.12), yEnt(0.5) + 0.1 * Tp, 0.05]} b={[xs(0.6), yEnt(0.5) + 0.1 * Tp, 0.05]} cor="#2a8fff" w={0.05} op={ar * clamp01(e * 2)} />
    </group>
  );
};

const Asa: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const vis = n("asa", 0);
  if (vis < 0.02) return null;
  const infla = n("infla", 1);
  const murcho = n("murcho2", 0);
  const ar = n("arAsa", 0);
  const { yaw, roll, pitch, centro, solta } = asaPose(C);
  const defE = n("puxaE", 0);
  const defD = n("puxaD", 0);
  const w = SPAN / NC;
  const ordem = (i: number) => Math.abs(i - (NC - 1) / 2);
  const freioVis = suave(n("freioVis", 0));
  const freio = n("freio", 1);
  const vs = suave(vis);
  // com o freio de abertura no alto, as cordas ficam juntas e o velame abre estreito; ao descer, ele se alarga
  const sxW = lerp(1, lerp(0.62, 1, suave(freio)), freioVis);
  const cells = Array.from({ length: NC }).map((_, i) => {
    const e = clamp01(infla * (NC / 2 + 1.6) - ordem(i) * 0.85);
    const hh = Math.max(0.03, THK * suave(e) * (1 - 0.85 * murcho) + 0.03 * Math.sin(tEp * 9 + i) * murcho);
    return { i, x: -SPAN / 2 + w * (i + 0.5), hh, e };
  });
  const hr = Array.from({ length: NC + 1 }).map((_, k) => (k === 0 ? cells[0].hh : k === NC ? cells[NC - 1].hh : (cells[k - 1].hh + cells[k].hh) / 2));
  const xr = (k: number) => -SPAN / 2 + w * k;
  const p: AsaP = { t: tEp, amp: (0.03 + 0.05 * murcho) * (1 + 0.5 * Math.sin(tEp * 1.1)), defE, defD };
  const rot = new THREE.Euler(pitch, yaw, roll, "YXZ");
  const mundo = (q: V): V => { const v = new THREE.Vector3(q[0] * vs * sxW, q[1] * vs, q[2] * vs).applyEuler(rot); return [v.x + centro[0], v.y + centro[1], v.z + centro[2]]; };
  const topoPt = (i: number, u: number, v: number): V => {
    const s = v * v;
    const T = lerp(hr[i], hr[i + 1], u) + 0.2 * cells[i].hh * Math.sin(Math.PI * u) ** 0.8;
    return asaSup(xr(i) + u * w, 1 - s, true, T, p);
  };
  const basePt = (i: number, u: number, v: number): V => asaSup(xr(i) + u * w, 1 - v * v, false, lerp(hr[i], hr[i + 1], u), p);
  const fy = lerp(SLIDER_BAIXO, lerp(centro[1] - 0.35, SLIDER_BAIXO, freio), freioVis);
  const gs: { x: number; z: number; front: boolean }[] = [-1, 1].flatMap((sd) => [true, false].map((fr) => ({ x: sd * 0.24, z: fr ? 0.12 : -0.12, front: fr })));
  const bat = n("batoques", 0);
  const toggle = (s: number, pull: number): V => [s * 0.3, 2.05 - 0.55 * pull, 0.08];
  const linhas: { a: V; g: V }[] = [];
  const LS = n("cordas", 0);
  if (LS > 0.02) {
    for (let k = 0; k <= NC; k++) {
      for (const zu of [0.85, 0.5, 0.18]) {
        const a = mundo(asaSup(xr(k), zu, false, hr[k], p));
        const g = gs.find((q) => (q.x < 0) === (xr(k) < 0) && q.front === (zu > 0.3))!;
        linhas.push({ a, g: [g.x, fy, g.z] });
      }
    }
  }
  const ombro = (sd: number): V => [sd * 0.28, HARN, 0.08];
  return (
    <group>
      <group position={centro} rotation={rot} scale={[vs * sxW, vs, vs]}>
        {cells.map(({ i, x, hh }) => {
          const cor = COR_CEL(i);
          const esc = chordX(x) / CH0;
          const Tc = (hr[i] + hr[i + 1]) / 2 + 0.2 * hh;
          const yLow = archY(x) - 0.014 + 0.025;
          const yHigh = Math.min(archY(x) + 0.014 + Tc * esc * 0.3 - 0.025, yLow + 0.1);
          const inc = Math.atan2(archY(x + 0.05) - archY(x - 0.05), 0.1);
          return (
            <group key={i}>
              <Retalho nu={6} nv={14} fn={(u, v) => topoPt(i, u, v)} cor={cor} />
              <Retalho nu={2} nv={8} fn={(u, v) => basePt(i, u, v)} cor={mistura(cor, "#101820", 0.16)} />
              {yHigh - yLow > 0.05 && <mesh position={[x, (yLow + yHigh) / 2, zAt(x, 1) + 0.012]} rotation={[0, 0, inc]} scale={[w * 0.36, (yHigh - yLow) / 2, 1]}><circleGeometry args={[1, 20]} /><meshBasicMaterial color="#1a1420" /></mesh>}
            </group>
          );
        })}
        {/* costuras das divisórias sobre a face de cima (finas) e os fechos das pontas */}
        {Array.from({ length: NC - 1 }).map((_, j) => {
          const k = j + 1;
          return <Retalho key={k} nu={1} nv={14} cor="#10284f" fn={(u, v) => { const q = asaSup(xr(k), 1 - v * v, true, hr[k], p); return [q[0] + (u - 0.5) * 0.03, q[1] + 0.012, q[2]]; }} />;
        })}
        {[0, NC].map((k) => <Retalho key={k} nu={3} nv={12} cor={COR_CEL(k === 0 ? 0 : NC - 1)} fn={(u, v) => { const s = v * v; const a = asaSup(xr(k), 1 - s, true, hr[k], p); const b = asaSup(xr(k), 1 - s, false, hr[k], p); return [a[0], lerp(b[1], a[1], u), a[2]]; }} />)}
        {ar > 0.02 && cells.map(({ i, x, e }) => <Seta key={i} a={[x, archY(x) + 0.05 + 0.06 * Math.sin(tEp * 6 + i), zFront(x) + 1.9]} b={[x, archY(x) + 0.05, zFront(x) + 0.08]} cor="#8fd0ff" w={0.06} op={ar * clamp01(e * 3 + 0.2)} />)}
      </group>
      {/* linhas de suspensão: de fileiras na face de baixo até os 4 ilhós do freio e daí aos tirantes do arnês */}
      {LS > 0.02 && linhas.map((l, i) => <Corda key={i} a={l.a} b={l.g} i={i} t={tEp} op={LS * (1 - solta)} w={0.012} />)}
      {LS > 0.02 && gs.map((g, i) => <Liga key={i} a={[g.x, fy, g.z]} b={ombro(g.x < 0 ? -1 : 1)} w={0.035} cil cor="#2b2f36" op={LS * (1 - solta)} basico />)}
      {freioVis > 0.02 && LS > 0.02 && (
        <group position={[0, fy, 0]} scale={freioVis * (1 - solta)}>
          <Caixa p={[0, 0, 0]} t={[0.62, 0.025, 0.34]} cor="#e5473a" raio={0.008} sombra={false} />
          {gs.map((g, i) => <mesh key={i} position={[g.x, 0.0, g.z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.04, 0.014, 6, 14]} /><meshStandardMaterial color="#c9ccd0" metalness={0.7} roughness={0.3} /></mesh>)}
        </group>
      )}
      {/* batoques: três linhas por lado, da borda de trás até o punho acima da cabeça */}
      {bat > 0.02 && [-1, 1].map((s) => {
        const pull = s < 0 ? defE : defD;
        const t2 = toggle(s, pull);
        return (
          <group key={s}>
            {[0.4, 0.68, 0.94].map((f, i) => <Liga key={i} a={mundo(asaSup(s * (SPAN / 2) * f, 0.03, false, hr[Math.min(NC, Math.max(0, Math.round((s * f * NC) / 2 + NC / 2)))], p))} b={t2} w={0.014} cil cor="#ffd23f" op={bat * (1 - solta)} basico />)}
            <mesh position={t2} scale={[0.06 * bat, 0.12 * bat, 0.06 * bat]}><cylinderGeometry args={[1, 1, 1, 10]} /><meshStandardMaterial color="#ff8a2a" /></mesh>
            {pull > 0.1 && <Halo p={t2} r={0.5} cor="#ffe27a" op={0.6 * pull} />}
          </group>
        );
      })}
      <PerfilCelula k={n("perfil", 0)} e={0.55 + 0.45 * clamp01(infla * 1.8)} ar={n("arAsa", 0)} t={tEp} />
    </group>
  );
};

const Arnes: React.FC<{ k: number }> = ({ k }) => {
  if (k < 0.02) return null;
  return (
    <group scale={k}>
      {[-1, 1].map((s) => <Caixa key={s} p={[s * 0.2, 1.2, 0.2]} t={[0.09, 0.7, 0.04]} cor="#ffd23f" raio={0.01} sombra={false} />)}
      <Caixa p={[0, 1.0, 0.21]} t={[0.5, 0.07, 0.03]} cor="#ffd23f" raio={0.01} sombra={false} />
      {[-1, 1].map((s) => <Caixa key={s} p={[s * 0.12, 0.62, 0.12]} t={[0.09, 0.4, 0.04]} cor="#ffd23f" raio={0.01} sombra={false} />)}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.28, HARN, 0.08]} scale={0.06}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#c9ccd0" metalness={0.7} roughness={0.3} /></mesh>)}
    </group>
  );
};

/** A mochila NAS COSTAS do Zeca (coordenadas do corpo: ele olha para +z): corpo, tampa que abre, pilotinho dobrado, puxador, alças; o pilotinho sai e puxa o velame em ordem. */
const MochilaCostas: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp: t } = C;
  const abre = suave(n("abreM", 0));
  const piloto = suave(n("piloto", 0));
  const sai = n("sai", 0);
  const bola = n("bola", 0);
  return (
    <group>
      <Caixa p={[0, 1.08, -0.27]} t={[0.5, 0.74, 0.26]} cor="#e5473a" raio={0.06} rug={0.6} />
      <Caixa p={[0, 0.82, -0.41]} t={[0.38, 0.28, 0.04]} cor="#c02f24" raio={0.02} sombra={false} />
      <group position={[0, 1.46, -0.14]} rotation={[-1.2 * abre, 0, 0]}><Caixa p={[0, 0.0, -0.13]} t={[0.52, 0.05, 0.28]} cor="#c02f24" raio={0.02} /></group>
      {piloto < 0.02 && <Caixa p={[0, 1.52 - 0.03 * abre, -0.28]} t={[0.2, 0.1 + 0.05 * abre, 0.14]} cor="#ffd23f" raio={0.04} />}
      {[-1, 1].map((s) => <Caixa key={s} p={[s * 0.255, 1.08, -0.14]} t={[0.04, 0.62, 0.1]} cor="#ffd23f" raio={0.01} sombra={false} />)}
      {[-1, 1].map((s) => <Caixa key={s} p={[s * 0.19, 1.47, -0.02]} t={[0.08, 0.05, 0.44]} cor="#ffd23f" raio={0.01} sombra={false} />)}
      {/* o puxador do pilotinho */}
      <Liga a={[0.26, 1.0, -0.3]} b={[piloto > 0.02 ? 0.4 : 0.38, 0.72 + 0.3 * piloto, -0.34]} w={0.02} cil cor="#ffffff" basico />
      <mesh position={[piloto > 0.02 ? 0.4 : 0.38, 0.7 + 0.3 * piloto, -0.34]} scale={0.05}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#ff3b3b" /></mesh>
      {/* o pilotinho sobe, infla ao vento e puxa o velame de dentro, esticado e em ordem */}
      {piloto > 0.02 && (
        <group>
          <Corda a={[0, 1.55, -0.3]} b={[0.05, 1.55 + 1.9 * piloto, -0.3]} i={3} t={t} w={0.02} />
          <group position={[0.05, 1.55 + 1.9 * piloto, -0.3]}><Domo r={0.42 * piloto + 0.02} h={0.3 * piloto + 0.02} t={t} amp={0.05} c1="#ffd23f" c2="#ff8a2a" /></group>
          {sai < 0.99 && [0, 1, 2].map((i) => <Seta key={i} a={[-0.9, 1.9 + i * 0.3, -0.3]} b={[-0.2, 1.9 + i * 0.3, -0.3]} cor="#d6f0ff" w={0.04} op={piloto * 0.8} />)}
        </group>
      )}
      {bola > 0.02 && <group position={[0, 1.75 + 0.5 * bola, -0.3]}><Blob r={0.38 * bola} t={t} cor={COR_NANO} /><group position={[0.25, 0.15, 0.1]}><Blob r={0.25 * bola} t={t + 1} cor="#f4f1ea" /></group></group>}
      {sai > 0.02 && sai < 0.995 && <Faixa a={[0, 1.6, -0.3]} b={[0, ASA_Y / 1.06 - 0.3, 0]} k={sai} t={t} cor={COR_NANO} />}
    </group>
  );
};

const Reserva: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const rv = n("reserva", 0);
  const peito = n("peito", 0);
  const alca = n("alca", 0);
  const aad = n("aad", 0);
  const abrir = suave(rv);
  const r = 1.55 * abrir;
  const cy = 3.6;
  return (
    <group>
      {/* mochila da reserva no peito, pequena */}
      {peito > 0.02 && (
        <group position={[0, 1.02, 0.34]} scale={peito}>
          <Caixa p={[0, 0, 0]} t={[0.62, 0.34, 0.14]} cor="#ff8a2a" raio={0.03} rug={0.6} />
          <Caixa p={[0, 0, 0.08]} t={[0.5, 0.05, 0.03]} cor="#c9ccd0" raio={0.01} sombra={false} />
          {alca > 0.02 && <group><Liga a={[0.34, 0.02, 0.1]} b={[0.44, -0.18, 0.12]} w={0.04} cil cor="#ff3b3b" /><mesh position={[0.45, -0.2, 0.12]}><torusGeometry args={[0.07, 0.02, 6, 12]} /><meshStandardMaterial color="#ff3b3b" /></mesh><Halo p={[0.45, -0.2, 0.2]} r={0.5} cor="#ffe27a" op={0.55 * alca * (0.7 + 0.3 * Math.sin(tEp * 9))} /></group>}
        </group>
      )}
      {/* o aparelho: caixinha com luz que pisca */}
      {aad > 0.02 && (
        <group position={[-0.3, 1.32, 0.28]} scale={aad}>
          <Caixa p={[0, 0, 0]} t={[0.18, 0.12, 0.07]} cor="#2b2f33" raio={0.015} />
          <mesh position={[0.04, 0.0, 0.045]} scale={0.022}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={Math.sin(tEp * 10) > 0 ? "#ff3b3b" : "#7a1f1f"} /></mesh>
          <Halo p={[0.04, 0, 0.1]} r={0.45} cor="#ff5a4a" op={0.55 * (Math.sin(tEp * 10) > 0 ? 1 : 0.2)} />
        </group>
      )}
      {/* o domo da reserva */}
      {rv > 0.02 && (
        <group>
          <group position={[0, cy, 0]}><Domo r={Math.max(0.05, r)} h={Math.max(0.05, r * 0.8)} t={tEp} amp={0.06} c1="#ff8a2a" c2="#ffe14a" /></group>
          {Array.from({ length: 6 }).map((_, i) => { const a = (i / 6) * Math.PI * 2; return <Liga key={i} a={[Math.cos(a) * r, cy, Math.sin(a) * r * 0.4]} b={[Math.cos(a) * 0.1, HARN, 0.1]} w={0.02} cil cor="#ffffff" op={abrir} basico />; })}
        </group>
      )}
    </group>
  );
};

/* ---------- história ---------- */

const Leonardo: React.FC<{ k: number }> = ({ k }) => {
  if (k < 0.02) return null;
  return (
    <group position={[0, 2.8, 0]} scale={k}>
      <mesh position={[0, 0.8, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.5, 1.6, 4, 1, true]} /><meshStandardMaterial color="#8a6a46" side={THREE.DoubleSide} /></mesh>
      {[[-1.1, 0], [1.1, 0], [0, -1.1], [0, 1.1]].map(([x, z], i) => <Liga key={i} a={[x * 0.1, 1.6, z * 0.1]} b={[x, 0.05, z]} w={0.06} cil cor="#3a2a1c" />)}
      <Liga a={[-1.1, 0.05, 0]} b={[1.1, 0.05, 0]} w={0.06} cil cor="#3a2a1c" />
      <Liga a={[0, 0.05, -1.1]} b={[0, 0.05, 1.1]} w={0.06} cil cor="#3a2a1c" />
      <Liga a={[-1.1, 0.05, 0]} b={[-0.1, -1.0, 0]} w={0.025} cil cor="#3a2a1c" basico />
      <Liga a={[1.1, 0.05, 0]} b={[0.1, -1.0, 0]} w={0.025} cil cor="#3a2a1c" basico />
      <mesh position={[0, -1.25, 0]}><sphereGeometry args={[0.22, 8, 6]} /><meshBasicMaterial color="#3a2a1c" /></mesh>
      <Caixa p={[0, -1.85, 0]} t={[0.35, 0.8, 0.2]} cor="#3a2a1c" raio={0.05} />
    </group>
  );
};

const Torre: React.FC<{ k: number }> = ({ k }) => {
  if (k < 0.02) return null;
  return (
    <group position={[-2.4, 0, -1.5]} scale={k}>
      <Caixa p={[0, 2.0, 0]} t={[1.4, 4.0, 1.4]} cor="#b9a58a" raio={0.04} rug={0.9} />
      <Caixa p={[0, 4.2, 0]} t={[1.8, 0.4, 1.8]} cor="#8a6a46" raio={0.04} />
      {[-0.5, 0.5].map((x) => <Caixa key={x} p={[x, 4.55, 0]} t={[0.2, 0.3, 0.2]} cor="#8a6a46" />)}
      <mesh position={[0.2, 5.0, 0.4]} scale={[0.5, 0.28, 0.5]}><sphereGeometry args={[1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e8dcc0" side={THREE.DoubleSide} /></mesh>
    </group>
  );
};

const Papel: React.FC<{ k: number }> = ({ k }) => {
  if (k < 0.02) return null;
  return (
    <group position={[0, 2.4, -2.4]} scale={k}>
      <mesh><planeGeometry args={[9, 11]} /><meshBasicMaterial color="#dcc9a0" /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[0, s * 5.1, 0.01]}><boxGeometry args={[8.4, 0.08, 0.01]} /><meshBasicMaterial color="#6b5036" /></mesh>)}
      {Array.from({ length: 9 }).map((_, i) => <mesh key={i} position={[-3.6 + i * 0.9, 4.2, 0.01]} rotation={[0, 0, -0.5]} scale={[0.03, 1.2, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#9a8058" /></mesh>)}
    </group>
  );
};

/* ---------- solo, cidade, nuvens, pássaros ---------- */

const Casinhas: React.FC<{ k: number }> = ({ k }) => {
  if (k < 0.02) return null;
  return (
    <group>
      {Array.from({ length: 44 }).map((_, i) => {
        const x = -26 + (i % 11) * 5.0 + rnd(i * 1.7) * 1.8;
        const z = -22 + Math.floor(i / 11) * 7.0 + rnd(i * 2.3) * 2;
        if (Math.abs(x - 3) < 4 && Math.abs(z + 3) < 4) return null;
        const h = 1.2 + rnd(i + 3) * 1.0;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, h / 2, 0]}><boxGeometry args={[2.4, h, 2.2]} /><meshStandardMaterial color={["#e8d9c0", "#d9e4ee", "#f0c9b0", "#c9d6c0"][i % 4]} roughness={0.9} /></mesh>
            <mesh position={[0, h + 0.4, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.9, 0.9, 4]} /><meshStandardMaterial color="#b0553c" roughness={0.9} flatShading /></mesh>
          </group>
        );
      })}
      {[[-12, 6], [10, -10], [-8, -14], [14, 4], [0, 10], [-18, 0], [20, -6]].map(([x, z], i) => <mesh key={i} position={[x, 0.9, z]}><coneGeometry args={[0.9, 1.8, 8]} /><meshStandardMaterial color="#2f6a2c" flatShading /></mesh>)}
    </group>
  );
};

const Passaros: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  if (k < 0.02) return null;
  return (
    <group>
      {[[-5, 4.5, -5], [4, 6.5, -6], [-2, 9, -7], [6, 2, -4]].map(([x0, y, z], i) => {
        const x = ((x0 + t * (1.4 + 0.3 * i) + 14) % 28) - 14;
        const f = Math.sin(t * 9 + i * 2);
        return (
          <group key={i} position={[x, y + 0.2 * Math.sin(t * 2 + i), z]}>
            {[-1, 1].map((s) => <mesh key={s} position={[s * 0.18, 0.04 * f, 0]} rotation={[0, 0, s * (0.5 + 0.35 * f)]} scale={[0.3, 0.025, 0.12]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#2b2f36" /></mesh>)}
          </group>
        );
      })}
    </group>
  );
};

const Ponte: React.FC<{ k: number }> = ({ k }) => {
  if (k < 0.02) return null;
  return (
    <group position={[2.5, 0, -7]} scale={k}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[14, 4]} /><meshStandardMaterial color="#4a90c8" roughness={0.3} /></mesh>
      <Caixa p={[0, 0.9, 0]} t={[8, 0.3, 1.6]} cor="#a5a9ab" raio={0.04} />
      {[-1, 1].map((s) => <Caixa key={s} p={[s * 4.1, 0.45, 0]} t={[0.8, 0.9, 1.6]} cor="#8d8478" raio={0.04} />)}
      {Array.from({ length: 11 }).map((_, i) => { const x = -4 + i * 0.8; const y = 1.05 + 1.6 * Math.sin((i / 10) * Math.PI); return <group key={i}><Liga a={[x, 1.05, 0.7]} b={[x, y, 0.7]} w={0.05} cil cor="#d6392e" /></group>; })}
      <mesh position={[0, 1.05, 0.7]} rotation={[0, 0, 0]}><torusGeometry args={[4.1, 0.1, 6, 24, Math.PI]} /><meshStandardMaterial color="#d6392e" /></mesh>
    </group>
  );
};

/* ---------- o palco da rua e o efeito de fita ---------- */

/** Guarda-chuva articulado: cabo curvo, haste central, 8 varetas de duas partes (articulação no meio) com as hastes de apoio (stretchers) presas a uma argola que corre na haste, e os gomos de tecido PRESOS às pontas das varetas.
 *  `vira` 0..1: o vento sobe por baixo, as varetas viram para cima, cada uma em um instante, as pontas dobram em ângulos diferentes (algumas quebram) e o tecido acompanha as varetas, esticado entre as pontas, com pregas. */
const UL1 = 0.42;
const UL2 = 0.28;
const U_QUEBRA = [0, 14, -58, 0, 16, -44, 6, 10]; // graus: dobra final da ponta de cada vareta
const grau = (d: number) => (d * Math.PI) / 180;
const Umbrella: React.FC<{ vira: number; t: number }> = ({ vira, t }) => {
  const N = 8;
  const HUB = 0.78;
  const costelas = Array.from({ length: N }).map((_, i) => {
    const th = (i / N) * Math.PI * 2;
    const k = suave(clamp01(vira * 1.4 - 0.4 * (((i * 3) % N) / N)));
    const a1 = lerp(grau(112), grau(48), k);
    const dobra = lerp(grau(18), grau(-18), k) + grau(40) * Math.sin(Math.PI * k) * (i % 2 ? 1 : 0.6) + grau(U_QUEBRA[i]) * k + 0.07 * Math.sin(t * 15 + i * 2) * Math.sin(Math.PI * k);
    const a2 = a1 + dobra;
    const d1: V = [Math.sin(a1) * Math.cos(th), Math.cos(a1), Math.sin(a1) * Math.sin(th)];
    const d2: V = [Math.sin(a2) * Math.cos(th), Math.cos(a2), Math.sin(a2) * Math.sin(th)];
    const E: V = [d1[0] * UL1, d1[1] * UL1, d1[2] * UL1];
    const T: V = [E[0] + d2[0] * UL2, E[1] + d2[1] * UL2, E[2] + d2[2] * UL2];
    return { th, k, E, T };
  });
  const ponto = (i: number, v: number): V => {
    const c = costelas[i];
    return v <= 0.6 ? [c.E[0] * (v / 0.6), c.E[1] * (v / 0.6), c.E[2] * (v / 0.6)] : (() => { const q = (v - 0.6) / 0.4; return [lerp(c.E[0], c.T[0], q), lerp(c.E[1], c.T[1], q), lerp(c.E[2], c.T[2], q)] as V; })();
  };
  const dEsp = Math.sin(Math.PI * clamp01(vira));
  const gomo = (i: number, u: number, v: number): V => {
    const A = ponto(i, v);
    const B = ponto((i + 1) % N, v);
    const m: V = [lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)];
    const frouxo = Math.sin(Math.PI * u) * v;
    // o tecido entre duas pontas fica mais curto (corda do arco) e pende; prega leve que chacoalha quando vira
    const pxz = 1 - 0.1 * frouxo;
    const prega = (0.012 + 0.05 * dEsp) * Math.sin(u * Math.PI * 4 + i + t * 9) * v * v;
    return [m[0] * pxz, m[1] - 0.045 * frouxo * (1 - 2 * costelas[i].k) + prega, m[2] * pxz];
  };
  const runY = (() => { const c = costelas[0]; const rE = Math.hypot(c.E[0], c.E[2]); return c.E[1] - Math.sqrt(Math.max(0, 0.5 * 0.5 - rE * rE)); })();
  return (
    <group>
      {/* cabo curvo e haste central */}
      <mesh position={[0.06, -0.3, 0]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.06, 0.02, 8, 14, Math.PI]} /><meshStandardMaterial color="#3a2a1c" roughness={0.6} /></mesh>
      <Liga a={[0, -0.3, 0]} b={[0, HUB + 0.14, 0]} w={0.04} cil cor="#5b4630" />
      <mesh position={[0, HUB + 0.02, 0]} scale={0.055}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#c9ccd0" metalness={0.6} roughness={0.35} /></mesh>
      {/* argola que corre na haste e as hastes de apoio */}
      <mesh position={[0, HUB + runY, 0]} scale={[0.07, 0.04, 0.07]}><cylinderGeometry args={[1, 1, 1, 10]} /><meshStandardMaterial color="#c9ccd0" metalness={0.6} roughness={0.35} /></mesh>
      {costelas.map((c, i) => <Liga key={`s${i}`} a={[0, HUB + runY, 0]} b={[c.E[0] * 0.55, HUB + c.E[1] * 0.55, c.E[2] * 0.55]} w={0.014} cil cor="#8a8f96" basico />)}
      <group position={[0, HUB, 0]}>
        {/* varetas: parte principal, articulação e ponta */}
        {costelas.map((c, i) => (
          <group key={i}>
            <Liga a={[0, 0, 0]} b={c.E} w={0.02} cil cor="#2b2f36" basico />
            <Liga a={c.E} b={c.T} w={0.016} cil cor="#2b2f36" basico />
            <mesh position={c.E} scale={0.026}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#c9ccd0" /></mesh>
            <mesh position={c.T} scale={0.02}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#c9ccd0" /></mesh>
          </group>
        ))}
        {/* tecido: um gomo entre cada par de varetas, preso nas pontas */}
        {costelas.map((_, i) => <Retalho key={`g${i}`} nu={4} nv={10} fn={(u, v) => gomo(i, u, v)} cor={i % 2 ? "#ffd23f" : "#e5473a"} />)}
        {vira > 0.04 && vira < 0.96 && [-0.12, 0.12].flatMap((x) => [-0.12, 0.12].map((z) => [x, z])).map(([x, z], i) => <Seta key={i} a={[x, -0.55 + 0.05 * Math.sin(t * 9 + i), z]} b={[x * 1.3, -0.05, z * 1.3]} cor="#8fd0ff" w={0.03} op={dEsp} />)}
      </group>
    </group>
  );
};

const Predio: React.FC = () => (
  <group>
    <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[90, 60]} /><meshStandardMaterial color="#6aa84f" roughness={1} /></mesh>
    <mesh position={[0, 0.0, 6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[90, 8]} /><meshStandardMaterial color="#4a4f57" roughness={0.9} /></mesh>
    {Array.from({ length: 16 }).map((_, i) => <mesh key={i} position={[-30 + i * 4, 0.01, 6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.6, 0.15]} /><meshBasicMaterial color="#d6cf9a" /></mesh>)}
    <mesh position={[0, 0.01, 1.9]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[90, 2.4]} /><meshStandardMaterial color="#b8b2a4" roughness={1} /></mesh>
    {/* o prédio: dois andares, fachada para +z */}
    <Caixa p={[0, 3.3, -0.4]} t={[8.2, 6.6, 2.0]} cor="#d9b48a" raio={0.04} rug={0.9} />
    <Caixa p={[0, 6.8, -0.4]} t={[8.6, 0.3, 2.3]} cor="#8a5a3c" raio={0.03} />
    {[-2.8, 0, 2.8].map((x) => (
      <group key={x}>
        <mesh position={[x, 1.7, 0.62]}><boxGeometry args={[1.5, 1.7, 0.06]} /><meshBasicMaterial color="#2b3b52" /></mesh>
        <Caixa p={[x, 4.4, 0.62]} t={[1.5, 1.9, 0.06]} cor={x === 0 ? "#1a2432" : "#2b3b52"} raio={0.01} sombra={false} />
        <Caixa p={[x, 3.4, 0.74]} t={[1.9, 0.12, 0.35]} cor="#8a6a46" raio={0.02} />
      </group>
    ))}
    <Caixa p={[0, 0.9, 0.62]} t={[1.2, 1.8, 0.08]} cor="#7a4a2a" raio={0.02} sombra={false} />
    {[[-7, -2], [7.5, -3], [-11, -6], [12, -5]].map(([x, z], i) => <group key={i} position={[x, 0, z]}><mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.2, 0.28, 2.4, 7]} /><meshStandardMaterial color="#6a4a2c" /></mesh><mesh position={[0, 3.2, 0]}><icosahedronGeometry args={[1.5, 1]} /><meshStandardMaterial color="#3f7a3c" flatShading /></mesh></group>)}
    {[[-5, 3.4], [5.5, 3.2]].map(([x, z], i) => <mesh key={i} position={[x, 0.3, z]} scale={[1.4, 0.8, 1]}><icosahedronGeometry args={[0.5, 1]} /><meshStandardMaterial color="#4a8a3a" flatShading /></mesh>)}
  </group>
);

/** Efeito de fita: barras de ruído horizontais coladas na câmera. */
const Fita: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  const { camera } = useThree();
  if (k < 0.02) return null;
  const cam = camera as THREE.PerspectiveCamera;
  cam.updateMatrixWorld();
  const D = 1.2;
  const H = D * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const Wd = H * cam.aspect;
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  const rt = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  return (
    <group>
      {Array.from({ length: 9 }).map((_, i) => {
        const y = (((rnd(i * 3.1) + t * (0.6 + 0.8 * rnd(i))) % 1) * 2 - 1) * H;
        const hh = H * (0.015 + 0.05 * rnd(i + 5));
        const dx = (rnd(Math.floor(t * 12) + i) - 0.5) * 0.12 * Wd;
        const pos = cam.position.clone().add(fwd.clone().multiplyScalar(D)).add(up.clone().multiplyScalar(y)).add(rt.clone().multiplyScalar(dx));
        return (
          <mesh key={i} position={pos} quaternion={cam.quaternion} renderOrder={30}>
            <planeGeometry args={[Wd * 2, hh]} />
            <meshBasicMaterial color={i % 3 ? "#ffffff" : "#1a1a22"} transparent opacity={0.4 * k} depthTest={false} />
          </mesh>
        );
      })}
      <mesh position={cam.position.clone().add(fwd.clone().multiplyScalar(D + 0.01))} quaternion={cam.quaternion} renderOrder={29}>
        <planeGeometry args={[Wd * 2.2, H * 2.2]} />
        <meshBasicMaterial color="#2a2a40" transparent opacity={0.22 * k} depthTest={false} />
      </mesh>
    </group>
  );
};

/* ---------- cena ---------- */

const Paraq: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const gente = (C.cena.gente as GenteE[] | undefined) ?? [];
  const palco = (C.cena.palco as string | undefined) ?? "ceu";
  const tam = n("tam", 2.2);
  const balanca = n("balanca", 0);
  const vel = C.int("vel", 0);
  const solo = n("solo", -30);
  const riscos = n("riscos", 0);
  const sway = balanca * Math.sin(tEp * 3.2);
  const pivot: V = [0, ALT + 0.4, 0];
  const nuvens = [[-3.2, 2, -4], [3.4, 9, -5], [-4.0, 13, -7], [2.4, 18, -6], [-2.0, 22, -8], [4.4, 5, -9], [0.8, 26, -9], [-4.6, 7, -10], [6.5, 14, -9], [-7, 17, -9]];
  const cidade = n("cidade", 0);
  const asolo = n("amigoSolo", 0);
  if (palco === "rua") {
    const vira = n("guardaVira", 0);
    const ay = n("amigoY", 3.3);
    const az = n("amigoZ", 0.75);
    const pa = n("pausa", 0);
    const rb = n("rebob", 0);
    const ant = gente.filter((g) => g.quem !== "amigo");
    return (
      <group>
        <hemisphereLight args={["#e8f4ff", "#8a8070", 1.1]} />
        <directionalLight position={[-4, 12, 9]} intensity={1.5} color="#fff3dc" />
        <Dome topo="#3f86d8" meio="#9ad0f5" base="#e6f4fb" />
        <Nuvens2 t={tEp} />
        <Passaros t={tEp} k={1} />
        <Predio />
        <group position={[0, ay, az]} rotation={[0, 0, 0]}>
          <group scale={1.0}>
            <Pessoa g={{ quem: "amigo", x: 0, y: 0, z: 0, rot: 0, esc: 1.0, exp: pa > 0.02 && rb < 0.02 ? "surpreso" : "sorriso", acao: "em-pe", pose: { "ombroE.x": -1.25, "ombroD.x": -1.25, "cotoveloE.x": -0.75, "cotoveloD.x": -0.75, "ombroE.z": -0.28, "ombroD.z": 0.28, maos: 0.2, "pernaE.x": ay < 3.2 ? -0.5 : 0, "pernaD.x": ay < 3.2 ? 0.4 : 0, "joelhoE.x": ay < 3.2 ? 0.9 : 0, "joelhoD.x": ay < 3.2 ? 0.5 : 0 } }} C={C} />
            <group position={[0, 1.05, 0.5]}><Umbrella vira={vira} t={tEp} /></group>
          </group>
        </group>
        {pa > 0.02 && <Texto3D texto={rb > 0.02 ? "<< REBOBINA" : "PAUSA"} p={[0, 5.4, 3.0]} h={1.0} cor="#ff4a3a" escala={suave(Math.max(pa, rb))} />}
        <Fita k={n("fita", 0)} t={tEp} />
        {ant.map((g, i) => <Pessoa key={i} g={g} C={C} />)}
      </group>
    );
  }
  return (
    <group>
      <hemisphereLight args={["#e8f4ff", "#8a8070", 1.1]} />
      <directionalLight position={[-4, 12, 9]} intensity={1.5} color="#fff3dc" />
      <Dome topo="#3f86d8" meio="#9ad0f5" base="#e6f4fb" />
      {nuvens.map(([x, y0, z], i) => {
        const y = ((((y0 + vel * 0.8) % 28) + 28) % 28) - 8;
        return (
          <group key={i} position={[x, y, z]} scale={1.1 + 0.2 * (i % 3)}>
            {[[0, 0, 1], [0.9, -0.1, 0.8], [-0.9, -0.15, 0.75], [0.3, 0.35, 0.7]].map(([a, b, d], j) => <mesh key={j} position={[a, b, 0]} scale={[d * 1.2, d * 0.7, d * 0.8]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#ffffff" roughness={1} flatShading /></mesh>)}
          </group>
        );
      })}
      <Passaros t={tEp} k={n("passaros", 1)} />
      <group position={[0, solo, -6]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[420, 300]} /><meshStandardMaterial color="#6aa84f" roughness={1} /></mesh>
        {[[-6, 0, "#c9a24a"], [4, -6, "#8cc760"], [14, 4, "#c9a24a"], [-14, 6, "#4f8f3c"], [8, 12, "#8cc760"], [-22, -4, "#8cc760"], [22, -2, "#c9a24a"]].map(([x, z, c], i) => <mesh key={i} position={[x as number, 0.02, z as number]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[7, 5]} /><meshStandardMaterial color={c as string} roughness={1} /></mesh>)}
        <Casinhas k={cidade} />
        {asolo > 0.02 && <group position={[3, 0, -3]} scale={asolo}><Predio /><group position={[0, 3.3, 0.8]}><Pessoa g={{ quem: "amigo", x: 0, y: 0, z: 0, rot: 0, esc: 1.0, exp: "surpreso", acao: "em-pe", pose: { "cabeca.x": -0.55, "ombroE.z": 0.12, "ombroD.z": -0.12, "ombroD.x": -0.6, "cotoveloD.x": -1.2 } }} C={C} /></group></group>}
        <Ponte k={n("ponte", 0)} />
      </group>
      {riscos > 0.02 && [-1.1, -0.5, 0.5, 1.1, -1.7, 1.7].map((x, i) => {
        const u = (((tEp * 2.2 + i * 0.37) % 1) + 1) % 1;
        return <Liga key={i} a={[x, -0.2 + u * 3.4, 0.6]} b={[x, 0.9 + u * 3.4, 0.6]} w={0.03} cil cor="#ffffff" op={riscos * (1 - u)} basico />;
      })}
      {n("telhado", 0) > 0.02 && <group position={[3.6, lerp(-9, -2.2, suave(n("telhado", 0))), -1.5]}><Caixa p={[0, -1.2, 0]} t={[4.0, 2.4, 3.0]} cor="#e8d9c0" raio={0.05} /><mesh position={[0, 0.2, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[3.4, 1.4, 4]} /><meshStandardMaterial color="#b0553c" roughness={0.9} flatShading /></mesh></group>}
      <Leonardo k={n("leonardo", 0)} />
      <Papel k={n("papel", 0)} />
      <Torre k={n("torre", 0)} />
      {n("letras", 0) > 0.02 && (
        <group>
          <Texto3D texto="PARA" p={[lerp(-3.0, -1.0, suave(n("letras", 0))), 2.0, 0.5]} h={0.95} />
          <Texto3D texto="CHUTE" p={[lerp(3.2, 1.2, suave(n("letras", 0))), 2.0, 0.5]} h={0.95} />
        </group>
      )}
      <group rotation={[0, n("giraMundo", 0), 0]}>
      <group position={pivot} rotation={[0, 0, sway]}>
        <group position={[-pivot[0], -pivot[1], -pivot[2]]}>
          <Pano C={C} tam={tam} />
          <Asa C={C} />
          <Reserva C={C} />
          <Arnes k={n("arnes", 0)} />
          {gente.map((gd, i) => <Pessoa key={i} g={gd} C={C} />)}
        </group>
      </group>
      </group>
    </group>
  );
};

const Nuvens2: React.FC<{ t: number }> = ({ t }) => (
  <group>
    {[[-14, 14, -20, 2.4], [8, 17, -24, 3], [22, 12, -22, 2.2], [-26, 18, -26, 3]].map(([x, y, z, s], i) => (
      <group key={i} position={[((x + t * 0.5 + 40) % 80) - 40, y, z]} scale={s}>
        {[[0, 0, 1], [0.9, -0.1, 0.8], [-0.9, -0.15, 0.75], [0.3, 0.35, 0.7]].map(([a, b, d], j) => <mesh key={j} position={[a, b, 0]} scale={[d * 1.2, d * 0.7, d * 0.8]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#ffffff" roughness={1} flatShading /></mesh>)}
      </group>
    ))}
  </group>
);


/* ---------- mostradores de altitude e velocidade (colados na câmera, nos cantos de cima, dentro da coluna segura) ---------- */

const painelTex = (rotulo: string, valor: number, unidade: string, frac: number, cor: string) => {
  const c = document.createElement("canvas");
  c.width = 540;
  c.height = 292;
  const g = c.getContext("2d")!;
  const rr = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = "rgba(20,25,38,0.93)";
  rr(6, 6, 528, 280, 34);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = cor;
  g.stroke();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#cfd8e6";
  g.font = `700 50px ${FONT}, sans-serif`;
  g.fillText(rotulo, 270, 52);
  g.fillStyle = "#ffffff";
  g.font = `700 112px ${FONT}, sans-serif`;
  g.fillText(`≈${Math.round(valor)}`, 270, 138);
  g.fillStyle = cor;
  g.font = `700 46px ${FONT}, sans-serif`;
  g.fillText(unidade, 270, 208);
  g.fillStyle = "rgba(255,255,255,0.18)";
  rr(40, 236, 460, 26, 13);
  g.fill();
  g.fillStyle = cor;
  rr(40, 236, Math.max(26, 460 * Math.max(0, Math.min(1, frac))), 26, 13);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const Painel: React.FC<{ x: number; y: number; rotulo: string; valor: number; unidade: string; frac: number; cor: string; k: number }> = ({ x, y, rotulo, valor, unidade, frac, cor, k }) => {
  const { camera } = useThree();
  const tex = React.useMemo(() => painelTex(rotulo, valor, unidade, frac, cor), [rotulo, Math.round(valor), unidade, Math.round(frac * 100), cor]);
  const cam = camera as THREE.PerspectiveCamera;
  cam.updateMatrixWorld();
  const D = 1.0;
  const H = D * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const Wd = H * cam.aspect;
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  const rt = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  const pos = cam.position.clone().add(fwd.multiplyScalar(D)).add(rt.multiplyScalar(x * Wd)).add(up.multiplyScalar(y * H));
  const w = 0.5 * Wd * suave(k);
  return (
    <mesh position={pos} quaternion={cam.quaternion} renderOrder={40}>
      <planeGeometry args={[w, w * (292 / 540)]} />
      <meshBasicMaterial map={tex} transparent depthTest={false} />
    </mesh>
  );
};

const Mostradores: React.FC<{ C: Ctx }> = ({ C }) => {
  const k = C.n("hud", 0);
  if (k < 0.02) return null;
  const alt = C.n("hudAlt", 4000);
  const vel = C.n("hudVel", 0);
  return (
    <group>
      <Painel x={-0.42} y={0.55} rotulo="ALTITUDE" valor={alt} unidade="m" frac={alt / 4200} cor="#6fc3ff" k={k} />
      <Painel x={0.42} y={0.55} rotulo="VELOCIDADE" valor={vel} unidade="km/h" frac={vel / 200} cor={vel > 120 ? "#ff6a4a" : vel > 60 ? "#ffd23f" : "#6dff8a"} k={k} />
    </group>
  );
};

const PqCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const C = mkCtx(cena, p, t, tEpisodio);
  const { n } = C;
  const palco = (cena.palco as string | undefined) ?? "ceu";
  const X0 = PALCO_X[palco] ?? 0;
  const tam = n("tam", 2.2);
  const cy = lerp(HARN + 1.3, ALT, n("forma", 1));
  const et: Record<string, EtiqDef> = {
    pano: { texto: "VELAME", para: [tam * 0.6, cy + 0.2, 0.3], off: [0.7, 0.9], cor: "#ffd23f" },
    velameAsa: { texto: "VELAME", para: [0.0, ASA_Y + 0.4, 0.5], off: [1.5, 1.3], cor: "#ffd23f" },
    antirasgo: { texto: "ANTI-RASGO", para: [tam * 0.75 + 0.6, 4.4, 1.0], off: [-0.4, 1.7], cor: "#9fe8b0" },
    cordas: { texto: "CORDAS DE", para: [0.9, 3.0, 0.2], off: [1.3, 1.5], cor: "#ffffff" },
    cordas2: { texto: "SUSPENSÃO", para: [0.9, 3.0, 0.2], off: [1.3, 0.95], cor: "#ffffff" },
    arnes: { texto: "ARNÊS", para: [0.2, 1.2, 0.3], off: [1.3, -0.6], cor: "#ffd23f" },
    furo: { texto: "CHAMINÉ", para: [0.0, ALT + tam * 0.95, 0.3], off: [1.1, 0.7], cor: "#ffd23f" },
    panos: { texto: "DOIS PANOS", para: [0.0, PERFIL_P[1] + 0.5, PERFIL_P[2]], off: [1.5, 1.2], cor: "#ffd23f" },
    celulas: { texto: "CÉLULAS", para: [0.4, PERFIL_P[1] - 0.05, PERFIL_P[2]], off: [1.5, -1.2], cor: "#ffd23f" },
    batoques: { texto: "BATOQUES", para: [0.3, 2.05, 0.1], off: [1.5, 1.2], cor: "#ffb36a" },
    comando: { texto: "COMANDO", para: [0.5, 1.15, 0.35], off: [1.4, -0.5], cor: "#ffd23f" },
    mochila: { texto: "MOCHILA", para: [0.0, 1.15, -0.42], off: [-1.4, 0.9], cor: "#ffb36a" },
    piloto: { texto: "PILOTINHO", para: [0.05, 3.0, -0.3], off: [1.4, 0.7], cor: "#ffd23f" },
    freio: { texto: "FREIO", para: [0.3, lerp(SLIDER_TOPO, SLIDER_BAIXO, n("freio", 1)), 0.1], off: [1.5, 0.5], cor: "#ffd23f" },
    reserva: { texto: "RESERVA", para: [0.0, 3.6, 0.3], off: [-1.3, 0.9], cor: "#ffb36a" },
    auto: { texto: "AUTOMÁTICO", para: [-0.3, 1.32, 0.34], off: [-1.5, 0.7], cor: "#ff8a7a" },
    paraq: { texto: "PARAQUEDAS", para: [0.0, ALT + 1.6, 0.3], off: [0.0, 0.8], cor: "#ffd23f" },
  };
  const S = n("etiqS", 1);
  const Kt = n("etiqK", 1);
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fimE] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fimE === undefined || p <= fimE) };
  }).filter((x) => x.ok);
  return (
    <group>
      <group position={[X0, 0, 0]}><Paraq C={C} /></group>
      <Mostradores C={C} />
      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const psi = n("giraMundo", 0);
        const ro = (q: V): V => [q[0] * Math.cos(psi) + q[2] * Math.sin(psi), q[1], -q[0] * Math.sin(psi) + q[2] * Math.cos(psi)];
        const pa = ro(d.para);
        const off: V = [pa[0] + d.off[0] * S + X0, pa[1] + d.off[1] * S, pa[2] + 0.3];
        return <Etiqueta key={c} texto={d.texto} de={off} para={[pa[0] + X0, pa[1], pa[2]]} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

void clamp01;

export const paraquedas: Cenario3D = {
  Cena: PqCena,
  padrao: "geral",
  fundo: () => "#9ad0f5",
  luzPropria: true,
  cameras: { geral: { pos: [0, 3.2, 10], alvo: [0, 3.0, 0], fov: 50 } },
};
