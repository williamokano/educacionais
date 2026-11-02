import { Tema } from "../../src/rig/types";

// Tema "plano": sem contorno, cores chapadas, membros de trás um pouco mais escuros no perfil.
export const plano: Tema = {
  nome: "plano",
  contorno: 0,
  corContorno: "#15181F",
  sombraMembroTras: 0.82,
  tinta: "#15181F",
  boca: "#7A3B32",
  infectado: { pele: "#9DAA8C", olho: "#F3EFA2" },
};
