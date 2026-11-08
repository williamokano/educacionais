import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, lerp } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Expressao3D, Personagem3D, Pose3D } from "../../../src/v3d/tipos";
import { Fumaca } from "./cozinha-base";
import { homemA, homemB, homemC, mulher } from "./fieis";
import { menino, vizinha, vovo } from "./moradores";

// Pessoas do episódio do zíper (21): todas Boneco3D, como o Zeca. Passantes do corredor, pedestres da rua e o chefe (camisa, gravata, cinto).

/** O chefe: 1,75 m, cabelo grisalho, óculos, bigode, barriga, camisa branca e calça escura. */
export const chefe: Personagem3D = {
  nome: "Chefe", altura: 1.75, pele: "#e0ac86", cabelo: "#c4c5ca", olhos: "#4a3523", camiseta: "#f4f4f0", calca: "#2b2f3a", sapato: "#1d1a18",
  oculos: { cor: "#5a4a3a", aro: 0.064 }, bigode: "#b5b6bb", sobrancelha: "#9a9aa0", barriga: 0.4,
};
const homemA2: Personagem3D = { ...homemA, bone: { cor: "#3c6fb5", aba: "#2d5589", virado: false } };
const homemD: Personagem3D = { ...homemA, bone: { cor: "#d6322a", aba: "#a8231c", virado: true }, nome: "Homem D", camiseta: "#e8a13a", calca: "#3d3a36", altura: 1.82, cabelo: "#2a1810", barriga: 0.1 };
const mulher2: Personagem3D = { ...mulher, nome: "Mulher 2", camiseta: "#47b6e8", calca: "#2a2f45", cabelo: "#6b4a2a", altura: 1.66, pele: "#e3b48a" };
const mulher3: Personagem3D = { ...vizinha, nome: "Mulher 3", camiseta: "#8a5ac4", calca: "#2a2f45", altura: 1.7 };

export const POVO: Personagem3D[] = [homemA2, mulher, homemC, homemB, mulher2, homemD, vizinha, vovo, menino, mulher3];

/** Pose de caminhada em função da fase do passo (rad): mesma família da ação "andando" do rig, com a fase presa à distância andada. */
export const andaPose = (c: number, amp = 1): Pose3D => {
  const s = Math.sin(c);
  return {
    "quadril.y": Math.abs(Math.cos(c)) * 0.035 - 0.02, "tronco.x": 0.06, "tronco.y": s * 0.06 * amp,
    "pernaE.x": s * 0.5 * amp, "pernaD.x": -s * 0.5 * amp,
    "joelhoE.x": Math.max(0, -Math.cos(c)) * 0.75 * amp + 0.05, "joelhoD.x": Math.max(0, Math.cos(c)) * 0.75 * amp + 0.05,
    "ombroE.x": -s * 0.45 * amp, "ombroD.x": s * 0.45 * amp, "ombroE.z": 0.1, "ombroD.z": -0.1,
    "cotoveloE.x": -0.35, "cotoveloD.x": -0.35, "cabeca.y": -s * 0.04,
  };
};

const PASSO = 1.45; // m por ciclo completo de passo (dois passos)

export type FigSpec = {
  quem: Personagem3D;
  x0: number; z: number; v?: number; // v > 0 anda para +x, v < 0 para -x; sem v = parado
  acao?: string; exp?: Expressao3D; rotOff?: number; esc?: number; fase?: number; ph?: number; // fase do passo (rad), se já calculada por quem posiciona
};

/** Uma pessoa de fundo: anda com ciclo de passos preso ao chão ou fica parada (conversando, rindo). */
export const Figurante: React.FC<{ f: FigSpec; t: number; escCena?: number; y?: number }> = ({ f, t, escCena = 1, y = 0 }) => {
  const v = f.v ?? 0;
  const x = f.x0 + v * t;
  const anda = Math.abs(v) > 0.01;
  const dir = v >= 0 ? 1 : -1;
  const pose = anda ? andaPose(f.ph ?? (2 * Math.PI * Math.abs(v) * t) / (PASSO * escCena) + (f.fase ?? 0)) : poseDe3D(f.acao ?? "em-pe", t + (f.fase ?? 0));
  const rot = (anda ? dir * Math.PI / 2 : 0) + (f.rotOff ?? 0);
  return (
    <group position={[x, y, f.z]} rotation={[0, rot, 0]} scale={(f.esc ?? 1.04) * escCena}>
      <Boneco3D p={f.quem} pose={pose} expressao={f.exp ?? "neutro"} pisca={piscar(t + (f.fase ?? 0) * 3 + f.z)} t={t} />
    </group>
  );
};

/** Perfil do tronco do rig (mesmo de personagem.tsx) para a gravata e o cinto acompanharem a barriga. */
const rTronco = (y: number, barriga: number) => {
  const pts = [[0, 0], [0.15, 0], [0.18 + barriga * 0.04, 0.07], [0.192 + barriga * 0.035, 0.18], [0.188 + barriga * 0.015, 0.3], [0.178, 0.4], [0.15, 0.48], [0.075, 0.535], [0, 0.545]];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][1]) return pts[i - 1][0] + ((pts[i][0] - pts[i - 1][0]) * (y - pts[i - 1][1])) / (pts[i][1] - pts[i - 1][1]);
  return 0;
};

/** Gravata, colarinho e cinto presos ao tronco (seguem a inclinação do tronco e do quadril). */
const Roupa: React.FC<{ p: Personagem3D; pose: Pose3D; cor?: string }> = ({ p, pose, cor = "#c0392b" }) => {
  const b = p.barriga ?? 0.3;
  const zr = (y: number) => rTronco(y, b) * 0.86;
  const g = (j: string) => pose[j] ?? 0;
  const geo = useMemo(() => {
    const rows: [number, number][] = [[0.505, 0.014], [0.475, 0.019], [0.41, 0.026], [0.34, 0.034], [0.27, 0.038], [0.21, 0.0]];
    const pos: number[] = [];
    rows.forEach(([y, w]) => { const z = zr(y) + 0.007; pos.push(-w, y, z, w, y, z); });
    const idx: number[] = [];
    for (let i = 0; i < rows.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const gm = new THREE.BufferGeometry();
    gm.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    gm.setIndex(idx);
    gm.computeVertexNormals();
    return gm;
  }, [b]);
  return (
    <group scale={(p.altura ?? 1.6) / 1.6}>
      <group position={[0, 0.635 + g("quadril.y"), 0]} rotation={[g("quadril.x"), 0, 0]}>
        <group rotation={[g("tronco.x"), g("tronco.y"), g("tronco.z")]}>
          <mesh geometry={geo} castShadow><meshStandardMaterial color={cor} roughness={0.55} side={THREE.DoubleSide} /></mesh>
          {/* nó */}
          <mesh position={[0, 0.5, zr(0.5) + 0.012]} scale={[0.026, 0.022, 0.016]}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color={cor} roughness={0.5} /></mesh>
          {/* colarinho */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.04, 0.518, zr(0.518) + 0.004]} rotation={[-0.45, 0, s * -0.7]}><boxGeometry args={[0.065, 0.034, 0.008]} /><meshStandardMaterial color="#ffffff" roughness={0.7} /></mesh>
          ))}
          {/* cinto e fivela */}
          <group scale={[1, 1, 0.86]}>
            <mesh position={[0, 0.125, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[rTronco(0.125, b) + 0.001, 0.013, 6, 32]} /><meshStandardMaterial color="#1c1a18" roughness={0.6} /></mesh>
          </group>
          <mesh position={[0, 0.125, zr(0.125) + 0.012]}><boxGeometry args={[0.04, 0.032, 0.008]} /><meshStandardMaterial color="#d9b44a" metalness={0.8} roughness={0.3} /></mesh>
        </group>
      </group>
    </group>
  );
};

/** Chefe sentado atrás da mesa. `dt` = segundos desde o botão cair na sopa (negativo antes); `tb` 0..1 = voo do botão. */
export const Chefe: React.FC<{ t: number; dt: number; tb: number }> = ({ t, dt, tb }) => {
  const sent = poseDe3D("sentado", t);
  let pose: Pose3D = { ...sent };
  let exp: Expressao3D = "neutro";
  let vapor = 0;
  if (tb < 0.12) {
    // tomando a sopa: colher indo e vindo
    const c = Math.sin(t * 2.2);
    Object.assign(pose, { "ombroD.x": -0.85 - 0.25 * c, "cotoveloD.x": -1.3 - 0.35 * c, "ombroE.x": -0.6, "cotoveloE.x": -0.9, "cabeca.x": 0.1 + 0.05 * c });
    exp = "sorriso";
  } else if (dt < 0) {
    // viu algo vindo: olha para cima
    const k = clamp01((tb - 0.12) / 0.5);
    Object.assign(pose, { "cabeca.x": -0.25 * k, "cabeca.y": 0.5 * k, "tronco.x": -0.08 * k, "ombroD.x": lerp(-0.85, -0.5, k), "cotoveloD.x": lerp(-1.3, -0.7, k) });
    exp = k > 0.5 ? "surpreso" : "alerta";
  } else if (dt < 0.7) {
    // susto: braços para cima, recua
    const k = clamp01(dt / 0.15);
    Object.assign(pose, { "tronco.x": -0.22 * k, "cabeca.x": -0.15 * k, "ombroE.z": 0.9 * k, "ombroD.z": -0.9 * k, "ombroE.x": -0.5, "ombroD.x": -0.5, "cotoveloE.x": -0.9, "cotoveloD.x": -0.9, "maos": 1 });
    exp = "surpreso";
  } else {
    // irritado: punhos na mesa, treme, solta fumacinha das orelhas
    const k = clamp01((dt - 0.7) / 0.3);
    const tr = Math.sin(t * 34) * 0.012 * k;
    Object.assign(pose, { "tronco.x": 0.12 * k + tr, "cabeca.x": 0.14 * k, "cabeca.z": tr * 4, "ombroE.x": -1.0, "ombroD.x": -1.0, "cotoveloE.x": -0.75, "cotoveloD.x": -0.75, "ombroE.z": 0.12, "ombroD.z": -0.12, "maos": 0 });
    exp = "raiva";
    vapor = k;
  }
  return (
    <group>
      <Boneco3D p={chefe} pose={pose} expressao={exp} pisca={piscar(t)} t={t} />
      <Roupa p={chefe} pose={pose} />
      {vapor > 0.02 && [-1, 1].map((s) => (
        <group key={s}>
          <Fumaca p={[s * 0.2, 1.38, -0.02]} t={t + (s > 0 ? 0.37 : 0)} k={vapor} cor="#e6e6ea" n={5} alt={0.35} larg={0.07} op={0.7} />
        </group>
      ))}
    </group>
  );
};

/** Quem anda no corredor da abertura (z negativo = mais ao fundo; v em m/s). */
export const PASSANTES: FigSpec[] = [
  { quem: homemA2, x0: -2.6, z: -1.35, v: 0.85 },
  { quem: mulher, x0: -1.3, z: -1.1, v: 0.85, fase: 1.3 },
  { quem: homemC, x0: 0.2, z: -1.5, v: 0.85, fase: 2.1 },
  { quem: mulher2, x0: 8.6, z: -1.0, v: -1.0, fase: 0.4 },
  { quem: menino, x0: 7.6, z: -1.2, v: -1.0, fase: 2.6 },
  { quem: homemD, x0: -8.5, z: -1.7, v: 1.1, fase: 0.9 },
  { quem: vovo, x0: 17.5, z: -1.7, v: -0.7, fase: 1.7 },
  // parados conversando perto da planta
  { quem: homemB, x0: 3.7, z: -1.45, acao: "explicando", exp: "sorriso", rotOff: 1.15 },
  { quem: mulher3, x0: 4.55, z: -1.35, acao: "em-pe", exp: "sorriso", rotOff: -1.1, fase: 0.8 },
];
