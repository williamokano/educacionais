import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../../../src/theme";
import { ElementoProps } from "../../../src/v2/pacote";

// Cartões do explicador do ar-condicionado. Ficam na faixa de ação (y 330–1140), na coluna segura (x 162–918).
//   grafico  temperatura da sala: modo "serrote" (liga e desliga) ou "reta" (inverter; o serrote vira linha)
//   corrente corrente do motor no tempo, com o pico de cada partida
//   conta    conta de luz encolhendo (campo texto = o rótulo, ex.: "11% A 44% MENOS"; fica = quanto sobra, padrão 0,6)
// Do episódio 2 (bomba de calor):
//   comparacao barras de calor por 1 kWh: itens [{ texto, valor, rotulo, cor }] (padrão: resistência 1 × bomba ~2,7)
//   rendimento calor por 1 kWh conforme a temperatura da rua: a bomba de calor caindo com o frio, sempre acima da
//              linha da resistência (curva ilustrativa: ~2,7 em média de 5 a −10 °C, perto de 2 no frio forte)

const X0 = 162;
const LARG = 756;

const usePop = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame, fps, config: { damping: 12, mass: 0.5 } });
};

/** `altura` em px, ou "auto" para o fundo acompanhar o conteúdo. */
const Painel: React.FC<{ y: number; titulo: string; children: React.ReactNode; altura?: number | "auto" }> = ({ y, titulo, children, altura = "auto" }) => {
  const pop = usePop();
  return (
    <div style={{
      position: "absolute", left: X0, top: y, width: LARG, height: altura, transform: `scale(${pop})`, transformOrigin: "50% 0%",
      background: "rgba(20,24,31,0.88)", borderRadius: 28, boxShadow: "0 10px 0 rgba(0,0,0,0.18)", padding: "22px 28px",
      boxSizing: "border-box",
    }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 38, color: "#f4f1ea", letterSpacing: 2 }}>{titulo}</div>
      {children}
    </div>
  );
};

const W = LARG - 56;
const H = 200;

/** linha que vai sendo desenhada da esquerda para a direita (revela em ~1,2 s) */
const Linha: React.FC<{ pts: [number, number][]; cor: string; t: number }> = ({ pts, cor, t }) => {
  const revela = Math.min(1, t / 1.2);
  const n = Math.max(2, Math.round(pts.length * revela));
  const d = pts.slice(0, n).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [ux, uy] = pts[n - 1];
  return (
    <>
      <path d={d} fill="none" stroke={cor} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ux} cy={uy} r={11} fill={cor} />
    </>
  );
};

const Grafico: React.FC<ElementoProps> = ({ d, t }) => {
  const reta = d.modo === "reta";
  const N = 120;
  // 22 a 25 °C em serrote; no modo reta o serrote amortece até ficar em 23 °C
  const temp = (k: number) => {
    const serrote = 23.5 + 1.5 * (((k * 5) % 1) < 0.5 ? 1 - ((k * 5) % 1) * 4 : -1 + (((k * 5) % 1) - 0.5) * 4);
    if (!reta) return serrote;
    const amort = Math.max(0, 1 - k * 2.2);
    return 23 + (serrote - 23) * amort;
  };
  const y = (c: number) => H - ((c - 21) / 5) * H;
  const pts = Array.from({ length: N }, (_, i) => [(i / (N - 1)) * W, y(Math.max(22, Math.min(25, temp(i / (N - 1)))))] as [number, number]);
  return (
    <Painel y={d.y ?? 40} titulo={d.titulo ?? "TEMPERATURA DA SALA"}>
      <svg width={W} height={H + 40} style={{ marginTop: 14, overflow: "visible" }}>
        {[22, 23, 24, 25].map((c) => (
          <g key={c}>
            <line x1={0} x2={W} y1={y(c)} y2={y(c)} stroke="#3a414c" strokeWidth={2} />
            <text x={W - 4} y={y(c) - 8} textAnchor="end" fontFamily={FONT} fontWeight={500} fontSize={26} fill="#8a94a3">{c} °C</text>
          </g>
        ))}
        <Linha pts={pts} cor={reta ? "#5bd47a" : "#ff8a3d"} t={t} />
      </svg>
    </Painel>
  );
};

const Corrente: React.FC<ElementoProps> = ({ d, t }) => {
  const N = 160;
  // motor liga a cada 1/4 do gráfico: pico estreito na partida, depois corrente de trabalho; desligado = 0
  const amp = (k: number) => {
    const c = (k * 4) % 1;
    if (c > 0.6) return 0;
    if (c < 0.04) return 1;
    if (c < 0.07) return 1 - ((c - 0.04) / 0.03) * 0.8;
    return 0.2;
  };
  const pts = Array.from({ length: N }, (_, i) => [(i / (N - 1)) * W, H - amp(i / (N - 1)) * H * 0.95] as [number, number]);
  return (
    <Painel y={d.y ?? 40} titulo={d.titulo ?? "CORRENTE DO MOTOR"}>
      <svg width={W} height={H + 40} style={{ marginTop: 14, overflow: "visible" }}>
        <line x1={0} x2={W} y1={H} y2={H} stroke="#3a414c" strokeWidth={3} />
        <line x1={0} x2={W} y1={H - 0.2 * H * 0.95} y2={H - 0.2 * H * 0.95} stroke="#3a414c" strokeWidth={2} strokeDasharray="10 10" />
        <text x={W - 4} y={H - 0.2 * H * 0.95 - 10} textAnchor="end" fontFamily={FONT} fontWeight={500} fontSize={26} fill="#8a94a3">RODANDO</text>
        <Linha pts={pts} cor="#ffcf1f" t={t} />
        {t > 0.35 && <text x={22} y={18} fontFamily={FONT} fontWeight={700} fontSize={30} fill="#ff5a3c">PARTIDA</text>}
      </svg>
    </Painel>
  );
};

const Conta: React.FC<ElementoProps> = ({ d, t }) => {
  const pop = usePop();
  const k = Math.min(1, Math.max(0, (t - 0.25) / 0.8));
  const fica = (d.fica as number | undefined) ?? 0.6; // quanto da conta sobra no fim (0..1)
  const barra = 1 - k * (1 - fica);
  return (
    <div style={{
      position: "absolute", left: 290, top: d.y ?? 40, width: 500, transform: `scale(${pop}) rotate(-2deg)`, transformOrigin: "50% 0%",
      background: "#fbf8f1", borderRadius: 18, padding: "28px 32px", boxShadow: "0 12px 0 rgba(0,0,0,0.18)", boxSizing: "border-box",
    }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, color: "#2a2f38", letterSpacing: 2 }}>CONTA DE LUZ</div>
      {[0.9, 0.7, 0.8].map((w, i) => <div key={i} style={{ height: 12, width: `${w * 100}%`, background: "#ddd6c8", borderRadius: 6, marginTop: 16 }} />)}
      <div style={{ marginTop: 26, height: 46, background: "#e6e0d4", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${barra * 100}%`, background: k > 0 ? "#5bd47a" : "#ff8a3d", borderRadius: 10 }} />
      </div>
      {d.texto && <div style={{ marginTop: 20, fontFamily: FONT, fontWeight: 700, fontSize: 44, color: "#1f8a4c", textAlign: "center", opacity: k }}>{d.texto}</div>}
    </div>
  );
};

type Item = { texto: string; valor: number; rotulo: string; cor: string };
const ITENS_PADRAO: Item[] = [
  { texto: "RESISTÊNCIA", valor: 1, rotulo: "1 kWh", cor: "#ff8a3d" },
  { texto: "BOMBA DE CALOR", valor: 2.7, rotulo: "~2,7 kWh", cor: "#5bd47a" },
];

const ROTULO = 250; // px reservados ao rótulo à direita da barra ("2 a 3 kWh", "~2,7 kWh")

const Comparacao: React.FC<ElementoProps> = ({ d, t }) => {
  const itens: Item[] = (d.itens as Item[] | undefined) ?? ITENS_PADRAO;
  const max = Math.max(...ITENS_PADRAO.map((i) => i.valor), ...itens.map((i) => i.valor));
  return (
    <Painel y={d.y ?? 40} titulo={d.titulo ?? "CALOR POR 1 kWh DE LUZ"} altura="auto">
      {itens.map((it, i) => {
        const k = Math.min(1, Math.max(0, (t - 0.25 - i * 0.45) / 0.9));
        const e = 1 - (1 - k) ** 3;
        return (
          <div key={i} style={{ marginTop: 22 }}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: "#c9d1dc", letterSpacing: 1 }}>{it.texto}</div>
            {/* a barra ocupa no máximo o que sobra depois do espaço reservado ao rótulo */}
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 8 }}>
              <div style={{ height: 46, width: `calc((100% - ${ROTULO}px) * ${(it.valor * e) / max})`, background: it.cor, borderRadius: 12, flexShrink: 0 }} />
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 42, color: it.cor, opacity: k, whiteSpace: "nowrap" }}>{it.rotulo}</div>
            </div>
          </div>
        );
      })}
    </Painel>
  );
};

const Rendimento: React.FC<ElementoProps> = ({ d, t }) => {
  // eixo x: temperatura da rua de 10 °C (esquerda) a −15 °C (direita); eixo y: calor por 1 kWh, de 0 a 4
  const T0 = 10;
  const T1 = -15;
  const x = (temp: number) => ((T0 - temp) / (T0 - T1)) * W;
  const y = (v: number) => H - (v / 4) * H;
  const cop = (temp: number) => 2.7 + 0.06 * (temp + 2.5);
  const N = 60;
  const pts = Array.from({ length: N }, (_, i) => {
    const temp = T0 + ((T1 - T0) * i) / (N - 1);
    return [x(temp), y(cop(temp))] as [number, number];
  });
  const rev = Math.min(1, Math.max(0, (t - 0.3) / 0.6));
  return (
    <Painel y={d.y ?? 40} titulo={d.titulo ?? "CALOR POR 1 kWh × FRIO LÁ FORA"}>
      <svg width={W} height={H + 70} style={{ marginTop: 14, overflow: "visible" }}>
        {[1, 2, 3].map((v) => (
          <g key={v}>
            <line x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="#3a414c" strokeWidth={2} />
            <text x={4} y={y(v) - 8} fontFamily={FONT} fontWeight={500} fontSize={26} fill="#8a94a3">{v}</text>
          </g>
        ))}
        {[10, 0, -10].map((temp) => (
          <text key={temp} x={x(temp)} y={H + 40} textAnchor={temp === T0 ? "start" : "middle"} fontFamily={FONT} fontWeight={500} fontSize={28} fill="#8a94a3">{`${temp > 0 ? "" : temp < 0 ? "−" : ""}${Math.abs(temp)} °C`}</text>
        ))}
        <line x1={0} x2={W * rev} y1={y(1)} y2={y(1)} stroke="#ff8a3d" strokeWidth={8} strokeLinecap="round" />
        {rev > 0.9 && <text x={W - 4} y={y(1) + 38} textAnchor="end" fontFamily={FONT} fontWeight={700} fontSize={28} fill="#ff8a3d">RESISTÊNCIA</text>}
        <Linha pts={pts} cor="#5bd47a" t={Math.max(0, t - 0.6)} />
        {t > 1.9 && <text x={W - 4} textAnchor="end" y={y(cop(T1)) - 40} fontFamily={FONT} fontWeight={700} fontSize={28} fill="#5bd47a">BOMBA DE CALOR</text>}
      </svg>
    </Painel>
  );
};


/**
 * Osciloscópio: a forma da tensão no tempo. Campos: modo ("reta" | "senoide" | "quadrada" | "sincronia" | "pulsos" |
 * "bagunca" | "modificada" | "media" | "comparador"), titulo, rotulo (texto embaixo, ex.: "CC · ~40 V"), cor,
 * alto (amplitude 0..1, padrão 0,8), marcas (ex.: ["+311", "−311"], no topo e no fundo da onda).
 * "media": pulsos cuja largura vai de 50% a 90% e a linha da média subindo junto.
 * "comparador": senoide fina e triangular rápida em cima, os pulsos que saem da comparação embaixo; acelera (1..4)
 * multiplica a velocidade da triangular ao longo do cartão.
 * "sincronia": duas senoides (inversor e rua) que começam defasadas e se alinham. "pulsos": pulsos de largura variável
 * com a média virando senoide.
 */
const Onda: React.FC<ElementoProps> = ({ d, t }) => {
  const modo = (d.modo as string | undefined) ?? "senoide";
  const cor = (d.cor as string | undefined) ?? "#ffd23f";
  const alto = (d.alto as number | undefined) ?? 0.8;
  const Hh = 220;
  const meio = Hh / 2;
  const amp = (meio - 14) * alto;
  const N = 220;
  const fase = t * 2.2;
  const rev = Math.min(1, Math.max(0, (t - 0.2) / 0.8));
  const ciclos = modo === "bagunca" ? 14 : 2.5;
  const f = (x: number): number => {
    const a = (x / W) * ciclos * Math.PI * 2 - fase;
    if (modo === "reta" || modo === "retacurva") return modo === "reta" ? amp : amp * 0.3;
    if (modo === "quadrada") return Math.sin(a) >= 0 ? amp : -amp;
    if (modo === "modificada") return Math.sin(a) > 0.42 ? amp : Math.sin(a) < -0.42 ? -amp : 0;
    if (modo === "bagunca") return (Math.sin(a) >= 0 ? amp : -amp) * (0.75 + 0.25 * Math.sin(a * 0.37));
    return amp * Math.sin(a);
  };
  const caminho = (fn: (x: number) => number) =>
    Array.from({ length: N + 1 }, (_, i) => {
      const x = (i / N) * W * rev;
      return `${i ? "L" : "M"}${x.toFixed(1)},${(meio - fn(x)).toFixed(1)}`;
    }).join(" ");
  let extra: React.ReactNode = null;
  if (modo === "sincronia") {
    const k = Math.min(1, Math.max(0, (t - 0.6) / 1.4));
    const desvio = (1 - k) * 1.6;
    const rua = (x: number) => amp * Math.sin((x / W) * ciclos * Math.PI * 2 - fase + desvio);
    extra = <path d={caminho(rua)} stroke="#7fd3ff" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.9} />;
  }
  if (modo === "retacurva") {
    const curva = (x: number) => amp * Math.sin((x / W) * ciclos * Math.PI * 2 - fase);
    extra = <path d={caminho(curva)} stroke="#7fd3ff" strokeWidth={6} fill="none" strokeLinecap="round" />;
  }
  if (modo === "media") {
    const n = 10;
    const larg = W / n;
    const duty = 0.5 + 0.4 * Math.min(1, Math.max(0, (t - 0.8) / 1.6));
    extra = (
      <g>
        {Array.from({ length: n }).map((_, i) => ((i + 1) / n <= rev ? <rect key={i} x={i * larg} y={meio - amp} width={larg * duty} height={amp * 2} fill={cor} opacity={0.5} /> : null))}
        <line x1={0} x2={W * rev} y1={meio + amp - 2 * amp * duty} y2={meio + amp - 2 * amp * duty} stroke="#5bd47a" strokeWidth={7} strokeLinecap="round" />
        <text x={W - 6} y={meio + amp - 2 * amp * duty - 14} textAnchor="end" fontFamily={FONT} fontWeight={700} fontSize={30} fill="#5bd47a">{`MÉDIA ${Math.round(duty * 100)}%`}</text>
      </g>
    );
  }
  if (modo === "comparador") {
    const acel = (d.acelera as number | undefined) ?? 1;
    const k = 1 + (acel - 1) * Math.min(1, Math.max(0, (t - 0.6) / 2.2));
    const ciclosT = 6 * k;
    const topo = 140;
    const m2 = topo / 2;
    const a2 = m2 - 10;
    const seno = (x: number) => a2 * 0.8 * Math.sin((x / W) * Math.PI * 2);
    const tri = (x: number) => {
      const u = ((x / W) * ciclosT) % 1;
      return a2 * (u < 0.5 ? -1 + 4 * u : 3 - 4 * u);
    };
    const pts = (fn: (x: number) => number) => Array.from({ length: 400 }, (_, i) => { const x = (i / 399) * W * rev; return `${i ? "L" : "M"}${x.toFixed(1)},${(m2 - fn(x)).toFixed(1)}`; }).join(" ");
    const base = 185;
    const pul = Array.from({ length: 400 }, (_, i) => { const x = (i / 399) * W * rev; const y = seno(x) > tri(x) ? base - 26 : base + 26; return `${i ? "L" : "M"}${x.toFixed(1)},${y}`; }).join(" ");
    return (
      <Painel y={d.y ?? 40} titulo={d.titulo ?? "SENOIDE × TRIANGULAR"}>
        <svg width={W} height={Hh} style={{ marginTop: 14, overflow: "visible" }}>
          <rect x={0} y={0} width={W} height={Hh} rx={14} fill="#0e1a14" />
          <line x1={0} x2={W} y1={m2} y2={m2} stroke="#1f3a2c" strokeWidth={2} />
          <line x1={0} x2={W} y1={base} y2={base} stroke="#1f3a2c" strokeWidth={2} />
          <path d={pts(tri)} stroke="#7fd3ff" strokeWidth={3} fill="none" opacity={0.85} />
          <path d={pts(seno)} stroke="#5bd47a" strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d={pul} stroke={cor} strokeWidth={5} fill="none" strokeLinejoin="miter" />
        </svg>
        {d.rotulo && <div style={{ marginTop: 14, fontFamily: FONT, fontWeight: 700, fontSize: 40, color: cor, letterSpacing: 1 }}>{d.rotulo}</div>}
      </Painel>
    );
  }
  if (modo === "pulsos") {
    const n = 24;
    const larg = W / n;
    extra = (
      <g>
        {Array.from({ length: n }).map((_, i) => {
          const v = Math.sin(((i + 0.5) / n) * Math.PI * 2);
          const w = larg * Math.abs(v) * 0.92;
          const y = v >= 0 ? meio - amp : meio;
          return (i + 1) / n <= rev ? <rect key={i} x={i * larg + (larg - w) / 2} y={y} width={w} height={amp} fill={cor} opacity={0.45} /> : null;
        })}
      </g>
    );
  }
  return (
    <Painel y={d.y ?? 40} titulo={d.titulo ?? "OSCILOSCÓPIO"}>
      <svg width={W} height={Hh} style={{ marginTop: 14, overflow: "visible" }}>
        <rect x={0} y={0} width={W} height={Hh} rx={14} fill="#0e1a14" />
        {[0.25, 0.5, 0.75].map((k) => <line key={k} x1={0} x2={W} y1={Hh * k} y2={Hh * k} stroke="#1f3a2c" strokeWidth={k === 0.5 ? 3 : 2} />)}
        {[1, 2, 3, 4, 5].map((k) => <line key={k} y1={0} y2={Hh} x1={(W * k) / 6} x2={(W * k) / 6} stroke="#1f3a2c" strokeWidth={2} />)}
        {extra}
        {(d.marcas as string[] | undefined)?.map((m, i) => (
          <text key={i} x={8} y={i === 0 ? meio - amp - 8 : meio + amp + 30} fontFamily={FONT} fontWeight={700} fontSize={30} fill={cor}>{m}</text>
        ))}
        {modo === "media" ? null : modo !== "pulsos" ? (
          <path d={caminho(f)} stroke={cor} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d={caminho((x) => amp * Math.sin((x / W) * Math.PI * 2))} stroke="#5bd47a" strokeWidth={7} fill="none" strokeLinecap="round" />
        )}
      </svg>
      {d.rotulo && <div style={{ marginTop: 14, fontFamily: FONT, fontWeight: 700, fontSize: 40, color: cor, letterSpacing: 1 }}>{d.rotulo}</div>}
    </Painel>
  );
};

/**
 * Ponte H em esquema: bateria à esquerda, quatro chaves em H e a TV no meio. O caminho da corrente acende e alterna
 * entre os pares em diagonal (S1+S4 → a corrente atravessa a TV para a direita; S2+S3 → para a esquerda).
 * Campos: titulo, par ("a" | "b" | "alterna", padrão alterna), ritmo (trocas por segundo, padrão 0,8),
 * simples: true = legenda "LIGADO NORMAL / LIGADO TROCADO" (o truque das mãos).
 */
const PonteH: React.FC<ElementoProps> = ({ d, t }) => {
  const ritmo = (d.ritmo as number | undefined) ?? 0.8;
  const par = (d.par as string | undefined) ?? "alterna";
  const a = par === "a" ? true : par === "b" ? false : Math.floor(t * ritmo * 2) % 2 === 0;
  const Hh = 300;
  const xl = 170, xr = W - 60, yt = 40, yb = Hh - 40, xm = (xl + xr) / 2, ym = Hh / 2;
  const on = "#ffd23f", off = "#3a4a40";
  // chave: segmento vertical com a alavanca fechada (reta) ou aberta (inclinada)
  const Chave: React.FC<{ x: number; y0: number; y1: number; fechada: boolean; nome: string }> = ({ x, y0, y1, fechada, nome }) => {
    const ya = y0 + (y1 - y0) * 0.3, yb2 = y0 + (y1 - y0) * 0.7;
    return (
      <g>
        <line x1={x} y1={y0} x2={x} y2={ya} stroke={fechada ? on : off} strokeWidth={8} strokeLinecap="round" />
        <line x1={x} y1={yb2} x2={x} y2={y1} stroke={fechada ? on : off} strokeWidth={8} strokeLinecap="round" />
        <line x1={x} y1={ya} x2={fechada ? x : x + 30} y2={yb2} stroke={fechada ? on : "#c9d1dc"} strokeWidth={8} strokeLinecap="round" />
        <circle cx={x} cy={ya} r={7} fill="#c9d1dc" />
        <text x={x + (x < xm ? -46 : 18)} y={(ya + yb2) / 2 + 10} fontFamily={FONT} fontWeight={700} fontSize={28} fill={fechada ? on : "#8a94a3"}>{nome}</text>
      </g>
    );
  };
  const corEsq = (cima: boolean) => (cima ? a : !a) ? on : off; // trilho até a TV pelo lado esquerdo
  const seta = a ? "M -18,-12 L 10,0 L -18,12 Z" : "M 18,-12 L -10,0 L 18,12 Z";
  return (
    <Painel y={d.y ?? 40} titulo={d.titulo ?? "AS QUATRO CHAVES (PONTE H)"}>
      <svg width={W} height={Hh} style={{ marginTop: 14, overflow: "visible" }}>
        <rect x={0} y={0} width={W} height={Hh} rx={14} fill="#0e1a14" />
        {/* bateria e trilhos de + (em cima) e − (embaixo) */}
        <rect x={30} y={ym - 50} width={70} height={100} rx={10} fill="#22262b" stroke="#c9d1dc" strokeWidth={3} />
        <text x={65} y={ym - 14} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={30} fill="#ff6a5a">+</text>
        <text x={65} y={ym + 34} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={34} fill="#6aa8ff">−</text>
        <polyline points={`65,${ym - 50} 65,${yt} ${xr},${yt}`} fill="none" stroke={on} strokeWidth={8} strokeLinejoin="round" />
        <polyline points={`65,${ym + 50} 65,${yb} ${xr},${yb}`} fill="none" stroke={on} strokeWidth={8} strokeLinejoin="round" />
        {/* chaves: S1 (cima esq.), S2 (cima dir.), S3 (baixo esq.), S4 (baixo dir.) */}
        <Chave x={xl} y0={yt} y1={ym} fechada={a} nome="S1" />
        <Chave x={xr} y0={yt} y1={ym} fechada={!a} nome="S2" />
        <Chave x={xl} y0={ym} y1={yb} fechada={!a} nome="S3" />
        <Chave x={xr} y0={ym} y1={yb} fechada={a} nome="S4" />
        {/* TV no meio, ligada aos dois lados */}
        <line x1={xl} y1={ym} x2={xm - 70} y2={ym} stroke={corEsq(true) === on || corEsq(false) === on ? on : off} strokeWidth={8} />
        <line x1={xm + 70} y1={ym} x2={xr} y2={ym} stroke={on} strokeWidth={8} />
        <rect x={xm - 70} y={ym - 42} width={140} height={84} rx={10} fill="#16181c" stroke="#c9d1dc" strokeWidth={3} />
        <text x={xm} y={ym - 10} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={26} fill="#c9d1dc">TV</text>
        <g transform={`translate(${xm},${ym + 18})`}><path d={seta} fill={on} /></g>
      </svg>
      <div style={{ marginTop: 14, fontFamily: FONT, fontWeight: 700, fontSize: 38, color: on, letterSpacing: 1 }}>{d.simples ? (a ? "S1 + S4: LIGADO NORMAL" : "S2 + S3: LIGADO TROCADO") : a ? "S1 + S4: CORRENTE PRA DIREITA" : "S2 + S3: CORRENTE PRA ESQUERDA"}</div>
    </Painel>
  );
};

/**
 * O inversor inteiro em esquema: bateria → ponte 1 (12 V, 40.000 Hz) → transformador → retificador → capacitor →
 * ponte 2 (311 V, 60 Hz) → filtro → TV. Campos: ate ("ponte1" | "bobina" | "retificador" | "capacitor" | "ponte2" |
 * "filtro", padrão filtro: até onde o circuito aparece), destaque (etapa acesa; "percorre" = acende uma de cada vez).
 */
const ETAPAS = ["ponte1", "bobina", "retificador", "capacitor", "ponte2", "filtro"];
const Circuito: React.FC<ElementoProps> = ({ d, t }) => {
  const ate = ETAPAS.indexOf((d.ate as string | undefined) ?? "filtro");
  const dest = d.destaque === "percorre" ? ETAPAS[Math.floor(t / 0.7) % ETAPAS.length] : (d.destaque as string | undefined);
  const Hh = 250, yt = 50, yb = 200, ym = 125;
  const linha = "#7f8b96", acesa = "#ffd23f";
  const vis = (k: string) => ETAPAS.indexOf(k) <= ate;
  const cor = (k: string) => (dest === k ? acesa : linha);
  const rapida = Math.sin(t * 60) > 0, lenta = Math.floor(t * 1.2) % 2 === 0;
  const Sw: React.FC<{ x: number; y0: number; y1: number; f: boolean; c: string }> = ({ x, y0, y1, f, c }) => {
    const ya = y0 + (y1 - y0) * 0.35, yb2 = y0 + (y1 - y0) * 0.65;
    return (<g><line x1={x} y1={y0} x2={x} y2={ya} stroke={c} strokeWidth={4} /><line x1={x} y1={yb2} x2={x} y2={y1} stroke={c} strokeWidth={4} />
      <line x1={x} y1={ya} x2={f ? x : x + 16} y2={yb2} stroke={f ? "#ff6a3c" : c} strokeWidth={4} strokeLinecap="round" /></g>);
  };
  const Ponte: React.FC<{ x: number; k: string; f: boolean; rot1: string; rot2: string }> = ({ x, k, f, rot1, rot2 }) => (
    <g>
      <rect x={x - 12} y={yt - 22} width={78} height={yb - yt + 44} rx={8} fill={dest === k ? "rgba(255,210,63,0.12)" : "rgba(80,110,140,0.18)"} />
      <text x={x + 27} y={yt - 28} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={20} fill="#c9d1dc">{rot1}</text>
      <text x={x + 27} y={yb + 46} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={20} fill={acesa}>{rot2}</text>
      <line x1={x} y1={yt} x2={x + 54} y2={yt} stroke={cor(k)} strokeWidth={4} /><line x1={x} y1={yb} x2={x + 54} y2={yb} stroke={cor(k)} strokeWidth={4} />
      <Sw x={x} y0={yt} y1={ym} f={f} c={cor(k)} /><Sw x={x + 54} y0={yt} y1={ym} f={!f} c={cor(k)} />
      <Sw x={x} y0={ym} y1={yb} f={!f} c={cor(k)} /><Sw x={x + 54} y0={ym} y1={yb} f={f} c={cor(k)} />
    </g>
  );
  return (
    <Painel y={d.y ?? 40} titulo={d.titulo ?? "O INVERSOR POR DENTRO"}>
      <svg width={W} height={Hh} style={{ marginTop: 26, overflow: "visible" }}>
        {/* bateria */}
        <circle cx={26} cy={ym} r={22} fill="#22262b" stroke={linha} strokeWidth={4} />
        <text x={26} y={ym + 8} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={24} fill="#c9d1dc">12</text>
        <polyline points={`26,${ym - 22} 26,${yt} 70,${yt}`} fill="none" stroke={linha} strokeWidth={4} />
        <polyline points={`26,${ym + 22} 26,${yb} 70,${yb}`} fill="none" stroke={linha} strokeWidth={4} />
        {vis("ponte1") && <Ponte x={70} k="ponte1" f={rapida} rot1="12 V" rot2="40.000 Hz" />}
        {vis("bobina") && (
          <g stroke={cor("bobina")} strokeWidth={4} fill="none">
            <line x1={124} y1={ym - 10} x2={150} y2={ym - 10} /><line x1={124} y1={ym + 10} x2={150} y2={ym + 10} />
            {[0, 1, 2].map((i) => <path key={i} d={`M150,${ym - 30 + i * 20} a10,10 0 0 1 0,20`} />)}
            <line x1={168} y1={ym - 40} x2={168} y2={ym + 40} /><line x1={174} y1={ym - 40} x2={174} y2={ym + 40} />
            {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M192,${ym - 48 + i * 16} a8,8 0 0 0 0,16`} />)}
            <line x1={192} y1={ym - 48} x2={215} y2={ym - 48} /><line x1={192} y1={ym + 48} x2={215} y2={ym + 48} />
          </g>
        )}
        {vis("retificador") && (
          <g stroke={cor("retificador")} strokeWidth={4} fill="none">
            <line x1={215} y1={ym - 48} x2={262} y2={ym - 48} /><line x1={215} y1={ym + 48} x2={262} y2={ym + 48} />
            <polygon points={`262,${ym - 48} 300,${ym} 262,${ym + 48} 224,${ym}`} />
            {[[243, ym - 24, 45], [281, ym - 24, 135], [243, ym + 24, -45], [281, ym + 24, -135]].map(([x, y, a], i) => (
              <g key={i} transform={`translate(${x},${y}) rotate(${a})`}><polygon points="-7,-7 7,0 -7,7" fill={cor("retificador")} /><line x1={7} y1={-8} x2={7} y2={8} /></g>
            ))}
            <polyline points={`300,${ym} 330,${ym} 330,${yt} 380,${yt}`} /><polyline points={`224,${ym} 214,${ym} 214,${yb} 380,${yb}`} />
          </g>
        )}
        {vis("capacitor") && (
          <g stroke={cor("capacitor")} strokeWidth={4}>
            <line x1={355} y1={yt} x2={355} y2={ym - 8} /><line x1={340} y1={ym - 8} x2={370} y2={ym - 8} />
            <line x1={340} y1={ym + 8} x2={370} y2={ym + 8} /><line x1={355} y1={ym + 8} x2={355} y2={yb} />
          </g>
        )}
        {vis("ponte2") && <Ponte x={392} k="ponte2" f={lenta} rot1="311 V" rot2="60 Hz" />}
        {vis("filtro") && (
          <g stroke={cor("filtro")} strokeWidth={4} fill="none">
            <line x1={446} y1={ym} x2={470} y2={ym} />
            {[0, 1, 2].map((i) => <path key={i} d={`M${470 + i * 18},${ym} a9,9 0 0 1 18,0`} />)}
            <line x1={524} y1={ym} x2={560} y2={ym} />
            <line x1={545} y1={ym} x2={545} y2={ym + 22} /><line x1={532} y1={ym + 22} x2={558} y2={ym + 22} /><line x1={532} y1={ym + 34} x2={558} y2={ym + 34} />
            <line x1={545} y1={ym + 34} x2={545} y2={yb} /><line x1={446} y1={yb} x2={600} y2={yb} />
          </g>
        )}
        {ate >= 0 && (
          <g>
            <line x1={vis("filtro") ? 560 : 446} y1={ym} x2={600} y2={ym} stroke={linha} strokeWidth={4} />
            <rect x={600} y={ym - 36} width={90} height={110} rx={10} fill="#16181c" stroke={linha} strokeWidth={4} />
            <text x={645} y={ym + 26} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={26} fill="#c9d1dc">TV</text>
          </g>
        )}
      </svg>
    </Painel>
  );
};

/** O que aguenta onda quadrada: chuveiro (resistência) ✓ e motor ✗. Campos: titulo. */
const Aguenta: React.FC<ElementoProps> = ({ d, t }) => {
  const k = Math.min(1, Math.max(0, (t - 0.3) / 0.5));
  return (
    <Painel y={d.y ?? 420} titulo={d.titulo ?? "COM ONDA QUADRADA"}>
      <svg width={W} height={190} style={{ marginTop: 14, overflow: "visible" }}>
        {/* chuveiro: corpo e resistência acesa */}
        <path d="M70,40 h120 l-20,50 h-80 z" fill="#f4f5f6" />
        <path d="M95,62 q8,-14 16,0 t16,0 t16,0 t16,0" stroke="#ff6a2a" strokeWidth={6} fill="none" />
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={100 + i * 15} y1={100} x2={96 + i * 15} y2={140} stroke="#7fc4ff" strokeWidth={4} strokeLinecap="round" />)}
        <path d="M230,95 l30,32 l60,-70" stroke="#5bd47a" strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={k} />
        {/* motor esquentando */}
        <rect x={400} y={50} width={130} height={80} rx={18} fill="#ff6a4a" />
        <rect x={530} y={82} width={30} height={16} rx={4} fill="#9aa3ab" />
        {[0, 1, 2].map((i) => <path key={i} d={`M${430 + i * 30},40 q-10,-14 0,-26 t0,-26`} stroke="#9aa3ab" strokeWidth={5} fill="none" opacity={0.5 + 0.5 * Math.sin(t * 4 + i)} />)}
        <g stroke="#ff4a3a" strokeWidth={14} strokeLinecap="round" opacity={k}><line x1={590} y1={60} x2={660} y2={130} /><line x1={660} y1={60} x2={590} y2={130} /></g>
        <text x={130} y={180} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={30} fill="#c9d1dc">CHUVEIRO</text>
        <text x={480} y={180} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={30} fill="#c9d1dc">{d.motor ?? "MOTOR"}</text>
      </svg>
    </Painel>
  );
};

export const CARTOES_AR = { grafico: Grafico, corrente: Corrente, conta: Conta, comparacao: Comparacao, rendimento: Rendimento, onda: Onda, ponteh: PonteH, circuito: Circuito, aguenta: Aguenta };
