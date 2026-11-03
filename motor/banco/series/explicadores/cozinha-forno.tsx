import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { Caixa, Mat, rnd } from "../../../src/v3d/qualidade";
import { corBatata, Fluxo, Halo, Liga, mistura, Seta, Texto3D, V } from "./cozinha-base";
import { CY, XM } from "./cozinha-fogao";

export const X0 = 2.2; // centro do forno no desenho (a caixa inteira é depois escalada e posta no fogão ou na bancada)
/** Escala do desenho do forno para o mundo (m por unidade): luzes e o tamanho real dos palitos dependem dela. */
export const EscCtx = React.createContext(0.245);

// Cozinha: o forno (que encolhe e vira a airfryer) e tudo o que vai dentro: assadeira, cesto furado, gaveta, batatas,
// resistência, ventilador, termostato, temporizador, papel e chama. O fundo do forno fica em z = ZB; a frente aberta, em z = ZF.

export const ZB = -1.1;
export const ZF = 0.18;
const ESTAGIOS: [number, number][] = [[1.1, 1.5], [0.85, 1.2], [0.56, 1.0]];
export const FUNDO_CESTO = 0.27; // altura do fundo do cesto sobre o piso do forno
export const FUNDO_BANDEJA = 0.07;
const FORA = 2.6; // quanto a peça fica para fora (z) antes de deslizar para dentro

export type Geo = { wi: number; hi: number; yb: number; yt: number; th: number };

/** Tamanho do forno: 0 = grande, 1 = pequeno, 2 = a caixa da airfryer. */
export const geo = (f: number, corpo: number): Geo => {
  const ff = Math.max(0, Math.min(f, 2));
  const i = Math.min(Math.floor(ff), 1);
  const k = suave(ff - i);
  const a = ESTAGIOS[i];
  const b = ESTAGIOS[i + 1];
  const yb = CY + 0.1;
  const hi = lerp(a[1], b[1], k);
  return { wi: lerp(a[0], b[0], k), hi, yb, yt: yb + hi, th: 0.12 + 0.12 * corpo };
};

const sai = (k: number) => FORA * (1 - suave(k)); // 0 = dentro, FORA = fora

/* ---------- a caixa ---------- */

export const mostradorTex = (txt: string, cor = "#ff9a2e") => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const g = c.getContext("2d")!;
  g.fillStyle = "#14161a";
  g.fillRect(0, 0, 256, 96);
  g.font = "700 72px Oswald, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = cor;
  g.shadowColor = cor;
  g.shadowBlur = 10;
  g.fillText(txt, 128, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export const Forno: React.FC<{ g: Geo; corpo: number; porta: number; luz: number; painel: number; texto: string; t: number; sino: number; semPorta?: boolean }> = ({ g, corpo, porta, luz, painel, texto, t, sino, semPorta }) => {
  const esc = React.useContext(EscCtx);
  const fora = mistura("#c9ced4", "#1b1c20", corpo);
  const dentro = mistura("#808690", "#3d4048", corpo);
  const { wi, yb, yt, th, hi } = g;
  const lajeH = 0.12 + 0.3 * corpo; // o teto engorda e vira a tampa do aparelho
  const alt = yt + lajeH - CY;
  const tex = useMemo(() => mostradorTex(texto), [texto]);
  const topoY = yt + lajeH / 2;
  const frenteZ = -0.45 + 0.7;
  const raio = 0.03 + 0.06 * corpo;
  const met = corpo > 0.5 ? 0.05 : 0.5;
  const rug = corpo > 0.5 ? 0.85 : 0.4;
  return (
    <group>
      {/* paredes, piso, teto e fundo */}
      {[-1, 1].map((s) => <Caixa key={s} p={[X0 + s * (wi + th / 2), CY + alt / 2, -0.45]} t={[th, alt, 1.4]} cor={fora} raio={raio} rug={rug} met={met} />)}
      <Caixa p={[X0, CY + 0.05, -0.45]} t={[2 * (wi + th), 0.1, 1.4]} cor={fora} raio={raio} rug={rug} met={met} />
      <Caixa p={[X0, topoY, -0.45]} t={[2 * (wi + th), lajeH, 1.4]} cor={fora} raio={raio} rug={rug} met={met} />
      <Caixa p={[X0, (yb + yt) / 2, ZB - 0.06]} t={[2 * wi, hi, 0.12]} cor={dentro} raio={0.01} rug={0.8} sombra={false} />
      <Caixa p={[X0, yb + 0.005, -0.45]} t={[2 * wi, 0.015, 1.3]} cor={mistura(dentro, "#000000", 0.08)} raio={0.005} sombra={false} />
      {/* acabamento do aparelho: grade de ventilação em cima, faixa laranja e pezinhos */}
      {corpo > 0.02 && (
        <group scale={[1, corpo, 1]} position={[0, (1 - corpo) * topoY, 0]}>
          {Array.from({ length: 8 }).map((_, i) => <Caixa key={i} p={[X0, topoY + lajeH / 2 + 0.004, -0.95 + i * 0.1]} t={[Math.min(2 * wi, 1.0) * 0.9, 0.012, 0.045]} cor="#050506" raio={0.004} sombra={false} />)}
          <Caixa p={[X0, yt + 0.02, frenteZ + 0.008]} t={[2 * (wi + th) - 0.06, 0.035, 0.02]} cor="#ff7a2e" raio={0.01} rug={0.4} />
          {[-1, 1].map((s) => <Caixa key={s} p={[X0 + s * (wi + th / 2), CY + 0.25, frenteZ - 0.45 + 0.46]} t={[0.03, 0.34, 0.02]} cor="#ff7a2e" raio={0.01} rug={0.4} />)}
          {[-1, 1].map((s) => <Caixa key={s} p={[X0 + s * (wi + th * 0.3), CY - 0.02, 0.1]} t={[0.16, 0.04, 0.16]} cor="#0c0d10" raio={0.015} />)}
        </group>
      )}
      {/* porta de vidro: gira em torno da borda de baixo; 1 = fechada */}
      {!semPorta && corpo < 0.5 && <group position={[X0, yb, ZF + 0.03]} rotation={[1.5 * (1 - suave(porta)), 0, 0]}>
        <mesh position={[0, hi / 2, 0]}><planeGeometry args={[2 * wi, hi]} /><meshStandardMaterial color="#cfe6f2" transparent opacity={0.2} roughness={0.1} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        {[[0, hi, 2 * wi, 0.06], [0, 0.03, 2 * wi, 0.06]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 0]}><boxGeometry args={[w, h, 0.04]} /><meshStandardMaterial color={fora} roughness={0.4} /></mesh>)}
        {[-1, 1].map((s) => <mesh key={s} position={[s * wi, hi / 2, 0]}><boxGeometry args={[0.06, hi, 0.04]} /><meshStandardMaterial color={fora} roughness={0.4} /></mesh>)}
        <Caixa p={[0, hi - 0.1, 0.07]} t={[Math.min(wi * 1.2, 1.1), 0.045, 0.045]} cor="#e5e8ec" raio={0.02} met={0.8} rug={0.25} />
      </group>}
      {/* luz do forno */}
      {luz > 0.02 && (
        <group>
          <mesh position={[X0 - wi + 0.18, yt - 0.1, ZB + 0.2]}><sphereGeometry args={[0.06, 10, 8]} /><meshStandardMaterial color="#fff3c4" emissive="#ffe08a" emissiveIntensity={2.2 * luz} /></mesh>
          <Halo p={[X0 - wi + 0.18, yt - 0.1, ZB + 0.25]} r={0.5} cor="#ffe9a8" op={0.55 * luz} />
          <pointLight position={[X0, (yb + yt) / 2 + 0.2, -0.3]} intensity={5 * luz} distance={3 * esc * 2} decay={1.6} color="#ffe2a8" />
        </group>
      )}
      {/* painel de controle na frente do teto: tela do temporizador, botões e o botão do termostato */}
      {painel > 0.02 && (
        <group position={[X0, topoY, frenteZ + 0.015]} scale={painel}>
          <Caixa p={[0, 0, 0]} t={[Math.min(2 * wi + 2 * th - 0.1, 1.35), 0.14 + 0.16 * corpo, 0.03]} cor="#0d0e11" raio={0.025} rug={0.35} verniz={0.4} />
          <mesh position={[0.06, 0.0, 0.02]}><planeGeometry args={[0.5, 0.2 * (0.8 + 0.2 * corpo)]} /><meshBasicMaterial map={tex} /></mesh>
          <mesh position={[-Math.min(wi + 0.1, 0.55) + 0.12, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.04, 18]} /><Mat cor="#ff7a2e" met={0.3} rug={0.4} /></mesh>
          <mesh position={[-Math.min(wi + 0.1, 0.55) + 0.12, 0.048, 0.052]}><boxGeometry args={[0.014, 0.05, 0.01]} /><meshBasicMaterial color="#0d0e11" /></mesh>
          {[0.4, 0.55].map((x, i) => <mesh key={i} position={[Math.min(x, wi + th - 0.12), 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 0.03, 14]} /><Mat cor={i ? "#4a4f58" : "#6e747e"} /></mesh>)}
        </group>
      )}
      {sino > 0.02 && <Sino p={[X0 + wi * 0.55, topoY + lajeH / 2 + 0.2, -0.2]} t={t} k={sino} />}
    </group>
  );
};

/** Sino dourado que balança e solta ondas quando toca. */
export const Sino: React.FC<{ p: V; t: number; k: number }> = ({ p, t, k }) => {
  const bal = Math.sin(t * 22) * 0.45 * k;
  return (
    <group position={p}>
      <group position={[0, 0.2, 0]} rotation={[0, 0, bal]}>
        <group position={[0, -0.2, 0]}>
          <mesh position={[0, 0.07, 0]}><sphereGeometry args={[0.16, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} /><meshStandardMaterial color="#f2c230" metalness={0.8} roughness={0.28} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, -0.075, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.145, 0.018, 8, 22]} /><meshStandardMaterial color="#f2c230" metalness={0.8} roughness={0.28} /></mesh>
          <mesh position={[0, 0.25, 0]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color="#f2c230" metalness={0.8} roughness={0.28} /></mesh>
          <mesh position={[Math.sin(t * 22 + 1.6) * 0.04, -0.11, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#8a6a10" metalness={0.6} roughness={0.4} /></mesh>
        </group>
      </group>
      {[0, 1].map((i) => {
        const u = (t * 2.4 + i * 0.5) % 1;
        return <mesh key={i} position={[0, 0, 0.02]} rotation={[0, 0, 0]} scale={0.6 + u * 1.2}><torusGeometry args={[0.28, 0.012, 6, 28]} /><meshBasicMaterial color="#ffd23f" transparent opacity={(1 - u) * 0.8 * k} depthWrite={false} /></mesh>;
      })}
    </group>
  );
};

/* ---------- assadeira, cesto, gaveta ---------- */

export const Assadeira: React.FC<{ g: Geo; k: number }> = ({ g, k }) => {
  // k: 0 = fora, 1 = dentro (entrando na batida 6), `sai` = saindo na troca pelo cesto (campo cesto)
  const w = g.wi - 0.1;
  return (
    <group position={[0, 0, sai(k)]}>
      <Caixa p={[X0, g.yb + 0.035, -0.4]} t={[2 * w, 0.03, 1.0]} cor="#aeb4bb" raio={0.012} met={0.6} rug={0.3} />
      {[-1, 1].map((s) => <Caixa key={s} p={[X0 + s * w, g.yb + 0.07, -0.4]} t={[0.03, 0.06, 1.0]} cor="#aeb4bb" raio={0.012} met={0.6} rug={0.3} />)}
      <Caixa p={[X0, g.yb + 0.07, -0.9]} t={[2 * w, 0.06, 0.03]} cor="#aeb4bb" raio={0.012} met={0.6} rug={0.3} />
      <Caixa p={[X0, g.yb + 0.07, 0.1]} t={[2 * w, 0.06, 0.03]} cor="#aeb4bb" raio={0.012} met={0.6} rug={0.3} />
    </group>
  );
};

/** Cesto furado: fundo de ripas com vãos (os furos), laterais de grade e pezinhos que o erguem do piso. */
export const Cesto: React.FC<{ g: Geo; k: number; zExtra?: number }> = ({ g, k, zExtra = 0 }) => {
  const w = g.wi - 0.09;
  const y0 = g.yb + FUNDO_CESTO;
  const n = Math.max(8, Math.round(w * 2 * 9));
  const passo = (2 * w) / n;
  return (
    <group position={[0, 0, sai(k) + zExtra]}>
      {Array.from({ length: n }).map((_, i) => <Caixa key={i} p={[X0 - w + passo * (i + 0.5), y0, -0.4]} t={[passo * 0.62, 0.03, 1.0]} cor="#565b64" raio={0.008} met={0.55} rug={0.35} sombra={false} />)}
      {[-1, 1].map((s) => (
        <group key={s}>
          {Array.from({ length: 6 }).map((_, i) => <Caixa key={i} p={[X0 + s * w, y0 + 0.17, -0.85 + i * 0.18]} t={[0.03, 0.3, 0.035]} cor="#565b64" raio={0.008} met={0.55} sombra={false} />)}
          <Caixa p={[X0 + s * w, y0 + 0.33, -0.4]} t={[0.045, 0.035, 1.0]} cor="#7b818b" raio={0.012} met={0.7} rug={0.3} />
        </group>
      ))}
      <Caixa p={[X0, y0 + 0.33, -0.9]} t={[2 * w, 0.035, 0.045]} cor="#7b818b" raio={0.012} met={0.7} rug={0.3} />
      <Caixa p={[X0, y0 + 0.33, 0.1]} t={[2 * w, 0.035, 0.045]} cor="#7b818b" raio={0.012} met={0.7} rug={0.3} />
      {Array.from({ length: 7 }).map((_, i) => <Caixa key={i} p={[X0 - w + (2 * w * i) / 6, y0 + 0.17, -0.9]} t={[0.03, 0.3, 0.03]} cor="#565b64" raio={0.008} met={0.55} sombra={false} />)}
      {/* pezinhos */}
      {[[-1, -0.8], [1, -0.8], [-1, 0.0], [1, 0.0]].map(([sx, z], i) => (
        <mesh key={i} position={[X0 + (sx as number) * (w - 0.04), g.yb + FUNDO_CESTO / 2 - 0.0, z as number]}>
          <cylinderGeometry args={[0.028, 0.034, FUNDO_CESTO, 10]} /><Mat cor="#2a2d33" met={0.4} rug={0.5} />
        </mesh>
      ))}
    </group>
  );
};

/** Gaveta: embaixo do cesto (bandeja baixa que recolhe o que pinga) e, com `corpo` 1, a gaveta do aparelho: paredes altas com o cesto apoiado dentro, frente e alça grande. `k` 0 = fora, 1 = dentro. */
export const Gaveta: React.FC<{ g: Geo; k: number; corpo: number; zExtra?: number }> = ({ g, k, corpo, zExtra = 0 }) => {
  const w = g.wi - 0.05;
  const cor = mistura("#8b919a", "#17181c", corpo);
  const h = lerp(0.14, FUNDO_CESTO + 0.4, corpo); // altura das paredes da gaveta
  const frente = lerp(0.17, 0.27, corpo);
  const laranja = mistura("#e5e8ec", "#ff7a2e", corpo);
  const lg = Math.min(w * 1.5, 0.95);
  return (
    <group position={[0, 0, sai(k) + zExtra]}>
      <Caixa p={[X0, g.yb + 0.03, -0.45]} t={[2 * w, 0.03, 1.2]} cor={cor} raio={0.01} met={0.3} rug={0.6} />
      {[-1, 1].map((s) => <Caixa key={s} p={[X0 + s * w, g.yb + 0.015 + h / 2, -0.45]} t={[0.03, h, 1.2]} cor={cor} raio={0.01} met={0.3} rug={0.6} />)}
      <Caixa p={[X0, g.yb + 0.015 + h / 2, -1.03]} t={[2 * w, h, 0.03]} cor={cor} raio={0.01} met={0.3} rug={0.6} />
      <Caixa p={[X0, g.yb + frente / 2, 0.14]} t={[2 * w + 0.03, frente, 0.06]} cor={mistura("#5b616b", "#101114", corpo)} raio={0.02} met={0.3} rug={0.6} />
      {/* alça grande: duas hastes para a frente e uma barra */}
      {[-1, 1].map((s) => <Caixa key={s} p={[X0 + s * lg * 0.42, g.yb + frente * 0.75, 0.26]} t={[0.07, 0.07, 0.26]} cor={laranja} raio={0.03} met={0.2} rug={0.5} />)}
      <Caixa p={[X0, g.yb + frente * 0.75, 0.4]} t={[lg, 0.1, 0.08]} cor={laranja} raio={0.04} met={0.2} rug={0.5} />
    </group>
  );
};

/* ---------- batatas ---------- */

type Item = { u: number; v: number; f: number; a: number; b: number; c: number };
const ITENS: Item[] = Array.from({ length: 90 }, (_, i) => ({ u: (rnd(i + 1) - 0.5) * 2, v: (rnd(i + 51) - 0.5) * 2, f: Math.pow(rnd(i + 101), 0.8), a: rnd(i + 151) * 6.28, b: rnd(i + 201) * 6.28, c: rnd(i + 251) * 6.28 }));

export type PilhaProps = {
  g: Geo; base: number; zOff?: number; doura: number; seca?: number; expo?: number; frio?: number; brilho?: number; palitos?: number; altura?: number;
  queda?: number; qtd?: number; fumaca?: number; zExtra?: number;
};

/** O monte de batatas (pedaços ou palitos). `expo` 0 = só o topo recebe o ar (o meio fica cru e frio); 1 = todas iguais. */
export const Pilha: React.FC<PilhaProps> = ({ g, base, zOff = 0, doura, seca = 0, expo = 1, frio = 0, brilho = 0, palitos = 0, altura = 0.32, queda = 1, qtd = 1, zExtra = 0 }) => {
  const esc = React.useContext(EscCtx);
  const larg = g.wi - 0.2;
  const n = Math.round(ITENS.length * qtd);
  return (
    <group>
      {ITENS.slice(0, n).map((it, i) => {
        const mont = (1 - 0.85 * it.u * it.u) * (1 - 0.35 * it.v * it.v);
        const x = X0 + it.u * larg;
        const z = -0.4 + it.v * 0.42 + zOff + zExtra;
        const alt = altura * it.f * mont;
        const k = clamp01((queda * 1.6 - rnd(i + 301) * 0.6) / 0.6);
        const y = base + 0.06 + alt + (1 - suave(k)) * 1.4;
        if (k <= 0) return null;
        const exposicao = Math.pow(it.f * mont, 1.1);
        const d = doura * (expo + (1 - expo) * exposicao);
        const fr = frio * (1 - expo) * (1 - exposicao);
        const cor = corBatata(d, seca, fr);
        const rug = 0.78 - 0.5 * brilho - 0.1 * (1 - seca);
        const pedaco = 1 - clamp01(palitos * 2);
        const palito = clamp01(palitos * 2 - 1);
        return (
          <group key={i} position={[x, y, z]} rotation={[it.a * 0.06, it.b, it.c * 0.04]}>
            {pedaco > 0.01 && (
              <mesh scale={[1.3 * pedaco, (0.82 - 0.2 * seca) * pedaco, 1 * pedaco]} rotation={[it.a, it.b, it.c]} castShadow>
                <icosahedronGeometry args={[0.1, 0]} />
                <Mat cor={cor} rug={rug} verniz={brilho * 0.9} />
              </mesh>
            )}
            {palito > 0.01 && (
              <mesh scale={[palito, palito, palito]} rotation={[0, 0, it.c * 0.05]} castShadow>
                <boxGeometry args={[0.07 / esc, (0.0125 - 0.002 * seca) / esc, 0.0125 / esc]} />
                <Mat cor={cor} rug={rug} verniz={brilho * 0.9} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

/** Um palito de batata sozinho, ampliado (é uma "lente": o desenho do palito é bem maior que o real), com a capa translúcida em volta. */
export const BatataSolo: React.FC<{ p: V; esc: number; doura: number; capa: number; t: number }> = ({ p, esc, doura, capa, t }) => (
  <group position={p}>
    <mesh scale={esc} rotation={[0.25, 0.4, 0.1]} castShadow>
      <boxGeometry args={[0.78, 0.15, 0.15]} />
      <Mat cor={corBatata(doura)} rug={0.7} />
    </mesh>
    {capa > 0.02 && (
      <group>
        <mesh scale={[1.12 * esc * (0.95 + 0.04 * Math.sin(t * 2)), 0.85 * esc, 0.9 * esc]}>
          <sphereGeometry args={[0.52, 24, 16]} /><meshStandardMaterial color="#6ec6ff" transparent opacity={0.26 * capa} roughness={0.15} depthWrite={false} />
        </mesh>
        <mesh scale={[1.12 * esc, 0.85 * esc, 0.9 * esc]}>
          <sphereGeometry args={[0.5, 22, 14]} /><meshBasicMaterial color="#9fdcff" transparent opacity={0.16 * capa} wireframe depthWrite={false} />
        </mesh>
      </group>
    )}
  </group>
);

/** Setas de calor em volta da batata solo: batem na capa e voltam; com a capa desfeita, entram na batata. */
export const SetasBatata: React.FC<{ p: V; esc: number; capa: number; t: number; giro: number; n?: number }> = ({ p, esc, capa, t, giro, n = 10 }) => {
  const rFora = 1.0 * esc + 0.15;
  const rCapa = 0.58 * esc;
  const rBat = 0.27 * esc;
  return (
    <group position={p}>
      {Array.from({ length: n }).map((_, i) => {
        const ang = (i / n) * Math.PI * 2 + giro * t * 0.9 + 0.2;
        const u = (t * 0.55 + i / n * 2.3) % 1;
        const fim = lerp(rBat + 0.03, rCapa, clamp01(capa * 1.6));
        const ida = u < 0.5;
        const kk = ida ? u / 0.5 : (u - 0.5) / 0.5;
        const r = ida ? lerp(rFora, fim, suave(kk)) : (capa > 0.4 ? lerp(fim, rFora, suave(kk)) : fim);
        const dirx = Math.cos(ang);
        const diry = Math.sin(ang) * 0.9;
        const tam = 0.2;
        const dentro = ida || capa <= 0.4;
        const a: V = [dirx * (r + tam), diry * (r + tam), 0.08 * Math.sin(i)];
        const b: V = [dirx * r, diry * r, 0.08 * Math.sin(i)];
        const op = (ida ? 1 : capa > 0.4 ? 1 - kk : 0) * 0.95;
        if (op < 0.04) return null;
        // a ida aponta para a batata, a volta aponta para fora
        return dentro ? <Seta key={i} a={a} b={b} cor="#ff8a2a" w={0.07} op={op} /> : <Seta key={i} a={b} b={a} cor="#ffb26b" w={0.06} op={op} />;
      })}
    </group>
  );
};

/* ---------- resistência, ventilador, termostato ---------- */

export const Resistencia: React.FC<{ g: Geo; y: number; res: number }> = ({ g, y, res }) => {
  const esc = React.useContext(EscCtx);
  const x0 = X0 - g.wi + 0.22;
  const x1 = X0 + g.wi - 0.22;
  const cor = mistura("#4a4440", "#ff4a1a", clamp01(res * 1.5));
  const emi = mistura("#000000", "#ff5a14", res);
  const zs = [-0.85, -0.55, -0.25];
  return (
    <group>
      {zs.map((z, i) => <Liga key={i} a={[x0, y, z]} b={[x1, y, z]} w={0.055} cil cor={cor} emi={emi} brilho={res * 2.2} />)}
      {[0, 1].map((i) => <Liga key={i} a={[i ? x1 : x0, y, zs[0]]} b={[i ? x1 : x0, y, zs[2]]} w={0.055} cil cor={cor} emi={emi} brilho={res * 2.2} />)}
      {[x0, x1].map((x, i) => <Liga key={i} a={[x, y, zs[0]]} b={[x, g.yt, zs[0]]} w={0.04} cil cor="#7b818b" />)}
      <Halo p={[(x0 + x1) / 2, y - 0.03, -0.3]} r={0.5 * (g.wi + 0.3)} cor="#ff7a2a" op={0.3 * res} />
      {res > 0.05 && <pointLight position={[X0, y - 0.2, -0.3]} intensity={3 * res} distance={2.2 * esc * 2} decay={1.8} color="#ff8a4a" />}
    </group>
  );
};

/** Ventilador no alto do fundo, inclinado para a câmera, soprando para baixo. */
export const Ventilador: React.FC<{ g: Geo; giro: number; vel: number; k?: number }> = ({ g, giro, vel, k = 1 }) => {
  if (k <= 0.01) return null;
  const r = Math.min(0.26, g.hi * 0.2);
  const y = g.yt - r - 0.06;
  const ang = giro * vel * 14;
  return (
    <group position={[X0, y, ZB + 0.18 + (1 - suave(k)) * -0.4]} rotation={[Math.PI / 2 + 0.55, 0, 0]} scale={suave(k)}>
      <mesh><cylinderGeometry args={[r * 1.12, r * 1.12, 0.05, 24]} /><Mat cor="#3b3f47" met={0.5} rug={0.4} /></mesh>
      <mesh position={[0, 0.04, 0]}><torusGeometry args={[r * 1.1, 0.014, 8, 26]} />{<Mat cor="#8a909a" met={0.7} rug={0.3} />}</mesh>
      <group position={[0, 0.045, 0]} rotation={[0, ang, 0]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <group key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
            <mesh position={[r * 0.55, 0, 0]} rotation={[0, 0, 0.35]}><boxGeometry args={[r * 0.8, 0.012, r * 0.42]} /><Mat cor="#c9ced6" met={0.5} rug={0.35} /></mesh>
          </group>
        ))}
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[r * 0.18, r * 0.18, 0.05, 14]} /><Mat cor="#ff7a2e" met={0.3} rug={0.4} /></mesh>
      </group>
    </group>
  );
};

export const LINHA_TEMP = 0.72;

/** Termômetro 3D fora do forno, à esquerda: tubo de vidro, bulbo, líquido e a linha pontilhada que atravessa o forno. */
export const Termo3D: React.FC<{ g: Geo; temp: number; linha: number; t: number }> = ({ g, temp, linha, t }) => {
  const x = X0 - g.wi - g.th - 0.36;
  const y0 = g.yb + 0.15;
  const y1 = g.yt + 0.05;
  const alt = (v: number) => y0 + (clamp01(v / 1.2)) * (y1 - y0);
  const acima = temp > LINHA_TEMP;
  const cor = acima ? "#ff2a14" : "#ff7a2e";
  const yL = alt(LINHA_TEMP);
  const nTr = 22;
  const xFim = X0 + g.wi;
  return (
    <group>
      <mesh position={[x, (y0 + y1) / 2, 0.1]}><cylinderGeometry args={[0.05, 0.05, y1 - y0, 14]} /><meshStandardMaterial color="#f4f1ea" transparent opacity={0.55} roughness={0.1} /></mesh>
      <mesh position={[x, y0 - 0.04, 0.1]}><sphereGeometry args={[0.11, 16, 12]} /><meshStandardMaterial color="#f4f1ea" transparent opacity={0.6} roughness={0.1} /></mesh>
      <mesh position={[x, y0 - 0.04, 0.1]}><sphereGeometry args={[0.08, 14, 10]} /><meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={0.5} /></mesh>
      <mesh position={[x, (y0 + alt(temp)) / 2, 0.1]}><cylinderGeometry args={[0.028, 0.028, Math.max(alt(temp) - y0, 0.01), 12]} /><meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={0.55} /></mesh>
      {[0, 0.3, 0.6, 0.9, 1.2].map((v) => <mesh key={v} position={[x + 0.08, alt(v), 0.1]}><boxGeometry args={[0.05, 0.008, 0.008]} /><meshBasicMaterial color="#1b2230" /></mesh>)}
      {linha > 0.02 && (
        <group>
          {Array.from({ length: nTr }).map((_, i) => {
            const xa = x + 0.1 + ((xFim - x - 0.1) * i) / nTr;
            const e = clamp01(linha * 1.6 - (i / nTr) * 0.6);
            return e > 0 ? <mesh key={i} position={[xa + 0.05, yL, 0.13]}><boxGeometry args={[0.07 * e, 0.018, 0.012]} /><meshBasicMaterial color="#ffd23f" /></mesh> : null;
          })}
        </group>
      )}
    </group>
  );
};

/** Sensor do termostato: haste fina presa ao teto, com bulbo azul, perto do cesto. */
export const Sensor: React.FC<{ g: Geo; yBase: number; k: number; t: number }> = ({ g, yBase, k, t }) => {
  if (k <= 0.02) return null;
  const x = X0 + g.wi - 0.34;
  const yB = Math.max(yBase, g.yb + 0.3);
  return (
    <group scale={k}>
      <Liga a={[x, g.yt, 0.0]} b={[x, yB, 0.0]} w={0.03} cil cor="#8a909a" />
      <mesh position={[x, yB - 0.03, 0.0]}><sphereGeometry args={[0.065, 12, 10]} /><meshStandardMaterial color="#3ea6ff" emissive="#3ea6ff" emissiveIntensity={0.6 + 0.3 * Math.sin(t * 6)} /></mesh>
      <Halo p={[x, yB - 0.03, 0.05]} r={0.22} cor="#7fc4ff" op={0.5} />
    </group>
  );
};

/* ---------- corte da batata (degradê de calor) ---------- */

const FRAG = `
varying vec2 vP;
uniform float uPen;
uniform float uForma;
uniform float uAlfa;
void main(){
  float d = uForma < 0.5 ? 1.0 - length(vP) : 1.0 - max(abs(vP.x), abs(vP.y));
  if (d < 0.0) discard;
  float heat = 1.0 - smoothstep(0.0, max(uPen, 0.001), d);
  vec3 frio = mix(vec3(0.96,0.93,0.72), vec3(0.80,0.90,0.97), 0.55 * (1.0 - heat));
  vec3 quente = vec3(1.0,0.47,0.12);
  vec3 meio = vec3(1.0,0.76,0.30);
  vec3 c = mix(frio, meio, smoothstep(0.0, 0.55, heat));
  c = mix(c, quente, smoothstep(0.55, 1.0, heat));
  float casca = 1.0 - smoothstep(0.035, 0.075, d);
  c = mix(c, vec3(0.50,0.30,0.14), casca);
  gl_FragColor = vec4(c, uAlfa);
}`;
const VERT = `varying vec2 vP; void main(){ vP = position.xy * 2.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

/** Corte da batata visto de frente: o calor entra pela casca (laranja) e `pen` diz até onde chega (relativo à meia largura). */
export const Fatia: React.FC<{ p: V; tam: number; pen: number; forma: "c" | "q"; k: number; alfa?: number }> = ({ p, tam, pen, forma, k, alfa = 1 }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uPen: { value: 0.1 }, uForma: { value: 0 }, uAlfa: { value: 1 } }, side: THREE.DoubleSide, transparent: true }), []);
  mat.uniforms.uPen.value = pen;
  mat.uniforms.uForma.value = forma === "c" ? 0 : 1;
  mat.uniforms.uAlfa.value = alfa;
  if (k <= 0.02) return null;
  const e = 1 - (1 - clamp01(k)) ** 3;
  return (
    <group position={p} scale={e}>
      <mesh position={[0, 0, -0.02]}>{forma === "c" ? <circleGeometry args={[tam * 0.54, 32]} /> : <planeGeometry args={[tam * 1.08, tam * 1.08]} />}<meshBasicMaterial color="#fff8e8" transparent opacity={alfa} /></mesh>
      <mesh scale={[tam / 1, tam / 1, 1]} material={mat}><planeGeometry args={[1, 1]} /></mesh>
      <mesh position={[0, 0, 0.01]}>{forma === "c" ? <ringGeometry args={[tam * 0.5, tam * 0.54, 40]} /> : <ringGeometry args={[tam * 0.5, tam * 0.54, 4, 1, Math.PI / 4]} />}<meshBasicMaterial color="#fff8e8" side={THREE.DoubleSide} transparent opacity={alfa} /></mesh>
    </group>
  );
};

/* ---------- óleo ---------- */

/** Garrafa de óleo e o fio fino caindo nas batatas. */
export const Garrafa: React.FC<{ p: V; k: number; fio: number; t: number; alvoY: number }> = ({ p, k, fio, t, alvoY }) => {
  if (k <= 0.02) return null;
  const incl = -0.8 * suave(k);
  return (
    <group position={p}>
      <group rotation={[0, 0, incl]} scale={k}>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.1, 0.12, 0.4, 16]} /><Mat cor="#f2c230" verniz={0.9} rug={0.2} op={0.92} /></mesh>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.04, 0.1, 0.18, 14]} /><Mat cor="#f2c230" verniz={0.9} rug={0.2} /></mesh>
        <mesh position={[0, 0.62, 0]}><cylinderGeometry args={[0.04, 0.04, 0.06, 12]} /><Mat cor="#3a8a4c" /></mesh>
      </group>
      {fio > 0.02 && (() => {
        // bico da garrafa (a garrafa inclina para a direita) e o fio vertical até as batatas
        const e = suave(k);
        const nx = 0.64 * Math.sin(0.8 * e);
        const ny = 0.64 * Math.cos(0.8 * e);
        const fim = lerp(ny, alvoY - p[1], clamp01(fio * 1.6));
        return (
          <group>
            {[0, 1, 2].map((i) => {
              const a = lerp(ny, fim, i / 3);
              const b = lerp(ny, fim, (i + 1) / 3);
              return <Liga key={i} a={[nx + Math.sin(t * 6 + i * 2) * 0.006, a, 0]} b={[nx + Math.sin(t * 6 + i * 2 + 2) * 0.006, b, 0]} w={0.02} cil cor="#f5b21f" emi="#a35a00" brilho={0.3} />;
            })}
            {fio > 0.5 && <mesh position={[nx, alvoY - p[1] + 0.01, 0]} scale={[1.6, 0.4, 1.6]}><sphereGeometry args={[0.05, 10, 8]} /><meshStandardMaterial color="#f5b21f" roughness={0.1} emissive="#a35a00" emissiveIntensity={0.3} /></mesh>}
          </group>
        );
      })()}
    </group>
  );
};

/** Gotas pingando do cesto: caem até `y1` (a gaveta ou o fundo do forno). */
export const Gotas: React.FC<{ g: Geo; k: number; t: number; y0: number; y1: number }> = ({ g, k, t, y0, y1 }) => {
  if (k <= 0.02) return null;
  const w = g.wi - 0.3;
  return (
    <group>
      {Array.from({ length: 16 }).map((_, i) => {
        const cx = X0 - w + (2 * w * (i % 8)) / 7;
        const u = (t * (0.9 + rnd(i) * 0.5) + rnd(i + 30)) % 1;
        const y = lerp(y0, y1, u * u);
        const z = -0.7 + rnd(i + 9) * 0.7;
        if (i / 16 > k) return null;
        return <mesh key={i} position={[cx, y, z]} scale={[0.7, 1.5, 0.7]}><sphereGeometry args={[0.024, 8, 6]} /><meshStandardMaterial color="#f3a81f" roughness={0.1} emissive="#a35a00" emissiveIntensity={0.3} /></mesh>;
      })}
    </group>
  );
};

/** Mancha de óleo no fundo do forno, que cresce. */
export const ManchaChao: React.FC<{ g: Geo; k: number }> = ({ g, k }) => {
  if (k <= 0.02) return null;
  return (
    <group position={[X0, g.yb + 0.012, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh scale={[k * (g.wi - 0.15) * 1.8, k * 0.5, 1]}><circleGeometry args={[0.5, 24]} /><meshBasicMaterial color="#2a1a08" transparent opacity={0.8} /></mesh>
      <mesh scale={[k * (g.wi - 0.15) * 1.3, k * 0.34, 1]}><circleGeometry args={[0.5, 24]} /><meshBasicMaterial color="#0f0803" transparent opacity={0.75} /></mesh>
    </group>
  );
};

/* ---------- papel manteiga e chama ---------- */

const CLARO = new THREE.Color("#f4ecd9");
const CARVAO = new THREE.Color("#241a12");
const BRASA = new THREE.Color("#c4561a");

type PapelProps = { x: number; z: number; y0: number; yRes: number; lift: number; fogo: number; t: number; vis: number; larg: number; ent?: number };

const papelGeo = (x: number, z: number, y0: number, yRes: number, lift: number, fogo: number, t: number, larg: number, ent: number) => {
  const NU = 16;
  const NV = 8;
  const pos: number[] = [];
  const cor: number[] = [];
  const idx: number[] = [];
  const hx = larg * 0.5;
  const hz = 0.4;
  const H = Math.max(yRes - y0 - 0.035, 0.05);
  const L = suave(lift);
  const vem = 1 - suave(ent); // a folha chega de cima e do lado, balançando, e pousa na gaveta
  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      const u = (i / NU) * 2 - 1;
      const v = (j / NV) * 2 - 1;
      // o ar sobe pelos furos: o meio sobe mais e a borda esquerda sobe primeiro e dobra por cima
      const sino = Math.pow(Math.max(1 - u * u, 0), 0.8) * (1 - 0.45 * v * v);
      const borda = Math.max(0, -u - 0.4) / 0.6;
      let h = H * L * (0.1 + 0.9 * sino) + 0.05 * L * (1 - L) * Math.sin(t * 9 + u * 4 + v * 2) * 4;
      h += 0.22 * L * borda * borda; // a ponta esquerda dobra para cima
      const fold = 1 - 0.28 * L * (0.4 + 0.6 * (1 - Math.abs(u)));
      pos.push(x + u * hx * fold + borda * borda * 0.12 * L - vem * (1.5 + 0.2 * u), y0 + 0.012 + h + vem * (0.9 + 0.25 * Math.sin(u * 2.4 + t * 6)), z + v * hz * (1 - 0.12 * L) + vem * 0.2);
      const d = Math.hypot(u * 1.0, v * 0.8);
      const ch = clamp01(fogo * 1.7 - d * 1.15);
      const c = CLARO.clone().lerp(BRASA, clamp01(ch * 2.2)).lerp(CARVAO, clamp01(ch * 1.6 - 0.5));
      cor.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i;
      idx.push(a, a + 1, a + NU + 1, a + 1, a + NU + 2, a + NU + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
};

/** Folha de papel manteiga solta: física simples (deitada na gaveta, o ar a levanta, dobra a ponta, encosta na resistência e queima). */
export const Papel: React.FC<PapelProps> = ({ x, z, y0, yRes, lift, fogo, t, vis, larg, ent = 1 }) => {
  const q = Math.round(lift * 90) / 90;
  const e = Math.round(ent * 60) / 60;
  const geo = useMemo(() => papelGeo(x, z, y0, yRes, q, fogo, t, larg, e), [x, z, y0, yRes, q, Math.round(fogo * 60), Math.round(t * 30), larg, e]);
  if (vis <= 0.02) return null;
  return (
    <group>
      <mesh geometry={geo} castShadow scale={[1, 1, 1]}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.85} transparent={vis < 1} opacity={vis} />
      </mesh>
    </group>
  );
};

/** Chama estilizada: três línguas laranja com um miolo amarelo, que tremem. */
export const Chama: React.FC<{ p: V; k: number; t: number; esc?: number }> = ({ p, k, t, esc = 1 }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p} scale={esc * k}>
      {[[-0.1, 0.9, 0], [0.0, 1.25, 1.7], [0.11, 0.8, 3.1], [-0.04, 0.6, 4.4]].map(([x, h, ph], i) => {
        const f = 0.82 + 0.28 * Math.sin(t * 15 + (ph as number));
        return (
          <group key={i} position={[x as number, 0, (i - 1.5) * 0.04]}>
            <mesh position={[0, 0.16 * (h as number) * f, 0]} scale={[1, (h as number) * f, 1]}><coneGeometry args={[0.1, 0.34, 8]} /><meshBasicMaterial color="#ff6a1a" /></mesh>
            <mesh position={[0, 0.09 * (h as number) * f, 0.02]} scale={[0.6, (h as number) * f * 0.6, 0.6]}><coneGeometry args={[0.1, 0.34, 8]} /><meshBasicMaterial color="#ffd23f" /></mesh>
          </group>
        );
      })}
      <Halo p={[0, 0.2, 0.1]} r={0.55} cor="#ff8a2a" op={0.6} />
      <pointLight position={[0, 0.2, 0.3]} intensity={5} distance={2.5} decay={1.8} color="#ff9a4a" />
    </group>
  );
};

/* ---------- ícones ✓ e ✗ em 3D (não dependem da fonte) ---------- */

export const Marca: React.FC<{ p: V; ok: boolean; k: number; esc?: number }> = ({ p, ok, k, esc = 1 }) => {
  if (k <= 0.02) return null;
  const cor = ok ? "#3ed36f" : "#ff3a3a";
  const e = 1 - (1 - clamp01(k)) ** 3;
  return (
    <group position={p} scale={esc * e}>
      {ok ? (
        <group>
          <Liga a={[-0.16, 0.0, 0]} b={[-0.05, -0.12, 0]} w={0.07} e={0.05} cor={cor} basico />
          <Liga a={[-0.05, -0.12, 0]} b={[0.2, 0.16, 0]} w={0.07} e={0.05} cor={cor} basico />
        </group>
      ) : (
        <group>
          <Liga a={[-0.17, 0.17, 0]} b={[0.17, -0.17, 0]} w={0.07} e={0.05} cor={cor} basico />
          <Liga a={[-0.17, -0.17, 0]} b={[0.17, 0.17, 0]} w={0.07} e={0.05} cor={cor} basico />
        </group>
      )}
    </group>
  );
};

/* ---------- micro-ondas (mundo, escala real: ~50 cm) ---------- */

export const MicroOndas: React.FC<{ k: number; t: number }> = ({ k }) => {
  if (k <= 0.02) return null;
  const e = 1 - (1 - clamp01(k)) ** 3;
  return (
    <group position={[XM, CY, -0.18]} scale={[e, e, e]}>
      <Caixa p={[0, 0.15, 0]} t={[0.5, 0.3, 0.38]} cor="#e8e5de" raio={0.02} rug={0.4} />
      <Caixa p={[-0.06, 0.15, 0.195]} t={[0.33, 0.22, 0.012]} cor="#1c1f25" raio={0.01} rug={0.15} verniz={0.9} />
      <Caixa p={[0.19, 0.15, 0.195]} t={[0.1, 0.24, 0.012]} cor="#cfd3d8" raio={0.01} rug={0.4} />
      <mesh position={[0.19, 0.21, 0.205]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.012, 16]} /><Mat cor="#3b3f47" /></mesh>
      <mesh position={[0.19, 0.1, 0.203]}><planeGeometry args={[0.07, 0.03]} /><meshBasicMaterial color="#6fe0a0" /></mesh>
      <mesh position={[-0.06, 0.06, 0.2]}><cylinderGeometry args={[0.08, 0.08, 0.008, 20]} /><meshBasicMaterial color="#3a3f48" /></mesh>
    </group>
  );
};

export { Fluxo, Texto3D };
