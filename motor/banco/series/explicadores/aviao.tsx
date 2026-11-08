import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { FONT } from "../../../src/theme";
import { clamp01, lerp, mistura, suave, valor } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Anterior, poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa, Mat, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Expressao3D, PontoCamera, Pose3D, V3, Valor } from "../../../src/v3d/tipos";
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
/** Início de cada trecho da fala da batida (em fração 0..1) para as chaves "tK" / "tK+0.1": o corte segue a voz, não a contagem de palavras. */
let TRS: number[] = [];
let DUR = 5;
const pos = (x: number | string): number => {
  if (typeof x === "number") return x;
  const e = /^e([+-][\d.]+)$/.exec(x); // "e-2.5" = 2,5 s antes do fim da batida
  if (e) return 1 + parseFloat(e[1]) / Math.max(DUR, 0.1);
  const m = /^t(\d+)([+-][\d.]+)?$/.exec(x);
  if (!m) return parseFloat(x) || 0;
  const k = +m[1];
  return (k >= TRS.length ? 1 : TRS[k] / Math.max(DUR, 0.1)) + (m[2] ? parseFloat(m[2]) : 0);
};
const chaves = (a0: [number | string, number][], p: number) => {
  const a = a0.map(([x, v]) => [pos(x), v] as [number, number]);
  if (p <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    if (p <= a[i][0]) return lerp(a[i - 1][1], a[i][1], suave(clamp01((p - a[i - 1][0]) / Math.max(a[i][0] - a[i - 1][0], 1e-6))));
  }
  return a[a.length - 1][1];
};
const nv = (v: unknown, p: number, pad = 0) => (Array.isArray(v) ? chaves(v as [number, number][], p) : valor(n0(v), p, pad));

/** Estado do avião grande a partir dos campos da cena. Sem `semCauda`, a cauda existe; com ela, entra pelos campos estH/estV. */
const aviaoProps = (cena: Record<string, unknown>, n: (k: string, pad?: number) => number) => {
  const dc = cena.semCauda === true ? 0 : 1;
  return {
    fus: n("fus", 1), turb: n("turb", 1), raiox: n("raiox"), ar: n("ar"),
    ctl: {
      estH: n("estH", dc), estV: n("estV", dc), prof: n("profundor"), profV: n("profV"), ail: n("aileron"), ailV: n("ailV"),
      leme: n("leme"), lemeV: n("lemeV"), flap: n("flap"), flapV: n("flapV"), inchar: n("inchar"), motorCorte: n("motorCorte"), duto: n("duto"),
    } as Ctl,
  };
};

const PALCO_X: Record<string, number> = { campo: 0, tunel: 60, carro: 120, pista: 180, ceu: 240, janela: 300 };
const BRANCO = "#f4f6f8";
const AZUL_LIV = "#1f5fa8";
const LARANJA = "#ff8a2a";
const AZUL_AR = "#4db4ff";
const AZUL_CLARO = "#bfeaff";
const VERMELHO = "#ff5a3c";
const PELE = "#c98f63";

/* ---------- céu, chão, nuvens ---------- */

const Dome: React.FC<{ topo: string; meio: string; base: string; r?: number; ox?: number }> = ({ topo, meio, base, r = 68, ox = 0 }) => {
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
    <mesh geometry={geo} scale={r} position={[camera.position.x - ox, camera.position.y, camera.position.z]} renderOrder={-10}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
};

const mixCor = (a: string, b: string, k: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();

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

const Nuvens: React.FC<{ t: number; lista?: [number, number, number, number][]; vel?: number; dy?: number }> = ({ t, lista, vel = 0.5, dy = 0 }) => {
  const L = lista ?? [[-45, 40, -55, 5], [22, 52, -58, 6], [58, 34, -50, 4], [-20, 30, -45, 3.5], [0, 62, -60, 6], [-60, 52, -45, 5]];
  return <group>{L.map(([x, y, z, s], i) => <Nuvem key={i} p={[((x + 80 + t * vel * (0.6 + rnd(i) * 0.8)) % 160) - 80, dy ? ((((y - dy + 20) % 140) + 140) % 140) - 20 : y, z]} s={s} />)}</group>;
};

/** Nuvens do céu em três camadas de profundidade (paralaxe): as de perto passam rápido, as de longe devagar; `dy` as faz descer quando o avião sobe. */
const CAMADAS: [number, number, number, number][] = [[-18, 1.7, 7, 5], [-24, 2.4, 4.2, 5], [-30, 3.2, 2.4, 4]];
const NuvensCeu: React.FC<{ t: number; ay: number; dy: number; vel: number }> = ({ t, ay, dy, vel }) => (
  <group>
    {CAMADAS.flatMap(([z, s, v, nn], c) => Array.from({ length: nn }).map((_, i) => {
      const x0 = -45 + (i + rnd(c * 11 + i) * 0.8) * (90 / nn);
      const x = ((((x0 + 45 + t * v * vel) % 90) + 90) % 90) - 45;
      const yo0 = (rnd(c * 7 + i + 3) - 0.5) * 52;
      const yo = ((((yo0 - dy + 30) % 60) + 60) % 60) - 30;
      return <Nuvem key={`${c}-${i}`} p={[x, ay + yo, z - rnd(i + c) * 3]} s={s * (0.8 + rnd(i * 3 + c) * 0.5)} />;
    }))}
  </group>
);

/** Estrelas presas à câmera (o céu escuro lá em cima). */
const Estrelas: React.FC<{ t: number; ox?: number }> = ({ t, ox = 0 }) => {
  const { camera } = useThree();
  return (
    <group position={[camera.position.x - ox, camera.position.y, camera.position.z]}>
      {Array.from({ length: 70 }).map((_, i) => {
        const a = rnd(i) * Math.PI * 2;
        const b = 0.05 + rnd(i + 90) * 1.35;
        const r = 52;
        const br = 0.6 + 0.4 * Math.sin(t * (1.5 + rnd(i + 5) * 2) + i);
        return <mesh key={i} position={[Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r - 4, Math.sin(a) * Math.cos(b) * r]} scale={0.16 + 0.12 * rnd(i + 40)}><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color="#ffffff" transparent opacity={br} fog={false} /></mesh>;
      })}
    </group>
  );
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

/** Asa de pena de pássaro/anjo presa a um "braço" (eixo local -y = ao longo do braço, para fora; +x*lado = para cima; -z = para trás).
 *  Borda de ataque lisa (o braço), penas saindo do braço e abrindo em leque para cima e para trás: primárias (longas) na ponta, secundárias no meio, cobertoras curtas no ombro. */
const PenasAsa: React.FC<{ lado: 1 | -1; L?: number; fl?: number; w?: number; th?: number; n?: number; t?: number; flex?: number; re?: number }> = ({ lado, L = 0.62, fl = 1.35, w = 0.068, th = 0.012, n = 13, t = 0, flex = 0.16, re = 0.05 }) => {
  const penas = Array.from({ length: n }).map((_, i) => {
    const u = (i + 0.5) / n;
    const phi = -0.25 + 0.95 * Math.pow(u, 1.1) + flex * u * Math.sin(t * 15 - 2.2 * u);
    const th2 = 0.3 + 0.12 * u;
    const dir = new THREE.Vector3(lado * Math.cos(phi) * Math.cos(th2), -Math.sin(phi) * Math.cos(th2), -Math.sin(th2)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const Lf = fl * (0.17 + 0.6 * Math.pow(u, 1.15));
    return { u, q, Lf, base: [lado * 0.01, -u * L, -0.01 + 0.0006 * i * fl] as V };
  });
  return (
    <group>
      {penas.map((p, i) => (
        <group key={i} position={p.base} quaternion={p.q}>
          <mesh position={[0, p.Lf / 2, 0]} scale={[w, p.Lf / 2, th]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={i % 2 ? "#f1ece0" : "#e4dac6"} roughness={0.95} flatShading /></mesh>
          {p.u > 0.55 && <mesh position={[0, p.Lf * 0.88, th * 0.2]} scale={[w * 0.95, p.Lf * 0.14, th * 1.15]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={p.u > 0.8 ? "#8f7f66" : "#b9a78a"} roughness={0.95} flatShading /></mesh>}
          <mesh position={[0, p.Lf * 0.22, th * 1.2]} scale={[w * 0.9, p.Lf * 0.22, th * 0.9]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#fbf8f0" roughness={0.9} flatShading /></mesh>
        </group>
      ))}
      {/* borda de ataque: o braço coberto, liso e arredondado */}
      <mesh position={[0, -L / 2, 0.005]} scale={[1, 1, 1]}><cylinderGeometry args={[re * 0.9, re * 1.15, L, 10]} /><meshStandardMaterial color="#faf6ec" roughness={0.9} /></mesh>
      <mesh position={[lado * re * 0.9, -L * 0.45, 0.002]} scale={[re * 1.3, L * 0.5, th * 2]}><sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color="#f7f2e6" roughness={0.9} flatShading /></mesh>
    </group>
  );
};

/** Asa de pena do tamanho da asa do avião: a MESMA forma da asa do braço (borda de ataque na linha da asa, penas para cima e para trás), parada. */
const AsaPenaGrande: React.FC<{ sinal: 1 | -1 }> = ({ sinal }) => {
  const o = new THREE.Vector3(8.5, 0, 15.7 * sinal);
  const L = o.length();
  o.normalize();
  const back = new THREE.Vector3(1, 0, 0).addScaledVector(o, -o.x).normalize();
  const x = new THREE.Vector3().crossVectors(o, back);
  const lado: 1 | -1 = x.y >= 0 ? 1 : -1;
  const m = new THREE.Matrix4().makeBasis(x, o.clone().negate(), back.clone().negate());
  const eu = new THREE.Euler().setFromRotationMatrix(m);
  return (
    <group position={[-3.2, -0.5, 1.5 * sinal]} rotation={eu}>
      <PenasAsa lado={lado} L={L} fl={7.5} w={1.25} th={0.16} n={15} flex={0} re={0.9} />
    </group>
  );
};

/** Ar da cabine (coordenadas locais): duto laranja do motor ao trocador, ar frio azul pelo teto, saída traseira. */
const Duto: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  const quente: V[] = [[0.3, -0.9, 5.7], [0.4, -0.5, 4.6], [0.9, -0.1, 3.2], [1.2, 0.5, 2.0]];
  const frio: V[] = [[1.2, 0.9, 1.4], [1.0, 1.35, 0.4], [-3, 1.5, 0], [-9, 1.5, 0]];
  const cai = [-8, -5.5, -3, -0.5].map((x) => [[x, 1.5, 0.2], [x - 0.1, 0.5, 0.25]] as V[]);
  const saida: V[] = [[7.5, -1.3, 0], [9.4, -1.9, 0], [11.5, -2.4, 0]];
  const kq = clamp01(k / 0.4);
  const kf = clamp01((k - 0.4) / 0.35);
  const ks = clamp01((k - 0.75) / 0.25);
  return (
    <group>
      <Tubo pts={quente} cor="#ff8a2a" r={0.13} op={0.95 * kq} />
      <Fluxo rotas={[quente]} t={t} n={3} vel={3} cor="#fff0a0" w={0.14} op={kq} tam={0.9} />
      <Caixa p={[1.2, 0.7, 1.7]} t={[0.7, 0.6, 0.7]} cor="#4db4ff" raio={0.08} sombra={false} />
      <Tubo pts={frio} cor="#9fd8ff" r={0.11} op={0.95 * kf} />
      <Fluxo rotas={[frio]} t={t} n={3} vel={3} cor="#ffffff" w={0.12} op={kf} tam={0.9} />
      <Fluxo rotas={cai} t={t} n={2} vel={1.2} cor="#d8f2ff" w={0.08} op={kf} tam={0.5} />
      <Caixa p={[7.4, -1.25, 0]} t={[0.5, 0.2, 0.5]} cor="#c88bff" raio={0.04} sombra={false} />
      <Fluxo rotas={[saida]} t={t} n={3} vel={4} cor="#d8f2ff" w={0.1} op={ks} tam={1.0} />
    </group>
  );
};

const COR_PAX = ["#ff8a2a", "#4db4ff", "#ff5a8a", "#6bd36b", "#c88bff", "#ffd23f"];
const COR_CAIXA = ["#b9824a", "#c99a5e", "#8f6a3f", "#d9a45a", "#4a7fb5"];
const ZECA_ASSENTO = 9; // índice da poltrona (fileira da frente do corte) onde o Zeca senta

/** Raio-X da fuselagem: piso, poltronas com gente, caixas no porão. Coordenadas locais do avião (metros). */
const Interior: React.FC<{ k: number }> = ({ k }) => (
  <group scale={[1, Math.max(suave(k), 0.001), Math.max(suave(k), 0.001)]} visible={k > 0.02}>
    <Caixa p={[-1.2, -0.62, 0]} t={[26, 0.08, 2.9]} cor="#cfd6dd" raio={0.02} sombra={false} />
    {Array.from({ length: 19 }).map((_, i) => {
      const x = -10.6 + i * 0.98;
      return [-0.75, 0.75].map((z, j) => (
        <group key={`${i}${j}`} position={[x, 0, z]}>
          <Caixa p={[0, -0.4, 0]} t={[0.5, 0.14, 0.55]} cor="#2f5f9a" raio={0.04} sombra={false} />
          <Caixa p={[0.22, -0.02, 0]} t={[0.1, 0.72, 0.55]} cor="#2f5f9a" raio={0.04} sombra={false} />
          {(i * 3 + j * 2) % 5 !== 0 && !(i === ZECA_ASSENTO && j === 1) && (
            <group>
              <Caixa p={[-0.02, -0.08, 0]} t={[0.3, 0.5, 0.34]} cor={COR_PAX[(i + j * 2) % COR_PAX.length]} raio={0.1} sombra={false} />
              <mesh position={[-0.02, 0.34, 0]}><sphereGeometry args={[0.17, 10, 8]} /><meshStandardMaterial color={i % 2 ? PELE : "#e8b890"} roughness={0.8} /></mesh>
            </group>
          )}
        </group>
      ));
    })}
    {Array.from({ length: 9 }).map((_, i) => <Caixa key={i} p={[-11.5 + i * 2.9, -1.3, 0]} t={[2.1, 0.85, 1.9]} cor={COR_CAIXA[i % COR_CAIXA.length]} raio={0.08} sombra={false} />)}
  </group>
);

/** Raio do corpo da fuselagem na posição axial `a` (para os aros do raio-X). */
const raioFus = (a: number) => {
  for (let i = 1; i < PERFIL_FUS.length; i++) {
    if (a <= PERFIL_FUS[i][1]) {
      const [r0, a0] = PERFIL_FUS[i - 1];
      const [r1, a1] = PERFIL_FUS[i];
      return lerp(r0, r1, (a - a0) / Math.max(a1 - a0, 1e-6));
    }
  }
  return 0.1;
};

/** Comandos e estado do avião grande. Visibilidades 0..1 (entram com um pop); ângulos em rad. */
type Ctl = { estH?: number; estV?: number; prof?: number; profV?: number; ail?: number; ailV?: number; leme?: number; lemeV?: number; flap?: number; flapV?: number; inchar?: number; motorCorte?: number; duto?: number };
type AviaoP = { penas?: boolean; t: number; fus?: number; turb?: number; raiox?: number; ar?: number; ctl?: Ctl };

const Aviao: React.FC<AviaoP> = ({ penas, t, fus: fusK = 1, turb = 1, raiox = 0, ar = 0, ctl = {} }) => {
  const fx = Math.max(suave(clamp01(fusK)), 0.001);
  const tk = Math.max(suave(clamp01(turb)), 0.001);
  const eH = ctl.estH ?? 1;
  const eV = ctl.estV ?? 1;
  const inchar = ctl.inchar ?? 0;
  const mc = ctl.motorCorte ?? 0;
  const pop = (k: number) => Math.max(suave(clamp01(k)), 0.001);
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
      <group scale={[fx, 1 + 0.07 * inchar, 1 + 0.07 * inchar]} visible={fusK > 0.01}>
        <mesh geometry={fus}><meshStandardMaterial color={BRANCO} roughness={0.35} metalness={0.15} transparent opacity={1 - 0.82 * raiox} depthWrite={raiox < 0.4} /></mesh>
        {raiox > 0.01 && [-15, -11, -7, -3, 1, 5, 9, 13, 16].map((a) => <mesh key={a} position={[a, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[raioFus(a), 0.03, 6, 36]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.8 * raiox} depthWrite={false} /></mesh>)}
        {raiox > 0.01 && <Interior k={raiox} />}
        {/* faixa azul, janelas e cabine */}
        {raiox < 0.5 && [-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[-3.5, -0.35, s * 1.92]}><boxGeometry args={[16.5, 0.22, 0.05]} /><meshStandardMaterial color={AZUL_LIV} roughness={0.4} /></mesh>
            {Array.from({ length: 19 }).map((_, i) => <mesh key={i} position={[-10.6 + i * 0.98, 0.5, s * 1.88]}><boxGeometry args={[0.3, 0.38, 0.06]} /><meshStandardMaterial color="#1d2f48" roughness={0.2} metalness={0.4} /></mesh>)}
            <mesh position={[-16.9, 0.95, s * 0.72]} rotation={[0, s * 0.62, 0]}><boxGeometry args={[0.7, 0.38, 0.06]} /><meshStandardMaterial color="#1d2f48" roughness={0.2} metalness={0.4} /></mesh>
            <mesh position={[-17.6, 0.9, s * 0.35]} rotation={[0, s * 0.3, 0]}><boxGeometry args={[0.5, 0.36, 0.06]} /><meshStandardMaterial color="#1d2f48" roughness={0.2} metalness={0.4} /></mesh>
          </group>
        ))}
        <mesh position={[-19.2, 0.1, 0]}><sphereGeometry args={[0.3, 8, 6]} /><meshStandardMaterial color="#2b2f36" /></mesh>
      </group>
      {/* asas (ou penas) e turbinas */}
      {penas ? (
        <group><AsaPenaGrande sinal={1} /><AsaPenaGrande sinal={-1} /></group>
      ) : (
        <group>
          <mesh geometry={asaD} position={[0, -0.4, 0]}>{raiox > 0.01 ? <meshStandardMaterial color="#e4e9ee" transparent opacity={1 - 0.8 * raiox} depthWrite={false} side={THREE.DoubleSide} /> : <Mat cor="#e4e9ee" rug={0.45} met={0.2} dupla />}</mesh>
          <mesh geometry={asaE} position={[0, -0.4, 0]}>{raiox > 0.01 ? <meshStandardMaterial color="#e4e9ee" transparent opacity={1 - 0.8 * raiox} depthWrite={false} side={THREE.DoubleSide} /> : <Mat cor="#e4e9ee" rug={0.45} met={0.2} dupla />}</mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Caixa p={[7.7, 0.5, s * 17.2]} t={[1.5, 1.5, 0.12]} cor={AZUL_LIV} raio={0.04} r={[0, 0, 0.0]} />
              <group position={[-1.9, -1.55, s * 5.7]} scale={tk} visible={turb > 0.01}>
                {/* pás do ventilador na frente da turbina */}
                <group position={[-1.7, 0, 0]} rotation={[t * 14, 0, 0]}>
                  {Array.from({ length: 14 }).map((_, i) => <group key={i} rotation={[(i * 2 * Math.PI) / 14, 0, 0]}><Caixa p={[0, 0.46, 0]} t={[0.05, 0.8, 0.2]} cor="#e3e8ee" raio={0.01} sombra={false} /></group>)}
                </group>
                {/* ar jogado para trás */}
                {ar > 0.02 && (
                  <Fluxo rotas={Array.from({ length: 7 }).map((_, i) => { const a = (i * 2 * Math.PI) / 7; return [[2.5, Math.sin(a) * 0.35, Math.cos(a) * 0.35], [9, Math.sin(a) * 0.7, Math.cos(a) * 0.7], [16, Math.sin(a) * 1.1, Math.cos(a) * 1.1]] as V[]; })} t={t} n={3} vel={9} cor="#d8f2ff" w={0.2} op={ar} tam={3.2} />
                )}
                <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.0, 1.1, 3.6, 18]} /><meshStandardMaterial color="#dfe4ea" roughness={0.3} metalness={0.35} transparent opacity={1 - 0.8 * Math.max(mc, raiox)} depthWrite={Math.max(mc, raiox) < 0.4} /></mesh>
                {mc > 0.01 && [-0.7, 0.1, 0.9].map((x, i) => (
                  <group key={i} position={[x, 0, 0]} rotation={[t * (10 + i * 4), 0, 0]} scale={mc}>
                    {Array.from({ length: 12 }).map((_, j) => <group key={j} rotation={[(j * 2 * Math.PI) / 12, 0, 0]}><Caixa p={[0, 0.42 - i * 0.07, 0]} t={[0.1, 0.62 - i * 0.12, 0.2]} cor={i === 2 ? "#ff8a2a" : "#ffd23f"} raio={0.01} sombra={false} /></group>)}
                  </group>
                ))}
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
      {/* cauda: aba deitada (estH), aba em pé (estV) e as bordas móveis, cada uma com cor própria */}
      <group position={[17, 0.7, 0]} scale={pop(eH)} visible={eH > 0.01}>
        <group position={[-17, -0.7, 0]}>
          <mesh geometry={estD} position={[0, 0.7, 0]}><Mat cor="#e4e9ee" rug={0.45} met={0.2} dupla /></mesh>
          <mesh geometry={estE} position={[0, 0.7, 0]}><Mat cor="#e4e9ee" rug={0.45} met={0.2} dupla /></mesh>
        </group>
      </group>
      <group position={[17, 4, 0]} scale={pop(eV)} visible={eV > 0.01}>
        <group position={[-17, -4, 0]}>
          <mesh geometry={leme}><meshStandardMaterial color={AZUL_LIV} roughness={0.4} side={THREE.DoubleSide} /></mesh>
          <mesh position={[16.6, 5.4, 0]} rotation={[0, 0, 0.78]}><boxGeometry args={[5.2, 0.5, 0.34]} /><meshStandardMaterial color={LARANJA} roughness={0.5} /></mesh>
        </group>
      </group>
      {(ctl.profV ?? 0) > 0.01 && [-1, 1].map((sd) => (
        <group key={`p${sd}`} position={[17.7, 0.64, 0]} rotation={[0, 0, ctl.prof ?? 0]} scale={pop(ctl.profV ?? 0)}><Caixa p={[0.6, 0, sd * 3.7]} t={[1.2, 0.14, 5.4]} cor="#ff4a2a" raio={0.03} sombra={false} /></group>
      ))}
      {(ctl.ailV ?? 0) > 0.01 && [-1, 1].map((sd) => (
        <group key={`a${sd}`} position={[6.4, -0.55, sd * 13.8]} rotation={[0, 0, sd * (ctl.ail ?? 0)]} scale={pop(ctl.ailV ?? 0)}><Caixa p={[0.5, 0, 0]} t={[1.1, 0.14, 4.6]} cor="#ffd23f" raio={0.03} sombra={false} /></group>
      ))}
      {(ctl.lemeV ?? 0) > 0.01 && (
        <group position={[18.2, 4.8, 0]} rotation={[0, ctl.leme ?? 0, 0]} scale={pop(ctl.lemeV ?? 0)}><Caixa p={[0.65, 0, 0]} t={[1.3, 6.4, 0.38]} cor="#b06bff" raio={0.03} sombra={false} /></group>
      )}
      {(ctl.flapV ?? 0) > 0.01 && [-1, 1].map((sd) => (
        <group key={`f${sd}`} position={[4.93 + 1.1 * (ctl.flap ?? 0), -0.55 - 0.2 * (ctl.flap ?? 0), sd * 6.5]} rotation={[0, 0, -0.62 * (ctl.flap ?? 0)]} scale={pop(ctl.flapV ?? 0)}><Caixa p={[0.65, 0, 0]} t={[1.3, 0.14, 5]} cor="#17a845" raio={0.03} sombra={false} /></group>
      ))}
      {/* ar da cabine: do motor, esquentado, passa pelo trocador, esfria e entra; sai por uma saída atrás */}
      {(ctl.duto ?? 0) > 0.02 && <Duto k={ctl.duto ?? 0} t={t} />}
      {inchar > 0.02 && Array.from({ length: 7 }).map((_, i) => [-1, 1].map((sd) => <Seta key={`${i}${sd}`} a={[-12 + i * 3.6, sd * 1.7, 0.2]} b={[-12 + i * 3.6, sd * (1.7 + 1.1 * inchar), 0.2]} cor={VERMELHO} w={0.16} op={inchar} />))}
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

type GenteE = { x?: unknown; y?: unknown; z?: unknown; rot?: unknown; acao?: string | [number | string, string, string?][]; exp?: Expressao3D; ant?: Anterior; entradaDur?: number; pose?: Pose3D | [number | string, Pose3D][]; incl?: unknown; esc?: number; penas?: boolean; penaEsc?: unknown; mala?: boolean; copo?: number; tontura?: number; tosse?: number; suor?: unknown; ate?: number | string; de?: number | string; bate?: [number | string, number | string] };

const AsaBraco: React.FC<{ lado: 1 | -1; t: number; esc: number }> = ({ lado, t, esc }) => (
  <group scale={esc}><PenasAsa lado={lado} t={t} flex={esc > 1.05 ? 0 : 0.16} re={0.05 * (esc > 1.05 ? 0.55 : 1)} /></group>
);

const Pessoa: React.FC<{ g: GenteE; p: number; t: number; tAbs: number }> = ({ g, p, t, tAbs }) => {
  if (g.ate !== undefined && p > pos(g.ate)) return null;
  if (g.de !== undefined && p < pos(g.de)) return null;
  const { acao, exp, pose } = poseGente(g, { p, t: t, tAbs, incl: nv(g.incl, p, 0), chv: pos });
  if (g.bate && p >= pos(g.bate[0]) && p <= pos(g.bate[1])) {
    const b = 1.2 + 0.8 * Math.sin(t * 15);
    Object.assign(pose, { "ombroE.z": b, "ombroD.z": -b, "cotoveloE.x": 0, "cotoveloD.x": 0, "cotoveloE.z": 0, "cotoveloD.z": 0, "ombroE.x": 0, "ombroD.x": 0, maos: 1 });
  }
  const { x, y, z, rot } = posicaoGente(g, t, { x: nv(g.x, p, 0), y: nv(g.y, p, 0), z: nv(g.z, p, 0), rot: nv(g.rot, p, 0) });
  const copoK = nv(g.copo, p, 0);
  const s = g.esc ?? 1.06;
  const ang = pose["ombroE.z"] ?? 0.12;
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={s}>
      <Boneco3D p={zeca} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} suor={nv(g.suor, p, 0)} t={tAbs} />
      {g.mala && (
        <group position={[0.3, 0.3, 0.02]} rotation={[0, 0, 0.04 * Math.sin(tAbs * 2)]}>
          <Caixa p={[0, 0, 0]} t={[0.1, 0.3, 0.4]} cor="#c0572b" raio={0.03} />
          <Caixa p={[0, 0.17, 0]} t={[0.05, 0.05, 0.16]} cor="#3a2a22" raio={0.01} />
          <Caixa p={[0.055, 0, 0]} t={[0.01, 0.06, 0.34]} cor="#e0b24a" raio={0.005} sombra={false} />
        </group>
      )}
      {nv(g.copo, p, 0) > 0 && (
        <group scale={1.7} position={[-0.22 + 0.03 * Math.sin(tAbs * 19) * copoK, 1.0 + 0.015 * Math.sin(tAbs * 23) * copoK, 0.46]} rotation={[0.18 * Math.sin(tAbs * 17) * copoK, 0, 0.2 * Math.sin(tAbs * 13) * copoK]}>
          <mesh><cylinderGeometry args={[0.09, 0.075, 0.15, 14]} /><meshStandardMaterial color="#f4f6f8" roughness={0.4} /></mesh>
          <mesh position={[0, 0.07, 0]} rotation={[0.2 * Math.sin(tAbs * 21) * copoK, 0, 0.25 * Math.cos(tAbs * 15) * copoK]}><cylinderGeometry args={[0.078, 0.078, 0.012, 14]} /><meshStandardMaterial color="#5b3417" roughness={0.5} /></mesh>
          <mesh position={[0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.045, 0.012, 6, 12, Math.PI]} /><meshStandardMaterial color="#f4f6f8" roughness={0.4} /></mesh>
        </group>
      )}
      {(g.tontura ?? 0) > 0.01 && Array.from({ length: 4 }).map((_, i) => {
        const a = tAbs * 3.2 + (i * Math.PI) / 2;
        return (
          <group key={i} position={[Math.cos(a) * 0.3, 1.62 + 0.04 * Math.sin(a * 2), Math.sin(a) * 0.3]} rotation={[tAbs * 2, tAbs * 3 + i, 0]} scale={0.07 * (g.tontura ?? 0)}>
            <mesh><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color="#ffe14a" /></mesh>
            <mesh rotation={[0, 0, Math.PI / 4]} scale={[0.5, 1.9, 0.5]}><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color="#fff6a0" /></mesh>
          </group>
        );
      })}
      {(g.tosse ?? 0) > 0.01 && [0, 1, 2].map((i) => {
        const u = (tAbs * 1.6 + i / 3) % 1;
        return <mesh key={i} position={[0.0 + 0.04 * Math.sin(i * 4), 1.36 + 0.22 * u, 0.2 + 0.45 * u]} scale={(0.035 + 0.08 * u) * (g.tosse ?? 0)}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.85 * (1 - u)} depthWrite={false} /></mesh>;
      })}
      {g.penas && (
        <group position={[0, 1.09, 0]}>
          <group position={[0.205, 0, 0]} rotation={[0, 0, pose["ombroE.z"] ?? ang]}><AsaBraco lado={1} t={tAbs} esc={nv(g.penaEsc, p, 1)} /></group>
          <group position={[-0.205, 0, 0]} rotation={[0, 0, pose["ombroD.z"] ?? -ang]}><AsaBraco lado={-1} t={tAbs} esc={nv(g.penaEsc, p, 1)} /></group>
        </group>
      )}
    </group>
  );
};

/** O Zeca "de reação": preso à câmera (sempre inteiro, à esquerda, sobre uma nuvenzinha), para ele aparecer mesmo nos planos abertos do céu. `sx`/`sy` em ndc (-1..1), `h` = altura em ndc. */
type ZT = GenteE & { sx: number; sy: number; h: number; nuvem?: boolean; rotY?: number };
const ZecaTela: React.FC<{ z: ZT; p: number; t: number; tAbs: number }> = ({ z, p, t, tAbs }) => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  if (z.ate !== undefined && p > pos(z.ate)) return null;
  if (z.de !== undefined && p < pos(z.de)) return null;
  cam.updateMatrixWorld();
  const d = 7;
  const meiaH = d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  const P = cam.position.clone().addScaledVector(dir, d).addScaledVector(right, z.sx * meiaH * cam.aspect).addScaledVector(up, z.sy * meiaH);
  const K = (z.h * meiaH) / 1.7;
  const entra = 0.9 + 0.1 * suave(clamp01(p * 12));
  return (
    <group position={[P.x, P.y, P.z]} quaternion={cam.quaternion.clone()}>
      <group scale={K * entra} rotation={[0, z.rotY ?? 0.35, 0]}>
        {z.nuvem !== false && <Nuvem p={[0, -0.28, -0.1]} s={0.5} />}
        <Pessoa g={{ ...z, x: 0, y: 0, z: 0, rot: 0 }} p={p} t={t} tAbs={tAbs} />
      </group>
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
      <Texto3D texto="80 t" p={[1.3, hA + 1.2, 0.3]} h={1.7} cor="#ffd23f" escala={suave(clamp01((k - 0.55) / 0.35))} />
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
      <hemisphereLight args={[n("poente") > 0.5 ? "#ffd9b8" : "#cfe8ff", "#6f9a55", 1.05]} />
      <directionalLight position={[40, 70, 50]} intensity={1.7} color={n("poente") > 0.5 ? "#ffb877" : "#fff3dc"} />
      <fog attach="fog" args={[n("poente") > 0.5 ? "#f6cfa6" : "#d9ebf7", 34, 78]} />
      {n("poente") > 0.5 ? <Dome topo="#4a5fb0" meio="#f4a36a" base="#ffd9a8" /> : <Dome topo="#3d8fe0" meio="#9fd0f5" base="#e4f1fa" />}
      <Chao cor="#6aae4f" cor2="#62a448" listras />
      <Nuvens t={tEp} vel={3.2} />
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
      {aviao && (cena.aviaoDe === undefined || p >= pos(cena.aviaoDe as number | string)) && (
        <group position={[n("aviaoX"), n("aviaoY", 24), n("aviaoZ", -55)]} rotation={[n("aviaoRoll"), n("aviaoYaw"), n("aviaoPitch")]}>
          <Aviao penas={cena.aviaoPenas === true} t={tEp} {...aviaoProps(cena, n)} />
        </group>
      )}
      {cena.caminhao === true && <group position={[-11, 0, -14]} rotation={[0, 0.6, 0]}><Caminhao /></group>}
      {cena.barra !== undefined && <group position={[1.8, 0, -6]} rotation={[0, -0.25, 0]}><BarraPeso k={n("barra")} t={t} /></group>}
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
      {n("carimboE") > 0.01 && <Carimbo texto="ESTOL" p={[-0.2, yf + 1.55, 1]} h={0.95} k={n("carimboE")} />}
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
      <Dome ox={120} topo="#3d8fe0" meio="#9fd0f5" base="#e4f1fa" />
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
        <Auto cor="#d8392e" variante="sedan" vidroOp={0.1} giro={tEp * 8} />
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
      <Dome ox={180} topo="#4d7fc9" meio="#f4b58a" base="#ffd9a8" />
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
        <group position={[n("aviaoX"), n("aviaoY", 24), n("aviaoZ", -50)]} rotation={[n("aviaoRoll"), n("aviaoYaw"), n("aviaoPitch")]}><Aviao t={tEp} {...aviaoProps(cena, n)} /></group>
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
        {cena.velocimetro !== undefined && <group position={[-1.9, 1.7, 1.3]} rotation={[0, -0.6, 0]} scale={0.6}><Velocimetro v={n("velocimetro")} /></group>}
      </group>
    </group>
  );
};

/* ---------- céu: o avião grande em voo ---------- */

const CeuPalco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { cena, n, tEp, gente, p, t } = C;
  const s4 = n("setas4");
  const corte = n("corteAsa");
  const ax = n("aviaoX");
  const ay = n("aviaoY", 30);
  const az = n("aviaoZ", 0);
  const esc = n("aviaoEsc", 0.78);
  const lift = n("liftK", 1);
  const pend = n("pendurado");
  const setaAsa = n("setaAsa");
  const emp = n("setaEmp");
  const escuro = n("escuro") > 0.5;
  const ek = Math.round(clamp01(n("escuro")) * 20) / 20;
  const tb = n("turbul");
  const bob = tb * (0.45 * Math.sin(tEp * 2.3) + 0.2 * Math.sin(tEp * 5.1));
  const F: Foil = { alpha: 0.05, k: 1.9, yf: 0, sep: 0, t: tEp, esp: 0.05 };
  const E = 2.8;
  return (
    <group>
      <hemisphereLight args={["#cfe8ff", "#7fa0c8", escuro ? 0.7 : 1.1]} />
      <directionalLight position={[40, 80, 60]} intensity={escuro ? 1.2 : 1.7} color="#fff3dc" />
      <fog attach="fog" args={[escuro ? "#1b2c4a" : "#d9ebf7", 66, 79]} />
      <Dome ox={PALCO_X.ceu} topo={mixCor("#2f7fd8", "#0b1530", ek)} meio={mixCor("#8cc8f5", "#1f3a6b", ek)} base={mixCor("#e0f0fb", "#3d5f94", ek)} />
      {cena.nuvens !== "nenhuma" && !escuro && <NuvensCeu t={tEp} ay={ay} dy={n("nuvY")} vel={n("nuvVel", 1)} />}
      {escuro && <Estrelas t={tEp} ox={PALCO_X.ceu} />}
      {n("interroga") > 0.01 && <Interroga k={n("interroga")} pos={[-8, ay - 6, 20]} esc={4} />}
      {tb > 0.02 && [-6, -2, 2, 6].map((x, i) => (
        <Seta key={i} a={[x * esc * 1.3, (i % 2 ? 4.5 : -4.5) * esc + ay, -3]} b={[x * esc * 1.3, (i % 2 ? 2.2 : -2.2) * esc + ay, -3]} cor={AZUL_AR} w={0.1 * esc} op={0.8 * tb} />
      ))}
      <group position={[ax, ay + bob, az]} rotation={[n("aviaoRoll"), n("aviaoYaw"), n("aviaoPitch")]}>
        <group scale={esc}><Aviao t={tEp} {...aviaoProps(cena, n)} /></group>
        {s4 > 0.02 && (
          <group>
            <Seta a={[0, 0, 6]} b={[0, 11 * s4 * lift, 6]} cor={LARANJA} w={0.55} />
            <Seta a={[0, 0, 6]} b={[0, -11 * s4, 6]} cor="#9aa3ad" w={0.55} />
            {cena.soVert !== true && <Seta a={[-8, 0, 6]} b={[-8 - 6 * s4, 0, 6]} cor="#6bd36b" w={0.4} />}
            {cena.soVert !== true && <Seta a={[8, 0, 6]} b={[8 + 6 * s4, 0, 6]} cor="#c88bff" w={0.4} />}
            <Texto3D texto="SUSTENTAÇÃO" p={[0, (11 * lift + 2.6) * s4, 6]} h={2.6} cor={LARANJA} escala={s4} />
            <Texto3D texto="PESO" p={[0, -13.6 * s4, 6]} h={2.6} cor="#cfd6dd" escala={s4} />
            {cena.soVert !== true && <Texto3D texto="EMPUXO" p={[-11, 2.4, 6]} h={2.2} cor="#6bd36b" escala={s4} />}
            {cena.soVert !== true && <Texto3D texto="ARRASTO" p={[11.5, 2.4, 6]} h={2.2} cor="#c88bff" escala={s4} />}
          </group>
        )}
        {pend > 0.02 && (
          <group>
            <Seta a={[0, -2.6 * esc, 3]} b={[0, -2.6 * esc - 9 * pend, 3]} cor="#9aa3ad" w={0.8} />
            <Texto3D texto="80 t" p={[0, -2.6 * esc - 9 * pend - 2.6, 3]} h={4} cor="#ffd23f" escala={pend} />
            {[-1, 1].map((sd) => <Seta key={sd} a={[1.5 * esc, 0.2 * esc, sd * 9 * esc]} b={[1.5 * esc, 0.2 * esc + 10 * pend, sd * 9 * esc]} cor={LARANJA} w={0.7} />)}
          </group>
        )}
        {setaAsa > 0.02 && [-1, 1].map((sd) => <Seta key={sd} a={[1.5 * esc, 0, sd * 9 * esc]} b={[1.5 * esc, 4 * setaAsa, sd * 9 * esc]} cor={LARANJA} w={0.3} />)}
        {n("forcaCauda") > 0.02 && (
          <group>
            <Seta a={[23 * esc, -4 * esc, 3]} b={[19 * esc, -0.6 * esc, 3]} cor={AZUL_AR} w={0.3} op={n("forcaCauda")} />
            <Seta a={[16.5 * esc, -3.5 * esc, 3]} b={[16.5 * esc, 0.2 * esc + 3 * n("forcaCauda") * esc, 3]} cor={LARANJA} w={0.4} op={n("forcaCauda")} />
          </group>
        )}
        {emp > 0.02 && <Seta a={[-17 * esc, 1.5 * esc, 3]} b={[-17 * esc - 7 * emp, 1.5 * esc, 3]} cor="#6bd36b" w={0.5} />}
        {corte > 0.02 && (
          <group position={[3.4 * esc, -0.54 * esc, 8.2 * esc]} scale={E * esc}>
            <FoilFlow F={F} t={tEp} linhas={corte} corpo={false} zLinha={0.0} larg={0.04} escalaSeta={1.2} setasAr={corte} />
          </group>
        )}
      </group>
      <group position={[0, bob, 0]}>{gente.map((gd, i) => <Pessoa key={i} g={gd} p={p} t={t} tAbs={tEp} />)}</group>
      {n("homenagem") > 0.01 && <Homenagem k={n("homenagem")} ox={PALCO_X.ceu} />}
    </group>
  );
};

/* ---------- cartão de homenagem (preso à câmera, dentro da coluna segura) ---------- */

const Homenagem: React.FC<{ k: number; ox?: number }> = ({ k, ox = 0 }) => {
  const { camera } = useThree();
  const { tex, razao } = useMemo(() => {
    const W = 1000;
    const H = 640;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(10,18,34,0.92)";
    g.beginPath();
    g.roundRect(8, 8, W - 16, H - 16, 40);
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = "#e8c66a";
    g.stroke();
    g.textAlign = "center";
    g.textBaseline = "middle";
    const ajusta = (txt: string, px: number, max: number) => {
      let f = px;
      g.font = `700 ${f}px ${FONT}, sans-serif`;
      while (g.measureText(txt).width > max && f > 20) { f -= 2; g.font = `700 ${f}px ${FONT}, sans-serif`; }
    };
    g.fillStyle = "#e8c66a";
    ajusta("EM HOMENAGEM", 44, W - 140);
    g.fillText("EM HOMENAGEM", W / 2, 70);
    g.fillStyle = "#ffffff";
    ajusta("TURBULÊNCIA NÃO", 118, W - 120);
    g.fillText("TURBULÊNCIA NÃO", W / 2, 200);
    ajusta("DERRUBA AVIÃO", 118, W - 120);
    g.fillText("DERRUBA AVIÃO", W / 2, 330);
    g.strokeStyle = "rgba(232,198,106,0.7)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(W / 2 - 170, 410);
    g.lineTo(W / 2 + 170, 410);
    g.stroke();
    g.fillStyle = "#e8c66a";
    ajusta("— Lito, Aviões e Músicas", 64, W - 120);
    g.fillText("— Lito, Aviões e Músicas", W / 2, 490);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { tex: t, razao: W / H };
  }, []);
  if (k <= 0.02) return null;
  const cam = camera as THREE.PerspectiveCamera;
  cam.updateMatrixWorld();
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  const d = 6;
  const alt = 2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const larg = alt * cam.aspect;
  const w = larg * 0.62;
  const up = cam.up.clone().applyQuaternion(cam.quaternion);
  const p = cam.position.clone().addScaledVector(dir, d).addScaledVector(up, alt * 0.215);
  p.x -= ox;
  const e = 0.94 + 0.06 * suave(clamp01(k * 2));
  return (
    <sprite position={p} scale={[w * e, (w / razao) * e, 1]} renderOrder={30}>
      <spriteMaterial map={tex} transparent depthTest={false} opacity={clamp01(k * 2.5)} />
    </sprite>
  );
};

/* ---------- janela em close: mapa de tensão ---------- */

const desenhaJanela = (forma: number, rach: number) => {
  const W = 440;
  const H = 780;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#d9dee4";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(90,100,112,0.35)";
  g.lineWidth = 3;
  for (let y = 40; y < H; y += 90) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const cx = W / 2;
  const cy = H / 2;
  const w = lerp(260, 190, forma);
  const h = lerp(200, 190, forma);
  const r = lerp(6, 95, forma);
  const caminho = (m: number) => {
    g.beginPath();
    g.roundRect(cx - w / 2 - m, cy - h / 2 - m, w + 2 * m, h + 2 * m, r + m);
  };
  // mapa de tensão: cantos vermelhos (quadrada) ou anel suave (redonda)
  const cantos: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const forte = 1 - forma;
  cantos.forEach(([sx, sy]) => {
    const px = cx + (sx * (w / 2 - r * 0.3));
    const py = cy + (sy * (h / 2 - r * 0.3));
    const gr = g.createRadialGradient(px, py, 4, px, py, 170);
    gr.addColorStop(0, `rgba(255,30,20,${0.95 * forte})`);
    gr.addColorStop(0.35, `rgba(255,140,30,${0.6 * forte})`);
    gr.addColorStop(1, "rgba(255,200,40,0)");
    g.fillStyle = gr;
    g.fillRect(px - 170, py - 170, 340, 340);
  });
  g.save();
  caminho(0);
  g.clip();
  g.restore();
  for (let m = 70; m > 0; m -= 7) {
    caminho(m);
    g.strokeStyle = `rgba(255,${Math.round(210 - m * 1.2)},60,${0.1 * forma * (1 - m / 80)})`;
    g.lineWidth = 8;
    g.stroke();
  }
  // linhas de força que contornam a janela
  g.strokeStyle = "rgba(40,70,120,0.55)";
  g.lineWidth = 4;
  for (let i = -5; i <= 5; i++) {
    const y0 = cy + i * 62;
    g.beginPath();
    for (let x = 0; x <= W; x += 10) {
      const dx = (x - cx) / (w / 2 + 40);
      const sob = Math.exp(-dx * dx * 1.4);
      const dy0 = Math.abs(y0 - cy) < h / 2 + 55 ? Math.sign(y0 - cy || 1) * (h / 2 + 55 - Math.abs(y0 - cy)) * sob * 0.9 : 0;
      const y = y0 + dy0;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  // janela
  caminho(10);
  g.fillStyle = "#eef1f4";
  g.fill();
  caminho(0);
  g.fillStyle = "#1d3b63";
  g.fill();
  g.fillStyle = "rgba(160,210,255,0.35)";
  g.beginPath();
  g.roundRect(cx - w / 2 + 14, cy - h / 2 + 14, w * 0.4, h - 28, Math.max(r - 10, 4));
  g.fill();
  // rachadura que cresce do canto de cima à direita
  if (rach > 0.01) {
    const pts: [number, number][] = [[0, 0], [30, -26], [52, -14], [84, -52], [112, -40], [150, -92], [176, -80], [214, -134]];
    const ox = cx + w / 2 - 6;
    const oy = cy - h / 2 + 6;
    const L = pts.length - 1;
    g.strokeStyle = "#0b0d10";
    g.lineWidth = 7;
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(ox, oy);
    for (let i = 1; i <= L; i++) {
      const u = clamp01(rach * L - (i - 1));
      if (u <= 0) break;
      const [px, py] = pts[i - 1];
      const [qx, qy] = pts[i];
      g.lineTo(ox + px + (qx - px) * u, oy + py + (qy - py) * u);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

const JanelaPalco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n } = C;
  const forma = Math.round(clamp01(n("forma")) * 20) / 20;
  const rach = Math.round(clamp01(n("rachadura")) * 25) / 25;
  const tex = useMemo(() => desenhaJanela(forma, rach), [forma, rach]);
  return (
    <group>
      <hemisphereLight args={["#ffffff", "#8fa3b8", 1.2]} />
      <mesh position={[0, 0, -0.05]}><planeGeometry args={[40, 40]} /><meshBasicMaterial color="#0f1722" /></mesh>
      <group scale={1 + 0.05 * n("inchar")}>
        <mesh position={[0, 0.3, 0]}><planeGeometry args={[4.4, 7.8]} /><meshBasicMaterial map={tex} /></mesh>
      </group>
      {n("inchar") > 0.02 && [[-2.9, 3.4], [2.9, 3.4], [-2.9, -2.8], [2.9, -2.8], [0, 4.6], [0, -4.0]].map(([x, y], i) => <Seta key={i} a={[x * 0.75, y * 0.75, 0.3]} b={[x * (0.75 + 0.3 * n("inchar")), y * (0.75 + 0.3 * n("inchar")), 0.3]} cor={VERMELHO} w={0.14} op={n("inchar")} />)}
      {n("carimbo") > 0.01 && <Carimbo texto="COMET · ANOS 1950" p={[0, -2.9, 0.4]} h={0.62} k={n("carimbo")} />}
    </group>
  );
};

/* ---------- cena ---------- */

type Ctx = { cena: Record<string, unknown>; p: number; t: number; tEp: number; n: (k: string, pad?: number) => number; gente: GenteE[] };

type EtiqDef = { texto: string; para: V; off: [number, number]; cor?: string; av?: V };

const AviaoCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio, trechos }) => {
  TRS = trechos ?? [];
  DUR = p > 0.002 ? t / p : 5;
  const n = (k: string, pad = 0) => nv(cena[k], p, pad);
  const { camera: camR } = useThree();
  // Tomadas: cortes dentro da batida (palco e câmera próprios por trecho da fala). A câmera da batida é substituída pela da tomada.
  const tomadas = cena.tomadas as { ate: number | string; palco: string; camera: { de: PontoCamera; para?: PontoCamera } }[] | undefined;
  let palco = (cena.palco as string | undefined) ?? "campo";
  if (tomadas && tomadas.length) {
    let idx = tomadas.length - 1;
    for (let i = 0; i < tomadas.length; i++) if (p <= pos(tomadas[i].ate)) { idx = i; break; }
    const ini = idx > 0 ? pos(tomadas[idx - 1].ate) : 0;
    const fim = pos(tomadas[idx].ate);
    const tm = tomadas[idx];
    palco = tm.palco;
    const kc = suave(clamp01((p - ini) / Math.max(fim - ini, 1e-3)));
    const cc = mistura(tm.camera.de, tm.camera.para ?? tm.camera.de, kc);
    const cam = camR as THREE.PerspectiveCamera;
    cam.position.set(...cc.pos);
    cam.fov = cc.fov ?? 50;
    cam.updateProjectionMatrix();
    cam.lookAt(new THREE.Vector3(...cc.alvo));
  }
  const X0 = PALCO_X[palco] ?? 0;
  const gente = (cena.gente as GenteE[] | undefined) ?? [];
  const C: Ctx = { cena, p, t, tEp: tEpisodio, n, gente };
  const et: Record<string, EtiqDef> = {
    placa: { texto: "PLACA", para: [0.1, 2.0, 0.4], off: [0.0, 1.0], cor: "#ffd23f" },
    ar: { texto: "AR PRA BAIXO", para: [1.9, 1.2, 0.4], off: [0.4, -1.3], cor: "#7fc4ff" },
    pressao: { texto: "PRESSÃO MENOR", para: [0.1, 2.7, 0.4], off: [0.0, 1.0], cor: "#7fc4ff" },
    asa: { texto: "ASA", para: [-0.1, 1.5, 0.0], off: [0.0, 1.1], cor: "#ffd23f" },
    placaM: { texto: "PLACA", para: [-0.1, 1.55, 0.0], off: [0.0, 1.0], cor: "#ffd23f" },
    // peças do avião grande (av = ponto no avião, coordenadas locais; ignora a rotação do avião)
    fuselagem: { texto: "FUSELAGEM", para: [0, 0, 0], av: [-6, 1.6, 1.9], off: [0.0, 1.7], cor: "#ffd23f" },
    turbina: { texto: "TURBINA", para: [0, 0, 0], av: [-1.9, -2.2, 6.7], off: [0.0, -1.9], cor: "#ffd23f" },
    cauda: { texto: "CAUDA", para: [0, 0, 0], av: [17.5, 4.6, 0.5], off: [-1.0, 2.6], cor: "#ffd23f" },
    profundor: { texto: "PROFUNDOR", para: [0, 0, 0], av: [18.4, 0.65, 3.7], off: [-1.0, 2.4], cor: "#ff6a4a" },
    aileron: { texto: "AILERON", para: [0, 0, 0], av: [7.0, -0.55, 13.8], off: [-1.5, 2.2], cor: "#ffd23f" },
    leme: { texto: "LEME", para: [0, 0, 0], av: [18.9, 5.6, 0.3], off: [0.5, 2.4], cor: "#c28bff" },
    flap: { texto: "FLAP", para: [0, 0, 0], av: [5.7, -0.6, 6.5], off: [0.0, 2.2], cor: "#5fe07b" },
    compressor: { texto: "COMPRESSOR", para: [0, 0, 0], av: [0.1, -1.55, 5.7], off: [-0.5, -2.1], cor: "#ffd23f" },
    quente: { texto: "AR QUENTE", para: [0, 0, 0], av: [0.7, -0.3, 3.8], off: [-0.5, 1.9], cor: "#ff9a4a" },
    frio: { texto: "AR FRIO", para: [0, 0, 0], av: [-3.5, 1.5, 0], off: [0.0, 2.0], cor: "#9fd8ff" },
    saida: { texto: "SAÍDA", para: [0, 0, 0], av: [7.4, -1.4, 0], off: [0.0, -1.8], cor: "#c88bff" },
    jq: { texto: "JANELA QUADRADA", para: [0, 2.6, 0.3], off: [0.0, 0.6], cor: "#ff7a6a" },
    jr: { texto: "JANELA REDONDA", para: [0, 2.6, 0.3], off: [0.0, 0.6], cor: "#9fe3ff" },
  };
  const S = n("etiqS", 1);
  const Kt = n("etiqK", 1);
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fimE] = (d ?? "0").split("-").map((x) => pos(x));
    return { c, ini, ok: !!et[c] && p >= ini && (fimE === undefined || Number.isNaN(fimE) || p <= fimE) };
  }).filter((x) => x.ok);
  const bx = palco === "campo" ? n("modeloX") : 0;
  const by = palco === "tunel" ? n("sobe") : palco === "pista" ? n("modeloY") : 0;
  return (
    <group>
      <group position={[X0, 0, 0]}>
        {palco === "campo" && <CampoPalco C={C} />}
        {palco === "tunel" && <TunelPalco C={C} />}
        {palco === "carro" && <CarroPalco C={C} />}
        {palco === "pista" && <PistaPalco C={C} />}
        {palco === "ceu" && <CeuPalco C={C} />}
        {palco === "janela" && <JanelaPalco C={C} />}
      </group>
      {((cena.zecaTela as ZT[] | undefined) ?? []).map((z, i) => <ZecaTela key={i} z={z} p={p} t={t} tAbs={tEpisodio} />)}
      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const esc = n("aviaoEsc", 0.78);
        const pp: V = d.av ? [n("aviaoX") + esc * d.av[0], n("aviaoY", 30) + esc * d.av[1], n("aviaoZ") + esc * d.av[2]] : d.para;
        const base: V = [pp[0] + bx + X0, pp[1] + by, pp[2]];
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
    return cena.escuro === 1 ? "#14234a" : pa === "janela" ? "#0f1722" : pa === "tunel" ? "#e2eaf1" : pa === "pista" ? "#f4b58a" : "#8cc8f5";
  },
  luzPropria: true,
  cameras: { geral: c([-4, 3, 14], [0, 3, 0], 50) },
};
