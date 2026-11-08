import React from "react";
import * as THREE from "three";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { Caixa } from "../../../src/v3d/qualidade";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { poseDe3D } from "../../../src/v3d/acoes";
import { poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Cenario3D, Cenario3DProps, Expressao3D, Personagem3D, Pose3D } from "../../../src/v3d/tipos";
import { Etiqueta, Halo, Liga, Seta, Texto3D } from "./cozinha-base";
import { Arvore, Ctx, Dome, EtiqDef, GenteE, Nuvens, Oficina, V, mkCtx, mistura, nv } from "./rasc";
import { zeca } from "./zeca";
import {
  NX1, NX2, NX2B, NX3, ALFA, ANEL, A_BAL, A_PEND, Angs, Barra, DA, DELTA, EPS, Eixo, Espiral, LF, MOD, N3, N4, NB, NC, NCWS, NE, NFACE, NHOR, NMIN, NR, NS, NSWS, P2, P3, P4, P5, PAL0, PC, PCAN, PMIN, POS, PSI, Ponteiro,
  RE, RHO0, RPIN, Reg, Roda, Rubi, SLIDE, deB, deC, deE, eng, palete, passos, phiDe, comando, rz, thE0, travada,
} from "./relogio-mec";

// Relógio (episódio 24). Tipos de cena (campo `tipo`): "quintal" (vareta de sombra) · "ampulheta" · "pendulo" · "oficina" (o mecanismo, que se monta peça a peça) · "mar" (gancho do farol).
// O mecanismo é modelado de verdade (relogio-mec.tsx): ângulos = tempo × razão de dentes; escape de âncora com 15 dentes e meio passo por oscilação; roda de balanço com espiral.
// Campos do mecanismo (oficina): vis* 0..1 (peça aparece) · mola 0..1 (0 peso, 1 barrilete) · reg 0/1 (pêndulo/balanço) · bat (oscilações/s) · amp 0..1 · ustop (oscilação em que o escape trava) · livre 0/1 + queda 0..1 (peso solto)
//   ff (voltas da central por s: acelerado) · hm hh hs (hora inicial) · gW gS (voltas da coroa: dar corda / acertar) · puxa 0..1 · incl 0..1 (relógio deitado) · ms mx my mz (escala e posição) · vidro 0..1 · luz (entardecer)
//   gente: lista de { x, z, rot, acao, exp, pose } · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax

const YC = 4.0; // altura do centro do mecanismo (pendurado na torre)
const DROP = 2.6, R_DRUM = 0.5, Y_PESO0 = -1.0;

/* ------------------------------ personagens extras ------------------------------ */
const chefe: Personagem3D = { nome: "Chefe", altura: 1.7, pele: "#d9a47c", cabelo: "#3d3a38", olhos: "#3a2a1c", camiseta: "#f1f1ee", calca: "#2b3140", sapato: "#1d1d20", barriga: 0.6, sobrancelha: "#3d3a38" };
const vigia: Personagem3D = { nome: "Vigia", altura: 1.65, pele: "#b9805a", cabelo: "#2a2018", olhos: "#3a2a1c", camiseta: "#6b9a5a", calca: "#4a5560", sapato: "#3a2a1c", bone: { cor: "#2f4f6f", aba: "#264058" }, bigode: "#2a2018", barriga: 0.3 };

type GenteP = GenteE & { quem?: "zeca" | "chefe" | "vigia"; gravata?: boolean };
const PessoaP: React.FC<{ g: GenteP; p: number; t: number; tAbs: number }> = ({ g, p, t, tAbs }) => {
  const { acao, exp, pose } = poseGente(g, { p, t: t, tAbs, abs: true });
  const pers = g.quem === "chefe" ? chefe : g.quem === "vigia" ? vigia : zeca;
  const { x, y, z, rot } = posicaoGente(g, t, { x: nv(g.x, p, 0), y: nv(g.y, p, 0), z: nv(g.z, p, 0), rot: nv(g.rot, p, 0) });
  const esc = g.esc ?? (g.quem === "zeca" || !g.quem ? 1.06 : 1.0);
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={esc}>
      <Boneco3D p={pers} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} t={tAbs} />
      {g.gravata && (
        <group position={[0, 1.17, 0.145]}>
          <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.05, 0.05, 0.02]} /><meshStandardMaterial color="#c8323a" /></mesh>
          <mesh position={[0, -0.1, 0.002]}><boxGeometry args={[0.07, 0.2, 0.02]} /><meshStandardMaterial color="#c8323a" /></mesh>
        </group>
      )}
    </group>
  );
};

/* ------------------------------ estado do mecanismo ------------------------------ */
type Est = {
  reg: Reg; ang: Angs; ref: Angs; can: number; refCan: number; M: number; H: number; refM: number; refH: number; thSW: number;
  u: number; uE: number; x: number; phi: number; thE: number; beta: number; thp: number; amp: number;
  X2: number; X3: number; refX3: number; psiCW: number; psiSW: number; thR: number; chi: number; pawl: number; wFall: number; turnsC: number;
};
const dirp = (a: P2, b: P2) => Math.atan2(b[1] - a[1], b[0] - a[0]);

const estado = (C: Ctx, dt: number): Est => {
  const { n, t, p } = C;
  const dur = p > 0.001 ? t / p : 3;
  const reg: Reg = n("reg", 0) > 0.5 ? "bal" : "pend";
  const batEf = (u: number) => { const b0 = n("bat", 2.2, u); const rg = n("regu", 0, u); return reg === "bal" ? b0 / Math.sqrt(1 - 0.3 * rg) : b0; };
  let ui = 0;
  const N = 16;
  for (let i = 0; i < N; i++) ui += batEf((p * (i + 0.5)) / N);
  const u = 0.5 + ui * (p / N) * dur + batEf(p) * dt;
  const amp = n("amp", 1);
  const ustop = n("ustop", -1);
  const uE = ustop > 0 ? Math.min(u, ustop) : u;
  const aEf = reg === "pend" ? Math.max(amp, (TH_IMP_FRAC) * 1.04) : amp;
  const x = comando(reg, uE, aEf);
  const phi = phiDe(reg, x);
  const P = passos(reg, uE, aEf);
  const e0 = thE0(reg);
  const ref = deE(e0);
  const tt = t + dt;
  let ang: Angs;
  let turnsC = 0;
  if (n("livre", 0) > 0.5) {
    const dB = (n("queda", 0) * DROP) / R_DRUM;
    ang = deB(ref.B + dB);
  } else if (n("ff", 0) !== 0) {
    turnsC = C.int("ff", 0) + n("ff", 0) * dt;
    ang = deC(ref.C - 2 * Math.PI * turnsC);
  } else ang = deE(e0 + (P * Math.PI) / NE);
  const gS = n("gS", 0), gW = n("gW", 0);
  const kap = (NS / NFACE) * (NSWS / PCAN);
  const can = ang.C - 2 * Math.PI * kap * gS;
  const refCan = ref.C;
  const dirCM = dirp(POS.C, POS.M), dirMC = dirp(POS.M, POS.C);
  const M = eng(can, PCAN, NMIN, dirCM);
  const H = eng(M, PMIN, NHOR, dirMC);
  const refM = eng(refCan, PCAN, NMIN, dirCM);
  const refH = eng(refM, PMIN, NHOR, dirMC);
  const thSW = eng(M, NMIN, NSWS, dirp(POS.M, POS.SW));
  const xf = (F: number) => { const X2 = eng(F, NX1, NX2, dirp(POS.F, POS.X2)); return { X2, X3: eng(X2, NX2B, NX3, dirp(POS.X2, POS.C)) }; };
  const xs = xf(ang.F), xr = xf(ref.F);
  const chiW = 2 * Math.PI * gW, chiS = 2 * Math.PI * gS;
  const psiCW = Math.PI - ((NS / NFACE) * (chiW + Math.PI / 2) + Math.PI / NFACE);
  const psiSW = (NS / NFACE) * (chiS + Math.PI / 2) + Math.PI / NFACE;
  const thR = eng(psiCW, NCWS, NR, dirp(POS.CW, POS.B));
  const beta = A_BAL * amp * Math.sin(Math.PI * u);
  const thp = A_PEND * amp * Math.sin(Math.PI * u);
  const frac = (thR * NR) / (2 * Math.PI);
  const pawl = frac - Math.floor(frac);
  return { X2: xs.X2, X3: xs.X3, refX3: xr.X3, reg, ang, ref, can, refCan, M, H, refM, refH, thSW, u, uE, x, phi, thE: ang.E, beta, thp, amp, psiCW, psiSW, thR, chi: chiW + chiS, pawl, wFall: n("queda", 0), turnsC: turnsC + 0 * tt };
};
const TH_IMP_FRAC = 0.085 / 0.19;

const blurDe = (a0: number, a1: number, N: number) => clamp01((Math.abs(a1 - a0) / ((2 * Math.PI) / N) - 0.45) / 0.5);

/* ------------------------------ peças soltas ------------------------------ */
const OURO = "#d9a53a", COBRE = "#c47a3a", LATAO = "#e6c25a", ACO = "#aeb8c2", ACO_AZ = "#7f95aa";

const Contrate: React.FC<{ pos: P2; z: number; a: number; cor: string; op?: number }> = ({ pos, z, a, cor, op = 1 }) => (
  <group position={[pos[0], pos[1], z]} rotation={[0, 0, a]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[ANEL + 0.03, ANEL + 0.03, 0.04, 24]} /><meshStandardMaterial color={cor} metalness={0.6} roughness={0.3} transparent={op < 1} opacity={op} /></mesh>
    {Array.from({ length: NFACE }).map((_, i) => {
      const t = (i * 2 * Math.PI) / NFACE;
      return <mesh key={i} position={[Math.cos(t) * ANEL, Math.sin(t) * ANEL, 0.055]} rotation={[0, 0, t]}><boxGeometry args={[0.05, 0.036, 0.075]} /><meshStandardMaterial color={cor} metalness={0.6} roughness={0.3} /></mesh>;
    })}
  </group>
);

/* ------------------------------ o mecanismo ------------------------------ */
/** peça que entra "explodida": aparece longe, gira um pouco, desliza ao lugar e trava com um pequeno impacto */
const st = (k: number, i: number, n: number) => clamp01((k * (n + 1.4) - i) / 1.4);
const Voo: React.FC<{ k: number; d?: V; spin?: number; pos?: V; children?: React.ReactNode }> = ({ k, d = [0, 0.8, 3], spin = 0.7, pos = [0, 0, 0], children }) => {
  if (k <= 0.01) return null;
  const e = Math.min(1, k);
  const f = 1 - Math.pow(1 - e, 3);
  const r = 1 - f;
  const imp = e > 0.86 && e < 1 ? Math.sin((Math.PI * (e - 0.86)) / 0.14) : 0;
  const sc = lerp(0.55, 1, f) * (1 + 0.06 * imp);
  return <group position={[pos[0] + d[0] * r, pos[1] + d[1] * r, pos[2] + d[2] * r - 0.05 * imp]} rotation={[0, 0, spin * r]} scale={sc}>{children}</group>;
};

const Mov: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const E0 = estado(C, 0), E1 = estado(C, 1 / 30);
  const vis = (k: string) => n(k, 0);
  const placa = vis("placa"), trem = vis("trem"), fonte = vis("fonte"), esc = vis("esc"), anc = vis("anc"), ptC = vis("ptC"), ptE = vis("ptE"), dedo = vis("dedo"), setas = vis("setas"), pend = vis("pend"), bal = vis("bal"), regu = n("regu", 0), reguV = vis("reguV"), rub = vis("rub"), mw = vis("mw"), mostr = vis("mostr"), pont = vis("pont"), cor = vis("cor"), caixa = vis("caixa"), vidro = n("vidro", 0), pulseira = vis("pulseira");
  const mola = n("mola", 0), corda = n("corda", 0.5), incl = n("incl", 0), ms = n("ms", 1), puxa = n("puxa", 0);
  const gW = n("gW", 0), gS = n("gS", 0);
  const A = E0.ang, A1 = E1.ang;
  const blur = (k: keyof Angs, N: number) => blurDe(A[k], A1[k], N);
  const bE = blur("E", NE), bF = blur("F", N4), bT = blur("T", N3), bC = blur("C", NC), bB = blur("B", NB);
  const fadeB = (k: number) => 1 - clamp01(k);
  const Z = { B: 0.0, R: 0.14, C: 0.3, T: 0.46, F: 0.62, E: 0.78, bal: 0.95, mw1: 0.72, mw2: 0.8 };
  const tilt = incl * 1.28;
  const tipoE = E0.reg;
  const f = tEp; // tempo corrido do episódio (para brilhos)
  const pop = (k: number) => suave(clamp01(k));
  const weightY = Y_PESO0 - E0.wFall * DROP;
  const cordaTurnos = clamp01(corda);
  const nuvem = (n("nuv", 0));
  const tickRub = rub < 0.05 ? n("fagulha", 0) : 0;
  const hand = (cur: number, ref: number, ini: number) => -2 * Math.PI * ini + (cur - ref);
  const hmR = hand(E0.can, E0.refCan, n("hm", 0.1));
  const hhR = hand(E0.H, E0.refH, n("hh", 0.83));
  const hsR = hand(E0.X3, E0.refX3, n("hs", 0));
  const sxB = POS.B[0], syB = POS.B[1];
  const clutchX = lerp(POS.CW[0] - ANEL, POS.SW[0] + ANEL, puxa);
  const stemOut = SLIDE * puxa;
  const curva = (a: number) => a;
  void curva; void nuvem; void tickRub;
  const antiB = 1; // sentido do barrilete
  void antiB;
  const fi = E0.phi;
  const hairTw = E0.beta;
  const cutU = 1 - 0.3 * regu;
  // posição do balanço
  const W = POS.W;
  const rotAnc = fi;
  // pino de impulso (no referencial do balanço)
  const pinAng = PSI + Math.PI;
  return (
    <group position={[n("mx", 0), n("my", YC), n("mz", -0.3)]} rotation={[-tilt, n("rotY", 0), 0]} scale={ms}>
      {/* platina */}
      {placa > 0.02 && (
        <Voo k={placa} d={[0, 0, 5]} spin={0}>
          <mesh position={[0, 0, -0.14]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.52, 2.52, 0.1, 64]} /><meshStandardMaterial color="#3a444e" metalness={0.5} roughness={0.5} /></mesh>
          {Array.from({ length: 8 }).map((_, i) => { const a = (i / 8) * Math.PI * 2 + 0.2; return <Voo key={i} k={clamp01(placa * 2 - 1 - i * 0.08)} d={[0, 0, 2.5]} spin={2}><mesh position={[Math.cos(a) * 2.3, Math.sin(a) * 2.3, -0.06]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.08, 10]} /><meshStandardMaterial color="#cfd6dc" metalness={0.8} roughness={0.25} /></mesh></Voo>; })}
        </Voo>
      )}
      {/* fonte de força: tambor com corda e peso */}
      {fonte * (1 - mola) > 0.02 && (
        <Voo k={fonte * (1 - mola)} d={[-3, 2, 4]} spin={0.5}>
          <group position={[sxB, syB, 0]} rotation={[0, 0, A.B]}>
            <Roda N={NB} r={rz(NB)} a={0} pos={[0, 0]} z={Z.B} cor={ACO} tipo="anel" blur={bB} esp={0.1} />
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[R_DRUM, R_DRUM, 0.24, 28]} /><meshStandardMaterial color="#8a6a46" roughness={0.8} /></mesh>
            {Array.from({ length: 6 }).map((_, i) => <mesh key={i} rotation={[Math.PI / 2, 0, (i / 6) * Math.PI * 2]} position={[0, 0, 0]}><boxGeometry args={[0.04, R_DRUM * 2.02, 0.26]} /><meshStandardMaterial color="#5a4328" roughness={0.9} /></mesh>)}
            <group position={[0, 0, 0.2]}>
              <Barra a={[0, 0]} b={[0.62, -0.18]} w={0.07} z={0} cor="#c9a14a" esp={0.06} met={0.6} />
              <mesh position={[0.62, -0.18, 0.06]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.16, 12]} /><meshStandardMaterial color="#e5473a" /></mesh>
            </group>
          </group>
          <Eixo pos={[sxB, syB]} z0={-0.12} z1={0.2} r={0.04} />
          <Liga a={[sxB - R_DRUM, syB, 0.0]} b={[sxB - R_DRUM, weightY + 0.62, 0.0]} w={0.035} cil cor="#d9c9a0" />
          <group position={[sxB - R_DRUM, weightY, 0]}>
            <Caixa p={[0, 0, 0]} t={[0.62, 0.9, 0.34]} cor="#5d6670" met={0.5} rug={0.5} raio={0.05} />
            <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.07, 0.022, 8, 14]} /><meshStandardMaterial color="#c9a14a" metalness={0.7} roughness={0.3} /></mesh>
          </group>
        </Voo>
      )}
      {/* fonte de força: barrilete com a mola real e a catraca */}
      {fonte * mola > 0.02 && (
        <Voo k={fonte * mola} d={[3, 2, 4]} spin={-0.5}>
          <group position={[sxB, syB, 0]}>
            <group rotation={[0, 0, A.B]}>
              <Roda N={NB} r={rz(NB)} a={0} pos={[0, 0]} z={Z.B} cor={LATAO} tipo="anel" blur={bB} esp={0.12} />
              <mesh position={[0, 0, -0.07]}><circleGeometry args={[rz(NB) - 0.07, 40]} /><meshStandardMaterial color="#2d343b" metalness={0.4} roughness={0.6} transparent opacity={0.7} /></mesh>
            </group>
            <group rotation={[0, 0, E0.thR + 0 * A.B]}>
              <Espiral r0={0.09 + 0.3 * (1 - cordaTurnos)} r1={rz(NB) - 0.1} voltas={6} z={0.0} cor="#aab9c6" w={0.016} pot={0.55 + 1.1 * cordaTurnos} twist={0} />
            </group>
          </group>
          <Eixo pos={[sxB, syB]} z0={-0.1} z1={0.26} r={0.045} />
          <Roda N={NR} r={rz(NR)} a={E0.thR} pos={[sxB, syB]} z={Z.R} cor={ACO} tipo="t" raios={5} esp={0.05} />
          {/* gatilho (click) da catraca */}
          <group position={[sxB - 0.08, syB + 0.62, Z.R]} rotation={[0, 0, -0.5 + 0.12 * E0.pawl]}>
            <Barra a={[0, 0]} b={[0.34, -0.12]} w={0.05} z={0} cor="#cfd6dc" esp={0.05} />
          </group>
        </Voo>
      )}
      {/* trem de engrenagens */}
      {trem > 0.02 && (
        <group scale={pop(trem)}>
          <Roda N={PC} r={rz(PC)} a={A.C} pos={POS.C} z={Z.B} cor={ACO} esp={0.1} blur={bC} />
          <Roda N={NC} r={rz(NC)} a={A.C} pos={POS.C} z={Z.C} cor={OURO} raios={4} blur={bC} />
          <Eixo pos={POS.C} z0={-0.1} z1={0.4} r={0.035} />
          <Roda N={P3} r={rz(P3)} a={A.T} pos={POS.T} z={Z.C} cor={ACO} esp={0.1} blur={bT} />
          <Roda N={N3} r={rz(N3)} a={A.T} pos={POS.T} z={Z.T} cor={COBRE} raios={4} blur={bT} />
          <Eixo pos={POS.T} z0={-0.1} z1={0.55} r={0.03} />
          <Roda N={P4} r={rz(P4)} a={A.F} pos={POS.F} z={Z.T} cor={ACO} esp={0.1} blur={bF} />
          <Roda N={N4} r={rz(N4)} a={A.F} pos={POS.F} z={Z.F} cor={LATAO} raios={5} blur={bF} />
          <Eixo pos={POS.F} z0={-0.1} z1={0.72} r={0.03} />
          <Roda N={P5} r={rz(P5)} a={A.E} pos={POS.E} z={Z.F} cor={ACO} esp={0.1} blur={bE} />
          <Eixo pos={POS.E} z0={-0.1} z1={Z.E + 0.1} r={0.025} />
        </group>
      )}
      {/* escape: roda de dentes + âncora */}
      {esc > 0.02 && (
        <Voo k={esc} d={[-3, -1, 4]} spin={0.8}>
          <Roda N={NE} r={RE} a={A.E} pos={POS.E} z={Z.E} cor={ACO} tipo="e" raios={0} esp={0.06} blur={bE} />
          <mesh position={[POS.E[0], POS.E[1], Z.E]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.06, 18]} /><meshStandardMaterial color={ACO} metalness={0.7} roughness={0.3} /></mesh>
        </Voo>
      )}
      {anc > 0.02 && (
        <Voo k={anc} pos={[POS.A[0], POS.A[1], Z.E]} d={[-2, 1.5, 4]} spin={-0.8}>
          <group position={[0, 0, 0]} scale={1}>
            <group rotation={[0, 0, rotAnc]}>
              {PAL0.map((pp, i) => {
                const rel: P2 = [pp[0] - POS.A[0], pp[1] - POS.A[1]];
                const a = i === 0 ? PSI + DELTA : PSI - DELTA;
                return (
                  <group key={i}>
                    <Barra a={[0, 0]} b={rel} w={0.06} z={0} cor={ACO_AZ} esp={0.06} met={0.7} />
                    <mesh position={[rel[0], rel[1], 0]} rotation={[0, 0, a]}><boxGeometry args={[0.09, 0.07, 0.07]} /><meshStandardMaterial color="#e5173f" emissive="#8a0018" emissiveIntensity={0.7} metalness={0.2} roughness={0.2} /></mesh>
                  </group>
                );
              })}
              {/* cauda e garfo */}
              <Barra a={[0, 0]} b={[Math.cos(PSI) * (LF - 0.19), Math.sin(PSI) * (LF - 0.19)]} w={0.05} z={0} cor={ACO_AZ} esp={0.05} met={0.7} />
              {[1, -1].map((s) => {
                const c = Math.cos(PSI), sn = Math.sin(PSI);
                const a0: P2 = [c * (LF - 0.2) - sn * 0.055 * s, sn * (LF - 0.2) + c * 0.055 * s];
                const b0: P2 = [c * (LF - 0.07) - sn * 0.055 * s, sn * (LF - 0.07) + c * 0.055 * s];
                return <Barra key={s} a={a0} b={b0} w={0.025} z={0} cor={ACO_AZ} esp={0.05} met={0.7} />;
              })}
              <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 0.07, 16]} /><meshStandardMaterial color={ACO_AZ} metalness={0.7} roughness={0.3} /></mesh>
            </group>
          </group>
          {/* pinos de limite (banking) */}
          {[1, -1].map((s) => { const c = Math.cos(PSI), sn = Math.sin(PSI); const d = 0.4, off = (ALFA * d + 0.055) * s; return <mesh key={s} position={[c * d - sn * off, sn * d + c * off, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.022, 0.022, 0.1, 8]} /><meshStandardMaterial color="#e6c25a" metalness={0.8} roughness={0.25} /></mesh>; })}
        </Voo>
      )}
      {/* pêndulo: preso à âncora por uma forquilha (a guia) */}
      {pend > 0.02 && (
        <Voo k={pend} pos={[POS.A[0], POS.A[1], 0]} d={[-2, 2, 4]} spin={0.4}>
          <Eixo pos={[0, 0]} z0={-0.1} z1={Z.E + 0.08} r={0.03} />
          <group position={[0, 0, -0.06]} rotation={[0, 0, E0.thp]}>
            <Liga a={[0, 0.1, 0]} b={[0, -1.3, 0]} w={0.05} cil cor="#cfd6dc" />
            <Liga a={[0, -1.3, 0]} b={[0, -L_P, 0]} w={0.05} cil cor="#cfd6dc" />
            <group position={[0, -L_P, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.38, 0.38, 0.14, 32]} /><meshStandardMaterial color={OURO} metalness={0.6} roughness={0.3} /></mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.08]}><cylinderGeometry args={[0.2, 0.2, 0.02, 24]} /><meshStandardMaterial color="#f1d37a" metalness={0.6} roughness={0.3} /></mesh>
            </group>
            <mesh position={[0, -0.9, 0.03]}><torusGeometry args={[0.1, 0.02, 8, 18]} /><meshStandardMaterial color={ACO} metalness={0.7} roughness={0.3} /></mesh>
          </group>
          <group position={[0, 0, Z.E - 0.1]} rotation={[0, 0, fi]}>
            <Liga a={[0, 0, 0]} b={[0, -0.9, 0]} w={0.035} e={0.05} cor={ACO_AZ} />
          </group>
        </Voo>
      )}
      {/* roda de balanço com a espiral */}
      {bal > 0.02 && (
        <Voo k={bal} d={[-3, 3, 4]} spin={1.0}>
          <group position={[W[0], W[1], Z.bal]}>
            <group rotation={[0, 0, E0.beta]}>
              <mesh><torusGeometry args={[0.58, 0.04, 8, 48]} /><meshStandardMaterial color={OURO} metalness={0.6} roughness={0.3} /></mesh>
              {[0, 1, 2].map((i) => <Barra key={i} a={[0, 0]} b={[Math.cos(i * 2.094 + 0.3) * 0.58, Math.sin(i * 2.094 + 0.3) * 0.58]} w={0.05} z={0} cor={OURO} esp={0.045} />)}
              {Array.from({ length: 6 }).map((_, i) => <mesh key={i} position={[Math.cos(i * 1.047) * 0.58, Math.sin(i * 1.047) * 0.58, 0]}><sphereGeometry args={[0.045, 10, 8]} /><meshStandardMaterial color="#f1d37a" metalness={0.8} roughness={0.2} /></mesh>)}
            </group>
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.12, 14]} /><meshStandardMaterial color={ACO} metalness={0.8} roughness={0.2} /></mesh>
          </group>
          {/* rolete e pino de impulso, no plano do garfo */}
          <group position={[W[0], W[1], Z.E]} rotation={[0, 0, E0.beta]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.13, 0.13, 0.05, 24]} /><meshStandardMaterial color={ACO} metalness={0.7} roughness={0.3} /></mesh>
            <mesh position={[Math.cos(pinAng) * RPIN, Math.sin(pinAng) * RPIN, 0.01]}><boxGeometry args={[0.045, 0.045, 0.07]} /><meshStandardMaterial color="#e5173f" emissive="#8a0018" emissiveIntensity={0.7} /></mesh>
          </group>
          <group position={[W[0], W[1], Z.bal - 0.07]}>
            <Espiral r0={0.07} r1={0.5} voltas={5} twist={E0.beta * 0.9} corte={cutU} z={0} cor="#9fdcff" w={0.011} />
            {/* pino de entrada da espiral */}
            <mesh position={[0.5, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.1, 8]} /><meshStandardMaterial color="#e6c25a" metalness={0.8} /></mesh>
          </group>
          {/* regulador: raquete com os pinos que encurtam a espiral */}
          {reguV > 0.02 && (() => {
            const uC = cutU;
            const a = 0 + uC * 5 * Math.PI * 2;
            const r = 0.07 + (0.5 - 0.07) * uC;
            const px = W[0] + Math.cos(a) * r, py = W[1] + Math.sin(a) * r;
            const baseA = Math.atan2(py - W[1], px - W[0]);
            return (
              <Voo k={reguV} d={[-2, 2, 3]} spin={0.6}>
                <Barra a={[px, py]} b={[W[0] + Math.cos(baseA) * 0.78, W[1] + Math.sin(baseA) * 0.78]} w={0.04} z={Z.bal - 0.04} cor="#ff8a2a" esp={0.04} />
                <mesh position={[px, py, Z.bal - 0.07]}><cylinderGeometry args={[0.03, 0.03, 0.1, 8]} /><meshStandardMaterial color="#ff8a2a" metalness={0.5} /></mesh>
                <mesh position={[W[0] + Math.cos(baseA) * 0.78, W[1] + Math.sin(baseA) * 0.78, Z.bal - 0.05]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.05, 14]} /><meshStandardMaterial color="#ff8a2a" metalness={0.5} /></mesh>
              </Voo>
            );
          })()}
        </Voo>
      )}
      {/* ponteiros de teste: um no eixo da central, outro no do escape (avança um passo a cada tique) */}
      {ptC > 0.02 && <Voo k={ptC} d={[0, 0, 4]} spin={1}><Ponteiro rot={A.C - E0.ref.C} len={1.5} w={0.07} tail={0.2} z={0.92} cor="#ff8a2a" pos={POS.C} /><mesh position={[POS.C[0], POS.C[1], 0.92]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, 0.06, 14]} /><meshStandardMaterial color="#ff8a2a" metalness={0.5} /></mesh></Voo>}
      {ptE > 0.02 && bE < 0.7 && <Voo k={ptE} d={[0, 0, 4]} spin={1}><Ponteiro rot={A.E - E0.ref.E + 1.1} len={0.62} w={0.045} tail={0.1} z={0.9} cor="#ff8a2a" pos={POS.E} /></Voo>}
      {/* dedo que empurra a âncora */}
      {dedo > 0.02 && (() => {
        const c = Math.cos(PSI + fi), sn = Math.sin(PSI + fi);
        const tip: P2 = [POS.A[0] + c * (LF - 0.3), POS.A[1] + sn * (LF - 0.3)];
        const push = fi > 0 ? 1 : -1;
        const from: P2 = [tip[0] + push * 0.55 * 0, tip[1]];
        void from;
        const side = fi >= 0 ? -1 : 1; // o dedo fica do lado para onde a ponta vai
        const base: P2 = [tip[0] + side * 0.16 + side * 0.9, tip[1] - 0.05];
        return (
          <group scale={dedo} position={[0, 0, Z.E]}>
            <Liga a={[base[0] + side * 0.3, base[1], 0]} b={[tip[0] + side * 0.08, tip[1], 0]} w={0.15} cil cor="#c98f63" />
            <mesh position={[tip[0] + side * 0.08, tip[1], 0]}><sphereGeometry args={[0.075, 12, 10]} /><meshStandardMaterial color="#c98f63" roughness={0.7} /></mesh>
          </group>
        );
      })()}
      {/* setas laranja: a energia sai do peso, passa pelo trem e pelo escape e volta ao pêndulo a cada balanço */}
      {setas > 0.02 && (() => {
        const imp = clamp01(1.6 - 1.6 * Math.abs(E0.x));
        const pulso = (i: number) => clamp01(0.25 + 0.75 * Math.max(0, Math.sin((f * 3.0 - i * 0.55) * Math.PI)) ** 2) * setas;
        const S: [V, V][] = [
          [[POS.B[0] - R_DRUM - 0.5, weightY + 1.0, 0.25], [POS.B[0] - R_DRUM - 0.5, weightY + 1.9, 0.25]],
          [[POS.B[0] - 0.1, POS.B[1] - 0.25, 0.95], [POS.C[0] + 0.25, POS.C[1] + 0.35, 0.95]],
          [[POS.C[0] - 0.45, POS.C[1] - 0.3, 0.95], [POS.T[0] + 0.1, POS.T[1] + 0.35, 0.95]],
          [[POS.T[0] + 0.3, POS.T[1] - 0.5, 0.95], [POS.F[0] - 0.35, POS.F[1] + 0.3, 0.95]],
          [[POS.F[0] - 0.55, POS.F[1] - 0.25, 0.95], [POS.E[0] + 0.2, POS.E[1] + 0.25, 0.95]],
          [[POS.E[0] + 0.1, POS.E[1] + 0.2, 0.95], [POS.A[0] - 0.05, POS.A[1] - 0.05, 0.95]],
        ];
        return (
          <group>
            {S.map(([a, b], i) => <Seta key={i} a={a} b={b} cor="#ff8a2a" w={0.07} op={pulso(i)} />)}
            <Seta a={[POS.A[0] + 0.1, POS.A[1] - 1.2, 0.1]} b={[POS.A[0] + 0.1 + 0.6 * Math.sign(E0.thp || 1), POS.A[1] - 1.2, 0.1]} cor="#ff8a2a" w={0.08} op={clamp01(0.25 + 0.75 * imp) * setas} />
          </group>
        );
      })()}
      {/* marcador de atraso (regulador): a barra vermelha some quando o tempo é acertado */}
      {n("marc", 0) > 0.5 && (
        <group position={[POS.W[0] - 0.1, POS.W[1] + 1.05, 1.1]}>
          <Caixa p={[0, 0, 0]} t={[1.3, 0.12, 0.04]} cor="#2c3640" raio={0.02} />
          <Caixa p={[-0.65 + 0.6 * (1 - regu), 0, 0.03]} t={[Math.max(0.02, 1.2 * (1 - regu)), 0.08, 0.03]} cor={regu > 0.9 ? "#37c26a" : "#ff4d4d"} raio={0.01} />
          <Texto3D texto={regu > 0.9 ? "NO PONTO" : "ATRASO"} p={[0, 0.28, 0.1]} h={0.22} cor={regu > 0.9 ? "#8ff0a8" : "#ff9a9a"} />
        </group>
      )}
      {/* rubis */}
      {rub > 0.02 && (
        <group>
          {([[POS.T, Z.T], [POS.F, Z.F], [POS.E, Z.E], [POS.A, Z.E], [POS.W, Z.bal], [[POS.B[0], POS.B[1]] as P2, Z.R]] as [P2, number][]).map(([pp, zz], i) => <Voo key={i} k={st(rub, i, 6)} d={[(i % 2 ? 1 : -1) * 1.2, 1.5, 3.5]} spin={2.5}><Rubi pos={pp} z={zz + 0.06} k={1} /></Voo>)}
        </group>
      )}
      {/* fagulhas de atrito nos eixos (antes dos rubis) */}
      {n("fagulha", 0) > 0.02 && (
        <group>
          {([POS.T, POS.F, POS.E, POS.A, POS.W, POS.C] as P2[]).map((pp, i) => (
            <group key={i}>
              {[0, 1, 2].map((j) => {
                const ph = (f * 6 + i * 0.37 + j * 0.31) % 1;
                const aa = i * 2.1 + j * 2.4 + Math.floor(f * 6 + i) * 1.3;
                const on = ph < 0.55 ? 1 : 0;
                return <mesh key={j} position={[pp[0] + Math.cos(aa) * ph * 0.22, pp[1] + Math.sin(aa) * ph * 0.22, 0.95]} scale={n("fagulha", 0) * on * (1 - ph)}><sphereGeometry args={[0.035, 6, 5]} /><meshBasicMaterial color={j === 0 ? "#ffd23f" : "#ff8a2a"} /></mesh>;
              })}
            </group>
          ))}
        </group>
      )}
      {/* minuteria: canhão → roda dos minutos → roda das horas (12 : 1) */}
      {mw > 0.02 && (
        <group>
          <Voo k={st(mw, 0, 6)} d={[2, 0, 3]}><Roda N={PCAN} r={rz(PCAN)} a={E0.can} pos={POS.C} z={Z.mw1} cor={ACO} esp={0.07} /></Voo>
          <Voo k={st(mw, 1, 6)} d={[3, -2, 3]}><Roda N={NMIN} r={rz(NMIN)} a={E0.M} pos={POS.M} z={Z.mw1} cor={ACO_AZ} raios={4} /><Roda N={PMIN} r={rz(PMIN)} a={E0.M} pos={POS.M} z={Z.mw2} cor={ACO} esp={0.07} /><Eixo pos={POS.M} z0={Z.mw1 - 0.06} z1={Z.mw2 + 0.06} r={0.03} /></Voo>
          <Voo k={st(mw, 2, 6)} d={[-2, 2, 3]}><Roda N={NHOR} r={rz(NHOR)} a={E0.H} pos={POS.C} z={Z.mw2} cor={COBRE} raios={4} /></Voo>
          <Voo k={st(mw, 3, 6)} d={[0, -3, 3]}><Roda N={NX1} r={rz(NX1)} a={A.F} pos={POS.F} z={0.88} cor={LATAO} esp={0.06} /></Voo>
          <Voo k={st(mw, 4, 6)} d={[-3, -2, 3]}><Roda N={NX2} r={rz(NX2)} a={E0.X2} pos={POS.X2} z={0.88} cor={ACO} esp={0.06} /><Roda N={NX2B} r={rz(NX2B)} a={E0.X2} pos={POS.X2} z={0.96} cor={ACO} esp={0.06} /><Eixo pos={POS.X2} z0={0.82} z1={1.0} r={0.025} /></Voo>
          <Voo k={st(mw, 5, 6)} d={[0, 3, 3]}><Roda N={NX3} r={rz(NX3)} a={E0.X3} pos={POS.C} z={0.96} cor={ACO_AZ} esp={0.06} raios={3} /></Voo>
          <Eixo pos={POS.C} z0={-0.1} z1={1.55} r={0.04} />
          <Eixo pos={POS.F} z0={0.6} z1={0.94} r={0.03} />
        </group>
      )}
      {/* coroa: haste, pinhão deslizante, rodas de corda e de acerto */}
      {cor > 0.02 && (
        <Voo k={cor} d={[3, 0, 3]} spin={0}>
          {/* roda de coroa (externa): corda; dentes de face + engrenagem que liga à catraca */}
          <Roda N={NCWS} r={rz(NCWS)} a={E0.psiCW} pos={POS.CW} z={Z.R} cor={COBRE} esp={0.05} />
          <Eixo pos={POS.CW} z0={Z.R} z1={0.78} r={0.03} />
          <Contrate pos={POS.CW} z={0.72} a={E0.psiCW} cor={COBRE} />
          {/* roda de acerto (interna): liga à roda dos minutos */}
          <Roda N={NSWS} r={rz(NSWS)} a={E0.thSW} pos={POS.SW} z={Z.mw1} cor={ACO_AZ} esp={0.05} />
          <Contrate pos={POS.SW} z={0.72} a={E0.psiSW} cor={ACO_AZ} />
          {/* haste */}
          <group position={[0, 0, 0.955]}>
            <Liga a={[POS.SW[0] - 0.1 + stemOut, 0, 0]} b={[3.0 + stemOut, 0, 0]} w={0.06} cil cor="#d9dee3" />
            <mesh position={[POS.SW[0] + 0.3 + stemOut, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.095, 0.095, 0.1, 14]} /><meshStandardMaterial color={ACO} metalness={0.8} roughness={0.25} /></mesh>
            {/* pinhão deslizante (embreagem): gira com a haste, anda ao contrário dela */}
            <group position={[clutchX, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <Roda N={NS} r={rz(NS)} a={E0.chi + Math.PI / 2} pos={[0, 0]} z={0} cor="#ff8a2a" esp={0.13} />
            </group>
            <mesh position={[clutchX + 0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.08, 12]} /><meshStandardMaterial color="#ff8a2a" metalness={0.6} roughness={0.3} /></mesh>
            {/* alavanca (yoke): a haste sai, o pinhão entra */}
            {(() => {
              const xp = POS.CW[0] + 0.1;
              const th = Math.asin(clamp01((SLIDE * puxa) / 0.28));
              const top: P2 = [xp - 0.28 * Math.sin(th), 0.28 * Math.cos(th)];
              const bot: P2 = [xp + 0.28 * Math.sin(th), -0.28 * Math.cos(th)];
              const colX = 2.0 + stemOut;
              return (
                <group position={[0, 0, -0.07]}>
                  <Barra a={top} b={bot} w={0.045} z={0} cor="#37c26a" esp={0.045} />
                  <Barra a={top} b={[clutchX + 0.05, 0.075]} w={0.03} z={0} cor="#37c26a" esp={0.04} />
                  <Barra a={bot} b={[colX, -0.075]} w={0.03} z={0} cor="#37c26a" esp={0.04} />
                  <mesh position={[xp, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.06, 12]} /><meshStandardMaterial color="#e6c25a" metalness={0.8} /></mesh>
                  <mesh position={[colX, 0, 0.07]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.06, 14]} /><meshStandardMaterial color="#37c26a" metalness={0.4} /></mesh>
                </group>
              );
            })()}
            {/* coroa (botão) */}
            <group position={[3.0 + stemOut, 0, 0]} rotation={[E0.chi, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.24, 0.24, 0.3, 28]} /><meshStandardMaterial color="#e6c25a" metalness={0.75} roughness={0.28} /></mesh>
              {Array.from({ length: 16 }).map((_, i) => { const a = (i / 16) * Math.PI * 2; return <mesh key={i} position={[0, Math.cos(a) * 0.245, Math.sin(a) * 0.245]} rotation={[a, 0, 0]}><boxGeometry args={[0.3, 0.035, 0.05]} /><meshStandardMaterial color="#c9a02e" metalness={0.8} roughness={0.3} /></mesh>; })}
            </group>
          </group>
        </Voo>
      )}
      {/* mostrador, em vidro fumê para ver as engrenagens */}
      {mostr > 0.02 && (
        <Voo k={mostr} d={[0, 0, 5]} spin={0}>
          <mesh position={[0, 0, 1.45]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.42, 2.42, 0.03, 64]} /><meshStandardMaterial color="#26323d" metalness={0.2} roughness={0.5} transparent opacity={n("mostrOp", 0.3)} depthWrite={false} /></mesh>
          {Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2; return <Caixa key={i} p={[Math.sin(a) * 2.12, Math.cos(a) * 2.12, 1.47]} t={[i % 3 === 0 ? 0.11 : 0.07, i % 3 === 0 ? 0.34 : 0.22, 0.03]} cor="#f4f1ea" r={[0, 0, -a]} raio={0.01} />; })}
          {Array.from({ length: 60 }).map((_, i) => { const a = (i / 60) * Math.PI * 2; return i % 5 ? <mesh key={i} position={[Math.sin(a) * 2.33, Math.cos(a) * 2.33, 1.47]} rotation={[0, 0, -a]}><boxGeometry args={[0.02, 0.07, 0.02]} /><meshBasicMaterial color="#cfd6dc" /></mesh> : null; })}
        </Voo>
      )}
      {/* ponteiros de teste: um no eixo da central, outro no do escape (avança um passo a cada tique) */}
      {ptC > 0.02 && <Voo k={ptC} d={[0, 0, 4]} spin={1}><Ponteiro rot={A.C - E0.ref.C} len={1.5} w={0.07} tail={0.2} z={0.92} cor="#ff8a2a" pos={POS.C} /><mesh position={[POS.C[0], POS.C[1], 0.92]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, 0.06, 14]} /><meshStandardMaterial color="#ff8a2a" metalness={0.5} /></mesh></Voo>}
      {ptE > 0.02 && bE < 0.7 && <Voo k={ptE} d={[0, 0, 4]} spin={1}><Ponteiro rot={A.E - E0.ref.E + 1.1} len={0.62} w={0.045} tail={0.1} z={0.9} cor="#ff8a2a" pos={POS.E} /></Voo>}
      {/* dedo que empurra a âncora */}
      {dedo > 0.02 && (() => {
        const c = Math.cos(PSI + fi), sn = Math.sin(PSI + fi);
        const tip: P2 = [POS.A[0] + c * (LF - 0.3), POS.A[1] + sn * (LF - 0.3)];
        const push = fi > 0 ? 1 : -1;
        const from: P2 = [tip[0] + push * 0.55 * 0, tip[1]];
        void from;
        const side = fi >= 0 ? -1 : 1; // o dedo fica do lado para onde a ponta vai
        const base: P2 = [tip[0] + side * 0.16 + side * 0.9, tip[1] - 0.05];
        return (
          <group scale={dedo} position={[0, 0, Z.E]}>
            <Liga a={[base[0] + side * 0.3, base[1], 0]} b={[tip[0] + side * 0.08, tip[1], 0]} w={0.15} cil cor="#c98f63" />
            <mesh position={[tip[0] + side * 0.08, tip[1], 0]}><sphereGeometry args={[0.075, 12, 10]} /><meshStandardMaterial color="#c98f63" roughness={0.7} /></mesh>
          </group>
        );
      })()}
      {/* setas laranja: a energia sai do peso, passa pelo trem e pelo escape e volta ao pêndulo a cada balanço */}
      {setas > 0.02 && (() => {
        const imp = clamp01(1.6 - 1.6 * Math.abs(E0.x));
        const pulso = (i: number) => clamp01(0.25 + 0.75 * Math.max(0, Math.sin((f * 3.0 - i * 0.55) * Math.PI)) ** 2) * setas;
        const S: [V, V][] = [
          [[POS.B[0] - R_DRUM - 0.5, weightY + 1.0, 0.25], [POS.B[0] - R_DRUM - 0.5, weightY + 1.9, 0.25]],
          [[POS.B[0] - 0.1, POS.B[1] - 0.25, 0.95], [POS.C[0] + 0.25, POS.C[1] + 0.35, 0.95]],
          [[POS.C[0] - 0.45, POS.C[1] - 0.3, 0.95], [POS.T[0] + 0.1, POS.T[1] + 0.35, 0.95]],
          [[POS.T[0] + 0.3, POS.T[1] - 0.5, 0.95], [POS.F[0] - 0.35, POS.F[1] + 0.3, 0.95]],
          [[POS.F[0] - 0.55, POS.F[1] - 0.25, 0.95], [POS.E[0] + 0.2, POS.E[1] + 0.25, 0.95]],
          [[POS.E[0] + 0.1, POS.E[1] + 0.2, 0.95], [POS.A[0] - 0.05, POS.A[1] - 0.05, 0.95]],
        ];
        return (
          <group>
            {S.map(([a, b], i) => <Seta key={i} a={a} b={b} cor="#ff8a2a" w={0.07} op={pulso(i)} />)}
            <Seta a={[POS.A[0] + 0.1, POS.A[1] - 1.2, 0.1]} b={[POS.A[0] + 0.1 + 0.6 * Math.sign(E0.thp || 1), POS.A[1] - 1.2, 0.1]} cor="#ff8a2a" w={0.08} op={clamp01(0.25 + 0.75 * imp) * setas} />
          </group>
        );
      })()}
      {/* rubis */}
      {rub > 0.02 && (
        <group>
          {([[POS.T, Z.T], [POS.F, Z.F], [POS.E, Z.E], [POS.A, Z.E], [POS.W, Z.bal], [[POS.B[0], POS.B[1]] as P2, Z.R]] as [P2, number][]).map(([pp, zz], i) => <Voo key={i} k={st(rub, i, 6)} d={[(i % 2 ? 1 : -1) * 1.2, 1.5, 3.5]} spin={2.5}><Rubi pos={pp} z={zz + 0.06} k={1} /></Voo>)}
        </group>
      )}
      {/* fagulhas de atrito nos eixos (antes dos rubis) */}
      {n("fagulha", 0) > 0.02 && (
        <group>
          {([POS.T, POS.F, POS.E, POS.A, POS.W, POS.C] as P2[]).map((pp, i) => (
            <group key={i}>
              {[0, 1, 2].map((j) => {
                const ph = (f * 6 + i * 0.37 + j * 0.31) % 1;
                const aa = i * 2.1 + j * 2.4 + Math.floor(f * 6 + i) * 1.3;
                const on = ph < 0.55 ? 1 : 0;
                return <mesh key={j} position={[pp[0] + Math.cos(aa) * ph * 0.22, pp[1] + Math.sin(aa) * ph * 0.22, 0.95]} scale={n("fagulha", 0) * on * (1 - ph)}><sphereGeometry args={[0.035, 6, 5]} /><meshBasicMaterial color={j === 0 ? "#ffd23f" : "#ff8a2a"} /></mesh>;
              })}
            </group>
          ))}
        </group>
      )}
      {/* minuteria: canhão → roda dos minutos → roda das horas (12 : 1) */}
      {mw > 0.02 && (
        <group scale={pop(mw)}>
          <Roda N={PCAN} r={rz(PCAN)} a={E0.can} pos={POS.C} z={Z.mw1} cor={ACO} esp={0.07} />
          <Roda N={NMIN} r={rz(NMIN)} a={E0.M} pos={POS.M} z={Z.mw1} cor={ACO_AZ} raios={4} />
          <Roda N={PMIN} r={rz(PMIN)} a={E0.M} pos={POS.M} z={Z.mw2} cor={ACO} esp={0.07} />
          <Eixo pos={POS.M} z0={Z.mw1 - 0.06} z1={Z.mw2 + 0.06} r={0.03} />
          <Roda N={NHOR} r={rz(NHOR)} a={E0.H} pos={POS.C} z={Z.mw2} cor={COBRE} raios={4} />
          <Eixo pos={POS.C} z0={-0.1} z1={1.55} r={0.04} />
        </group>
      )}
      {/* coroa: haste, pinhão deslizante, rodas de corda e de acerto */}
      {cor > 0.02 && (
        <Voo k={cor} d={[3, 0, 3]} spin={0}>
          {/* roda de coroa (externa): corda; dentes de face + engrenagem que liga à catraca */}
          <Roda N={NCWS} r={rz(NCWS)} a={E0.psiCW} pos={POS.CW} z={Z.R} cor={COBRE} esp={0.05} />
          <Eixo pos={POS.CW} z0={Z.R} z1={0.78} r={0.03} />
          <Contrate pos={POS.CW} z={0.72} a={E0.psiCW} cor={COBRE} />
          {/* roda de acerto (interna): liga à roda dos minutos */}
          <Roda N={NSWS} r={rz(NSWS)} a={E0.thSW} pos={POS.SW} z={Z.mw1} cor={ACO_AZ} esp={0.05} />
          <Contrate pos={POS.SW} z={0.72} a={E0.psiSW} cor={ACO_AZ} />
          {/* haste */}
          <group position={[0, 0, 0.955]}>
            <Liga a={[POS.SW[0] - 0.1 + stemOut, 0, 0]} b={[3.0 + stemOut, 0, 0]} w={0.06} cil cor="#d9dee3" />
            <mesh position={[POS.SW[0] + 0.3 + stemOut, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.095, 0.095, 0.1, 14]} /><meshStandardMaterial color={ACO} metalness={0.8} roughness={0.25} /></mesh>
            {/* pinhão deslizante (embreagem): gira com a haste, anda ao contrário dela */}
            <group position={[clutchX, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <Roda N={NS} r={rz(NS)} a={E0.chi + Math.PI / 2} pos={[0, 0]} z={0} cor="#ff8a2a" esp={0.13} />
            </group>
            <mesh position={[clutchX + 0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.08, 12]} /><meshStandardMaterial color="#ff8a2a" metalness={0.6} roughness={0.3} /></mesh>
            {/* alavanca (yoke): a haste sai, o pinhão entra */}
            {(() => {
              const xp = POS.CW[0] + 0.1;
              const th = Math.asin(clamp01((SLIDE * puxa) / 0.28));
              const top: P2 = [xp - 0.28 * Math.sin(th), 0.28 * Math.cos(th)];
              const bot: P2 = [xp + 0.28 * Math.sin(th), -0.28 * Math.cos(th)];
              const colX = 2.0 + stemOut;
              return (
                <group position={[0, 0, -0.07]}>
                  <Barra a={top} b={bot} w={0.045} z={0} cor="#37c26a" esp={0.045} />
                  <Barra a={top} b={[clutchX + 0.05, 0.075]} w={0.03} z={0} cor="#37c26a" esp={0.04} />
                  <Barra a={bot} b={[colX, -0.075]} w={0.03} z={0} cor="#37c26a" esp={0.04} />
                  <mesh position={[xp, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.06, 12]} /><meshStandardMaterial color="#e6c25a" metalness={0.8} /></mesh>
                  <mesh position={[colX, 0, 0.07]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.06, 14]} /><meshStandardMaterial color="#37c26a" metalness={0.4} /></mesh>
                </group>
              );
            })()}
            {/* coroa (botão) */}
            <group position={[3.0 + stemOut, 0, 0]} rotation={[E0.chi, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.24, 0.24, 0.3, 28]} /><meshStandardMaterial color="#e6c25a" metalness={0.75} roughness={0.28} /></mesh>
              {Array.from({ length: 16 }).map((_, i) => { const a = (i / 16) * Math.PI * 2; return <mesh key={i} position={[0, Math.cos(a) * 0.245, Math.sin(a) * 0.245]} rotation={[a, 0, 0]}><boxGeometry args={[0.3, 0.035, 0.05]} /><meshStandardMaterial color="#c9a02e" metalness={0.8} roughness={0.3} /></mesh>; })}
            </group>
          </group>
        </Voo>
      )}
      {/* mostrador, em vidro fumê para ver as engrenagens */}
      {mostr > 0.02 && (
        <Voo k={mostr} d={[0, 0, 5]} spin={0}>
          <mesh position={[0, 0, 1.45]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.42, 2.42, 0.03, 64]} /><meshStandardMaterial color="#26323d" metalness={0.2} roughness={0.5} transparent opacity={n("mostrOp", 0.3)} depthWrite={false} /></mesh>
          {Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2; return <Caixa key={i} p={[Math.sin(a) * 2.12, Math.cos(a) * 2.12, 1.47]} t={[i % 3 === 0 ? 0.11 : 0.07, i % 3 === 0 ? 0.34 : 0.22, 0.03]} cor="#f4f1ea" r={[0, 0, -a]} raio={0.01} />; })}
          {Array.from({ length: 60 }).map((_, i) => { const a = (i / 60) * Math.PI * 2; return i % 5 ? <mesh key={i} position={[Math.sin(a) * 2.33, Math.cos(a) * 2.33, 1.47]} rotation={[0, 0, -a]}><boxGeometry args={[0.02, 0.07, 0.02]} /><meshBasicMaterial color="#cfd6dc" /></mesh> : null; })}
        </Voo>
      )}
      {/* ponteiros: hora, minuto e segundo ligados ao trem */}
      {pont > 0.02 && (
        <group>
          <Voo k={st(pont, 0, 3)} d={[0, 0, 4]} spin={1.2}><Ponteiro rot={hhR} len={1.2} w={0.15} tail={0.25} z={1.58} cor="#e6c25a" /></Voo>
          <Voo k={st(pont, 1, 3)} d={[0, 0, 4]} spin={-1.2}><Ponteiro rot={hmR} len={1.95} w={0.09} tail={0.3} z={1.64} cor="#f4f1ea" /></Voo>
          <Voo k={st(pont, 2, 3)} d={[0, 0, 4]} spin={1.6}>
            {bF < 0.6 ? <Ponteiro rot={hsR} len={2.25} w={0.055} tail={0.5} z={1.71} cor="#ff3b3b" esp={0.02} /> : <mesh position={[0, 0, 1.71]}><circleGeometry args={[2.25, 48]} /><meshBasicMaterial color="#ff3b3b" transparent opacity={0.1} depthWrite={false} /></mesh>}
            <mesh position={[0, 0, 1.72]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.1, 18]} /><meshStandardMaterial color="#ff3b3b" metalness={0.6} roughness={0.25} /></mesh>
          </Voo>
        </group>
      )}
      {/* caixa, lunetas, pulseira, vidro */}
      {caixa > 0.02 && (
        <Voo k={caixa} d={[0, 0, 5]} spin={0}>
          <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.62, 2.62, 2.1, 64, 1, true]} /><meshStandardMaterial color="#c9a02e" metalness={0.85} roughness={0.28} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 0, -0.32]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.62, 2.62, 0.2, 64]} /><meshStandardMaterial color="#a8841f" metalness={0.8} roughness={0.35} /></mesh>
          <mesh position={[0, 0, 1.52]}><torusGeometry args={[2.52, 0.12, 12, 64]} /><meshStandardMaterial color="#e6c25a" metalness={0.9} roughness={0.2} /></mesh>
          {[1, -1].map((s) => [1, -1].map((s2) => <Barra key={`${s}${s2}`} a={[s * 0.9, s2 * 2.35]} b={[s * 0.9, s2 * 3.0]} w={0.3} z={0.15} cor="#c9a02e" esp={0.5} met={0.85} />))}
        </Voo>
      )}
      {pulseira > 0.02 && (
        <group scale={[1, pop(pulseira), 1]}>
          {[1, -1].map((s) => (
            <group key={s}>
              <Barra a={[0, s * 2.95]} b={[0, s * (2.95 + 3.4 * pop(pulseira))]} w={1.7} z={0.1} cor="#6b3f24" esp={0.28} met={0.1} />
              {[0.6, 1.3, 2.0].map((d, i) => <mesh key={i} position={[0, s * (2.95 + d * pop(pulseira)), 0.26]} rotation={[0, 0, 0]}><boxGeometry args={[1.5, 0.03, 0.03]} /><meshStandardMaterial color="#3d2314" /></mesh>)}
            </group>
          ))}
        </group>
      )}
      {vidro > 0.001 && (
        <group position={[0, 0, lerp(1.75, 5.6, 1 - suave(vidro))]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.5, 2.5, 0.1, 64]} /><meshPhysicalMaterial color="#d6efff" transparent opacity={0.22} roughness={0.05} metalness={0} clearcoat={1} depthWrite={false} /></mesh>
          <mesh position={[0.5, 0.8, 0.07]} rotation={[0, 0, -0.7]}><planeGeometry args={[0.55, 3.8]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthWrite={false} /></mesh>
          <mesh position={[1.2, 0.2, 0.07]} rotation={[0, 0, -0.7]}><planeGeometry args={[0.18, 3.0]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.2} depthWrite={false} /></mesh>
        </group>
      )}
      <ambientLight intensity={0} />
      {void tipoE}
    </group>
  );
};
const L_P = 2.95;

/* ------------------------------ cenários simples ------------------------------ */
const Quintal: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const nuvem = n("nuvem", 0);
  const sol: V = [-7, 9, -10];
  const sombra = clamp01(1 - nuvem * 1.4);
  const gente = (C.cena.gente as GenteP[] | undefined) ?? [];
  const ent = n("luz", 0);
  return (
    <group>
      <Dome topo={mistura("#4a9be0", "#6b7fa0", nuvem * 0.5)} meio="#bfe3ff" base="#e8f2d0" />
      <hemisphereLight args={["#fff6e6", "#86a368", 0.9 - 0.25 * nuvem]} />
      <directionalLight position={sol} intensity={1.6 * sombra + 0.5} color="#fff3dc" />
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[80, 60]} /><meshStandardMaterial color={mistura("#7bb05a", "#5d8a45", nuvem * 0.6)} roughness={1} /></mesh>
      {/* sol e nuvem */}
      <mesh position={[-10, 12.5, -34]}><sphereGeometry args={[2.3, 20, 14]} /><meshBasicMaterial color="#fff2a8" /></mesh>
      <group position={[lerp(-40, -10.5, suave(clamp01(nuvem * 1.3))) + (nuvem > 0.01 ? 0 : -200), 12.4, -31]} scale={2.4}>
        {[[0, 0, 0, 1], [1.0, -0.15, 0.1, 0.8], [-1.0, -0.2, 0, 0.75], [0.4, 0.4, 0, 0.7], [-0.45, 0.3, 0.1, 0.65]].map(([a, b, c, d], j) => <mesh key={j} position={[a, b, c]} scale={[d * 1.4, d * 0.9, d]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#eef1f5" roughness={1} flatShading /></mesh>)}
      </group>
      <Nuvens t={tEp} lista={[[-20, 15, -34, 2.2], [14, 18, -38, 1.8], [30, 13, -30, 1.5]]} />
      {/* cerca e árvores */}
      {Array.from({ length: 16 }).map((_, i) => <mesh key={i} position={[-9 + i * 1.2, 0.55, -5]}><boxGeometry args={[0.16, 1.1, 0.1]} /><meshStandardMaterial color="#c8a06a" roughness={0.9} /></mesh>)}
      <mesh position={[0, 0.8, -5]}><boxGeometry args={[19, 0.1, 0.1]} /><meshStandardMaterial color="#b88f55" /></mesh>
      {[[-6, -7, 1.6], [5.5, -8, 1.9], [9, -6.5, 1.4], [-10, -9, 2.1]].map(([x, z, s], i) => <Arvore key={i} x={x} z={z} s={s} />)}
      {/* pedra com marcas e a vareta */}
      <group position={[0.3, 0, 0.2]}>
        <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[1.7, 1.8, 0.1, 40]} /><meshStandardMaterial color="#b9b4a8" roughness={0.95} /></mesh>
        {Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2; return <mesh key={i} position={[Math.sin(a) * 1.45, 0.1, Math.cos(a) * 1.45]} rotation={[0, a, 0]}><boxGeometry args={[0.06, 0.02, 0.28]} /><meshStandardMaterial color="#4a4640" /></mesh>; })}
        <mesh position={[0, 0.78, 0]}><cylinderGeometry args={[0.04, 0.05, 1.5, 8]} /><meshStandardMaterial color="#6b4a2c" roughness={0.9} /></mesh>
        <mesh position={[0.86, 0.095, 0.5]} rotation={[0, -0.55, 0]}><boxGeometry args={[1.9, 0.015, 0.1]} /><meshBasicMaterial color="#2c2c30" transparent opacity={0.6 * sombra} depthWrite={false} /></mesh>
      </group>
      {gente.map((gd, i) => <PessoaP key={i} g={gd} p={C.p} t={C.t} tAbs={tEp} />)}
      {ent > 0 && null}
    </group>
  );
};

const Ampulheta: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const areia = n("areia", 0); // fração que já caiu
  const gente = (C.cena.gente as GenteP[] | undefined) ?? [];
  const vig = n("vigia", 1);
  const raioB = (y: number) => 0.09 + 0.6 * Math.pow(Math.sin(Math.min(1, Math.abs(y) / 1.3) * Math.PI * 0.88), 0.8);
  const geo = React.useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 40; i++) { const y = -1.3 + (i / 40) * 2.6; pts.push(new THREE.Vector2(raioB(y), y)); }
    return new THREE.LatheGeometry(pts, 32);
  }, []);
  const cima0 = 1 - areia;
  const geoCima = React.useMemo(() => {
    const ys = 0.03 + 1.12 * Math.max(0.02, cima0);
    const pts: THREE.Vector2[] = [new THREE.Vector2(0.0, 0.03)];
    for (let i = 0; i <= 12; i++) { const y = 0.03 + (ys - 0.03) * (i / 12); pts.push(new THREE.Vector2(Math.max(0.04, raioB(y) - 0.04), y)); }
    pts.push(new THREE.Vector2(raioB(ys) * 0.35, ys - 0.03 * cima0), new THREE.Vector2(0.0, ys - 0.14 * Math.min(1, cima0 * 3)));
    return new THREE.LatheGeometry(pts, 32);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(cima0 * 100)]);
  const cima = 1 - areia, baixo = areia;
  return (
    <group>
      <Dome topo="#4a9be0" meio="#bfe3ff" base="#e8f2d0" />
      <hemisphereLight args={["#fff6e6", "#86a368", 0.95]} />
      <directionalLight position={[-7, 9, 8]} intensity={1.5} color="#fff3dc" />
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[80, 60]} /><meshStandardMaterial color="#7bb05a" roughness={1} /></mesh>
      {Array.from({ length: 16 }).map((_, i) => <mesh key={i} position={[-9 + i * 1.2, 0.55, -5]}><boxGeometry args={[0.16, 1.1, 0.1]} /><meshStandardMaterial color="#c8a06a" roughness={0.9} /></mesh>)}
      <mesh position={[0, 0.8, -5]}><boxGeometry args={[19, 0.1, 0.1]} /><meshStandardMaterial color="#b88f55" /></mesh>
      {[[-6, -7, 1.6], [5.5, -8, 1.9], [9, -6.5, 1.4], [-10, -9, 2.1]].map(([x, z, s], i) => <Arvore key={i} x={x} z={z} s={s} />)}
      <Nuvens t={tEp} lista={[[-20, 15, -34, 2.2], [14, 18, -38, 1.8], [30, 13, -30, 1.5]]} />
      {/* ampulheta grande sobre um pedestal */}
      <group position={[0.4, 0, 0]} scale={1.15}>
        <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.55, 0.7, 0.6, 24]} /><meshStandardMaterial color="#8a5a30" roughness={0.8} /></mesh>
        <group position={[0, 2.2, 0]}>
          <mesh geometry={geo}><meshPhysicalMaterial color="#cfeaff" transparent opacity={0.28} roughness={0.05} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} /></mesh>
          {/* areia de cima: funil que afunda no centro; areia de baixo: montinho com a ponta para cima */}
          <mesh geometry={geoCima}><meshStandardMaterial color="#e8c06a" roughness={0.95} side={THREE.DoubleSide} /></mesh>
          {cima > 0.03 && baixo < 0.97 && <mesh position={[0, -0.5 + 0.525 * baixo, 0]}><cylinderGeometry args={[0.022, 0.022, 1.2 - 1.05 * baixo, 6]} /><meshStandardMaterial color="#e8c06a" /></mesh>}
          <mesh position={[0, -1.25 + 0.5 * (0.15 + 1.05 * baixo), 0]}><coneGeometry args={[0.15 + 0.26 * Math.min(1, baixo * 1.4), 0.15 + 1.05 * baixo, 28]} /><meshStandardMaterial color="#e8c06a" roughness={0.95} /></mesh>
          {[1.38, -1.38].map((y, i) => <mesh key={i} position={[0, y, 0]}><cylinderGeometry args={[0.85, 0.85, 0.12, 28]} /><meshStandardMaterial color="#8a5a30" roughness={0.8} /></mesh>)}
          {[0, 1, 2].map((i) => <mesh key={i} position={[Math.cos(i * 2.094) * 0.78, 0, Math.sin(i * 2.094) * 0.78]}><cylinderGeometry args={[0.035, 0.035, 2.8, 8]} /><meshStandardMaterial color="#8a5a30" /></mesh>)}
        </group>
      </group>
      {/* banco do vigia */}
      <group position={[2.4, 0, 0.6]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.5, 0.12, 0.55]} /><meshStandardMaterial color="#9a6a3a" roughness={0.9} /></mesh>
        {[-0.6, 0.6].map((x) => <mesh key={x} position={[x, 0.25, 0]}><boxGeometry args={[0.1, 0.5, 0.5]} /><meshStandardMaterial color="#7a5230" /></mesh>)}
      </group>
      {gente.map((gd, i) => <PessoaP key={i} g={gd} p={C.p} t={C.t} tAbs={tEp} />)}
      {/* ZZZ */}
      {vig > 0.5 && [0, 1, 2].map((i) => { const ph = (tEp * 0.7 + i / 3) % 1; return <Texto3D key={i} texto="Z" p={[1.95 + ph * 0.5, 1.7 + ph * 1.0, 0.9]} h={0.3 + 0.35 * ph} cor="#ffffff" escala={Math.sin(Math.PI * ph)} />; })}
    </group>
  );
};

const Pendulo3: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp, t } = C;
  const gente = (C.cena.gente as GenteP[] | undefined) ?? [];
  const cont = n("cont", 0); // quantas contagens (0..8)
  const th = 0.13 * Math.sin((2 * Math.PI * (t + 0.2)) / 1.25);
  return (
    <group>
      <Dome topo="#4a9be0" meio="#bfe3ff" base="#e8f2d0" />
      <hemisphereLight args={["#fff6e6", "#86a368", 0.95]} />
      <directionalLight position={[-7, 9, 8]} intensity={1.5} color="#fff3dc" />
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[80, 60]} /><meshStandardMaterial color="#7bb05a" roughness={1} /></mesh>
      {Array.from({ length: 16 }).map((_, i) => <mesh key={i} position={[-9 + i * 1.2, 0.55, -5]}><boxGeometry args={[0.16, 1.1, 0.1]} /><meshStandardMaterial color="#c8a06a" roughness={0.9} /></mesh>)}
      {[[-6, -7, 1.6], [5.5, -8, 1.9], [9, -6.5, 1.4]].map(([x, z, s], i) => <Arvore key={i} x={x} z={z} s={s} />)}
      <Nuvens t={tEp} lista={[[-20, 15, -34, 2.2], [14, 18, -38, 1.8]]} />
      {/* forca de madeira com o fio e o peso */}
      <group position={[0.9, 0, 0]}>
        {[-1.3, 1.3].map((x) => <mesh key={x} position={[x, 2.1, 0]}><boxGeometry args={[0.2, 4.2, 0.2]} /><meshStandardMaterial color="#8a5a30" roughness={0.9} /></mesh>)}
        <mesh position={[0, 4.15, 0]}><boxGeometry args={[2.9, 0.2, 0.22]} /><meshStandardMaterial color="#8a5a30" roughness={0.9} /></mesh>
        <group position={[0, 4.05, 0]} rotation={[0, 0, th]}>
          <Liga a={[0, 0, 0]} b={[0, -3.0, 0]} w={0.03} cil cor="#e9e2cf" />
          <mesh position={[0, -3.25, 0]}><sphereGeometry args={[0.32, 20, 16]} /><meshStandardMaterial color="#c9a14a" metalness={0.6} roughness={0.3} /></mesh>
        </group>
      </group>
      {gente.map((gd, i) => <PessoaP key={i} g={gd} p={C.p} t={C.t} tAbs={tEp} />)}
      {Array.from({ length: 8 }).map((_, i) => {
        const k = clamp01(cont - i);
        if (k <= 0.01) return null;
        const pp = i === 7 ? "8?" : String(i + 1);
        const bag = i === 7 ? Math.sin(tEp * 9) * 0.25 : 0;
        return <Texto3D key={i} texto={pp} p={[-1.5 + (i % 4) * 0.5 + bag, 3.0 + Math.floor(i / 4) * 0.5 + 0.35 * k, 2.2]} h={0.34} cor={i === 7 ? "#ff6b6b" : "#ffd23f"} escala={k} />;
      })}
    </group>
  );
};

const Mar: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const gente = (C.cena.gente as GenteP[] | undefined) ?? [];
  const luz = n("luzMar", 0);
  return (
    <group>
      <Dome topo="#2d3a6e" meio="#e8875a" base="#ffd08a" />
      <hemisphereLight args={["#ffd9b0", "#5a4a6a", 0.9]} />
      <directionalLight position={[8, 3, -6]} intensity={1.4} color="#ffb877" />
      <mesh position={[0, -0.05, -25]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[200, 120]} /><meshStandardMaterial color="#3a5f86" roughness={0.4} metalness={0.3} /></mesh>
      <mesh position={[0, 0.02, 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[16, 7]} /><meshStandardMaterial color="#c9a56a" roughness={1} /></mesh>
      <mesh position={[8, 1.6, -22]}><sphereGeometry args={[3.2, 20, 14]} /><meshBasicMaterial color="#fff0b8" /></mesh>
      <group position={[-6.5, 0, -48]}>
        <Halo p={[0, 2.2, 0]} r={2.4 * luz + 0.01} cor="#fff6c0" op={0.55 * luz * (0.7 + 0.3 * Math.sin(tEp * 5))} />
        <mesh position={[0, 0.9, 0]} scale={luz}><sphereGeometry args={[0.35, 12, 10]} /><meshBasicMaterial color="#fff6c0" /></mesh>
      </group>
      <Texto3D texto="?" p={[-3.2, 3.6, 0.2]} h={1.4} cor="#ffd23f" escala={luz} />
      {gente.map((gd, i) => <PessoaP key={i} g={gd} p={C.p} t={C.t} tAbs={tEp} />)}
    </group>
  );
};

/* ------------------------------ oficina: ambiente, mesa, mecanismo ------------------------------ */
const Torre: React.FC<{ k: number }> = ({ k }) => {
  if (k <= 0.02) return null;
  return (
    <group scale={[1, k, 1]}>
      {[-3.3, 3.3].map((x) => <mesh key={x} position={[x, (YC + 2.9) / 2, -0.55]}><boxGeometry args={[0.3, YC + 2.9, 0.3]} /><meshStandardMaterial color="#7a5230" roughness={0.9} /></mesh>)}
      <mesh position={[0, YC + 2.85, -0.55]}><boxGeometry args={[6.9, 0.3, 0.3]} /><meshStandardMaterial color="#7a5230" roughness={0.9} /></mesh>
      <mesh position={[0, 0.12, -0.55]}><boxGeometry args={[6.9, 0.24, 0.5]} /><meshStandardMaterial color="#6a4528" roughness={0.9} /></mesh>
    </group>
  );
};

const Mesa: React.FC<{ k: number; x?: number; z?: number }> = ({ k, x = 0, z = 0.5 }) => {
  if (k <= 0.02) return null;
  return (
    <group position={[x, 0, z]} scale={[1, k, 1]}>
      <mesh position={[0, 1.3, 0]}><boxGeometry args={[5.2, 0.16, 3.2]} /><meshStandardMaterial color="#a9825a" roughness={0.8} /></mesh>
      <mesh position={[0, 1.395, 0]}><boxGeometry args={[3.6, 0.03, 2.2]} /><meshStandardMaterial color="#5d2a34" roughness={1} /></mesh>
      {[[-2.4, -1.4], [2.4, -1.4], [-2.4, 1.4], [2.4, 1.4]].map(([a, b], i) => <mesh key={i} position={[a, 0.6, b]}><boxGeometry args={[0.2, 1.2, 0.2]} /><meshStandardMaterial color="#7a5230" /></mesh>)}
    </group>
  );
};

const Oficina3: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const gente = (C.cena.gente as GenteP[] | undefined) ?? [];
  const ent = n("luz", 0);
  return (
    <group>
      <hemisphereLight args={["#fff6e6", "#8a7a5a", 1.15]} />
      <directionalLight position={[-3, 7, 8]} intensity={1.5} color={mistura("#fff3dc", "#ffb877", ent)} />
      <pointLight position={[0, 6.6, 2]} intensity={0.5} color="#ffe2a8" />
      <Oficina bancada={false} escuro={ent * 0.6} />
      <Torre k={n("torre", 0)} />
      <Mesa k={n("mesa", 0)} />
      <Mov C={C} />
      {/* poeira na luz */}
      {Array.from({ length: 14 }).map((_, i) => { const ph = (tEp * 0.05 + i * 0.137) % 1; return <mesh key={i} position={[-3 + ((i * 1.37) % 6) + Math.sin(tEp * 0.6 + i) * 0.2, 0.8 + ph * 5.5, -1 + (i % 3)]} scale={0.022}><sphereGeometry args={[1, 5, 4]} /><meshBasicMaterial color="#fff3d0" transparent opacity={0.5 * Math.sin(Math.PI * ph)} /></mesh>; })}
      {gente.map((gd, i) => <PessoaP key={i} g={gd} p={C.p} t={C.t} tAbs={tEp} />)}
    </group>
  );
};

/* ------------------------------ cena ------------------------------ */
const RelCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const C = mkCtx(cena, p, t, tEpisodio);
  const { n } = C;
  const tipo = (cena.tipo as string | undefined) ?? "oficina";
  // âncoras dos rótulos em coordenadas do mecanismo → mundo
  const obj = new THREE.Object3D();
  obj.position.set(n("mx", 0), n("my", YC), n("mz", -0.3));
  obj.rotation.set(-n("incl", 0) * 1.28, n("rotY", 0), 0);
  obj.scale.setScalar(n("ms", 1));
  obj.updateMatrixWorld(true);
  const W = (v: V): V => { const q = new THREE.Vector3(...v).applyMatrix4(obj.matrixWorld); return [q.x, q.y, q.z]; };
  const et: Record<string, EtiqDef> = {
    peso: { texto: "PESO", para: [POS.B[0] - R_DRUM, Y_PESO0 - n("queda", 0) * DROP + 0.1, 0.2], off: [0.3, -0.5], cor: "#ffd23f" },
    engren: { texto: "ENGRENAGENS", para: [POS.C[0] - 0.4, POS.C[1] + 0.6, 0.5], off: [-0.8, 1.9], cor: "#ffd23f" },
    escape: { texto: "ESCAPE", para: [POS.E[0] - 0.3, POS.E[1] - 0.35, 0.85], off: [-0.4, -0.9], cor: "#8ff0a8" },
    ancora: { texto: "ÂNCORA", para: [POS.A[0] - 0.12, POS.A[1] + 0.1, 0.85], off: [-0.9, 0.7], cor: "#8ff0a8" },
    pendulo: { texto: "PÊNDULO", para: [POS.A[0], POS.A[1] - 2.2, -0.05], off: [-1.3, -0.2], cor: "#ffd23f" },
    mola: { texto: "MOLA", para: [POS.B[0] + 0.15, POS.B[1] + 0.3, 0.2], off: [0.6, 1.4], cor: "#ffd23f" },
    roda: { texto: "RODA DE BALANÇO", para: [POS.W[0] - 0.4, POS.W[1] + 0.42, 1.0], off: [-0.6, 1.5], cor: "#ffd23f" },
    espiral: { texto: "ESPIRAL", para: [POS.W[0] + 0.28, POS.W[1] - 0.05, 0.9], off: [1.0, -1.3], cor: "#9fdcff" },
    regulador: { texto: "REGULADOR", para: [POS.W[0] - 0.45, POS.W[1] + 0.12, 0.9], off: [-0.4, 1.9], cor: "#ff8a2a" },
    rubis: { texto: "RUBIS", para: [POS.E[0], POS.E[1], 0.86], off: [-0.9, -1.2], cor: "#ff6b8a" },
    coroa: { texto: "COROA", para: [3.0 + SLIDE * n("puxa", 0), 0, 0.955], off: [0.2, 1.3], cor: "#ffd23f" },
    gira: { texto: "GIRA", para: [3.1 + SLIDE * n("puxa", 0), 0.2, 0.955], off: [0.0, 1.6], cor: "#8ff0a8" },
    puxa: { texto: "PUXA", para: [3.1 + SLIDE * n("puxa", 0), -0.2, 0.955], off: [0.0, -1.6], cor: "#8ff0a8" },
    vidro: { texto: "VIDRO", para: [1.5, 1.7, 1.75], off: [-0.5, 1.4], cor: "#bfe8ff" },
    relogio: { texto: "RELÓGIO", para: [-1.2, 2.2, 1.9], off: [0.2, 1.6], cor: "#ffd23f" },
    horas: { texto: "HORAS", para: [-0.35, 0.6, 1.62], off: [-1.1, 1.3], cor: "#f4f1ea" },
    minutos: { texto: "MINUTOS", para: [0.4, 1.4, 1.66], off: [1.2, 0.9], cor: "#ff8a8a" },
    segundos: { texto: "SEGUNDOS", para: [POS.F[0] + 0.18, POS.F[1] + 0.2, 1.6], off: [1.4, -0.4], cor: "#ffd23f" },
  };
  const S = n("etiqS", 1), Kt = n("etiqK", 1);
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fimE] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fimE === undefined || p <= fimE) };
  }).filter((x) => x.ok);
  return (
    <group>
      {tipo === "quintal" && <Quintal C={C} />}
      {tipo === "ampulheta" && <Ampulheta C={C} />}
      {tipo === "pendulo" && <Pendulo3 C={C} />}
      {tipo === "mar" && <Mar C={C} />}
      {tipo === "oficina" && <Oficina3 C={C} />}
      {tipo === "oficina" && etiqs.map(({ c, ini }) => {
        const d = et[c];
        const para = W(d.para);
        const off = W([d.para[0] + d.off[0] * S * 0.55, d.para[1] + d.off[1] * S * 0.55, d.para[2] + 0.3]);
        return <Etiqueta key={c} texto={d.texto} de={off} para={para} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

export const relogio: Cenario3D = {
  Cena: RelCena,
  padrao: "geral",
  fundo: (cena) => ((cena.tipo as string | undefined) === "mar" ? "#e8875a" : (cena.tipo as string | undefined) === "oficina" || !cena.tipo ? "#d9c7a4" : "#bfe3ff"),
  luzPropria: true,
  cameras: { geral: { pos: [0, 4.2, 12], alvo: [0, 3.6, 0], fov: 50 } },
};

void Seta; void ALFA; void A_BAL; void A_PEND; void DA; void EPS; void MOD; void NB; void RHO0; void RE; void travada; void palete; void PMIN; void NHOR;
