import React from "react";
import { AbsoluteFill } from "remotion";
import { PERSONAGENS, TEMAS } from "../../banco";
import { Boneco } from "../rig/Boneco";

// Foto de perfil (1080×1080; o Instagram recorta em círculo). Tudo dentro do círculo central de 92%.
// modo "personagem": rosto e ombros de um personagem do banco sobre fundo + forma de onda
// modo "simbolo": só a forma de onda que vira linha reta (silêncio de rádio)

const L = 1080;

const onda = (x0: number, x1: number, y: number, amp: number, corte: number) => {
  // ondas fortes até `corte` (0..1 da largura), depois linha reta; amplitude cai antes do corte
  const n = 140;
  return Array.from({ length: n }, (_, i) => {
    const f = i / (n - 1);
    const x = x0 + (x1 - x0) * f;
    const k = f < corte ? Math.min(1, (corte - f) / 0.12) : 0;
    const v = (Math.sin(f * 90) * 0.6 + Math.sin(f * 37 + 1) * 0.4) * amp * k * (0.6 + 0.4 * Math.abs(Math.sin(f * 11)));
    return `${i ? "L" : "M"} ${x} ${y + v}`;
  }).join(" ");
};

export const PerfilComp: React.FC<{ modo: "personagem" | "simbolo"; personagem?: string; look?: string; fundo?: string; cor?: string }> = ({
  modo, personagem = "lukas", look = "padrao", fundo = "#12161C", cor = "#7FD3C0",
}) => {
  const p = PERSONAGENS[personagem];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, #24303B, ${fundo} 70%)` }}>
      <svg width={L} height={L}>
        <path d={onda(40, 1040, modo === "simbolo" ? 540 : 600, modo === "simbolo" ? 210 : 120, 0.55)} stroke={cor} strokeWidth={modo === "simbolo" ? 22 : 12}
          fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={modo === "simbolo" ? 1 : 0.55} />
        {modo === "simbolo" && <circle cx={L * 0.58} cy={540} r={18} fill="#E0473C" />}
      </svg>
      {modo === "personagem" && p && (
        <svg viewBox="-110 -20 220 220" width={L} height={L} style={{ position: "absolute", top: 70, left: 0 }}>
          <Boneco personagem={p} tema={TEMAS.plano} t={1.3} look={look} acao="em-pe" vista="frente" expressao="alerta" />
        </svg>
      )}
    </AbsoluteFill>
  );
};
