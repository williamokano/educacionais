import { Personagem3D } from "../../../src/v3d/tipos";

// Zeca Parafuso: o apresentador da demo de explicador 3D.
// 41 anos, técnico de manutenção de Belém. Desmonta tudo para entender (e explicar) como funciona:
// ventilador, geladeira, chuveiro, a moto do vizinho. Curioso e empolgado, fala com as mãos
// e faz cara de "eureka" quando a peça encaixa na explicação. Bordão: "Bora abrir isso aí?"
// Visual: boné laranja virado para trás, óculos redondos grandes, bigode grosso, macacão azul-petróleo
// com uma chave inglesa no bolso do peito, camiseta amarela por baixo, botas marrons.
export const zeca: Personagem3D = {
  nome: "Zeca Parafuso",
  altura: 1.6,
  pele: "#c98f63",
  cabelo: "#2e1f14",
  olhos: "#4a2f1b",
  camiseta: "#f2c230",
  calca: "#1f6f78",
  macacao: true,
  botoes: "#f2c230",
  sapato: "#7a4a26",
  bone: { cor: "#f07a2a", aba: "#d4621a", virado: true },
  oculos: { cor: "#2b2b2b", aro: 0.068 },
  bigode: "#3a2616",
  sobrancelha: "#2e1f14",
  bolso: "chave-inglesa",
  barriga: 0.45,
};
