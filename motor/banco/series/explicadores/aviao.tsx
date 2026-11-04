import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { FONT } from "../../../src/theme";
import { clamp01, lerp, suave, valor } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa, Mat, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Expressao3D, Pose3D, V3, Valor } from "../../../src/v3d/tipos";
import { Etiqueta, Fluxo, Halo, Seta, Texto3D, V } from "./cozinha-base";
import { Auto } from "./pista";
import { zeca } from "./zeca";

// Avião (episódio 16, "como um avião de 80 toneladas fica no ar", tema: a asa). Cinco palcos no mesmo mundo, em x diferentes:
//   palco "campo" (x = 0): campo aberto com terminal e torre ao fundo, nuvens, o avião grande no céu (ou com asas de pena), barra "80 t", a placa de ~3 m sobre a cabine curta.
//   palco "tunel" (x = 60): túnel de vento visto de lado: a placa/curva em corte (a "fatia" de 2 m), linhas de fluxo, setas de pressão e de força, bolinhas de ar.
//   palco "carro" (x = 120): carro andando na estrada, o Zeca de passageiro com a mão para fora; o fluxo em volta da mão é o mesmo da placa.
//   palco "pista" (x = 180): pista de aeroporto no fim de tarde, o modelo (placa + cabine + motor) acelera, velocímetro de cena, setas de força e peso.
//   palco "ceu" (x = 240): o avião grande em voo, setas de peso/sustentação/empuxo/arrasto, corte da asa com o ar dobrando para baixo.
// FÍSICA (NASA Glenn): a asa vira o ar para baixo; o ar de cima NÃO precisa alcançar o de baixo (o mito é desmentido: bolinhas saem em tempos diferentes).
// O avião voa para a ESQUERDA do quadro (nariz em -x); o ar corre relativamente para a DIREITA e sai da asa apontando para baixo.
// REGRA: o nome "asa" só aparece na batida 16 (rótulo, fala). Antes disso é "a placa" (e "a curva").
// Campos da cena (número, { de, para, ini, fim } ou chaves [[progresso, valor], ...]; strings e booleanos fixos):
//   palco      "campo" (padrão) | "tunel" | "carro" | "pista" | "ceu"
//   avião      aviao: true · aviaoX · aviaoY · aviaoZ · aviaoRoll (rad) · aviaoPitch (rad) · aviaoYaw (rad) · aviaoPenas: true (asas de pena no lugar das asas, parado no chão)
//   campo      barra 0..1 (painel de peso "80 t") · caminhao: true · penaVoo 0..1 (os braços do Zeca batem as asas) · interroga 0..1 (? vira lâmpada)
//   modelo     modelo "placa" | "curva" (campo, pista) · modeloX · modeloY · nariz 0..1 (sobe o nariz) · helice 0..1 · empurra: true (alça de empurrar)
//   túnel      curva 0..1 (arredonda o dorso da placa; padrão: 0 com modelo placa, 1 com modelo curva) · anguloAtaque (rad) · sobe (m, a placa corre no trilho) ·
//              linhasAr 0..1 · solta 0..1 (ar solta e perde a força) · pressao 0..1 (+ e −) · setasForca (m: seta de força) · setasAr 0..1 (ar dobrado para baixo, setas azuis) ·
//              bolas 0..1 (bolinhas de ar de cima e de baixo) · mito 0..1 (carimbo MITO) · forca0: true (marcador de força zero)
//   carro      mao (rad, inclinação da mão) · maoSobe 0..1 · carroVel 0..1 · linhasAr · solta · setasForca (m)
//   pista      velocimetro 0..1 · forca (m) · peso (m) · x4 0..1
//   céu        setas4 0..1 (peso, sustentação, empuxo, arrasto) · corteAsa 0..1 (linhas de ar na asa, dobrando para baixo)
//   gente      lista de { x, y, z, rot, acao, exp, pose, incl, esc, penas, suor } (sempre o `zeca`) · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax
//              chaves: placa, ar, pressao, asa, forca0, curva

const n0 = (v: unknown) => v as Valor;
const chaves = (a: [number, number][], p: number) => {
  if (p <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    if (p <= a[i][0]) return lerp(a[i - 1][1], a[i][1], suave(clamp01((p - a[i - 1][0]) / Math.max(a[i][0] - a[i - 1][0], 1e-6))));
  }
  return a[a.length - 1][1];
};
const nv = (v: unknown, p: number, pad = 0) => (Array.isArray(v) ? chaves(v as [number, number][], p) : valor(n0(v), p, pad));

const PALCO_X: Record<string, number> = { campo: 0, tunel: 60, carro: 120, pista: 180, ceu: 240 };
const BRANCO = "#f4f6f8";
const AZUL_LIV = "#1f5fa8";
const LARANJA = "#ff8a2a";
const AZUL_AR = "#4db4ff";
const AZUL_CLARO = "#bfeaff";
const VERMELHO = "#ff5a3c";
const PELE = "#c98f63";

/* ---------- céu, chão, nuvens ---------- */

const Dome: React.FC<{ topo: string; meio: string; base: string; r?: number }> = ({ topo, meio, base, r = 68 }) => {
  const { camera } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 24, 18);
    const pos = g.attributes.position;
    const cs: number[] = [];
    const ct = new THREE.Color(topo);
    const cm = new THREE.Color(meio);
    const cb = new THREE.Color(base);
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

const Chao: React.FC<{ cor: string; cor2?: string; listras?: boolean }> = ({ cor, cor2, listras }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}><planeGeometry args={[1400, 1400]} /><meshStandardMaterial color={cor} roughness={1} /></mesh>
    {listras && cor2 && Array.from({ length: 14 }).map((_, i) => (
      <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 40 - i * 9]}><planeGeometry args={[400, 4.5]} /><meshStandardMaterial color={cor2} roughness={1} /></mesh>
    ))}
  </group>
);

const Nuvem: React.FC<{ p: V; s: number }> = ({ p, s }) => (
  <group position={p} scale={s}>
    {([[0, 0, 0, 1.0], [1.1, -0.15, 0.2, 0.8], [-1.1, -0.15, -0.1, 0.75], [0.4, 0.5, 0, 0.7], [-0.5, 0.35, 0.3, 0.6], [2.0, -0.3, 0, 0.55]] as number[][]).map(([x, y, z, r], i) => (
      <mesh key={i} position={[x, y, z]} scale={[r * 1.5, r * 0.7, r]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#ffffff" roughness={1} flatShading emissive="#dfeaf5" emissiveIntensity={0.35} /></mesh>
    ))}
  </group>
);

const Nuvens: React.FC<{ t: number; lista?: [number, number, number, number][]; vel?: number }> = ({ t, lista, vel = 0.5 }) => {
  const L = lista ?? [[-45, 40, -55, 5], [22, 52, -58, 6], [58, 34, -50, 4], [-20, 30, -45, 3.5], [0, 62, -60, 6], [-60, 52, -45, 5]];
  return <group>{L.map(([x, y, z, s], i) => <Nuvem key={i} p={[((x + 80 + t * vel * (0.6 + rnd(i) * 0.8)) % 160) - 80, y, z]} s={s} />)}</group>;
};

const Arvore: React.FC<{ x: number; z: number; s: number; cor?: string }> = ({ x, z, s, cor = "#3f8a3c" }) => (
  <group position={[x, 0, z]} scale={s}>
    <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.16, 0.22, 2.0, 7]} /><meshStandardMaterial color="#6b4a30" roughness={1} /></mesh>
    <mesh position={[0, 3.0, 0]}><icosahedronGeometry args={[1.5, 1]} /><meshStandardMaterial color={cor} roughness={1} flatShading /></mesh>
    <mesh position={[0.6, 2.4, 0.3]}><icosahedronGeometry args={[1.0, 1]} /><meshStandardMaterial color="#4c9a46" roughness={1} flatShading /></mesh>
  </group>
);

/** Terminal de aeroporto (fachada de vidro, teto largo) e torre de controle. Fica no plano z = `z`. */
const Terminal: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <Caixa p={[0, 4.5, 0]} t={[70, 9, 16]} cor="#e9edf1" raio={0.3} />
    <Caixa p={[0, 4.4, 8.05]} t={[66, 4.2, 0.2]} cor="#6fb4dc" raio={0.05} emissivo="#6fb4dc" brilho={0.25} />
    <Caixa p={[0, 7.2, 8.05]} t={[66, 1.2, 0.2]} cor="#8cc6e8" raio={0.05} emissivo="#8cc6e8" brilho={0.2} />
    <Caixa p={[0, 9.4, 3]} t={[74, 0.8, 24]} cor="#ffffff" raio={0.2} />
    {Array.from({ length: 12 }).map((_, i) => <Caixa key={i} p={[-30 + i * 5.45, 4.5, 8.2]} t={[0.3, 5.2, 0.3]} cor="#d3d9df" raio={0.05} />)}
    {/* passarelas */}
    {[-20, 8, 26].map((px, i) => <Caixa key={i} p={[px, 3.6, 12]} t={[2.2, 2.2, 9]} cor="#c7ced6" raio={0.2} />)}
    {/* torre */}
    <group position={[-48, 0, -4]}>
      <mesh position={[0, 13, 0]}><cylinderGeometry args={[1.7, 2.4, 26, 10]} /><meshStandardMaterial color="#e9edf1" roughness={0.8} /></mesh>
      <mesh position={[0, 27.5, 0]}><cylinderGeometry args={[4.2, 3.0, 4.0, 10]} /><meshStandardMaterial color="#6fb4dc" roughness={0.3} emissive="#6fb4dc" emissiveIntensity={0.25} /></mesh>
      <mesh position={[0, 30.2, 0]}><cylinderGeometry args={[4.6, 4.6, 0.8, 10]} /><meshStandardMaterial color="#ffffff" roughness={0.8} /></mesh>
      <mesh position={[0, 33, 0]}><cylinderGeometry args={[0.12, 0.12, 5, 6]} /><meshStandardMaterial color="#c0392b" /></mesh>
    </group>
  </group>
);

const Biruta: React.FC<{ x: number; z: number; t: number }> = ({ x, z, t }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.05, 0.07, 5, 6]} /><meshStandardMaterial color="#d9dee3" /></mesh>
    <group position={[0, 4.8, 0]} rotation={[0, 0.2 * Math.sin(t * 0.8), -0.15 + 0.08 * Math.sin(t * 2.2)]}>
      {[0, 1, 2, 3].map((i) => <mesh key={i} position={[0.35 + i * 0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[0.32 - i * 0.05, 0.37 - i * 0.05, 0.5, 8]} /><meshStandardMaterial color={i % 2 ? "#ffffff" : LARANJA} roughness={0.9} /></mesh>)}
    </group>
  </group>
);

const Caminhao: React.FC = () => (
  <group>
    <Caixa p={[0, 1.55, -1.7]} t={[2.5, 1.8, 2.2]} cor="#2c6fbd" raio={0.15} />
    <Caixa p={[0, 1.95, -2.7]} t={[2.3, 0.8, 0.1]} cor="#9fd8ff" raio={0.03} />
    <Caixa p={[0, 1.85, 1.6]} t={[2.5, 2.4, 6.2]} cor="#f1f3f5" raio={0.1} />
    <Caixa p={[0, 0.65, 0]} t={[2.2, 0.3, 9.5]} cor="#2a2d31" raio={0.05} />
    {[-2.3, 0.6, 2.4, 3.6].map((z, i) => [-1, 1].map((s) => <mesh key={`${i}${s}`} position={[s * 1.15, 0.5, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.5, 0.5, 0.34, 14]} /><meshStandardMaterial color="#1b1d20" roughness={0.9} /></mesh>))}
  </group>
);

/* ---------- avião grande ---------- */

const PERFIL_FUS: [number, number][] = [[0.12, -19.6], [0.45, -18.2], [0.9, -15.8], [1.45, -11.5], [1.85, -6.5], [1.95, -2], [1.95, 9.5], [1.88, 13], [1.6, 16.2], [1.05, 18.4], [0.4, 19.4], [0, 19.7]];
const planta = (pts: [number, number][], esp: number, sinal: 1 | -1) => {
  const sh = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? sh.lineTo(x, z * sinal) : sh.moveTo(x, z * sinal)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: esp, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  return g;
};
const ASA_PL: [number, number][] = [[-3.2, 1.5], [5.3, 17.2], [8.0, 17.2], [8.1, 15.5], [5.4, 1.5]];
const EST_PL: [number, number][] = [[12.8, 0.8], [17.4, 6.6], [19.0, 6.6], [18.9, 4.6], [18.5, 0.8]];
const xBordaAtaque = (z: number) => -3.2 + ((z - 1.5) / 15.7) * 8.5;
const xBordaFuga = (z: number) => 5.4 + ((z - 1.5) / 15.7) * 2.6;

const Pena: React.FC<{ p: V; rot: [number, number, number]; c: number; l: number; cor: string }> = ({ p, rot, c, l, cor }) => (
  <mesh position={p} rotation={rot} scale={[c / 2, 0.05 + l * 0.004, l / 2]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={cor} roughness={0.9} flatShading /></mesh>
);

/** Asa de pena do tamanho da asa do avião (planta como a da asa; penas de ponta a ponta). */
const AsaPenaGrande: React.FC<{ sinal: 1 | -1 }> = ({ sinal }) => (
  <group position={[0, -0.5, 0]}>
    {Array.from({ length: 18 }).map((_, i) => {
      const z = 1.6 + i * 0.88;
      const xa = xBordaAtaque(z);
      const xf = xBordaFuga(z);
      const c = xf - xa + 0.9;
      const cor = ["#f3efe6", "#e6dccb", "#cdb89a", "#a98b66"][(i % 3) + (i > 12 ? 1 : 0)];
      return (
        <group key={i}>
          <mesh position={[(xa + xf) / 2, 0, z * sinal]} scale={[c / 2, 0.11, 0.66]}><sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color={cor} roughness={0.95} flatShading /></mesh>
          <mesh position={[(xa + xf) / 2, 0.1, z * sinal]} scale={[c / 2, 0.04, 0.05]}><boxGeometry args={[2, 1, 1]} /><meshStandardMaterial color="#8a7556" roughness={1} /></mesh>
        </group>
      );
    })}
  </group>
);

const Aviao: React.FC<{ penas?: boolean; t: number }> = ({ penas, t }) => {
  const fus = useMemo(() => {
    const g = new THREE.LatheGeometry(PERFIL_FUS.map(([r, a]) => new THREE.Vector2(r, a)), 32);
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);
  const asaD = useMemo(() => planta(ASA_PL, 0.3, 1), []);
  const asaE = useMemo(() => planta(ASA_PL, 0.3, -1), []);
  const estD = useMemo(() => planta(EST_PL, 0.16, 1), []);
  const estE = useMemo(() => planta(EST_PL, 0.16, -1), []);
  const leme = useMemo(() => {
    const sh = new THREE.Shape();
    ([[9.2, 1.4], [16.8, 8.6], [19.4, 8.6], [19.6, 1.0]] as [number, number][]).forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false });
    g.translate(0, 0, -0.15);
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={fus}><meshStandardMaterial color={BRANCO} roughness={0.35} metalness={0.15} /></mesh>
      {/* faixa azul, janelas e cabine */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[-3.5, -0.35, s * 1.92]}><boxGeometry args={[16.5, 0.22, 0.05]} /><meshStandardMaterial color={AZUL_LIV} roughness={0.4} /></mesh>
          {Array.from({ length: 19 }).map((_, i) => <mesh key={i} position={[-10.6 + i * 0.98, 0.5, s * 1.88]}><boxGeometry args={[0.3, 0.38, 0.06]} /><meshStandardMaterial color="#1d2f48" roughness={0.2} metalness={0.4} /></mesh>)}
          <mesh position={[-16.9, 0.95, s * 0.72]} rotation={[0, s * 0.62, 0]}><boxGeometry args={[0.7, 0.38, 0.06]} /><meshStandardMaterial color="#1d2f48" roughness={0.2} metalness={0.4} /></mesh>
          <mesh position={[-17.6, 0.9, s * 0.35]} rotation={[0, s * 0.3, 0]}><boxGeometry args={[0.5, 0.36, 0.06]} /><meshStandardMaterial color="#1d2f48" roughness={0.2} metalness={0.4} /></mesh>
        </group>
      ))}
      <mesh position={[-19.2, 0.1, 0]}><sphereGeometry args={[0.3, 8, 6]} /><meshStandardMaterial color="#2b2f36" /></mesh>
      {/* asas (ou penas) e turbinas */}
      {penas ? (
        <group><AsaPenaGrande sinal={1} /><AsaPenaGrande sinal={-1} /></group>
      ) : (
        <group>
          <mesh geometry={asaD} position={[0, -0.4, 0]}><Mat cor="#e4e9ee" rug={0.45} met={0.2} dupla /></mesh>
          <mesh geometry={asaE} position={[0, -0.4, 0]}><Mat cor="#e4e9ee" rug={0.45} met={0.2} dupla /></mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Caixa p={[7.7, 0.5, s * 17.2]} t={[1.5, 1.5, 0.12]} cor={AZUL_LIV} raio={0.04} r={[0, 0, 0.0]} />
              <group position={[-1.9, -1.55, s * 5.7]}>
                <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.0, 1.1, 3.6, 18]} /><meshStandardMaterial color="#dfe4ea" roughness={0.3} metalness={0.35} /></mesh>
                <mesh position={[-1.85, 0, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[1.02, 0.12, 8, 20]} /><meshStandardMaterial color={AZUL_LIV} roughness={0.4} /></mesh>
                <mesh position={[-1.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.88, 0.88, 0.05, 18]} /><meshStandardMaterial color="#14181f" roughness={0.6} /></mesh>
                <mesh position={[-1.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.28, 0.6, 12]} /><meshStandardMaterial color="#c9d1d9" metalness={0.5} roughness={0.3} /></mesh>
                <mesh position={[1.9, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.6, 0.9, 14]} /><meshStandardMaterial color="#9aa3ad" metalness={0.5} roughness={0.4} /></mesh>
                <Caixa p={[1.9, 1.05, 0]} t={[3.2, 0.85, 0.32]} cor="#dfe4ea" raio={0.1} />
              </group>
            </group>
          ))}
        </group>
      )}
      {/* cauda */}
      <mesh geometry={leme}><meshStandardMaterial color={AZUL_LIV} roughness={0.4} side={THREE.DoubleSide} /></mesh>
      <mesh position={[16.6, 5.4, 0]} rotation={[0, 0, 0.78]}><boxGeometry args={[5.2, 0.5, 0.34]} /><meshStandardMaterial color={LARANJA} roughness={0.5} /></mesh>
      <mesh geometry={estD} position={[0, 0.7, 0]}><Mat cor="#e4e9ee" rug={0.45} met={0.2} dupla /></mesh>
      <mesh geometry={estE} position={[0, 0.7, 0]}><Mat cor="#e4e9ee" rug={0.45} met={0.2} dupla /></mesh>
      {penas === undefined && <mesh visible={false}><boxGeometry args={[t, 0, 0]} /></mesh>}
    </group>
  );
};

/* ---------- perfil da placa/curva (corte), linhas de fluxo ---------- */

const ESP = 0.035;
const H_CURVA = 0.17;
const dorso = (u: number) => Math.sin(Math.PI * Math.pow(clamp01(u), 0.75));
const yTopo = (x: number, k: number, esp: number, h = H_CURVA) => esp + k * h * dorso((x + 1) / 2);
const girar = (x: number, y: number, a: number): [number, number] => [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)];

type Foil = { alpha: number; k: number; yf: number; sep: number; t: number; esp: number };

const superf = (F: Foil) => {
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const x = -1 + (2 * i) / 40;
    const [a, b] = girar(x, yTopo(x, F.k, F.esp), F.alpha);
    top.push([a, b + F.yf]);
    const [c, d] = girar(x, -F.esp, F.alpha);
    bot.push([c, d + F.yf]);
  }
  return { top, bot };
};
const amostra = (arr: [number, number][], x: number): number | null => {
  if (x < arr[0][0] || x > arr[arr.length - 1][0]) return null;
  for (let i = 1; i < arr.length; i++) if (x <= arr[i][0]) return lerp(arr[i - 1][1], arr[i][1], (x - arr[i - 1][0]) / Math.max(arr[i][0] - arr[i - 1][0], 1e-6));
  return arr[arr.length - 1][1];
};
const S = (u: number) => suave(clamp01(u));
const SEMENTES = [0.15, 0.36, 0.6, 0.88, 1.2, 1.55];
const XS = Array.from({ length: 69 }, (_, i) => -3.4 + i * 0.1);
const suaviza = (v: number[], passes: number) => {
  let a = v;
  for (let p = 0; p < passes; p++) a = a.map((_, i) => (i === 0 || i === a.length - 1 ? a[i] : (a[i - 1] + 2 * a[i] + a[i + 1]) / 4));
  return a;
};
/** Ângulo de desvio (rad) do ar atrás da placa: cresce com a inclinação e com a curva; some quando o ar solta. */
const desvio = (F: Foil) => 1.3 * (F.alpha + 0.14 * F.k) * (1 - 0.85 * F.sep);

/** Linhas de fluxo (de cima e de baixo), da esquerda para a direita; atrás da placa elas dobram para BAIXO (o ar desviado). */
const linhasFluxo = (F: Foil): { topo: V[][]; baixo: V[][] } => {
  const { top, bot } = superf(F);
  const thd = desvio(F);
  const xsep = -0.15;
  const fazer = (s: 1 | -1, j: number): V[] => {
    const semente = SEMENTES[j];
    const w = Math.exp(-((semente / 1.5) ** 2));
    const gap = 0.07 + 0.05 * j;
    let y = F.yf + s * semente;
    const ys: number[] = [];
    for (let i = 0; i < XS.length; i++) {
      ys.push(y);
      const x = XS[i];
      const phi = w * thd * (-S((x - 0.05) / 1.3) + 0.45 * Math.exp(-(((x + 0.9) / 0.8) ** 2)));
      y += Math.tan(phi) * 0.1;
    }
    const prende = (arr: number[]) => arr.map((yy, i) => {
      const x = XS[i];
      const tp = amostra(top, x);
      const bo = amostra(bot, x);
      if (s > 0 && tp !== null) return Math.max(yy, tp + gap);
      if (s < 0 && bo !== null) return Math.min(yy, bo - gap);
      return yy;
    });
    let v = suaviza(prende(ys), 5);
    v = prende(v);
    if (s > 0 && F.k > 0.01) {
      v = v.map((yy, i) => {
        const x = XS[i];
        const tp = amostra(top, x) ?? F.yf;
        return tp + (yy - tp) * (1 - 0.32 * F.k * Math.exp(-((x / 0.9) ** 2)));
      });
    }
    if (s > 0 && F.sep > 0.01) {
      const isep = XS.findIndex((x) => x >= xsep);
      const ysep = v[isep];
      v = v.map((yy, i) => {
        if (i <= isep) return yy;
        const x = XS[i];
        const d = x - xsep;
        const solta = ysep + d * 0.1 * F.sep + 0.14 * F.sep * d * Math.sin(7 * x + 3 * j - 7 * F.t);
        return lerp(yy, solta, F.sep * S(d / 0.5));
      });
    }
    return XS.map((x, i) => [x, v[i], 0] as V);
  };
  return { topo: SEMENTES.map((_, j) => fazer(1, j)), baixo: SEMENTES.map((_, j) => fazer(-1, j)) };
};

const Tubo: React.FC<{ pts: V[]; cor: string; r?: number; op?: number }> = ({ pts, cor, r = 0.017, op = 0.55 }) => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 90, r, 5, false), [pts, r]);
  if (op <= 0.02) return null;
  return <mesh geometry={geo} renderOrder={4}><meshBasicMaterial color={cor} transparent opacity={op} depthWrite={false} /></mesh>;
};

const FoilMesh: React.FC<{ k: number; esp: number; prof: number; cor: string }> = ({ k, esp, prof, cor }) => {
  const kk = Math.round(k * 40) / 40;
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    const N = 30;
    for (let i = 0; i <= N; i++) {
      const x = -1 + (2 * i) / N;
      if (i) sh.lineTo(x, yTopo(x, kk, esp));
      else sh.moveTo(x, yTopo(x, kk, esp));
    }
    for (let i = N; i >= 0; i--) sh.lineTo(-1 + (2 * i) / N, -esp);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: prof, bevelEnabled: true, bevelSize: esp * 0.35, bevelThickness: esp * 0.35, bevelSegments: 2 });
    g.translate(0, 0, -prof / 2);
    return g;
  }, [kk, esp, prof]);
  return <mesh geometry={geo}><Mat cor={cor} rug={0.5} verniz={0.4} /></mesh>;
};

type FluxoP = {
  F: Foil; t: number; linhas: number; corpo?: boolean; corCorpo?: string; prof?: number; zLinha?: number; larg?: number;
  pressao?: number; forca?: number; setasAr?: number; escalaSeta?: number; rapido?: boolean; sinais?: boolean; bolas?: number; max?: number;
};

/** O corte da placa no túnel (ou da mão, ou da asa): corpo, linhas de fluxo, setas do ar, de pressão e de força. Tudo em coordenadas locais (corda = 2). */
const FoilFlow: React.FC<FluxoP> = ({ F, t, linhas, corpo = true, corCorpo = "#e9edf1", prof = 0.8, zLinha = 0.5, larg = 0.034, pressao = 0, forca = 0, setasAr = 0, escalaSeta = 1, sinais = true, bolas = 0, max = 6 }) => {
  const L = useMemo(() => linhasFluxo(F), [F.alpha, F.k, F.yf, F.sep, F.t, F.esp]);
  const { top, bot } = useMemo(() => superf(F), [F.alpha, F.k, F.yf, F.esp]);
  const zz = (ls: V[][]) => ls.map((l) => l.map((q) => [q[0], q[1], zLinha] as V));
  const topo = zz(L.topo.slice(0, max));
  const baixo = zz(L.baixo.slice(0, max));
  const rapido = F.k > 0.5 && F.sep < 0.3;
  const tRaw = suave(clamp01(linhas));
  const yF = F.yf;
  const wB = larg * escalaSeta;
  return (
    <group>
      {corpo && (
        <group position={[0, yF, 0]} rotation={[0, 0, -F.alpha]}>
          <FoilMesh k={F.k} esp={F.esp} prof={prof} cor={corCorpo} />
        </group>
      )}
      {linhas > 0.01 && (
        <group>
          {topo.map((l, i) => <Tubo key={`t${i}`} pts={l} cor={rapido ? AZUL_CLARO : AZUL_AR} r={0.014 * escalaSeta + 0.006} op={(rapido ? 0.7 : 0.45) * tRaw * (pressao > 0.3 ? 0.55 : 1)} />)}
          {baixo.map((l, i) => <Tubo key={`b${i}`} pts={l} cor={AZUL_AR} r={0.014 * escalaSeta + 0.006} op={0.45 * tRaw * (pressao > 0.3 ? 0.55 : 1)} />)}
          <Fluxo rotas={topo} t={t} n={4} vel={rapido ? 2.0 : 1.5} cor={rapido ? "#ffffff" : "#d8f2ff"} w={wB} op={0.95 * tRaw} tam={0.32} />
          <Fluxo rotas={baixo} t={t} n={4} vel={1.5} cor="#d8f2ff" w={wB} op={0.95 * tRaw} tam={0.32} fase={0.3} />
        </group>
      )}
      {/* fumaça em redemoinho atrás da placa quando o ar solta */}
      {F.sep > 0.05 && Array.from({ length: 11 }).map((_, i) => {
        const a = t * 3.2 + i * 0.57;
        const cx = 0.45 + 0.3 * Math.sin(i * 1.7);
        const cy = (amostra(top, cx) ?? yF) + 0.32 + 0.1 * Math.cos(i);
        const rr = 0.2 + 0.09 * (i % 3);
        return <mesh key={i} position={[cx + Math.cos(a) * rr * 1.5, cy + Math.sin(a) * rr, zLinha]} scale={0.08 + 0.05 * rnd(i)}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color="#c3ccd6" transparent opacity={0.6 * F.sep} depthWrite={false} /></mesh>;
      })}
      {/* setas do ar dobrando para baixo (3ª lei de Newton: o ar empurra a placa para cima) */}
      {setasAr > 0.02 && [0, 1, 2].map((i) => {
        const th = Math.max(0.35, desvio(F));
        const x = 0.95 + i * 0.42;
        const y0 = (amostra(bot, 0.95) ?? yF) - 0.12 - i * 0.12;
        const L1 = 0.8 * escalaSeta;
        return <Seta key={i} a={[x, y0, zLinha + 0.06]} b={[x + Math.sin(th) * L1, y0 - Math.cos(th) * L1, zLinha + 0.06]} cor="#2a8bff" w={0.07 * escalaSeta} op={setasAr} />;
      })}
      {/* pressão: embaixo maior (+), em cima menor (−); a diferença empurra a placa para cima */}
      {pressao > 0.02 && (
        <group>
          {[-0.65, -0.15, 0.35, 0.8].map((x, i) => {
            const tp = amostra(top, x) ?? yF;
            const bo = amostra(bot, x) ?? yF;
            return (
              <group key={i}>
                <Seta a={[x, bo - 0.85, zLinha + 0.08]} b={[x, bo - 0.1, zLinha + 0.08]} cor={VERMELHO} w={0.075 * escalaSeta} op={pressao} />
                <Seta a={[x, tp + 0.38, zLinha + 0.08]} b={[x, tp + 0.1, zLinha + 0.08]} cor="#3a7bff" w={0.05 * escalaSeta} op={pressao} />
              </group>
            );
          })}
          {sinais && <Texto3D texto="−" p={[0.1, (amostra(top, 0.1) ?? yF) + 0.95, zLinha + 0.1]} h={1.1} cor="#7ab4ff" escala={pressao} />}
          {sinais && <Texto3D texto="+" p={[0.1, (amostra(bot, 0.1) ?? yF) - 1.3, zLinha + 0.1]} h={1.1} cor="#ff8c6a" escala={pressao} />}
        </group>
      )}
      {forca > 0.02 && <Seta a={[0.1, yF, zLinha + 0.14]} b={[0.1, yF + forca, zLinha + 0.14]} cor={LARANJA} w={0.12 * escalaSeta} op={1} />}
      {/* bolinhas de ar: saem juntas e chegam em tempos diferentes (não se esperam) */}
      {bolas > 0.01 && [L.topo[1], L.baixo[1]].map((l, i) => {
        const f = i === 0 ? clamp01(bolas / 0.62) : clamp01(bolas / 1.5);
        const f0 = 0.22 + f * 0.58;
        const idx = Math.min(l.length - 1.001, f0 * (l.length - 1));
        const a = Math.floor(idx);
        const u = idx - a;
        const p: V = [lerp(l[a][0], l[a + 1][0], u), lerp(l[a][1], l[a + 1][1], u), zLinha + 0.05];
        return (
          <group key={i}>
            <mesh position={p}><sphereGeometry args={[0.15, 14, 10]} /><meshStandardMaterial color={i === 0 ? "#ffd23f" : "#ff5a8a"} emissive={i === 0 ? "#ffb000" : "#ff2a6a"} emissiveIntensity={0.6} /></mesh>
            <Halo p={p} r={0.42} cor={i === 0 ? "#ffd23f" : "#ff5a8a"} op={0.8} />
          </group>
        );
      })}
    </group>
  );
};

/* ---------- carimbo e outras peças de texto ---------- */

const Carimbo: React.FC<{ texto: string; p: V; h: number; k: number }> = ({ texto, p, h, k }) => {
  const { tex, razao } = useMemo(() => {
    const c = document.createElement("canvas");
    const g = c.getContext("2d")!;
    g.font = `700 150px ${FONT}, sans-serif`;
    const w = Math.ceil(g.measureText(texto).width) + 120;
    c.width = w;
    c.height = 260;
    g.font = `700 150px ${FONT}, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.beginPath();
    g.roundRect(14, 14, w - 28, 232, 36);
    g.fill();
    g.lineWidth = 18;
    g.strokeStyle = "#e0231b";
    g.stroke();
    g.fillStyle = "#e0231b";
    g.fillText(texto, w / 2, 138);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { tex: t, razao: w / 260 };
  }, [texto]);
  if (k <= 0.02) return null;
  const e = 1 + 0.9 * (1 - clamp01(k * 3.5)) ** 2;
  return (
    <sprite position={p} scale={[h * razao * e, h * e, 1]} renderOrder={22}>
      <spriteMaterial map={tex} transparent depthTest={false} rotation={-0.18} opacity={clamp01(k * 4)} />
    </sprite>
  );
};

/* ---------- modelo da placa (3 m), cabine curta e motor pequeno ---------- */

const ModeloPlaca: React.FC<{ k: number; helice: number; t: number; alca?: boolean; rodasEnterradas?: boolean }> = ({ k, helice, t, alca }) => (
  <group>
    {/* rodas */}
    {([[-0.62, 0], [0.35, 0.52], [0.35, -0.52]] as number[][]).map(([x, z], i) => (
      <mesh key={i} position={[x, 0.2, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.12, 14]} /><meshStandardMaterial color="#1b1d20" roughness={0.9} /></mesh>
    ))}
    {([[-0.62, 0], [0.35, 0.52], [0.35, -0.52]] as number[][]).map(([x, z], i) => (
      <mesh key={`c${i}`} position={[x, 0.2, z + (z >= 0 ? 0.07 : -0.07)]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 0.02, 10]} /><meshStandardMaterial color="#c9d1d9" metalness={0.6} roughness={0.3} /></mesh>
    ))}
    {/* cabine curta */}
    <Caixa p={[0, 0.62, 0]} t={[1.6, 0.62, 0.82]} cor={LARANJA} raio={0.14} verniz={0.6} />
    <Caixa p={[-0.5, 1.0, 0]} t={[0.62, 0.3, 0.66]} cor="#9fd8ff" raio={0.1} verniz={1} />
    <Caixa p={[0.2, 0.62, 0]} t={[0.5, 0.2, 0.86]} cor="#ffffff" raio={0.05} />
    <Caixa p={[-0.82, 0.55, 0]} t={[0.12, 0.3, 0.5]} cor="#ffd23f" raio={0.04} />
    {/* hastes e placa */}
    {[-0.34, 0.34].map((z) => <Caixa key={z} p={[-0.1, 1.28, z]} t={[0.07, 0.42, 0.07]} cor="#5f6770" raio={0.02} />)}
    <group position={[-0.1, 1.5, 0]} scale={0.45}><FoilMesh k={k} esp={0.09} prof={6.67} cor={k > 0.5 ? "#ffcf5a" : "#e9edf1"} /></group>
    {/* motor pequeno empurrando por trás */}
    <mesh position={[0.98, 0.64, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.2, 0.46, 12]} /><meshStandardMaterial color="#59636d" metalness={0.5} roughness={0.4} /></mesh>
    <mesh position={[1.24, 0.64, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.1, 0.16, 10]} /><meshStandardMaterial color="#c9d1d9" metalness={0.5} /></mesh>
    <group position={[1.3, 0.64, 0]} rotation={[t * (6 + helice * 60), 0, 0]}>
      {[0, 1, 2].map((i) => <group key={i} rotation={[(i * 2 * Math.PI) / 3, 0, 0]}><Caixa p={[0, 0.36, 0]} t={[0.025, 0.7, 0.09]} cor="#2a2d31" raio={0.01} /></group>)}
    </group>
    {/* leme pequeno */}
    <Caixa p={[0.72, 1.1, 0]} t={[0.4, 0.4, 0.05]} cor={LARANJA} raio={0.02} />
    {alca && <Caixa p={[1.62, 0.95, 0]} t={[0.06, 0.06, 0.9]} cor="#2a2d31" raio={0.02} />}
    {alca && [-0.4, 0.4].map((z) => <Caixa key={z} p={[1.45, 0.78, z]} t={[0.3, 0.05, 0.05]} cor="#2a2d31" raio={0.01} />)}
  </group>
);

/* ---------- pessoas ---------- */

type GenteE = { x?: unknown; y?: unknown; z?: unknown; rot?: unknown; acao?: string | [number, string, string?][]; exp?: Expressao3D; pose?: Pose3D | [number, Pose3D][]; incl?: unknown; esc?: number; penas?: boolean; suor?: number; ate?: number; de?: number; bate?: [number, number] };

const AsaBraco: React.FC<{ lado: 1 | -1 }> = ({ lado }) => (
  <group>
    {Array.from({ length: 9 }).map((_, i) => {
      const a = (i - 4) * 0.075 * lado;
      const l = 0.78 - Math.abs(i - 4) * 0.045;
      return (
        <mesh key={i} position={[Math.sin(a) * l * 0.5 + lado * 0.1, -Math.cos(a) * l * 0.5 - 0.08, 0.05 - i * 0.004]} rotation={[0, 0, -a]} scale={[0.065, l / 2, 0.015]}>
          <sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={i % 2 ? "#f3efe6" : "#d9c7a6"} roughness={0.95} flatShading />
        </mesh>
      );
    })}
  </group>
);

const Pessoa: React.FC<{ g: GenteE; p: number; t: number; tAbs: number }> = ({ g, p, t, tAbs }) => {
  if (g.ate !== undefined && p > g.ate) return null;
  if (g.de !== undefined && p < g.de) return null;
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
  pose["tronco.x"] = (pose["tronco.x"] ?? 0) + nv(g.incl, p, 0);
  if (g.bate && p >= g.bate[0] && p <= g.bate[1]) {
    const b = 1.2 + 0.8 * Math.sin(t * 15);
    Object.assign(pose, { "ombroE.z": b, "ombroD.z": -b, "cotoveloE.x": 0, "cotoveloD.x": 0, "cotoveloE.z": 0, "cotoveloD.z": 0, "ombroE.x": 0, "ombroD.x": 0, maos: 1 });
  }
  const x = nv(g.x, p, 0);
  const z = nv(g.z, p, 0);
  const s = g.esc ?? 1.06;
  const ang = pose["ombroE.z"] ?? 0.12;
  return (
    <group position={[x, nv(g.y, p, 0), z]} rotation={[0, nv(g.rot, p, 0), 0]} scale={s}>
      <Boneco3D p={zeca} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} suor={g.suor ?? 0} t={tAbs} />
      {g.penas && (
        <group position={[0, 1.09, 0]}>
          <group position={[0.205, 0, 0]} rotation={[0, 0, pose["ombroE.z"] ?? ang]}><AsaBraco lado={1} /></group>
          <group position={[-0.205, 0, 0]} rotation={[0, 0, pose["ombroD.z"] ?? -ang]}><AsaBraco lado={-1} /></group>
        </group>
      )}
    </group>
  );
};

/* ---------- campo ---------- */

const BarraPeso: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  if (k <= 0.01) return null;
  const hA = 5.2 * suave(k);
  const hC = 1.05 * suave(k);
  return (
    <group>
      <Caixa p={[0, 0.05, 0]} t={[5.2, 0.1, 1.4]} cor="#2b3a4d" raio={0.04} />
      {/* caminhão (barra baixa) */}
      <Caixa p={[-1.5, hC / 2 + 0.1, 0]} t={[1.1, hC, 0.9]} cor="#8d949c" raio={0.05} />
      <group position={[-1.5, hC + 0.1, 0]} scale={0.1}><Caminhao /></group>
      {/* avião (barra alta) */}
      <Caixa p={[1.3, hA / 2 + 0.1, 0]} t={[1.4, hA, 0.9]} cor="#e0642a" raio={0.05} emissivo="#e0642a" brilho={0.15} />
      <Texto3D texto="80 t" p={[1.3, hA + 0.9, 0.3]} h={0.85} cor="#ffd23f" escala={suave(clamp01((k - 0.55) / 0.35))} />
      {t >= 0 && <group />}
    </group>
  );
};

const CampoPalco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { cena, p, n, tEp, gente, t } = C;
  const aviao = cena.aviao === true;
  const modelo = (cena.modelo as string | undefined) ?? null;
  const k = cena.curva !== undefined ? n("curva") : modelo === "curva" ? 1 : 0;
  return (
    <group>
      <hemisphereLight args={["#cfe8ff", "#6f9a55", 1.05]} />
      <directionalLight position={[40, 70, 50]} intensity={1.7} color="#fff3dc" />
      <fog attach="fog" args={["#d9ebf7", 34, 78]} />
      <Dome topo="#3d8fe0" meio="#9fd0f5" base="#e4f1fa" />
      <Chao cor="#6aae4f" cor2="#62a448" listras />
      <Nuvens t={tEp} />
      {/* fundo: pista, terminal, torre, árvores */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, -38]}><planeGeometry args={[600, 20]} /><meshStandardMaterial color="#51565d" roughness={0.95} /></mesh>
      {Array.from({ length: 30 }).map((_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-140 + i * 10, 0.02, -38]}><planeGeometry args={[4, 0.35]} /><meshBasicMaterial color="#f1f1ea" /></mesh>)}
      <Terminal x={-12} z={-46} />
      <Biruta x={14} z={-26} t={tEp} />
      {[[-40, -18, 1.2], [-28, -12, 0.9], [32, -20, 1.3], [44, -12, 1.0], [-52, -10, 1.1], [58, -28, 1.4], [24, -15, 0.8], [-18, -14, 1.0], [6, -16, 1.1]].map(([x, z, s], i) => <Arvore key={i} x={x} z={z} s={s} cor={i % 2 ? "#3f8a3c" : "#4c9a46"} />)}
      {/* cerca baixa na frente da pista */}
      {Array.from({ length: 40 }).map((_, i) => <mesh key={i} position={[-120 + i * 6, 0.5, -26]}><boxGeometry args={[0.1, 1, 0.1]} /><meshStandardMaterial color="#8a8f95" /></mesh>)}
      <mesh position={[0, 0.85, -26]}><boxGeometry args={[240, 0.05, 0.05]} /><meshStandardMaterial color="#8a8f95" /></mesh>
      {/* avião grande */}
      {aviao && (
        <group position={[n("aviaoX"), n("aviaoY", 24), n("aviaoZ", -55)]} rotation={[n("aviaoRoll"), n("aviaoYaw"), n("aviaoPitch")]}>
          <Aviao penas={cena.aviaoPenas === true} t={tEp} />
        </group>
      )}
      {cena.caminhao === true && <group position={[-3.2, 0, -3.2]} rotation={[0, 0.6, 0]}><Caminhao /></group>}
      {cena.barra !== undefined && <group position={[3.4, 0, 0.2]} rotation={[0, -0.25, 0]}><BarraPeso k={n("barra")} t={t} /></group>}
      {modelo && (
        <group position={[n("modeloX"), n("modeloY"), 0]}>
          <ModeloPlaca k={k} helice={n("helice", 0.3)} t={tEp} alca={cena.empurra === true} />
        </group>
      )}
      {n("interroga") > 0.01 && <Interroga k={n("interroga")} />}
      {gente.map((gd, i) => <Pessoa key={i} g={gd} p={p} t={t} tAbs={tEp} />)}
    </group>
  );
};

const Interroga: React.FC<{ k: number; pos?: V; esc?: number }> = ({ k, pos = [0, 4.4, 1], esc = 1 }) => {
  const sobe = clamp01(k / 0.6);
  const lamp = clamp01((k - 0.62) / 0.15);
  return (
    <group position={pos} scale={esc}>
      {lamp < 0.5 && <Texto3D texto="?" p={[0, sobe * 1.4, 0]} h={1.3} cor="#ffd23f" escala={sobe} />}
      {lamp >= 0.5 && (
        <group position={[0, 1.4, 0]} scale={0.8 + 0.2 * Math.sin(k * 40)}>
          <mesh><sphereGeometry args={[0.5, 16, 12]} /><meshStandardMaterial color="#fff2a0" emissive="#ffe45a" emissiveIntensity={1.4} /></mesh>
          <mesh position={[0, -0.55, 0]}><cylinderGeometry args={[0.22, 0.22, 0.3, 10]} /><meshStandardMaterial color="#9aa3ad" metalness={0.6} /></mesh>
          <Halo p={[0, 0, 0]} r={2.2} cor="#fff2a0" op={0.9} />
        </group>
      )}
    </group>
  );
};

/* ---------- túnel de vento ---------- */

const TunelPalco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { cena, p, n, tEp, gente, t } = C;
  const modelo = (cena.modelo as string | undefined) ?? "placa";
  const k = cena.curva !== undefined ? n("curva") : modelo === "curva" ? 1 : 0;
  const sobe = n("sobe");
  const yf = 2.0 + sobe;
  const sep = n("solta");
  const F: Foil = { alpha: n("anguloAtaque"), k, yf, sep, t: tEp, esp: ESP * 1.5 };
  const forca = n("setasForca");
  return (
    <group>
      <hemisphereLight args={["#ffffff", "#8fa3b8", 1.25]} />
      <directionalLight position={[3, 8, 10]} intensity={1.3} />
      {/* fundo liso do túnel: painéis, trilhos e janelas */}
      <mesh position={[0, 2.2, -2.2]}><planeGeometry args={[40, 14]} /><meshStandardMaterial color="#22364d" roughness={1} /></mesh>
      {Array.from({ length: 13 }).map((_, i) => <mesh key={i} position={[-12 + i * 2, 2.2, -2.15]}><boxGeometry args={[0.04, 14, 0.02]} /><meshBasicMaterial color="#35506e" /></mesh>)}
      {[-0.4, 4.9].map((y, i) => (
        <group key={i}>
          <Caixa p={[0, y, 0]} t={[40, 0.4, 4]} cor="#4b5d72" raio={0.05} />
          <Caixa p={[0, y + (i ? -0.24 : 0.24), 1.9]} t={[40, 0.07, 0.15]} cor="#ffd23f" raio={0.02} />
        </group>
      ))}
      {/* trilho vertical onde a placa corre */}
      <Caixa p={[0, 2.2, -0.9]} t={[0.14, 5.2, 0.14]} cor="#9aa8b8" raio={0.03} />
      <Caixa p={[0, yf, -0.6]} t={[0.26, 0.26, 0.6]} cor="#ffd23f" raio={0.04} />
      <Caixa p={[0, 0.25, -0.9]} t={[0.5, 0.5, 0.5]} cor="#6a7a8c" raio={0.05} />
      {/* base de parada */}
      <Caixa p={[0, 1.15, -0.9]} t={[0.4, 0.08, 0.4]} cor="#ff6b4a" raio={0.02} />
      <FoilFlow F={F} t={tEp} linhas={n("linhasAr")} corpo corCorpo={k > 0.5 ? "#ffcf5a" : "#f4f6f8"} pressao={n("pressao")} forca={forca} setasAr={n("setasAr")} bolas={n("bolas")} />
      {cena.forca0 === true && (
        <group>
          <Seta a={[0.1, yf, 0.65]} b={[0.1, yf + 0.0001, 0.65]} cor="#8d949c" />
          <Texto3D texto="0" p={[0.1, yf + 0.55, 0.7]} h={0.5} cor="#cfd6dd" />
        </group>
      )}
      {n("mito") > 0.01 && <Carimbo texto="MITO" p={[-0.2, yf + 1.55, 1]} h={0.95} k={n("mito")} />}
      {gente.map((gd, i) => <Pessoa key={i} g={gd} p={p} t={t} tAbs={tEp} />)}
    </group>
  );
};

/* ---------- carro com a mão para fora ---------- */

const CarroPalco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { cena, n, tEp, p } = C;
  const maoAng = n("mao");
  const sobeK = n("maoSobe");
  const a = 1.45 + 0.22 * suave(sobeK);
  const s = 0.9;
  const gx = -0.54;
  const gy = 0.14;
  const gz = 0.3;
  const sh: V = [gx - 0.205 * s, gy + 0.93 * s, gz];
  const L = 0.6 * s;
  const mao: V = [sh[0] - L * Math.sin(a), sh[1] - L * Math.cos(a), sh[2]];
  const pose: Pose3D = { ...poseDe3D("sentado", tEp), "ombroE.x": 0, "ombroE.z": a, "cotoveloE.x": 0, "cotoveloE.z": 0, "ombroD.x": -0.9, "cotoveloD.x": -0.7, "maos": 1, "cabeca.y": 0.3 };
  const F: Foil = { alpha: maoAng, k: 0, yf: 0, sep: n("solta"), t: tEp, esp: 0.13 };
  const E = 0.16;
  const v = ((tEp * 16 * clamp01(0.4 + n("carroVel", 1))) % 6);
  const forca = n("setasForca");
  return (
    <group>
      <hemisphereLight args={["#cfe8ff", "#6f9a55", 1.1]} />
      <directionalLight position={[-12, 14, 6]} intensity={1.6} color="#fff3dc" />
      <fog attach="fog" args={["#d9ebf7", 30, 78]} />
      <Dome topo="#3d8fe0" meio="#9fd0f5" base="#e4f1fa" />
      <Chao cor="#6aae4f" />
      <Nuvens t={tEp} vel={0.2} lista={[[-40, 36, -40, 5], [30, 44, 30, 6], [0, 50, -60, 6], [50, 40, -30, 5]]} />
      {/* estrada reta que passa para trás (o carro anda para -z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.0, 0.0, 0]}><planeGeometry args={[11, 600]} /><meshStandardMaterial color="#4a4e55" roughness={0.95} /></mesh>
      {[-4.3, 6.3].map((x) => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}><planeGeometry args={[0.2, 600]} /><meshBasicMaterial color="#f1f1ea" /></mesh>)}
      {Array.from({ length: 80 }).map((_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-1.9, 0.02, -240 + i * 6 + v]}><planeGeometry args={[0.22, 2.6]} /><meshBasicMaterial color="#f1f1ea" /></mesh>)}
      {Array.from({ length: 24 }).map((_, i) => {
        const z = ((i * 14 + v * 2.33 + 400) % 330) - 160;
        const x = i % 2 ? 12 + rnd(i) * 14 : -9 - rnd(i) * 8;
        return <Arvore key={i} x={x} z={z} s={1.1 + rnd(i + 5) * 0.6} cor={i % 3 ? "#3f8a3c" : "#4c9a46"} />;
      })}
      {/* postes que passam */}
      {Array.from({ length: 12 }).map((_, i) => {
        const z = ((i * 25 + v * 4.17 + 600) % 300) - 150;
        return <mesh key={i} position={[-6.4, 3.2, z]}><cylinderGeometry args={[0.07, 0.1, 6.4, 6]} /><meshStandardMaterial color="#8a8f95" /></mesh>;
      })}
      <group>
        <Auto cor="#d8392e" variante="sedan" vidroOp={0.1} />
        <group position={[gx, gy, gz]} rotation={[0, Math.PI, 0]} scale={s}>
          <Boneco3D p={zeca} pose={pose} expressao={sobeK > 0.4 ? "comemorando" as Expressao3D : "sorriso"} pisca={piscar(tEp)} boca={sobeK > 0.4 ? 0.5 : 0} olhar={[0, 0]} t={tEp} />
        </group>
        {/* volante e painel */}
        <Caixa p={[0.0, 0.98, -0.5]} t={[1.3, 0.12, 0.3]} cor="#22262c" raio={0.02} sombra={false} />
      </group>
      {/* a mão, o ar e as setas */}
      <group position={mao} scale={E} rotation={[0, -Math.PI / 2, 0]}>
        <FoilFlow F={F} t={tEp} linhas={n("linhasAr")} corpo corCorpo={PELE} prof={1.2} zLinha={0.7} larg={0.045} escalaSeta={1.5} forca={0} max={4} />
        {forca > 0.02 && <Seta a={[0.05, 0.1, 0.9]} b={[0.05, 0.1 + forca / E, 0.9]} cor={VERMELHO} w={0.2} op={1} />}
      </group>
      {p < 0 && <group />}
    </group>
  );
};

/* ---------- pista de aeroporto ---------- */

const Velocimetro: React.FC<{ v: number }> = ({ v }) => {
  const ang = lerp(2.3, -2.3, clamp01(v));
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.62, 0.62, 0.12, 28]} /><meshStandardMaterial color="#1c2430" roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.55, 0.55, 0.02, 28]} /><meshStandardMaterial color="#f4f6f8" roughness={0.6} /></mesh>
      {Array.from({ length: 9 }).map((_, i) => {
        const a = lerp(2.3, -2.3, i / 8);
        return <mesh key={i} position={[Math.sin(a) * 0.46, Math.cos(a) * 0.46, 0.09]} rotation={[0, 0, -a]}><boxGeometry args={[0.04, 0.1, 0.01]} /><meshBasicMaterial color={i > 6 ? "#e0231b" : "#2a2d31"} /></mesh>;
      })}
      <mesh position={[Math.sin(ang) * 0.2, Math.cos(ang) * 0.2, 0.11]} rotation={[0, 0, -ang]}><boxGeometry args={[0.05, 0.42, 0.02]} /><meshBasicMaterial color="#e0231b" /></mesh>
      <mesh position={[0, 0, 0.12]}><sphereGeometry args={[0.06, 10, 8]} /><meshStandardMaterial color="#2a2d31" /></mesh>
    </group>
  );
};

const PistaPalco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { cena, p, n, tEp, gente, t } = C;
  const modelo = (cena.modelo as string | undefined) ?? "placa";
  const k = cena.curva !== undefined ? n("curva") : modelo === "curva" ? 1 : 0;
  const mx = n("modeloX"); // distância percorrida (negativa): o mundo passa para trás, o modelo e a câmera ficam parados
  const my = n("modeloY");
  const nariz = n("nariz");
  const forca = n("forca");
  const peso = n("peso");
  return (
    <group>
      <hemisphereLight args={["#ffd9b0", "#5a6a4a", 0.95]} />
      <directionalLight position={[-40, 25, 30]} intensity={2.0} color="#ffb877" />
      <fog attach="fog" args={["#f6cfa6", 34, 78]} />
      <Dome topo="#4d7fc9" meio="#f4b58a" base="#ffd9a8" />
      <Chao cor="#6e9a4e" />
      <Nuvens t={tEp} lista={[[-50, 30, -52, 5], [30, 40, -58, 6], [60, 26, -40, 4], [-20, 48, -60, 6], [0, 24, -60, 4]]} />
      {/* o mundo anda para trás junto com o avião de teste: pista, faixas, luzes, árvores */}
      <group position={[-mx, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-60, 0.0, 0]}><planeGeometry args={[700, 24]} /><meshStandardMaterial color="#4a4e55" roughness={0.95} /></mesh>
        {Array.from({ length: 70 }).map((_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-300 + i * 10, 0.02, 0]}><planeGeometry args={[5, 0.35]} /><meshBasicMaterial color="#f4f1e6" /></mesh>)}
        {[-10.8, 10.8].map((z) => <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[-60, 0.02, z]}><planeGeometry args={[700, 0.3]} /><meshBasicMaterial color="#f4f1e6" /></mesh>)}
        {Array.from({ length: 40 }).map((_, i) => [-12.6, 12.6].map((z) => <mesh key={`${i}${z}`} position={[-300 + i * 20, 0.12, z]}><sphereGeometry args={[0.11, 8, 6]} /><meshBasicMaterial color="#fff2a0" /></mesh>))}
        {Array.from({ length: 8 }).map((_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[8, 0.02, -8 + i * 2.3]}><planeGeometry args={[9, 1.0]} /><meshBasicMaterial color="#f4f1e6" /></mesh>)}
        {Array.from({ length: 36 }).map((_, i) => <Arvore key={i} x={-300 + i * 22 + rnd(i) * 8} z={i % 2 ? 24 + rnd(i + 3) * 14 : -26 - rnd(i + 3) * 14} s={1.1 + rnd(i + 9) * 0.5} cor="#3f7a3c" />)}
        {/* placas de pista e cones */}
        {Array.from({ length: 12 }).map((_, i) => <group key={i} position={[-220 + i * 40, 0, 15]}><mesh position={[0, 0.6, 0]}><boxGeometry args={[0.1, 1.2, 0.1]} /><meshStandardMaterial color="#8a8f95" /></mesh><mesh position={[0, 1.3, 0]}><boxGeometry args={[1.0, 0.6, 0.06]} /><meshStandardMaterial color="#ffd23f" /></mesh></group>)}
        {gente.map((gd, i) => <Pessoa key={i} g={gd} p={p} t={t} tAbs={tEp} />)}
      </group>
      <group position={[-mx * 0.3, 0, 0]}>
        <Terminal x={-30} z={-46} />
        <Biruta x={14} z={-30} t={tEp} />
      </group>
      {cena.aviao === true && (
        <group position={[n("aviaoX"), n("aviaoY", 24), n("aviaoZ", -50)]} rotation={[n("aviaoRoll"), n("aviaoYaw"), n("aviaoPitch")]}><Aviao t={tEp} /></group>
      )}
      {/* o modelo; o nariz sobe girando em torno da roda de trás */}
      <group position={[0, my, 0]}>
        <group position={[0.35, 0.2, 0]} rotation={[0, 0, -nariz * 0.3]}>
          <group position={[-0.35, -0.2, 0]}>
            <ModeloPlaca k={k} helice={1} t={tEp} />
            {forca > 0.02 && <Seta a={[-0.4, 1.5, 0.75]} b={[-0.4, 1.5 + forca, 0.75]} cor={LARANJA} w={0.13} />}
            {peso > 0.02 && <Seta a={[0.6, 0.7, 0.75]} b={[0.6, 0.7 - peso, 0.75]} cor="#9aa3ad" w={0.13} />}
            {n("x4") > 0.02 && <Texto3D texto="×4" p={[0.4, 1.5 + forca + 0.5, 0.75]} h={0.8} cor="#ffd23f" escala={n("x4")} />}
          </group>
        </group>
        {cena.velocimetro !== undefined && <group position={[-1.5, 2.2, 1.5]} rotation={[0, -0.6, 0]} scale={1.05}><Velocimetro v={n("velocimetro")} /></group>}
      </group>
    </group>
  );
};

/* ---------- céu: o avião grande em voo ---------- */

const CeuPalco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { cena, n, tEp } = C;
  const s4 = n("setas4");
  const corte = n("corteAsa");
  const ax = n("aviaoX");
  const ay = n("aviaoY", 30);
  const az = n("aviaoZ", 0);
  const F: Foil = { alpha: 0.05, k: 1.9, yf: 0, sep: 0, t: tEp, esp: 0.05 };
  const E = 2.8;
  return (
    <group>
      <hemisphereLight args={["#cfe8ff", "#7fa0c8", 1.1]} />
      <directionalLight position={[40, 80, 60]} intensity={1.7} color="#fff3dc" />
      <fog attach="fog" args={["#d9ebf7", 60, 79]} />
      <Dome topo="#2f7fd8" meio="#8cc8f5" base="#e0f0fb" />
      <Nuvens t={tEp} lista={[[-34, -8, -22, 6], [32, -14, -24, 7], [-14, 44, -26, 6], [38, 40, -20, 5], [-44, 30, -28, 5], [10, -26, -12, 6], [-26, -22, 4, 4], [0, 48, 10, 4]]} vel={0.3} />
      {n("interroga") > 0.01 && <Interroga k={n("interroga")} pos={[-24, ay - 8, 30]} esc={6} />}
      <group position={[ax, ay, az]} rotation={[n("aviaoRoll"), n("aviaoYaw"), n("aviaoPitch")]}>
        <group scale={0.78}><Aviao t={tEp} /></group>
        {s4 > 0.02 && (
          <group>
            <Seta a={[0, 0, 6]} b={[0, 11 * s4, 6]} cor={LARANJA} w={0.55} />
            <Seta a={[0, 0, 6]} b={[0, -11 * s4, 6]} cor="#9aa3ad" w={0.55} />
            <Seta a={[-8, 0, 6]} b={[-8 - 6 * s4, 0, 6]} cor="#6bd36b" w={0.4} />
            <Seta a={[8, 0, 6]} b={[8 + 6 * s4, 0, 6]} cor="#c88bff" w={0.4} />
            <Texto3D texto="SUSTENTAÇÃO" p={[0, 13.6 * s4, 6]} h={2.6} cor={LARANJA} escala={s4} />
            <Texto3D texto="PESO" p={[0, -13.6 * s4, 6]} h={2.6} cor="#cfd6dd" escala={s4} />
          </group>
        )}
        {corte > 0.02 && (
          <group position={[3.4, -0.54, 8.2]} scale={E}>
            <FoilFlow F={F} t={tEp} linhas={corte} corpo={false} zLinha={0.0} larg={0.04} escalaSeta={1.2} setasAr={corte} />
          </group>
        )}
      </group>
    </group>
  );
};

/* ---------- cena ---------- */

type Ctx = { cena: Record<string, unknown>; p: number; t: number; tEp: number; n: (k: string, pad?: number) => number; gente: GenteE[] };

type EtiqDef = { texto: string; para: V; off: [number, number]; cor?: string };

const AviaoCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const n = (k: string, pad = 0) => nv(cena[k], p, pad);
  const palco = (cena.palco as string | undefined) ?? "campo";
  const X0 = PALCO_X[palco] ?? 0;
  const gente = (cena.gente as GenteE[] | undefined) ?? [];
  const C: Ctx = { cena, p, t, tEp: tEpisodio, n, gente };
  const et: Record<string, EtiqDef> = {
    placa: { texto: "PLACA", para: [0.1, 2.0, 0.4], off: [0.0, 1.0], cor: "#ffd23f" },
    ar: { texto: "AR PRA BAIXO", para: [1.9, 1.2, 0.4], off: [0.4, -1.3], cor: "#7fc4ff" },
    pressao: { texto: "PRESSÃO MENOR", para: [0.1, 2.7, 0.4], off: [0.0, 1.0], cor: "#7fc4ff" },
    asa: { texto: "ASA", para: [-0.1, 1.5, 0.0], off: [0.0, 1.1], cor: "#ffd23f" },
    placaM: { texto: "PLACA", para: [-0.1, 1.55, 0.0], off: [0.0, 1.0], cor: "#ffd23f" },
  };
  const S = n("etiqS", 1);
  const Kt = n("etiqK", 1);
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fimE] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fimE === undefined || p <= fimE) };
  }).filter((x) => x.ok);
  const bx = palco === "pista" || palco === "campo" ? n("modeloX") : 0;
  const by = palco === "tunel" ? n("sobe") : 0;
  return (
    <group>
      <group position={[X0, 0, 0]}>
        {palco === "campo" && <CampoPalco C={C} />}
        {palco === "tunel" && <TunelPalco C={C} />}
        {palco === "carro" && <CarroPalco C={C} />}
        {palco === "pista" && <PistaPalco C={C} />}
        {palco === "ceu" && <CeuPalco C={C} />}
      </group>
      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const base: V = [d.para[0] + bx + X0, d.para[1] + by, d.para[2]];
        const off: V = [base[0] + d.off[0] * S, base[1] + d.off[1] * S, base[2] + 0.2];
        return <Etiqueta key={c} texto={d.texto} de={off} para={base} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 50) => ({ pos, alvo, fov });

export const aviao: Cenario3D = {
  Cena: AviaoCena,
  padrao: "geral",
  fundo: (cena) => {
    const pa = cena.palco as string | undefined;
    return pa === "tunel" ? "#e2eaf1" : pa === "pista" ? "#f4b58a" : "#8cc8f5";
  },
  luzPropria: true,
  cameras: { geral: c([-4, 3, 14], [0, 3, 0], 50) },
};
