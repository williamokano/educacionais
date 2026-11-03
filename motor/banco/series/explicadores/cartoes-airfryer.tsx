import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../../../src/theme";
import { ElementoProps } from "../../../src/v2/pacote";

// Cartões do episódio 9 (fritar batata sem fritura). Ficam na faixa de ação (y 330–1140), como os de cartoes.tsx.
//   atencao  placa de perigo (triângulo + texto) que pisca em vermelho. Campos: texto (padrão "ATENÇÃO"), y, dx (deslocamento horizontal em px)

const Atencao: React.FC<ElementoProps> = ({ d, t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11, mass: 0.5 } });
  const aceso = Math.sin(t * 11) > -0.35; // pisca
  const cor = aceso ? "#ff2a1a" : "#8a1a12";
  return (
    <div style={{
      position: "absolute", left: d.dx ?? 0, top: d.y ?? 40, width: "100%", display: "flex", justifyContent: "center", transform: `scale(${pop})`, transformOrigin: "50% 0%",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28, background: cor, border: "10px solid #fff7e0", borderRadius: 44, padding: "16px 40px 16px 28px", boxShadow: "0 10px 0 rgba(0,0,0,0.25)" }}>
        <svg width={120} height={108} viewBox="0 0 120 108" style={{ flexShrink: 0 }}>
          <path d="M60 6 L114 100 L6 100 Z" fill="#ffd23f" stroke="#241403" strokeWidth={8} strokeLinejoin="round" />
          <rect x={54} y={36} width={12} height={32} rx={6} fill="#241403" />
          <circle cx={60} cy={82} r={7} fill="#241403" />
        </svg>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 104, letterSpacing: 4, color: "#fff7e0", lineHeight: 1, whiteSpace: "nowrap" }}>{d.texto ?? "ATENÇÃO"}</div>
      </div>
    </div>
  );
};

/** Contador do episódio 10: o número sobe rápido até 2,45 e fica; embaixo, BILHÕES / SEGUNDO. Campos: dur (s), y */
const Contador245: React.FC<ElementoProps> = ({ d, t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.5 } });
  const k = Math.min(1, t / (d.dur ?? 1.2));
  const v = 2.45 * (1 - (1 - k) ** 3);
  const txt = v.toFixed(2).replace(".", ",");
  return (
    <div style={{ position: "absolute", left: 0, top: d.y ?? 40, width: "100%", display: "flex", justifyContent: "center", transform: `scale(${pop})`, transformOrigin: "50% 0%" }}>
      <div style={{ background: "rgba(20,24,31,0.92)", borderRadius: 36, padding: "14px 40px 18px", textAlign: "center", boxShadow: "0 10px 0 rgba(0,0,0,0.2)" }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 130, color: "#7fc4ff", letterSpacing: 3, lineHeight: 1, WebkitTextStroke: "8px #1b2230", paintOrder: "stroke fill" }}>{txt}</div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 52, color: "#ffd23f", letterSpacing: 3, whiteSpace: "nowrap" }}>{d.sub ?? "BILHÕES / SEGUNDO"}</div>
      </div>
    </div>
  );
};

export const CARTOES_AIRFRYER = { atencao: Atencao, contador245: Contador245 };
