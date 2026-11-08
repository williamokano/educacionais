import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { clamp01, lerp, suave, valor } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Anterior, poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Expressao3D, Pose3D, V3, Valor } from "../../../src/v3d/tipos";
import { Etiqueta, Halo, Liga, Seta, Texto3D, V } from "./cozinha-base";
import { LinhasZoom, Lupa } from "./microondas-pecas";
import { zeca } from "./zeca";
import { homemB, mulher } from "./fieis";
import { menino } from "./moradores";
import { Bicicleta, Chamine, Escada, Galhos, Golpe, Grade, Peixe, PeixeEscada, PeixeGrade, Sala, Submarino, Transformador } from "./usina2";

// Usina hidrelétrica (episódio 18, "por que o rio passa correndo e não acende uma lâmpada?"). Quatro palcos no mesmo mundo:
//   palco "rio" (x = 0, padrão): o rio corre para +x (direita do quadro); o chão (margem) fica em y = 0, o leito em y = -0,5 e a água em y = -0,05. Câmera do lado +z.
//     A roda d'água fica em x = -0,8; a barragem (corte, em x 0 a 2,4, topo y = 3,8, largura z -3,6 a 1,4; o corte é a face z = 1,4); a casa de força e a turbina ao pé dela.
//     Todo o eixo da água (comporta, tubo forçado, turbina) está em z = 0,2. O vertedouro fica no fundo (z -3,6 a -1,5). O lago fica atrás da parede (x < 0).
//   palco "garrafa" (x = 60): bancada com a garrafa furada na quina, jatos que caem no chão, riscos no chão.
//   palco "itaipu" (x = 120): vista aérea estilizada da barragem de Itaipu com 20 turbinas em fila.
//   palco "mapa" (x = 200): Brasil com luzes e a barra ÁGUA.
// REGRA: o nome "usina/barragem/hidrelétrica" só aparece na batida 18 (a parede é "parede" até lá; o rótulo BARRAGEM não é usado).
// Campos da cena (número, { de, para, ini, fim } ou chaves [[progresso, valor], ...]; strings e booleanos fixos). Velocidades (`giro`, `vazao`, `vazaoJus`) são por segundo e
// são integradas ao longo da batida, então podem variar sem a roda pular.
//   palco      "rio" (padrão) | "garrafa" | "itaipu" | "mapa"
//   clima      entardecer 0..1 (céu laranja) · chuva 0..1 (céu cinza e chuva) · nuvens 0..1 (padrão 1)
//   rio        nivelRio 0..1 (1 = rio cheio, 0 = seca: encolhe e aparece o leito) · vazao (m/s, padrão 1,4) · vazaoJus (rio depois da parede; padrão = vazao) · folhas 0..1 (padrão 1)
//   roda       rodaVis 0..1 (cresce) · rodaY (m, desce da altura) · rodaX (padrão -0,8) · giro (rad/s; vale para a roda, o ímã e a hélice)
//   gerador    geradorVis 0..1 (a caixa do gerador no eixo da roda) · fio 0..1 (o fio do gerador até a lâmpada) · corrente 0..1 (bolinhas de eletricidade no fio)
//   lupa       lupa 0..1 · lupaX, lupaY, lupaR · lupaModo "roda" (padrão: ímã e bobina)
//   lâmpada    lampVis 0..1 · lampX, lampZ · lampAlt (m, altura da lâmpada) · luz (0..2: 1 = acesa, > 1 = enorme) · pisca 0..1 · plug 0..1 (tomada solta no ar)
//              lampModo "estaca" (padrão) | "poste" (poste alto ao lado da casa de força, x 5,6)
//   turbina    turbVis 0..1 · turbX (início do cano, m) · turbY (altura do eixo) · helice 0..1 (hélice) · raioxTurb · setasAgua 0..1 (setas azuis entrando) · funil 0..1 (paredinhas que obrigam o rio a passar)
//              saidaAgua 0..1 (água saindo do cano) · tunelSaida 0..1 (túnel de saída até o rio) · fluxoTurb 0..1 (bolinhas de água dentro do cano)
//   barragem   barragem 0..1 (a parede sobe) · lago (m, altura da água atrás da parede; padrão -0,05 = só o rio) · raiox 0..1 (concreto vira vidro) · plinto 0..1 (base de concreto sob a turbina elevada)
//              comporta 0..1 (abertura da comporta; -1 = sem comporta) · fluxoComporta 0..1 · tuboForcado 0..1 · aguaTubo 0..1 · vert 0..1 (vertedouro em degraus) · vertAgua 0..1 · casa 0..1 (casa de força)
//   cidade     cidade 0..1 (casas e postes ao longe acendem) · torres 0..1 (torres de transmissão e fios) · usina: true (mostra o conjunto completo)
//   garrafa    nivelGarrafa 0..1 · jatos 0..1 · riscos 0..1
//   itaipu     itaipu 0..20 (turbinas acesas)
//   mapa       luzesMapa 0..1 · barraAgua 0..1 (preenche até 55%)
//   outros     interroga 0..1 (? que sobe e vira lâmpada) · lampadaMarca 0..1
//   gente      lista de { x, y, z, rot, acao, exp, pose, incl, esc, lampada: true } (sempre o `zeca`) · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax
//              chaves: roda, ima, bobina, gerador, turbina, comporta, tubo, vert, casa

const n0 = (v: unknown) => v as Valor;
const chaves = (a: [number, number][], p: number) => {
  if (p <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    if (p <= a[i][0]) return lerp(a[i - 1][1], a[i][1], suave(clamp01((p - a[i - 1][0]) / Math.max(a[i][0] - a[i - 1][0], 1e-6))));
  }
  return a[a.length - 1][1];
};
const nv = (v: unknown, p: number, pad = 0) => (Array.isArray(v) ? chaves(v as [number, number][], p) : valor(n0(v), p, pad));

const PALCO_X: Record<string, number> = { rio: 0, garrafa: 60, itaipu: 120, mapa: 200 };

/* ---------- medidas do mundo ---------- */
const YB = -0.5; // leito do rio
const AGUA_Y = -0.05; // superfície do rio normal
const ZR0 = -3.2;
const ZR1 = 1.4; // borda da frente do rio (face do corte)
const ZE = 0.2; // eixo da água (comporta, tubo forçado, turbina)
const HW = 3.8; // topo da parede
const XC = 0.7; // largura do topo
const XB = 2.4; // largura da base (em y = YB)
const KS = (XB - XC) / (HW - YB);
const xl = (y: number) => XC + (HW - y) * KS; // face de jusante da parede
const ZW0 = -3.6;
const ZV0 = -1.5; // começo do trecho do vertedouro (de ZW0 a ZV0)
const BANK = 0;
const AGUA = "#3f9ae8";
const AZUL_AG = "#5fb0f2";
const COBRE = "#d8873a";
const AMARELO_E = "#ffe14a";
const CONCRETO = "#b9bcbc";
const ACO = "#9aa5ad";
const GRAMA = "#6aa84f";
const TURB_L = 2.2; // comprimento do cano da turbina
const TURB_R = 0.4;
const XW = -0.8; // x da roda
const RODA_R = 0.75;
const POSTE_X = 5.6;

/* ---------- contexto ---------- */

type Ctx = { cena: Record<string, unknown>; p: number; t: number; tEp: number; n: (k: string, pad?: number, u?: number) => number; int: (k: string, pad?: number) => number };
const mkCtx = (cena: Record<string, unknown>, p: number, t: number, tEp: number): Ctx => {
  const n = (k: string, pad = 0, u = p) => nv(cena[k], u, pad);
  const dur = p > 0.001 ? t / p : 3;
  const int = (k: string, pad = 0) => {
    const N = 16;
    let s = 0;
    for (let i = 0; i < N; i++) s += n(k, pad, (p * (i + 0.5)) / N);
    return s * (p / N) * dur;
  };
  return { cena, p, t, tEp, n, int };
};

/* ---------- pessoa ---------- */

type GenteE = { x?: Valor; y?: Valor; z?: Valor; rot?: Valor; acao?: string | [number, string, string?][]; exp?: Expressao3D; ant?: Anterior; entradaDur?: number; pose?: Pose3D | [number, Pose3D][]; incl?: Valor; esc?: number; lampada?: boolean; suor?: number; quem?: string; pedala?: Valor };

const Plug: React.FC<{ p: V; rot?: number }> = ({ p, rot = 0 }) => (
  <group position={p} rotation={[0, rot, 0]}>
    <Caixa p={[0, 0, 0]} t={[0.07, 0.09, 0.05]} cor="#f2f2ee" raio={0.01} rug={0.5} />
    <Caixa p={[-0.017, 0.07, 0]} t={[0.012, 0.05, 0.012]} cor="#c9ccd0" met={0.8} raio={0.002} />
    <Caixa p={[0.017, 0.07, 0]} t={[0.012, 0.05, 0.012]} cor="#c9ccd0" met={0.8} raio={0.002} />
  </group>
);

const cordao = (a: V, b: V, folga = 0.25): V[] => [a, [lerp(a[0], b[0], 0.33), Math.min(a[1], b[1]) - folga, lerp(a[2], b[2], 0.33)], [lerp(a[0], b[0], 0.66), Math.min(a[1], b[1]) - folga * 0.8, lerp(a[2], b[2], 0.66)], b];

const PERS: Record<string, typeof zeca> = { zeca, tio: homemB, mae: mulher, menino };
const Pessoa: React.FC<{ g: GenteE; p: number; tAbs: number; ctx: Ctx }> = ({ g, p, tAbs, ctx }) => {
  const { acao, exp, pose } = poseGente(g, { p, t: ctx.t, tAbs, abs: true, incl: valor(g.incl, p, 0) });
  const pedala = valor(g.pedala, p, 0);
  if (pedala > 0.02) {
    const c = -tAbs * 6; // sentido de pedalar para a frente (a bicicleta anda para +x)
    pose["pernaE.x"] = -1.0 + 0.55 * Math.sin(c) * pedala;
    pose["pernaD.x"] = -1.0 - 0.55 * Math.sin(c) * pedala;
    pose["joelhoE.x"] = 1.0 + 0.6 * Math.max(0, Math.cos(c)) * pedala;
    pose["joelhoD.x"] = 1.0 + 0.6 * Math.max(0, -Math.cos(c)) * pedala;
  }
  const pers = PERS[g.quem ?? "zeca"] ?? zeca;
  const { x, y, z, rot } = posicaoGente(g, ctx.t, { x: valor(g.x, p, 0), y: valor(g.y, p, 0), z: valor(g.z, p, 0), rot: valor(g.rot, p, 0) });
  const esc = g.esc ?? 1.06;
  const L: V = [0.02, 1.0, 0.46];
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={esc}>
      <Boneco3D p={pers} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} suor={g.suor} t={tAbs} />
      {g.lampada && (
        <group>
          <Lamp p={L} luz={0} esc={0.9} />
          <Fio pts={cordao([L[0], L[1] - 0.12, L[2]], [0.55, 1.35, 0.35], 0.35)} k={1} corrente={0} fase={0} cor="#2b2b2b" r={0.012} />
          <Plug p={[0.55, 1.4, 0.35]} rot={0.6} />
        </group>
      )}
    </group>
  );
};

/* ---------- fio, lâmpada ---------- */

const Fio: React.FC<{ pts: V[]; k: number; corrente: number; fase: number; cor?: string; r?: number; dir?: 1 | -1 }> = ({ pts, k, corrente, fase, cor = COBRE, r = 0.014, dir = 1 }) => {
  const curva = useMemo(() => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), [JSON.stringify(pts)]);
  const kk = Math.round(clamp01(k) * 40) / 40;
  const geo = useMemo(() => {
    const m = 36;
    const sub = Array.from({ length: m + 1 }, (_, i) => curva.getPoint((i / m) * Math.max(kk, 0.02)));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sub), 56, r, 6, false);
  }, [curva, kk, r]);
  if (k <= 0.02) return null;
  const L = curva.getLength();
  const nd = Math.max(3, Math.round(L / 0.2));
  return (
    <group>
      <mesh geometry={geo}><meshStandardMaterial color={cor} roughness={0.5} metalness={0.5} /></mesh>
      {corrente > 0.02 && k > 0.95 && Array.from({ length: nd }).map((_, i) => {
        const u = ((((i / nd + (dir * fase) / L) % 1) + 1) % 1);
        const q = curva.getPointAt(u);
        return <mesh key={i} position={q} scale={0.04} renderOrder={6}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={AMARELO_E} transparent opacity={0.95 * corrente} depthTest={false} /></mesh>;
      })}
    </group>
  );
};

const mistura = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getStyle();

const Lamp: React.FC<{ p: V; luz: number; pisca?: number; t?: number; esc?: number; poste?: boolean }> = ({ p, luz, pisca = 0, t = 0, esc = 1, poste }) => {
  const f = luz * (1 - pisca * (0.5 + 0.5 * Math.sin(t * 17)) * 0.6);
  const on = clamp01(f);
  const cor = mistura("#e9ecef", "#fff09a", on);
  return (
    <group position={p} scale={esc}>
      <mesh position={[0, 0.0, 0]} scale={[1, 1.22, 1]}><sphereGeometry args={[0.1, 20, 16]} /><meshStandardMaterial color={cor} emissive={mistura("#000000", "#ffe36a", on)} emissiveIntensity={1.4 * on} roughness={0.25} transparent opacity={on > 0.02 ? 1 : 0.88} /></mesh>
      <mesh position={[0, -0.14, 0]}><cylinderGeometry args={[0.052, 0.045, 0.1, 14]} /><meshStandardMaterial color="#8d949a" metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, -0.21, 0]}><cylinderGeometry args={[0.03, 0.03, 0.06, 10]} /><meshStandardMaterial color="#2b2b2b" roughness={0.6} /></mesh>
      {on > 0.04 && (
        <group>
          <Halo p={[0, 0, 0.05]} r={(0.4 + 0.5 * on) * (poste ? 1.5 : 1)} cor="#ffe36a" op={0.55 * on} />
          {f > 1.1 && <Halo p={[0, 0, 0.05]} r={(1.5 + 0.6 * (f - 1.1)) * (poste ? 1.4 : 1)} cor="#fff0a0" op={0.3 * clamp01((f - 1.1) / 0.6)} />}
          {f > 1.1 && Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2 + t * 0.4;
            const L1 = 0.3 + 0.05 * Math.sin(t * 6 + i), L2 = L1 + 0.35 * clamp01((f - 1.1) / 0.6);
            return <Liga key={i} a={[Math.cos(a) * L1, Math.sin(a) * L1, 0.06]} b={[Math.cos(a) * L2, Math.sin(a) * L2, 0.06]} w={0.025} cil cor="#fff3a8" basico op={0.9} />;
          })}
        </group>
      )}
    </group>
  );
};

/* ---------- céu, nuvens, árvores, colinas ---------- */

const Dome: React.FC<{ topo: string; meio: string; base: string; r?: number }> = ({ topo, meio, base, r = 68 }) => {
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

const Nuvens: React.FC<{ t: number; k: number; cinza: number; lista: [number, number, number, number][] }> = ({ t, k, cinza, lista }) => {
  if (k <= 0.02) return null;
  const cor = mistura("#ffffff", "#8f99a3", cinza);
  return (
    <group>
      {lista.map(([x, y, z, s], i) => (
        <group key={i} position={[((x + t * 0.35 * (0.6 + 0.2 * i) + 70) % 140) - 70, y, z]} scale={s * k}>
          {[[0, 0, 0, 1], [1.0, -0.15, 0.1, 0.8], [-1.0, -0.2, 0, 0.75], [0.4, 0.4, 0, 0.7], [-0.45, 0.3, 0.1, 0.65]].map(([a, b, c, d], j) => (
            <mesh key={j} position={[a, b, c]} scale={[d * 1.3, d * 0.8, d]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={cor} roughness={1} flatShading /></mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

const Arvore: React.FC<{ x: number; y?: number; z: number; s: number; cor?: string }> = ({ x, y = 0, z, s, cor = "#3f7a3c" }) => (
  <group position={[x, y, z]} scale={s}>
    <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.1, 0.14, 0.9, 7]} /><meshStandardMaterial color="#6b4a2c" roughness={0.9} /></mesh>
    <mesh position={[0, 1.25, 0]}><coneGeometry args={[0.75, 1.3, 8]} /><meshStandardMaterial color={cor} roughness={0.9} flatShading /></mesh>
    <mesh position={[0, 1.85, 0]}><coneGeometry args={[0.55, 1.0, 8]} /><meshStandardMaterial color={cor} roughness={0.9} flatShading /></mesh>
  </group>
);

/** perfil da colina do fundo (x -> y): sobe nos dois lados do vale e cai depois da casa de força */
const colinaY = (x: number) => {
  const pts: [number, number][] = [[-50, 0.5], [-34, 0.9], [-20, 2.0], [-11, 3.9], [0, 3.95], [3.5, 3.9], [8, 1.6], [13, 1.0], [18, 0.8], [30, 0.6], [50, 0.5]];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  return 0.5;
};

const Colinas: React.FC<{ escuro: number }> = ({ escuro }) => {
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-50, -2);
    for (let x = -50; x <= 50; x += 2) sh.lineTo(x, colinaY(x));
    sh.lineTo(50, -2);
    sh.closePath();
    return new THREE.ExtrudeGeometry(sh, { depth: 12, bevelEnabled: false });
  }, []);
  const cor = mistura("#5c9a46", "#4a6a5a", escuro);
  return (
    <group>
      <mesh geometry={geo} position={[0, 0, -15.2]}><meshStandardMaterial color={cor} roughness={1} flatShading /></mesh>
      {/* morros distantes */}
      {[[-30, -36, 11, "#7aa4b8"], [-6, -42, 14, "#86aebf"], [22, -38, 12, "#7aa4b8"], [46, -44, 15, "#86aebf"], [-52, -40, 12, "#86aebf"]].map(([x, z, h, c], i) => (
        <mesh key={i} position={[x as number, (h as number) / 2 - 1, z as number]}><coneGeometry args={[(h as number) * 1.5, h as number, 6]} /><meshStandardMaterial color={c as string} roughness={1} flatShading /></mesh>
      ))}
      {Array.from({ length: 80 }).map((_, i) => {
        const x = -44 + rnd(i * 1.7) * 88;
        const z = -4.4 - rnd(i * 2.9 + 1) * 9;
        if (x > -2.5 && x < 7 && z > -9) return null;
        return <Arvore key={i} x={x} y={colinaY(x) - 0.1} z={z} s={0.85 + rnd(i + 7) * 0.7} cor={i % 3 === 0 ? "#3a7a45" : "#4a8a3a"} />;
      })}
    </group>
  );
};

/* ---------- terreno, rio, lago ---------- */

const Terreno: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const nivel = n("nivelRio", 1);
  const nuv = n("nuvens", 1);
  const chuva = n("chuva", 0);
  const barra = n("barragem", 0);
  const lago = n("lago", AGUA_Y);
  const fRio = C.int("vazao", 1.4);
  const fJus = C.int("vazaoJus", n("vazao", 1.4));
  // rio: largura e nível encolhem na seca
  const waterY = lerp(YB + 0.12, AGUA_Y, nivel);
  const zA = lerp(-1.1, ZR0, nivel);
  const zB = lerp(0.15, ZR1, nivel);
  const largura = zB - zA;
  const lagoOn = lago > AGUA_Y + 0.03;
  const folhas = n("folhas", 1);
  const noLago = (x: number) => lagoOn && x < 0;
  return (
    <group>
      <Nuvens t={tEp} k={nuv} cinza={chuva} lista={[[-30, 22, -48, 5], [24, 28, -52, 6], [58, 19, -40, 4], [-8, 33, -56, 6], [8, 16, -46, 3.5], [-60, 26, -44, 5]]} />
      {/* margem da frente: terra e grama; margem do fundo vem das colinas */}
      <mesh position={[0, BANK - 1.04, ZR1 + 6.3]}><boxGeometry args={[119.6, 2, 12.4]} /><meshStandardMaterial color="#7a5a3a" roughness={1} /></mesh>
      <mesh position={[0, BANK - 0.03, ZR1 + 6.3]}><boxGeometry args={[120, 0.06, 12.6]} /><meshStandardMaterial color={GRAMA} roughness={1} /></mesh>
      <mesh position={[0, BANK - 0.03, -9]}><boxGeometry args={[120, 0.06, 11.6]} /><meshStandardMaterial color="#5f9a47" roughness={1} /></mesh>
      <mesh position={[0, BANK - 1.04, -9]}><boxGeometry args={[119.6, 2, 11.4]} /><meshStandardMaterial color="#7a5a3a" roughness={1} /></mesh>
      {/* flores e pedras na margem da frente */}
      {Array.from({ length: 26 }).map((_, i) => {
        const x = -9 + rnd(i * 3.3) * 20;
        const z = 2.0 + rnd(i * 1.9 + 2) * 3.6;
        return i % 2 ? <mesh key={i} position={[x, 0.1, z]} scale={[1, 0.6, 1]}><dodecahedronGeometry args={[0.13 + rnd(i + 4) * 0.1, 0]} /><meshStandardMaterial color="#9a958a" roughness={1} flatShading /></mesh>
          : <group key={i} position={[x, 0, z]}><mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.008, 0.008, 0.24, 4]} /><meshStandardMaterial color="#3f8f3a" /></mesh><mesh position={[0, 0.26, 0]}><sphereGeometry args={[0.045, 8, 6]} /><meshStandardMaterial color={["#ff8fb0", "#ffd23f", "#ffffff"][i % 3]} roughness={0.6} /></mesh></group>;
      })}
      {/* leito do rio, barro seco aparece na seca */}
      <mesh position={[0, YB - 0.02, (ZR0 + ZR1) / 2]}><boxGeometry args={[120, 0.04, ZR1 - ZR0]} /><meshStandardMaterial color={mistura("#8a7456", "#a89270", 1 - nivel)} roughness={1} /></mesh>
      {Array.from({ length: 30 }).map((_, i) => {
        const x = -14 + rnd(i * 2.1) * 30;
        const z = ZR0 + 0.2 + rnd(i * 4.7 + 1) * (ZR1 - ZR0 - 0.4);
        return <mesh key={i} position={[x, YB + 0.03, z]} scale={[1, 0.55, 1]}><dodecahedronGeometry args={[0.07 + rnd(i + 5) * 0.09, 0]} /><meshStandardMaterial color={i % 3 ? "#8d8a84" : "#6f6a60"} roughness={1} flatShading /></mesh>;
      })}
      {/* rachaduras do barro na seca */}
      {nivel < 0.6 && Array.from({ length: 18 }).map((_, i) => {
        const x = -5 + rnd(i * 5.1) * 10;
        const z = rnd(i * 7.3 + 2) > 0.5 ? zA - 0.2 - rnd(i + 6) * (zA - ZR0 - 0.3) : zB + 0.15 + rnd(i + 6) * Math.max(0.2, ZR1 - zB - 0.3);
        return <mesh key={i} position={[x, YB + 0.02, z]} rotation={[0, rnd(i) * 3, 0]}><boxGeometry args={[0.5 + rnd(i + 9) * 0.5, 0.01, 0.03]} /><meshBasicMaterial color="#6a5438" transparent opacity={1 - nivel} /></mesh>;
      })}
      {/* a água do rio */}
      <mesh position={[0, (YB + waterY) / 2, (zA + zB) / 2]}><boxGeometry args={[120, waterY - YB, largura]} /><meshStandardMaterial color="#3b8fd9" transparent opacity={0.72} roughness={0.15} metalness={0.1} depthWrite={false} /></mesh>
      {/* faixas, espuma e folhas correndo */}
      {Array.from({ length: 52 }).map((_, i) => {
        const jus = i % 2 === 1;
        const alvo = jus ? XB + 0.1 : -16;
        const L = jus ? 16 : 16;
        const f = jus ? fJus : fRio;
        let x = alvo + ((((rnd(i * 1.3) * L + f) % L) + L) % L);
        if (!jus) x = ((((rnd(i * 1.3) * 32 - 16 + f) % 32) + 48) % 32) - 16;
        if (!jus && x > -0.1) return null;
        if (!jus && barra > 0.3 && x > -0.2) return null;
        if (noLago(x)) return null;
        const z = zA + 0.1 + rnd(i * 2.7 + 3) * Math.max(0.1, largura - 0.2);
        const len = 0.35 + rnd(i + 8) * 0.6;
        return <mesh key={i} position={[x, waterY + 0.012, z]}><boxGeometry args={[len, 0.012, 0.035]} /><meshBasicMaterial color="#e4f3ff" transparent opacity={0.8} /></mesh>;
      })}
      {folhas > 0.02 && Array.from({ length: 12 }).map((_, i) => {
        const jus = i % 3 === 2;
        const f = jus ? fJus : fRio;
        let x = jus ? XB + 0.4 + ((((rnd(i * 1.9) * 14 + f) % 14) + 14) % 14) : ((((rnd(i * 1.9) * 32 - 16 + f) % 32) + 48) % 32) - 16;
        if (!jus && x > -0.2) x -= 8;
        if (noLago(x)) return null;
        const z = zA + 0.2 + rnd(i * 2.2 + 5) * Math.max(0.1, largura - 0.4);
        return <mesh key={i} position={[x, waterY + 0.02, z]} rotation={[-Math.PI / 2, 0, rnd(i + 4) * 3 + tEp * 0.3]} scale={[0.15, 0.08, 1]}><circleGeometry args={[1, 8]} /><meshBasicMaterial color={["#8a5a2a", "#6a9a3a", "#c98a2a"][i % 3]} /></mesh>;
      })}
      {/* lago atrás da parede (aquário de corte: o vidro é a face z = 1,4) */}
      {lagoOn && (
        <group>
          <mesh position={[-11, (YB + lago) / 2, (ZR0 + ZR1) / 2]}><boxGeometry args={[22, lago - YB, ZR1 - ZR0]} /><meshStandardMaterial color="#3b8fd9" transparent opacity={0.62} roughness={0.12} depthWrite={false} /></mesh>
          <mesh position={[-11, lago + 0.004, (ZR0 + ZR1) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[22, ZR1 - ZR0]} /><meshStandardMaterial color="#6cb6f0" transparent opacity={0.5} roughness={0.1} depthWrite={false} /></mesh>
          {Array.from({ length: 14 }).map((_, i) => {
            const x = -((rnd(i * 1.7) * 10 + tEp * 0.12 * (0.5 + rnd(i))) % 10) - 0.4;
            return <mesh key={i} position={[x, lago + 0.012, ZR0 + 0.3 + rnd(i * 3.1) * (ZR1 - ZR0 - 0.6)]}><boxGeometry args={[0.5 + rnd(i + 2) * 0.5, 0.012, 0.03]} /><meshBasicMaterial color="#eaf6ff" transparent opacity={0.7} /></mesh>;
          })}
          <LinhasGlass y0={YB} y1={lago} />
        </group>
      )}
      {/* chuva */}
      {chuva > 0.02 && Array.from({ length: 150 }).map((_, i) => {
        const x = -9 + rnd(i * 1.7) * 18;
        const z = -4 + rnd(i * 2.3 + 1) * 11;
        const y = 7.5 - ((rnd(i * 3.1) * 7.5 + tEp * 7.5) % 7.5);
        return <mesh key={i} position={[x, y, z]} rotation={[0, 0, 0.12]}><boxGeometry args={[0.012, 0.32, 0.012]} /><meshBasicMaterial color="#cfe6ff" transparent opacity={0.65 * chuva} /></mesh>;
      })}
    </group>
  );
};

const LinhasGlass: React.FC<{ y0: number; y1: number }> = ({ y0, y1 }) => {
  const g = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(22, Math.max(0.05, y1 - y0), ZR1 - ZR0)), [y1, y0]);
  return <lineSegments geometry={g} position={[-11, (y0 + y1) / 2, (ZR0 + ZR1) / 2]}><lineBasicMaterial color="#cfe9ff" transparent opacity={0.8} /></lineSegments>;
};

/* ---------- roda d'água ---------- */

const Roda: React.FC<{ vis: number; y: number; ang: number; x: number }> = ({ vis, y, ang, x }) => {
  if (vis <= 0.02) return null;
  const R = RODA_R;
  const madeira = "#a8703a";
  const esc = suave(vis);
  const yc = R + YB + 0.1 + y; // eixo: o aro quase toca o leito
  return (
    <group position={[x, yc, 0]} scale={esc}>
      {/* eixo e suportes (ficam parados) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 2.5, 14]} /><meshStandardMaterial color="#6b6f74" metalness={0.6} roughness={0.4} /></mesh>
      {[-1.1, 1.1].map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          <Caixa p={[-0.28, -0.55, 0]} t={[0.09, 1.3, 0.1]} cor="#7a4e28" raio={0.012} rug={0.8} r={[0, 0, 0.3]} />
          <Caixa p={[0.28, -0.55, 0]} t={[0.09, 1.3, 0.1]} cor="#7a4e28" raio={0.012} rug={0.8} r={[0, 0, -0.3]} />
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.12, 14]} /><meshStandardMaterial color="#c9ccd0" metalness={0.7} roughness={0.3} /></mesh>
        </group>
      ))}
      <group rotation={[0, 0, ang]}>
        {[-0.44, 0.44].map((z, k) => (
          <group key={k} position={[0, 0, z]}>
            <mesh><torusGeometry args={[R - 0.05, 0.035, 8, 40]} /><meshStandardMaterial color={madeira} roughness={0.8} /></mesh>
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return <Caixa key={i} p={[Math.cos(a) * (R - 0.05) * 0.5, Math.sin(a) * (R - 0.05) * 0.5, 0]} t={[R - 0.05, 0.05, 0.05]} r={[0, 0, a]} cor={madeira} raio={0.008} rug={0.8} />;
            })}
          </group>
        ))}
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return <Caixa key={i} p={[Math.cos(a) * (R - 0.1), Math.sin(a) * (R - 0.1), 0]} t={[0.3, 0.07, 0.96]} r={[0, 0, a]} cor="#c58a4a" raio={0.01} rug={0.8} />;
        })}
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.14, 0.14, 0.95, 14]} /><meshStandardMaterial color={madeira} roughness={0.8} /></mesh>
      </group>
    </group>
  );
};

/* ---------- gerador: ímã e bobina ---------- */

/** Conteúdo da lupa: ímã girando (vermelho e azul) ao lado do fio enrolado; a corrente corre pelo fio até a saída. */
const LupaGerador: React.FC<{ R: number; ang: number; corrente: number; fase: number; luz: number }> = ({ R, ang, corrente, fase, luz }) => {
  const z = 0.02;
  const mx = -0.28 * R;
  const bx = 0.34 * R;
  const comp = 0.62 * R;
  const esp = 0.17 * R;
  return (
    <group>
      {/* ímã: barra metade vermelha, metade azul, gira em volta do eixo */}
      <group position={[mx, 0, z + 0.03]} rotation={[0, 0, ang]}>
        <mesh position={[comp / 4, 0, 0]}><boxGeometry args={[comp / 2, esp, esp]} /><meshStandardMaterial color="#e3392f" roughness={0.45} /></mesh>
        <mesh position={[-comp / 4, 0, 0]}><boxGeometry args={[comp / 2, esp, esp]} /><meshStandardMaterial color="#2f6fe0" roughness={0.45} /></mesh>
      </group>
      <mesh position={[mx, 0, z + 0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[esp * 0.2, esp * 0.2, esp * 1.8, 10]} /><meshStandardMaterial color="#5c6168" metalness={0.7} roughness={0.35} /></mesh>
      {/* bobina: núcleo de ferro e voltas de fio de cobre */}
      <mesh position={[bx + 0.12 * R, 0, z + 0.03]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1 * R, 0.1 * R, 0.5 * R, 14]} /><meshStandardMaterial color="#8c929a" metalness={0.7} roughness={0.35} /></mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[bx - 0.06 * R + i * 0.056 * R, 0, z + 0.03]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.14 * R, 0.028 * R, 8, 20]} /><meshStandardMaterial color={COBRE} metalness={0.6} roughness={0.35} /></mesh>
      ))}
      {/* fios: da bobina para a borda direita da lupa */}
      <Liga a={[bx + 0.37 * R, 0.0, z + 0.03]} b={[bx + 0.5 * R, 0.0, z + 0.03]} w={0.03 * R} cil cor={COBRE} />
      <Liga a={[bx + 0.5 * R, 0.0, z + 0.03]} b={[0.96 * R, 0.0, z + 0.03]} w={0.03 * R} cil cor={COBRE} />
      <Liga a={[bx - 0.06 * R, 0.14 * R, z + 0.03]} b={[bx - 0.06 * R, 0.4 * R, z + 0.03]} w={0.03 * R} cil cor={COBRE} />
      <Liga a={[bx - 0.06 * R, 0.4 * R, z + 0.03]} b={[0.96 * R, 0.4 * R, z + 0.03]} w={0.03 * R} cil cor={COBRE} />
      {corrente > 0.02 && Array.from({ length: 7 }).map((_, i) => {
        const u = (((i / 7 + fase * 0.35) % 1) + 1) % 1;
        const x = lerp(bx + 0.37 * R, 0.96 * R, u);
        return <mesh key={i} position={[x, 0.0, z + 0.07]} scale={0.032 * R / 0.55 * 1.5} renderOrder={6}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={AMARELO_E} transparent opacity={corrente} depthTest={false} /></mesh>;
      })}
      {corrente > 0.02 && luz > 0.05 && <Halo p={[bx + 0.1 * R, 0, z + 0.1]} r={0.5 * R} cor="#ffe36a" op={0.25 * clamp01(luz)} />}
    </group>
  );
};

/* ---------- turbina ---------- */

const pasGeo = (() => {
  const nu = 6, nvv = 4;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= nu; i++) {
    const r = 0.09 + (0.37 - 0.09) * (i / nu);
    const pitch = 1.15 - 0.75 * (i / nu);
    const c = 0.24 * (1 - 0.3 * (i / nu));
    for (let j = 0; j <= nvv; j++) {
      const v = j / nvv - 0.5;
      const a = v * c * Math.sin(pitch) + 0.05 * Math.sin(Math.PI * (j / nvv));
      const s = v * c * Math.cos(pitch);
      pos.push(a, r, s);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nvv; j++) {
    const p0 = i * (nvv + 1) + j, p1 = p0 + 1, p2 = p0 + nvv + 1, p3 = p2 + 1;
    idx.push(p0, p2, p1, p1, p2, p3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
})();

const Contorno: React.FC<{ t: V; cor: string; op?: number }> = ({ t, cor, op = 1 }) => {
  const g = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(t[0], t[1], t[2])), [t[0], t[1], t[2]]);
  return <lineSegments geometry={g}><lineBasicMaterial color={cor} transparent opacity={op} /></lineSegments>;
};

/** Cano de concreto em raio-X com a hélice dentro e o gerador (bulbo) logo depois. Eixo ao longo de x, começa em x = 0 (local). */
const Turbina: React.FC<{ vis: number; helice: number; ang: number; t: number; fluxo: number; fase: number; luz: number; corrente: number }> = ({ vis, helice, ang, t, fluxo, fase }) => {
  if (vis <= 0.02) return null;
  const e = suave(vis);
  return (
    <group scale={[1, e, e]}>
      {/* cano de concreto virado vidro, com anéis de contorno */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[TURB_L / 2, 0, 0]}><cylinderGeometry args={[TURB_R * 1.07, TURB_R * 1.07, TURB_L, 28, 1, true]} /><meshBasicMaterial color="#2f3a42" side={THREE.BackSide} transparent opacity={0.55} depthWrite={false} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[TURB_L / 2, 0, 0]}><cylinderGeometry args={[TURB_R, TURB_R, TURB_L, 28, 1, true]} /><meshPhysicalMaterial color="#d6dde2" transparent opacity={0.3} roughness={0.15} clearcoat={0.6} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {[0, TURB_L].map((x, i) => <mesh key={i} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[TURB_R * 1.05, 0.03, 8, 32]} /><meshStandardMaterial color="#8d949a" metalness={0.5} roughness={0.4} /></mesh>)}
      {helice > 0.02 && (
        <group scale={suave(helice)}>
          {/* eixo, hélice e bulbo do gerador */}
          <mesh position={[0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.028, 0.028, 1.0, 10]} /><meshStandardMaterial color="#6b6f74" metalness={0.7} roughness={0.35} /></mesh>
          <group position={[0.3, 0, 0]} rotation={[ang, 0, 0]}>
            <mesh scale={[1.4, 1, 1]}><sphereGeometry args={[0.1, 16, 12]} /><meshStandardMaterial color="#c9ccd0" metalness={0.7} roughness={0.3} /></mesh>
            {Array.from({ length: 5 }).map((_, k) => (
              <mesh key={k} geometry={pasGeo} rotation={[(k / 5) * Math.PI * 2, 0, 0]}><meshStandardMaterial color="#ff9a3c" roughness={0.4} metalness={0.3} side={THREE.DoubleSide} /></mesh>
            ))}
          </group>
          <group position={[1.4, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.16, 0.34, 6, 16]} /><meshStandardMaterial color="#c8ced4" metalness={0.7} roughness={0.3} /></mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.04, 0, 0]}><cylinderGeometry args={[0.165, 0.165, 0.06, 18]} /><meshStandardMaterial color="#e3392f" roughness={0.5} /></mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} position={[0.08, 0, 0]}><cylinderGeometry args={[0.165, 0.165, 0.06, 18]} /><meshStandardMaterial color="#2f6fe0" roughness={0.5} /></mesh>
            {[0, 1, 2, 3].map((k) => <Liga key={k} a={[0, Math.cos((k * Math.PI) / 2) * 0.14, Math.sin((k * Math.PI) / 2) * 0.14]} b={[0, Math.cos((k * Math.PI) / 2) * TURB_R, Math.sin((k * Math.PI) / 2) * TURB_R]} w={0.03} cil cor="#7d868d" />)}
          </group>
        </group>
      )}
      {fluxo > 0.02 && Array.from({ length: 22 }).map((_, i) => {
        const u = ((((i / 22 + fase / 4.5) % 1) + 1) % 1);
        const a = rnd(i * 3.7) * Math.PI * 2;
        const rr = (0.12 + rnd(i + 2) * 0.22);
        return <mesh key={i} position={[lerp(-0.2, TURB_L + 0.5, u), Math.cos(a) * rr, Math.sin(a) * rr]} scale={0.032} renderOrder={4}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={i % 3 ? AZUL_AG : "#cfeaff"} transparent opacity={0.9 * fluxo * Math.min(1, u * 6, (1 - u) * 6)} /></mesh>;
      })}
    </group>
  );
};

/* ---------- tubo forçado ---------- */

const arredonda = (pts: V[], r: number): THREE.Vector3[] => {
  const out: THREE.Vector3[] = [new THREE.Vector3(...pts[0])];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(...pts[i - 1]), b = new THREE.Vector3(...pts[i]), c = new THREE.Vector3(...pts[i + 1]);
    const d1 = a.clone().sub(b), d2 = c.clone().sub(b);
    const k1 = Math.min(r, d1.length() * 0.45), k2 = Math.min(r, d2.length() * 0.45);
    const p1 = b.clone().add(d1.normalize().multiplyScalar(k1));
    const p2 = b.clone().add(d2.normalize().multiplyScalar(k2));
    const curva = new THREE.QuadraticBezierCurve3(p1, b, p2);
    out.push(...curva.getPoints(10));
  }
  out.push(new THREE.Vector3(...pts[pts.length - 1]));
  return out;
};

const caminhoTubo = (turbX: number, turbY: number): V[] => [[-0.25, 3.0, ZE], [0.58, 3.0, ZE], [1.5, 0.7, ZE], [Math.max(turbX, 1.55), turbY, ZE]];

const TuboForcado: React.FC<{ k: number; agua: number; fase: number; t: number; pts: V[] }> = ({ k, agua, fase, pts }) => {
  const curva = useMemo(() => new THREE.CatmullRomCurve3(arredonda(pts, 0.4), false, "centripetal"), [JSON.stringify(pts)]);
  const kk = Math.round(clamp01(k) * 50) / 50;
  const geos = useMemo(() => {
    const m = 40;
    const sub = Array.from({ length: m + 1 }, (_, i) => curva.getPoint((i / m) * Math.max(kk, 0.02)));
    const c2 = new THREE.CatmullRomCurve3(sub);
    return [new THREE.TubeGeometry(c2, 90, 0.31, 14, false), new THREE.TubeGeometry(c2, 90, 0.33, 14, false), new THREE.TubeGeometry(c2, 90, 0.23, 12, false)];
  }, [curva, kk]);
  if (k <= 0.02) return null;
  const L = curva.getLength() * kk;
  const nd = Math.max(4, Math.round(L / 0.22));
  return (
    <group>
      <mesh geometry={geos[1]}><meshBasicMaterial color="#5d6e78" side={THREE.BackSide} transparent opacity={0.4} depthWrite={false} /></mesh>
      <mesh geometry={geos[0]}><meshPhysicalMaterial color="#c8d6de" transparent opacity={0.42} roughness={0.15} clearcoat={0.5} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {agua > 0.02 && <mesh geometry={geos[2]}><meshBasicMaterial color="#3f9ae8" transparent opacity={0.55 * agua} depthWrite={false} /></mesh>}
      {agua > 0.02 && kk > 0.95 && Array.from({ length: nd }).map((_, i) => {
        const u = ((((i / nd + fase / curva.getLength()) % 1) + 1) % 1);
        const q = curva.getPointAt(u);
        const a = rnd(i * 4.1) * 6.28;
        return <mesh key={i} position={[q.x, q.y + Math.cos(a) * 0.1, q.z + Math.sin(a) * 0.1]} scale={0.05} renderOrder={4}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={i % 3 ? "#cfeaff" : AZUL_AG} transparent opacity={0.95 * agua} /></mesh>;
      })}
    </group>
  );
};

/* ---------- barragem ---------- */

const texturaConcreto = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = CONCRETO;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(${90 + rnd(i) * 60},${90 + rnd(i) * 60},${90 + rnd(i) * 60},0.28)`;
    g.fillRect(rnd(i * 1.7) * 128, rnd(i * 2.9) * 128, 2 + rnd(i + 4) * 3, 2 + rnd(i + 8) * 3);
  }
  g.strokeStyle = "rgba(70,74,78,0.35)";
  g.lineWidth = 2;
  g.strokeRect(1, 1, 126, 126);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

const NDEG = 6;
const perfil = (vert: number): THREE.Shape => {
  const sh = new THREE.Shape();
  const yc = lerp(HW, 3.45, vert);
  sh.moveTo(0, YB);
  sh.lineTo(0, yc);
  if (vert < 0.02) {
    sh.lineTo(XC, HW);
    sh.lineTo(XB, YB);
  } else {
    sh.lineTo(xl(yc), yc);
    for (let i = 0; i < NDEG; i++) {
      const y0 = yc - ((yc - YB) * i) / NDEG;
      const y1 = yc - ((yc - YB) * (i + 1)) / NDEG;
      sh.lineTo(lerp(xl(y1), xl(y0), vert), y1);
      sh.lineTo(xl(y1), y1);
    }
  }
  sh.closePath();
  return sh;
};

const Parede: React.FC<{ k: number; vert: number; raiox: number; vertAgua: number; t: number; fase: number }> = ({ k, vert, raiox, vertAgua, t, fase }) => {
  const tex = useMemo(texturaConcreto, []);
  const vq = Math.round(vert * 8) / 8;
  const gPrinc = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(perfil(0), { depth: ZE - ZV0 + (ZR1 - ZE), bevelEnabled: false });
    g.translate(0, 0, ZV0);
    return g;
  }, []);
  const gVert = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(perfil(vq), { depth: ZV0 - ZW0, bevelEnabled: false });
    g.translate(0, 0, ZW0);
    return g;
  }, [vq]);
  const bordas = useMemo(() => [new THREE.EdgesGeometry(gPrinc, 20), new THREE.EdgesGeometry(gVert, 20)], [gPrinc, gVert]);
  if (k <= 0.02) return null;
  const op = lerp(1, 0.26, raiox);
  const mat = <meshStandardMaterial map={tex} color="#ffffff" roughness={0.9} transparent={op < 0.99} opacity={op} depthWrite={op > 0.6} side={THREE.DoubleSide} />;
  const yc = lerp(HW, 3.45, vq);
  // água escorrendo pelos degraus do vertedouro
  const pts: V[] = [];
  if (vertAgua > 0.02 && vert > 0.5) {
    pts.push([0.0, yc + 0.03, 0]);
    pts.push([xl(yc), yc + 0.03, 0]);
    for (let i = 0; i < NDEG; i++) {
      const y1 = yc - ((yc - YB) * (i + 1)) / NDEG;
      pts.push([xl(y1) - 0.04, y1 + 0.03, 0]);
      pts.push([xl(y1) + 0.0, y1 + 0.03, 0]);
    }
  }
  return (
    <group scale={[1, Math.max(0.001, k), 1]} position={[0, YB * (1 - k), 0]}>
      <mesh geometry={gPrinc}>{mat}</mesh>
      <mesh geometry={gVert}>{mat}</mesh>
      <lineSegments geometry={bordas[0]}><lineBasicMaterial color={raiox > 0.1 ? "#6e7a82" : "#7b7f82"} transparent opacity={0.4 + 0.5 * raiox} /></lineSegments>
      <lineSegments geometry={bordas[1]}><lineBasicMaterial color={raiox > 0.1 ? "#6e7a82" : "#7b7f82"} transparent opacity={0.4 + 0.5 * raiox} /></lineSegments>
      {/* água do vertedouro: fita azul por cima dos degraus, espuma e gotas */}
      {pts.length > 1 && (
        <group position={[0, 0, (ZW0 + ZV0) / 2]}>
          {pts.slice(1).map((q, i) => <Liga key={i} a={pts[i]} b={q} w={0.06} e={ZV0 - ZW0 - 0.3} cor={AZUL_AG} op={0.86 * vertAgua} />)}
          {Array.from({ length: 24 }).map((_, i) => {
            const u = ((((i / 24 + fase * 0.12) % 1) + 1) % 1);
            const q = lerp(0, 1, u);
            const j = Math.min(pts.length - 2, Math.floor(q * (pts.length - 1)));
            const a = pts[j], b = pts[j + 1];
            const f = q * (pts.length - 1) - j;
            return <mesh key={i} position={[lerp(a[0], b[0], f), lerp(a[1], b[1], f) + 0.07, (rnd(i * 2.7) - 0.5) * (ZV0 - ZW0 - 0.4)]} scale={0.045} renderOrder={4}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.9 * vertAgua} /></mesh>;
          })}
        </group>
      )}
    </group>
  );
};

/** Comporta: painel de aço numa moldura, na face de montante, no eixo da água. Passagem em raio-X até o cano. */
const Comporta: React.FC<{ abre: number; fluxo: number; fase: number; xFim: number; yC: number; t: number }> = ({ abre, fluxo, fase, xFim, yC, t }) => {
  if (abre < -0.5) return null;
  const gy = yC + 0.05 + 0.62 * clamp01(abre);
  const lar = 0.9;
  return (
    <group>
      {/* passagem pela parede */}
      <mesh position={[xFim / 2, yC, ZE]}><boxGeometry args={[xFim, 0.5, lar]} /><meshPhysicalMaterial color="#9fb6c4" transparent opacity={0.25} roughness={0.2} depthWrite={false} /></mesh>
      <group position={[xFim / 2, yC, ZE]}><Contorno t={[xFim, 0.5, lar]} cor="#4e6471" op={0.9} /></group>
      {/* moldura e painel */}
      {[-1, 1].map((s) => <Caixa key={s} p={[-0.08, yC + 0.45, ZE + s * (lar / 2 + 0.05)]} t={[0.14, 1.5, 0.1]} cor="#60676d" met={0.6} rug={0.4} raio={0.01} />)}
      <Caixa p={[-0.08, yC + 1.18, ZE]} t={[0.14, 0.1, lar + 0.2]} cor="#60676d" met={0.6} rug={0.4} raio={0.01} />
      <Caixa p={[-0.08, gy, ZE]} t={[0.1, 0.72, lar]} cor="#d3a43a" met={0.6} rug={0.35} raio={0.01} />
      <Liga a={[-0.08, gy + 0.36, ZE]} b={[-0.08, yC + 1.18, ZE]} w={0.05} cil cor="#b8bec4" />
      {fluxo > 0.02 && Array.from({ length: 10 }).map((_, i) => {
        const u = ((((i / 10 + fase / 3.0) % 1) + 1) % 1);
        return <mesh key={i} position={[lerp(-0.45, xFim, u), yC + (rnd(i) - 0.5) * 0.28, ZE + (rnd(i + 3) - 0.5) * 0.6]} scale={0.04} renderOrder={4}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={i % 3 ? AZUL_AG : "#cfeaff"} transparent opacity={0.95 * fluxo} /></mesh>;
      })}
    </group>
  );
};

/** Casa de força: caixa de vidro com laje e porta em volta da turbina. */
const CasaForca: React.FC<{ k: number; x0: number }> = ({ k, x0 }) => {
  if (k <= 0.02) return null;
  const e = suave(k);
  const L = 3.5, Hh = 1.75, D = 1.9;
  return (
    <group position={[x0 - 0.15, 0, ZE]} scale={[1, e, 1]}>
      <mesh position={[L / 2, Hh / 2, 0]}><boxGeometry args={[L, Hh, D]} /><meshPhysicalMaterial color="#cfe3ee" transparent opacity={0.14} roughness={0.1} depthWrite={false} /></mesh>
      <group position={[L / 2, Hh / 2, 0]}><Contorno t={[L, Hh, D]} cor="#5d7380" op={0.9} /></group>
      <Caixa p={[L / 2, Hh + 0.07, 0]} t={[L + 0.2, 0.14, D + 0.2]} cor="#8a8f94" raio={0.02} rug={0.7} />
      <Caixa p={[L / 2, -0.12, 0]} t={[L + 0.2, 0.36, D + 0.2]} cor="#a7aaac" raio={0.02} rug={0.8} />
      <Caixa p={[L - 0.4, 0.5, D / 2 + 0.01]} t={[0.5, 1.0, 0.04]} cor="#6a5a48" raio={0.01} rug={0.8} op={0.7} />
      <Caixa p={[L / 2, Hh + 0.3, 0]} t={[0.1, 0.5, 0.1]} cor="#9aa3ab" met={0.5} rug={0.4} raio={0.01} />
    </group>
  );
};

/* ---------- poste, cidade, torres ---------- */

const Cidade: React.FC<{ k: number; t: number }> = ({ k, t }) => (
  <group>
    {Array.from({ length: 12 }).map((_, i) => {
      const x = 8.6 + (i % 6) * 2.3 + rnd(i * 1.3) * 0.6;
      const z = -5.0 - Math.floor(i / 6) * 3.4 - rnd(i * 2.1) * 0.6;
      const h = 1.0 + rnd(i + 3) * 1.3;
      const on = clamp01(k * 12 - i * 0.8) > 0.5;
      return (
        <group key={i} position={[x, colinaY(x) - 0.05, z]}>
          <Caixa p={[0, h / 2, 0]} t={[1.3, h, 1.1]} cor={["#e8d9c0", "#d9e4ee", "#f0c9b0", "#c9d6c0"][i % 4]} raio={0.03} rug={0.8} />
          <mesh position={[0, h + 0.2, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.95, 0.5, 4]} /><meshStandardMaterial color="#b0553c" roughness={0.9} flatShading /></mesh>
          {[-0.3, 0.3].map((wx, j) => <mesh key={j} position={[wx, h * 0.55, 0.56]}><planeGeometry args={[0.28, 0.32]} /><meshBasicMaterial color={on ? "#ffe27a" : "#586673"} /></mesh>)}
          {on && <Halo p={[0, h * 0.55, 0.9]} r={1.0} cor="#ffd86a" op={0.4 + 0.05 * Math.sin(t * 5 + i)} />}
        </group>
      );
    })}
    {/* postes da rua, na frente das casas */}
    {Array.from({ length: 7 }).map((_, i) => {
      const x = 8.0 + i * 1.9;
      const on = clamp01(k * 9 - i * 0.6) > 0.5;
      return (
        <group key={i} position={[x, colinaY(x) - 0.05, -3.9]}>
          <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.04, 0.05, 2.0, 8]} /><meshStandardMaterial color="#6b6f74" metalness={0.5} roughness={0.5} /></mesh>
          <mesh position={[0.18, 2.02, 0]}><sphereGeometry args={[0.1, 10, 8]} /><meshBasicMaterial color={on ? "#fff0a0" : "#8d949a"} /></mesh>
          {on && <Halo p={[0.18, 2.02, 0.1]} r={1.2} cor="#ffe27a" op={0.6} />}
        </group>
      );
    })}
  </group>
);

const Torre: React.FC<{ p: V; s?: number }> = ({ p, s = 1 }) => (
  <group position={p} scale={s}>
    {[[-0.45, 0.2], [0.45, 0.2]].map(([x, z], i) => <Liga key={i} a={[x, 0, z]} b={[x * 0.25, 4.6, z * 0.3]} w={0.1} cil cor="#7d868d" />)}
    {[[-0.45, -0.2], [0.45, -0.2]].map(([x, z], i) => <Liga key={i} a={[x, 0, z]} b={[x * 0.25, 4.6, z * 0.3]} w={0.1} cil cor="#7d868d" />)}
    {[1.2, 2.4, 3.6].map((y, i) => <Liga key={i} a={[-0.4 + i * 0.08, y, 0]} b={[0.4 - i * 0.08, y + 1.0, 0]} w={0.05} cil cor="#7d868d" />)}
    {[1.2, 2.4, 3.6].map((y, i) => <Liga key={i} a={[0.4 - i * 0.08, y, 0]} b={[-0.4 + i * 0.08, y + 1.0, 0]} w={0.05} cil cor="#7d868d" />)}
    <Liga a={[-1.3, 4.3, 0]} b={[1.3, 4.3, 0]} w={0.09} cil cor="#7d868d" />
    <Liga a={[-0.9, 3.5, 0]} b={[0.9, 3.5, 0]} w={0.09} cil cor="#7d868d" />
    {[-1.3, 1.3, -0.9, 0.9].map((x, i) => <mesh key={i} position={[x, i < 2 ? 4.2 : 3.4, 0]}><cylinderGeometry args={[0.05, 0.05, 0.2, 6]} /><meshStandardMaterial color="#e8e3d0" /></mesh>)}
  </group>
);

const TORRES: V[] = [[6.3, 0, 2.5], [10.5, 1.7, -4.2], [16, 1.1, -9.5], [22, 0.9, -15], [29, 0.6, -22], [36, 0.5, -30]];
const TORRES_S = [0.9, 1.0, 1.2, 1.5, 1.9, 2.4];

const Torres: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  if (k <= 0.02) return null;
  const ss = TORRES_S;
  return (
    <group>
      {TORRES.map((q, i) => <Torre key={i} p={q} s={ss[i]} />)}
      {[[-1.3, 4.3], [1.3, 4.3], [-0.9, 3.5], [0.9, 3.5]].map(([dx, hy], j) => TORRES.slice(1).map((q, i) => (
        <Liga key={`${j}${i}`} a={[TORRES[i][0] + dx * ss[i], TORRES[i][1] + hy * ss[i], TORRES[i][2]]} b={[q[0] + dx * ss[i + 1], q[1] + hy * ss[i + 1], q[2]]} w={0.03 * ss[i]} cil cor="#2b2f33" basico />
      )))}
      {/* faíscas de energia correndo pelo fio de cima */}
      {Array.from({ length: 14 }).map((_, i) => {
        const u = ((i / 14 + t * 0.12) % 1) * (TORRES.length - 1);
        const j = Math.min(TORRES.length - 2, Math.floor(u));
        const f = u - j;
        const A = TORRES[j], B = TORRES[j + 1];
        return <mesh key={i} position={[lerp(A[0] + 1.3 * ss[j], B[0] + 1.3 * ss[j + 1], f), lerp(A[1] + 4.3 * ss[j], B[1] + 4.3 * ss[j + 1], f), lerp(A[2], B[2], f)]} scale={0.1 * lerp(ss[j], ss[j + 1], f)} renderOrder={6}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={AMARELO_E} transparent opacity={0.9 * k} depthTest={false} /></mesh>;
      })}
      {/* fio da casa de força até a primeira torre */}
      <Liga a={[POSTE_X + 0.3, 3.0, 1.1]} b={[TORRES[0][0] + 1.3 * ss[0], TORRES[0][1] + 4.3 * ss[0], TORRES[0][2]]} w={0.03} cil cor="#2b2f33" basico />
    </group>
  );
};

/* ---------- palco: o rio ---------- */

type EtiqDef = { texto: string; para: V; off: [number, number]; cor?: string };

const lampPos = (C: Ctx): V => {
  const modo = (C.cena.lampModo as string | undefined) ?? "estaca";
  if (modo === "poste") return [POSTE_X, 3.0, 1.1];
  return [C.n("lampX", 0.6), C.n("lampAlt", 1.1), C.n("lampZ", 1.7)];
};

const RioPalco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const gente = (C.cena.gente as GenteE[] | undefined) ?? [];
  const entardecer = n("entardecer", 0);
  const chuva = n("chuva", 0);
  const topo = mistura(mistura("#3f86d8", "#364a8c", entardecer), "#5b6772", chuva);
  const meio = mistura(mistura("#9ad0f5", "#f19a62", entardecer), "#8c98a3", chuva);
  const base = mistura(mistura("#e6f4fb", "#ffd2a0", entardecer), "#b7c0c8", chuva);
  const luzSol = mistura(mistura("#fff3dc", "#ffb877", entardecer), "#cfd8e0", chuva);
  const barra = n("barragem", 0);
  // fases (m) para água, hélice e roda
  const giro = C.int("giro", 0);
  const fJus = C.int("vazaoJus", n("vazao", 1.4));
  const fRio = C.int("vazao", 1.4);
  const fTurb = C.int("fluxoTurb", 0) * 1.6 + fRio * 0.0;
  const fCorr = C.int("corrente", 0) * 1.1;
  const turbX = n("turbX", 2.4);
  const turbY = n("turbY", 0.0);
  const turbVis = n("turbVis", 0);
  const helice = n("helice", 0);
  const rodaVis = n("rodaVis", 0);
  const lamp = lampPos(C);
  const modo = (C.cena.lampModo as string | undefined) ?? "estaca";
  const lampVis = n("lampVis", 0);
  const luz = n("luz", 0);
  const plug = n("plug", 0);
  const gerVis = n("geradorVis", 0);
  const fio = n("fio", 0);
  const corr = n("corrente", 0);
  const lupaK = n("lupa", 0);
  const lx = n("lupaX", -0.7);
  const ly = n("lupaY", 2.3);
  const LR = n("lupaR", 0.55);
  const lago = n("lago", AGUA_Y);
  const raiox = n("raiox", 0);
  const tubo = n("tuboForcado", 0);
  const comporta = n("comporta", -1);
  const casa = n("casa", 0);
  const plinto = n("plinto", 0);
  const aguaTubo = n("aguaTubo", 0);
  const funil = n("funil", 0);
  const setasAgua = n("setasAgua", 0);
  const saida = n("saidaAgua", 0);
  const tunel = n("tunelSaida", 0);
  const cidade = n("cidade", 0);
  const torres = n("torres", 0);
  const interroga = n("interroga", 0);
  const rodaX = n("rodaX", XW);
  const rodaY = n("rodaY", 0);
  const xGer = rodaX;
  const housing: V = [xGer, RODA_R + YB + 0.1 + rodaY, 1.25];
  const pod: V = [turbX + 1.4, turbY, ZE];
  const lampTopo: V = [lamp[0], lamp[1], lamp[2]];
  // fio: do gerador até a lâmpada
  const origem: V = rodaVis > 0.5 ? [housing[0] + 0.17, housing[1] - 0.05, housing[2]] : [pod[0], pod[1] - TURB_R, pod[2]];
  const fioPts: V[] = rodaVis > 0.5
    ? [origem, [origem[0] + 0.3, 0.2, origem[2] + 0.35], [lamp[0] - 0.2, 0.15, lamp[2] + 0.05], [lamp[0], lamp[1] - 0.2, lamp[2]]]
    : [origem, [origem[0], Math.max(0.15, turbY - TURB_R - 0.15), origem[2] + 0.45], [lamp[0] - 1.2, 0.12, lamp[2] + 0.1], [lamp[0], lamp[1] - 0.2, lamp[2]]];
  const cinza = chuva;
  const plinH = Math.max(0.01, turbY - TURB_R - YB);
  const xGate = xl(turbY);
  const tuboPts = caminhoTubo(turbX, turbY);
  const hasTurbElev = turbY > 1.2;
  const mostraHouse = casa > 0.02;
  return (
    <group>
      <hemisphereLight args={["#e8f4ff", "#8a8070", 1.0 - 0.15 * chuva]} />
      <directionalLight position={[-6, 12, 10]} intensity={1.75 - 0.9 * chuva} color={luzSol} />
      <fog attach="fog" args={[base, 38, 78]} />
      <Dome topo={topo} meio={meio} base={base} />
      <Terreno C={C} />
      <Colinas escuro={cinza * 0.5 + entardecer * 0.3} />
      {/* árvores na margem da frente e na beira */}
      {Array.from({ length: 12 }).map((_, i) => { const x = -26 + i * 5.4 + rnd(i) * 2; return x > -9 && x < 14 ? null : <Arvore key={i} x={x} z={9 + rnd(i * 2.2) * 4} s={1.1 + rnd(i + 5) * 0.6} cor={i % 3 === 0 ? "#3a7a45" : "#4a8a3a"} />; })}
      {/* arbustos, flores e um caminho de terra na margem da frente */}
      {Array.from({ length: 36 }).map((_, i) => {
        const x = -10 + rnd(i * 2.9) * 22, z = 3.0 + rnd(i * 4.3 + 1) * 8;
        return i % 3 ? <mesh key={i} position={[x, 0.18, z]} scale={[1, 0.7, 1]}><icosahedronGeometry args={[0.25 + rnd(i + 2) * 0.25, 1]} /><meshStandardMaterial color={["#4a8a3a", "#3f7a3c", "#5a9a45"][i % 3]} roughness={1} flatShading /></mesh>
          : <group key={i} position={[x, 0, z]}>{[0, 1, 2, 3].map((k) => <mesh key={k} position={[(k - 1.5) * 0.09, 0.1, (k % 2) * 0.07]}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color={["#ff8fb0", "#ffd23f", "#ffffff", "#c58bff"][k]} /></mesh>)}</group>;
      })}
      <mesh position={[2.6, 0.003, 6]} rotation={[-Math.PI / 2, 0, 0.1]}><planeGeometry args={[1.4, 14]} /><meshStandardMaterial color="#b89a6a" roughness={1} /></mesh>
      {/* bancos e cerca para a margem não ficar vazia */}
      {C.cena.sala !== true && Array.from({ length: 9 }).map((_, i) => <Caixa key={i} p={[-6 + i * 0.7, 0.35, 5.8]} t={[0.07, 0.7, 0.07]} cor="#7a4e28" raio={0.01} rug={0.9} />)}
      {C.cena.sala !== true && <Caixa p={[-2.4, 0.5, 5.8]} t={[5.8, 0.06, 0.05]} cor="#8d5c32" raio={0.01} rug={0.9} />}
      {C.cena.sala !== true && <Caixa p={[-2.4, 0.28, 5.8]} t={[5.8, 0.06, 0.05]} cor="#8d5c32" raio={0.01} rug={0.9} />}
      {/* funil de concreto: obriga o rio a passar pelo cano */}
      {funil > 0.02 && (
        <group scale={[1, suave(funil), 1]}>
          {[1, -1].map((s) => (
            <group key={s} position={[turbX - 0.9, 0, s > 0 ? lerp(ZE + 1.3, ZE + 0.55, 0.5) : lerp(ZE - 1.3, ZE - 0.55, 0.5)]} rotation={[0, s * 0.62, 0]}>
              <Caixa p={[0, 0.2, 0]} t={[1.6, 1.0, 0.16]} cor="#a5a9ab" raio={0.02} rug={0.8} />
            </group>
          ))}
          <Caixa p={[turbX - 0.1, YB + 0.15, ZE + 0.0]} t={[0.3, 0.3, 1.4]} cor="#a5a9ab" raio={0.02} rug={0.8} />
        </group>
      )}
      {/* a roda */}
      <Roda vis={rodaVis} y={rodaY} ang={giro} x={rodaX} />
      {n("setasRoda", 0) > 0.02 && rodaVis > 0.5 && (
        <group>
          {[[-1.9, 0.12], [-1.3, 0.12], [1.05, 0.12], [0.0, -0.3]].map(([z, y], i) => (
            <Seta key={i} a={[rodaX - 1.4, y, z]} b={[rodaX + 1.5, y, z]} cor="#7fc4ff" w={i === 3 ? 0.04 : 0.07} op={n("setasRoda", 0) * (i === 3 ? 0.5 : 1)} />
          ))}
        </group>
      )}
      {gerVis > 0.02 && rodaVis > 0.02 && (
        <group position={[housing[0], housing[1], housing[2]]} scale={suave(gerVis)}>
          <Caixa p={[0, 0, 0]} t={[0.34, 0.34, 0.3]} cor="#6b7178" met={0.5} rug={0.4} raio={0.025} />
          <Caixa p={[0, 0, 0.152]} t={[0.2, 0.2, 0.01]} cor="#2f3a42" raio={0.01} />
          <Caixa p={[-0.07, 0, 0.16]} t={[0.07, 0.15, 0.01]} cor="#e3392f" raio={0.005} />
          <Caixa p={[0.07, 0, 0.16]} t={[0.07, 0.15, 0.01]} cor="#2f6fe0" raio={0.005} />
        </group>
      )}
      {/* barragem, lago, comporta, tubo forçado, turbina, casa de força */}
      <Parede k={barra} vert={n("vert", 0)} raiox={raiox} vertAgua={n("vertAgua", 0)} t={tEp} fase={fRio * 0.7} />
      {plinto > 0.02 && (
        <Caixa p={[turbX + 1.0, YB + (plinH - 0.0) / 2 + 0.0, ZE]} t={[2.4, Math.max(0.02, plinH * plinto), 1.2]} cor="#a5a9ab" raio={0.02} rug={0.85} />
      )}
      <Comporta abre={comporta} fluxo={n("fluxoComporta", 0)} fase={fRio * 0.5} xFim={n("comportaX", xGate)} yC={n("comportaY", 2.1)} t={tEp} />
      <TuboForcado k={tubo} agua={aguaTubo} fase={fRio * 1.0 + fTurb} t={tEp} pts={tuboPts} />
      <group position={[turbX, turbY, ZE]}>
        <Turbina vis={turbVis} helice={helice} ang={giro} t={tEp} fluxo={n("fluxoTurb", 0)} fase={fTurb * 0.6 + fRio * 0.5} luz={luz} corrente={corr} />
      </group>
      {/* setas azuis: a água entra inteira no cano */}
      {setasAgua > 0.02 && turbVis > 0.5 && [-0.28, 0, 0.28].map((dz, i) => (
        <Seta key={i} a={[turbX - 1.6, turbY, ZE + dz * 1.4]} b={[turbX - 0.1, turbY, ZE + dz * 0.5]} cor="#7fc4ff" w={0.05} op={setasAgua} />
      ))}
      {setasAgua > 0.02 && turbVis > 0.5 && [[-1.0, 1.4], [1.0, -1.4]].map(([dz, d], i) => <Seta key={i} a={[turbX - 1.8, turbY, ZE + dz * 1.3]} b={[turbX - 0.5, turbY, ZE + dz * 0.4]} cor="#7fc4ff" w={0.04} op={setasAgua * 0.8} />)}
      {/* água saindo do cano */}
      {saida > 0.02 && turbVis > 0.5 && (
        <group>
          {Array.from({ length: 18 }).map((_, i) => {
            const u = ((((i / 18 + fTurb * 0.25 + fRio * 0.2) % 1) + 1) % 1);
            const alta = hasTurbElev;
            const x = turbX + TURB_L + u * (alta ? 0.9 : 1.6);
            const y = alta ? turbY - u * u * (turbY - YB - 0.05) : turbY - u * 0.28;
            return <mesh key={i} position={[x, y, ZE + (rnd(i * 3.3) - 0.5) * 0.5]} scale={0.045} renderOrder={4}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={i % 3 ? AZUL_AG : "#cfeaff"} transparent opacity={0.9 * saida * (1 - 0.5 * u)} /></mesh>;
          })}
        </group>
      )}
      {/* túnel de saída até o rio (batida 20) */}
      {tunel > 0.02 && (
        <group>
          <mesh position={[turbX + TURB_L + 0.9, turbY - 0.1, ZE]}><boxGeometry args={[1.8, 0.8, 1.0]} /><meshPhysicalMaterial color="#9fb6c4" transparent opacity={0.22 * tunel} depthWrite={false} /></mesh>
          <group position={[turbX + TURB_L + 0.9, turbY - 0.1, ZE]}><Contorno t={[1.8, 0.8, 1.0]} cor="#4e6471" op={0.9 * tunel} /></group>
          {Array.from({ length: 16 }).map((_, i) => {
            const u = ((((i / 16 + fRio * 0.28) % 1) + 1) % 1);
            const x = lerp(turbX + TURB_L - 0.1, turbX + TURB_L + 2.6, u);
            const y = u < 0.7 ? turbY - 0.1 : lerp(turbY - 0.1, AGUA_Y + 0.05, (u - 0.7) / 0.3);
            return <mesh key={i} position={[x, y, ZE + (rnd(i * 2.9) - 0.5) * 0.6]} scale={0.05} renderOrder={4}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={i % 3 ? AZUL_AG : "#cfeaff"} transparent opacity={0.95 * tunel} /></mesh>;
          })}
          <Seta a={[turbX + TURB_L + 2.7, AGUA_Y + 0.3, ZE + 0.0]} b={[turbX + TURB_L + 4.0, AGUA_Y + 0.3, ZE]} cor="#7fc4ff" w={0.07} op={tunel} />
        </group>
      )}
      <CasaForca k={casa} x0={turbX} />
      {/* v2: sala, bicicleta, grade, galhos, peixes, chaminé, golpe, escada, transformador, submarino */}
      {C.cena.sala === true && <Sala tv={n("tv", 0)} luz={n("luzSala", 1)} t={tEp} />}
      {n("bike", 0) > 0.02 && <group rotation={[0, n("bikeRot", 0), 0]} position={[n("bikeX", 0.4), 0, n("bikeZ", 3.2)]}><Bicicleta p={[0, 0, 0]} ang={C.int("bikeVel", 0)} /></group>}
      <Grade k={n("grade", 0)} />
      <Galhos k={n("galhos", 0)} nivel={lago} t={tEp} />
      <PeixeGrade u={n("peixeGrade", 0)} nivel={lago} />
      <Chamine k={n("chamine", 0)} golpe={n("golpe", 0)} nivel={lago} t={tEp} />
      <Golpe k={n("golpe", 0)} t={tEp} />
      <Escada k={n("escada", 0)} t={tEp} />
      <PeixeEscada tenta={n("peixeTenta", 0)} sobe={n("peixeSobe", 0)} t={tEp} k={n("escada", 0)} />
      <Transformador k={n("trafo", 0)} x={6.7} z={0.0} />
      <Submarino u={n("sub", 0)} z={0.2} />
      {n("alturaSetas", 0) > 0.02 && (
        <group>
          <Seta a={[-1.6, AGUA_Y + 0.1, 1.2]} b={[-1.6, lago - 0.05, 1.2]} cor="#ffd23f" w={0.08} op={n("alturaSetas", 0)} />
          <Seta a={[3.4, AGUA_Y + 0.1, 1.3]} b={[3.4, 0.0, 1.3]} cor="#7fc4ff" w={0.05} op={n("alturaSetas", 0) * 0.0} />
          <Liga a={[-1.6, lago + 0.02, 1.2]} b={[2.4, lago + 0.02, 1.2]} w={0.03} cil cor="#ffd23f" basico op={n("alturaSetas", 0) * 0.8} />
        </group>
      )}
      {n("divisor", 0) > 0.02 && <Caixa p={[XB + 3.1, 0.5, -1.2]} t={[5.5, 1.0, 0.16]} cor="#a5a9ab" raio={0.02} rug={0.85} />}
      {/* lâmpada, fio e tomada solta */}
      {lampVis > 0.02 && (
        <group scale={suave(lampVis)} position={[0, 0, 0]}>
          {modo === "estaca" && <Liga a={[lamp[0], 0, lamp[2]]} b={[lamp[0], lamp[1] - 0.22, lamp[2]]} w={0.07} cil cor="#7a4e28" />}
          {modo === "poste" && <Liga a={[lamp[0], 0, lamp[2]]} b={[lamp[0], lamp[1] - 0.2, lamp[2]]} w={0.12} cil cor="#6b6f74" />}
          <Lamp p={lamp} luz={luz} pisca={n("pisca", 0)} t={tEp} esc={modo === "poste" ? 1.5 : 1} poste={modo === "poste"} />
          {plug > 0.02 && fio < 0.5 && (
            <group>
              <Fio pts={cordao([lamp[0], lamp[1] - 0.12, lamp[2]], [lamp[0] + 0.55, lamp[1] + 0.25, lamp[2] + 0.35], 0.5)} k={1} corrente={0} fase={0} cor="#2b2b2b" r={0.012} />
              <Plug p={[lamp[0] + 0.55, lamp[1] + 0.3, lamp[2] + 0.35]} rot={0.6} />
            </group>
          )}
        </group>
      )}
      {fio > 0.02 && lampVis > 0.5 && <Fio pts={fioPts} k={fio} corrente={corr} fase={fCorr} />}
      {/* lupa do gerador */}
      {lupaK > 0.02 && (
        <group>
          <LinhasZoom de={rodaVis > 0.5 ? [housing[0], housing[1], housing[2] + 0.17] : [pod[0], pod[1], pod[2] + 0.2]} p={[lx, ly, 1.9]} R={LR} k={lupaK} />
          <Lupa p={[lx, ly, 1.9]} R={LR} k={lupaK}>
            <LupaGerador R={LR} ang={giro} corrente={corr} fase={fCorr} luz={luz} />
          </Lupa>
        </group>
      )}
      {n("destaque", 0) > 0.02 && (
        <group>
          {([[1.0, 1.85, ZE + 0.35, 0.7], [turbX + 0.3, turbY, ZE + 0.4, 0.55], [turbX + 0.85, turbY, ZE + 0.4, 0.45], [pod[0], pod[1], ZE + 0.4, 0.55]] as [number, number, number, number][]).map(([hx, hy, hz, hr], k) => (
            <Halo key={k} p={[hx, hy, hz]} r={hr * 1.5} cor={k === 0 ? "#9fdcff" : k === 1 ? "#ffb347" : k === 2 ? "#ffffff" : "#ffe36a"} op={0.85 * clamp01(1 - Math.abs(n("destaque", 0) - (k + 1))) * (0.7 + 0.3 * Math.sin(tEp * 9))} />
          ))}
        </group>
      )}
      {/* a tomada gigante da batida 23, ligada ao poste da casa de força */}
      {n("tomada", 0) > 0.02 && (
        <group position={[7.3, 0, -1.8]} scale={suave(n("tomada", 0))}>
          <Caixa p={[0, 1.7, 0]} t={[2.2, 2.2, 0.18]} cor="#f4f1ea" raio={0.1} rug={0.5} verniz={0.4} />
          <Caixa p={[0, 1.7, 0.1]} t={[1.9, 1.9, 0.04]} cor="#e6e2d8" raio={0.08} rug={0.5} />
          {[-0.4, 0.4].map((x, i) => <Caixa key={i} p={[x, 1.95, 0.13]} t={[0.14, 0.55, 0.03]} cor="#14181b" raio={0.02} />)}
          <mesh position={[0, 1.2, 0.13]}><circleGeometry args={[0.12, 16]} /><meshBasicMaterial color="#14181b" /></mesh>
          <Liga a={[0, 0, 0]} b={[0, 0.6, 0]} w={0.16} cil cor="#6b6f74" />
          <Halo p={[0, 1.7, 0.3]} r={1.7} cor="#ffe27a" op={0.25} />
        </group>
      )}
      {n("tomada", 0) > 0.5 && <Fio pts={[[POSTE_X, 2.85, 1.1], [6.1, 2.5, 0.0], [6.7, 2.4, -1.0], [7.1, 2.3, -1.7]]} k={1} corrente={1} fase={fCorr} r={0.03} />}
      {/* poste ao lado da casa de força e cidade */}
      <Cidade k={cidade} t={tEp} />
      <Torres k={torres} t={tEp} />
      {interroga > 0.02 && <Texto3D texto="?" p={[n("interrogaX", 3.2), n("interrogaY", 4.2) + 0.7 * suave(interroga), n("interrogaZ", 1.5)]} h={1.3} escala={suave(clamp01(interroga * 2)) * (1 - 0.9 * n("lampadaMarca", 0))} />}
      {n("lampadaMarca", 0) > 0.02 && (
        <group position={[n("interrogaX", 3.2), n("interrogaY", 4.2) + 0.7, n("interrogaZ", 1.5)]} scale={suave(n("lampadaMarca", 0))}>
          <mesh scale={[1, 1.2, 1]}><sphereGeometry args={[0.35, 20, 16]} /><meshBasicMaterial color="#ffe36a" /></mesh>
          <mesh position={[0, -0.45, 0]}><cylinderGeometry args={[0.15, 0.12, 0.2, 12]} /><meshStandardMaterial color="#9aa3ab" metalness={0.6} roughness={0.3} /></mesh>
          <Halo p={[0, 0, 0.1]} r={1.5} cor="#ffe36a" op={0.55} />
        </group>
      )}
      {gente.map((gd, i) => <Pessoa key={i} g={gd} p={C.p} tAbs={tEp} ctx={C} />)}
      <pointLight position={[lamp[0], lamp[1] + 0.3, lamp[2] + 0.5]} intensity={luz > 0.05 ? 0.6 * Math.min(luz, 1.2) : 0} distance={5} color="#ffe9a0" />
    </group>
  );
};

/* ---------- palco: a garrafa furada ---------- */

const Garrafa: React.FC<{ nivel: number; jatos: number; riscos: number; t: number }> = ({ nivel, jatos, riscos, t }) => {
  const G = 9.8;
  const HM = 1.2; // altura da bancada
  const Hb = 0.62; // altura da garrafa (garrafa grande para ler de longe)
  const alturas = [0.46, 0.12]; // furo de cima e de baixo (a partir da base)
  const topo = Hb * 0.92 * clamp01(nivel);
  const fura = alturas.map((a) => {
    const prof = Math.max(0, topo - a);
    const v = Math.sqrt(2 * G * prof) * 0.55; // velocidade de cena, um pouco mais lenta
    return { a, prof, v };
  });
  const gx = 0.1;
  const jatoPts = (a: number, v: number): V[] => {
    const y0 = HM + a;
    const T = Math.sqrt((2 * y0) / (G * 0.3));
    return Array.from({ length: 24 }, (_, i) => {
      const tt = (i / 23) * T;
      return [gx + 0.092 + v * tt * 1.1, y0 - 0.5 * G * 0.3 * tt * tt, 0.0] as V;
    });
  };
  const alcances = fura.map((f) => { const y0 = HM + f.a; const T = Math.sqrt((2 * y0) / (G * 0.3)); return gx + 0.092 + f.v * T * 1.1; });
  return (
    <group>
      {/* bancada */}
      <Caixa p={[gx - 0.25, HM - 0.04, 0]} t={[1.2, 0.08, 0.7]} cor="#9a6a3a" raio={0.015} rug={0.7} />
      {[-0.6, 0.2].map((x, i) => [-0.28, 0.28].map((z, j) => <Caixa key={`${i}${j}`} p={[gx + x - 0.15, (HM - 0.08) / 2, z]} t={[0.08, HM - 0.08, 0.08]} cor="#7a4e28" raio={0.01} rug={0.8} />))}
      {/* garrafa */}
      <group position={[gx, HM, 0]}>
        <mesh position={[0, Hb * 0.4, 0]}><cylinderGeometry args={[0.092, 0.092, Hb * 0.8, 24, 1, true]} /><meshPhysicalMaterial color="#dff1ff" transparent opacity={0.22} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh position={[0, Hb * 0.84, 0]}><cylinderGeometry args={[0.04, 0.092, Hb * 0.2, 24, 1, true]} /><meshPhysicalMaterial color="#dff1ff" transparent opacity={0.22} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh position={[0, Hb * 0.96, 0]}><cylinderGeometry args={[0.045, 0.045, 0.05, 14]} /><meshStandardMaterial color="#e3392f" roughness={0.5} /></mesh>
        <mesh position={[0, Hb * 0.4 * 0.0 + 0.002, 0]}><cylinderGeometry args={[0.092, 0.092, 0.006, 24]} /><meshStandardMaterial color="#c9d6de" roughness={0.4} /></mesh>
        {topo > 0.01 && <mesh position={[0, topo / 2, 0]}><cylinderGeometry args={[0.086, 0.086, topo, 24]} /><meshStandardMaterial color="#3f9ae8" transparent opacity={0.6} roughness={0.1} depthWrite={false} /></mesh>}
        {fura.map((f, i) => <mesh key={i} position={[0.093, f.a, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.014, 0.014, 0.02, 10]} /><meshBasicMaterial color="#14181b" /></mesh>)}
        <mesh position={[0, Hb * 0.58, 0.093]}><boxGeometry args={[0.185, 0.06, 0.004]} /><meshBasicMaterial color="#f4f1ea" /></mesh>
      </group>
      {/* jatos */}
      {jatos > 0.02 && fura.map((f, i) => {
        if (f.prof <= 0.005) return null;
        const pts = jatoPts(f.a, f.v);
        const curva = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)));
        return (
          <group key={i}>
            <mesh><tubeGeometry args={[curva, 40, 0.012, 6, false]} /><meshBasicMaterial color="#5fb0f2" transparent opacity={0.9 * jatos} /></mesh>
            {Array.from({ length: 12 }).map((_, k) => {
              const u = ((((k / 12 + t * 0.9) % 1) + 1) % 1);
              const q = curva.getPoint(u);
              return <mesh key={k} position={q} scale={0.02}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#e1f2ff" transparent opacity={jatos} /></mesh>;
            })}
          </group>
        );
      })}
      {/* riscos no chão onde cada jato cai */}
      {riscos > 0.02 && alcances.map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, riscos, 1]}><planeGeometry args={[0.035, 0.6]} /><meshBasicMaterial color={i === 0 ? "#ffd23f" : "#ff5a3c"} /></mesh>
        </group>
      ))}
      {riscos > 0.02 && <Seta a={[alcances[0], 0.06, 0.45]} b={[alcances[1], 0.06, 0.45]} cor="#ffffff" w={0.02} op={riscos} />}
    </group>
  );
};

const GarrafaPalco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const gente = (C.cena.gente as GenteE[] | undefined) ?? [];
  return (
    <group>
      <hemisphereLight args={["#f6f9fc", "#9a9080", 1.1]} />
      <directionalLight position={[-3, 6, 7]} intensity={1.6} color="#fff3dc" />
      {/* sala de oficina: parede, piso e prateleira para o fundo não ficar vazio */}
      <mesh position={[0.2, 1.4, -1.2]}><planeGeometry args={[9, 4.6]} /><meshStandardMaterial color="#e6ded0" roughness={0.9} /></mesh>
      <mesh position={[0.2, 0, 0.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 3.2]} /><meshStandardMaterial color="#b9a58a" roughness={0.9} /></mesh>
      {Array.from({ length: 13 }).map((_, i) => <mesh key={i} position={[-4.1 + i * 0.7, 0.003, 0.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.02, 3.2]} /><meshBasicMaterial color="#8d7a60" /></mesh>)}
      <Caixa p={[-1.35, 2.3, -1.1]} t={[1.8, 0.06, 0.4]} cor="#8d5c32" raio={0.01} rug={0.8} />
      {[["#e3392f", 0.3], ["#2f6fe0", 0.22], ["#f2c230", 0.34], ["#4fae4a", 0.26]].map(([c, h], i) => <Caixa key={i} p={[-1.9 + i * 0.28, 2.33 + (h as number) / 2, -1.1]} t={[0.2, h as number, 0.24]} cor={c as string} raio={0.01} rug={0.7} />)}
      <Caixa p={[1.6, 2.5, -1.15]} t={[1.1, 0.8, 0.04]} cor="#f4efe2" raio={0.01} rug={0.8} />
      <mesh position={[1.6, 2.5, -1.12]}><planeGeometry args={[0.95, 0.65]} /><meshBasicMaterial color="#a9dcf7" /></mesh>
      <mesh position={[1.35, 2.35, -1.11]} rotation={[0, 0, 0]}><planeGeometry args={[0.7, 0.3]} /><meshBasicMaterial color="#7aa07a" /></mesh>
      <Caixa p={[1.65, 2.5, -1.1]} t={[0.5, 0.5, 0.02]} cor="#b9bcbc" raio={0.01} rug={0.8} op={0.0} />
      <Garrafa nivel={n("nivelGarrafa", 1)} jatos={n("jatos", 0)} riscos={n("riscos", 0)} t={tEp} />
      {gente.map((gd, i) => <Pessoa key={i} g={gd} p={C.p} tAbs={tEp} ctx={C} />)}
    </group>
  );
};

/* ---------- palco: Itaipu (aérea, estilizada) ---------- */

const ItaipuPalco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const acesas = n("itaipu", 0);
  const fRio = C.int("vazao", 1.2);
  return (
    <group>
      <hemisphereLight args={["#e8f4ff", "#8a8070", 1.05]} />
      <directionalLight position={[-6, 14, 8]} intensity={1.8} color="#fff3dc" />
      <fog attach="fog" args={["#cfe6f3", 40, 78]} />
      <Dome topo="#3f86d8" meio="#9ad0f5" base="#e6f4fb" />
      <group rotation={[0, -0.72, 0]}>
        {/* terra */}
        <mesh position={[0, -0.6, 0]}><boxGeometry args={[70, 1.2, 50]} /><meshStandardMaterial color="#6aa84f" roughness={1} /></mesh>
        {Array.from({ length: 40 }).map((_, i) => <Arvore key={i} x={-26 + rnd(i * 1.9) * 52} z={(i % 2 ? 1 : -1) * (9 + rnd(i * 2.7) * 11)} s={1.5 + rnd(i + 3) * 1.0} cor="#3f7a3c" />)}
        {/* lago (z < 0) e rio (z > 0) */}
        <mesh position={[0, 0.03, -9]}><boxGeometry args={[70, 0.12, 14]} /><meshStandardMaterial color="#3b8fd9" roughness={0.15} /></mesh>
        <mesh position={[0, -0.12, 9.5]}><boxGeometry args={[70, 0.12, 14]} /><meshStandardMaterial color="#3b8fd9" roughness={0.15} /></mesh>
        {Array.from({ length: 20 }).map((_, i) => <mesh key={i} position={[-28 + (((rnd(i * 2.1) * 56 + fRio * 0.6) % 56)), -0.05, 6 + rnd(i * 3.3) * 7]}><boxGeometry args={[1.0, 0.02, 0.08]} /><meshBasicMaterial color="#e4f3ff" /></mesh>)}
        {/* a parede longa */}
        <Caixa p={[0, 1.1, -0.5]} t={[17, 2.2, 1.2]} cor="#c3c5c5" raio={0.04} rug={0.85} />
        <Caixa p={[0, 2.28, -0.5]} t={[17, 0.14, 1.4]} cor="#9da1a3" raio={0.03} rug={0.85} />
        {/* 20 turbinas: tubo diagonal na parede, casa de força e luz */}
        {Array.from({ length: 20 }).map((_, i) => {
          const x = -8.0 + i * 0.842;
          const on = clamp01(acesas - i) ;
          const piscou = on > 0 ? clamp01(on * 3) : 0;
          return (
            <group key={i} position={[x, 0, 0]}>
              <Liga a={[0, 2.1, 0.12]} b={[0, 0.55, 0.72]} w={0.2} cil cor={mistura("#7d868d", "#ffb347", piscou)} />
              <Caixa p={[0, 0.4, 1.2]} t={[0.62, 0.8, 0.9]} cor={mistura("#8a8f94", "#f0efe6", piscou)} raio={0.03} rug={0.7} />
              <mesh position={[0, 0.88, 1.2]} rotation={[0, 0, 0]}><boxGeometry args={[0.66, 0.1, 0.94]} /><meshStandardMaterial color="#6a7076" roughness={0.8} /></mesh>
              {piscou > 0 && <Halo p={[0, 1.15, 1.2]} r={0.9} cor="#ffe27a" op={0.8 * piscou} />}
              {piscou > 0 && <mesh position={[0, 1.0, 1.2]}><sphereGeometry args={[0.1, 8, 6]} /><meshBasicMaterial color="#fff0a0" /></mesh>}
            </group>
          );
        })}
        {/* vertedouro nas pontas */}
        {[-1, 1].map((s) => <group key={s} position={[s * 9.4, 0, -0.5]}>{Array.from({ length: 5 }).map((_, i) => <Caixa key={i} p={[0, 1.7 - i * 0.4, i * 0.35]} t={[1.4, 0.35, 0.4]} cor="#e6e8e8" raio={0.02} rug={0.85} />)}</group>)}
      </group>
    </group>
  );
};

/* ---------- palco: mapa do Brasil ---------- */

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
const CIDADES: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  for (let i = 0; out.length < 70 && i < 1500; i++) {
    const lon = -73 + rnd(i * 2.3) * 39;
    const lat = -33.5 + rnd(i * 3.7 + 1) * 38;
    // mais luzes no litoral sudeste e sul
    const peso = lat < -8 && lon > -52 ? 1 : 0.4;
    if (dentro(lon, lat) && rnd(i * 5.1) < peso) out.push([MX(lon), MZ(lat), rnd(i + 3)]);
  }
  return out;
})();

const MapaPalco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const luzes = n("luzesMapa", 0);
  const barra = n("barraAgua", 0);
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    BRASIL.forEach(([lon, lat], i) => (i ? sh.lineTo(MX(lon), -MZ(lat)) : sh.moveTo(MX(lon), -MZ(lat))));
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const LARG = 7.4;
  return (
    <group>
      <hemisphereLight args={["#8fb2e0", "#1a2a44", 0.9]} />
      <directionalLight position={[-4, 10, 8]} intensity={1.2} color="#dfe9ff" />
      <fog attach="fog" args={["#0a1830", 30, 70]} />
      <Dome topo="#050c1c" meio="#0e2144" base="#0a1830" />
      <mesh position={[0, -0.06, 0]}><boxGeometry args={[60, 0.1, 40]} /><meshStandardMaterial color="#0a1830" roughness={1} /></mesh>
      <mesh geometry={geo}><meshStandardMaterial color="#1f4a72" roughness={0.8} flatShading /></mesh>
      {BRASIL.map((p, i) => <Liga key={i} a={[MX(p[0]), 0.34, MZ(p[1])]} b={[MX(BRASIL[(i + 1) % BRASIL.length][0]), 0.34, MZ(BRASIL[(i + 1) % BRASIL.length][1])]} w={0.06} cil cor="#6fd3ff" basico />)}
      {CIDADES.slice(0, Math.round(CIDADES.length * luzes)).map(([x, z, f], i) => (
        <group key={i} position={[x, 0.33, z]}>
          <mesh scale={0.07 + f * 0.05}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#fff0a0" /></mesh>
          <Halo p={[0, 0.1, 0]} r={0.45 + f * 0.3} cor="#ffd86a" op={0.55 + 0.1 * Math.sin(tEp * 3 + i)} />
        </group>
      ))}
      {/* barra ÁGUA: 55% da eletricidade (de cena, proporcional) */}
      <group position={[0, 0, 6.0]}>
        <Caixa p={[0, 0.2, 0]} t={[LARG + 0.3, 0.5, 0.9]} cor="#2b3a52" raio={0.05} rug={0.6} />
        <Caixa p={[-LARG / 2 + (LARG * 0.55 * barra) / 2, 0.36, 0.0]} t={[Math.max(0.01, LARG * 0.55 * barra), 0.4, 0.74]} cor="#3f9ae8" raio={0.04} rug={0.3} met={0.1} />
        {barra > 0.3 && <Texto3D texto="ÁGUA" p={[-LARG / 2 + (LARG * 0.55 * barra) / 2, 0.95, 0.5]} h={0.8} cor="#bfe3ff" escala={suave(clamp01((barra - 0.3) / 0.4))} />}
        {barra > 0.9 && <Texto3D texto="55%" p={[LARG * 0.28, 0.95, 0.5]} h={0.9} cor="#ffd23f" escala={suave(clamp01((barra - 0.9) / 0.1))} />}
        {barra > 0.9 && <Liga a={[-LARG / 2 + LARG * 0.5, 0.0, 0.5]} b={[-LARG / 2 + LARG * 0.5, 0.65, 0.5]} w={0.03} cil cor="#ffffff" basico op={0.8} />}
      </group>
    </group>
  );
};

/* ---------- cena ---------- */

const UsinaCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio, trechos }) => {
  const C = mkCtx(cena, p, t, tEpisodio);
  const { n } = C;
  const segs = cena.segs as string[] | undefined;
  let segI = 0;
  if (segs) for (let i = 0; i < (trechos?.length ?? 0); i++) if (t >= trechos[i] - 1e-6) segI = i;
  const segNome = segs ? segs[Math.min(segI, segs.length - 1)] : undefined;
  // `segs`: cada trecho da batida mostra um palco; o palco é trazido para perto da origem (a câmera da batida é a mesma)
  const palco = segNome ? (segNome === "sala" ? "rio" : segNome) : ((cena.palco as string | undefined) ?? "rio");
  const X0 = segNome ? (segNome === "sala" ? 3.5 : 0) : (PALCO_X[palco] ?? 0);
  const Z0 = segNome === "sala" ? -2.8 : 0;
  const rodaVis = n("rodaVis", 0);
  const turbX = n("turbX", 2.4);
  const turbY = n("turbY", 0);
  const lamp = lampPos(C);
  const lx = n("lupaX", -0.7);
  const ly = n("lupaY", 2.3);
  const LR = n("lupaR", 0.55);
  const rodaX = n("rodaX", XW);
  const rodaY = n("rodaY", 0);
  const housing: V = [rodaX, RODA_R + YB + 0.1 + rodaY, 1.25];
  const pod: V = [turbX + 1.4, turbY, ZE];
  const gerAnc: V = rodaVis > 0.5 ? [housing[0], housing[1], 1.45] : [pod[0], pod[1] + 0.05, 0.5];
  const et: Record<string, EtiqDef> = {
    roda: { texto: "RODA", para: [rodaX - 0.55, RODA_R + YB + 0.1 + rodaY + 0.55, 0.55], off: [-0.5, 0.95], cor: "#ffd23f" },
    ima: { texto: "ÍMÃ", para: [lx - 0.28 * LR, ly + 0.08 * LR, 1.95], off: [-0.1, 0.95], cor: "#ff8f84" },
    bobina: { texto: "BOBINA", para: [lx + 0.5 * LR, ly + 0.1 * LR, 1.95], off: [0.5, -0.8], cor: "#ffb36a" },
    gerador: { texto: "GERADOR", para: gerAnc, off: [0.5, 0.85], cor: "#ffd23f" },
    turbina: { texto: "TURBINA", para: [turbX + 0.4, turbY + 0.3, 0.7], off: [0.55, 1.15], cor: "#ffb36a" },
    comporta: { texto: "COMPORTA", para: [-0.06, 2.15, 1.0], off: [-0.9, 1.25], cor: "#ffd23f" },
    tubo: { texto: "TUBO FORÇADO", para: [1.0, 2.0, 0.9], off: [-0.4, 1.3], cor: "#9fdcff" },
    vert: { texto: "VERTEDOURO", para: [1.6, 1.4, -1.45], off: [1.3, 1.6], cor: "#9fdcff" },
    barragem: { texto: "BARRAGEM", para: [0.35, 3.8, 0.9], off: [-1.1, 1.2], cor: "#ffd23f" },
    grade: { texto: "GRADE", para: [-0.36, 3.45, 0.7], off: [-1.2, 0.9], cor: "#cfd8de" },
    chamine: { texto: "CHAMINÉ DE EQUILÍBRIO", para: [0.4, 4.7, 0.5], off: [1.4, 0.7], cor: "#9fdcff" },
    escada: { texto: "ESCADA DE PEIXES", para: [0.2, 2.6, 2.3], off: [-0.4, 1.2], cor: "#9fe8b0" },
    trafo: { texto: "TRANSFORMADOR", para: [6.7, 1.5, 0.3], off: [0.6, 1.1], cor: "#ffb36a" },
    linhas: { texto: "ALTA TENSÃO", para: [10.5, 6.2, -4.2], off: [-0.8, 1.0], cor: "#ffe27a" },
    roda2: { texto: "RODA", para: [-0.8, 1.0, 0.8], off: [-0.5, 1.0], cor: "#ffd23f" },
    casa: { texto: "CASA DE FORÇA", para: [turbX + 1.9, 1.7, 1.1], off: [1.0, 0.9], cor: "#cfeaf5" },
  };
  const S = n("etiqS", 1);
  const Kt = n("etiqK", 1);
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fimE] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && C.p >= ini && (fimE === undefined || C.p <= fimE) };
  }).filter((x) => x.ok);
  void lamp;
  return (
    <group>
      <group position={[X0, 0, Z0]} scale={segNome === "itaipu" ? 0.5 : 1}>
        {palco === "rio" && <RioPalco C={C} />}
        {palco === "garrafa" && <GarrafaPalco C={C} />}
        {palco === "itaipu" && <ItaipuPalco C={C} />}
        {palco === "mapa" && <MapaPalco C={C} />}
      </group>
      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const base: V = [d.para[0] + X0, d.para[1], d.para[2]];
        const off: V = [base[0] + d.off[0] * S, base[1] + d.off[1] * S, base[2] + 0.25];
        return <Etiqueta key={c} texto={d.texto} de={off} para={base} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={C.p > 0 ? clamp01((t * (C.p - ini)) / (C.p * 0.25)) : 1} />;
      })}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 50) => ({ pos, alvo, fov });

export const usina: Cenario3D = {
  Cena: UsinaCena,
  padrao: "geral",
  fundo: (cena) => {
    const pa = cena.palco as string | undefined;
    return pa === "garrafa" ? "#e6ded0" : pa === "mapa" ? "#0a1830" : "#9ad0f5";
  },
  luzPropria: true,
  cameras: { geral: c([-1, 2.4, 9], [0, 1.2, 0], 50) },
};
