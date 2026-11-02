import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, W } from "../theme";
import { Word } from "../types";

const MAX_WORDS = 3;

// Agrupa em blocos de até 3 palavras, quebrando em pontuação — como na referência.
export const chunk = (words: Word[]) => {
  const groups: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length === MAX_WORDS || /[.,:;!?]$/.test(w.text)) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);
  return groups;
};

const COLOR = { yellow: C.yellow, red: C.red };

export const Captions: React.FC<{ words: Word[]; offset: number }> = ({ words, offset }) => {
  // offset = início da batida em segundos (os tempos das palavras são absolutos no episódio)
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = offset + frame / fps;
  const groups = chunk(words);
  const idx = groups.findLastIndex((g) => g[0].start <= now);
  if (idx < 0) return null;
  const group = groups[idx];
  const appear = spring({ frame: Math.round((now - group[0].start) * fps), fps, config: { damping: 12, mass: 0.5 } });

  return (
    <div style={{
      position: "absolute", top: 560, left: 60, width: W - 120, textAlign: "center",
      fontFamily: FONT, fontWeight: 700, fontSize: 92, lineHeight: 1.05, textTransform: "uppercase",
      color: C.white, textShadow: "0 5px 0 rgba(0,0,0,0.45)", transform: `scale(${0.85 + appear * 0.15})`,
    }}>
      {group.map((w, i) => (
        <span key={i} style={{ color: w.color ? COLOR[w.color] : C.white }}>
          {w.text.replace(/[.,:;!?]+$/, "")}{i < group.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
};
