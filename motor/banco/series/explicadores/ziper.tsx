import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { clamp01, lerp } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Pose3D } from "../../../src/v3d/tipos";
import { Etiqueta, Fumaca, Liga, Seta } from "./cozinha-base";
import { Ctx, EtiqDef, GenteE, V, mistura, mkCtx, nv } from "./rasc";
import { zeca } from "./zeca";
import { Chefe, Figurante, PASSANTES, POVO, andaPose, chefe } from "./ziper-gente";
import {
  AZUL, CREME, Carrinho, Dente, Faixa, HS, LARANJA, Laco, NP, P, Par, ob, zs, YB, YS0, YS1, YT, Y0, ZS, abertura, dAbertura, hash, ondaZ, poseDente, sm, yDente,
} from "./ziper-mec";

// Zíper (episódio 21, "como dois pedaços de pano se prendem num puxão?"). O encaixe dos dentes é calculado em ziper-mec.tsx (função da posição do carrinho).
// Maquete gigante de ateliê: dois painéis (azul à esquerda, laranja à direita), de 3,55 m, pendurados numa barra; linha do fecho em x = 0.
// Campos (números, { de, para, ini, fim } ou chaves [[progresso, valor], ...]):
//   fecha 0..1 (altura do fecho/carrinho) · alinha 0..1 (acerta o pino da trava entre dois dentes) · g0 (meia fresta do fecho; 0,15 com dentes)
//   botoes 0..1 · frestas 0..1 · ganchos 0..1 · dentes 0..1 · solto 0..1 (fileiras sem se achar) · carrinho 0..1 · raioxC 0..1 · setaY 0..1 · tab (ângulo do puxador)
//   dsolta 0..1 (dentes caem) · fita 0..1 (fita sobe, os dentes voltam) · costura 0..1 · forca 0..1 (puxam os lados) · corte 0..1 (lupa do grampo)
//   batentes 0..1 · voa 0..1 (carrinho sai pelo topo) · trava 0..1 · jaqueta 0..1 · sep 0..1 (lado direito solto) · sepY · caixa 0..1 · espiral 0..1 · dobra 0..1
//   maos 0..1 (desenho das mãos entrelaçadas; maosV = visível) · camisa 0..1 · pulinho · estrelas 0..1 · janela 0..1 (rua) · pano 0..1 · sopa 0..1 · luz
//   patente (1851|1893|1913) com patK 0..1 · galocha 0..1 · palco "corredor" (botaoV 0..1: o botão voa)
//   camK: [[p, az°, el°, D, tx, ty, tz, fov], ...] (câmera em órbita; camRel 1 = ty relativo ao carrinho) · gente: { x, y, z, rot, olha, rotOff, acao, exp, pose, corre, verm, sq }
//   etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax · chaves: botoes, ganchos, dentes, carrinho, y, zig, fita, grampo, batente, trava, pino, caixa, espiral, ziper

const CX = 60; // palco do corredor
const NB = 7; // botões
const NG = 15; // ganchos

/* ---------------- câmera por chaves (órbita suave) ---------------- */

const camK = (keys: number[][], p: number) => {
  if (p <= keys[0][0]) return keys[0].slice(1);
  const L = keys.length;
  if (p >= keys[L - 1][0]) return keys[L - 1].slice(1);
  let i = 0;
  while (i < L - 2 && p > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1];
  const h = b[0] - a[0];
  const u = (p - a[0]) / h;
  const tan = (j: number, c: number) => {
    if (j <= 0 || j >= L - 1) return 0;
    return (keys[j + 1][c] - keys[j - 1][c]) / (keys[j + 1][0] - keys[j - 1][0]);
  };
  const out: number[] = [];
  for (let c = 1; c < a.length; c++) {
    const m0 = tan(i, c) * h, m1 = tan(i + 1, c) * h;
    const u2 = u * u, u3 = u2 * u;
    out.push((2 * u3 - 3 * u2 + 1) * a[c] + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * b[c] + (u3 - u2) * m1);
  }
  return out;
};

const CamPropria: React.FC<{ keys: number[][]; p: number; yRel: number }> = ({ keys, p, yRel }) => {
  const { camera } = useThree();
  const [az, el, D, tx, ty, tz, fov] = camK(keys, p);
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  const T = new THREE.Vector3(tx, ty + yRel, tz);
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(T.x + D * Math.sin(a) * Math.cos(e), T.y + D * Math.sin(e), T.z + D * Math.cos(a) * Math.cos(e));
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(T);
  cam.updateMatrixWorld();
  return null;
};

/* ---------------- Zeca (cópia da Pessoa com corrida, rosto vermelho, pulo e olhar para a câmera) ---------------- */

type GenteZ = GenteE & { olha?: boolean; rotOff?: number; corre?: unknown; verm?: unknown; sq?: unknown; seg?: unknown };

const PessoaZ: React.FC<{ g: GenteZ; p: number; t: number; tAbs: number }> = ({ g, p, t, tAbs }) => {
  const { camera } = useThree();
  const { exp, pose } = poseGente(g, { p, t, tAbs, abs: true });
  const { x, y, z, rot: rot0 } = posicaoGente(g, t, { x: nv(g.x, p, 0), y: nv(g.y, p, 0), z: nv(g.z, p, 0), rot: nv(g.rot, p, 0) });
  const corre = nv(g.corre, p, 0);
  if (corre > 0.01) {
    const ph = (x * 2 * Math.PI) / 1.5;
    const s = Math.sin(ph);
    Object.assign(pose, {
      "pernaE.x": -0.95 * s * corre, "pernaD.x": 0.95 * s * corre,
      "joelhoE.x": corre * (0.25 + 1.3 * Math.max(0, Math.sin(ph + 1.3))), "joelhoD.x": corre * (0.25 + 1.3 * Math.max(0, Math.sin(ph + 1.3 + Math.PI))),
      "ombroE.x": 0.9 * s * corre, "ombroD.x": -0.9 * s * corre - 0.2 * nv(g.seg, p, 0), "cotoveloE.x": -1.3 * corre, "cotoveloD.x": -1.3 * corre - 0.5 * nv(g.seg, p, 0),
      "tronco.x": 0.22 * corre, "quadril.y": 0.05 * Math.abs(s) * corre, maos: 0.5,
    });
  }
  let rot = rot0;
  if (g.olha) rot = Math.atan2(camera.position.x - x, camera.position.z - z) + (g.rotOff ?? 0);
  const esc = g.esc ?? 1.06;
  const sq = nv(g.sq, p, 0);
  const verm = nv(g.verm, p, 0);
  const pers = verm > 0.01 ? { ...zeca, pele: mistura(zeca.pele, "#e8392f", verm) } : zeca;
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={[esc * (1 + sq * 0.12), esc * (1 - sq * 0.18), esc * (1 + sq * 0.12)]}>
      <Boneco3D p={pers} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} suor={g.suor} t={tAbs} />
    </group>
  );
};

/* ---------------- estrelinhas e linhas de choque (estilo desenho animado) ---------------- */

const Choque: React.FC<{ p: V; k: number; t: number; r?: number }> = ({ p, k, t, r = 0.5 }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p}>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const rr = r * (0.6 + 0.9 * (1 - k));
        return <Liga key={i} a={[Math.cos(a) * rr * 0.7, Math.sin(a) * rr * 0.7, 0]} b={[Math.cos(a) * rr * 1.25, Math.sin(a) * rr * 1.25, 0]} w={0.035} cil cor="#ffe14a" basico op={Math.min(1, k * 2)} />;
      })}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = t * 3 + (i / 5) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * r * 1.5, 0.35 + 0.15 * Math.sin(a * 2), Math.sin(a) * r * 0.6]} rotation={[t * 2, t * 3 + i, 0]} scale={0.09 * Math.min(1, k * 3)}>
            <mesh><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color={i % 2 ? "#fff176" : "#ffd23f"} /></mesh>
            <mesh rotation={[0, 0, Math.PI / 4]} scale={[0.5, 1.9, 0.5]}><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color="#fff176" /></mesh>
          </group>
        );
      })}
    </group>
  );
};

/* ---------------- cenário de fundo ---------------- */

const Janela: React.FC<{ rua: number; pano: number; t: number; pedes: boolean }> = ({ rua, pano, t, pedes }) => {
  const W = 3.4, H = 2.7;
  const gente = [["#e5473a", 0.0, 0.12], ["#3b82c4", 0.3, 0.09], ["#37c26a", 0.6, 0.15], ["#8a5ac4", 0.85, 0.1], ["#ffd23f", 0.15, 0.13]] as [string, number, number][];
  return (
    <group position={[3.55, 2.35, -2.5]}>
      <mesh position={[0, 0, -0.02]}><planeGeometry args={[W, H]} /><meshBasicMaterial color={rua > 0.5 ? "#9fd3f2" : "#7ec0f5"} /></mesh>
      {/* céu: faixa mais clara perto do horizonte */}
      <mesh position={[0, -H * 0.25, -0.015]}><planeGeometry args={[W, H * 0.5]} /><meshBasicMaterial color={rua > 0.5 ? "#c8e8fa" : "#b5dcff"} /></mesh>
      {rua > 0.5 && <group>
        <mesh position={[0, -H / 2 + 0.28, -0.005]}><planeGeometry args={[W, 0.56]} /><meshBasicMaterial color="#6e7480" /></mesh>
        {[[-1.2, 0.9, "#c9704e"], [-0.55, 1.25, "#d6b25a"], [0.2, 0.8, "#7aa6b8"], [0.95, 1.1, "#c9704e"], [1.45, 0.7, "#a9b86a"]].map(([x, h, c], i) => (
          <mesh key={i} position={[x as number, -H / 2 + 0.56 + (h as number) / 2, -0.01]}><planeGeometry args={[0.55, h as number]} /><meshBasicMaterial color={c as string} /></mesh>
        ))}
        {/* gente da rua: Boneco3D pequenos (escala 0,13), andando com ciclo de passos */}
        <group position={[0.35, -H / 2 + 0.36, 0.03]}><Figurante f={{ quem: chefe, x0: 0, z: 0, acao: "em-pe", exp: "sorriso", rotOff: -0.25, esc: 1 }} t={t} escCena={0.3} /></group>
        {pedes && gente.map(([, off, v], i) => {
          const dir = i % 2 ? -1 : 1;
          const x = ((t * v * 0.5 + off) % 1) * (W - 0.4) - (W - 0.4) / 2;
          const vv = dir * v * 0.5 * (W - 0.4);
          return <group key={i} position={[0, -H / 2 + 0.36, 0.01 + i * 0.012]}>
            <Figurante f={{ quem: POVO[(i * 3 + 1) % POVO.length], x0: dir > 0 ? x : -x, z: 0, v: vv, ph: (2 * Math.PI * Math.abs(vv) * t) / (1.45 * 0.3) + i * 1.7, esc: 1 }} t={0} escCena={0.3} />
          </group>;
        })}
      </group>}
      {/* moldura */}
      <Caixa p={[0, H / 2 + 0.05, 0.05]} t={[W + 0.2, 0.1, 0.12]} cor="#7a5230" raio={0.02} />
      <Caixa p={[0, -H / 2 - 0.05, 0.05]} t={[W + 0.2, 0.1, 0.12]} cor="#7a5230" raio={0.02} />
      <Caixa p={[-W / 2 - 0.05, 0, 0.05]} t={[0.1, H, 0.12]} cor="#7a5230" raio={0.02} />
      <Caixa p={[W / 2 + 0.05, 0, 0.05]} t={[0.1, H, 0.12]} cor="#7a5230" raio={0.02} />
      <Caixa p={[0, 0, 0.05]} t={[0.06, H, 0.08]} cor="#7a5230" raio={0.015} />
      {pano > 0.02 && <PanoBranco t={t} k={pano} />}
    </group>
  );
};

/** pano branco passando pelo céu (gancho para o próximo episódio) */
const PanoBranco: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.5, 1.0, 14, 8);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, 0.14 * Math.sin(x * 4.2 - t * 5) * (0.5 + 0.5 * (x / 0.75 + 1) / 2) + 0.06 * Math.sin(y * 5 + t * 3));
    }
    g.computeVertexNormals();
    return g;
  }, [t]);
  const x = lerp(-1.9, 1.9, clamp01(k));
  return <mesh geometry={geo} position={[k === 0.5 ? 0 : x, 0.35 + 0.15 * Math.sin(t * 1.6), 0.02]} rotation={[0.1, 0, -0.18 + 0.1 * Math.sin(t * 2)]}><meshStandardMaterial color="#ffffff" roughness={0.9} side={THREE.DoubleSide} /></mesh>;
};

const Atelie: React.FC<{ t: number; luz: number; janela: number; pano: number }> = ({ t, luz, janela, pano }) => (
  <group>
    <mesh position={[0, 3.5, -2.6]}><planeGeometry args={[40, 12]} /><meshStandardMaterial color={mistura("#f0d9d2", "#b08c86", luz)} roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 30]} /><meshStandardMaterial color="#a9825a" roughness={1} /></mesh>
    <mesh position={[0, 0.011, 1.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 4.4]} /><meshStandardMaterial color="#8a3b4a" roughness={1} /></mesh>
    <mesh position={[0, 0.013, 1.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[8.2, 3.6]} /><meshStandardMaterial color="#c9a24a" roughness={1} /></mesh>
    {/* rolos de tecido nas prateleiras (balançam de leve) */}
    {[[-5.2, "#3b82c4"], [-4.5, "#f08a3c"], [-3.8, "#37c26a"], [-3.1, "#e5473a"], [-2.7, "#ffd23f"], [6.4, "#8a5ac4"], [7.1, "#3b82c4"], [7.8, "#e5473a"]].map(([x, c], i) => (
      <mesh key={i} position={[x as number, 1.25, -2.3]} rotation={[0, 0, 0.02 * Math.sin(t * 0.9 + i)]}><cylinderGeometry args={[0.3, 0.3, 2.3, 16]} /><meshStandardMaterial color={c as string} roughness={0.9} /></mesh>
    ))}
    <Caixa p={[-4.0, 2.6, -2.4]} t={[3.4, 0.1, 0.5]} cor="#7a5230" raio={0.02} />
    {[[-4.7, "#e5473a"], [-4.1, "#ffd23f"], [-3.5, "#3b82c4"], [-3.0, "#37c26a"]].map(([x, c], i) => (
      <Caixa key={i} p={[x as number, 2.95, -2.35]} t={[0.5, 0.6, 0.4]} cor={c as string} raio={0.04} />
    ))}
    {/* rolos no chão */}
    {[[-3.6, 0.3, "#3b82c4"], [-3.1, 0.3, "#f08a3c"], [-3.35, 0.8, "#37c26a"], [3.9, 0.3, "#e5473a"], [4.4, 0.3, "#ffd23f"]].map(([x, y, c], i) => (
      <mesh key={i} position={[x as number, y as number, -1.4]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.28, 0.28, 1.1, 16]} /><meshStandardMaterial color={c as string} roughness={0.9} /></mesh>
    ))}
    {/* lâmpada pendurada com poeira na luz */}
    <Liga a={[-2.4, 6.4, -0.6]} b={[-2.4, 5.3, -0.6]} w={0.025} cil cor="#444444" />
    <mesh position={[-2.4, 5.15, -0.6]}><sphereGeometry args={[0.2, 14, 10]} /><meshBasicMaterial color="#fff6c8" /></mesh>
    {Array.from({ length: 14 }).map((_, i) => {
      const u = (t * 0.05 + hash(i)) % 1;
      return <mesh key={i} position={[-2.4 + (hash(i + 3) - 0.5) * 2.2 + 0.2 * Math.sin(t + i), 5.1 - u * 3.8, -0.6 + (hash(i + 9) - 0.5) * 1.2]}><sphereGeometry args={[0.018, 6, 5]} /><meshBasicMaterial color="#fff2c0" transparent opacity={0.6 * Math.sin(Math.PI * u)} /></mesh>;
    })}
    {/* agulha de costura em pêndulo */}
    <group position={[-2.0, 4.9, -1.0]} rotation={[0, 0, 0.5 * Math.sin(t * 1.7)]}>
      <Liga a={[0, 0, 0]} b={[0, -1.1, 0]} w={0.012} cil cor="#e8ecef" />
      <mesh position={[0, -1.18, 0]}><torusGeometry args={[0.03, 0.008, 6, 12]} /><meshStandardMaterial color="#e8ecef" metalness={0.8} roughness={0.3} /></mesh>
    </group>
    {/* cachorro dormindo */}
    <group position={[-3.6, 0.0, 1.3]} rotation={[0, 0.6, 0]}>
      <mesh position={[0, 0.2, 0]} scale={[1.3, 0.8, 0.9]}><sphereGeometry args={[0.25, 14, 10]} /><meshStandardMaterial color="#b9855a" roughness={0.9} /></mesh>
      <mesh position={[0.36, 0.15, 0.04]}><sphereGeometry args={[0.15, 12, 10]} /><meshStandardMaterial color="#b9855a" roughness={0.9} /></mesh>
      <mesh position={[0.44, 0.1, 0.04]} scale={[1.2, 0.7, 0.9]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color="#2b1d14" roughness={0.9} /></mesh>
      <mesh position={[0.33, 0.28, 0.14]} rotation={[0, 0, 0.5]} scale={[0.4, 1, 0.5]}><sphereGeometry args={[0.1, 8, 6]} /><meshStandardMaterial color="#8c5f3b" roughness={0.9} /></mesh>
      <mesh position={[-0.34, 0.12, 0]} rotation={[0, 0, 0.6 + 0.1 * Math.sin(t * 1.3)]} scale={[1, 0.3, 0.3]}><sphereGeometry args={[0.17, 8, 6]} /><meshStandardMaterial color="#b9855a" roughness={0.9} /></mesh>
      {[0, 1, 2].map((i) => <mesh key={i} position={[0.42 + i * 0.12, 0.5 + ((t * 0.35 + i * 0.33) % 1) * 0.5, 0.05]} scale={0.05 + i * 0.02}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#e8f6ff" transparent opacity={0.8 * (1 - ((t * 0.35 + i * 0.33) % 1))} /></mesh>)}
    </group>
    <Janela rua={janela} pano={pano} t={t} pedes />
  </group>
);

/** céu aberto atrás da maquete (batida final): faixas de azul, nuvens e o pano branco grande passando */
const AtelieCeu: React.FC<{ t: number; k: number }> = ({ t, k }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 30]} /><meshStandardMaterial color="#a9825a" roughness={1} /></mesh>
    <mesh position={[0, 0.011, 1.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 4.4]} /><meshStandardMaterial color="#8a3b4a" roughness={1} /></mesh>
    <mesh position={[0, 0.013, 1.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[8.2, 3.6]} /><meshStandardMaterial color="#c9a24a" roughness={1} /></mesh>
    {[[0, 1.6, 3.4, "#d4ecff"], [0, 3.8, 3.2, "#a9d8fb"], [0, 6.4, 3.4, "#7ec0f5"], [0, 9.2, 3.0, "#5aa9ee"]].map(([x, y, h, c], i) => (
      <mesh key={i} position={[x as number, y as number, -2.5]}><planeGeometry args={[50, h as number]} /><meshBasicMaterial color={c as string} /></mesh>
    ))}
    {[[-6, 5.2, 1.0], [-1.5, 6.4, 1.3], [3.5, 5.6, 1.1], [7.5, 6.6, 0.9]].map(([x, y, s], i) => (
      <group key={i} position={[((x as number) + t * 0.25 * (1 + 0.2 * i) + 12) % 24 - 12, y as number, -2.4]} scale={s as number}>
        {[[0, 0, 1], [0.9, -0.1, 0.75], [-0.9, -0.15, 0.7], [0.4, 0.35, 0.65]].map(([a, b, d], j) => <mesh key={j} position={[a, b, 0]} scale={[(d as number) * 1.3, (d as number) * 0.8, 0.3]}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
      </group>
    ))}
    {k > 0.01 && (
      <group position={[lerp(3.6, -2.2, clamp01(k)), 3.9 + 0.2 * Math.sin(t * 1.5), 0.9]} scale={1.9}><PanoBranco t={t} k={0.5} /></group>
    )}
  </group>
);

/* ---------------- corredor, chefe e sopa (abertura) ---------------- */

const Corredor: React.FC<{ k: number; t: number; botao: number; zx: number; dtPouso: number }> = ({ k, t, botao, zx, dtPouso }) => {
  const tb = botao; // 0..1: voo do botão
  const S: V = [zx + 0.3, 1.05, 0.35], E: V = [CX + 10.2, 0.88, -0.25];
  const bp: V = [lerp(S[0], E[0], tb), lerp(S[1], E[1], tb) + 2.4 * 4 * tb * (1 - tb) * 0.6 + 0.0, lerp(S[2], E[2], tb)];
  const pousou = tb >= 0.999 ? 1 : 0;
  const sp = clamp01((k - 0) );
  void sp;
  return (
    <group>
      <mesh position={[CX + 4, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[40, 12]} /><meshStandardMaterial color="#d8cdb8" roughness={0.8} /></mesh>
      {Array.from({ length: 20 }).map((_, i) => <mesh key={i} position={[CX - 8 + i * 2, 0.005, 0.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1, 0.8]} /><meshStandardMaterial color="#b5a98f" roughness={0.9} /></mesh>)}
      <mesh position={[CX + 4, 1.9, -2.2]}><planeGeometry args={[40, 4.0]} /><meshStandardMaterial color="#f1e2c4" roughness={1} /></mesh>
      <mesh position={[CX + 4, 3.2, -0.5]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[40, 5]} /><meshBasicMaterial color="#f4f1ea" /></mesh>
      <mesh position={[CX + 4, 2.45, -2.18]}><planeGeometry args={[40, 0.1]} /><meshBasicMaterial color="#c9704e" /></mesh>
      {Array.from({ length: 8 }).map((_, i) => <Caixa key={i} p={[CX - 5 + i * 3.4 + 1.6, 2.0, -2.14]} t={[0.7, 0.5, 0.04]} cor={["#3b82c4", "#e5473a", "#37c26a", "#f2c230"][i % 4]} raio={0.01} />)}
      <mesh position={[CX + 4, 0.35, -2.19]}><planeGeometry args={[40, 0.7]} /><meshStandardMaterial color="#8a6a4a" roughness={1} /></mesh>
      {Array.from({ length: 9 }).map((_, i) => {
        const x = CX - 6 + i * 3.2;
        return <group key={i} position={[x, 0, -2.15]}>
          {i % 3 === 1 ? <Caixa p={[0, 1.2, 0]} t={[0.9, 1.1, 0.06]} cor={["#7ec0f5", "#f2c230", "#e5473a"][i % 3]} raio={0.02} /> : <Caixa p={[0, 1.0, 0]} t={[1.0, 2.0, 0.08]} cor={["#7a5230", "#5b7a4a"][i % 2]} raio={0.03} />}
          <mesh position={[0.3, 1.0, 0.06]}><sphereGeometry args={[0.04, 8, 6]} /><meshStandardMaterial color="#d6b25a" metalness={0.8} roughness={0.3} /></mesh>
        </group>;
      })}
      {Array.from({ length: 7 }).map((_, i) => <mesh key={i} position={[CX - 6 + i * 3.4, 3.15, -0.4]}><boxGeometry args={[1.2, 0.05, 0.5]} /><meshBasicMaterial color="#fffbe6" /></mesh>)}
      {/* plantas */}
      {[CX - 2, CX + 3.3, CX + 7.4].map((x, i) => <group key={i} position={[x, 0, -1.8]}>
        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.22, 0.17, 0.5, 12]} /><meshStandardMaterial color="#b4583a" roughness={0.9} /></mesh>
        <mesh position={[0, 0.75, 0]} scale={[1, 1.2, 1]}><icosahedronGeometry args={[0.36, 1]} /><meshStandardMaterial color="#3f8a46" roughness={0.9} flatShading /></mesh>
      </group>)}
      {/* passantes: grupos de gente de verdade (Boneco3D), uns andando, uns conversando */}
      <group position={[CX, 0, 0]}>{PASSANTES.map((f, i) => <Figurante key={i} f={f} t={t} />)}</group>
      {/* mesa do chefe, sopa e chefe (silhueta sem rosto) */}
      <group position={[CX + 10.2, 0, -0.25]}>
        <Caixa p={[0, 0.7, 0]} t={[1.7, 0.08, 1.0]} cor="#8a5a34" raio={0.03} />
        {[[-0.75, -0.4], [0.75, -0.4], [-0.75, 0.4], [0.75, 0.4]].map(([a, b], i) => <Caixa key={i} p={[a, 0.34, b]} t={[0.08, 0.68, 0.08]} cor="#6b4426" raio={0.02} />)}
        <mesh position={[0, 0.74, 0.0]}><cylinderGeometry args={[0.7, 0.7, 0.01, 30]} /><meshStandardMaterial color="#fffaf0" roughness={1} /></mesh>
        <mesh position={[0, 0.82, 0]}><cylinderGeometry args={[0.2, 0.14, 0.14, 20]} /><meshStandardMaterial color="#f5f5f0" roughness={0.3} /></mesh>
        <mesh position={[0, 0.885, 0]}><cylinderGeometry args={[0.185, 0.185, 0.01, 20]} /><meshStandardMaterial color="#e8892b" roughness={0.6} /></mesh>
        {pousou > 0 && Array.from({ length: 9 }).map((_, i) => {
          const a = hash(i) * Math.PI * 2;
          const tt = clamp01((k - 0.86) * 8);
          return <mesh key={i} position={[Math.cos(a) * 0.3 * tt, 0.9 + 0.55 * 4 * tt * (1 - tt) * (0.5 + hash(i + 2)), Math.sin(a) * 0.2 * tt]} scale={0.035}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#e8892b" /></mesh>;
        })}
        <Fumaca p={[0, 0.92, 0]} t={t} k={0.8} cor="#ffffff" n={5} alt={0.5} larg={0.1} op={0.35} />
        {/* chefe sentado atrás da mesa (Boneco3D com gravata), olhando para o Zeca */}
        <group position={[0.1, 0, -0.78]} rotation={[0, -0.45 + 0.05 * Math.sin(t * 0.8), 0]}>
          <Caixa p={[0, 0.22, -0.08]} t={[0.5, 0.05, 0.5]} cor="#4a3a2a" raio={0.02} />
          <Caixa p={[0, 0.2, 0.0]} t={[0.07, 0.4, 0.07]} cor="#3a2c20" raio={0.01} />
          <Caixa p={[0, 0.7, -0.33]} t={[0.5, 0.55, 0.06]} cor="#4a3a2a" raio={0.03} />
          <group position={[0, 0.0, -0.08]}><Chefe t={t} dt={dtPouso} tb={tb} /></group>
        </group>
      </group>
      {tb > 0.001 && tb < 0.999 && [0, 1, 2, 3].map((j) => {
        const u = Math.max(0, tb - j * 0.03);
        const q: V = [lerp(S[0], E[0], u), lerp(S[1], E[1], u) + 2.4 * 4 * u * (1 - u) * 0.6, lerp(S[2], E[2], u)];
        return <group key={j} position={q} rotation={[t * 12, 0, t * 9]} scale={1 - j * 0.2}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.13, 0.13, 0.04, 18]} /><meshStandardMaterial color="#37c26a" roughness={0.4} transparent opacity={1 - j * 0.28} /></mesh>
        </group>;
      })}
      <Fumaca p={[CX - 1, 0.1, -1]} t={t} k={0} />
      <mesh position={[CX + zx, 0, 0]} />
    </group>
  );
};

/* ---------------- peças do pano (botões, ganchos, dentes, fita...) ---------------- */

const Maos: React.FC<{ m: number; t: number }> = ({ m, t }) => {
  // desenho das mãos entrelaçadas: dedos de uma e da outra em meio passo
  const dedos = 5;
  const pele = "#d9a066";
  const sh = (m * m * (3 - 2 * m));
  return (
    <group>
      <mesh position={[0, 0, -0.05]}><circleGeometry args={[0.95, 40]} /><meshBasicMaterial color="#fffdf5" /></mesh>
      <mesh position={[0, 0, -0.06]}><circleGeometry args={[1.02, 40]} /><meshBasicMaterial color="#2a1a00" /></mesh>
      {[-1, 1].map((l) => (
        <group key={l} position={[l * lerp(0.95, 0.22, sh), 0, 0]} scale={[l, 1, 1]}>
          <Caixa p={[-0.5, 0, 0]} t={[0.4, 0.55, 0.16]} cor={l < 0 ? AZUL : LARANJA} raio={0.05} />
          <Caixa p={[-0.16, 0, 0]} t={[0.3, 0.5, 0.16]} cor={pele} raio={0.06} />
          {Array.from({ length: dedos }).map((_, i) => {
            const y = (i - (dedos - 1) / 2) * 0.1 + (l > 0 ? 0.05 : 0) - 0.02;
            return <Caixa key={i} p={[0.2 + 0.0, y, 0]} t={[0.4, 0.075, 0.12]} cor={pele} raio={0.035} />;
          })}
        </group>
      ))}
      <group position={[0, 1.05, 0]} scale={0.6 + 0.04 * Math.sin(t * 3)}>
        {[0, 1, 2].map((i) => <mesh key={i} position={[0.1 * (i - 1), 0, 0]}><sphereGeometry args={[0.05, 8, 6]} /><meshBasicMaterial color="#ffd23f" /></mesh>)}
      </group>
    </group>
  );
};

/** lupa do "grampo": três dentes de verdade ampliados no mesmo plano; o calombo do esquerdo dentro da cavidade do direito (e o do direito na do próximo esquerdo) */
const Lupa: React.FC<{ k: number; forca: number; t: number }> = ({ k, forca, t }) => {
  const S = 3.6;
  const tr = forca * 0.004 * Math.sin(t * 45);
  const pulso = 0.5 + 0.5 * Math.sin(t * 6);
  return (
    <group scale={k}>
      <mesh position={[0, 0, -0.1]}><circleGeometry args={[1.18, 48]} /><meshBasicMaterial color="#fffdf5" /></mesh>
      <mesh position={[0, 0, -0.11]}><circleGeometry args={[1.26, 48]} /><meshBasicMaterial color="#2a1a00" /></mesh>
      <group scale={S} position={[0, -0.02, 0]}>
        <group position={[-tr, -P / 2, 0]}><Dente lado={-1} garra={1} /></group>
        <group position={[tr, 0, 0]}><Dente lado={1} garra={1} /></group>
        <group position={[-tr, P / 2, 0]}><Dente lado={-1} garra={1} /></group>
        {[-P / 2 + 0.048, 0.048].map((y, i) => <mesh key={i} position={[0, y, 0.04]}><ringGeometry args={[0.016, 0.019, 24]} /><meshBasicMaterial color="#ff4d3a" transparent opacity={0.45 + 0.4 * pulso} /></mesh>)}
      </group>
      {forca > 0.05 && <group position={[0, 0, 0.12]}>
        <Seta a={[-0.7, -0.7, 0]} b={[-1.1, -0.7, 0]} cor="#ff6a5a" w={0.05} op={forca} />
        <Seta a={[0.7, 0.7, 0]} b={[1.1, 0.7, 0]} cor="#ff6a5a" w={0.05} op={forca} />
      </group>}
    </group>
  );
};

const Patente: React.FC<{ tipo: string; k: number; stamp: number; t: number }> = ({ tipo, k, stamp, t }) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 704;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f3ead2"; g.fillRect(0, 0, 512, 704);
    g.strokeStyle = "#5a4a30"; g.lineWidth = 4; g.strokeRect(14, 14, 484, 676);
    g.fillStyle = "#3b2f1d"; g.font = "bold 44px sans-serif"; g.textAlign = "center";
    g.fillText("PATENTE", 256, 74);
    g.font = "bold 70px sans-serif"; g.fillText(tipo, 256, 150);
    g.lineWidth = 5; g.strokeStyle = "#3b2f1d";
    if (tipo === "1851") {
      // cordão passando por furos
      for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(150, 250 + i * 55, 11, 0, 7); g.stroke(); g.beginPath(); g.arc(362, 250 + i * 55, 11, 0, 7); g.stroke(); }
      g.beginPath(); g.moveTo(150, 250);
      for (let i = 0; i < 7; i++) { g.lineTo(362, 250 + (i + 0.5) * 55); g.lineTo(150, 250 + (i + 1) * 55); }
      g.stroke();
    } else if (tipo === "1893") {
      // fileira de ganchos
      for (let i = 0; i < 8; i++) {
        g.beginPath(); g.moveTo(130, 250 + i * 55); g.lineTo(230, 250 + i * 55); g.arc(230, 250 + i * 55 + 12, 12, -Math.PI / 2, Math.PI, false); g.stroke();
        g.beginPath(); g.arc(382, 250 + i * 55, 14, 0, 7); g.stroke();
      }
    } else {
      // dentes alternados e carrinho em Y
      for (let i = 0; i < 9; i++) {
        g.fillStyle = "#3b2f1d";
        g.fillRect(196 - 60, 380 + i * 32, 60, 14); g.beginPath(); g.arc(200, 387 + i * 32, 13, 0, 7); g.fill();
        g.fillRect(316, 396 + i * 32, 60, 14); g.beginPath(); g.arc(312, 403 + i * 32, 13, 0, 7); g.fill();
      }
      g.strokeStyle = "#3b2f1d"; g.beginPath(); g.moveTo(256, 380); g.lineTo(256, 330); g.moveTo(256, 330); g.lineTo(200, 250); g.moveTo(256, 330); g.lineTo(312, 250); g.stroke();
    }
    const t2 = new THREE.CanvasTexture(c);
    t2.colorSpace = THREE.SRGBColorSpace;
    return t2;
  }, [tipo]);
  const sw = tipo === "1893" && k > 0.5 ? 0.02 * Math.sin(t * 40) : 0;
  const carimbo = tipo === "1851" ? "NUNCA VENDIDA" : tipo === "1893" ? "EMPERRAVA" : "1913";
  const st = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 160;
    const g = c.getContext("2d")!;
    g.strokeStyle = "#d6322a"; g.fillStyle = "#d6322a"; g.lineWidth = 12;
    g.strokeRect(10, 10, 492, 140);
    g.font = "bold 78px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(carimbo, 256, 84, 460);
    const t2 = new THREE.CanvasTexture(c);
    t2.colorSpace = THREE.SRGBColorSpace;
    return t2;
  }, [carimbo]);
  const sp = stamp <= 0 ? 0 : clamp01(stamp * 4);
  return (
    <group scale={k} position={[sw, 0, 0]}>
      <mesh><planeGeometry args={[1.4, 1.93]} /><meshBasicMaterial map={tex} /></mesh>
      <mesh position={[0, 0, -0.01]} scale={[1.04, 1.03, 1]}><planeGeometry args={[1.4, 1.93]} /><meshBasicMaterial color="#2a1a00" /></mesh>
      {stamp > 0 && <mesh position={[0.05, -0.45, 0.01]} rotation={[0, 0, -0.25]} scale={(2.4 - 1.4 * sp) * 0.9}><planeGeometry args={[1.1, 0.34]} /><meshBasicMaterial map={st} transparent opacity={sp} /></mesh>}
    </group>
  );
};

const Galocha: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  const mat = <meshPhysicalMaterial color="#f2c230" roughness={0.3} clearcoat={0.9} />;
  return (
  <group scale={k}>
    {/* cano */}
    <mesh position={[0, 0.62, 0]}><cylinderGeometry args={[0.24, 0.27, 1.0, 28]} />{mat}</mesh>
    {/* faixa de borda no topo */}
    <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.25, 0.25, 0.07, 28]} /><meshPhysicalMaterial color="#d9a21f" roughness={0.4} clearcoat={0.6} /></mesh>
    {/* tornozelo e peito do pé */}
    <mesh position={[0, 0.2, 0.0]}><sphereGeometry args={[0.27, 24, 18]} />{mat}</mesh>
    <mesh position={[0, 0.17, 0.3]} scale={[0.9, 0.6, 1.5]}><sphereGeometry args={[0.2, 24, 16]} />{mat}</mesh>
    {/* bico reforçado */}
    <mesh position={[0, 0.11, 0.47]} scale={[1.0, 0.62, 1.25]}><sphereGeometry args={[0.17, 20, 14]} /><meshPhysicalMaterial color="#e0aa22" roughness={0.35} clearcoat={0.7} /></mesh>
    {/* sola e salto */}
    <mesh position={[0, 0.03, 0.2]} scale={[1, 1, 1.85]}><cylinderGeometry args={[0.285, 0.285, 0.06, 28]} /><meshStandardMaterial color="#26282c" roughness={0.8} /></mesh>
    <mesh position={[0, 0.07, -0.18]}><boxGeometry args={[0.46, 0.1, 0.2]} /><meshStandardMaterial color="#26282c" roughness={0.8} /></mesh>
    <mesh position={[0, 0.58, 0.265]}><boxGeometry args={[0.055, 0.95, 0.02]} /><meshStandardMaterial color="#14171f" /></mesh>
    {Array.from({ length: 11 }).map((_, i) => <mesh key={i} position={[(i % 2 ? 0.032 : -0.032), 0.14 + i * 0.08, 0.28]}><boxGeometry args={[0.05, 0.04, 0.02]} /><meshStandardMaterial color={i % 2 ? LARANJA : AZUL} metalness={0.5} roughness={0.4} /></mesh>)}
    <mesh position={[0, 0.5 + 0.02 * Math.sin(t * 2), 0.29]}><boxGeometry args={[0.14, 0.12, 0.04]} /><meshStandardMaterial color="#d9b44a" metalness={0.8} roughness={0.3} /></mesh>
  </group>
  );
};

/* ---------------- o pano com o mecanismo ---------------- */

const Painel: React.FC<{ C: Ctx; par: Par; ys: number; vis: Record<string, number> }> = ({ C, par, ys, vis }) => {
  const { n } = C;
  const { bot, gan, den, esp, fita, costura, dsolta, bat, jaq, caixa, pino, forca, voa } = vis;
  const sepY = n("sepY", 0);
  const sepX = n("sep", 0);
  const colsF = [-0.03, 0.3, 0.6, 0.85, 1.0].map((v, j) => v + (j >= 2 ? forca * 0.05 : 0));
  const wzF = [1, 1, 0.6, 0.2, 0];
  const yTape = YB + fita * (YT - YB);
  const dentesOn = den > 0.02 && esp < 0.98;
  const tAbs = C.tEp;
  const dobra = par.dobra;
  return (
    <group>
      {([-1, 1] as (-1 | 1)[]).map((lado) => {
        const cor = lado < 0 ? AZUL : LARANJA;
        const corPano = lado < 0 ? "#3b82c4" : "#f08a3c";
        const off: V = lado > 0 ? [sepX * 0.95, -0.45 * sepY, 0] : [0, 0, 0];
        return (
          <group key={lado} position={off} rotation={lado > 0 ? [0, 0, -0.05 * sepX] : [0, 0, 0]}>
            <Faixa lado={lado} par={par} cols={colsF} wz={wzF} cor={corPano} />
            {fita > 0.01 && <Faixa lado={lado} par={par} cols={[-0.03, 0.3]} wz={[1, 1]} cor={CREME} yMin={YB} yMax={Math.max(YB + 0.02, yTape)} dz={0.004} rug={0.95} />}
            {fita > 0.01 && fita < 0.99 && <mesh position={[lado * (par.g0 + abertura(yTape, par) + 0.13), yTape, ZS * lado * zs(yTape - par.ys) + 0.07]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.34, 16]} /><meshStandardMaterial color={CREME} roughness={0.9} /></mesh>}
            {/* costura (pontos) ao longo da fita */}
            {costura > 0.01 && Array.from({ length: 44 }).map((_, i) => {
              const y = YB + 0.05 + i * 0.077;
              if (y > YB + costura * (YT - YB - 0.1)) return null;
              const o = abertura(y, par);
              const a = Math.atan(dAbertura(y, par));
              const s = y - par.ys;
              const zz = lado * ZS * (zs(s)) + ondaZ(y, par);
              return <mesh key={i} position={[lado * (par.g0 + o + 0.285), y, zz + 0.012]} rotation={[0, 0, lado * -a]}><boxGeometry args={[0.012, 0.045, 0.006]} /><meshStandardMaterial color="#7a5a3a" roughness={0.8} /></mesh>;
            })}
            {/* botões e ganchos */}
            {bot > 0.02 && Array.from({ length: NB }).map((_, i) => {
              const y = 1.0 + 0.4 * i;
              const o = abertura(y, par);
              const xe = lado * (par.g0 + o);
              const fecha = clamp01((ys - y) / 0.25);
              return lado < 0
                ? <group key={i} scale={bot}><mesh position={[xe + 0.0, y, 0.05 + lado * ZS * (1 - sm((y - ys - 0.46) / 0.14)) * 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.13, 0.13, 0.05, 22]} /><meshStandardMaterial color={fecha > 0.5 ? "#37c26a" : "#f4f1ea"} roughness={0.45} /></mesh>
                  {[[-0.04, 0.04], [0.04, 0.04], [-0.04, -0.04], [0.04, -0.04]].map(([a, b], j) => <mesh key={j} position={[xe + a, y + b, 0.078]}><circleGeometry args={[0.014, 8]} /><meshBasicMaterial color="#1c1c1c" /></mesh>)}</group>
                : <group key={i} scale={bot}><Caixa p={[xe + 0.1, y, 0.05]} t={[0.2, 0.04, 0.02]} cor="#1c1c1c" raio={0.005} /></group>;
            })}
            {gan > 0.02 && Array.from({ length: NG }).map((_, i) => {
              const y = 0.9 + 0.2 * i;
              const o = abertura(y, par);
              const xe = lado * (par.g0 + o);
              return lado < 0
                ? <group key={i} scale={gan * 1.7} position={[xe, y, 0.04]}>
                  <Liga a={[0, 0, 0]} b={[0.14, 0, 0]} w={0.035} cil cor="#c9d3da" />
                  <mesh position={[0.14, -0.035, 0]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.035, 0.012, 6, 12, Math.PI * 1.6]} /><meshStandardMaterial color="#c9d3da" metalness={0.7} roughness={0.3} /></mesh>
                </group>
                : <group key={i} scale={gan * 1.7} position={[xe, y, 0.04]}><mesh position={[-0.02, 0, 0]}><torusGeometry args={[0.06, 0.014, 8, 16]} /><meshStandardMaterial color="#c9d3da" metalness={0.7} roughness={0.3} /></mesh></group>;
            })}
            {/* dentes: entram em ordem (E, D, E, D...), voam e a garra prensa a fita */}
            {dentesOn && Array.from({ length: NP }).map((_, k) => {
              const ps = poseDente(lado, k, par);
              const idx = (lado > 0 ? NP : 0) + k;
              const ord = 2 * k + (lado > 0 ? 1 : 0);
              const ue = clamp01(den * 2.2 - (ord / (2 * NP)) * 1.2);
              if (ue < 0.002) return null;
              const eo = ob(ue);
              const u = clamp01((dsolta - 0.6 * hash(idx)) / 0.4);
              const r = fita > 0.001 ? clamp01((yTape - ps.y) / 0.25 + 0.05) : 0;
              const ff = u * u * (1 - sm(r));
              const dy = -(ps.y - 0.12) * ff + 0.5 * (1 - eo);
              const dx = (hash(idx + 7) - 0.5) * 1.4 * ff + lado * 1.2 * (1 - eo);
              const rz = (hash(idx + 3) - 0.5) * 7 * ff + lado * 1.6 * (1 - eo);
              const arco = Math.sin(Math.PI * clamp01(r)) * 0.45 * u + 1.4 * (1 - eo);
              const ang = lado < 0 ? ps.ang : -ps.ang;
              const kk = 1 - sm(clamp01(esp * 1.6));
              const garra = Math.min(clamp01((ue - 0.72) / 0.28), 1 - clamp01(ff * 3));
              if (kk < 0.01) return null;
              return (
                <group key={k} position={[dx, dy, arco]} rotation={[0, 0, rz]}>
                  <group position={[ps.x, ps.y, ps.z]} rotation={[ps.tilt, 0, 0]}>
                    <group rotation={[0, 0, ang]}>
                      <group position={[-lado * par.g0, 0, 0]}>
                        <Dente lado={lado} esc={kk * (1 + 0.1 * Math.sin(Math.PI * clamp01((ue - 0.86) / 0.14)))} garra={garra} />
                      </group>
                    </group>
                  </group>
                </group>
              );
            })}
            {esp > 0.02 && Array.from({ length: NP }).map((_, k) => {
              const ps = poseDente(lado, k, par);
              const ord = 2 * k + (lado > 0 ? 1 : 0);
              const ue = clamp01(esp * 2.0 - (ord / (2 * NP)) * 1.0 - 0.25);
              if (ue < 0.002) return null;
              const eo = ob(ue);
              const ang = lado < 0 ? ps.ang : -ps.ang;
              return (
                <group key={k} position={[lado * 1.0 * (1 - eo), 0.4 * (1 - eo), 1.2 * (1 - eo)]} rotation={[0, 0, lado * 1.5 * (1 - eo)]}>
                  <group position={[ps.x, ps.y, ps.z]} rotation={[ps.tilt, 0, 0]}>
                    <group rotation={[0, 0, ang]}><group position={[-lado * par.g0, 0, 0]}><Laco lado={lado} esc={1} /></group></group>
                  </group>
                </group>
              );
            })}
            {esp > 0.02 && (() => {
              // fio central da espiral (cordão preso à fita) e a costura que prende cada volta, com a agulha
              const pts: V[] = [];
              for (let i = 0; i <= 14; i++) { const y = Y0 - 0.05 + (i * (NP * P + 0.05)) / 14; const o = abertura(y, par); pts.push([lado * (par.g0 + o + 0.02), y, ondaZ(y, par)]); }
              const ce = n("costE", 0);
              const yN = Y0 - 0.05 + ce * (NP * P + 0.05);
              return <group>
                {pts.slice(1).map((b, i) => <Liga key={i} a={pts[i]} b={b} w={0.03} cil cor="#16897c" op={clamp01(esp * 2)} />)}
                {ce > 0.01 && Array.from({ length: 2 * NP }).map((_, i) => {
                  const y = Y0 + i * (P / 2);
                  if (y > yN) return null;
                  const o = abertura(y, par);
                  return <mesh key={i} position={[lado * (par.g0 + o + 0.06), y, ondaZ(y, par) + 0.022]}><boxGeometry args={[0.1, 0.012, 0.008]} /><meshStandardMaterial color="#f5f5f0" roughness={0.8} /></mesh>;
                })}
                {ce > 0.01 && ce < 0.99 && <Liga a={[lado * (par.g0 + abertura(yN, par) + 0.25), yN + 0.25, 0.3]} b={[lado * (par.g0 + abertura(yN, par) + 0.06), yN, 0.03]} w={0.02} cil cor="#e8ecef" />}
              </group>;
            })()}
            {/* batentes de cima e de baixo: voam até a fita e prensam */}
            {bat > 0.02 && [YS1 + HS + 0.03, Y0 - 0.12].map((y, i) => {
              const o = abertura(y, par);
              const s = y - par.ys;
              const zz = lado * ZS * zs(s) + ondaZ(y, par);
              const e = ob(clamp01(bat * 2 - i * 0.7));
              if (e < 0.002) return null;
              const sq = 1 - 0.25 * Math.sin(Math.PI * clamp01((e - 0.8) / 0.2));
              return <group key={i} position={[lado * 0.9 * (1 - e), (i === 0 ? 0.9 : -0.6) * (1 - e), 0.9 * (1 - e)]}><Caixa p={[lado * (par.g0 + o + 0.1), y, zz]} t={[0.18 * sq, 0.11, 0.1]} cor="#ffd23f" met={0.6} rug={0.35} raio={0.025} /></group>;
            })}
            {/* caixa (esquerda) e pino (direita) do fim da fileira */}
            {caixa > 0.02 && lado < 0 && (
              <group position={[-0.9 * (1 - ob(caixa)), 0.5 * (1 - ob(caixa)), 0.6 * (1 - ob(caixa))]}>
                <Caixa p={[-0.1, 0.78, -0.02]} t={[0.2, 0.32, 0.12]} cor="#ffd23f" met={0.6} rug={0.35} raio={0.025} />
                <Caixa p={[-0.1, 0.62, 0.045]} t={[0.07, 0.06, 0.02]} cor="#1c1c1c" raio={0.005} />
              </group>
            )}
            {caixa > 0.02 && lado > 0 && (
              <group position={[0.9 * (1 - ob(caixa)), -0.4 * (1 - ob(caixa)), 0.6 * (1 - ob(caixa))]}>
                <Caixa p={[0.09, 0.575, 0.04]} t={[0.5, 0.05, 0.05]} cor="#c9d3da" met={0.7} rug={0.3} raio={0.012} />
                <Liga a={[-0.1, 0.58, 0.02]} b={[-0.1, 0.9, 0.02]} w={0.05} cil cor="#c9d3da" />
              </group>
            )}
            {/* jaqueta: manga e gola */}
            {jaq > 0.02 && (() => {
              const o = abertura(YT - 0.1, par);
              const xc = lado * (par.g0 + o + 1.0);
              return <group scale={jaq}>
                <Liga a={[xc, YT - 0.3, 0.0]} b={[xc + lado * 1.0, YT - 1.5, 0.05]} w={0.62} cil cor={corPano} />
                <mesh position={[xc + lado * 1.0, YT - 1.5, 0.05]}><sphereGeometry args={[0.31, 14, 10]} /><meshStandardMaterial color={corPano} roughness={0.9} /></mesh>
                <Caixa p={[lado * (par.g0 + o + 0.08), YT + 0.12, 0.0]} t={[0.4, 0.28, 0.08]} cor={mistura(corPano, "#000000", 0.25)} raio={0.04} />
              </group>;
            })()}
          </group>
        );
      })}
      {void tAbs}{void voa}
    </group>
  );
};
/* ---------------- cena ---------------- */

const ZipCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const C = mkCtx(cena, p, t, tEpisodio);
  const { n } = C;
  const gente = (cena.gente as GenteZ[] | undefined) ?? [];
  const palco = (cena.palco as string | undefined) ?? "atelie";
  const fechaV = n("fecha", 0);
  let ys = lerp(YS0, YS1, fechaV);
  const al = n("alinha", 0);
  if (al > 0) {
    const kk = Math.round((ys + 0.08 - (Y0 + P / 2)) / P);
    ys = lerp(ys, Y0 + P / 2 + kk * P - 0.08, al);
  }
  const g0 = n("g0", 0);
  const par: Par = { ys, g0, t: tEpisodio, solto: n("solto", 0), dobra: n("dobra", 0), fr: n("frestas", 0) };
  const vis = {
    bot: n("botoes", 0), gan: n("ganchos", 0), den: n("dentes", 0), esp: n("espiral", 0), fita: n("fita", 0), costura: n("costura", 0), dsolta: n("dsolta", 0),
    bat: n("batentes", 0), jaq: n("jaqueta", 0), caixa: n("caixa", 0), pino: n("pino", 0), forca: n("forca", 0), voa: n("voa", 0),
  };
  const car = n("carrinho", 0), rx = n("raioxC", 0), setaY = n("setaY", 0), tab = n("tab", 2.5), trava = n("trava", 0);
  const voa = vis.voa;
  const luz = n("luz", 0);
  const maos = n("maos", 0), corte = n("corte", 0);
  const camisa = n("camisa", 0), estrelas = n("estrelas", 0);
  const patente = (cena.patente as string | undefined);
  const patK = n("patK", 0), patS = n("patS", 0), galK = n("galocha", 0);
  const keys = cena.camK as number[][] | undefined;
  const yRel = (cena.camRel ? 1 : 0) * ys;
  const sopa = n("sopa", 0);
  const sai = voa;
  const cai = n("cai", 0);
  const caiF = cai * cai * (1 - sm((vis.fita * (YT - YB) + YB - ys) / 0.4) * 0);
  const sPos: V = [0, ys + sai * 3.2 - (ys - 0.15) * caiF, 0 + sai * 2.2 + caiF * 0.3];
  const S = n("etiqS", 1);
  const Kt = n("etiqK", 1);
  const hasSep = n("sep", 0);
  const et: Record<string, EtiqDef> = {
    botoes: { texto: "BOTÃO", para: [0.0, 2.2, 0.15], off: [-0.7, 0.9], cor: "#ffd23f" },
    ganchos: { texto: "GANCHOS", para: [0.0, 2.6, 0.15], off: [0.6, 0.9], cor: "#ffd23f" },
    dentes: { texto: "DENTES", para: [0.0, ys - 0.62, 0.1], off: [0.9, 0.7], cor: "#e8eef2" },
    carrinho: { texto: "CARRINHO", para: [0.0, ys + 0.38, 0.14], off: [-0.9, 0.8], cor: "#ffd23f" },
    y: { texto: "Y", para: [0.0, ys + 0.2, 0.14], off: [0.85, 0.5], cor: "#ffe14a" },
    zig: { texto: "ZIGUE-ZAGUE", para: [0.0, ys - 0.3, 0.07], off: [0.45, -0.5], cor: "#e8eef2" },
    fita: { texto: "FITA", para: [-0.37, 2.6, 0.04], off: [-0.8, 0.8], cor: "#ffd23f" },
    grampo: { texto: "GRAMPO", para: [0.95, 2.0, 0.9], off: [0.0, 0.9], cor: "#ffd23f" },
    batente: { texto: "BATENTE", para: [0.3, YS1 + HS + 0.03, 0.1], off: [0.8, 0.5], cor: "#ffd23f" },
    trava: { texto: "TRAVA", para: [-0.115, ys + 0.08, 0.2], off: [-0.8, 0.6], cor: "#ffd23f" },
    pino: { texto: "PINO", para: [0.1 + hasSep * 0.95, 0.8 - hasSep * 0.45, 0.06], off: [0.8, 0.7], cor: "#ffd23f" },
    caixa: { texto: "CAIXA", para: [-0.1, 0.8, 0.07], off: [-0.8, 0.5], cor: "#ffd23f" },
    espiral: { texto: "ESPIRAL", para: [0.0, ys - 0.45, 0.06], off: [0.8, 0.8], cor: "#e8eef2" },
    zipper: { texto: "ZIPPER", para: [0.75, 1.55, 1.5], off: [0.0, 1.1], cor: "#ffd23f" },
    ziper: { texto: "ZÍPER", para: [0.0, 2.9, 0.2], off: [0.0, 1.1], cor: "#ffd23f" },
  };
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fimE] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fimE === undefined || p <= fimE) };
  }).filter((x) => x.ok);
  const zx = nv(gente[0]?.x, p, 0);
  const botaoV = n("botaoV", 0);
  const bFim = (cena.botaoV as { fim?: number } | undefined)?.fim ?? 0.9;
  const dtPouso = (p - bFim) * (p > 0.001 ? t / p : 3);
  const bIni = (cena.botaoV as { ini?: number } | undefined)?.ini ?? 0.5;
  const zxL = nv(gente[0]?.x, bIni, 0);
  // vetor de camisa presa (beat 10): do quadril do Zeca ao carrinho
  const zg = gente[0];
  const zpos: V = [nv(zg?.x, p, 0), nv(zg?.y, p, 0), nv(zg?.z, p, 0)];
  return (
    <group>
      {keys && <CamPropria keys={keys} p={p} yRel={yRel} />}
      <hemisphereLight args={["#fff6e6", "#8a7a5a", 1.0]} />
      <directionalLight position={[-3, 7, 8]} intensity={1.6} color="#fff3dc" />
      <directionalLight position={[4, 3, 6]} intensity={0.5} color="#cfe3ff" />
      {palco === "corredor" ? (
        <Corredor k={p} t={tEpisodio} botao={botaoV} zx={zxL} dtPouso={dtPouso} />
      ) : (
        <group>
          {n("janela", 0) > 1.5 ? <AtelieCeu t={tEpisodio} k={n("pano", 0)} /> : <Atelie t={tEpisodio} luz={luz} janela={n("janela", 0)} pano={0} />}
          <Liga a={[-2.2, YT + 0.05, 0]} b={[2.2, YT + 0.05, 0]} w={0.09} cil cor="#8d99a3" />
          {[-2.0, 2.0].map((x) => <Liga key={x} a={[x, YT + 0.05, 0]} b={[x, YT + 1.1, 0]} w={0.03} cil cor="#555555" />)}
          {vis.jaq > 0.02 && <group>
            <Liga a={[0, YT + 0.1, 0]} b={[0, YT + 0.5, 0]} w={0.03} cil cor="#c9d3da" />
            <mesh position={[0.1, YT + 0.56, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.1, 0.014, 6, 14, Math.PI * 1.5]} /><meshStandardMaterial color="#c9d3da" metalness={0.8} roughness={0.3} /></mesh>
          </group>}
          {vis.den > 0.7 && vis.esp < 0.98 && !(vis.dsolta > 0.3 && vis.fita < 0.5) && <Caixa p={[0, (ys - 0.05 + Y0 - 0.2) / 2, -0.062]} t={[0.3, Math.max(0.05, ys - 0.05 - (Y0 - 0.2)), 0.01]} cor="#262b40" raio={0.003} sombra={false} />}
          <Painel C={C} par={par} ys={ys} vis={vis} />
          {car > 0.02 && (
            <group position={[0, sPos[1], sPos[2]]} rotation={[sai * 1.2, 0, sai * 0.5 + caiF * 1.4]}>
              <Carrinho rx={rx} tab={tab} trava={trava} setaY={setaY} mont={n("mont", 1)} />
            </group>
          )}
          {/* setas de força */}
          {vis.forca > 0.02 && [1.7, 2.6].map((y) => <group key={y}><Seta a={[-0.7, y, 0.25]} b={[-1.5, y, 0.25]} cor="#ff6a5a" w={0.07} op={vis.forca} /><Seta a={[0.7, y, 0.25]} b={[1.5, y, 0.25]} cor="#ff6a5a" w={0.07} op={vis.forca} /></group>)}
          {/* mãos entrelaçadas */}
          {maos > 0.02 && <group position={[0.35, 2.85, 1.0]} scale={0.5 * Math.min(1, maos * 3)}><Maos m={clamp01((maos - 0.2) / 0.7)} t={tEpisodio} /></group>}
          {/* lupa do grampo */}
          {corte > 0.02 && <group position={[0.95, 1.5, 0.9]} scale={0.5}><Lupa k={Math.min(1, corte * 3)} forca={vis.forca} t={tEpisodio} /></group>}
          {/* camisa presa no carrinho (beat 10) */}
          {camisa > 0.02 && (() => {
            const hip: V = [zpos[0] + 0.28, 1.0 + zpos[1], zpos[2] + 0.05];
            const tip: V = [0.02, ys + 0.1, 0.16];
            const pts: V[] = [];
            const folga = 0.28 * (1 - estrelas * 0.0) * (1 - clamp01(camisa - 1)) ;
            for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([lerp(hip[0], tip[0], u), lerp(hip[1], tip[1], u) - 4 * folga * u * (1 - u), lerp(hip[2], tip[2], u)]); }
            return <group>{pts.slice(1).map((b, i) => <Liga key={i} a={pts[i]} b={b} w={0.2} e={0.02} cor="#f2c230" />)}</group>;
          })()}
          <Choque p={[0, ys + 0.5, 0.35]} k={estrelas} t={tEpisodio} r={0.5} />
          {patente && patK > 0.01 && <group position={[n("patX", 0), 2.7, 1.7]} rotation={[0, 0, -0.04]} scale={n("patE", 0.62)}>
            <Patente tipo={patente} k={patK} stamp={patS} t={tEpisodio} />
          </group>}
          {cena.patente2 && n("patK2", 0) > 0.01 ? <group position={[n("patX2", 0), 2.7, 1.7]} rotation={[0, 0, 0.04]} scale={n("patE", 0.62)}><Patente tipo={cena.patente2 as string} k={n("patK2", 0)} stamp={n("patS2", 0)} t={tEpisodio} /></group> : null}
          {galK > 0.02 && <group position={[0.75, 0.0, 1.5]} rotation={[0, -0.6, 0]} scale={1.1}><Galocha k={galK} t={tEpisodio} /></group>}
          {sopa > 0.02 && <group position={[1.15, 0, 1.0]} scale={sopa * 0.85}>
            <Caixa p={[0, 0.5, 0]} t={[0.9, 0.06, 0.9]} cor="#8a5a34" raio={0.02} />
            {[[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].map(([a, b], i) => <Caixa key={i} p={[a, 0.25, b]} t={[0.06, 0.5, 0.06]} cor="#6b4426" raio={0.01} />)}
            <mesh position={[0, 0.62, 0]}><cylinderGeometry args={[0.24, 0.17, 0.18, 20]} /><meshStandardMaterial color="#f5f5f0" roughness={0.3} /></mesh>
            <mesh position={[0, 0.705, 0]}><cylinderGeometry args={[0.225, 0.225, 0.01, 20]} /><meshStandardMaterial color="#e8892b" roughness={0.6} /></mesh>
            <Fumaca p={[0, 0.72, 0]} t={tEpisodio} k={0.8} cor="#ffffff" n={5} alt={0.5} larg={0.1} op={0.35} />
          </group>}
        </group>
      )}
      {gente.map((gd, i) => <PessoaZ key={i} g={gd} p={p} t={t} tAbs={tEpisodio} />)}
      {palco !== "corredor" && etiqs.map(({ c, ini }) => {
        const d = et[c];
        const off: V = [d.para[0] + d.off[0] * S, d.para[1] + d.off[1] * S, d.para[2] + 0.3];
        return <Etiqueta key={c} texto={d.texto} de={off} para={d.para} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

void Y0;
void yDente;

export const ziper: Cenario3D = {
  Cena: ZipCena,
  padrao: "geral",
  fundo: () => "#f0d9d2",
  luzPropria: true,
  cameras: { geral: { pos: [-0.3, 2.4, 8], alvo: [-0.3, 2.3, 0], fov: 50 } },
};
