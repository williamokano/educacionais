import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, H, SEGURA, W } from "../theme";
import { CenarioProps, ElementoProps } from "./pacote";
import { Lembra, Medidor, Mini, Prancheta, Termometro, Versus } from "./Informacao";
import { useTextos } from "./idioma";
import { EpisodioV2 } from "./tipos";

// Assets genéricos do motor, usados por qualquer série. Um pacote pode substituir qualquer um pelo mesmo nome.
// Safe zones 9:16 (CLAUDE.md): HUD y 160–330 · ação y 330–1140 · legenda y 1140–1360 · nada nos 12% da direita.

export const ZONA = { hud: [160, 330], acao: [330, 1140], legenda: [1140, 1360], direita: W * 0.88 } as const;


export const usePop = (atraso = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - atraso, fps, config: { damping: 14, mass: 0.6 } });
};

export const texto = (size: number, color: string, weight = 700): React.CSSProperties => ({
  fontFamily: FONT, fontWeight: weight, fontSize: size, color, lineHeight: 1.05, textTransform: "uppercase",
});

/* ---------- cenários ---------- */

const Escuro: React.FC<CenarioProps> = () => <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #2A2F3A, #121419)" }} />;
const CorSolida: React.FC<CenarioProps> = ({ cena }) => <AbsoluteFill style={{ background: cena.cor ?? C.navy }} />;

export const CENARIOS_GENERICOS: Record<string, React.FC<CenarioProps>> = { escuro: Escuro, "cor-solida": CorSolida };

/* ---------- ícones (escolha binária, cartões) ---------- */

const ICONES: Record<string, React.ReactNode> = {
  carteira: (
    <g>
      <rect x={-56} y={-66} width={100} height={30} rx={4} fill="#7DB37A" />
      <rect x={-70} y={-48} width={140} height={96} rx={16} fill="#6B4630" />
      <rect x={20} y={-16} width={56} height={36} rx={10} fill="#4E3222" />
      <circle cx={42} cy={2} r={7} fill="#C9A66B" />
    </g>
  ),
  delegacia: (
    <g>
      <path d="M -86 -30 L 0 -84 L 86 -30 Z" fill="#3E5C8A" />
      <rect x={-74} y={-30} width={148} height={104} fill="#E6E1D6" />
      {[-48, -16, 16, 48].map((x) => <rect key={x} x={x - 9} y={-18} width={18} height={70} fill="#B9B3A6" />)}
      <rect x={-86} y={64} width={172} height={14} fill="#3E5C8A" />
      <circle cx={0} cy={-46} r={12} fill={C.yellow} />
    </g>
  ),
  entregar: (
    <g>
      <path d="M -90 40 Q -40 10 10 22 L 60 30 Q 76 34 70 48 Q 64 58 40 54 L 0 50" stroke="#D9A27B" strokeWidth={26} fill="none" strokeLinecap="round" />
      <g transform="translate(30 -10) rotate(-12)">
        <rect x={-40} y={-28} width={80} height={56} rx={10} fill="#6B4630" />
        <rect x={-30} y={-40} width={56} height={18} rx={3} fill="#7DB37A" />
      </g>
    </g>
  ),
  check: <path d="M -60 0 L -18 44 L 64 -48" stroke={C.green} strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  x: <path d="M -50 -50 L 50 50 M 50 -50 L -50 50" stroke={C.red} strokeWidth={26} strokeLinecap="round" />,
  interrogacao: <text y={60} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={190} fill={C.white}>?</text>,
};

export const Icone: React.FC<{ id: string; tamanho?: number }> = ({ id, tamanho = 220 }) => {
  if (!ICONES[id]) throw new Error(`ícone desconhecido: "${id}" (existem: ${Object.keys(ICONES).join(", ")})`);
  return <svg viewBox="-110 -110 220 220" width={tamanho} height={tamanho}>{ICONES[id]}</svg>;
};

/* ---------- cartões do HUD (faixa y 160–330) ---------- */

const Relogio: React.FC<ElementoProps> = ({ d }) => {
  const pop = usePop();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: pop, transform: `translateY(${(1 - pop) * -30}px)` }}>
      {d.dia && <div style={{ ...texto(40, C.ink), background: C.white, padding: "8px 18px", borderRadius: 8 }}>{d.dia}</div>}
      <div style={{ background: "rgba(10,12,16,0.82)", padding: "4px 20px 6px", borderRadius: 10, textAlign: "center" }}>
        <div style={{ ...texto(64, C.white), letterSpacing: 3 }}>{d.hora}</div>
        {/* subtítulo de estado: FALTAM 2 DIAS, A NOITE CHEGA, NINGUÉM DORME… */}
        {d.sub && <div style={{ ...texto(24, d.subCor === "vermelho" ? C.red : C.yellow, 500), letterSpacing: 3 }}>{d.sub}</div>}
      </div>
    </div>
  );
};

/** { tipo: "etiqueta", texto, icone?: (ícone pequeno), marca?: "check" | "x", cor?: "branco" } — várias se empilham no HUD */
const Etiqueta: React.FC<ElementoProps> = ({ d }) => {
  const pop = usePop(2);
  const claro = d.cor === "branco";
  const fg = claro ? C.ink : C.white;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, ...texto(34, fg), background: claro ? C.white : "rgba(10,12,16,0.82)",
      padding: "6px 16px", borderRadius: 8, letterSpacing: 2, opacity: pop, transform: `translateX(${(1 - pop) * -24}px)`,
    }}>
      {d.icone && <Mini id={d.icone} cor={d.corIcone ? (C as any)[d.corIcone] ?? d.corIcone : fg} tamanho={30} />}
      {d.texto}
      {d.marca && <Mini id={d.marca} cor={d.marca === "check" ? C.green : C.red} tamanho={32} />}
    </div>
  );
};

const Ficha: React.FC<ElementoProps> = ({ d }) => {
  const pop = usePop();
  return (
    <div style={{ transform: `rotate(${-2 + (1 - pop) * -6}deg) scale(${pop})`, transformOrigin: "left center", opacity: pop }}>
      <div style={{ background: d.cor ?? C.white, borderRadius: 14, padding: "14px 30px", boxShadow: "0 8px 0 rgba(0,0,0,0.3)" }}>
        <div style={texto(66, C.ink)}>{d.titulo}</div>
        {d.sub && <div style={{ ...texto(32, C.ink, 500), marginTop: 4 }}>{d.sub}</div>}
      </div>
    </div>
  );
};

const Cronometro: React.FC<ElementoProps> = ({ d, progresso }) => {
  const seg = (s: string) => { const [m, ss] = s.split(":").map(Number); return m * 60 + ss; };
  const v = Math.round(interpolate(Math.min(progresso * 1.25, 1), [0, 1], [seg(d.de), seg(d.ate)]));
  const mmss = `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
  return <div style={{ ...texto(64, C.white), background: "rgba(10,12,16,0.82)", padding: "4px 20px", borderRadius: 10, letterSpacing: 3 }}>{mmss}</div>;
};

/* ---------- cartões do centro (faixa da ação, y 330–1140) ---------- */

const Regra: React.FC<ElementoProps> = ({ d }) => {
  const pop = usePop();
  return (
    <div style={{
      width: SEGURA.largura, padding: 20, borderRadius: 26, transform: `scale(${pop})`, opacity: pop,
      background: `repeating-linear-gradient(-45deg, ${C.yellow} 0 34px, ${C.ink} 34px 68px)`,
    }}>
      <div style={{ background: "#1B1F27", borderRadius: 14, padding: "44px 36px", textAlign: "center" }}>
        <div style={texto(58, C.yellow)}>{d.titulo ?? "REGRA"}{d.numero ? ` · Nº ${d.numero}` : ""}</div>
        <div style={{ ...texto(88, C.white), marginTop: 22 }}>{d.texto}</div>
      </div>
    </div>
  );
};

/**
 * { tipo: "titulo", texto, sub?, grande?: true, cor?: "amarelo" | "vermelho", revela?: { trecho, texto, cor? } }
 * grande = cartão-palavra ("ANDE."); revela = revelação em 2 tempos ("A PALAVRA ERA…" → "LINDA" no trecho k).
 */
const Titulo: React.FC<ElementoProps> = ({ d, t, trechos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = usePop();
  const corDe = (c?: string, padrao: string = C.white) => (c === "amarelo" ? C.yellow : c === "vermelho" ? C.red : padrao);
  const tr = d.revela ? trechos[d.revela.trecho] ?? 0 : Infinity;
  const kr = Number.isFinite(tr) ? spring({ frame: frame - Math.round(tr * fps), fps, config: { damping: 10, mass: 0.6 } }) : 0;
  return (
    <div style={{ textAlign: "center", transform: `scale(${0.9 + pop * 0.1})`, opacity: pop, padding: "0 60px" }}>
      <div style={texto(d.grande ? 210 : d.revela ? 84 : 120, corDe(d.cor, d.grande ? C.yellow : C.white))}>{d.texto}</div>
      {d.sub && <div style={{ ...texto(44, C.yellow, 500), marginTop: 14, letterSpacing: 4 }}>{d.sub}</div>}
      {d.revela && t >= tr && (
        <div style={{ ...texto(190, corDe(d.revela.cor, C.yellow)), marginTop: 30, transform: `scale(${kr})`, opacity: Math.min(kr * 1.5, 1) }}>{d.revela.texto}</div>
      )}
    </div>
  );
};

/** Escolha binária do fim: dois lados com ícone e o "COMENTE" (estrutura de episódio do CLAUDE.md). */
const Escolha: React.FC<ElementoProps> = ({ d }) => {
  const frame = useCurrentFrame();
  const tx = useTextos();
  const a = usePop(0);
  const b = usePop(8);
  const ou = usePop(14);
  const chamada = usePop(20);
  const pulso = 1 + 0.04 * Math.sin(frame / 4);
  const Lado: React.FC<{ l: { texto: string; icone: string }; letra: string; cor: string; pop: number; dx: number }> = ({ l, letra, cor, pop, dx }) => (
    <div style={{
      width: (SEGURA.largura - 40) / 2, height: 560, borderRadius: 30, background: "rgba(14,16,22,0.9)", border: `8px solid ${cor}`, boxSizing: "border-box",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26,
      opacity: pop, transform: `translateX(${(1 - pop) * dx}px) scale(${0.85 + pop * 0.15})`,
    }}>
      <div style={{ ...texto(56, C.ink), background: cor, width: 84, height: 84, borderRadius: 42, display: "flex", alignItems: "center", justifyContent: "center" }}>{letra}</div>
      <Icone id={l.icone} tamanho={220} />
      <div style={{ ...texto(56, C.white), textAlign: "center", padding: "0 18px", textWrap: "balance" }}>{l.texto}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
      <div style={{ display: "flex", gap: 40, alignItems: "center", position: "relative" }}>
        <Lado l={d.a} letra="A" cor={C.yellow} pop={a} dx={-160} />
        <Lado l={d.b} letra="B" cor={C.white} pop={b} dx={160} />
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%, -50%) scale(${ou})`, ...texto(54, C.ink), background: C.white, borderRadius: 40, padding: "10px 22px" }}>{tx.ou}</div>
      </div>
      <div style={{ ...texto(64, C.ink), background: C.yellow, borderRadius: 12, padding: "10px 34px", opacity: chamada, transform: `scale(${chamada * pulso})` }}>{d.chamada ?? tx.comente}</div>
    </div>
  );
};

export const CARTOES_HUD = new Set(["relogio", "etiqueta", "ficha", "cronometro", "medidor", "versus", "lembra", "termometro"]);

export const CARTOES_GENERICOS: Record<string, React.FC<ElementoProps>> = {
  relogio: Relogio, etiqueta: Etiqueta, ficha: Ficha, cronometro: Cronometro, regra: Regra, titulo: Titulo, escolha: Escolha,
  medidor: Medidor, versus: Versus, lembra: Lembra, termometro: Termometro, prancheta: Prancheta,
};

/* ---------- diagramas ---------- */

const Cota: React.FC<ElementoProps> = ({ d }) => {
  const pop = usePop(10);
  const y = d.y ?? 760;
  return (
    <svg width={W} height={H} style={{ position: "absolute", opacity: pop }}>
      <g stroke={C.yellow} strokeWidth={8} strokeLinecap="round" fill="none">
        <path d={`M ${W / 2 - 230} ${y} L ${W / 2 - 50} ${y} M ${W / 2 - 80} ${y - 26} L ${W / 2 - 46} ${y} L ${W / 2 - 80} ${y + 26}`} />
        <path d={`M ${W / 2 + 230} ${y} L ${W / 2 + 50} ${y} M ${W / 2 + 80} ${y - 26} L ${W / 2 + 46} ${y} L ${W / 2 + 80} ${y + 26}`} />
      </g>
      <rect x={W / 2 - 150} y={y - 170} width={300} height={110} rx={14} fill={C.yellow} />
      <text x={W / 2} y={y - 90} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={80} fill={C.ink}>{d.valor}</text>
    </svg>
  );
};

/** Número que sobe (ou desce) durante a batida: valores, distâncias, contagens. */
const Contador: React.FC<ElementoProps> = ({ d, progresso }) => {
  const pop = usePop(4);
  const tx = useTextos();
  const k = Math.min(progresso * 1.4, 1);
  const eased = 1 - Math.pow(1 - k, 3);
  const v = Math.round(d.de + (d.ate - d.de) * eased);
  const fmt = v.toLocaleString(tx.locale);
  const cor = d.cor === "vermelho" ? C.red : d.cor === "verde" ? C.green : C.yellow;
  return (
    <div style={{ position: "absolute", top: d.y ?? 420, left: 0, width: W, display: "flex", flexDirection: "column", alignItems: "center", opacity: pop, transform: `scale(${0.8 + pop * 0.2})` }}>
      {/* placa escura: o número fica legível sobre qualquer cenário (inclusive quando o zoom sobe o conteúdo) */}
      <div style={{ ...texto(130, cor), background: "rgba(10,12,16,0.85)", borderRadius: 18, padding: "0 30px 6px" }}>{d.prefixo ?? ""}{fmt}{d.sufixo ?? ""}</div>
      {d.rotulo && <div style={{ ...texto(44, C.white, 500), letterSpacing: 4, marginTop: 6 }}>{d.rotulo}</div>}
    </div>
  );
};

export const DIAGRAMAS_GENERICOS: Record<string, React.FC<ElementoProps>> = { cota: Cota, contador: Contador };

/* ---------- cartão final padrão: PARTE N → N+1 · pergunta · SIGA (sem relógio) ---------- */

export const CartaoFinalPadrao: React.FC<{ ep: EpisodioV2 }> = ({ ep }) => {
  const frame = useCurrentFrame();
  const tx = useTextos();
  const o = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const seta = usePop(8);
  const f = ep.endcard ?? {};
  return (
    <AbsoluteFill style={{ background: "#121419", alignItems: "center", justifyContent: "center", opacity: o, gap: 44, paddingBottom: 200 }}>
      {f.parte != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <div style={texto(90, C.white)}>{tx.parte} {f.parte}</div>
          <div style={{ ...texto(90, C.yellow), opacity: seta, transform: `translateX(${(1 - seta) * -40}px)` }}>→ {f.parte + 1}</div>
        </div>
      )}
      {f.pergunta && <div style={{ ...texto(72, C.white), textAlign: "center", maxWidth: SEGURA.largura, textWrap: "balance" }}>{f.pergunta}</div>}
      {/* a chamada quebra em linhas equilibradas dentro da coluna segura: nada de palavra sozinha na segunda linha nem texto na borda */}
      <div style={{ ...texto(64, C.ink), background: C.yellow, padding: "12px 36px", borderRadius: 12, transform: `scale(${seta})`, maxWidth: SEGURA.largura, textAlign: "center", textWrap: "balance", boxSizing: "border-box" }}>{f.chamada ?? tx.siga}</div>
      <div style={{ position: "absolute", top: 1400, ...texto(32, C.white, 500), opacity: 0.4, letterSpacing: 10 }}>{ep.series}</div>
    </AbsoluteFill>
  );
};
