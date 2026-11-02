import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SEGURA } from "../theme";
import { Word } from "../types";
import { ZONA } from "./Genericos";
import { FRACAS, Idioma, useIdioma } from "./idioma";

// Legenda palavra a palavra (regra 7 do CLAUDE.md): blocos de 1–4 palavras em caixa alta, quebrados na pontuação,
// sem artigo ou preposição solta no fim do bloco; amarelo = dica (*palavra*), vermelho = perigo (_palavra_).

const MAX = 4;
const limpa = (t: string) => t.toLowerCase().replace(/[^\p{L}]/gu, "");
const fimDeFrase = (t: string) => /[.,:;!?…"”»]$/.test(t);

export const blocos = (words: Word[], idioma: Idioma = "pt"): Word[][] => {
  const fracas = FRACAS[idioma] ?? FRACAS.pt;
  const out: Word[][] = [];
  let cur: Word[] = [];
  const fecha = () => {
    // palavra fraca no fim passa para o próximo bloco (se o bloco tiver outra palavra)
    const carrega: Word[] = [];
    // palavra que fecha a frase ("Das Radio nicht.") fica onde está, mesmo sendo fraca
    while (cur.length > 1 && fracas.has(limpa(cur[cur.length - 1].text)) && !fimDeFrase(cur[cur.length - 1].text)) carrega.unshift(cur.pop()!);
    if (cur.length) out.push(cur);
    cur = carrega;
  };
  for (const w of words) {
    // um destaque começa num bloco novo ("O SEU OTÁVIO" / "NÃO TEM BIGODE")
    if (w.color && cur.length >= 2 && cur[cur.length - 1].color !== w.color) fecha();
    cur.push(w);
    if (fimDeFrase(w.text)) fecha();
    else if (cur.length >= MAX) fecha();
  }
  if (cur.length) out.push(cur);
  return out;
};

const COR = { yellow: C.yellow, red: C.red };
// tira a pontuação do fim, menos ?, ! e reticências (regra das legendas da roteiro-animacao)
const exibir = (t: string) => t.replace(/[“”"„«»]/g, "").replace(/[.,:;]+$/, "").replace(/\.\.\.$|…$/, "...");

/** posicao "topo" (y 420–640) só quando a ação ocupa a faixa de baixo; o padrão é a faixa da regra (y 1140–1360) */
export const Legenda: React.FC<{ words: Word[]; offset: number; posicao?: "topo" | "padrao" }> = ({ words, offset, posicao }) => {
  // offset = início da batida em segundos (os tempos das palavras são absolutos no episódio)
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const agora = offset + frame / fps;
  const grupos = blocos(words, useIdioma());
  const idx = grupos.findLastIndex((g) => g[0].start <= agora + 0.03);
  if (idx < 0) return null;
  const g = grupos[idx];
  const surge = spring({ frame: Math.round((agora - g[0].start) * fps), fps, config: { damping: 12, mass: 0.5 } });
  const [y0, y1] = posicao === "topo" ? [420, 640] : ZONA.legenda;
  return (
    <div style={{
      position: "absolute", top: y0, height: y1 - y0, left: SEGURA.esq, width: SEGURA.largura,
      display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
      fontFamily: FONT, fontWeight: 700, fontSize: 88, lineHeight: 1.02, textTransform: "uppercase",
      color: C.white, textShadow: "0 5px 0 rgba(0,0,0,0.55), 0 0 18px rgba(0,0,0,0.45)",
      transform: `scale(${0.86 + surge * 0.14})`,
    }}>
      <div style={{ textWrap: "balance" }}>
        {g.map((w, i) => (
          <span key={i} style={{ color: w.color ? COR[w.color] : C.white }}>
            {exibir(w.text)}{i < g.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};
