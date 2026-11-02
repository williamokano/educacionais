import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../../../src/theme";
import { ElementoProps } from "../../../src/v2/pacote";
import { rnd } from "../../../src/v3d/qualidade";

// Cartões do episódio 6 (freio). Ficam na faixa de ação (y 330–1140 do quadro), como os de cartoes.tsx.
//   fita        rebobinar: chiado de fita VHS na tela toda, "◀◀ REBOBINANDO" (campo texto); some em `dur` s (padrão 1,6)
//   termometro  termômetro sem escala: o mercúrio sobe de `de` a `para` (0..1) em `dur` s; texto = rótulo (CALOR)
//   chamada     chamada final: icone "curtir" | "comentar" | "compartilhar" | "seguir", texto e sub (linha menor)
//   roda        barra RODA × CARRO. modo "travada" (a roda cai a zero, o carro segue), "ciclo" (a roda trava e solta
//               várias vezes por segundo, perto do carro) ou "girando" (roda = carro)

const clamp01 = (k: number) => Math.min(Math.max(k, 0), 1);
const TOPO_ACAO = 330; // início da faixa de ação; o cartão que cobre o quadro sobe até y = 0

const usePop = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame, fps, config: { damping: 12, mass: 0.5 } });
};

const Fita: React.FC<ElementoProps> = ({ d, t }) => {
  const dur = d.dur ?? 1.6;
  const frame = useCurrentFrame();
  const alfa = t < dur - 0.4 ? 1 : clamp01((dur - t) / 0.4);
  if (t > dur) return null;
  return (
    <div style={{ position: "absolute", left: 0, top: -TOPO_ACAO, width: 1080, height: 1920, opacity: alfa, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 6px)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)" }} />
      {Array.from({ length: 7 }).map((_, i) => {
        const y = ((rnd(i * 7 + Math.floor(frame / 3)) * 1920) % 1920);
        const h = 10 + rnd(i + 40 + Math.floor(frame / 2)) * 60;
        return <div key={i} style={{ position: "absolute", left: 0, width: 1080, top: y, height: h, background: `rgba(255,255,255,${0.1 + rnd(i + frame) * 0.22})`, transform: `translateX(${(rnd(i + frame * 3) - 0.5) * 40}px)` }} />;
      })}
      <div style={{ position: "absolute", left: 90, top: 250, fontFamily: FONT, fontWeight: 700, fontSize: 72, color: "#e9f2ff", letterSpacing: 4, textShadow: "4px 4px 0 #1a2b66, -3px 0 0 rgba(255,60,60,0.6), 3px 0 0 rgba(60,200,255,0.6)", opacity: Math.floor(frame / 6) % 2 ? 1 : 0.55 }}>
        ◀◀ {d.texto ?? "REBOBINANDO"}
      </div>
    </div>
  );
};

const Termometro: React.FC<ElementoProps> = ({ d, t }) => {
  const pop = usePop();
  const nivel = (d.de ?? 0) + ((d.para ?? 1) - (d.de ?? 0)) * clamp01(t / (d.dur ?? 3));
  const quente = nivel > 0.66;
  const cor = nivel > 0.66 ? "#ff3a14" : nivel > 0.33 ? "#ff9a1a" : "#7fc4ff";
  const H = 420;
  return (
    <div style={{ position: "absolute", left: d.x ?? 150, top: d.y ?? 60, transform: `scale(${pop})`, transformOrigin: "50% 0%", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 42, color: "#f4f1ea", letterSpacing: 3, WebkitTextStroke: "8px #1b2230", paintOrder: "stroke fill" }}>{d.texto ?? "CALOR"}</div>
      <svg width={120} height={H + 90} viewBox={`0 0 120 ${H + 90}`}>
        <rect x={38} y={10} width={44} height={H} rx={22} fill="#f4f1ea" stroke="#1b2230" strokeWidth={8} />
        <circle cx={60} cy={H + 30} r={44} fill="#f4f1ea" stroke="#1b2230" strokeWidth={8} />
        <rect x={50} y={10 + (H - 30) * (1 - nivel) + 20} width={20} height={(H - 30) * nivel + 20 + 12} rx={10} fill={cor} />
        <circle cx={60} cy={H + 30} r={30} fill={cor} />
        {[0.25, 0.5, 0.75].map((k) => <line key={k} x1={82} x2={100} y1={10 + (H - 10) * (1 - k)} y2={10 + (H - 10) * (1 - k)} stroke="#1b2230" strokeWidth={6} strokeLinecap="round" />)}
      </svg>
      {quente && <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, color: "#ff3a14", WebkitTextStroke: "8px #1b2230", paintOrder: "stroke fill" }}>QUENTE!</div>}
    </div>
  );
};

const Barra: React.FC<{ nome: string; k: number; cor: string }> = ({ nome, k, cor }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
    <div style={{ width: 150, fontFamily: FONT, fontWeight: 700, fontSize: 42, color: "#f4f1ea", letterSpacing: 2 }}>{nome}</div>
    <div style={{ width: 520, height: 46, borderRadius: 23, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
      <div style={{ width: `${clamp01(k) * 100}%`, height: "100%", background: cor, borderRadius: 23 }} />
    </div>
  </div>
);

const Roda: React.FC<ElementoProps> = ({ d, t }) => {
  const pop = usePop();
  const modo = d.modo ?? "travada";
  const carro = modo === "travada" ? 0.95 - 0.04 * t : modo === "ciclo" ? 0.9 - 0.05 * t : 0.85;
  const fase = (t * 2.4) % 1;
  const serra = fase < 0.45 ? fase / 0.45 : 1 - (fase - 0.45) / 0.55;
  const roda = modo === "travada" ? Math.max(0, carro * (1 - clamp01(t / 0.6))) : modo === "ciclo" ? carro * (1 - 0.8 * serra) : carro;
  const travou = roda < 0.08;
  return (
    <div style={{ position: "absolute", left: d.x ?? 150, top: d.y ?? 40, transform: `scale(${pop})`, transformOrigin: "0% 0%", background: "rgba(20,24,31,0.88)", borderRadius: 28, padding: "22px 28px", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 10px 0 rgba(0,0,0,0.18)" }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 38, color: "#f4f1ea", letterSpacing: 2 }}>{d.titulo ?? "RODA × CARRO"}</div>
      <Barra nome="CARRO" k={carro} cor="#7fc4ff" />
      <Barra nome="RODA" k={roda} cor={travou ? "#ff3a14" : "#ffd23f"} />
      {modo !== "girando" && (
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, color: travou ? "#ff3a14" : "#ffd23f", letterSpacing: 2 }}>
          {modo === "travada" ? (travou ? "TRAVADA: SÓ ESCORREGA" : "FREANDO…") : "SOLTA E APERTA"}
        </div>
      )}
    </div>
  );
};

/** Chamada final (curtir, comentar, compartilhar, seguir): pílula com ícone, palavra grande e, se houver, uma linha menor. */
const ICONES: Record<string, { cor: string; desenho: React.ReactNode }> = {
  curtir: { cor: "#ff4d6d", desenho: <path d="M32 54 C8 36 6 18 18 12 C26 8 32 14 32 18 C32 14 38 8 46 12 C58 18 56 36 32 54 Z" fill="#fff" /> },
  comentar: { cor: "#3ea6ff", desenho: <path d="M10 14 H54 V40 H30 L18 52 V40 H10 Z" fill="#fff" /> },
  compartilhar: { cor: "#2fd37f", desenho: <path d="M10 34 L34 12 V25 C50 26 56 36 58 52 C50 42 44 40 34 41 V54 Z" fill="#fff" /> },
  seguir: { cor: "#ffd23f", desenho: <g><circle cx="28" cy="20" r="10" fill="#241403" /><path d="M8 54 C8 38 48 38 48 54 Z" fill="#241403" /><path d="M50 18 V40 M39 29 H61" stroke="#241403" strokeWidth={7} strokeLinecap="round" /></g> },
};

const Chamada: React.FC<ElementoProps> = ({ d }) => {
  const pop = usePop();
  const ic = ICONES[d.icone ?? "curtir"];
  return (
    <div style={{
      transform: `scale(${pop})`, display: "flex", alignItems: "center", gap: 26, width: 756, boxSizing: "border-box",
      background: "rgba(20,24,31,0.9)", borderRadius: 44, padding: "16px 30px 16px 20px", boxShadow: "0 8px 0 rgba(0,0,0,0.2)",
    }}>
      <svg width={104} height={104} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
        <circle cx={32} cy={32} r={32} fill={ic.cor} />
        <g transform="translate(6 6) scale(0.8)">{ic.desenho}</g>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 64, color: "#f4f1ea", letterSpacing: 3, lineHeight: 1 }}>{d.texto}</div>
        {d.sub && <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 38, color: "#ffd23f", letterSpacing: 1, lineHeight: 1.1 }}>{d.sub}</div>}
      </div>
    </div>
  );
};

export const CARTOES_FREIO = { fita: Fita, termometro: Termometro, roda: Roda, chamada: Chamada };
