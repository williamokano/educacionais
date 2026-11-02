import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../../../src/theme";
import { ElementoProps } from "../../../src/v2/pacote";

// Cartões do episódio 8 (bunker). Ficam na faixa de ação (y 330–1140 do quadro), como os de cartoes.tsx.
// `fita` (rebobinar), `rotulo`, `termometro` e `chamada` já existem nos outros arquivos.
//   peso     balança de 1,5 t e dois carros de régua (sem número: são só visual); `nivel` 0..1 (ponteiro) e `texto`
//   forcas   bloco de concreto. modo "aperta" (setas azuis, ✓ aguenta), "estica" (setas vermelhas, ✗ quebra) ou
//            "par" (aperta nos primeiros `troca` s, padrão 1,8 s, e depois estica)
//   gas      (não pode se chamar `medidor`: o núcleo trata esse nome como cartão do HUD) gás carbônico sem escala: o ponteiro vai de `de` a `para` (0..1) em `dur` s; verde → amarelo → vermelho
//   cal      sacos de cal empilhando: texto grande e sub (≈ 50 kg / SEMANA); cresce em `dur` s
//   perguntaFinal  pergunta em texto grande que sobe do fundo (campo `linhas`, uma por linha); só texto

const clamp01 = (k: number) => Math.min(Math.max(k, 0), 1);
const TINTA = "#1b2230";
const CREME = "#f4f1ea";

const usePop = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame, fps, config: { damping: 12, mass: 0.5 } });
};

const Contorno: React.CSSProperties = { WebkitTextStroke: `8px ${TINTA}`, paintOrder: "stroke fill" };

/* ---------- peso ---------- */

const CARRO = (x: number, y: number, cor: string) => (
  <g key={`${x}${y}`} transform={`translate(${x} ${y})`}>
    <path d="M0 40 L0 26 L12 24 L22 8 L56 8 L68 24 L84 26 L84 40 Z" fill={cor} stroke={TINTA} strokeWidth={4} strokeLinejoin="round" />
    <path d="M26 12 L52 12 L62 24 L18 24 Z" fill="#9fe0f7" />
    <circle cx={20} cy={42} r={9} fill={TINTA} />
    <circle cx={66} cy={42} r={9} fill={TINTA} />
  </g>
);

const Peso: React.FC<ElementoProps> = ({ d, t }) => {
  const pop = usePop();
  const nivel = clamp01(d.nivel ?? t / 1.6);
  const ang = -75 + 150 * nivel; // ponteiro
  return (
    <div style={{ position: "absolute", left: d.x ?? 200, top: d.y ?? 20, transform: `scale(${pop})`, transformOrigin: "50% 0%", background: "rgba(20,24,31,0.9)", borderRadius: 32, padding: "18px 26px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 10px 0 rgba(0,0,0,0.18)" }}>
      <svg width={460} height={290} viewBox="0 0 460 290">
        <path d="M60 240 A170 170 0 0 1 400 240" fill="#f4f1ea" stroke={TINTA} strokeWidth={8} />
        {[0, 0.25, 0.5, 0.75, 1].map((k) => {
          const a = ((-75 + 150 * k) * Math.PI) / 180;
          return <line key={k} x1={230 + Math.sin(a) * 140} y1={240 - Math.cos(a) * 140} x2={230 + Math.sin(a) * 160} y2={240 - Math.cos(a) * 160} stroke={TINTA} strokeWidth={6} strokeLinecap="round" />;
        })}
        <path d="M230 240 L230 240" />
        <g transform={`rotate(${ang} 230 240)`}>
          <line x1={230} y1={240} x2={230} y2={96} stroke="#e0493a" strokeWidth={10} strokeLinecap="round" />
        </g>
        <circle cx={230} cy={240} r={16} fill={TINTA} />
        
        <rect x={40} y={250} width={380} height={26} rx={10} fill="#6e7782" stroke={TINTA} strokeWidth={5} />
      </svg>
      <svg width={440} height={64} viewBox="0 0 440 64">
        {CARRO(100, 12, "#e0493a")}
        {CARRO(250, 12, "#3b82c4")}
        
      </svg>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, color: "#ffd23f", letterSpacing: 1, textAlign: "center", whiteSpace: "nowrap" }}>{d.texto ?? "MAIS DE 1,5 t POR m²"}</div>
    </div>
  );
};

/* ---------- forças ---------- */

const Seta: React.FC<{ x1: number; y1: number; x2: number; y2: number; cor: string }> = ({ x1, y1, x2, y2, cor }) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 26;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2 - Math.cos(a) * h * 0.6} y2={y2 - Math.sin(a) * h * 0.6} stroke={cor} strokeWidth={14} strokeLinecap="round" />
      <path d={`M${x2} ${y2} L${x2 - Math.cos(a - 0.5) * h * 1.3} ${y2 - Math.sin(a - 0.5) * h * 1.3} L${x2 - Math.cos(a + 0.5) * h * 1.3} ${y2 - Math.sin(a + 0.5) * h * 1.3} Z`} fill={cor} />
    </g>
  );
};

const Forcas: React.FC<ElementoProps> = ({ d, t }) => {
  const pop = usePop();
  const troca = d.troca ?? 1.8;
  const modo: string = d.modo === "par" ? (t < troca ? "aperta" : "estica") : d.modo ?? "aperta";
  const aperta = modo === "aperta";
  const tt = d.modo === "par" && !aperta ? t - troca : t;
  const rachou = !aperta && tt > 0.6;
  const mexe = Math.sin(tt * 14) * 4;
  const cor = aperta ? "#3ea6ff" : "#ff3a3a";
  return (
    <div style={{ position: "absolute", left: d.x ?? 190, top: d.y ?? 30, transform: `scale(${pop})`, transformOrigin: "50% 0%", background: "rgba(20,24,31,0.9)", borderRadius: 32, padding: "16px 26px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 10px 0 rgba(0,0,0,0.18)" }}>
      <svg width={500} height={290} viewBox="0 0 500 290">
        {aperta ? (
          <g>
            <rect x={170} y={80} width={160} height={130} rx={10} fill="#c7c9cc" stroke={TINTA} strokeWidth={8} />
            <Seta x1={40 + mexe} y1={145} x2={160} y2={145} cor={cor} />
            <Seta x1={460 - mexe} y1={145} x2={340} y2={145} cor={cor} />
          </g>
        ) : (
          <g>
            <rect x={rachou ? 130 : 160} y={80} width={rachou ? 100 : 180} height={130} rx={10} fill="#c7c9cc" stroke={TINTA} strokeWidth={8} />
            {rachou && <rect x={290} y={80} width={80} height={130} rx={10} fill="#c7c9cc" stroke={TINTA} strokeWidth={8} />}
            {!rachou && <path d="M250 80 L238 120 L262 150 L244 210" fill="none" stroke={TINTA} strokeWidth={5} opacity={clamp01(tt / 0.6)} />}
            <Seta x1={350} y1={145} x2={470 + mexe} y2={145} cor={cor} />
            <Seta x1={150} y1={145} x2={30 - mexe} y2={145} cor={cor} />
          </g>
        )}
      </svg>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 62, color: aperta ? "#7fc4ff" : "#ff6a5c", letterSpacing: 3, ...Contorno }}>
        {aperta ? "APERTAR ✓" : "ESTICAR ✗"}
      </div>
    </div>
  );
};

/* ---------- medidor de gás carbônico ---------- */

const Gas: React.FC<ElementoProps> = ({ d, t }) => {
  const pop = usePop();
  const k = clamp01((d.de ?? 0) + ((d.para ?? 1) - (d.de ?? 0)) * clamp01(t / (d.dur ?? 3)));
  const ang = -80 + 160 * k;
  const cor = k < 0.4 ? "#3ed36f" : k < 0.7 ? "#ffd23f" : "#ff3a3a";
  const arco = (a0: number, a1: number, c: string) => {
    const p = (a: number) => [230 + Math.sin((a * Math.PI) / 180) * 150, 230 - Math.cos((a * Math.PI) / 180) * 150];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return <path d={`M${x0} ${y0} A150 150 0 0 1 ${x1} ${y1}`} fill="none" stroke={c} strokeWidth={32} strokeLinecap="butt" />;
  };
  return (
    <div style={{ position: "absolute", left: d.x ?? 220, top: d.y ?? 20, transform: `scale(${pop})`, transformOrigin: "50% 0%", background: "rgba(20,24,31,0.9)", borderRadius: 32, padding: "18px 26px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 10px 0 rgba(0,0,0,0.18)" }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 48, color: CREME, letterSpacing: 2 }}>{d.texto ?? "GÁS CARBÔNICO"}</div>
      <svg width={460} height={270} viewBox="0 0 460 270">
        {arco(-80, -27, "#3ed36f")}
        {arco(-27, 27, "#ffd23f")}
        {arco(27, 80, "#ff3a3a")}
        <g transform={`rotate(${ang} 230 230)`}>
          <line x1={230} y1={230} x2={230} y2={90} stroke={CREME} strokeWidth={12} strokeLinecap="round" />
        </g>
        <circle cx={230} cy={230} r={18} fill={CREME} />
      </svg>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 52, color: cor, letterSpacing: 3, ...Contorno }}>{k < 0.4 ? "AR BOM" : k < 0.7 ? "AR PESADO" : "PERIGO"}</div>
    </div>
  );
};

/* ---------- cal ---------- */

const Cal: React.FC<ElementoProps> = ({ d, t }) => {
  const pop = usePop();
  const k = clamp01(t / (d.dur ?? 2.4));
  const n = Math.round(1 + k * 9);
  return (
    <div style={{ position: "absolute", left: d.x ?? 180, top: d.y ?? 20, transform: `scale(${pop})`, transformOrigin: "50% 0%", background: "rgba(20,24,31,0.9)", borderRadius: 32, padding: "18px 26px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 10px 0 rgba(0,0,0,0.18)" }}>
      <svg width={520} height={250} viewBox="0 0 520 250">
        {Array.from({ length: n }).map((_, i) => {
          const fileira = i < 5 ? 0 : 1;
          const col = i % 5;
          const x = 14 + col * 98 + (fileira ? 49 : 0);
          const y = 170 - fileira * 82;
          return (
            <g key={i}>
              <rect x={x} y={y} width={92} height={76} rx={14} fill="#efeae0" stroke={TINTA} strokeWidth={6} />
              <text x={x + 46} y={y + 48} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={30} fill={TINTA}>CAL</text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 70, color: "#ffd23f", letterSpacing: 2, ...Contorno }}>{d.texto ?? "≈ 50 kg"}</div>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, color: CREME, letterSpacing: 3 }}>{d.sub ?? "POR SEMANA"}</div>
    </div>
  );
};

/* ---------- pergunta final ---------- */

const PerguntaFinal: React.FC<ElementoProps> = ({ d }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sobe = spring({ frame, fps, config: { damping: 16, mass: 0.9 } });
  const linhas: string[] = d.linhas ?? ["PREPARADO PRO", "SEU APOCALIPSE", "NUCLEAR?"];
  return (
    <div style={{ position: "absolute", left: 0, top: d.y ?? 90, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${(1 - sobe) * 520}px)`, opacity: Math.min(1, sobe * 1.6) }}>
      {linhas.map((l, i) => (
        <div key={i} style={{ fontFamily: FONT, fontWeight: 700, fontSize: 118, lineHeight: 1.04, letterSpacing: 3, color: i === linhas.length - 1 ? "#ffd23f" : CREME, WebkitTextStroke: `16px ${TINTA}`, paintOrder: "stroke fill", textAlign: "center" }}>{l}</div>
      ))}
    </div>
  );
};

export const CARTOES_BUNKER = { peso: Peso, forcas: Forcas, gas: Gas, cal: Cal, perguntaFinal: PerguntaFinal };
