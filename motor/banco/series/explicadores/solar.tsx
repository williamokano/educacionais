import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, valor } from "../../../src/v3d/anima";
import { caminhoReto, CanoComFluxo, Trecho } from "../../../src/v3d/cano";
import { Nuvem } from "../../../src/v3d/particulas";
import { Caixa, Mat, rnd, useSeg } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, V3, Valor } from "../../../src/v3d/tipos";
import { CenaV2 } from "../../../src/v2/tipos";
import { Arvore } from "./sala";

// Casa em corte do episódio 4 (energia solar), no verão: a sala com o sofá e a TV, as
// placas no telhado, os aparelhos na parede do fundo e, na rua, o padrão de entrada com o medidor e o poste.
// A corrente anda nos fios como bolinhas amarelas: contínua (CC) num sentido só, alternada (CA) indo e voltando.
// Campos da cena (número ou { de, para, ini, fim }):
//   placas 0..10 quantas placas no telhado (padrão 10) · direto: true = um fio da placa direto na TV (sem inversor)
//   inversor 0..1 · stringbox 0..1 · quadro 0..1 · aterrado: true = fio terra descendo · bidirecional: true
//   hora 0..1 o sol anda da manhã (0) à tarde (1) · noite 0..1 céu escuro, sol some · forcaSol 0..1 (padrão 1 - noite)
//   nublado 0..1 · exporta -1..1 (+1 a sobra sai para a rua, −1 a rua manda para a casa) · tv 0..1 · lampada 0..1 (luz da sala)
//   rede 0..1 o poste energizado (luz da rua acesa, corrente no fio) · led "verde" | "vermelho" | "apagado"
//   bateria 0..1 (nível; aparece se o campo existir) · carga -1..1 (+ carregando, − descarregando) · hibrido: true
//   chave 0..1 a chave entre a casa e a rua (0 fechada, 1 aberta) · offgrid 0..1 o fio da rua some
//   controlador: true · gerador 0..1 (aparece se existir; > 0.5 ligado) · faisca: true (fio vivo perto do eletricista)
//   onda: true = a corrente nos fios da casa indo e voltando bem devagar (close da tomada)
//   escada: true = escada de alumínio encostada no poste (o eletricista em cima, com `elev`)
// O Zeca é posto pelo roteiro em ZECA (pos [-2.65, 0.05], rot 1.15, "sentado+…"); o eletricista em ELETRICISTA.

type V = V3;
export const ZECA = { pos: [-2.65, 0.05] as [number, number], rot: 1.15 };
// o eletricista fica em cima da escada encostada no poste (pés a ELETRICISTA.elev m), mexendo na caixa do alto
export const ELETRICISTA = { pos: [4.16, -0.4] as [number, number], rot: -1.57, elev: 2.25 };
const TV: V = [-1.15, 0, 0.75];
const TV_ROT = Math.atan2(ZECA.pos[0] - TV[0], ZECA.pos[1] - TV[2]);
const POSTE: V = [3.5, 0, -0.4];
const PADRAO: V = [0.65, 0, 1.0];
const AMARELO = "#ffd23f";

const mistura = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getStyle();

/* ---------- fios ---------- */

const fio = (pts: V[], raio = 0.014): Trecho => ({ curva: caminhoReto(pts, 0.04), cores: [[0, AMARELO]], raio, bola: raio * 0.85, densidade: 34, cano: "#2c3136" });

const FIOS = {
  direto: fio([[-1.9, 3.42, 0.1], [-1.15, 3.42, 0.1], [-1.15, 3.42, TV[2] - 0.08], [-1.15, 1.5, TV[2] - 0.08], [TV[0], 1.12, TV[2] - 0.08]]),
  placas: fio([[-1.75, 3.42, -0.45], [-0.3, 3.42, -0.45], [-0.3, 3.42, -1.48], [-0.3, 2.32, -1.48]], 0.018),
  sbInv: fio([[-0.3, 1.98, -1.48], [-0.3, 1.74, -1.48]], 0.018),
  invQuadro: fio([[-0.52, 1.45, -1.48], [-0.72, 1.45, -1.48]]),
  quadroRua: fio([[-0.88, 1.22, -1.48], [-0.88, 0.22, -1.48], [-0.04, 0.22, -1.48], [-0.04, 0.22, PADRAO[2]], [PADRAO[0], 0.22, PADRAO[2]], [PADRAO[0], 1.25, PADRAO[2] + 0.1]]),
  rua: fio([[PADRAO[0], 1.62, PADRAO[2] + 0.1], [PADRAO[0], 2.75, PADRAO[2]], [POSTE[0] - 0.1, 3.85, POSTE[2]]], 0.016),
  tv: fio([[-0.88, 1.72, -1.48], [-0.88, 2.6, -1.48], [TV[0], 2.6, -1.48], [TV[0], 2.6, TV[2] - 0.12], [TV[0], 1.0, TV[2] - 0.12]], 0.011),
  bateria: fio([[-1.02, 0.78, -1.38], [-1.02, 1.3, -1.48], [-0.52, 1.3, -1.48]], 0.02),
  gerador: fio([[1.75, 0.35, 0.35], [0.05, 0.35, 0.35], [0.05, 0.35, -1.48], [-0.52, 0.35, -1.48], [-0.52, 1.22, -1.48]], 0.016),
};

/* ---------- peças ---------- */

const Sofa: React.FC = () => {
  const f: [number, number] = [Math.sin(ZECA.rot), Math.cos(ZECA.rot)];
  const cor = "#2f8f7a";
  return (
    <group position={[ZECA.pos[0] - f[0] * 0.2, 0, ZECA.pos[1] - f[1] * 0.2]} rotation={[0, ZECA.rot, 0]}>
      <Caixa p={[0, 0.17, 0]} t={[1.5, 0.22, 0.72]} cor="#256f60" raio={0.04} tecido />
      {[-0.36, 0.36].map((x) => <Caixa key={x} p={[x, 0.36, 0.04]} t={[0.7, 0.16, 0.64]} cor={cor} raio={0.06} tecido />)}
      <Caixa p={[0, 0.66, -0.3]} t={[1.5, 0.62, 0.18]} cor={cor} raio={0.07} tecido />
      {[-0.8, 0.8].map((x) => <Caixa key={x} p={[x, 0.42, 0]} t={[0.16, 0.42, 0.74]} cor={cor} raio={0.06} tecido />)}
    </group>
  );
};

const Televisao: React.FC<{ liga: number; t: number }> = ({ liga, t }) => (
  <group position={TV} rotation={[0, TV_ROT, 0]}>
    <Caixa p={[0, 0.25, 0]} t={[0.7, 0.5, 0.35]} cor="#6b4a2c" raio={0.02} />
    <Caixa p={[0, 0.85, -0.05]} t={[0.92, 0.56, 0.05]} cor="#16181c" raio={0.02} verniz={0.6} />
    <mesh position={[0, 0.85, -0.023]}>
      <planeGeometry args={[0.84, 0.48]} />
      <meshBasicMaterial color={liga > 0.5 ? mistura("#4fb6ff", "#ffd27a", 0.5 + 0.5 * Math.sin(t * 1.3)) : "#0c0d10"} />
    </mesh>
  </group>
);

/** Placas no telhado, em fila, inclinadas para a frente (o sol do norte fica "para a câmera"). */
const Placas: React.FC<{ n: number; sol: number }> = ({ n, sol }) => (
  <group>
    {Array.from({ length: n }).map((_, i) => (
      <group key={i} position={[-3.3 + i * 0.31, 3.48, -0.15]} rotation={[0.45, 0, 0]}>
        <Caixa p={[0, 0, 0]} t={[0.29, 0.02, 0.62]} cor="#b9c0c8" met={0.6} rug={0.3} raio={0.004} />
        {Array.from({ length: 6 }).map((__, k) => (
          <Caixa key={k} p={[0, 0.012, -0.25 + k * 0.1]} t={[0.26, 0.006, 0.09]} cor={mistura("#18325f", "#2f5fae", sol * 0.6)} met={0.3} rug={0.2} raio={0.002} verniz={0.8} />
        ))}
        <Caixa p={[0, -0.12, -0.24]} t={[0.02, 0.2, 0.02]} cor="#7a8188" raio={0.003} />
      </group>
    ))}
  </group>
);

const Inversor: React.FC<{ led: string; hibrido: boolean }> = ({ led, hibrido }) => (
  <group position={[-0.3, 1.45, -1.52]}>
    <Caixa p={[0, 0, 0]} t={[0.4, 0.5, 0.14]} cor={hibrido ? "#e9ecef" : "#f4f5f6"} raio={0.03} rug={0.35} verniz={0.4} />
    <Caixa p={[0, 0.12, 0.072]} t={[0.22, 0.1, 0.005]} cor="#1b2a33" raio={0.006} />
    <mesh position={[0.13, -0.15, 0.075]}><circleGeometry args={[0.018, 16]} /><meshBasicMaterial color={led === "verde" ? "#4dff7a" : led === "vermelho" ? "#ff3b30" : "#3a3f44"} /></mesh>
    {hibrido && <Caixa p={[-0.1, -0.15, 0.072]} t={[0.12, 0.04, 0.005]} cor="#3b82f6" raio={0.004} />}
    {Array.from({ length: 6 }).map((_, i) => <Caixa key={i} p={[-0.12 + i * 0.048, -0.27, 0]} t={[0.02, 0.04, 0.1]} cor="#9aa3ab" raio={0.003} />)}
  </group>
);

const StringBox: React.FC = () => (
  <group position={[-0.3, 2.15, -1.52]}>
    <Caixa p={[0, 0, 0]} t={[0.3, 0.34, 0.1]} cor="#e7e3d8" raio={0.02} rug={0.5} />
    <Caixa p={[0, 0, 0.052]} t={[0.24, 0.26, 0.005]} cor="#cfe8ff" op={0.5} raio={0.01} />
    <Caixa p={[-0.07, 0.04, 0.03]} t={[0.04, 0.12, 0.03]} cor="#20252a" raio={0.004} />
    <Caixa p={[0.0, 0.04, 0.03]} t={[0.05, 0.12, 0.03]} cor="#e0483a" raio={0.004} />
    <Caixa p={[0.08, 0.04, 0.03]} t={[0.04, 0.12, 0.03]} cor="#2f6fc9" raio={0.004} />
  </group>
);

const Quadro: React.FC = () => (
  <group position={[-0.88, 1.45, -1.52]}>
    <Caixa p={[0, 0, 0]} t={[0.28, 0.42, 0.08]} cor="#f2f2ee" raio={0.02} rug={0.5} />
    {[0, 1, 2].map((i) => <Caixa key={i} p={[-0.07 + i * 0.07, 0.03, 0.045]} t={[0.05, 0.12, 0.02]} cor="#2c3136" raio={0.004} />)}
  </group>
);

const Bateria: React.FC<{ nivel: number; carga: number; t: number }> = ({ nivel, carga, t }) => {
  const pisca = carga !== 0 ? 0.5 + 0.5 * Math.sin(t * 4) : 1;
  return (
    <group position={[-1.02, 0, -1.33]}>
      <Caixa p={[0, 0.39, 0]} t={[0.42, 0.78, 0.26]} cor="#eceff2" raio={0.03} rug={0.35} verniz={0.4} />
      {Array.from({ length: 5 }).map((_, i) => (
        <Caixa key={i} p={[0, 0.2 + i * 0.1, 0.132]} t={[0.24, 0.07, 0.005]} cor={i < Math.round(nivel * 5) ? (i === Math.round(nivel * 5) - 1 ? mistura("#1f2a30", "#4dff7a", pisca) : "#4dff7a") : "#1f2a30"} raio={0.004} />
      ))}
    </group>
  );
};

const Controlador: React.FC = () => (
  <group position={[-0.3, 0.92, -1.52]}>
    <Caixa p={[0, 0, 0]} t={[0.24, 0.2, 0.07]} cor="#2a5f9e" raio={0.015} />
    <Caixa p={[0, 0.03, 0.037]} t={[0.14, 0.06, 0.004]} cor="#c9f2d6" raio={0.004} />
  </group>
);

const Gerador: React.FC<{ liga: boolean; t: number }> = ({ liga, t }) => {
  const treme = liga ? Math.sin(t * 60) * 0.004 : 0;
  return (
    <group position={[1.85 + treme, 0.08, 0.35]}>
      <Caixa p={[0, 0.22, 0]} t={[0.6, 0.4, 0.42]} cor="#e2b21f" raio={0.03} rug={0.4} />
      <Caixa p={[0, 0.48, 0]} t={[0.66, 0.06, 0.48]} cor="#2a2d31" raio={0.02} />
      <Caixa p={[-0.18, 0.22, 0.215]} t={[0.14, 0.14, 0.01]} cor="#20252a" raio={0.01} />
      {liga && <Nuvem t={t} de={[0.33, 0.3, 0]} rumo={[0.5, 0.6, 0]} n={6} tamanho={0.4} forca={0.5} />}
    </group>
  );
};

/** Padrão de entrada: poste curto de alvenaria com o medidor e a chave que separa a casa da rua. */
const Padrao: React.FC<{ bidirecional: boolean; chave: number; t: number; anda: number }> = ({ bidirecional, chave, t, anda }) => (
  <group position={PADRAO}>
    <Caixa p={[0, 1.4, 0]} t={[0.3, 2.8, 0.3]} cor="#d9d2c3" raio={0.01} rug={0.95} />
    <group position={[0, 1.42, 0.17]}>
      <Caixa p={[0, 0, 0]} t={[0.28, 0.36, 0.05]} cor="#5d6670" raio={0.012} />
      <mesh position={[0, 0.03, 0.027]}><circleGeometry args={[0.1, 28]} /><meshBasicMaterial color="#f4f4f0" /></mesh>
      {/* contadores: um que gira com o que entra; no bidirecional, outro com o que sai */}
      <mesh position={[bidirecional ? -0.045 : 0, 0.03, 0.03]} rotation={[0, 0, -t * 2 * Math.max(-anda, bidirecional ? 0 : 0.4)]}>
        <boxGeometry args={[0.07, 0.008, 0.003]} /><meshBasicMaterial color="#e0483a" />
      </mesh>
      {bidirecional && (
        <mesh position={[0.045, 0.03, 0.03]} rotation={[0, 0, t * 2 * Math.max(anda, 0)]}><boxGeometry args={[0.07, 0.008, 0.003]} /><meshBasicMaterial color="#2fbf5b" /></mesh>
      )}
    </group>
    {/* chave da ligação com a rua: alavanca que abre para cima */}
    <group position={[0, 2.05, 0.17]}>
      <Caixa p={[0, 0, 0]} t={[0.22, 0.26, 0.06]} cor="#3b4f63" raio={0.012} />
      <group position={[0, -0.06, 0.04]} rotation={[0, 0, 0]}>
        <group rotation={[-chave * 1.3, 0, 0]}>
          <Caixa p={[0, 0.07, 0.02]} t={[0.035, 0.14, 0.03]} cor={chave > 0.5 ? "#ff5a3c" : "#d9dde1"} met={0.6} rug={0.3} raio={0.006} />
        </group>
      </group>
    </group>
  </group>
);

const Poste: React.FC<{ aceso: number }> = ({ aceso }) => {
  const seg = useSeg();
  return (
    <group position={POSTE}>
      <mesh position={[0, 2.1, 0]}><cylinderGeometry args={[0.07, 0.11, 4.2, seg(10, 24)]} /><Mat cor="#b9b6ae" rug={0.9} /></mesh>
      <Caixa p={[0, 3.9, 0]} t={[0.08, 0.08, 0.9]} cor="#8f8b82" raio={0.01} />
      <mesh position={[0.18, 3.35, 0]}><cylinderGeometry args={[0.13, 0.13, 0.4, seg(12, 28)]} /><Mat cor="#7b8590" met={0.4} rug={0.5} /></mesh>
      <Caixa p={[-0.55, 4.05, 0]} t={[1.1, 0.04, 0.04]} cor="#8f8b82" raio={0.01} />
      <mesh position={[-1.05, 3.98, 0]}><sphereGeometry args={[0.08, 16, 12]} /><meshStandardMaterial color={aceso > 0.5 ? "#fff3c4" : "#5a5d62"} emissive="#ffe08a" emissiveIntensity={aceso > 0.5 ? 1.6 : 0} /></mesh>
      <Caixa p={[0.14, 3.2, 0]} t={[0.12, 0.24, 0.14]} cor="#5d6670" raio={0.012} />
    </group>
  );
};

/** Escada de alumínio encostada no poste, do chão (lado da rua) até perto da cruzeta. */
const Escada: React.FC = () => {
  const pe: V = [POSTE[0] + 0.95, 0, POSTE[2]];
  const topo: V = [POSTE[0] + 0.12, 3.7, POSTE[2]];
  const comp = Math.hypot(topo[0] - pe[0], topo[1] - pe[1]);
  const ang = Math.atan2(pe[0] - topo[0], topo[1] - pe[1]);
  return (
    <group position={pe} rotation={[0, 0, ang]}>
      {[-0.2, 0.2].map((z) => <Caixa key={z} p={[0, comp / 2, z]} t={[0.035, comp, 0.05]} cor="#c3c9cf" met={0.8} rug={0.3} raio={0.006} />)}
      {Array.from({ length: Math.floor(comp / 0.3) }).map((_, i) => <Caixa key={i} p={[0, 0.3 + i * 0.3, 0]} t={[0.03, 0.03, 0.4]} cor="#aab1b8" met={0.8} rug={0.3} raio={0.004} />)}
    </group>
  );
};

const Faiscas: React.FC<{ t: number; p: V }> = ({ t, p }) => (
  <group position={p}>
    {Array.from({ length: 8 }).map((_, i) => {
      const c = (t * 3 + rnd(i + 5)) % 1;
      const a = rnd(i) * Math.PI * 2;
      return (
        <mesh key={i} position={[Math.cos(a) * c * 0.18, Math.sin(a * 1.7) * c * 0.15, Math.sin(a) * c * 0.18]} scale={0.04 * (1 - c)}>
          <sphereGeometry args={[1, 6, 5]} /><meshBasicMaterial color={i % 2 ? "#fff6b0" : "#7fd3ff"} />
        </mesh>
      );
    })}
  </group>
);

const Nuvens: React.FC<{ k: number; t: number }> = ({ k, t }) => (
  <group position={[-1.5 + (1 - k) * -6 + Math.sin(t * 0.3) * 0.1, 5.6, -3.4]}>
    {[[0, 0, 0, 0.8], [0.8, 0.15, 0.1, 0.65], [-0.8, -0.05, 0.05, 0.65], [0.3, 0.5, -0.1, 0.6], [1.5, -0.05, 0, 0.5], [-1.5, 0.05, 0, 0.5]].map(([x, y, z, s], i) => (
      <mesh key={i} position={[x, y, z]} scale={s}><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color="#9ea6ad" roughness={1} transparent opacity={0.95 * k} /></mesh>
    ))}
  </group>
);

/* ---------- casa em corte ---------- */

const Casa: React.FC<{ noite: number }> = ({ noite }) => (
  <group>
    <mesh position={[0, -0.065, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /><Mat cor={mistura("#7cc86a", "#2e4a3a", noite * 0.7)} rug={0.95} /></mesh>
    <Caixa p={[-1.7, -0.35, 0]} t={[3.6, 0.6, 3.2]} cor="#9a6a43" raio={0.004} rug={1} />
    <Caixa p={[-1.7, -0.03, 0]} t={[3.6, 0.06, 3.2]} cor="#d9a25b" raio={0.004} rug={0.7} />
    <Caixa p={[-1.7, 1.5, -1.6]} t={[3.6, 3.0, 0.1]} cor="#efe1c6" raio={0.003} rug={0.95} />
    <Caixa p={[-2.2, 0.012, 0.25]} t={[1.9, 0.012, 1.4]} cor="#ef8a4c" raio={0.004} rug={1} tecido />
    <Caixa p={[0, 1.5, 0]} t={[0.18, 3.0, 3.2]} cor="#e8d8ba" raio={0.004} rug={0.95} />
    <Caixa p={[-1.7, 3.05, 0]} t={[3.8, 0.1, 3.3]} cor="#c9b89a" raio={0.004} />
    <Caixa p={[-1.7, 3.2, 0]} t={[4.0, 0.2, 3.5]} cor="#b6ad9c" raio={0.01} />
    <Caixa p={[2.0, 0.04, 0.2]} t={[3.6, 0.08, 1.6]} cor="#c9c9c4" raio={0.01} rug={0.9} />
    <Arvore p={[4.4, 0, -2.6]} s={1.5} />
    <Arvore p={[1.6, 0, -3.0]} s={1.2} />
  </group>
);

/* ---------- cena ---------- */

const Solar: React.FC<Cenario3DProps> = ({ cena, progresso, tEpisodio: t }) => {
  const placas = Math.round(valor(cena.placas as Valor, progresso, 10));
  const direto = cena.direto === true;
  const noite = valor(cena.noite as Valor, progresso, 0);
  const nublado = valor(cena.nublado as Valor, progresso, 0);
  const sol = valor(cena.forcaSol as Valor, progresso, 1 - noite) * (1 - nublado * 0.7);
  const hora = valor(cena.hora as Valor, progresso, 0.5);
  const inversor = valor(cena.inversor as Valor, progresso, direto ? 0 : 1) > 0.5;
  const stringbox = valor(cena.stringbox as Valor, progresso, 1) > 0.5;
  const quadro = valor(cena.quadro as Valor, progresso, 1) > 0.5;
  const rede = valor(cena.rede as Valor, progresso, 1);
  const offgrid = valor(cena.offgrid as Valor, progresso, 0);
  const exporta = valor(cena.exporta as Valor, progresso, 0);
  const tv = valor(cena.tv as Valor, progresso, inversor ? 1 : 0);
  const luz = valor(cena.lampada as Valor, progresso, tv);
  const chave = valor(cena.chave as Valor, progresso, 0);
  const temBateria = cena.bateria !== undefined;
  const nivel = valor(cena.bateria as Valor, progresso, 0.8);
  const carga = valor(cena.carga as Valor, progresso, 0);
  const temGerador = cena.gerador !== undefined;
  const gerador = valor(cena.gerador as Valor, progresso, 0) > 0.5;
  const led = (cena.led as string | undefined) ?? (tv > 0.5 ? "verde" : "apagado");
  const lenta = cena.onda === true;
  // CC: anda num sentido, com a força do sol. CA: vai e volta (devagar para dar para ver), e a sobra escorre para fora.
  const cc = t * 0.22 * sol;
  const ca = (lenta ? 0.12 : 0.05) * Math.sin(t * Math.PI * 2 * (lenta ? 0.6 : 1.2));
  const casaViva = tv > 0.5 || luz > 0.5;
  const sunPos: V = [-5 + 10 * hora, 4.2 + 3.2 * Math.sin(Math.PI * hora), -5];
  const fiosCasa = inversor && casaViva;
  const ruaViva = rede > 0.5 && offgrid < 0.5;
  return (
    <group>
      <Casa noite={noite} />
      <Sofa />
      <Televisao liga={tv} t={t} />
      <Placas n={placas} sol={sol} />
      {/* luz da sala */}
      <mesh position={[-1.8, 2.95, 0]}><cylinderGeometry args={[0.16, 0.12, 0.06, 20]} /><meshStandardMaterial color={luz > 0.5 ? "#fff5d6" : "#8a8a86"} emissive="#ffe6a8" emissiveIntensity={luz > 0.5 ? 1.4 : 0} /></mesh>
      {direto && placas > 0 && <CanoComFluxo trecho={FIOS.direto} t={t} deslocamento={cc} />}
      {!direto && placas > 0 && (
        <>
          <CanoComFluxo trecho={FIOS.placas} t={t} deslocamento={cc} />
          {stringbox && <StringBox />}
          {inversor && <CanoComFluxo trecho={FIOS.sbInv} t={t} deslocamento={cc} />}
        </>
      )}
      {inversor && <Inversor led={led} hibrido={cena.hibrido === true} />}
      {inversor && quadro && (
        <>
          <Quadro />
          <CanoComFluxo trecho={FIOS.invQuadro} t={t} deslocamento={fiosCasa ? ca + t * 0.1 : 0} />
          <CanoComFluxo trecho={FIOS.tv} t={t} deslocamento={fiosCasa ? ca + t * 0.08 : 0} />
          {offgrid < 0.5 && <CanoComFluxo trecho={FIOS.quadroRua} t={t} deslocamento={ruaViva || exporta !== 0 ? ca + t * 0.15 * exporta : 0} />}
        </>
      )}
      {cena.aterrado === true && <CanoComFluxo trecho={fio([[-0.3, 1.2, -1.5], [-0.3, 0.02, -1.5], [-0.3, -0.3, -1.4]], 0.01)} t={t} deslocamento={0} />}
      {temBateria && (
        <>
          <Bateria nivel={nivel} carga={carga} t={t} />
          <CanoComFluxo trecho={FIOS.bateria} t={t} deslocamento={-t * 0.2 * carga} />
        </>
      )}
      {cena.controlador === true && <Controlador />}
      {temGerador && (
        <>
          <Gerador liga={gerador} t={t} />
          {gerador && <CanoComFluxo trecho={FIOS.gerador} t={t} deslocamento={ca + t * 0.1} />}
        </>
      )}
      {offgrid < 0.5 && (
        <>
          <Padrao bidirecional={cena.bidirecional === true} chave={chave} t={t} anda={exporta} />
          {chave < 0.5 || ruaViva ? (
            <CanoComFluxo trecho={FIOS.rua} t={t} deslocamento={ruaViva || exporta !== 0 ? ca + t * 0.15 * exporta : 0} />
          ) : (
            <CanoComFluxo trecho={FIOS.rua} t={t} deslocamento={0} />
          )}
        </>
      )}
      <Poste aceso={rede} />
      {cena.faisca === true && <Faiscas t={t} p={[POSTE[0] + 0.3, 3.3, POSTE[2] + 0.12]} />}
      {cena.escada === true && <Escada />}
      {noite < 0.8 && <mesh position={sunPos}><sphereGeometry args={[0.55, 24, 18]} /><meshBasicMaterial color="#ffd23f" transparent opacity={1 - noite} /></mesh>}
      {noite > 0.2 && <mesh position={[3.5, 6.5, -5]}><sphereGeometry args={[0.35, 20, 14]} /><meshBasicMaterial color="#e9eef7" transparent opacity={noite} /></mesh>}
      {nublado > 0.02 && <Nuvens k={nublado} t={t} />}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 42) => ({ pos, alvo, fov });

export const solar: Cenario3D = {
  Cena: Solar,
  padrao: "casa",
  fundo: (cena: CenaV2, progresso: number) => {
    const noite = valor(cena.noite as Valor, progresso, 0);
    const nublado = valor(cena.nublado as Valor, progresso, 0);
    return mistura(mistura("#8fd0f5", "#aeb9c3", nublado), "#1d2a44", noite);
  },
  cameras: {
    casa: c([-0.3, 3.0, 12.2], [-0.2, 2.2, 0], 58),
    "rua-fio": c([1.4, 2.5, 3.6], [1.9, 2.9, 0.3], 46),
    sala: c([-1.75, 1.85, 4.9], [-1.95, 1.15, -0.2], 52),
    tv: c([-1.6, 1.5, 2.6], [-1.6, 1.0, 0.2], 46),
    zeca: c([-1.75, 1.45, 2.4], [-2.5, 1.0, 0.05], 40),
    telhado: c([-1.8, 4.6, 3.2], [-1.8, 3.5, -0.2], 50),
    "placa-perto": c([-2.9, 3.95, 1.0], [-3.2, 3.45, -0.15], 38),
    fio: c([-1.4, 2.6, 1.2], [-1.15, 2.2, 0.6], 40),
    tomada: c([-0.4, 1.9, 0.2], [-0.88, 1.6, -1.5], 36),
    aparelhos: c([-0.55, 1.75, 1.3], [-0.6, 1.55, -1.5], 42),
    inversor: c([-0.15, 1.75, 0.65], [-0.45, 1.5, -1.52], 44),
    stringbox: c([-0.15, 2.3, 0.35], [-0.3, 2.0, -1.52], 42),
    bateria: c([-0.45, 1.35, 1.1], [-0.8, 0.85, -1.4], 46),
    medidor: c([0.75, 1.6, 2.0], [0.65, 1.5, 1.0], 32),
    chave: c([0.8, 2.1, 1.9], [0.65, 2.0, 1.0], 34),
    rua: c([2.1, 2.4, 5.6], [1.8, 2.0, 0], 52),
    poste: c([2.3, 3.0, 4.4], [3.75, 2.9, -0.3], 46),
    gerador: c([1.15, 1.55, 3.3], [1.8, 0.5, 0.35], 46),
  },
};
