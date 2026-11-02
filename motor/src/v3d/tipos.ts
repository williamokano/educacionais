import React from "react";
import { Expressao } from "../rig/types";
import { CenaV2, Mudanca } from "../v2/tipos";

// Estilo 3D: o mesmo roteiro v2, com cenários 3D (Three.js via @remotion/three) no lugar dos cenários SVG.
// Uma batida é 3D quando o cenário dela está em `cenarios3d` do pacote. O vocabulário está em docs/roteiro-3d.md.

export type V3 = [number, number, number];

/** "lowpoly" = facetado e chapado (rápido, lê bem no celular); "suave" = curvas lisas, bordas arredondadas e reflexo de ambiente. */
export type Qualidade = "lowpoly" | "suave";

/** Ponto de câmera: posição, para onde olha e abertura (graus, vertical). */
export type PontoCamera = { pos: V3; alvo: V3; fov?: number };

/** Número fixo ou animado dentro da batida: de → para, entre `ini` e `fim` (0..1 da batida). */
export type Valor = number | { de: number; para: number; ini?: number; fim?: number };

export type Cenario3DProps = {
  cena: CenaV2;
  progresso: number; // 0..1 dentro da batida
  t: number; // s desde o início da batida
  tEpisodio: number; // s desde o início do episódio (movimento contínuo entre batidas: pás, partículas)
  trechos: number[]; // início (s, relativo à batida) de cada trecho da fala
  qualidade: Qualidade;
};

export type Cenario3D = {
  Cena: React.FC<Cenario3DProps>;
  cameras: Record<string, PontoCamera>; // pontos com nome, usados em camera.de / camera.para
  padrao: string; // câmera sem `camera.de`
  fundo?: string | ((cena: CenaV2, progresso: number) => string); // cor de fundo do canvas (céu, estúdio); função = muda com a cena (inverno)
  luzPropria?: boolean; // true = o cenário acende as próprias luzes (sem a luz padrão do palco)
};

/* ---------- personagem 3D ---------- */

/** Pose = ângulos (rad) por junta; o que faltar é 0. Juntas: ver JUNTAS em personagem.tsx. */
export type Pose3D = Partial<Record<string, number>>;

export type Personagem3D = {
  nome: string;
  altura?: number; // m (padrão 1,6); o corpo inteiro escala junto
  pele: string;
  cabelo?: string; // costeleta e nuca (sob o boné) ou topete (sem boné)
  olhos?: string; // íris
  camiseta: string; // tronco de cima e mangas curtas
  calca: string; // pernas (e o macacão, se houver)
  macacao?: boolean; // peitilho com alças na cor da calça
  sapato: string;
  bone?: { cor: string; aba?: string; virado?: boolean }; // virado = aba para trás
  oculos?: { cor: string; aro?: number }; // aro = raio da lente (m, padrão 0,07)
  bigode?: string;
  sobrancelha?: string;
  bolso?: "chave-inglesa" | "caneta" | null; // o que sai do bolso do peito
  botoes?: string; // botões do macacão
  barriga?: number; // 0..1: tronco mais largo embaixo
};

export type Expressao3D = Expressao | "eureka" | "pensativo" | "surpreso";

export type Personagem3DEmCena = {
  id: string;
  acao: string; // em-pe, acenando, apontando, explicando, pensando, comemorando, andando, sentado
  expressao?: Expressao3D;
  pos?: [number, number]; // x, z no chão (m)
  elev?: number; // altura dos pés (m): em cima de escada, laje, cesto; padrão 0 (no chão)
  de?: [number, number]; // anda de `de` até `pos` durante `tempoMov` (padrão: 85% da batida)
  tempoMov?: number;
  acaoChegada?: string;
  rot?: number; // rad em torno do eixo vertical (0 = de frente para +z)
  olharPara?: V3; // a cabeça vira para esse ponto (ex.: o objeto explicado)
  fala?: boolean | number[];
  muda?: (Mudanca & { expressao?: Expressao3D })[];
  entra?: number;
  escala?: number;
  suor?: number | { de: number; para: number; ini?: number; fim?: number }; // 0..1: gotas na testa (calor)
  cobertor?: number | { de: number; para: number; ini?: number; fim?: number }; // 1 = nos ombros, 0 = escorregou para trás
  bafo?: number | { de: number; para: number; ini?: number; fim?: number }; // 0..1: vapor da respiração (frio)
};
