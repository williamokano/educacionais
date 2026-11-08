import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { Caixa, rnd } from "../../../src/v3d/qualidade";
import { Halo, Liga, noCaminho, compr, V } from "./cozinha-base";

// Peças novas da hidrelétrica v2 (usina.tsx as usa): sala com TV, bicicleta, grade, galhos, peixe, chaminé de equilíbrio, golpe de água, escada de peixes, transformador, submarino.
// Medidas em metros, no mundo do palco "rio" (leito y = -0,5, água y = -0,05, parede com topo y = 3,8, eixo da água z = 0,2).

const YB = -0.5;
const AGUA_Y = -0.05;
const HW = 3.8;
const XC = 0.7;
const XB = 2.4;
const KS = (XB - XC) / (HW - YB);
export const xFace = (y: number) => XC + (HW - y) * KS;
const ZE = 0.2;
export const TUBO: V[] = [[-0.25, 3.0, ZE], [0.58, 3.0, ZE], [1.5, 0.7, ZE], [2.0, 0.7, ZE]];

/* ---------- sala (casa aberta na frente, na margem) ---------- */

let TVTEX: THREE.CanvasTexture | null = null;
const tvTex = () => {
  if (TVTEX) return TVTEX;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2f8f3f";
  g.fillRect(0, 0, 256, 160);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#2b8638" : "#35974a"; g.fillRect(i * 32, 0, 32, 160); }
  g.strokeStyle = "#ffffff";
  g.lineWidth = 3;
  g.strokeRect(12, 10, 232, 140);
  g.strokeRect(70, 10, 116, 44);
  g.strokeRect(100, 10, 56, 18);
  g.beginPath(); g.arc(128, 150, 26, Math.PI, 2 * Math.PI); g.stroke();
  g.fillStyle = "#e8e8e8"; g.fillRect(104, 4, 48, 8);
  g.fillStyle = "#ff5a3a"; g.beginPath(); g.arc(120, 78, 7, 0, 7); g.fill();
  g.fillStyle = "#3a6aff"; g.beginPath(); g.arc(138, 40, 7, 0, 7); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(128, 36, 4, 0, 7); g.fill();
  g.fillStyle = "#111"; g.fillRect(6, 4, 48, 14);
  g.fillStyle = "#ffd23f"; g.font = "bold 12px sans-serif"; g.fillText("90+3'", 10, 15);
  TVTEX = new THREE.CanvasTexture(g.canvas);
  TVTEX.colorSpace = THREE.SRGBColorSpace;
  return TVTEX;
};

/** Sala: piso, parede do fundo com janela para o rio, parede da esquerda, TV, sofá, abajur, quadro, planta. Ocupa x -5,6..-1,4 e z 3,2..7,4. `tv` 0..1 e `luz` 0..1 (a luz da sala). */
export const Sala: React.FC<{ tv: number; luz: number; t: number }> = ({ tv, luz, t }) => {
  const parede = "#e8dcc4";
  const escura = mistura(luz);
  const tex = useMemo(tvTex, []);
  const on = tv > 0.5;
  return (
    <group>
      <Caixa p={[-3.5, 0.05, 5.3]} t={[4.6, 0.1, 4.6]} cor="#a8784a" raio={0.02} rug={0.8} />
      <Caixa p={[-3.7, 0.11, 5.4]} t={[2.4, 0.02, 1.8]} cor="#b8453a" raio={0.01} rug={0.95} sombra={false} />
      {/* parede do fundo, com a janela (x -3,4..-1,9; y 0,5..2,1) */}
      <Caixa p={[-4.5, 1.4, 3.2]} t={[2.2, 2.8, 0.2]} cor={parede} raio={0.02} rug={0.9} />
      <Caixa p={[-1.65, 1.4, 3.2]} t={[0.5, 2.8, 0.2]} cor={parede} raio={0.02} rug={0.9} />
      <Caixa p={[-2.65, 0.25, 3.2]} t={[1.5, 0.5, 0.2]} cor={parede} raio={0.02} rug={0.9} />
      <Caixa p={[-2.65, 2.45, 3.2]} t={[1.5, 0.7, 0.2]} cor={parede} raio={0.02} rug={0.9} />
      {[[-2.65, 2.1, 1.5, 0.06, 0.12], [-2.65, 0.5, 1.5, 0.06, 0.12], [-3.4, 1.3, 0.06, 1.6, 0.12], [-1.9, 1.3, 0.06, 1.6, 0.12]].map(([x, y, w, h, d], i) => <Caixa key={i} p={[x, y, 3.2]} t={[w, h, d]} cor="#6a4a2c" raio={0.01} sombra={false} />)}
      {/* parede da esquerda */}
      <Caixa p={[-5.6, 1.4, 5.3]} t={[0.2, 2.8, 4.4]} cor={parede} raio={0.02} rug={0.9} />
      <Caixa p={[-5.5, 0.12, 5.3]} t={[0.1, 0.22, 4.4]} cor="#c9bca0" raio={0.01} sombra={false} />
      {/* TV e móvel */}
      <Caixa p={[-4.6, 0.32, 3.55]} t={[1.7, 0.64, 0.5]} cor="#6a4a2c" raio={0.03} rug={0.8} />
      <Caixa p={[-4.6, 1.2, 3.42]} t={[1.4, 0.86, 0.1]} cor="#1c1f24" raio={0.03} rug={0.4} />
      <mesh position={[-4.6, 1.2, 3.475]}><planeGeometry args={[1.28, 0.74]} />{on ? <meshBasicMaterial map={tex} /> : <meshBasicMaterial color="#07090c" />}</mesh>
      {on && <Halo p={[-4.6, 1.2, 3.9]} r={1.6} cor="#9fe8b0" op={0.28} />}
      {on && <pointLight position={[-4.6, 1.3, 4.3]} intensity={1.1} distance={4} color="#bfe8c8" />}
      {/* sofá junto da parede da esquerda */}
      <Caixa p={[-5.2, 0.3, 5.9]} t={[0.9, 0.42, 1.9]} cor="#5b7aa8" raio={0.08} rug={0.9} />
      <Caixa p={[-5.5, 0.7, 5.9]} t={[0.3, 0.8, 1.9]} cor="#4f6c98" raio={0.08} rug={0.9} />
      <Caixa p={[-5.2, 0.55, 4.9]} t={[0.9, 0.3, 0.22]} cor="#4f6c98" raio={0.06} rug={0.9} />
      <Caixa p={[-5.2, 0.55, 6.9]} t={[0.9, 0.3, 0.22]} cor="#4f6c98" raio={0.06} rug={0.9} />
      {/* abajur */}
      <Liga a={[-2.2, 0.1, 3.9]} b={[-2.2, 1.35, 3.9]} w={0.05} cil cor="#5a4630" />
      <mesh position={[-2.2, 1.5, 3.9]}><cylinderGeometry args={[0.12, 0.22, 0.3, 14]} /><meshStandardMaterial color={escura} emissive="#ffe29a" emissiveIntensity={1.4 * luz} roughness={0.8} /></mesh>
      {luz > 0.05 && <Halo p={[-2.2, 1.5, 4.1]} r={1.7} cor="#ffe29a" op={0.45 * luz} />}
      {luz > 0.05 && <pointLight position={[-2.2, 1.6, 4.4]} intensity={1.2 * luz} distance={5} color="#ffe2a8" />}
      {/* quadro e planta */}
      <Caixa p={[-5.47, 1.9, 4.5]} t={[0.04, 0.6, 0.8]} cor="#c9a24a" raio={0.01} sombra={false} />
      <Caixa p={[-5.44, 1.9, 4.5]} t={[0.03, 0.46, 0.66]} cor="#7fb0d8" raio={0.01} sombra={false} />
      <Caixa p={[-1.9, 0.2, 6.6]} t={[0.3, 0.3, 0.3]} cor="#b0553c" raio={0.04} />
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[-1.9 + Math.sin(i * 2.1 + t * 0.6) * 0.05, 0.55 + i * 0.05, 6.6]} rotation={[0, i, 0.5 + i * 0.4]} scale={[0.07, 0.4, 0.02]}><sphereGeometry args={[1, 6, 6]} /><meshStandardMaterial color="#3f9a4a" roughness={0.8} /></mesh>)}
    </group>
  );
};
const mistura = (luz: number) => (luz > 0.5 ? "#f6e6b8" : "#6a6250");

/* ---------- bicicleta ligada à lâmpada ---------- */

/** Bicicleta parada, de lado para a câmera (eixo no x). `ang` gira as rodas e os pedais; `p` é o ponto no chão no meio das rodas; `dinamo` 0..1 mostra o dínamo na roda de trás. */
export const Bicicleta: React.FC<{ p: V; ang: number; cor?: string }> = ({ p, ang: angEntrada, cor = "#d6392e" }) => {
  // A bicicleta anda para +x: rodar para frente é sentido horário visto de +z, ou seja, ângulo NEGATIVO (antes girava ao contrário).
  const ang = -angEntrada;
  const roda = (x: number, i: number) => (
    <group key={i} position={[x, 0.36, 0]}>
      <mesh rotation={[0, 0, ang]}><torusGeometry args={[0.34, 0.035, 8, 24]} /><meshStandardMaterial color="#25282c" roughness={0.6} /></mesh>
      {[0, 1, 2, 3].map((k) => <mesh key={k} rotation={[0, 0, ang + (k * Math.PI) / 4]}><boxGeometry args={[0.68, 0.012, 0.012]} /><meshStandardMaterial color="#c9ccd0" metalness={0.6} roughness={0.4} /></mesh>)}
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.08, 10]} /><meshStandardMaterial color="#8d949a" /></mesh>
    </group>
  );
  const pedal = (k: number) => {
    const a = ang + k * Math.PI;
    const px = Math.cos(a) * 0.17;
    const py = 0.34 + Math.sin(a) * 0.17;
    return (
      <group key={k}>
        <Liga a={[0, 0.34, 0.07 * (k ? -1 : 1)]} b={[px, py, 0.07 * (k ? -1 : 1)]} w={0.035} cil cor="#8d949a" />
        <Caixa p={[px, py, 0.11 * (k ? -1 : 1)]} t={[0.14, 0.03, 0.09]} cor="#25282c" raio={0.01} sombra={false} />
      </group>
    );
  };
  return (
    <group position={p}>
      {roda(-0.55, 0)}
      {roda(0.55, 1)}
      <Liga a={[0, 0.34, 0]} b={[-0.18, 0.86, 0]} w={0.045} cil cor={cor} />
      <Liga a={[-0.18, 0.86, 0]} b={[0.42, 0.78, 0]} w={0.045} cil cor={cor} />
      <Liga a={[0, 0.34, 0]} b={[0.42, 0.78, 0]} w={0.045} cil cor={cor} />
      <Liga a={[0.42, 0.78, 0]} b={[0.52, 0.4, 0]} w={0.04} cil cor={cor} />
      <Liga a={[0, 0.34, 0]} b={[-0.55, 0.38, 0.05]} w={0.035} cil cor={cor} />
      <Liga a={[-0.18, 0.86, 0]} b={[-0.55, 0.38, 0.05]} w={0.035} cil cor={cor} />
      <Caixa p={[-0.2, 0.93, 0]} t={[0.3, 0.06, 0.14]} cor="#25282c" raio={0.02} />
      <Liga a={[0.42, 0.78, 0]} b={[0.46, 1.0, 0]} w={0.035} cil cor="#8d949a" />
      <Liga a={[0.46, 1.0, -0.22]} b={[0.46, 1.0, 0.22]} w={0.035} cil cor="#25282c" />
      {pedal(0)}
      {pedal(1)}
      {/* cavalete que prende a bicicleta */}
      <Liga a={[-0.55, 0.12, -0.2]} b={[-0.55, 0.12, 0.2]} w={0.05} cil cor="#555b66" />
      <Liga a={[-0.55, 0.12, 0]} b={[-0.55, 0.36, 0]} w={0.04} cil cor="#555b66" />
      {/* dínamo na roda de trás */}
      <Caixa p={[-0.55, 0.74, 0.12]} t={[0.16, 0.1, 0.1]} cor="#3a414c" raio={0.02} />
    </group>
  );
};

/* ---------- grade, galhos, peixe ---------- */

/** Grade na entrada do cano (x = -0,35, y 2,55..3,45): barras verticais e duas travessas. `k` 0..1 cresce. */
export const Grade: React.FC<{ k: number }> = ({ k }) => {
  if (k <= 0.02) return null;
  const e = suave(k);
  return (
    <group position={[-0.36, 3.0, ZE]} scale={[1, e, 1]}>
      {Array.from({ length: 11 }).map((_, i) => <Caixa key={i} p={[0, 0, -0.5 + i * 0.1]} t={[0.04, 0.95, 0.035]} cor="#9aa5ad" met={0.7} rug={0.35} raio={0.008} sombra={false} />)}
      {[-0.45, 0, 0.45].map((y, i) => <Caixa key={i} p={[0, y, 0]} t={[0.05, 0.05, 1.12]} cor="#6b747c" met={0.7} rug={0.4} raio={0.008} sombra={false} />)}
    </group>
  );
};

/** Galhos, folhas e uma garrafa flutuando no lago em direção à grade; ficam presos nela. `k` 0..1 é a chegada. */
export const Galhos: React.FC<{ k: number; nivel: number; t: number }> = ({ k, nivel, t }) => {
  if (k <= 0.01) return null;
  const itens: [number, number, number][] = [[-3.4, -0.25, 0.3], [-3.9, 0.15, 1.0], [-4.4, 0.4, 0.2], [-3.0, -0.4, 0.7], [-5.0, 0.0, 0.5], [-4.7, -0.3, 0.9]];
  return (
    <group>
      {itens.map(([x0, dz, dl], i) => {
        const u = clamp01((k - dl * 0.15) / (1 - dl * 0.15));
        const x = lerp(x0, -0.55 - (i % 3) * 0.03, suave(u));
        const y = nivel + 0.03 + 0.015 * Math.sin(t * 2 + i);
        const z = ZE + dz;
        if (i % 3 === 0) return <mesh key={i} position={[x, y, z]} rotation={[0.1, i, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.03, 0.55, 6]} /><meshStandardMaterial color="#6a4a2c" roughness={1} /></mesh>;
        if (i % 3 === 1) return <mesh key={i} position={[x, y, z]} rotation={[-Math.PI / 2, 0, i]} scale={[0.22, 0.14, 1]}><circleGeometry args={[1, 5]} /><meshStandardMaterial color="#5f8a3a" side={THREE.DoubleSide} /></mesh>;
        return <mesh key={i} position={[x, y + 0.03, z]} rotation={[0, 0, Math.PI / 2 + 0.2]}><cylinderGeometry args={[0.05, 0.05, 0.26, 8]} /><meshStandardMaterial color="#3a8fd0" transparent opacity={0.75} /></mesh>;
      })}
    </group>
  );
};

/** Peixe de desenho animado: corpo, cauda, olho. */
export const Peixe: React.FC<{ p: V; rot?: number; esc?: number; cor?: string; incl?: number }> = ({ p, rot = 0, esc = 1, cor = "#ff9a3a", incl = 0 }) => (
  <group position={p} rotation={[0, rot, incl]} scale={esc}>
    <mesh scale={[0.34, 0.15, 0.1]}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color={cor} roughness={0.5} /></mesh>
    <mesh position={[-0.36, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.15, 0.24, 4]} /><meshStandardMaterial color={cor} roughness={0.5} /></mesh>
    <mesh position={[0.02, 0.15, 0]} rotation={[0, 0, -0.3]} scale={[0.14, 0.1, 0.02]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#e0702a" /></mesh>
    {[1, -1].map((s) => <mesh key={s} position={[0.22, 0.03, s * 0.085]} scale={0.035}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#111" /></mesh>)}
  </group>
);

/** O peixe que chega na grade e desvia (u 0..1): nada até ela, faz uma curva e volta pelo lado. */
export const PeixeGrade: React.FC<{ u: number; nivel: number }> = ({ u, nivel }) => {
  if (u <= 0.01 || u >= 0.99) return null;
  const x = u < 0.55 ? lerp(-3.4, -0.75, suave(u / 0.55)) : lerp(-0.75, -2.6, suave((u - 0.55) / 0.45));
  const z = ZE + (u < 0.55 ? 0.0 : Math.sin(((u - 0.55) / 0.45) * Math.PI * 0.5) * 0.9);
  const y = nivel - 0.32;
  const rot = u < 0.5 ? 0 : Math.PI;
  return <Peixe p={[x, y, z]} rot={rot} esc={0.9} />;
};

/* ---------- chaminé de equilíbrio e golpe de água ---------- */

/** Chaminé de vidro sobre o cano, na crista da parede. `k` 0..1 cresce; `golpe` 0..1 sobe a água e a tinge de vermelho no fim do golpe. */
export const Chamine: React.FC<{ k: number; golpe: number; nivel: number; t: number }> = ({ k, golpe, nivel, t }) => {
  if (k <= 0.02) return null;
  const e = suave(k);
  const resp = clamp01((golpe - 0.6) / 0.4);
  const sobe = resp > 0 ? Math.sin(resp * Math.PI * 1.5) * Math.exp(-resp * 1.5) * 1.35 + resp * 0.0 : 0;
  const topoAgua = nivel + sobe * 0.9 + (sobe > 0.01 ? 0.04 * Math.sin(t * 20) : 0);
  const base = 3.0;
  const alt = 1.9;
  const quente = clamp01(resp * 3) * (1 - clamp01((resp - 0.6) * 2.5));
  return (
    <group position={[0.4, base, ZE]} scale={[1, e, 1]}>
      <mesh position={[0, alt / 2, 0]}><cylinderGeometry args={[0.3, 0.3, alt, 16, 1, true]} /><meshPhysicalMaterial color="#c8d6de" transparent opacity={0.32} roughness={0.1} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, alt / 2, 0]}><cylinderGeometry args={[0.31, 0.31, alt, 16, 1, true]} /><meshBasicMaterial color="#5d6e78" transparent opacity={0.35} side={THREE.BackSide} depthWrite={false} /></mesh>
      <mesh position={[0, alt + 0.05, 0]}><cylinderGeometry args={[0.36, 0.33, 0.1, 16]} /><meshStandardMaterial color="#8a9096" metalness={0.5} roughness={0.4} /></mesh>
      <mesh position={[0, (topoAgua - base) / 2, 0]}><cylinderGeometry args={[0.24, 0.24, Math.max(0.05, topoAgua - base), 14]} /><meshBasicMaterial color={quente > 0.05 ? "#ff5a4a" : "#3f9ae8"} transparent opacity={0.7} depthWrite={false} /></mesh>
      {quente > 0.05 && <Halo p={[0, (topoAgua - base) * 0.6, 0.3]} r={1.3} cor="#ff4a3a" op={0.5 * quente} />}
    </group>
  );
};

/** A pancada: uma onda vermelha corre pelo cano até a turbina (golpe 0..0,6), bate e volta subindo na chaminé (golpe 0,6..1). */
export const Golpe: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  if (k <= 0.01 || k >= 0.99) return null;
  const L = compr(TUBO);
  const u = clamp01(k / 0.6);
  const cab = noCaminho(TUBO, u * L).p;
  const bate = k > 0.55 ? clamp01((k - 0.55) / 0.2) : 0;
  return (
    <group>
      {u < 0.999 && Array.from({ length: 6 }).map((_, i) => {
        const q = noCaminho(TUBO, Math.max(0, u * L - i * 0.22)).p;
        return <mesh key={i} position={q} scale={0.3 - i * 0.03}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial color="#ff3a2a" transparent opacity={0.75 - i * 0.1} depthWrite={false} /></mesh>;
      })}
      <Halo p={cab} r={1.1} cor="#ff3a2a" op={0.7 * (1 - bate)} />
      {bate > 0 && bate < 1 && (
        <group>
          <Halo p={[2.0, 0.7, ZE + 0.2]} r={1.8 * (0.4 + bate)} cor="#ff6a4a" op={0.8 * (1 - bate)} />
          {Array.from({ length: 8 }).map((_, i) => { const a = (i / 8) * Math.PI * 2 + t; return <Liga key={i} a={[2.0, 0.7, ZE + 0.2]} b={[2.0 + Math.cos(a) * 0.7 * bate, 0.7 + Math.sin(a) * 0.7 * bate, ZE + 0.2]} w={0.05} cil cor="#ffd0a8" basico op={1 - bate} />; })}
        </group>
      )}
    </group>
  );
};

/* ---------- escada de peixes ---------- */

// Série de poças (tanques de concreto) em degraus, cada uma cheia de água, com a água caindo de uma para a seguinte.
// A subida vai para -x (contra a correnteza); a poça 0 é a mais baixa, junto ao rio.
const NP = 4; // poças
const LP = 1.35; // comprimento da água de cada poça
const PP = LP + 0.1; // passo entre poças (a parede de 0,1 é dividida entre duas)
const DY = 0.55; // desnível entre poças
const Y0 = 0.5; // superfície da água da poça 0
const XC0 = 2.3; // centro da poça 0
const POCO_Z = 2.25;
const ZI = 0.7; // largura interna
const CIM = new THREE.Color("#9ea3a5");
const BAIXO = new THREE.Color("#c9cdcf");
const ys = (i: number) => Y0 + DY * i;
const xc = (i: number) => XC0 - PP * i;
const concreto = (i: number, m = 0) => new THREE.Color().copy(CIM).lerp(BAIXO, clamp01(i / (NP - 1) + m)).getStyle();
const AGUA_POCO = ["#2c86d8", "#3b97e2", "#4aa9ec", "#5bbaf4"];
const XS = (i: number) => xc(i) - LP / 2 + 0.3; // onde o peixe decola da poça i
const XL = (i: number) => xc(i) + LP / 2 - 0.2; // onde ele cai na poça i
const ALT = 0.5; // altura extra do salto

/** Respingo: anel que abre e gotas que sobem e caem. `u` 0..1 */
const Respingo: React.FC<{ p: V; u: number; esc?: number }> = ({ p, u, esc = 1 }) => {
  if (u <= 0.01 || u >= 0.99) return null;
  const tau = u * 0.55;
  return (
    <group position={p} scale={esc}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.05 + 0.2 * u, 0.09 + 0.26 * u, 20]} />
        <meshBasicMaterial color="#e9f7ff" transparent opacity={0.85 * (1 - u)} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 7 }).map((_, k) => {
        const a = (k / 7) * Math.PI * 2 + 0.4;
        const r = 0.28 * tau * (0.6 + 0.4 * rnd(k * 3.1));
        const y = 1.5 * tau * (0.7 + 0.5 * rnd(k * 5.3)) - 4.2 * tau * tau;
        if (y < -0.02) return null;
        return <mesh key={k} position={[Math.cos(a) * r, y + 0.02, Math.sin(a) * r]} scale={0.026 * (1 - 0.5 * u)}><sphereGeometry args={[1, 6, 5]} /><meshBasicMaterial color="#f2fbff" transparent opacity={0.95} depthWrite={false} /></mesh>;
      })}
    </group>
  );
};

/** Escada de peixes: poças de concreto em degraus, água azul, a água caindo de uma para a seguinte. `k` 0..1 constrói de baixo para cima. */
export const Escada: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  if (k <= 0.02) return null;
  return (
    <group position={[0, 0, POCO_Z]}>
      {Array.from({ length: NP }).map((_, i) => {
        const on = clamp01(k * NP - i);
        if (on <= 0.02) return null;
        const y = ys(i);
        const x = xc(i);
        const cor = concreto(i);
        const corM = concreto(i, 0.08);
        const fundo = y - 0.32; // topo do piso
        const xw = x + LP / 2 + 0.05; // parede do lado +x (soleira), dividida com a poça de baixo
        const xf = x + LP / 2 + 0.1 + 0.03; // plano da cascata
        const base = i === 0 ? -0.05 : ys(i - 1);
        const alt = y - base;
        return (
          <group key={i} scale={[1, suave(on), 1]}>
            {/* pedestal e piso */}
            <Caixa p={[x, fundo / 2 - 0.0, 0]} t={[LP - 0.01, fundo, 0.9 - 0.02]} cor={corM} raio={0.02} rug={0.9} />
            {/* paredes laterais: a de trás alta, a da frente baixa para ver a água */}
            <Caixa p={[x, fundo + (0.32 + 0.22) / 2, -0.4]} t={[LP, 0.54, 0.1]} cor={cor} raio={0.02} rug={0.85} />
            <Caixa p={[x, fundo + (0.32 + 0.04) / 2, 0.4]} t={[LP, 0.36, 0.1]} cor={cor} raio={0.02} rug={0.85} />
            {/* parede do lado +x (soleira, mais baixa que a água) e parede do fundo da última poça */}
            <Caixa p={[xw, (y - 0.04) / 2, 0]} t={[0.1, y - 0.04, 0.9]} cor={corM} raio={0.015} rug={0.9} />
            {i === NP - 1 && <Caixa p={[x - LP / 2 - 0.05, (y + 0.22) / 2, 0]} t={[0.1, y + 0.22, 0.9]} cor={corM} raio={0.015} rug={0.9} />}
            {/* água da poça, com um trecho mais claro onde a cascata cai */}
            <mesh position={[x, y - 0.16, 0]}><boxGeometry args={[LP - 0.02, 0.32, ZI - 0.02]} /><meshBasicMaterial color={AGUA_POCO[i]} transparent opacity={0.88} depthWrite={false} /></mesh>
            <mesh position={[x - LP / 2 + 0.2, y + 0.006, 0]}><boxGeometry args={[0.36, 0.01, ZI - 0.1]} /><meshBasicMaterial color="#cfeeff" transparent opacity={0.55} depthWrite={false} /></mesh>
            {[0, 1, 2].map((q) => (
              <mesh key={q} position={[x + (q - 1) * 0.38 + 0.12 * Math.sin(t * 0.9 + q + i), y + 0.012, (q - 1) * 0.17]} rotation={[-Math.PI / 2, 0, 0.6 * q]} scale={[0.14, 0.03, 1]}>
                <planeGeometry args={[1, 1]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.35 + 0.35 * Math.sin(t * 4 + q * 2 + i * 1.7)} depthWrite={false} />
              </mesh>
            ))}
            {/* lábio da água sobre a soleira e a cascata até a poça de baixo */}
            <mesh position={[xw, y - 0.045, 0]}><boxGeometry args={[0.12, 0.05, 0.6]} /><meshBasicMaterial color="#8fd0ff" transparent opacity={0.9} depthWrite={false} /></mesh>
            <mesh position={[xf, y - alt / 2 - 0.04, 0]}><boxGeometry args={[0.04, alt - 0.06, 0.6]} /><meshBasicMaterial color="#bfe6ff" transparent opacity={0.8} depthWrite={false} /></mesh>
            {[0, 1, 2, 3].map((q) => {
              const ph = (t * 1.6 + q * 0.27 + i * 0.13) % 1;
              return <mesh key={q} position={[xf + 0.035, y - 0.06 - ph * (alt - 0.08), (q - 1.5) * 0.14]} scale={[0.018, 0.1, 0.05]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.7 * (1 - 0.5 * ph)} depthWrite={false} /></mesh>;
            })}
            {/* espuma no pé da cascata */}
            {[0, 1, 2, 3, 4, 5, 6].map((q) => (
              <mesh key={q} position={[xf + 0.1 + 0.06 * Math.sin(t * 3 + q), base + 0.04 + 0.03 * Math.abs(Math.sin(t * 4 + q * 1.3)), (q - 3) * 0.085]} scale={0.055}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#f4fbff" transparent opacity={0.9} depthWrite={false} /></mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

type Estado = { p: V; rot: number; incl: number; resp: { p: V; u: number }[] };

/** Posição do peixe em `s` unidades (0..NP): cada unidade = salto para a poça k e nado até a ponta de cima dela. */
const estadoPeixe = (s: number, t: number, z: number): Estado => {
  const k = Math.min(NP - 1, Math.max(0, Math.floor(s)));
  const u = s >= NP ? 1 : s - Math.floor(s);
  const J = 0.42;
  const yIni = k === 0 ? -0.2 : ys(k - 1) - 0.09;
  const xIni = k === 0 ? XL(0) + 1.5 : XS(k - 1);
  const zIni = k === 0 ? z - 0.35 : z;
  const yFim = ys(k) - 0.09;
  const xFim = XL(k);
  const resp: { p: V; u: number }[] = [];
  const topoA = k === 0 ? -0.05 : ys(k - 1);
  if (u < 0.3) resp.push({ p: [xIni, topoA + 0.02, POCO_Z + zIni], u: u / 0.3 });
  if (u > J - 0.04 && u < J + 0.3) resp.push({ p: [xFim, ys(k) + 0.02, POCO_Z + z], u: (u - (J - 0.04)) / 0.34 });
  if (u < J) {
    const f = u / J;
    const altura = ALT + (k === 0 ? 0.1 : 0);
    const x = lerp(xIni, xFim, f);
    const y = lerp(yIni, yFim, f) + 4 * altura * f * (1 - f);
    const dy = yFim - yIni + 4 * altura * (1 - 2 * f);
    const dx = Math.abs(xFim - xIni);
    return { p: [x, y, POCO_Z + lerp(zIni, z, f)], rot: Math.PI, incl: Math.atan2(dy, dx), resp };
  }
  const g = (u - J) / (1 - J);
  const x = lerp(xFim, XS(k), suave(g));
  return { p: [x, yFim + 0.025 * Math.sin(t * 6 + k), POCO_Z + z + 0.04 * Math.sin(t * 3 + k)], rot: Math.PI + 0.12 * Math.sin(t * 7 + k), incl: 0.06 * Math.sin(t * 6 + 1), resp };
};

const EXTRAS: { ph: number; z: number; cor: string; v: number }[] = [
  { ph: 0.0, z: -0.1, cor: "#d9e5ec", v: 0.78 },
  { ph: 2.1, z: 0.12, cor: "#ffae2b", v: 0.66 },
];
const CICLO = NP + 0.9;

/** O peixe bate na parede (`tenta` 0..1) e depois sobe a escada, pulando de poça em poça (`sobe` 0..1); outros dois sobem sem parar quando a escada está pronta (`k`). */
export const PeixeEscada: React.FC<{ tenta: number; sobe: number; t: number; k?: number }> = ({ tenta, sobe, t, k = 0 }) => {
  const lista: { e: Estado; cor: string; esc: number; vis: number }[] = [];
  if (sobe > 0.001 && sobe < 0.9995) lista.push({ e: estadoPeixe(clamp01(sobe) * NP, t, 0.0), cor: "#ff8a1f", esc: 0.95, vis: 1 });
  if (k > 0.99) {
    EXTRAS.forEach((x) => {
      const s = (t * x.v + x.ph) % CICLO;
      const vis = clamp01(s * 6) * clamp01((CICLO - s) * 6);
      if (vis > 0.01) lista.push({ e: estadoPeixe(Math.min(s, NP), t, x.z), cor: x.cor, esc: 0.85, vis });
    });
  }
  const tentando = tenta > 0.01 && sobe <= 0.001;
  const hop = Math.abs(Math.sin(t * 3.1));
  return (
    <group>
      {lista.map((q, i) => (
        <React.Fragment key={i}>
          <Peixe p={q.e.p} rot={q.e.rot} esc={q.esc * q.vis} cor={q.cor} incl={q.e.incl} />
          {q.e.resp.map((r, j) => <Respingo key={j} p={r.p} u={r.u} esc={0.9} />)}
        </React.Fragment>
      ))}
      {tentando && <Peixe p={[xFace(0.4) + 0.4 - hop * 0.12, AGUA_Y + 0.12 + hop * 0.75, POCO_Z - 0.6]} rot={Math.PI} esc={0.7} incl={0.9 * Math.sin(t * 3.1 + 1)} />}
    </group>
  );
};

/* ---------- transformador e submarino ---------- */

/** Transformador de subestação: tanque, aletas, três isoladores e os cabos até a casa de força. */
export const Transformador: React.FC<{ k: number; x: number; z: number }> = ({ k, x, z }) => {
  if (k <= 0.02) return null;
  return (
    <group position={[x, 0, z]} scale={suave(k)}>
      <Caixa p={[0, 0.08, 0]} t={[1.5, 0.16, 1.1]} cor="#a5a9ab" raio={0.02} rug={0.85} />
      <Caixa p={[0, 0.7, 0]} t={[1.0, 1.1, 0.8]} cor="#5f8f78" raio={0.05} rug={0.6} met={0.3} />
      {[-0.6, 0.6].map((s) => Array.from({ length: 5 }).map((_, i) => <Caixa key={`${s}${i}`} p={[s * 0.88 * 0.95 * (s > 0 ? 1 : 1), 0.7, -0.3 + i * 0.15]} t={[0.1, 0.9, 0.05]} cor="#4f7f68" raio={0.01} sombra={false} />))}
      {[-0.3, 0, 0.3].map((dx, i) => (
        <group key={i} position={[dx, 1.25, 0]}>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.05, 0.08, 0.4, 10]} /><meshStandardMaterial color="#e8e3d0" /></mesh>
          {[0.1, 0.2, 0.3].map((y) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.11, 0.11, 0.03, 10]} /><meshStandardMaterial color="#e8e3d0" /></mesh>)}
          <mesh position={[0, 0.42, 0]}><sphereGeometry args={[0.05, 8, 6]} /><meshStandardMaterial color="#c9ccd0" metalness={0.6} /></mesh>
        </group>
      ))}
      <Liga a={[-0.3, 1.7, 0]} b={[-1.6, 1.5, 0]} w={0.04} cil cor="#2b2f33" />
      <Liga a={[0.3, 1.7, 0]} b={[1.3, 3.4, 0.2]} w={0.03} cil cor="#2b2f33" />
      <Halo p={[0, 1.4, 0.5]} r={1.0} cor="#9fdcff" op={0.18} />
    </group>
  );
};

/** Submarino de desenho animado passando no rio (silhueta). `u` 0..1 cruza x de -5,2 a 0,6. */
export const Submarino: React.FC<{ u: number; z: number }> = ({ u, z }) => {
  if (u <= 0.01 || u >= 0.99) return null;
  const x = lerp(-5.4, 0.8, u);
  return (
    <group position={[x, AGUA_Y + 0.1, z]} scale={1.8}>
      <mesh scale={[0.95, 0.32, 0.32]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color="#f2c230" roughness={0.5} /></mesh>
      <Caixa p={[0.1, 0.38, 0]} t={[0.3, 0.3, 0.2]} cor="#e0a91e" raio={0.05} />
      <Liga a={[0.15, 0.5, 0]} b={[0.15, 0.78, 0]} w={0.03} cil cor="#555b66" />
      <Liga a={[0.15, 0.78, 0]} b={[0.32, 0.78, 0]} w={0.03} cil cor="#555b66" />
      {[0.4, 0.0, -0.4].map((dx, i) => <mesh key={i} position={[dx, 0.02, 0.3]} scale={0.07}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#cfeaff" /></mesh>)}
      <mesh position={[-0.98, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.18, 0.3, 4]} /><meshStandardMaterial color="#e0a91e" /></mesh>
      <mesh position={[-1.02, 0, 0]} rotation={[0, 0, 0]} scale={[0.04, 0.3, 0.03]}><sphereGeometry args={[1, 6, 6]} /><meshStandardMaterial color="#555b66" /></mesh>
    </group>
  );
};

void rnd;
