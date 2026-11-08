import React from "react";
import * as THREE from "three";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { Caixa } from "../../../src/v3d/qualidade";
import { Halo, Liga, mistura, Seta, Texto3D, V } from "./cozinha-base";

// Peças extras do cenário do elevador (episódio 14): escadaria com TV, bandeirinhas, TV do jogo, efeito Looney Tunes, controlador e botões,
// sensor da porta, lupa do freio, fosso com amortecedor, silhueta de raio.

export const COR_TIME = "#1fa05a";
const IRON = "#3d4148";
const STEEL = "#9aa3ae";

/* ---------- bandeirinhas e TV ---------- */

export const Bandeirinhas: React.FC<{ a: V; b: V; n?: number; sag?: number }> = ({ a, b, n = 14, sag = 0.4 }) => {
  const pt = (u: number): V => [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - sag * Math.sin(u * Math.PI), lerp(a[2], b[2], u)];
  return (
    <group>
      {Array.from({ length: 12 }).map((_, i) => <Liga key={i} a={pt(i / 12)} b={pt((i + 1) / 12)} w={0.018} cil cor="#555a63" />)}
      {Array.from({ length: n }).map((_, i) => {
        const p = pt((i + 0.5) / n);
        return <mesh key={i} position={[p[0], p[1] - 0.14, p[2]]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.14, 0.32, 3]} /><meshStandardMaterial color={[COR_TIME, "#f2c230", "#2f6fb5", "#ffffff"][i % 4]} roughness={0.8} side={THREE.DoubleSide} /></mesh>;
      })}
    </group>
  );
};

/** TV do jogo: campo verde, jogadores e, no gol, o texto GOOOL pulsando. */
export const TVJogo: React.FC<{ p: V; w?: number; gol?: number; t: number; rot?: number }> = ({ p, w = 1.0, gol = 0, t, rot = 0 }) => {
  const h = w * 0.58;
  const pisca = 0.7 + 0.3 * Math.sin(t * 14);
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Caixa p={[0, 0, 0]} t={[w, h, 0.1]} cor="#1c1f24" raio={0.02} />
      <mesh position={[0, 0, 0.055]}><planeGeometry args={[w * 0.92, h * 0.86]} /><meshBasicMaterial color={gol > 0.3 ? mistura("#2f9e4a", "#ffffff", 0.25 * pisca) : "#2f9e4a"} /></mesh>
      {[-0.3, 0, 0.3].map((x, i) => <mesh key={i} position={[x * w, 0, 0.058]}><planeGeometry args={[0.012 * w, h * 0.8]} /><meshBasicMaterial color="#cfe9d2" /></mesh>)}
      {[[-0.25, 0.1, "#e03a2a"], [-0.1, -0.15, "#e03a2a"], [0.2, 0.05, "#2f6fb5"], [0.32, -0.1, "#2f6fb5"], [0.05, 0, "#ffffff"]].map(([x, y, c], i) => (
        <mesh key={i} position={[(x as number) * w + (gol > 0.3 ? 0.03 * Math.sin(t * 9 + i * 2) : 0.018 * Math.sin(t * 2.3 + i * 2.1)), (y as number) * h, 0.062]}><circleGeometry args={[i === 4 ? 0.018 * w : 0.03 * w, 10]} /><meshBasicMaterial color={c as string} /></mesh>
      ))}
      <Caixa p={[0, -h / 2 - 0.05, 0.02]} t={[w * 0.35, 0.05, 0.2]} cor={IRON} raio={0.01} />
      <Halo p={[0, 0, 0.3]} r={w * 1.2} cor="#9dffb0" op={0.28 + 0.27 * gol * pisca} />
      {gol > 0.05 && <Texto3D texto="GOOOL!" p={[0, h * 0.62, 0.22]} h={0.17 * w * (0.9 + 0.15 * Math.sin(t * 12))} cor="#fff27a" escala={suave(gol)} />}
    </group>
  );
};

/* ---------- escadaria em zigue-zague ---------- */

export const STORY = 3.0;
const NP = 9; // degraus por lance
const XA = 1.5; // lance vai de -XA a +XA
const Z0 = 0.0;

const Lance: React.FC<{ y0: number; dir: 1 | -1; cor: string }> = ({ y0, dir, cor }) => {
  const dx = (2 * XA) / NP;
  const rise = (STORY / 2) / NP;
  return (
    <group>
      {Array.from({ length: NP }).map((_, i) => {
        const x = dir * (-XA + (i + 0.5) * dx);
        const top = y0 + (i + 1) * rise;
        return <mesh key={i} position={[x, top - 0.06, Z0]} castShadow receiveShadow><boxGeometry args={[dx * 0.99, 0.12, 1.05]} /><meshStandardMaterial color={i % 2 ? cor : mistura(cor, "#ffffff", 0.12)} roughness={0.8} /></mesh>;
      })}
      <mesh position={[0, y0 + STORY / 4 - 0.12, Z0]} rotation={[0, 0, dir * Math.atan2(rise * NP, 2 * XA)]} castShadow><boxGeometry args={[Math.hypot(2 * XA, STORY / 2) + 0.1, 0.16, 1.0]} /><meshStandardMaterial color="#4c5560" roughness={0.85} /></mesh>
      {/* corrimão na frente */}
      <Liga a={[dir * -XA, y0 + 0.95, 0.56]} b={[dir * XA, y0 + STORY / 2 + 0.95, 0.56]} w={0.06} cil cor="#2a2d33" />
      {[0, 3, 6, 9].map((i) => {
        const x = dir * (-XA + (i / NP) * 2 * XA);
        const yb = y0 + (i / NP) * (STORY / 2);
        return <Liga key={i} a={[x, yb, 0.56]} b={[x, yb + 0.95, 0.56]} w={0.035} cil cor="#2a2d33" />;
      })}
    </group>
  );
};

/** Prédio em corte com a escada em zigue-zague: `n` andares de 3 m; no décimo (índice 9) a janela com a TV. */
export const Escadaria: React.FC<{ n?: number; gol: number; t: number }> = ({ n = 14, gol, t }) => {
  const alto = n * STORY;
  const cores = ["#8a93a0", "#7d8794"];
  return (
    <group>
      {/* chão da rua e parede do fundo */}
      <mesh position={[0, 0, 3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[20, 12]} /><meshStandardMaterial color="#5f646c" roughness={0.95} /></mesh>
      <mesh position={[0, alto / 2, -1.0]}><planeGeometry args={[7.4, alto]} /><meshStandardMaterial color="#d9d2c0" roughness={0.95} /></mesh>
      {[-3.6, 3.6].map((x) => <mesh key={x} position={[x, alto / 2, 0]}><boxGeometry args={[0.15, alto, 2.0]} /><meshStandardMaterial color="#b9b19f" roughness={0.9} /></mesh>)}
      {Array.from({ length: n }).map((_, s) => {
        const y0 = s * STORY;
        const c = cores[s % 2];
        return (
          <group key={s}>
            <Lance y0={y0} dir={1} cor={c} />
            <Lance y0={y0 + STORY / 2} dir={-1} cor={c} />
            {/* patamares: esquerdo (começo do andar) e direito (meio) */}
            <mesh position={[-2.5, y0 - 0.06, Z0]} castShadow receiveShadow><boxGeometry args={[2.0, 0.14, 1.9]} /><meshStandardMaterial color="#9aa0a8" roughness={0.9} /></mesh>
            <mesh position={[2.5, y0 + STORY / 2 - 0.06, Z0]} castShadow receiveShadow><boxGeometry args={[2.0, 0.14, 1.9]} /><meshStandardMaterial color="#9aa0a8" roughness={0.9} /></mesh>
            {/* placa do andar */}
            <mesh position={[-3.0, y0 + 1.7, -0.96]}><planeGeometry args={[0.7, 0.5]} /><meshStandardMaterial color="#2f4a63" roughness={0.6} /></mesh>
            <Texto3D texto={String(s + 1)} p={[-3.0, y0 + 1.7, -0.9]} h={0.34} cor="#ffffff" />
            {s !== n - 1 && <mesh position={[-2.2, y0 + 1.0, -0.97]}><planeGeometry args={[0.9, 2.0]} /><meshStandardMaterial color="#6a4a32" roughness={0.8} /></mesh>}
          </group>
        );
      })}
      {/* janela do apê (último andar) com a TV ligada */}
      <group position={[-2.4, (n - 1) * STORY + 1.45, -0.97]}>
        <mesh><planeGeometry args={[1.8, 1.4]} /><meshStandardMaterial color="#ffe3a8" emissive="#ffcf7a" emissiveIntensity={0.7} /></mesh>
        <Caixa p={[0, 0, 0.03]} t={[1.9, 0.08, 0.06]} cor="#4a3622" sombra={false} />
        <Caixa p={[0, 0.74, 0.03]} t={[1.9, 0.08, 0.06]} cor="#4a3622" sombra={false} />
        <Caixa p={[-0.92, 0, 0.03]} t={[0.08, 1.5, 0.06]} cor="#4a3622" sombra={false} />
        <Caixa p={[0.92, 0, 0.03]} t={[0.08, 1.5, 0.06]} cor="#4a3622" sombra={false} />
        <TVJogo p={[0, -0.05, 0.12]} w={1.3} gol={gol} t={t} />
      </group>
      <Halo p={[-2.4, (n - 1) * STORY + 1.5, -0.7]} r={2.6} cor="#ffd89a" op={0.4 + 0.25 * gol} />
      <group position={[-2.4, (n - 1) * STORY + 2.75, -0.9]}>
        <mesh><planeGeometry args={[1.5, 0.75]} /><meshStandardMaterial color="#e03a2a" roughness={0.6} /></mesh>
        <Texto3D texto="14º" p={[0, 0, 0.06]} h={0.55} cor="#ffffff" />
      </group>
      {/* placa grande do 14º no térreo */}
      <group position={[0.4, 3.9, -0.93]}>
        <mesh><planeGeometry args={[2.6, 1.5]} /><meshStandardMaterial color="#e03a2a" roughness={0.6} /></mesh>
        <Texto3D texto="14º" p={[0, 0.12, 0.08]} h={1.0} cor="#ffffff" />
      </group>
      {/* relógio de parede e bandeirinhas */}
      <group position={[1.5, 1.2 + 6 * STORY, -0.95]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.38, 0.38, 0.06, 24]} /><meshStandardMaterial color="#f4efe2" /></mesh>
        <Liga a={[0, 0, 0.04]} b={[0.02, 0.24, 0.04]} w={0.03} cil cor="#222" />
        <Liga a={[0, 0, 0.04]} b={[0.17 * Math.cos(t * 0.5), 0.17 * Math.sin(t * 0.5), 0.04]} w={0.03} cil cor="#222" />
      </group>
      {[0, 3, 6, 9, 12].map((k) => <Bandeirinhas key={k} a={[-3.5, k * STORY + 2.8, 0.2]} b={[3.5, k * STORY + 2.8, 0.2]} n={16} sag={0.35} />)}
    </group>
  );
};

/** Ponto do caminho do Zeca na escada (para o gerador e para o cenário): s em 0..1 do caminho todo (até o patamar do décimo). */
export const caminhoEscada = (s: number, andares = 9): { x: number; y: number; rot: number } => {
  // vértices: cada andar = lance A (esq→dir), patamar dir, lance B (dir→esq), patamar esq
  const P: [number, number][] = [[-2.6, 0], [-XA, 0]];
  for (let a = 0; a < andares; a++) {
    const y0 = a * STORY;
    P.push([XA, y0 + STORY / 2], [2.5, y0 + STORY / 2], [XA, y0 + STORY / 2], [-XA, y0 + STORY], [-2.5, y0 + STORY], [-XA, y0 + STORY]);
  }
  P.pop();
  P.push([-2.0, andares * STORY]);
  const L = P.slice(1).map((q, i) => Math.hypot(q[0] - P[i][0], q[1] - P[i][1]));
  const tot = L.reduce((a, b) => a + b, 0);
  let d = clamp01(s) * tot;
  for (let i = 0; i < L.length; i++) {
    if (d <= L[i] || i === L.length - 1) {
      const u = L[i] > 0 ? Math.min(1, d / L[i]) : 0;
      const dx = P[i + 1][0] - P[i][0];
      return { x: lerp(P[i][0], P[i + 1][0], u), y: lerp(P[i][1], P[i + 1][1], u), rot: dx >= 0 ? 1.2 : -1.2 };
    }
    d -= L[i];
  }
  return { x: 0, y: 0, rot: 0 };
};

/* ---------- efeito de impacto e braço inchado (Looney Tunes) ---------- */

const useEstrela = () =>
  React.useMemo(() => {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.42 : 1;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    sh.closePath();
    return new THREE.ShapeGeometry(sh);
  }, []);

/** Raios, linhas de choque e estrelas girando em volta do ponto `p` (bem cartoon). */
export const Impacto: React.FC<{ p: V; k: number; t: number; r?: number }> = ({ p, k, t, r = 0.5 }) => {
  const estrela = useEstrela();
  if (k <= 0.02) return null;
  const ph = (t * 2.6) % 1;
  return (
    <group position={p}>
      <group rotation={[0, 0, t * 4]}>
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const pulso = 0.7 + 0.3 * Math.sin(t * 22 + i * 1.7);
          const lon = i % 2 ? 1.0 : 1.5;
          return <Liga key={i} a={[Math.cos(a) * r * 0.7 * pulso, Math.sin(a) * r * 0.7 * pulso, 0.12]} b={[Math.cos(a) * r * lon * 1.25 * pulso, Math.sin(a) * r * lon * 1.25 * pulso, 0.12]} w={0.045} cil cor={i % 2 ? "#ffd23f" : "#ff3b30"} basico />;
        })}
      </group>
      {[0, 0.5].map((o) => {
        const q = (ph + o) % 1;
        return <mesh key={o} position={[0, 0, 0.1]}><torusGeometry args={[r * (0.5 + 1.6 * q), 0.03, 6, 40]} /><meshBasicMaterial color="#fff27a" transparent opacity={0.9 * (1 - q)} /></mesh>;
      })}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2 + t * 3.2;
        const rr = r * (1.55 + 0.25 * Math.sin(t * 7 + i));
        return (
          <mesh key={i} geometry={estrela} position={[Math.cos(a) * rr, Math.sin(a) * rr * 0.8, 0.16]} rotation={[0, 0, t * 5 + i]} scale={0.2 * (0.8 + 0.35 * Math.sin(t * 9 + i))}>
            <meshBasicMaterial color={i % 2 ? "#ffe14a" : "#ffffff"} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Mão e antebraço de desenho animado que incham e murcham em pulsos (1x a 3x), vermelhos, no lugar da mão presa.
 *  `dir` = vetor (unitário) da mão para o cotovelo; os dedos apontam para o lado contrário. */
export const BracoInchado: React.FC<{ p: V; dir: V; k: number; t: number; freq?: number }> = ({ p, dir, k, t, freq = 2.6 }) => {
  const q = React.useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-dir[0], -dir[1], -dir[2]).normalize()), [dir]);
  if (k <= 0.02) return null;
  const ph = (t * freq) % 1;
  const pulso = Math.pow(0.5 - 0.5 * Math.cos(ph * Math.PI * 2), 0.75);
  const s = 1 + 2.0 * pulso * suave(k * 3);
  const cor = mistura("#c98f63", "#ff1f12", Math.min(1, 0.3 + 0.7 * pulso));
  const mat = <meshStandardMaterial color={cor} roughness={0.45} emissive="#ff1a0a" emissiveIntensity={0.15 + 0.7 * pulso} />;
  return (
    <group position={p} quaternion={q} scale={s}>
      <mesh scale={[1.05, 0.85, 1]}><sphereGeometry args={[0.13, 18, 14]} />{mat}</mesh>
      {[-0.06, -0.02, 0.02, 0.06].map((x, i) => (
        <mesh key={i} position={[x * 1.4, 0.005 * (i % 2), 0.15 - 0.012 * Math.abs(i - 1.5)]} scale={[0.6, 0.6, 1.5]}><sphereGeometry args={[0.05, 10, 8]} />{mat}</mesh>
      ))}
      <mesh position={[-0.14, 0, 0.05]} rotation={[0, 0.6, 0]} scale={[0.6, 0.6, 1.3]}><sphereGeometry args={[0.055, 10, 8]} />{mat}</mesh>
      <mesh position={[0, 0, -0.17]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.055, 0.075, 0.3, 18]} />{mat}</mesh>
      <Halo p={[0, 0, 0.02]} r={0.7} cor="#ff3b20" op={0.55 * pulso} />
    </group>
  );
};

/** Mão inchada simples (mantida por compatibilidade). */
export const MaoInchada: React.FC<{ p: V; k: number; t: number }> = ({ p, k, t }) => <BracoInchado p={p} dir={[0, 0, -1]} k={k} t={t} />;

/* ---------- controlador, botões, sensor ---------- */

export const Controlador: React.FC<{ p: V; k: number; t: number }> = ({ p, k, t }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p} scale={suave(k)}>
      <Caixa p={[0, 0, 0]} t={[0.75, 0.95, 0.4]} cor="#cfd5dc" met={0.4} rug={0.5} raio={0.03} />
      <mesh position={[0, 0.22, 0.21]}><planeGeometry args={[0.55, 0.25]} /><meshBasicMaterial color="#10261a" /></mesh>
      <Texto3D texto="2" p={[0, 0.22, 0.24]} h={0.18} cor="#6dff9a" />
      {[0, 1, 2, 3].map((i) => <mesh key={i} position={[-0.24 + i * 0.16, -0.05, 0.21]}><circleGeometry args={[0.04, 12]} /><meshBasicMaterial color={Math.sin(t * 5 + i * 1.7) > 0 ? ["#3ed36f", "#ffd23f", "#4db4ff", "#ff6a5a"][i] : "#2a3038"} /></mesh>)}
      {[0, 1, 2].map((i) => <mesh key={i} position={[-0.24 + i * 0.24, -0.28, 0.21]}><boxGeometry args={[0.16, 0.08, 0.02]} /><meshBasicMaterial color="#59616b" /></mesh>)}
    </group>
  );
};

/** Pedestal com botão de chamada num andar; `lit` 0..1 acende. */
export const Botao: React.FC<{ p: V; lit: number; t: number }> = ({ p, lit, t }) => (
  <group position={p}>
    <Caixa p={[0, 0.55, 0]} t={[0.18, 1.1, 0.16]} cor="#59616b" raio={0.02} />
    <Caixa p={[0, 1.02, 0.1]} t={[0.14, 0.3, 0.05]} cor="#dfe3e8" raio={0.01} sombra={false} />
    <mesh position={[0, 1.07, 0.14]}><circleGeometry args={[0.04, 14]} /><meshBasicMaterial color={lit > 0.5 ? "#ffd23f" : "#3a4048"} /></mesh>
    <mesh position={[0, 0.97, 0.14]}><circleGeometry args={[0.04, 14]} /><meshBasicMaterial color="#59616b" /></mesh>
    {lit > 0.5 && <Halo p={[0, 1.07, 0.25]} r={0.45} cor="#ffd23f" op={0.7 * (0.7 + 0.3 * Math.sin(t * 10))} />}
  </group>
);

/** Sensor da porta: dois emissores nos batentes e três feixes vermelhos; `corte` 0..1 = algo no meio (feixes acendem forte). */
export const Sensor: React.FC<{ k: number; corte: number; t: number }> = ({ k, corte, t }) => {
  if (k <= 0.02) return null;
  const ys = [0.55, 1.05, 1.55];
  return (
    <group scale={[1, suave(k), 1]}>
      {ys.map((y) => (
        <group key={y}>
          {[-1, 1].map((s) => <Caixa key={s} p={[s * 0.47, y, 0.77]} t={[0.07, 0.07, 0.07]} cor="#1c1f24" raio={0.01} sombra={false} />)}
          <Liga a={[-0.44, y, 0.8]} b={[0.44, y, 0.8]} w={0.012 + 0.012 * corte} cil cor={corte > 0.3 ? "#ff1a1a" : "#ff6a6a"} op={corte > 0.3 ? 1 : 0.65} basico />
        </group>
      ))}
      {corte > 0.3 && <Halo p={[0, 1.05, 0.85]} r={0.9} cor="#ff3b30" op={0.55 * (0.7 + 0.3 * Math.sin(t * 16))} />}
    </group>
  );
};

/* ---------- lupa do freio ---------- */

/** Lupa do freio: disco no eixo, duas sapatas, mola e bobina. `solto` 1 = energizado (bobina acesa, sapatas afastadas); 0 = apertado pela mola. */
export const LupaFreio: React.FC<{ r: number; solto: number; luz: number; t: number }> = ({ r, solto, luz, t }) => {
  const s = suave(solto);
  const gap = lerp(0.0, 0.2, s) * r;
  const pad = 0.34 * r;
  const energizado = s > 0.5;
  return (
    <group>
      <mesh position={[0, 0, 0.02]}><planeGeometry args={[r * 1.8, r * 1.8]} /><meshBasicMaterial color="#e9eef3" /></mesh>
      {/* eixo e disco (visto de lado) */}
      <mesh position={[0, 0, 0.03]}><planeGeometry args={[r * 1.7, 0.1 * r]} /><meshBasicMaterial color="#8d949e" /></mesh>
      <mesh position={[0, 0, 0.04]}><planeGeometry args={[0.14 * r, 1.0 * r]} /><meshBasicMaterial color="#6b7480" /></mesh>
      {[-1, 1].map((sx) => (
        <group key={sx}>
          {/* sapata */}
          <mesh position={[sx * (0.07 * r + gap + pad / 2 * 0.6), 0, 0.05]}><planeGeometry args={[0.2 * r, 0.8 * r]} /><meshBasicMaterial color="#c9540f" /></mesh>
          <mesh position={[sx * (0.07 * r + gap + pad / 2 * 0.6 + 0.18 * r), 0, 0.05]}><planeGeometry args={[0.16 * r, 0.9 * r]} /><meshBasicMaterial color="#59616b" /></mesh>
          {/* mola (zigue-zague) empurrando a sapata contra o disco */}
          {Array.from({ length: 6 }).map((_, i) => {
            const x0 = sx * (0.07 * r + gap + pad / 2 * 0.6 + 0.26 * r);
            const x1 = sx * 0.78 * r;
            const y = (i % 2 ? 1 : -1) * 0.1 * r;
            const ya = ((i + 1) % 2 ? 1 : -1) * 0.1 * r;
            const ax = lerp(x0, x1, i / 6);
            const bx = lerp(x0, x1, (i + 1) / 6);
            return <Liga key={i} a={[ax, y + 0.3 * r, 0.06]} b={[bx, ya + 0.3 * r, 0.06]} w={0.035 * r} cil cor="#f08a24" basico />;
          })}
          {/* bobina */}
          <mesh position={[sx * 0.78 * r, -0.25 * r, 0.05]}><planeGeometry args={[0.22 * r, 0.5 * r]} /><meshBasicMaterial color={energizado ? "#ffd23f" : "#8a7a4a"} /></mesh>
        </group>
      ))}
      {/* sinal de luz: lâmpada acesa/apagada */}
      <mesh position={[-0.6 * r, 0.62 * r, 0.06]}><circleGeometry args={[0.13 * r, 16]} /><meshBasicMaterial color={luz > 0.5 ? "#ffe27a" : "#454b54"} /></mesh>
      {luz <= 0.5 && <Seta a={[0.1 * r, 0.62 * r, 0.07]} b={[0.55 * r, 0.62 * r, 0.07]} cor="#ff5a45" w={0.03} />}
      {energizado && [-1, 1].map((sx) => <Seta key={sx} a={[sx * 0.2 * r, 0.45 * r, 0.07]} b={[sx * 0.45 * r, 0.45 * r, 0.07]} cor="#3ed36f" w={0.028} />)}
      {!energizado && [-1, 1].map((sx) => <Seta key={sx} a={[sx * 0.5 * r, 0.45 * r, 0.07]} b={[sx * 0.22 * r, 0.45 * r, 0.07]} cor="#ff6a3a" w={0.028} />)}
    </group>
  );
};

/* ---------- fosso e amortecedor ---------- */

/** Chão em corte com o fosso (poço fundo) e o amortecedor de mola no fundo. `k` 0..1 mostra o amortecedor; `comp` 0..1 o quanto está comprimido. */
export const Fosso: React.FC<{ k: number; comp: number; semAmort?: boolean }> = ({ k, comp, semAmort }) => {
  const prof = 1.3;
  return (
    <group>
      {/* paredes do fosso e fundo */}
      <mesh position={[0, -prof / 2, -0.95]}><planeGeometry args={[5.2, prof]} /><meshStandardMaterial color="#4a4f58" roughness={0.9} /></mesh>
      <mesh position={[0, -prof, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[5.2, 2.0]} /><meshStandardMaterial color="#2a2d33" roughness={0.95} /></mesh>
      {[-2.6, 2.6].map((x) => <mesh key={x} position={[x, -prof / 2, 0]}><boxGeometry args={[0.1, prof, 2.0]} /><meshStandardMaterial color="#8d949e" transparent opacity={0.45} /></mesh>)}
      {k > 0.02 && !semAmort && (
        <group scale={[1, 1, 1]}>
          {[-0.45, 0.45].map((x) => {
            const alt = lerp(0.95, 0.5, suave(comp));
            const voltas = 7;
            return (
              <group key={x} position={[x, -prof, 0]} scale={suave(k)}>
                <Caixa p={[0, 0.05, 0]} t={[0.7, 0.1, 0.7]} cor={IRON} raio={0.02} />
                {Array.from({ length: voltas * 8 }).map((_, i) => {
                  const a0 = (i / 8) * Math.PI * 2;
                  const a1 = ((i + 1) / 8) * Math.PI * 2;
                  const y0 = 0.1 + (alt * i) / (voltas * 8);
                  const y1 = 0.1 + (alt * (i + 1)) / (voltas * 8);
                  return <Liga key={i} a={[Math.cos(a0) * 0.22, y0, Math.sin(a0) * 0.22]} b={[Math.cos(a1) * 0.22, y1, Math.sin(a1) * 0.22]} w={0.05} cil cor="#f08a24" />;
                })}
                <Caixa p={[0, 0.1 + alt + 0.04, 0]} t={[0.6, 0.08, 0.6]} cor="#ffd23f" raio={0.02} />
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};

/* ---------- raio em silhueta ---------- */

export const Raio: React.FC<{ p: V; k: number; t: number; h?: number }> = ({ p, k, t, h = 4 }) => {
  if (k <= 0.02) return null;
  const sh = useShape();
  const flick = 0.75 + 0.25 * Math.sin(t * 25);
  return (
    <group position={p} scale={[h * 0.35 * suave(k), h * suave(k), 1]}>
      <mesh geometry={sh}><meshBasicMaterial color="#fff6a8" transparent opacity={flick} side={THREE.DoubleSide} /></mesh>
      <Halo p={[0, 0, -0.1]} r={0.9} cor="#fff2a0" op={0.6 * flick * k} />
    </group>
  );
};

const useShape = () =>
  React.useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0.15, 0.5);
    s.lineTo(-0.45, -0.05);
    s.lineTo(-0.05, -0.05);
    s.lineTo(-0.2, -0.5);
    s.lineTo(0.45, 0.08);
    s.lineTo(0.05, 0.08);
    s.lineTo(0.15, 0.5);
    return new THREE.ShapeGeometry(s);
  }, []);

/* ---------- trava nos trilhos (lupa) e fio do controlador ao motor ---------- */

/** Corte da trava: o trilho de aço no meio e duas garras (cunhas) que se fecham nele; `fecha` 0..1. */
export const LupaTrava: React.FC<{ r: number; fecha: number; t: number }> = ({ r, fecha, t }) => {
  const f = suave(fecha);
  const gap = lerp(0.42, 0.075, f) * r;
  return (
    <group>
      <mesh position={[0, 0, 0.02]}><planeGeometry args={[r * 1.8, r * 1.8]} /><meshBasicMaterial color="#e9eef3" /></mesh>
      <mesh position={[0, 0, 0.03]}><planeGeometry args={[0.15 * r, 1.8 * r]} /><meshBasicMaterial color="#9fb4cc" /></mesh>
      <mesh position={[0, 0, 0.034]}><planeGeometry args={[0.04 * r, 1.8 * r]} /><meshBasicMaterial color="#e6f0fb" /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (0.075 * r + gap + 0.17 * r), -0.1 * r, 0.05]}><planeGeometry args={[0.34 * r, 0.95 * r]} /><meshBasicMaterial color="#ffd23f" /></mesh>
          {Array.from({ length: 6 }).map((_, i) => <mesh key={i} position={[s * (0.075 * r + gap + 0.01 * r), -0.45 * r + i * 0.15 * r, 0.06]}><planeGeometry args={[0.05 * r, 0.06 * r]} /><meshBasicMaterial color="#59616b" /></mesh>)}
          <mesh position={[s * (0.075 * r + gap + 0.5 * r), -0.1 * r, 0.05]}><planeGeometry args={[0.16 * r, 0.95 * r]} /><meshBasicMaterial color="#59616b" /></mesh>
          <Seta a={[s * 0.82 * r, 0.62 * r, 0.07]} b={[s * (0.28 + 0.3 * (1 - f)) * r, 0.62 * r, 0.07]} cor="#ff6a3a" w={0.03} />
        </group>
      ))}
      {f > 0.85 && Array.from({ length: 6 }).map((_, i) => {
        const u = (t * 3 + i * 0.37) % 1;
        return <mesh key={i} position={[(i % 2 ? 1 : -1) * (0.12 + 0.3 * u) * r, (-0.45 - 0.2 * u + 0.2 * Math.sin(i)) * r, 0.08]} scale={0.04 * r * (1 - u)}><circleGeometry args={[1, 6]} /><meshBasicMaterial color="#ffb21f" /></mesh>;
      })}
    </group>
  );
};
