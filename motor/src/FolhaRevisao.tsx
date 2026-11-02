import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PERSONAGENS, TEMAS } from "../banco";
import { Boneco } from "./rig/Boneco";
import { NOMES_EXPRESSOES } from "./rig/Rosto";
import { Corpo, Expressao, Variante, Vista } from "./rig/types";
import { FONT } from "./theme";

// Folha de revisão de um personagem: ações × vistas, looks × variantes, expressões.
// Still (PNG) para revisar; o mesmo componente renderizado como vídeo mostra os ciclos animando.

export const FOLHA_W = 2800;
export const FOLHA_H = 4150;
const CEL_W = 330;
const CEL_H = 500;

const ACOES_FRENTE = [
  "em-pe", "olhando-em-volta", "acenando", "gesticulando", "pensando", "bracos-cruzados", "susto", "comemorando",
  "olhando-celular", "segurando", "mao-estendida", "segurando-chaves", "encostado", "sentado", "agachado", "apontando",
  "tapando-ouvidos", "mao-erguida",
];
const ACOES_PERFIL = [
  "em-pe", "andando", "correndo", "mancando", "gesticulando", "olhando-celular", "segurando", "mao-estendida",
  "susto", "girando-chave", "ouvido-na-porta", "agachado", "sentado",
];

// recorte do rosto: em pé, o ponto mais baixo do boneco fica em y=431 e é apoiado no chão (412);
// com a escala de altura aplicada em torno do chão, a cabeça (y=72) termina em 412 + (72 - 431) * altura
const rostoViewBox = (c: Corpo) => {
  const cy = 412 + (72 - 431) * c.altura;
  const s = c.altura * (c.cabecaEscala ?? 1);
  const w = 160 * s;
  return `${-w / 2} ${cy - 79 * s} ${w} ${150 * s}`;
};

type Cel = { rotulo: string; acao: string; vista: Vista; look: string; variante?: Variante; expressao?: Expressao };

const Celula: React.FC<Cel & { personagem: string; tema: string; t: number }> = ({ rotulo, personagem, tema, t, ...c }) => (
  <div style={{ width: CEL_W, height: CEL_H, display: "flex", flexDirection: "column", alignItems: "center" }}>
    <svg viewBox="-150 -40 300 470" width={CEL_W} height={CEL_H - 50} style={{ background: "#2C3440", borderRadius: 14 }}>
      <line x1={-150} y1={414} x2={150} y2={414} stroke="#46505E" strokeWidth={3} />
      <Boneco personagem={PERSONAGENS[personagem]} tema={TEMAS[tema]} t={t} look={c.look} acao={c.acao} vista={c.vista} variante={c.variante} expressao={c.expressao ?? "neutro"} />
    </svg>
    <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: "#C9CED6", marginTop: 8, textTransform: "uppercase" }}>{rotulo}</div>
  </div>
);

const Secao: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <div style={{ marginTop: 36 }}>
    <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, color: "#F2C230", marginBottom: 14, textTransform: "uppercase", letterSpacing: 2 }}>{titulo}</div>
    <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>{children}</div>
  </div>
);

export const FolhaRevisao: React.FC<{ personagem: string; tema: string }> = ({ personagem, tema }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = 0.35 + frame / fps; // no still, t=0,35 pega os ciclos no meio do passo
  const p = PERSONAGENS[personagem];
  const looks = Object.keys(p.looks);
  const props = { personagem, tema, t };

  return (
    <AbsoluteFill style={{ background: "#1B2029", padding: 50 }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 76, color: "#F4F1EA" }}>{p.nome.toUpperCase()}</div>
      <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 30, color: "#8C95A3" }}>
        FOLHA DE REVISÃO · TEMA "{tema.toUpperCase()}" · {looks.length} LOOKS · {ACOES_FRENTE.length + ACOES_PERFIL.length} POSES · {NOMES_EXPRESSOES.length} EXPRESSÕES
      </div>

      <Secao titulo="Ações · frente (look padrão)">
        {ACOES_FRENTE.map((a) => <Celula key={a} {...props} rotulo={a} acao={a} vista="frente" look="padrao" />)}
      </Secao>
      <Secao titulo="Ações · perfil (look padrão)">
        {ACOES_PERFIL.map((a) => <Celula key={a} {...props} rotulo={a} acao={a} vista="perfil" look="padrao" />)}
      </Secao>
      <Secao titulo="Looks e variante infectada">
        {looks.map((l) => <Celula key={`f-${l}`} {...props} rotulo={`${l} · frente`} acao="em-pe" vista="frente" look={l} />)}
        <Celula {...props} rotulo="infectado · frente" acao="em-pe" vista="frente" look="padrao" variante="infectado" />
        {looks.slice(0, 6 - looks.length).map((l) => <Celula key={`p-${l}`} {...props} rotulo={`${l} · perfil`} acao="andando" vista="perfil" look={l} />)}
        <Celula {...props} rotulo="infectado · perfil" acao="mancando" vista="perfil" look="padrao" variante="infectado" />
      </Secao>
      <Secao titulo="Expressões">
        {NOMES_EXPRESSOES.map((e) => (
          <div key={e} style={{ width: 222, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg viewBox={rostoViewBox(p.corpo)} width={210} height={196} style={{ background: "#2C3440", borderRadius: 14 }}>
              <Boneco personagem={p} tema={TEMAS[tema]} t={1} look="padrao" acao="em-pe" vista="frente" expressao={e} />
            </svg>
            <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 24, color: "#C9CED6", marginTop: 6, textTransform: "uppercase" }}>{e}</div>
          </div>
        ))}
      </Secao>
    </AbsoluteFill>
  );
};

// Elenco lado a lado, na mesma escala: compara alturas, silhuetas e cores (de frente e andando de perfil).
export const ELENCO_W = 2800;
export const ELENCO_H = 1500;

export const FolhaElenco: React.FC<{ ids: string[]; tema: string }> = ({ ids, tema }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = 0.35 + frame / fps;
  const larg = (ELENCO_W - 100) / ids.length;
  const Linha: React.FC<{ vista: Vista; acao: string }> = ({ vista, acao }) => (
    <div style={{ display: "flex" }}>
      {ids.map((id) => (
        <div key={id} style={{ width: larg, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <svg viewBox="-150 -40 300 470" width={larg} height={560}>
            <line x1={-150} y1={414} x2={150} y2={414} stroke="#46505E" strokeWidth={3} />
            <Boneco personagem={PERSONAGENS[id]} tema={TEMAS[tema]} t={t} look="padrao" acao={acao} vista={vista} expressao="neutro" />
          </svg>
          {vista === "frente" && (
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, color: "#F4F1EA", textTransform: "uppercase" }}>{PERSONAGENS[id].nome.split(" (")[0]}</div>
          )}
        </div>
      ))}
    </div>
  );
  return (
    <AbsoluteFill style={{ background: "#1B2029", padding: 50 }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 60, color: "#F2C230" }}>ELENCO · MESMA ESCALA</div>
      <Linha vista="frente" acao="em-pe" />
      <Linha vista="perfil" acao="andando" />
    </AbsoluteFill>
  );
};
