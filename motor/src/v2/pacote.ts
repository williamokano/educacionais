import React from "react";
import { Personagem } from "../rig/types";
import { CenaV2, Elemento, EpisodioV2 } from "./tipos";
import type { Cenario3D, Personagem3D, Qualidade } from "../v3d/tipos";

// Pacote = o que uma série (ou benchmark) traz para o motor: elenco, cenários, cartões, diagramas e cartão final.
// O motor tem os genéricos (src/v2/Genericos.tsx); o pacote acrescenta ou substitui pelo mesmo nome.

/**
 * chao = y (px) onde os pés tocam; u = px por unidade do rig no plano (escala dos objetos do cenário);
 * progresso = 0..1 dentro da batida; t = segundos desde o início da batida;
 * trechos = início (s, relativo à batida) de cada trecho da fala, para o cenário reagir ao texto.
 */
export type CenarioProps = { chao: number; u: number; progresso: number; t: number; trechos: number[]; cena: CenaV2 };
/** t e trechos contam a partir da entrada do elemento (campo `trecho` do cartão; sem ele, o início da batida) */
export type ElementoProps = { d: Elemento; cena: CenaV2; progresso: number; t: number; trechos: number[]; indice?: number };

export type Pacote = {
  nome: string;
  tema?: string; // banco/temas (padrão: "plano")
  personagens: Record<string, Personagem>;
  cenarios?: Record<string, React.FC<CenarioProps>>;
  cartoes?: Record<string, React.FC<ElementoProps>>;
  cartoesHud?: string[]; // cartões do pacote que vão para a faixa do HUD (y 160–330) sem precisar de "zona"
  diagramas?: Record<string, React.FC<ElementoProps>>;
  cartaoFinal?: React.FC<{ ep: EpisodioV2 }>;
  enquadramentos?: Record<string, string>; // clip-path aplicado aos personagens com esse `enquadramento`
  // estilo 3D (docs/roteiro-3d.md): a batida cujo cenário está aqui é desenhada em 3D
  cenarios3d?: Record<string, Cenario3D>;
  personagens3d?: Record<string, Personagem3D>;
  qualidade3d?: Qualidade; // padrão "suave"; a cena pode trocar com "qualidade"
};

export const PacoteCtx = React.createContext<Pacote | null>(null);

export const usePacote = (): Pacote => {
  const p = React.useContext(PacoteCtx);
  if (!p) throw new Error("episódio sem pacote: confira o slug em banco/index.ts");
  return p;
};
