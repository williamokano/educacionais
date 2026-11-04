import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, lerp, suave, valor } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Expressao3D, Personagem3D, Pose3D, V3, Valor } from "../../../src/v3d/tipos";
import { Etiqueta, Fumaca, Halo, Liga, mistura, Texto3D, V } from "./cozinha-base";
import { FIEIS } from "./fieis";
import { MORADORES } from "./moradores";
import { zeca } from "./zeca";

// Procissão (episódio 12, "como montar uma procissão, peça por peça"). Cidade pequena do interior, tudo à noite.
// Mundo (m): a fachada da igreja fica em z = -4, de frente para +z; a nave (bancos, corredor, altar) vai de z = -4 a -18. A rua corre de z = 3 a 80,
// com postes, cordão de luzes e casas. A procissão anda para +z (para a câmera): o líder (cruz) fica em Z0 = pz + avanco·t.
// Palcos soltos (um por quarto da batida, corte seco): missa em x = -40 (entrada, evangelho, ofertório, comunhão); grandes do ano em x = 40 (Ramos, Sexta-feira Santa, padroeiro, tapete).
// Campos da cena (número ou { de, para, ini, fim }; booleanos com true):
//   luz       escuro 0..1 (0 = noite azul clara, 1 = breu) · dia 0..1 (vinhetas de dia)
//   procissão pz (z do líder) · anda (m andados durante a batida; negativo = volta para a igreja, com volta: true) · pare 0..1 (para de andar nesse
//             ponto da batida) · volta: true (a fila vai para -z, de costas para a câmera) · baixa 0..1 (cabeças baixas) · semGente: true (andor sem carregadores)
//   luz extra apaga 0..1 (as luzes da igreja se apagam)
//   peças     cruz 0..1 (cruciferário e cruz) · ciriais 0..1 (duas velas, dois coroinhas) · turibulo 0..1 · fumaca 0..1
//             andor 0..1 (monta: varas, base, carregadores incl. o Zeca) · ombros 0..1 (sobe das mãos para os ombros) · led 0..1
//             povo 0..40 (quantas pessoas atrás, em fileiras de 4) · velas 0..1 (acende em cascata) · canto 0..1 (notas ♪)
//   imagem    imagem 0..1 · imgLugar 0..1 (0 = no colo em imgX/imgY/imgZ, 1 = no andor) · balanca 0..1
//   cachorro  dog 0..1 · dogX, dogZ · dogRot · dogModo "trota" | "fica" | "senta" | "pe" · cambalhota 0..1 · boca 0..1 · dogSegue: true
//   cenas     moto: true (moto na esquina) · vinheta: true (palcos x = 40+) · missa: true (palcos x = -40)
//   gente     lista de { id, x, y, z, rot, acao, exp, esc, incl, vela } · etiq: "chave", "chave@0.4" ou "chave@0.2-0.6" · etiqS · etiqK · etiqYmax
//             chaves: andor, cruz, ciriais, turibulo, vela

const n0 = (v: unknown) => v as Valor;
const PERS: Record<string, Personagem3D> = { zeca, ...MORADORES, ...FIEIS };
const SEGURA: Pose3D = { "ombroE.x": -0.95, "ombroD.x": -0.95, "cotoveloE.x": -0.65, "cotoveloD.x": -0.65, "ombroE.z": -0.28, "ombroD.z": 0.28, maos: 0.2 };
const SEGURA_D: Pose3D = { "ombroD.x": -0.95, "cotoveloD.x": -0.65, "ombroD.z": 0.12 };
// mãos sobrepostas à frente da barriga, esperando a hóstia
const COMUNHAO: Pose3D = { "ombroE.x": -0.5, "ombroD.x": -0.5, "cotoveloE.x": -1.55, "cotoveloD.x": -1.55, "ombroE.z": -0.3, "ombroD.z": 0.3, "cotoveloE.z": -0.25, "cotoveloD.z": 0.25, maos: 0.9 };
const MADEIRA = "#7a4e2a";
const OURO = "#d9b14a";
const BRANCO = "#f5f2ea";
const POVO_IDS = ["vizinha", "homemA", "menino", "mulher", "vovo", "homemC", "homemB", "mulher", "homemA", "vizinha", "homemB", "vovo", "homemC", "menino"];

/* ---------- chama e vela ---------- */

const Chama: React.FC<{ p: V; k: number; t: number; esc?: number }> = ({ p, k, t, esc = 1 }) => {
  if (k <= 0.02) return null;
  const f = 1 + 0.15 * Math.sin(t * 13 + p[0] * 9 + p[2] * 5);
  return (
    <group position={p} scale={k}>
      <mesh scale={[0.9 * esc, 1.9 * esc * f, 0.9 * esc]} position={[0, 0.03 * esc, 0]}><sphereGeometry args={[0.018, 8, 8]} /><meshBasicMaterial color="#ffd25a" /></mesh>
      <mesh scale={[0.5 * esc, 1.1 * esc * f, 0.5 * esc]} position={[0, 0.018 * esc, 0]}><sphereGeometry args={[0.018, 8, 8]} /><meshBasicMaterial color="#fff6c8" /></mesh>
      <Halo p={[0, 0.03 * esc, 0]} r={0.2 * esc} cor="#ffb347" op={0.75 * (0.8 + 0.2 * Math.sin(t * 9 + p[2]))} />
    </group>
  );
};

/** Vela com copinho de papel. `acesa` 0..1. */
const VelaCopo: React.FC<{ p: V; acesa: number; t: number }> = ({ p, acesa, t }) => (
  <group position={p}>
    <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.012, 0.012, 0.14, 8]} /><meshStandardMaterial color={BRANCO} roughness={0.6} /></mesh>
    <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.04, 0.022, 0.05, 10, 1, true]} /><meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} roughness={0.8} /></mesh>
    <Chama p={[0, 0.16, 0]} k={acesa} t={t} esc={0.7} />
  </group>
);

/* ---------- imagem (Sagrado Coração, ~55 cm) ---------- */

const Imagem: React.FC<{ p: V; k: number; t: number; balanca: number }> = ({ p, k, t, balanca }) => {
  if (k <= 0.02) return null;
  const osc = Math.sin(t * 7);
  return (
    <group position={p} scale={k} rotation={[0.06 * osc * balanca, 0, 0.28 * osc * balanca]}>
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.13, 0.15, 0.06, 14]} /><meshStandardMaterial color={OURO} metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.065, 0.13, 0.38, 14]} /><meshStandardMaterial color={BRANCO} roughness={0.55} /></mesh>
      <mesh position={[0, 0.25, -0.01]}><cylinderGeometry args={[0.085, 0.145, 0.38, 14, 1, true, Math.PI * 0.55, Math.PI * 0.9]} /><meshStandardMaterial color="#b3262e" roughness={0.6} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.5, 0]}><sphereGeometry args={[0.056, 14, 12]} /><meshStandardMaterial color="#e8c4a0" roughness={0.6} /></mesh>
      <mesh position={[0, 0.525, -0.008]} scale={[1, 0.8, 1]}><sphereGeometry args={[0.06, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} /><meshStandardMaterial color="#5a3a22" roughness={0.8} /></mesh>
      <mesh position={[0, 0.5, -0.05]}><torusGeometry args={[0.1, 0.007, 8, 28]} /><meshStandardMaterial color={OURO} emissive="#ffcf5a" emissiveIntensity={0.7} metalness={0.5} /></mesh>
      <mesh position={[0, 0.33, 0.1]}><sphereGeometry args={[0.03, 12, 10]} /><meshStandardMaterial color="#e0302a" emissive="#ff2a1a" emissiveIntensity={0.9} /></mesh>
      <Halo p={[0, 0.33, 0.12]} r={0.16} cor="#ff5a4a" op={0.7} />
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.07, 0.31, 0.03]} rotation={[0.5, 0, s * -0.35]}><capsuleGeometry args={[0.017, 0.12, 4, 8]} /><meshStandardMaterial color={BRANCO} roughness={0.55} /></mesh>)}
    </group>
  );
};

/* ---------- cruz, ciriais, turíbulo, andor ---------- */

const Cruz: React.FC<{ z: number; k: number }> = ({ z, k }) => {
  if (k <= 0.02) return null;
  const sobe = (1 - suave(k)) * -4.2;
  return (
    <group position={[0, sobe, z + 0.5]}>
      <mesh position={[0, 2.1, 0]}><cylinderGeometry args={[0.024, 0.03, 4.2, 8]} /><meshStandardMaterial color={MADEIRA} roughness={0.7} /></mesh>
      <Caixa p={[0, 4.42, 0]} t={[0.07, 0.62, 0.07]} cor={OURO} met={0.6} rug={0.35} raio={0.01} />
      <Caixa p={[0, 4.58, 0]} t={[0.4, 0.07, 0.07]} cor={OURO} met={0.6} rug={0.35} raio={0.01} />
      <mesh position={[0, 4.1, 0]}><sphereGeometry args={[0.05, 10, 8]} /><meshStandardMaterial color={OURO} metalness={0.6} roughness={0.4} /></mesh>
      <Halo p={[0, 4.5, 0.05]} r={0.45} cor="#ffd98a" op={0.3} />
    </group>
  );
};

const Cirial: React.FC<{ x: number; z: number; k: number; t: number }> = ({ x, z, k, t }) => (
  <group position={[x, (1 - suave(k)) * -2.4, z]}>
    <mesh position={[0, 1.15, 0]}><cylinderGeometry args={[0.018, 0.026, 1.5, 8]} /><meshStandardMaterial color={OURO} metalness={0.7} roughness={0.35} /></mesh>
    <mesh position={[0, 1.93, 0]}><cylinderGeometry args={[0.07, 0.03, 0.06, 10]} /><meshStandardMaterial color={OURO} metalness={0.7} roughness={0.35} /></mesh>
    <mesh position={[0, 2.18, 0]}><cylinderGeometry args={[0.032, 0.032, 0.42, 10]} /><meshStandardMaterial color={BRANCO} roughness={0.5} /></mesh>
    <Chama p={[0, 2.42, 0]} k={suave(k)} t={t} esc={1.5} />
  </group>
);

const Turibulo: React.FC<{ x: number; z: number; k: number; fumaca: number; t: number }> = ({ x, z, k, fumaca, t }) => {
  if (k <= 0.02) return null;
  const mao: V = [x - 0.2, 1.1, z + 0.5];
  const ang = 0.55 * Math.sin(t * 3.4);
  const L = 0.62;
  const cen: V = [mao[0], mao[1] - L * Math.cos(ang), mao[2] + L * Math.sin(ang)];
  return (
    <group scale={suave(k)}>
      <Liga a={mao} b={cen} w={0.012} cil cor="#cfd5dc" basico />
      <mesh position={cen}><sphereGeometry args={[0.085, 12, 10]} /><meshStandardMaterial color={OURO} metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[cen[0], cen[1] + 0.06, cen[2]]}><sphereGeometry args={[0.04, 10, 8]} /><meshStandardMaterial color={OURO} metalness={0.7} roughness={0.35} /></mesh>
      <Halo p={[cen[0], cen[1] - 0.03, cen[2]]} r={0.22} cor="#ff7a2a" op={0.8} />
      <group position={[cen[0], cen[1] + 0.1, cen[2]]} scale={2.4}><Fumaca p={[0, 0, 0]} t={t} k={fumaca} cor="#f2f2f6" alt={1.25} larg={0.12} op={0.85} n={18} /></group>
    </group>
  );
};

const Andor: React.FC<{ z: number; k: number; ombros: number; led: number; t: number; y: number }> = ({ z, k, ombros, led, t, y }) => {
  if (k <= 0.02) return null;
  const kv = clamp01(k * 2); // varas
  const kb = clamp01(k * 2 - 0.8); // base
  return (
    <group position={[0, y, z]}>
      {[-0.5, 0.5].map((x) => <Caixa key={x} p={[x, 0, (1 - kv) * -1.5]} t={[0.07, 0.07, 2.7 * kv + 0.01]} cor={MADEIRA} rug={0.7} raio={0.015} />)}
      {[-0.7, 0.7].map((zz) => <Caixa key={zz} p={[0, -0.01, zz * kv]} t={[1.0, 0.05, 0.06]} cor={MADEIRA} rug={0.7} raio={0.01} />)}
      <group scale={[kb, kb, kb]} position={[0, 0.09, 0]}>
        <Caixa p={[0, 0.0, 0]} t={[1.1, 0.1, 1.0]} cor="#8a5a30" rug={0.6} raio={0.02} />
        <Caixa p={[0, -0.13, 0]} t={[1.14, 0.2, 1.04]} cor="#7a1f2b" rug={0.9} raio={0.02} tecido />
        <Caixa p={[0, 0.06, 0]} t={[1.12, 0.03, 1.02]} cor={OURO} met={0.5} rug={0.4} raio={0.01} />
        {[-0.55, 0.55].map((x) => <Caixa key={x} p={[x, 0.07, 0]} t={[0.03, 0.03, 0.9]} cor="#fff2c4" brilho={led * 1.6} emissivo="#ffe9a8" raio={0.005} />)}
        <Caixa p={[0, 0.07, 0.5]} t={[1.0, 0.03, 0.03]} cor="#fff2c4" brilho={led * 1.6} emissivo="#ffe9a8" raio={0.005} />
        <Halo p={[0, 0.2, 0.55]} r={0.9} cor="#ffe9a8" op={0.45 * led * (0.85 + 0.15 * Math.sin(t * 4))} />
      </group>
      {ombros < 1 && null}
    </group>
  );
};

/* ---------- cachorro (Caramelo) ---------- */

const Cachorro: React.FC<{ p: V; rot: number; modo: string; t: number; flip: number; boca: number }> = ({ p, rot, modo, t, flip, boca }) => {
  const trota = modo === "trota";
  const senta = modo === "senta";
  const pe = modo === "pe";
  const corpo = "#c98a3d";
  const claro = "#e8b873";
  const escuro = "#8a5524";
  const sw = trota ? Math.sin(t * 11) : 0;
  const pulo = Math.sin(Math.PI * clamp01(flip)) * 0.75;
  const giro = flip * Math.PI * 2;
  const abre = boca;
  return (
    <group position={[p[0], p[1] + pulo, p[2] + flip * 0.9]} rotation={[0, rot, 0]} scale={1.25}>
      <group position={[0, 0.34, 0]} rotation={[giro, 0, 0]}>
        <group rotation={[senta ? -0.55 : 0, 0, 0]} position={[0, senta ? -0.05 : 0, 0]}>
          <Caixa p={[0, 0, 0]} t={[0.24, 0.24, 0.56]} cor={corpo} rug={0.9} raio={0.08} />
          <Caixa p={[0, -0.07, 0.04]} t={[0.2, 0.1, 0.4]} cor={claro} rug={0.9} raio={0.04} />
          {/* cabeça */}
          <group position={[0, pe ? 0.2 : 0.17, 0.34]} rotation={[pe ? -0.25 : 0, 0, 0.06 * Math.sin(t * 3)]}>
            <mesh><sphereGeometry args={[0.13, 14, 12]} /><meshStandardMaterial color={corpo} roughness={0.85} /></mesh>
            <Caixa p={[0, -0.03, 0.12]} t={[0.12, 0.09, 0.15]} cor={claro} rug={0.9} raio={0.04} />
            <mesh position={[0, 0.0, 0.2]}><sphereGeometry args={[0.032, 8, 8]} /><meshStandardMaterial color="#1b1410" roughness={0.4} /></mesh>
            {abre > 0.02 && (
              <group>
                {/* boca aberta de frente: o interior escuro fica entre o focinho (base em y -0,075) e a mandíbula que desce; a língua apoia na mandíbula e sai para fora */}
                <mesh position={[0, -0.077 - 0.0275 * abre, 0.13]}><boxGeometry args={[0.092, 0.055 * abre + 0.004, 0.12]} /><meshStandardMaterial color="#4a1620" roughness={0.8} /></mesh>
                <Caixa p={[0, -0.082 - 0.055 * abre, 0.115]} t={[0.1, 0.028, 0.14]} cor={claro} rug={0.9} raio={0.01} />
                <mesh position={[0, -0.06 - 0.055 * abre, 0.17]} rotation={[0.25 * abre, 0, 0]} scale={[0.04, 0.016, 0.065]}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color="#e86a7a" roughness={0.5} /></mesh>
                {[-1, 1].map((sg) => <mesh key={sg} position={[sg * 0.03, -0.073, 0.196]}><boxGeometry args={[0.012, 0.014, 0.008]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
              </group>
            )}
            {[-1, 1].map((s) => (
              <group key={s}>
                <mesh position={[s * 0.05, 0.035, 0.1]}><sphereGeometry args={[0.022, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[s * 0.05, 0.035, 0.12]}><sphereGeometry args={[0.012, 8, 8]} /><meshBasicMaterial color="#1b1410" /></mesh>
                <Caixa p={[s * 0.115, 0.0, -0.01]} t={[0.05, 0.16, 0.09]} r={[0, 0, s * 0.22]} cor={escuro} rug={0.9} raio={0.02} />
              </group>
            ))}
          </group>
          {/* rabo */}
          <group position={[0, 0.08, -0.3]} rotation={[0.6, 0.5 * Math.sin(t * (boca > 0.1 || trota ? 14 : 6)), 0]}>
            <Caixa p={[0, 0, -0.1]} t={[0.05, 0.05, 0.22]} cor={corpo} rug={0.9} raio={0.02} />
          </group>
        </group>
        {/* patas */}
        {[[-0.08, 0.2, 1], [0.08, 0.2, -1], [-0.08, -0.2, -1], [0.08, -0.2, 1]].map(([x, z, s], i) => (
          <group key={i} position={[x, -0.1, z]} rotation={[senta && z < 0 ? -1.3 : (flip > 0 && flip < 1 ? 0.9 : 0.55 * sw * s), 0, 0]}>
            <Caixa p={[0, -0.1, 0]} t={[0.07, 0.24, 0.07]} cor={i < 2 ? corpo : claro} rug={0.9} raio={0.025} />
          </group>
        ))}
      </group>
    </group>
  );
};

/* ---------- pessoa ---------- */

type Estado = [number, string, string?];
type PDef = { pose?: Pose3D; id: string; x?: Valor; y?: Valor; z?: Valor; rot?: Valor; esc?: number; acao?: string | Estado[]; exp?: Expressao3D; incl?: Valor; vela?: Valor; baixa?: boolean; ergue?: Valor };

const Pessoa: React.FC<{ g: PDef; p: number; t: number; tAbs: number; baixa: number; dz?: number }> = ({ g, p, t, tAbs, baixa, dz = 0 }) => {
  const pers = PERS[g.id];
  if (!pers) throw new Error(`pessoa da procissão desconhecida: ${g.id}`);
  let acao = "em-pe";
  let exp: Expressao3D = g.exp ?? "sorriso";
  if (typeof g.acao === "string") acao = g.acao;
  else if (Array.isArray(g.acao)) {
    const e = g.acao.find((x) => p <= x[0]) ?? g.acao[g.acao.length - 1];
    acao = e[1];
    if (e[2]) exp = e[2] as Expressao3D;
  }
  const pose: Pose3D = { ...poseDe3D(acao, t), ...(g.pose ?? {}) };
  const vela = valor(g.vela, p, -1);
  const segura = vela >= 0;
  if (segura) { pose["ombroD.x"] = -0.55; pose["cotoveloD.x"] = -1.65; pose["ombroD.z"] = -0.06; }
  if (baixa > 0 && g.baixa !== false) { pose["cabeca.x"] = (pose["cabeca.x"] ?? 0) + 0.55 * baixa; pose["tronco.x"] = (pose["tronco.x"] ?? 0) + 0.1 * baixa; }
  pose["tronco.x"] = (pose["tronco.x"] ?? 0) + valor(g.incl, p, 0);
  const er = valor(g.ergue, p, 0);
  if (er > 0) { pose["ombroE.z"] = 2.45 * er; pose["ombroD.z"] = -2.45 * er; pose["cotoveloE.z"] = 0.2 * er; pose["cotoveloD.z"] = -0.2 * er; }
  const x = valor(g.x, p, 0);
  const y = valor(g.y, p, 0);
  const z = valor(g.z, p, 0) + dz;
  const esc = g.esc ?? 1.06;
  return (
    <group position={[x, y, z]} rotation={[0, valor(g.rot, p, 0), 0]} scale={esc}>
      <Boneco3D p={pers} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} t={tAbs} />
      {segura && <group scale={(pers.altura ?? 1.6) / 1.6}><VelaCopo p={[-0.215, 0.98, 0.4]} acesa={clamp01(vela)} t={tAbs + x} /></group>}
    </group>
  );
};

/* ---------- cenário fixo: igreja, adro, rua ---------- */

const Janela: React.FC<{ p: V; r?: number; rotY?: number; cor?: string }> = ({ p, r = 0, rotY = 0, cor = "#ffd98a" }) => (
  <mesh position={p} rotation={[0, rotY, 0]}><planeGeometry args={[0.7, 0.8]} /><meshBasicMaterial color={cor} /></mesh>
);

const Igreja: React.FC<{ dia: number; apaga: number }> = ({ dia, apaga }) => {
  const parede = mistura("#e8dcc0", "#f4ead2", dia);
  return (
    <group>
      {/* fachada com porta de abertura */}
      <Caixa p={[-2.45, 2.75, -4.15]} t={[3.1, 5.5, 0.35]} cor={parede} rug={0.9} raio={0.02} />
      <Caixa p={[2.45, 2.75, -4.15]} t={[3.1, 5.5, 0.35]} cor={parede} rug={0.9} raio={0.02} />
      <Caixa p={[0, 4.4, -4.15]} t={[1.9, 2.2, 0.35]} cor={parede} rug={0.9} raio={0.02} />
      <Caixa p={[0, 5.62, -4.15]} t={[8, 0.28, 0.45]} cor="#cdbf9f" rug={0.9} raio={0.02} />
      <mesh position={[0, 4.55, -3.96]}><circleGeometry args={[0.5, 24]} /><meshBasicMaterial color="#ffcf7a" /></mesh>
      <mesh position={[0, 4.55, -3.95]}><ringGeometry args={[0.5, 0.58, 24]} /><meshStandardMaterial color="#8a6a3a" /></mesh>
      {[-2.4, 2.4].map((x) => <Janela key={x} p={[x, 3.3, -3.96]} />)}
      {/* torre */}
      <Caixa p={[0, 7.4, -4.9]} t={[3.2, 3.6, 2.6]} cor={parede} rug={0.9} raio={0.03} />
      <Caixa p={[0, 7.4, -3.57]} t={[1.1, 1.5, 0.08]} cor="#2a2118" raio={0.02} />
      <Halo p={[0, 7.4, -3.4]} r={1.2} cor="#ffcf7a" op={0.25} />
      <mesh position={[0, 10.35, -4.9]}><coneGeometry args={[2.0, 2.4, 4]} /><meshStandardMaterial color="#8a3a2a" roughness={0.8} /></mesh>
      <Caixa p={[0, 11.9, -4.9]} t={[0.1, 0.9, 0.1]} cor={OURO} met={0.5} raio={0.01} />
      <Caixa p={[0, 12.05, -4.9]} t={[0.5, 0.1, 0.1]} cor={OURO} met={0.5} raio={0.01} />
      {/* telhado e laterais da nave */}
      <Caixa p={[0, 5.2, -11.2]} t={[8, 0.3, 14.5]} cor="#8a3a2a" rug={0.85} raio={0.02} />
      {[-4, 4].map((x) => <Caixa key={x} p={[x, 2.6, -11.2]} t={[0.3, 5.2, 14.5]} cor={parede} rug={0.9} raio={0.02} />)}
      <Caixa p={[0, 2.6, -18.3]} t={[8.3, 5.2, 0.3]} cor={parede} rug={0.9} raio={0.02} />
      {/* adro e degrau */}
      <Caixa p={[0, 0.06, 0.2]} t={[11, 0.12, 8.4]} cor={mistura("#7d7a72", "#aaa59a", dia)} rug={0.95} raio={0.01} />
      <Caixa p={[0, 0.16, -3.3]} t={[3.2, 0.12, 1.1]} cor="#968f82" rug={0.95} raio={0.01} />
      {/* interior: piso, tapete vermelho, bancos, altar, lustres */}
      <Caixa p={[0, 0.03, -11.2]} t={[7.7, 0.06, 14.2]} cor="#8a6a44" rug={0.7} />
      <Caixa p={[0, 0.07, -11.2]} t={[1.1, 0.02, 14.2]} cor="#a8232e" rug={0.9} />
      {Array.from({ length: 6 }).flatMap((_, i) => [-1, 1].map((s) => (
        <group key={`${i}${s}`} position={[s * 2.2, 0, -7 - i * 1.7]}>
          <Caixa p={[0, 0.3, 0]} t={[2.5, 0.08, 0.5]} cor="#7a4e2a" rug={0.7} raio={0.01} />
          <Caixa p={[0, 0.62, 0.22]} t={[2.5, 0.6, 0.07]} cor="#7a4e2a" rug={0.7} raio={0.01} />
          {[-1.1, 1.1].map((x) => <Caixa key={x} p={[x, 0.15, 0]} t={[0.08, 0.3, 0.5]} cor="#5a3a1e" raio={0.01} />)}
        </group>
      )))}
      <Caixa p={[0, 0.25, -16.8]} t={[4.5, 0.5, 2.4]} cor="#cdbf9f" rug={0.8} raio={0.02} />
      <Caixa p={[0, 0.85, -17.2]} t={[1.6, 0.7, 0.8]} cor="#f5f2ea" rug={0.7} raio={0.02} />
      <Caixa p={[0, 3.0, -18.1]} t={[0.14, 1.8, 0.1]} cor={OURO} met={0.5} raio={0.01} />
      <Caixa p={[0, 3.3, -18.1]} t={[0.8, 0.14, 0.1]} cor={OURO} met={0.5} raio={0.01} />
      <Halo p={[0, 3.2, -17.8]} r={1.6} cor="#ffd98a" op={0.2 * (1 - apaga)} />
      {[-1.4, 1.4].map((x) => <group key={x}><Caixa p={[x, 1.5, -17.2]} t={[0.07, 0.5, 0.07]} cor={BRANCO} raio={0.01} /><Halo p={[x, 1.85, -17.2]} r={0.45} cor="#ffb347" op={0.7 * (1 - apaga)} /></group>)}
      {[-6, -10, -14].map((z) => <Halo key={z} p={[0, 4.4, z]} r={2.0} cor="#ffcf7a" op={0.3 * (1 - apaga)} />)}
    </group>
  );
};

const Rua: React.FC<{ escuro: number; dia: number; t: number }> = ({ escuro, dia, t }) => {
  const zs = [6, 14, 22, 30, 38, 46, 54, 62];
  const pastel = ["#e8c9a0", "#c7d9b5", "#e5b8b0", "#bcd0e0", "#f0dca0", "#d9c3df"];
  const lampOp = (1 - dia) * (0.7 + 0.3 * escuro);
  const cordao = useMemo(() => {
    const out: { p: V; c: string; i: number }[] = [];
    for (let s = 0; s < zs.length - 1; s++) {
      const a: V = [s % 2 ? 3.3 : -3.3, 5.0, zs[s]];
      const b: V = [s % 2 ? -3.3 : 3.3, 5.0, zs[s + 1]];
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        out.push({ p: [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - 0.7 * Math.sin(Math.PI * u), lerp(a[2], b[2], u)], c: ["#ffd98a", "#ff9a6a", "#fff2c4", "#ffc14a"][(s + i) % 4], i });
      }
    }
    return out;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.003, 36]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[240, 200]} /><meshStandardMaterial color={mistura("#242a37", "#6a7a58", dia)} roughness={1} /></mesh>
      <Caixa p={[0, 0.04, 42]} t={[5.6, 0.08, 80]} cor={mistura("#3b3f4a", "#5a5f6a", dia)} rug={0.95} />
      {[-1, 1].map((s) => <Caixa key={s} p={[s * 3.35, 0.1, 42]} t={[1.2, 0.2, 80]} cor={mistura("#5f636e", "#a0a4ae", dia)} rug={0.95} />)}
      {Array.from({ length: 9 }).map((_, i) => <Caixa key={i} p={[0, 0.085, 6 + i * 8]} t={[0.14, 0.01, 2.2]} cor="#cfc9a8" rug={0.9} sombra={false} />)}
      {zs.map((z, i) => [-3.4, 3.4].map((x) => (
        <group key={`${i}${x}`}>
          <mesh position={[x, 2.8, z]}><cylinderGeometry args={[0.07, 0.09, 5.6, 8]} /><meshStandardMaterial color="#4a4f5a" roughness={0.7} /></mesh>
          <Caixa p={[x - Math.sign(x) * 0.25, 5.6, z]} t={[0.6, 0.12, 0.2]} cor="#3a3f48" raio={0.02} />
          <Halo p={[x - Math.sign(x) * 0.4, 5.5, z]} r={1.9} cor="#ffd9a0" op={0.55 * lampOp} />
        </group>
      )))}
      {cordao.map((b, i) => (
        <group key={i}>
          <mesh position={b.p}><sphereGeometry args={[0.07, 6, 6]} /><meshBasicMaterial color={b.c} /></mesh>
          {i % 3 === 0 && <Halo p={b.p} r={0.55} cor={b.c} op={0.5 * lampOp * (0.85 + 0.15 * Math.sin(t * 3 + i))} />}
        </group>
      ))}
      {Array.from({ length: 9 }).flatMap((_, i) => [-1, 1].map((s) => {
        const h = 3.2 + rnd(i * 2 + (s > 0 ? 1 : 0)) * 1.2;
        const cor = pastel[(i + (s > 0 ? 2 : 0)) % pastel.length];
        const z = 9 + i * 8;
        return (
          <group key={`${i}${s}`} position={[s * 6.6, 0, z]}>
            <Caixa p={[0, h / 2, 0]} t={[4.4, h, 6]} cor={mistura(cor, "#2a2f45", 0.45 * (1 - dia))} rug={0.9} raio={0.03} />
            <Caixa p={[0, h + 0.2, 0]} t={[4.7, 0.4, 6.3]} cor="#7a3a2a" rug={0.85} raio={0.03} />
            {[-1.6, 1.6].map((dz) => <mesh key={dz} position={[-s * 2.21, 1.9, dz]} rotation={[0, -s * Math.PI / 2, 0]}><planeGeometry args={[0.9, 1.0]} /><meshBasicMaterial color={rnd(i * 5 + dz) > 0.35 ? "#ffd98a" : "#3a4258"} /></mesh>)}
          </group>
        );
      }))}
    </group>
  );
};

const Moto: React.FC<{ p: V }> = ({ p }) => (
  <group position={p} rotation={[0, 1.2, 0]}>
    <Caixa p={[0, 0.5, 0]} t={[0.3, 0.3, 1.0]} cor="#d6322a" raio={0.06} />
    <Caixa p={[0, 0.35, -0.1]} t={[0.2, 0.18, 0.5]} cor="#222831" raio={0.04} />
    <Caixa p={[0, 0.78, -0.55]} t={[0.5, 0.45, 0.45]} cor="#f2c230" raio={0.05} />
    {[-0.62, 0.62].map((z) => <mesh key={z} position={[0, 0.3, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.3, 0.3, 0.12, 16]} /><meshStandardMaterial color="#1b1b1f" roughness={0.9} /></mesh>)}
    <Halo p={[0, 0.58, 0.55]} r={0.3} cor="#fff2c4" op={0.7} />
  </group>
);

/* ---------- palcos: missa e grandes do ano ---------- */

const Palco: React.FC<{ x: number; dia: number; cor?: string; parede?: string; children?: React.ReactNode }> = ({ x, dia, cor = "#6a5a48", parede, children }) => (
  <group>
    <Caixa p={[x, 0.05, 0]} t={[9, 0.1, 9]} cor={cor} rug={0.9} />
    <Caixa p={[x, 1.6, -3.1]} t={[9, 3.2, 0.2]} cor={parede ?? mistura("#4a3a30", "#9fc0e0", dia)} rug={0.9} />
    {children}
  </group>
);

const Livro: React.FC<{ p: V }> = ({ p }) => <Caixa p={p} t={[0.3, 0.06, 0.4]} cor="#a8232e" raio={0.01} />;

const PalcosMissa: React.FC<{ p: number; t: number; tAbs: number; trechos: number[] }> = ({ p, t, tAbs, trechos }) => {
  const X = -40;
  // cortes na fala: "na entrada, no evangelho, nas ofertas" (trecho 1) e "e na fila da comunhão" (trecho 2)
  const t1 = trechos[1] ?? 2;
  const t2 = trechos[2] ?? t1 + 2.5;
  const idx = t < t1 + 0.65 ? 0 : t < t1 + 1.5 ? 1 : t < t2 ? 2 : 3;
  const anda = (z0: number, v: number) => z0 + (t % 5) * v; // anda para a câmera
  const P = (g: PDef, key?: number) => <Pessoa key={key} g={g} p={p} t={t} tAbs={tAbs} baixa={0} />;
  const palcos = [
    <Palco key={0} x={X} dia={0} cor="#8a6a44" parede="#d9c9a7">{P({ id: "coroinha", x: X - 0.9, z: anda(-1.8, 0.4), acao: "andando", pose: SEGURA })}{P({ id: "coroinha2", x: X + 0.9, z: anda(-1.8, 0.4), acao: "andando", pose: SEGURA })}{P({ id: "padre", x: X, z: anda(-2.9, 0.4), acao: "andando" })}<Cirial x={X - 0.9} z={anda(-1.8, 0.4) + 0.5} k={1} t={tAbs} /><Cirial x={X + 0.9} z={anda(-1.8, 0.4) + 0.5} k={1} t={tAbs} /></Palco>,
    <Palco key={1} x={X} dia={0} cor="#8a6a44" parede="#d9c9a7">
      {P({ id: "coroinha", x: X - 1.0, z: 0.4, acao: "em-pe", pose: SEGURA })}{P({ id: "padre", x: X, z: 0.4, acao: "em-pe", pose: SEGURA })}{P({ id: "coroinha2", x: X + 1.0, z: 0.4, acao: "em-pe", pose: SEGURA })}
      <Livro p={[X, 1.12, 0.75]} />
      <Cirial x={X - 1.0} z={0.9} k={1} t={tAbs} /><Cirial x={X + 1.0} z={0.9} k={1} t={tAbs} />
      <group position={[X + 0.4, 1.0, 0.8]} scale={2}><Fumaca p={[0, 0, 0]} t={tAbs} k={1} cor="#f2f2f6" alt={1.0} larg={0.12} op={0.85} n={14} /></group>
    </Palco>,
    <Palco key={2} x={X} dia={0} cor="#8a6a44" parede="#d9c9a7">
      {P({ id: "homemA", x: X - 0.7, z: anda(-1.8, 0.35), acao: "andando", pose: SEGURA })}{P({ id: "mulher", x: X + 0.7, z: anda(-1.8, 0.35), acao: "andando", pose: SEGURA })}
      <mesh position={[X - 0.7, 1.12, anda(-1.8, 0.35) + 0.55]}><cylinderGeometry args={[0.16, 0.16, 0.05, 14]} /><meshStandardMaterial color="#e2b86a" /></mesh>
      <mesh position={[X + 0.7, 1.08, anda(-1.8, 0.35) + 0.55]}><cylinderGeometry args={[0.07, 0.09, 0.3, 12]} /><meshStandardMaterial color="#6a2a3a" /></mesh>
    </Palco>,
    <Palco key={3} x={X} dia={0} cor="#8a6a44" parede="#d9c9a7">
      {/* o padre, de lado, entrega a hóstia na mão do primeiro da fila; os outros esperam atrás, de mãos sobrepostas */}
      {P({ id: "padre", x: X + 0.75, z: 2.2, rot: -Math.PI / 2, acao: "em-pe", pose: SEGURA_D })}
      <mesh position={[X + 0.2, 1.12, 2.0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.008, 14]} /><meshStandardMaterial color={BRANCO} /></mesh>
      {[["vizinha", 0, 1.6], ["homemB", -1.0, 1.0], ["vovo", -1.9, 0.4]].map(([id, dx, z], i) => P({ id: id as string, x: X + (dx as number), z: z as number, acao: "em-pe", pose: COMUNHAO, esc: 1.0 }, i))}
    </Palco>,
  ];
  return <group>{palcos[idx]}</group>;
};

const PalcosAno: React.FC<{ p: number; t: number; tAbs: number; tapete: THREE.Texture; trechos: number[] }> = ({ p, t, tAbs, tapete, trechos }) => {
  const X = 40;
  // Ramos, Sexta-feira Santa, padroeiro (trecho 0) e Corpo de Deus com o tapete (trecho 1)
  const t1 = trechos[1] ?? 4.5;
  const idx = t < 2.0 ? 0 : t < 3.0 ? 1 : t < t1 ? 2 : 3;
  const anda = (z0: number, v: number) => z0 + (t % 5) * v;
  const P = (g: PDef, key?: number) => <Pessoa key={key} g={g} p={p} t={t} tAbs={tAbs} baixa={0} />;
  // ramo de palma na mão direita (a mão fica ~0,2 m ao lado e ~0,5 m à frente do corpo)
  const ramo = (x: number, z: number, i: number) => (
    <group key={i} position={[x - 0.21, 1.0, z + 0.5]} rotation={[0, 0, 0.1]}>
      <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.012, 0.016, 0.8, 6]} /><meshStandardMaterial color="#4a7a2a" /></mesh>
      {[0.3, 0.45, 0.6, 0.75].map((y, j) => [-1, 1].map((sg) => <Caixa key={`${j}${sg}`} p={[sg * 0.09, y, 0]} t={[0.2, 0.025, 0.06]} r={[0, 0, sg * -0.6]} cor="#3f9a34" raio={0.005} />))}
    </group>
  );
  const palcos = [
    <Palco key={0} x={X} dia={1} cor="#a8a090">
      {[-1.2, 0, 1.2].map((dx, i) => <React.Fragment key={i}>{P({ id: ["homemA", "mulher", "menino"][i], x: X + dx, z: anda(-1.8, 0.35), acao: "andando", pose: SEGURA_D })}{ramo(X + dx, anda(-1.8, 0.35), i)}</React.Fragment>)}
    </Palco>,
    <Palco key={1} x={X} dia={0} cor="#4a4a58">
      {P({ id: "coroinha", x: X, z: anda(-1.8, 0.3), acao: "andando", pose: SEGURA })}
      <mesh position={[X, 2.2, anda(-1.8, 0.3) + 0.5]}><cylinderGeometry args={[0.03, 0.03, 4, 8]} /><meshStandardMaterial color={MADEIRA} /></mesh>
      <Caixa p={[X, 4.0, anda(-1.8, 0.3) + 0.5]} t={[0.08, 0.7, 0.08]} cor="#5a2a7a" raio={0.01} />
      <Caixa p={[X, 4.15, anda(-1.8, 0.3) + 0.5]} t={[0.45, 0.08, 0.08]} cor="#5a2a7a" raio={0.01} />
      {[-1.2, 1.2].map((dx, i) => P({ id: ["vizinha", "homemC"][i], x: X + dx, z: anda(-0.4, 0.3), acao: "andando", vela: 1 }, i))}
    </Palco>,
    <Palco key={2} x={X} dia={0} cor="#4a4a58">
      <group position={[X, 0, 0]}><Andor z={0.2} k={1} ombros={1} led={1} t={tAbs} y={1.27} /></group>
      <Imagem p={[X, 1.47, 0.2]} k={1} t={tAbs} balanca={0} />
      {[[-0.3, -0.8], [0.3, -0.8], [-0.3, 1.2], [0.3, 1.2]].map(([dx, dz], i) => P({ id: ["homemA", "homemB", "homemC", "zeca"][i], x: X + dx, z: dz + 0.2, acao: "em-pe", exp: "sorriso", esc: [0.975, 1.01, 0.953, 1.06][i] }, i))}
      {Array.from({ length: 14 }).map((_, i) => <mesh key={i} position={[X - 2.4 + i * 0.37, 3.2 - 0.3 * Math.sin((i / 13) * Math.PI), -1.2]}><boxGeometry args={[0.2, 0.28, 0.01]} /><meshBasicMaterial color={["#e0493a", "#ffd23f", "#3a8ad6", "#4aa83a"][i % 4]} /></mesh>)}
    </Palco>,
    <Palco key={3} x={X} dia={1} cor="#a8a090">
      <mesh position={[X, 0.12, 0.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.2, 5.6]} /><meshBasicMaterial map={tapete} /></mesh>
      {[-2.2, 2.2].map((dx, i) => P({ id: ["mulher", "homemB"][i], x: X + dx, z: anda(-2, 0.35), acao: "andando" }, i))}
    </Palco>,
  ];
  return <group>{palcos[idx]}</group>;
};

const tapeteTex = () => {
  const c = document.createElement("canvas");
  c.width = 260;
  c.height = 500;
  const g = c.getContext("2d")!;
  g.fillStyle = "#efe6d0";
  g.fillRect(0, 0, 260, 500);
  const cores = ["#e0493a", "#ffd23f", "#3a8ad6", "#4aa83a", "#8a4ad6", "#ff8a2a"];
  for (let b = 0; b < 3; b++) { g.strokeStyle = cores[b * 2]; g.lineWidth = 10; g.strokeRect(8 + b * 14, 8 + b * 14, 244 - b * 28, 484 - b * 28); }
  for (let i = 0; i < 5; i++) {
    const cy = 70 + i * 90;
    for (let r = 4; r >= 1; r--) { g.fillStyle = cores[(i + r) % cores.length]; g.beginPath(); g.arc(130, cy, r * 14, 0, Math.PI * 2); g.fill(); }
    for (const sx of [-1, 1]) { g.fillStyle = cores[(i + 3) % cores.length]; g.beginPath(); g.arc(130 + sx * 80, cy + 20, 14, 0, Math.PI * 2); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/* ---------- cena ---------- */

type EtiqDef = { texto: string; para: V; off: [number, number]; cor?: string };
type Gente = PDef;

const ProcissaoCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio, trechos }) => {
  const n = (k: string, pad = 0) => valor(n0(cena[k]), p, pad);
  const b = (k: string) => cena[k] === true;
  const escuro = n("escuro");
  const dia = n("dia");
  const pare = n("pare", 1);
  const dist = n("anda") * Math.min(p, pare);
  const Z0 = n("pz", 4) + dist;
  const marcha = Math.abs(n("anda")) > 0.01 && p < pare;
  const volta = b("volta");
  const dir = volta ? -1 : 1;
  const rotY = volta ? Math.PI : 0;
  const apaga = n("apaga");
  const baixa = n("baixa");
  const k = { cruz: n("cruz"), ciriais: n("ciriais"), turibulo: n("turibulo"), andor: n("andor"), ombros: n("ombros"), led: n("led"), velas: n("velas"), canto: n("canto"), fumaca: n("fumaca") };
  const nPovo = Math.round(n("povo"));
  const imagem = n("imagem");
  const tapete = useMemo(tapeteTex, []);
  const andando = marcha ? "andando" : "em-pe";
  const gente = (cena.gente as Gente[] | undefined) ?? [];

  // posições da fila (relativas ao líder)
  const zCruz = Z0;
  const zCir = Z0 - dir * 0.3;
  const zTur = Z0 - dir * 2.3;
  const zAndor = Z0 - dir * 5.4;
  const poleY = lerp(0.62, 1.27, suave(k.ombros));
  const zPovo = (i: number) => Z0 - dir * (9.2 + Math.floor(i / 4) * 1.25 + (rnd(i + 17) - 0.5) * 0.3);
  const xPovo = (i: number) => [-1.5, -0.5, 0.5, 1.5][i % 4] + (rnd(i + 5) - 0.5) * 0.2;

  const bearers = [
    { id: "zeca", x: -0.3, z: zAndor + dir * 1.0, esc: 1.06 },
    { id: "homemA", x: 0.3, z: zAndor + dir * 1.0, esc: 0.975 },
    { id: "homemB", x: -0.3, z: zAndor - dir * 1.0, esc: 1.01 },
    { id: "homemC", x: 0.3, z: zAndor - dir * 1.0, esc: 0.953 },
  ];
  const incl = 0.55 * (1 - suave(k.ombros));

  // imagem: no colo ou no andor
  const lugar = n("imgLugar");
  const posColo: V = [n("imgX"), n("imgY", 1.0), n("imgZ")];
  const posAndor: V = [0, poleY + 0.2, zAndor];
  const posImg: V = [lerp(posColo[0], posAndor[0], lugar), lerp(posColo[1], posAndor[1], lugar), lerp(posColo[2], posAndor[2], lugar)];

  // cachorro
  const dog = n("dog");
  const dogZ = n("dogZ") + (b("dogSegue") ? dist : 0);

  const S = n("etiqS", 0.3);
  const Kt = n("etiqK", 1);
  const et: Record<string, EtiqDef> = {
    andor: { texto: "ANDOR", para: [0.5, poleY + 0.05, zAndor + 0.2], off: [-1.6, 1.3] },
    cruz: { texto: "CRUZ", para: [0.1, 4.55, zCruz + 0.12], off: [1.2, -0.6] },
    ciriais: { texto: "CIRIAIS", para: [0.95, 2.45, zCir], off: [-1.7, 0.9] },
    turibulo: { texto: "TURÍBULO", para: [-0.2, 0.65, zTur + 0.45], off: [1.7, 0.9] },
    vela: { texto: "VELA", para: [xPovo(0) - 0.215, 1.2, zPovo(0) + 0.4], off: [-1.5, 0.9] },
  };
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fim] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fim === undefined || Number.isNaN(fim) || p <= fim) };
  }).filter((x) => x.ok);

  const luzHemi = lerp(0.62, 0.34, escuro) * (1 - dia) + 1.4 * dia;
  return (
    <group>
      <hemisphereLight args={[mistura("#7c91d6", "#cfe6ff", dia), mistura("#2a2a3e", "#9a9a80", dia), luzHemi]} />
      <directionalLight position={[-3, 9, 10]} intensity={lerp(0.85, 0.45, escuro) * (1 - dia) + 2.2 * dia} color={mistura("#a8bcff", "#fff4dc", dia)} />
      <pointLight position={[0, 3.8, -8]} intensity={22 * (1 - apaga)} distance={18} color="#ffc27a" />
      <pointLight position={[0, 3.2, -1.5]} intensity={10 * (1 - apaga)} distance={9} color="#ffc27a" />
      <Igreja dia={dia} apaga={apaga} />
      <Rua escuro={escuro} dia={dia} t={tEpisodio} />
      {b("moto") && <Moto p={[-3.3, 0, 10.8]} />}

      {/* peças da procissão */}
      <group position={[0, 0, zCruz]} rotation={[0, rotY, 0]}><Cruz z={0} k={k.cruz} /></group>
      {k.cruz > 0.02 && <Pessoa g={{ id: "coroinha", x: 0, z: zCruz, rot: rotY, acao: andando, pose: SEGURA }} p={p} t={t} tAbs={tEpisodio} baixa={baixa} />}
      {k.ciriais > 0.02 && [-1, 1].map((sg) => (
        <group key={sg}>
          <group position={[0, 0, zCir]} rotation={[0, rotY, 0]}><Cirial x={sg * 0.95} z={0.5} k={k.ciriais} t={tEpisodio} /></group>
          <Pessoa g={{ id: sg > 0 ? "coroinha2" : "coroinha", x: sg * 0.95, z: zCir, rot: rotY, acao: andando, pose: SEGURA }} p={p} t={t} tAbs={tEpisodio} baixa={baixa} />
        </group>
      ))}
      {k.turibulo > 0.02 && <Pessoa g={{ id: "coroinha", x: 0, z: zTur, rot: rotY, acao: andando, pose: SEGURA_D }} p={p} t={t} tAbs={tEpisodio} baixa={baixa} />}
      <group position={[0, 0, zTur]} rotation={[0, rotY, 0]}><Turibulo x={0} z={0} k={k.turibulo} fumaca={k.fumaca} t={tEpisodio} /></group>
      <group position={[0, 0, zAndor]} rotation={[0, rotY, 0]}><Andor z={0} k={k.andor} ombros={k.ombros} led={k.led * (1 - apaga)} t={tEpisodio} y={poleY} /></group>
      {k.andor > 0.3 && !b("semGente") && bearers.map((g) => <Pessoa key={g.id} g={{ ...g, rot: rotY, acao: andando, incl, exp: "sorriso" }} p={p} t={t} tAbs={tEpisodio} baixa={baixa} />)}
      {Array.from({ length: nPovo }).map((_, i) => (
        <Pessoa key={i} g={{ id: POVO_IDS[i % POVO_IDS.length], esc: 1.0 + rnd(i + 31) * 0.1, x: xPovo(i), z: zPovo(i), rot: rotY, acao: andando, vela: k.velas > 0.01 ? clamp01(k.velas * (nPovo + 4) - i) : undefined }} p={p} t={t} tAbs={tEpisodio} baixa={baixa} />
      ))}
      {k.canto > 0.02 && [-1, 0, 1].map((i) => <Texto3D key={i} texto="♪" p={[i * 1.3 + 0.1 * Math.sin(tEpisodio * 2 + i), 3.0 + 0.25 * Math.sin(tEpisodio * 3 + i * 2), zPovo(2) + dir]} h={0.55} escala={suave(k.canto)} />)}

      <group position={posImg} rotation={[0, lugar > 0.5 ? rotY : 0, 0]}><Imagem p={[0, 0, 0]} k={imagem} t={tEpisodio} balanca={n("balanca")} /></group>
      {dog > 0.02 && <Cachorro p={[n("dogX"), 0.1, dogZ]} rot={n("dogRot")} modo={(cena.dogModo as string | undefined) ?? "trota"} t={tEpisodio} flip={n("cambalhota")} boca={n("boca")} />}

      {gente.map((g, i) => <Pessoa key={`${g.id}${i}`} g={g} p={p} t={t} tAbs={tEpisodio} baixa={0} />)}

      {b("missa") && <PalcosMissa p={p} t={t} tAbs={tEpisodio} trechos={trechos} />}
      {b("vinheta") && <PalcosAno p={p} t={t} tAbs={tEpisodio} tapete={tapete} trechos={trechos} />}

      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const de: V = [d.para[0] + d.off[0] * S, d.para[1] + d.off[1] * S, d.para[2] + 0.1];
        return <Etiqueta key={c} texto={d.texto} de={de} para={d.para} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 50) => ({ pos, alvo, fov });

export const procissao: Cenario3D = {
  Cena: ProcissaoCena,
  padrao: "geral",
  fundo: (cena, p) => mistura(mistura("#2a3f78", "#070b1c", clamp01(valor(n0(cena.escuro), p, 0))), "#9fd0ff", clamp01(valor(n0(cena.dia), p, 0))),
  luzPropria: true,
  cameras: { geral: c([0, 1.8, 14], [0, 1.6, 0], 50) },
};

