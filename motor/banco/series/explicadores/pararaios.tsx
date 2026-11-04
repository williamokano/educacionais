import React from "react";
import * as THREE from "three";
import { clamp01, lerp, suave, valor } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Expressao3D, Pose3D, V3, Valor } from "../../../src/v3d/tipos";
import { compr, Etiqueta, Fumaca, Halo, Liga, mistura, noCaminho, V } from "./cozinha-base";
import { Auto } from "./pista";
import { zeca } from "./zeca";

// Para-raios (episódio 15, "como proteger uma casa de um raio, peça por peça"). Quatro palcos no mesmo mundo, em x diferentes:
//   palco "casa" (x = 0): casa térrea num platô (o ponto mais alto), nuvem, chuva, terreno em corte. Casa: x ±3, z -2,6 a 2,4, parede 3 m, cumeeira 4,5 m (z = -0,1).
//     Frente do platô em z = 4,2 (a face de terra é o "raio-X do solo"). Haste na cumeeira (x = 0), cabo pelo telhado e parede em x = 2,7, hastes na face de terra.
//   palco "estrada" (x = 60): estrada molhada, carro fechado (vidros translúcidos) com o Zeca dentro, casa protegida ao fundo.
//   palco "franklin" (x = 120): gravura sépia, silhueta de casaca ao lado de uma casa antiga com haste.
//   palco "mapa" (x = 180): Brasil em 3D à noite, raios por todo lado.
// REGRA: o nome "para-raios" só aparece na batida 12 (rótulo e fala). Antes disso as peças são ditas pelo que fazem.
// Campos da cena (número, { de, para, ini, fim } ou chaves [[progresso, valor], ...]; strings e booleanos fixos):
//   palco      "casa" (padrão) | "estrada" | "franklin" | "mapa"
//   tempo      chuva 0..1 (padrão 1) · vento 0..1 (padrão 1) · nuvem 0..1 (padrão 1)
//   raio       raio, raio2, raio3 (0..1: a descida do raio até 0,4, o clarão, e some) · alvo, alvo2, alvo3: "telhado" | "haste" | "carro" · ramos 0..1 (ramos que não chegam)
//   casa       luz 0..1 (janelas; padrão 1) · casaEscura 0..1 · pisca 0..1 (luzes piscando) · fogo 0..1 (telhado em chamas) · estoura 0..1 (faíscas nas tomadas) · raiox 0..1 (parede da frente de vidro, por dentro)
//   peças      haste 0..1 (sobe) · cabo 0..1 (desce, até o chão) · terra 0..1 (hastes enterradas, ligadas ao cabo) · escada 0..1
//   corrente   espalha 0..1 (corrente quente pelo telhado, parede e fiação) · fiacao 0..1 (fios tracejados na parede) · onda 0..1 (corrente descendo: haste, cabo, chão)
//              acumula 0..1 (a corrente se acumula na ponta do cabo, faíscas) · leque 0..1 (a corrente abre pela terra e some) · destaque 0..1 (halos nas três peças, uma a uma)
//   estrada    carro: true (aparece) · porta 0..1 (1 = fechada) · zecaDentro 0..1 (0 fora, 1 sentado no carro) · gaiola 0..1 (barras em volta do carro) · carroRot (rad) · casaFundo: true
//              corrCarro 0..1 (a corrente corre por fora da lataria) · segura 0..1 (aura verde em volta de quem está dentro)
//   franklin   (nada: a gravura toca sozinha; `raio` faz o raio da gravura)
//   mapa       flashes 0..1 (quantos raios)
//   gente      lista de { x, y, z, rot, acao, exp, pose, incl, esc } (sempre o `zeca`) · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax
//              chaves: haste, cabo, aterra, gaiola

const n0 = (v: unknown) => v as Valor;
const chaves = (a: [number, number][], p: number) => {
  if (p <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    if (p <= a[i][0]) return lerp(a[i - 1][1], a[i][1], suave(clamp01((p - a[i - 1][0]) / Math.max(a[i][0] - a[i - 1][0], 1e-6))));
  }
  return a[a.length - 1][1];
};

const PALCO_X: Record<string, number> = { casa: 0, estrada: 60, franklin: 120, mapa: 180 };
const ZC = -0.1; // z da cumeeira
const ZFR = 2.4; // z da parede da frente
const ZPLATO = 4.2; // frente do platô (face de terra)
const CUME = 4.5;
const roofY = (z: number) => CUME - 0.6 * Math.abs(z - ZC);
const COBRE = "#d8873a";
const ACO = "#c9d1d9";
const QUENTE = "#ff9a2e";
const AZUL = "#a9ccff";
const ROD_X = [1.6, 2.7, 3.8];
const BUS_Y = -0.55;
const ROD_FUNDO = -2.6;
const HASTE_TOPO = CUME + 1.0;

/* ---------- caminhos ---------- */

const caminhoCabo: V[] = [
  [0, CUME + 0.06, ZC], [2.7, CUME + 0.06, ZC],
  [2.7, roofY(2.8) + 0.08, 2.8], [2.7, 2.62, ZFR + 0.14], [2.7, 0.05, ZFR + 0.14],
  [2.7, 0.05, ZPLATO], [2.7, -0.15, ZPLATO + 0.03],
];
const caminhoBus: V[] = [[2.7, -0.15, ZPLATO + 0.03], [2.7, BUS_Y, ZPLATO + 0.03]];
const cauda = (pts: V[], s: number): V[] => {
  const out: V[] = [pts[0]];
  let resto = s;
  for (let i = 0; i + 1 < pts.length && resto > 0; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (resto >= l) out.push(b);
    else out.push([lerp(a[0], b[0], resto / l), lerp(a[1], b[1], resto / l), lerp(a[2], b[2], resto / l)]);
    resto -= l;
  }
  return out;
};
// fios da corrente quente (sem cabo): da base da haste pelo telhado e pela parede, até a fiação
const FIOS: V[][] = [
  [[0, CUME + 0.08, ZC], [-1.0, roofY(1.6) + 0.08, 1.6], [-1.0, roofY(2.8) + 0.08, 2.8], [-1.0, 2.6, ZFR + 0.14], [-1.0, 2.5, ZFR + 0.14], [-2.5, 2.5, ZFR + 0.14], [-2.5, 1.2, ZFR + 0.14]],
  [[0, CUME + 0.08, ZC], [0.6, roofY(1.8) + 0.08, 1.8], [0.6, roofY(2.8) + 0.08, 2.8], [0.6, 2.6, ZFR + 0.14], [0.6, 2.5, ZFR + 0.14], [0.6, 0.45, ZFR + 0.14], [1.0, 0.45, ZFR + 0.14]],
  [[0, CUME + 0.08, ZC], [1.8, roofY(0.7) + 0.08, 0.7], [1.8, roofY(2.8) + 0.08, 2.8], [1.8, 2.6, ZFR + 0.14], [1.8, 2.5, ZFR + 0.14], [2.3, 2.5, ZFR + 0.14]],
];
const FIACAO: V[][] = [
  [[-2.7, 2.5, ZFR + 0.14], [2.5, 2.5, ZFR + 0.14]],
  [[-2.5, 2.5, ZFR + 0.14], [-2.5, 1.0, ZFR + 0.14]],
  [[0.6, 2.5, ZFR + 0.14], [0.6, 0.45, ZFR + 0.14], [1.0, 0.45, ZFR + 0.14]],
  [[-0.6, 2.5, ZFR + 0.14], [-0.6, 1.55, ZFR + 0.14]],
];

const Tracejado: React.FC<{ pts: V[]; cor: string; w?: number; op?: number; t?: number }> = ({ pts, cor, w = 0.05, op = 1, t = 0 }) => {
  const L = compr(pts);
  const passo = 0.38;
  const n = Math.floor(L / passo);
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const s0 = i * passo + ((t * 0.5) % passo);
        const a = noCaminho(pts, Math.min(s0, L)).p;
        const b = noCaminho(pts, Math.min(s0 + 0.24, L)).p;
        return <Liga key={i} a={a} b={b} w={w} cil cor={cor} op={op} basico />;
      })}
    </group>
  );
};

/** Luz que corre por uma linha quebrada: `k` 0..1 é a posição da cabeça; `cauda` (m) é o comprimento aceso atrás dela (sem `cauda`, o caminho todo fica aceso). */
const CaminhoLuz: React.FC<{ pts: V[]; k: number; cor: string; w?: number; cauda?: number; op?: number; halo?: number }> = ({ pts, k, cor, w = 0.1, cauda: cd, op = 1, halo = 0.7 }) => {
  if (k <= 0.001 || op <= 0.02) return null;
  const L = compr(pts);
  const s1 = Math.min(1, k) * L;
  const s0 = cd === undefined ? 0 : Math.max(0, s1 - cd);
  const n = Math.max(2, Math.min(40, Math.ceil((s1 - s0) / 0.2)));
  const cabeca = noCaminho(pts, s1).p;
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const a = noCaminho(pts, lerp(s0, s1, i / n)).p;
        const b = noCaminho(pts, lerp(s0, s1, (i + 1) / n)).p;
        const f = cd === undefined ? 1 : (i + 1) / n;
        return (
          <group key={i}>
            <Liga a={a} b={b} w={w * 2.4} cil cor={cor} op={op * 0.35 * f} basico />
            <Liga a={a} b={b} w={w} cil cor="#fffbe8" op={op * f} basico />
          </group>
        );
      })}
      <Halo p={cabeca} r={halo} cor={cor} op={0.9 * op} />
    </group>
  );
};

/* ---------- raio ---------- */

const zigue = (seed: number, de: V, para: V, n = 15, amp = 1.0): V[] =>
  Array.from({ length: n + 1 }).map((_, i) => {
    const u = i / n;
    const env = Math.sin(Math.PI * u) ** 0.7;
    const sg = i % 2 ? 1 : -1;
    return [
      lerp(de[0], para[0], u) + (sg * (0.45 + 0.55 * rnd(seed + i)) + (rnd(seed + i + 40) - 0.5) * 0.5) * amp * env,
      lerp(de[1], para[1], u),
      lerp(de[2], para[2], u) + (rnd(seed + i + 80) - 0.5) * amp * 0.8 * env,
    ] as V;
  });

/** brilho 0..1 de um raio de progresso k (desce até 0,4; clarão; some até 0,95) */
const brilhoRaio = (k: number) => (k <= 0 || k >= 0.97 ? 0 : k < 0.4 ? 0.45 : k < 0.52 ? 1 : Math.max(0, 1 - (k - 0.52) / 0.43));

const Raio: React.FC<{ k: number; de: V; para: V; seed: number; t: number; esc?: number; cor?: string }> = ({ k, de, para, seed, t, esc = 1, cor = AZUL }) => {
  const b = brilhoRaio(k);
  if (b <= 0.02) return null;
  const op = b * (0.78 + 0.22 * Math.sin(t * 70 + seed));
  const N = 15;
  const pts = zigue(seed, de, para, N, 1.1 * esc);
  const desce = Math.min(1, k / 0.4) * N;
  const cheg = k >= 0.4;
  const segs = pts.slice(1).map((q, i) => {
    const a = pts[i];
    if (i >= desce) return null;
    const f = Math.min(1, desce - i);
    const e: V = [lerp(a[0], q[0], f), lerp(a[1], q[1], f), lerp(a[2], q[2], f)];
    return (
      <group key={i}>
        <Liga a={a} b={e} w={0.5 * esc} cil cor={cor} op={op * 0.55} basico />
        <Liga a={a} b={e} w={0.2 * esc} cil cor="#ffffff" op={Math.min(1, op * 1.3)} basico />
      </group>
    );
  });
  const ramos = [4, 7, 10].map((idx, bi) => {
    if (desce < idx) return null;
    const o = pts[idx];
    const dir = (bi % 2 ? -1 : 1) * (1.4 + rnd(seed + bi) * 1.3) * esc;
    const fim: V = [o[0] + dir, o[1] - (2.6 + rnd(seed + 9 + bi)) * esc, o[2] + (rnd(seed + 20 + bi) - 0.5) * 1.2 * esc];
    const rp = zigue(seed + 100 + bi, o, fim, 5, 0.5 * esc);
    return rp.slice(1).map((q, i) => (
      <group key={`${bi}-${i}`}>
        <Liga a={rp[i]} b={q} w={0.26 * esc} cil cor={cor} op={op * 0.45} basico />
        <Liga a={rp[i]} b={q} w={0.09 * esc} cil cor="#ffffff" op={op} basico />
      </group>
    ));
  });
  const cab = pts[Math.min(N, Math.floor(desce))];
  return (
    <group>
      {segs}
      {ramos}
      <Halo p={cheg ? para : cab} r={(cheg ? 2.0 : 1.2) * esc} cor={cor} op={0.6 * op} />
      {cheg && <Halo p={para} r={1.2 * esc} cor="#ffffff" op={op} />}
    </group>
  );
};

const alvoDe = (nome: string): V => (nome === "haste" ? [0, HASTE_TOPO + 0.02, ZC] : nome === "carro" ? [0, 1.55, 0.25] : [-0.5, roofY(0.9) + 0.05, 0.9]);

/* ---------- clima ---------- */

const Nuvens: React.FC<{ cx: number; cz: number; t: number; forca: number; flash: number }> = ({ cx, cz, t, forca, flash }) => {
  if (forca <= 0.02) return null;
  const cor = mistura("#2a3246", "#8fa8d8", flash * 0.7);
  return (
    <group>
      {Array.from({ length: 34 }).map((_, i) => {
        const x = cx + (rnd(i) - 0.5) * 36 + Math.sin(t * 0.12 + i) * 0.8;
        const z = cz - 14 + rnd(i + 30) * 22;
        const y = 12.5 + rnd(i + 60) * 3.5 - (Math.abs(x - cx) < 7 ? 1.0 : 0);
        const r = 3.2 + rnd(i + 90) * 2.6;
        return (
          <mesh key={i} position={[x, y, z]} scale={[r * 1.5, r * 0.75, r]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={cor} roughness={1} emissive="#7d9ae0" emissiveIntensity={flash * 0.9} flatShading />
          </mesh>
        );
      })}
    </group>
  );
};

const Chuva: React.FC<{ forca: number; cx: number; cz: number; t: number; raio?: number }> = ({ forca, cx, cz, t, raio = 13 }) => {
  if (forca <= 0.02) return null;
  const n = Math.round(300 * forca);
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const y = 13 - ((t * 9 + rnd(i + 99) * 3) % 1) * 13;
        const x = cx + (rnd(i) - 0.5) * raio * 2 + (13 - y) * 0.22;
        const z = cz + (rnd(i + 50) - 0.5) * raio * 1.6 + 1;
        return <mesh key={i} position={[x, y, z]} rotation={[0, 0, 0.22]}><boxGeometry args={[0.018, 0.65, 0.018]} /><meshBasicMaterial color="#cfe4ff" transparent opacity={0.5} /></mesh>;
      })}
    </group>
  );
};

/* ---------- cenário de fundo ---------- */

const Arvore: React.FC<{ x: number; y?: number; z: number; s: number; t: number; vento: number }> = ({ x, y = 0, z, s, t, vento }) => (
  <group position={[x, y, z]} scale={s} rotation={[0, 0, 0.06 * vento * Math.sin(t * 2.2 + x)]}>
    <mesh position={[0, 1.3, 0]}><cylinderGeometry args={[0.2, 0.3, 2.6, 7]} /><meshStandardMaterial color="#4a3626" roughness={1} /></mesh>
    <mesh position={[0, 3.5, 0]} rotation={[0, 0, 0.04 * vento * Math.sin(t * 3 + z)]}><icosahedronGeometry args={[1.7, 1]} /><meshStandardMaterial color="#2c5233" roughness={1} flatShading /></mesh>
    <mesh position={[0.7, 2.7, 0.3]}><icosahedronGeometry args={[1.1, 1]} /><meshStandardMaterial color="#34603b" roughness={1} flatShading /></mesh>
  </group>
);

const Poste: React.FC<{ x: number; y?: number; z: number }> = ({ x, y = 0, z }) => (
  <group position={[x, y, z]}>
    <mesh position={[0, 3.5, 0]}><cylinderGeometry args={[0.1, 0.14, 7, 8]} /><meshStandardMaterial color="#5f564b" roughness={1} /></mesh>
    <Caixa p={[0, 6.7, 0]} t={[2.0, 0.12, 0.14]} cor="#5f564b" raio={0.02} />
    <Caixa p={[0, 6.1, 0]} t={[1.4, 0.1, 0.12]} cor="#5f564b" raio={0.02} />
    {[-0.95, 0.95].map((dx) => <mesh key={dx} position={[dx, 6.82, 0]}><sphereGeometry args={[0.09, 8, 6]} /><meshStandardMaterial color="#c8d0d8" /></mesh>)}
  </group>
);

const CasinhaLonge: React.FC<{ x: number; y?: number; z: number; cor: string; s?: number; rot?: number }> = ({ x, y = 0, z, cor, s = 1, rot = 0 }) => (
  <group position={[x, y, z]} scale={s} rotation={[0, rot, 0]}>
    <Caixa p={[0, 1.2, 0]} t={[4, 2.4, 3.4]} cor={cor} raio={0.05} />
    <mesh position={[0, 3.0, 0]} rotation={[0, Math.PI / 2, 0]}><coneGeometry args={[2.9, 1.7, 4]} /><meshStandardMaterial color="#6a3a2c" roughness={1} flatShading /></mesh>
    {[-1.1, 1.1].map((dx) => <mesh key={dx} position={[dx, 1.4, 1.72]}><boxGeometry args={[0.8, 0.7, 0.05]} /><meshBasicMaterial color="#ffd98a" /></mesh>)}
  </group>
);

const Morros: React.FC<{ cx: number; y: number; zf: number }> = ({ cx, y, zf }) => (
  <group>
    {[-34, -14, 8, 30].map((dx, i) => (
      <mesh key={i} position={[cx + dx, y + 2.4 + rnd(i) * 1.5, zf - rnd(i + 9) * 8]} scale={[1, 1, 0.8]}>
        <coneGeometry args={[13 + rnd(i + 3) * 5, 9 + rnd(i + 5) * 4, 6]} />
        <meshStandardMaterial color="#1a2638" roughness={1} flatShading />
      </mesh>
    ))}
  </group>
);

const Varal: React.FC<{ x: number; z: number; t: number; vento: number }> = ({ x, z, t, vento }) => (
  <group position={[x, 0, z]}>
    {[-1.4, 1.4].map((dx) => <mesh key={dx} position={[dx, 1.0, 0]}><cylinderGeometry args={[0.04, 0.05, 2.0, 6]} /><meshStandardMaterial color="#6e5a44" /></mesh>)}
    <Liga a={[-1.4, 1.95, 0]} b={[1.4, 1.9, 0]} w={0.015} cil cor="#cfc7b8" />
    {[-0.9, -0.1, 0.7].map((dx, i) => (
      <group key={i} position={[dx, 1.9, 0]} rotation={[0, 0, 0.3 * vento * Math.sin(t * 4 + i * 1.7)]}>
        <mesh position={[0, -0.32, 0]}><boxGeometry args={[0.5, 0.62, 0.03]} /><meshStandardMaterial color={["#e8d9a0", "#9ec1e8", "#e8a0a0"][i]} roughness={1} /></mesh>
      </group>
    ))}
  </group>
);

/* ---------- casa ---------- */

type CasaP = { haste: number; cabo: number; terra: number; luz: number; pisca: number; raiox: number; fogo: number; estoura: number; escada: number; espalha: number; fiacao: number; onda: number; acumula: number; leque: number; destaque: number; t: number };

const Casa: React.FC<CasaP> = (c) => {
  const { t } = c;
  const luzK = c.luz * (c.pisca > 0.02 ? 1 - c.pisca * (Math.sin(t * 37) + Math.sin(t * 53 + 1) > 0.2 ? 0.95 : 0) : 1);
  const parede = "#e6dcc8";
  const opF = 1 - 0.8 * c.raiox;
  const telha = "#8a3b2e";
  const geoTri = React.useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-2.6, 0);
    sh.lineTo(ZFR, 0);
    sh.lineTo(ZC, 1.5);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 6, bevelEnabled: false });
    g.rotateY(-Math.PI / 2);
    g.translate(3, 0, 0);
    return g;
  }, []);
  const ang = Math.atan(0.6);
  const Lr = Math.hypot(2.9, 1.74);
  const haste = suave(c.haste);
  const dg = (i: number) => { const k = c.destaque * 3 - i; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };
  return (
    <group>
      {/* paredes */}
      <Caixa p={[0, 1.5, -2.5]} t={[6, 3, 0.2]} cor={parede} raio={0.02} />
      {[-1, 1].map((s) => <Caixa key={s} p={[s * 2.9, 1.5, -0.1]} t={[0.2, 3, 5]} cor={parede} raio={0.02} />)}
      <Caixa p={[0, 0.05, -0.1]} t={[6, 0.1, 5]} cor="#7a6a55" raio={0.01} />
      <mesh position={[0, 3.0, 0]} geometry={geoTri}><meshStandardMaterial color={parede} roughness={1} /></mesh>
      {/* frente (vira vidro no raio-X) */}
      <group>
        <Caixa p={[-2.525, 1.5, ZFR]} t={[0.75, 3, 0.2]} cor={parede} op={opF < 1 ? opF : undefined} raio={0.02} sombra={false} />
        <Caixa p={[-1.6, 2.55, ZFR]} t={[1.1, 0.9, 0.2]} cor={parede} op={opF < 1 ? opF : undefined} raio={0.02} sombra={false} />
        <Caixa p={[0, 0.5, ZFR]} t={[1.4, 1.0, 0.2]} cor={parede} op={opF < 1 ? opF : undefined} raio={0.02} sombra={false} />
        <Caixa p={[0, 2.7, ZFR]} t={[1.4, 0.6, 0.2]} cor={parede} op={opF < 1 ? opF : undefined} raio={0.02} sombra={false} />
        <Caixa p={[1.8, 0.5, ZFR]} t={[1.4, 1.0, 0.2]} cor={parede} op={opF < 1 ? opF : undefined} raio={0.02} sombra={false} />
        <Caixa p={[1.8, 2.7, ZFR]} t={[1.4, 0.6, 0.2]} cor={parede} op={opF < 1 ? opF : undefined} raio={0.02} sombra={false} />
        <Caixa p={[0.9, 1.5, ZFR]} t={[0.4, 3, 0.2]} cor={parede} op={opF < 1 ? opF : undefined} raio={0.02} sombra={false} />
        <Caixa p={[2.7, 1.5, ZFR]} t={[0.6, 3, 0.2]} cor={parede} op={opF < 1 ? opF : undefined} raio={0.02} sombra={false} />
        <Caixa p={[-0.9, 1.5, ZFR]} t={[0.4, 3, 0.2]} cor={parede} op={opF < 1 ? opF : undefined} raio={0.02} sombra={false} />
        {/* janelas acesas */}
        {[0.0, 1.8].map((x) => (
          <group key={x} position={[x, 1.6, ZFR]}>
            <mesh><boxGeometry args={[1.4, 1.1, 0.06]} /><meshBasicMaterial color={mistura("#1c2230", "#ffd98a", luzK)} /></mesh>
            <Caixa p={[0, 0, 0.04]} t={[0.05, 1.1, 0.04]} cor="#5b4a38" raio={0.005} sombra={false} />
            <Caixa p={[0, 0, 0.04]} t={[1.4, 0.05, 0.04]} cor="#5b4a38" raio={0.005} sombra={false} />
            {luzK > 0.05 && <Halo p={[0, 0, 0.5]} r={1.6} cor="#ffd98a" op={0.35 * luzK} />}
          </group>
        ))}
        {/* porta */}
        <Caixa p={[-1.6, 1.05, ZFR]} t={[1.0, 2.1, 0.08]} cor="#7a4a2a" raio={0.01} sombra={false} />
        <mesh position={[-1.25, 1.0, ZFR + 0.07]}><sphereGeometry args={[0.05, 8, 6]} /><meshStandardMaterial color="#e6c15a" metalness={0.6} roughness={0.4} /></mesh>
        <Caixa p={[-1.6, -0.0, ZFR + 0.5]} t={[1.4, 0.1, 0.9]} cor="#8d8478" raio={0.02} />
        {/* tomada e estouro */}
        <Caixa p={[1.0, 0.45, ZFR + 0.14]} t={[0.14, 0.2, 0.04]} cor="#f4f1ea" raio={0.01} sombra={false} />
        {c.estoura > 0.02 && Array.from({ length: 12 }).map((_, i) => {
          const u = (t * 2.6 + rnd(i)) % 1;
          const a = rnd(i + 5) * Math.PI;
          return <mesh key={i} position={[1.0 + Math.cos(a) * u * 0.9, 0.5 + Math.sin(a) * u * 0.9 - u * u * 0.5, ZFR + 0.15 + u * 0.3]} scale={0.045 * (1 - u) * c.estoura}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#ffe27a" /></mesh>;
        })}
        {c.estoura > 0.02 && <Halo p={[1.0, 0.5, ZFR + 0.4]} r={0.9} cor="#ffe27a" op={0.8 * c.estoura * (0.6 + 0.4 * Math.sin(t * 30))} />}
      </group>
      {/* telhado: duas águas, beiral de 0,5 m */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 3.55, ZC + s * 1.45]} rotation={[s * ang, 0, 0]} castShadow>
          <boxGeometry args={[6.8, 0.14, Lr]} />
          <meshStandardMaterial color={telha} roughness={0.9} />
        </mesh>
      ))}
      <Caixa p={[0, CUME + 0.02, ZC]} t={[6.9, 0.14, 0.3]} cor="#6a2c22" raio={0.03} />
      <Caixa p={[-2.0, 4.6, -1.3]} t={[0.6, 1.4, 0.6]} cor="#8c6b55" raio={0.02} />
      {/* por dentro (raio-X) */}
      {c.raiox > 0.05 && (
        <group>
          <mesh position={[0, 2.78, 0.4]}><sphereGeometry args={[0.16, 10, 8]} /><meshBasicMaterial color="#fff2c0" /></mesh>
          <Halo p={[0, 2.7, 0.6]} r={1.4} cor="#ffe9a8" op={0.6 * luzK * c.raiox} />
          <Caixa p={[-1.5, 0.45, -0.8]} t={[2.0, 0.7, 0.9]} cor="#5b7aa8" raio={0.08} />
          <Caixa p={[1.8, 0.4, -1.4]} t={[1.0, 0.8, 0.7]} cor="#9a7a52" raio={0.04} />
          <Liga a={[0, 2.78, 0.4]} b={[0, 2.95, ZFR - 0.1]} w={0.03} cil cor="#2a2d33" />
        </group>
      )}
      {c.fiacao > 0.02 && FIACAO.map((pts, i) => <Tracejado key={i} pts={pts} cor={mistura("#7f8ea8", QUENTE, c.espalha)} w={0.06} op={c.fiacao} t={t} />)}
      {/* escada */}
      {c.escada > 0.02 && (
        <group>
          {[-0.28, 0.28].map((dx) => <Liga key={dx} a={[-2.4 + dx, 0, 3.4]} b={[-2.4 + dx, 2.9, ZFR + 0.55]} w={0.07} cor="#c7a36b" />)}
          {Array.from({ length: 9 }).map((_, i) => { const u = (i + 1) / 10; return <Liga key={i} a={[-2.68, 2.9 * u, lerp(3.4, ZFR + 0.55, u)]} b={[-2.12, 2.9 * u, lerp(3.4, ZFR + 0.55, u)]} w={0.05} cor="#c7a36b" />; })}
        </group>
      )}
      {/* haste (pontuda) na cumeeira */}
      {haste > 0.01 && (
        <group position={[0, CUME + 0.05, ZC]} scale={[1, haste, 1]}>
          <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.04, 0.055, 0.9, 10]} /><meshStandardMaterial color={ACO} metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0, 0.98, 0]}><coneGeometry args={[0.045, 0.2, 10]} /><meshStandardMaterial color="#e8eef5" metalness={0.8} roughness={0.2} /></mesh>
          <Caixa p={[0, 0.02, 0]} t={[0.4, 0.08, 0.4]} cor="#4a4f58" raio={0.02} />
          {dg(0) > 0.01 && <Halo p={[0, 0.9, 0.3]} r={1.2} cor="#9fdcff" op={0.9 * dg(0)} />}
        </group>
      )}
      {/* cabo de descida */}
      {c.cabo > 0.01 && (() => {
        const pts = cauda(caminhoCabo, suave(c.cabo) * compr(caminhoCabo));
        return (
          <group>
            {pts.slice(1).map((q, i) => <Liga key={i} a={pts[i]} b={q} w={0.1} cil cor={COBRE} />)}
            {Array.from({ length: 6 }).map((_, i) => {
              const s = 1.4 + i * 1.3;
              if (s > suave(c.cabo) * compr(caminhoCabo)) return null;
              const p = noCaminho(caminhoCabo, s).p;
              return <Caixa key={i} p={p} t={[0.2, 0.08, 0.14]} cor="#555b66" raio={0.01} sombra={false} />;
            })}
            {dg(1) > 0.01 && <Halo p={[2.7, 1.4, ZFR + 0.4]} r={1.2} cor="#ffb26b" op={0.9 * dg(1)} />}
          </group>
        );
      })()}
      {/* fogo no telhado */}
      {c.fogo > 0.02 && (
        <group>
          {Array.from({ length: 9 }).map((_, i) => {
            const x = -1.8 + i * 0.5 + rnd(i) * 0.3;
            const z = 0.4 + rnd(i + 4) * 1.3;
            const fl = 0.7 + 0.3 * Math.sin(t * 13 + i * 2.1);
            const h = (0.9 + rnd(i + 9) * 0.8) * c.fogo * fl;
            return (
              <group key={i} position={[x, roofY(z) + 0.1, z]}>
                <mesh position={[0, h / 2, 0]}><coneGeometry args={[0.32, h, 6]} /><meshBasicMaterial color="#ff5a1a" transparent opacity={0.9} /></mesh>
                <mesh position={[0, h * 0.4, 0.02]}><coneGeometry args={[0.18, h * 0.7, 6]} /><meshBasicMaterial color="#ffd23f" /></mesh>
              </group>
            );
          })}
          <Halo p={[0, 5.0, 1.2]} r={3.0} cor="#ff8a2a" op={0.55 * c.fogo} />
          <Fumaca p={[0, 5.0, 1.0]} t={t} k={c.fogo} cor="#2a2724" alt={4} larg={3.2} op={0.7} n={14} />
        </group>
      )}
    </group>
  );
};

/** Terreno: platô gramado com a frente aberta (corte de terra), terra em camadas, terreno baixo em volta. */
const Terreno: React.FC<{ cx?: number }> = () => {
  const bandas: [number, number, string][] = [[-0.1, -0.75, "#7a5539"], [-0.75, -1.55, "#6b4a32"], [-1.55, -2.35, "#5c3f2a"], [-2.35, -3.2, "#4d3524"]];
  return (
    <group>
      <mesh position={[0, -1.65, -5.9]}><boxGeometry args={[16, 3.1, 20.2]} /><meshStandardMaterial color="#6b4a32" roughness={1} /></mesh>
      <mesh position={[0, -0.05, -5.9]}><boxGeometry args={[16.05, 0.12, 20.25]} /><meshStandardMaterial color="#35603a" roughness={1} /></mesh>
      {bandas.map(([a, b, cor], i) => <mesh key={i} position={[0, (a + b) / 2, ZPLATO + 0.004]}><planeGeometry args={[16, a - b]} /><meshStandardMaterial color={cor} roughness={1} /></mesh>)}
      {Array.from({ length: 46 }).map((_, i) => (
        <mesh key={i} position={[-7.6 + rnd(i) * 15.2, -0.25 - rnd(i + 20) * 2.8, ZPLATO + 0.012]} scale={[0.1 + rnd(i + 5) * 0.12, 0.07 + rnd(i + 6) * 0.07, 0.02]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 3 ? "#8a7a68" : "#3b2a1c"} roughness={1} flatShading />
        </mesh>
      ))}
      {/* terreno baixo */}
      <mesh position={[0, -3.25, -10]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[220, 160]} /><meshStandardMaterial color="#1f3626" roughness={1} /></mesh>
    </group>
  );
};

const Hastes: React.FC<{ terra: number; cabo: number; leque: number; acumula: number; onda: number; t: number; destaque: number }> = ({ terra, cabo, leque, acumula, onda, t, destaque }) => {
  const z = ZPLATO + 0.03;
  const k = suave(terra);
  const dg = (() => { const q = destaque * 3 - 2; return q > 0 && q < 1 ? Math.sin(q * Math.PI) : 0; })();
  return (
    <group>
      {k > 0.01 && (
        <group>
          {ROD_X.map((x, i) => {
            const ki = suave(clamp01(k * 1.4 - i * 0.2));
            const topo = lerp(1.1, BUS_Y, ki);
            return (
              <group key={x}>
                <Liga a={[x, topo, z]} b={[x, topo - (BUS_Y - ROD_FUNDO), z]} w={0.1} cil cor={ACO} />
                <mesh position={[x, topo - (BUS_Y - ROD_FUNDO) - 0.12, z]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.07, 0.25, 8]} /><meshStandardMaterial color={ACO} metalness={0.7} roughness={0.3} /></mesh>
                <Caixa p={[x, topo + 0.03, z]} t={[0.2, 0.08, 0.1]} cor="#555b66" raio={0.01} sombra={false} />
              </group>
            );
          })}
          <Liga a={[ROD_X[0], BUS_Y, z]} b={[ROD_X[2], BUS_Y, z]} w={0.1} cil cor={COBRE} op={k} />
          <Liga a={caminhoBus[0]} b={caminhoBus[1]} w={0.1} cil cor={COBRE} op={k} />
          {dg > 0.01 && <Halo p={[2.7, -1.5, z + 0.4]} r={1.8} cor="#7dffa8" op={0.9 * dg} />}
        </group>
      )}
      {/* a corrente descendo: haste → cabo → chão (e hastes enterradas) */}
      {onda > 0.001 && <CaminhoLuz pts={terra > 0.5 ? [[0, HASTE_TOPO, ZC], ...caminhoCabo, caminhoBus[1]] : [[0, HASTE_TOPO, ZC], ...caminhoCabo]} k={onda} cor={QUENTE} w={0.12} cauda={2.8} halo={1.1} />}
      {/* a corrente se acumula na ponta do cabo, sem hastes */}
      {acumula > 0.02 && (
        <group>
          <Halo p={[2.7, -0.15, z + 0.2]} r={0.4 + 1.3 * acumula} cor={QUENTE} op={0.95} />
          <mesh position={[2.7, -0.15, z + 0.1]} scale={0.1 + 0.22 * acumula}><sphereGeometry args={[1, 12, 10]} /><meshBasicMaterial color="#ffd27a" /></mesh>
          {Array.from({ length: 5 }).map((_, i) => {
            const on = ((t * 7 + i * 1.3) % 2) < 0.6;
            if (!on) return null;
            const alvo: V = [[2.5, 0.12, ZFR + 0.15], [1.2, 0.05, 3.4], [3.9, 0.05, 3.5], [2.3, 0.3, ZFR + 0.14], [3.3, -0.3, z]][i] as V;
            const pts = zigue(i * 7 + Math.floor(t * 7), [2.7, -0.15, z + 0.1], alvo, 5, 0.25);
            return pts.slice(1).map((q, j) => <Liga key={`${i}-${j}`} a={pts[j]} b={q} w={0.035} cil cor="#e8f2ff" op={acumula} basico />);
          })}
        </group>
      )}
      {/* o leque pela terra: sai de cada haste, abre e some */}
      {leque > 0.01 && (() => {
        const abre = suave(clamp01(leque / 0.65));
        const some = 1 - suave(clamp01((leque - 0.7) / 0.3));
        return (
          <group>
            {ROD_X.flatMap((x, i) => [-150, -120, -90, -60, -30, -175, -5].map((deg, j) => {
              const a = (deg * Math.PI) / 180;
              const len = (0.9 + 0.8 * rnd(i * 7 + j)) * 1.5 * abre;
              const de: V = [x, ROD_FUNDO + 0.3 + (j > 4 ? 1.2 : 0), z];
              return <CaminhoLuz key={`${i}-${j}`} pts={[de, [x + Math.cos(a) * len, de[1] + Math.sin(a) * len * 0.8, z]]} k={1} cor={QUENTE} w={0.045} op={some * 0.85} halo={0.001} />;
            }))}
            {ROD_X.map((x) => <Halo key={x} p={[x, ROD_FUNDO + 0.6, z + 0.1]} r={0.9 + 2.0 * abre} cor="#ff9a2e" op={0.5 * some} />)}
          </group>
        );
      })()}
    </group>
  );
};

/* ---------- estrada, carro, gaiola ---------- */

const Estrada: React.FC<{ casaFundo: boolean; vento: number; t: number }> = ({ casaFundo, vento, t }) => (
  <group>
    <mesh position={[0, -0.02, -20]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[160, 140]} /><meshStandardMaterial color="#27422c" roughness={1} /></mesh>
    <mesh position={[0, 0.0, -20]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[7.6, 140]} /><meshStandardMaterial color="#2c3036" roughness={0.45} metalness={0.15} /></mesh>
    {Array.from({ length: 24 }).map((_, i) => <mesh key={i} position={[0, 0.012, 14 - i * 3.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.18, 1.7]} /><meshBasicMaterial color="#d6cf9a" /></mesh>)}
    {[-3.6, 3.6].map((x) => <mesh key={x} position={[x, 0.012, -20]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.14, 140]} /><meshBasicMaterial color="#c9ccd2" /></mesh>)}
    {[[-2.0, -1.0], [1.5, -6], [-1.2, -14], [2.0, 6], [0.5, -26]].map(([x, z], i) => <mesh key={i} position={[x, 0.015, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.6 + i * 0.3, 0.7, 1]}><circleGeometry args={[0.9, 14]} /><meshStandardMaterial color="#445064" roughness={0.1} metalness={0.5} /></mesh>)}
    {[[-7.5, 4], [-8.5, -10], [8.5, -3], [9.2, -18], [-9.5, -26], [8, 10], [-8, 14], [10.5, -34], [-11, -42]].map(([x, z], i) => <Arvore key={i} x={x} z={z} s={0.9 + rnd(i) * 0.5} t={t} vento={vento} />)}
    {[[-6.5, -4], [6.5, -22], [-6.5, -40]].map(([x, z], i) => <Poste key={i} x={x} z={z} />)}
    {[[-16, -16, "#c9b79a"], [16, -26, "#a9b5c9"], [-18, -34, "#c9a9a9"], [18, -8, "#b9c9a9"], [-17, 6, "#c9c0a0"]].map(([x, z, cor], i) => <CasinhaLonge key={i} x={x as number} z={z as number} cor={cor as string} s={0.9} rot={x as number < 0 ? 0.4 : -0.4} />)}
    <Morros cx={0} y={0} zf={-60} />
    {casaFundo && (
      <group position={[-9, 0, -30]} scale={1.0}>
        <Casa haste={1} cabo={1} terra={0} luz={1} pisca={0} raiox={0} fogo={0} estoura={0} escada={0} espalha={0} fiacao={0} onda={0} acumula={0} leque={0} destaque={0} t={t} />
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 9]} /><meshStandardMaterial color="#35603a" roughness={1} /></mesh>
      </group>
    )}
  </group>
);

type CarroP = { rot: number; porta: number; dentro: number; gaiola: number; corr: number; segura: number; t: number; exp: Expressao3D };

const CORR_CARRO: V[][] = [
  [[0, 1.5, 0.25], [0, 1.5, -0.4], [0, 0.88, -1.0], [0, 0.86, -1.95], [0, 0.5, -2.2], [0, 0.04, -2.3]],
  [[0, 1.5, 0.25], [0.86, 1.46, 0.25], [0.95, 0.8, 0.25], [1.0, 0.45, 0.25], [1.08, 0.04, 0.3]],
  [[0, 1.5, 0.25], [-0.86, 1.46, 0.25], [-0.95, 0.8, 0.25], [-1.0, 0.45, 0.25], [-1.08, 0.04, 0.3]],
  [[0, 1.5, 0.25], [0, 1.45, 1.0], [0, 0.85, 1.6], [0, 0.5, 2.2], [0, 0.04, 2.3]],
];

const Carro: React.FC<CarroP> = ({ rot, dentro, gaiola, corr, segura, t, exp }) => {
  const pose: Pose3D = { ...poseDe3D("sentado", t), "ombroE.x": -0.9, "ombroD.x": -0.9, "cotoveloE.x": -0.7, "cotoveloD.x": -0.7, "maos": 0.4 };
  const W = 0.97;
  const e = (a: V, b: V, i: number) => <Liga key={i} a={a} b={b} w={0.05} cil cor="#8fd8ff" op={gaiola} basico />;
  const cantos: V[] = [-1, 1].flatMap((sx) => [-2.15, 2.15].map((z) => [sx * W, 0.28, z] as V));
  return (
    <group rotation={[0, rot, 0]}>
      <Auto cor="#d8392e" variante="sedan" vidroOp={0.16} />
      {/* painel e luz dentro */}
      <Caixa p={[0, 0.98, -0.5]} t={[1.3, 0.12, 0.3]} cor="#22262c" raio={0.02} sombra={false} />
      {[-0.5, -0.3, 0.2].map((x, i) => <mesh key={i} position={[x, 1.06, -0.4]}><sphereGeometry args={[0.025, 6, 6]} /><meshBasicMaterial color={["#58ff8a", "#ffd23f", "#58b8ff"][i]} /></mesh>)}
      <pointLight position={[0, 1.2, 0.1]} intensity={2.2} distance={3.5} color="#ffe2a8" />
      {/* motorista */}
      {dentro > 0.5 && (
        <group position={[-0.4, 0.14, 0.3]} rotation={[0, Math.PI, 0]} scale={0.9}>
          <Boneco3D p={zeca} pose={pose} expressao={exp} pisca={piscar(t)} boca={0} olhar={[0, 0]} t={t} />
        </group>
      )}
      {segura > 0.02 && <Halo p={[-0.4, 1.0, 0.1]} r={1.5} cor="#7dffa8" op={0.55 * segura} />}
      {/* gaiola: barras em volta */}
      {gaiola > 0.02 && (
        <group>
          {[-1, 1].flatMap((sx) => [0.28, 1.5].map((y, j) => e([sx * W, y, -2.15], [sx * W, y, 2.15], sx * 10 + j)))}
          {[-2.15, 2.15].flatMap((z) => [0.28, 1.5].map((y, j) => e([-W, y, z], [W, y, z], 100 + (z > 0 ? 10 : 0) + j)))}
          {cantos.map((c, i) => e(c, [c[0], 1.5, c[2]] as V, 200 + i))}
          {[-1.0, 0, 1.0].map((z, i) => e([-W, 1.5, z], [W, 1.5, z], 300 + i))}
        </group>
      )}
      {/* a corrente por fora da lataria */}
      {corr > 0.001 && CORR_CARRO.map((pts, i) => <CaminhoLuz key={i} pts={pts} k={corr} cor={QUENTE} w={0.07} cauda={2.2} halo={0.8} op={1 - 0.0} />)}
    </group>
  );
};

/* ---------- gravura de Franklin e mapa ---------- */

const Gravura: React.FC<{ t: number; raio: number }> = ({ t, raio }) => {
  const tinta = "#3a2a1c";
  const tomMed = "#6b5036";
  return (
    <group>
      <mesh position={[0, 2, -3]}><planeGeometry args={[16, 12]} /><meshBasicMaterial color="#dccaa0" /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[0, 2 + s * 4.6, -2.9]}><boxGeometry args={[14, 0.14, 0.02]} /><meshBasicMaterial color={tinta} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 6.6, 2, -2.9]}><boxGeometry args={[0.14, 9.3, 0.02]} /><meshBasicMaterial color={tinta} /></mesh>)}
      {/* chão e hachuras */}
      <mesh position={[0, -1.95, -2.5]}><boxGeometry args={[13.4, 1.1, 0.05]} /><meshBasicMaterial color={tomMed} /></mesh>
      {Array.from({ length: 22 }).map((_, i) => <mesh key={i} position={[-6.2 + i * 0.58, 4.8, -2.6]} rotation={[0, 0, -0.35]}><boxGeometry args={[0.035, 1.2 + rnd(i) * 0.6, 0.02]} /><meshBasicMaterial color={tomMed} /></mesh>)}
      {/* nuvem escura */}
      {[[-1.2, 5.7, 1.2], [0.2, 5.9, 1.5], [1.6, 5.6, 1.2], [-2.2, 5.5, 0.9], [3.4, 5.8, 1.0]].map(([x, y, r], i) => <mesh key={i} position={[x, y, -2.4]} scale={[r * 1.3, r * 0.7, 0.2]}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial color="#4a3822" /></mesh>)}
      {/* casa antiga com haste */}
      <group position={[2.4, -1.4, -2.0]}>
        <mesh position={[0, 1.0, 0]}><boxGeometry args={[3.0, 2.0, 0.4]} /><meshBasicMaterial color={tinta} /></mesh>
        <mesh position={[0, 2.5, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]}><coneGeometry args={[1.6, 3.4, 3]} /><meshBasicMaterial color={tinta} /></mesh>
        <mesh position={[-1.0, 3.0, 0]}><boxGeometry args={[0.4, 1.0, 0.3]} /><meshBasicMaterial color={tinta} /></mesh>
        {[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 1.2, 0.22]}><boxGeometry args={[0.5, 0.7, 0.03]} /><meshBasicMaterial color="#dccaa0" /></mesh>)}
        <mesh position={[0.4, 4.0, 0.1]}><cylinderGeometry args={[0.04, 0.05, 1.6, 6]} /><meshBasicMaterial color={tinta} /></mesh>
        <mesh position={[0.4, 4.9, 0.1]}><coneGeometry args={[0.06, 0.3, 6]} /><meshBasicMaterial color={tinta} /></mesh>
      </group>
      {/* silhueta de casaca e chapéu de três pontas, sem rosto */}
      <group position={[-1.5, -1.4, -1.9]}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.18, 0.2, 1.0, 6]} /><meshBasicMaterial color={tinta} /></mesh>
        <mesh position={[0, 1.55, 0]} rotation={[0, 0, 0]}><coneGeometry args={[0.62, 1.4, 6]} /><meshBasicMaterial color={tinta} /></mesh>
        <mesh position={[0, 2.4, 0]}><sphereGeometry args={[0.3, 10, 8]} /><meshBasicMaterial color={tinta} /></mesh>
        <mesh position={[0, 2.68, 0]} rotation={[0, 0, 0]}><cylinderGeometry args={[0.55, 0.55, 0.08, 3]} /><meshBasicMaterial color={tinta} /></mesh>
        <mesh position={[0, 2.78, 0]}><cylinderGeometry args={[0.28, 0.32, 0.2, 6]} /><meshBasicMaterial color={tinta} /></mesh>
        <mesh position={[0.5, 1.5, 0.1]} rotation={[0, 0, -0.9]}><cylinderGeometry args={[0.07, 0.07, 0.9, 6]} /><meshBasicMaterial color={tinta} /></mesh>
      </group>
      <Raio k={raio} de={[2.6, 5.5, -2.0]} para={[2.8, 3.75, -1.9]} seed={77} t={t} esc={0.45} cor="#fff6d6" />
    </group>
  );
};

// contorno do Brasil (lon, lat), simplificado
const BRASIL: [number, number][] = [
  [-51.6, 4.4], [-50.0, 1.8], [-50.0, 0.0], [-48.5, -1.0], [-44.5, -2.5], [-41.5, -2.9], [-38.5, -3.7], [-35.2, -5.3], [-34.8, -7.1], [-35.0, -8.2], [-36.5, -10.5],
  [-37.8, -12.0], [-38.8, -13.5], [-39.0, -15.5], [-39.3, -17.7], [-39.8, -19.6], [-40.5, -21.0], [-41.9, -22.7], [-44.0, -23.1], [-46.4, -24.1], [-48.5, -26.0],
  [-48.6, -27.7], [-50.0, -29.4], [-52.1, -32.2], [-53.4, -33.7], [-54.6, -31.5], [-57.2, -30.0], [-55.7, -28.2], [-53.8, -27.2], [-54.4, -25.6], [-54.7, -24.0],
  [-55.8, -22.3], [-57.8, -22.0], [-58.0, -19.8], [-58.2, -17.8], [-60.2, -15.2], [-60.2, -13.5], [-62.5, -12.8], [-65.3, -10.5], [-69.5, -11.0], [-72.8, -9.4],
  [-73.2, -7.5], [-70.0, -4.2], [-69.6, -1.2], [-69.4, 1.0], [-67.0, 1.3], [-64.0, 1.5], [-63.5, 2.6], [-60.7, 5.2], [-59.8, 4.6], [-57.0, 2.0], [-54.0, 2.3],
];
const MX = (lon: number) => (lon + 54) * 0.22;
const MZ = (lat: number) => -(lat + 14) * 0.22;
const dentro = (lon: number, lat: number) => {
  let r = false;
  for (let i = 0, j = BRASIL.length - 1; i < BRASIL.length; j = i++) {
    const [xi, yi] = BRASIL[i];
    const [xj, yj] = BRASIL[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
};
const SITIOS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (let i = 0; out.length < 26 && i < 600; i++) {
    const lon = -73 + rnd(i * 2.3) * 39;
    const lat = -33 + rnd(i * 3.7 + 1) * 37;
    if (dentro(lon, lat)) out.push([MX(lon), MZ(lat), 0.9 + rnd(i + 7) * 1.1, rnd(i + 3) * 2]);
  }
  return out;
})();

const Mapa: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const geo = React.useMemo(() => {
    const sh = new THREE.Shape();
    BRASIL.forEach(([lon, lat], i) => (i ? sh.lineTo(MX(lon), -MZ(lat)) : sh.moveTo(MX(lon), -MZ(lat))));
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  return (
    <group>
      <mesh position={[0, -0.06, 0]}><boxGeometry args={[60, 0.1, 40]} /><meshStandardMaterial color="#0a1830" roughness={1} /></mesh>
      <mesh geometry={geo} position={[0, 0, 0]}><meshStandardMaterial color="#1f4a72" roughness={0.8} flatShading /></mesh>
      {BRASIL.map((p, i) => <Liga key={i} a={[MX(p[0]), 0.34, MZ(p[1])]} b={[MX(BRASIL[(i + 1) % BRASIL.length][0]), 0.34, MZ(BRASIL[(i + 1) % BRASIL.length][1])]} w={0.07} cil cor="#6fd3ff" basico />)}
      {SITIOS.slice(0, Math.round(SITIOS.length * k)).map(([x, z, per, fase], i) => {
        const u = ((t + fase) % per) / 0.5;
        if (u >= 1) return null;
        return (
          <group key={i} position={[x, 0.3, z]}>
            <Raio k={Math.min(0.95, 0.35 + u * 0.6)} de={[0.15, 2.4, -0.1]} para={[0, 0, 0]} seed={i * 5 + 3} t={t} esc={0.28} />
            <Halo p={[0, 0.15, 0]} r={0.9} cor="#fff2a0" op={0.8 * (1 - u)} />
          </group>
        );
      })}
    </group>
  );
};

/* ---------- pessoas ---------- */

type GenteE = { x?: Valor; y?: Valor; z?: Valor; rot?: Valor; acao?: string | [number, string, string?][]; exp?: Expressao3D; pose?: Pose3D | [number, Pose3D][]; incl?: Valor; esc?: number; ate?: number };

const Pessoa: React.FC<{ g: GenteE; p: number; t: number; tAbs: number }> = ({ g, p, t, tAbs }) => {
  if (g.ate !== undefined && p > g.ate) return null;
  let acao = "em-pe";
  let exp: Expressao3D = g.exp ?? "sorriso";
  if (typeof g.acao === "string") acao = g.acao;
  else if (Array.isArray(g.acao)) {
    const e = g.acao.find((x) => p <= x[0]) ?? g.acao[g.acao.length - 1];
    acao = e[1];
    if (e[2]) exp = e[2] as Expressao3D;
  }
  const extra: Pose3D = Array.isArray(g.pose) ? (g.pose.find((x) => p <= x[0]) ?? g.pose[g.pose.length - 1])[1] : (g.pose ?? {});
  const pose: Pose3D = { ...poseDe3D(acao, t), ...extra };
  pose["tronco.x"] = (pose["tronco.x"] ?? 0) + valor(g.incl, p, 0);
  const x = valor(g.x, p, 0);
  const z = valor(g.z, p, 0);
  return (
    <group position={[x, valor(g.y, p, 0), z]} rotation={[0, valor(g.rot, p, 0), 0]} scale={g.esc ?? 1.06}>
      <Boneco3D p={zeca} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} t={tAbs} />
    </group>
  );
};

/* ---------- cena ---------- */

type EtiqDef = { texto: string; para: V; off: [number, number]; cor?: string };

const PararaiosCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const n = (k: string, pad = 0) => {
    const v = cena[k];
    if (Array.isArray(v)) return chaves(v as [number, number][], p);
    return valor(n0(v), p, pad);
  };
  const palco = (cena.palco as string | undefined) ?? "casa";
  const X0 = PALCO_X[palco] ?? 0;
  const gente = (cena.gente as GenteE[] | undefined) ?? [];
  const chuva = n("chuva", 1);
  const vento = n("vento", 1);
  const nuvem = n("nuvem", 1);
  const raios = [1, 2, 3].map((i) => {
    const suf = i === 1 ? "" : String(i);
    return { k: n("raio" + suf), alvo: (cena["alvo" + suf] as string | undefined) ?? "telhado", seed: 11 * i + 3 };
  });
  const flash = Math.min(1, raios.reduce((s, r) => s + brilhoRaio(r.k), 0));
  const flick = flash * (0.8 + 0.2 * Math.sin(tEpisodio * 60));
  const luz = n("luz", 1) * (1 - n("casaEscura"));
  const casa: CasaP = {
    haste: n("haste"), cabo: n("cabo"), terra: n("terra"), luz, pisca: n("pisca"), raiox: n("raiox"), fogo: n("fogo"), estoura: n("estoura"), escada: n("escada"),
    espalha: n("espalha"), fiacao: n("fiacao"), onda: n("onda"), acumula: n("acumula"), leque: n("leque"), destaque: n("destaque"), t: tEpisodio,
  };
  const et: Record<string, EtiqDef> = {
    haste: { texto: "HASTE", para: [0, HASTE_TOPO - 0.1, ZC], off: [1.3, 0.8], cor: "#9fdcff" },
    cabo: { texto: "CABO DE DESCIDA", para: [2.7, 1.5, ZFR + 0.15], off: [-1.6, 0.8], cor: "#ffb26b" },
    aterra: { texto: "ATERRAMENTO", para: [2.7, -1.7, ZPLATO + 0.05], off: [-1.7, 0.2], cor: "#7dffa8" },
    gaiola: { texto: "GAIOLA DE FARADAY", para: [0.9, 1.0, 0.3], off: [1.4, 1.1], cor: "#8fd8ff" },
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
      <fog attach="fog" args={[palco === "franklin" ? "#dccaa0" : "#121a2c", 40, 78]} />
      {palco === "franklin" ? (
        <group position={[X0, 0, 0]}>
          <hemisphereLight args={["#ffffff", "#ffffff", 1.0]} />
          <Gravura t={tEpisodio} raio={raios[0].k} />
        </group>
      ) : palco === "mapa" ? (
        <group position={[X0, 0, 0]}>
          <hemisphereLight args={["#7d9ae0", "#1a2a44", 1.0]} />
          <directionalLight position={[0, 12, 8]} intensity={1.3} color="#cfe0ff" />
          <Mapa t={tEpisodio} k={n("flashes", 1)} />
        </group>
      ) : (
        <group position={[X0, 0, 0]}>
          <hemisphereLight args={["#6d86bd", "#1c2a22", 0.95 + 1.6 * flick]} />
          <directionalLight position={[-6, 12, 9]} intensity={1.2 + 2.6 * flick} color={mistura("#b9c9ee", "#e8f0ff", flick)} />
          <Nuvens cx={0} cz={0} t={tEpisodio} forca={nuvem} flash={flick} />
          <Chuva forca={chuva} cx={0} cz={palco === "estrada" ? 0 : 2} t={tEpisodio} />
          {palco === "casa" ? (
            <group>
              <Terreno />
              {/* terreno baixo: árvores, poste, casinhas e morros (mais baixos que a casa) */}
              {[[-11, -5], [10.5, -9], [-14, 3], [14, 1], [-9.5, -17], [12, -21], [-17, -12], [18, -10]].map(([x, z], i) => <Arvore key={i} x={x} y={-3.2} z={z} s={1.0 + rnd(i) * 0.4} t={tEpisodio} vento={vento} />)}
              <Poste x={-9} y={-3.2} z={-2} />
              <Liga a={[-9, 2.9, -2]} b={[-9, 2.9, -28]} w={0.02} cil cor="#16181d" />
              <CasinhaLonge x={-19} y={-3.2} z={-18} cor="#c9b79a" rot={0.5} />
              <CasinhaLonge x={20} y={-3.2} z={-26} cor="#a9b5c9" rot={-0.4} />
              <CasinhaLonge x={-24} y={-3.2} z={-4} cor="#c9a9a9" s={0.9} rot={0.9} />
              <Morros cx={0} y={-3.2} zf={-58} />
              {/* no platô */}
              <Varal x={-5.2} z={1.6} t={tEpisodio} vento={vento} />
              <group position={[5.2, 0, -0.5]}>
                <Caixa p={[0, 0.6, 0]} t={[1.8, 1.2, 1.6]} cor="#8a7a62" raio={0.04} />
                <Caixa p={[0, 1.4, 0]} t={[2.0, 0.2, 1.8]} cor="#5a4636" raio={0.03} />
              </group>
              {[[-4.5, 3.3], [-3.4, 0.2], [4.9, 3.4], [5.9, 2.0]].map(([x, z], i) => <mesh key={i} position={[x, 0.3, z]} scale={[1, 0.8, 1]}><icosahedronGeometry args={[0.45 + 0.1 * i, 1]} /><meshStandardMaterial color="#2c5233" roughness={1} flatShading /></mesh>)}
              <group position={[-6.2, 0, 3.4]}>
                <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.05, 0.05, 1.0, 6]} /><meshStandardMaterial color="#6e5a44" /></mesh>
                <Caixa p={[0, 1.1, 0]} t={[0.5, 0.3, 0.3]} cor="#b9423a" raio={0.03} />
              </group>
              {[-1.6, -1.0, -0.4].map((dz, i) => <Caixa key={i} p={[-1.4 + i * 0.1, 0.03, 3.3 + dz * 0.0 + i * 0.3 - 0.3]} t={[0.5, 0.05, 0.28]} cor="#8d8478" raio={0.02} sombra={false} />)}
              <Casa {...casa} />
              <Hastes terra={casa.terra} cabo={casa.cabo} leque={casa.leque} acumula={casa.acumula} onda={casa.onda} t={tEpisodio} destaque={casa.destaque} />
              {/* a corrente quente escolhe a parede e a fiação (sem cabo) */}
              {casa.espalha > 0.001 && FIOS.map((pts, i) => <CaminhoLuz key={i} pts={pts} k={clamp01(casa.espalha * 1.15 - i * 0.05)} cor={QUENTE} w={0.07} halo={0.7} />)}
              {n("ramos") > 0.01 && [[-11, 4.0, -5], [10.5, 3.5, -9], [-9, 6.9, -2]].map(([x, y, z], i) => {
                const k = n("ramos") * [0.62, 0.5, 0.7][i];
                const de: V = [x * 0.4, 12, z * 0.4];
                const alvo: V = [x, y - 3.2 * (i === 2 ? 0 : 1), z];
                const pts = zigue(31 + i * 5, de, alvo, 8, 0.8);
                const m = Math.floor(k * 8);
                return pts.slice(1, m + 1).map((q, j) => <Liga key={`${i}-${j}`} a={pts[j]} b={q} w={0.07} cil cor={AZUL} op={0.55} basico />);
              })}
              {n("ramos") > 0.01 && <CaminhoLuz pts={zigue(61, [0.6, 12, 0.4], [-0.5, roofY(0.9) + 0.05, 0.9], 8, 0.8)} k={n("ramos") * 0.62} cor={AZUL} w={0.07} halo={0.5} op={0.7} />}
            </group>
          ) : (
            <group>
              <Estrada casaFundo={cena.casaFundo === true} vento={vento} t={tEpisodio} />
              {cena.carro === true && <Carro rot={n("carroRot", 2.5)} porta={n("porta", 1)} dentro={n("zecaDentro")} gaiola={n("gaiola")} corr={n("corrCarro")} segura={n("segura")} t={tEpisodio} exp={((cena.expDentro as Expressao3D | undefined) ?? "sorriso")} />}
            </group>
          )}
          {raios.map((r, i) => {
            const alvo = alvoDe(r.alvo);
            const de: V = [alvo[0] + 2.5, 13.2, alvo[2] - 1.5];
            return <Raio key={i} k={r.k} de={de} para={alvo} seed={r.seed} t={tEpisodio} />;
          })}
        </group>
      )}

      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const off: V = [d.para[0] + d.off[0] * S, d.para[1] + d.off[1] * S, d.para[2] + 0.2];
        return <Etiqueta key={c} texto={d.texto} de={[off[0] + X0, off[1], off[2]]} para={[d.para[0] + X0, d.para[1], d.para[2]]} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}

      {palco !== "franklin" && palco !== "mapa" && <group position={[X0, 0, 0]}>{gente.map((gd, i) => <Pessoa key={i} g={gd} p={p} t={t} tAbs={tEpisodio} />)}</group>}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 50) => ({ pos, alvo, fov });

export const pararaios: Cenario3D = {
  Cena: PararaiosCena,
  padrao: "geral",
  fundo: (cena) => ((cena.palco as string | undefined) === "franklin" ? "#dccaa0" : (cena.palco as string | undefined) === "mapa" ? "#050a16" : "#121a2c"),
  luzPropria: true,
  cameras: { geral: c([-4, 4.5, 14], [0, 3.5, 0], 50) },
};
