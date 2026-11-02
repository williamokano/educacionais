import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, valor } from "../../../src/v3d/anima";
import { caminhoReto, caminhoSuave, CanoComFluxo, FLUIDO, helice, Trecho } from "../../../src/v3d/cano";
import { CalorIndo, Fluxo, Nuvem } from "../../../src/v3d/particulas";
import { Caixa, Mat, rnd, useSeg } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, V3, Valor } from "../../../src/v3d/tipos";
import { CenaV2 } from "../../../src/v2/tipos";
import { Flocos } from "./ciclo";

// Casa em corte do episódio 3 (o banho): banheiro à esquerda, área de serviço no meio, rua à direita, laje com a
// caixa-d'água numa torre e, no fim, o aquecedor solar. A água corre nos canos como bolinhas (azul fria, laranja quente).
// Campos da cena (número ou { de, para, ini, fim }):
//   aquecimento "eletrico" (padrão: um cano só, frio, e o chuveiro com a resistência) · "bomba" (boiler com a bomba de
//     calor em cima, dois canos e misturador) · "solar" (placa e boiler na laje, termossifão, dois canos e misturador)
//   banho 0..1 a água correndo (padrão 1) · resistencia 0..1 brilho da resistência do chuveiro (padrão 1)
//   quente 0..1 quanto do boiler está quente, de cima para baixo (padrão 1) · bomba 0..1 a bomba de calor ligada
//   apoio 0..1 resistência de apoio no fundo do boiler · esfria 0..1 flocos de frio na área de serviço
//   perde 0..1 calor escapando do boiler · isolamento 0..1 a camada grossa de isolamento aparece
//   canoQuente 0..1 o cano quente aparece (padrão 1 fora do elétrico) · paredeAberta: true = rasgo na parede do banheiro
//   sol 0..1 raios de sol na placa (padrão 1 no solar) · nublado 0..1 nuvens cobrindo o sol
//   gigante: true = a condensadora enorme encostada no banheiro · geladeira: true · fotovoltaica: true (placa de luz)
// A pessoa no banho é posta pelo roteiro em PESSOA (pos [-2.6, -0.75], rot 0).

type V = V3;
const { liquidoFrio: AZ, liquidoQuente: LJ } = FLUIDO;
const MISTURA = "#ffbe73";

export const PESSOA = { pos: [-2.6, -0.75] as [number, number], rot: 0 };
const DUCHA: V = [-2.6, 2.08, -0.86];
const MIST: V = [-2.6, 1.22, -1.5];
const BOILER = { x: 0.35, y0: 0.22, h: 1.3, z: -0.9, r: 0.3 };
const TOPO_BOILER = BOILER.y0 + BOILER.h;
const CAIXA = { x: -0.3, y0: 4.4, h: 0.6, z: -0.7, r: 0.42 };
const PLACA = { x: -2.5, larg: 1.1, comp: 1.2, inc: 0.56, zBaixo: 0.45, yBaixo: 3.22 };
const PLACA_TOPO: V = [PLACA.x, PLACA.yBaixo + PLACA.comp * Math.sin(PLACA.inc), PLACA.zBaixo - PLACA.comp * Math.cos(PLACA.inc)];
const BOILER_SOL = { x: -2.5, y: 4.27, z: -1.05, r: 0.25, comp: 1.2 };
const SOL: V = [-4.6, 7.4, -4.2];

const mistura = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getStyle();

/* ---------- canos ---------- */

type Rede = { trechos: Trecho[]; saida: string };

const rede = (modo: string, quente: number): Rede => {
  const r = (pts: V[], cores: [number, string][], raio = 0.024): Trecho => ({ curva: caminhoReto(pts, 0.05), cores, raio, densidade: 22 });
  const corQuente = mistura(AZ, LJ, quente);
  const t: Trecho[] = [];
  // a rua enche a caixa-d'água; da caixa desce a água fria da casa
  t.push(r([[3.6, 0.02, 0.7], [1.3, 0.02, 0.7], [1.3, 4.86, 0.7], [1.3, 4.86, CAIXA.z], [CAIXA.x + CAIXA.r + 0.02, 4.86, CAIXA.z]], [[0, AZ]], 0.03));
  t.push(r([[CAIXA.x, CAIXA.y0, CAIXA.z], [CAIXA.x, 2.72, CAIXA.z], [CAIXA.x, 2.72, -1.46]], [[0, AZ]], 0.03));
  if (modo === "eletrico") {
    t.push(r([[CAIXA.x, 2.72, -1.46], [DUCHA[0], 2.72, -1.46], [DUCHA[0], DUCHA[1] + 0.02, -1.46], [DUCHA[0], DUCHA[1] + 0.02, DUCHA[2]]], [[0, AZ]]));
    return { trechos: t, saida: LJ };
  }
  // dois canos: a fria vai ao misturador (e ao boiler); a quente sai do boiler; o misturador sobe para a ducha
  t.push(r([[CAIXA.x, 2.72, -1.46], [-2.78, 2.72, -1.46], [-2.78, MIST[1], -1.46], [MIST[0] - 0.07, MIST[1], -1.46]], [[0, AZ]]));
  t.push(r([[MIST[0], MIST[1] + 0.07, -1.46], [MIST[0], DUCHA[1] + 0.02, -1.46], [DUCHA[0], DUCHA[1] + 0.02, DUCHA[2]]], [[0, mistura(AZ, MISTURA, quente)]]));
  if (modo === "bomba") {
    t.push(r([[CAIXA.x, 2.72, -1.46], [0.8, 2.72, -1.46], [0.8, BOILER.y0 + 0.12, -1.46], [0.8, BOILER.y0 + 0.12, BOILER.z], [BOILER.x + BOILER.r, BOILER.y0 + 0.12, BOILER.z]], [[0, AZ]]));
  } else {
    // solar: a caixa (mais alta) alimenta o boiler da laje
    t.push(r([[CAIXA.x - CAIXA.r, CAIXA.y0 + 0.08, CAIXA.z], [-1.35, CAIXA.y0 + 0.08, CAIXA.z], [-1.35, CAIXA.y0 + 0.08, BOILER_SOL.z], [-1.35, BOILER_SOL.y - 0.16, BOILER_SOL.z], [BOILER_SOL.x + BOILER_SOL.comp / 2, BOILER_SOL.y - 0.16, BOILER_SOL.z]], [[0, AZ]]));
  }
  return { trechos: t, saida: MISTURA };
};

/** Cano quente, do boiler (área de serviço ou laje) até o misturador. */
const canoQuente = (modo: string, quente: number): Trecho => {
  const pts: V[] = modo === "bomba"
    ? [[BOILER.x - BOILER.r, TOPO_BOILER - 0.12, BOILER.z], [-0.35, TOPO_BOILER - 0.12, BOILER.z], [-0.35, TOPO_BOILER - 0.12, -1.53], [-0.35, 2.52, -1.53], [-2.42, 2.52, -1.53], [-2.42, MIST[1], -1.53], [MIST[0] + 0.07, MIST[1], -1.53]]
    : [[BOILER_SOL.x + 0.2, BOILER_SOL.y - BOILER_SOL.r, -1.22], [-2.3, 2.52, -1.22], [-2.3, 2.52, -1.53], [-2.42, 2.52, -1.53], [-2.42, MIST[1], -1.53], [MIST[0] + 0.07, MIST[1], -1.53]];
  return { curva: caminhoReto(pts, 0.05), cores: [[0, mistura(AZ, LJ, quente)]], raio: 0.024, densidade: 22, cano: "#e9c9a6" };
};

/* ---------- peças ---------- */

/** Chuveiro elétrico em corte (resistência acesa) ou ducha de metal; água caindo. */
const Ducha: React.FC<{ t: number; eletrico: boolean; brilho: number; banho: number; cor: string }> = ({ t, eletrico, brilho, banho, cor }) => {
  const seg = useSeg();
  const espiral = useMemo(() => caminhoSuave(helice(-0.06, 0.06, 0, 0, 0.022, 9)), []);
  return (
    <group position={DUCHA}>
      {eletrico ? (
        <group position={[0, -0.04, 0]}>
          <mesh><cylinderGeometry args={[0.12, 0.09, 0.12, seg(18, 40)]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.45} roughness={0.2} clearcoat={1} depthWrite={false} /></mesh>
          <mesh><tubeGeometry args={[espiral, 160, 0.0045, 6, false]} /><meshStandardMaterial color="#ff6a2a" emissive="#ff4a10" emissiveIntensity={1.8 * brilho} /></mesh>
          <mesh position={[0, -0.066, 0]}><cylinderGeometry args={[0.122, 0.122, 0.012, seg(18, 40)]} /><Mat cor="#e4e7ea" rug={0.4} /></mesh>
        </group>
      ) : (
        <mesh position={[0, -0.03, 0]}><cylinderGeometry args={[0.13, 0.05, 0.06, seg(18, 40)]} /><Mat cor="#c9cfd5" met={0.9} rug={0.2} /></mesh>
      )}
      {banho > 0.05 && Array.from({ length: 40 }).map((_, i) => {
        const c = (t * 1.5 + rnd(i + 3)) % 1;
        const a = rnd(i) * Math.PI * 2;
        const rr = rnd(i + 9) * 0.1;
        return (
          <mesh key={i} position={[Math.cos(a) * (rr + c * 0.12), -0.09 - c * 1.95, Math.sin(a) * (rr + c * 0.12)]} scale={[0.007, 0.024, 0.007]}>
            <sphereGeometry args={[1, 6, 5]} />
            <meshPhysicalMaterial color={cor} transparent opacity={0.8 * banho} roughness={0.05} />
          </mesh>
        );
      })}
    </group>
  );
};

const Misturador: React.FC = () => (
  <group position={[MIST[0], MIST[1], -1.53]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 0.02, 32]} /><Mat cor="#d7dce1" met={0.9} rug={0.2} /></mesh>
    <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.035, 0.07, 20]} /><Mat cor="#c3c9cf" met={0.9} rug={0.2} /></mesh>
    <Caixa p={[0, 0.06, 0.08]} t={[0.025, 0.12, 0.025]} cor="#c3c9cf" met={0.9} rug={0.2} raio={0.01} />
    <mesh position={[-0.055, -0.055, 0.012]}><circleGeometry args={[0.012, 12]} /><meshBasicMaterial color="#3f8ff0" /></mesh>
    <mesh position={[0.055, -0.055, 0.012]}><circleGeometry args={[0.012, 12]} /><meshBasicMaterial color="#ff5a3c" /></mesh>
  </group>
);

/** Boiler em corte: água quente em cima, fria embaixo; serpentina da bomba de calor dentro e resistência de apoio no fundo. */
const Boiler: React.FC<{ t: number; quente: number; bomba: number; apoio: number; isolamento: number; perde: number }> = ({ t, quente, bomba, apoio, isolamento, perde }) => {
  const seg = useSeg();
  const { x, y0, h, z, r } = BOILER;
  const hq = h * clamp01(quente);
  // serpentina da bomba de calor dentro da água: desce em espiral do topo (gás quente) até embaixo (líquido)
  const serp = useMemo<Trecho>(() => ({
    curva: caminhoSuave(Array.from({ length: 97 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return [Math.cos(a) * r * 0.62, y0 + h - 0.15 - (i / 96) * (h - 0.4), Math.sin(a) * r * 0.62] as V;
    })),
    cores: [[0, FLUIDO.gasQuente], [1, LJ]], raio: 0.014, densidade: 30, cano: "#c8743c",
  }), []);
  const resist = useMemo(() => caminhoSuave(helice(-0.12, 0.12, 0, 0, 0.03, 8)), []);
  return (
    <group position={[x, 0, z]}>
      {/* casca translúcida e a água em duas camadas */}
      <mesh position={[0, y0 + h / 2, 0]}><cylinderGeometry args={[r, r, h, seg(20, 48), 1, true]} /><meshPhysicalMaterial color="#e8eef3" transparent opacity={0.22} roughness={0.15} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {isolamento > 0.02 && (
        <mesh position={[0, y0 + h / 2, 0]} scale={[1 + 0.18 * isolamento, 1, 1 + 0.18 * isolamento]}><cylinderGeometry args={[r, r, h + 0.04, seg(20, 48), 1, true]} /><meshStandardMaterial color="#f2d06b" transparent opacity={0.45 * isolamento} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      )}
      {h - hq > 0.01 && <mesh position={[0, y0 + (h - hq) / 2, 0]}><cylinderGeometry args={[r * 0.96, r * 0.96, h - hq, seg(20, 48)]} /><meshPhysicalMaterial color={AZ} transparent opacity={0.55} roughness={0.1} /></mesh>}
      {hq > 0.01 && <mesh position={[0, y0 + h - hq / 2, 0]}><cylinderGeometry args={[r * 0.96, r * 0.96, hq, seg(20, 48)]} /><meshPhysicalMaterial color={LJ} transparent opacity={0.6} roughness={0.1} /></mesh>}
      {[y0, y0 + h].map((y) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[r * 1.03, r * 1.03, 0.03, seg(20, 48)]} /><Mat cor="#dfe3e7" met={0.4} rug={0.4} /></mesh>)}
      {[-1, 1].map((s) => <Caixa key={s} p={[s * r * 0.6, y0 / 2, 0]} t={[0.04, y0, 0.04]} cor="#6d747b" raio={0.008} />)}
      {/* bomba de calor em cima: caixa com grade, ventilador e o ar passando */}
      {(
        <group position={[0, y0 + h + 0.2, 0]}>
          <Caixa p={[0, 0, 0]} t={[0.62, 0.36, 0.62]} cor="#eef0f2" raio={0.04} rug={0.4} op={0.92} />
          <group position={[0, 0, 0.312]}>
            <mesh><ringGeometry args={[0.1, 0.13, seg(20, 40)]} /><meshStandardMaterial color="#3a3f44" side={THREE.DoubleSide} /></mesh>
            <group rotation={[0, 0, t * 18 * bomba]}>
              {[0, 1, 2].map((i) => <group key={i} rotation={[0, 0, (i / 3) * Math.PI * 2]}><mesh position={[0, 0.05, 0]}><boxGeometry args={[0.05, 0.09, 0.004]} /><meshStandardMaterial color="#20252a" /></mesh></group>)}
            </group>
          </group>
          <mesh position={[0.22, 0.12, 0.315]}><circleGeometry args={[0.012, 12]} /><meshBasicMaterial color={bomba > 0.05 ? "#5bd47a" : "#555"} /></mesh>
        </group>
      )}
      {bomba > 0.05 && <CanoComFluxo trecho={serp} t={t} deslocamento={t * 0.25 * bomba} />}
      <group position={[0, y0 + 0.1, 0]}>
        <mesh><tubeGeometry args={[resist, 120, 0.006, 6, false]} /><meshStandardMaterial color="#9a5b3a" emissive="#ff4a10" emissiveIntensity={1.8 * apoio} /></mesh>
      </group>
      {perde > 0.02 && <CalorIndo t={t} de={[0, y0 + h * 0.7, 0]} para={[0.1, y0 + h * 0.8, 0.9]} espalha={0.25} espalhaFim={0.5} n={10} tamanho={0.6} forca={perde} semente={9} />}
    </group>
  );
};

const CaixaDagua: React.FC = () => {
  const seg = useSeg();
  return (
    <group position={[CAIXA.x, 0, CAIXA.z]}>
      <Caixa p={[0, (3.12 + CAIXA.y0) / 2, 0]} t={[0.95, CAIXA.y0 - 3.12, 0.95]} cor="#c9c4ba" raio={0.01} rug={0.95} />
      <mesh position={[0, CAIXA.y0 + CAIXA.h / 2, 0]}><cylinderGeometry args={[CAIXA.r, CAIXA.r * 0.9, CAIXA.h, seg(20, 48)]} /><Mat cor="#2f6fc9" rug={0.45} verniz={0.4} /></mesh>
      <mesh position={[0, CAIXA.y0 + CAIXA.h + 0.03, 0]}><cylinderGeometry args={[CAIXA.r * 1.05, CAIXA.r * 1.05, 0.06, seg(20, 48)]} /><Mat cor="#2a62b3" rug={0.45} /></mesh>
    </group>
  );
};

/** Placa de aquecimento solar em corte (vidro, chapa preta, tubos de cobre) e o boiler acima dela: termossifão. */
const AquecedorSolar: React.FC<{ t: number; sol: number; anda: number }> = ({ t, sol, anda }) => {
  const seg = useSeg();
  const { x, larg, comp, inc, zBaixo, yBaixo } = PLACA;
  const ponto = (u: number, s: number, alto = 0.04): V => [x + s * larg * 0.42, yBaixo + u * comp * Math.sin(inc) + alto * Math.cos(inc), zBaixo - u * comp * Math.cos(inc) + alto * Math.sin(inc)];
  const tubos = useMemo<Trecho[]>(() => [-1, -0.5, 0, 0.5, 1].map((s) => ({ curva: caminhoReto([ponto(0.04, s), ponto(0.96, s)], 0.01), cores: [[0, AZ], [1, LJ]], raio: 0.016, densidade: 30, cano: "#c8743c" })), []);
  const ligacoes = useMemo<Trecho[]>(() => {
    const b = BOILER_SOL;
    const fria: V[] = [[b.x - b.comp / 2, b.y - 0.15, b.z], [-3.2, b.y - 0.15, b.z], [-3.2, yBaixo + 0.04, b.z], [-3.2, yBaixo + 0.04, zBaixo + 0.06], ponto(0.02, -1.05)];
    const quente: V[] = [ponto(0.98, 1.05), [-1.85, PLACA_TOPO[1] + 0.06, PLACA_TOPO[2]], [-1.85, b.y + 0.1, PLACA_TOPO[2]], [-1.85, b.y + 0.1, b.z], [b.x + b.comp / 2, b.y + 0.1, b.z]];
    return [
      { curva: caminhoReto(fria, 0.05), cores: [[0, AZ]], raio: 0.022, densidade: 22 },
      { curva: caminhoReto(quente, 0.05), cores: [[0, LJ]], raio: 0.022, densidade: 22 },
    ];
  }, []);
  const b = BOILER_SOL;
  return (
    <group>
      {/* moldura, chapa preta e vidro, inclinados para o sol */}
      <group position={ponto(0.5, 0, 0)} rotation={[-(Math.PI / 2 - inc), 0, 0]}>
        <Caixa p={[0, 0, -0.03]} t={[larg + 0.08, comp + 0.08, 0.06]} cor="#9aa3ab" met={0.6} rug={0.35} raio={0.01} />
        <mesh position={[0, 0, 0.003]}><planeGeometry args={[larg, comp]} /><meshStandardMaterial color="#14161a" roughness={0.6} emissive="#ff6a2a" emissiveIntensity={0.05 * sol} /></mesh>
        <mesh position={[0, 0, 0.075]}><planeGeometry args={[larg, comp]} /><meshPhysicalMaterial color="#d9f1ff" transparent opacity={0.18} roughness={0.02} clearcoat={1} depthWrite={false} /></mesh>
      </group>
      {[[0.02, -1.05], [0.98, -1.05]].map(([u], i) => (
        <mesh key={i} position={ponto(u, 0)} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.024, 0.024, larg * 0.9, 12]} /><Mat cor="#c8743c" met={0.7} rug={0.35} /></mesh>
      ))}
      {tubos.map((tr, i) => <CanoComFluxo key={i} trecho={tr} t={t} deslocamento={t * 0.12 * anda + i * 0.2} />)}
      {ligacoes.map((tr, i) => <CanoComFluxo key={`l${i}`} trecho={tr} t={t} deslocamento={t * 0.12 * anda} />)}
      {/* pés da placa */}
      {[-1, 1].map((s) => <Caixa key={s} p={[x + s * larg * 0.45, (3.12 + PLACA_TOPO[1]) / 2, PLACA_TOPO[2] + 0.05]} t={[0.04, PLACA_TOPO[1] - 3.12, 0.04]} cor="#7a8188" raio={0.006} />)}
      {/* boiler deitado, acima do topo da placa */}
      <group position={[b.x, b.y, b.z]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[b.r, b.r, b.comp, seg(20, 48)]} /><Mat cor="#d9dde1" met={0.6} rug={0.3} /></mesh>
        {[-1, 1].map((s) => <Caixa key={s} p={[s * b.comp * 0.38, -(b.y - 3.12) / 2, 0]} t={[0.05, b.y - 3.12, 0.05]} cor="#7a8188" raio={0.006} />)}
      </group>
      {sol > 0.05 && Array.from({ length: 6 }).map((_, i) => {
        const alvo = ponto(0.2 + (i % 3) * 0.3, i < 3 ? -0.5 : 0.5, 0.1);
        const meio = new THREE.Vector3(...SOL).lerp(new THREE.Vector3(...alvo), 0.5);
        const dir = new THREE.Vector3(...alvo).sub(new THREE.Vector3(...SOL));
        const comprimento = dir.length();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        const pisca = 0.55 + 0.45 * Math.sin(t * 3 + i);
        return (
          <mesh key={i} position={meio} quaternion={q}>
            <cylinderGeometry args={[0.012, 0.012, comprimento, 6]} />
            <meshBasicMaterial color="#ffd23f" transparent opacity={0.55 * sol * pisca} />
          </mesh>
        );
      })}
      {sol > 0.3 && <CalorIndo t={t} de={ponto(0.5, 0, 0.3)} para={ponto(0.5, 0, 0.05)} espalha={0.45} espalhaFim={0.3} n={12} tamanho={0.6} forca={sol} semente={5} />}
    </group>
  );
};

const PlacaLuz: React.FC = () => (
  <group position={[-1.15, 3.55, 0.0]} rotation={[-(Math.PI / 2 - PLACA.inc), 0, 0]}>
    <Caixa p={[0, 0, 0]} t={[0.62, 1.0, 0.04]} cor="#b9c0c8" met={0.6} rug={0.3} raio={0.008} />
    {Array.from({ length: 12 }).map((_, i) => (
      <Caixa key={i} p={[-0.14 + (i % 2) * 0.28, -0.4 + Math.floor(i / 2) * 0.16, 0.022]} t={[0.26, 0.14, 0.01]} cor="#1d3f7a" met={0.3} rug={0.2} raio={0.003} verniz={0.8} />
    ))}
    {[-1, 1].map((s) => <Caixa key={s} p={[s * 0.25, -0.45, -0.3]} t={[0.03, 0.03, 0.6]} cor="#7a8188" raio={0.005} />)}
  </group>
);

const Geladeira: React.FC<{ t: number }> = ({ t }) => (
  <group position={[-0.55, 0, -1.15]}>
    <Caixa p={[0, 0.82, 0]} t={[0.62, 1.64, 0.6]} cor="#f3f4f2" raio={0.05} rug={0.3} verniz={0.6} />
    <Caixa p={[0, 1.18, 0.302]} t={[0.6, 0.012, 0.01]} cor="#d5d8da" raio={0.002} />
    <Caixa p={[0.24, 1.45, 0.32]} t={[0.025, 0.22, 0.03]} cor="#c3c9cf" met={0.8} rug={0.2} raio={0.01} />
    <Caixa p={[0.24, 0.85, 0.32]} t={[0.025, 0.28, 0.03]} cor="#c3c9cf" met={0.8} rug={0.2} raio={0.01} />
    {/* serpentina atrás: o calor de dentro saindo para a cozinha */}
    {Array.from({ length: 7 }).map((_, i) => <Caixa key={i} p={[0, 0.35 + i * 0.18, -0.33]} t={[0.5, 0.018, 0.018]} cor="#2a2d31" met={0.5} rug={0.4} raio={0.006} />)}
    <CalorIndo t={t} de={[0, 0.9, -0.36]} para={[0.5, 2.1, -0.1]} espalha={0.25} espalhaFim={0.45} n={14} tamanho={0.8} semente={13} />
  </group>
);

const CondensadoraGigante: React.FC<{ t: number }> = ({ t }) => {
  const seg = useSeg();
  return (
    <group position={[-4.45, 1.05, -0.3]}>
      <Caixa p={[0, 0, 0]} t={[1.2, 2.0, 1.7]} cor="#e6e8ea" raio={0.08} rug={0.4} />
      <group position={[0, 0.1, 0.86]}>
        <mesh><ringGeometry args={[0.5, 0.62, seg(28, 56)]} /><meshStandardMaterial color="#3a3f44" side={THREE.DoubleSide} /></mesh>
        <group rotation={[0, 0, t * 14]}>
          {[0, 1, 2].map((i) => <group key={i} rotation={[0, 0, (i / 3) * Math.PI * 2]}><mesh position={[0, 0.25, 0]}><boxGeometry args={[0.25, 0.42, 0.01]} /><meshStandardMaterial color="#20252a" /></mesh></group>)}
        </group>
      </group>
    </group>
  );
};

const Nuvens: React.FC<{ k: number; t: number }> = ({ k, t }) => (
  <group position={[-3.6 + (1 - k) * -4 + Math.sin(t * 0.3) * 0.1, 6.1, -3.2]}>
    {[[0, 0, 0, 0.75], [0.7, 0.15, 0.1, 0.6], [-0.7, -0.05, 0.05, 0.6], [0.3, 0.45, -0.1, 0.55], [1.35, -0.05, 0, 0.45]].map(([x, y, z, s], i) => (
      <mesh key={i} position={[x, y, z]} scale={s}><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color="#9ea6ad" roughness={1} transparent opacity={0.95 * k} /></mesh>
    ))}
  </group>
);

/* ---------- casa em corte ---------- */

const Azulejo: React.FC<{ x0: number; x1: number; y1: number }> = ({ x0, x1, y1 }) => (
  <group>
    {Array.from({ length: Math.round((x1 - x0) / 0.25) }).map((_, i) => (
      <mesh key={`v${i}`} position={[x0 + (i + 1) * 0.25, y1 / 2, -1.548]}><planeGeometry args={[0.006, y1]} /><meshBasicMaterial color="#b9d1dc" /></mesh>
    ))}
    {Array.from({ length: Math.round(y1 / 0.25) }).map((_, i) => (
      <mesh key={`h${i}`} position={[(x0 + x1) / 2, (i + 1) * 0.25, -1.548]}><planeGeometry args={[x1 - x0, 0.006]} /><meshBasicMaterial color="#b9d1dc" /></mesh>
    ))}
  </group>
);

const Casa: React.FC<{ paredeAberta: boolean }> = ({ paredeAberta }) => (
  <group>
    <mesh position={[0, -0.065, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /><Mat cor="#a3ab98" rug={0.95} /></mesh>
    <Caixa p={[-1.3, -0.35, 0]} t={[4.8, 0.6, 3.2]} cor="#9a6a43" raio={0.004} rug={1} />
    {/* banheiro: piso de cerâmica e azulejo; área de serviço: piso cinza */}
    <Caixa p={[-2.35, -0.03, 0]} t={[2.6, 0.06, 3.2]} cor="#e9eef0" raio={0.004} rug={0.5} />
    <Caixa p={[-0.03, -0.03, 0]} t={[2.05, 0.06, 3.2]} cor="#bfc3c4" raio={0.004} rug={0.8} />
    <Caixa p={[-2.35, 1.5, -1.6]} t={[2.6, 3.0, 0.1]} cor="#dff0f6" raio={0.003} rug={0.5} />
    <Caixa p={[-0.03, 1.5, -1.6]} t={[2.05, 3.0, 0.1]} cor="#efe1c6" raio={0.003} rug={0.95} />
    <Azulejo x0={-3.6} x1={-1.05} y1={2.4} />
    {paredeAberta && <Caixa p={[-2.42, 1.85, -1.545]} t={[0.2, 1.3, 0.01]} cor="#8a6f55" raio={0.002} rug={1} />}
    {/* box: vidro fosco embaixo (até o peito) e transparente em cima */}
    <Caixa p={[-2.6, 0.55, -0.12]} t={[1.4, 1.1, 0.02]} cor="#f2f8fb" op={0.97} rug={0.7} raio={0.004} />
    <Caixa p={[-1.9, 0.55, -0.85]} t={[0.02, 1.1, 1.45]} cor="#f2f8fb" op={0.97} rug={0.7} raio={0.004} />
    <Caixa p={[-2.6, 0.012, -0.85]} t={[1.4, 0.02, 1.45]} cor="#cfe0e8" raio={0.004} rug={0.4} />
    {/* paredes cortadas: externa da esquerda, divisória, externa da direita; laje */}
    <Caixa p={[-3.65, 1.5, 0]} t={[0.12, 3.0, 3.2]} cor="#e8d8ba" raio={0.004} rug={0.95} />
    <Caixa p={[-1.05, 1.5, -0.6]} t={[0.1, 3.0, 2.0]} cor="#e8d8ba" raio={0.004} rug={0.95} />
    <Caixa p={[1.05, 1.5, 0]} t={[0.14, 3.0, 3.2]} cor="#e8d8ba" raio={0.004} rug={0.95} />
    <Caixa p={[-1.3, 3.06, 0]} t={[4.9, 0.12, 3.3]} cor="#c9c4ba" raio={0.004} rug={0.95} />
    {/* rua: calçada, cavalete do hidrômetro */}
    <Caixa p={[2.6, 0.04, 0.4]} t={[3.0, 0.08, 2.2]} cor="#c9c9c4" raio={0.01} rug={0.9} />
    <Caixa p={[1.75, 0.22, 0.7]} t={[0.3, 0.3, 0.2]} cor="#3b4f63" raio={0.02} />
    <mesh position={[1.75, 0.25, 0.805]}><circleGeometry args={[0.07, 20]} /><meshBasicMaterial color="#e9eef0" /></mesh>
    <mesh position={[0, 4, -6]}><planeGeometry args={[30, 14]} /><meshBasicMaterial color="#aeb9c3" /></mesh>
  </group>
);

/* ---------- cena ---------- */

const Banho: React.FC<Cenario3DProps> = ({ cena, progresso, tEpisodio: t }) => {
  const modo = (cena.aquecimento as string | undefined) ?? "eletrico";
  const eletrico = modo === "eletrico";
  const banho = valor(cena.banho as Valor, progresso, 1);
  const resistencia = valor(cena.resistencia as Valor, progresso, 1);
  const quente = valor(cena.quente as Valor, progresso, 1);
  const bomba = valor(cena.bomba as Valor, progresso, modo === "bomba" ? 1 : 0);
  const apoio = valor(cena.apoio as Valor, progresso, 0);
  const esfria = valor(cena.esfria as Valor, progresso, 0);
  const perde = valor(cena.perde as Valor, progresso, 0);
  const isolamento = valor(cena.isolamento as Valor, progresso, 0);
  const temQuente = !eletrico && valor(cena.canoQuente as Valor, progresso, 1) > 0.5;
  const sol = valor(cena.sol as Valor, progresso, modo === "solar" ? 1 : 0);
  const nublado = valor(cena.nublado as Valor, progresso, 0);
  const { trechos, saida } = useMemo(() => rede(modo, quente), [modo, Math.round(quente * 10)]);
  const quenteTr = useMemo(() => canoQuente(modo, quente), [modo, Math.round(quente * 10)]);
  const anda = t * 0.3 * banho;
  const corAgua = eletrico ? mistura(AZ, LJ, resistencia) : mistura(AZ, saida, quente);
  return (
    <group>
      <Casa paredeAberta={cena.paredeAberta === true} />
      <CaixaDagua />
      {trechos.map((tr, i) => <CanoComFluxo key={`${modo}-${i}`} trecho={tr} t={t} deslocamento={anda + i * 0.31} />)}
      {temQuente && <CanoComFluxo trecho={quenteTr} t={t} deslocamento={anda} />}
      {!eletrico && <Misturador />}
      <Ducha t={t} eletrico={eletrico} brilho={resistencia * banho} banho={banho} cor={corAgua} />
      {banho > 0.3 && (eletrico ? resistencia : quente) > 0.4 && <Nuvem t={t} de={[DUCHA[0], 1.0, DUCHA[2] + 0.2]} rumo={[0.2, 0.6, 0.6]} n={8} tamanho={0.8} forca={0.6} />}
      {modo === "bomba" && (
        <>
          <Boiler t={t} quente={quente} bomba={bomba} apoio={apoio} isolamento={isolamento} perde={perde} />
          {/* o ar da área de serviço passa pela bomba de calor e sai mais frio; o calor entra nela */}
          {bomba > 0.05 && (
            <>
              <Fluxo t={t} de={[BOILER.x - 0.9, TOPO_BOILER + 0.2, BOILER.z + 0.5]} para={[BOILER.x, TOPO_BOILER + 0.2, BOILER.z]} alcance={0.9} largura={0.35} altura={0.25}
                cor="#f6c27c" corDepois="#8fd6f7" troca={1} vel={bomba} n={22} />
              <CalorIndo t={t} de={[BOILER.x - 0.9, 1.3, 0.4]} para={[BOILER.x, TOPO_BOILER + 0.2, BOILER.z]} espalha={0.5} espalhaFim={0.1} n={14} tamanho={0.7} forca={bomba} semente={3} />
            </>
          )}
        </>
      )}
      {esfria > 0.02 && <Flocos t={t} min={[-0.9, 0.4, -1.2]} max={[0.9, 2.5, 1.0]} n={Math.round(16 * esfria)} />}
      {modo === "solar" && <AquecedorSolar t={t} sol={sol * (1 - nublado)} anda={Math.max(sol * (1 - nublado), 0.15)} />}
      {(modo === "solar" || sol > 0) && (
        <mesh position={SOL}><sphereGeometry args={[0.55, 24, 18]} /><meshBasicMaterial color="#ffd23f" /></mesh>
      )}
      {nublado > 0.02 && <Nuvens k={nublado} t={t} />}
      {cena.fotovoltaica === true && <PlacaLuz />}
      {cena.geladeira === true && <Geladeira t={t} />}
      {cena.gigante === true && <CondensadoraGigante t={t} />}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 42) => ({ pos, alvo, fov });

export const banho: Cenario3D = {
  Cena: Banho,
  padrao: "casa",
  fundo: (cena: CenaV2) => ((cena.aquecimento as string | undefined) === "solar" && (cena.nublado ?? 0) === 0 ? "#8fd0f5" : "#aeb9c3"),
  cameras: {
    casa: c([-1.0, 2.6, 9.6], [-1.1, 2.1, 0], 56),
    "casa-alta": c([-1.2, 3.8, 9.8], [-1.2, 3.0, 0], 58),
    banheiro: c([-2.4, 1.7, 3.4], [-2.5, 1.35, -0.8], 52),
    pessoa: c([-2.4, 1.75, 2.3], [-2.6, 1.4, -0.75], 44),
    chuveiro: c([-2.35, 2.0, -0.05], [-2.6, 2.02, -0.86], 34),
    "chuveiro-cano": c([-2.15, 2.25, 1.7], [-2.5, 2.35, -1.3], 50),
    misturador: c([-2.25, 1.35, -0.75], [-2.6, 1.22, -1.5], 34),
    canos: c([-1.2, 2.3, 3.2], [-1.3, 2.2, -1.4], 54),
    area: c([0.0, 1.6, 3.2], [-0.05, 1.15, -0.9], 50),
    boiler: c([0.75, 1.3, 1.6], [0.35, 0.95, -0.9], 42),
    "boiler-perto": c([0.75, 0.8, 0.9], [0.35, 0.55, -0.9], 42),
    "bomba-calor": c([0.95, 2.05, 1.25], [0.3, 1.55, -0.9], 44),
    rua: c([2.6, 2.6, 5.4], [0.6, 2.4, -0.2], 52),
    laje: c([-1.6, 5.2, 4.6], [-1.6, 3.8, -0.4], 50),
    placa: c([-2.2, 4.4, 2.6], [-2.5, 3.6, 0.0], 44),
    "placa-perto": c([-2.25, 4.0, 1.25], [-2.5, 3.55, -0.05], 40),
    termossifao: c([-1.0, 4.4, 3.0], [-2.5, 3.8, -0.4], 46),
    geladeira: c([0.4, 1.4, 1.6], [-0.55, 1.0, -1.15], 44),
    gigante: c([-2.6, 2.2, 6.4], [-3.7, 1.3, -0.3], 54),
  },
};
