import React from "react";
import { suave, valor } from "../../../src/v3d/anima";
import { Anterior, poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Expressao3D, Personagem3D, Pose3D, Valor } from "../../../src/v3d/tipos";
import { poseDe3D } from "../../../src/v3d/acoes";
import { rnd } from "../../../src/v3d/qualidade";
import { homemA, homemB, homemC, mulher } from "./fieis";
import { menino, vizinha, vovo } from "./moradores";
import { V, nv } from "./rasc";
import { mao } from "./cad-maos";
import { zeca } from "./zeca";

// Pessoas do cadeado (episódio 20): o Zeca, o vizinho, o ladrão (boné e blusa escuros, de rosto manso) e os transeuntes da rua, todos Boneco3D.

export const ladrao: Personagem3D = { nome: "Ladrão", altura: 1.76, pele: "#c98f63", cabelo: "#17100b", olhos: "#3b2415", camiseta: "#2d3342", calca: "#1c1f27", sapato: "#14151a", bone: { cor: "#262a33", aba: "#171a20", virado: false }, sobrancelha: "#17100b", barriga: 0.2 };
export const vizinho: Personagem3D = { nome: "Vizinho", altura: 1.7, pele: "#e0ac86", cabelo: "#4a3a2a", olhos: "#3b2415", camiseta: "#d98a2b", calca: "#4a5a74", sapato: "#3a2a22", bigode: "#4a3a2a", sobrancelha: "#4a3a2a", barriga: 0.5 };

const mulherB: Personagem3D = { ...mulher, nome: "Mulher B", altura: 1.68, pele: "#e8c29a", cabelo: "#d9a441", camiseta: "#d94f6a", calca: "#2f3b57" };
const mulherC: Personagem3D = { ...mulher, nome: "Mulher C", altura: 1.74, pele: "#8d5a3a", cabelo: "#17100b", camiseta: "#37a58d", calca: "#e8e3d6", sapato: "#f2f0ea" };
const idoso: Personagem3D = { ...homemC, nome: "Idoso", altura: 1.66, cabelo: "#d8d8dc", sobrancelha: "#c9c9ce", camiseta: "#7b5ea7", calca: "#5a5648", oculos: { cor: "#3a3a3a", aro: 0.062 }, barriga: 0.5 };
const homemD: Personagem3D = { ...homemA, nome: "Homem D", altura: 1.84, camiseta: "#e5873a", calca: "#3a4a63", bone: { cor: "#2b6c4b", aba: "#1f5038", virado: false } };
const homemE: Personagem3D = { ...homemB, nome: "Homem E", altura: 1.76, camiseta: "#6a4fb0", calca: "#d8cfb8", pele: "#b97c52" };
const menina: Personagem3D = { ...menino, nome: "Menina", altura: 1.28, camiseta: "#f06292", calca: "#4a3b73", bone: undefined, cabelo: "#4a2c1a" };
const homemF: Personagem3D = { ...homemC, nome: "Homem F", altura: 1.7, camiseta: "#2c9ac6", calca: "#2a2f45", cabelo: "#1f1510", sobrancelha: "#1f1510", bone: { cor: "#d6322a", aba: "#a8231c", virado: true } };

export const PERS_CAD: Record<string, Personagem3D> = { zeca, vizinho, ladrao, homemA, homemB, homemC, homemD, homemE, homemF, mulher, mulherB, mulherC, idoso, menino, menina, vizinha, vovo };

export type GenteC = {
  x?: Valor; y?: Valor; z?: Valor; rot?: Valor;
  acao?: string | [number, string, string?][]; exp?: Expressao3D; ant?: Anterior; entradaDur?: number;
  pose?: Pose3D | [number, Pose3D][]; incl?: Valor; esc?: number; suor?: number; quem?: string; vel?: number;
};

/** converte um ponto do palco para o rig da pessoa (metros de um boneco de 1,6 m, pé no chão) */
const paraRig = (w: V, pos: { x: number; y: number; z: number; rot: number }, esc: number, altura: number): V => {
  const dx = w[0] - pos.x, dy = w[1] - pos.y, dz = w[2] - pos.z;
  const c = Math.cos(pos.rot), s = Math.sin(pos.rot);
  const k = esc * (altura / 1.6);
  return [(dx * c - dz * s) / k, dy / k, (dx * s + dz * c) / k];
};

export type Ajuste = (pose: Pose3D, loc: (w: V) => V, tAbs: number) => void;

/** Pessoa Boneco3D do cadeado. `ajuste` mexe na pose final (IK de mãos para ferramentas e guidão). */
export const PessoaC: React.FC<{ g: GenteC; p: number; t: number; tAbs: number; ajuste?: Ajuste; x?: number; z?: number; rot?: number; exp?: Expressao3D; maos?: (h: { E: V; D: V }) => React.ReactNode }> = ({ g, p, t, tAbs, ajuste, x: xo, z: zo, rot: ro, exp: eo, maos }) => {
  const { acao: _a, exp, pose } = poseGente(g, { p, t, tAbs, abs: true, vel: g.vel, incl: valor(g.incl, p, 0) });
  const base = { x: nv(g.x, p, 0), y: nv(g.y, p, 0), z: nv(g.z, p, 0), rot: nv(g.rot, p, 0) };
  const { x, y, z, rot } = posicaoGente(g, t, { x: xo ?? base.x, y: base.y, z: zo ?? base.z, rot: ro ?? base.rot });
  const esc = g.esc ?? 1.0;
  const pers = PERS_CAD[g.quem ?? "zeca"] ?? zeca;
  void _a;
  if (ajuste) ajuste(pose, (w) => paraRig(w, { x, y, z, rot }, esc, pers.altura ?? 1.6), tAbs);
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={esc}>
      <Boneco3D p={pers} pose={pose} expressao={eo ?? exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} suor={g.suor} t={tAbs} />
      {maos && (() => {
        const k = (pers.altura ?? 1.6) / 1.6;
        const e = mao(pose, 1), d = mao(pose, -1);
        return maos({ E: [e[0] * k, e[1] * k, e[2] * k], D: [d[0] * k, d[1] * k, d[2] * k] });
      })()}
    </group>
  );
};

void poseDe3D;

/* ---------- transeuntes da rua ---------- */

const ELENCO = [homemA, mulher, homemB, menino, mulherB, homemC, idoso, mulherC, homemD, menina, homemE, vizinha, homemF, vovo];

type Cam = { i: number; z: number; dir: 1 | -1; k: number; x0: number; rx: number };
const CAMINHANTES: Cam[] = Array.from({ length: 26 }, (_, n) => {
  const lanes = [-2.0, -1.4, -0.8, -1.1, -1.7, -1.55];
  return { i: n % ELENCO.length, z: lanes[n % lanes.length] + (rnd(n + 3) - 0.5) * 0.25, dir: (n % 3 === 1 ? -1 : 1) as 1 | -1, k: 0.88 + rnd(n * 1.7) * 0.34, x0: (n * 3.1) % 34, rx: (rnd(n + 9) - 0.5) * 0.5 };
});
const PERIODO = 34;

/** Passa gente de verdade pela calçada: Boneco3D com a ação "andando" (ciclo de passos, braços balançando), cada um com seu ritmo e sua roupa. */
export const Caminhantes: React.FC<{ tAbs: number; cx?: number; larg?: number; max?: number; tira?: number[] }> = ({ tAbs, cx = 0, larg = 8, max = 26, tira = [] }) => (
  <group>
    {CAMINHANTES.slice(0, max).map((c, n) => {
      if (tira.includes(n)) return null;
      const pers = ELENCO[c.i];
      const s = (pers.altura ?? 1.6) / 1.6;
      const v = 1.15 * s * c.k; // m/s: o ciclo da ação anda a 1,15 m/s por 1,6 m de altura
      const xr = (((c.x0 + c.dir * v * tAbs + PERIODO / 2) % PERIODO) + PERIODO) % PERIODO - PERIODO / 2;
      if (Math.abs(xr) > larg) return null;
      const pose = poseDe3D("andando", tAbs * c.k + n * 0.37);
      const rot = c.dir * (Math.PI / 2) - c.dir * 0.3 + c.rx * 0.3;
      return (
        <group key={n} position={[cx + xr, 0, c.z]} rotation={[0, rot, 0]}>
          <Boneco3D p={pers} pose={pose} expressao={n % 4 === 2 ? "surpreso" : "sorriso"} pisca={piscar(tAbs + n * 1.3)} boca={0} olhar={[0, 0]} t={tAbs} />
        </group>
      );
    })}
  </group>
);

void suave;
