import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../../../src/theme";
import { ElementoProps, Pacote } from "../../../src/v2/pacote";
import { salaBalde } from "./sala";
import { zeca } from "./zeca";

// Demo do estilo 3D (explicador): sala do balde de gelo + Zeca Parafuso.
// Roteiro de exemplo: motor/exemplos/explicador-3d/roteiro.json (slug "demo-3d").
// É só a demonstração do motor. Os cenários, cartões e personagens de uma série de verdade ficam no pacote do projeto
// (motor/banco/series/<slug>/), registrado no banco/index.ts do projeto; use este arquivo como molde.

const usePop = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame, fps, config: { damping: 10, mass: 0.5 } });
};

/** Rótulo amarelo inclinado (nome da peça, "2 HORAS DEPOIS"). Campos: texto, y (px dentro da zona de ação). */
const Rotulo: React.FC<ElementoProps> = ({ d }) => {
  const pop = usePop();
  return (
    <div style={{
      position: "absolute", top: d.y ?? 0, left: 0, width: "100%", textAlign: "center",
      fontFamily: FONT, fontWeight: 700, fontSize: d.tamanho ?? 84, color: "#ffcf1f", letterSpacing: 2,
      WebkitTextStroke: "12px #2a1a00", paintOrder: "stroke fill", transform: `scale(${pop}) rotate(-3deg)`,
    }}>{d.texto}</div>
  );
};

/** Etiqueta de temperatura/valor: pílula branca com bolinha de cor. Campos: texto, cor, x, y (px dentro da zona de ação). */
const Medida: React.FC<ElementoProps> = ({ d }) => {
  const pop = usePop();
  const cor = d.cor ?? "#ff7a2e";
  return (
    <div style={{
      position: "absolute", left: d.x ?? 120, top: d.y ?? 40, transform: `scale(${pop})`, transformOrigin: "left center",
      background: "white", border: `6px solid ${cor}`, borderRadius: 40, padding: "8px 26px",
      fontFamily: FONT, fontWeight: 700, fontSize: 50, color: "#1f2a44", letterSpacing: 1,
      display: "flex", alignItems: "center", gap: 14, boxShadow: "0 6px 0 rgba(0,0,0,0.15)",
    }}>
      <span style={{ width: 20, height: 20, borderRadius: 10, background: cor, display: "inline-block" }} />
      {d.texto}
    </div>
  );
};

export const demo3d: Pacote = {
  nome: "Demo 3D (explicador: balde de gelo)",
  personagens: {},
  personagens3d: { zeca },
  cenarios3d: { "sala-balde": salaBalde },
  cartoes: { rotulo: Rotulo, medida: Medida },
  qualidade3d: "suave",
};
