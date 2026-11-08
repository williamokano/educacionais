import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { Caixa } from "../../../src/v3d/qualidade";
import { Liga } from "./cozinha-base";
import { V } from "./rasc";

// Peças do cenário do cadeado (episódio 20): parafuso, furo, pinos torneados, mola em hélice, chave extrudada, bicicleta, corda, correntes, martelo, alicate-cortador.
// Tudo em metros e com materiais metálicos; nada de caixa quando uma forma torneada/chanfrada cabe.

export const AGUA = "#4d8dff";
export const LARANJA = "#ff8a2a";
export const OURO = "#e8b83a";
export const ACO = "#aab4bc";
export const ACO_ESC = "#4a545c";

/** material de metal (a opacidade constante evita trocar o programa do shader) */
export const Metal: React.FC<{ cor?: string; met?: number; rug?: number; op?: number; emi?: string; emiK?: number; dupla?: boolean }> = ({ cor = ACO, met = 0.6, rug = 0.35, op = 1, emi = "#000000", emiK = 0, dupla }) => (
  <meshStandardMaterial color={cor} metalness={met} roughness={rug} transparent={op < 0.999} opacity={op} depthWrite={op >= 0.98} emissive={emi} emissiveIntensity={emiK} side={dupla ? THREE.DoubleSide : THREE.FrontSide} />
);

/** vetor unitário de dois pontos */
const dir = (a: V, b: V) => new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

/** cilindro entre dois pontos (raio r), com a ponta arredondada opcional */
export const Barra: React.FC<{ a: V; b: V; r: number; cor?: string; met?: number; rug?: number; op?: number; seg?: number }> = ({ a, b, r, cor = ACO, met = 0.6, rug = 0.35, op = 1, seg = 14 }) => {
  const d = dir(a, b);
  const len = d.length();
  if (len < 1e-4) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={q} castShadow>
      <cylinderGeometry args={[r, r, len, seg]} />
      <Metal cor={cor} met={met} rug={rug} op={op} />
    </mesh>
  );
};

/** parafuso de fenda, cabeça para o lado +z (ou girado por `rot`) */
export const Parafuso: React.FC<{ p: V; r?: number; rot?: V; cor?: string }> = ({ p, r = 0.035, rot = [Math.PI / 2, 0, 0], cor = "#dfe5ea" }) => (
  <group position={p} rotation={rot}>
    <mesh castShadow><cylinderGeometry args={[r, r * 0.9, r * 0.55, 18]} /><Metal cor={cor} met={0.7} rug={0.28} /></mesh>
    <mesh position={[0, r * 0.2, 0]} rotation={[0, 0.6, 0]}><boxGeometry args={[r * 1.7, r * 0.2, r * 0.3]} /><meshStandardMaterial color="#2c3238" roughness={0.6} /></mesh>
  </group>
);

/** retângulo de cantos arredondados (u = largura, v = altura) */
const retArred = (w: number, h: number, rc: number) => {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + rc, y);
  s.lineTo(x + w - rc, y); s.quadraticCurveTo(x + w, y, x + w, y + rc);
  s.lineTo(x + w, y + h - rc); s.quadraticCurveTo(x + w, y + h, x + w - rc, y + h);
  s.lineTo(x + rc, y + h); s.quadraticCurveTo(x, y + h, x, y + h - rc);
  s.lineTo(x, y + rc); s.quadraticCurveTo(x, y, x + rc, y);
  return s;
};

/**
 * Peça maciça com um furo redondo de ponta a ponta (batente, guia, orelha). `eixo` = direção do furo ("x" ou "z"). Medidas: w (largura em z para eixo x),
 * h (altura), d (espessura na direção do furo). O furo ganha um forro escuro (dá fundo ao buraco).
 */
export const Furo: React.FC<{ p: V; w: number; h: number; d: number; furo: number; eixo?: "x" | "z"; cor?: string; met?: number; rug?: number; op?: number; liner?: boolean }> = ({ p, w, h, d, furo, eixo = "x", cor = "#8f9aa3", met = 0.65, rug = 0.4, op = 1, liner = true }) => {
  const geo = useMemo(() => {
    const s = retArred(w, h, Math.min(w, h) * 0.2);
    const hole = new THREE.Path();
    hole.absarc(0, 0, furo, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 24 });
    g.center();
    if (eixo === "x") g.rotateY(Math.PI / 2);
    return g;
  }, [w, h, d, furo, eixo]);
  return (
    <group position={p}>
      <mesh geometry={geo} castShadow><Metal cor={cor} met={met} rug={rug} op={op} /></mesh>
      {liner && (
        <mesh rotation={eixo === "x" ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[furo * 0.985, furo * 0.985, d + 0.004, 24, 1, true]} />
          <meshStandardMaterial color="#14181c" roughness={0.9} side={THREE.BackSide} transparent={op < 0.999} opacity={op} depthWrite={op >= 0.98} />
        </mesh>
      )}
    </group>
  );
};


/** Caixa de cantos arredondados com material metálico e opacidade (raio-X); `contorno` desenha as arestas. */
export const CaixaM: React.FC<{ p: V; t: V; raio?: number; cor?: string; met?: number; rug?: number; op?: number; contorno?: string; emi?: string; emiK?: number }> = ({ p, t, raio = 0.04, cor = ACO, met = 0.6, rug = 0.4, op = 1, contorno, emi, emiK }) => {
  const q = (v: number) => Math.round(v * 100) / 100;
  const geo = useMemo(() => new RoundedBoxGeometry(q(t[0]), q(t[1]), q(t[2]), 3, raio), [q(t[0]), q(t[1]), q(t[2]), raio]);
  const arestas = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(q(t[0]), q(t[1]), q(t[2]))), [q(t[0]), q(t[1]), q(t[2])]);
  return (
    <group position={p}>
      <mesh geometry={geo} castShadow><Metal cor={cor} met={met} rug={rug} op={op} emi={emi} emiK={emiK} /></mesh>
      {contorno && <lineSegments geometry={arestas}><lineBasicMaterial color={contorno} transparent opacity={0.85} /></lineSegments>}
    </group>
  );
};

/**
 * Meio-bloco em corte com uma calha semicircular ao longo de x (o furo visto em corte): o bloco ocupa z de -zd a 0 e a calha abre na face z = 0, voltada para a câmera.
 * Mostra o que entra no furo (o ferrolho) sem esconder nada. `p` = centro do bloco em x e y (z = 0); `furoY` = altura da calha em relação ao centro.
 */
export const Calha: React.FC<{ p: V; d: number; h: number; zd: number; furoY?: number; furoR: number; cor?: string; op?: number }> = ({ p, d, h, zd, furoY = 0, furoR, cor = "#98a3ac", op = 1 }) => {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -h / 2);
    s.lineTo(zd, -h / 2);
    s.lineTo(zd, h / 2);
    s.lineTo(0, h / 2);
    s.lineTo(0, furoY + furoR);
    s.absarc(0, furoY, furoR, Math.PI / 2, -Math.PI / 2, true);
    s.lineTo(0, -h / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 20 });
    g.translate(0, 0, -d / 2);
    g.rotateY(Math.PI / 2);
    return g;
  }, [d, h, zd, furoY, furoR]);
  return (
    <group position={p}>
      <mesh geometry={geo} castShadow><Metal cor={cor} met={0.65} rug={0.4} op={op} /></mesh>
      {/* fundo escuro da calha */}
      <mesh position={[0, furoY, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[furoR * 0.97, furoR * 0.97, d + 0.002, 20, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#14181c" roughness={0.95} side={THREE.DoubleSide} transparent={op < 0.999} opacity={op} depthWrite={op >= 0.98} /></mesh>
    </group>
  );
};

/* ---------- pinos torneados ---------- */

export type TipoPino = "inf" | "sup" | "carretel" | "serra";

/** perfil (raio, altura) do pino, de baixo (y = 0) para cima (y = L) */
const perfilPino = (tipo: TipoPino, L: number, r: number): THREE.Vector2[] => {
  const v = (x: number, y: number) => new THREE.Vector2(x, y);
  if (tipo === "sup") return [v(0, 0), v(r * 0.88, 0), v(r, 0.016), v(r, L - 0.016), v(r * 0.88, L), v(0, L)];
  const ponta = [v(0, 0), v(r * 0.28, 0.004), v(r * 0.6, 0.04), v(r * 0.88, 0.11), v(r, 0.17)];
  if (tipo === "inf") return [...ponta, v(r, L - 0.018), v(r * 0.88, L), v(0, L)];
  const y0 = 0.17;
  const meio: THREE.Vector2[] = [];
  if (tipo === "carretel") {
    const ym = y0 + (L - y0) * 0.5;
    const larg = Math.max(0.05, (L - y0) * 0.17);
    for (let i = 0; i <= 14; i++) {
      const y = lerp(y0 + 0.02, L - 0.02, i / 14);
      meio.push(v(r * (1 - 0.46 * Math.exp(-(((y - ym) / larg) ** 2))), y));
    }
  } else {
    const nr = 4;
    const h = (L - y0 - 0.04) / nr;
    for (let i = 0; i < nr; i++) {
      const y = y0 + 0.02 + i * h;
      meio.push(v(r * 0.76, y), v(r, y + h * 0.18), v(r, y + h * 0.5), v(r * 0.76, y + h * 0.82));
    }
    meio.push(v(r * 0.76, L - 0.02));
  }
  return [...ponta, ...meio, v(r, L - 0.018), v(r * 0.88, L), v(0, L)].filter((p, i, a) => i === 0 || Math.abs(p.y - a[i - 1].y) > 1e-4 || Math.abs(p.x - a[i - 1].x) > 1e-4);
};

/** pino torneado em pé, base em y = 0 do grupo */
export const Pino: React.FC<{ p: V; L: number; tipo?: TipoPino; r?: number; cor?: string; op?: number; emi?: string; emiK?: number }> = ({ p, L, tipo = "inf", r = 0.108, cor = LARANJA, op = 1, emi, emiK }) => {
  const geo = useMemo(() => new THREE.LatheGeometry(perfilPino(tipo, L, r), 28), [tipo, Math.round(L * 200), r]);
  return <mesh position={p} geometry={geo} castShadow><Metal cor={cor} met={0.55} rug={0.32} op={op} emi={emi} emiK={emiK} /></mesh>;
};

/* ---------- mola em hélice ---------- */

const helice = (voltas: number, raio: number, fio: number) => {
  const N = voltas * 12;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const a = (i / N) * voltas * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * raio, i / N, Math.sin(a) * raio);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 4, fio, 7, false);
};

/** Mola de compressão em pé entre y0 e y1 (as pontas encostam nas duas faces). Mesma quantidade de voltas, passo menor quando comprime. */
export const Mola: React.FC<{ x: number; y0: number; y1: number; z?: number; voltas?: number; raio?: number; fio?: number; cor?: string }> = ({ x, y0, y1, z = 0, voltas = 6, raio = 0.07, fio = 0.017, cor = "#d6dde2" }) => {
  const geo = useMemo(() => helice(voltas, raio, fio), [voltas, raio, fio]);
  const len = Math.max(y1 - y0, 0.02);
  return (
    <group position={[x, y0, z]}>
      <mesh geometry={geo} scale={[1, len, 1]} castShadow><Metal cor={cor} met={0.75} rug={0.25} /></mesh>
    </group>
  );
};

/** Mola deitada ao longo de x entre x0 e x1 (para o ferrolho). */
export const MolaX: React.FC<{ y: number; x0: number; x1: number; z?: number; voltas?: number; raio?: number; fio?: number }> = ({ y, x0, x1, z = 0, voltas = 7, raio = 0.07, fio = 0.016 }) => {
  const geo = useMemo(() => helice(voltas, raio, fio), [voltas, raio, fio]);
  const len = Math.max(Math.abs(x1 - x0), 0.02);
  return (
    <group position={[Math.min(x0, x1), y, z]} rotation={[0, 0, -Math.PI / 2]}>
      <mesh geometry={geo} scale={[1, len, 1]} castShadow><Metal cor="#d6dde2" met={0.75} rug={0.25} /></mesh>
    </group>
  );
};

/* ---------- chave (extrudada) ---------- */

/**
 * Perfil do topo da lâmina, de baixo do dente para a ponta: lista de [u, y] onde u é a posição na chave (0 = ponta, negativo para trás).
 * `tops` = altura (y do palco) do topo do dente sob cada pino, `us` = u de cada pino. Entre dentes, rampas até o vale.
 */
export const perfilChave = (us: number[], tops: number[], vale: number, ombro: number): [number, number][] => {
  const ord = us.map((u, i) => ({ u, y: tops[i] })).sort((a, b) => b.u - a.u);
  const pts: [number, number][] = [[0, vale - 0.1]];
  for (const { u, y } of ord) {
    pts.push([u + 0.27, vale], [u + 0.1, y], [u - 0.1, y], [u - 0.27, vale]);
  }
  pts.push([-3.55, vale], [-3.55, ombro]);
  return pts;
};

/** altura do topo da chave em u (interpolação do perfil), ou -Infinity fora da lâmina */
export const alturaChave = (perfil: [number, number][], u: number, fim = -4.4): number => {
  if (u > 0 || u < fim) return -Infinity;
  for (let i = 1; i < perfil.length; i++) {
    const [u0, y0] = perfil[i - 1];
    const [u1, y1] = perfil[i];
    if (u <= u0 && u >= u1) return lerp(y0, y1, (u0 - u) / Math.max(u0 - u1, 1e-6));
  }
  return perfil[perfil.length - 1][1];
};

/** Chave grande da maquete do cilindro (deitada ao longo de x, ponta em u = 0), em coordenadas do palco (y absoluto). */
export const ChaveGrande: React.FC<{ perfil: [number, number][]; fundo: number; ombro: number }> = ({ perfil, fundo, ombro }) => {
  const chave = JSON.stringify(perfil);
  const geoLamina = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, fundo);
    s.lineTo(0, perfil[0][1]);
    for (const [u, y] of perfil.slice(1)) s.lineTo(u, y);
    s.lineTo(-4.45, ombro);
    s.lineTo(-4.45, fundo);
    s.lineTo(0, fundo);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
    g.translate(0, 0, -0.09);
    return g;
  }, [chave, fundo, ombro]);
  const geoArgola = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.46, 0, Math.PI * 2, false);
    const h = new THREE.Path();
    h.absarc(0, 0, 0.17, 0, Math.PI * 2, true);
    s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 28 });
    g.translate(0, 0, -0.09);
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={geoLamina} castShadow><Metal cor={OURO} met={0.75} rug={0.28} /></mesh>
      <mesh geometry={geoArgola} position={[-4.88, (fundo + ombro) / 2 + 0.05, 0]} castShadow><Metal cor={OURO} met={0.75} rug={0.28} /></mesh>
      <mesh position={[-4.5, (fundo + ombro) / 2, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, 0.2, 14]} /><Metal cor={OURO} met={0.75} rug={0.28} /></mesh>
    </group>
  );
};

/** Chave pequena (cabeça redonda com furo e lâmina com dentes), deitada, ponta em +x. Altura total ~0,3 · s. */
export const ChavePeq: React.FC<{ s?: number; dentes?: number[] }> = ({ s = 1, dentes = [0.1, 0.22, 0.05, 0.18, 0.12] }) => {
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.05);
    sh.lineTo(0.62, -0.05);
    sh.lineTo(0.62, 0.0);
    dentes.forEach((h, i) => {
      const u = 0.58 - i * 0.1;
      sh.lineTo(u, 0.0); sh.lineTo(u - 0.012, 0.0 + h * 0.4); sh.lineTo(u - 0.075, 0.0 + h * 0.4); sh.lineTo(u - 0.085, 0.0);
    });
    sh.lineTo(0, 0.0);
    sh.lineTo(0, -0.05);
    return new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false });
  }, [dentes.join(",")]);
  return (
    <group scale={s}>
      <mesh geometry={geo} position={[0, 0, -0.015]}><Metal cor={OURO} met={0.75} rug={0.28} /></mesh>
      <mesh position={[-0.12, -0.025, 0]}><torusGeometry args={[0.13, 0.05, 12, 24]} /><Metal cor={OURO} met={0.75} rug={0.28} /></mesh>
      <mesh position={[0.0, -0.025, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, 0.1, 10]} /><Metal cor={OURO} met={0.75} rug={0.28} /></mesh>
    </group>
  );
};

/* ---------- corda e corrente ---------- */

/** Corda (tubo por uma curva suave) com a cor de sisal. */
export const Corda: React.FC<{ pts: V[]; r?: number; cor?: string; op?: number; ate?: number }> = ({ pts, r = 0.016, cor = "#cdb27a", op = 1, ate = 1 }) => {
  const chave = JSON.stringify(pts.map((p) => p.map((v) => Math.round(v * 400) / 400)));
  const k = Math.round(clamp01(ate) * 30) / 30;
  const geo = useMemo(() => {
    const curva = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    if (k >= 1) return new THREE.TubeGeometry(curva, Math.max(24, pts.length * 10), r, 6, false);
    const sub = Array.from({ length: 24 }, (_, i) => curva.getPoint((i / 23) * Math.max(k, 0.03)));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sub), 48, r, 6, false);
  }, [chave, r, k]);
  if (op <= 0.01 || k <= 0.01) return null;
  return <mesh geometry={geo} castShadow><meshStandardMaterial color={cor} roughness={0.95} transparent={op < 0.999} opacity={op} /></mesh>;
};

/** Corrente: elos alternados (um de frente, outro de lado) ao longo de uma polilinha. */
export const Corrente: React.FC<{ pts: V[]; elo?: number; cor?: string }> = ({ pts, elo = 0.07, cor = "#7b858d" }) => {
  const itens: React.ReactNode[] = [];
  let acc = 0;
  let idx = 0;
  const passo = elo * 1.35;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = new THREE.Vector3(...pts[i]);
    const b = new THREE.Vector3(...pts[i + 1]);
    const L = a.distanceTo(b);
    const d = b.clone().sub(a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    for (let s = acc; s < L; s += passo) {
      const c = a.clone().add(d.clone().multiplyScalar(s));
      itens.push(
        <group key={`${i}-${idx}`} position={c} quaternion={q}>
          <mesh rotation={[0, (idx % 2) * Math.PI / 2, 0]} scale={[0.62, 1.15, 1]} castShadow><torusGeometry args={[elo * 0.5, elo * 0.14, 8, 16]} /><Metal cor={cor} met={0.75} rug={0.3} /></mesh>
        </group>,
      );
      idx++;
    }
    acc = ((acc + Math.ceil((L - acc) / passo) * passo) - L);
  }
  return <group>{itens}</group>;
};

/* ---------- cadeado pequeno e romano (para a rua e as vinhetas) ---------- */

/** Cadeado moderno de bolso: corpo chanfrado, haste em U de tubo e furo da chave. Origem na base do corpo. */
export const CadeadoMini: React.FC<{ s?: number; cor?: string; haste?: string }> = ({ s = 1, cor = "#6c7a86", haste = "#d4dce2" }) => {
  const geoH = useMemo(() => {
    const pts: THREE.Vector3[] = [new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(-0.5, 0.55, 0)];
    for (let i = 0; i <= 14; i++) { const a = Math.PI - (i / 14) * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * 0.5, 0.55 + Math.sin(a) * 0.5, 0)); }
    pts.push(new THREE.Vector3(0.5, 0.55, 0), new THREE.Vector3(0.5, 0, 0));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.05), 80, 0.075, 10, false);
  }, []);
  return (
    <group scale={s}>
      <Caixa p={[0, 0.5 - 0.5, 0]} t={[1.5, 1.0, 0.55]} cor={cor} met={0.7} rug={0.35} raio={0.16} />
      <mesh geometry={geoH} position={[0, 0.5, 0]} castShadow><Metal cor={haste} met={0.85} rug={0.22} /></mesh>
      <mesh position={[0, -0.12, 0.29]}><circleGeometry args={[0.1, 16]} /><meshStandardMaterial color="#14181c" /></mesh>
      <mesh position={[0, -0.28, 0.29]}><boxGeometry args={[0.05, 0.18, 0.01]} /><meshStandardMaterial color="#14181c" /></mesh>
    </group>
  );
};

/* ---------- bicicleta ---------- */

const Roda: React.FC<{ x: number; rod: number; r?: number }> = ({ x, rod, r = 0.34 }) => (
  <group position={[x, r, 0]}>
    <group rotation={[0, 0, -rod]}>
      <mesh><torusGeometry args={[r, 0.032, 10, 36]} /><meshStandardMaterial color="#1f2326" roughness={0.9} /></mesh>
      <mesh><torusGeometry args={[r - 0.04, 0.012, 6, 36]} /><Metal cor="#cfd6dc" met={0.8} rug={0.25} /></mesh>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <Barra key={i} a={[0, 0, i % 2 ? 0.012 : -0.012]} b={[Math.cos(a) * (r - 0.045), Math.sin(a) * (r - 0.045), i % 2 ? 0.012 : -0.012]} r={0.0035} cor="#dfe4e8" met={0.7} rug={0.3} seg={5} />;
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.034, 0.034, 0.1, 14]} /><Metal cor="#9aa5ad" /></mesh>
    </group>
  </group>
);

/** Bicicleta de frente para +x, pés no chão em y = 0, centro entre as rodas em x = 0. Comprimento ~1,5 m. `rod` = giro das rodas (rad). */
export const Bicicleta: React.FC<{ rod?: number; cor?: string }> = ({ rod = 0, cor = "#e5473a" }) => {
  const T = 0.017;
  const P = (a: V, b: V, r = T) => <Barra a={a} b={b} r={r} cor={cor} met={0.35} rug={0.4} />;
  return (
    <group>
      <Roda x={-0.52} rod={rod} />
      <Roda x={0.52} rod={rod} />
      {/* quadro */}
      {P([-0.52, 0.34, 0], [-0.08, 0.34, 0])}{/* corrente (base traseira) */}
      {P([-0.08, 0.34, 0], [-0.1, 0.78, 0], 0.02)}{/* canote */}
      {P([-0.1, 0.78, 0], [0.4, 0.74, 0], 0.02)}{/* tubo superior */}
      {P([-0.08, 0.34, 0], [0.4, 0.74, 0], 0.022)}{/* tubo inclinado */}
      {P([-0.52, 0.34, 0], [-0.1, 0.78, 0], 0.012)}{/* escora traseira */}
      {P([0.4, 0.74, 0], [0.52, 0.34, 0], 0.016)}{/* garfo */}
      {P([0.4, 0.74, 0], [0.37, 0.9, 0], 0.014)}{/* mesa */}
      <Barra a={[0.37, 0.9, -0.28]} b={[0.37, 0.9, 0.28]} r={0.013} cor="#2b2f33" met={0.4} />{/* guidão */}
      {[-1, 1].map((s) => <Barra key={s} a={[0.37, 0.9, s * 0.2]} b={[0.37, 0.9, s * 0.3]} r={0.022} cor="#14171a" met={0.1} rug={0.8} />)}
      <Barra a={[-0.1, 0.78, 0]} b={[-0.12, 0.88, 0]} r={0.012} cor="#9aa5ad" />{/* canote do selim */}
      <Caixa p={[-0.13, 0.9, 0]} t={[0.3, 0.06, 0.12]} cor="#15181b" raio={0.025} rug={0.7} />
      {/* pedivela */}
      <mesh position={[-0.08, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.012, 20]} /><Metal cor="#aeb7be" /></mesh>
      <Barra a={[-0.08, 0.34, 0.07]} b={[-0.08 + Math.cos(-rod) * 0.17, 0.34 + Math.sin(-rod) * 0.17, 0.07]} r={0.01} cor="#aeb7be" />
      <Barra a={[-0.08, 0.34, -0.07]} b={[-0.08 - Math.cos(-rod) * 0.17, 0.34 - Math.sin(-rod) * 0.17, -0.07]} r={0.01} cor="#aeb7be" />
      {/* cesto na frente */}
      <Caixa p={[0.47, 0.75, 0]} t={[0.2, 0.15, 0.3]} cor="#8a6a3c" raio={0.02} rug={0.9} />
    </group>
  );
};

/* ---------- poste ---------- */

export const Poste: React.FC<{ alt?: number }> = ({ alt = 3.6 }) => (
  <group>
    <mesh position={[0, alt / 2, 0]} castShadow><cylinderGeometry args={[0.055, 0.075, alt, 16]} /><Metal cor="#4d565e" met={0.45} rug={0.5} /></mesh>
    <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.13, 0.15, 0.1, 16]} /><Metal cor="#3c444b" met={0.5} rug={0.5} /></mesh>
    <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.085, 0.1, 0.16, 16]} /><Metal cor="#3c444b" met={0.5} rug={0.5} /></mesh>
    <Barra a={[0, alt - 0.1, 0]} b={[0.45, alt + 0.1, 0]} r={0.035} cor="#4d565e" met={0.45} rug={0.5} />
    <mesh position={[0.5, alt + 0.06, 0]} scale={[1.6, 0.6, 1]}><sphereGeometry args={[0.15, 16, 12]} /><meshStandardMaterial color="#fff2c0" emissive="#ffd66b" emissiveIntensity={0.7} roughness={0.4} /></mesh>
  </group>
);

/* ---------- impacto de desenho animado ---------- */

/** Estrelinhas e linhas de choque ao redor de um ponto. `k` 0..1 = fase do impacto (cresce, sobe e some). */
export const Impacto: React.FC<{ p: V; k: number; esc?: number }> = ({ p, k, esc = 1 }) => {
  if (k <= 0.01 || k >= 0.999) return null;
  const e = 1 - (1 - k) * (1 - k);
  const fade = 1 - k;
  return (
    <group position={p} scale={esc}>
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const r0 = 0.12 + 0.34 * e;
        return (
          <mesh key={i} position={[Math.cos(a) * r0, Math.sin(a) * r0 * 0.9, 0.18]} rotation={[0, 0, a + k * 4]} scale={0.085 * (0.6 + 0.6 * fade)}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={i % 3 === 0 ? "#fffbe6" : "#ffd23f"} transparent opacity={Math.min(1, fade * 2)} />
          </mesh>
        );
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r1 = 0.1 + 0.18 * e, r2 = 0.2 + 0.4 * e;
        return <Liga key={`l${i}`} a={[Math.cos(a) * r1, Math.sin(a) * r1, 0.2]} b={[Math.cos(a) * r2, Math.sin(a) * r2, 0.2]} w={0.02} cil cor="#fff6c8" basico op={Math.min(1, fade * 2.2)} />;
      })}
    </group>
  );
};

/* ---------- martelo ---------- */

/** Martelão: cabo de madeira com extremidade arredondada e cabeça de aço chanfrada. Origem = ponta de baixo do cabo; o cabo sobe em +y; a cabeça tem o eixo em x. */
export const Martelo: React.FC<{ cabo?: number }> = ({ cabo = 0.72 }) => (
  <group>
    <mesh position={[0, cabo / 2, 0]} castShadow><cylinderGeometry args={[0.024, 0.03, cabo, 12]} /><meshStandardMaterial color="#a8743f" roughness={0.75} /></mesh>
    <mesh position={[0, 0.0, 0]} scale={[1, 0.6, 1]} castShadow><sphereGeometry args={[0.036, 12, 10]} /><meshStandardMaterial color="#8c5c30" roughness={0.8} /></mesh>
    {/* cabeça */}
    <group position={[0, cabo - 0.04, 0]}>
      <Caixa p={[0, 0, 0]} t={[0.3, 0.11, 0.12]} cor="#6b757d" met={0.85} rug={0.3} raio={0.03} />
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.152, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.062, 0.058, 0.02, 16]} /><Metal cor="#a9b3bb" met={0.9} rug={0.22} /></mesh>)}
      <mesh position={[0, -0.056, 0]}><boxGeometry args={[0.07, 0.01, 0.13]} /><Metal cor="#2d3338" /></mesh>
    </group>
  </group>
);

/* ---------- alicate-cortador (corta-vergalhão) ---------- */

/**
 * Corta-vergalhão: duas hastes cruzadas num pivô central, mandíbulas curtas em cunha. Quadro local: origem no PIVÔ, +x para as mandíbulas, +y lateral, +z perpendicular
 * ao plano. `ab` = meio ângulo (rad): 0 = fechado. A haste A tem o cabo em -y e a mandíbula em +y (cruzam no pivô); a B é o contrário.
 * Cabos de 0,9 m (empunhadura de borracha laranja nos últimos 0,3 m) e mandíbulas de 0,28 m.
 */
export const LH = 0.9;
export const LJ = 0.28;
const Alavanca: React.FC<{ z: number }> = ({ z }) => {
  const lamina = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(LJ - 0.18, -0.012);
    s.lineTo(LJ + 0.035, -0.012);
    s.lineTo(LJ + 0.035, -0.052);
    s.lineTo(LJ + 0.005, -0.082);
    s.lineTo(LJ - 0.12, -0.062);
    s.lineTo(LJ - 0.18, -0.03);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 });
    g.translate(0, 0, -0.02);
    return g;
  }, []);
  return (
    <group position={[0, 0, z]}>
      <Caixa p={[(LJ - LH) / 2, 0, 0]} t={[LH + LJ, 0.044, 0.032]} cor="#58626a" met={0.7} rug={0.4} raio={0.012} />
      <Caixa p={[-LH + 0.16, 0, 0]} t={[0.3, 0.062, 0.05]} cor="#f08a24" met={0.05} rug={0.85} raio={0.022} />
      <mesh position={[-LH - 0.005, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 0.02, 14]} /><meshStandardMaterial color="#f08a24" roughness={0.85} /></mesh>
      <mesh geometry={lamina} position={[0, 0, -z]} castShadow><Metal cor="#c8d0d6" met={0.9} rug={0.2} /></mesh>
    </group>
  );
};
export const Alicate: React.FC<{ ab: number }> = ({ ab }) => (
  <group>
    <group rotation={[0, 0, ab]}><Alavanca z={0.022} /></group>
    <group rotation={[0, 0, -ab]} scale={[1, -1, -1]}><Alavanca z={0.022} /></group>
    {/* pivô: parafuso com porca */}
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.032, 0.032, 0.11, 16]} /><Metal cor="#8d98a1" met={0.85} rug={0.3} /></mesh>
    {[-1, 1].map((s) => <mesh key={s} position={[0, 0, s * 0.058]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 0.02, 6]} /><Metal cor="#6d7882" met={0.85} rug={0.3} /></mesh>)}
  </group>
);

/** posição (no quadro local da ferramenta) do centro da empunhadura de cada haste: A (lado -y do cabo) e B (+y) */
export const empunhadura = (ab: number, haste: "A" | "B", x = LH - 0.17): [number, number, number] => {
  const s = haste === "A" ? 1 : -1;
  // A gira +ab: ponto (-x, 0) vai a (-x cos, -x sin); B gira -ab (e é espelhada): (-x cos, +x sin)
  return [-x * Math.cos(ab), -s * x * Math.sin(ab), 0];
};

/* ---------- mão grande (passante puxando o ferrolho) ---------- */

/** Mão em punho que vem da direita e segura um pino; punho com manga. Origem no centro da palma; o braço sai para +z e +x. `fecha` 0..1. */
export const MaoGrande: React.FC<{ fecha?: number }> = ({ fecha = 1 }) => {
  const pele = "#c98f63";
  return (
    <group>
      <Caixa p={[0, 0, 0]} t={[0.2, 0.09, 0.17]} cor={pele} raio={0.04} rug={0.6} />
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[-0.075 + i * 0.05, 0.0, 0.085]} rotation={[-(0.25 + fecha * 1.25), 0, 0]}>
          <mesh position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]}><capsuleGeometry args={[0.021, 0.07, 4, 10]} /><meshStandardMaterial color={pele} roughness={0.6} /></mesh>
          <group position={[0, 0, 0.09]} rotation={[-0.5 * fecha, 0, 0]}><mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}><capsuleGeometry args={[0.019, 0.04, 4, 10]} /><meshStandardMaterial color={pele} roughness={0.6} /></mesh></group>
        </group>
      ))}
      <mesh position={[0.1, 0.0, 0.05]} rotation={[0.3, 0, -1.0 + 0.3 * fecha]}><capsuleGeometry args={[0.024, 0.07, 4, 10]} /><meshStandardMaterial color={pele} roughness={0.6} /></mesh>
      <mesh position={[0, 0.0, -0.18]} rotation={[Math.PI / 2, 0, 0]}><capsuleGeometry args={[0.052, 0.2, 6, 12]} /><meshStandardMaterial color={pele} roughness={0.6} /></mesh>
      <mesh position={[0, 0.0, -0.36]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.075, 0.085, 0.24, 16]} /><meshStandardMaterial color="#2f6f4e" roughness={0.85} /></mesh>
    </group>
  );
};

void suave;
