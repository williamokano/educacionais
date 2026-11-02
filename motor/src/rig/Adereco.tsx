import React from "react";
import { escurecer } from "./cor";
import { Peca, Vista } from "./types";

// Adereços de mão. Origem (0,0) = ponto de pegada, no centro da mão.

const MolhoChaves: React.FC = () => (
  <g>
    <circle cx={0} cy={14} r={11} fill="none" stroke="#C9CDD2" strokeWidth={4} />
    {[-30, -5, 20, 45].map((a, i) => (
      <g key={i} transform={`translate(0 14) rotate(${a}) translate(0 10)`}>
        <rect x={-3} y={0} width={6} height={22} rx={2} fill={i % 2 ? "#D8B656" : "#B9BEC5"} />
        <rect x={-6} y={16} width={6} height={4} fill={i % 2 ? "#D8B656" : "#B9BEC5"} />
      </g>
    ))}
  </g>
);

const ChaveTriangular: React.FC = () => (
  <g>
    <rect x={-22} y={-5} width={44} height={10} rx={4} fill="#3D4148" />
    <rect x={-4} y={-4} width={8} height={40} fill="#9AA1AB" />
    <path d="M -6 36 L 6 36 L 0 46 Z" fill="#9AA1AB" />
  </g>
);

const Walkie: React.FC = () => (
  <g transform="translate(-10 -34)">
    <rect x={0} y={0} width={22} height={44} rx={5} fill="#E2572B" />
    <rect x={4} y={6} width={14} height={10} rx={2} fill="#2A2D33" />
    <line x1={16} y1={0} x2={18} y2={-22} stroke="#2A2D33" strokeWidth={4} strokeLinecap="round" />
  </g>
);

const Lanterna: React.FC = () => (
  <g>
    <rect x={-6} y={-8} width={12} height={40} rx={4} fill="#2A2D33" />
    <rect x={-8} y={30} width={16} height={10} rx={3} fill="#F2C230" />
  </g>
);

// gravata enrolada na mão (ferimento escondido); a ponta solta e uma gota pendurada
const GravataMao: React.FC = () => (
  <g>
    <circle cx={0} cy={0} r={15} fill="#B3262B" />
    <path d="M -10 -4 L 10 6 M -12 6 L 8 12" stroke="#7E1A1E" strokeWidth={3} />
    <path d="M 6 10 L 12 40 L 2 44 L -2 14 Z" fill="#B3262B" />
    <ellipse cx={8} cy={52} rx={3.5} ry={5} fill="#7E1A1E" />
  </g>
);

const Celular: React.FC = () => (
  <g transform="rotate(-8) translate(-12 -30)">
    <rect x={0} y={0} width={24} height={44} rx={5} fill="#22252B" />
    <rect x={3} y={4} width={18} height={34} rx={2} fill="#9FD3E6" />
  </g>
);

// carteira de couro aberta na horizontal, com a ponta das notas aparecendo
const Carteira: React.FC = () => (
  <g transform="translate(-22 -18)">
    <rect x={6} y={-6} width={34} height={14} rx={2} fill="#7DB37A" />
    <rect x={0} y={0} width={44} height={30} rx={6} fill="#6B4630" />
    <line x1={22} y1={2} x2={22} y2={28} stroke="#4E3222" strokeWidth={3} />
  </g>
);

// leque de notas (verdes), segurado pela ponta
const Notas: React.FC = () => (
  <g>
    {[-24, -8, 8].map((a, i) => (
      <g key={i} transform={`rotate(${a}) translate(-12 -46)`}>
        <rect x={0} y={0} width={24} height={46} rx={3} fill={i === 1 ? "#8CC489" : "#7DB37A"} stroke="#4F7D4C" strokeWidth={2} />
        <circle cx={12} cy={23} r={6} fill="none" stroke="#4F7D4C" strokeWidth={2} />
      </g>
    ))}
  </g>
);

// documento (RG): cartão verde-claro com a foto num canto
const Documento: React.FC = () => (
  <g transform="rotate(-6) translate(-26 -40)">
    <rect x={0} y={0} width={52} height={36} rx={4} fill="#CFE3C6" stroke="#7E9A72" strokeWidth={2} />
    <rect x={5} y={6} width={15} height={20} rx={2} fill="#8A8F96" />
    {[8, 16, 24].map((y) => <line key={y} x1={25} y1={y} x2={46} y2={y} stroke="#7E9A72" strokeWidth={3} />)}
  </g>
);

// muleta: a mão segura o apoio do meio; a almofada fica embaixo do braço e o pé no chão
const Muleta: React.FC = () => (
  <g>
    <rect x={-5} y={-74} width={10} height={210} rx={5} fill="#9AA1AB" stroke="#15181F" strokeWidth={2.5} />
    <rect x={-16} y={-82} width={32} height={12} rx={6} fill="#3A3F48" />
    <rect x={-10} y={-6} width={20} height={10} rx={4} fill="#3A3F48" />
    <rect x={-7} y={128} width={14} height={12} rx={4} fill="#2A2420" />
  </g>
);

// bengala de madeira: cabo curvo na mão, ponteira no chão
const Bengala: React.FC = () => (
  <g>
    <path d="M 4 0 Q 4 -16 -10 -16 Q -22 -16 -22 -4" stroke="#6B4A2E" strokeWidth={9} fill="none" strokeLinecap="round" />
    <rect x={0} y={-2} width={9} height={132} rx={4} fill="#6B4A2E" stroke="#15181F" strokeWidth={2} />
    <rect x={-1} y={124} width={11} height={10} rx={3} fill="#2A2420" />
  </g>
);

const ADERECOS: Record<string, React.FC> = {
  muleta: Muleta,
  bengala: Bengala,
  celular: Celular,
  carteira: Carteira,
  notas: Notas,
  documento: Documento,
  "gravata-mao": GravataMao,
  "molho-chaves": MolhoChaves,
  "chave-triangular": ChaveTriangular,
  walkie: Walkie,
  lanterna: Lanterna,
};

export const NOMES_ADERECOS = Object.keys(ADERECOS);

export const Adereco: React.FC<{ id: string; giro?: number }> = ({ id, giro = 0 }) => {
  const C = ADERECOS[id];
  if (!C) throw new Error(`adereço desconhecido no banco: "${id}"`);
  return <g transform={`rotate(${giro})`}><C /></g>;
};

type PropsCabeca = { peca?: Peca; vista: Vista; contorno?: number; tinta?: string };

/** Traço de uma peça: a mesma forma por baixo, engordada, na cor do contorno. */
const tracar = (el: React.ReactElement, c: number, tinta: string, chave?: string): React.ReactElement =>
  c > 0 ? (
    <React.Fragment key={chave}>
      {React.cloneElement(el as React.ReactElement<any>, { fill: tinta, stroke: tinta, strokeWidth: 2 * c, strokeLinejoin: "round", opacity: 1 })}
      {el}
    </React.Fragment>
  ) : el;

/** Peças de cabeça desenhadas ATRÁS da cabeça: o capuz levantado do moletom. */
export const CabecaAtras: React.FC<PropsCabeca> = ({ peca, vista, contorno = 0, tinta = "#15181F" }) => {
  if (peca?.id !== "capuz") return null;
  const cor = escurecer(peca.cor, 0.9);
  return vista === "frente"
    ? tracar(<ellipse cx={0} cy={74} rx={60} ry={66} fill={cor} />, contorno, tinta)
    : tracar(<ellipse cx={-12} cy={72} rx={60} ry={64} fill={cor} />, contorno, tinta);
};

// viseira do hazmat: única parte do rosto que fica visível
const VISEIRA_FRENTE = "M -38 66 Q -38 48 -20 48 L 20 48 Q 38 48 38 66 L 38 80 Q 38 98 20 98 L -20 98 Q -38 98 -38 80 Z";
const VISEIRA_PERFIL = "M 4 46 L 52 52 Q 58 74 50 98 L 4 98 Z";

/** Capuz hazmat: cobre a cabeça inteira, com um "furo" na viseira (máscara SVG). */
const CapuzHazmat: React.FC<{ peca: Peca; vista: Vista }> = ({ peca, vista }) => {
  const id = React.useId().replace(/:/g, "");
  const f = vista === "frente";
  const viseira = f ? VISEIRA_FRENTE : VISEIRA_PERFIL;
  const escuro = peca.cor2 ?? "#2A2D33";
  return (
    <g>
      <mask id={`capuz-${id}`} maskUnits="userSpaceOnUse" x={-100} y={-20} width={200} height={170}>
        <rect x={-100} y={-20} width={200} height={170} fill="#fff" />
        <path d={viseira} fill="#000" />
      </mask>
      <ellipse cx={f ? 0 : -4} cy={74} rx={62} ry={66} fill={peca.cor} mask={`url(#capuz-${id})`} />
      <path d={viseira} fill="#9CC3D6" opacity={0.35} stroke={escuro} strokeWidth={6} strokeLinejoin="round" />
      {f ? (
        <g>
          <circle cx={-16} cy={110} r={11} fill={escuro} />
          <circle cx={16} cy={110} r={11} fill={escuro} />
          <rect x={-10} y={100} width={20} height={16} rx={6} fill={escurecer(escuro, 1.4)} />
        </g>
      ) : (
        <circle cx={44} cy={110} r={13} fill={escuro} />
      )}
    </g>
  );
};

/** Peças de cabeça desenhadas NA FRENTE do rosto (lanterna, viseira, respirador) */
export const CabecaFrente: React.FC<PropsCabeca> = ({ peca, vista, contorno = 0, tinta = "#15181F" }) => {
  if (!peca) return null;
  const f = vista === "frente";
  const ct = (el: React.ReactElement, chave?: string) => tracar(el, contorno, tinta, chave);
  if (peca.id === "capuz") {
    // aro do capuz em volta do rosto (o capuz em si fica atrás da cabeça)
    return f
      ? ct(<path d="M -58 74 Q -58 6 0 6 Q 58 6 58 74 Q 58 128 30 134 Q 44 104 42 70 Q 38 28 0 28 Q -38 28 -42 70 Q -44 104 -30 134 Q -58 128 -58 74 Z" fill={peca.cor} />)
      : ct(<path d="M 4 12 Q -60 14 -64 76 Q -62 128 -2 132 Q -20 104 -16 74 Q -12 38 30 26 Q 20 14 4 12 Z" fill={peca.cor} />);
  }
  if (peca.id === "bone") {
    const aba = peca.cor2 ?? escurecer(peca.cor, 0.8);
    return f ? (
      <g>
        {ct(<path d="M -49 56 Q -50 12 0 12 Q 50 12 49 56 Z" fill={peca.cor} />, "copa")}
        {ct(<path d="M -42 56 Q 0 74 42 56 Q 0 48 -42 56 Z" fill={aba} />, "aba")}
        <circle cx={0} cy={13} r={4} fill={aba} />
      </g>
    ) : (
      <g>
        {ct(<path d="M -46 58 Q -48 14 4 14 Q 46 16 47 56 Z" fill={peca.cor} />, "copa")}
        {ct(<path d="M 38 50 L 80 58 Q 78 66 40 60 Z" fill={aba} />, "aba")}
      </g>
    );
  }
  if (peca.id === "gorro") {
    const barra = peca.cor2 ?? escurecer(peca.cor, 0.82);
    return f ? (
      <g>
        {ct(<path d="M -49 58 Q -52 2 0 2 Q 52 2 49 58 Z" fill={peca.cor} />, "copa")}
        {ct(<rect x={-51} y={44} width={102} height={16} rx={7} fill={barra} />, "barra")}
      </g>
    ) : (
      <g>
        {ct(<path d="M -46 60 Q -50 4 6 4 Q 50 8 48 58 Z" fill={peca.cor} />, "copa")}
        {ct(<rect x={-48} y={46} width={98} height={16} rx={7} fill={barra} />, "barra")}
      </g>
    );
  }
  if (peca.id === "fone") {
    const concha = peca.cor2 ?? escurecer(peca.cor, 0.7);
    return f ? (
      <g>
        <path d="M -50 70 Q -54 4 0 4 Q 54 4 50 70" stroke={peca.cor} strokeWidth={9} fill="none" strokeLinecap="round" />
        {ct(<rect x={-62} y={60} width={18} height={34} rx={8} fill={concha} />, "e")}
        {ct(<rect x={44} y={60} width={18} height={34} rx={8} fill={concha} />, "d")}
      </g>
    ) : (
      <g>
        <path d="M -6 64 Q -8 10 22 6" stroke={peca.cor} strokeWidth={9} fill="none" strokeLinecap="round" />
        {ct(<rect x={-18} y={62} width={24} height={36} rx={10} fill={concha} />)}
      </g>
    );
  }
  if (peca.id === "lanterna-cabeca") {
    return f ? (
      <g>
        <path d="M -47 54 Q 0 36 47 54 L 47 62 Q 0 44 -47 62 Z" fill={peca.cor} />
        <rect x={-13} y={36} width={26} height={18} rx={5} fill="#2A2D33" />
        <circle cx={0} cy={45} r={6} fill={peca.cor2 ?? "#F6E7A0"} />
      </g>
    ) : (
      <g>
        <path d="M -44 56 Q 0 38 44 50 L 44 58 Q 0 46 -44 64 Z" fill={peca.cor} />
        <rect x={34} y={38} width={16} height={20} rx={4} fill="#2A2D33" />
        <rect x={48} y={42} width={5} height={12} fill={peca.cor2 ?? "#F6E7A0"} />
      </g>
    );
  }
  if (peca.id === "capuz-hazmat") return <CapuzHazmat peca={peca} vista={vista} />;
  if (peca.id === "lenco") {
    return f
      ? <path d="M -48 46 Q 0 26 48 46 L 46 56 Q 0 38 -46 56 Z" fill={peca.cor} />
      : <path d="M -40 50 Q 4 30 44 44 L 42 54 Q 4 42 -40 60 Z" fill={peca.cor} />;
  }
  return null;
};
