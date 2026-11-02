import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SEGURA } from "../theme";
import { useTextos } from "./idioma";
import { ElementoProps } from "./pacote";

// Cartões de informação (técnicas da referência "Não corra, ande", docs/referencias/nao-corra-ande/):
// medidor comparativo, versus, selo "lembra do ep.", termômetro e a prancheta ("No papel…") com status que mudam.
// Todos entram no trecho `trecho` da fala (o Episodio cuida disso) e animam a partir dali.

const clamp01 = (k: number) => Math.min(Math.max(k, 0), 1);
const suave = (k: number) => 1 - Math.pow(1 - clamp01(k), 3);

const usePop = (atraso = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - atraso, fps, config: { damping: 14, mass: 0.6 } });
};

const txt = (size: number, color: string, weight = 700): React.CSSProperties => ({
  fontFamily: FONT, fontWeight: weight, fontSize: size, color, lineHeight: 1.05, textTransform: "uppercase",
});

export const COR: Record<string, string> = { azul: "#3E6FB0", vermelho: C.red, verde: C.green, amarelo: "#D9A21F", branco: C.white, cinza: "#8A94A3" };
const cor = (c?: string, padrao = "azul") => COR[c ?? padrao] ?? c ?? COR[padrao];

/* ---------- ícones pequenos (32 px) para etiquetas, medidores e prancheta ---------- */

const MINI: Record<string, (c: string) => React.ReactNode> = {
  check: (c) => <path d="M -10 0 L -3 8 L 11 -9" stroke={c} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  x: (c) => <path d="M -9 -9 L 9 9 M 9 -9 L -9 9" stroke={c} strokeWidth={5} strokeLinecap="round" />,
  alerta: (c) => <g><path d="M 0 -12 L 13 11 L -13 11 Z" fill={c} /><rect x={-1.6} y={-4} width={3.2} height={8} fill="#15181F" /><circle cx={0} cy={7} r={1.8} fill="#15181F" /></g>,
  relogio: (c) => <g stroke={c} strokeWidth={3} fill="none" strokeLinecap="round"><circle r={11} /><path d="M 0 -6 L 0 0 L 5 3" /></g>,
  gota: (c) => <path d="M 0 -12 Q 10 2 8 6 A 8 8 0 0 1 -8 6 Q -10 2 0 -12 Z" fill={c} />,
  comida: (c) => <g fill={c}><path d="M -12 -1 L 12 -1 Q 11 11 0 11 Q -11 11 -12 -1 Z" /><rect x={-6} y={-9} width={3} height={7} rx={1} /><rect x={2} y={-11} width={3} height={9} rx={1} /></g>,
  pessoa: (c) => <g fill={c}><circle cy={-6} r={5} /><path d="M -9 11 Q -9 0 0 0 Q 9 0 9 11 Z" /></g>,
  porta: (c) => <g><rect x={-8} y={-12} width={16} height={24} rx={2} fill={c} /><circle cx={4} cy={1} r={1.8} fill="#15181F" /></g>,
  janela: (c) => <g stroke={c} strokeWidth={3} fill="none"><rect x={-10} y={-10} width={20} height={20} rx={2} /><path d="M 0 -10 L 0 10 M -10 0 L 10 0" /></g>,
  cadeado: (c) => <g><rect x={-9} y={-2} width={18} height={14} rx={2} fill={c} /><path d="M -5 -2 L -5 -6 A 5 5 0 0 1 5 -6 L 5 -2" stroke={c} strokeWidth={3} fill="none" /></g>,
  chuva: (c) => <g><path d="M -11 0 A 6 6 0 0 1 -5 -9 A 8 8 0 0 1 10 -6 A 5 5 0 0 1 9 3 Z" fill={c} /><path d="M -6 7 L -8 12 M 0 7 L -2 12 M 6 7 L 4 12" stroke={c} strokeWidth={2.5} strokeLinecap="round" /></g>,
  passos: (c) => <g fill={c}><ellipse cx={-5} cy={-3} rx={4} ry={7} /><ellipse cx={5} cy={4} rx={4} ry={7} /></g>,
  gelo: (c) => <rect x={-10} y={-10} width={20} height={20} rx={4} fill={c} opacity={0.9} />,
  riso: (c) => <g><circle r={11} fill={c} /><path d="M -6 2 Q 0 9 6 2 Z" fill="#15181F" /><circle cx={-4} cy={-3} r={1.6} fill="#15181F" /><circle cx={4} cy={-3} r={1.6} fill="#15181F" /></g>,
  volta: (c) => <path d="M 10 -6 L -6 -6 M -2 -11 L -7 -6 L -2 -1 M -6 -6 Q 10 -6 10 4 Q 10 10 2 10" stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" />,
  wifi: (c) => <g stroke={c} strokeWidth={3} fill="none" strokeLinecap="round"><path d="M -12 -3 Q 0 -13 12 -3" /><path d="M -7 2 Q 0 -4 7 2" /><circle cy={8} r={2} fill={c} /></g>,
  celular: (c) => <g><rect x={-7} y={-12} width={14} height={24} rx={3} fill={c} /><rect x={-5} y={-9} width={10} height={15} fill="#15181F" opacity={0.5} /></g>,
  radio: (c) => <g><rect x={-12} y={-5} width={24} height={16} rx={3} fill={c} /><circle cx={5} cy={3} r={4} fill="#15181F" opacity={0.6} /><path d="M -8 -5 L 6 -13" stroke={c} strokeWidth={2.5} strokeLinecap="round" /></g>,
  bateria: (c) => <g><rect x={-12} y={-7} width={22} height={14} rx={2} stroke={c} strokeWidth={2.5} fill="none" /><rect x={10} y={-3} width={3} height={6} fill={c} /><rect x={-9} y={-4} width={10} height={8} fill={c} /></g>,
};

export const NOMES_MINI = Object.keys(MINI);

export const Mini: React.FC<{ id: string; cor?: string; tamanho?: number }> = ({ id, cor: c = C.white, tamanho = 32 }) => {
  if (!MINI[id]) throw new Error(`ícone pequeno desconhecido: "${id}" (existem: ${NOMES_MINI.join(", ")})`);
  return <svg viewBox="-14 -14 28 28" width={tamanho} height={tamanho} style={{ flex: "none" }}>{MINI[id](c)}</svg>;
};

/* ---------- medidor: barras com rótulo e % que anda de `de` até `ate` ---------- */

/** { tipo: "medidor", itens: [{ rotulo, de, ate, cor, icone }], sufixo: "%" } */
export const Medidor: React.FC<ElementoProps> = ({ d, t }) => {
  const pop = usePop();
  return (
    <div style={{ background: "#F4F1EA", borderRadius: 12, padding: "10px 18px", boxShadow: "0 6px 0 rgba(0,0,0,0.3)", width: 470, opacity: pop, transform: `translateY(${(1 - pop) * -20}px)` }}>
      {(d.itens as any[]).map((it, i) => {
        const k = suave((t - 0.25 - i * 0.2) / (it.duracao ?? 1.2));
        const v = Math.round((it.de ?? it.ate) + (it.ate - (it.de ?? it.ate)) * k);
        const c = cor(it.cor, i === 0 ? "azul" : "vermelho");
        return (
          <div key={i} style={{ marginTop: i ? 8 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {it.icone && <Mini id={it.icone} cor={c} tamanho={26} />}
              <div style={{ ...txt(26, "#15181F", 500), flex: 1, letterSpacing: 1 }}>{it.rotulo}</div>
              <div style={txt(36, c)}>{v}{d.sufixo ?? "%"}</div>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: "#D8D4CB", marginTop: 4 }}>
              <div style={{ height: 10, borderRadius: 5, background: c, width: `${clamp01(v / (d.maximo ?? 100)) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- versus: "1% VOCÊ vs 99% CHUVA" ---------- */

/** { tipo: "versus", a: { valor, rotulo, cor }, b: { valor, rotulo, cor } } */
export const Versus: React.FC<ElementoProps> = ({ d }) => {
  const tx = useTextos();
  const a = usePop();
  const b = usePop(6);
  const Lado: React.FC<{ l: any; pop: number; padrao: string }> = ({ l, pop, padrao }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: pop, transform: `scale(${0.7 + pop * 0.3})` }}>
      <div style={txt(64, cor(l.cor, padrao))}>{l.valor}</div>
      <div style={{ ...txt(20, "#15181F", 500), letterSpacing: 2 }}>{l.rotulo}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, background: "#F4F1EA", borderRadius: 12, padding: "8px 26px", boxShadow: "0 6px 0 rgba(0,0,0,0.3)" }}>
      <Lado l={d.a} pop={a} padrao="azul" />
      <div style={txt(30, "#8A94A3")}>{tx.vs}</div>
      <Lado l={d.b} pop={b} padrao="vermelho" />
    </div>
  );
};

/* ---------- selo "↩ LEMBRA DO EP. 9?" ---------- */

/** { tipo: "lembra", texto: "LEMBRA DO EP. 9?" } */
export const Lembra: React.FC<ElementoProps> = ({ d }) => {
  const pop = usePop();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(10,12,16,0.85)", border: "2px solid #56606E", borderRadius: 8, padding: "6px 16px", opacity: pop, transform: `scale(${0.8 + pop * 0.2})` }}>
      <Mini id="volta" cor={C.white} tamanho={28} />
      <div style={{ ...txt(30, C.white), letterSpacing: 2 }}>{d.texto}</div>
    </div>
  );
};

/* ---------- termômetro ---------- */

/** { tipo: "termometro", valor: "38,5°", rotulo: "FEBRE", nivel: 0.8 } */
export const Termometro: React.FC<ElementoProps> = ({ d, t }) => {
  const pop = usePop();
  const nivel = (d.nivel ?? 0.8) * suave((t - 0.2) / 1.0);
  const c = cor(d.cor, "vermelho");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#F4F1EA", borderRadius: 12, padding: "8px 22px", boxShadow: "0 6px 0 rgba(0,0,0,0.3)", opacity: pop, transform: `scale(${0.8 + pop * 0.2})` }}>
      <svg width={36} height={110} viewBox="0 0 36 110">
        <rect x={11} y={4} width={14} height={80} rx={7} fill="#E6E1D6" stroke="#8A94A3" strokeWidth={2} />
        <rect x={14} y={8 + 72 * (1 - nivel)} width={8} height={72 * nivel + 6} rx={4} fill={c} />
        <circle cx={18} cy={92} r={14} fill={c} stroke="#8A94A3" strokeWidth={2} />
      </svg>
      <div>
        <div style={{ ...txt(22, "#15181F", 500), letterSpacing: 2 }}>{d.rotulo}</div>
        <div style={txt(70, c)}>{d.valor}</div>
      </div>
    </div>
  );
};

/* ---------- prancheta: "No papel…" com status que mudam no trecho certo ---------- */

type Item = { rotulo: string; valor: string; status?: "ok" | "alerta" | "perigo"; icone?: string; trecho?: number };
type Mudanca = { trecho: number; item: number; valor?: string; status?: Item["status"] };

const STATUS = {
  ok: { icone: "check", cor: C.green },
  alerta: { icone: "alerta", cor: "#D9A21F" },
  perigo: { icone: "x", cor: C.red },
};

/**
 * { tipo: "prancheta", titulo: "NO PAPEL", itens: [{ rotulo: "ÁGUA", valor: "7 DIAS", status: "ok", icone: "gota" }],
 *   muda: [{ trecho: 2, item: 1, valor: "6", status: "perigo" }], carimbo: { texto: "NÃO FECHA", trecho: 3 } }
 * Cada linha se escreve uma depois da outra (ou no trecho dela). Na mudança, o valor velho é riscado e o novo
 * aparece em vermelho ao lado; o ícone de status troca.
 */
export const Prancheta: React.FC<ElementoProps> = ({ d, t, trechos }) => {
  const { fps } = useVideoConfig();
  const entra = usePop();
  const inicio = (k?: number) => (k == null ? 0 : trechos[k] ?? 0);
  const itens = d.itens as Item[];
  const mudas = (d.muda ?? []) as Mudanca[];
  const carimbo = d.carimbo as { texto: string; trecho?: number; cor?: string } | undefined;
  const tc = carimbo ? inicio(carimbo.trecho) : Infinity;
  const kc = Number.isFinite(tc) ? spring({ frame: Math.round((t - tc) * fps), fps, config: { damping: 9, mass: 0.5 } }) : 0;
  return (
    <div style={{ position: "relative", width: SEGURA.largura, opacity: entra, transform: `translateY(${(1 - entra) * 260}px) rotate(${-2 + (1 - entra) * 6}deg)` }}>
      {/* prancheta: placa de madeira + prendedor de metal */}
      <div style={{ background: "#9A6B3F", borderRadius: 22, padding: "54px 26px 26px", boxShadow: "0 14px 0 rgba(0,0,0,0.3)" }}>
        <div style={{ position: "absolute", left: "50%", top: -18, width: 220, height: 62, marginLeft: -110, background: "linear-gradient(#C9CDD2, #8A9099)", borderRadius: 12, border: "4px solid #5F666E" }} />
        <div style={{ background: "#FBF8EF", borderRadius: 6, padding: "28px 34px 22px", backgroundImage: "repeating-linear-gradient(#FBF8EF 0 70px, #DCE6F0 70px 72px)" }}>
          <div style={{ ...txt(58, "#15181F"), textAlign: "center", marginBottom: 14, letterSpacing: 3 }}>{d.titulo ?? "NO PAPEL"}</div>
          {itens.map((it, i) => {
            const ti = it.trecho != null ? inicio(it.trecho) : 0.35 + i * 0.3;
            const k = clamp01((t - ti) / 0.35);
            if (k <= 0) return <div key={i} style={{ height: 70 }} />;
            const m = mudas.filter((x) => x.item === i && t >= inicio(x.trecho)).pop();
            const tm = m ? inicio(m.trecho) : 0;
            const risco = m ? clamp01((t - tm) / 0.3) : 0;
            const novo = m ? clamp01((t - tm - 0.3) / 0.3) : 0;
            const status = STATUS[(m && risco >= 1 ? m.status : it.status) ?? "ok"];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, height: 70, opacity: k, transform: `translateX(${(1 - k) * -30}px)` }}>
                {it.icone && <Mini id={it.icone} cor="#3E4A5C" tamanho={36} />}
                <div style={{ ...txt(42, "#3E4A5C", 500), flex: 1 }}>{it.rotulo}</div>
                <div style={{ position: "relative", ...txt(46, "#15181F") }}>
                  {it.valor}
                  {m && <div style={{ position: "absolute", left: -4, top: "52%", height: 6, borderRadius: 3, background: C.red, width: `calc(${risco * 100}% + 8px)` }} />}
                </div>
                {m?.valor && <div style={{ ...txt(46, C.red), opacity: novo, transform: `scale(${0.6 + novo * 0.4}) rotate(-4deg)` }}>{m.valor}</div>}
                <Mini id={status.icone} cor={status.cor} tamanho={40} />
              </div>
            );
          })}
        </div>
      </div>
      {carimbo && t >= tc && (
        <div style={{
          // na borda de baixo: não cobre os valores refeitos
          position: "absolute", right: 24, bottom: -46, ...txt(76, cor(carimbo.cor, "vermelho")), border: `8px solid ${cor(carimbo.cor, "vermelho")}`,
          borderRadius: 14, padding: "4px 20px", transform: `rotate(-12deg) scale(${2 - kc})`, opacity: Math.min(kc * 1.4, 0.92), background: "rgba(251,248,239,0.5)",
        }}>{carimbo.texto}</div>
      )}
    </div>
  );
};
