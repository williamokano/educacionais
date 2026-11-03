import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { Caixa, Mat, rnd } from "../../../src/v3d/qualidade";
import { Halo, Liga, mistura, Texto3D, V } from "./cozinha-base";
import { CY } from "./cozinha-fogao";

// Peças do cenário `microondas` (episódio 10): lupa, molécula de água, onda, magnetron, caixa de metal, porta com tela, mapa de cores,
// corte da comida, garfo, papel alumínio e fogão de indução. Tudo é função do tempo.

export const AZUL = "#3ea6ff";
export const LAR = "#ff8a2a";
export const METAL = "#b9c0c8";

/* ---------- lupa ---------- */

/** Lupa: disco de fundo, aro dourado e cabo; os filhos são desenhados no plano local (z = 0,02 em diante), raio R. */
export const Lupa: React.FC<{ p: V; R: number; k: number; fundo?: string; children?: React.ReactNode }> = ({ p, R, k, fundo = "#eaf6ff", children }) => {
  if (k <= 0.02) return null;
  const e = 1 - (1 - clamp01(k)) ** 3;
  return (
    <group position={p} scale={e}>
      <mesh position={[0, 0, 0]}><circleGeometry args={[R, 48]} /><meshStandardMaterial color={fundo} roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.005]}><torusGeometry args={[R, 0.016, 10, 56]} /><meshStandardMaterial color="#c9a227" metalness={0.7} roughness={0.35} /></mesh>
      <Liga a={[R * 0.72, -R * 0.72, 0]} b={[R * 1.22, -R * 1.22, 0]} w={0.05} cil cor="#5b3b22" />
      {children}
    </group>
  );
};

/** Linhas do zoom: do ponto da peça real até as bordas da lupa. */
export const LinhasZoom: React.FC<{ de: V; p: V; R: number; k: number }> = ({ de, p, R, k }) => {
  if (k <= 0.02) return null;
  const dx = p[0] - de[0];
  const dy = p[1] - de[1];
  const d = Math.hypot(dx, dy);
  const nx = -dy / d;
  const ny = dx / d;
  return (
    <group>
      {[-1, 1].map((s) => <Liga key={s} a={de} b={[p[0] + nx * R * s * 0.92, p[1] + ny * R * s * 0.92, p[2] - 0.01]} w={0.008} e={0.004} cor="#7a8794" op={0.7 * k} basico />)}
    </group>
  );
};

/* ---------- molécula de água ---------- */

/** azul → amarelo → laranja (sem passar por rosa) */
const esquenta = (k: number, a = "#4aa8ff", m = "#ffd24a", z = "#ff6a1a") => (k < 0.5 ? mistura(a, m, k * 2) : mistura(m, z, (k - 0.5) * 2));

export const Molecula: React.FC<{ p: V; r: number; ang: number; k: number; sinais?: number; vibra?: number }> = ({ p, r, ang, k, sinais = 0, vibra = 0 }) => {
  const a = (104.5 / 2) * (Math.PI / 180);
  const dist = r * 1.55;
  const corO = esquenta(k);
  const corH = esquenta(k, "#f4f8ff", "#fff0c0", "#ffd2a0");
  const rot = (x: number, y: number): [number, number] => [x * Math.cos(ang) - y * Math.sin(ang), x * Math.sin(ang) + y * Math.cos(ang)];
  const hs = [-1, 1].map((s) => rot(s * Math.sin(a) * dist, -Math.cos(a) * dist));
  const sh = vibra * 0.012;
  return (
    <group position={[p[0] + Math.sin(ang * 23) * sh, p[1] + Math.cos(ang * 19) * sh, p[2]]}>
      <mesh><sphereGeometry args={[r, 20, 14]} /><Mat cor={corO} verniz={0.7} rug={0.35} /></mesh>
      {hs.map(([x, y], i) => <mesh key={i} position={[x, y, 0]}><sphereGeometry args={[r * 0.58, 16, 12]} /><Mat cor={corH} verniz={0.7} rug={0.35} /></mesh>)}
      {sinais > 0.02 && (
        <group>
          {hs.map(([x, y], i) => <Texto3D key={i} texto="+" p={[x * 1.0, y * 1.0, r * 0.7]} h={r * 1.2} cor="#ff4a4a" escala={sinais} />)}
          <Texto3D texto="−" p={[0, r * 0.1, r * 1.05]} h={r * 1.4} cor="#3ea6ff" escala={sinais} />
        </group>
      )}
    </group>
  );
};

/** Termômetro dentro da lupa. */
export const TermoLupa: React.FC<{ p: V; h: number; nivel: number }> = ({ p, h, nivel }) => {
  const cor = esquenta(nivel, "#4aa8ff", "#ffb02a", "#ff3a1a");
  return (
    <group position={p}>
      <Caixa p={[0, 0, 0.02]} t={[0.05, h, 0.02]} cor="#f4f1ea" raio={0.02} />
      <Caixa p={[0, -h / 2 + (h * 0.9 * clamp01(nivel + 0.08)) / 2, 0.035]} t={[0.028, h * 0.9 * clamp01(nivel + 0.08), 0.02]} cor={cor} raio={0.012} emissivo={cor} brilho={0.3} />
      <mesh position={[0, -h / 2 - 0.02, 0.03]}><sphereGeometry args={[0.045, 14, 10]} /><meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={0.4} /></mesh>
    </group>
  );
};

/** Seta de campo: aponta para o lado conforme o sinal de `s` (-1..1). */
export const SetaCampo: React.FC<{ p: V; L: number; s: number }> = ({ p, L, s }) => {
  if (Math.abs(s) < 0.12) return null;
  return (
    <group>
      <mesh position={[p[0], p[1] + 0.07, p[2]]}><planeGeometry args={[0.01, 0.01]} /><meshBasicMaterial color="#ffd23f" /></mesh>
      <Liga a={[p[0] - L * s, p[1], p[2]]} b={[p[0] + L * s, p[1], p[2]]} w={0.02} cil cor="#ffd23f" basico />
      <group position={[p[0] + L * s, p[1], p[2]]} rotation={[0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2]}>
        <mesh><coneGeometry args={[0.05, 0.1, 10]} /><meshBasicMaterial color="#ffd23f" /></mesh>
      </group>
    </group>
  );
};

/** Onda senoidal feita de segmentos; `amp` pode cair ao passar de `xCorte` (a onda para na grade). */
export const OndaSeno: React.FC<{ p: V; x0: number; x1: number; amp: number; lambda: number; t: number; vel?: number; cor?: string; xCorte?: number; w?: number }> = ({ p, x0, x1, amp, lambda, t, vel = 1, cor = "#2f8cff", xCorte, w = 0.016 }) => {
  const n = 36;
  const pts: V[] = Array.from({ length: n + 1 }, (_, i) => {
    const x = lerp(x0, x1, i / n);
    const k = xCorte === undefined ? 1 : 1 - clamp01((x - xCorte) / 0.04);
    return [p[0] + x, p[1] + amp * k * Math.sin(((x - vel * t * lambda * 0.8) / lambda) * Math.PI * 2), p[2]];
  });
  return <group>{pts.slice(1).map((b, i) => <Liga key={i} a={pts[i]} b={b} w={w} cil cor={cor} basico />)}</group>;
};

/** Anéis de onda que se abrem a partir de um ponto. */
export const Aneis: React.FC<{ p: V; t: number; k: number; rmax: number; n?: number; vel?: number; cor?: string; espessura?: number }> = ({ p, t, k, rmax, n = 4, vel = 0.5, cor = "#3ea6ff", espessura = 0.008 }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p}>
      {Array.from({ length: n }).map((_, i) => {
        const u = (t * vel + i / n) % 1;
        const r = 0.04 + u * rmax;
        return <mesh key={i} scale={[r, r, 1]}><torusGeometry args={[1, espessura / Math.max(r, 0.05), 6, 64]} /><meshBasicMaterial color={cor} transparent opacity={(1 - u) * 0.9 * k} depthWrite={false} /></mesh>;
      })}
    </group>
  );
};

/* ---------- magnetron ---------- */

export const Magnetron: React.FC<{ p: V; k: number; t: number; tomada?: number; esc?: number; vert?: boolean }> = ({ p, k, t, tomada = 1, esc = 0.7, vert = false }) => {
  if (k <= 0.02) return null;
  const e = suave(k);
  const aletas = Array.from({ length: 7 });
  return (
    <group position={[p[0], p[1] + (1 - e) * 0.5, p[2]]} scale={e * esc} rotation={[0, 0, vert ? Math.PI / 2 : 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.032, 0.032, 0.11, 18]} /><Mat cor="#8d949c" met={0.8} rug={0.3} /></mesh>
      {aletas.map((_, i) => <mesh key={i} position={[-0.045 + i * 0.015, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.005, 20]} /><Mat cor="#c9ced6" met={0.7} rug={0.3} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.075, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, 0.03, 16]} /><Mat cor="#3b3f47" met={0.5} rug={0.4} /></mesh>)}
      <Caixa p={[-0.115, 0, 0]} t={[0.045, 0.1, 0.08]} cor="#e0493a" raio={0.01} />
      <Caixa p={[0.115, 0, 0]} t={[0.045, 0.1, 0.08]} cor="#3b82c4" raio={0.01} />
      <mesh position={[0, 0.062, 0]}><cylinderGeometry args={[0.008, 0.008, 0.05, 8]} /><Mat cor="#e5e8ec" met={0.8} rug={0.25} /></mesh>
      <mesh position={[0, 0.09, 0]}><sphereGeometry args={[0.014, 10, 8]} /><Mat cor="#e5e8ec" met={0.8} rug={0.25} /></mesh>
      <Halo p={[0, 0.09, 0.02]} r={0.09} cor="#7fc4ff" op={0.55 * (0.7 + 0.3 * Math.sin(t * 9))} />
      {tomada > 0.02 && !vert && (
        <group>
          <Liga a={[0.14, 0, 0]} b={[0.2, -0.02, 0]} w={0.012} cil cor="#23262c" />
        </group>
      )}
    </group>
  );
};

/** Fio do tubo até a tomada na parede; o x do tubo vem do mundo. */
export const FioTomada: React.FC<{ de: V; k: number }> = ({ de, k }) => {
  if (k <= 0.02) return null;
  const tomada: V = [1.0, CY + 0.2, -0.6];
  const pts: V[] = [de, [de[0] + 0.06, de[1] - 0.01, de[2] - 0.06], [tomada[0] - 0.12, tomada[1] - 0.03, -0.55], [tomada[0], tomada[1], -0.585]];
  return (
    <group>
      {pts.slice(1).map((b, i) => <Liga key={i} a={pts[i]} b={b} w={0.012} cil cor="#23262c" op={clamp01(k)} />)}
      <Caixa p={[tomada[0], tomada[1], -0.607]} t={[0.09, 0.09, 0.02]} cor="#f4f1ea" raio={0.01} />
      <Caixa p={[tomada[0], tomada[1], -0.59]} t={[0.05, 0.035, 0.02]} cor="#23262c" raio={0.006} />
    </group>
  );
};

/* ---------- caixa de metal, porta, corpo ---------- */

export const CX0 = 0.22; // cavidade: x 0,22..0,62 · y CY..CY+0,274 · z -0,36..0
export const CX1 = 0.62;
export const CH = 0.274;
export const CZ0 = -0.36;
export const CZ1 = 0.0;
export const CXM = (CX0 + CX1) / 2;

const CorteBox: React.FC<{ p: V; t: V; cor?: string }> = ({ p, t, cor = METAL }) => <Caixa p={p} t={t} cor={cor} raio={0.004} met={0.8} rug={0.3} />;

/** Caixa de metal vista em corte (o plano z = 0 é de vidro). `k` 0..1: as paredes fecham em volta; `frente` 0..1: placa lisa na frente (sem ver dentro). */
export const CaixaMetal: React.FC<{ k: number; frente: number }> = ({ k, frente }) => {
  if (k <= 0.02) return null;
  const e = 1 - suave(k);
  const w = CX1 - CX0;
  const d = CZ1 - CZ0;
  const th = 0.012;
  const zc = (CZ0 + CZ1) / 2;
  return (
    <group>
      <CorteBox p={[CXM, CY + th / 2, zc]} t={[w, th, d]} />
      <CorteBox p={[CXM, CY + CH - th / 2 + e * 0.5, zc]} t={[w, th, d]} />
      <CorteBox p={[CX0 + th / 2 - e * 0.5, CY + CH / 2, zc]} t={[th, CH, d]} />
      <CorteBox p={[CX1 - th / 2 + e * 0.5, CY + 0.05, zc]} t={[th, 0.10, d]} />
      <CorteBox p={[CX1 - th / 2 + e * 0.5, CY + 0.2 + (CH - 0.2) / 2, zc]} t={[th, CH - 0.2, d]} />
      <CorteBox p={[CXM, CY + CH / 2, CZ0 + th / 2 - e * 0.5]} t={[w, CH, th]} cor="#aab2bb" />
      {frente > 0.02 && <CorteBox p={[CXM, CY + CH / 2, CZ1 + 0.006]} t={[w, CH, 0.012 * frente]} cor="#9aa2ab" />}
      <mesh position={[CXM, CY + CH / 2, CZ1 + 0.002]}><planeGeometry args={[w, CH]} /><meshStandardMaterial color="#dff0ff" transparent opacity={0.06} depthWrite={false} /></mesh>
    </group>
  );
};

const telaTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(38,41,48,0.62)";
    g.fillRect(0, 0, 256, 256);
    g.globalCompositeOperation = "destination-out";
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.beginPath(); g.arc(x * 16 + 8, y * 16 + 8, 3.2, 0, 7); g.fill(); }
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2);
    return t;
  };
})();

/** Porta com a tela de furinhos: dobradiça à esquerda; `abre` 0..1 abre para a câmera. */
export const Porta: React.FC<{ k: number; abre: number; corpo: number }> = ({ k, abre, corpo }) => {
  if (k <= 0.02) return null;
  const w = CX1 - CX0;
  const tex = telaTex();
  const fr = mistura("#9aa2ab", "#1f2128", corpo);
  return (
    <group position={[CX0, CY, CZ1 + 0.012]} rotation={[0, -suave(abre) * 1.5, 0]} scale={[1, 1, 1]}>
      <group position={[(w / 2) * suave(k) + (1 - suave(k)) * 0.0, CH / 2, 0]} scale={[suave(k), 1, 1]}>
        <mesh><planeGeometry args={[w - 0.02, CH - 0.02]} /><meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <Caixa p={[0, CH / 2 - 0.008, 0]} t={[w, 0.016, 0.014]} cor={fr} raio={0.005} met={0.4} />
        <Caixa p={[0, -CH / 2 + 0.008, 0]} t={[w, 0.016, 0.014]} cor={fr} raio={0.005} met={0.4} />
        {[-1, 1].map((s) => <Caixa key={s} p={[s * (w / 2 - 0.008), 0, 0]} t={[0.016, CH, 0.014]} cor={fr} raio={0.005} met={0.4} />)}
        <Caixa p={[w / 2 - 0.03, 0, 0.02]} t={[0.014, 0.12, 0.016]} cor="#e5e8ec" raio={0.006} met={0.8} />
      </group>
    </group>
  );
};

/** Corpo: casca em volta da caixa, painel com display e botões à direita. */
/** Casca da carcaça: opaca, ou vidro com contorno (raio-X) quando `vidro` > 0. */
const Casca: React.FC<{ p: V; t: V; cor: string; vidro: number }> = ({ p, t, cor, vidro }) => {
  const arestas = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(t[0], t[1], t[2])), [t[0], t[1], t[2]]);
  if (vidro < 0.01) return <Caixa p={p} t={t} cor={cor} raio={0.012} rug={0.55} verniz={0.4} />;
  return (
    <group position={p}>
      <mesh><boxGeometry args={t} /><meshStandardMaterial color="#8a93a3" transparent opacity={1 - 0.86 * vidro} depthWrite={false} roughness={0.4} /></mesh>
      <lineSegments geometry={arestas}><lineBasicMaterial color="#e8eef6" transparent opacity={0.85 * vidro} /></lineSegments>
    </group>
  );
};

/** Compartimento das peças (ao lado da cavidade) em raio-X, antes de a carcaça aparecer. */
export const Compartimento: React.FC<{ k: number }> = ({ k }) => {
  if (k <= 0.02) return null;
  const X1 = 0.72;
  const zc = (CZ0 + CZ1) / 2 - 0.01;
  const d = CZ1 - CZ0 + 0.03;
  return <Casca p={[(CX1 + X1) / 2, CY + CH / 2, zc]} t={[X1 - CX1, CH + 0.026, d]} cor="#2a2d34" vidro={suave(k)} />;
};

export const Corpo: React.FC<{ k: number; tela: string; tex: THREE.Texture; vidro?: number }> = ({ k, tex, vidro = 0 }) => {
  if (k <= 0.02) return null;
  const e = suave(k);
  const cor = "#2a2d34";
  const X1 = 0.72;
  const zc = (CZ0 + CZ1) / 2 - 0.01;
  const d = CZ1 - CZ0 + 0.03;
  return (
    <group scale={[e, e, 1]} position={[CXM * (1 - e), CY * (1 - e), 0]}>
      <Casca p={[(CX0 - 0.012 + X1) / 2, CY + CH + 0.013, zc]} t={[X1 - CX0 + 0.012, 0.026, d]} cor={cor} vidro={vidro} />
      <Caixa p={[CX0 - 0.006, CY + CH / 2, zc]} t={[0.012, CH, d]} cor={cor} raio={0.006} rug={0.55} />
      <Casca p={[(CX1 + X1) / 2, CY + CH / 2, zc]} t={[X1 - CX1, CH + 0.026, d]} cor={cor} vidro={vidro} />
      <mesh position={[0.67, CY + 0.215, CZ1 + 0.002]}><planeGeometry args={[0.085, 0.036]} /><meshBasicMaterial map={tex} /></mesh>
      {[0, 1, 2].map((i) => <mesh key={i} position={[0.645 + i * 0.026, CY + 0.17, CZ1 + 0.006]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.009, 0.009, 0.008, 12]} /><Mat cor="#9aa2ab" met={0.5} /></mesh>)}
      <mesh position={[0.67, CY + 0.09, CZ1 + 0.01]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.034, 0.034, 0.016, 20]} /><Mat cor="#ff7a2e" met={0.3} rug={0.4} /></mesh>
      <mesh position={[0.67, CY + 0.115, CZ1 + 0.02]}><boxGeometry args={[0.006, 0.02, 0.004]} /><meshBasicMaterial color="#1b1d22" /></mesh>
    </group>
  );
};

/* ---------- prato giratório, tigela, sopa ---------- */

export const PX = CXM; // centro do prato e da tigela = centro da cavidade (0,42)
export const PZ = (CZ0 + CZ1) / 2; // -0,18: meio da profundidade
export const PY = CY + 0.03;

export const Prato: React.FC<{ k: number; ang: number }> = ({ k, ang }) => {
  if (k <= 0.02) return null;
  const e = suave(k);
  return (
    <group position={[PX, CY + 0.012 + (1 - e) * 0.3, PZ]} scale={e}>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.04, 0.05, 0.016, 16]} /><Mat cor="#4a4f58" /></mesh>
      <group position={[0, 0.025, 0]} rotation={[0, ang, 0]}>
        <mesh><cylinderGeometry args={[0.13, 0.13, 0.008, 40]} /><meshStandardMaterial color="#cfe6f2" transparent opacity={0.85} roughness={0.1} /></mesh>
        {[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.1, 0.006, Math.sin((i * Math.PI) / 2) * 0.1]}><cylinderGeometry args={[0.007, 0.007, 0.004, 8]} /><meshBasicMaterial color={i === 0 ? "#ff5a3a" : "#8aa0b0"} /></mesh>)}
      </group>
    </group>
  );
};

/** Tigela com a sopa (cor muda com `quente`); `ang` é a rotação do prato (a alça da tigela mostra o giro). */
export const Tigela: React.FC<{ k: number; ang: number; quente: number; vapor: number; t: number; y?: number }> = ({ k, ang, quente, vapor, t, y }) => {
  if (k <= 0.02) return null;
  const e = suave(k);
  const yy = y ?? PY + 0.012;
  return (
    <group position={[PX, yy + (1 - e) * 0.3, PZ]} scale={e}>
      <mesh position={[0, 0.035, 0]}><cylinderGeometry args={[0.075, 0.05, 0.07, 28, 1, true]} /><meshStandardMaterial color="#f4f1ea" roughness={0.3} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.003, 0]}><cylinderGeometry args={[0.05, 0.05, 0.006, 24]} /><meshStandardMaterial color="#f4f1ea" roughness={0.3} /></mesh>
      <mesh position={[0, 0.058, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.07, 28]} /><meshStandardMaterial color={mistura("#c9532a", "#e0431a", quente)} roughness={0.35} /></mesh>
      <mesh position={[Math.cos(ang) * 0.085, 0.05, Math.sin(ang) * 0.085]}><sphereGeometry args={[0.014, 10, 8]} /><meshStandardMaterial color="#3a7ac8" /></mesh>
      {vapor > 0.02 && Array.from({ length: 7 }).map((_, i) => {
        const u = (t * 0.45 + rnd(i + 3)) % 1;
        return <mesh key={i} position={[(rnd(i) - 0.5) * 0.09 + Math.sin(t * 2 + i) * 0.01 * u, 0.07 + u * 0.16, (rnd(i + 8) - 0.5) * 0.05]} scale={0.02 + u * 0.03}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.6 * vapor * (1 - u)} depthWrite={false} /></mesh>;
      })}
    </group>
  );
};

/* ---------- mapa visto de cima ---------- */

export const valorOnda = (x: number, y: number) => Math.cos((x / 0.06) * Math.PI) * Math.cos((y / 0.06) * Math.PI);

/** Painel com a caixa vista de cima: células de ~6 cm em xadrez quente/frio e a sopa com manchas. `mix` 0..1: o prato gira e as manchas se misturam. */
export const MapaCima: React.FC<{ p: V; k: number; mix: number; esc: number; t: number }> = ({ p, k, mix, esc, t }) => {
  if (k <= 0.02) return null;
  const e = suave(k);
  const w = CX1 - CX0;
  const d = CZ1 - CZ0;
  const cell = 0.06;
  const nx = Math.round(w / cell);
  const ny = Math.round(d / cell);
  const amp = 1 - mix;
  const cor = (v: number) => mistura(v > 0 ? "#ff3a2a" : "#2f7bff", "#ff8a2a", mix);
  const sx = -w / 2;
  const sy = d / 2;
  return (
    <group position={p} scale={esc * e}>
      <Caixa p={[0, 0, -0.01]} t={[w + 0.05, d + 0.05, 0.012]} cor="#2a2d34" raio={0.012} />
      {Array.from({ length: nx * ny }).map((_, i) => {
        const ix = i % nx;
        const iy = Math.floor(i / nx);
        const x = sx + (ix + 0.5) * (w / nx);
        const y = sy - (iy + 0.5) * (d / ny);
        const v = Math.sign(valorOnda(x - sx - w / nx / 2, y - sy + d / ny / 2) + 1e-6);
        return <mesh key={i} position={[x, y, 0]}><planeGeometry args={[w / nx - 0.004, d / ny - 0.004]} /><meshBasicMaterial color={cor(v)} /></mesh>;
      })}
      {/* a tigela vista de cima, com as manchas da sopa */}
      <group position={[PX - CXM, -(PZ - (CZ0 + CZ1) / 2), 0.01]}>
        <mesh><circleGeometry args={[0.085, 32]} /><meshBasicMaterial color="#f4f1ea" /></mesh>
        <mesh position={[0, 0, 0.002]}><circleGeometry args={[0.07, 32]} /><meshBasicMaterial color="#c9532a" /></mesh>
        {Array.from({ length: 21 }).map((_, i) => {
          const ang0 = (i % 7) * 0.9 + Math.floor(i / 7) * 0.4;
          const r = 0.012 + (Math.floor(i / 7) * 0.02);
          const xs = Math.cos(ang0 + t * 0.0) * r * 1.6 + (i % 3 - 1) * 0.015;
          const ys = Math.sin(ang0) * r * 1.6;
          const gx = (PX - CX0) + xs;
          const gy = ys;
          const v = Math.sign(valorOnda(gx + 0.0, gy + 0.0) + (i % 2 ? 0.05 : -0.05));
          return <mesh key={i} position={[xs, ys, 0.004]}><circleGeometry args={[0.014, 12]} /><meshBasicMaterial color={cor(v)} transparent opacity={0.92} /></mesh>;
        })}
      </group>
    </group>
  );
};

/* ---------- corte da comida (lasanha) ---------- */

const FRAG = `
varying vec2 vUv;
uniform float uModo;
uniform float uPen;
uniform vec2 uSize;
void main(){
  vec2 q = vUv * uSize;
  float d = min(min(q.x, uSize.x - q.x), min(q.y, uSize.y - q.y));
  vec3 c;
  if (uModo < 0.5) {
    float b = floor(vUv.y * 5.0);
    c = mod(b, 2.0) < 0.5 ? vec3(0.95,0.82,0.48) : vec3(0.78,0.28,0.16);
    if (b > 3.5) c = vec3(0.97,0.90,0.62);
    float edge = smoothstep(0.0, 0.015, fract(vUv.y * 5.0)) ;
    c *= 0.88 + 0.12 * edge;
  } else {
    vec3 frio = vec3(0.80,0.88,0.95);
    vec3 laranja = vec3(1.0,0.55,0.20);
    float camada = 1.0 - smoothstep(2.8, 3.2, d);
    float calor = 1.0 - smoothstep(3.0, 3.0 + max(uPen, 0.001), d);
    calor = calor * 0.75 * step(0.001, uPen);
    c = mix(frio, vec3(1.0,0.78,0.40), calor);
    c = mix(c, laranja, camada);
  }
  gl_FragColor = vec4(c, 1.0);
}`;
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

/** Fatia (16 × 10 cm) vista de frente: modo 0 = camadas de lasanha; modo 1 = mapa de calor (camada laranja de 3 cm e o calor entrando, `pen` em cm). */
export const FatiaCorte: React.FC<{ p: V; larg: number; modo: number; pen: number; k: number }> = ({ p, larg, modo, pen, k }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uModo: { value: 0 }, uPen: { value: 0 }, uSize: { value: new THREE.Vector2(16, 10) } } }), []);
  mat.uniforms.uModo.value = modo;
  mat.uniforms.uPen.value = pen;
  if (k <= 0.02) return null;
  const e = suave(k);
  const h = (larg * 10) / 16;
  return (
    <group position={p} scale={e}>
      <mesh position={[0, 0, -0.01]}><planeGeometry args={[larg + 0.03, h + 0.03]} /><meshBasicMaterial color="#fff8e8" /></mesh>
      <mesh material={mat}><planeGeometry args={[larg, h]} /></mesh>
    </group>
  );
};

/** Régua vertical de 3 cm junto ao topo da fatia (escala `larg` m = 14 cm). */
export const Regua3: React.FC<{ p: V; larg: number; k: number }> = ({ p, larg, k }) => {
  if (k <= 0.02) return null;
  const h = (larg * 10) / 16;
  const s = (larg / 16) * 3;
  const x = p[0] - larg / 2 - 0.05;
  const y0 = p[1] + h / 2;
  return (
    <group>
      <Liga a={[x, y0, p[2] + 0.02]} b={[x, y0 - s * k, p[2] + 0.02]} w={0.012} cil cor="#ffd23f" basico />
      {[0, 1, 2, 3].map((i) => <Liga key={i} a={[x - 0.025, y0 - (s * i) / 3 * k, p[2] + 0.02]} b={[x + 0.025, y0 - (s * i) / 3 * k, p[2] + 0.02]} w={0.01} cil cor="#ffd23f" basico />)}
      <Texto3D texto="3 cm" p={[x + 0.05, y0 + 0.07, p[2] + 0.02]} h={0.075} escala={k} />
    </group>
  );
};

/** Gotinhas azuis (água) espalhadas num retângulo local. */
export const Gotinhas: React.FC<{ p: V; w: number; h: number; k: number; t: number; n?: number; r?: number }> = ({ p, w, h, k, t, n = 18, r = 0.012 }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p}>
      {Array.from({ length: n }).map((_, i) => {
        const e = clamp01(k * 1.6 - (i / n) * 0.6);
        if (e <= 0) return null;
        const x = (rnd(i + 1) - 0.5) * w;
        const y = (rnd(i + 40) - 0.5) * h + Math.sin(t * 2 + i) * 0.004;
        return <mesh key={i} position={[x, y, 0.01]} scale={e * (0.8 + 0.4 * rnd(i + 9))}><sphereGeometry args={[r, 10, 8]} /><meshStandardMaterial color="#3ea6ff" emissive="#1f6fcf" emissiveIntensity={0.5} roughness={0.15} /></mesh>;
      })}
    </group>
  );
};

/* ---------- metal: garfo, alumínio, faíscas, indução ---------- */

export const GarfoMesa: React.FC<{ p: V; k: number; rot?: number }> = ({ p, k, rot = 0 }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p} rotation={[0, 0, rot]} scale={suave(k)}>
      <mesh position={[0, -0.03, 0]}><boxGeometry args={[0.014, 0.1, 0.005]} /><meshStandardMaterial color="#d6dbe1" metalness={0.9} roughness={0.2} /></mesh>
      <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.05, 0.016, 0.005]} /><meshStandardMaterial color="#d6dbe1" metalness={0.9} roughness={0.2} /></mesh>
      {[-0.02, -0.007, 0.007, 0.02].map((x) => <mesh key={x} position={[x, 0.065, 0]}><boxGeometry args={[0.005, 0.055, 0.005]} /><meshStandardMaterial color="#d6dbe1" metalness={0.9} roughness={0.2} /></mesh>)}
    </group>
  );
};

/** Faíscas azuis: riscos que piscam em volta de um ponto. */
export const Faiscas: React.FC<{ p: V; k: number; t: number; n?: number; raio?: number }> = ({ p, k, t, n = 12, raio = 0.07 }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p}>
      {Array.from({ length: n }).map((_, i) => {
        const f = Math.floor(t * 14 + i * 3);
        const on = rnd(f + i * 7) < 0.55 * k + 0.1;
        if (!on) return null;
        const a = rnd(f * 2 + i) * 6.283;
        const r0 = 0.01 + rnd(f + i) * 0.02;
        const r1 = r0 + 0.02 + rnd(f + i + 5) * raio;
        const mid = a + (rnd(f + i + 9) - 0.5) * 0.7;
        return <group key={i}><Liga a={[Math.cos(a) * r0, Math.sin(a) * r0, 0.03]} b={[Math.cos(mid) * (r0 + r1) / 2, Math.sin(mid) * (r0 + r1) / 2, 0.03]} w={0.006} e={0.004} cor="#8fd3ff" basico /><Liga a={[Math.cos(mid) * (r0 + r1) / 2, Math.sin(mid) * (r0 + r1) / 2, 0.03]} b={[Math.cos(a) * r1, Math.sin(a) * r1, 0.03]} w={0.006} e={0.004} cor="#ffffff" basico /></group>;
      })}
      <Halo p={[0, 0, 0.04]} r={0.12} cor="#7fc4ff" op={0.6 * k * (0.6 + 0.4 * Math.sin(t * 40))} />
    </group>
  );
};

/** Bolinha de papel alumínio: brilha e escurece com o fogo (`queima` 0..1). */
export const Aluminio: React.FC<{ p: V; k: number; queima: number; t: number }> = ({ p, k, queima, t }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p} scale={suave(k)}>
      <mesh rotation={[0.4, 0.6, 0.2]} scale={[1.2, 0.8, 1]}><icosahedronGeometry args={[0.05, 0]} /><meshStandardMaterial color={mistura("#e8ecf0", "#3a3028", queima * 0.8)} metalness={1} roughness={0.15} flatShading /></mesh>
      <Halo p={[0, 0, 0.04]} r={0.14} cor="#ffffff" op={0.55 * (1 - queima) * (0.6 + 0.4 * Math.sin(t * 25))} />
    </group>
  );
};

/** Fogão de indução só como silhueta: tampo liso, duas marcas redondas e uma panela. */
export const Inducao: React.FC<{ p: V; k: number }> = ({ p, k }) => {
  if (k <= 0.02) return null;
  const e = suave(k);
  const cor = "#6d6a66";
  return (
    <group position={p} scale={e}>
      <Caixa p={[0, 0.02, 0]} t={[0.56, 0.04, 0.46]} cor={cor} raio={0.012} rug={0.9} />
      {[-0.14, 0.14].map((x) => <mesh key={x} position={[x, 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.07, 0.085, 28]} /><meshBasicMaterial color="#4a4845" /></mesh>)}
      <mesh position={[-0.14, 0.11, 0]}><cylinderGeometry args={[0.09, 0.08, 0.1, 20]} /><meshStandardMaterial color="#4a4845" roughness={0.9} /></mesh>
      <Caixa p={[-0.28, 0.14, 0]} t={[0.1, 0.02, 0.02]} cor="#4a4845" raio={0.006} />
    </group>
  );
};
