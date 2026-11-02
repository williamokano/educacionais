import { Personagem3D } from "../../../src/v3d/tipos";

// Eletricista da distribuidora (episódio 4): trabalha no fio da rua. Sem nome; aparece só de longe.
// Visual: capacete branco (o boné sem aba virada), macacão laranja de serviço com faixas, camiseta cinza, botas pretas.
export const eletricista: Personagem3D = {
  nome: "Eletricista",
  altura: 1.65,
  pele: "#8d5a3b",
  cabelo: "#1d1410",
  olhos: "#3a2414",
  camiseta: "#7d868f",
  calca: "#f07a2a",
  macacao: true,
  botoes: "#d9dde1",
  sapato: "#1e1e1e",
  bone: { cor: "#f4f4f2", aba: "#dcdcd8", virado: false },
  sobrancelha: "#1d1410",
  bolso: "caneta",
  barriga: 0.2,
};
