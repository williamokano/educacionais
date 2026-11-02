import React from "react";
import { escurecer } from "./cor";
import { Corpo, Expressao, Tema, Vista } from "./types";

// Rosto e cabelo. Cabeça: centro (0, 72), raio 46. No perfil o rosto olha para +x.

type Params = { olho: number; pupila?: number; sobInt: number; sobExt: number; curva: number; abertura: number; largura: number };

// olho: abertura (≤0.2 = fechado/arco); sobInt/sobExt: deslocamento vertical das pontas da sobrancelha (− = sobe)
const EXPRESSOES: Record<Expressao, Params> = {
  neutro: { olho: 1, sobInt: 0, sobExt: 0, curva: 0.15, abertura: 0, largura: 18 },
  alerta: { olho: 1.3, sobInt: -6, sobExt: -6, curva: 0, abertura: 0.3, largura: 10 },
  cansado: { olho: 0.45, sobInt: 2, sobExt: 5, curva: -0.15, abertura: 0, largura: 16 },
  concentrado: { olho: 0.8, sobInt: 5, sobExt: -2, curva: -0.05, abertura: 0, largura: 12 },
  tenso: { olho: 1.1, sobInt: 5, sobExt: -3, curva: -0.3, abertura: 0, largura: 18 },
  medo: { olho: 1.35, pupila: 0.7, sobInt: -8, sobExt: 2, curva: -0.3, abertura: 0.6, largura: 12 },
  serio: { olho: 0.9, sobInt: 4, sobExt: 0, curva: 0, abertura: 0, largura: 16 },
  alivio: { olho: 0.15, sobInt: -3, sobExt: 0, curva: 0.4, abertura: 0, largura: 18 },
  suplicante: { olho: 1.2, sobInt: -9, sobExt: 4, curva: -0.35, abertura: 0.3, largura: 14 },
  raiva: { olho: 0.9, sobInt: 9, sobExt: -6, curva: -0.4, abertura: 0.3, largura: 18 },
  dor: { olho: 0.2, sobInt: 7, sobExt: -2, curva: -0.4, abertura: 0.4, largura: 16 },
  sorriso: { olho: 0.9, sobInt: -2, sobExt: -1, curva: 0.6, abertura: 0.2, largura: 22 },
  // sobrancelhas erguidas no meio, olhos abertos, boca levemente para baixo: preocupação, sem raiva nem pânico
  preocupado: { olho: 1.05, sobInt: -7, sobExt: 3, curva: -0.22, abertura: 0, largura: 14 },
};

export const NOMES_EXPRESSOES = Object.keys(EXPRESSOES) as Expressao[];

const Olho: React.FC<{ x: number; p: Params; tema: Tema; infectado: boolean; piscar: number; olhar: [number, number] }> = ({ x, p, tema, infectado, piscar, olhar }) => {
  if (infectado) return <circle cx={x} cy={76} r={6.5} fill={tema.infectado.olho} />;
  const aberto = p.olho * piscar;
  if (aberto <= 0.2) {
    return <path d={`M ${x - 7} 76 Q ${x} ${p.curva > 0 ? 70 : 80} ${x + 7} 76`} stroke={tema.tinta} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
  }
  // olhar: a pupila anda até 4 px para o lado e 3 px para cima/baixo
  return <ellipse cx={x + olhar[0] * 4} cy={76 + olhar[1] * 3} rx={5 * (p.pupila ?? 1)} ry={6 * aberto * (p.pupila ?? 1)} fill={tema.tinta} />;
};

const Boca: React.FC<{ x: number; meia?: boolean; p: Params; tema: Tema; infectado: boolean; fala: number }> = ({ x, meia, p, tema, infectado, fala }) => {
  const abertura = infectado ? 0.5 : Math.max(p.abertura, fala * 0.7);
  const w = meia ? p.largura * 0.55 : p.largura;
  if (abertura > 0.15) {
    return <ellipse cx={x} cy={101 - p.curva * 3} rx={w * 0.35} ry={3 + abertura * 8} fill={tema.boca} />;
  }
  const x0 = meia ? x - w * 0.2 : x - w / 2;
  const x1 = meia ? x + w * 0.8 : x + w / 2;
  return <path d={`M ${x0} 101 Q ${(x0 + x1) / 2} ${101 + p.curva * 14} ${x1} 101`} stroke={tema.boca} strokeWidth={4} fill="none" strokeLinecap="round" />;
};

/** Traço de uma peça (igual ao contornar do Boneco; repetido aqui para não criar import circular). */
const tracar = (el: React.ReactElement | null, c: number, tinta: string): React.ReactElement | null =>
  el && c > 0 ? (
    <>
      {React.cloneElement(el as React.ReactElement<any>, { fill: tinta, stroke: tinta, strokeWidth: 2 * c, strokeLinejoin: "round", opacity: 1 })}
      {el}
    </>
  ) : el;

type PropsCabelo = { corpo: Corpo; vista: Vista; contorno?: number; tinta?: string };

// careca: o "cabelo" é só o brilho do couro cabeludo, sem traço
export const Cabelo: React.FC<PropsCabelo> = ({ corpo, vista, contorno = 0, tinta = "#15181F" }) =>
  corpo.cabelo.tipo === "careca" ? cabeloFrente(corpo, vista) : tracar(cabeloFrente(corpo, vista), contorno, tinta);

/** Parte do cabelo que fica ATRÁS da cabeça e do tronco (longo, rabo de cavalo, chanel). */
export const CabeloAtras: React.FC<PropsCabelo> = ({ corpo, vista, contorno = 0, tinta = "#15181F" }) => {
  const { tipo, cor } = corpo.cabelo;
  const f = vista === "frente";
  let el: React.ReactElement | null = null;
  if (tipo === "longo") {
    el = f
      ? <path d="M -52 70 Q -62 150 -50 196 Q 0 208 50 196 Q 62 150 52 70 Z" fill={cor} />
      : <path d="M -46 56 Q -68 140 -52 200 L -10 200 Q -22 140 -8 80 Z" fill={cor} />;
  } else if (tipo === "rabo-de-cavalo" && !f) {
    el = (
      <g fill={cor}>
        <path d="M -42 44 Q -86 72 -72 140 Q -64 108 -46 66 Z" />
        <circle cx={-44} cy={50} r={9} />
      </g>
    );
  } else if (tipo === "chanel" && f) {
    el = <path d="M -54 66 L -54 106 Q 0 112 54 106 L 54 66 Z" fill={cor} />;
  }
  return tracar(el, contorno, tinta);
};

const cabeloFrente = (corpo: Corpo, vista: Vista): React.ReactElement | null => {
  const { tipo, cor } = corpo.cabelo;
  const f = vista === "frente";
  switch (tipo) {
    case "careca":
      // só o brilho do couro cabeludo
      return <ellipse cx={f ? -14 : 4} cy={36} rx={14} ry={7} fill="#FFFFFF" opacity={0.18} />;
    case "longo":
      return f
        ? <path d="M -52 112 Q -58 16 0 16 Q 58 16 52 112 L 42 112 Q 46 50 6 38 Q -30 46 -42 112 Z" fill={cor} />
        : <path d="M -44 94 Q -50 18 8 18 Q 48 20 46 50 Q 22 36 -2 46 Q -22 58 -24 98 Z" fill={cor} />;
    case "rabo-de-cavalo":
      return f
        ? <path d="M -47 66 Q -49 20 0 20 Q 49 20 47 66 Q 34 36 0 34 Q -34 36 -47 66 Z" fill={cor} />
        : <path d="M -42 80 Q -48 22 6 20 Q 46 20 46 48 Q 22 36 -2 42 Q -26 52 -30 82 Z" fill={cor} />;
    case "chanel":
      return f
        ? <path d="M -54 104 Q -58 16 0 16 Q 58 16 54 104 L 44 104 Q 46 44 0 40 Q -46 44 -44 104 Z" fill={cor} />
        : <path d="M -48 104 Q -54 18 8 18 Q 50 20 48 52 Q 24 38 0 46 Q -14 70 -16 104 Z" fill={cor} />;
    case "curto":
      return f
        ? <path d="M -47 66 Q -49 21 0 21 Q 49 21 47 66 Q 32 42 0 42 Q -32 42 -47 66 Z" fill={cor} />
        : <path d="M -42 84 Q -48 24 6 22 Q 46 22 46 50 Q 22 38 -2 46 Q -24 56 -28 86 Z" fill={cor} />;
    case "raspado":
      return f
        ? <path d="M -46 60 Q -46 24 0 24 Q 46 24 46 60 Q 30 40 0 40 Q -30 40 -46 60 Z" fill={cor} opacity={0.55} />
        : <path d="M -40 80 Q -44 28 6 26 Q 42 26 44 48 Q 20 38 -6 46 Z" fill={cor} opacity={0.55} />;
    case "cacheado":
      return (
        <g fill={cor}>
          {(f ? [[-40, 50], [-24, 30], [0, 22], [24, 30], [40, 50], [-46, 72], [46, 72]] : [[-36, 46], [-16, 28], [10, 22], [32, 32], [-42, 70], [-30, 88]]).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={18} />
          ))}
        </g>
      );
    case "coque":
      return (
        <g fill={cor}>
          <circle cx={f ? 0 : -14} cy={6} r={22} />
          {f
            ? <path d="M -48 74 Q -52 22 0 22 Q 52 22 48 74 Q 40 40 0 40 Q -40 40 -48 74 Z" />
            : <path d="M -42 84 Q -48 24 6 22 Q 46 22 46 50 Q 22 40 -4 48 Q -26 58 -30 86 Z" />}
        </g>
      );
    case "careca-lados":
      return f
        ? <g fill={cor}><path d="M -48 90 Q -54 56 -36 46 L -34 76 Z" /><path d="M 48 90 Q 54 56 36 46 L 34 76 Z" /></g>
        : <path d="M -40 96 Q -50 60 -24 44 L -14 82 Z" fill={cor} />;
    case "platinado-curto":
      return f
        ? <path d="M -48 80 Q -54 18 6 18 Q 56 22 48 64 Q 30 34 -6 40 Q -30 50 -38 86 Z" fill={cor} />
        : <path d="M -42 86 Q -50 20 8 20 Q 50 24 46 52 Q 24 36 -2 46 Q -26 58 -30 88 Z" fill={cor} />;
  }
  return null;
};

export const Rosto: React.FC<{
  corpo: Corpo; vista: Vista; expressao: Expressao; tema: Tema; infectado: boolean; piscar: number; pele: string;
  boca?: number; olhar?: [number, number];
}> = ({ corpo, vista, expressao, tema, infectado, piscar, pele, boca = 0, olhar = [0, 0] }) => {
  const p = EXPRESSOES[expressao];
  const r = corpo.rosto ?? {};
  if (vista === "perfil") {
    return (
      <g>
        <circle cx={46} cy={84} r={7} fill={escurecer(pele, 0.92)} />
        <ellipse cx={-6} cy={80} rx={7} ry={10} fill={escurecer(pele, 0.9)} />
        <Olho x={26} p={p} tema={tema} infectado={infectado} piscar={piscar} olhar={olhar} />
        <line x1={18} y1={62 + p.sobExt} x2={33} y2={60 + p.sobInt} stroke={tema.tinta} strokeWidth={4} strokeLinecap="round" />
        {r.bigode && <path d="M 26 92 Q 38 88 46 94 Q 36 98 26 96 Z" fill={r.bigode} />}
        {r.barba && (r.barbaTipo ?? "queixo") === "queixo" && <path d="M -2 88 Q 20 124 44 104 L 40 96 Q 20 110 4 84 Z" fill={r.barba} />}
        {r.barba && r.barbaTipo && r.barbaTipo !== "queixo" && (
          <path d="M -4 70 Q -4 118 28 122 Q 50 118 49 96 Q 38 104 28 100 Q 14 96 8 70 Z" fill={r.barba} opacity={r.barbaTipo === "rala" ? 0.38 : 1} />
        )}
        <Boca x={32} meia p={p} tema={tema} infectado={infectado} fala={boca} />
        {r.rugas && (
          <g stroke={escurecer(pele, 0.74)} strokeWidth={2.5} fill="none" strokeLinecap="round">
            <path d="M 20 50 Q 30 47 40 50" /><path d="M 24 56 Q 32 54 40 56" /><path d="M 38 84 Q 34 92 38 98" />
          </g>
        )}
        {r.cilios && <line x1={31} y1={72} x2={37} y2={67} stroke={tema.tinta} strokeWidth={3} strokeLinecap="round" />}
        {r.oculos && (r.oculosTipo === "escuro"
          ? <g><rect x={14} y={67} width={26} height={17} rx={7} fill="#15181F" stroke={r.oculos} strokeWidth={3} /><line x1={14} y1={72} x2={-4} y2={70} stroke={r.oculos} strokeWidth={3.5} /><path d="M 20 71 L 28 71" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={2.5} /></g>
          : <g stroke={r.oculos} strokeWidth={3.5} fill="none"><circle cx={26} cy={76} r={11} /><line x1={15} y1={74} x2={-4} y2={72} /></g>)}
        {r.brincos && <circle cx={-6} cy={96} r={5} fill="none" stroke={r.brincos} strokeWidth={3} />}
      </g>
    );
  }
  return (
    <g>
      <Olho x={-16} p={p} tema={tema} infectado={infectado} piscar={piscar} olhar={olhar} />
      <Olho x={16} p={p} tema={tema} infectado={infectado} piscar={piscar} olhar={olhar} />
      <line x1={-25} y1={62 + p.sobExt} x2={-9} y2={60 + p.sobInt} stroke={tema.tinta} strokeWidth={4} strokeLinecap="round" />
      <line x1={25} y1={62 + p.sobExt} x2={9} y2={60 + p.sobInt} stroke={tema.tinta} strokeWidth={4} strokeLinecap="round" />
      {r.bigode && <path d="M -16 94 Q 0 86 16 94 Q 8 98 0 95 Q -8 98 -16 94 Z" fill={r.bigode} />}
      {r.barba && (r.barbaTipo ?? "queixo") === "queixo" && <path d="M -40 88 Q 0 136 40 88 Q 30 112 0 116 Q -30 112 -40 88 Z" fill={r.barba} />}
      {r.barba && r.barbaTipo && r.barbaTipo !== "queixo" && (
        <path d="M -45 68 Q -46 122 0 128 Q 46 122 45 68 Q 40 98 20 102 Q 0 94 -20 102 Q -40 98 -45 68 Z" fill={r.barba} opacity={r.barbaTipo === "rala" ? 0.38 : 1} />
      )}
      <Boca x={0} p={p} tema={tema} infectado={infectado} fala={boca} />
      {tema.detalhado && <path d="M -1 83 Q 5 89 -1 92" stroke={escurecer(pele, 0.7)} strokeWidth={3} fill="none" strokeLinecap="round" />}
      {r.rugas && (
        <g stroke={escurecer(pele, 0.74)} strokeWidth={2.5} fill="none" strokeLinecap="round">
          <path d="M -16 46 Q 0 42 16 46" /><path d="M -11 53 Q 0 50 11 53" />
          <path d="M -28 90 Q -24 98 -27 105" /><path d="M 28 90 Q 24 98 27 105" />
        </g>
      )}
      {r.cilios && (
        <g stroke={tema.tinta} strokeWidth={3} strokeLinecap="round"><line x1={-21} y1={72} x2={-27} y2={67} /><line x1={21} y1={72} x2={27} y2={67} /></g>
      )}
      {r.oculos && (r.oculosTipo === "escuro"
        ? (
          <g>
            <g fill="#15181F" stroke={r.oculos} strokeWidth={3}><rect x={-30} y={67} width={25} height={18} rx={7} /><rect x={5} y={67} width={25} height={18} rx={7} /></g>
            <line x1={-5} y1={72} x2={5} y2={72} stroke={r.oculos} strokeWidth={3} />
            <g stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={2.5}><path d="M -24 71 L -16 71" /><path d="M 11 71 L 19 71" /></g>
          </g>
        )
        : <g stroke={r.oculos} strokeWidth={3.5} fill="none"><circle cx={-16} cy={76} r={11} /><circle cx={16} cy={76} r={11} /><line x1={-5} y1={76} x2={5} y2={76} /></g>)}
      {r.brincos && <g fill="none" stroke={r.brincos} strokeWidth={3}><circle cx={-46} cy={96} r={5} /><circle cx={46} cy={96} r={5} /></g>}
    </g>
  );
};
