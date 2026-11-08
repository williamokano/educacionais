import React from "react";
import * as THREE from "three";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Anterior, poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Expressao3D, Personagem3D, Pose3D } from "../../../src/v3d/tipos";
import { Etiqueta, Fumaca, Halo, Liga, Seta, Texto3D } from "./cozinha-base";
import { Ctx, Dome, EtiqDef, V, mkCtx, mistura, nv } from "./rasc";
import { homemA, homemB, homemC, mulher } from "./fieis";
import { zeca } from "./zeca";

// Farol (episódio 25 v2, "como a luz de uma torre chega a um navio a 30 quilômetros?"). Dois palcos:
//   palco "costa" (x = 0): noite sem lua; mar em y = 0; barco do Zeca em (-3, 0, 3); pedra em (3, 0, -1); praia e luau ao fundo (z = -14); torre em (6, 0, -13) com a lanterna em y ≈ 12;
//     segundo barco em (16, 0, 2); navio de aço ao fundo (batida 14).
//   palco "lanterna" (x = 60): corte lateral da lanterna: chama em (0, 0,6), espelho curvo atrás (x < 0), lente na frente (x = 1,9), raios para +x; piso em y = 0; escada em caracol abaixo (y -7..0).
// REGRA: o nome "farol" só aparece a partir da batida 13 (fala e cartão).
// Campos (número, { de, para, ini, fim } ou chaves [[progresso, valor], ...]):
//   costa    noite · luau 0..1 · fogoY (0..1, a fogueira sobe pela torre) · torre 0..1 (a torre de pedra) · lanternaTopo 0..1 (lanterna acesa no alto) · gira (rad, direção do feixe; integra) · feixe 0..1 · onda 0..1 (a onda que esconde o luau)
//            barco2 0..1 · gps 0..1 (tela do GPS acesa) · neblina 0..1 · som 0..1 (ondas do sino) · sino 0..1 · torres 0..1 (outros faróis ao fundo: padrões) · setor 0..1 (setor vermelho e branco) · navio 0..1 (navio de aço) · interroga 0..1
//            luauPose: "danca" | "acena" · vizinhoTapa 0..1 · barcoX (x do barco do Zeca) · carta 0..1 (carta náutica na mão do Zeca)
//   lanterna chama 0..1 · treme 0..1 · lenha 0..1 · fumaca 0..1 · lamparina 0..1 · espelho 0..1 · lente 0..1 · aneis 0..1 · raios 0..3 (0 nenhum, 1 radial, 2 espelho, 3 lente) · feixeLongo 0..1 · peso 0..1 (lente maciça pesada, o chão estala)
//            giraL (rad/s, giro das peças; integra) · mercurio 0..1 · dedo 0..1 · motor 0..1 · escada 0..1 · solar 0..1 · led 0..1 · horas 0..1 (contador)
//   gente    lista de { x, y, z, rot, acao, exp, pose, incl, esc, quem: "zeca" | "a" | "b" | "c" | "m" } · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax

const PALCO_X: Record<string, number> = { costa: 0, lanterna: 60 };
const TX = 6;
const TZ = -13;
const TH = 11;

type GenteE = { x?: unknown; y?: unknown; z?: unknown; rot?: unknown; acao?: string | [number, string, string?][]; exp?: Expressao3D; ant?: Anterior; entradaDur?: number; pose?: Pose3D | [number, Pose3D][]; incl?: unknown; esc?: number; quem?: string };
const QUEM: Record<string, Personagem3D> = { zeca, a: homemA, b: homemB, c: homemC, m: mulher };

const Pessoa: React.FC<{ g: GenteE; C: Ctx }> = ({ g, C }) => {
  const p = C.p;
  const tAbs = C.tEp;
  const { acao, exp, pose } = poseGente(g, { p, t: C.t, tAbs, abs: true, incl: nv(g.incl, p, 0) });
  const { x, y, z, rot } = posicaoGente(g, C.t, { x: nv(g.x, p, 0), y: nv(g.y, p, 0), z: nv(g.z, p, 0), rot: nv(g.rot, p, 0) });
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={g.esc ?? 1.06}>
      <Boneco3D p={QUEM[g.quem ?? "zeca"] ?? zeca} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} t={tAbs} />
    </group>
  );
};

/* ---------- peças pequenas ---------- */

const Chama: React.FC<{ k: number; treme: number; t: number; esc?: number; cor?: string }> = ({ k, treme, t, esc = 1, cor }) => {
  if (k < 0.02) return null;
  const f = 1 + treme * 0.25 * Math.sin(t * 17) + treme * 0.12 * Math.sin(t * 31);
  const lean = treme * 0.25 * Math.sin(t * 9);
  return (
    <group scale={esc * k} rotation={[0, 0, lean]}>
      <mesh position={[0, 0.34 * f, 0]} scale={[1, f, 1]}><coneGeometry args={[0.2, 0.7, 8]} /><meshBasicMaterial color={cor ?? "#ff8a2a"} /></mesh>
      <mesh position={[0, 0.26 * f, 0]} scale={[1, f, 1]}><coneGeometry args={[0.12, 0.45, 8]} /><meshBasicMaterial color="#ffe14a" /></mesh>
      <Halo p={[0, 0.3, 0.1]} r={1.2 * esc} cor="#ffb347" op={0.45} />
    </group>
  );
};

const Barco: React.FC<{ x: number; z: number; t: number; rot?: number; cor?: string; children?: React.ReactNode; sino?: number }> = ({ x, z, t, rot = 0, cor = "#e5473a", children, sino = 0 }) => {
  void sino;
  return (
    <group position={[x, 0.12 * Math.sin(t * 1.5 + x), z]} rotation={[0.04 * Math.sin(t * 1.2 + x), rot, 0.05 * Math.sin(t * 1.7 + x)]}>
      <Caixa p={[0, 0.3, 0]} t={[3.4, 0.7, 1.4]} cor={cor} raio={0.12} rug={0.7} />
      <mesh position={[1.9, 0.38, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1.0, 1, 1]}><coneGeometry args={[0.7, 0.9, 4]} /><meshStandardMaterial color={cor} roughness={0.7} flatShading /></mesh>
      <Caixa p={[0, 0.7, 0]} t={[3.0, 0.1, 1.2]} cor="#b07a46" raio={0.03} sombra={false} />
      <Caixa p={[-0.9, 1.15, 0]} t={[0.9, 0.8, 0.9]} cor="#f4f1ea" raio={0.06} />
      <mesh position={[2.1, 0.5, 0]}><sphereGeometry args={[0.08, 8, 6]} /><meshBasicMaterial color="#37ff7a" /></mesh>
      {children}
    </group>
  );
};

/* ---------- palco da costa ---------- */

const TorreFarol: React.FC<{ k: number; lanterna: number }> = ({ k, lanterna }) => {
  if (k < 0.02) return null;
  return (
    <group position={[TX, 0, TZ]} scale={[1, k, 1]}>
      {Array.from({ length: 6 }).map((_, i) => <mesh key={i} position={[0, 0.9 + i * 1.8, 0]}><cylinderGeometry args={[1.2 - i * 0.09, 1.28 - i * 0.09, 1.8, 20]} /><meshStandardMaterial color={i % 2 ? "#e5473a" : "#f4f1ea"} roughness={0.85} /></mesh>)}
      <mesh position={[0, 10.9, 0]}><cylinderGeometry args={[1.5, 0.9, 0.35, 20]} /><meshStandardMaterial color="#394149" /></mesh>
      <mesh position={[0, 11.9, 0]}><cylinderGeometry args={[0.7, 0.7, 1.4, 16]} /><meshStandardMaterial color="#bfe9ff" transparent opacity={0.5} emissive="#ffe9a0" emissiveIntensity={lanterna * 1.2} /></mesh>
      <mesh position={[0, 12.9, 0]}><coneGeometry args={[0.9, 0.9, 16]} /><meshStandardMaterial color="#e5473a" /></mesh>
    </group>
  );
};

const Luau: React.FC<{ k: number; fogoY: number; t: number; pose: string; tapa: number; C: Ctx }> = ({ k, fogoY, t, pose, tapa, C }) => {
  if (k < 0.02) return null;
  const dancers: [number, number, number, string][] = [[-3.4, -12.0, 0.6, "a"], [-2.2, -11.2, -0.4, "m"], [-4.4, -11.4, 0.9, "c"], [-1.2, -12.4, -0.9, "b"], [-5.4, -12.4, 0.3, "m"], [-0.4, -11.2, -0.5, "a"]];
  return (
    <group scale={suave(k)}>
      {/* a fogueira sobe pela torre com a plataforma */}
      <group position={[0, fogoY * (TH + 0.6), 0]}>
        <group position={[-2.8, 0.1, -13.2]}>
          {[0, 1, 2].map((i) => <mesh key={i} position={[Math.cos(i * 2.1) * 0.25, 0.1, Math.sin(i * 2.1) * 0.25]} rotation={[0, i * 2.1, Math.PI / 2 - 0.2]}><cylinderGeometry args={[0.07, 0.07, 0.8, 6]} /><meshStandardMaterial color="#5a3a22" /></mesh>)}
          <Chama k={1} treme={0.4} t={t} esc={0.9} />
        </group>
        {fogoY > 0.02 && <Caixa p={[-2.8, -0.1, -13.2]} t={[1.4, 0.15, 1.4]} cor="#8d8478" raio={0.03} />}
      </group>
      {dancers.map(([x, z, r, q], i) => {
        const a = pose === "acena" ? "acenando" : "comemorando";
        const ps: Pose3D = { ...poseDe3D(a, t + i * 0.7) };
        if (tapa > 0.02 && i === 3) { ps["ombroE.x"] = -1.2; ps["ombroD.x"] = -1.2; ps["cotoveloE.x"] = -2.3; ps["cotoveloD.x"] = -2.3; ps["ombroE.z"] = 0.5; ps["ombroD.z"] = -0.5; }
        return (
          <group key={i} position={[x - 2.8 + 2.8, 0.0, z]} rotation={[0, r + 0.4, 0]} scale={0.95}>
            <Boneco3D p={QUEM[q]} pose={ps} expressao={i === 3 && tapa > 0.02 ? "tenso" : "sorriso"} pisca={piscar(t + i)} boca={0} olhar={[0, 0]} t={t + i} />
          </group>
        );
      })}
      {/* palmeiras e pranchas */}
      {[[-8, -13.5], [3, -14.5], [-9.5, -11]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Liga a={[0, 0, 0]} b={[0.4, 3.2, 0]} w={0.22} cil cor="#7a5230" />
          {[0, 1, 2, 3, 4].map((j) => <mesh key={j} position={[0.4 + Math.cos(j * 1.26) * 0.8, 3.2, Math.sin(j * 1.26) * 0.8]} rotation={[Math.sin(j * 1.26) * 0.7, 0, -Math.cos(j * 1.26) * 0.7]} scale={[1.3, 0.05, 0.4]}><sphereGeometry args={[0.7, 6, 4]} /><meshStandardMaterial color="#3f9a4a" /></mesh>)}
        </group>
      ))}
      {void C}
    </group>
  );
};

const Feixe: React.FC<{ k: number; ang: number; y: number; cor?: string; neblina: number }> = ({ k, ang, y, cor = "#fff3b0", neblina }) => {
  if (k < 0.02) return null;
  const op = k * (1 - 0.8 * neblina);
  return (
    <group position={[TX, y, TZ]} rotation={[0, -ang, 0]}>
      <mesh position={[20, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[2.0, 40, 20, 1, true]} /><meshBasicMaterial color={cor} transparent opacity={0.26 * op} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <mesh position={[20, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.8, 40, 20, 1, true]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.3 * op} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <Halo p={[0, 0, 0]} r={2.2} cor="#fff0b0" op={0.7 * op} />
    </group>
  );
};

const Costa: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const gente = (C.cena.gente as GenteE[] | undefined) ?? [];
  const noite = n("noite", 1);
  const gira = C.int("gira", 0);
  const feixe = n("feixe", 0);
  const nebl = n("neblina", 0);
  const barcoX = n("barcoX", -3);
  const sky = (a: string, b: string) => mistura(a, b, 1 - noite);
  const sinoK = n("sino", 0);
  const som = n("som", 0);
  const luauPose = (C.cena.luauPose as string | undefined) ?? "danca";
  const setor = n("setor", 0);
  const torresK = n("torres", 0);
  const onda = n("onda", 0);
  const gps = n("gps", 0);
  const carta = n("carta", 0);
  const aTorre = n("torre", 0);
  const topY = aTorre * (TH + 1.4);
  const flashBarco = (bx: number, bz: number) => {
    const dx = bx - TX, dz = bz - TZ;
    const alvo = Math.atan2(dz, dx); // ângulo do barco visto da torre (no plano x,z)
    const d = Math.atan2(Math.sin(-gira * 1 - alvo + 0 * 0), Math.cos(-gira - alvo));
    return Math.max(0, 1 - Math.abs(d) / 0.1);
  };
  const f1 = feixe > 0.5 ? flashBarco(barcoX, 3) : 0;
  const f2 = feixe > 0.5 ? flashBarco(16, 2) : 0;
  const estrelas = Array.from({ length: 70 }).map((_, i) => ({ x: ((i * 37) % 90) - 45, y: 8 + ((i * 53) % 34), s: 0.07 + 0.05 * ((i * 7) % 3) }));
  return (
    <group>
      <hemisphereLight args={[sky("#4a5f96", "#e8f4ff"), sky("#101826", "#8a8070"), 0.6 + 0.5 * (1 - noite)]} />
      <directionalLight position={[-4, 10, 8]} intensity={0.45 + 1.1 * (1 - noite)} color={sky("#b8c8ff", "#fff3dc")} />
      <Dome topo={sky("#040918", "#3f86d8")} meio={sky("#0c163a", "#9ad0f5")} base={sky("#1c2b55", "#ffd2a0")} />
      {noite > 0.4 && estrelas.map((s, i) => <mesh key={i} position={[s.x, s.y, -40]} scale={s.s * (0.7 + 0.3 * Math.sin(tEp * 2 + i))}><sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
      {/* mar */}
      <mesh position={[0, -0.06, -8]}><boxGeometry args={[160, 0.1, 80]} /><meshStandardMaterial color={sky("#0b2147", "#3f86d8")} roughness={0.25} /></mesh>
      {Array.from({ length: 22 }).map((_, i) => <mesh key={i} position={[((i * 7.3 + tEp * 0.6) % 50) - 25 + 5, 0.0, 6 - ((i * 3.7) % 20)]} scale={[1.6 + 0.4 * (i % 3), 0.03, 0.4]}><sphereGeometry args={[1, 8, 4]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.16 + 0.1 * Math.sin(tEp * 2 + i)} /></mesh>)}
      {/* praia e colinas ao fundo */}
      <mesh position={[0, -0.1, -17]}><boxGeometry args={[70, 0.4, 7]} /><meshStandardMaterial color={sky("#6a5f48", "#d9c18a")} roughness={1} /></mesh>
      <mesh position={[-8, 0, -24]} scale={[16, 4, 6]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={sky("#14221c", "#4a8a3a")} roughness={1} flatShading /></mesh>
      <mesh position={[18, 0, -24]} scale={[14, 3.4, 6]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={sky("#14221c", "#4a8a3a")} roughness={1} flatShading /></mesh>
      {/* a pedra */}
      <group position={[3, 0, -1]}>
        {[[0, 0, 0, 1.3], [1.3, 0, 0.6, 0.8], [-1.1, 0, 0.7, 0.6]].map(([x, y, z, s], i) => <mesh key={i} position={[x, y + 0.1, z]} scale={[s, s * 0.8, s]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={sky("#8d8f96", "#b9b4a8")} roughness={0.9} flatShading /></mesh>)}
        {[0, 1, 2].map((i) => <mesh key={i} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.8 + ((tEp * 0.6 + i * 0.33) % 1) * 1.8, 1.8 + ((tEp * 0.6 + i * 0.33) % 1) * 1.8, 1]}><ringGeometry args={[0.85, 1.0, 24]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.5 * (1 - ((tEp * 0.6 + i * 0.33) % 1))} /></mesh>)}
      </group>
      <Luau k={n("luau", 1)} fogoY={n("fogoY", 0)} t={tEp} pose={luauPose} tapa={n("vizinhoTapa", 0)} C={C} />
      <TorreFarol k={aTorre} lanterna={n("lanternaTopo", 0)} />
      {n("lanternaTopo", 0) > 0.02 && <Halo p={[TX, topY - 1.0, TZ]} r={2.0 + 1.5 * n("lanternaTopo", 0)} cor="#ffe9a0" op={0.5 * n("lanternaTopo", 0)} />}
      <Feixe k={feixe} ang={gira} y={topY - 1.0} neblina={nebl} />
      {/* o barco do Zeca com a tela do GPS */}
      <Barco x={barcoX} z={3} t={tEp} rot={n("barcoRot", 0)}>
        {gps > 0.02 && <group position={[0.2, 1.0, 0.75]}><Caixa p={[0, 0, 0]} t={[0.5, 0.35, 0.04]} cor="#1a1f26" raio={0.02} sombra={false} /><mesh position={[0, 0, 0.03]}><planeGeometry args={[0.42, 0.27]} /><meshBasicMaterial color="#58ff8a" transparent opacity={gps} /></mesh></group>}
        {gente.filter((g) => g.quem === "zeca" || g.quem === undefined).map((g, i) => <Pessoa key={i} g={{ ...g, x: 0.3, y: 0.7, z: 0.0, rot: nv(g.rot, C.p, 0.4) }} C={C} />)}
        {f1 > 0.05 && <Halo p={[0, 1.4, 0]} r={2.4} cor="#fff3b0" op={0.7 * f1} />}
      </Barco>
      {n("barco2", 0) > 0.02 && <Barco x={16} z={2} t={tEp} rot={Math.PI} cor="#3b82c4">{f2 > 0.05 && <Halo p={[0, 1.4, 0]} r={2.6} cor="#fff3b0" op={0.7 * f2} />}</Barco>}
      {n("barco2", 0) > 0.02 && (feixe < 0.5) && <Halo p={[16, 0.9, 2]} r={0.01} cor="#000000" op={0} />}
      {/* a carta náutica */}
      {carta > 0.02 && <group position={[barcoX + 0.8, 1.9, 3.9]} rotation={[-0.3, 0, 0]} scale={suave(carta)}><Caixa p={[0, 0, 0]} t={[1.1, 0.8, 0.03]} cor="#e8dcc0" raio={0.01} sombra={false} />{[[-0.3, 0.2], [0.1, -0.1], [0.3, 0.2]].map(([x, y], i) => <mesh key={i} position={[x, y, 0.03]} scale={[0.14, 0.03, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#3a2a1c" /></mesh>)}<Liga a={[-0.4, -0.2, 0.03]} b={[0.4, 0.0, 0.03]} w={0.03} cil cor="#3b82c4" basico /></group>}
      {/* outros faróis ao fundo, cada um com seu padrão de piscadas */}
      {torresK > 0.02 && [[-16, -14, 2], [-9, -17, 3], [16, -14, 9]].map(([x, z, pat], i) => {
        const ciclo = pat === 9 ? 3.6 : 4.5;
        const u = ((tEp + i * 1.1) % ciclo);
        const on = pat === 2 ? (u < 0.35 || (u > 0.8 && u < 1.15)) : pat === 3 ? (u < 0.3 || (u > 0.65 && u < 0.95) || (u > 1.3 && u < 1.6)) : u < 1.6;
        return (
          <group key={i} position={[x, 0, z]} scale={suave(torresK) * 0.8}>
            {[0, 1, 2].map((j) => <mesh key={j} position={[0, 0.8 + j * 1.5, 0]}><cylinderGeometry args={[0.8 - j * 0.1, 0.9 - j * 0.1, 1.5, 12]} /><meshStandardMaterial color={j % 2 ? "#e5473a" : "#f4f1ea"} /></mesh>)}
            <mesh position={[0, 5.0, 0]}><sphereGeometry args={[0.45, 10, 8]} /><meshBasicMaterial color={on ? "#fff3b0" : "#3a3f50"} /></mesh>
            {on && <Halo p={[0, 5.0, 0.2]} r={2.4} cor="#fff0b0" op={0.8} />}
          </group>
        );
      })}
      {/* setor vermelho sobre a pedra e branco no canal livre */}
      {setor > 0.02 && (
        <group position={[TX, 0.08, TZ]}>
          {[["#ff3b3b", Math.atan2(-1 - TZ, 3 - TX), 0.2], ["#ffffff", Math.atan2(3 - TZ, -3 - TX), 0.16], ["#ffffff", Math.atan2(2 - TZ, 16 - TX), 0.16]].map(([c, a, w], i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, (a as number)]} position={[0, 0, 0]}>
              <circleGeometry args={[22 * setor, 12, -(w as number), (w as number) * 2]} />
              <meshBasicMaterial color={c as string} transparent opacity={0.4 * setor} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}
      {/* a onda que esconde o luau */}
      {onda > 0.02 && <mesh position={[6, -1.0 + 2.6 * Math.sin(onda * Math.PI), -6]} scale={[9, 1.6 + 1.2 * Math.sin(onda * Math.PI), 1.4]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color="#0f2f66" roughness={0.3} /></mesh>}
      {/* neblina: bolas brancas translúcidas sobre o mar */}
      {nebl > 0.02 && Array.from({ length: 34 }).map((_, i) => <mesh key={i} position={[-14 + ((i * 3.1) % 34) + Math.sin(tEp * 0.4 + i) * 0.8, 0.6 + ((i * 0.37) % 2.6), 8 - ((i * 1.9) % 22)]} scale={[3.2, 1.4, 2.4]}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#dfe8f4" transparent opacity={0.2 * nebl} depthWrite={false} /></mesh>)}
      {/* sino/buzina e as ondas do som */}
      {sinoK > 0.02 && (
        <group position={[TX - 1.6, topY - 2.0 + 0.0, TZ + 0.5]} scale={suave(sinoK)}>
          <mesh position={[0, 0, 0]}><coneGeometry args={[0.55, 0.9, 12, 1, true]} /><meshStandardMaterial color="#e5a23a" metalness={0.6} roughness={0.3} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, -0.5, 0]}><sphereGeometry args={[0.1, 8, 6]} /><meshStandardMaterial color="#8a6a46" /></mesh>
        </group>
      )}
      {som > 0.02 && Array.from({ length: 5 }).map((_, i) => {
        const u = ((tEp * 0.7 + i * 0.2) % 1);
        return <mesh key={i} position={[TX - 1.6, topY - 2.0, TZ + 0.5]} rotation={[0, 0, 0]} scale={[1 + u * 26, 1 + u * 8, 1 + u * 26]}><sphereGeometry args={[1, 18, 12]} /><meshBasicMaterial color="#9fdcff" transparent opacity={0.1 * som * (1 - u)} depthWrite={false} wireframe /></mesh>;
      })}
      {n("navio", 0) > 0.02 && (
        <group position={[-17, 0, -11]} scale={suave(n("navio", 0)) * 1.1}>
          <Caixa p={[0, 1.2, 0]} t={[14, 2.4, 3.6]} cor="#3a414c" raio={0.2} rug={0.7} />
          <mesh position={[7.6, 1.2, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[1.8, 2.4, 4]} /><meshStandardMaterial color="#3a414c" flatShading /></mesh>
          <Caixa p={[-4.5, 3.8, 0]} t={[3.0, 2.4, 3.0]} cor="#f4f1ea" raio={0.1} />
          <Caixa p={[-4.5, 5.4, 0]} t={[1.6, 0.8, 2.0]} cor="#d6d9de" raio={0.05} />
          {[-1, 1].map((x) => <Caixa key={x} p={[x * 2.5 + 1, 3.0, 0]} t={[1.4, 1.2, 2.0]} cor="#e5473a" raio={0.05} />)}
          {Array.from({ length: 14 }).map((_, i) => <mesh key={i} position={[-6.2 + i * 0.9, 1.6, 1.82]} scale={0.1}><sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial color="#ffe9a0" /></mesh>)}
        </group>
      )}
      {n("interroga", 0) > 0.02 && <Texto3D texto="?" p={[-3, 4.8 + 0.6 * suave(n("interroga", 0)), 3]} h={1.5} escala={suave(n("interroga", 0))} />}
      {gente.filter((g) => g.quem !== undefined && g.quem !== "zeca").map((g, i) => <Pessoa key={i} g={g} C={C} />)}
    </group>
  );
};

/* ---------- palco da lanterna ---------- */

const Lanterna: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const gente = (C.cena.gente as GenteE[] | undefined) ?? [];
  const chama = n("chama", 1);
  const treme = n("treme", 0);
  const lenha = n("lenha", 0);
  const fumaca = n("fumaca", 0);
  const lamparina = n("lamparina", 0);
  const espelho = n("espelho", 0);
  const lente = n("lente", 0);
  const aneis = n("aneis", 0);
  const raios = n("raios", 0);
  const longo = n("feixeLongo", 0);
  const peso = n("peso", 0);
  const giro = C.int("giraL", 0);
  const mercurio = n("mercurio", 0);
  const dedo = n("dedo", 0);
  const motor = n("motor", 0);
  const escada = n("escada", 0);
  const solar = n("solar", 0);
  const led = n("led", 0);
  const horas = n("horas", 0);
  const shake = peso > 0.02 ? 0.03 * Math.sin(tEp * 50) * peso : 0;
  const bob = mercurio > 0.5 ? 0.03 * Math.sin(tEp * 2) : 0;
  const R = 1.15;
  const seta = (a: V, b: V, i: number, cor = "#ffe27a") => <Seta key={i} a={a} b={b} cor={cor} w={0.05} op={0.95} />;
  return (
    <group position={[shake, 0, 0]}>
      <hemisphereLight args={["#6a7fb8", "#2a2418", 0.9]} />
      <directionalLight position={[-3, 6, 8]} intensity={0.9} color="#cfd8ff" />
      <Dome topo="#050b1e" meio="#101c40" base="#1c2b55" />
      {Array.from({ length: 50 }).map((_, i) => <mesh key={i} position={[((i * 37) % 70) - 35, 3 + ((i * 53) % 30), -30]} scale={0.08}><sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
      {/* piso da lanterna, parapeito */}
      <mesh position={[0, -0.12, 0]}><cylinderGeometry args={[3.4, 3.6, 0.25, 24]} /><meshStandardMaterial color="#6a6f78" roughness={0.9} /></mesh>
      {Array.from({ length: 14 }).map((_, i) => { const a = (i / 14) * Math.PI * 2; return <Liga key={i} a={[Math.cos(a) * 3.3, 0, Math.sin(a) * 3.3]} b={[Math.cos(a) * 3.3, 1.0, Math.sin(a) * 3.3]} w={0.06} cil cor="#394149" />; })}
      {/* torre abaixo, com a escada em caracol */}
      <mesh position={[0, -4.2, 0]}><cylinderGeometry args={[3.0, 3.2, 8, 24, 1, true]} /><meshPhysicalMaterial color="#c8d6de" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {escada > 0.02 && Array.from({ length: 24 }).map((_, i) => { const a = (i / 24) * Math.PI * 4; const y = -7.4 + (i / 24) * 7.2; return i / 24 < escada ? <group key={i} position={[Math.cos(a) * 2.0, y, Math.sin(a) * 2.0]} rotation={[0, -a, 0]}><Caixa p={[0, 0, 0]} t={[1.2, 0.1, 0.6]} cor="#8d8478" raio={0.01} sombra={false} /></group> : null; })}
      {escada > 0.02 && <Liga a={[0, -7.6, 0]} b={[0, 0, 0]} w={0.28} cil cor="#4a4f57" />}
      {/* lenha, fumaça e a chama */}
      {lenha > 0.02 && [0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.cos(i * 1.6) * 0.3, 0.1 + 0.05 * (i % 2), Math.sin(i * 1.6) * 0.3]} rotation={[0, i * 1.6, Math.PI / 2 - 0.15]} scale={[1, lenha, 1]}><cylinderGeometry args={[0.1, 0.1, 1.0, 7]} /><meshStandardMaterial color="#5a3a22" /></mesh>)}
      <group position={[0, 0.25, 0]}>
        {lamparina < 0.5 && <Chama k={chama * (led > 0.5 ? 0 : 1)} treme={treme} t={tEp} esc={1.3} />}
        {lamparina >= 0.5 && led < 0.5 && <Chama k={chama} treme={0.02} t={tEp} esc={1.1} />}
      </group>
      {fumaca > 0.02 && <Fumaca p={[0, 1.0, 0]} t={tEp} k={fumaca} cor="#24211e" alt={4.0} larg={0.8} op={0.8} n={14} />}
      {lamparina > 0.02 && (
        <group scale={suave(lamparina)} position={[0, 0.0, 0]}>
          <Caixa p={[0, 0.0, 0]} t={[0.9, 0.3, 0.9]} cor="#d8a13a" raio={0.08} met={0.5} />
          <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.38, 0.38, 1.0, 16, 1, true]} /><meshPhysicalMaterial color="#cfeaff" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        </group>
      )}
      {led > 0.02 && (
        <group position={[0, 0.65, 0]} scale={suave(led)}>
          <mesh><sphereGeometry args={[0.22, 14, 10]} /><meshBasicMaterial color="#f4fbff" /></mesh>
          <Halo p={[0, 0, 0.1]} r={2.2} cor="#cfe9ff" op={0.7} />
          <Caixa p={[0, -0.4, 0]} t={[0.35, 0.3, 0.35]} cor="#9aa3ab" raio={0.03} />
        </group>
      )}
      {/* o conjunto que gira: espelho, lente e raios */}
      <group rotation={[0, giro, 0]}>
        {espelho > 0.02 && <mesh position={[0, 0.8, 0]} scale={[1, suave(espelho), 1]}><cylinderGeometry args={[R, R, 1.8, 28, 1, true, Math.PI, Math.PI]} /><meshStandardMaterial color="#e8eef5" metalness={0.9} roughness={0.15} side={THREE.DoubleSide} /></mesh>}
        {lente > 0.02 && aneis < 0.98 && <mesh position={[1.9, 0.9, 0]} scale={[0.4 * (1 - 0.0 * peso), 1.2, 1.2]}><sphereGeometry args={[1, 24, 16]} /><meshPhysicalMaterial color={peso > 0.3 ? "#9aa5a0" : "#a8e0d0"} transparent opacity={0.55 * suave(lente) * (1 - aneis)} roughness={0.1} /></mesh>}
        {aneis > 0.02 && [0.25, 0.5, 0.75, 1.0, 1.25].map((r, i) => <mesh key={i} position={[1.9 + 0.05 * i * (i % 2 ? 1 : -1) * 0.5, 0.9, 0]} rotation={[0, Math.PI / 2, 0]} scale={suave(aneis)}><torusGeometry args={[r, 0.045, 8, 28]} /><meshPhysicalMaterial color="#a8e0d0" transparent opacity={0.75} roughness={0.1} /></mesh>)}
        {raios >= 1 && Array.from({ length: raios === 1 ? 10 : 5 }).map((_, i) => {
          if (raios === 1) { const a = (i / 10) * Math.PI * 2; return seta([Math.cos(a) * 0.35, 0.9 + Math.sin(a) * 0.35, 0], [Math.cos(a) * 1.5, 0.9 + Math.sin(a) * 1.5, 0], i); }
          return null;
        })}
        {raios >= 2 && Array.from({ length: 5 }).map((_, i) => { const y = 0.3 + i * 0.3; return seta([-0.9, y, 0], [0.4, y, 0], 10 + i, "#bfe9ff"); })}
        {raios === 2 && Array.from({ length: 5 }).map((_, i) => { const y = 0.3 + i * 0.3; return seta([0.8, y, 0], [2.6 + 0.2 * i, 0.9 + (y - 0.9) * (1.2 + 0.0), 0], 20 + i); })}
        {raios === 3 && Array.from({ length: 5 }).map((_, i) => { const y = 0.3 + i * 0.3; return seta([0.5, y, 0], [1.8, y, 0], 30 + i); })}
      </group>
      {raios === 3 && longo > 0.02 && (
        <group position={[2.1, 0.9, 0]}>
          <mesh position={[18, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.35, 36, 16, 1, true]} /><meshBasicMaterial color="#fff3b0" transparent opacity={0.45 * longo} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} /></mesh>
          <mesh position={[18, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.12, 36, 12, 1, true]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.6 * longo} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} /></mesh>
          <group position={[16 * longo, -1.8, -1.0]} scale={0.5}><Barco x={0} z={0} t={tEp} cor="#e5473a" /></group>
        </group>
      )}
      {/* banho de mercúrio e o dedinho */}
      {mercurio > 0.02 && (
        <group scale={suave(mercurio)}>
          <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[2.2, 2.2, 0.3, 28]} /><meshStandardMaterial color="#d6dbe0" metalness={0.95} roughness={0.08} /></mesh>
          <mesh position={[0, -0.12 + bob, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.2, 0.08, 8, 32]} /><meshStandardMaterial color="#9aa5ad" metalness={0.8} /></mesh>
        </group>
      )}
      {dedo > 0.02 && <group position={[3.2 - 1.2 * Math.abs(Math.sin(tEp * 1.2)), 0.9, 0.6]}><Caixa p={[0, 0, 0]} t={[0.5, 0.18, 0.18]} cor="#c98f63" raio={0.08} /><Caixa p={[0.6, 0, 0.0]} t={[0.8, 0.5, 0.4]} cor="#c98f63" raio={0.1} sombra={false} /></group>}
      {motor > 0.02 && (
        <group position={[0, -0.7, 0.0]} scale={suave(motor)}>
          <Caixa p={[0, 0, 0]} t={[1.0, 0.7, 0.8]} cor="#3b82c4" raio={0.08} met={0.4} />
          <Liga a={[0, 0.3, 0]} b={[0, 0.9, 0]} w={0.12} cil cor="#9aa5ad" />
          <mesh position={[0.2, 0.0, 0.42]} scale={0.1}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#58ff8a" /></mesh>
        </group>
      )}
      {/* painéis solares no parapeito e o contador de horas */}
      {solar > 0.02 && [[-2.4, 1.0, 1.8, 0.5], [2.5, 1.0, 1.7, -0.5], [0.3, 1.0, -3.0, 3.3]].map(([x, y, z, r], i) => (
        <group key={i} position={[x, y, z]} rotation={[-0.5, r, 0]} scale={suave(solar)}>
          <Caixa p={[0, 0, 0]} t={[1.9, 0.08, 1.2]} cor="#1f4aa8" raio={0.02} met={0.5} />
          {[-0.6, 0, 0.6].map((dx) => <Caixa key={dx} p={[dx, 0.05, 0]} t={[0.02, 0.01, 1.2]} cor="#9fc4ff" raio={0.005} sombra={false} />)}
        </group>
      ))}
      {horas > 0.02 && <Texto3D texto={`${Math.round((horas * 50000) / 1000) * 1000} h`} p={[0, 2.9, 0.5]} h={0.9} cor="#9fe8b0" escala={suave(clamp01(horas * 4))} />}
      {gente.map((g, i) => <Pessoa key={i} g={g} C={C} />)}
    </group>
  );
};

/* ---------- cena ---------- */

const FarolCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const C = mkCtx(cena, p, t, tEpisodio);
  const { n } = C;
  const palco = (cena.palco as string | undefined) ?? "costa";
  const X0 = PALCO_X[palco] ?? 0;
  const topY = n("torre", 0) * (TH + 1.4);
  const et: Record<string, EtiqDef> = {
    torre: { texto: "TORRE", para: [TX, 7.0, TZ + 1.0], off: [-2.4, 0.6], cor: "#ffd23f" },
    lamparina: { texto: "LAMPARINA", para: [0.0, 1.0, 0.4], off: [-1.6, 1.4], cor: "#ffd23f" },
    espelho: { texto: "ESPELHO", para: [-R0, 0.9, 0.4], off: [-1.0, 1.4], cor: "#ffd23f" },
    lente: { texto: "LENTE", para: [1.9, 1.8, 0.4], off: [1.0, 1.0], cor: "#ffd23f" },
    aneis: { texto: "ANÉIS", para: [1.9, 1.6, 0.4], off: [1.0, 1.2], cor: "#ffd23f" },
    sino: { texto: "SINO", para: [TX - 1.6, topY - 2.0, TZ + 0.7], off: [-2.2, 1.0], cor: "#ffd23f" },
    mercurio: { texto: "MERCÚRIO", para: [0.0, -0.1, 1.5], off: [-1.6, -0.6], cor: "#d6dbe0" },
    motor: { texto: "MOTOR", para: [0.4, -0.5, 0.6], off: [-1.4, -0.8], cor: "#ffd23f" },
    solar: { texto: "SOLAR", para: [-2.4, 1.0, 1.8], off: [-0.6, 1.5], cor: "#ffd23f" },
    led: { texto: "LED", para: [0.0, 0.7, 0.2], off: [1.4, 1.5], cor: "#cfe9ff" },
  };
  const S = n("etiqS", 1);
  const Kt = n("etiqK", 1);
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fimE] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fimE === undefined || p <= fimE) };
  }).filter((x) => x.ok);
  return (
    <group>
      <group position={[X0, 0, 0]}>{palco === "lanterna" ? <Lanterna C={C} /> : <Costa C={C} />}</group>
      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const off: V = [d.para[0] + d.off[0] * S + X0, d.para[1] + d.off[1] * S, d.para[2] + 0.3];
        return <Etiqueta key={c} texto={d.texto} de={off} para={[d.para[0] + X0, d.para[1], d.para[2]]} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

const R0 = 1.15;
void lerp;
void rnd;

export const farol: Cenario3D = {
  Cena: FarolCena,
  padrao: "geral",
  fundo: () => "#050b1e",
  luzPropria: true,
  cameras: { geral: { pos: [-1, 3, 12], alvo: [0, 1.5, 0], fov: 50 } },
};
