import { Personagem3D } from "../../../src/v3d/tipos";

// Moradores do bunker (episódio 8): as três pessoas que ficam no bunker com o personagem principal. Sem nome no vídeo;
// os ids só existem no código. Mesma família visual do Zeca: boneco low poly, uma cor forte por pessoa para ler de longe.

/** Vizinha: camiseta rosa, calça jeans, cabelo longo escuro, sem boné. */
export const vizinha: Personagem3D = {
  nome: "Vizinha",
  altura: 1.62,
  pele: "#e0ac86",
  cabelo: "#24160f",
  olhos: "#3b2415",
  camiseta: "#ef5f9a",
  calca: "#3b5f9a",
  sapato: "#f2f0ea",
  sobrancelha: "#24160f",
  barriga: 0.1,
};

/** Menino: camiseta azul-clara, bermuda escura, boné verde virado para a frente. */
export const menino: Personagem3D = {
  nome: "Menino",
  altura: 1.2,
  pele: "#b97c52",
  cabelo: "#17100b",
  olhos: "#3b2415",
  camiseta: "#47b6e8",
  calca: "#2d3a55",
  sapato: "#e8e3d6",
  bone: { cor: "#3aa65b", aba: "#2c8447", virado: false },
  sobrancelha: "#17100b",
  barriga: 0.15,
};

/** Vovó: blusa lilás, saia cinza, cabelo grisalho, óculos redondos. */
export const vovo: Personagem3D = {
  nome: "Vovó",
  altura: 1.52,
  pele: "#d9a47c",
  cabelo: "#d7d9de",
  olhos: "#4a3523",
  camiseta: "#a982d8",
  calca: "#6c7078",
  sapato: "#5a3b26",
  oculos: { cor: "#8a6a3a", aro: 0.062 },
  sobrancelha: "#b9bbc0",
  barriga: 0.35,
};

export const MORADORES = { vizinha, menino, vovo };
