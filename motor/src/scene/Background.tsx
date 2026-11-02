import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, H, W } from "../theme";
import { Scene } from "../types";

const GROUND_Y = H * 0.86;

// Prédios com janelas, em camadas; posições fixas pra cena não "pular" entre batidas.
const SKYLINE = [
  { x: -40, w: 260, h: 900, c: 3 },
  { x: 200, w: 200, h: 620, c: 1 },
  { x: 380, w: 240, h: 1040, c: 0 },
  { x: 610, w: 190, h: 700, c: 2 },
  { x: 780, w: 320, h: 980, c: 1 },
];

const Building: React.FC<{ x: number; w: number; h: number; color: string }> = ({ x, w, h, color }) => {
  const cols = Math.floor((w - 30) / 56);
  const rows = Math.floor((h - 60) / 80);
  return (
    <g>
      <rect x={x} y={GROUND_Y - h} width={w} height={h} fill={color} />
      {Array.from({ length: rows }).flatMap((_, r) =>
        Array.from({ length: cols }).map((__, c) => (
          <rect key={`${r}-${c}`} x={x + 22 + c * 56} y={GROUND_Y - h + 40 + r * 80} width={30} height={44}
            fill={(r * 7 + c * 3) % 11 === 0 ? "#F1D58A" : "#6F767B"} opacity={0.55} />
        )),
      )}
    </g>
  );
};

const DuskCity: React.FC<{ store?: boolean }> = ({ store }) => (
  <svg width={W} height={H} style={{ position: "absolute" }}>
    <defs>
      <radialGradient id="sun" cx="0.3" cy="0.42" r="0.6">
        <stop offset="0" stopColor="#F6CF8E" />
        <stop offset="1" stopColor={C.dusk2} />
      </radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#sun)" />
    {/* fumaça no horizonte */}
    <path d="M 860 900 q -40 -120 20 -220 q 60 -110 0 -240" stroke="#4A4A50" strokeWidth={46} fill="none" opacity={0.35} strokeLinecap="round" />
    {SKYLINE.map((b, i) => <Building key={i} x={b.x} w={b.w} h={b.h} color={C.building[b.c]} />)}
    {store && (
      <g>
        <rect x={120} y={GROUND_Y - 560} width={840} height={560} fill="#A8463A" />
        <rect x={120} y={GROUND_Y - 600} width={840} height={60} fill="#8C3A30" />
        <rect x={330} y={GROUND_Y - 520} width={420} height={110} rx={8} fill={C.white} />
        <text x={540} y={GROUND_Y - 440} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={76} fill="#8C3A30">MERCADO</text>
        <rect x={180} y={GROUND_Y - 360} width={720} height={360} fill="#1E2229" />
        <path d="M 260 1300 l 120 -180 l 60 120 l 90 -150" stroke="#AFC3CC" strokeWidth={6} fill="none" opacity={0.5} />
      </g>
    )}
    <rect x={0} y={GROUND_Y} width={W} height={H - GROUND_Y} fill={C.ground} />
  </svg>
);

const Store = () => (
  <svg width={W} height={H} style={{ position: "absolute" }}>
    <rect width={W} height={H} fill={C.slate} />
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <rect x={60 + i * 340} y={520} width={280} height={760} fill="#232A34" />
        {[0, 1, 2, 3].map((s) => (
          <g key={s}>
            <rect x={60 + i * 340} y={640 + s * 170} width={280} height={14} fill="#3B4552" />
            {[0, 1, 2, 3].map((p) => (
              <rect key={p} x={80 + i * 340 + p * 64} y={590 + s * 170} width={40} height={50} rx={4}
                fill={(i + s + p) % 3 === 0 ? "#4F6B7A" : "#3A4250"} />
            ))}
          </g>
        ))}
      </g>
    ))}
    <rect x={0} y={GROUND_Y} width={W} height={H - GROUND_Y} fill="#1D222A" />
    {/* balcão do caixa na frente dos personagens é desenhado em StoreCounter */}
  </svg>
);

export const StoreCounter = () => (
  <svg width={W} height={H} style={{ position: "absolute" }}>
    <rect x={-20} y={GROUND_Y - 130} width={W + 40} height={34} fill="#5B4636" />
    <rect x={-20} y={GROUND_Y - 96} width={W + 40} height={400} fill="#45362B" />
  </svg>
);

const MapBg = () => (
  <svg width={W} height={H} style={{ position: "absolute" }}>
    <rect width={W} height={H} fill={C.navy} />
    {Array.from({ length: 14 }).map((_, i) => (
      <line key={i} x1={0} y1={i * 150} x2={W} y2={i * 150 + 260} stroke="#2A3242" strokeWidth={10} />
    ))}
  </svg>
);

export const Background: React.FC<{ bg: Scene["bg"] }> = ({ bg }) => {
  if (bg === "dusk_city") return <DuskCity />;
  if (bg === "store_front") return <DuskCity store />;
  if (bg === "store") return <Store />;
  if (bg === "map") return <MapBg />;
  return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #2A2F3A, ${C.ink})` }} />;
};
