import { Personagem3D } from "../../../src/v3d/tipos";

// Pessoas do episódio da procissão (episódio 12): fiéis, coroinhas, padre e motoboy. Sem nome no vídeo; os ids só existem no código.
// Mesma família visual do Zeca: boneco low poly, uma cor forte por pessoa para ler de longe, à noite.

export const homemA: Personagem3D = { nome: "Homem A", altura: 1.74, pele: "#c98f63", cabelo: "#1f1510", olhos: "#3b2415", camiseta: "#3c6fb5", calca: "#2a2f45", sapato: "#2b2118", sobrancelha: "#1f1510", barriga: 0.25 };
export const homemB: Personagem3D = { nome: "Homem B", altura: 1.68, pele: "#8d5a3a", cabelo: "#0f0b08", olhos: "#2a170c", camiseta: "#4b9a62", calca: "#3d3a36", sapato: "#2b2118", sobrancelha: "#0f0b08", barriga: 0.35 };
export const homemC: Personagem3D = { nome: "Homem C", altura: 1.78, pele: "#e3b48a", cabelo: "#6b4a2a", olhos: "#3d5a6e", camiseta: "#a8383f", calca: "#2a2f45", sapato: "#2b2118", sobrancelha: "#6b4a2a", barriga: 0.15 };
export const mulher: Personagem3D = { nome: "Mulher", altura: 1.6, pele: "#b97c52", cabelo: "#2a1810", olhos: "#3b2415", camiseta: "#e8a13a", calca: "#5a3b5e", sapato: "#3a2a22", sobrancelha: "#2a1810", barriga: 0.1 };

/** Coroinha / ceroferário / cruciferário: alva branca com cordão. */
export const coroinha: Personagem3D = { nome: "Coroinha", altura: 1.55, pele: "#d9a47c", cabelo: "#2a1810", olhos: "#3b2415", camiseta: "#f5f2ea", calca: "#f5f2ea", sapato: "#e8e3d6", sobrancelha: "#2a1810", barriga: 0.2 };
export const coroinha2: Personagem3D = { ...coroinha, nome: "Coroinha 2", altura: 1.5, pele: "#b97c52", cabelo: "#17100b" };

/** Padre: alva branca, cabelo grisalho, óculos. */
export const padre: Personagem3D = { nome: "Padre", altura: 1.72, pele: "#e0ac86", cabelo: "#cfcfd2", olhos: "#4a3523", camiseta: "#f5f2ea", calca: "#f5f2ea", sapato: "#3a2a22", oculos: { cor: "#8a6a3a", aro: 0.062 }, sobrancelha: "#b9bbc0", barriga: 0.4 };

/** Motoboy: jaqueta amarela e capacete vermelho. */
export const motoboy: Personagem3D = { nome: "Motoboy", altura: 1.7, pele: "#c98f63", cabelo: "#17100b", olhos: "#3b2415", camiseta: "#f2c230", calca: "#222831", sapato: "#1b1b1f", bone: { cor: "#d6322a", aba: "#a8231c", virado: false }, sobrancelha: "#17100b", barriga: 0.2 };

export const FIEIS = { homemA, homemB, homemC, mulher, coroinha, coroinha2, padre, motoboy };
