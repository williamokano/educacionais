import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, H, W } from "../../../src/theme";
import { CenarioProps, Pacote } from "../../../src/v2/pacote";

// Estúdio neutro com régua de altura para os benchmarks: personagem (pipeline/benchmark_personagem.py)
// e cartões (benchmark/cartoes.json). Os personagens vêm do banco inteiro (qualquer pacote).

const Estudio: React.FC<CenarioProps> = ({ chao, u }) => {
  const metro = 420 * u * (1 / 1.75); // adulto padrão (~420 unidades do rig) = 1,75 m
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #39414E, #1E232B)" }}>
      <svg width={W} height={H}>
        {Array.from({ length: 24 }).map((_, i) => <line key={i} x1={i * 50} y1={0} x2={i * 50} y2={chao} stroke="#2E3540" strokeWidth={2} />)}
        <rect x={0} y={chao} width={W} height={H - chao} fill="#2A3039" />
        <line x1={0} y1={chao} x2={W} y2={chao} stroke="#56606E" strokeWidth={4} />
        {/* régua: um traço a cada 25 cm, rótulo a cada metro */}
        {Array.from({ length: 9 }).map((_, i) => {
          const y = chao - i * metro * 0.25;
          if (y < 340) return null;
          return (
            <g key={i}>
              <line x1={40} y1={y} x2={i % 4 === 0 ? 90 : 70} y2={y} stroke="#8A94A3" strokeWidth={3} />
              {i % 4 === 0 && i > 0 && <text x={96} y={y + 10} fontFamily={FONT} fontWeight={500} fontSize={28} fill="#8A94A3">{i / 4} M</text>}
            </g>
          );
        })}
        <line x1={40} y1={chao} x2={40} y2={Math.max(chao - 2 * metro, 340)} stroke="#8A94A3" strokeWidth={3} />
      </svg>
    </AbsoluteFill>
  );
};

export const benchmarkEstudio: Pacote = {
  nome: "Benchmark (estúdio: personagens e cartões)",
  personagens: {},
  cenarios: { estudio: Estudio },
};
