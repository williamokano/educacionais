import { Tema } from "../../src/rig/types";

// Tema "contornado": traço em cada peça (linhas internas), membros que afinam nas juntas, tronco com forma,
// orelhas e nariz. A luz da cena (sombra própria e borda) vem do filtro de luz, por cima.
export const contornado: Tema = {
  nome: "contornado",
  contorno: 2.6,
  corContorno: "#1A1D24",
  detalhado: true,
  sombraMembroTras: 0.8,
  tinta: "#15181F",
  boca: "#7A3B32",
  infectado: { pele: "#9DAA8C", olho: "#F3EFA2" },
};
