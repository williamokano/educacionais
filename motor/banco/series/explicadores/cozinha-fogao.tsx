import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { Caixa, Mat, rnd } from "../../../src/v3d/qualidade";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Expressao3D, Personagem3D, Pose3D, Valor } from "../../../src/v3d/tipos";
import { valor } from "../../../src/v3d/anima";
import { zeca } from "./zeca";
import { corBatata, Halo, Liga, mistura, V } from "./cozinha-base";

// Cozinha (episódio 9), em escala real: o Zeca tem ~1,7 m, a bancada 0,9 m (cintura), o fogão 0,8 m de largura com o forno embaixo das
// bocas, a caixinha que sai do forno é uma torradeira grande (~45 cm), a airfryer final tem ~30 cm e o micro-ondas ~50 cm.
// Ambiente, fogão, panela, guardanapo e o Zeca ficam aqui; o forno que encolhe e tudo o que vai dentro dele, em cozinha-forno.tsx.
// A panela e o que está nela são desenhados num sistema local (origem = centro da base da panela, medidas "de desenho": raio 0,3) e
// postos na boca do fogão com a escala POT_ESC.

export const CY = 0.9; // topo da bancada (cintura do Zeca)
export const XS = -0.6; // centro do fogão
export const XB = 0.45; // centro da caixinha / da airfryer, na bancada
export const XM = 1.0; // centro do micro-ondas
export const Z_FRENTE = 0.2; // frente da bancada e do fogão
export const Z_PAREDE = -0.62;
export const POT_ESC = 0.45;
export const POT_POS: V = [XS - 0.2, CY + 0.035, -0.12]; // a panela na boca da esquerda
export const R_PANELA = 0.3;
export const H_PANELA = 0.3;
export const OLEO_Y = 0.18; // superfície do óleo (local da panela)
export const NAPKIN_X = -0.05; // guardanapo na bancada (mundo)
const NAP_LOCAL_X = (NAPKIN_X - POT_POS[0]) / POT_ESC;

/* ---------- ambiente ---------- */

const azulejos = () => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fbefd2";
  g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      g.fillStyle = (x + y) % 2 ? "#f6e3b5" : "#f9ebc8";
      g.fillRect(x * 64 + 3, y * 64 + 3, 58, 58);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 1);
  return t;
};

const tabuas = () => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 64;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? "#c8905a" : "#d29a62";
    g.fillRect(i * 64, 0, 62, 64);
    g.fillStyle = "#a8743f";
    g.fillRect(i * 64 + 62, 0, 2, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 1);
  return t;
};

export const Ambiente: React.FC = () => {
  const az = useMemo(azulejos, []);
  const pi = useMemo(tabuas, []);
  const portas = Array.from({ length: 11 }, (_, i) => -3.0 + i * 0.6).filter((x) => Math.abs(x - XS) > 0.45);
  return (
    <group>
      {/* parede do fundo e faixa de azulejos atrás da bancada */}
      <Caixa p={[0, 1.8, Z_PAREDE - 0.1]} t={[14, 3.6, 0.2]} cor="#f7e3bb" raio={0.01} sombra={false} />
      <mesh position={[0, CY + 0.3, Z_PAREDE + 0.004]}><planeGeometry args={[14, 0.6]} /><meshStandardMaterial map={az} roughness={0.5} /></mesh>
      {/* piso */}
      <mesh position={[0, 0.001, 0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[14, 4]} /><meshStandardMaterial map={pi} roughness={0.7} /></mesh>
      {/* bancada: armários, tampo e rodapé */}
      {/* o corpo dos armários não passa pelo fogão (o nicho do forno fica aberto) */}
      <Caixa p={[(-7 + XS - 0.4) / 2, CY / 2 - 0.02, (Z_FRENTE + Z_PAREDE) / 2]} t={[7 + XS - 0.4, CY - 0.06, Z_FRENTE - Z_PAREDE - 0.02]} cor="#cf9650" raio={0.01} sombra={false} />
      <Caixa p={[(7 + XS + 0.4) / 2, CY / 2 - 0.02, (Z_FRENTE + Z_PAREDE) / 2]} t={[7 - XS - 0.4, CY - 0.06, Z_FRENTE - Z_PAREDE - 0.02]} cor="#cf9650" raio={0.01} sombra={false} />
      {portas.map((x) => (
        <group key={x}>
          <Caixa p={[x, 0.43, Z_FRENTE + 0.01]} t={[0.56, 0.7, 0.025]} cor="#e0ac66" raio={0.012} />
          <Caixa p={[x + 0.2, 0.7, Z_FRENTE + 0.03]} t={[0.02, 0.12, 0.02]} cor="#6a4726" raio={0.008} met={0.3} />
        </group>
      ))}
      <Caixa p={[0, 0.03, Z_FRENTE]} t={[14, 0.06, 0.05]} cor="#8b5e34" raio={0.008} sombra={false} />
      <Caixa p={[0, CY - 0.015, (Z_FRENTE + Z_PAREDE) / 2 + 0.03]} t={[14, 0.03, Z_FRENTE - Z_PAREDE + 0.06]} cor="#f1e5cd" raio={0.008} sombra />
      {/* prateleira com potes, no alto */}
      <Caixa p={[-1.7, 1.75, Z_PAREDE + 0.12]} t={[1.3, 0.035, 0.22]} cor="#a8743f" raio={0.01} />
      {[[-2.2, "#e4573d"], [-1.95, "#4f9d69"], [-1.7, "#f2c230"], [-1.45, "#6aa6d8"]].map(([x, c], i) => (
        <group key={i} position={[x as number, 1.77, Z_PAREDE + 0.12]}>
          <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.07, 0.07, 0.17, 14]} /><Mat cor={c as string} verniz={0.6} /></mesh>
          <mesh position={[0, 0.195, 0]}><cylinderGeometry args={[0.075, 0.075, 0.03, 14]} /><Mat cor="#f4f1ea" /></mesh>
        </group>
      ))}
    </group>
  );
};

/** Relógio de parede: o ponteiro grande dá `voltas` voltas por segundo de cena (`t`). */
export const RelogioParede: React.FC<{ p: V; t: number; voltas: number; escala?: number }> = ({ p, t, voltas, escala = 1 }) => {
  const a = -t * voltas * Math.PI * 2;
  return (
    <group position={p} scale={escala}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.34, 0.34, 0.06, 28]} /><Mat cor="#3b2c1f" /></mesh>
      <mesh position={[0, 0, 0.032]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 0.01, 28]} /><Mat cor="#fff8e6" rug={0.5} /></mesh>
      {Array.from({ length: 12 }).map((_, i) => {
        const b = (i / 12) * Math.PI * 2;
        return <mesh key={i} position={[Math.sin(b) * 0.25, Math.cos(b) * 0.25, 0.04]} rotation={[0, 0, -b]}><boxGeometry args={[0.025, i % 3 ? 0.04 : 0.07, 0.01]} /><meshBasicMaterial color="#3b2c1f" /></mesh>;
      })}
      <group position={[0, 0, 0.05]} rotation={[0, 0, a / 12]}><mesh position={[0, 0.07, 0]}><boxGeometry args={[0.03, 0.15, 0.012]} /><meshBasicMaterial color="#2a1f16" /></mesh></group>
      <group position={[0, 0, 0.06]} rotation={[0, 0, a]}><mesh position={[0, 0.1, 0]}><boxGeometry args={[0.02, 0.22, 0.012]} /><meshBasicMaterial color="#c0392b" /></mesh></group>
      <mesh position={[0, 0, 0.07]}><sphereGeometry args={[0.03, 10, 10]} /><meshBasicMaterial color="#2a1f16" /></mesh>
    </group>
  );
};

/* ---------- fogão: bocas em cima e o forno embaixo ---------- */

export const FOGAO_L = 0.8; // largura
export const BOCA_Y = CY + 0.012;

/** O fogão: corpo claro, tampo escuro com duas bocas, botões e o nicho do forno (vazio depois que a caixinha sai). `porta` 0..1: a porta do forno do fogão (só quando ele está vazio). */
export const Fogao: React.FC<{ fogo: number; t: number; vazio: number }> = ({ fogo, t, vazio }) => (
  <group position={[XS, 0, 0]}>
    {/* corpo: bloco de trás, duas colunas, a faixa de cima (botões) e a base; o nicho do forno fica aberto na frente */}
    <Caixa p={[0, (CY - 0.02) / 2, (-0.2 - 0.55) / 2]} t={[FOGAO_L, CY - 0.02, 0.35]} cor="#e9e3d6" raio={0.012} />
    {[-1, 1].map((sx) => <Caixa key={sx} p={[sx * 0.355, (CY - 0.02) / 2, (Z_FRENTE - 0.14) / 2]} t={[0.09, CY - 0.02, Z_FRENTE + 0.14]} cor="#e9e3d6" raio={0.012} />)}
    <Caixa p={[0, 0.77, (Z_FRENTE - 0.14) / 2]} t={[0.62, 0.22, Z_FRENTE + 0.14]} cor="#d6d0c3" raio={0.01} />
    <Caixa p={[0, 0.1, (Z_FRENTE - 0.14) / 2]} t={[0.62, 0.2, Z_FRENTE + 0.14]} cor="#d6d0c3" raio={0.01} />
    <mesh position={[0, 0.43, -0.199]}><planeGeometry args={[0.62, 0.46]} /><meshStandardMaterial color="#2a2c32" roughness={0.8} /></mesh>
    <Caixa p={[0, CY + 0.012 - 0.012, (Z_FRENTE - 0.55) / 2]} t={[FOGAO_L, 0.024, Z_FRENTE + 0.55]} cor="#3a3d44" raio={0.01} rug={0.35} />
    {[-0.24, -0.08, 0.08, 0.24].map((x) => (
      <mesh key={x} position={[x, 0.8, Z_FRENTE + 0.015]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.03, 14]} /><Mat cor="#2a2d33" met={0.3} /></mesh>
    ))}
    {/* bocas: anéis escuros; a da panela tem chama azul */}
    {[-0.2, 0.2].map((x) => (
      <group key={x} position={[x, BOCA_Y + 0.01, -0.12]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.09, 0.012, 8, 22]} /><Mat cor="#1d1f24" rug={0.5} /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.045, 0.008, 8, 18]} /><Mat cor="#1d1f24" rug={0.5} /></mesh>
      </group>
    ))}
    {fogo > 0.02 && (
      <group position={[-0.2, BOCA_Y + 0.02, -0.12]}>
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const f = 0.75 + 0.25 * Math.sin(t * 17 + i * 2.3);
          return (
            <mesh key={i} position={[Math.cos(a) * 0.085, 0.016 * f * fogo, Math.sin(a) * 0.085]} scale={[1, f * fogo, 1]}>
              <coneGeometry args={[0.011, 0.045, 6]} /><meshBasicMaterial color={i % 2 ? "#7ec8ff" : "#3a8dff"} />
            </mesh>
          );
        })}
      </group>
    )}
    {/* porta do forno do fogão, aberta para baixo, quando a caixinha já saiu */}
    {vazio > 0.02 && (
      <group position={[0, 0.2, Z_FRENTE + 0.02]} rotation={[1.5 * suave(vazio), 0, 0]}>
        <Caixa p={[0, 0.2, 0]} t={[0.64, 0.4, 0.025]} cor="#2b2e35" raio={0.012} rug={0.2} verniz={0.8} />
        <Caixa p={[0, 0.37, 0.03]} t={[0.5, 0.025, 0.025]} cor="#cfd3d8" raio={0.01} met={0.7} />
      </group>
    )}
  </group>
);

/* ---------- panela (sistema local: origem na base, raio 0,3) ---------- */

/** A panela vista em corte: casca de trás, óleo (com a face cortada para a câmera), borda e cabos. */
export const Panela: React.FC<{ k: number; t: number; bolhas: number; chia: number; escurece?: number }> = ({ k, t, bolhas, chia, escurece = 0 }) => {
  if (k <= 0.01) return null;
  const R = R_PANELA;
  const H = H_PANELA;
  const nivel = OLEO_Y;
  const corOleo = mistura("#f3a81f", "#8a4a10", escurece);
  return (
    <group scale={[k, k, k]}>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[R, R * 0.9, H, 28, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#9aa1ab" metalness={0.7} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}><circleGeometry args={[R * 0.9, 24, 0, Math.PI]} /><meshStandardMaterial color="#6d737d" metalness={0.6} roughness={0.45} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, nivel / 2 + 0.01, 0]}><cylinderGeometry args={[R * 0.95, R * 0.88, nivel, 24, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color={corOleo} roughness={0.2} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, nivel / 2 + 0.01, 0.002]}><planeGeometry args={[R * 1.88, nivel]} /><meshStandardMaterial color={corOleo} roughness={0.15} transparent opacity={0.72} /></mesh>
      <mesh position={[0, nivel + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[R * 0.95, 24, 0, Math.PI]} /><meshStandardMaterial color={mistura(corOleo, "#ffe08a", 0.35)} roughness={0.1} metalness={0.2} /></mesh>
      <mesh position={[0, H, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[R, 0.02, 8, 28, Math.PI]} /><meshStandardMaterial color="#c9cfd6" metalness={0.8} roughness={0.25} /></mesh>
      {[-1, 1].map((s) => <Caixa key={s} p={[s * (R + 0.1), H - 0.06, 0]} t={[0.22, 0.05, 0.07]} cor="#2a2d33" raio={0.02} />)}
      {chia > 0.02 && Array.from({ length: 10 }).map((_, i) => {
        const u = (t * (0.9 + rnd(i) * 0.6) + rnd(i + 20)) % 1;
        const x = (rnd(i + 5) - 0.5) * R * 1.4;
        return <mesh key={i} position={[x, nivel + 0.02, (rnd(i + 9) - 0.5) * 0.3 - 0.05]} scale={[1, 0.3, 1]}><sphereGeometry args={[0.025 * (0.5 + u) * chia, 8, 6]} /><meshBasicMaterial color="#fff0b8" transparent opacity={(1 - u) * 0.8} /></mesh>;
      })}
      {bolhas > 0.02 && Array.from({ length: 16 }).map((_, i) => {
        const u = (t * (0.8 + rnd(i + 40) * 0.8) + rnd(i + 70)) % 1;
        const x = (rnd(i + 11) - 0.5) * R * 1.3;
        const y = 0.04 + u * (nivel - 0.02);
        const r = (0.018 + 0.03 * u) * (0.6 + 0.4 * bolhas);
        return <mesh key={i} position={[x, y, -0.02 - rnd(i + 3) * 0.12]}><sphereGeometry args={[r, 8, 6]} /><meshStandardMaterial color="#fffbe6" transparent opacity={0.7 * bolhas * Math.min(1, u * 4)} roughness={0.2} /></mesh>;
      })}
    </group>
  );
};

/** Tampa: `k` 0 = erguida e inclinada ao lado, 1 = fechando a panela. */
export const Tampa: React.FC<{ k: number }> = ({ k }) => {
  const e = suave(k);
  const R = R_PANELA * 1.06;
  return (
    <group position={[(1 - e) * 0.9, H_PANELA + 0.012 + (1 - e) * 0.85, 0]} rotation={[0, 0, (1 - e) * 0.5]}>
      <mesh position={[0, -R / Math.sin(0.9) * Math.cos(0.9), 0]}>
        <sphereGeometry args={[R / Math.sin(0.9), 28, 10, 0, Math.PI * 2, 0, 0.9]} />
        <meshStandardMaterial color="#aab1ba" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, R / Math.sin(0.9) * (1 - Math.cos(0.9)) + 0.02, 0]}><sphereGeometry args={[0.04, 10, 8]} /><meshStandardMaterial color="#2a2d33" roughness={0.5} /></mesh>
    </group>
  );
};

const palito = (cor: string, i: number) => (
  <mesh key={i} position={[(i - 1) * 0.04, 0, (i - 1) * 0.01]} rotation={[0, 0.2 * i, 0]} castShadow>
    <boxGeometry args={[0.19, 0.03, 0.03]} />
    <Mat cor={cor} rug={0.35} verniz={0.4} />
  </mesh>
);

/** Os palitos de batata na panela (três feixes): caem, boiam no óleo, e depois o primeiro sobe pingando até o guardanapo. */
export const BatataNaPanela: React.FC<{ cai: number; saida: number; t: number; doura?: number }> = ({ cai, saida, t, doura = 0.1 }) => {
  const itens = [{ dx: 0, dz: 0.0, atraso: 0 }, { dx: -0.12, dz: -0.08, atraso: 0.45 }, { dx: 0.13, dz: -0.04, atraso: 0.8 }];
  const cor = corBatata(doura, 0, 0);
  const alvoX = NAP_LOCAL_X;
  const alvoY = 0.1;
  return (
    <group>
      {itens.map((it, i) => {
        const k = clamp01((cai - it.atraso * 0.5) / 0.5);
        if (k <= 0 || (i === 0 && saida > 0.995)) return null;
        const bob = Math.sin(t * 3.2 + i * 2) * 0.012;
        const alt = OLEO_Y - 0.01 + bob;
        let y = lerp(alt + 1.3, alt, k * k);
        let x = it.dx;
        let z = it.dz;
        let rz = 0.15 * i;
        if (i === 0 && saida > 0) {
          const s = saida;
          const sobe = suave(clamp01(s / 0.4));
          const vai = suave(clamp01((s - 0.4) / 0.4));
          const pousa = suave(clamp01((s - 0.8) / 0.2));
          y = lerp(lerp(alt, alt + 0.75, sobe), alvoY, pousa);
          x = lerp(0, alvoX, vai);
          z = lerp(0, 0.1, vai);
          rz = 0.5 * sobe;
        }
        return <group key={i} position={[x, y, z]} rotation={[0, 0.8 * i, rz]}>{[0, 1, 2].map((j) => palito(cor, j))}</group>;
      })}
      {saida > 0.05 && saida < 0.95 && Array.from({ length: 6 }).map((_, i) => {
        const s = saida;
        const sobe = suave(clamp01(s / 0.4));
        const vai = suave(clamp01((s - 0.4) / 0.4));
        const px = lerp(0, alvoX, vai);
        const py = lerp(OLEO_Y, OLEO_Y + 0.75, sobe);
        const u = (t * 1.5 + rnd(i)) % 1;
        const yy = py - 0.05 - u * Math.min(0.7, py - 0.02);
        if (yy < 0.02) return null;
        return <mesh key={i} position={[px + (rnd(i + 4) - 0.5) * 0.12, yy, 0.02]} scale={[0.7, 1.2, 0.7]}><sphereGeometry args={[0.022, 8, 6]} /><meshStandardMaterial color="#f3a81f" roughness={0.15} /></mesh>;
      })}
    </group>
  );
};

/** Respingos: gotas de óleo em arco, para os lados e para a câmera. `teto` = altura (local) em que a tampa os para. */
export const Respingos: React.FC<{ k: number; t: number; teto?: number }> = ({ k, t, teto }) => {
  if (k <= 0.02) return null;
  const n = Math.round(46 * k);
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const vy = 1.6 + rnd(i + 1) * 1.3;
        const vx = (rnd(i + 2) - 0.5) * 2.0;
        const vz = 0.15 + rnd(i + 3) * 1.6;
        const g = 5.0;
        const T = (2 * vy) / g;
        const u = (t * (0.7 + rnd(i + 4) * 0.5) + rnd(i + 5)) % 1;
        const tau = u * T;
        const x = (rnd(i + 6) - 0.5) * 0.35 + vx * tau;
        const y = OLEO_Y + vy * tau - 0.5 * g * tau * tau;
        const z = vz * tau;
        if (y < -0.05 || (teto !== undefined && y > teto)) return null;
        const r = 0.018 + rnd(i + 7) * 0.02;
        return <mesh key={i} position={[x, y, z]} scale={[1, 1.25, 1]}><sphereGeometry args={[r, 8, 6]} /><meshStandardMaterial color="#f3a81f" roughness={0.15} emissive="#a35a00" emissiveIntensity={0.25} /></mesh>;
      })}
    </group>
  );
};

/** Manchas de óleo na parede, no fogão e na bancada (mundo, escala real). */
export const Manchas: React.FC<{ k: number }> = ({ k }) => {
  if (k <= 0.02) return null;
  return (
    <group>
      {Array.from({ length: 28 }).map((_, i) => {
        const sobe = (k * 1.25 - rnd(i + 3) * 0.6) / 0.35;
        if (sobe <= 0) return null;
        const e = clamp01(sobe);
        const r = (0.012 + rnd(i + 6) * 0.03) * e;
        if (i % 3 === 0) {
          return <mesh key={i} position={[XS - 0.5 + rnd(i) * 0.8, CY + 0.1 + rnd(i + 1) * 0.55, Z_PAREDE + 0.006]} scale={[1, 1 + rnd(i + 8) * 0.8, 1]}><circleGeometry args={[r, 10]} /><meshBasicMaterial color="#d99a1c" transparent opacity={0.6} /></mesh>;
        }
        return <mesh key={i} position={[XS - 0.35 + rnd(i + 2) * 0.9, CY + 0.026 + (i % 2) * 0.0005, -0.45 + rnd(i + 4) * 0.62]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[r * 1.2, 10]} /><meshBasicMaterial color="#d99a1c" transparent opacity={0.65} /></mesh>;
      })}
    </group>
  );
};

/** Guardanapo na bancada; a mancha de óleo cresce e deixa o papel translúcido. */
export const Guardanapo: React.FC<{ k: number; mancha: number }> = ({ k, mancha }) => {
  if (k <= 0.02) return null;
  return (
    <group position={[NAPKIN_X, CY, -0.1]} scale={k}>
      <Caixa p={[0, 0.005, 0]} t={[0.34, 0.01, 0.24]} cor="#c75a3f" raio={0.004} />
      <Caixa p={[0, 0.013, 0]} t={[0.29, 0.008, 0.2]} cor="#ffffff" raio={0.003} rug={0.9} />
      <mesh position={[0, 0.0185, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[mancha, mancha * 0.8, 1]}><circleGeometry args={[0.09, 20]} /><meshBasicMaterial color="#e8a21c" transparent opacity={0.65 * clamp01(mancha * 1.3)} /></mesh>
      <mesh position={[0, 0.019, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[mancha * 0.55, mancha * 0.44, 1]}><circleGeometry args={[0.09, 20]} /><meshBasicMaterial color="#c97f0d" transparent opacity={0.55 * clamp01(mancha * 1.3)} /></mesh>
    </group>
  );
};

/* ---------- Zeca ---------- */

export type EstadoGente = [number, string, string?];
export type GenteDef = {
  id: string; x?: Valor; y?: Valor; z?: Valor; rot?: Valor; esc?: number; acao?: string | EstadoGente[]; exp?: Expressao3D;
  queima?: Valor; oleoBraco?: Valor; manchas?: Valor; braco?: "E" | "D"; segura?: "batata" | "palito" | "garfo"; pula?: number; olha?: V; incl?: Valor;
  corre?: boolean; segueFala?: boolean;
};

const PELE_VERMELHA = "#ff4a2e";

/** O braço nas mesmas juntas do Boneco3D, desenhado de novo por cima em vermelho (pele queimada) e com gotas de óleo. */
const BracoMarcado: React.FC<{ lado: 1 | -1; pose: Pose3D; queima: number; oleo: number; t: number; seguraBatata?: string }> = ({ lado, pose, queima, oleo, t, seguraBatata }) => {
  const k = lado > 0 ? "E" : "D";
  const g = (j: string) => pose[j] ?? 0;
  return (
    <group position={[lado * 0.205, 0.455, 0]} rotation={[g(`ombro${k}.x`), 0, g(`ombro${k}.z`)]}>
      <group position={[0, -0.27, 0]} rotation={[g(`cotovelo${k}.x`), 0, g(`cotovelo${k}.z`)]}>
        {queima > 0.01 && (
          <group>
            <mesh position={[0, -0.12, 0]} scale={[1, 1, 1]}><capsuleGeometry args={[0.053, 0.17, 5, 10]} /><meshStandardMaterial color={PELE_VERMELHA} roughness={0.5} transparent opacity={0.85 * queima} emissive="#ff2a10" emissiveIntensity={0.55 * queima} depthWrite={false} /></mesh>
            <mesh position={[0, -0.27, 0]}><sphereGeometry args={[0.075, 12, 10]} /><meshStandardMaterial color={PELE_VERMELHA} roughness={0.5} transparent opacity={0.9 * queima} emissive="#ff2a10" emissiveIntensity={0.7 * queima} depthWrite={false} /></mesh>
            <Halo p={[0, -0.27, 0.05]} r={0.28} cor="#ff4a2a" op={0.55 * queima * (0.75 + 0.25 * Math.sin(t * 12))} />
          </group>
        )}
        {oleo > 0.02 && Array.from({ length: 7 }).map((_, i) => {
          const u = ((t * 0.5 + rnd(i)) % 1);
          const y = -0.06 - rnd(i + 3) * 0.2 - u * 0.1 * oleo;
          return <mesh key={i} position={[(rnd(i + 8) - 0.5) * 0.07, y, 0.045]} scale={[0.8, 1.5 + u * oleo, 0.6]}><sphereGeometry args={[0.02 * Math.min(1, oleo * 1.5), 8, 6]} /><meshStandardMaterial color="#f3a81f" roughness={0.1} emissive="#a35a00" emissiveIntensity={0.3} /></mesh>;
        })}
        {seguraBatata === "garfo" && (
          <group position={[0, -0.3, 0.02]}>
            <mesh position={[0, -0.04, 0]}><boxGeometry args={[0.016, 0.16, 0.006]} /><meshStandardMaterial color="#cfd5dc" metalness={0.9} roughness={0.25} /></mesh>
            <mesh position={[0, -0.13, 0]}><boxGeometry args={[0.055, 0.02, 0.006]} /><meshStandardMaterial color="#cfd5dc" metalness={0.9} roughness={0.25} /></mesh>
            {[-0.022, -0.007, 0.007, 0.022].map((x) => <mesh key={x} position={[x, -0.17, 0]}><boxGeometry args={[0.006, 0.07, 0.006]} /><meshStandardMaterial color="#cfd5dc" metalness={0.9} roughness={0.25} /></mesh>)}
          </group>
        )}
        {seguraBatata && seguraBatata !== "garfo" && (
          <mesh position={[0, -0.3, 0.04]} rotation={[0.2, 0.3, 0.5]}>
            <boxGeometry args={seguraBatata === "palito" ? [0.03, 0.14, 0.03] : [0.08, 0.06, 0.06]} />
            <meshStandardMaterial color={corBatata(0.46)} roughness={0.5} />
          </mesh>
        )}
      </group>
    </group>
  );
};

export const Gente: React.FC<{ g: GenteDef; p: number; t: number; tAbs: number; fala?: number }> = ({ g, p, t, tAbs, fala = 0 }) => {
  const pers: Personagem3D = zeca;
  let acao = "em-pe";
  let exp: Expressao3D = g.exp ?? "neutro";
  if (typeof g.acao === "string") acao = g.acao;
  else if (Array.isArray(g.acao)) {
    const e = g.acao.find((x) => p <= x[0]) ?? g.acao[g.acao.length - 1];
    acao = e[1];
    if (e[2]) exp = e[2] as Expressao3D;
  }
  const pose = poseDe3D(acao, t);
  const x = valor(g.x, p, 0);
  const y = valor(g.y, p, 0) + (g.pula ? Math.abs(Math.sin(t * 5.5)) * g.pula : 0);
  const z = valor(g.z, p, 0);
  const rot = valor(g.rot, p, 0);
  const queima = valor(g.queima, p, 0);
  const oleo = valor(g.oleoBraco, p, 0);
  const manchas = valor(g.manchas, p, 0);
  const lado: 1 | -1 = (g.braco ?? "E") === "E" ? 1 : -1;
  const olhar: [number, number] = [0, 0];
  const poseF: Pose3D = { ...pose };
  poseF["tronco.x"] = (poseF["tronco.x"] ?? 0) + valor(g.incl, p, 0);
  if (g.olha) {
    // a cabeça vira para o ponto
    const dx = g.olha[0] - x;
    const dz = g.olha[2] - z;
    const yaw = Math.atan2(dx, dz) - rot;
    const ang = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    poseF["cabeca.y"] = (poseF["cabeca.y"] ?? 0) + Math.max(-1, Math.min(1, ang)) * 0.7;
    poseF["cabeca.x"] = (poseF["cabeca.x"] ?? 0) + Math.max(-0.5, Math.min(0.5, -Math.atan2(g.olha[1] - (y + 1.38), Math.hypot(dx, dz)) * 0.6));
  }
  const esc = g.esc ?? 1.06; // o Zeca tem ~1,7 m: a cozinha está em escala real
  const g0 = (j: string) => poseF[j] ?? 0;
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={esc}>
      <Boneco3D p={pers} pose={poseF} expressao={exp} pisca={piscar(tAbs + x)} boca={fala} olhar={olhar} t={tAbs} />
      {/* marcas por cima do boneco: braço vermelho, gotas de óleo na pele, respingos na camisa, batata na mão */}
      <group scale={1}>
        <group position={[0, 0.635 + g0("quadril.y"), 0]} rotation={[g0("quadril.x"), 0, 0]}>
          <group rotation={[g0("tronco.x"), g0("tronco.y"), g0("tronco.z")]}>
            {(queima > 0.01 || oleo > 0.02 || g.segura) && <BracoMarcado lado={lado} pose={poseF} queima={queima} oleo={oleo} t={tAbs} seguraBatata={g.segura} />}
            {manchas > 0.02 && [[-0.07, 0.34, 0.1], [0.05, 0.4, 0.105], [0.09, 0.27, 0.1], [-0.02, 0.22, 0.095], [-0.11, 0.44, 0.09]].map(([mx, my, mz], i) => {
              const e = clamp01(manchas * 1.4 - i * 0.2);
              return e > 0 ? <mesh key={i} position={[mx, my, mz]} scale={[e, e, 0.3]}><sphereGeometry args={[0.022 + (i % 3) * 0.008, 8, 6]} /><meshStandardMaterial color="#e29a14" roughness={0.3} /></mesh> : null;
            })}
          </group>
        </group>
      </group>
    </group>
  );
};

export { Liga };
