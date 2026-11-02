import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const W = 1080;
export const H = 1920;
/**
 * Coluna segura de TEXTO, centrada na tela (x 162–918 de 1080). Medido num iPhone em 28/10/2026: em tela alta o Reels
 * corta ~68 px (6,3%) de cada lado do vídeo e põe os botões (curtir, comentar…) em x ≈ 914–970. Texto fora dessa
 * coluna some na borda ou fica sob os botões, mesmo com o vídeo correto no arquivo. Todo texto do motor usa SEGURA.
 */
export const SEGURA = { esq: W * 0.15, dir: W * 0.85, largura: W * 0.7 } as const;

export const FONT = "Oswald";
loadFont({ family: FONT, url: staticFile("fonts/oswald-latin-500-normal.woff2"), weight: "500" });
loadFont({ family: FONT, url: staticFile("fonts/oswald-latin-700-normal.woff2"), weight: "700" });

export const C = {
  white: "#F4F1EA",
  yellow: "#F2C230",
  red: "#E0473C",
  green: "#4FA36B",
  ink: "#15181F",
  navy: "#1E2430",
  slate: "#2C3440",
  dusk1: "#E9B77A",
  dusk2: "#C98A55",
  ground: "#5F646B",
  building: ["#9AA0A3", "#8A9094", "#B3B6B4", "#7D8387"],
};

export type ChipColor = "yellow" | "red" | "green" | "white";
export const chipBg = (c: ChipColor = "yellow") => (c === "white" ? C.white : C[c]);
