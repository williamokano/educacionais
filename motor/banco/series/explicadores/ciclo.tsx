import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { clamp01, valor } from "../../../src/v3d/anima";
import { caminhoReto, caminhoSuave, CanoComFluxo, FLUIDO, helice, Trecho, zigue } from "../../../src/v3d/cano";
import { Calor, CalorIndo, Fluxo, Nuvem } from "../../../src/v3d/particulas";
import { Caixa, Mat, rnd, useSeg } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, V3, Valor } from "../../../src/v3d/tipos";
import { CenaV2 } from "../../../src/v2/tipos";
import { Arvore, Balde, Banquinho, Ventilador } from "./sala";

// Casa em corte: a sala à esquerda de x = 0 (o Zeca no sofá, tudo soprando nele) e a rua à direita.
// O ar-condicionado é montado peça por peça. A estrutura vem de `etapa` (o degrau do roteiro):
//   0 só o ventilador · 1 + balde de gelo · 2 lata + evaporador (saída aberta) · 3 circuito fechado na lata
//   4 + condensador lá fora (sem compressor) · 5 + compressor (sem lata, sem capilar) · 6 + capilar (ciclo completo)
//   7 + bandeja e dreno · 8 + termostato · 9 + placa do inverter · 10 split montado na parede (com `montado`)
// Estado (campos da cena; número ou { de, para, ini, fim }):
//   frio 0..1 o fluido ferve no evaporador (ar azul no sofá) · motor 0..1 · ciclando: true = liga e desliga
//   gelo 0..1 derretido (etapa 1) · relogio (minutos) · lata 0..1 nível · gasLata 0..1 · vaza: true
//   calorFora -1..1 (+1 o calor sai para a rua, -1 entra) · pinga · bandeja · grafite · velocidade 0..1
//   montado 0..1 as peças viram o split da parede · sentido -1 = ciclo invertido (aquece)
//   semVentilador: true (etapa 0) = a sala vazia, só o calor e o sofá
//   fluxo 0..1 (etapas 2–4) o fluido corre ou para: sem compressor, no circuito fechado ele fica parado (padrão 0)
// Inverno e bomba de calor (episódio 2):
//   inverno 0..1 céu cinza, grama apagada, árvores sem folha, ar frio entrando · flocos 0..1 flocos azuis de frio na sala
//   valvula 0..1 (etapa 6+, peças soltas) válvula reversora ao lado do compressor: 0 = resfria, 1 = aquece. Com ela, o
//     compressor sempre empurra no mesmo sentido e só o resto do circuito inverte. O `sentido` (1 / -1) aceita
//     { de, para }: as bolinhas param e voltam sem pular
//   geada 0..1 gelo na serpentina de fora (segura o ar) · degelo: true = pingos e vapor saindo dela
//   ventFora 0..1 ventilador de fora (0 = parado, no degelo) · calorCano 0..1 calor da rua indo pelo cano até a sala
// O Zeca é posto pelo roteiro em ZECA (pos [-2.65, 0.05], rot 1.15, ação "sentado+…").

type V = V3;

/* ---------- onde fica cada coisa ---------- */

export const ZECA = { pos: [-2.65, 0.05] as [number, number], rot: 1.15 };
const CABECA_ZECA: V = [-2.55, 1.18, 0.1]; // para onde o ar sopra
const VENT = { x: -0.95, z: 0.22 }; // ventilador (etapas 0 e 1)
const BALDE = { x: -1.7, z: 0.16 };
const EVAP = { x0: -1.95, x1: -1.25, y: 1.12, z: 0.1, r: 0.11, voltas: 6 };
const LATA = { x: -1.22, y: 0.865, z: -0.16, r: 0.09, h: 0.3 };
const COMP = { x: 0.85, y: 0.08, z: 0.11 };
const COND = { xa: 1.45, xb: 2.35, y0: 1.25, y1: 0.3, z: 0, fileiras: 8 };
const CAP = { x0: 0.55, x1: 0.3, y: 1.35, z: 0.38, r: 0.028, voltas: 6 };
// válvula reversora: corpo deitado em x; embaixo a entrada do compressor, em cima (da esquerda para a direita)
// a saída para a serpentina de dentro, a volta para o compressor e a saída para a serpentina de fora
const VALV = { x: 1.12, y: 0.88, z: COMP.z, porta: 0.08, meio: 0.06 };
const CENTRO_EVAP: V = [(EVAP.x0 + EVAP.x1) / 2, EVAP.y, EVAP.z];
const CENTRO_COND: V = [(COND.xa + COND.xb) / 2, (COND.y0 + COND.y1) / 2, COND.z];
// split montado: evaporadora no alto da parede do fundo (de frente para a câmera), condensadora no suporte lá fora
const UNID_DENTRO: V = [-1.55, 2.35, -1.4];
const UNID_FORA: V = [0.5, 1.1, 0.05];

const entradaEvap: V = [EVAP.x0, EVAP.y, EVAP.z + EVAP.r];
const saidaEvap: V = [EVAP.x1, EVAP.y, EVAP.z + EVAP.r];
const ZR = saidaEvap[2];

const mistura = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getStyle();

type Estado = { etapa: number; frio: number; sentido: number; valvula: boolean };
/** `fixo` = trecho entre o compressor e a válvula: o fluido ali corre sempre no mesmo sentido. */
type TrechoC = Trecho & { fixo?: boolean };

/** Trechos do circuito na etapa: caminho + estado do fluido ao longo de cada um. */
const circuito = ({ etapa, frio, sentido, valvula }: Estado): TrechoC[] => {
  const { liquidoFrio: AZ, gasFrio: BR, gasQuente: VM, liquidoQuente: LJ } = FLUIDO;
  if (etapa < 2) return [];
  const evap = caminhoSuave(helice(EVAP.x0, EVAP.x1, EVAP.y, EVAP.z, EVAP.r, EVAP.voltas));
  const fimEvap = mistura(AZ, BR, frio);
  const evapTrecho = (cores: [number, string][]): Trecho => ({ curva: evap, cores, densidade: 16 });
  const out: TrechoC[] = [];
  const topoLata: V = [LATA.x, LATA.y + LATA.h + 0.03, LATA.z];
  if (etapa <= 4) {
    // lata → evaporador (sai pelo lado da lata e entra pela ponta do lado do sofá)
    out.push({ curva: caminhoReto([[LATA.x - LATA.r, LATA.y + 0.08, LATA.z], [-2.1, LATA.y + 0.08, LATA.z], [-2.1, EVAP.y, LATA.z], [-2.1, EVAP.y, ZR], entradaEvap], 0.05), cores: [[0, AZ]] });
    out.push(evapTrecho([[0, AZ], [0.85, fimEvap]]));
    if (etapa === 2) {
      out.push({ curva: caminhoReto([saidaEvap, [-1.1, EVAP.y, ZR], [-1.1, 1.4, ZR]], 0.05), cores: [[0, fimEvap]] });
    } else if (etapa === 3) {
      out.push({ curva: caminhoReto([saidaEvap, [-1.12, EVAP.y, ZR], [-1.12, 1.55, ZR], [-1.12, 1.55, LATA.z], [LATA.x, 1.55, LATA.z], topoLata], 0.06), cores: [[0, fimEvap], [1, BR]] });
    } else {
      out.push({ curva: caminhoReto([saidaEvap, [-1.12, EVAP.y, ZR], [-1.12, EVAP.y, -0.45], [1.2, EVAP.y, -0.45], [1.2, COND.y0, -0.45], [COND.xa, COND.y0, COND.z]], 0.07), cores: [[0, fimEvap], [0.4, BR]] });
      out.push({ curva: caminhoReto(zigue(COND.xa, COND.xb, COND.y0, COND.y1, COND.z, COND.fileiras), 0.06), cores: [[0, BR]] });
      out.push({ curva: caminhoReto([[COND.xa, COND.y1, COND.z], [1.3, COND.y1, COND.z], [1.3, COND.y1, -0.62], [0.15, COND.y1, -0.62], [0.15, 1.7, -0.62], [LATA.x, 1.7, -0.62], [LATA.x, 1.7, LATA.z], topoLata], 0.07), cores: [[0, BR]] });
    }
    return out;
  }
  // etapa 5+: compressor, condensador, linha de líquido, (capilar), entrada do evaporador
  const ciclo = etapa >= 6;
  const quente = sentido < 0; // ciclo invertido: o de dentro esquenta, o de fora gela
  const [cEntrada, cEvapIni, cEvapFim, cSuccao, cDesc, cCondIni, cCondFim, cLiq] = quente
    ? [LJ, LJ, VM, VM, VM, AZ, BR, AZ]
    : ciclo
      ? [AZ, AZ, fimEvap, BR, VM, VM, LJ, LJ]
      : [LJ, LJ, LJ, LJ, VM, VM, LJ, LJ]; // etapa 5: pressão alta na sala, o fluido não ferve
  // invertido, o gás quente entra pela saída (u = 1) e sai líquido pela entrada (u = 0)
  out.push(evapTrecho(quente ? [[0.15, cEvapIni], [1, cEvapFim]] : [[0, cEvapIni], [0.85, cEvapFim]]));
  const zc = COMP.z;
  if (valvula && ciclo) {
    // com a válvula: compressor → válvula (gás quente) e válvula → compressor (gás frio) nunca invertem;
    // a válvula liga a serpentina de dentro e a de fora a um ou ao outro
    const topo = VALV.y + VALV.meio;
    out.push({ curva: caminhoReto([[COMP.x + 0.15, 0.42, zc], [VALV.x, 0.42, zc], [VALV.x, VALV.y - VALV.meio, zc]], 0.05), cores: [[0, VM]], fixo: true });
    out.push({ curva: caminhoReto([[VALV.x, topo, zc], [VALV.x, 1.0, zc], [VALV.x, 1.0, zc + 0.15], [COMP.x, 1.0, zc + 0.15], [COMP.x, 0.75, zc + 0.15], [COMP.x, 0.75, zc], [COMP.x, 0.64, zc]], 0.05), cores: [[0, BR]], fixo: true });
    out.push({ curva: caminhoReto([saidaEvap, [-1.12, EVAP.y, ZR], [-1.12, EVAP.y, -0.45], [VALV.x - VALV.porta, EVAP.y, -0.45], [VALV.x - VALV.porta, EVAP.y, zc], [VALV.x - VALV.porta, topo, zc]], 0.07), cores: [[0, quente ? VM : fimEvap]] });
    out.push({ curva: caminhoReto([[VALV.x + VALV.porta, topo, zc], [VALV.x + VALV.porta, COND.y0, zc], [COND.xa, COND.y0, COND.z]], 0.07), cores: [[0, quente ? BR : VM]] });
  } else {
    out.push({ curva: caminhoReto([saidaEvap, [-1.12, EVAP.y, ZR], [-1.12, EVAP.y, -0.45], [COMP.x, EVAP.y, -0.45], [COMP.x, EVAP.y, zc], [COMP.x, 0.64, zc]], 0.08), cores: [[0, cSuccao]] });
    out.push({ curva: caminhoReto([[COMP.x + 0.15, 0.42, zc], [1.2, 0.42, zc], [1.2, COND.y0, zc], [COND.xa, COND.y0, COND.z]], 0.07), cores: [[0, cDesc]] });
  }
  out.push({ curva: caminhoReto(zigue(COND.xa, COND.xb, COND.y0, COND.y1, COND.z, COND.fileiras), 0.06), cores: quente ? [[0, cCondFim], [0.6, cCondIni]] : [[0, cCondIni], [0.6, cCondFim]] });
  out.push({ curva: caminhoReto([[COND.xa, COND.y1, COND.z], [1.3, COND.y1, COND.z], [1.3, COND.y1, CAP.z], [CAP.x0 + 0.06, COND.y1, CAP.z], [CAP.x0 + 0.06, CAP.y, CAP.z + CAP.r], [CAP.x0, CAP.y, CAP.z + CAP.r]], 0.07), cores: [[0, cLiq]] });
  // capilar: um fio de cobre (bem mais fino que os outros canos) com contas correndo por fora
  if (ciclo) out.push({ curva: caminhoSuave(helice(CAP.x0, CAP.x1, CAP.y, CAP.z, CAP.r, CAP.voltas)), cores: quente ? [[0.1, AZ], [1, LJ]] : [[0, LJ], [0.9, AZ]], raio: 0.006, bola: 0.009, densidade: 70, cano: "#c8743c" });
  const ini: V = ciclo ? [CAP.x1, CAP.y, CAP.z + CAP.r] : [CAP.x0, CAP.y, CAP.z + CAP.r];
  out.push({ curva: caminhoReto([ini, [0.15, CAP.y, ini[2]], [0.15, 1.5, -0.62], [-2.12, 1.5, -0.62], [-2.12, EVAP.y, -0.62], [-2.12, EVAP.y, ZR], entradaEvap], 0.07), cores: [[0, cEntrada]] });
  return out;
};

/* ---------- peças ---------- */

const Sofa: React.FC = () => {
  // sofá virado para a mesma direção do Zeca; o assento fica sob o ponto `ZECA.pos`
  const f: [number, number] = [Math.sin(ZECA.rot), Math.cos(ZECA.rot)];
  const cor = "#2f8f7a";
  return (
    <group position={[ZECA.pos[0] - f[0] * 0.2, 0, ZECA.pos[1] - f[1] * 0.2]} rotation={[0, ZECA.rot, 0]}>
      <Caixa p={[0, 0.17, 0]} t={[1.5, 0.22, 0.72]} cor="#256f60" raio={0.04} tecido />
      {[-0.36, 0.36].map((x) => <Caixa key={x} p={[x, 0.36, 0.04]} t={[0.7, 0.16, 0.64]} cor={cor} raio={0.06} tecido />)}
      <Caixa p={[0, 0.66, -0.3]} t={[1.5, 0.62, 0.18]} cor={cor} raio={0.07} tecido />
      {[-0.8, 0.8].map((x) => <Caixa key={x} p={[x, 0.42, 0]} t={[0.16, 0.42, 0.74]} cor={cor} raio={0.06} tecido />)}
      {[-0.65, 0.65].flatMap((x) => [-0.28, 0.28].map((z) => <Caixa key={`${x}${z}`} p={[x, 0.03, z]} t={[0.06, 0.06, 0.06]} cor="#5a3a22" raio={0.01} />))}
    </group>
  );
};

const Lata: React.FC<{ nivel: number; gas: number; ferve: number; t: number }> = ({ nivel, gas, ferve, t }) => {
  const seg = useSeg();
  const { x, y, z, r, h } = LATA;
  const alt = h * Math.max(nivel, 0.03);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r, h, seg(16, 40), 1, true]} />
        <meshPhysicalMaterial color="#cfe8ff" transparent opacity={0.28} roughness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, alt / 2 + 0.005, 0]}>
        <cylinderGeometry args={[r * 0.94, r * 0.94, alt, seg(16, 40)]} />
        <meshPhysicalMaterial color={FLUIDO.liquidoFrio} transparent opacity={0.85} roughness={0.15} />
      </mesh>
      {gas > 0.02 && (
        <mesh position={[0, h - (h - alt) * gas * 0.5, 0]} scale={[1, gas, 1]}>
          <cylinderGeometry args={[r * 0.93, r * 0.93, (h - alt) * 0.98, seg(16, 40)]} />
          <meshStandardMaterial color={FLUIDO.gasFrio} transparent opacity={0.75} />
        </mesh>
      )}
      {ferve > 0.05 &&
        Array.from({ length: 8 }).map((_, i) => {
          const c = (t * 0.9 + rnd(i + 3)) % 1;
          return (
            <mesh key={i} position={[(rnd(i) - 0.5) * r, c * alt, (rnd(i + 7) - 0.5) * r]} scale={0.012 * ferve}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>
          );
        })}
      <mesh position={[0, h, 0]}><cylinderGeometry args={[r * 1.02, r * 1.02, 0.02, seg(16, 40)]} /><Mat cor="#e44d6a" rug={0.4} verniz={0.6} /></mesh>
      <mesh position={[0, 0, 0]}><cylinderGeometry args={[r * 1.02, r * 1.02, 0.02, seg(16, 40)]} /><Mat cor="#e44d6a" rug={0.4} verniz={0.6} /></mesh>
      <mesh position={[0, h * 0.72, 0]}><cylinderGeometry args={[r * 1.01, r * 1.01, 0.05, seg(16, 40), 1, true]} /><Mat cor="#f2c230" rug={0.5} dupla /></mesh>
      <mesh position={[0, h + 0.025, 0]}><cylinderGeometry args={[0.02, 0.02, 0.04, 12]} /><Mat cor="#b9c0c8" met={0.8} rug={0.3} /></mesh>
    </group>
  );
};

const Mesa: React.FC = () => (
  <group>
    <Caixa p={[-1.6, 0.84, 0.05]} t={[0.95, 0.05, 0.72]} cor="#b9773f" raio={0.01} verniz={0.3} />
    {[-2.0, -1.2].flatMap((x) => [-0.25, 0.35].map((z) => <Caixa key={`${x}${z}`} p={[x, 0.41, z]} t={[0.05, 0.82, 0.05]} cor="#7a4522" raio={0.01} />))}
  </group>
);

const Compressor: React.FC<{ t: number; motor: number }> = ({ t, motor }) => {
  const seg = useSeg();
  const treme = motor > 0.05 ? Math.sin(t * 70) * 0.0035 * motor : 0;
  return (
    <group position={[COMP.x + treme, COMP.y, COMP.z]}>
      <Caixa p={[0, 0.02, 0]} t={[0.5, 0.04, 0.42]} cor="#2a2a2a" raio={0.01} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Caixa key={`${sx}${sz}`} p={[sx * 0.17, 0.06, sz * 0.13]} t={[0.07, 0.05, 0.07]} cor="#1a1a1a" raio={0.012} />))}
      <mesh position={[0, 0.3, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.24, seg(4, 12), seg(12, 32)]} />
        <Mat cor="#1e1e1e" rug={0.35} verniz={0.8} />
      </mesh>
      <Caixa p={[0.0, 0.3, 0.158]} t={[0.11, 0.07, 0.01]} cor="#f2c230" raio={0.004} />
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.035, 0.04, 0.08, 14]} /><Mat cor="#c8743c" met={0.7} rug={0.35} /></mesh>
      <mesh position={[0.15, 0.34, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.035, 0.07, 14]} /><Mat cor="#c8743c" met={0.7} rug={0.35} /></mesh>
    </group>
  );
};

const Condensador: React.FC = () => (
  <group>
    <Caixa p={[COND.xa - 0.08, (COND.y0 + COND.y1) / 2, COND.z]} t={[0.04, COND.y0 - COND.y1 + 0.2, 0.16]} cor="#8d949b" met={0.5} rug={0.4} raio={0.01} />
    <Caixa p={[COND.xb + 0.08, (COND.y0 + COND.y1) / 2, COND.z]} t={[0.04, COND.y0 - COND.y1 + 0.2, 0.16]} cor="#8d949b" met={0.5} rug={0.4} raio={0.01} />
    <mesh position={[CENTRO_COND[0], CENTRO_COND[1], COND.z - 0.05]}>
      <planeGeometry args={[COND.xb - COND.xa + 0.12, COND.y0 - COND.y1 + 0.15]} />
      <meshStandardMaterial color="#b7bec5" transparent opacity={0.35} metalness={0.6} roughness={0.4} side={THREE.DoubleSide} />
    </mesh>
    <Caixa p={[CENTRO_COND[0], COND.y1 - 0.14, COND.z]} t={[COND.xb - COND.xa + 0.3, 0.06, 0.4]} cor="#6d747b" raio={0.01} />
  </group>
);

/** Grafite de lapiseira encostado no capilar: o furo dele tem essa grossura. */
const Grafite: React.FC = () => (
  <group position={[(CAP.x0 + CAP.x1) / 2, CAP.y - 0.07, CAP.z + 0.05]}>
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.0035, 0.0035, 0.24, 10]} /><Mat cor="#3a3d42" rug={0.3} met={0.6} /></mesh>
  </group>
);

/**
 * Válvula reversora (4 vias) em corte: o corpo de latão é translúcido para mostrar a peça de dentro, que desliza.
 * `k` 0 = resfria (a peça liga a serpentina de dentro à volta do compressor), 1 = aquece (liga a de fora).
 * O solenoide acende no meio do clique.
 */
const Valvula: React.FC<{ k: number }> = ({ k }) => {
  const seg = useSeg();
  const L = 0.27;
  const r = 0.042;
  const lat = "#c9a227";
  const dx = -VALV.porta / 2 + VALV.porta * k;
  const clique = 4 * k * (1 - k);
  return (
    <group position={[VALV.x, VALV.y, VALV.z]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r, r, L, seg(16, 40), 1, true]} />
        <meshPhysicalMaterial color={lat} metalness={0.6} roughness={0.3} transparent opacity={0.38} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * L) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 1.12, r * 1.12, 0.02, seg(16, 40)]} />
          <Mat cor={lat} met={0.7} rug={0.3} />
        </mesh>
      ))}
      {/* bocais: um embaixo (do compressor), três em cima */}
      <mesh position={[0, -r - 0.012, 0]}><cylinderGeometry args={[0.03, 0.03, 0.03, 14]} /><Mat cor={lat} met={0.7} rug={0.3} /></mesh>
      {[-1, 0, 1].map((i) => (
        <mesh key={i} position={[i * VALV.porta, r + 0.012, 0]}><cylinderGeometry args={[0.03, 0.03, 0.03, 14]} /><Mat cor={lat} met={0.7} rug={0.3} /></mesh>
      ))}
      {/* a peça que desliza: uma concha que cobre duas saídas de cima, presa a dois pistões */}
      <group position={[dx, 0, 0]}>
        <Caixa p={[0, r * 0.45, 0]} t={[VALV.porta * 1.9, 0.03, r * 1.3]} cor="#3d4450" raio={0.008} />
        <Caixa p={[0, r * 0.15, 0]} t={[0.02, 0.04, r * 1.1]} cor="#3d4450" raio={0.004} />
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.007, 0.007, L * 0.86, 10]} /><Mat cor="#9aa3ab" met={0.8} rug={0.3} /></mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * L * 0.36, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 0.9, r * 0.9, 0.03, seg(14, 32)]} /><Mat cor="#5b6370" met={0.5} rug={0.4} /></mesh>
        ))}
      </group>
      {/* solenoide atrás (para o corte mostrar a peça), com o tubinho da válvula piloto */}
      <group position={[0, -0.01, -r - 0.07]} rotation={[0, Math.PI, 0]}>
        <Caixa p={[0, 0, 0]} t={[0.08, 0.09, 0.07]} cor="#1e1e1e" raio={0.01} emissivo="#ff5a3c" brilho={clique * 1.5} />
        <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.022, 0.022, 0.03, 14]} /><Mat cor="#c8743c" met={0.6} rug={0.35} /></mesh>
        <mesh position={[0, 0, -0.055]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.006, 0.006, 0.05, 8]} /><Mat cor="#c8743c" met={0.6} rug={0.35} /></mesh>
      </group>
    </group>
  );
};

/** Flocos azuis de frio boiando (o inverso dos hexágonos de calor). Somem perto da câmera. */
export const Flocos: React.FC<{ t: number; min: V; max: V; n: number }> = ({ t, min, max, n }) => {
  const { camera } = useThree();
  const v = new THREE.Vector3();
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const b: V = [0, 1, 2].map((k) => min[k] + rnd(i * 3 + k * 61 + 7) * (max[k] - min[k])) as V;
        const pos: V = [b[0] + Math.sin(t * 0.5 + i) * 0.07, b[1] + Math.sin(t * 0.8 + i * 1.7) * 0.06, b[2] + Math.cos(t * 0.4 + i) * 0.04];
        const s = (0.05 + rnd(i + 40) * 0.035) * clamp01((camera.position.distanceTo(v.set(...pos)) - 0.5) / 0.5);
        if (s <= 0.002) return null;
        return (
          <group key={i} position={pos} rotation={[Math.sin(t * 0.3 + i) * 0.5, t * 0.6 + i, t * 0.4 + i]} scale={s}>
            {[0, 1, 2].map((a) => (
              <group key={a} rotation={[0, 0, (a * Math.PI) / 3]}>
                <mesh><boxGeometry args={[2, 0.22, 0.22]} /><meshStandardMaterial color="#4aa8ff" emissive="#4aa8ff" emissiveIntensity={0.45} /></mesh>
                {[-1, 1].map((sx) => (
                  <mesh key={sx} position={[sx * 0.62, 0, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.55, 0.16, 0.16]} /><meshStandardMaterial color="#4aa8ff" emissive="#4aa8ff" emissiveIntensity={0.45} /></mesh>
                ))}
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
};

/** Árvore de inverno: tronco e galhos sem folha. */
const ArvoreSeca: React.FC<{ p: V; s?: number }> = ({ p, s = 1 }) => {
  const galhos: [number, number, number, number][] = [[0.55, 0.5, 0.0, 0.32], [0.7, -0.6, 0.5, 0.3], [0.85, 0.35, 2.4, 0.26], [0.95, -0.4, 3.6, 0.22], [1.05, 0.15, 1.2, 0.2]];
  return (
    <group position={p} scale={s}>
      <Caixa p={[0, 0.5, 0]} t={[0.09, 1.0, 0.09]} cor="#5e3d22" />
      {galhos.map(([y, inc, giro, c], i) => (
        <group key={i} position={[0, y, 0]} rotation={[0, giro, inc]}>
          <Caixa p={[0, c / 2, 0]} t={[0.035, c, 0.035]} cor="#5e3d22" />
          <group position={[0, c * 0.7, 0]} rotation={[0, 0, -inc * 1.2]}>
            <Caixa p={[0, c * 0.25, 0]} t={[0.02, c * 0.5, 0.02]} cor="#6b4a2c" />
          </group>
        </group>
      ))}
    </group>
  );
};

/** Gelo nas aletas da serpentina de fora (`k` 0..1) e, no degelo, pingos caindo e vapor subindo. */
const Geada: React.FC<{ k: number; t: number; degelo: boolean }> = ({ k, t, degelo }) => {
  const cristais = useMemo(() => Array.from({ length: 70 }, (_, i) => [
    COND.xa + rnd(i + 11) * (COND.xb - COND.xa),
    COND.y1 + rnd(i + 23) * (COND.y0 - COND.y1),
    COND.z + (rnd(i + 37) - 0.5) * 0.14,
    0.6 + rnd(i + 41) * 0.8,
  ]), []);
  return (
    <group>
      {k > 0.02 && (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[CENTRO_COND[0], CENTRO_COND[1], COND.z + s * 0.05]}>
              <planeGeometry args={[COND.xb - COND.xa + 0.1, COND.y0 - COND.y1 + 0.12]} />
              <meshStandardMaterial color="#f4fbff" transparent opacity={0.8 * k} roughness={0.9} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          ))}
          {cristais.slice(0, Math.round(cristais.length * Math.min(1, k * 1.3))).map(([x, y, z, s], i) => (
            <mesh key={i} position={[x, y, z]} scale={0.03 * s * k} rotation={[i, i * 2, 0]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} flatShading />
            </mesh>
          ))}
        </>
      )}
      {degelo && (
        <>
          {Array.from({ length: 8 }).map((_, i) => {
            const c = (t * 1.1 + rnd(i + 70)) % 1;
            const x = COND.xa + 0.05 + rnd(i + 80) * (COND.xb - COND.xa - 0.1);
            const y = COND.y1 - 0.05 - c * c * (COND.y1 - 0.1);
            return (
              <mesh key={i} position={[x, y, COND.z]} scale={[0.014, 0.022, 0.014]}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshPhysicalMaterial color="#7ec4ea" transparent opacity={0.85} roughness={0.05} clearcoat={1} />
              </mesh>
            );
          })}
          <Nuvem t={t} de={[CENTRO_COND[0], COND.y0 - 0.1, COND.z]} rumo={[0, 0.7, 0.15]} n={12} tamanho={1.1} />
        </>
      )}
    </group>
  );
};

/** Calor da rua indo pelo cano até a serpentina da sala: hexágonos correndo pelo caminho. */
const CalorPeloCano: React.FC<{ t: number; forca: number }> = ({ t, forca }) => {
  const curva = useMemo(() => caminhoReto([CENTRO_COND, [COND.xa, COND.y0, COND.z], [VALV.x + VALV.porta, COND.y0, VALV.z], [VALV.x + VALV.porta, VALV.y + 0.15, VALV.z],
    [VALV.x - VALV.porta, VALV.y + 0.15, VALV.z], [VALV.x - VALV.porta, EVAP.y, VALV.z], [VALV.x - VALV.porta, EVAP.y, -0.45], [-1.12, EVAP.y, -0.45], [-1.12, EVAP.y, ZR], CENTRO_EVAP], 0.1), []);
  if (forca <= 0.02) return null;
  const n = Math.round(16 * forca);
  const p = new THREE.Vector3();
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const u = (t * 0.12 + i / n) % 1;
        curva.getPointAt(u, p);
        const s = 0.045 * Math.min(1, u * 10, (1 - u) * 10);
        return (
          <mesh key={i} position={[p.x, p.y + 0.09, p.z]} rotation={[Math.PI / 2 + t + i, t * 0.6, i]} scale={s}>
            <cylinderGeometry args={[1, 1, 0.45, 6]} />
            <meshStandardMaterial color="#ff8a3d" emissive="#ff8a3d" emissiveIntensity={0.4} flatShading roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

const Bandeja: React.FC<{ visivel: boolean; t: number; pinga: boolean }> = ({ visivel, t, pinga }) => {
  const c = (t * 0.9) % 1;
  const chao = visivel ? 0.995 : 0.02;
  const y = EVAP.y - EVAP.r - 0.02 - c * c * (EVAP.y - EVAP.r - chao);
  const x = CENTRO_EVAP[0] - 0.05;
  return (
    <group>
      {visivel && (
        <>
          <Caixa p={[CENTRO_EVAP[0], 0.975, EVAP.z]} t={[0.85, 0.025, 0.3]} cor="#d7dde3" raio={0.008} />
          <CanoComFluxo t={t} trecho={{ curva: caminhoReto([[EVAP.x1 + 0.05, 0.97, -0.08], [-0.6, 0.97, -0.08], [-0.6, 0.9, -0.3], [0.4, 0.9, -0.3], [0.4, 0.05, -0.3]], 0.06), cores: [[0, "#7ec4ea"]], raio: 0.018, cano: "#9aa3ab", opaco: true }} />
        </>
      )}
      {pinga && (
        <mesh position={[x, y, EVAP.z]} scale={[0.014, 0.02, 0.014]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshPhysicalMaterial color="#7ec4ea" transparent opacity={0.85} roughness={0.05} clearcoat={1} />
        </mesh>
      )}
      {pinga && !visivel && (
        <mesh position={[x, 0.012, EVAP.z]} rotation={[-Math.PI / 2, 0, 0]} scale={0.06 + Math.min(t * 0.02, 0.06)}>
          <circleGeometry args={[1, 20]} />
          <meshPhysicalMaterial color="#7ec4ea" transparent opacity={0.6} roughness={0.05} />
        </mesh>
      )}
    </group>
  );
};

const Termostato: React.FC<{ ligado: boolean }> = ({ ligado }) => (
  <group position={[-1.2, 1.55, -1.54]}>
    <Caixa p={[0, 0, 0]} t={[0.14, 0.2, 0.03]} cor="#f6f6f2" raio={0.01} />
    <mesh position={[0, 0.03, 0.017]}><planeGeometry args={[0.1, 0.06]} /><meshBasicMaterial color={ligado ? "#5bd47a" : "#244a33"} /></mesh>
    <mesh position={[0, -0.05, 0.02]}><circleGeometry args={[0.012, 12]} /><meshBasicMaterial color={ligado ? "#ff5a3c" : "#555"} /></mesh>
  </group>
);

const PlacaInverter: React.FC<{ t: number; velocidade: number }> = ({ t, velocidade }) => (
  <group position={[1.18, 0.62, 0.5]} rotation={[0, -0.35, 0]}>
    <Caixa p={[0, 0, 0]} t={[0.26, 0.18, 0.015]} cor="#1f7a4a" raio={0.004} />
    <Caixa p={[-0.06, 0.02, 0.012]} t={[0.07, 0.07, 0.012]} cor="#222" raio={0.003} />
    <Caixa p={[0.05, -0.04, 0.012]} t={[0.05, 0.03, 0.012]} cor="#222" raio={0.003} />
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} position={[0.06 + (i % 2) * 0.03, 0.05 - Math.floor(i / 2) * 0.03, 0.012]}>
        <sphereGeometry args={[0.007, 8, 6]} />
        <meshBasicMaterial color={i / 4 < velocidade ? (Math.sin(t * (4 + velocidade * 12) + i) > 0 ? "#7dff9a" : "#2c8f4a") : "#123a22"} />
      </mesh>
    ))}
  </group>
);

/* ---------- o split montado na parede ---------- */

const SplitParede: React.FC<{ k: number; t: number; motor: number; sentido: number }> = ({ k, t, motor, sentido }) => {
  const seg = useSeg();
  if (k <= 0.01) return null;
  const s = 0.6 + 0.4 * k;
  const { liquidoFrio: AZ, gasFrio: BR, gasQuente: VM, liquidoQuente: LJ } = FLUIDO;
  const quente = sentido < 0;
  // os dois canos que atravessam a parede: líquido (fino) da condensadora para a evaporadora, gás (grosso) de volta
  const xu = UNID_DENTRO[0] + 0.48;
  const yl = UNID_DENTRO[1] - 0.04;
  const yg = UNID_DENTRO[1] - 0.12;
  const liquido: V[] = [[UNID_FORA[0] - 0.12, UNID_FORA[1] + 0.2, -0.3], [0.22, UNID_FORA[1] + 0.2, -0.3], [0.22, UNID_FORA[1] + 0.2, -1.47], [0.22, yl, -1.47], [xu, yl, -1.47]];
  const gas: V[] = [[xu, yg, -1.5], [0.3, yg, -1.5], [0.3, UNID_FORA[1] + 0.08, -1.5], [0.3, UNID_FORA[1] + 0.08, -0.4], [UNID_FORA[0] - 0.12, UNID_FORA[1] + 0.08, -0.4]];
  const andou = t * 0.3 * motor * sentido;
  return (
    <group>
      {/* evaporadora: caixa branca no alto da parede, com a aleta soltando o ar para o sofá */}
      <group position={UNID_DENTRO} scale={s}>
        <Caixa p={[0, 0, 0]} t={[1.05, 0.33, 0.27]} cor="#f7f7f4" raio={0.06} rug={0.3} verniz={0.6} />
        <Caixa p={[0, -0.14, 0.13]} t={[0.96, 0.03, 0.04]} cor="#d9dde1" raio={0.012} r={[0.55, 0, 0]} />
        <mesh position={[0.36, 0.07, 0.137]}><circleGeometry args={[0.012, 12]} /><meshBasicMaterial color={motor > 0.05 ? "#54d6ff" : "#556"} /></mesh>
        <Caixa p={[0, -0.03, 0.137]} t={[0.98, 0.006, 0.004]} cor="#e3e6e9" raio={0.002} />
      </group>
      {/* condensadora: num suporte de cantoneiras, grade do ventilador virada para fora */}
      <group position={UNID_FORA} scale={s}>
        {[-0.32, 0.32].map((z) => (
          <group key={z}>
            <Caixa p={[-0.05, -0.33, z]} t={[0.6, 0.04, 0.05]} cor="#6d747b" raio={0.008} met={0.5} />
            <Caixa p={[-0.36, -0.15, z]} t={[0.04, 0.42, 0.05]} cor="#6d747b" raio={0.008} met={0.5} />
            <Caixa p={[-0.2, -0.24, z]} t={[0.04, 0.32, 0.04]} r={[0, 0, -0.8]} cor="#6d747b" raio={0.006} met={0.5} />
          </group>
        ))}
        <Caixa p={[0, 0, 0]} t={[0.55, 0.62, 0.95]} cor="#e6e8ea" raio={0.04} rug={0.4} />
        <group position={[0.29, 0.0, 0.12]} rotation={[0, Math.PI / 2, 0]}>
          <mesh><ringGeometry args={[0.2, 0.25, seg(24, 48)]} /><meshStandardMaterial color="#3a3f44" side={THREE.DoubleSide} /></mesh>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} rotation={[0, 0, (i / 6) * Math.PI]}><boxGeometry args={[0.4, 0.008, 0.004]} /><meshStandardMaterial color="#3a3f44" /></mesh>
          ))}
          {/* hélice: cada pá num grupo girado (antes as 3 caíam no mesmo lugar), entre a caixa e a grade */}
          <group rotation={[0, 0, t * 20 * motor]} position={[0, 0, -0.006]}>
            {[0, 1, 2].map((i) => (
              <group key={i} rotation={[0, 0, (i / 3) * Math.PI * 2]}>
                <mesh position={[0, 0.1, 0]} rotation={[0, 0.4, 0]}><boxGeometry args={[0.1, 0.17, 0.006]} /><meshStandardMaterial color="#20252a" /></mesh>
              </group>
            ))}
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.01, 16]} /><meshStandardMaterial color="#3a3f44" /></mesh>
          </group>
        </group>
        {Array.from({ length: 7 }).map((_, i) => <Caixa key={i} p={[0.05, -0.2 + i * 0.065, 0.478]} t={[0.4, 0.012, 0.005]} cor="#b8bcc0" raio={0.002} />)}
      </group>
      {k > 0.95 && (
        <>
          <CanoComFluxo t={t} deslocamento={andou} trecho={{ curva: caminhoReto(liquido, 0.05), cores: [[0, quente ? LJ : AZ]], raio: 0.02, densidade: 34 }} />
          <CanoComFluxo t={t} deslocamento={andou} trecho={{ curva: caminhoReto(gas, 0.05), cores: [[0, quente ? VM : BR]], raio: 0.03, densidade: 26 }} />
        </>
      )}
    </group>
  );
};

/* ---------- casa em corte ---------- */

const CEU = "#8fd0f5";
const CEU_INVERNO = "#aeb9c3";

const Casa: React.FC<{ inverno: number }> = ({ inverno }) => (
  <group>
    <Caixa p={[-1.7, -0.35, 0]} t={[3.6, 0.6, 3.2]} cor="#9a6a43" raio={0.004} rug={1} />
    <mesh position={[0, -0.065, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /><Mat cor={mistura("#7cc86a", "#a3ab98", inverno)} rug={0.95} /></mesh>
    {/* sala: piso de madeira, parede do fundo com quadro, tapete */}
    <Caixa p={[-1.7, -0.03, 0]} t={[3.6, 0.06, 3.2]} cor="#d9a25b" raio={0.004} rug={0.7} />
    {Array.from({ length: 12 }).map((_, i) => (
      <mesh key={i} position={[-1.7, 0.002, -1.45 + i * 0.27]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 0.008]} />
        <meshBasicMaterial color="#b8823f" />
      </mesh>
    ))}
    <Caixa p={[-1.7, 1.5, -1.6]} t={[3.6, 3.0, 0.1]} cor="#efe1c6" raio={0.003} rug={0.95} />
    <Caixa p={[-2.75, 1.9, -1.53]} t={[0.7, 0.48, 0.04]} cor="#6b3d1f" raio={0.012} />
    <mesh position={[-2.75, 1.9, -1.508]}><planeGeometry args={[0.6, 0.38]} /><meshBasicMaterial color="#9fd3f0" /></mesh>
    <Caixa p={[-2.2, 0.012, 0.25]} t={[1.9, 0.012, 1.4]} cor="#ef8a4c" raio={0.004} rug={1} tecido />
    {/* parede externa cortada (dentro/fora) e o telhado */}
    <Caixa p={[0, 1.5, 0]} t={[0.18, 3.0, 3.2]} cor="#e8d8ba" raio={0.004} rug={0.95} />
    <Caixa p={[-1.7, 3.05, 0]} t={[3.8, 0.1, 3.3]} cor="#c9b89a" raio={0.004} />
    <Caixa p={[-1.7, 3.2, 0]} t={[4.0, 0.2, 3.5]} cor="#c8553d" raio={0.01} />
    {/* rua: laje, cerca, árvores, céu */}
    <Caixa p={[1.55, 0.04, 0.1]} t={[2.5, 0.08, 1.3]} cor="#c9c9c4" raio={0.01} rug={0.9} />
    {Array.from({ length: 16 }).map((_, i) => <Caixa key={i} p={[0.25 + i * 0.25, 0.45, -1.7]} t={[0.08, 0.9, 0.04]} cor="#ffffff" raio={0.012} />)}
    <Caixa p={[2.15, 0.7, -1.7]} t={[4.0, 0.06, 0.03]} cor="#ffffff" raio={0.01} />
    {inverno < 0.5 ? (
      <>
        <Arvore p={[3.2, 0, -2.4]} s={1.6} />
        <Arvore p={[1.0, 0, -2.8]} s={1.3} />
      </>
    ) : (
      <>
        <ArvoreSeca p={[3.2, 0, -2.4]} s={1.6} />
        <ArvoreSeca p={[1.0, 0, -2.8]} s={1.3} />
      </>
    )}
    <mesh position={[1.5, 3, -4.5]}><planeGeometry args={[16, 9]} /><meshBasicMaterial color={mistura(CEU, CEU_INVERNO, inverno)} /></mesh>
  </group>
);

/* ---------- cena ---------- */

const ritmoCiclando = (t: number, periodo = 2.2, ligado = 0.55) => {
  const n = Math.floor(t / periodo);
  const r = t - n * periodo;
  return n * periodo * ligado + Math.min(r, periodo * ligado);
};

/** Integral no tempo de uma velocidade (número ou { de, para }): o que já andou, sem pular quando ela muda na batida. */
const integra = (v: Valor | undefined, padrao: number, t: number, tBatida: number, progresso: number) => {
  if (v == null || typeof v === "number") return t * valor(v, progresso, padrao);
  const N = 24;
  let soma = (t - tBatida) * valor(v, 0, padrao); // antes da batida: velocidade do início
  for (let i = 0; i < N; i++) soma += (tBatida / N) * valor(v, (progresso * (i + 0.5)) / N, padrao);
  return soma;
};

const Ciclo: React.FC<Cenario3DProps> = ({ cena, progresso, tEpisodio: t, t: tBatida }) => {
  const etapa = (cena.etapa as number | undefined) ?? 6;
  const padraoFrio = etapa === 4 || etapa === 5 ? 0 : 1;
  const frio = valor(cena.frio as Valor, progresso, padraoFrio);
  const velocidade = valor(cena.velocidade as Valor, progresso, 1);
  const ciclando = cena.ciclando === true;
  const ligadoAgora = !ciclando || t % 2.2 < 2.2 * 0.55;
  const motorBase = valor(cena.motor as Valor, progresso, 1) * (etapa >= 9 ? velocidade : 1);
  const motor = ligadoAgora ? motorBase : 0;
  const sentidoV = cena.sentido as Valor | undefined;
  const sentido = valor(sentidoV, progresso, 1);
  const quente = sentido < 0;
  const inverno = valor(cena.inverno as Valor, progresso, 0);
  const flocos = valor(cena.flocos as Valor, progresso, 0);
  const temValvula = cena.valvula !== undefined && etapa >= 6;
  const valvula = valor(cena.valvula as Valor, progresso, 0);
  const geada = valor(cena.geada as Valor, progresso, 0);
  const ventFora = valor(cena.ventFora as Valor, progresso, 1);
  const giroFora = integra(cena.ventFora as Valor | undefined, 1, t, tBatida, progresso);
  const calorCano = valor(cena.calorCano as Valor, progresso, 0);
  // no circuito fechado a lata fica pela metade: sobra espaço para o gás que volta se acumular em cima
  const nivel = valor(cena.lata as Valor, progresso, etapa >= 3 ? 0.5 : 1);
  const gas = valor(cena.gasLata as Valor, progresso, 0);
  const montado = etapa >= 10 ? valor(cena.montado as Valor, progresso, 1) : 0;
  const k = 1 - montado; // peças soltas somem enquanto o split aparece
  const derretido = valor(cena.gelo as Valor, progresso, 0);
  const calorFora = valor(cena.calorFora as Valor, progresso, etapa >= 5 ? 1 : etapa === 4 ? -1 : 0) * (ligadoAgora ? 1 : 0);
  const trechos = useMemo(() => circuito({ etapa, frio, sentido, valvula: temValvula }), [etapa, Math.round(frio * 20), quente, temValvula]);
  // sem compressor nada empurra o fluido: na lata aberta ele corre (o gás escapa), no circuito fechado ele para.
  // `fluxo` (0..1) é a velocidade; o deslocamento é a integral dela, para as bolinhas desacelerarem sem pular.
  const integral = integra(cena.fluxo as Valor | undefined, etapa <= 2 ? 1 : 0, t, tBatida, progresso);
  // compressor ligado: o que o fluido andou; com `sentido` animado, ele desacelera, para e volta sem pular
  const andouFixo = (ciclando ? ritmoCiclando(t) : t) * 0.35 * motorBase;
  const andou = etapa >= 5
    ? typeof sentidoV === "object" ? integra(sentidoV, 1, t, tBatida, progresso) * 0.35 * motorBase : andouFixo * sentido
    : integral * 0.35 * Math.max(frio, 0.15);
  const temCompressor = etapa >= 5;
  // quanto o ar que chega no sofá está gelado (0 = quente)
  const frioAr = quente ? 0 : etapa === 1 ? 1 - derretido * 0.9 : etapa === 0 ? 0 : frio * (temCompressor ? (ligadoAgora ? 1 : 0.3) : 1);
  const puxaSala = quente ? 0 : etapa === 1 ? 1 - derretido * 0.8 : etapa === 0 ? 0 : frio * (temCompressor && !ligadoAgora ? 0.2 : 1);
  const alvoCalor: V = etapa === 1 ? [BALDE.x, 1.05, BALDE.z] : montado > 0.5 ? UNID_DENTRO : CENTRO_EVAP;
  return (
    <group>
      <Casa inverno={inverno} />
      <Sofa />
      {inverno < 0.5 && <Calor t={t} min={[-3.3, 0.5, -1.3]} max={[-0.3, 2.6, 1.3]} n={26} puxa={puxaSala} alvo={alvoCalor} />}
      {flocos > 0.02 && <Flocos t={t} min={[-3.3, 0.5, -1.3]} max={[-0.3, 2.6, 1.3]} n={Math.round(24 * flocos)} />}
      {/* etapas 0 e 1: ventilador (e balde) soprando no sofá */}
      {etapa <= 1 && cena.semVentilador !== true && (
        <>
          <Ventilador p={[VENT.x, 0, VENT.z]} giro={t * 27} rotY={Math.atan2(CABECA_ZECA[0] - VENT.x, CABECA_ZECA[2] - VENT.z)} />
          <Fluxo t={t} de={[VENT.x, 1.02, VENT.z]} para={etapa === 1 ? [BALDE.x, 1.05, BALDE.z] : CABECA_ZECA} alcance={etapa === 1 ? 0.95 : 0.25} largura={0.5} altura={0.35} troca={frioAr} n={34} />
          {etapa === 1 && (
            <>
              <Banquinho p={[BALDE.x, 0, BALDE.z]} />
              <Balde p={[BALDE.x, 0.795, BALDE.z]} derretido={derretido} />
            </>
          )}
        </>
      )}
      {/* etapas 2+: o aparelho em peças, até virar o split */}
      {etapa >= 2 && k > 0.3 && (
        <group>
          <Mesa />
          {etapa <= 4 && <Lata nivel={nivel} gas={gas} ferve={frio} t={t} />}
          {trechos.map((tr, i) => <CanoComFluxo key={`${etapa}-${temValvula}-${i}`} trecho={tr} t={t} deslocamento={(tr.fixo ? andouFixo : andou) + i * 0.37} />)}
          {temValvula && <Valvula k={valvula} />}
          {etapa >= 4 && <Geada k={geada} t={t} degelo={cena.degelo === true} />}
          {temValvula && <CalorPeloCano t={t} forca={calorCano} />}
          <Ventilador p={[-0.85, 0.0, EVAP.z]} giro={t * 27 * (temCompressor ? motor : 1)} rotY={-Math.PI / 2} />
          {etapa === 2 && cena.vaza !== false && <Nuvem t={t} de={[-1.1, 1.42, ZR]} rumo={[0.1, 1, -0.6]} forca={nivel > 0.02 ? 1 : 0} />}
          {etapa >= 4 && (
            <>
              <Condensador />
              <Ventilador p={[CENTRO_COND[0], 0.08, -0.6]} giro={giroFora * 27 * (temCompressor ? motor : 1)} rotY={0} />
            </>
          )}
          {temCompressor && <Compressor t={t} motor={motor} />}
          {etapa >= 6 && cena.grafite === true && <Grafite />}
          <Bandeja visivel={etapa >= 7 && cena.bandeja !== false} t={t} pinga={cena.pinga === true} />
          {etapa >= 9 && <PlacaInverter t={t} velocidade={velocidade} />}
          {/* ar da sala passando pela serpentina de dentro (no inverno ele entra frio e, aquecendo, sai laranja) */}
          <Fluxo t={t} de={[-0.95, 1.08, EVAP.z]} para={[-1.6, 1.1, EVAP.z]} alcance={0.95} largura={0.5} altura={0.3}
            troca={quente ? (inverno > 0 ? motor * (1 - geada * 0.8) : 0) : frioAr}
            cor={mistura("#f6c27c", "#a9d8f2", inverno)} corDepois={quente ? "#ff7a4a" : "#8fd6f7"} n={30} />
          {/* ar da rua passando pela serpentina de fora; com gelo nas aletas ele quase não passa */}
          {etapa >= 4 && ventFora > 0.05 && (
            <Fluxo t={t} de={[CENTRO_COND[0], 0.85, -0.45]} para={[CENTRO_COND[0], 0.85, 0.05]} alcance={1.1 * (1 - geada * 0.85)} largura={0.8} altura={0.7}
              cor={mistura("#f6c27c", "#cfe9fb", inverno)} corDepois={quente ? (inverno > 0 ? "#3d8fe0" : "#8fd6f7") : "#ff7a4a"}
              troca={quente ? 1 : Math.max(calorFora, 0)} vel={(temCompressor ? Math.max(motor, 0.15) : 1) * ventFora} n={30} />
          )}
          {etapa >= 4 && calorFora > 0 && <CalorIndo t={t} de={CENTRO_COND} para={[CENTRO_COND[0] + 0.6, 1.9, 1.6]} espalha={0.35} espalhaFim={0.5} forca={calorFora} n={22} />}
          {etapa >= 4 && calorFora < 0 && <CalorIndo t={t} de={[CENTRO_COND[0] + 0.3, 1.5, 1.4]} para={CENTRO_COND} espalha={0.6} espalhaFim={0.2} forca={-calorFora} n={22} semente={4} />}
        </group>
      )}
      {etapa >= 8 && <Termostato ligado={ligadoAgora} />}
      {etapa >= 10 && (
        <>
          <SplitParede k={montado} t={t} motor={motor} sentido={sentido} />
          {montado > 0.9 && (
            <>
              <Fluxo t={t} de={[UNID_DENTRO[0], UNID_DENTRO[1] - 0.15, UNID_DENTRO[2] + 0.2]} para={CABECA_ZECA} alcance={0.2} largura={0.8} altura={0.15} desce
                cor={sentido < 0 ? "#ff7a4a" : "#8fd6f7"} corDepois={sentido < 0 ? "#ff7a4a" : "#8fd6f7"} n={34} />
              {/* o ventilador da condensadora joga para a rua o ar que esquentou na serpentina */}
              <Fluxo t={t} de={[UNID_FORA[0] + 0.28, UNID_FORA[1], UNID_FORA[2] + 0.12]} para={[UNID_FORA[0] + 0.9, UNID_FORA[1] + 0.05, UNID_FORA[2] + 0.3]} alcance={0.9}
                largura={0.45} altura={0.4} cor={sentido < 0 ? "#8fd6f7" : "#ffb27a"} corDepois={sentido < 0 ? "#8fd6f7" : "#ff7a4a"} troca={1} vel={Math.max(motor, 0.15)} n={26} />
              {calorFora > 0 && <CalorIndo t={t} de={[UNID_FORA[0] + 0.25, UNID_FORA[1], UNID_FORA[2]]} para={[UNID_FORA[0] + 1.6, 1.8, 1.2]} espalha={0.2} espalhaFim={0.6} forca={calorFora} n={20} />}
              {calorFora < 0 && <CalorIndo t={t} de={[UNID_FORA[0] + 1.6, 1.6, 1.2]} para={[UNID_FORA[0] + 0.25, UNID_FORA[1], UNID_FORA[2]]} espalha={0.6} espalhaFim={0.15} forca={-calorFora} n={20} semente={4} />}
            </>
          )}
        </>
      )}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 42) => ({ pos, alvo, fov });

export const ciclo: Cenario3D = {
  Cena: Ciclo,
  padrao: "sala",
  fundo: (cena: CenaV2, progresso: number) => mistura(CEU, CEU_INVERNO, valor(cena.inverno as Valor, progresso, 0)),
  cameras: {
    casa: c([-0.6, 2.2, 8.0], [-0.6, 1.15, 0], 54),
    sala: c([-1.75, 1.85, 4.9], [-1.95, 1.15, -0.2], 52),
    "sala-perto": c([-1.8, 1.55, 3.5], [-2.05, 1.0, 0], 48),
    zeca: c([-1.75, 1.45, 2.4], [-2.5, 1.0, 0.05], 40),
    "zeca-perto": c([-1.95, 1.35, 1.75], [-2.5, 1.12, 0.05], 36),
    balde: c([-1.45, 1.55, 2.3], [-2.05, 1.0, 0.1], 46),
    "balde-cima": c([-1.55, 1.95, 0.95], [-1.7, 1.0, 0.16], 42),
    lata: c([-0.95, 1.4, 0.5], [-1.22, 1.0, -0.16], 40),
    dentro: c([-1.45, 1.55, 2.6], [-1.5, 1.05, 0], 46),
    evaporador: c([-1.45, 1.42, 1.15], [-1.6, 1.1, 0.05], 42),
    parede: c([0.15, 1.55, 2.6], [0.05, 1.15, 0], 46),
    fora: c([1.45, 1.55, 3.4], [1.35, 0.78, 0], 46),
    condensador: c([1.95, 1.05, 1.7], [1.9, 0.78, 0], 44),
    compressor: c([1.15, 0.85, 1.25], [0.88, 0.42, 0.11], 40),
    capilar: c([0.62, 1.5, 1.15], [0.45, 1.3, 0.38], 32),
    valvula: c([1.55, 1.15, 1.45], [1.12, 0.86, 0.11], 32),
    "valvula-perto": c([1.36, 1.02, 0.95], [1.12, 0.9, 0.11], 30),
    termostato: c([-1.25, 1.58, -0.75], [-1.2, 1.55, -1.54], 34),
    dreno: c([-1.35, 1.15, 0.95], [-1.6, 0.95, 0.05], 40),
    placa: c([1.35, 0.78, 1.15], [1.18, 0.6, 0.5], 34),
    "split-dentro": c([-1.7, 1.75, 3.4], [-1.9, 1.75, -0.6], 52),
    "split-fora": c([1.9, 1.45, 2.0], [0.45, 1.25, 0], 44),
    "split-parede": c([0.95, 2.1, 0.9], [0.0, 1.85, -1.4], 46),
  },
};
