import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, H, W } from "../theme";
import { CenaV2, Efeito, PersonagemEmCena } from "./tipos";

// Efeitos genéricos desenhados por cima do mundo (abaixo dos cartões e da legenda):
//   foco-luz   círculo de luz (lanterna) no escuro, num personagem (`alvo`) ou num ponto (`x`, `y`); `raio` em px
//   lanterna   a luz pisca num padrão de morse (`padrao`: "." curto, "-" longo, " " pausa), em loop
//   errado     X vermelho sobre um personagem (`alvo`) ou ponto; certo = ✓ verde
// Todos aceitam `trecho` (entra no trecho k da fala) e `ateTrecho` (sai no trecho k).
// Tipos que não estão aqui (vinheta, tremor e os dos pacotes, como "dedos-no-vao") são ignorados: quem os usa
// é o Clima, a câmera ou o cenário do pacote.

type Props = { cena: CenaV2; chao: number; u: number; t: number; trechos: number[] };

const alvoXY = (e: Efeito & Record<string, any>, ps: PersonagemEmCena[] | undefined, chao: number, u: number): [number, number] => {
  const p = e.alvo ? ps?.find((q) => q.id === e.alvo) : undefined;
  if (p) return [p.x * W, chao - 230 * u * (p.escala ?? 1)];
  return [(e.x ?? 0.5) * W, (e.y ?? 0.45) * H];
};

/** morse em loop: devolve se a luz está acesa no instante t */
const acesa = (padrao: string, t: number) => {
  const passos: [boolean, number][] = [];
  for (const ch of padrao) {
    if (ch === ".") passos.push([true, 0.22], [false, 0.18]);
    else if (ch === "-") passos.push([true, 0.6], [false, 0.18]);
    else passos.push([false, 0.5]);
  }
  passos.push([false, 0.8]);
  const total = passos.reduce((s, [, d]) => s + d, 0);
  let r = t % total;
  for (const [on, d] of passos) {
    if (r < d) return on;
    r -= d;
  }
  return false;
};

const FocoLuz: React.FC<{ x: number; y: number; raio: number; t: number; ligada?: boolean }> = ({ x, y, raio, t, ligada = true }) => {
  const tremula = 1 + Math.sin(t * 13) * 0.012 + Math.sin(t * 7.3) * 0.01; // pilha fraca
  const r = raio * tremula;
  return (
    <AbsoluteFill style={{
      background: ligada
        ? `radial-gradient(circle ${r}px at ${x}px ${y}px, rgba(255,236,190,0.10) 0, rgba(255,236,190,0.05) ${r * 0.8}px, rgba(4,6,10,0.93) ${r}px)`
        : "rgba(4,6,10,0.96)",
    }} />
  );
};

const Marca: React.FC<{ x: number; y: number; tam: number; tipo: "errado" | "certo"; desde: number }> = ({ x, y, tam, tipo, desde }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: frame - Math.round(desde * fps), fps, config: { damping: 10, mass: 0.5 } });
  if (frame < desde * fps) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute" }}>
      <g transform={`translate(${x} ${y}) scale(${k})`} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {tipo === "errado"
          ? <path d={`M ${-tam} ${-tam} L ${tam} ${tam} M ${tam} ${-tam} L ${-tam} ${tam}`} stroke={C.red} strokeWidth={tam * 0.22} />
          : <path d={`M ${-tam} 0 L ${-tam * 0.3} ${tam * 0.7} L ${tam} ${-tam * 0.8}`} stroke={C.green} strokeWidth={tam * 0.22} />}
      </g>
    </svg>
  );
};

/** clarão no horizonte: a luz nasce num ponto (x, y em 0..1), estoura até branco, segura e cai */
const Clarao: React.FC<{ x: number; y: number; t: number; subida: number; pico: number; queda: number }> = ({ x, y, t, subida, pico, queda }) => {
  const k = t < subida ? t / subida : t < subida + pico ? 1 : Math.max(0, 1 - (t - subida - pico) / queda);
  if (k <= 0) return null;
  const raio = 300 + 2400 * Math.min(t / subida, 1);
  // a faixa da legenda (y ≥ 1140) recebe só metade do branco, para a legenda continuar legível
  const mascara = "linear-gradient(to bottom, #000 0, #000 56%, rgba(0,0,0,0.45) 61%, rgba(0,0,0,0.45) 100%)";
  return (
    <AbsoluteFill style={{
      mixBlendMode: "screen", maskImage: mascara, WebkitMaskImage: mascara, opacity: 0.9,
      background: `radial-gradient(circle ${raio}px at ${x * W}px ${y * H}px, rgba(255,255,250,${k}) 0, rgba(255,246,225,${k * 0.92}) 40%, rgba(255,236,200,${k * 0.55}) 100%)`,
    }} />
  );
};

/** cegueira pelo clarão: a tela toda branca, clareando do centro para as bordas */
const Cegueira: React.FC<{ t: number; dur: number }> = ({ t, dur }) => {
  const k = Math.min(Math.max(t / dur, 0), 1);
  if (k >= 1) return null;
  const meio = Math.max(0, 1 - k * 1.6);
  const borda = Math.max(0, 1 - k * 0.9);
  const mascara = "linear-gradient(to bottom, #000 0, #000 56%, rgba(0,0,0,0.45) 61%, rgba(0,0,0,0.45) 100%)";
  return <AbsoluteFill style={{ maskImage: mascara, WebkitMaskImage: mascara, background: `radial-gradient(circle at 50% 45%, rgba(255,255,255,${meio}) 0, rgba(255,255,255,${borda}) 75%)` }} />;
};

export const Efeitos: React.FC<Props> = ({ cena, chao, u, t, trechos }) => {
  const efeitos = (cena.efeitos ?? []) as (Efeito & Record<string, any>)[];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {efeitos.map((e, i) => {
        const desde = e.trecho != null ? trechos[e.trecho] ?? 0 : 0;
        if (t < desde && e.tipo !== "foco-luz") return null;
        if (e.ateTrecho != null && t >= (trechos[e.ateTrecho] ?? Infinity)) return null;
        const [x, y] = alvoXY(e, cena.personagens, chao, u);
        if (e.tipo === "foco-luz") return <FocoLuz key={i} x={x} y={y} raio={e.raio ?? 330 * (u / 1.7)} t={t} />;
        if (e.tipo === "clarao") return <Clarao key={i} x={e.x ?? 0.5} y={e.y ?? 0.4} t={t - desde} subida={e.subida ?? 0.35} pico={e.pico ?? 0.7} queda={e.queda ?? 1.4} />;
        if (e.tipo === "cegueira") return <Cegueira key={i} t={t - desde} dur={e.duracao ?? 2.4} />;
        if (e.tipo === "lanterna") return <FocoLuz key={i} x={x} y={y} raio={e.raio ?? 120} t={t} ligada={acesa(e.padrao ?? ". . .", t - desde)} />;
        if (e.tipo === "errado" || e.tipo === "certo") return <Marca key={i} x={x} y={y} tam={e.tamanho ?? 120 * (u / 1.7)} tipo={e.tipo} desde={desde} />;
        return null;
      })}
    </AbsoluteFill>
  );
};
