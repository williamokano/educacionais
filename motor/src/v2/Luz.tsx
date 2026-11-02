import React from "react";

// Luz de cena sobre um personagem: contorno extra da silhueta, sombra própria do lado oposto à luz,
// borda clara do lado da luz e escurecimento ambiente. Um filtro SVG só, aplicado por cima do desenho.

export type Luz = {
  dx: number; // direção de onde vem a luz (unidades do boneco; normalizada aqui)
  dy: number;
  cor: string; // cor da borda de luz
  forca: number; // 0..1, opacidade da borda
  ambiente: number; // 1 = sem escurecer; <1 escurece o que a luz não pega
  contorno: number; // espessura extra da silhueta (0 = nenhuma)
};

/** Luz de uma cena do roteiro: posição na tela (0..1), cor e intensidade. */
export type LuzDaCena = { x: number; y: number; cor?: string; forca?: number; ambiente?: number };

export const FiltroLuz: React.FC<{ id: string; luz: Luz }> = ({ id, luz }) => {
  const n = Math.hypot(luz.dx, luz.dy) || 1;
  const [lx, ly] = [luz.dx / n, luz.dy / n];
  const s = luz.ambiente;
  return (
    <filter id={id} x="-40%" y="-20%" width="180%" height="140%" colorInterpolationFilters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius={luz.contorno} result="gordo" />
      <feFlood floodColor="#15181F" />
      <feComposite in2="gordo" operator="in" result="contorno" />
      <feComponentTransfer in="SourceGraphic" result="base">
        <feFuncR type="linear" slope={s} /><feFuncG type="linear" slope={s} /><feFuncB type="linear" slope={s * (s < 1 ? 1.12 : 1)} />
      </feComponentTransfer>
      <feOffset in="SourceAlpha" dx={lx * 13} dy={ly * 13} result="paraLuz" />
      <feComposite in="SourceAlpha" in2="paraLuz" operator="out" result="ladoEscuro" />
      <feGaussianBlur in="ladoEscuro" stdDeviation={2.2} result="ladoEscuroSuave" />
      <feFlood floodColor="#0B0E1A" floodOpacity={0.34} />
      <feComposite in2="ladoEscuroSuave" operator="in" result="sombra" />
      <feOffset in="SourceAlpha" dx={-lx * 5} dy={-ly * 5} result="contraLuz" />
      <feComposite in="SourceAlpha" in2="contraLuz" operator="out" result="ladoClaro" />
      <feFlood floodColor={luz.cor} floodOpacity={luz.forca} />
      <feComposite in2="ladoClaro" operator="in" result="borda" />
      <feMerge>
        {luz.contorno > 0 && <feMergeNode in="contorno" />}
        <feMergeNode in="base" />
        <feMergeNode in="sombra" />
        <feMergeNode in="borda" />
      </feMerge>
    </filter>
  );
};
