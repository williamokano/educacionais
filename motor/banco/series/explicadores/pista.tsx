import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, valor } from "../../../src/v3d/anima";
import { caminhoReto, CanoComFluxo, Trecho } from "../../../src/v3d/cano";
import { Nuvem } from "../../../src/v3d/particulas";
import { Caixa, Mat, rnd } from "../../../src/v3d/qualidade";
import { FONT } from "../../../src/theme";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Boneco3D } from "../../../src/v3d/personagem";
import { zeca } from "./zeca";
import { Cenario3D, Cenario3DProps, V3, Valor } from "../../../src/v3d/tipos";

// Pista do episódio 6 (freio de tambor, freio a disco e ABS): reta molhada de cinco faixas, chuva, poças e um carro de
// teste com corte da roda da frente (esquerda). Os carros andam para -z (a frente do carro é o lado -z). A estrada
// fica parada; o carro de teste anda por `carroZ`, o carro da frente por `obstZ` e os figurantes passam sozinhos.
// Campos da cena (número ou { de, para, ini, fim }; booleanos com true):
//   carroZ (m, padrão 0) · carroX · guinada (rad) · esterco (rad, rodas da frente) · cor do carro
//   giro 0..1 (rotação das rodas, 0 = travada, padrão 1) · derrapa 0..1 (marcas e fumaça de pneu)
//   corte: true = carro quase invisível, sem pneu: mostra a roda da frente esquerda por dentro, o óleo, o pedal e o pé
//   freio "tambor" | "disco" | "troca" (o tambor sai e o disco entra, campo `troca` 0..1) · pedal 0..1 · calor 0..1
//   oleo: true (óleo correndo) · gotas 0..1 (água entrando no tambor / saindo do disco) · fumaca 0..1
//   abs: true (roda dentada, sensor, controlador e válvulas) · ciclo: true (solta e aperta várias vezes por segundo)
//   etiq: lista de etiquetas 3D, cada uma "chave" ou "chave@0.4" (aparece aos 40% da batida). Chaves: pedal, mestre,
//     oleo, tambor, sapata, cilindro, disco, pinca, pastilha, sensor, controlador, valvulas
//   obst: false tira o carro da frente · obstZ (m, padrão -30; animável: o carro da frente andando) · luzFreio 0..1
//     (luz de freio do carro da frente) · haz: false (sem pisca-alerta) · batida 0..1 (empurrado e amassado)
//   chuva 0..1 (padrão 1) · fig: false tira os figurantes (nas cenas de corte eles saem sozinhos) · reverso: true (os figurantes andam para trás: rebobinando)
// O Zeca fica na calçada da direita (ZECA). As câmeras do corte (`roda`, `pedal`, `oleo`, `abs`) valem com carroZ = 0.

type V = V3;
export const ZECA = { pos: [12.2, 0] as [number, number], rot: -Math.PI / 2 };
const RODA_F: V = [-0.9, 0.33, -1.35]; // roda da frente esquerda, no referencial do carro
const AMARELO = "#ffd23f";
const OLEO = "#ffb020";
const HZ_CICLO = 2.4; // câmera lenta: soltar e apertar 2,4 vezes por segundo

const quente = (k: number, frio = "#767c85") => new THREE.Color(frio).lerp(new THREE.Color("#ff3a14"), clamp01(k)).getStyle();
const onda = (t: number, hz: number) => (t * hz) % 1;

/* ---------- pista ---------- */

const POCAS: [number, number, number][] = [[0.4, -6, 1.1], [-0.6, -18, 1.4], [3.4, -12, 1.0], [0.2, -40, 1.6], [-3.6, -26, 1.3], [0, 12, 1.2], [3.6, -34, 1.2]];
const ARVORES: [number, number][] = [[-14, 6], [-15, -14], [-13.5, -34], [-15, -58], [14.5, -8], [15.5, -26], [14, -48], [15, -66], [-14.5, -80], [14.5, -90]];

const Arvore: React.FC<{ x: number; z: number; s: number }> = ({ x, z, s }) => (
  <group position={[x, 0, z]} scale={s}>
    <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.18, 0.26, 2.4, 8]} /><Mat cor="#5b4330" /></mesh>
    <mesh position={[0, 3.4, 0]}><icosahedronGeometry args={[1.5, 1]} /><Mat cor="#3f6b3c" /></mesh>
    <mesh position={[0.6, 2.8, 0.3]}><icosahedronGeometry args={[1.0, 1]} /><Mat cor="#4a7a43" /></mesh>
  </group>
);

const Poste: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 3.2, 0]}><cylinderGeometry args={[0.07, 0.1, 6.4, 8]} /><Mat cor="#59636d" met={0.4} /></mesh>
    <Caixa p={[x < 0 ? 0.5 : -0.5, 6.35, 0]} t={[1.1, 0.1, 0.22]} cor="#59636d" />
    <mesh position={[x < 0 ? 1.0 : -1.0, 6.27, 0]}><boxGeometry args={[0.3, 0.05, 0.18]} /><meshBasicMaterial color="#fff2c4" /></mesh>
  </group>
);

const Pista: React.FC = () => {
  const tracos = Array.from({ length: 48 }, (_, i) => 40 - i * 6);
  return (
    <group>
      <Caixa p={[0, -0.025, -100]} t={[18, 0.05, 320]} cor="#454a52" raio={0.004} rug={0.28} met={0.15} verniz={0.7} />
      <Caixa p={[-9.6, 0.05, -100]} t={[1.2, 0.12, 320]} cor="#a9a59c" raio={0.01} />
      <Caixa p={[9.6, 0.05, -100]} t={[1.2, 0.12, 320]} cor="#a9a59c" raio={0.01} />
      <Caixa p={[-31, -0.1, -100]} t={[42, 0.1, 320]} cor="#41603b" raio={0.004} rug={0.95} />
      <Caixa p={[31, -0.1, -100]} t={[42, 0.1, 320]} cor="#41603b" raio={0.004} rug={0.95} />
      {[-1.86, -1.74].map((x) => <mesh key={x} position={[x, 0.004, -100]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.1, 320]} /><meshBasicMaterial color="#e5b92e" /></mesh>)}
      {[-8.7, 8.7].map((x) => <mesh key={x} position={[x, 0.004, -100]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.12, 320]} /><meshBasicMaterial color="#d8dce0" /></mesh>)}
      {[-5.4, 1.8, 5.4].flatMap((x) => tracos.map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.12, 3]} /><meshBasicMaterial color="#d8dce0" /></mesh>
      )))}
      {POCAS.map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.008, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[r, r * 1.7, 1]}>
          <circleGeometry args={[1, 24]} /><meshStandardMaterial color="#5f7186" roughness={0.05} metalness={0.35} transparent opacity={0.55} />
        </mesh>
      ))}
      {ARVORES.map(([x, z], i) => <Arvore key={i} x={x} z={z} s={0.9 + rnd(i) * 0.5} />)}
      {[-60, -36, -12, 12].flatMap((z) => [-10.3, 10.3].map((x) => <Poste key={`${x}${z}`} x={x} z={z} />))}
    </group>
  );
};

const Chuva: React.FC<{ forca: number; z: number; t: number }> = ({ forca, z, t }) => {
  if (forca <= 0.02) return null;
  const n = Math.round(240 * forca);
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const x = (rnd(i) - 0.5) * 22;
        const zz = z + 8 - rnd(i + 50) * 40;
        const y = 9 - ((t * 7.5 + rnd(i + 99)) % 1) * 9;
        return <mesh key={i} position={[x, y, zz]}><boxGeometry args={[0.012, 0.5, 0.012]} /><meshBasicMaterial color="#d3e6f6" transparent opacity={0.55} /></mesh>;
      })}
    </group>
  );
};

/* ---------- carros (low poly bonito: capô, cabine em trapézio, vidro ciano, faróis, para-choques) ---------- */

/** Perfil de lado (pontos [z, y]) extrudado na largura `larg`. A frente do carro é -z. */
const Perfil: React.FC<{ pts: [number, number][]; larg: number; cor: string; op?: number; verniz?: number; bisel?: number }> = ({ pts, larg, cor, op, verniz = 0.8, bisel = 0.035 }) => {
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    pts.forEach(([u, y], i) => (i ? sh.lineTo(u, y) : sh.moveTo(u, y)));
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: larg - bisel * 2, bevelEnabled: true, bevelSize: bisel, bevelThickness: bisel, bevelSegments: 2, curveSegments: 1 });
    g.translate(0, 0, -(larg - bisel * 2) / 2);
    return g;
  }, [pts, larg, bisel]);
  return <mesh geometry={geo} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow><Mat cor={cor} op={op} verniz={verniz} /></mesh>;
};

const Pilar: React.FC<{ a: [number, number]; b: [number, number]; x: number; cor: string; op?: number }> = ({ a, b, x, cor, op }) => {
  const dz = b[0] - a[0];
  const dy = b[1] - a[1];
  return <Caixa p={[x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2]} t={[0.07, Math.hypot(dz, dy), 0.07]} r={[Math.atan2(dz, dy), 0, 0]} cor={cor} raio={0.01} op={op} />;
};

const VARIANTES = {
  sedan: { corpo: [[-2.1, 0.34], [-2.1, 0.64], [-1.7, 0.73], [-0.95, 0.8], [1.5, 0.8], [2.05, 0.74], [2.1, 0.62], [2.1, 0.34]], cab: [[-0.95, 0.8], [-0.38, 1.38], [0.8, 1.38], [1.35, 0.8]] },
  hatch: { corpo: [[-1.9, 0.34], [-1.9, 0.64], [-1.55, 0.73], [-0.85, 0.8], [1.6, 0.8], [1.9, 0.72], [1.9, 0.34]], cab: [[-0.85, 0.8], [-0.3, 1.38], [1.1, 1.4], [1.75, 0.84]] },
} as Record<string, { corpo: [number, number][]; cab: [number, number][] }>;

const VIDRO = "#6fd3f0";
type AutoProps = { cor: string; variante?: string; op?: number; rodas?: boolean; freio?: number; pisca?: number };
const Auto: React.FC<AutoProps> = ({ cor, variante = "sedan", op, rodas = true, freio = 0, pisca = 0 }) => {
  const v = VARIANTES[variante];
  const cab = v.cab;
  const frente = v.corpo[0][0];
  const tras = v.corpo[v.corpo.length - 1][0];
  const meio = (cab[1][0] + cab[2][0]) / 2;
  const sx = [-0.78, 0.78];
  return (
    <group>
      <Perfil pts={v.corpo} larg={1.8} cor={cor} op={op} />
      {/* cabine: vidro, com o teto e os pilares na cor do carro */}
      <Perfil pts={cab} larg={1.5} cor={VIDRO} op={op} verniz={1} bisel={0.01} />
      <Caixa p={[0, cab[1][1] + 0.01, (cab[1][0] + cab[2][0]) / 2]} t={[1.6, 0.08, cab[2][0] - cab[1][0] + 0.14]} cor={cor} raio={0.02} op={op} />
      {sx.map((x) => (
        <group key={x}>
          <Pilar a={cab[0]} b={cab[1]} x={x} cor={cor} op={op} />
          <Pilar a={cab[3]} b={cab[2]} x={x} cor={cor} op={op} />
          <Pilar a={[meio, 0.8]} b={[meio, cab[1][1]]} x={x} cor={cor} op={op} />
        </group>
      ))}
      {/* retrovisores */}
      {[-1, 1].map((s) => <Caixa key={s} p={[s * 1.0, 1.0, cab[0][0] - 0.02]} t={[0.14, 0.09, 0.06]} cor={cor} raio={0.015} op={op} />)}
      {/* faróis, grade e para-choques */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.62, 0.63, frente - 0.015]}><boxGeometry args={[0.34, 0.15, 0.05]} /><meshStandardMaterial color="#ffe95a" emissive="#ffd23f" emissiveIntensity={0.9} /></mesh>
          <mesh position={[s * 0.8, 0.63, frente - 0.015]}><boxGeometry args={[0.05, 0.15, 0.052]} /><meshStandardMaterial color="#ff9a1a" /></mesh>
          <mesh position={[s * 0.64, 0.65, tras + 0.015]}><boxGeometry args={[0.34, 0.13, 0.05]} /><meshStandardMaterial color="#d62c2c" emissive="#ff2a1a" emissiveIntensity={0.3 + freio * 2.4 + pisca * 2} /></mesh>
        </group>
      ))}
      <mesh position={[0, 0.6, frente - 0.01]}><boxGeometry args={[0.55, 0.1, 0.04]} /><meshStandardMaterial color="#26292e" /></mesh>
      <Caixa p={[0, 0.4, frente - 0.04]} t={[1.9, 0.17, 0.16]} cor="#8d949c" raio={0.03} op={op} />
      <Caixa p={[0, 0.4, tras + 0.04]} t={[1.9, 0.17, 0.16]} cor="#8d949c" raio={0.03} op={op} />
      {/* cavas das rodas e rodas (a do corte é desenhada à parte) */}
      {[frente + 0.75, tras - 0.8].flatMap((z) => sx.map((x) => (
        <mesh key={`${x}${z}`} position={[x * 1.157, 0.33, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.41, 0.41, 0.04, 18]} /><meshStandardMaterial color="#1b1d20" transparent={op !== undefined} opacity={op ?? 1} /></mesh>
      )))}
      {rodas && [frente + 0.75, tras - 0.8].flatMap((z) => sx.map((x) => <RodaParada key={`${x}${z}`} p={[x * 1.15, 0.33, z]} />))}
    </group>
  );
};

const RodaParada: React.FC<{ p: V }> = ({ p }) => (
  <group position={p} rotation={[0, 0, Math.PI / 2]}>
    <mesh><cylinderGeometry args={[0.33, 0.33, 0.22, 16]} /><Mat cor="#1b1d20" rug={0.9} /></mesh>
    <mesh position={[0, -Math.sign(p[0]) * 0.115, 0]}><cylinderGeometry args={[0.2, 0.2, 0.02, 12]} /><Mat cor="#9aa0a8" met={0.6} /></mesh>
    {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[0, -Math.sign(p[0]) * 0.125, 0]} rotation={[0, (i / 5) * Math.PI, 0]}><boxGeometry args={[0.36, 0.012, 0.05]} /><Mat cor="#3a3f46" /></mesh>)}
  </group>
);

const Onibus: React.FC<{ cor: string }> = ({ cor }) => (
  <group>
    <Caixa p={[0, 1.75, 0]} t={[2.5, 3.0, 10.5]} cor={cor} raio={0.2} verniz={0.7} />
    <Caixa p={[0, 2.3, 0]} t={[2.54, 0.85, 9.7]} cor="#6fd3f0" raio={0.05} />
    <Caixa p={[0, 1.55, -0.02]} t={[2.52, 0.22, 10.2]} cor="#f4f1ea" raio={0.03} />
    <mesh position={[0, 2.3, -5.27]}><boxGeometry args={[2.1, 0.9, 0.04]} /><meshStandardMaterial color="#6fd3f0" /></mesh>
    {[-0.9, 0.9].map((x) => <mesh key={x} position={[x, 0.95, -5.27]}><boxGeometry args={[0.4, 0.2, 0.04]} /><meshStandardMaterial color="#ffe95a" emissive="#ffd23f" emissiveIntensity={0.8} /></mesh>)}
    {[[-1.15, -3.4], [1.15, -3.4], [-1.15, 3.0], [1.15, 3.0]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.5, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.5, 0.5, 0.3, 16]} /><Mat cor="#1b1d20" rug={0.9} /></mesh>)}
  </group>
);

const Moto: React.FC<{ cor: string }> = ({ cor }) => (
  <group>
    <Caixa p={[0, 0.65, 0.05]} t={[0.3, 0.38, 1.1]} cor={cor} raio={0.08} verniz={0.7} />
    <Caixa p={[0, 0.95, 0.35]} t={[0.3, 0.12, 0.6]} cor="#22262b" raio={0.04} />
    <Caixa p={[0, 1.3, 0.25]} t={[0.42, 0.6, 0.26]} cor="#2a3f5a" raio={0.09} />
    <mesh position={[0, 1.78, 0.2]}><sphereGeometry args={[0.18, 12, 10]} /><Mat cor="#f2c230" /></mesh>
    <mesh position={[0, 1.0, -0.55]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.55, 0.04, 0.04]} /><Mat cor="#22262b" /></mesh>
    {[-0.72, 0.72].map((z) => <mesh key={z} position={[0, 0.32, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.32, 0.32, 0.12, 14]} /><Mat cor="#1b1d20" rug={0.9} /></mesh>)}
  </group>
);

type Fig = { x: number; tipo: "sedan" | "hatch" | "onibus" | "moto"; cor: string; z0: number; vz: number };
const FIGURANTES: Fig[] = [
  { x: 7.2, tipo: "hatch", cor: "#f0b429", z0: -10, vz: -8 },
  { x: 7.2, tipo: "sedan", cor: "#8e5bd4", z0: 24, vz: -7 },
  { x: 7.2, tipo: "moto", cor: "#cf3a2b", z0: -70, vz: -12 },
  { x: -3.6, tipo: "onibus", cor: "#2f8f7a", z0: -90, vz: 10 },
  { x: -3.6, tipo: "sedan", cor: "#4aa35a", z0: -30, vz: 12 },
  { x: -7.2, tipo: "hatch", cor: "#e9ecef", z0: -62, vz: 11 },
  { x: -7.2, tipo: "sedan", cor: "#2d6fd1", z0: -8, vz: 9 },
];
const volta = (z: number) => ((((z + 140) % 190) + 190) % 190) - 140; // dá a volta entre z = -140 e z = 50

const Figurantes: React.FC<{ t: number; reverso: boolean }> = ({ t, reverso }) => (
  <group>
    {FIGURANTES.map((f, i) => {
      const z = volta(f.z0 + f.vz * (reverso ? -t : t));
      return (
        <group key={i} position={[f.x, 0, z]} rotation={[0, f.vz > 0 ? Math.PI : 0, 0]}>
          {f.tipo === "onibus" ? <Onibus cor={f.cor} /> : f.tipo === "moto" ? <Moto cor={f.cor} /> : <Auto cor={f.cor} variante={f.tipo} />}
        </group>
      );
    })}
  </group>
);

/** O carro da frente: anda (obstZ muda), acende a luz de freio e, parado, liga o pisca-alerta. */
const Parado: React.FC<{ z: number; t: number; amassa: number; luzFreio: number; haz: boolean }> = ({ z, t, amassa, luzFreio, haz }) => {
  const pisca = haz && luzFreio < 0.5 && Math.sin(t * Math.PI * 2 * 1.6) > 0 ? 1 : 0;
  return (
    <group position={[0, 0, z]}>
      <group scale={[1, 1, 1 - amassa * 0.18]} position={[0, 0, amassa * 0.35]}>
        <Auto cor="#3b82c4" variante="sedan" freio={luzFreio > 0.5 ? 1 : 0} pisca={pisca} />
      </group>
    </group>
  );
};

/* ---------- etiquetas 3D (sempre viradas para a câmera, por cima de tudo) ---------- */

type Etiq = { texto: string; de: V; para: V };
const ETIQUETAS: Record<string, Etiq> = {
  pedal: { texto: "PEDAL", de: [0.4, 0.12, -0.55], para: [-0.42, 0.33, -0.45] },
  mestre: { texto: "CILINDRO MESTRE", de: [0.3, 1.0, -0.8], para: [-0.42, 0.57, -1.15] },
  oleo: { texto: "ÓLEO", de: [-0.95, 0.95, -1.15], para: [-0.55, 0.65, -1.33] },
  tambor: { texto: "TAMBOR", de: [-1.15, -0.15, -1.35], para: [-0.95, 0.12, -1.35] },
  sapata: { texto: "SAPATAS", de: [-1.15, 0.85, -1.45], para: [-0.96, 0.46, -1.52] },
  cilindro: { texto: "CILINDRO DE ÓLEO", de: [-1.15, 1.0, -1.25], para: [-0.96, 0.52, -1.35] },
  disco: { texto: "DISCO", de: [-1.15, -0.15, -1.35], para: [-0.95, 0.1, -1.35] },
  pinca: { texto: "PINÇA", de: [-1.15, 0.86, -1.5], para: [-0.99, 0.62, -1.38] },
  pastilha: { texto: "PASTILHAS", de: [-1.15, 1.0, -1.3], para: [-0.99, 0.58, -1.35] },
  sensor: { texto: "SENSOR", de: [-1.15, 0.98, -1.55], para: [-0.76, 0.5, -1.35] },
  controlador: { texto: "CONTROLADOR", de: [-1.0, 1.15, -1.5], para: [-0.5, 0.76, -1.5] },
  valvulas: { texto: "VÁLVULAS", de: [-1.0, 1.3, -1.2], para: [-0.5, 0.82, -1.5] },
};

const Etiqueta: React.FC<{ chave: string }> = ({ chave }) => {
  const e = ETIQUETAS[chave];
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.font = `700 80px ${FONT}, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.lineWidth = 22;
    g.strokeStyle = "#241403";
    g.strokeText(e.texto, 320, 68);
    g.fillStyle = AMARELO;
    g.fillText(e.texto, 320, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [e.texto]);
  const dir = new THREE.Vector3(...e.para).sub(new THREE.Vector3(...e.de));
  const comp = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const meio: V = [(e.de[0] + e.para[0]) / 2, (e.de[1] + e.para[1]) / 2, (e.de[2] + e.para[2]) / 2];
  return (
    <group>
      <sprite position={e.de} scale={[0.5, 0.1, 1]} renderOrder={20}><spriteMaterial map={tex} transparent depthTest={false} /></sprite>
      <mesh position={meio} quaternion={q} renderOrder={19}><cylinderGeometry args={[0.005, 0.005, comp, 6]} /><meshBasicMaterial color={AMARELO} depthTest={false} /></mesh>
      <mesh position={e.para} renderOrder={19}><sphereGeometry args={[0.016, 8, 8]} /><meshBasicMaterial color={AMARELO} depthTest={false} /></mesh>
    </group>
  );
};

/* ---------- o carro de teste e o corte da roda ---------- */

type Corte = { pedal: number; calor: number; ang: number; abs: boolean; gotas: number; oleo: boolean; t: number };

/** Tambor visto de fora (eixo ao longo de x, lado de fora = -x): tambor translúcido azul-acinzentado, sapatas laranja que se abrem, cilindro amarelo. */
const Tambor: React.FC<Corte> = ({ pedal, calor, ang, gotas, t }) => {
  const cor = quente(calor, "#7c93a8");
  const s = 1 + 0.2 * pedal; // as sapatas crescem até encostar na parede do tambor
  return (
    <group>
      <group rotation={[ang, 0, 0]}>
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh><cylinderGeometry args={[0.245, 0.245, 0.14, 40, 1, true]} /><meshStandardMaterial color={cor} emissive={quente(calor, "#000000")} emissiveIntensity={0.9 * calor} roughness={0.4} metalness={0.4} transparent opacity={0.38} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        </group>
        <mesh position={[-0.07, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.245, 0.012, 8, 40]} /><Mat cor="#c9d1d9" met={0.7} rug={0.4} /></mesh>
        <mesh position={[0, 0.245, 0]}><boxGeometry args={[0.15, 0.03, 0.04]} /><Mat cor="#2b2f35" /></mesh>
      </group>
      <mesh position={[0.075, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.25, 0.25, 0.012, 40]} /><Mat cor="#aab4bf" met={0.3} rug={0.6} /></mesh>
      <mesh position={[0.095, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.065, 0.065, 0.03, 16]} /><Mat cor="#9aa3ad" met={0.7} /></mesh>
      {/* sapatas: anel plano laranja (a lona cinza por fora) */}
      <group scale={[1, s, s]}>
        {[1, -1].map((lado) => {
          const cs = lado === 1 ? Math.PI - 1.25 : -1.25;
          return (
            <group key={lado} position={[0, 0, lado * 0.02 * pedal]}>
              <mesh position={[-0.03, 0, 0]} rotation={[0, Math.PI / 2, 0]}><ringGeometry args={[0.165, 0.2, 24, 1, cs, 2.5]} /><meshStandardMaterial color="#ff8a1f" roughness={0.6} side={THREE.DoubleSide} emissive="#ff6a1a" emissiveIntensity={0.35 + 0.5 * pedal} /></mesh>
              <mesh position={[-0.03, 0, 0]} rotation={[0, Math.PI / 2, 0]}><ringGeometry args={[0.2, 0.215, 24, 1, cs, 2.5]} /><meshStandardMaterial color="#5a5f66" roughness={0.9} side={THREE.DoubleSide} /></mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.215, 0.215, 0.06, 24, 1, true, cs, 2.5]} /><meshStandardMaterial color="#5a5f66" roughness={0.9} side={THREE.DoubleSide} /></mesh>
            </group>
          );
        })}
        <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.07, 0.06, 0.1 + 0.04 * pedal]} /><Mat cor="#ffd23f" met={0.3} rug={0.4} emissivo={OLEO} brilho={0.3 + 0.7 * pedal} /></mesh>
      </group>
      {gotas > 0.02 && Array.from({ length: 12 }).map((_, i) => {
        const u = (t * 0.6 + rnd(i)) % 1;
        const a = rnd(i + 5) * Math.PI * 2;
        const r = 0.5 * (1 - u) * gotas + 0.05;
        return <mesh key={i} position={[-0.12, Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4]}><sphereGeometry args={[0.014, 6, 6]} /><meshBasicMaterial color="#7fc4ff" /></mesh>;
      })}
    </group>
  );
};

/** Disco com pinça: o disco gira ao ar livre, a pinça aperta as duas pastilhas. */
const Disco: React.FC<Corte> = ({ pedal, calor, ang, gotas, t, abs }) => {
  const cor = quente(calor * 0.55, "#c3cad2");
  const folga = 0.019 + 0.03 * (1 - pedal);
  return (
    <group>
      <group rotation={[ang, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.28, 0.28, 0.03, 40]} /><meshStandardMaterial color={cor} roughness={0.35} metalness={0.8} transparent={abs} opacity={abs ? 0.28 : 1} emissive={quente(calor * 0.55, "#000000")} emissiveIntensity={0.8 * calor} /></mesh>
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return <mesh key={i} position={[0, Math.cos(a) * 0.19, Math.sin(a) * 0.19]} rotation={[a, 0, 0]}><boxGeometry args={[0.034, 0.05, 0.012]} /><Mat cor="#2b2f35" /></mesh>;
        })}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0.03, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.06, 20]} /><Mat cor="#8a929c" met={0.7} /></mesh>
      </group>
      <Caixa p={[-0.08, 0.265, 0]} t={[0.025, 0.13, 0.17]} cor="#d94a3a" raio={0.01} verniz={0.6} />
      <Caixa p={[0.08, 0.265, 0]} t={[0.025, 0.13, 0.17]} cor="#d94a3a" raio={0.01} verniz={0.6} />
      <Caixa p={[0, 0.34, 0]} t={[0.185, 0.035, 0.17]} cor="#d94a3a" raio={0.01} verniz={0.6} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * folga, 0.255, 0]}><boxGeometry args={[0.014, 0.09, 0.12]} /><meshStandardMaterial color="#ffb347" roughness={0.9} emissive="#ff6a1a" emissiveIntensity={0.3 + 0.6 * pedal} /></mesh>
      ))}
      {gotas > 0.02 && Array.from({ length: 16 }).map((_, i) => {
        const u = (t * 0.9 + rnd(i)) % 1;
        const a = rnd(i + 5) * Math.PI * 2;
        const r = 0.28 + u * 0.55 * gotas;
        return <mesh key={i} position={[-0.05, Math.cos(a) * r, Math.sin(a) * r]}><sphereGeometry args={[0.014 * (1 - u * 0.5), 6, 6]} /><meshBasicMaterial color="#7fc4ff" transparent opacity={1 - u} /></mesh>;
      })}
    </group>
  );
};

/** Roda dentada (24 dentes) e o sensor que pisca a cada dente. */
const SensorRoda: React.FC<{ ang: number }> = ({ ang }) => {
  const dentes = 24;
  const fase = ((ang * dentes) / (Math.PI * 2)) % 1;
  const aceso = fase < 0.5 ? 1 : 0.1;
  return (
    <group>
      <group rotation={[ang, 0, 0]}>
        <mesh position={[0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.02, 24]} /><Mat cor="#8a929c" met={0.7} /></mesh>
        {Array.from({ length: dentes }).map((_, i) => {
          const a = (i / dentes) * Math.PI * 2;
          return <mesh key={i} position={[0.13, Math.cos(a) * 0.115, Math.sin(a) * 0.115]} rotation={[a, 0, 0]}><boxGeometry args={[0.022, 0.03, 0.022]} /><Mat cor="#e9ecef" met={0.8} /></mesh>;
        })}
      </group>
      <Caixa p={[0.13, 0.172, 0]} t={[0.05, 0.05, 0.07]} cor="#2d6fd1" raio={0.008} />
      <mesh position={[0.13, 0.2, 0]}><sphereGeometry args={[0.014, 8, 8]} /><meshStandardMaterial color="#7fe0ff" emissive="#7fe0ff" emissiveIntensity={aceso * 3} /></mesh>
    </group>
  );
};

const RodaNormal: React.FC<{ p: V; ang: number; esterco?: number }> = ({ p, ang, esterco = 0 }) => (
  <group position={p} rotation={[0, esterco, 0]}>
    <group rotation={[ang, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.33, 0.33, 0.22, 20]} /><Mat cor="#1b1d20" rug={0.9} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[Math.sign(p[0]) * 0.115, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.02, 16]} /><Mat cor="#9aa0a8" met={0.6} rug={0.4} /></mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[Math.sign(p[0]) * 0.128, 0, 0]} rotation={[(i / 5) * Math.PI, 0, 0]}><boxGeometry args={[0.012, 0.36, 0.05]} /><Mat cor="#3a3f46" /></mesh>
      ))}
    </group>
  </group>
);

/** O Zeca inteiro ao volante (escala 0,8 para caber sob o teto). A perna direita segue o pedal: `k` 0 = pé na pastilha, 1 = pisando fundo. */
const ESC_Z = 0.8;
const COXA = 0.29;
const CANELA = 0.27;
const X0 = -0.496;
const Y0 = 0.2;
const Z0 = -0.079;
const MOTORISTA: V = [X0, Y0, Z0]; // quadril do Zeca (o pé direito cai em x = -0.42, sobre o pedal)
const lim = (v: number) => Math.max(-1, Math.min(1, v));
/** Cinemática inversa da perna: tornozelo em (z para a frente, y) relativo ao quadril -> ângulos da coxa e do joelho. */
const ik = (z: number, y: number) => {
  const r = Math.min(Math.hypot(z, y), COXA + CANELA - 1e-3);
  const a = Math.atan2(z, -y);
  const b = Math.acos(lim((COXA * COXA + r * r - CANELA * CANELA) / (2 * COXA * r)));
  const g = Math.acos(lim((CANELA * CANELA + r * r - COXA * COXA) / (2 * CANELA * r)));
  const perna = -(a + b);
  return { perna, joelho: -(a - g) - perna };
};
/** tornozelo no mundo (z, y) quando o pedal está pisado `k` (a pastilha anda 12 cm para a frente e 3 cm para baixo) */
const tornozelo = (k: number) => ({ z: -0.31 - 0.12 * k, y: 0.3476 - 0.03 * k });
const pernaDe = (k: number) => {
  const t = tornozelo(k);
  return ik((Z0 - t.z) / ESC_Z, (t.y - Y0) / ESC_Z - 0.475);
};

const Motorista: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  const { perna, joelho } = pernaDe(k);
  const pose = { ...poseDe3D("sentado", t), "pernaD.x": perna, "joelhoD.x": joelho, "ombroE.x": -0.85, "ombroD.x": -0.85, "cotoveloE.x": -0.5, "cotoveloD.x": -0.5, "maos": 0.6 };
  return (
    <group position={MOTORISTA} rotation={[0, Math.PI, 0]} scale={ESC_Z}>
      <Boneco3D p={zeca} pose={pose} expressao={k > 0.5 ? "tenso" : "concentrado"} t={t} />
    </group>
  );
};

/** Pedal de freio suspenso (como no carro de verdade): o braço desce do pivô sob o painel até a pastilha de borracha virada para o
 *  motorista; uma haste presa a meio do braço atravessa a parede corta-fogo e empurra o servo-freio, que empurra o cilindro mestre. */
const PIVO: V = [0, 0.66, -0.62];
const PAREDE_Z = -0.85;
const Pedal: React.FC<{ pedal: number; oleo: boolean }> = ({ pedal, oleo }) => {
  const k = pedal;
  const t = tornozelo(k);
  const pad: V = [0, t.y - 0.02, t.z - 0.13]; // centro da pastilha: o bico do sapato encosta na face de trás
  const tampa: V = [0, pad[1], pad[2] - 0.05]; // ponta de baixo do braço, logo atrás da pastilha
  const A: V = [0, PIVO[1] + 0.3 * (tampa[1] - PIVO[1]), PIVO[2] + 0.3 * (tampa[2] - PIVO[2])]; // onde a haste se prende
  return (
    <group position={[-0.42, 0, 0]}>
      {/* banco, volante, assoalho e a parede corta-fogo (transparente), só para dar contexto */}
      <Caixa p={[-0.08, 0.5, -0.12]} t={[0.55, 0.12, 0.46]} cor="#3a3f46" raio={0.03} />
      <group position={[-0.08, 0.53, 0.09]} rotation={[0.2, 0, 0]}><Caixa p={[0, 0.4, 0]} t={[0.55, 0.8, 0.1]} cor="#3a3f46" raio={0.03} /></group>
      <Caixa p={[0, 0.27, -0.2]} t={[0.7, 0.03, 1.6]} cor="#2b2f35" raio={0.01} />
      <mesh position={[-0.08, 0.92, -0.62]} rotation={[-0.9, 0, 0]}><torusGeometry args={[0.17, 0.02, 8, 24]} /><Mat cor="#22262b" /></mesh>
      <Caixa p={[0.2, 0.56, PAREDE_Z]} t={[1.9, 0.6, 0.03]} cor="#5b6570" raio={0.005} op={0.35} />
      {/* braço, articulação, pastilha e haste */}
      <Barra a={PIVO} b={tampa} larg={0.045} esp={0.03} cor="#aeb6be" />
      <mesh position={PIVO} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.09, 12]} /><Mat cor="#e0493a" met={0.4} /></mesh>
      <Caixa p={[0, pad[1], pad[2] + 0.0]} t={[0.11, 0.095, 0.03]} cor="#22262b" raio={0.01} r={[-0.25, 0, 0]} />
      {[-0.025, 0, 0.025].map((dy) => <mesh key={dy} position={[0, pad[1] + dy, pad[2] + 0.017]}><boxGeometry args={[0.1, 0.006, 0.006]} /><meshStandardMaterial color="#5a5f66" /></mesh>)}
      <Barra a={tampa} b={[0, pad[1], pad[2] - 0.0]} larg={0.03} esp={0.03} cor="#aeb6be" />
      <Barra a={A} b={[0, A[1], PAREDE_Z - 0.02]} larg={0.025} esp={0.025} cor="#d9dde2" />
      <mesh position={A}><sphereGeometry args={[0.022, 10, 10]} /><Mat cor="#e0493a" met={0.4} /></mesh>
      {/* servo-freio (domo cinza) na frente da parede e, na ponta dele, o cilindro mestre com o êmbolo e o óleo */}
      <mesh position={[0, 0.561, PAREDE_Z - 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.2, 24]} /><meshStandardMaterial color="#6e7782" metalness={0.5} roughness={0.5} transparent opacity={0.75} /></mesh>
      <mesh position={[0, 0.561, PAREDE_Z - 0.2 - 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.2, 16]} /><meshPhysicalMaterial color="#cbd3da" transparent opacity={0.45} roughness={0.2} /></mesh>
      <mesh position={[0, 0.561, PAREDE_Z - 0.3 + 0.04 + k * 0.05]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.042, 0.042, 0.1, 16]} /><Mat cor={OLEO} emissivo={OLEO} brilho={oleo ? 0.7 : 0.2} /></mesh>
    </group>
  );
};

/** Faixa fina entre dois pontos (cinto de segurança). */
const Faixa: React.FC<{ a: V; b: V; larg?: number; cor?: string; esp?: number }> = ({ a, b, larg = 0.05, cor = "#1c1f24", esp = 0.012 }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.clone().normalize());
  return <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={q}><boxGeometry args={[larg, esp, d.length()]} /><meshStandardMaterial color={cor} roughness={0.8} metalness={esp > 0.02 ? 0.5 : 0} /></mesh>;
};
const Barra = Faixa;

/** Cinto de três pontos do motorista: do ombro (lado da porta) até o fecho no quadril, mais a faixa da cintura. */
const Cinto: React.FC = () => {
  const ombro: V = [-0.65, 1.06, -0.05];
  const fecho: V = [-0.39, 0.66, -0.2];
  const cintura: V = [-0.63, 0.64, -0.2];
  const cor = "#d6dade";
  return (
    <group>
      <Faixa a={ombro} b={fecho} larg={0.06} cor={cor} />
      <Faixa a={fecho} b={cintura} larg={0.06} cor={cor} />
      <Caixa p={[-0.39, 0.66, -0.2]} t={[0.08, 0.07, 0.035]} cor="#e0493a" raio={0.01} />
    </group>
  );
};

const Fio: React.FC<{ pts: V[]; t: number; ligado: boolean }> = ({ pts, t, ligado }) => {
  const tr: Trecho = { curva: caminhoReto(pts, 0.02), cores: [[0, AMARELO]], raio: 0.01, bola: 0.009, densidade: 40, cano: "#2c3136" };
  return <CanoComFluxo trecho={tr} t={t} deslocamento={ligado ? t * 0.9 : 0} />;
};

type Carro = {
  cor: string; corte: boolean; freio: string; pedal: number; calor: number; giro: number; esterco: number; t: number;
  gotas: number; abs: boolean; ciclo: boolean; oleo: boolean; fumaca: number; derrapa: number; troca: number; etiq: string[]; progresso: number;
};
const CarroDeTeste: React.FC<Carro> = (p) => {
  const { cor, corte, pedal, calor, giro, esterco, t, abs, ciclo } = p;
  // no ciclo do ABS a roda trava e destrava; o pedal ficaria apertando e soltando junto
  const onda_ = ciclo ? onda(t, HZ_CICLO) : 0;
  const trava = ciclo ? (onda_ < 0.45 ? onda_ / 0.45 : 1 - (onda_ - 0.45) / 0.55) : 0; // 0..1 dente de serra
  const giroEf = ciclo ? giro * (1 - 0.82 * trava) : giro;
  const pressao = ciclo ? 0.35 + 0.65 * trava : pedal;
  const ang = t * 26 * giroEf;
  const op = corte ? 0.07 : undefined;
  const sensorFio: V[] = [[RODA_F[0] + 0.13, RODA_F[1] + 0.2, RODA_F[2]], [RODA_F[0] + 0.13, 0.62, RODA_F[2]], [-0.5, 0.66, -1.5]];
  const trechoOleo: Trecho = {
    curva: caminhoReto([[-0.42, 0.561, -1.14], [-0.42, 0.62, -1.28], [-0.62, 0.66, -1.35], [RODA_F[0] + 0.1, 0.64, -1.35], [RODA_F[0] + 0.02, 0.56, -1.35]], 0.04),
    cores: [[0, OLEO]], raio: 0.024, bola: 0.019, densidade: 30, cano: "#e9dcc0",
  };
  const corteRoda: Corte = { pedal: pressao, calor, ang, abs, gotas: p.gotas, oleo: p.oleo, t };
  const mostra = (k: string) => p.etiq.some((e) => { const [c, d] = e.split("@"); return c === k && p.progresso >= (d ? parseFloat(d) : 0); });
  return (
    <group>
      <Auto cor={cor} variante="sedan" op={op} rodas={false} freio={pedal > 0.1 || ciclo ? 1 : 0} />
      {!corte && <RodaNormal p={[0.9, 0.33, -1.35]} ang={ang} esterco={esterco} />}
      {!corte && <RodaNormal p={[-0.9, 0.33, 1.3]} ang={ang} />}
      {!corte && <RodaNormal p={[0.9, 0.33, 1.3]} ang={ang} />}
      {!corte && <RodaNormal p={RODA_F} ang={ang} esterco={esterco} />}
      {corte && (
        <group>
          <group position={RODA_F} rotation={[0, esterco, 0]}>
            {p.freio === "troca" ? (
              <>
                {p.troca < 0.5 && <group position={[0, p.troca * 2.2, 0]}><Tambor {...corteRoda} /></group>}
                {p.troca > 0.4 && <group position={[0, (1 - clamp01((p.troca - 0.4) / 0.6)) * 1.1, 0]}><Disco {...corteRoda} /></group>}
              </>
            ) : p.freio === "disco" ? <Disco {...corteRoda} /> : <Tambor {...corteRoda} />}
            {abs && <SensorRoda ang={ang} />}
          </group>
          <Pedal pedal={pressao} oleo={p.oleo} />
          <Motorista k={pressao} t={t} />
          <Cinto />
          <CanoComFluxo trecho={trechoOleo} t={t} deslocamento={p.oleo ? t * 0.35 * (ciclo ? 0.5 + 0.5 * trava : 1) : 0} />
          {abs && (
            <group>
              <Caixa p={[-0.5, 0.7, -1.5]} t={[0.34, 0.1, 0.26]} cor="#252d36" raio={0.015} />
              <mesh position={[-0.6, 0.77, -1.5]}><sphereGeometry args={[0.017, 8, 8]} /><meshStandardMaterial color={trava > 0.5 ? "#ff5a3c" : "#3cff7a"} emissive={trava > 0.5 ? "#ff5a3c" : "#3cff7a"} emissiveIntensity={ciclo ? 3 : 1.2} /></mesh>
              {[-0.42, -0.5, -0.58].map((x, i) => (
                <mesh key={i} position={[x, 0.78, -1.5]}><cylinderGeometry args={[0.028, 0.028, 0.07, 10]} /><meshStandardMaterial color={ciclo && ((i === 0) === (trava > 0.5)) ? "#ff9a1a" : "#4a90d9"} emissive={ciclo && ((i === 0) === (trava > 0.5)) ? "#ff9a1a" : "#4a90d9"} emissiveIntensity={1.2} /></mesh>
              ))}
              <Fio pts={sensorFio} t={t} ligado />
            </group>
          )}
          {p.fumaca > 0.05 && <Nuvem t={t} de={[RODA_F[0] - 0.05, RODA_F[1] + 0.2, RODA_F[2]]} rumo={[-0.1, 1, 0]} n={10} tamanho={0.8} forca={p.fumaca} cor="#8c9199" />}
          {Object.keys(ETIQUETAS).filter(mostra).map((k) => <Etiqueta key={k} chave={k} />)}
        </group>
      )}
      {p.derrapa > 0.05 && (
        <group>
          {[-0.9, 0.9].flatMap((x) => [-1.35, 1.3].map((z) => (
            <Nuvem key={`${x}${z}`} t={t} de={[x, 0.15, z]} rumo={[0, 0.6, 0.3]} n={7} tamanho={1.1} forca={p.derrapa * 0.8} cor="#d7dce1" />
          )))}
          {[-0.9, 0.9].map((x) => <mesh key={x} position={[x, 0.006, 5.4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.2, 6.5 * p.derrapa]} /><meshBasicMaterial color="#22262b" transparent opacity={0.6} /></mesh>)}
        </group>
      )}
    </group>
  );
};

/* ---------- cena ---------- */

const PistaCena: React.FC<Cenario3DProps> = ({ cena, progresso, tEpisodio: t }) => {
  const b = (k: string) => cena[k] === true;
  const n = (k: string, padrao = 0) => valor(cena[k] as Valor, progresso, padrao);
  const carroZ = n("carroZ");
  const obstZ = n("obstZ", -30);
  const batida = n("batida");
  const chuva = n("chuva", 1);
  return (
    <group>
      <fog attach="fog" args={["#a9b7c3", 45, 150]} />
      <Pista />
      <Chuva forca={chuva} z={carroZ} t={t} />
      {cena.fig !== false && !b("corte") && <Figurantes t={t} reverso={b("reverso")} />}
      {cena.obst !== false && <Parado z={obstZ - batida * 2.6} t={t} amassa={batida} luzFreio={n("luzFreio")} haz={cena.haz !== false} />}
      <group position={[n("carroX"), 0, carroZ]} rotation={[0, n("guinada"), 0]}>
        <CarroDeTeste
          cor={(cena.cor as string | undefined) ?? "#e0493a"}
          corte={b("corte")}
          freio={(cena.freio as string | undefined) ?? "tambor"}
          pedal={n("pedal")}
          calor={n("calor")}
          giro={n("giro", 1)}
          esterco={n("esterco")}
          t={t}
          gotas={n("gotas")}
          abs={b("abs")}
          ciclo={b("ciclo")}
          oleo={b("oleo")}
          fumaca={n("fumaca")}
          derrapa={n("derrapa")}
          troca={n("troca")}
          etiq={(cena.etiq as string[] | undefined) ?? []}
          progresso={progresso}
        />
      </group>
      {batida > 0.02 && <Nuvem t={t} de={[0, 0.8, obstZ + 2]} rumo={[0, 1, 0]} n={12} tamanho={1.6} forca={Math.min(1, batida * 2)} cor="#e8e4dc" />}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 42) => ({ pos, alvo, fov });

export const pista: Cenario3D = {
  Cena: PistaCena,
  padrao: "geral",
  fundo: "#a9b7c3",
  cameras: {
    geral: c([0, 3.4, 9.5], [0, 1.0, -8], 55),
    lado: c([-8.5, 1.8, 0], [0, 0.8, -0.3], 40),
    roda: c([-2.9, 0.62, -1.35], [-0.9, 0.55, -1.35], 40),
    "roda-perto": c([-2.5, 0.55, -1.35], [-0.9, 0.45, -1.35], 40),
    pedal: c([3.1, 0.8, -0.2], [-0.42, 0.6, -0.5], 54),
    oleo: c([-4.0, 1.0, -0.9], [-0.55, 0.55, -1.0], 56),
    abs: c([-3.2, 1.0, -1.3], [-0.6, 0.65, -1.4], 48),
    zeca: c([9.6, 1.45, -3.2], [12.2, 1.25, 0], 36),
  },
};
