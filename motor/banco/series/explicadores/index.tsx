import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../../../src/theme";
import { ElementoProps, Pacote } from "../../../src/v2/pacote";
import { bancada } from "./bancada";
import { banho } from "./banho";
import { eletricista } from "./eletricista";
import { inversor } from "./inversor";
import { solar } from "./solar";
import { pista } from "./pista";
import { abrigo } from "./abrigo";
import { cozinha } from "./cozinha";
import { microondas } from "./microondas";
import { inducao } from "./inducao";
import { procissao } from "./procissao";
import { panela } from "./panela";
import { elevador } from "./elevador";
import { pararaios } from "./pararaios";
import { aviao } from "./aviao";
import { FIEIS } from "./fieis";
import { CARTOES_BUNKER } from "./cartoes-bunker";
import { CARTOES_AIRFRYER } from "./cartoes-airfryer";
import { MORADORES } from "./moradores";
import { CARTOES_FREIO } from "./cartoes-freio";
import { CARTOES_AR } from "./cartoes";
import { ciclo } from "./ciclo";
import { salaBalde } from "./sala";
import { zeca } from "./zeca";

// Pacote da série dos explicadores 3D (sala do balde, casa em corte, bancada, banho, solar, inversor, pista, abrigo, cozinha e micro-ondas) + Zeca Parafuso.
// Roteiros: episodios/<nome>/roteiro.json (slug "demo-3d", registrado em motor/banco/index.ts).

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

export const explicadores: Pacote = {
  nome: "Explicadores 3D",
  personagens: {},
  personagens3d: { zeca, eletricista, ...MORADORES, ...FIEIS },
  cenarios3d: { "sala-balde": salaBalde, ciclo, bancada, banho, solar, inversor, pista, abrigo, cozinha, microondas, inducao, procissao, panela, elevador, pararaios, aviao },
  cartoes: { rotulo: Rotulo, medida: Medida, ...CARTOES_AR, ...CARTOES_FREIO, ...CARTOES_BUNKER, ...CARTOES_AIRFRYER },
  qualidade3d: "suave",
};
