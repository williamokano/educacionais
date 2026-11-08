import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../../../src/theme";
import { ElementoProps } from "../../../src/v2/pacote";
import { velSeco, velSuave } from "./elevador-perfil";

// Cartão `curva` do elevador: gráfico velocidade × tempo, traçado junto com a cabine (usa o `progresso` da batida, o mesmo do cenário).
// Campos: iniA, fimA (viagem "seca", tranco), iniB, fimB (viagem suave), trocaB (progresso em que o gráfico recomeça), y, x.

const W = 520;
const H = 230;

export const Curva: React.FC<ElementoProps> = ({ d, progresso: p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.5 } });
  const iniA = d.iniA ?? 0, fimA = d.fimA ?? 0.12, iniB = d.iniB ?? 0.55, fimB = d.fimB ?? 1, troca = d.trocaB ?? 0.2;
  const faseB = p >= troca;
  const [i0, i1, vel] = faseB ? [iniB, fimB, velSuave] : [iniA, fimA, velSeco];
  const u = Math.min(Math.max((p - i0) / Math.max(i1 - i0, 1e-6), 0), 1);
  const cor = faseB ? "#5bd47a" : "#ff5a3c";
  const NP = 140;
  const px = (k: number) => 14 + k * (W - 28);
  const py = (v: number) => H - 14 - v * (H - 44);
  // trecho antes de começar: tempo parado (platô à esquerda)
  const pts: [number, number][] = [];
  const n = Math.max(2, Math.round(NP * u));
  if (faseB) for (let i = 0; i <= n; i++) pts.push([px((i / NP) * 0.94 + 0.03), py(vel(i / NP))]);
  else {
    const q = u > 0 ? [[0.03, 0], [0.03, 1], [0.03 + 0.94 * u, 1]] : [[0.03, 0]];
    for (const [a, b] of q) pts.push([px(a), py(b)]);
    if (u >= 1) pts.push([px(0.97), py(0)]);
  }
  const dd = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [ux, uy] = pts[pts.length - 1];
  const fase = !faseB ? "" : u < 0.2 ? "ACELERA" : u < 0.52 ? "ANDA RÁPIDO" : "DESACELERA";
  return (
    <div style={{
      position: "absolute", left: d.x ?? 56, top: d.y ?? 40, width: W + 56, transform: `scale(${pop})`, transformOrigin: "0% 0%",
      background: "rgba(20,24,31,0.9)", borderRadius: 26, boxShadow: "0 10px 0 rgba(0,0,0,0.18)", padding: "16px 28px 12px", boxSizing: "border-box",
    }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 36, color: "#f4f1ea", letterSpacing: 2 }}>CONTROLADOR · VELOCIDADE</div>
      <svg width={W} height={H + 56} style={{ marginTop: 6, overflow: "visible" }}>
        <line x1={14} x2={14} y1={10} y2={H - 14} stroke="#8a94a3" strokeWidth={3} />
        <line x1={14} x2={W - 6} y1={H - 14} y2={H - 14} stroke="#8a94a3" strokeWidth={3} />
        <text x={22} y={22} fontFamily={FONT} fontWeight={500} fontSize={30} fill="#8a94a3">VELOCIDADE</text>
        <text x={W - 6} y={H + 14} textAnchor="end" fontFamily={FONT} fontWeight={500} fontSize={30} fill="#8a94a3">TEMPO</text>
        <path d={dd} fill="none" stroke={cor} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={ux} cy={uy} r={11} fill={cor} />
        {!faseB && u >= 1 && <text x={W - 190} y={py(1) + 46} fontFamily={FONT} fontWeight={700} fontSize={44} fill="#ff5a3c">TRANCO!</text>}
        {faseB && fase && <text x={W / 2} y={H + 50} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={44} fill="#5bd47a">{fase}</text>}
        {faseB && u >= 1 && <text x={W - 6} y={py(0) - 14} textAnchor="end" fontFamily={FONT} fontWeight={700} fontSize={36} fill="#5bd47a">SEM TRANCO</text>}
      </svg>
    </div>
  );
};
