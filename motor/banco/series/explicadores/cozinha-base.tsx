import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { clamp01, lerp } from "../../../src/v3d/anima";
import { rnd } from "../../../src/v3d/qualidade";
import { FONT } from "../../../src/theme";
import { V3 } from "../../../src/v3d/tipos";

// Peças de apoio do cenário `cozinha` (episódio 9): hastes, setas, etiquetas 3D, brilho, cor da batata.
// Tudo é função do tempo: sem Math.random, sem Date.now, sem useFrame.

export type V = V3;
export const AMARELO = "#ffd23f";
export const AZUL_AR = "#4db4ff";
export const LARANJA = "#ff8a2a";

export const mistura = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getStyle();

/** Haste ou fita entre dois pontos. */
export const Liga: React.FC<{ a: V; b: V; w?: number; e?: number; cor: string; op?: number; cil?: boolean; basico?: boolean; emi?: string; brilho?: number }> = ({ a, b, w = 0.05, e = 0.03, cor, op, cil, basico, emi, brilho = 0 }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  if (len < 1e-4 || (op !== undefined && op <= 0.01)) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const trans = op !== undefined && op < 1;
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={q}>
      {cil ? <cylinderGeometry args={[w / 2, w / 2, len, 10]} /> : <boxGeometry args={[w, len, e]} />}
      {basico ? <meshBasicMaterial color={cor} transparent={trans} opacity={op ?? 1} /> : <meshStandardMaterial color={cor} roughness={0.7} transparent={trans} opacity={op ?? 1} depthWrite={!trans} emissive={emi ?? "#000000"} emissiveIntensity={brilho} />}
    </mesh>
  );
};

/** Seta 3D (haste e ponta), sem luz: lê bem em qualquer fundo. */
export const Seta: React.FC<{ a: V; b: V; cor: string; w?: number; op?: number }> = ({ a, b, cor, w = 0.04, op = 1 }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  if (len < 0.03 || op <= 0.02) return null;
  const dir = d.clone().normalize();
  const head = Math.min(w * 4.2, len * 0.55);
  const base: V = [b[0] - dir.x * head, b[1] - dir.y * head, b[2] - dir.z * head];
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <group>
      <Liga a={a} b={base} w={w} cil cor={cor} op={op} basico />
      <mesh position={[b[0] - dir.x * head * 0.5, b[1] - dir.y * head * 0.5, b[2] - dir.z * head * 0.5]} quaternion={q} renderOrder={5}>
        <coneGeometry args={[w * 1.9, head, 10]} />
        <meshBasicMaterial color={cor} transparent opacity={op} />
      </mesh>
    </group>
  );
};

/** Ponto a `s` metros do começo de uma linha quebrada, e a direção do trecho. */
export const noCaminho = (pts: V[], s: number): { p: V; dir: V } => {
  let resto = s;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (resto <= l || i + 2 === pts.length) {
      const k = l > 0 ? Math.min(Math.max(resto / l, 0), 1) : 0;
      return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)], dir: l > 0 ? [(b[0] - a[0]) / l, (b[1] - a[1]) / l, (b[2] - a[2]) / l] : [0, 1, 0] };
    }
    resto -= l;
  }
  return { p: pts[pts.length - 1], dir: [0, 1, 0] };
};

export const compr = (pts: V[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]), 0);

/** Setas que correm por linhas quebradas (o ar andando). `op` multiplica a opacidade; `w` é a espessura da haste. */
export const Fluxo: React.FC<{ rotas: V[][]; t: number; n?: number; vel?: number; cor: string; w?: number; op?: number; tam?: number; fase?: number; decai?: boolean }> = ({ rotas, t, n = 6, vel = 0.9, cor, w = 0.035, op = 1, tam = 0.26, fase = 0, decai }) => (
  <group>
    {rotas.map((r, ri) => {
      const L = compr(r);
      return Array.from({ length: n }).map((_, i) => {
        const s = (((t * vel + (i / n) * L + rnd(ri * 9 + 1) * 0.4 + fase) % L) + L) % L;
        const fim = noCaminho(r, s);
        const ini = noCaminho(r, Math.max(s - tam, 0));
        const alfa = op * Math.min(1, s / 0.18, (L - s) / 0.18) * (decai ? 1 - 0.85 * (s / L) : 1);
        if (alfa <= 0.03) return null;
        return <Seta key={`${ri}-${i}`} a={ini.p} b={fim.p} cor={cor} w={w} op={alfa} />;
      });
    })}
  </group>
);

/* ---------- brilho (halo aditivo) ---------- */

let HALO: THREE.CanvasTexture | null = null;
const haloTex = () => {
  if (HALO) return HALO;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.35, "rgba(255,255,255,0.45)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  HALO = new THREE.CanvasTexture(c);
  HALO.colorSpace = THREE.SRGBColorSpace;
  return HALO;
};

export const Halo: React.FC<{ p: V; r: number; cor: string; op: number }> = ({ p, r, cor, op }) => {
  if (op <= 0.02) return null;
  return (
    <sprite position={p} scale={[r * 2, r * 2, 1]} renderOrder={8}>
      <spriteMaterial map={haloTex()} color={cor} transparent opacity={op} blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
  );
};

/* ---------- cor da batata ---------- */

/** 0 crua · 0,42 dourada · 0,7 queimada · 1 carvão. `seca` 0..1 deixa a batata pálida e fosca; `frio` 0..1 a deixa fria, azulada. */
export const corBatata = (doura: number, seca = 0, frio = 0) => {
  const paradas: [number, string][] = [[0, "#efdfa0"], [0.42, "#e2a63e"], [0.7, "#8e4d1b"], [1, "#221a16"]];
  const d = clamp01(doura);
  let i = 0;
  while (i + 2 < paradas.length && d > paradas[i + 1][0]) i++;
  const [k0, c0] = paradas[i];
  const [k1, c1] = paradas[i + 1];
  let c = mistura(c0, c1, (d - k0) / (k1 - k0));
  c = mistura(c, "#e6dfc6", seca * (1 - d));
  return mistura(c, "#cfdde4", frio * 0.55);
};

/* ---------- texto 3D e etiquetas ---------- */

const texturaTexto = (texto: string, cor: string, borda = "#241403") => {
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  g.font = `700 80px ${FONT}, sans-serif`;
  // a largura do canvas acompanha o texto medido: a letra nunca encolhe nem corta, qualquer que seja o tamanho do texto
  const w = Math.ceil(g.measureText(texto).width) + 60;
  c.width = w;
  c.height = 128;
  g.font = `700 80px ${FONT}, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = 22;
  g.strokeStyle = borda;
  g.strokeText(texto, w / 2, 68);
  g.fillStyle = cor;
  g.fillText(texto, w / 2, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, razao: w / 128 };
};

/** Texto solto no espaço (sempre de frente para a câmera); `h` = altura do texto em metros. */
export const Texto3D: React.FC<{ texto: string; p: V; h: number; cor?: string; escala?: number }> = ({ texto, p, h, cor = AMARELO, escala = 1 }) => {
  const { tex, razao } = useMemo(() => texturaTexto(texto, cor), [texto, cor]);
  if (escala <= 0.01) return null;
  return (
    <sprite position={p} scale={[h * razao * escala, h * escala, 1]} renderOrder={20}>
      <spriteMaterial map={tex} transparent depthTest={false} />
    </sprite>
  );
};

/**
 * Rótulo 3D de uma peça: o texto (altura ≈ 0,062 × a distância da câmera × `k`), a haste e a bolinha na peça. Mede o texto (nunca largura fixa) e fica preso ao
 * quadro: projeta a âncora na tela e desliza para dentro da área segura (esquerda, 12% da direita, abaixo do HUD e acima da legenda).
 * `pop` 0..1 é a entrada (cresce em ~0,25 s).
 */
export const Etiqueta: React.FC<{ texto: string; de: V; para: V; k?: number; cor?: string; pop?: number; ymax?: number }> = ({ texto, de: de0, para, k = 1, cor = AMARELO, pop = 1, ymax = 0.64 }) => {
  const { camera } = useThree();
  const { tex, razao } = useMemo(() => texturaTexto(texto, cor), [texto, cor]);
  if (pop <= 0.01) return null;
  const cam = camera as THREE.PerspectiveCamera;
  cam.updateMatrixWorld();
  const ancora = new THREE.Vector3(...de0);
  const ndc = ancora.clone().project(cam);
  const prof = -ancora.clone().applyMatrix4(cam.matrixWorldInverse).z;
  let de: V = de0;
  // altura do texto proporcional à distância: a letra tem sempre o mesmo tamanho na tela (≈ 70 px), qualquer que seja a câmera
  const h = 0.062 * Math.max(prof, 1) * k;
  if (prof > 0) {
    const meiaAltura = prof * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const meiaLargura = meiaAltura * cam.aspect;
    const hw = (h * razao) / 2 / meiaLargura;
    const hh = h / 2 / meiaAltura;
    // coluna segura de texto: x 162–918 de 1080 (ndc -0,70 .. 0,70); fora dela o Reels corta ou cobre com os botões
    const xmin = -0.69 + hw;
    const xmax = 0.69 - hw;
    if (xmin < xmax) ndc.x = Math.min(xmax, Math.max(xmin, ndc.x));
    // a faixa útil vai de baixo do HUD (y ≈ 330 px) até a legenda (y ≈ 1130 px): ndc 0,66 .. -0,18
    ndc.y = Math.min(ymax - hh, Math.max(-0.16 + hh, ndc.y));
    de = ndc.unproject(cam).toArray() as V;
  }
  const dir = new THREE.Vector3(...para).sub(new THREE.Vector3(...de));
  const comp = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const meio: V = [(de[0] + para[0]) / 2, (de[1] + para[1]) / 2, (de[2] + para[2]) / 2];
  const e = 1 - (1 - Math.min(pop, 1)) ** 3;
  return (
    <group>
      <sprite position={de} scale={[h * razao * e, h * e, 1]} renderOrder={20}><spriteMaterial map={tex} transparent depthTest={false} /></sprite>
      <mesh position={meio} quaternion={q} scale={[1, e, 1]} renderOrder={19}><cylinderGeometry args={[0.012, 0.012, comp, 6]} /><meshBasicMaterial color={cor} depthTest={false} /></mesh>
      <mesh position={para} scale={e} renderOrder={19}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color={cor} depthTest={false} /></mesh>
    </group>
  );
};

/** Fumaça ou vapor: bolas que sobem, crescem e somem. */
export const Fumaca: React.FC<{ p: V; t: number; k: number; cor?: string; n?: number; alt?: number; larg?: number; op?: number }> = ({ p, t, k, cor = "#4a4540", n = 9, alt = 0.9, larg = 0.3, op = 0.55 }) => {
  if (k <= 0.02) return null;
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const u = (t * 0.45 + rnd(i + 7)) % 1;
        const x = p[0] + (rnd(i) - 0.5) * larg + Math.sin(t * 1.6 + i * 2.1) * 0.05 * u;
        const y = p[1] + u * alt;
        const r = (0.04 + u * 0.12) * (0.6 + 0.4 * k);
        const alfa = op * k * Math.min(1, u * 5) * (1 - u);
        return <mesh key={i} position={[x, y, p[2] + (rnd(i + 3) - 0.5) * larg * 0.6]} scale={r}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color={cor} transparent opacity={alfa} depthWrite={false} /></mesh>;
      })}
    </group>
  );
};
