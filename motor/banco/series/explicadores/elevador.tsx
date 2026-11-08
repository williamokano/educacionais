import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clamp01, lerp, suave, valor } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Anterior, poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Expressao3D, Personagem3D, Pose3D, V3, Valor } from "../../../src/v3d/tipos";
import { Etiqueta, Fumaca, Halo, Liga, mistura, noCaminho, Seta, Texto3D, V } from "./cozinha-base";
import { Lupa, LinhasZoom } from "./microondas-pecas";
import { homemA, homemB, homemC, mulher } from "./fieis";
import { zeca } from "./zeca";
import { Bandeirinhas, Botao, BracoInchado, Controlador, COR_TIME, Escadaria, Fosso, Impacto, LupaFreio, LupaTrava, Raio, Sensor, TVJogo } from "./elevador-extra";
import { posSeco, posSuave } from "./elevador-perfil";

// Elevador (episódio 14, "como o elevador não cai quando a corda arrebenta"). Poço em corte, em metros: chão y = 0, plano das cordas z = 0, câmera do lado +z.
// REGRA: o nome "elevador" só aparece na batida 17 (título e rótulos). A plataforma de madeira vira cabine fechada (campo `cabine`).
// Peças: plataforma (x ±0,75, topo do quadro em y + 2,2), corda esquerda (x = 0) → polia (centro x 0,7, y 8,3, raio 0,7) → corda direita (x = 1,4) → contrapeso (x = 1,4).
// O contrapeso é sempre derivado da plataforma (sobe quando ela desce): y_fundo = 5,6 − y_plataforma.
// Campos da cena (número ou { de, para, ini, fim }; booleanos/strings fixos):
//   cenário    feira: true (demo de 1854 em x = 40: palácio de vidro, povo) · predio 0..1 (prédio de 3 andares, poço escuro) · raiox 0..1 (paredes de vidro) · sala 0..1 (sala de máquinas no alto)
//              frente 0..1 (parede da frente do poço, com portas) · porta1/2/3 0..1 (abertura da porta do andar) · pino 0..1 (trava da porta do 2º andar; 1 = presa)
//   plataforma plat (y do piso, m) · quedaIni/quedaFim + quedaD (queda livre de D metros, entre esses progressos) · freia 0..1 + freiaD (freia e para, ease-out) · cabine 0..1 (paredes, porta, botões)
//              cabPorta 0..1 (porta da cabine aberta) · carga 0..1 (sacos) · destaque 0..1 (halos em CABINE, CORDAS, CONTRAPESO, TRILHO, TRAVA)
//   corda      cordas 1..4 · aco 0..1 (corda de aço) · desfia 0..1 (fios desfiando) · corte 0..1 + corteAt (y da plataforma quando arrebenta) + corteOff (m acima do topo) + corteLado "esq" | "dir"
//              ajuda 0..1 (polia de desvio e corda horizontal para os ajudantes puxarem)
//   mola       mola 0..1 (aparece, esticada pela corda; relaxa quando a corda é cortada) · trilhos 0..1 (sobem com dentes) · garras 0..1 (trava moderna fecha) · fagulha 0..1
//   máquina    motor 0..1 (aparece) · esforco 0..1 (esquenta e vibra) · cw 0..1 (contrapeso desce e se pendura) · sulcos 0..1 · reg 0..1 (regulador: 0 normal, 1 acionado) · regOn 0..1 (aparece)
//              veloz 0..1 (setas vermelhas de descida rápida)
//   lupa       lupa 0..1 · lupaX, lupaY, lupaR · lupaModo "mola" | "sulcos" | "corda" | "pino" · rompe 0..1 (um fio da corda rompe)
//   feira      aplauso 0..1 · machado 0..1 (0 = baixo, 0,5 = erguido, 1 = acertou a corda)
//   fim        interroga 0..1 · escada 0..1
//   gente      lista de { id, x, y, z, rot, acao, exp, pose, incl, naPlat, esc, puxa, suor } · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax · etiqOff (multiplicador)
//              ids: zeca (padrão), ajudante, ajudante2, casaca, homemA/B/C, mulher. naPlat: x, z e y são relativos ao piso da plataforma.
//              chaves de etiq: corda, polia, mola, trilho, trava, motor, contrapeso, cordas, regulador, porta, pino, cabine

const n0 = (v: unknown) => v as Valor;
/** Chaves [[progresso, valor], ...]: interpola entre elas com suavização (permite abrir e fechar na mesma batida). */
const chaves = (a: [number, number][], p: number) => {
  if (p <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    if (p <= a[i][0]) return lerp(a[i - 1][1], a[i][1], suave(clamp01((p - a[i - 1][0]) / Math.max(a[i][0] - a[i - 1][0], 1e-6))));
  }
  return a[a.length - 1][1];
};
const POLIA_Y = 13.3; // casa de máquinas no alto do recorte (5 andares: lajes em y = 2,5·k − 0,1)
const POL_CX = 0.7;
const POL_R = 0.7;
const CAB_H = 2.2;
const CW_X = 1.4;
const K_CW = 10.6;
const RX = 0.88;
const ALT_TRILHO = 7.3;
const WOOD = "#b4813f";
const WOOD_D = "#8a5e2c";
const STEEL = "#9aa3ae";
const IRON = "#3d4148";
const ROPE_H = "#c8ad74";
const ROPE_S = "#7d858f";
const MOLA_COR = "#f08a24";
const TZ = [-0.3, -0.1, 0.1, 0.3];

/* ---------- pessoas ---------- */

const ajudante: Personagem3D = { nome: "Ajudante", altura: 1.72, pele: "#c98f63", cabelo: "#1f1510", olhos: "#3b2415", camiseta: "#d8d0b8", calca: "#5a4632", sapato: "#2b2118", bone: { cor: "#6b5a3e", aba: "#6b5a3e", virado: false }, sobrancelha: "#1f1510", barriga: 0.3 };
const ajudante2: Personagem3D = { ...ajudante, nome: "Ajudante 2", altura: 1.76, pele: "#8d5a3a", cabelo: "#0f0b08", camiseta: "#8aa57a", calca: "#4a4036", barriga: 0.2 };
const casaca: Personagem3D = { nome: "Cavalheiro", altura: 1.74, pele: "#e3b48a", cabelo: "#3a2a1a", olhos: "#3b2415", camiseta: "#23262d", calca: "#2d2a2a", sapato: "#111111", bone: { cor: "#16171b", aba: "#16171b", virado: false }, bigode: "#3a2a1a", sobrancelha: "#3a2a1a", barriga: 0.2 };
const ROUPAS = [["#5a4636", "#2b2b30"], ["#3a3f4a", "#3a342c"], ["#6a3b3b", "#2b2b30"], ["#4a5a3e", "#3a342c"], ["#7a6a52", "#2b2b30"], ["#2f4a63", "#3a342c"], ["#5b2f4a", "#2b2b30"], ["#8a7a5a", "#3a342c"]];
const POVO: Personagem3D[] = [homemA, homemB, homemC, mulher].flatMap((b, i) => [0, 1].map((k) => ({ ...b, camiseta: ROUPAS[i * 2 + k][0], calca: ROUPAS[i * 2 + k][1], bone: k === 0 && i !== 3 ? { cor: "#1f1d1a", aba: "#1f1d1a", virado: false } : undefined })));
const zecaJogo: Personagem3D = { ...zeca, macacao: false, camiseta: COR_TIME, calca: "#2b3a55", bolso: null };
const ajT: Personagem3D = { ...ajudante, nome: "Amigo 1", camiseta: COR_TIME, calca: "#3a3f4a", bone: undefined, cabelo: "#1f1510" };
const ajT2: Personagem3D = { ...ajudante2, nome: "Amigo 2", camiseta: COR_TIME, calca: "#2b3a55", bone: undefined, cabelo: "#0f0b08" };
const PERS: Record<string, Personagem3D> = { zeca: zecaJogo, ajT, ajT2, ajudante, ajudante2, casaca, homemA, homemB, homemC, mulher };

const palma = (t: number): Pose3D => {
  const s = Math.sin(t * 9);
  return { "ombroE.x": -0.75, "ombroD.x": -0.75, "cotoveloE.x": -1.5, "cotoveloD.x": -1.5, "ombroE.z": 0.22 + 0.2 * s, "ombroD.z": -0.22 - 0.2 * s, "maos": 0.8 };
};

type GenteE = { id?: string; x?: Valor; y?: Valor; z?: Valor; rot?: Valor; acao?: string | [number, string, string?][]; exp?: Expressao3D; ant?: Anterior; entradaDur?: number; pose?: Pose3D | [number, Pose3D][]; incl?: Valor; naPlat?: boolean; esc?: number; puxa?: Valor; suor?: number; vel?: number; prop?: string; deita?: Valor; dor?: Valor; solto?: Valor; susto?: Valor };

/** Campo numérico que também aceita lista de chaves [[progresso, valor], ...] com interpolação linear. */
const vv = (v: unknown, p: number, pad = 0): number => {
  if (Array.isArray(v) && Array.isArray(v[0])) {
    const a = v as [number, number][];
    if (p <= a[0][0]) return a[0][1];
    for (let i = 1; i < a.length; i++) if (p <= a[i][0]) return lerp(a[i - 1][1], a[i][1], (p - a[i - 1][0]) / Math.max(a[i][0] - a[i - 1][0], 1e-6));
    return a[a.length - 1][1];
  }
  return valor(v as Valor, p, pad);
};

const Pessoa: React.FC<{ g: GenteE; p: number; t: number; tAbs: number; plat: number; bx?: number }> = ({ g, p, t, tAbs, plat, bx = 0 }) => {
  const pers = PERS[g.id ?? "zeca"];
  const { acao, exp, pose } = poseGente(g, { p, t: t, tAbs, vel: g.vel ?? 1, incl: valor(g.incl, p, 0) });
  const pu = valor(g.puxa, p, 0);
  if (pu > 0.02) {
    const s = Math.sin(tAbs * 5);
    pose["ombroE.x"] = -1.15 + 0.2 * s;
    pose["ombroD.x"] = -1.15 + 0.2 * s;
    pose["cotoveloE.x"] = -0.7 - 0.35 * s;
    pose["cotoveloD.x"] = -0.7 - 0.35 * s;
    pose["tronco.x"] = -0.28 + 0.05 * s;
    pose["ombroE.z"] = 0.08;
    pose["ombroD.z"] = -0.08;
    pose["maos"] = 0.4;
    pose["pernaE.x"] = -0.25;
    pose["pernaD.x"] = 0.25;
  }
  // reações de desenho animado: dor (mão presa: puxões, pulos, pé só, sacode a mão, cabeça balançando) e susto
  const dor = vv(g.dor, p, 0), solto = vv(g.solto, p, 0), susto = vv(g.susto, p, 0);
  let expF: Expressao3D = exp;
  let bocaF = 0;
  const mix = (j: string, v: number, k: number) => { pose[j] = lerp(pose[j] ?? 0, v, k); };
  if (dor > 0.02) {
    const kk = suave(clamp01(dor));
    const s1 = Math.sin(tAbs * 17), s2 = Math.sin(tAbs * 11 + 1), s3 = Math.sin(tAbs * 23);
    mix("cabeca.y", 0.55 * s2, kk); mix("cabeca.z", 0.32 * s1, kk); mix("cabeca.x", -0.15, kk);
    mix("tronco.x", lerp(-0.32 + 0.12 * s2, 0.62 + 0.08 * s1, solto), kk); mix("tronco.z", 0.16 * s1, kk);
    mix("ombroD.z", lerp(-(1.7 + 0.5 * s1), -0.3, solto), kk); mix("ombroD.x", lerp(-0.45, -1.15, solto), kk);
    mix("cotoveloD.x", lerp(-0.3, -1.75, solto), kk); mix("cotoveloD.z", lerp(-0.4 * s3, 0, solto), kk);
    mix("ombroE.x", lerp(-1.5 + 0.18 * s1, -0.85 + 0.4 * s3, solto), kk); mix("cotoveloE.x", lerp(-0.08, -1.45 + 0.55 * s3, solto), kk);
    mix("ombroE.z", lerp(0.05, 0.25, solto), kk); mix("maos", 1, kk);
    const lado = Math.floor(tAbs * 1.5) % 2 === 0;
    mix("pernaD.x", solto > 0.5 ? (lado ? -1.0 : 0) : 0.3 * s1, kk); mix("joelhoD.x", solto > 0.5 && lado ? 1.5 : 0, kk);
    mix("pernaE.x", solto > 0.5 ? (lado ? 0 : -1.0) : -0.3 * s1, kk); mix("joelhoE.x", solto > 0.5 && !lado ? 1.5 : 0, kk);
    pose["quadril.y"] = (pose["quadril.y"] ?? 0) + Math.abs(Math.sin(tAbs * 8)) * 0.16 * kk;
    expF = Math.sin(tAbs * 4.5) > 0.3 ? "medo" : "dor";
    bocaF = 0.55 + 0.45 * Math.abs(Math.sin(tAbs * 9));
  } else if (susto > 0.02) {
    const kk = suave(clamp01(susto));
    mix("tronco.x", -0.28 + 0.06 * Math.sin(tAbs * 30), kk); mix("cabeca.x", -0.2, kk); mix("cabeca.z", 0.12 * Math.sin(tAbs * 28), kk);
    mix("ombroE.z", 0.95, kk); mix("ombroD.z", -0.95, kk); mix("ombroE.x", -0.8, kk); mix("ombroD.x", -0.8, kk);
    mix("cotoveloE.x", -0.6, kk); mix("cotoveloD.x", -0.6, kk); mix("maos", 1, kk);
    pose["quadril.y"] = (pose["quadril.y"] ?? 0) + Math.abs(Math.sin(tAbs * 7)) * 0.1 * kk;
    expF = "medo"; bocaF = 0.6;
  }
  const { x, y, z, rot } = posicaoGente(g, t, { x: vv(g.x, p, 0) + (g.naPlat ? bx : 0), y: vv(g.y, p, 0) + (g.naPlat ? plat + 0.1 : 0), z: vv(g.z, p, 0), rot: vv(g.rot, p, 0) });
  const dt = suave(valor(g.deita, p, 0));
  if (dt > 0.02) { pose["cabeca.z"] = 0.2 * dt; pose["ombroE.z"] = 1.1 * dt; pose["ombroD.z"] = -1.1 * dt; pose["cotoveloE.x"] = -0.2; pose["cotoveloD.x"] = -0.2; pose["maos"] = 1; }
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={g.esc ?? 1.06}>
      <group position={[0, 0.2 * dt, 0]} rotation={[-1.5 * dt, 0, 0]}>
        <Boneco3D p={pers} pose={pose} expressao={expF} pisca={piscar(tAbs + x * 3 + z)} boca={bocaF} olhar={[0, 0]} suor={g.suor} t={tAbs} />
        {g.prop === "celular" && (
          <group position={[0.1, 1.0, 0.33]} rotation={[-0.5, 0, 0]}>
            <Caixa p={[0, 0, 0]} t={[0.11, 0.2, 0.02]} cor="#1c1f24" raio={0.01} sombra={false} />
            <mesh position={[0, 0, 0.012]}><planeGeometry args={[0.095, 0.17]} /><meshBasicMaterial color="#9fdcff" /></mesh>
          </group>
        )}
      </group>
    </group>
  );
};

/* ---------- trilho com dentes ---------- */

const useRack = () =>
  useMemo(() => {
    const P = 0.14;
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    for (let y = 0; y + P <= ALT_TRILHO; y += P) {
      s.lineTo(-0.075, y + 0.1);
      s.lineTo(0, y + 0.1);
      s.lineTo(0, y + P);
    }
    s.lineTo(0.17, ALT_TRILHO);
    s.lineTo(0.17, 0);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false });
    g.translate(0, 0, -0.08);
    return g;
  }, []);

const Trilhos: React.FC<{ k: number; aco: boolean }> = ({ k, aco }) => {
  const geo = useRack();
  if (k <= 0.02) return null;
  const e = suave(k);
  const cor = aco ? STEEL : WOOD_D;
  return (
    <group>
      <mesh geometry={geo} position={[RX, 0, 0]} scale={[1, e, 1]} castShadow receiveShadow><meshStandardMaterial color={cor} roughness={0.6} metalness={aco ? 0.6 : 0} side={THREE.DoubleSide} /></mesh>
      <group position={[-RX, 0, 0]} scale={[-1, e, 1]}>
        <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial color={cor} roughness={0.6} metalness={aco ? 0.6 : 0} side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  );
};

/* ---------- mola em arco ---------- */

/** `taut` 1 = esticada pela corda (arco alto, pontas recolhidas) · 0 = solta (arco baixo, pontas abertas dentro dos dentes). Origem: topo do quadro da plataforma. */
const pontosMola = (taut: number): V[] => {
  const hh = lerp(0.02, 0.32, taut);
  const ex = lerp(0.84, 0.58, taut);
  return Array.from({ length: 13 }).map((_, i) => {
    const u = (i / 12) * 2 - 1;
    return [u * ex, 0.07 + hh * (1 - u * u), 0] as V;
  });
};

const Mola: React.FC<{ taut: number; k: number }> = ({ taut, k }) => {
  if (k <= 0.02) return null;
  const pts = pontosMola(taut);
  const ex = lerp(0.84, 0.58, taut);
  return (
    <group scale={suave(k)} position={[0, CAB_H + 0.06, 0]}>
      {pts.slice(1).map((b, i) => <Liga key={i} a={pts[i]} b={b} w={0.06} e={0.14} cor={MOLA_COR} />)}
      {[-1, 1].map((s) => <Caixa key={s} p={[s * (ex + 0.03), 0.04, 0]} t={[0.14, 0.08, 0.12]} cor="#c9540f" raio={0.01} sombra={false} />)}
      <Caixa p={[0, 0.03, 0]} t={[0.2, 0.06, 0.16]} cor={IRON} raio={0.01} sombra={false} />
    </group>
  );
};

/* ---------- plataforma e cabine ---------- */

const Plataforma: React.FC<{ plat: number; cabine: number; cabPorta: number; carga: number; mola: number; taut: number; garras: number; destaque: number; tAbs: number; veloz: number; sensor: number; sensorCorte: number; bate: number; esc: number; bx?: number; rz?: number; sapatas?: boolean }> = ({ bx = 0, rz = 0, sapatas = false, esc, plat, cabine, cabPorta, carga, mola, taut, garras, destaque, tAbs, veloz, sensor, sensorCorte, bate }) => {
  const cab = suave(cabine);
  const op = cab < 0.99 ? cab : undefined;
  const parede = "#dfe3e8";
  const inox = "#b9c1cb";
  const porta = suave(cabPorta);
  const dg = (i: number) => {
    const k = destaque * 5 - i;
    return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
  };
  return (
    <group position={[bx, plat + 0.03 * bate * Math.sin(tAbs * 40), 0]} rotation={[0, 0, rz]} scale={Math.max(suave(esc), 0.001)}>
      {sapatas && [-1, 1].flatMap((sx) => [0.14, CAB_H - 0.2].map((yy) => <Caixa key={`${sx}${yy}`} p={[sx * 0.81, yy, 0]} t={[0.1, 0.2, 0.3]} cor="#ffd23f" raio={0.01} sombra={false} />))}
      <Sensor k={sensor} corte={sensorCorte} t={tAbs} />
      <Caixa p={[0, 0.05, 0]} t={[1.5, 0.1, 1.5]} cor={cab > 0.5 ? "#6a7078" : WOOD} raio={0.015} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Caixa key={`${sx}${sz}`} p={[sx * 0.7, CAB_H / 2, sz * 0.7]} t={[0.1, CAB_H, 0.1]} cor={cab > 0.5 ? inox : WOOD_D} raio={0.01} />))}
      <Caixa p={[0, CAB_H, 0]} t={[1.7, 0.12, 0.2]} cor={IRON} raio={0.01} />
      {[-1, 1].map((sx) => <Caixa key={sx} p={[sx * 0.7, CAB_H, 0]} t={[0.1, 0.1, 1.5]} cor={cab > 0.5 ? inox : WOOD_D} raio={0.01} />)}
      {/* corrimão nos três lados; some quando vira cabine */}
      {cab < 0.95 && (
        <group scale={[1, 1 - cab, 1]}>
          {[-1, 1].map((sx) => <Caixa key={sx} p={[sx * 0.7, 0.95, 0]} t={[0.06, 0.06, 1.4]} cor={WOOD} raio={0.01} sombra={false} />)}
          <Caixa p={[0, 0.95, -0.7]} t={[1.4, 0.06, 0.06]} cor={WOOD} raio={0.01} sombra={false} />
          <Caixa p={[0, 0.95, 0.7]} t={[1.4, 0.06, 0.06]} cor={WOOD} raio={0.01} sombra={false} />
          {[-1, 1].map((sx) => <Caixa key={sx} p={[sx * 0.7, 0.5, 0]} t={[0.05, 0.05, 1.4]} cor={WOOD} raio={0.01} sombra={false} />)}
        </group>
      )}
      {/* sacos de carga */}
      {carga > 0.02 && [[-0.3, 0.28, -0.4], [0.2, 0.28, -0.45], [-0.05, 0.62, -0.42], [0.45, 0.28, -0.1]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y * suave(carga), z]} scale={[1, suave(carga), 1]} rotation={[0, i, 0]}><sphereGeometry args={[0.24, 12, 8]} /><meshStandardMaterial color={i % 2 ? "#cdb78a" : "#b99f6e"} roughness={0.9} /></mesh>
      ))}
      {/* cabine: paredes, teto, pilares, porta e botões */}
      {cab > 0.02 && (
        <group>
          <Caixa p={[0, CAB_H / 2, -0.72]} t={[1.5, CAB_H - 0.1, 0.05]} cor={parede} op={op} raio={0.01} sombra={false} />
          {[-1, 1].map((sx) => <Caixa key={sx} p={[sx * 0.74, CAB_H / 2, 0]} t={[0.05, CAB_H - 0.1, 1.5]} cor={parede} op={op} raio={0.01} sombra={false} />)}
          <Caixa p={[0, CAB_H - 0.06, 0]} t={[1.5, 0.05, 1.5]} cor="#f1f3f5" op={op} raio={0.01} sombra={false} />
          {[-1, 1].map((sx) => <Caixa key={sx} p={[sx * 0.6, CAB_H / 2, 0.73]} t={[0.3, CAB_H - 0.1, 0.06]} cor={inox} met={0.5} rug={0.35} op={op} raio={0.01} />)}
          <Caixa p={[0, CAB_H - 0.2, 0.73]} t={[0.9, 0.2, 0.06]} cor={inox} met={0.5} rug={0.35} op={op} raio={0.01} />
          {[-1, 1].map((sx) => <Caixa key={sx} p={[sx * (0.225 + 0.38 * porta), 1.0, 0.69]} t={[0.45, 1.95, 0.04]} cor="#c8cfd8" met={0.6} rug={0.3} op={op} raio={0.01} sombra={false} />)}
          {[0, 1, 2].map((i) => <mesh key={i} position={[0.6, 1.0 + i * 0.16, 0.77]} rotation={[Math.PI / 2, 0, 0]} scale={cab}><cylinderGeometry args={[0.04, 0.04, 0.03, 12]} /><meshStandardMaterial color={i === 1 ? "#ffd23f" : "#e8ecf0"} emissive={i === 1 ? "#ffb300" : "#000000"} emissiveIntensity={i === 1 ? 0.8 : 0} roughness={0.4} /></mesh>)}
        </group>
      )}
      <Mola taut={taut} k={mola} />
      {/* garras da trava moderna, embaixo, abraçando os trilhos */}
      {garras > 0.02 && [-1, 1].map((s) => (
        <group key={s} position={[s * lerp(0.66, 0.855, suave(garras)), -0.02, 0]}>
          <Caixa p={[0, 0, 0]} t={[0.14, 0.34, 0.2]} cor="#ffd23f" raio={0.02} sombra={false} />
          <Caixa p={[0, 0.17, 0]} t={[0.1, 0.05, 0.22]} cor={IRON} raio={0.01} sombra={false} />
        </group>
      ))}
      {/* setas vermelhas de descida rápida */}
      {veloz > 0.02 && [-0.45, 0.45].map((x, i) => {
        const u = (tAbs * 3 + i * 0.5) % 1;
        return <Seta key={i} a={[x, CAB_H + 0.9 - 0.2 * u, 0.9]} b={[x, CAB_H - 0.1 - 0.2 * u, 0.9]} cor="#ff3b30" w={0.05} op={veloz} />;
      })}
      {/* halos de revelação */}
      {destaque > 0.001 && (
        <group>
          <Halo p={[-0.75, 1.1, 0.5]} r={0.9} cor="#9fdcff" op={0.55 * dg(0)} />
          <Halo p={[0, CAB_H + 1.4, 0.2]} r={0.8} cor="#ffe9a8" op={0.9 * dg(1)} />
          <Halo p={[0.75, 0.5, 0.2]} r={0.01} cor="#000000" op={0} />
          <Halo p={[-RX, 1.2, 0.2]} r={0.8} cor="#7dffa8" op={0.9 * dg(3)} />
          <Halo p={[RX, 0.1, 0.2]} r={0.7} cor="#ff9f6a" op={0.9 * dg(4)} />
        </group>
      )}
    </group>
  );
};

/* ---------- cordas, polia, motor, contrapeso ---------- */

const Fio: React.FC<{ p: V; dir: 1 | -1; t: number; cor: string; sw?: number }> = ({ p, dir, t, cor, sw = 1 }) => (
  <group position={p}>
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const l = 0.1 + 0.07 * rnd(i + 3);
      const s = Math.sin(t * 10 + i) * 0.02 * sw;
      return <Liga key={i} a={[0, 0, 0]} b={[Math.cos(a) * 0.07 + s, dir * l, Math.sin(a) * 0.07]} w={0.016} cil cor={cor} />;
    })}
  </group>
);

const Polia: React.FC<{ ang: number; sulcos: number; nCordas: number }> = ({ ang, sulcos, nCordas }) => (
  <group position={[POL_CX, POLIA_Y, 0]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[POL_R, POL_R, 0.8, 40]} /><meshStandardMaterial color="#6b7480" metalness={0.6} roughness={0.4} /></mesh>
    {[-1, 1].map((s) => <mesh key={s} position={[0, 0, s * 0.42]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[POL_R + 0.05, POL_R + 0.05, 0.03, 40]} /><meshStandardMaterial color="#4a525c" metalness={0.6} roughness={0.4} /></mesh>)}
    {sulcos > 0.02 && TZ.slice(0, 4).map((z, i) => (i < Math.max(1, Math.round(nCordas)) ? <mesh key={i} position={[0, 0, nCordas > 1.5 ? z : 0]}><torusGeometry args={[POL_R + 0.005, 0.045, 6, 40]} /><meshStandardMaterial color="#1c1f24" roughness={0.6} /></mesh> : null))}
    <group rotation={[0, 0, ang]}>
      {[0, 1, 2].map((i) => <Caixa key={i} p={[0, 0, 0.44]} r={[0, 0, (i * Math.PI) / 3]} t={[POL_R * 1.8, 0.09, 0.03]} cor="#c9ced6" raio={0.01} sombra={false} />)}
      <mesh position={[POL_R * 0.78, 0, 0.46]}><sphereGeometry args={[0.06, 10, 8]} /><meshBasicMaterial color="#ffd23f" /></mesh>
    </group>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 2.0, 12]} /><meshStandardMaterial color="#cfd5dc" metalness={0.8} roughness={0.3} /></mesh>
  </group>
);

const Motor: React.FC<{ k: number; ang: number; esf: number; t: number }> = ({ k, ang, esf, t }) => {
  if (k <= 0.02) return null;
  const tr = Math.sin(t * 61) * 0.012 * esf;
  const cor = mistura("#2f6fb5", "#d9482f", esf * 0.7);
  return (
    <group position={[POL_CX + tr, POLIA_Y + tr * 0.6, 0.95]} scale={suave(k)}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.42, 0.42, 0.6, 28]} /><meshStandardMaterial color={cor} metalness={0.4} roughness={0.45} emissive={esf > 0.02 ? "#ff3b1f" : "#000000"} emissiveIntensity={esf * 0.5} /></mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <Caixa key={i} p={[Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0]} r={[0, 0, a]} t={[0.07, 0.05, 0.5]} cor="#24282e" raio={0.005} sombra={false} />;
      })}
      <mesh position={[0, 0, 0.31]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 0.03, 24]} /><meshStandardMaterial color="#cfd5dc" metalness={0.7} roughness={0.35} /></mesh>
      <group rotation={[0, 0, ang]}><Caixa p={[0.14, 0, 0.34]} t={[0.26, 0.07, 0.02]} cor="#ffd23f" raio={0.005} sombra={false} /></group>
      <Caixa p={[0, -0.5, -0.1]} t={[0.7, 0.12, 0.7]} cor={IRON} raio={0.02} />
    </group>
  );
};

const Contrapeso: React.FC<{ y: number; k: number; destaque: number }> = ({ y, k, destaque }) => {
  if (k <= 0.02) return null;
  return (
    <group position={[CW_X, y, 0]}>
      {Array.from({ length: 6 }).map((_, i) => <Caixa key={i} p={[0, 0.1 + i * 0.2, 0]} t={[0.52, 0.18, 0.9]} cor={i % 2 ? "#545a63" : "#4a4f58"} met={0.5} rug={0.5} raio={0.02} />)}
      {[-1, 1].map((s) => <Caixa key={s} p={[s * 0.27, 0.6, 0]} t={[0.03, 1.3, 0.92]} cor="#ffd23f" raio={0.01} sombra={false} />)}
      <Caixa p={[0, 1.27, 0]} t={[0.2, 0.1, 0.2]} cor={IRON} raio={0.02} />
      {destaque > 0.001 && <Halo p={[0, 0.6, 0.5]} r={1.0} cor="#ffe9a8" op={0.9 * (() => { const k2 = destaque * 5 - 2; return k2 > 0 && k2 < 1 ? Math.sin(k2 * Math.PI) : 0; })()} />}
    </group>
  );
};

const Regulador: React.FC<{ k: number; plat: number; reg: number; y?: number }> = ({ k, plat, reg, y }) => {
  if (k <= 0.02) return null;
  const X = -1.9;
  const Y = y ?? POLIA_Y - 0.05;
  const r = 0.3;
  const ang = -plat / r;
  const abre = 0.1 + 0.12 * reg;
  const Z = 0.35;
  return (
    <group scale={suave(k)} position={[0, 0, 0]}>
      <Caixa p={[X, Y - 0.3, -0.1]} t={[0.1, 0.5, 0.1]} cor={IRON} raio={0.01} sombra={false} />
      <group position={[X, Y, Z]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[r, r, 0.08, 24]} /><meshStandardMaterial color="#c9ced6" metalness={0.7} roughness={0.35} /></mesh>
        <group rotation={[0, 0, ang]}>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Liga a={[0, 0, 0.07]} b={[s * abre * 2.2, 0.0, 0.07]} w={0.03} cil cor="#2a2d33" />
              <mesh position={[s * abre * 2.2, 0, 0.07]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color={reg > 0.5 ? "#e03a2a" : "#ffd23f"} roughness={0.4} emissive={reg > 0.5 ? "#a01408" : "#000000"} emissiveIntensity={0.6} /></mesh>
            </group>
          ))}
        </group>
        {reg > 0.5 && <Halo p={[0, 0, 0.2]} r={0.7} cor="#ff6a5a" op={0.8} />}
      </group>
      {/* cabo do regulador: sai da roda, desce pelo poço, volta por uma roda de baixo, preso na plataforma */}
      <Liga a={[X - r, Y, Z]} b={[X - r, -30, Z]} w={0.018} cil cor="#2a2d33" />
      <Liga a={[X + r, Y, Z]} b={[X + r, -30, Z]} w={0.018} cil cor="#2a2d33" />
      <Liga a={[-0.75, plat + 0.6, Z]} b={[X + r, plat + 0.6, Z]} w={0.04} cor="#ffd23f" e={0.04} />
      {reg > 0.5 && <Seta a={[X + r + 0.25, plat + 1.2, Z]} b={[X + r + 0.25, plat + 0.4, Z]} cor="#ff3b30" w={0.03} />}
    </group>
  );
};

/* ---------- prédio, obra, feira ---------- */

const texturaTabuas = (cor: string, linha: string) => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = cor;
  g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 3 === 0 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.04)";
    g.fillRect(i * 32, 0, 32, 256);
    g.fillStyle = linha;
    g.fillRect(i * 32, 0, 2, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const Obra: React.FC = () => {
  const tex = useMemo(() => texturaTabuas("#8a6a47", "#4a3622"), []);
  const chao = useMemo(() => texturaTabuas("#a8946f", "#6b5b3f"), []);
  return (
    <group>
      <mesh position={[0.5, 5.5, -1.7]}><planeGeometry args={[18, 12]} /><meshStandardMaterial map={tex} roughness={0.95} /></mesh>
      <mesh position={[0.5, 0, 3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[18, 10]} /><meshStandardMaterial map={chao} roughness={0.95} /></mesh>
      <mesh position={[-3.6, 3.2, -1.65]}><planeGeometry args={[1.4, 1.8]} /><meshBasicMaterial color="#ffe3a8" /></mesh>
      <Halo p={[-3.6, 3.2, -1.5]} r={2.2} cor="#ffe3a8" op={0.35} />
      {[[-4.6, 0.3, 0.2], [-4.6, 0.8, 0.2], [-4.0, 0.3, 0.7]].map(([x, y, z], i) => <Caixa key={i} p={[x, y, z]} t={[0.7, 0.6, 0.7]} cor={WOOD} raio={0.03} />)}
      <mesh position={[4.9, 0.4, 0.4]}><cylinderGeometry args={[0.32, 0.32, 0.8, 16]} /><meshStandardMaterial color="#5a4632" roughness={0.8} /></mesh>
      <Bandeirinhas a={[-4.8, 7.4, -1.4]} b={[5.6, 7.4, -1.4]} n={18} sag={0.5} />
      <Bandeirinhas a={[-4.8, 6.3, -1.4]} b={[5.6, 6.3, -1.4]} n={18} sag={0.4} />
      <TVJogo p={[-3.6, 4.6, -1.5]} w={1.1} gol={0} t={0} />
    </group>
  );
};

/** Mastro de madeira: dois postes e a viga onde a polia fica pendurada. */
const Mastro: React.FC<{ cor: string }> = ({ cor }) => (
  <group>
    {[-2.3, 3.4].map((x) => <Caixa key={x} p={[x, 4.5, -0.5]} t={[0.3, 9.0, 0.3]} cor={cor} raio={0.02} />)}
    <Caixa p={[0.55, 9.05, -0.5]} t={[6.0, 0.28, 0.3]} cor={cor} raio={0.02} />
    <Caixa p={[0.7, 8.85, -0.2]} t={[0.2, 0.3, 0.9]} cor={IRON} raio={0.02} />
    {[-1, 1].map((s) => <Caixa key={s} p={[POL_CX, 8.65, s * 0.3]} t={[0.14, 0.9, 0.06]} cor={IRON} raio={0.01} sombra={false} />)}
  </group>
);

type PredioP = { sala: number; predio: number; raiox: number; frente: number; portas: number[]; pino: number; pisos: number; botaoK: number; lit: number[]; t: number };

const Predio: React.FC<PredioP> = ({ sala, predio, raiox, frente, portas, pino, pisos, botaoK, lit, t }) => {
  const op = raiox > 0.02 ? lerp(1, 0.2, suave(raiox)) : undefined;
  const laje = "#cfc8b8";
  const par = "#e4dfd2";
  const XL = -2.3;
  const XR = 3.4;
  const W = XR - XL;
  const CXp = (XL + XR) / 2;
  const mostraSala = sala > 0.02 || predio > 0.02;
  return (
    <group>
      {mostraSala && (
        <group>
          <Caixa p={[CXp, 7.4, 0]} t={[W, 0.2, 2.0]} cor={laje} op={op} raio={0.01} />
          <Caixa p={[CXp, 9.7, 0]} t={[W, 0.2, 2.0]} cor={laje} op={op} raio={0.01} />
          <Caixa p={[CXp, 8.55, -1.0]} t={[W, 2.1, 0.12]} cor={par} op={op} raio={0.01} sombra={false} />
          {[XL, XR].map((x) => <Caixa key={x} p={[x, 8.55, 0]} t={[0.2, 2.1, 2.0]} cor={par} op={op ?? 0.35} raio={0.01} sombra={false} />)}
        </group>
      )}
      {predio > 0.02 && (
        <group>
          {/* fundo e paredes do poço */}
          <Caixa p={[CXp, 3.65, -1.06]} t={[W, 7.3, 0.1]} cor={par} op={op} raio={0.01} sombra={false} />
          <Caixa p={[0.1, 3.65, -0.99]} t={[3.8, 7.3, 0.06]} cor="#262a31" raio={0.01} sombra={false} />
          {[-1.8, 2.0].map((x) => <Caixa key={x} p={[x, 3.65, 0]} t={[0.12, 7.3, 2.0]} cor="#8d949e" op={op ?? 0.55} raio={0.01} sombra={false} />)}
          {/* lajes dos andares (pisos saem para a frente) */}
          {[1, 2].map((f) => (
            <group key={f}>
              <Caixa p={[(XL - 1.8) / 2, 2.5 * f - 0.1, 0]} t={[-1.8 - XL, 0.2, 2.0]} cor={laje} op={op} raio={0.01} />
              <Caixa p={[(2.0 + XR) / 2, 2.5 * f - 0.1, 0]} t={[XR - 2.0, 0.2, 2.0]} cor={laje} op={op} raio={0.01} />
              {(frente > 0.02 || pisos > 0.02) && <Caixa p={[CXp, 2.5 * f - 0.1, 1.8]} t={[W, 0.2, 1.6]} cor={laje} op={op} raio={0.01} />}
            </group>
          ))}
          {/* parede da frente com portas e travas */}
          {frente > 0.02 && [0, 1, 2].map((f) => {
            const y0 = 2.5 * f;
            const ab = suave(portas[f] ?? 0);
            const pinoK = f === 1 ? pino : 1;
            return (
              <group key={f} position={[0, y0, 0]} scale={[1, suave(clamp01(frente)), 1]}>
                <Caixa p={[-1.175, 1.15, 1.0]} t={[1.25, 2.3, 0.1]} cor={par} op={op} raio={0.01} sombra={false} />
                <Caixa p={[1.275, 1.15, 1.0]} t={[1.45, 2.3, 0.1]} cor={par} op={op} raio={0.01} sombra={false} />
                <Caixa p={[0, 2.15, 1.0]} t={[1.1, 0.3, 0.1]} cor={par} op={op} raio={0.01} sombra={false} />
                {[-1, 1].map((s) => <Caixa key={s} p={[s * (0.275 + 0.52 * ab), 1.0, 0.92]} t={[0.55, 2.0, 0.05]} cor="#aeb6c0" met={0.5} rug={0.4} raio={0.01} sombra={false} />)}
                <Caixa p={[0, 2.28, 1.07]} t={[0.5, 0.1, 0.1]} cor={IRON} raio={0.01} sombra={false} />
                <Caixa p={[0, 2.05 + (1 - pinoK) * 0.3, 1.08]} t={[0.1, 0.4, 0.08]} cor="#ffd23f" raio={0.01} sombra={false} />
              </group>
            );
          })}
          {/* botão de chamada em cada andar (pedestal ao lado do poço) */}
          {botaoK > 0.02 && [0, 1, 2].map((f) => (
            <group key={f} position={[-1.25, 2.5 * f, 1.35]} scale={suave(botaoK)}><Botao p={[0, 0, 0]} lit={lit[f] ?? 0} t={t} /></group>
          ))}
        </group>
      )}
    </group>
  );
};

/* ---------- recorte do prédio: 5 andares, sem topo nem fundo ---------- */

/** Trilhos-guia de aço (T liso) dos dois lados da cabine, com fixações a cada andar; crescem a partir do meio. */
const TrilhosGuia: React.FC<{ k: number }> = ({ k }) => {
  if (k <= 0.02) return null;
  const L = 80;
  const fix = Array.from({ length: 33 }).map((_, i) => 2.5 * (i - 16) + 1.2);
  return (
    <group position={[0, 5, 0]} scale={[1, suave(k), 1]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * RX, 0, 0]}>
          <Caixa p={[0, 0, 0]} t={[0.07, L, 0.24]} cor="#b4c4d8" met={0.75} rug={0.3} raio={0.004} sombra={false} />
          <Caixa p={[-s * 0.05, 0, 0]} t={[0.04, L, 0.12]} cor="#e6f0fb" met={0.8} rug={0.25} raio={0.003} sombra={false} />
          {fix.map((y, i) => <Caixa key={i} p={[s * 0.1, y, 0]} t={[0.14, 0.12, 0.34]} cor={IRON} raio={0.01} sombra={false} />)}
        </group>
      ))}
    </group>
  );
};

const texturaBlocos = () => {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#9a8f84"; g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 4; r++) {
    g.fillStyle = "#6e655c"; g.fillRect(0, r * 64, 256, 4);
    for (let i = 0; i < 2; i++) g.fillRect(((i * 128 + (r % 2) * 64) % 256), r * 64, 4, 64);
    g.fillStyle = r % 2 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"; g.fillRect(0, r * 64 + 4, 256, 60);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 100);
  return t;
};

type PredioRP = { sala: number; raiox: number; frente: number; portas: number[]; pino: number; pisos: number; botaoK: number; lit: number[]; t: number; vao: number; fosso: boolean; viga: boolean };

const PredioR: React.FC<PredioRP> = ({ sala, raiox, frente, portas, pino, pisos, botaoK, lit, t, vao, fosso, viga }) => {
  const tex = useMemo(() => texturaBlocos(), []);
  const op = raiox > 0.02 ? lerp(1, 0.2, suave(raiox)) : undefined;
  const laje = "#cfc8b8";
  const par = "#e4dfd2";
  const XL = -3.0, XR = 6.6, XS0 = -1.25, XS1 = 2.0;
  const W = XR - XL;
  const CXp = (XL + XR) / 2;
  const comSala = sala > 0.02;
  const y0 = fosso ? 0 : -40;
  const y1 = comSala ? 12.4 : 60;
  const len = y1 - y0;
  const mid = (y0 + y1) / 2;
  const kmin = fosso ? 1 : -6;
  const kmax = comSala ? 4 : 10;
  const ks = Array.from({ length: kmax - kmin + 1 }).map((_, i) => kmin + i);
  const e = suave(clamp01(vao));
  const hw = (XS1 - XS0) / 2;
  return (
    <group>
      {/* paredes do prédio, do poço e fundos (se estendem para fora do quadro) */}
      <Caixa p={[CXp, mid, -1.06]} t={[W, len, 0.1]} cor={par} op={op} raio={0.01} sombra={false} />
      <Caixa p={[(XS0 + XS1) / 2, mid, -0.99]} t={[XS1 - XS0, len, 0.06]} cor="#262a31" raio={0.01} sombra={false} />
      {[XS0, XS1].map((x) => <Caixa key={x} p={[x, mid, 0]} t={[0.12, len, 2.0]} cor="#8d949e" op={op ?? 0.55} raio={0.01} sombra={false} />)}
      {[XL, XR].map((x) => <Caixa key={x} p={[x, mid, 0]} t={[0.2, len, 2.0]} cor={par} op={op ?? 0.35} raio={0.01} sombra={false} />)}
      <mesh position={[XS0 + 0.075, mid, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, len / 100, 1]}><planeGeometry args={[2.0, 100]} /><meshStandardMaterial map={tex} roughness={0.95} transparent={op !== undefined} opacity={op ?? 1} /></mesh>
      {/* lajes dos andares; as tampas do vão deslizam para os lados */}
      {ks.map((k) => {
        const y = 2.5 * k - 0.1;
        return (
          <group key={k}>
            <Caixa p={[(XL + XS0) / 2, y, 0]} t={[XS0 - XL, 0.2, 2.0]} cor={laje} op={op} raio={0.01} />
            <Caixa p={[(XS1 + XR) / 2, y, 0]} t={[XR - XS1, 0.2, 2.0]} cor={laje} op={op} raio={0.01} />
            {e < 0.99 && k <= 4 && (
              <>
                <Caixa p={[XS0 + (hw * (1 - e)) / 2, y, 0]} t={[hw * (1 - e), 0.2, 2.0]} cor="#a8946f" raio={0.005} />
                <Caixa p={[XS1 - (hw * (1 - e)) / 2, y, 0]} t={[hw * (1 - e), 0.2, 2.0]} cor="#a8946f" raio={0.005} />
              </>
            )}
            {(frente > 0.02 || pisos > 0.02) && <Caixa p={[CXp, y, 1.8]} t={[W, 0.2, 1.6]} cor={laje} op={op} raio={0.01} />}
          </group>
        );
      })}
      {comSala && (
        <group>
          <Caixa p={[CXp, 12.4, 0]} t={[W, 0.2, 2.0]} cor={laje} op={op} raio={0.01} />
          <Caixa p={[CXp, 14.7, 0]} t={[W, 0.2, 2.0]} cor={laje} op={op} raio={0.01} />
          <Caixa p={[CXp, 13.55, -1.0]} t={[W, 2.1, 0.12]} cor={par} op={op} raio={0.01} sombra={false} />
          {[XL, XR].map((x) => <Caixa key={x} p={[x, 13.55, 0]} t={[0.2, 2.1, 2.0]} cor={par} op={op ?? 0.35} raio={0.01} sombra={false} />)}
        </group>
      )}
      {viga && !comSala && (
        <group>
          <Caixa p={[0.55, 14.35, -0.2]} t={[6.0, 0.28, 0.4]} cor={IRON} raio={0.02} />
          {[-1, 1].map((s) => <Caixa key={s} p={[POL_CX, 14.0, s * 0.3]} t={[0.14, 0.9, 0.06]} cor={IRON} raio={0.01} sombra={false} />)}
        </group>
      )}
      {/* parede da frente com portas */}
      {frente > 0.02 && ks.filter((k) => k >= (fosso ? 1 : -2) && k <= 5).map((k) => {
        const yy = 2.5 * k;
        const ab = suave(portas[k - 1] ?? 0);
        const pinoK = k === 2 ? pino : 1;
        return (
          <group key={k} position={[0, yy, 0]} scale={[1, suave(clamp01(frente)), 1]}>
            <Caixa p={[-1.775, 1.15, 1.0]} t={[2.45, 2.3, 0.1]} cor={par} op={op} raio={0.01} sombra={false} />
            <Caixa p={[3.575, 1.15, 1.0]} t={[6.05, 2.3, 0.1]} cor={par} op={op} raio={0.01} sombra={false} />
            <Caixa p={[0, 2.15, 1.0]} t={[1.1, 0.3, 0.1]} cor={par} op={op} raio={0.01} sombra={false} />
            {[-1, 1].map((s) => <Caixa key={s} p={[s * (0.275 + 0.52 * ab), 1.0, 0.92]} t={[0.55, 2.0, 0.05]} cor="#aeb6c0" met={0.5} rug={0.4} raio={0.01} sombra={false} />)}
            <Caixa p={[0, 2.28, 1.07]} t={[0.5, 0.1, 0.1]} cor={IRON} raio={0.01} sombra={false} />
            <Caixa p={[0, 2.05 + (1 - pinoK) * 0.3, 1.08]} t={[0.1, 0.4, 0.08]} cor="#ffd23f" raio={0.01} sombra={false} />
          </group>
        );
      })}
      {/* botão de chamada em cada andar */}
      {botaoK > 0.02 && ks.filter((k) => k >= (fosso ? 1 : -2) && k <= 5).map((k) => (
        <group key={k} position={[-1.25, 2.5 * k, 1.35]} scale={suave(botaoK)}><Botao p={[0, 0, 0]} lit={lit[k - 1] ?? 0} t={t} /></group>
      ))}
    </group>
  );
};

/** Poeira e faíscas onde a mão raspa na parede do poço (k 0..1). */
const Raspa: React.FC<{ p: V; k: number; t: number }> = ({ p, k, t }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p}>
      {Array.from({ length: 6 }).map((_, i) => {
        const u = (t * 2.2 + i / 6) % 1;
        return <mesh key={i} position={[0.12 * u + 0.05 * Math.sin(i * 2), -0.1 - 0.5 * u, 0.1 + 0.06 * Math.sin(i)]} scale={0.07 + 0.12 * u}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#d9d2c4" transparent opacity={0.8 * (1 - u) * k} /></mesh>;
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const u = (t * 3.1 + i * 0.13) % 1;
        return <Liga key={`s${i}`} a={[0.05 + 0.2 * u, -0.05 - 0.35 * u, 0.12]} b={[0.07 + 0.26 * u, -0.1 - 0.45 * u, 0.12]} w={0.025} cil cor={i % 2 ? "#ffd23f" : "#ff8a1f"} basico />;
      })}
    </group>
  );
};

/** Palácio de vidro e ferro da demonstração de 1854: fundo, arcos, bandeirinhas e chão de tábuas. */
const Palacio: React.FC = () => {
  const chao = useMemo(() => texturaTabuas("#c9a77a", "#8b6a45"), []);
  return (
    <group>
      <mesh position={[0, 0, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[26, 16]} /><meshStandardMaterial map={chao} roughness={0.9} /></mesh>
      <mesh position={[0, 6, -5]}><planeGeometry args={[26, 12]} /><meshStandardMaterial color="#cfe3f2" roughness={0.6} /></mesh>
      {[-9, -4.5, 0, 4.5, 9].map((x) => <Caixa key={x} p={[x, 6, -4.95]} t={[0.18, 12, 0.18]} cor="#4c5560" sombra={false} raio={0.01} />)}
      {[3, 6, 9].map((y) => <Caixa key={y} p={[0, y, -4.95]} t={[26, 0.12, 0.12]} cor="#4c5560" sombra={false} raio={0.01} />)}
      {[-1, 0, 1].map((i) => <mesh key={i} position={[i * 8, 4, -4.8]}><torusGeometry args={[3.6, 0.1, 8, 28, Math.PI]} /><meshStandardMaterial color="#39414b" metalness={0.5} roughness={0.5} /></mesh>)}
      {Array.from({ length: 16 }).map((_, i) => {
        const x = -7.5 + i;
        return <mesh key={i} position={[x, 7.4 - 0.25 * Math.sin(((x + 8) / 16) * Math.PI) * 2, -3.6]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.22, 0.45, 3]} /><meshStandardMaterial color={["#e03a2a", "#f2c230", "#3c6fb5", "#fff"][i % 4]} roughness={0.8} /></mesh>;
      })}
      <Liga a={[-8, 7.55, -3.6]} b={[8, 7.55, -3.6]} w={0.02} cil cor="#555" />
      {/* palanque baixo atrás do aparelho */}
      <Caixa p={[0.7, 0.1, -0.2]} t={[5.6, 0.2, 3.0]} cor="#7a5a38" raio={0.02} />
    </group>
  );
};

const Povo: React.FC<{ aplauso: number; tAbs: number }> = ({ aplauso, tAbs }) => {
  const gente = useMemo(() => {
    const lista: { i: number; x: number; z: number; rot: number }[] = [];
    let i = 0;
    for (const r of [3.2, 4.0, 4.8]) {
      const a0 = (30 * Math.PI) / 180;
      const a1 = (130 * Math.PI) / 180;
      const nn = Math.floor(((a1 - a0) * r) / 0.78);
      for (const s of [-1, 1]) {
        for (let j = 0; j < nn; j++) {
          const a = a0 + ((a1 - a0) * (j + 0.5 * (s > 0 ? 0.6 : 0))) / nn;
          const x = s * r * Math.sin(a) + 0.7;
          const z = 0.3 + r * Math.cos(a);
          const perto = [[-2.3, -0.5], [3.4, -0.5]].some(([px, pz]) => Math.hypot(x - px, z - pz) < 0.8);
          i++;
          if (perto) continue;
          const dx = 0.7 - x;
          const dz = 0.3 - z;
          const rot = Math.atan2(dx * 0.8, dz * 0.8 + 0.7);
          lista.push({ i, x, z, rot });
        }
      }
    }
    return lista;
  }, []);
  return (
    <group>
      {gente.map(({ i, x, z, rot }) => {
        const pers = POVO[i % POVO.length];
        const aplaude = aplauso > 0.05 && rnd(i + 5) < 0.2 + 0.8 * aplauso;
        const pose: Pose3D = aplaude ? { ...poseDe3D("em-pe", tAbs + i), ...palma(tAbs + i * 0.37) } : poseDe3D("em-pe", tAbs + i * 0.7);
        if (aplaude && rnd(i + 9) < 0.3) pose["quadril.y"] = Math.max(0, Math.sin(tAbs * 7 + i)) * 0.06;
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, rot, 0]} scale={1.0 + rnd(i + 31) * 0.1}>
            <Boneco3D p={pers} pose={pose} expressao="sorriso" pisca={piscar(tAbs + i)} boca={0} olhar={[0, 0]} t={tAbs} />
          </group>
        );
      })}
    </group>
  );
};

const Machado: React.FC<{ k: number; pos: V }> = ({ k, pos }) => {
  // k: 0 baixo (junto ao corpo) · 0,5 erguido · 1 acertou a corda (à direita de quem corta)
  const a = k < 0.5 ? lerp(0.35, -0.3, suave(k * 2)) : lerp(-0.3, -1.45, suave((k - 0.5) * 2) ** 0.6);
  return (
    <group position={pos} rotation={[0, 0, a]}>
      <Liga a={[0, -0.05, 0]} b={[0, 0.78, 0]} w={0.05} cil cor="#7a5a38" />
      <Caixa p={[0.12, 0.62, 0]} t={[0.24, 0.3, 0.05]} cor="#c9ced6" met={0.7} rug={0.3} raio={0.01} sombra={false} />
    </group>
  );
};

/** Chão da rua com o fosso (buraco x ±1,9, z ±1) aberto. */
const ChaoFosso: React.FC = () => {
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-15, -5); sh.lineTo(15, -5); sh.lineTo(15, 9); sh.lineTo(-15, 9); sh.closePath();
    const h = new THREE.Path();
    h.moveTo(-1.9, -1); h.lineTo(-1.9, 1); h.lineTo(1.9, 1); h.lineTo(1.9, -1); h.closePath();
    sh.holes.push(h);
    const g = new THREE.ShapeGeometry(sh);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  return <mesh geometry={geo} receiveShadow><meshStandardMaterial color="#6e737c" roughness={0.9} side={THREE.DoubleSide} /></mesh>;
};

/** Laje do primeiro andar da obra com o vão: duas tampas deslizam para os lados (k 0 fechado, 1 aberto). */
const LajeVao: React.FC<{ k: number }> = ({ k }) => {
  const e = suave(k);
  const cor = "#a8946f";
  return (
    <group>
      <Caixa p={[-3.1, 3.0, 0]} t={[4.2, 0.2, 2.4]} cor={cor} raio={0.005} />
      <Caixa p={[2.5, 3.0, 0]} t={[3.0, 0.2, 2.4]} cor={cor} raio={0.005} />
      {[-1, 1].map((sg) => <Caixa key={sg} p={[sg * (0.5 + 1.5 * e), 3.0, 0]} t={[1.0, 0.18, 2.4]} cor={cor} raio={0.005} sombra={false} />)}
    </group>
  );
};

/** Fio amarelo dos botões até o controlador (em cx, cy), com pulsos correndo; `motor` = fio do controlador até o motor (acima do quadro). */
const FioControle: React.FC<{ k: number; t: number; cx: number; cy: number; motor?: boolean }> = ({ k, t, cx, cy, motor }) => {
  const pts: V[] = [[-1.25, -20, 1.35], [-1.25, cy + 0.45, 1.35], [cx, cy + 0.45, 0.5], [cx, cy + 0.3, 0.4]];
  const mp: V[] = [[cx, cy + 0.5, 0.3], [cx, 30, 0.3]];
  const L = Math.hypot(0, cy + 20.45) + Math.hypot(cx + 1.25, 0.2) + 0.2;
  return (
    <group>
      {pts.slice(1).map((b, i) => <Liga key={i} a={pts[i]} b={b} w={0.03} cil cor="#ffd23f" op={k} />)}
      {Array.from({ length: 8 }).map((_, i) => {
        const c = noCaminho(pts, ((t * 5 + i * (L / 8)) % L));
        return <mesh key={i} position={c.p} scale={0.06}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#fff6b0" /></mesh>;
      })}
      {motor && <Liga a={mp[0]} b={mp[1]} w={0.045} cil cor="#6dff9a" />}
      {motor && Array.from({ length: 6 }).map((_, i) => <mesh key={`m${i}`} position={[cx, cy + 0.6 + ((t * 4 + i * 2.2) % 13), 0.3]} scale={[0.09, 0.2, 0.09]}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#c8ffd8" /></mesh>)}
    </group>
  );
};

const Escada: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  if (k <= 0.02) return null;
  const N = 14;
  const dx = 0.3;
  const dy = 0.21;
  return (
    <group position={[-5.2, 0, 0.6]} scale={suave(k)}>
      {Array.from({ length: N + 1 }).map((_, i) => {
        const s = (i + t * 1.1) % N;
        return <Caixa key={i} p={[s * dx, s * dy + 0.1, 0]} t={[dx * 0.98, 0.1, 0.9]} cor={i % 2 ? "#3d4148" : "#4c5560"} raio={0.01} sombra={false} />;
      })}
      <Caixa p={[(N * dx) / 2, (N * dy) / 2 - 0.12, 0]} r={[0, 0, Math.atan2(dy, dx)]} t={[Math.hypot(N * dx, N * dy) + 0.4, 0.14, 1.1]} cor="#2a2d33" raio={0.02} />
      {[-0.55, 0.55].map((z) => <Liga key={z} a={[0, 1.0, z]} b={[N * dx, N * dy + 1.0, z]} w={0.07} cil cor="#2a2d33" />)}
      {[-0.55, 0.55].map((z) => <Caixa key={z} p={[(N * dx) / 2, (N * dy) / 2 + 0.55, z]} r={[0, 0, Math.atan2(dy, dx)]} t={[Math.hypot(N * dx, N * dy), 0.8, 0.03]} cor="#bfe3f5" op={0.35} raio={0.005} sombra={false} />)}
    </group>
  );
};

/* ---------- lupas ---------- */

const LupaMola: React.FC<{ r: number; taut: number; cortada: boolean; t: number }> = ({ r, taut, cortada, t }) => {
  const e = 0.87 * r;
  const pts = pontosMola(taut);
  const ex = lerp(0.84, 0.58, taut);
  const dy = -0.28 * r;
  const L = (x: number, y: number): V => [x * e, dy + y * e, 0.04];
  const aberta = taut < 0.5;
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.98 * e, 0, 0.02]}><planeGeometry args={[0.34 * e, 1.9 * r]} /><meshBasicMaterial color="#8a5e2c" /></mesh>
          {Array.from({ length: 7 }).map((_, i) => <mesh key={i} position={[s * 0.84 * e, -0.78 * r + i * 0.26 * r, 0.03]} rotation={[0, 0, s * (Math.PI / 2)]} scale={[1, 1.1, 1]}><coneGeometry args={[0.07 * r, 0.1 * r, 3]} /><meshBasicMaterial color="#6b4a22" /></mesh>)}
        </group>
      ))}
      {pts.slice(1).map((b, i) => <Liga key={i} a={L(pts[i][0], pts[i][1])} b={L(b[0], b[1])} w={0.07 * r} e={0.01} cor={MOLA_COR} basico />)}
      {[-1, 1].map((s) => <mesh key={s} position={L(s * (ex + 0.02), 0.07)}><boxGeometry args={[0.15 * e, 0.1 * e, 0.02]} /><meshBasicMaterial color="#c9540f" /></mesh>)}
      <mesh position={[0, dy + 0.02 * r, 0.04]}><boxGeometry args={[0.2 * r, 0.1 * r, 0.02]} /><meshBasicMaterial color="#3d4148" /></mesh>
      {/* a corda: esticada vai até o alto; cortada, sobram duas pontas soltas */}
      {!cortada ? (
        <Liga a={L(0, 0.07 + lerp(0.02, 0.32, taut))} b={[0, r * 0.95, 0.03]} w={0.05 * r} cil cor={ROPE_H} basico />
      ) : (
        <group>
          <Liga a={L(0, 0.1)} b={[0, dy + 0.4 * r, 0.03]} w={0.05 * r} cil cor={ROPE_H} basico />
          <Liga a={[0.04 * r, r * 0.55, 0.03]} b={[0.02 * r, r * 0.95, 0.03]} w={0.05 * r} cil cor={ROPE_H} basico />
        </group>
      )}
      {aberta && [-1, 1].map((s) => <Seta key={s} a={[s * 0.3 * e, dy + 0.35 * r, 0.06]} b={[s * (0.62 + 0.04 * Math.sin(t * 12)) * e, dy + 0.35 * r, 0.06]} cor="#3ed36f" w={0.03} />)}
    </group>
  );
};

const LupaSulcos: React.FC<{ r: number; t: number }> = ({ r, t }) => (
  <group>
    <mesh position={[0, -r * 0.62, 0.02]}><planeGeometry args={[r * 1.8, r * 0.7]} /><meshBasicMaterial color="#59616b" /></mesh>
    {[-0.55, 0.55].map((x) => <mesh key={x} position={[x * r, -r * 0.18, 0.025]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.2 * r, 0.3 * r, 3]} /><meshBasicMaterial color="#1c1f24" /></mesh>)}
    <mesh position={[0, -r * 0.18, 0.025]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.36 * r, 0.5 * r, 3]} /><meshBasicMaterial color="#1c1f24" /></mesh>
    <mesh position={[0, -r * 0.06, 0.04]}><circleGeometry args={[0.22 * r, 18]} /><meshBasicMaterial color="#c9ced6" /></mesh>
    {Array.from({ length: 6 }).map((_, i) => { const a = (i / 6) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.12 * r, -r * 0.06 + Math.sin(a) * 0.12 * r, 0.05]}><circleGeometry args={[0.05 * r, 8]} /><meshBasicMaterial color="#8d949e" /></mesh>; })}
    {[-1, 1].map((s) => <Seta key={s} a={[s * 0.5 * r, -r * 0.5, 0.06]} b={[s * 0.25 * r, -r * 0.12, 0.06]} cor="#ff6a3a" w={0.025} />)}
    <Seta a={[-0.3 * r, r * 0.45 + 0.03 * Math.sin(t * 6), 0.06]} b={[0.45 * r, r * 0.45, 0.06]} cor="#ffd23f" w={0.025} />
  </group>
);

const LupaCorda: React.FC<{ r: number; rompe: number; t: number }> = ({ r, rompe, t }) => {
  const pos: [number, number][] = [[0, 0]];
  for (let i = 0; i < 6; i++) pos.push([Math.cos((i / 6) * Math.PI * 2), Math.sin((i / 6) * Math.PI * 2)].map((v) => v * 0.2) as [number, number]);
  for (let i = 0; i < 12; i++) pos.push([Math.cos((i / 12) * Math.PI * 2 + 0.2), Math.sin((i / 12) * Math.PI * 2 + 0.2)].map((v) => v * 0.4) as [number, number]);
  const quebra = suave(rompe);
  return (
    <group>
      <mesh position={[0, 0, 0.02]}><circleGeometry args={[0.55 * r, 32]} /><meshBasicMaterial color="#3d4148" /></mesh>
      {pos.map(([x, y], i) => {
        const q = i === 8 ? quebra : 0;
        return (
          <mesh key={i} position={[(x + q * 0.1 * Math.cos(0.2 + 1.05)) * 1.3 * r + (i === 8 ? q * 0.12 * r : 0), y * 1.3 * r + (i === 8 ? q * 0.1 * r * Math.sin(t * 20) : 0), 0.04 + (i === 8 ? q * 0.03 : 0)]}>
            <circleGeometry args={[0.095 * r * (i === 8 ? 1 - 0.25 * q : 1), 14]} />
            <meshBasicMaterial color={i === 8 && q > 0.1 ? "#ff5a45" : i % 2 ? "#aeb6c0" : "#c9ced6"} />
          </mesh>
        );
      })}
      {quebra > 0.3 && <Seta a={[0.9 * r, 0.7 * r, 0.06]} b={[0.55 * r, 0.42 * r, 0.06]} cor="#ff5a45" w={0.025} />}
    </group>
  );
};

const LupaPino: React.FC<{ r: number; pino: number }> = ({ r, pino }) => (
  <group>
    <mesh position={[0, -r * 0.45, 0.02]}><planeGeometry args={[r * 1.8, r * 0.9]} /><meshBasicMaterial color="#aeb6c0" /></mesh>
    <mesh position={[0, -r * 0.55, 0.03]}><planeGeometry args={[0.28 * r, 0.3 * r]} /><meshBasicMaterial color="#1c1f24" /></mesh>
    <mesh position={[0, r * 0.5, 0.02]}><planeGeometry args={[r * 1.8, r * 0.6]} /><meshBasicMaterial color="#e4dfd2" /></mesh>
    <mesh position={[0, lerp(0.5, -0.1, suave(pino)) * r, 0.05]}><planeGeometry args={[0.2 * r, 1.0 * r]} /><meshBasicMaterial color="#ffd23f" /></mesh>
    <Seta a={[0.55 * r, lerp(0.1, 0.5, suave(pino)) * r, 0.06]} b={[0.55 * r, lerp(0.5, 0.1, suave(pino)) * r, 0.06]} cor={pino > 0.5 ? "#ff6a3a" : "#3ed36f"} w={0.025} />
  </group>
);

/* ---------- cena ---------- */

type EtiqDef = { texto: string; para: V; off: [number, number]; cor?: string };

const ElevadorCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const n = (k: string, pad = 0) => {
    const v = cena[k];
    if (Array.isArray(v)) return chaves(v as [number, number][], p);
    return valor(n0(v), p, pad);
  };
  const feiraDe = cena.feiraDe as number | undefined;
  const feira = cena.feira === true || (feiraDe !== undefined && p >= feiraDe); // vinheta de 1854: troca o cenário no meio da batida
  const gente = ((feira && cena.genteF ? cena.genteF : cena.gente) as GenteE[] | undefined) ?? [];
  const predio = feira ? 0 : n("predio");
  const aco = n("aco") > 0.5;
  const cordas = feira ? 1 : n("cordas", 1);
  const cwK = feira ? 0 : n("cw");
  const corte = feira ? n("corteF") : n("corte");
  const lado = (cena.corteLado as string | undefined) ?? "esq";
  const mola = feira ? 0 : n("mola");
  const motor = feira ? 0 : n("motor");
  const ajuda = feira ? 0 : n("ajuda");
  const desfia = n("desfia");
  const quebra = n("quebra");

  // altura da plataforma: base, queda livre (g constante) e freada
  let plat = feira ? n("platF", 0.6) : n("plat", 0.6);
  const qi = (cena.quedaIni as number | undefined) ?? 0;
  const qf = (cena.quedaFim as number | undefined) ?? 1;
  const q = feira ? 0 : clamp01((p - qi) / Math.max(qf - qi, 1e-6));
  plat -= n("quedaD") * q * q;
  const pA = cena.perfilA as number[] | undefined;
  const pB = cena.perfilB as number[] | undefined;
  if (pA && pB && !feira) plat = p < pB[2] ? pA[0] + (pA[1] - pA[0]) * posSeco(clamp01((p - pA[2]) / (pA[3] - pA[2]))) : pB[0] + (pB[1] - pB[0]) * posSuave(clamp01((p - pB[2]) / (pB[3] - pB[2])));
  const fr = feira ? n("freiaF") : n("freia");
  plat -= (feira ? n("freiaDF") : n("freiaD")) * (1 - (1 - fr) ** 3);

  const taut = 1 - suave(clamp01(corte * 2.2));
  const hh = mola > 0.02 ? 0.07 + lerp(0.02, 0.32, taut) * suave(mola) : 0;
  const topoY = plat + CAB_H + 0.06 + hh;
  const cwY = lerp(POLIA_Y + 1.0, K_CW - plat, suave(cwK));
  const ang = -plat / POL_R;

  const nc = Math.max(1, Math.round(cordas));
  const sep = suave(clamp01((cordas - 1) / 3));
  const cor = mistura(ROPE_H, "#4d545e", n("aco"));
  const w = lerp(0.075, 0.055, n("aco"));
  const zi = (i: number) => lerp(0, TZ[i], sep);
  const aparece = (i: number) => (i === 0 ? clamp01(cordas * 20) : clamp01(cordas - i));

  const corteAt = ((feira ? cena.corteAtF : cena.corteAt) as number | undefined) ?? plat;
  const off = ((feira ? cena.corteOffF : cena.corteOff) as number | undefined) ?? 1.2;
  const breakY0 = corteAt + CAB_H + 0.06 + (mola > 0.02 ? 0.38 : 0) + off;
  const sway = Math.sin(tEpisodio * 9) * 0.1 * corte;
  const KY = 1.35; // altura do corte do lado direito (machado)

  // corda esquerda (cordas 1..4) e direita
  const cordasEsq = Array.from({ length: 4 }).map((_, i) => {
    if (aparece(i) < 0.02) return null;
    const z = zi(i);
    const esc = suave(aparece(i));
    const ck = corte > 0.02 && lado === "esq" ? corte : i === 3 ? quebra : 0;
    if (ck > 0.02) {
      const alto = POLIA_Y;
      return (
        <group key={i}>
          <Liga a={[0, topoY, z]} b={[sway * ck, topoY + off * (1 - 0.15 * ck), z]} w={w} cil cor={cor} />
          <Fio p={[sway * ck, topoY + off * (1 - 0.15 * ck), z]} dir={1} t={tEpisodio} cor="#e6d4a0" />
          <Liga a={[0, alto, z]} b={[-sway * ck, breakY0 + 0.9 * suave(ck), z]} w={w} cil cor={cor} />
          <Fio p={[-sway * ck, breakY0 + 0.9 * suave(ck), z]} dir={-1} t={tEpisodio} cor="#e6d4a0" />
          {i === 3 && quebra > 0.02 && <Halo p={[0, breakY0 + 0.4, z + 0.2]} r={0.7} cor="#ff6a5a" op={0.7 * (0.6 + 0.4 * Math.sin(tEpisodio * 20))} />}
        </group>
      );
    }
    const wob = i === 0 && desfia > 0.05 ? Math.sin(tEpisodio * 40) * 0.01 * desfia : 0;
    return (
      <group key={i}>
        {i === 0 && desfia > 0.02 && (
          <group position={[0, topoY + off, 0]}>
            <mesh scale={[1, 0.6, 1]}><sphereGeometry args={[w * 0.8 * (1 - 0.35 * desfia), 10, 8]} /><meshStandardMaterial color="#8d7444" roughness={0.9} /></mesh>
            {Array.from({ length: 9 }).map((_, k) => {
              const a = (k / 9) * Math.PI * 2 + 0.3;
              const l = 0.12 * desfia * (0.6 + rnd(k + 5));
              return <Liga key={k} a={[0, (rnd(k) - 0.5) * 0.12, 0]} b={[Math.cos(a) * l * 1.2, (rnd(k) - 0.5) * 0.12 + 0.05 * Math.sin(tEpisodio * 17 + k), Math.sin(a) * l * 1.2]} w={0.014} cil cor="#e6d4a0" />;
            })}
            <Halo p={[0, 0, 0.1]} r={0.5} cor="#ff6a5a" op={0.7 * desfia * (0.6 + 0.4 * Math.sin(tEpisodio * 14))} />
          </group>
        )}
        <Liga a={[wob, topoY, z]} b={[0, POLIA_Y, z]} w={w * lerp(1, 0.85, esc)} cil cor={cor} />
        {i > 0 && <Caixa p={[0, topoY, 0]} t={[0.06, 0.05, 0.8]} cor={IRON} raio={0.01} sombra={false} />}
      </group>
    );
  });
  const fim = POLIA_Y; // topo da corda direita
  const cordasDir = Array.from({ length: 4 }).map((_, i) => {
    if (aparece(i) < 0.02) return null;
    const z = zi(i);
    const cwTop = cwY + 1.32;
    const xr = CW_X;
    if (cwK > 0.02) return <Liga key={i} a={[xr, fim, z]} b={[xr, cwTop, z]} w={w} cil cor={cor} />;
    if (i === 0 && ajuda > 0.02) {
      const AJY = n("ajudaY", 1);
      const pts: V[] = [[xr, fim, z], [xr, AJY, z], [xr + 2.6, AJY, z]];
      return (
        <group key={i}>
          <Liga a={pts[0]} b={pts[1]} w={w} cil cor={cor} />
          <Liga a={pts[1]} b={pts[2]} w={w} cil cor={cor} />
          {Array.from({ length: 7 }).map((_, k) => { const s = (((k * 1.35 + plat) % 9.4) + 9.4) % 9.4; const c = noCaminho(pts, s); return <mesh key={k} position={c.p}><sphereGeometry args={[0.065, 8, 6]} /><meshStandardMaterial color="#8d7444" roughness={0.9} /></mesh>; })}
          <mesh position={[xr, AJY, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.16, 0.1, 16]} /><meshStandardMaterial color={IRON} metalness={0.5} roughness={0.5} /></mesh>
          <Caixa p={[xr, AJY - 0.5, -0.12]} t={[0.1, 1.0, 0.08]} cor={WOOD_D} raio={0.01} sombra={false} />
        </group>
      );
    }
    if (i === 0 && lado === "dir" && corte > 0.02) {
      return (
        <group key={i}>
          <Liga a={[xr, fim, z]} b={[xr + 0.05 * Math.sin(tEpisodio * 9) * corte, KY + 1.3 * suave(corte), z]} w={w} cil cor={cor} />
          <Fio p={[xr, KY + 1.3 * suave(corte), z]} dir={-1} t={tEpisodio} cor="#e6d4a0" />
          <Liga a={[xr, 0.25, z]} b={[xr + 0.3 * suave(corte), KY - 0.15 * suave(corte), z]} w={w} cil cor={cor} />
          <Caixa p={[xr, 0.1, z]} t={[0.2, 0.2, 0.2]} cor={IRON} raio={0.03} sombra={false} />
          <Fio p={[xr + 0.3 * suave(corte), KY - 0.15 * suave(corte), z]} dir={1} t={tEpisodio} cor="#e6d4a0" />
        </group>
      );
    }
    // pendurada sem ninguém: termina num peso/nó junto ao chão (ou presa a um anel)
    return (
      <group key={i}>
        <Liga a={[xr, fim, z]} b={[xr, 0.25, z]} w={w} cil cor={cor} />
        <Caixa p={[xr, 0.1, z]} t={[0.2, 0.2, 0.2]} cor={IRON} raio={0.03} sombra={false} />
      </group>
    );
  });

  const andarY = n("andarY", 5);
  const ctrlX = n("ctrlX", 2.75);
  const ctrlY = n("ctrlY", 13.55);
  const regY = n("regY", POLIA_Y - 0.05);
  const bal = n("balanca");
  const bx = Math.sin(tEpisodio * 3.3) * 0.3 * bal;
  const rz = Math.sin(tEpisodio * 3.3 + 1) * 0.05 * bal;
  const lupaK = n("lupa");
  const lx = n("lupaX", 0);
  const ly = n("lupaY", 3);
  const LR = n("lupaR", 0.3);
  const modo = (cena.lupaModo as string | undefined) ?? "mola";
  const ancoraLupa: V = modo === "mola" ? [0, plat + CAB_H + 0.2, 0.1] : modo === "sulcos" ? [POL_CX + 0.55, POLIA_Y + 0.45, 0.2] : modo === "corda" ? [0, plat + CAB_H + 1.2, 0.1] : modo === "freio" ? [POL_CX, POLIA_Y - 0.1, 1.1] : modo === "trava" ? [RX, plat, 0.1] : [0, andarY + 2.1, 1.1];

  const S = n("etiqS", 1);
  const Kt = n("etiqK", 1);
  const etOff = n("etiqOff", 1);
  const garrasK = feira ? n("garrasF") : n("garras");
  const et: Record<string, EtiqDef> = {
    corda: { texto: "CORDA", para: [0, plat + CAB_H + 1.4, 0], off: [-1.4, 0.5], cor: "#ffd9a0" },
    polia: { texto: "POLIA", para: [POL_CX + 0.5, POLIA_Y + 0.5, 0.2], off: [1.5, 0.9] },
    mola: { texto: "MOLA", para: [0.3, topoY - 0.05, 0.1], off: [1.5, 0.4], cor: "#ffb26b" },
    trilho: { texto: "TRILHOS", para: [-RX - 0.1, plat + 1.2, 0.1], off: [-1.5, 0.9], cor: "#9fdcff" },
    trava: garrasK > 0.5
      ? { texto: "TRAVA", para: [RX, plat - 0.02, 0.1], off: [1.5, -0.5], cor: "#ffd23f" }
      : { texto: "TRAVA", para: [0.86, topoY - 0.02, 0.1], off: [1.5, 0.9], cor: "#ff8f84" },
    motor: { texto: "MOTOR", para: [POL_CX, POLIA_Y - 0.1, 1.3], off: [-1.6, 0.9], cor: "#7cc4ff" },
    contrapeso: { texto: "CONTRAPESO", para: [CW_X, cwY + 0.7, 0.5], off: [1.4, 0.7], cor: "#ffe9a8" },
    cordas: { texto: "CABOS", para: [0.1, plat + CAB_H + 1.3, 0.3], off: [-1.4, 0.7], cor: "#ffd9a0" },
    plataforma: { texto: "PLATAFORMA", para: [-0.75, plat + 0.3, 0.6], off: [-1.5, 0.6], cor: "#ffe0a8" },
    controlador: { texto: "CONTROLADOR", para: [ctrlX, ctrlY - 0.05, 0.5], off: ctrlX > 0 ? [0.4, -2.1] : [0.2, 1.5], cor: "#9fffb8" },
    botao: { texto: "BOTÃO", para: [-1.25, andarY + 1.07, 1.5], off: [-1.1, 0.7], cor: "#ffd23f" },
    freio: { texto: "FREIO", para: [lx, ly + LR * 0.95, 0.95], off: [0, 0.9], cor: "#ff9f6a" },
    sensor: { texto: "SENSOR", para: [0.47, plat + 1.05, 0.82], off: [1.4, 0.8], cor: "#ff8f84" },
    amortecedor: { texto: "AMORTECEDOR", para: [0.45, -0.7, 0.3], off: [1.0, 1.1], cor: "#ffb26b" },
    elevador: { texto: "ELEVADOR", para: [0, plat + 2.4, 0.5], off: [0, 1.2], cor: "#ffd23f" },
    regulador: { texto: "REGULADOR", para: [-1.9, regY, 0.45], off: [0.5, -1.6], cor: "#ff8f84" },
    porta: { texto: "PORTA", para: [-0.35, andarY + 1.0, 1.1], off: [-1.3, 0.8] },
    pino: { texto: "TRAVA DA PORTA", para: [0, andarY + 2.1, 1.15], off: [1.2, 0.9], cor: "#ffd23f" },
    cabine: { texto: "CABINE", para: [-0.75, plat + 1.1, 0.5], off: [-1.6, 0.5], cor: "#9fdcff" },
  };
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fimE] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fimE === undefined || p <= fimE) };
  }).filter((x) => x.ok);

  const portas = [n("porta1"), n("porta2"), n("porta3")];
  const interroga = n("interroga");
  const escada = n("escada");
  const pulsa = 0.65 + 0.35 * Math.sin(tEpisodio * 8);
  const sala = feira ? 0 : n("sala");
  const esforco = feira ? 0 : n("esforco");
  const luz = n("luz", 1);
  const { scene } = useThree();
  if (luz < 0.999 || scene.environmentIntensity < 0.54) scene.environmentIntensity = 0.55 * (0.1 + 0.9 * luz);
  const escadaria = !feira && n("escadaria") > 0.5;
  const noPredio = !feira && !escadaria;
  const fosso = n("fosso");
  const sacode = n("sacode");
  const sx = sacode > 0.02 ? Math.sin(tEpisodio * 47) * 0.05 * sacode : 0;
  const sy = sacode > 0.02 ? Math.cos(tEpisodio * 53) * 0.05 * sacode : 0;
  const maoK = n("incha");
  const bate = n("bate");
  const vao = n("vao");
  const lit = [n("lit0"), n("lit1"), n("lit2")];
  const hemi = (c1: string, c2: string, i: number): [string, string, number] => [c1, c2, i * (0.12 + 0.88 * luz)];
  const lupaPos = (cena.lupaAncora as V | undefined);
  const ancora: V = lupaPos ?? ancoraLupa;

  return (
    <group position={[sx, sy, 0]}>
      <hemisphereLight args={feira ? hemi("#f4f9ff", "#9a7f5a", 1.05) : noPredio ? hemi("#e8eef7", "#4a4f58", 0.95) : escadaria ? hemi("#f2ede0", "#6a6f78", 1.0) : hemi("#fff3dd", "#7a5a3a", 0.95)} />
      <directionalLight position={[-2.5, noPredio ? 13 : 9, 7]} intensity={(feira ? 2.3 : 2.0) * (0.12 + 0.88 * luz)} color="#fff0d2" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={17} shadow-camera-bottom={-5} shadow-camera-near={1} shadow-camera-far={34} shadow-bias={-0.0004} />
      {escadaria && <directionalLight position={[-4, 40, 9]} intensity={0.9} color="#fff0d2" />}

      {escadaria ? <Escadaria gol={n("gol")} t={tEpisodio} /> : feira ? <Palacio /> : (
        <group>
          {fosso > 0.02 && <ChaoFosso />}
          {n("bandeiras") > 0.5 && [8.6, 7.7].map((y) => <Bandeirinhas key={y} a={[-2.8, y, 1.3]} b={[6.2, y, 1.3]} n={22} sag={0.5} />)}
        </group>
      )}
      {noPredio && <PredioR sala={sala} raiox={n("raiox")} frente={n("frente")} portas={portas} pino={n("pino", 1)} pisos={n("pisos")} botaoK={n("botaoK")} lit={lit} t={tEpisodio} vao={n("vao", 1)} fosso={fosso > 0.02} viga={n("viga") > 0.5} />}
      {feira && <Povo aplauso={n("aplauso")} tAbs={tEpisodio} />}
      {feira && n("machado") > 0.001 && <Machado k={n("machado")} pos={(cena.machadoPos as V | undefined) ?? [-0.1, 2.4, 1.0]} />}
      {feira && <Caixa p={[-0.35, 0.25, 1.0]} t={[0.7, 0.5, 0.7]} cor="#7a5a38" raio={0.03} />}
      {feira && <Trilhos k={1} aco />}
      {noPredio && <TrilhosGuia k={n("trilhos")} />}
      {fosso > 0.02 && [-1, 1].map((s) => <Caixa key={s} p={[s * RX + (s > 0 ? 0.085 : -0.085), -0.65, 0]} t={[0.17, 1.3, 0.16]} cor={STEEL} met={0.6} rug={0.5} raio={0.01} sombra={false} />)}
      {fosso > 0.02 && <Fosso k={n("amort")} comp={n("comp")} />}
      {!escadaria && <Plataforma plat={plat} cabine={feira ? 0 : n("cabine")} cabPorta={n("cabPorta")} carga={n("carga")} mola={mola} taut={taut} garras={garrasK} destaque={n("destaque")} tAbs={tEpisodio} veloz={feira ? 0 : n("veloz")} sensor={n("sensor")} sensorCorte={n("sensorCorte")} bate={bate} esc={n("platK", 1)} bx={bx} rz={rz} sapatas={noPredio && n("trilhos") > 0.9} />}

      {/* polia, cordas */}
      {!escadaria && n("poliaK", 1) > 0.02 && <group position={[POL_CX, POLIA_Y, 0]} scale={suave(n("poliaK", 1))}><group position={[-POL_CX, -POLIA_Y, 0]}><Polia ang={ang} sulcos={n("sulcos")} nCordas={cordas} /></group></group>}
      {!escadaria && n("poliaK", 1) > 0.02 && Array.from({ length: 4 }).map((_, i) => aparece(i) > 0.02 ? (
        <mesh key={i} position={[POL_CX, POLIA_Y, zi(i)]} scale={[1, 1, aparece(i)]}><torusGeometry args={[POL_R + 0.01, w / 2, 8, 40, Math.PI]} /><meshStandardMaterial color={cor} roughness={0.8} /></mesh>
      ) : null)}
      {!escadaria && cordasEsq}
      {!escadaria && cordasDir}
      <Motor k={motor} ang={ang * 2.2} esf={esforco} t={tEpisodio} />
      {motor > 0.5 && n("suor") > 0.02 && Array.from({ length: 4 }).map((_, i) => {
        const u = (tEpisodio * 1.6 + i * 0.27) % 1;
        return <mesh key={i} position={[POL_CX - 0.3 + i * 0.2, POLIA_Y + 0.45 - u * 0.9, 1.3]} scale={[0.05, 0.08, 0.05]}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#8fd3ff" /></mesh>;
      })}
      {esforco > 0.3 && <Fumaca p={[POL_CX, POLIA_Y + 0.6, 0.95]} t={tEpisodio} k={esforco} cor="#d8d8d8" alt={0.8} larg={0.4} op={0.6} n={9} />}
      {esforco > 0.3 && <Halo p={[POL_CX, POLIA_Y, 1.3]} r={1.0} cor="#ff6a3a" op={0.45 * esforco * pulsa} />}
      <Contrapeso y={cwY} k={cwK} destaque={n("destaque")} />
      <Controlador p={[ctrlX, ctrlY, 0.3]} k={n("controlador")} t={tEpisodio} />
      {n("controlador") > 0.5 && n("botaoK") > 0.5 && <FioControle k={n("botaoK")} t={tEpisodio} cx={ctrlX} cy={ctrlY} motor={n("fioMotor") > 0.5} />}
      {luz < 0.5 && <Halo p={[POL_CX, POLIA_Y, 1.6]} r={0.01} cor="#000000" op={0} />}
      <Regulador k={feira ? 0 : n("regOn")} plat={plat} reg={n("reg")} y={regY} />
      {n("fagulha") > 0.02 && [-1, 1].flatMap((s) => Array.from({ length: 6 }).map((_, i) => {
        const u = n("fagulha");
        const a = rnd(i + 3 * s + 10) * Math.PI;
        return <mesh key={`${s}${i}`} position={[s * (RX + 0.1 * u * Math.cos(a) * 2), plat - 0.1 + 0.4 * u * Math.sin(a) - 0.5 * u * u, 0.15]} scale={0.03 * (1 - u * 0.6)}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#ffd23f" /></mesh>;
      }))}
      {feira && n("fagulhaF") > 0.02 && [-1, 1].flatMap((s) => Array.from({ length: 6 }).map((_, i) => {
        const u = n("fagulhaF");
        const a = rnd(i + 3 * s + 10) * Math.PI;
        return <mesh key={`f${s}${i}`} position={[s * (RX + 0.1 * u * Math.cos(a) * 2), plat - 0.1 + 0.4 * u * Math.sin(a) - 0.5 * u * u, 0.15]} scale={0.03 * (1 - u * 0.6)}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#ffd23f" /></mesh>;
      }))}

      <Escada k={escada} t={tEpisodio} />
      {interroga > 0.02 && <Texto3D texto="?" p={[-2.8, n("interrogaY", 8.6) + 0.6 * suave(interroga) + 0.03 * Math.sin(tEpisodio * 3), 0.9]} h={1.7} escala={suave(clamp01(interroga * 2)) * (1 - 0.9 * escada)} />}
      <Raio p={[4.3, n("raioY", 9.4), -1.6]} k={n("raio")} t={tEpisodio} h={6.5} />
      {n("tvApe") > 0.02 && (
        <group position={[2.7, n("tvY", 10), 0.2]} scale={suave(n("tvApe"))}>
          <Caixa p={[0, 0.25, 0]} t={[0.8, 0.5, 0.5]} cor="#6a3b3b" raio={0.04} />
          <TVJogo p={[0, 1.0, -0.35]} w={0.95} gol={n("golApe")} t={tEpisodio} rot={-0.25} />
          <Caixa p={[0, 0.5, -0.35]} t={[1.1, 0.6, 0.3]} cor="#5b4636" raio={0.03} />
        </group>
      )}
      {n("raspa") > 0.02 && <Raspa p={(cena.raspaPos as V | undefined) ?? [-1.18, plat + 1.3, 0.2]} k={n("raspa")} t={tEpisodio} />}
      <BracoInchado p={(cena.maoPos as V | undefined) ?? [0, 3.6, 1.0]} dir={(cena.maoDir as V | undefined) ?? [-0.8, -0.1, 0.57]} k={maoK} t={tEpisodio} />
      <Impacto p={(cena.maoPos as V | undefined) ?? [0, 3.6, 1.0]} k={n("impacto")} t={tEpisodio} r={0.6} />

      {/* lupa */}
      <LinhasZoom de={ancora} p={[lx, ly, 0.9]} R={LR} k={lupaK} />
      <Lupa p={[lx, ly, 0.9]} R={LR} k={lupaK}>
        {modo === "mola" && <LupaMola r={LR} taut={taut} cortada={corte > 0.02} t={tEpisodio} />}
        {modo === "sulcos" && <LupaSulcos r={LR} t={tEpisodio} />}
        {modo === "corda" && <LupaCorda r={LR} rompe={n("rompe")} t={tEpisodio} />}
        {modo === "pino" && <LupaPino r={LR} pino={n("pino", 1)} />}
        {modo === "freio" && <LupaFreio r={LR} solto={n("freio", 1)} luz={luz} t={tEpisodio} />}
        {modo === "trava" && <LupaTrava r={LR} fecha={garrasK} t={tEpisodio} />}
      </Lupa>

      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const de: V = [d.para[0] + d.off[0] * S * etOff, d.para[1] + d.off[1] * S * etOff, d.para[2] + 0.2];
        return <Etiqueta key={c} texto={d.texto} de={de} para={d.para} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}

      {gente.map((gd, i) => <Pessoa key={i} g={gd} p={p} t={t} tAbs={tEpisodio} plat={plat} bx={bx} />)}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 50) => ({ pos, alvo, fov });

export const elevador: Cenario3D = {
  Cena: ElevadorCena,
  padrao: "geral",
  fundo: (cena, p) => (cena.feira === true || (cena.feiraDe !== undefined && p >= (cena.feiraDe as number)) ? "#cfe0ee" : n0(cena.escadaria) ? "#aecbe6" : valor(n0(cena.predio), p, 0) > 0.02 ? "#1b2028" : "#3a2c1e"),
  luzPropria: true,
  cameras: { geral: c([-1.5, 3.6, 9.0], [0.5, 3.4, 0], 50) },
};
