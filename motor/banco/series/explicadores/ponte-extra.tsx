import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { Caixa, rnd } from "../../../src/v3d/qualidade";
import { Liga, Texto3D } from "./cozinha-base";
import { mistura, V } from "./rasc";
import { Auto } from "./pista";

// Peças do episódio da ponte (23): machado e árvore cortada, estrada com trânsito, pilar armado em raio-X, junta de aço, solo com estacas.

export const YB = -4.2; // leito do rio
export const RT = 0.17; // topo da laje da estrada
export const AS = RT + 0.02; // topo do asfalto
export const HW = 2.0; // meia largura da laje
export const Z_CAL = 1.25; // centro da calçada
const LANE = [-1.3, -0.05]; // faixas (z): 0 = sentido -x, 1 = sentido +x

/* ---------- machado e árvore ---------- */

export const Machado: React.FC = () => (
  <group>
    <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[0.026, 0.03, 1.15, 8]} /><meshStandardMaterial color="#8a5a2e" roughness={0.8} /></mesh>
    <Caixa p={[0, -0.84, -0.04]} t={[0.07, 0.2, 0.16]} cor="#5b6670" raio={0.015} />
    <Caixa p={[0, -0.84, -0.15]} t={[0.025, 0.26, 0.07]} cor="#d9e2e8" raio={0.008} sombra={false} />
  </group>
);

const lerpPonto = (a: V, b: V, k: number): V => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** Árvore que o Zeca derruba a golpes de machado e que vira o tronco sobre o rio. `queda` 0..1 (0 = em pé); `golpes` = progressos dos golpes. */
export const ArvoreCorte: React.FC<{ queda: number; golpes: number[]; p: number; dur: number; qIni: number; qFim: number; rola: number; xb?: number }> = ({ queda, golpes, p, dur, qIni, qFim, rola, xb = -3.2 }) => {
  const YG = 0.15; // topo do gramado
  const q = clamp01(queda);
  const a = (Math.PI / 2) * Math.pow(q, 2.2);
  const feitos = golpes.filter((h) => p >= h).length;
  const ultimo = golpes.filter((h) => p >= h).pop();
  const tU = ultimo !== undefined ? (p - ultimo) * dur : 9;
  const treme = q < 0.001 ? 0.018 * Math.sin(tU * 34) * Math.exp(-tU * 5) : 0;
  const crown = 1 - suave(clamp01((q - 0.5) / 0.45));
  const tq = (p - qIni) * dur; // segundos desde o início da queda
  const durQ = Math.max((qFim - qIni) * dur, 0.3);
  const pouso = (p - qFim) * dur;
  const copa = (qq: number): V => {
    const aa = (Math.PI / 2) * Math.pow(clamp01(qq), 2.2);
    return [xb - 0.15 * Math.cos(aa) + 6.8 * Math.sin(aa), YG + 0.15 * Math.sin(aa) + 6.8 * Math.cos(aa), 0];
  };
  return (
    <group>
      {/* toco */}
      {q > 0.001 && (
        <group position={[xb - 0.15, YG, 0]}>
          <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.3, 0.33, 0.44, 12]} /><meshStandardMaterial color="#7a5230" roughness={1} /></mesh>
          <mesh position={[0, 0.442, 0]}><cylinderGeometry args={[0.285, 0.285, 0.01, 12]} /><meshStandardMaterial color="#e3c08a" roughness={1} /></mesh>
        </group>
      )}
      {/* árvore: gira em torno da base */}
      <group position={[xb, YG, 0]} rotation={[0, 0, -a + treme]}>
        <group position={[-0.15, 0, 0]}>
          <group position={[0, 0.0, 0]} rotation={[0, rola, 0]}>
            <mesh position={[0, 3.2 + (q > 0.001 ? 0.44 : 0), 0]}><cylinderGeometry args={[0.3, 0.32, 6.4 - (q > 0.001 ? 0.88 : 0), 12]} /><meshStandardMaterial color="#8a5a34" roughness={1} /></mesh>
            {[0.6, 2.4, 4.2].map((y, i) => <mesh key={i} position={[0.29, y, 0.05]} scale={[0.1, 0.05, 0.1]}><sphereGeometry args={[1, 6, 4]} /><meshStandardMaterial color="#4a3220" /></mesh>)}
            {/* faixa clara do corte */}
            {feitos > 0 && q < 0.001 && <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.322, 0.33, 0.1 + 0.07 * feitos, 12]} /><meshStandardMaterial color="#ecd3a6" roughness={1} /></mesh>}
          </group>
          {crown > 0.01 && (
            <group position={[0, 6.4, 0]} scale={crown}>
              {([[0, 0.7, 0, 1.25], [0.5, 1.5, 0.2, 1.0], [-0.5, 1.4, -0.1, 0.9], [0, 2.2, 0, 0.75]] as [number, number, number, number][]).map(([x, y, z, r], i) => (
                <mesh key={i} position={[x, y, z]}><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color={i % 2 ? "#3f8a3c" : "#4d9a43"} roughness={1} flatShading /></mesh>
              ))}
            </group>
          )}
        </group>
      </group>
      {/* folhas que voam durante a queda */}
      {tq > 0 && Array.from({ length: 18 }).map((_, i) => {
        const e = 0.25 + 0.65 * rnd(i + 1);
        const tau = tq - e * durQ;
        if (tau < 0 || tau > 2.6) return null;
        const o = copa(e);
        const vx = (rnd(i + 20) - 0.3) * 2.2;
        const vz = (rnd(i + 40) - 0.5) * 3.0;
        const y = Math.max(YG + 0.05, o[1] + 1.2 * tau - 3.2 * tau * tau * (0.4 + 0.3 * rnd(i + 60)) - 0.5 * tau);
        const fim = y <= YG + 0.06 ? suave(clamp01((tau - 1.6) / 0.9)) : 0;
        return <mesh key={i} position={[o[0] + vx * tau, y, o[2] + vz * tau * 0.5]} rotation={[tau * 3 + i, tau * 2, 0]} scale={0.1 * (1 - fim)}><boxGeometry args={[1, 0.18, 0.7]} /><meshStandardMaterial color={i % 3 ? "#5aa84a" : "#3f8a3c"} roughness={1} /></mesh>;
      })}
      {/* lascas de madeira a cada golpe */}
      {golpes.map((h, gi) => {
        const th = (p - h) * dur;
        if (th < 0 || th > 0.8) return null;
        return Array.from({ length: 8 }).map((_, i) => {
          const s = gi * 11 + i;
          const v: V = [-(1.2 + 2.0 * rnd(s + 1)), 2.0 + 2.4 * rnd(s + 2), (rnd(s + 3) - 0.5) * 3.0];
          const o: V = [xb - 0.15 - 0.33, YG + 0.75, 0];
          return <mesh key={`${gi}${i}`} position={[o[0] + v[0] * th, Math.max(YG + 0.03, o[1] + v[1] * th - 6 * th * th), o[2] + v[2] * th]} rotation={[th * 9 + i, th * 7, th * 5]} scale={0.085 * (1 - th / 0.9)}><boxGeometry args={[1, 0.35, 0.6]} /><meshStandardMaterial color="#e9cb98" roughness={1} /></mesh>;
        });
      })}
      {/* poeira do pouso */}
      {pouso > 0 && pouso < 0.9 && Array.from({ length: 10 }).map((_, i) => {
        const aa = (i / 10) * Math.PI * 2;
        const u = pouso / 0.9;
        return <mesh key={i} position={[xb + 1.2 + Math.cos(aa) * 0.9 * u * 2.2, YG + 0.1 + 0.4 * Math.sin(u * Math.PI), Math.sin(aa) * 0.9 * u * 2.2]} scale={0.22 * (1 - u * 0.6)}><sphereGeometry args={[1, 7, 6]} /><meshBasicMaterial color="#e4d6b8" transparent opacity={0.6 * (1 - u)} /></mesh>;
      })}
    </group>
  );
};

/* ---------- estrada e trânsito ---------- */

const traco = (n: number, x0: number, x1: number): number[] => Array.from({ length: n }, (_, i) => x0 + ((i + 0.5) * (x1 - x0)) / n);

/** Laje da estrada (vão e cabeceiras): asfalto, tracejado e calçada. Faces separadas por 1 a 2 cm (nada coplanar). */
export const Estrada: React.FC<{ meia: number; vao: boolean; cabeceiras: boolean }> = ({ meia, vao, cabeceiras }) => {
  const trechos: [number, number][] = [];
  if (vao) trechos.push([-meia - 0.2, meia + 0.2]);
  if (cabeceiras) { trechos.push([-meia - 6.6, -meia - 0.2]); trechos.push([meia + 0.2, meia + 6.6]); }
  return (
    <group>
      {trechos.map(([x0, x1], k) => {
        const len = x1 - x0;
        const cx = (x0 + x1) / 2;
        const nd = Math.max(2, Math.round(len / 1.6));
        return (
          <group key={k}>
            <Caixa p={[cx, RT - 0.15, 0]} t={[len, 0.3, 2 * HW]} cor="#a7a39a" raio={0.02} />
            <mesh position={[cx, RT + 0.008, -0.75]}><boxGeometry args={[len, 0.024, 2.4]} /><meshStandardMaterial color="#3b3f45" roughness={0.95} /></mesh>
            <mesh position={[cx, RT + 0.05, Z_CAL]}><boxGeometry args={[len, 0.1, 1.5]} /><meshStandardMaterial color="#cfcabd" roughness={1} /></mesh>
            {traco(nd, x0, x1).map((x, i) => <mesh key={i} position={[x, RT + 0.026, -0.675]}><boxGeometry args={[0.7, 0.012, 0.07]} /><meshStandardMaterial color="#f3f0e6" /></mesh>)}
          </group>
        );
      })}
    </group>
  );
};

export const Roda: React.FC<{ p: V; r: number; w: number; giro: number }> = ({ p, r, w, giro }) => (
  <group position={p}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[r, r, w, 14]} /><meshStandardMaterial color="#222" roughness={0.8} /></mesh>
    {[1, -1].map((s) => (
      <group key={s} position={[0, 0, s * (w / 2 + 0.006)]} rotation={[0, 0, giro]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[r * 0.52, r * 0.52, 0.012, 12]} /><meshStandardMaterial color="#c9d0d6" /></mesh>
        {[0, 1, 2].map((i) => <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]} position={[0, 0, 0.012]}><boxGeometry args={[r * 1.0, r * 0.14, 0.01]} /><meshStandardMaterial color="#5b6670" /></mesh>)}
      </group>
    ))}
  </group>
);

/** Furgão da pizzaria (frente em -x). */
export const Furgao: React.FC<{ x: number; y: number; rot?: number; giro?: number; ry?: number }> = ({ x, y, rot = 0, giro = 0, ry = 0 }) => (
  <group position={[x, y, 0.0]} rotation={[0, ry, rot]}>
    <Caixa p={[0.35, 0.78, 0]} t={[1.6, 1.15, 1.0]} cor="#f4f1ea" raio={0.06} rug={0.6} />
    <Caixa p={[-0.8, 0.62, 0]} t={[0.85, 0.85, 1.0]} cor="#e5473a" raio={0.07} rug={0.6} />
    <Caixa p={[-0.98, 0.92, 0.0]} t={[0.5, 0.35, 1.02]} cor="#bfe9ff" raio={0.02} sombra={false} />
    <Caixa p={[0.35, 0.5, 0.0]} t={[1.62, 0.18, 1.02]} cor="#e5473a" raio={0.02} sombra={false} />
    <Texto3D texto="PIZZA" p={[0.35, 0.95, 0.56]} h={0.32} cor="#e5473a" />
    {[-0.85, 0.75].map((wx, i) => [-0.5, 0.5].map((wz, j) => <Roda key={`${i}${j}`} p={[wx, 0.24, wz]} r={0.24} w={0.16} giro={giro} />))}
    <Caixa p={[0.35, 1.45, 0]} t={[0.7, 0.18, 0.4]} cor="#ffd23f" raio={0.04} sombra={false} />
  </group>
);

/** Caminhão baú (frente em -x), mais comprido que o furgão. */
export const Carreta: React.FC<{ cor: string; giro?: number }> = ({ cor, giro = 0 }) => (
  <group>
    <Caixa p={[-1.5, 0.75, 0]} t={[1.0, 1.2, 1.0]} cor={cor} raio={0.07} rug={0.6} />
    <Caixa p={[-1.72, 1.05, 0]} t={[0.5, 0.4, 1.02]} cor="#bfe9ff" raio={0.02} sombra={false} />
    <Caixa p={[0.5, 1.0, 0]} t={[3.2, 1.7, 1.04]} cor="#eef1f4" raio={0.06} rug={0.6} />
    <Caixa p={[0.5, 0.3, 0]} t={[3.2, 0.2, 1.0]} cor="#4b535c" raio={0.02} sombra={false} />
    <Caixa p={[0.5, 1.0, 0]} t={[3.22, 0.2, 1.06]} cor={cor} raio={0.02} sombra={false} />
    {[-1.5, 0.1, 1.0].map((wx, i) => [-0.5, 0.5].map((wz, j) => <Roda key={`${i}${j}`} p={[wx, 0.24, wz]} r={0.24} w={0.16} giro={giro} />))}
  </group>
);

type Veic = { tipo: "sedan" | "hatch" | "furgao" | "carreta"; cor: string; faixa: 0 | 1; off: number; v: number };
const FROTA: Veic[] = [
  { tipo: "sedan", cor: "#d6392e", faixa: 0, off: 0.02, v: 3.0 },
  { tipo: "carreta", cor: "#2f6fb5", faixa: 0, off: 0.36, v: 2.0 },
  { tipo: "hatch", cor: "#f4b73a", faixa: 0, off: 0.7, v: 3.6 },
  { tipo: "furgao", cor: "#e5473a", faixa: 1, off: 0.1, v: 2.6 },
  { tipo: "sedan", cor: "#3b82c4", faixa: 1, off: 0.46, v: 3.3 },
  { tipo: "hatch", cor: "#37c26a", faixa: 1, off: 0.8, v: 2.8 },
];
const ESC_AUTO = 0.55;

export const Veiculo: React.FC<{ tipo: Veic["tipo"]; cor: string; dist: number; sentido: 1 | -1; x: number; z: number; y: number; esc?: number }> = ({ tipo, cor, dist, sentido, x, z, y, esc = 1 }) => {
  const ry = sentido > 0 ? Math.PI : 0; // furgão e caminhão têm a frente em -x
  const g = dist / 0.24;
  return (
    <group position={[x, y, z]} scale={esc}>
      {tipo === "carreta" && <group rotation={[0, ry, 0]}><Carreta cor={cor} giro={g} /></group>}
      {tipo === "furgao" && <Furgao x={0} y={0} ry={ry} giro={g} />}
      {(tipo === "sedan" || tipo === "hatch") && <group rotation={[0, sentido > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} scale={ESC_AUTO}><Auto cor={cor} variante={tipo} giro={dist / (0.33 * ESC_AUTO)} /></group>}
    </group>
  );
};

/** Trânsito contínuo nas duas faixas: cada veículo anda em círculo (entra por uma cabeceira e sai pela outra, aparecendo e sumindo de pequeno). */
export const Transito: React.FC<{ k: number; meia: number; t: number }> = ({ k, meia, t }) => {
  if (k < 0.02) return null;
  const X1 = meia + 6.4;
  const L = 2 * X1;
  return (
    <group>
      {FROTA.map((v, i) => {
        const run = (v.off * L + v.v * t) % L;
        const sentido: 1 | -1 = v.faixa === 1 ? 1 : -1;
        const x = sentido > 0 ? -X1 + run : X1 - run;
        const presenca = clamp01(Math.min(run, L - run) / 1.6) * clamp01(k);
        if (presenca < 0.02) return null;
        return <Veiculo key={i} tipo={v.tipo} cor={v.cor} dist={v.v * t} sentido={sentido} x={x} z={LANE[v.faixa]} y={AS + 0.005} esc={suave(presenca)} />;
      })}
    </group>
  );
};

/** Um caminhão que atravessa a estrada com a câmera atrás dele (travelling): x vai de `de` a `para` no progresso da batida. */
export const Heroi: React.FC<{ x: number; x0: number }> = ({ x, x0 }) => <Veiculo tipo="carreta" cor="#e5473a" dist={x - x0} sentido={1} x={x} z={LANE[1]} y={AS + 0.005} />;

/* ---------- pilar armado (raio-X) ---------- */

const Contorno: React.FC<{ p: V; t: V; cor?: string }> = ({ p, t, cor = "#e8f2f9" }) => {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(t[0], t[1], t[2])), [t[0], t[1], t[2]]);
  return <lineSegments position={p} geometry={geo}><lineBasicMaterial color={cor} /></lineSegments>;
};

const Concreto: React.FC<{ p: V; t: V; cor: string; raiox: number }> = ({ p, t, cor, raiox }) => (
  <>
    <mesh position={p} castShadow>
      <boxGeometry args={t} />
      <meshStandardMaterial color={mistura(cor, "#a8c4d8", raiox * 0.55)} roughness={0.9} transparent opacity={1 - 0.86 * raiox} depthWrite={raiox < 0.3} />
    </mesh>
    {raiox > 0.02 && <Contorno p={p} t={t} />}
  </>
);

/** Pilar de concreto armado sobre a sapata. Origem no topo do leito. `k` = altura da coluna (0..1); topo final em y = -1,0 do mundo (abaixo da treliça). */
export const PilarArmado: React.FC<{ k: number; raiox: number }> = ({ k, raiox }) => {
  const HC = 2.72;
  const top = 0.3 + HC * k;
  const X = [-0.28, 0.28];
  const Zs = [-0.6, -0.2, 0.2, 0.6];
  const nEst = Math.max(0, Math.floor((top - 0.15) / 0.42));
  return (
    <group>
      <Concreto p={[0, 0.05, 0]} t={[1.8, 0.5, 2.3]} cor="#aaa397" raiox={raiox} />
      <Concreto p={[0, (0.28 + top) / 2, 0]} t={[0.8, top - 0.28, 1.5]} cor="#e2dccf" raiox={raiox} />
      <Concreto p={[0, top + 0.09 - 0.01, 0]} t={[1.2, 0.18, 1.7]} cor="#aaa397" raiox={raiox} />
      {raiox > 0.02 && (
        <group>
          {/* barras longitudinais: dentro da coluna, do fundo da sapata ao capitel */}
          {X.flatMap((x) => Zs.map((z) => <Liga key={`${x}${z}`} a={[x, -0.14, z]} b={[x, top + 0.1, z]} w={0.05} cil cor="#e0883a" basico />))}
          {/* pés das barras de espera: dobram para dentro da sapata */}
          {X.flatMap((x) => [-0.6, 0.6].map((z) => <Liga key={`p${x}${z}`} a={[x, -0.14, z]} b={[x + Math.sign(x) * 0.36, -0.14, z]} w={0.05} cil cor="#e0883a" basico />))}
          {/* estribos */}
          {Array.from({ length: nEst }).map((_, j) => {
            const y = 0.15 + j * 0.42;
            const c: V[] = [[-0.33, y, -0.66], [0.33, y, -0.66], [0.33, y, 0.66], [-0.33, y, 0.66]];
            return c.map((a, i) => <Liga key={`${j}${i}`} a={a} b={c[(i + 1) % 4]} w={0.03} cil cor="#ffd23f" basico />);
          })}
          {/* malha da sapata */}
          {[-0.7, -0.35, 0, 0.35, 0.7].map((x) => <Liga key={`mx${x}`} a={[x, -0.1, -1.0]} b={[x, -0.1, 1.0]} w={0.035} cil cor="#e0883a" basico />)}
          {[-0.9, -0.45, 0, 0.45, 0.9].map((z) => <Liga key={`mz${z}`} a={[-0.78, -0.04, z]} b={[0.78, -0.04, z]} w={0.035} cil cor="#e0883a" basico />)}
        </group>
      )}
    </group>
  );
};

/* ---------- junta de dilatação de aço (dedos) ---------- */

const ACO = "#4b535c";

/** Junta de dedos de aço: duas placas com dedos entrelaçados, parafusadas em perfis ancorados nos dois lados do vão. `calor` -1 (frio, vão aberto) .. 1 (quente, vão fechado). */
export const JuntaAco: React.FC<{ k: number; calor: number; t: number }> = ({ k, calor }) => {
  if (k < 0.02) return null;
  const D = lerp(1.7, 1.02, clamp01((calor + 1) / 2)); // distância entre as bordas das placas
  const cor = calor >= 0 ? mistura(ACO, "#a04a62", calor * 0.55) : mistura(ACO, "#3a5fa8", -calor * 0.55);
  const claro = mistura("#8d98a2", calor >= 0 ? "#d98aa0" : "#7fa0e0", Math.abs(calor) * 0.5);
  const NS = 9;
  const W = 2.7;
  const sw = W / NS;
  const zs = (j: number) => -W / 2 + (j + 0.5) * sw;
  const Lf = 0.9;
  const Bp = 0.7; // largura da base da placa
  const lado = (s: 1 | -1) => {
    const edge = s * (D / 2); // borda da placa deste lado (voltada para o vão)
    const dedos = Array.from({ length: NS }).map((_, j) => j).filter((j) => (s > 0 ? j % 2 === 1 : j % 2 === 0));
    return (
      <group key={s}>
        {/* laje de concreto e asfalto */}
        <Caixa p={[edge + s * (Bp + 1.6) , -0.3, 0]} t={[3.2 + Bp * 2, 0.6, W + 0.3]} cor="#a7a39a" raio={0.02} rug={1} />
        <mesh position={[edge + s * (Bp + 1.8), 0.012, 0]}><boxGeometry args={[3.6 - 0.0, 0.024, W + 0.26]} /><meshStandardMaterial color="#3b3f45" roughness={0.95} /></mesh>
        {/* perfil de borda de aço, ancorado no concreto */}
        <Caixa p={[edge + s * 0.04, -0.2, 0]} t={[0.14, 0.34, W + 0.1]} cor={ACO} raio={0.02} rug={0.4} met={0.6} />
        {/* placa-base de aço com os parafusos */}
        <Caixa p={[edge + s * (Bp / 2 + 0.1), 0.03, 0]} t={[Bp, 0.1, W]} cor={cor} raio={0.025} rug={0.45} met={0.6} />
        {[0.2, 0.55].flatMap((dx) => Array.from({ length: NS }).map((_, j) => (
          <mesh key={`${dx}${j}`} position={[edge + s * (0.1 + dx), 0.1, zs(j)]} rotation={[0, 0.3, 0]}><cylinderGeometry args={[0.04, 0.04, 0.035, 6]} /><meshStandardMaterial color={claro} metalness={0.7} roughness={0.35} /></mesh>
        )))}
        {/* dedos: chanfro na ponta */}
        {dedos.map((j) => {
          const x0 = edge - s * 0.0;
          const ponta = x0 - s * Lf;
          return (
            <group key={j}>
              <Caixa p={[(x0 + ponta) / 2 + s * 0.0, 0.03, zs(j)]} t={[Lf, 0.1, sw * 0.82]} cor={cor} raio={0.03} rug={0.45} met={0.6} />
              <Caixa p={[ponta + s * 0.1, 0.03, zs(j)]} t={[0.2, 0.1, sw * 0.5]} cor={cor} raio={0.04} rug={0.45} met={0.6} />
            </group>
          );
        })}
      </group>
    );
  };
  return (
    <group scale={suave(k)} position={[0, 0.4, 0]}>
      {lado(-1)}
      {lado(1)}
      {/* calha escura sob os dedos */}
      <mesh position={[0, -0.28, 0]}><boxGeometry args={[D + 0.9, 0.12, W + 0.05]} /><meshStandardMaterial color="#14181d" roughness={1} /></mesh>
    </group>
  );
};

/* ---------- solo, estacas e bate-estaca (corte do leito) ---------- */

export const SOLO = { areiaFundo: -5.6, argilaFundo: -6.9, rochaFundo: -8.6 };

const bumpCava = (d: number) => (d < 0.9 ? 0.4 : d < 1.5 ? 1 : d < 2.5 ? 1 - (d - 1.5) : 0);

export const Solo: React.FC<{ k: number; meia: number; cava: number; raiox: number; sitios: number[]; agua: string }> = ({ k, meia, cava, raiox, sitios, agua }) => {
  const N = Math.round((2 * meia) / 0.2);
  const op = 1 - 0.62 * raiox;
  const dw = raiox < 0.3;
  const prof = (x: number) => 1.3 * cava * Math.max(...sitios.map((s0) => bumpCava(Math.abs(x - s0))));
  const chave = `${meia}|${cava.toFixed(3)}|${sitios.join(",")}`;
  // areia: UM prisma só (perfil extrudado), sem faces internas coplanares (nada de listras em raio-X)
  const geoAreia = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-meia, SOLO.areiaFundo);
    sh.lineTo(meia, SOLO.areiaFundo);
    for (let i = N; i >= 0; i--) { const x = -meia + (i * 2 * meia) / N; sh.lineTo(x, YB - prof(x)); }
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 4.8, bevelEnabled: false });
    g.translate(0, 0, -2.4);
    return g;
  }, [chave]);
  const geoAgua = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-meia, YB + 0.03);
    sh.lineTo(meia, YB + 0.03);
    for (let i = N; i >= 0; i--) { const x = -meia + (i * 2 * meia) / N; sh.lineTo(x, Math.min(YB + 0.02, YB - prof(x))); }
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 4.6, bevelEnabled: false });
    g.translate(0, 0, -2.3);
    return g;
  }, [chave]);
  if (k < 0.02) return null;
  const e = 0.012;
  return (
    <group>
      <mesh geometry={geoAreia}><meshStandardMaterial color="#e2c98f" roughness={1} transparent opacity={op} depthWrite={dw} /></mesh>
      {cava > 0.02 && <mesh geometry={geoAgua}><meshStandardMaterial color={agua} roughness={0.2} transparent opacity={0.55} depthWrite={false} /></mesh>}
      <mesh position={[0, (SOLO.areiaFundo - e + SOLO.argilaFundo) / 2, 0]}><boxGeometry args={[2 * meia, SOLO.areiaFundo - e - SOLO.argilaFundo, 4.8]} /><meshStandardMaterial color="#b5774f" roughness={1} transparent opacity={op} depthWrite={dw} /></mesh>
      <mesh position={[0, (SOLO.argilaFundo - e + SOLO.rochaFundo) / 2, 0]}><boxGeometry args={[2 * meia, SOLO.argilaFundo - e - SOLO.rochaFundo, 4.8]} /><meshStandardMaterial color="#7c848c" roughness={1} transparent opacity={op} depthWrite={dw} /></mesh>
      {Array.from({ length: 9 }).map((_, i) => <mesh key={i} position={[-meia + 1 + i * (2 * meia - 2) / 8, SOLO.argilaFundo - 0.55 - 0.4 * rnd(i + 5), 2.41]} scale={[0.5 + 0.4 * rnd(i), 0.07, 0.01]} rotation={[0, 0, 0.3 * (rnd(i + 9) - 0.5)]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#5a6169" /></mesh>)}
    </group>
  );
};

export const PY_TOPO = YB + 0.05; // topo da estaca (dentro do bloco de coroamento)
export const PY_PONTA = -7.4; // ponta da estaca (0,5 m dentro da rocha)
const COMP = PY_TOPO - PY_PONTA;

/** Estaca de concreto armado (cilindro com barras e estribos em espiral). `y` = topo. */
const Estaca: React.FC<{ x: number; z: number; y: number; raiox: number }> = ({ x, z, y, raiox }) => {
  const cy = y - COMP / 2;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, cy, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, COMP, 12]} /><meshStandardMaterial color={mistura("#b9bcbc", "#a8c4d8", raiox * 0.5)} roughness={0.9} transparent opacity={1 - 0.5 * raiox} depthWrite={raiox < 0.3} /></mesh>
      {raiox > 0.02 && (
        <group>
          {[0, 1, 2, 3].map((i) => { const a = (i / 4) * Math.PI * 2 + 0.4; return <Liga key={i} a={[Math.cos(a) * 0.13, y - 0.05, Math.sin(a) * 0.13]} b={[Math.cos(a) * 0.13, y - COMP + 0.1, Math.sin(a) * 0.13]} w={0.03} cil cor="#e0883a" basico />; })}
          {Array.from({ length: 7 }).map((_, j) => <mesh key={j} position={[0, y - 0.3 - j * (COMP - 0.6) / 6, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.15, 0.012, 5, 14]} /><meshStandardMaterial color="#ffd23f" /></mesh>)}
        </group>
      )}
    </group>
  );
};

const POS_ESTACAS: [number, number][] = [[-0.55, -0.45], [0.55, -0.45], [-0.55, 0.45], [0.55, 0.45]];
const NSTROKES = 6;

/** Um sítio de fundação com estacas. Origem em (x do sítio, 0, 0) no mundo. `estacas` 0..1 (cravação), `bloco` 0..1 (coroamento desce e a coluna sobe), `rio` y da água. */
export const Fundacao: React.FC<{ estacas: number; bloco: number; raiox: number; rio: number; saiMaq: number }> = ({ estacas, bloco, raiox, rio, saiMaq }) => {
  const e = clamp01(estacas);
  const por = POS_ESTACAS.map((_, j) => clamp01(e * 4 - j));
  const cur = Math.min(3, Math.floor(e * 4 - 0.0001));
  const yIni = rio + 1.9;
  const topoDe = (u: number) => {
    const s = u * NSTROKES;
    const i = Math.floor(Math.min(s, NSTROKES - 0.0001));
    const f = s - i;
    const d = (i + suave(clamp01(f / 0.22))) / NSTROKES;
    return lerp(yIni, PY_TOPO, u >= 1 ? 1 : d);
  };
  const uc = por[Math.max(0, cur)];
  const sc = uc * NSTROKES;
  const fc = sc - Math.floor(Math.min(sc, NSTROKES - 0.0001));
  const hLift = fc < 0.22 ? 0 : fc < 0.85 ? 0.9 * suave((fc - 0.22) / 0.63) : 0.9 * (1 - suave((fc - 0.85) / 0.15));
  const topoAtual = topoDe(uc);
  const ci = Math.max(0, cur);
  const fr = e * 4 - ci;
  const nx = POS_ESTACAS[Math.min(3, ci + 1)];
  const kk = suave(clamp01((fr - 0.8) / 0.2));
  const xMaq = lerp(POS_ESTACAS[ci][0], nx[0], kk);
  const zMaq = lerp(POS_ESTACAS[ci][1], nx[1], kk);
  const maqOn = e > 0.001 && e < 1.001 && saiMaq < 0.98;
  const bk = clamp01(bloco / 0.4);
  const col = clamp01((bloco - 0.4) / 0.6);
  return (
    <group>
      {POS_ESTACAS.map(([x, z], j) => (por[j] > 0.001 ? <Estaca key={j} x={x} z={z} y={topoDe(por[j])} raiox={raiox} /> : null))}
      {maqOn && (
        <group position={[saiMaq * 5, 0, 0]}>
          {/* balsa */}
          <Caixa p={[0, rio - 0.05, 0]} t={[3.4, 0.4, 2.0]} cor="#8a6a46" raio={0.04} />
          <Caixa p={[-1.2, rio + 0.3, 0.2]} t={[0.7, 0.6, 0.8]} cor="#e5a23a" raio={0.05} />
          {/* torre-guia */}
          <group position={[xMaq, 0, zMaq]}>
            {[-0.15, 0.15].map((dz) => <Liga key={dz} a={[0, rio + 0.15, dz]} b={[0, rio + 3.6, dz]} w={0.07} cil cor="#3b82c4" />)}
            <Liga a={[0, rio + 3.6, -0.15]} b={[0, rio + 3.6, 0.15]} w={0.08} cil cor="#3b82c4" />
            <Liga a={[0, rio + 3.6, 0]} b={[-1.1, rio + 0.3, 0.2]} w={0.03} cil cor="#2b2f36" basico />
            {/* martelo (pilão) entre as guias, cabo até o topo */}
            <Caixa p={[0, topoAtual + 0.35 + hLift, 0]} t={[0.5, 0.5, 0.3]} cor="#5b6670" raio={0.04} />
            <Liga a={[0, topoAtual + 0.6 + hLift, 0]} b={[0, rio + 3.6, 0]} w={0.02} cil cor="#2b2f36" basico />
          </group>
        </group>
      )}
      {bk > 0.001 && (
        <group position={[0, YB + (1 - suave(bk)) * 1.6, 0]}>
          <PilarArmado k={col} raiox={raiox * 0.2} />
        </group>
      )}
    </group>
  );
};
