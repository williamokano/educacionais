import React from "react";
import { AbsoluteFill, Audio, Freeze, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PACOTES, PERSONAGENS, TEMAS } from "../../banco";
import { misturarPoses, poseDe } from "../rig/acoes";
import { Boneco } from "../rig/Boneco";
import { Expressao, Pose, Vista } from "../rig/types";
import { FONT, H, SEGURA, W } from "../theme";
import { CARTOES_GENERICOS, CARTOES_HUD, CartaoFinalPadrao, CENARIOS_GENERICOS, DIAGRAMAS_GENERICOS, ZONA } from "./Genericos";
import { Efeitos } from "./Efeitos";
import { IdiomaCtx, idiomaDe } from "./idioma";
import { Legenda } from "./Legenda";
import { Pacote, PacoteCtx, usePacote } from "./pacote";
import { BatidaV2, CenaV2, EpisodioV2, PersonagemEmCena, Plano } from "./tipos";
import { hash01 } from "./trechos";
import { FiltroLuz } from "./Luz";
import { cenario3d, Palco } from "../v3d/Palco";

// Composição "episodio": lê public/<slug>/epNN/episode.json (gerado por pipeline/narrar.py ou pipeline/voice.py).
// Todo quadro é função do frame. Continuidade: o mesmo personagem no mesmo cenário e plano da batida anterior
// não "pula": a pose e o x saem de onde ele estava (MISTURA s).

const FADE = 5; // quadros
const WHIP = 7; // quadros
const MISTURA = 0.35; // s: transição entre poses
const DESLIZE = 0.5; // s: x que muda entre batidas sem `de`

// Câmera: tamanho do boneco (px por unidade do rig) e linha do chão para cada plano.
const PLANOS: Record<Plano, { u: number; chao: number }> = {
  geral: { u: 1.15, chao: H * 0.56 },
  medio: { u: 1.7, chao: H * 0.6 },
  close: { u: 2.8, chao: H * 0.94 },
  detalhe: { u: 2.2, chao: H * 0.8 },
};

const clamp01 = (k: number) => Math.min(Math.max(k, 0), 1);
const suave = (k: number) => -(Math.cos(Math.PI * clamp01(k)) - 1) / 2;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const fase = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) / 97; // piscar fora de sincronia

type Estado = { acao: string; expressao: Expressao; vista: Vista; desde: number };

/** Linha do tempo de um personagem dentro da batida: estado inicial, chegada (com `de`) e mudanças por trecho. */
const linhaDoTempo = (p: PersonagemEmCena, b: BatidaV2, dur: number): Estado[] => {
  const trecho = (k: number) => (b.segmentStarts[k] ?? b.start) - b.start;
  const lista: Estado[] = [{ acao: p.acao, expressao: p.expressao, vista: p.vista, desde: 0 }];
  const extras: { desde: number; acao?: string; expressao?: Expressao; vista?: Vista }[] = [];
  if (p.de != null) {
    const inicio = p.entra != null ? trecho(p.entra) : 0;
    extras.push({ desde: inicio + (p.tempoMov ?? dur * 0.85), acao: p.acaoChegada ?? "em-pe", vista: p.vistaChegada });
  }
  for (const m of p.muda ?? []) extras.push({ desde: trecho(m.trecho) + (m.atraso ?? 0), acao: m.acao, expressao: m.expressao, vista: m.vista });
  extras.sort((a, z) => a.desde - z.desde);
  for (const e of extras) {
    const ult = lista[lista.length - 1];
    lista.push({ acao: e.acao ?? ult.acao, expressao: e.expressao ?? ult.expressao, vista: e.vista ?? ult.vista, desde: e.desde });
  }
  return lista;
};

/** Pose no instante tl (s desde o início da batida), misturada com a do estado anterior logo depois de cada troca. */
const poseEm = (lista: Estado[], tl: number, poseInicial?: Pose): { pose: Pose; estado: Estado } => {
  let i = 0;
  while (i + 1 < lista.length && lista[i + 1].desde <= tl) i++;
  const e = lista[i];
  const atual = poseDe(e.acao, Math.max(tl - e.desde, 0), e.vista);
  const k = (tl - e.desde) / MISTURA;
  if (k < 1) {
    const antes = i > 0 ? poseDe(lista[i - 1].acao, e.desde - lista[i - 1].desde, lista[i - 1].vista) : poseInicial;
    if (antes) return { pose: misturarPoses(antes, atual, suave(k)), estado: e };
  }
  return { pose: atual, estado: e };
};

type Contexto = { b: BatidaV2; dur: number; offset: number };

const continua = (atual: CenaV2, anterior?: CenaV2) =>
  !!anterior && anterior.cenario === atual.cenario && (anterior.camera?.plano ?? "medio") === (atual.camera?.plano ?? "medio");

const PersonagemNaCena: React.FC<{ p: PersonagemEmCena; u: number; chao: number; ctx: Contexto; anterior?: { p: PersonagemEmCena } & Contexto; cenaAtual?: CenaV2 }> = ({ p, u, chao, ctx, anterior, cenaAtual }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pacote = usePacote();
  const personagem = pacote.personagens[p.id] ?? PERSONAGENS[p.id];
  if (!personagem) throw new Error(`personagem desconhecido no banco: "${p.id}"`);
  const tl = frame / fps;
  const { b, dur, offset } = ctx;
  const entraT = p.entra === undefined || anterior ? 0 : (b.segmentStarts[p.entra] ?? b.start) - b.start;
  if (tl < entraT) return null;

  // pose: sai da pose final da batida anterior quando há continuidade
  const poseInicial = anterior ? poseEm(linhaDoTempo(anterior.p, anterior.b, anterior.dur), anterior.dur, undefined).pose : undefined;
  const { pose: base, estado } = poseEm(linhaDoTempo(p, b, dur), tl, poseInicial);

  // x: anda de `de` até `x`; sem `de`, desliza do x anterior
  let x = p.x;
  if (p.de != null) {
    const tMov = p.tempoMov ?? dur * 0.85;
    x = lerp(p.de, p.x, clamp01((tl - entraT) / tMov));
  } else if (anterior && anterior.p.x !== p.x) {
    x = lerp(anterior.p.x, p.x, suave(tl / DESLIZE));
  }
  const espelhar = p.espelhar ?? (p.de != null && p.x < p.de);
  // elevação (escada, cama): sobe ou desce de `deElevacao` até `elevacao`
  const elev = p.deElevacao != null
    ? lerp(p.deElevacao, p.elevacao ?? 0, clamp01((tl - entraT) / (p.tempoMov ?? dur * 0.85)))
    : p.elevacao ?? 0;

  // fala: a boca abre e fecha nas palavras (todas, ou só as dos trechos listados)
  const agora = offset + tl;
  const ini = (k: number) => b.segmentStarts[k] ?? b.start;
  const daFala = (w: { start: number }) => {
    if (p.fala === true) return true;
    if (!Array.isArray(p.fala)) return false;
    return p.fala.some((k) => w.start >= ini(k) - 0.01 && (k + 1 >= b.segmentStarts.length || w.start < ini(k + 1) - 0.01));
  };
  const palavra = p.fala ? b.words.find((w) => agora >= w.start && agora < w.end && daFala(w)) : undefined;
  const boca = palavra ? 0.3 + 0.7 * Math.abs(Math.sin((agora - palavra.start) * Math.PI * 6.5)) : 0;

  const pose: Pose = {
    ...base,
    boca: Math.max(base.boca ?? 0, boca),
    olhar: p.olhar != null ? [p.olhar, base.olhar?.[1] ?? 0] : base.olhar,
    maoFrente: p.mao ?? base.maoFrente,
  };

  const k = u * (p.escala ?? 1);
  const pop = anterior || p.de != null || p.deElevacao != null ? 1 : spring({ frame: frame - Math.round(entraT * fps), fps, config: { damping: 16, mass: 0.6 } });
  // luz da cena: direção da fonte (na tela) até o meio do personagem, no espaço do boneco (espelhado se for o caso)
  const luzCena = cenaAtual?.luz;
  const topo = chao - elev - 452 * k + (1 - pop) * 60;
  const idLuz = `luz-${p.id}-${b.start.toFixed(2)}`;
  let filtro: React.ReactNode = null;
  if (luzCena) {
    const cx = x * W;
    const cy = topo + 240 * k;
    const ddx = (luzCena.x * W - cx) * (espelhar ? -1 : 1);
    const ddy = luzCena.y * H - cy;
    filtro = <defs><FiltroLuz id={idLuz} luz={{ dx: ddx, dy: ddy, cor: luzCena.cor ?? "#FFD9A0", forca: luzCena.forca ?? 0.8, ambiente: luzCena.ambiente ?? 1, contorno: 1.4 }} /></defs>;
  }
  return (
    <svg
      viewBox="-150 -40 300 470"
      width={300 * k}
      height={470 * k}
      style={{
        position: "absolute", left: x * W - 150 * k, top: topo, opacity: pop, overflow: "visible",
        transform: espelhar ? "scaleX(-1)" : undefined,
      }}
    >
      {filtro}
      <g filter={luzCena ? `url(#${idLuz})` : undefined}>
        <Boneco personagem={personagem} tema={TEMAS[pacote.tema ?? "plano"]} t={agora + fase(p.id)} look={p.look ?? "padrao"}
          acao={estado.acao} vista={estado.vista} expressao={estado.expressao} variante={p.variante} pose={pose} sombraChao={elev <= 0} />
      </g>
    </svg>
  );
};

/* ---------- clima: cor por clima, vinheta ---------- */

const TINTAS: Record<string, string> = {
  tensao: "rgba(8,18,40,0.28)", perigo: "rgba(120,10,10,0.2)", noite: "rgba(10,16,40,0.35)", entardecer: "rgba(255,140,60,0.10)",
};

/** filtro do cenário e dos personagens por clima: lembrança (flashback) em sépia; recap do episódio anterior em cinza */
const FILTROS_CLIMA: Record<string, string> = { lembranca: "sepia(0.75)", recap: "grayscale(1) contrast(1.15) brightness(0.78)" };

/** grão de filme do recap: pontos claros e escuros que mudam a cada 2 quadros (hash do quadro, sem Math.random) */
const Grao: React.FC = () => {
  const q = Math.floor(useCurrentFrame() / 2);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.22 }}>
      {Array.from({ length: 260 }).map((_, i) => (
        <circle key={i} cx={hash01(i * 7.3 + q * 13.1) * W} cy={hash01(i * 3.7 + q * 5.9) * H} r={1 + hash01(i + q) * 2.2} fill={i % 2 ? "#FFFFFF" : "#000000"} />
      ))}
    </svg>
  );
};

const Clima: React.FC<{ cena: CenaV2 }> = ({ cena }) => {
  const tinta = cena.clima ? TINTAS[cena.clima] : undefined;
  const recap = cena.clima === "recap";
  const vinheta = cena.efeitos?.some((e) => e.tipo === "vinheta") || cena.clima === "perigo" || cena.clima === "tensao" || recap;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {tinta && <AbsoluteFill style={{ background: tinta }} />}
      {vinheta && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, transparent ${recap ? 30 : 40}%, rgba(0,0,0,${recap ? 0.8 : 0.65}))` }} />}
      {recap && <Grao />}
    </AbsoluteFill>
  );
};

/* ---------- cartões e diagramas ---------- */

const buscar = <T,>(pacote: Record<string, T> | undefined, genericos: Record<string, T>, tipo: string, oQue: string): T => {
  const c = pacote?.[tipo] ?? genericos[tipo];
  if (!c) throw new Error(`${oQue} desconhecido: "${tipo}" (existem: ${[...new Set([...Object.keys(genericos), ...Object.keys(pacote ?? {})])].join(", ")})`);
  return c;
};

const Cartoes: React.FC<{ cena: CenaV2; progresso: number; t: number; frames: number; trechos: number[] }> = ({ cena, progresso, t, frames, trechos }) => {
  const pacote = usePacote();
  const { fps } = useVideoConfig();
  const cartoes = cena.cartoes ?? [];
  const noHud = (c: { tipo: string; zona?: string }) => (c.zona ? c.zona === "hud" : CARTOES_HUD.has(c.tipo) || !!pacote.cartoesHud?.includes(c.tipo));
  const visivel = (c: (typeof cartoes)[number]) => c.ateTrecho == null || t < (trechos[c.ateTrecho] ?? Infinity);
  const hud = cena.hud === false ? [] : cartoes.filter((c) => noHud(c) && visivel(c));
  const centro = cartoes.filter((c) => !noHud(c) && visivel(c));
  // cada cartão entra no trecho `trecho` da fala: o Sequence faz o pop começar ali, e t/trechos passam a contar dali
  const render = (c: (typeof cartoes)[number], i: number) => {
    const Comp = buscar(pacote.cartoes, CARTOES_GENERICOS, c.tipo, "cartão");
    const desde = c.trecho != null ? trechos[c.trecho] ?? 0 : 0;
    const de = Math.round(desde * fps);
    if (t < desde) return null;
    return (
      <Sequence key={i} from={de} durationInFrames={Math.max(frames - de, 1)} layout="none">
        <Comp d={c} cena={cena} progresso={progresso} t={t - desde} trechos={trechos.map((x) => x - desde)} indice={i} />
      </Sequence>
    );
  };
  const [h0] = ZONA.hud;
  const [a0, a1] = ZONA.acao;
  return (
    <AbsoluteFill>
      {hud.length > 0 && (
        <div style={{ position: "absolute", top: h0 + 10, left: SEGURA.esq, width: SEGURA.largura, display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap", alignContent: "flex-start" }}>
          {hud.map(render)}
        </div>
      )}
      {centro.length > 0 && (
        <div style={{ position: "absolute", top: a0, height: a1 - a0, left: 0, width: W, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
          {centro.map(render)}
        </div>
      )}
    </AbsoluteFill>
  );
};

const Diagramas: React.FC<{ cena: CenaV2; progresso: number; t: number; trechos: number[] }> = ({ cena, progresso, t, trechos }) => {
  const pacote = usePacote();
  const porTipo: Record<string, number> = {};
  return (
    <AbsoluteFill>
      {(cena.diagramas ?? []).map((d, i) => {
        const Comp = buscar(pacote.diagramas, DIAGRAMAS_GENERICOS, d.tipo, "diagrama");
        const indice = (porTipo[d.tipo] = (porTipo[d.tipo] ?? -1) + 1);
        return <Comp key={i} d={d} cena={cena} progresso={progresso} t={t} trechos={trechos} indice={indice} />;
      })}
    </AbsoluteFill>
  );
};

/* ---------- batida: câmera, transição, cenário, personagens, HUD, legenda ---------- */

export const Batida: React.FC<{ b: BatidaV2; frames: number; offset: number; primeira: boolean; anterior?: { b: BatidaV2; frames: number; offset: number } }> = ({
  b, frames, offset, primeira, anterior,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pacote = usePacote();
  const cena = b.scene;
  const t = frame / fps;
  const dur = frames / fps;
  const progresso = Math.min(frame / Math.max(frames - 1, 1), 1);
  const plano = PLANOS[cena.camera?.plano ?? "medio"];
  const em3d = !!cenario3d(pacote, cena.cenario);
  const Cenario = em3d ? null : buscar(pacote.cenarios, CENARIOS_GENERICOS, cena.cenario, "cenário");

  // transição de entrada
  const transicao = primeira ? "corte" : cena.transicao ?? "fade";
  const opacity = transicao === "fade" ? interpolate(frame, [0, FADE], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const kw = clamp01(frame / WHIP);
  const whipX = transicao === "whip" ? (1 - suave(kw)) * W * 0.35 : 0;
  const whipBlur = transicao === "whip" ? (1 - kw) * 26 : 0;

  // câmera: nunca parada (push lento padrão), pan, zoom, tremor, foco num personagem
  const mov = cena.camera?.movimento;
  const zoom = em3d ? 1 : mov === "zoom-lento" ? 1 + progresso * 0.08 : mov === "zoom-saindo" ? 1.08 - progresso * 0.08 : mov === "parado" || mov === "tilt-subindo" ? 1 : 1 + progresso * 0.035;
  const pan = em3d ? 0 : mov === "pan-direita" ? lerp(50, -50, suave(progresso)) : mov === "pan-esquerda" ? lerp(-50, 50, suave(progresso)) : 0;
  // tremor: a câmera inteira, ou um efeito "tremor" que entra no trecho dele
  const trechosBatida = b.segmentStarts.map((x) => Math.max(x - b.start, 0));
  const tremor = cena.camera?.tremor || cena.efeitos?.some((e: { tipo: string; trecho?: number }) =>
    e.tipo === "tremor-porta" || (e.tipo === "tremor" && t >= (e.trecho != null ? trechosBatida[e.trecho] ?? 0 : 0)));
  const dx = tremor ? Math.sin(frame * 2.1) * 9 * (0.4 + 0.6 * Math.abs(Math.sin(frame / 4))) : 0;
  const foco = cena.personagens?.find((p) => p.id === cena.camera?.foco);
  const origem = foco ? `${foco.x * 100}% 50%` : "50% 50%";

  const ctx: Contexto = { b, dur, offset };
  const trechos = b.segmentStarts.map((s) => Math.max(s - b.start, 0)); // início de cada trecho, relativo à batida
  const antCena = anterior?.b.scene;
  const doAnterior = (p: PersonagemEmCena) => {
    if (!anterior || !continua(cena, antCena)) return undefined;
    const q = antCena!.personagens?.find((o) => o.id === p.id);
    return q ? { p: q, b: anterior.b, dur: anterior.frames / fps, offset: anterior.offset } : undefined;
  };

  return (
    <AbsoluteFill style={{ opacity, transform: `translateX(${whipX}px)`, filter: whipBlur ? `blur(${whipBlur}px)` : undefined }}>
      <AbsoluteFill style={{ transform: `translateX(${dx + pan}px) scale(${zoom})`, transformOrigin: origem }}>
       <AbsoluteFill style={{ filter: cena.clima ? FILTROS_CLIMA[cena.clima] : undefined }}>
        {em3d ? (
          <Palco cena={cena} t={t} dur={dur} progresso={progresso} segmentos={trechos} words={b.words} offset={offset}
            anterior={anterior ? { cena: anterior.b.scene, dur: anterior.frames / fps, segmentos: anterior.b.segmentStarts.map((s) => Math.max(s - anterior.b.start, 0)) } : undefined} />
        ) : Cenario && <Cenario cena={cena} chao={plano.chao} u={plano.u} progresso={progresso} t={t} trechos={trechos} />}
        {!em3d && cena.personagens?.map((p, i) => {
          const recorte = p.enquadramento ? pacote.enquadramentos?.[p.enquadramento] : undefined;
          return (
            <AbsoluteFill key={`${p.id}-${i}`} style={{ clipPath: recorte }}>
              <PersonagemNaCena p={p} u={plano.u} chao={plano.chao} ctx={ctx} anterior={doAnterior(p)} cenaAtual={cena} />
            </AbsoluteFill>
          );
        })}
        <Diagramas cena={cena} progresso={progresso} t={t} trechos={trechos} />
        <Clima cena={cena} />
        <Efeitos cena={cena} chao={plano.chao} u={plano.u} t={t} trechos={trechos} />
       </AbsoluteFill>
        {/* recap em cinza: o cenário redesenha por cima só o que é destaque (ex.: a linha em vermelho), com a cor original */}
        {Cenario && cena.clima === "recap" && cena.recapDestaque && (
          <Cenario cena={{ ...cena, soDestaque: true }} chao={plano.chao} u={plano.u} progresso={progresso} t={t} trechos={trechos} />
        )}
      </AbsoluteFill>
      <Cartoes cena={cena} progresso={progresso} t={t} frames={frames} trechos={trechos} />
      <Legenda words={b.words} offset={offset} posicao={cena.legenda} />
    </AbsoluteFill>
  );
};

/* ---------- episódio ---------- */

export const pacoteDo = (data: EpisodioV2, episode: string): Pacote => {
  const slug = data.slug ?? episode.split("/")[0];
  const p = PACOTES[slug];
  if (!p) throw new Error(`pacote "${slug}" não registrado em banco/index.ts (existem: ${Object.keys(PACOTES).join(", ")})`);
  // o roteiro pode trocar o tema do pacote (ex.: benchmark de um elenco desenhado no tema "contornado")
  return data.tema ? { ...p, tema: data.tema } : p;
};

/** Quadros de cada batida: do início dela até o início da próxima (a última vai até o cartão final). */
export const janelas = (data: EpisodioV2) => {
  const fim = Math.round(data.endcardStart * data.fps);
  return data.beats.map((b, i) => {
    const from = Math.round(b.start * data.fps);
    const next = i + 1 < data.beats.length ? Math.round(data.beats[i + 1].start * data.fps) : fim;
    return { b, from, frames: next - from, offset: from / data.fps };
  });
};

export const EpisodioV2Comp: React.FC<{ episode: string; data: EpisodioV2 | null }> = ({ episode, data }) => {
  if (!data) return null;
  const pacote = pacoteDo(data, episode);
  const js = janelas(data);
  const fim = Math.round(data.endcardStart * data.fps);
  const Final = pacote.cartaoFinal ?? CartaoFinalPadrao;
  return (
    <PacoteCtx.Provider value={pacote}><IdiomaCtx.Provider value={idiomaDe(data.idioma)}>
      <AbsoluteFill style={{ background: "#121419" }}>
        {data.audio && <Audio src={staticFile(data.audio)} />}
        {js.map((j, i) => (
          <Sequence key={i} from={j.from} durationInFrames={j.frames} name={`batida ${i + 1} · ${j.b.scene.cenario}`}>
            <Batida b={j.b} frames={j.frames} offset={j.offset} primeira={i === 0} anterior={i > 0 ? js[i - 1] : undefined} />
          </Sequence>
        ))}
        {data.endcard && (
          <Sequence from={fim} name="cartão final">
            <Final ep={data} />
          </Sequence>
        )}
      </AbsoluteFill>
    </IdiomaCtx.Provider></PacoteCtx.Provider>
  );
};

/* ---------- revisão: folha de cenas (um quadro por batida) e tira de quadros (movimento) ---------- */

const ESC = 0.25;
const CEL_W = W * ESC;
const CEL_H = H * ESC;
export const COLUNAS = 6;
export const revisaoTamanho = (n: number) => ({ width: COLUNAS * (CEL_W + 16) + 32, height: Math.ceil(n / COLUNAS) * (CEL_H + 70) + 32 });

const Celula: React.FC<{ rotulo: string; children: React.ReactNode }> = ({ rotulo, children }) => (
  <div style={{ width: CEL_W, height: CEL_H + 54 }}>
    <div style={{ width: CEL_W, height: CEL_H, overflow: "hidden", position: "relative", borderRadius: 8 }}>
      <div style={{ width: W, height: H, transform: `scale(${ESC})`, transformOrigin: "top left", position: "absolute", background: "#121419" }}>{children}</div>
    </div>
    <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 18, color: "#C9CED6", marginTop: 6, lineHeight: 1.15, height: 42, overflow: "hidden" }}>{rotulo}</div>
  </div>
);

/** Folha de cenas: o quadro do meio de cada batida (ou o quadro `em` da batida, 0..1). */
export const RevisaoComp: React.FC<{ episode: string; data: EpisodioV2 | null; em?: number }> = ({ episode, data, em = 0.6 }) => {
  if (!data) return null;
  const pacote = pacoteDo(data, episode);
  const js = janelas(data);
  return (
    <PacoteCtx.Provider value={pacote}><IdiomaCtx.Provider value={idiomaDe(data.idioma)}>
      <AbsoluteFill style={{ background: "#1B2029", padding: 16, display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 16, alignContent: "flex-start" }}>
        {js.map((j, i) => (
          <Celula key={i} rotulo={`${i + 1} · ${j.offset.toFixed(1)}s · ${j.b.words.map((w) => w.text).join(" ")}`}>
            <Freeze frame={Math.round(j.frames * em)}>
              <Batida b={j.b} frames={j.frames} offset={j.offset} primeira={i === 0} anterior={i > 0 ? js[i - 1] : undefined} />
            </Freeze>
          </Celula>
        ))}
      </AbsoluteFill>
    </IdiomaCtx.Provider></PacoteCtx.Provider>
  );
};

/** Tira de quadros sequenciais de uma batida, para revisar o movimento (joelho, apoio, transição de pose). */
export const TiraComp: React.FC<{ episode: string; data: EpisodioV2 | null; batida: number; passo?: number }> = ({ episode, data, batida, passo = 4 }) => {
  if (!data) return null;
  const pacote = pacoteDo(data, episode);
  const js = janelas(data);
  const j = js[batida - 1];
  if (!j) throw new Error(`batida ${batida} não existe (são ${js.length})`);
  const quadros = Array.from({ length: COLUNAS * 2 }, (_, i) => i * passo).filter((f) => f < j.frames);
  return (
    <PacoteCtx.Provider value={pacote}><IdiomaCtx.Provider value={idiomaDe(data.idioma)}>
      <AbsoluteFill style={{ background: "#1B2029", padding: 16, display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 16, alignContent: "flex-start" }}>
        {quadros.map((f) => (
          <Celula key={f} rotulo={`batida ${batida} · quadro ${f} (${(f / data.fps).toFixed(2)}s)`}>
            <Freeze frame={f}>
              <Batida b={j.b} frames={j.frames} offset={j.offset} primeira={batida === 1} anterior={batida > 1 ? js[batida - 2] : undefined} />
            </Freeze>
          </Celula>
        ))}
      </AbsoluteFill>
    </IdiomaCtx.Provider></PacoteCtx.Provider>
  );
};

/* ---------- capa e artes de lançamento (skill publicar) ---------- */

/**
 * Um quadro do episódio congelado + título por cima, nas safe zones (nada nos 20% inferiores nem nos 12% da direita).
 * Props: quadro (frame do episódio), titulo, sub, selo (faixa pequena acima do título, ex.: "NEUE FOLGE").
 */
export const CapaComp: React.FC<{ episode: string; data: EpisodioV2 | null; quadro: number; titulo: string; sub?: string; selo?: string; escurecer?: number; tamanho?: number; legenda?: boolean; hud?: boolean }> = ({
  episode, data, quadro, titulo, sub, selo, escurecer = 0.45, tamanho = 200, legenda = true, hud = true,
}) => {
  if (!data) return null;
  // legenda: false = o quadro sem a legenda da fala (cartão de trailer, arte de story)
  // hud: false = o quadro sem o HUD da série (abre espaço para o título no topo)
  const quadroData = legenda && hud ? data : { ...data, beats: data.beats.map((b) => ({ ...b, words: legenda ? b.words : [], scene: hud ? b.scene : { ...b.scene, hud: false } })) };
  return (
    <AbsoluteFill style={{ background: "#121419" }}>
      <Freeze frame={quadro}>
        <EpisodioV2Comp episode={episode} data={quadroData} />
      </Freeze>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(8,10,13,${escurecer + 0.3}) 0%, rgba(8,10,13,${escurecer}) 30%, rgba(8,10,13,0) 55%)` }} />
      <div style={{ position: "absolute", top: 170, left: SEGURA.esq, width: SEGURA.largura, display: "flex", flexDirection: "column", gap: 18 }}>
        {selo && <div style={{ alignSelf: "flex-start", fontFamily: FONT, fontWeight: 700, fontSize: 40, color: "#15181F", background: "#F2C230", padding: "6px 18px", borderRadius: 8, letterSpacing: 3 }}>{selo}</div>}
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: tamanho, color: "#F4F1EA", lineHeight: 0.95, textShadow: "0 8px 0 rgba(0,0,0,0.45)" }}>{titulo}</div>
        {sub && <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 52, color: "#F4F1EA", letterSpacing: 4, textTransform: "uppercase" }}>{sub}</div>}
      </div>
    </AbsoluteFill>
  );
};
