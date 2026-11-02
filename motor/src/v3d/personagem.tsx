import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Mat, rnd, useSeg } from "./qualidade";
import { Expressao3D, Personagem3D, Pose3D } from "./tipos";

// Boneco 3D descrito por dados (Personagem3D): cabeça grande (lê bem no vertical), olhos com pálpebra,
// óculos, bigode, boné, macacão. Medidas em metros para 1,6 m; `altura` escala tudo.
// O rig é uma hierarquia de grupos (quadril → tronco → cabeça/ombros → cotovelos; quadril → pernas → joelhos).

/** Rosto por expressão: sobrancelha (altura, inclinação do meio), pálpebra (ângulo: -0.7 arregalado .. 1.57 fechado),
 * sorriso (-1 triste .. 1 feliz) e boca aberta mínima. */
type Rosto = { sobe: number; meio: number; palpebra: number; sorriso: number; boca: number; assim?: number };

const ROSTOS: Record<string, Rosto> = {
  neutro: { sobe: 0, meio: 0, palpebra: -0.35, sorriso: 0.25, boca: 0 },
  sorriso: { sobe: 0.008, meio: -0.05, palpebra: -0.2, sorriso: 1, boca: 0 },
  alivio: { sobe: 0.006, meio: 0.12, palpebra: 0.2, sorriso: 0.7, boca: 0 },
  surpreso: { sobe: 0.03, meio: 0.05, palpebra: -0.75, sorriso: 0, boca: 0.65 },
  alerta: { sobe: 0.02, meio: 0, palpebra: -0.6, sorriso: 0, boca: 0.1 },
  eureka: { sobe: 0.035, meio: -0.1, palpebra: -0.6, sorriso: 1, boca: 0.55 },
  pensativo: { sobe: 0.005, meio: 0, palpebra: 0.05, sorriso: 0, boca: 0, assim: 0.03 },
  concentrado: { sobe: -0.008, meio: -0.2, palpebra: 0.3, sorriso: 0, boca: 0 },
  serio: { sobe: -0.005, meio: -0.15, palpebra: 0.05, sorriso: -0.1, boca: 0 },
  preocupado: { sobe: 0.012, meio: 0.4, palpebra: 0.1, sorriso: -0.6, boca: 0 },
  tenso: { sobe: 0.01, meio: 0.3, palpebra: -0.3, sorriso: -0.4, boca: 0.05 },
  medo: { sobe: 0.03, meio: 0.45, palpebra: -0.8, sorriso: -0.7, boca: 0.4 },
  suplicante: { sobe: 0.02, meio: 0.5, palpebra: 0.1, sorriso: -0.5, boca: 0.1 },
  cansado: { sobe: -0.004, meio: 0.15, palpebra: 0.7, sorriso: -0.2, boca: 0 },
  raiva: { sobe: -0.01, meio: -0.45, palpebra: 0.2, sorriso: -0.7, boca: 0.1 },
  dor: { sobe: -0.005, meio: 0.4, palpebra: 0.9, sorriso: -0.8, boca: 0.3 },
};

export const EXPRESSOES_3D = Object.keys(ROSTOS);

const R = 0.235; // raio da cabeça

/** piscar: fecha por ~0,12 s a cada 3–4 s (fase por personagem, para não piscarem juntos) */
export const piscar = (t: number) => {
  const c = (t % 3.7) / 3.7;
  const d = Math.abs(c - 0.5) * 3.7; // s até o meio da piscada
  return d < 0.07 ? 1 - d / 0.07 : 0;
};

const Capsula: React.FC<{ r: number; c: number; y?: number; cor: string; x?: number; z?: number; rot?: [number, number, number]; tecido?: boolean; esc?: [number, number, number] }> = ({
  r, c, y = 0, x = 0, z = 0, cor, rot, tecido, esc,
}) => {
  const seg = useSeg();
  return (
    <mesh position={[x, y, z]} rotation={rot} scale={esc} castShadow receiveShadow>
      <capsuleGeometry args={[r, c, seg(3, 8), seg(8, 24)]} />
      <Mat cor={cor} tecido={tecido} rug={tecido ? 0.85 : 0.6} />
    </mesh>
  );
};

const Esfera: React.FC<{ r: number; p: [number, number, number]; cor: string; esc?: [number, number, number]; rot?: [number, number, number]; rug?: number; verniz?: number; met?: number; basico?: boolean }> = ({
  r, p, cor, esc, rot, rug = 0.6, verniz = 0, met = 0, basico,
}) => {
  const seg = useSeg();
  return (
    <mesh position={p} scale={esc} rotation={rot} castShadow={!basico} receiveShadow={!basico}>
      <sphereGeometry args={[r, seg(10, 32), seg(7, 24)]} />
      {basico ? <meshBasicMaterial color={cor} /> : <Mat cor={cor} rug={rug} verniz={verniz} met={met} />}
    </mesh>
  );
};

/* ---------- cabeça ---------- */

const Olho: React.FC<{ x: number; olhar: [number, number]; palpebra: number; p: Personagem3D }> = ({ x, olhar, palpebra, p }) => {
  const seg = useSeg();
  const y = 0.025;
  const z = Math.sqrt(R * R - x * x - y * y) - 0.03;
  return (
    <group position={[x, y, z]}>
      <Esfera r={0.054} p={[0, 0, 0]} cor="#fbfbf7" rug={0.25} verniz={0.8} />
      <group rotation={[-olhar[1] * 0.35, olhar[0] * 0.45, 0]}>
        <Esfera r={0.035} p={[0, 0, 0.03]} cor={p.olhos ?? "#5b3a21"} esc={[1, 1, 0.55]} rug={0.3} verniz={1} />
        <Esfera r={0.02} p={[0, 0, 0.045]} cor="#111111" esc={[1, 1, 0.5]} rug={0.2} verniz={1} />
        <Esfera r={0.008} p={[0.011, 0.012, 0.055]} cor="#ffffff" basico />
      </group>
      {/* pálpebra de cima: meia esfera que gira para a frente até cobrir o olho */}
      <mesh rotation={[palpebra, 0, 0]} castShadow>
        <sphereGeometry args={[0.058, seg(10, 32), seg(5, 16), 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat cor={p.pele} rug={0.6} />
      </mesh>
    </group>
  );
};

/** Superfície do rosto (a esfera da face, com a mesma escala da Cabeca): z para um ponto (x, y) da frente. */
const zRosto = (x: number, y: number, folga: number) => {
  const r = R * 0.985 + folga;
  const yy = (y + 0.005) / 1.02;
  return 0.012 + 0.96 * Math.sqrt(Math.max(r * r - x * x - yy * yy, 0));
};

/** Elipse colada no rosto: um leque de N pontos cujas posições são recalculadas a cada quadro. */
const N_BOCA = 32;
const ElipseNoRosto: React.FC<{ cx: number; cy: number; w: number; h: number; folga: number; cor: string; brilho?: boolean }> = ({ cx, cy, w, h, folga, cor, brilho }) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((N_BOCA + 1) * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < N_BOCA; i++) idx.push(0, 1 + i, 1 + ((i + 1) % N_BOCA));
    g.setIndex(idx);
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  pos.setXYZ(0, cx, cy, zRosto(cx, cy, folga));
  for (let i = 0; i < N_BOCA; i++) {
    const a = (i / N_BOCA) * Math.PI * 2;
    const x = cx + Math.cos(a) * w;
    const y = cy + Math.sin(a) * h;
    pos.setXYZ(1 + i, x, y, zRosto(x, y, folga));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={cor} roughness={brilho ? 0.35 : 0.8} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1 - folga * 1000} />
    </mesh>
  );
};

/** Boca: fechada é uma linha (reta, sorriso ou triste); falando é uma abertura funda colada no rosto,
 * com dentes de cima e língua no fundo, que estreita quando abre (nada sai para fora do rosto). */
const Sorriso: React.FC<{ s: number; boca: number }> = ({ s, boca }) => {
  const seg = useSeg();
  const y = -0.152;
  const abre = Math.min(Math.max(boca, 0), 1);
  const z = zRosto(0, y, 0.003);
  if (abre > 0.06) {
    const w = 0.047 + Math.max(s, 0) * 0.01 - abre * 0.01;
    const h = 0.008 + abre * 0.03;
    const cy = y - h * 0.35; // o queixo desce: a abertura cresce para baixo
    return (
      <group>
        <ElipseNoRosto cx={0} cy={cy} w={w} h={h} folga={0.0015} cor="#3a1212" />
        {abre > 0.25 && <ElipseNoRosto cx={0} cy={cy + h * 0.72} w={w * 0.7} h={h * 0.2} folga={0.0025} cor="#f4efe6" brilho />}
        <ElipseNoRosto cx={0} cy={cy - h * 0.55} w={w * 0.58} h={h * 0.38} folga={0.0025} cor="#b4545a" />
      </group>
    );
  }
  return (
    <group position={[0, y, z]} rotation={[0.62, 0, 0]}>
      {Math.abs(s) > 0.05 ? (
        <mesh rotation={[0, 0, s > 0 ? Math.PI : 0]} position={[0, s > 0 ? 0.018 : -0.018, 0]} scale={[1, Math.abs(s) * 0.9 + 0.1, 0.6]}>
          <torusGeometry args={[0.045, 0.008, seg(4, 8), seg(8, 24), Math.PI]} />
          <meshStandardMaterial color="#4a1818" roughness={0.6} />
        </mesh>
      ) : (
        <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.6]}>
          <capsuleGeometry args={[0.007, 0.05, 3, 8]} />
          <meshStandardMaterial color="#4a1818" roughness={0.6} />
        </mesh>
      )}
    </group>
  );
};

/* ---------- fala ---------- */

const VOGAIS = /[aeiouyáéíóúâêôãõàü]+/gi;
/** sílabas aproximadas: grupos de vogais (bom o bastante para o ritmo da boca) */
const silabas = (texto: string) => Math.max(1, (texto.match(VOGAIS) ?? []).length);
const hashTexto = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1009, 3) / 1009;

/**
 * Abertura da boca (0..1) no instante `agora`: um arco por sílaba, espalhado pela duração real da palavra
 * (que vem da voz), com amplitude que varia de palavra para palavra e fechando nas bordas da palavra.
 */
export const aberturaFala = (w: { text: string; start: number; end: number }, agora: number) => {
  const d = Math.max(w.end - w.start, 0.08);
  const u = (agora - w.start) / d;
  if (u < 0 || u > 1) return 0;
  const n = silabas(w.text);
  const f = (u * n) % 1;
  const arco = Math.sin(Math.PI * f) ** 0.8;
  const amp = 0.5 + 0.4 * hashTexto(w.text + Math.floor(u * n));
  const borda = Math.min(1, (u * d) / 0.05, ((1 - u) * d) / 0.06);
  return amp * (0.2 + 0.8 * arco) * borda;
};

/** Gotas de suor escorrendo pela testa e pelas têmporas (0..1 = quantas e quão grandes). */
const Suor: React.FC<{ t: number; forca: number }> = ({ t, forca }) => {
  const seg = useSeg();
  if (forca <= 0.02) return null;
  const gotas: [number, number, number][] = [[-0.16, 0.1, 0.0], [0.17, 0.07, 0.4], [0.05, 0.15, 0.7], [-0.2, -0.02, 0.2]];
  return (
    <group>
      {gotas.slice(0, Math.max(1, Math.round(gotas.length * forca))).map(([x, y, fase], i) => {
        const c = (t * 0.45 + fase) % 1;
        const yy = y - c * 0.07;
        const z = Math.sqrt(Math.max(R * R - x * x - yy * yy, 0)) + 0.008;
        const s = 0.016 * (0.7 + forca * 0.5) * Math.min(1, c * 5) * (1 - Math.max(0, c - 0.85) * 6);
        if (s <= 0.002) return null;
        return (
          <mesh key={i} position={[x, yy, z]} scale={[s * 0.75, s, s * 0.6]}>
            <sphereGeometry args={[1, seg(8, 16), seg(6, 12)]} />
            <meshPhysicalMaterial color="#cdeeff" transparent opacity={0.9} roughness={0.02} clearcoat={1} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Vapor da respiração no frio: uma baforada saindo da boca a cada expiração (0..1 = quão visível). */
const Bafo: React.FC<{ t: number; forca: number }> = ({ t, forca }) => {
  if (forca <= 0.02) return null;
  const periodo = 2.6;
  return (
    <group position={[0, -0.12, 0.24]}>
      {Array.from({ length: 6 }).map((_, i) => {
        const c = ((t + i * 0.12) % periodo) / periodo; // 0..1 da respiração
        const k = (c - 0.08 * i) / 0.55; // cada bolinha sai um pouco depois da outra
        if (k <= 0 || k >= 1) return null;
        const s = 0.025 + k * 0.07;
        return (
          <mesh key={i} position={[(rnd(i) - 0.5) * 0.06 * k, -0.02 * k + Math.sin(i) * 0.015, 0.03 + k * 0.32]} scale={s}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#f4f8fc" transparent opacity={(1 - k) * 0.55 * forca} roughness={0.9} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Cobertor nos ombros: uma capa de tecido aberta na frente. `k` = 1 nos ombros; menos que 1 escorrega para trás. */
const Cobertor: React.FC<{ k: number }> = ({ k }) => {
  const seg = useSeg();
  if (k <= 0.02) return null;
  const cor = "#8a5cb8";
  const faixa = "#f2c230";
  const abre = 0.95; // abertura da frente (rad, metade de cada lado)
  return (
    <group position={[0, -(1 - k) * 0.5, -0.01]} scale={[1, 1, 0.82]}>
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.31, 0.52, seg(14, 40), 1, true, abre, Math.PI * 2 - abre * 2]} />
        <Mat cor={cor} tecido dupla />
      </mesh>
      {[0.12, 0.2].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.299 - y * 0.1, 0.302 - y * 0.1, 0.025, seg(14, 40), 1, true, abre, Math.PI * 2 - abre * 2]} />
          <Mat cor={faixa} tecido dupla />
        </mesh>
      ))}
      {/* dobra grossa por cima dos ombros */}
      <mesh position={[0, 0.525, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2 + abre]}>
        <torusGeometry args={[0.225, 0.03, seg(6, 12), seg(14, 40), Math.PI * 2 - abre * 2]} />
        <Mat cor={cor} tecido />
      </mesh>
    </group>
  );
};

const Cabeca: React.FC<{ p: Personagem3D; expressao: Expressao3D; boca: number; olhar: [number, number]; pisca: number; suor?: number; bafo?: number; t?: number }> = ({ p, expressao, boca, olhar, pisca, suor = 0, bafo = 0, t = 0 }) => {
  const seg = useSeg();
  const rosto = ROSTOS[expressao] ?? ROSTOS.neutro;
  const palpebra = rosto.palpebra + (Math.PI / 2 - rosto.palpebra) * pisca;
  const aro = p.oculos?.aro ?? 0.07;
  const sobr = p.sobrancelha ?? p.cabelo ?? "#3a2616";
  const bone = p.bone;
  const aba = bone?.aba ?? bone?.cor;
  return (
    <group>
      {/* crânio levemente ovo */}
      <Esfera r={R} p={[0, 0, 0]} cor={p.pele} esc={[1, 1.03, 0.96]} rug={0.55} />
      {/* orelhas */}
      {[-1, 1].map((s) => (
        <Esfera key={s} r={0.05} p={[s * R * 0.97, -0.01, -0.01]} esc={[0.45, 1, 0.75]} cor={p.pele} rug={0.55} />
      ))}
      {/* costeletas e nuca */}
      {p.cabelo && [-1, 1].map((s) => (
        <mesh key={s} position={[s * R * 0.9, 0.04, 0.05]} rotation={[0, s * 0.35, 0]} castShadow>
          <boxGeometry args={[0.03, 0.09, 0.07]} />
          <Mat cor={p.cabelo!} rug={0.9} />
        </mesh>
      ))}
      {p.cabelo && <Esfera r={R * 0.99} p={[0, 0.0, -0.02]} esc={[1.01, 0.9, 1]} rot={[0.5, 0, 0]} cor={p.cabelo} rug={0.9} />}
      {/* rosto por cima do cabelo da nuca */}
      <Esfera r={R * 0.985} p={[0, -0.005, 0.012]} esc={[1, 1.02, 0.96]} cor={p.pele} rug={0.55} />
      <Olho x={-0.082} olhar={olhar} palpebra={palpebra} p={p} />
      <Olho x={0.082} olhar={olhar} palpebra={palpebra} p={p} />
      {/* sobrancelhas: `meio` > 0 levanta a ponta de dentro (preocupado); < 0 abaixa (bravo) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.085, 0.118 + rosto.sobe + (s > 0 ? rosto.assim ?? 0 : 0), 0.215]} rotation={[-0.35, s * 0.25, Math.PI / 2 - s * rosto.meio]} castShadow>
          <capsuleGeometry args={[0.013, 0.055, 3, seg(6, 12)]} />
          <Mat cor={sobr} rug={0.9} />
        </mesh>
      ))}
      {/* nariz */}
      <Esfera r={0.055} p={[0, -0.045, 0.232]} esc={[1, 0.88, 0.85]} cor={p.pele} rug={0.5} />
      {/* bigode */}
      {p.bigode && [-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.047, -0.095, 0.216]} rotation={[-0.2, s * 0.35, s * (Math.PI / 2 - 0.42)]} scale={[1, 1, 0.75]} castShadow>
          <capsuleGeometry args={[0.03, 0.06, seg(3, 8), seg(8, 16)]} />
          <Mat cor={p.bigode!} rug={0.95} tecido />
        </mesh>
      ))}
      <Sorriso s={rosto.sorriso} boca={Math.max(boca, rosto.boca)} />
      <Suor t={t} forca={suor} />
      <Bafo t={t} forca={bafo} />
      {/* óculos redondos */}
      {p.oculos && (
        <group position={[0, 0.025, 0.262]}>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.084, 0, 0]}>
                <torusGeometry args={[aro, 0.009, seg(5, 10), seg(14, 40)]} />
                <Mat cor={p.oculos!.cor} rug={0.3} verniz={1} />
              </mesh>
              <mesh position={[s * 0.084, 0, -0.003]}>
                <circleGeometry args={[aro, seg(14, 40)]} />
                <meshPhysicalMaterial color="#dff3ff" transparent opacity={0.07} roughness={0.05} />
              </mesh>
              {/* haste até a orelha */}
              <mesh position={[s * (0.084 + aro), 0, -0.13]} rotation={[0, s * 0.12, 0]}>
                <boxGeometry args={[0.008, 0.01, 0.26]} />
                <Mat cor={p.oculos!.cor} rug={0.3} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.012, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, 0.168 - aro * 2 + 0.01, 8]} />
            <Mat cor={p.oculos.cor} rug={0.3} />
          </mesh>
        </group>
      )}
      {/* boné: copa + aba (virado = aba para trás) + botão no topo */}
      {bone && (
        <group position={[0, 0.03, -0.005]} rotation={[-0.12, 0, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[R * 1.05, seg(12, 40), seg(6, 20), 0, Math.PI * 2, 0, Math.PI * 0.43]} />
            <Mat cor={bone.cor} rug={0.85} tecido dupla />
          </mesh>
          <mesh position={[0, R * 0.235, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[R * 1.02, 0.012, seg(4, 8), seg(16, 48)]} />
            <Mat cor={aba!} rug={0.85} />
          </mesh>
          <mesh position={[0, R * 0.24, bone.virado ? -R * 0.92 : R * 0.92]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.016, seg(10, 32), 1, false, bone.virado ? Math.PI / 2 : -Math.PI / 2, Math.PI]} />
            <Mat cor={aba!} rug={0.8} />
          </mesh>
          <Esfera r={0.022} p={[0, R * 1.05, 0]} cor={aba!} rug={0.8} />
        </group>
      )}
    </group>
  );
};

/* ---------- corpo ---------- */

const perfilTronco = (barriga: number) => [
  [0.0, 0.0], [0.15, 0.0], [0.18 + barriga * 0.04, 0.07], [0.192 + barriga * 0.035, 0.18], [0.188 + barriga * 0.015, 0.3],
  [0.178, 0.4], [0.15, 0.48], [0.075, 0.535], [0.0, 0.545],
] as const;

/** fatia do perfil entre y0 e y1 (para pintar o macacão embaixo e a camiseta em cima) */
const fatia = (pts: readonly (readonly [number, number])[], y0: number, y1: number) => {
  const r = (y: number) => {
    for (let i = 1; i < pts.length; i++) {
      if (y <= pts[i][1]) {
        const [ra, ya] = pts[i - 1];
        const [rb, yb] = pts[i];
        return ra + ((rb - ra) * (y - ya)) / Math.max(yb - ya, 1e-6);
      }
    }
    return 0;
  };
  const out = [new THREE.Vector2(r(y0), y0)];
  for (const [rr, yy] of pts) if (yy > y0 && yy < y1) out.push(new THREE.Vector2(rr, yy));
  out.push(new THREE.Vector2(r(y1), y1));
  if (y0 <= 0) out.unshift(new THREE.Vector2(0, 0));
  return { pts: out, r };
};

const Tronco: React.FC<{ p: Personagem3D }> = ({ p }) => {
  const seg = useSeg();
  const barriga = p.barriga ?? 0.3;
  const corte = p.macacao ? 0.34 : 0.12;
  const { baixo, cima, r } = useMemo(() => {
    const pts = perfilTronco(barriga);
    const a = fatia(pts, 0, corte);
    const b = fatia(pts, corte, 0.545);
    return { baixo: a.pts, cima: b.pts, r: a.r };
  }, [barriga, corte]);
  const zr = (y: number) => r(y) * 0.86;
  return (
    <group scale={[1, 1, 0.86]}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[baixo, seg(10, 40)]} />
        <Mat cor={p.calca} tecido />
      </mesh>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[cima, seg(10, 40)]} />
        <Mat cor={p.camiseta} tecido />
      </mesh>
      {/* gola */}
      <mesh position={[0, 0.525, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.07, 0.014, seg(4, 8), seg(12, 32)]} />
        <Mat cor={p.camiseta} tecido />
      </mesh>
      {p.macacao && (
        <group scale={[1, 1, 1 / 0.86]}>
          {/* peitilho */}
          <mesh position={[0, 0.4, zr(0.4) - 0.004]} rotation={[-0.2, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 0.15, 0.03]} />
            <Mat cor={p.calca} tecido />
          </mesh>
          {/* alças */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.085, 0.49, zr(0.47) - 0.03]} rotation={[-0.75, 0, s * 0.12]} castShadow>
              <boxGeometry args={[0.04, 0.12, 0.02]} />
              <Mat cor={p.calca} tecido />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <Esfera key={s} r={0.016} p={[s * 0.08, 0.462, zr(0.46) + 0.012]} cor={p.botoes ?? "#f2c230"} rug={0.3} met={0.6} />
          ))}
          {/* bolso do peito e o que sai dele */}
          <mesh position={[0.045, 0.385, zr(0.385) + 0.016]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.085, 0.075, 0.012]} />
            <Mat cor={new THREE.Color(p.calca).multiplyScalar(0.8).getStyle()} tecido />
          </mesh>
          {p.bolso === "chave-inglesa" && (
            <group position={[0.06, 0.45, zr(0.42) + 0.005]} rotation={[-0.2, 0, -0.25]}>
              <mesh>
                <boxGeometry args={[0.018, 0.1, 0.01]} />
                <Mat cor="#b9c0c8" rug={0.3} met={0.8} />
              </mesh>
              <mesh position={[0, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.02, 0.008, 6, 12, Math.PI * 1.4]} />
                <Mat cor="#b9c0c8" rug={0.3} met={0.8} />
              </mesh>
            </group>
          )}
          {p.bolso === "caneta" && (
            <mesh position={[0.03, 0.44, zr(0.42) + 0.008]} rotation={[-0.2, 0, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.08, 8]} />
              <Mat cor="#d33" rug={0.4} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
};

const Mao: React.FC<{ p: Personagem3D; lado: 1 | -1; dedo: number; aberta: number }> = ({ p, lado, dedo, aberta }) => (
  <group position={[0, -0.03, 0]}>
    <Esfera r={0.068} p={[0, -0.035, 0]} esc={[0.82, 1 + aberta * 0.2, 0.62]} cor={p.pele} rug={0.55} />
    {/* polegar para a frente e para dentro */}
    <Capsula r={0.02} c={0.04} x={-lado * 0.04} y={-0.02} z={0.028} rot={[0.5, 0, -lado * (0.7 + aberta * 0.4)]} cor={p.pele} />
    {dedo > 0.05 && <Capsula r={0.017} c={0.07 * dedo} x={-lado * 0.012} y={-0.115} z={0.012} cor={p.pele} />}
  </group>
);

const Braco: React.FC<{ p: Personagem3D; lado: 1 | -1; pose: Pose3D }> = ({ p, lado, pose }) => {
  const k = lado > 0 ? "E" : "D";
  const g = (j: string) => pose[j] ?? 0;
  return (
    <group position={[lado * 0.205, 0.455, 0]} rotation={[g(`ombro${k}.x`), 0, g(`ombro${k}.z`)]}>
      <Esfera r={0.068} p={[0, 0, 0]} cor={p.camiseta} rug={0.85} />
      <Capsula r={0.066} c={0.07} y={-0.06} cor={p.camiseta} tecido />
      <Capsula r={0.048} c={0.16} y={-0.14} cor={p.pele} />
      <group position={[0, -0.27, 0]} rotation={[g(`cotovelo${k}.x`), 0, g(`cotovelo${k}.z`)]}>
        <Esfera r={0.048} p={[0, 0, 0]} cor={p.pele} rug={0.55} />
        <Capsula r={0.045} c={0.17} y={-0.12} cor={p.pele} />
        <group position={[0, -0.25, 0]}>
          <Mao p={p} lado={lado} dedo={lado < 0 ? g("dedo") : 0} aberta={g("maos")} />
        </group>
      </group>
    </group>
  );
};

const Perna: React.FC<{ p: Personagem3D; lado: 1 | -1; pose: Pose3D }> = ({ p, lado, pose }) => {
  const k = lado > 0 ? "E" : "D";
  const g = (j: string) => pose[j] ?? 0;
  return (
    <group position={[lado * 0.095, 0, 0]} rotation={[g(`perna${k}.x`), 0, g(`perna${k}.z`)]}>
      <Capsula r={0.08} c={0.17} y={-0.13} cor={p.calca} tecido />
      <group position={[0, -0.29, 0]} rotation={[g(`joelho${k}.x`), 0, 0]}>
        <Capsula r={0.074} c={0.16} y={-0.12} cor={p.calca} tecido />
        {/* bota */}
        <group position={[0, -0.27, 0.035]} rotation={[-(g(`perna${k}.x`) + g(`joelho${k}.x`)) * 0.6, 0, 0]}>
          <Esfera r={0.1} p={[0, 0.0, 0]} esc={[0.85, 0.62, 1.35]} cor={p.sapato} rug={0.5} verniz={0.4} />
          <mesh position={[0, -0.045, 0.005]} castShadow>
            <boxGeometry args={[0.17, 0.025, 0.27]} />
            <Mat cor="#2a211b" rug={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export const Boneco3D: React.FC<{ p: Personagem3D; pose: Pose3D; expressao?: Expressao3D; boca?: number; olhar?: [number, number]; pisca?: number; suor?: number; cobertor?: number; bafo?: number; t?: number }> = ({
  p, pose, expressao = "neutro", boca = 0, olhar = [0, 0], pisca = 0, suor = 0, cobertor = 0, bafo = 0, t = 0,
}) => {
  const g = (j: string) => pose[j] ?? 0;
  const esc = (p.altura ?? 1.6) / 1.6;
  return (
    <group scale={esc}>
      <group position={[0, 0.635 + g("quadril.y"), 0]} rotation={[g("quadril.x"), 0, 0]}>
        {/* quadril */}
        <Esfera r={0.17} p={[0, 0.02, 0]} esc={[1.12, 0.7, 0.85]} cor={p.calca} />
        <Perna p={p} lado={1} pose={pose} />
        <Perna p={p} lado={-1} pose={pose} />
        <group position={[0, 0.0, 0]} rotation={[g("tronco.x"), g("tronco.y"), g("tronco.z")]}>
          <Tronco p={p} />
          <Cobertor k={cobertor} />
          <Braco p={p} lado={1} pose={pose} />
          <Braco p={p} lado={-1} pose={pose} />
          {/* pescoço e cabeça */}
          <Capsula r={0.058} c={0.05} y={0.565} cor={p.pele} />
          <group position={[0, 0.6, 0]} rotation={[g("cabeca.x"), g("cabeca.y"), g("cabeca.z")]}>
            <group position={[0, R * 0.92, 0.01]}>
              <Cabeca p={p} expressao={expressao} boca={boca} olhar={olhar} pisca={pisca} suor={suor} bafo={bafo} t={t} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
