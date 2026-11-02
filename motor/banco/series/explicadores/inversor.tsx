import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, valor } from "../../../src/v3d/anima";
import { caminhoReto, caminhoSuave, CanoComFluxo, helice, Trecho } from "../../../src/v3d/cano";
import { Nuvem } from "../../../src/v3d/particulas";
import { Caixa, Mat, rnd, useSeg } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, V3, Valor } from "../../../src/v3d/tipos";
import { Ventilador } from "./sala";

// Bancada do episódio 5 (o inversor por dentro): a bateria do carro à esquerda, a TV à direita e, entre elas, as
// peças entrando em fila. A corrente anda no fio como bolinhas amarelas: contínua (num sentido), alternada (vai e volta)
// e alta frequência (tremendo).
// Campos da cena (número ou { de, para, ini, fim }; booleanos com true):
//   fila: true = as peças em fila (bateria → chaves → bobina → … → TV); sem fila, as chaves ficam junto da TV
//   chaves1 0..1 · par "a" | "b" | "alterna" | "aberta" (padrão alterna) · rapido 0..1 (chaveando 40 mil/s, borrão)
//   bobina "grande" | "pequena" · encolhe 0..1 (a grande vira a pequena) · aquece 0..1 (vermelha, fumaça) · balanca
//   retificador · capacitor 0..1 (nível) · chaves2 · filtro · transistores 0..1 (as alavancas viram transistores)
//   tv 0..1 · liga 0..1 (corrente nos fios, padrão 1) · motorQuente 0..1 · chuveiros · chip · entorta (alavanca + faísca)
//   carregador: true = só o carregador de celular aberto na bancada
//   maos: true = duas mãos segurando os fios da bateria na TV (sem chaves) · troca 0..1 (0 normal, 1 trocado)
//     trocaRapida 0..1 (as mãos trocando cada vez mais rápido, até virar borrão) · apagao: true (lampião aceso)
//   ventilador: true (no lugar do motor) · ventQuente 0..1 (chiando, vermelho, tremendo)
// A pessoa fica atrás da bancada, de frente para a câmera, em PESSOA (pos [-0.9, -0.85], rot 0.3).

type V = V3;
export const PESSOA = { pos: [-0.9, -0.85] as [number, number], rot: 0.3 };
const Y = 0.92; // tampo da bancada
const ZF = 0.1; // fio na frente das peças
// em fila (a partir da bobina) e sem fila (só bateria, chaves e TV, juntas para caber no vídeo vertical)
const X = { bat: -1.0, ch1: -0.62, bob: -0.2, ret: 0.18, cap: 0.42, ch2: 0.7, fil: 0.98, tv: 1.32 };
const PERTO = { bat: -0.55, ch1: 0.12, tv: 0.72 };
const AMARELO = "#ffd23f";

/* ---------- peças ---------- */

const Bancada: React.FC = () => (
  <group>
    <Caixa p={[0, -0.03, 0]} t={[8, 0.06, 6]} cor="#cdbfae" raio={0.004} rug={0.9} />
    <Caixa p={[0, 1.5, -1.25]} t={[8, 3, 0.1]} cor="#e3e8ea" raio={0.003} rug={0.7} />
    {Array.from({ length: 16 }).map((_, i) => <mesh key={i} position={[-4 + i * 0.5, 1.5, -1.198]}><planeGeometry args={[0.006, 3]} /><meshBasicMaterial color="#cdd6da" /></mesh>)}
    <Caixa p={[0.15, Y - 0.03, 0]} t={[3.0, 0.06, 0.8]} cor="#8a6a4f" raio={0.01} verniz={0.4} />
    {/* frente fechada (armário): esconde as pernas de quem está atrás da bancada */}
    <Caixa p={[0.15, (Y - 0.06) / 2, 0.36]} t={[2.96, Y - 0.06, 0.04]} cor="#7a5a40" raio={0.006} rug={0.7} />
    {[-1.3, 1.6].flatMap((x) => [-0.32, 0.32].map((z) => <Caixa key={`${x}${z}`} p={[x, (Y - 0.06) / 2, z]} t={[0.06, Y - 0.06, 0.06]} cor="#5d4330" raio={0.01} />))}
  </group>
);

const Bateria: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, Y, 0]}>
    <Caixa p={[0, 0.12, 0]} t={[0.32, 0.24, 0.2]} cor="#22262b" raio={0.015} rug={0.5} />
    <Caixa p={[0, 0.245, 0]} t={[0.3, 0.02, 0.18]} cor="#3a3f44" raio={0.008} />
    <mesh position={[0.1, 0.27, 0.05]}><cylinderGeometry args={[0.018, 0.018, 0.04, 12]} /><Mat cor="#d94a3a" /></mesh>
    <mesh position={[-0.1, 0.27, 0.05]}><cylinderGeometry args={[0.018, 0.018, 0.04, 12]} /><Mat cor="#2d6fd1" /></mesh>
    <Caixa p={[0, 0.13, 0.101]} t={[0.18, 0.06, 0.004]} cor="#f2c230" raio={0.004} />
  </group>
);

const TV: React.FC<{ x: number; liga: number; t: number }> = ({ x, liga, t }) => (
  <group position={[x, Y, -0.05]}>
    <Caixa p={[0, 0.02, 0]} t={[0.2, 0.04, 0.12]} cor="#16181c" raio={0.01} />
    <Caixa p={[0, 0.08, 0]} t={[0.04, 0.1, 0.03]} cor="#16181c" raio={0.006} />
    <Caixa p={[0, 0.32, 0]} t={[0.6, 0.38, 0.04]} cor="#16181c" raio={0.015} verniz={0.6} />
    <mesh position={[0, 0.32, 0.021]}><planeGeometry args={[0.54, 0.32]} />
      <meshBasicMaterial color={liga > 0.5 ? new THREE.Color("#4fb6ff").lerp(new THREE.Color("#ffd27a"), 0.5 + 0.5 * Math.sin(t * 1.3)).getStyle() : "#0c0d10"} />
    </mesh>
  </group>
);

/** Ponte H: quatro chaves de alavanca numa placa (ou transistores pretos, com `transistor`). */
const Ponte: React.FC<{ x: number; t: number; par: string; rapido: number; transistor: number; entorta?: boolean }> = ({ x, t, par, rapido, transistor, entorta }) => {
  const fase = Math.sin(t * Math.PI * 2 * (1.1 + rapido * 12)) >= 0;
  const estadoA = par === "a" ? true : par === "b" ? false : par === "aberta" ? null : fase;
  const cantos: [number, number, boolean][] = [[-0.08, -0.07, true], [0.08, 0.07, true], [0.08, -0.07, false], [-0.08, 0.07, false]];
  return (
    <group position={[x, Y, 0]}>
      <Caixa p={[0, 0.01, 0]} t={[0.3, 0.02, 0.26]} cor="#1f6f4a" raio={0.006} />
      {cantos.map(([cx, cz, diagA], i) => {
        const fechada = estadoA === null ? false : diagA === estadoA;
        const borrao = rapido > 0.5;
        return (
          <group key={i} position={[cx, 0.02, cz]}>
            {transistor < 0.5 ? (
              <>
                <Caixa p={[0, 0.02, 0]} t={[0.07, 0.04, 0.05]} cor="#2c3136" raio={0.008} />
                <group position={[0, 0.04, 0]} rotation={[0, 0, entorta && i === 0 ? 1.2 + Math.sin(t * 20) * 0.1 : borrao ? Math.sin(t * 60 + i) * 0.45 : fechada ? -0.5 : 0.5]}>
                  <Caixa p={[0, 0.045, 0]} t={[0.014, 0.09, 0.014]} cor={fechada || borrao ? "#ff6a3c" : "#d9dde1"} met={0.6} rug={0.3} raio={0.004} />
                </group>
              </>
            ) : (
              <>
                <Caixa p={[0, 0.045, 0]} t={[0.05, 0.06, 0.018]} cor="#15171a" raio={0.004} />
                <Caixa p={[0, 0.09, -0.004]} t={[0.05, 0.03, 0.006]} cor="#b9c0c8" met={0.8} rug={0.3} raio={0.003} />
                {[-0.015, 0, 0.015].map((lx) => <Caixa key={lx} p={[lx, 0.008, 0]} t={[0.004, 0.02, 0.004]} cor="#c3c9cf" met={0.8} rug={0.3} />)}
                <mesh position={[0.018, 0.05, 0.01]}><sphereGeometry args={[0.005, 8, 6]} /><meshBasicMaterial color={fechada || rapido > 0.5 ? "#7dff9a" : "#244a33"} /></mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
};

/** Transformador: núcleo quadrado com poucas voltas de um lado e muitas do outro. */
const Bobina: React.FC<{ x: number; tam: number; aquece: number; pulsa: number; t: number }> = ({ x, tam, aquece, pulsa, t }) => {
  const s = tam;
  const poucas = useMemo(() => caminhoSuave(helice(-0.05, 0.05, 0, 0, 0.05, 5)), []);
  const muitas = useMemo(() => caminhoSuave(helice(-0.06, 0.06, 0, 0, 0.05, 16)), []);
  const brilho = pulsa * (0.5 + 0.5 * Math.sin(t * 20));
  const cobre = new THREE.Color("#c8743c").lerp(new THREE.Color("#ff3b1a"), aquece).getStyle();
  return (
    <group position={[x, Y + 0.12 * s, 0]} scale={s}>
      {[[0, 0.1, 0, 0.26, 0.04], [0, -0.1, 0, 0.26, 0.04], [-0.11, 0, 0, 0.04, 0.24], [0.11, 0, 0, 0.04, 0.24]].map(([px, py, pz, w, h], i) => (
        <Caixa key={i} p={[px, py, pz]} t={[w, h, 0.06]} cor="#6f7780" met={0.5} rug={0.4} raio={0.004} emissivo="#5ab0ff" brilho={brilho} />
      ))}
      <group position={[-0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]}><mesh><tubeGeometry args={[poucas, 120, 0.012, 8, false]} /><meshStandardMaterial color={cobre} metalness={0.6} roughness={0.35} emissive="#ff3b1a" emissiveIntensity={aquece} /></mesh></group>
      <group position={[0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]}><mesh><tubeGeometry args={[muitas, 300, 0.006, 6, false]} /><meshStandardMaterial color="#c8743c" metalness={0.6} roughness={0.35} /></mesh></group>
      {aquece > 0.4 && <Nuvem t={t} de={[-0.11, 0.12, 0]} rumo={[0, 0.8, 0.1]} n={7} tamanho={0.35} forca={aquece} cor="#7a7f86" />}
    </group>
  );
};

const Balanca: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, Y, 0]}>
    <Caixa p={[0, 0.02, 0]} t={[0.36, 0.04, 0.3]} cor="#e9ecef" raio={0.01} />
    <Caixa p={[0, 0.045, 0]} t={[0.32, 0.01, 0.26]} cor="#c3c9cf" met={0.7} rug={0.25} raio={0.006} />
    <Caixa p={[0, 0.02, 0.152]} t={[0.12, 0.03, 0.004]} cor="#1b2a33" raio={0.004} />
  </group>
);

const Retificador: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, Y, 0]}>
    <Caixa p={[0, 0.01, 0]} t={[0.24, 0.02, 0.22]} cor="#1f6f4a" raio={0.006} />
    {[[-0.06, -0.05], [0.06, -0.05], [-0.06, 0.05], [0.06, 0.05]].map(([dx, dz], i) => (
      <group key={i} position={[dx, 0.035, dz]} rotation={[0, 0, Math.PI / 2]}>
        <mesh><cylinderGeometry args={[0.014, 0.014, 0.06, 12]} /><Mat cor="#15171a" rug={0.4} /></mesh>
        <mesh position={[0, 0.022, 0]}><cylinderGeometry args={[0.0145, 0.0145, 0.008, 12]} /><Mat cor="#d9dde1" met={0.6} /></mesh>
      </group>
    ))}
  </group>
);

const Capacitor: React.FC<{ x: number; nivel: number }> = ({ x, nivel }) => {
  const seg = useSeg();
  const h = 0.22;
  return (
    <group position={[x, Y, 0]}>
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.06, 0.06, h, seg(16, 36), 1, true]} /><meshPhysicalMaterial color="#3a6fd8" transparent opacity={0.35} roughness={0.2} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {nivel > 0.01 && <mesh position={[0, (h * nivel) / 2, 0]}><cylinderGeometry args={[0.055, 0.055, h * nivel, seg(16, 36)]} /><meshStandardMaterial color={AMARELO} emissive={AMARELO} emissiveIntensity={0.35} transparent opacity={0.8} /></mesh>}
      <mesh position={[0, h + 0.005, 0]}><cylinderGeometry args={[0.062, 0.062, 0.01, seg(16, 36)]} /><Mat cor="#b9c0c8" met={0.7} rug={0.3} /></mesh>
    </group>
  );
};

const Filtro: React.FC<{ x: number }> = ({ x }) => {
  const seg = useSeg();
  return (
    <group position={[x, Y, 0]}>
      <mesh position={[-0.05, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.045, 0.02, seg(10, 20), seg(20, 40)]} /><Mat cor="#c8743c" met={0.6} rug={0.35} /></mesh>
      <mesh position={[0.06, 0.06, 0]}><cylinderGeometry args={[0.03, 0.03, 0.12, seg(14, 28)]} /><Mat cor="#3a6fd8" rug={0.4} /></mesh>
    </group>
  );
};

const Chip: React.FC<{ x: number; t: number }> = ({ x, t }) => (
  <group position={[x, Y, 0.22]}>
    <Caixa p={[0, 0.01, 0]} t={[0.08, 0.016, 0.08]} cor="#15171a" raio={0.004} />
    {[-1, 1].flatMap((sx) => [-0.024, -0.008, 0.008, 0.024].map((z) => <Caixa key={`${sx}${z}`} p={[sx * 0.046, 0.004, z]} t={[0.012, 0.004, 0.006]} cor="#c3c9cf" met={0.8} />))}
    <mesh position={[0.025, 0.019, 0.025]}><sphereGeometry args={[0.005, 8, 6]} /><meshBasicMaterial color={Math.sin(t * 9) > 0 ? "#7dff9a" : "#244a33"} /></mesh>
  </group>
);

const Motor: React.FC<{ quente: number; t: number }> = ({ quente, t }) => {
  const seg = useSeg();
  const cor = new THREE.Color("#8d949b").lerp(new THREE.Color("#ff4a2a"), quente).getStyle();
  return (
    <group position={[1.05, Y, -0.24]}>
      <mesh position={[0, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.065, 0.065, 0.16, seg(16, 32)]} /><meshStandardMaterial color={cor} metalness={0.5} roughness={0.4} emissive="#ff3b1a" emissiveIntensity={quente * 0.7} /></mesh>
      <group position={[0.1, 0.07, 0]} rotation={[t * 15, 0, 0]}><Caixa p={[0, 0, 0]} t={[0.01, 0.12, 0.02]} cor="#2c3136" /></group>
      {quente > 0.4 && <Nuvem t={t} de={[0, 0.15, 0]} rumo={[0, 0.7, 0.1]} n={6} tamanho={0.3} forca={quente} cor="#7a7f86" />}
    </group>
  );
};

/** Dois chuveiros: um em contínua, outro em alternada, esquentando igual (valor eficaz). */
const Chuveiros: React.FC<{ t: number }> = ({ t }) => {
  const espiral = useMemo(() => caminhoSuave(helice(-0.06, 0.06, 0, 0, 0.025, 9)), []);
  return (
    <group>
      {[-0.2, 0.2].map((x, i) => (
        <group key={i} position={[x, Y + 0.35, -0.1]}>
          <mesh><cylinderGeometry args={[0.1, 0.075, 0.1, 24]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.45} roughness={0.2} depthWrite={false} /></mesh>
          <mesh><tubeGeometry args={[espiral, 160, 0.005, 6, false]} /><meshStandardMaterial color="#ff6a2a" emissive="#ff4a10" emissiveIntensity={1.6 + 0.15 * Math.sin(t * 6 + i)} /></mesh>
          <Caixa p={[0, -0.32, 0]} t={[0.02, 0.5, 0.02]} cor="#9aa3ab" raio={0.004} />
        </group>
      ))}
    </group>
  );
};

const Carregador: React.FC = () => (
  <group position={[0, Y, 0]}>
    <Caixa p={[-0.13, 0.05, 0]} t={[0.2, 0.1, 0.16]} cor="#f4f5f6" raio={0.02} rug={0.3} verniz={0.6} op={0.95} />
    <Caixa p={[0.13, 0.05, 0]} t={[0.2, 0.1, 0.16]} cor="#f4f5f6" raio={0.02} rug={0.3} verniz={0.6} op={0.95} />
    <Caixa p={[0.0, 0.11, 0]} t={[0.18, 0.012, 0.13]} cor="#1f6f4a" raio={0.004} />
    <Caixa p={[-0.03, 0.14, 0]} t={[0.05, 0.05, 0.05]} cor="#c8743c" raio={0.006} met={0.5} />
    <mesh position={[0.05, 0.14, 0.02]}><cylinderGeometry args={[0.015, 0.015, 0.05, 12]} /><Mat cor="#3a6fd8" /></mesh>
    <Caixa p={[0.05, 0.125, -0.035]} t={[0.03, 0.02, 0.02]} cor="#15171a" raio={0.003} />
    {[-0.02, 0.02].map((z) => <Caixa key={z} p={[-0.25, 0.05, z]} t={[0.05, 0.012, 0.008]} cor="#c3c9cf" met={0.8} />)}
  </group>
);

const Faiscas: React.FC<{ t: number; p: V }> = ({ t, p }) => (
  <group position={p}>
    {Array.from({ length: 8 }).map((_, i) => {
      const c = (t * 3 + rnd(i + 5)) % 1;
      const a = rnd(i) * Math.PI * 2;
      return <mesh key={i} position={[Math.cos(a) * c * 0.12, Math.sin(a * 1.7) * c * 0.1 + 0.05, Math.sin(a) * c * 0.12]} scale={0.03 * (1 - c)}><sphereGeometry args={[1, 6, 5]} /><meshBasicMaterial color={i % 2 ? "#fff6b0" : "#7fd3ff"} /></mesh>;
    })}
  </group>
);


/** Mãos trocando os fios da bateria de lugar: `k` 0 = normal (vermelho em cima), 1 = trocado. */
const Maos: React.FC<{ xb: number; xt: number; k: number; t: number; anda: number }> = ({ xb, xt, k, t, anda }) => {
  const xm = xt - 0.32; // onde as mãos seguram
  const yc = Y + 0.17, yb = Y + 0.07;
  const ya = yc + (yb - yc) * k, yv = yb + (yc - yb) * k; // vermelho e azul trocando de altura
  const fioV: Trecho = { curva: caminhoSuave([[xb + 0.1, Y + 0.27, 0.05], [xb + 0.35, Y + 0.3, ZF], [xm - 0.15, ya, ZF + 0.05], [xm, ya, ZF + 0.08], [xt - 0.32 + 0.04, ya, ZF + 0.08], [xt - 0.3, Y + 0.3 - (1 - k) * 0.0, -0.02]]), cores: [[0, AMARELO]], raio: 0.012, bola: 0.01, densidade: 40, cano: "#d94a3a" };
  const fioA: Trecho = { curva: caminhoSuave([[xb - 0.1, Y + 0.27, 0.05], [xb + 0.25, Y + 0.12, ZF + 0.12], [xm - 0.15, yv, ZF + 0.12], [xm, yv, ZF + 0.1], [xt - 0.32 + 0.04, yv, ZF + 0.1], [xt - 0.3, Y + 0.18, -0.02]]), cores: [[0, AMARELO]], raio: 0.012, bola: 0.01, densidade: 40, cano: "#2d6fd1" };
  const sentido = k < 0.5 ? 1 : -1;
  const Mao: React.FC<{ y: number; lado: number }> = ({ y, lado }) => (
    <group position={[xm, y, ZF + 0.12]} rotation={[0, 0, lado * 0.2]}>
      <Caixa p={[0, 0, 0]} t={[0.09, 0.07, 0.06]} cor="#c98f63" raio={0.03} rug={0.6} />
      <Caixa p={[0.055, 0.0, 0.005]} t={[0.03, 0.05, 0.05]} cor="#c98f63" raio={0.015} rug={0.6} />
      <Caixa p={[-0.09, -0.01, -0.01]} t={[0.1, 0.06, 0.06]} cor="#f2c230" raio={0.025} tecido />
    </group>
  );
  return (
    <group>
      <CanoComFluxo trecho={fioV} t={t} deslocamento={anda * sentido} />
      <CanoComFluxo trecho={fioA} t={t} deslocamento={-anda * sentido} />
      <Mao y={ya} lado={1} />
      <Mao y={yv} lado={-1} />
    </group>
  );
};

const Lampiao: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, Y, -0.2]}>
    <Caixa p={[0, 0.02, 0]} t={[0.1, 0.04, 0.1]} cor="#3a3f44" raio={0.01} />
    <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.045, 0.045, 0.14, 16]} /><meshStandardMaterial color="#fff2c4" emissive="#ffcf6a" emissiveIntensity={2.2} transparent opacity={0.9} /></mesh>
    <Caixa p={[0, 0.21, 0]} t={[0.1, 0.03, 0.1]} cor="#3a3f44" raio={0.01} />
    <pointLight position={[0, 0.15, 0.05]} color="#ffcf8a" intensity={1.2} distance={2.5} />
  </group>
);

const VentiladorBancada: React.FC<{ quente: number; t: number }> = ({ quente, t }) => {
  const treme = quente > 0.05 ? Math.sin(t * 50) * 0.03 * quente : 0;
  return (
    <group position={[1.15, 0, 0.75]}>
      <group scale={0.62} rotation={[0, 0, treme]}>
        <Ventilador p={[0, 0, 0]} giro={t * 27 * (1 - quente * 0.4)} rotY={-0.5} />
      </group>
      {quente > 0.05 && <mesh position={[0, 0.4, 0]}><sphereGeometry args={[0.22, 16, 12]} /><meshBasicMaterial color="#ff4a2a" transparent opacity={0.25 * quente} depthWrite={false} /></mesh>}
      {quente > 0.4 && <Nuvem t={t} de={[0, 0.6, 0]} rumo={[0, 0.7, 0.1]} n={6} tamanho={0.3} forca={quente} cor="#7a7f86" />}
    </group>
  );
};

/* ---------- fio com corrente ---------- */

type Modo = "cc" | "ca" | "hf" | "parado";
const desloc = (modo: Modo, t: number) => modo === "cc" ? t * 0.2 : modo === "ca" ? 0.06 * Math.sin(t * Math.PI * 2 * 1.1) : modo === "hf" ? 0.02 * Math.sin(t * Math.PI * 2 * 7) : 0;
const fio = (x0: number, x1: number): Trecho => ({ curva: caminhoReto([[x0, Y + 0.03, ZF + 0.08], [x1, Y + 0.03, ZF + 0.08]], 0.02), cores: [[0, AMARELO]], raio: 0.012, bola: 0.01, densidade: 40, cano: "#2c3136" });

/* ---------- cena ---------- */

const Inversor: React.FC<Cenario3DProps> = ({ cena, progresso, tEpisodio: t }) => {
  const b = (k: string) => cena[k] === true;
  const n = (k: string, padrao = 0) => valor(cena[k] as Valor, progresso, padrao);
  if (b("carregador")) {
    return (<group><Bancada /><Carregador /></group>);
  }
  const fila = b("fila");
  const temCh1 = n("chaves1", 1) > 0.5;
  const par = (cena.par as string | undefined) ?? "alterna";
  const rapido = n("rapido");
  const bobinaTipo = cena.bobina as string | undefined;
  const encolhe = n("encolhe", bobinaTipo === "pequena" ? 1 : 0);
  const aquece = n("aquece");
  const temRet = b("retificador");
  const nivel = n("capacitor", -1);
  const temCap = cena.capacitor !== undefined;
  const temCh2 = b("chaves2");
  const temFil = b("filtro");
  const transistor = n("transistores");
  const tv = n("tv");
  const liga = n("liga", 1) > 0.5;
  const maos = b("maos");
  const troca = n("troca");
  const trocaRapida = n("trocaRapida");
  const xCh1 = fila ? X.ch1 : PERTO.ch1;
  const xBat = fila ? X.bat : PERTO.bat;
  const xTv = fila ? X.tv : PERTO.tv;
  // nós presentes da esquerda para a direita e o modo da corrente depois de cada um
  const nos: [number, string][] = [[xBat, "bat"]];
  if (temCh1 && !maos) nos.push([xCh1, "ch1"]);
  if (bobinaTipo && fila) nos.push([X.bob, "bob"]);
  if (temRet) nos.push([X.ret, "ret"]);
  if (temCap) nos.push([X.cap, "cap"]);
  if (temCh2) nos.push([X.ch2, "ch2"]);
  if (temFil) nos.push([X.fil, "fil"]);
  nos.push([xTv, "tv"]);
  const modoDepois = (k: string): Modo => {
    if (!liga) return "parado";
    if (k === "bat" || k === "ret" || k === "cap") return "cc";
    if (k === "ch1") return bobinaTipo && fila && rapido > 0.5 ? "hf" : "ca";
    if (k === "bob") return rapido > 0.5 ? "hf" : "ca";
    return "ca";
  };
  const tamBobina = 1.2 - 0.7 * encolhe;
  return (
    <group>
      <Bancada />
      <Bateria x={xBat} />
      <TV x={xTv} liga={tv} t={t} />
      {maos && (() => {
        // trocando devagar (troca) ou cada vez mais rápido (trocaRapida): a posição vai e volta entre 0 e 1
        const f = 0.6 + trocaRapida * 9;
        const k = trocaRapida > 0.02 ? (Math.sin(t * Math.PI * 2 * f) > 0 ? 1 : 0) : troca;
        return <Maos xb={xBat} xt={xTv} k={k} t={t} anda={t * 0.25} />;
      })()}
      {b("apagao") && <Lampiao x={xTv + 0.45} />}
      {!maos && nos.slice(0, -1).map(([x0, k], i) => {
        const x1 = nos[i + 1][0];
        return <CanoComFluxo key={`${k}-${i}`} trecho={fio(x0 + 0.12, x1 - 0.12)} t={t} deslocamento={desloc(modoDepois(k), t)} />;
      })}
      {temCh1 && !maos && <Ponte x={xCh1} t={t} par={par} rapido={rapido} transistor={transistor} entorta={b("entorta")} />}
      {b("entorta") && <Faiscas t={t} p={[xCh1 - 0.08, Y + 0.12, -0.07]} />}
      {bobinaTipo && (
        <>
          {b("balanca") && <Balanca x={fila ? X.bob : 0} />}
          <group position={[0, b("balanca") ? 0.05 : 0, 0]}>
            <Bobina x={fila ? X.bob : 0} tam={tamBobina} aquece={aquece} pulsa={liga && (temCh1 && fila) ? 1 : 0} t={t} />
          </group>
        </>
      )}
      {temRet && <Retificador x={X.ret} />}
      {temCap && <Capacitor x={X.cap} nivel={clamp01(nivel)} />}
      {temCh2 && <Ponte x={X.ch2} t={t} par="alterna" rapido={b("pwm") ? 1 : 0} transistor={transistor} />}
      {temFil && <Filtro x={X.fil} />}
      {b("chip") && <Chip x={X.ch2} t={t} />}
      {cena.motorQuente !== undefined && <Motor quente={n("motorQuente")} t={t} />}
      {b("ventilador") && <VentiladorBancada quente={n("ventQuente")} t={t} />}
      {b("chuveiros") && <Chuveiros t={t} />}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 42) => ({ pos, alvo, fov });

export const inversor: Cenario3D = {
  Cena: Inversor,
  padrao: "geral",
  fundo: "#e3e8ea",
  cameras: {
    geral: c([0.1, 1.6, 3.1], [0.1, 1.12, 0], 50),
    pessoa: c([-0.7, 1.6, 1.6], [-0.9, 1.35, -0.85], 40),
    "bateria-tv": c([0.1, 1.45, 2.4], [0.1, 1.08, 0], 50),
    chaves: c([PERTO.ch1, 1.35, 0.95], [PERTO.ch1, 0.98, 0], 36),
    "chaves-fila": c([X.ch1, 1.35, 0.95], [X.ch1, 0.98, 0], 36),
    tv: c([1.15, 1.3, 1.25], [X.tv, 1.15, 0], 38),
    bobina: c([X.bob, 1.45, 1.7], [X.bob, 1.1, 0], 40),
    retificador: c([0.3, 1.3, 1.0], [0.3, 1.0, 0], 38),
    ponte2: c([X.ch2, 1.3, 0.95], [X.ch2, 0.98, 0], 36),
    filtro: c([X.fil, 1.3, 0.9], [X.fil, 1.0, 0], 36),
    motor: c([1.1, 1.3, 1.0], [1.05, 1.0, -0.2], 38),
    ventilador: c([0.55, 1.15, 2.4], [1.05, 0.65, 0.5], 46),
    maos: c([0.42, 1.38, 1.55], [0.45, 1.1, 0.0], 46),
    chuveiros: c([0, 1.5, 2.0], [0, 1.25, -0.1], 42),
    fila: c([0.15, 1.95, 5.8], [0.15, 1.1, 0], 50),
    carregador: c([0, 1.3, 0.75], [0, 1.0, 0], 38),
  },
};
