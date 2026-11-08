import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { clamp01, lerp, suave, valor } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Anterior, poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Expressao3D, Pose3D, V3, Valor } from "../../../src/v3d/tipos";
import { zeca } from "./zeca";

// Apoio comum dos cenários dos rascunhos 19+ (submarino, cadeado, zíper, paraquedas, ponte, relógio, farol):
// campos animados (`nv`), contexto da cena, Zeca (`Pessoa`), céu, nuvens e árvores.
// Campo numérico = número, { de, para, ini, fim } ou chaves [[progresso, valor], ...].

export type V = V3;
export const n0 = (v: unknown) => v as Valor;
const chaves = (a: [number, number][], p: number) => {
  if (p <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    if (p <= a[i][0]) return lerp(a[i - 1][1], a[i][1], suave(clamp01((p - a[i - 1][0]) / Math.max(a[i][0] - a[i - 1][0], 1e-6))));
  }
  return a[a.length - 1][1];
};
export const nv = (v: unknown, p: number, pad = 0) => (Array.isArray(v) ? chaves(v as [number, number][], p) : valor(n0(v), p, pad));
export const mistura = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getStyle();

export type Ctx = { cena: Record<string, unknown>; p: number; t: number; tEp: number; n: (k: string, pad?: number, u?: number) => number; int: (k: string, pad?: number) => number };
export const mkCtx = (cena: Record<string, unknown>, p: number, t: number, tEp: number): Ctx => {
  const n = (k: string, pad = 0, u = p) => nv(cena[k], u, pad);
  const dur = p > 0.001 ? t / p : 3;
  /** integral do campo ao longo da batida (velocidade variável sem a peça pular) */
  const int = (k: string, pad = 0) => {
    const N = 16;
    let s = 0;
    for (let i = 0; i < N; i++) s += n(k, pad, (p * (i + 0.5)) / N);
    return s * (p / N) * dur;
  };
  return { cena, p, t, tEp, n, int };
};

export type GenteE = { x?: Valor; y?: Valor; z?: Valor; rot?: Valor; acao?: string | [number, string, string?][]; exp?: Expressao3D; ant?: Anterior; entradaDur?: number; pose?: Pose3D | [number, Pose3D][]; incl?: Valor; esc?: number; obj?: string; suor?: number };

/** O Zeca (ou outro; sempre o `zeca`). `obj` = nome de um objeto que ele leva na mão (desenhado por `renderObj`, em coordenadas do corpo, na frente do peito). */
export const Pessoa: React.FC<{ g: GenteE; p: number; t: number; tAbs: number; renderObj?: (nome: string) => React.ReactNode }> = ({ g, p, t, tAbs, renderObj }) => {
  const { acao, exp, pose } = poseGente(g, { p, t: t, tAbs, abs: true, incl: valor(g.incl, p, 0) });
  const { x, y, z, rot } = posicaoGente(g, t, { x: nv(g.x, p, 0), y: nv(g.y, p, 0), z: nv(g.z, p, 0), rot: nv(g.rot, p, 0) });
  const esc = g.esc ?? 1.06;
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={esc}>
      <Boneco3D p={zeca} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} suor={g.suor} t={tAbs} />
      {g.obj && renderObj && <group position={[0, 1.0, 0.42]}>{renderObj(g.obj)}</group>}
    </group>
  );
};

/** Poses de braço (rad) usadas por vários episódios. */
export const SEGURA: Pose3D = { "ombroE.x": -0.95, "ombroD.x": -0.95, "cotoveloE.x": -0.65, "cotoveloD.x": -0.65, "ombroE.z": -0.2, "ombroD.z": 0.2, maos: 0.2 };
export const ABRE: Pose3D = { "ombroE.z": 1.2, "ombroD.z": -1.2, "cotoveloE.z": 0.2, "cotoveloD.z": -0.2, maos: 1 };
export const BRACOS_CIMA: Pose3D = { "ombroE.x": -0.4, "ombroD.x": -0.4, "ombroE.z": 2.4, "ombroD.z": -2.4, "cotoveloE.z": 0.3, "cotoveloD.z": -0.3, maos: 1 };

/** Céu em degradê que segue a câmera. */
export const Dome: React.FC<{ topo: string; meio: string; base: string; r?: number }> = ({ topo, meio, base, r = 68 }) => {
  const { camera } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 24, 18);
    const pos = g.attributes.position;
    const cs: number[] = [];
    const ct = new THREE.Color(topo), cm = new THREE.Color(meio), cb = new THREE.Color(base);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const c = y >= 0 ? cm.clone().lerp(ct, Math.pow(y, 0.7)) : cm.clone().lerp(cb, Math.min(1, -y * 3));
      cs.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3));
    return g;
  }, [topo, meio, base]);
  return (
    <mesh geometry={geo} scale={r} position={[camera.position.x, camera.position.y, camera.position.z]} renderOrder={-10}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
};

export const Nuvens: React.FC<{ t: number; lista: [number, number, number, number][]; cor?: string }> = ({ t, lista, cor = "#ffffff" }) => (
  <group>
    {lista.map(([x, y, z, s], i) => (
      <group key={i} position={[((x + t * 0.35 * (0.6 + 0.2 * i) + 70) % 140) - 70, y, z]} scale={s}>
        {[[0, 0, 0, 1], [1.0, -0.15, 0.1, 0.8], [-1.0, -0.2, 0, 0.75], [0.4, 0.4, 0, 0.7], [-0.45, 0.3, 0.1, 0.65]].map(([a, b, c, d], j) => (
          <mesh key={j} position={[a, b, c]} scale={[d * 1.3, d * 0.8, d]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={cor} roughness={1} flatShading /></mesh>
        ))}
      </group>
    ))}
  </group>
);

export const Arvore: React.FC<{ x: number; y?: number; z: number; s: number; cor?: string }> = ({ x, y = 0, z, s, cor = "#3f7a3c" }) => (
  <group position={[x, y, z]} scale={s}>
    <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.1, 0.14, 0.9, 7]} /><meshStandardMaterial color="#6b4a2c" roughness={0.9} /></mesh>
    <mesh position={[0, 1.25, 0]}><coneGeometry args={[0.75, 1.3, 8]} /><meshStandardMaterial color={cor} roughness={0.9} flatShading /></mesh>
    <mesh position={[0, 1.85, 0]}><coneGeometry args={[0.55, 1.0, 8]} /><meshStandardMaterial color={cor} roughness={0.9} flatShading /></mesh>
  </group>
);

/** Bolhas que sobem de um ponto (fase pelo tempo). */
export const Bolhas: React.FC<{ p: V; t: number; k: number; alt?: number; n?: number; larg?: number; cor?: string }> = ({ p, t, k, alt = 1.5, n = 10, larg = 0.2, cor = "#e8f6ff" }) => {
  if (k <= 0.02) return null;
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const u = (t * 0.6 + i / n) % 1;
        const r = 0.03 + 0.04 * ((i * 7) % 5) / 5;
        return <mesh key={i} position={[p[0] + Math.sin(i * 4.1 + t * 2) * larg, p[1] + u * alt, p[2] + Math.cos(i * 2.3) * larg * 0.5]} scale={r * k}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={cor} transparent opacity={0.8 * (1 - u * 0.6)} /></mesh>;
      })}
    </group>
  );
};

export type EtiqDef = { texto: string; para: V; off: [number, number]; cor: string };

/** Oficina: parede de painel com ferramentas, chão e bancada (topo em y = 0,9, de x = -3,6 a 3,6, z de -1 a 1). Fundo não vazio para as maquetes de bancada. */
export const Oficina: React.FC<{ bancada?: boolean; escuro?: number }> = ({ bancada = true, escuro = 0 }) => {
  const parede = mistura("#d9c7a4", "#6b6254", escuro);
  return (
    <group>
      <mesh position={[0, 3.5, -2.6]}><planeGeometry args={[40, 12]} /><meshStandardMaterial color={parede} roughness={1} /></mesh>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[40, 20]} /><meshStandardMaterial color={mistura("#9a7048", "#3f3020", escuro)} roughness={1} /></mesh>
      <mesh position={[0, 0.01, 2.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[6, 3]} /><meshStandardMaterial color={mistura("#a8454a", "#4a2022", escuro)} roughness={1} /></mesh>
      {/* painel de ferramentas */}
      <mesh position={[0, 3.2, -2.55]}><planeGeometry args={[9, 3.4]} /><meshStandardMaterial color={mistura("#b98a4e", "#5c4727", escuro)} roughness={1} /></mesh>
      {[[-3.4, 3.7, "#e5473a"], [-2.4, 3.4, "#3b82c4"], [-1.3, 3.8, "#ffd23f"], [1.2, 3.5, "#37c26a"], [2.4, 3.8, "#e5473a"], [3.4, 3.3, "#3b82c4"]].map(([x, y, c], i) => (
        <group key={i} position={[x as number, y as number, -2.45]}>
          <mesh><boxGeometry args={[0.18, 1.1, 0.06]} /><meshStandardMaterial color={c as string} roughness={0.6} /></mesh>
          <mesh position={[0, 0.7, 0]}><boxGeometry args={[0.55, 0.22, 0.06]} /><meshStandardMaterial color="#9aa5ad" metalness={0.6} roughness={0.4} /></mesh>
        </group>
      ))}
      <mesh position={[-6.2, 2.3, -2.4]}><boxGeometry args={[2.6, 0.12, 0.7]} /><meshStandardMaterial color="#7a5230" /></mesh>
      {[[-6.9, "#e5473a"], [-6.2, "#ffd23f"], [-5.5, "#3b82c4"]].map(([x, c], i) => <mesh key={i} position={[x as number, 2.8, -2.35]}><boxGeometry args={[0.5, 0.9, 0.5]} /><meshStandardMaterial color={c as string} roughness={0.7} /></mesh>)}
      {bancada && (
        <group>
          <mesh position={[0, 0.84, 0]}><boxGeometry args={[7.4, 0.12, 2.2]} /><meshStandardMaterial color="#a9825a" roughness={0.8} /></mesh>
          {[-3.4, 3.4].map((x) => <mesh key={x} position={[x, 0.4, 0]}><boxGeometry args={[0.2, 0.8, 2.0]} /><meshStandardMaterial color="#7a5230" /></mesh>)}
        </group>
      )}
    </group>
  );
};
