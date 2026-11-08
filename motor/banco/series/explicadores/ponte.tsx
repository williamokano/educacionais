import React from "react";
import * as THREE from "three";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Anterior, poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Expressao3D, Personagem3D, Pose3D } from "../../../src/v3d/tipos";
import { Etiqueta, Halo, Liga, Seta, Texto3D } from "./cozinha-base";
import { Arvore, Ctx, Dome, EtiqDef, Nuvens, V, mkCtx, mistura, nv } from "./rasc";
import { homemA, homemB, homemC, motoboy, mulher } from "./fieis";
import { zeca } from "./zeca";
import { ArvoreCorte, Estrada, Fundacao, Furgao, Heroi, HW, JuntaAco, Machado, PilarArmado, Solo, Transito } from "./ponte-extra";

// Ponte (episódio 23 v2, "como uma ponte segura um caminhão sem cair?"). Vale em corte visto de lado (a câmera orbita ~30° para dar profundidade). Margens em |x| > `meia`;
// topo das margens em y = 0; rio em y = -2,6; leito em -4,2. O vão cresce (`meia`) quando a fala pede. Estruturas têm dois planos (z = ±0,5) ligados por travessas.
// REGRA: o nome "ponte" só aparece a partir da batida 15.
// Campos (número, { de, para, ini, fim } ou chaves [[progresso, valor], ...]):
//   vale    meia (m, metade do vão; padrão 2,6) · rio (y da água; padrão -2,6) · barro 0..1 (água barrenta) · noite 0..1 · entardecer 0..1 · ondas 0..1
//   tronco  tronco 0..1 · rola (rad, giro do tronco) · splash 0..1 (respingo no rio, em x = splashX)
//   tábua   tabua 0..1 · grossa (espessura em m; padrão 0,12) · sag (m, flecha no meio) · cx (x do furgão) · furgao 0..1 · peso 0..1 (setas de peso) · caro 0..1 ($$$)
//   treliça trelica 0..1 (barras entram) · esforco 0..1 (vermelho = empurra, azul = puxa) · mini 0..1 (quadrado e triângulo) · chacoalha 0..1
//   pilar   pilar 0..1 (sobe) · cheia 0..1 (rio enche, barro, areia sai) · tomba 0..1 (pilar e estrutura caem)
//   arco    arco 0..1 (pedras entram) · compressao 0..1 · empurra 0..1 (setas para os lados) · abre 0..1 · blocos 0..1
//   cabos   torres 0..1 · cabos 0..1 (cabos principais e pendurais) · ancora 0..1 (âncoras e cabos de trás) · puxa 0..1 (setas de tração) · leque 0..1 (cabos retos das torres)
//   vento   ventoV 0..1 (linhas de vento) · torce 0..1 (a pista torce) · desaba 0..1 (a pista cai) · vazado 0..1 (pista vazada e lisa) · pista 0..1 (só a pista, sem gente)
//   gente   povo 0..1 (passarela cheia) · balanco (m, balanço lateral) · amort 0..1 (amortecedores) · copo 0..1
//   junta   junta 0..1 (close: dois pedaços de aço com dentes) · calor -1..1 (azul de noite, rosa ao sol)
//   fim     entrega 0..1 (entregador atravessa) · relogio 0..1 (relógio enorme ao fundo) · interroga 0..1
//   gente: lista de { x, y, z, rot, acao, exp, pose, incl, esc, quem: "zeca" | "entregador" } · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax · treme 0..1 (câmera... o vale todo treme)

const YR0 = -2.6;
const YB = -4.2;
const DK = 0; // topo da pista/tábua

/* ---------- pessoas ---------- */

type GenteE = { x?: unknown; y?: unknown; z?: unknown; rot?: unknown; acao?: string | [number, string, string?][]; exp?: Expressao3D; ant?: Anterior; entradaDur?: number; pose?: Pose3D | [number, Pose3D][]; incl?: unknown; esc?: number; quem?: string; item?: string; itemIni?: number; itemFim?: number };
const QUEM: Record<string, Personagem3D> = { zeca, entregador: motoboy, a: homemA, b: homemB, c: homemC, m: mulher };

const Pessoa: React.FC<{ g: GenteE; C: Ctx }> = ({ g, C }) => {
  const p = C.p;
  const tAbs = C.tEp;
  const { acao, exp, pose } = poseGente(g, { p, t: C.t, tAbs, abs: true, incl: nv(g.incl, p, 0) });
  const { x, y, z, rot } = posicaoGente(g, C.t, { x: nv(g.x, p, 0), y: nv(g.y, p, 0), z: nv(g.z, p, 0), rot: nv(g.rot, p, 0) });
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={g.esc ?? 1.06}>
      <Boneco3D p={QUEM[g.quem ?? "zeca"] ?? zeca} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} t={tAbs} />
      {g.item && p >= (g.itemIni ?? 0) && p <= (g.itemFim ?? 2) && (() => {
        const a = pose["ombroD.x"] ?? 0;
        const b = pose["cotoveloD.x"] ?? 0;
        const hy = 0.635 + (pose["quadril.y"] ?? 0) + 0.455 - 0.27 * Math.cos(a) - 0.28 * Math.cos(a + b);
        const hz = -0.27 * Math.sin(a) - 0.28 * Math.sin(a + b);
        return g.item === "machado"
          ? <group position={[0, hy, hz]} rotation={[a + b, 0, 0]}><Machado /></group>
          : <group position={[0, hy + 0.05, hz + 0.02]}><Pizza s={1} /></group>;
      })()}
    </group>
  );
};

/* ---------- peças pequenas ---------- */

/** Barra entre dois pontos com profundidade `e` (uma tábua inclinada, uma viga). */
const Viga: React.FC<{ a: V; b: V; h?: number; e?: number; cor: string; op?: number }> = ({ a, b, h = 0.12, e = 1.2, cor, op }) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 1e-4) return null;
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} rotation={[0, 0, Math.atan2(b[1] - a[1], b[0] - a[0])]} castShadow>
      <boxGeometry args={[len + 0.02, h, e]} />
      <meshStandardMaterial color={cor} roughness={0.85} transparent={op !== undefined && op < 1} opacity={op ?? 1} />
    </mesh>
  );
};

const Moto: React.FC = () => (
  <group>
    {[-0.5, 0.5].map((x) => <mesh key={x} position={[x, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.28, 0.06, 8, 18]} /><meshStandardMaterial color="#222" /></mesh>)}
    <Caixa p={[0, 0.55, 0]} t={[0.9, 0.22, 0.28]} cor="#d6392e" raio={0.05} />
    <Caixa p={[-0.1, 0.78, 0]} t={[0.45, 0.14, 0.26]} cor="#25282c" raio={0.04} />
    <Liga a={[0.45, 0.4, 0]} b={[0.4, 0.85, 0]} w={0.05} cil cor="#8d949a" />
    <Caixa p={[-0.75, 0.75, 0]} t={[0.5, 0.45, 0.5]} cor="#f4b73a" raio={0.04} />
  </group>
);

const Pizza: React.FC<{ p?: V; s?: number }> = ({ p = [0, 0, 0], s = 1 }) => (
  <group position={p} scale={s}>
    <Caixa p={[0, 0, 0]} t={[0.5, 0.07, 0.5]} cor="#e8dcc0" raio={0.01} sombra={false} />
    <Caixa p={[0, 0.05, 0]} t={[0.42, 0.03, 0.42]} cor="#e5473a" raio={0.01} sombra={false} />
  </group>
);

/* ---------- cenário do vale ---------- */

const Vale: React.FC<{ C: Ctx; meia: number; rio: number; barro: number; solo?: boolean }> = ({ C, meia, rio, barro, solo }) => {
  const { n, tEp } = C;
  const noite = n("noite", 0);
  const ent = n("entardecer", 0);
  const ondas = n("ondas", 1);
  const topo = mistura(mistura("#3f86d8", "#364a8c", ent), "#101a3a", noite);
  const meio = mistura(mistura("#9ad0f5", "#f19a62", ent), "#2a3660", noite);
  const base = mistura(mistura("#e6f4fb", "#ffd2a0", ent), "#4a4f78", noite);
  const verde = mistura("#6aa84f", "#2c4a3a", noite);
  const agua = mistura(mistura("#3f86d8", "#8a6a46", barro), "#1f3a68", noite);
  const largura = 2 * meia;
  return (
    <group>
      <hemisphereLight args={["#e8f4ff", "#8a8070", (1.1 - 0.7 * noite) * (1 - 0.25 * ent)]} />
      <directionalLight position={[-4, 10, 9]} intensity={(1.5 - 1.1 * noite)} color={mistura("#fff3dc", "#ffb877", ent)} />
      <Dome topo={topo} meio={meio} base={base} />
      <Nuvens t={tEp} lista={[[-10, 11, -26, 3], [12, 13, -30, 3.2], [-30, 10, -32, 2.6], [24, 9, -28, 2.4]]} cor={mistura(mistura("#ffffff", "#ffd2b8", ent), "#7a80a8", noite)} />
      {/* margens em corte */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Caixa p={[s * (meia + 3.4), -2.4, 0]} t={[6.8, 4.8, 4.6]} cor="#7a5a3a" raio={0.05} rug={1} />
          <Caixa p={[s * (meia + 3.4), 0.05, 0]} t={[6.8, 0.2, 4.6]} cor={verde} raio={0.04} rug={1} />
          {[[3.4, 1.4, 1.0], [5.6, 1.8, 1.4], [4.6, -1.6, 0.9], [2.2, -1.8, 1.1]].map(([dx, z, sc], i) => <Arvore key={i} x={s * (meia + dx)} z={z} s={sc} cor={i % 2 ? "#3a7a3c" : "#4a8a3a"} />)}
          {[[2.6, 1.6], [4.2, 0.6], [5.4, -0.6]].map(([dx, z], i) => <group key={i} position={[s * (meia + dx), 0.12, z]}>{[0, 1, 2].map((k) => <mesh key={k} position={[(k - 1) * 0.08, 0.08 + 0.03 * k, 0]}><sphereGeometry args={[0.045, 6, 6]} /><meshStandardMaterial color={["#ff8fb0", "#ffd23f", "#ffffff"][k]} /></mesh>)}</group>)}
        </group>
      ))}
      {/* colinas ao fundo */}
      {[[-14, 1.6, -13, 9, 3.2], [15, 1.8, -13, 10, 3.6], [0, 0.6, -18, 16, 3.0], [-30, 2.2, -16, 11, 4.2], [32, 2.4, -16, 12, 4.4]].map(([x, y, z, sx, sy], i) => <mesh key={i} position={[x, y, z]} scale={[sx, sy, 5]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={mistura(["#5c9a46", "#4f8f3c", "#78ad5a", "#4a8a3a", "#5c9a46"][i], "#1f3a2c", noite)} roughness={1} flatShading /></mesh>)}
      {/* rio, leito e margens do fundo */}
      {!solo && <mesh position={[0, YB - 0.4, 0]}><boxGeometry args={[largura + 0.3, 0.8, 4.8]} /><meshStandardMaterial color="#8a6a46" roughness={1} /></mesh>}
      <mesh position={[0, (rio + YB + 0.03) / 2, 0]}><boxGeometry args={[largura, Math.max(0.05, rio - YB - 0.03), 4.6]} /><meshStandardMaterial color={agua} transparent opacity={solo ? 0.3 : 0.9 - 0.3 * barro} roughness={0.2} depthWrite={false} /></mesh>
      {ondas > 0.02 && Array.from({ length: 14 }).map((_, i) => {
        const x = -meia + ((i * 0.37 + tEp * 0.3 * (1 + 0.2 * (i % 3))) % 1) * largura;
        return <mesh key={i} position={[x, rio + 0.02, -1.8 + (i % 5) * 0.9]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.5 + 0.2 * (i % 3), 0.06, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.4 * ondas * (0.5 + 0.5 * Math.sin(tEp * 3 + i))} /></mesh>;
      })}
      {/* pássaros */}
      {[[-6, 6, -6], [3, 7.5, -9], [8, 5, -7]].map(([x0, y, z], i) => {
        const x = ((x0 + tEp * (1.2 + 0.3 * i) + 16) % 32) - 16;
        const f = Math.sin(tEp * 9 + i * 2);
        return <group key={i} position={[x, y + 0.2 * Math.sin(tEp * 2 + i), z]}>{[-1, 1].map((s) => <mesh key={s} position={[s * 0.2, 0.05 * f, 0]} rotation={[0, 0, s * (0.5 + 0.35 * f)]} scale={[0.34, 0.03, 0.14]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#2b2f36" /></mesh>)}</group>;
      })}
      {noite > 0.4 && <group>{[[-9, 9], [-4, 11], [3, 10], [8, 12], [-12, 12]].map(([x, y], i) => <mesh key={i} position={[x, y, -22]} scale={0.1}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>)}</group>}
    </group>
  );
};

/* ---------- estruturas ---------- */

const flecha = (x: number, meia: number, sag: number) => -sag * Math.max(0, 1 - (x / meia) ** 2);

const Tabua: React.FC<{ meia: number; grossa: number; sag: number; k: number }> = ({ meia, grossa, sag, k }) => {
  if (k < 0.02) return null;
  const N = 18;
  const L = 2 * meia + 0.8;
  return (
    <group>
      {Array.from({ length: N }).map((_, i) => {
        const x0 = -meia - 0.4 + (i * L) / N;
        const x1 = -meia - 0.4 + ((i + 1) * L) / N;
        if ((i + 1) / N > k + 0.001) return null;
        return <Viga key={i} a={[x0, flecha(x0, meia, sag) - grossa / 2, 0]} b={[x1, flecha(x1, meia, sag) - grossa / 2, 0]} h={grossa} e={1.6} cor="#b07a46" />;
      })}
    </group>
  );
};

/** Treliça entre as margens: dois planos, banzo de cima (pista) e de baixo, diagonais em triângulos. */
const Trelica: React.FC<{ meia: number; k: number; esforco: number; chacoalha: number; t: number }> = ({ meia, k, esforco, chacoalha, t }) => {
  if (k < 0.02) return null;
  const NP = 8;
  const H = 0.95;
  const w = (2 * meia + 0.6) / NP;
  const x0 = -meia - 0.3;
  const barras: { a: V; b: V; c: number; q: number }[] = [];
  for (let i = 0; i < NP; i++) {
    const xa = x0 + i * w;
    const xb = xa + w;
    barras.push({ a: [xa, -H, 0], b: [xb, -H, 0], c: -1, q: i * 4 });
    barras.push({ a: [xa, DK - 0.02, 0], b: [xb, DK - 0.02, 0], c: 1, q: i * 4 + 1 });
    if (i % 2 === 0) barras.push({ a: [xa, -H, 0], b: [xb, DK - 0.02, 0], c: 0.5, q: i * 4 + 2 }); else barras.push({ a: [xa, DK - 0.02, 0], b: [xb, -H, 0], c: -0.5, q: i * 4 + 2 });
    barras.push({ a: [xb, -H, 0], b: [xb, DK - 0.02, 0], c: 0, q: i * 4 + 3 });
  }
  barras.push({ a: [x0, -H, 0], b: [x0, DK - 0.02, 0], c: 0, q: 99 });
  const total = barras.length;
  const tr = chacoalha * 0.05 * Math.sin(t * 22);
  return (
    <group position={[0, tr, 0]}>
      {barras.map((br, i) => {
        if (i / total > k) return null;
        const cor = mistura("#c9d3da", br.c > 0 ? "#e5473a" : br.c < 0 ? "#3b82c4" : "#c9d3da", esforco);
        return [-0.5, 0.5].map((z) => <Liga key={`${i}${z}`} a={[br.a[0], br.a[1], z]} b={[br.b[0], br.b[1], z]} w={0.1} cil cor={cor} />);
      })}
      {Array.from({ length: NP + 1 }).map((_, i) => (i / (NP + 1) > k ? null : <Liga key={i} a={[x0 + i * w, DK - 0.02, -0.5]} b={[x0 + i * w, DK - 0.02, 0.5]} w={0.08} cil cor="#aab4bb" />))}
      {k > 0.5 && <Viga a={[x0, DK - 0.06, 0]} b={[x0 + NP * w, DK - 0.06, 0]} h={0.1} e={1.3} cor="#4a4f57" />}
    </group>
  );
};

/** Quadrado de barras que deforma ao lado do triângulo que não deforma. */
const Mini: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  if (k < 0.02) return null;
  const sh = 0.5 * Math.sin(t * 3.2);
  const barra = (a: V, b: V, cor = "#c9d3da") => <Liga a={a} b={b} w={0.07} cil cor={cor} />;
  const q: V[] = [[-2.1, 3.2, 0], [-0.9, 3.2, 0], [-0.9 + sh * 0.5, 4.3, 0], [-2.1 + sh * 0.5, 4.3, 0]];
  const tr: V[] = [[0.9, 3.2, 0], [2.1, 3.2, 0], [1.5, 4.3, 0]];
  return (
    <group scale={suave(k)} position={[0, 0, 1.4]}>
      {[0, 1, 2, 3].map((i) => barra(q[i], q[(i + 1) % 4], "#ffb36a"))}
      {q.map((p, i) => <mesh key={i} position={p} scale={0.09}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#8d949a" /></mesh>)}
      {[0, 1, 2].map((i) => barra(tr[i], tr[(i + 1) % 3], "#9fe8b0"))}
      {tr.map((p, i) => <mesh key={i} position={p} scale={0.09}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#8d949a" /></mesh>)}
      <Seta a={[-1.2, 5.0, 0]} b={[-1.0 + sh * 0.4, 4.45, 0]} cor="#ff6a4a" w={0.06} />
      <Seta a={[1.5, 5.0, 0]} b={[1.5, 4.45, 0]} cor="#ff6a4a" w={0.06} />
    </group>
  );
};

const Pilar: React.FC<{ k: number; cheia: number; tomba: number; raiox: number }> = ({ k, cheia, tomba, raiox }) => {
  if (k < 0.02) return null;
  const ang = 0.55 * suave(tomba);
  return (
    <group>
      {/* areia em volta da base: some quando a correnteza escava */}
      {[-1, 1].map((sg) => <mesh key={sg} position={[sg * 1.25, YB + 0.1, 0]} scale={[0.7 * (1 - 0.85 * cheia), 0.3 * (1 - 0.85 * cheia), 1.5]}><sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color="#d9c18a" roughness={1} /></mesh>)}
      <group position={[0, YB, 0]} rotation={[0, 0, -ang]}><PilarArmado k={k} raiox={raiox} /></group>
    </group>
  );
};

const Arco: React.FC<{ meia: number; k: number; abre: number; blocos: number; comp: number; emp: number; t: number }> = ({ meia, k, abre, blocos, comp, emp, t }) => {
  const N = 11;
  const a = meia * (1 + 0.28 * abre);
  const b = 1.7 * (1 - 0.65 * abre);
  const y0 = -1.9;
  const pos = (th: number): V => [Math.cos(th) * a, y0 + Math.sin(th) * b - abre * 0.8 * Math.sin(th) ** 2, 0];
  const perim = Math.PI * Math.sqrt((a * a + b * b) / 2);
  const pedras = Array.from({ length: N }).map((_, i) => {
    const th = Math.PI - ((i + 0.5) / N) * Math.PI;
    const p = pos(th);
    const q = pos(th - 0.01);
    const r = pos(th + 0.01);
    const ang = Math.atan2(q[1] - r[1], q[0] - r[0]);
    return { p, ang, th, i };
  });
  const ord = (i: number) => Math.abs(i - (N - 1) / 2); // as pedras entram das pontas para o meio (a do centro, a cunha, por último)
  return (
    <group>
      {k > 0.02 && (
        <group>
          {pedras.map(({ p, ang, i }) => {
            const e = clamp01(k * (N / 2 + 1) - (N / 2 - ord(i)) );
            if (e <= 0.01) return null;
            return <group key={i} position={[p[0], p[1] + (1 - e) * 2.2, 0]} rotation={[0, 0, ang]}><Caixa p={[0, 0, 0]} t={[perim / N * 0.96, 0.46, 3.0]} cor={i === (N - 1) / 2 ? "#e5a23a" : i % 2 ? "#b9a58a" : "#a8957a"} raio={0.04} rug={0.95} /></group>;
          })}
          {k > 0.95 && abre < 0.2 && Array.from({ length: 9 }).map((_, i) => { const x = -a + 0.4 + (i * (2 * a - 0.8)) / 8; const th = Math.acos(clamp01(Math.abs(x) / a) * Math.sign(x) || 0); const ya = pos(Math.acos(Math.max(-1, Math.min(1, x / a))))[1] + 0.22; void th; return ya < -0.1 ? <Caixa key={i} p={[x, (ya - 0.08) / 2, 0]} t={[0.3, -ya - 0.08, 2.6]} cor="#a8957a" raio={0.02} sombra={false} /> : null; })}
        </group>
      )}
      {comp > 0.02 && pedras.slice(0, -1).map(({ p, ang, i }) => {
        const dx = Math.cos(ang) * 0.34;
        const dy = Math.sin(ang) * 0.34;
        const mx = p[0] + Math.cos(ang) * perim / N * 0.5;
        const my = p[1] + Math.sin(ang) * perim / N * 0.5;
        return <group key={i}><Seta a={[mx - dx * 1.7, my - dy * 1.7, 1.75]} b={[mx - dx * 0.2, my - dy * 0.2, 0.95]} cor="#ff6a4a" w={0.05} op={comp} /><Seta a={[mx + dx * 1.7, my + dy * 1.7, 1.75]} b={[mx + dx * 0.2, my + dy * 0.2, 0.95]} cor="#ff6a4a" w={0.05} op={comp} /></group>;
      })}
      {emp > 0.02 && [-1, 1].map((s) => <Seta key={s} a={[s * (a - 0.6), y0 + 0.2, 1.75]} b={[s * (a + 0.4 + 0.2 * Math.sin(t * 5)), y0 + 0.2, 1.75]} cor="#ffb347" w={0.1} op={emp} />)}
      {blocos > 0.02 && [-1, 1].map((s) => <group key={s} position={[s * (a + 0.9) - s * (1 - suave(blocos)) * 2.5, y0 - 0.3, 0]} scale={[1, suave(blocos) * 0 + 1, 1]}><Caixa p={[0, 0, 0]} t={[1.7, 2.3, 3.2]} cor="#8d8478" raio={0.06} rug={1} /><Caixa p={[0, 1.2, 0]} t={[1.8, 0.14, 3.3]} cor="#6aa84f" raio={0.03} sombra={false} /></group>)}
    </group>
  );
};

const ZC = 2.35; // plano dos cabos e das pernas das torres: fora da laje (a pista passa ENTRE as pernas)
const ALTO = 7.2;
const LIVRE = 5.6; // altura livre sob a travessa (>= 5 m)

const Suspensa: React.FC<{ meia: number; torres: number; cabos: number; ancora: number; puxa: number; leque: number }> = ({ meia, torres, cabos, ancora, puxa, leque }) => {
  const T = meia * 0.45;
  const alto = ALTO;
  const ys = (x: number) => 2.6 + (alto - 2.6 - 0.2) * (x / T) ** 2; // cabo principal entre as torres
  const kt = suave(torres);
  const cabos0 = suave(cabos);
  const nH = Math.max(2, Math.floor((2 * T) / 1.2));
  const xH = (i: number) => -((nH - 1) / 2) * 1.2 + i * 1.2;
  return (
    <group>
      {/* torres em pórtico: duas pernas, travessa alta (gabarito) e travessa de topo; a pista passa entre as pernas */}
      {[-1, 1].map((sg) => (
        <group key={sg} position={[sg * T, YB, 0]}>
          {kt > 0.02 && <Caixa p={[0, 0.3, 0]} t={[1.4, 0.6, 2 * ZC + 1.2]} cor="#8d8478" raio={0.04} rug={1} />}
          {kt > 0.02 && [-ZC, ZC].map((z) => <Caixa key={z} p={[0, 0.6 + (alto - YB - 0.6) * kt / 2, z]} t={[0.6, (alto - YB - 0.6) * kt, 0.5]} cor="#b9bcbc" raio={0.05} rug={0.9} />)}
          {kt > 0.9 && <Caixa p={[0, LIVRE - YB, 0]} t={[0.5, 0.45, 2 * ZC - 0.5]} cor="#a9acad" raio={0.04} />}
          {kt > 0.9 && <Caixa p={[0, alto - YB - 0.15, 0]} t={[0.7, 0.3, 2 * ZC + 0.5]} cor="#9a9d9f" raio={0.04} />}
        </group>
      ))}
      {/* cabos principais e pendurais */}
      {cabos0 > 0.02 && [-ZC, ZC].map((z) => {
        const pts: V[] = [];
        const NN = 20;
        for (let i = 0; i <= NN; i++) { const x = -T + (2 * T * i) / NN; pts.push([x, ys(x), z]); }
        const vis = Math.max(2, Math.round(cabos0 * NN));
        return (
          <group key={z}>
            {pts.slice(0, vis).map((p, i) => i === 0 ? null : <Liga key={i} a={pts[i - 1]} b={p} w={0.07} cil cor="#3a3f46" />)}
            {Array.from({ length: nH }).map((_, i) => (i / nH < cabos0 ? <Liga key={i} a={[xH(i), ys(xH(i)), z]} b={[xH(i), 0.0, z * (HW / ZC)]} w={0.025} cil cor="#9aa3ab" /> : null))}
            {ancora > 0.02 && [-1, 1].map((sg) => <Liga key={sg} a={[sg * T, alto, z]} b={[sg * (meia + 3.4), 0.85, z]} w={0.07} cil cor="#3a3f46" op={ancora} />)}
          </group>
        );
      })}
      {ancora > 0.02 && [-1, 1].map((sg) => [-1, 1].map((z) => <Caixa key={`${sg}${z}`} p={[sg * (meia + 3.4), 0.4, z * 2.65]} t={[1.4, 0.9, 1.0]} cor="#8d8478" raio={0.05} rug={1} />))}
      {puxa > 0.02 && [-1, 1].map((sg) => <Seta key={sg} a={[sg * (T + 0.3), alto - 0.4, ZC + 0.4]} b={[sg * (meia + 0.5), 1.4, ZC + 0.4]} cor="#7fc4ff" w={0.08} op={puxa} />)}
      {/* cabos em leque: das pernas da torre direto até a borda da laje */}
      {leque > 0.02 && [-1, 1].map((sg) => [-1, 1].map((d) => Array.from({ length: 5 }).map((_, k) => {
        const x = sg * T + d * (1.2 + 0.9 * k);
        if (Math.abs(x) > meia + 0.2) return null;
        return [-ZC, ZC].map((z) => <Liga key={`${sg}${d}${k}${z}`} a={[sg * T, 4.4 + 0.5 * k, z]} b={[x, 0.0, z * (HW / ZC)]} w={0.035} cil cor="#d6d2c4" op={leque} basico />);
      })))}
    </group>
  );
};

/** Pista pendurada que torce no vento, desaba, e depois a versão vazada e lisa. */
const PistaVento: React.FC<{ meia: number; torce: number; desaba: number; vazado: number; ventoV: number; t: number }> = ({ meia, torce, desaba, vazado, ventoV, t }) => {
  const N = 22;
  const L = 2 * meia + 0.4;
  return (
    <group>
      {Array.from({ length: N }).map((_, i) => {
        const x = -meia - 0.2 + ((i + 0.5) * L) / N;
        const mid = Math.abs(x) < meia * 0.55;
        const ft = mid ? desaba : 0;
        const rotx = torce * 0.7 * Math.sin(t * 5 + x * 0.9) * (1 - 0.8 * vazado);
        const bob = torce * 0.25 * Math.sin(t * 5 + x * 0.9 + 1.2) * (1 - 0.8 * vazado);
        const caida = ft * ft * 7 + ft * (0.4 + 0.3 * rnd(i));
        if (ft > 0.95) return null;
        const fund = vazado > 0.5 && i % 3 === 1;
        if (fund) return null;
        return (
          <group key={i} position={[x, DK - 0.08 + bob - caida, 0]} rotation={[rotx + ft * (rnd(i + 3) - 0.5) * 2.4, 0, ft * (rnd(i + 7) - 0.5) * 1.6]}>
            <Caixa p={[0, 0, 0]} t={[L / N * 0.9, vazado > 0.5 ? 0.1 : 0.16, 1.6]} cor={vazado > 0.5 ? "#9fe8b0" : "#c7ccd0"} raio={0.02} />
            {vazado > 0.5 && <Caixa p={[0, -0.22, 0]} t={[L / N * 0.9, 0.06, 1.2]} cor="#7fd09a" raio={0.01} sombra={false} />}
          </group>
        );
      })}
      {ventoV > 0.02 && Array.from({ length: 7 }).map((_, i) => {
        const y = 0.6 + i * 0.28 - (i > 3 ? 0.0 : 0);
        const u = ((t * 0.9 + i * 0.37) % 1);
        const x0 = -meia - 1.5 + u * (2 * meia + 3);
        const desvia = vazado > 0.5 ? 0.08 : 0.35;
        const dy = Math.abs(x0) < 1.6 ? desvia * Math.sin(((x0 + 1.6) / 3.2) * Math.PI) * (y > 1.0 ? 1 : -1) : 0;
        return <Liga key={i} a={[x0 - 1.0, y - 0.1 + dy * 0.5, 1.0]} b={[x0, y + dy, 1.0]} w={0.04} cil cor="#d6f0ff" op={ventoV * Math.min(1, u * 5, (1 - u) * 5)} basico />;
      })}
    </group>
  );
};

/** Passarela cheia de gente andando no mesmo passo, balançando de lado; amortecedores embaixo. */
const Povo: React.FC<{ meia: number; k: number; bal: number; amort: number; t: number }> = ({ meia, k, bal, amort, t }) => {
  if (k < 0.02) return null;
  const quem = [homemA, mulher, homemB, homemC, mulher];
  const sway = bal * Math.sin(t * 2.6);
  return (
    <group position={[0, 0, sway]}>
      <Viga a={[-meia - 0.2, DK - 0.08, 0]} b={[meia + 0.2, DK - 0.08, 0]} h={0.16} e={1.7} cor="#8d8478" />
      {[-0.8, 0.8].map((z) => <Liga key={z} a={[-meia - 0.2, 0.9, z]} b={[meia + 0.2, 0.9, z]} w={0.05} cil cor="#c9ccd0" />)}
      {Array.from({ length: Math.round(34 * k) }).map((_, i) => {
        const x = -meia + 0.2 + ((i * 0.37 + t * 0.0) % 1) * (2 * meia - 0.4) * (0.5 + 0.5 * ((i * 7) % 5) / 4) + (i % 7) * 0.12 - 0.3;
        const xx = Math.max(-meia + 0.15, Math.min(meia - 0.15, -meia + 0.3 + ((i * 0.618) % 1) * (2 * meia - 0.6)));
        void x;
        const z = -0.45 + ((i * 0.41) % 1) * 0.9;
        const pers = quem[i % 5];
        const c = t * 5.2; // o mesmo passo: todos na mesma fase
        const pose: Pose3D = { ...poseDe3D("andando", t) };
        pose["pernaE.x"] = Math.sin(c) * 0.5;
        pose["pernaD.x"] = -Math.sin(c) * 0.5;
        return (
          <group key={i} position={[xx, DK + 0.0 + Math.abs(Math.sin(c)) * 0.04, z]} rotation={[0, i % 2 ? Math.PI / 2 : -Math.PI / 2, 0]} scale={0.72}>
            <Boneco3D p={pers} pose={pose} expressao="sorriso" pisca={piscar(t + i)} boca={0} olhar={[0, 0]} t={t} />
          </group>
        );
      })}
      {amort > 0.02 && [-1.8, 0, 1.8].map((x, i) => (
        <group key={i} position={[x * meia / 2.6, DK - 0.24, 0]} scale={[1, suave(amort), 1]}>
          <Liga a={[0, 0, -0.6]} b={[0, -0.9, -0.6]} w={0.16} cil cor="#e5a23a" />
          <Liga a={[0, 0, 0.6]} b={[0, -0.9, 0.6]} w={0.16} cil cor="#e5a23a" />
          {Array.from({ length: 6 }).map((_, j) => <Liga key={j} a={[(j % 2 ? 0.14 : -0.14), -0.1 - j * 0.12, 0]} b={[(j % 2 ? -0.14 : 0.14), -0.22 - j * 0.12, 0]} w={0.03} cil cor="#cfd6dc" />)}
        </group>
      ))}
    </group>
  );
};

const Junta: React.FC<{ k: number; calor: number; t: number }> = ({ k, calor, t }) => {
  if (k < 0.02) return null;
  return (
    <group>
      <JuntaAco k={k} calor={calor} t={t} />
      <group scale={suave(k)} position={[0, 0.4, 0]}>
        <group position={[-3.4, 4.2, -2]}>
          {calor >= 0 ? <><mesh scale={0.7}><sphereGeometry args={[1, 16, 12]} /><meshBasicMaterial color="#ffe14a" /></mesh><Halo p={[0, 0, 0.5]} r={2.2} cor="#ffd23f" op={0.5 * calor + 0.1} />{Array.from({ length: 8 }).map((_, i) => { const a2 = (i / 8) * Math.PI * 2 + t * 0.4; return <Liga key={i} a={[Math.cos(a2) * 1.0, Math.sin(a2) * 1.0, 0]} b={[Math.cos(a2) * 1.4, Math.sin(a2) * 1.4, 0]} w={0.07} cil cor="#ffd23f" basico />; })}</> : <><mesh scale={0.6}><sphereGeometry args={[1, 16, 12]} /><meshBasicMaterial color="#e6ecff" /></mesh><Halo p={[0, 0, 0.5]} r={1.8} cor="#9fb4ff" op={0.4} /></>}
        </group>
      </group>
    </group>
  );
};

const Relogio: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  if (k < 0.02) return null;
  return (
    <group position={[-9, 5.5, -10]} scale={suave(k) * 1.0}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[3.2, 3.2, 0.5, 40]} /><meshStandardMaterial color="#e5a23a" roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.26]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.8, 2.8, 0.05, 40]} /><meshStandardMaterial color="#f4f1ea" /></mesh>
      {Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2; return <mesh key={i} position={[Math.sin(a) * 2.45, Math.cos(a) * 2.45, 0.3]} scale={[0.12, 0.34, 0.03]} rotation={[0, 0, -a]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#2b2f36" /></mesh>; })}
      <Liga a={[0, 0, 0.35]} b={[Math.sin(t * 0.4) * 1.6, Math.cos(t * 0.4) * 1.6, 0.35]} w={0.2} cil cor="#2b2f36" />
      <Liga a={[0, 0, 0.38]} b={[Math.sin(t * 0.05) * 1.1, Math.cos(t * 0.05) * 1.1, 0.38]} w={0.26} cil cor="#2b2f36" />
      <Liga a={[0, -3.2, 0]} b={[-1.4, -5.6, 0]} w={0.3} cil cor="#8a6a46" />
      <Liga a={[0, -3.2, 0]} b={[1.4, -5.6, 0]} w={0.3} cil cor="#8a6a46" />
    </group>
  );
};

/* ---------- cena ---------- */

const PonteCena3: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const gente = (C.cena.gente as GenteE[] | undefined) ?? [];
  const meia = n("meia", 2.6);
  const cheia = n("cheia", 0);
  const tomba = n("tomba", 0);
  const rio = n("rio", YR0) + cheia * 1.4;
  const barro = Math.max(n("barro", 0), cheia);
  const sagBase = n("sag", 0);
  const cx = n("cx", -8);
  const furg = n("furgao", 0);
  const tab = n("tabua", 0);
  const grossa = n("grossa", 0.12);
  const tri = Math.max(0, 1 - Math.abs(cx) / (meia + 0.4));
  const sag = sagBase * (furg > 0.02 ? (0.25 + 0.75 * tri) : 0.3);
  const tre = n("trelica", 0);
  const arco = n("arco", 0);
  const susp = n("torres", 0) > 0.02;
  const pista = n("pista", 0);
  const comVao = arco > 0.5 ? 0.0 : tre > 0.02 ? 0.1 : sag;
  const furgY = arco > 0.5 || susp || tre > 0.5 ? DK + 0.0 : flecha(cx, meia, comVao);
  const trem = n("treme", 0) * 0.06 * Math.sin(tEp * 40);
  const rola = n("rola", 0);
  const splash = n("splash", 0);
  const splashX = n("splashX", 0);
  const entrega = n("entrega", 0);
  const peso = n("peso", 0);
    const tomb = n("tomba", 0);
  return (
    <group position={[trem, 0, 0]}>
      <Vale C={C} meia={meia} rio={rio} barro={barro} solo={n("solo", 0) > 0.02} />
      {/* tronco que rola */}
      {n("tronco", 0) > 0.02 && (
        <group position={[0, 0.3 + 0.01 * Math.sin(tEp * 3), 0]} rotation={[rola, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.3, 0.3, 2 * meia + 1.2, 12]} /><meshStandardMaterial color="#7a5230" roughness={1} /></mesh>
          {[-1, 0, 1].map((i) => <mesh key={i} position={[i * (meia * 0.6), 0.2, 0]} scale={[0.25, 0.04, 0.25]}><sphereGeometry args={[1, 6, 4]} /><meshStandardMaterial color="#4a3220" /></mesh>)}
        </group>
      )}
      {n("arvore", 0) > 0.5 && <ArvoreCorte queda={n("queda", 0)} golpes={(C.cena.golpes as number[]) ?? []} p={C.p} dur={C.p > 0.001 ? C.t / C.p : 3} qIni={(C.cena.qIni as number) ?? 0.5} qFim={(C.cena.qFim as number) ?? 0.6} rola={rola} />}
      {splash > 0.02 && (
        <group position={[splashX, rio, 0.2]}>
          {Array.from({ length: 16 }).map((_, i) => {
            const u = splash;
            const a = (i / 16) * Math.PI * 2;
            return <mesh key={i} position={[Math.cos(a) * 0.9 * u, Math.sin(Math.min(1, u * 2) * Math.PI) * 1.6 * (0.5 + 0.5 * rnd(i)) - (u > 0.6 ? (u - 0.6) * 2 : 0), Math.sin(a) * 0.5 * u]} scale={0.1 * (1 - u * 0.5)}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#d6efff" transparent opacity={1 - u * 0.7} /></mesh>;
          })}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={[1 + 2 * splash, 1 + 2 * splash, 1]}><ringGeometry args={[0.6, 0.8, 24]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.6 * (1 - splash)} /></mesh>
        </group>
      )}
      <Tabua meia={meia} grossa={grossa} sag={sagBase * (furg > 0.02 ? (0.25 + 0.75 * tri) : 0.3)} k={tab} />
      {n("caro", 0) > 0.02 && <Texto3D texto="$$$" p={[0, 2.0, 1.0]} h={1.0} cor="#6dff8a" escala={suave(n("caro", 0))} />}
      {peso > 0.02 && [-1.5, 0, 1.5].map((x, i) => <Seta key={i} a={[x * meia / 2.6, 1.6, 0.9]} b={[x * meia / 2.6, 0.35, 0.9]} cor="#ff6a4a" w={0.09} op={peso} />)}
      <group position={[0, -tomb * 2.6, 0]} rotation={[0, 0, -tomb * 0.2]}>
        <Trelica meia={meia} k={tre} esforco={n("esforco", 0)} chacoalha={n("chacoalha", 0)} t={tEp} />
      </group>
      <Mini k={n("mini", 0)} t={tEp} />
      <Pilar k={n("pilar", 0)} cheia={cheia} tomba={tomba} raiox={n("raiox", 0)} />
      <Estrada meia={meia} vao={n("estrada", 0) > 0.02 || n("via", 0) > 0.5} cabeceiras={n("via", 0) > 0.02} />
      <Transito k={n("transito", 0)} meia={meia} t={tEp} />
      {n("heroi", -99) > -90 && <Heroi x={n("heroi", 0)} x0={(C.cena.heroi as { de: number }).de} />}
      {n("solo", 0) > 0.02 && (
        <group>
          <Solo k={n("solo", 0)} meia={meia} cava={n("cava", 0)} raiox={n("raiox", 0)} sitios={[-1.6, 1.6]} agua={mistura("#3f86d8", "#8a6a46", barro)} />
          <group position={[-1.6, YB, 0]} rotation={[0, 0, 0.12 * suave(n("cava", 0)) + 1.2 * suave(n("tomba2", 0))]}><PilarArmado k={1} raiox={0} /></group>
          <group position={[1.6, 0, 0]}><Fundacao estacas={n("estacas", 0)} bloco={n("bloco", 0)} raiox={n("raiox", 0)} rio={rio} saiMaq={suave(clamp01(n("bloco", 0) / 0.35))} /></group>
        </group>
      )}
      <Arco meia={meia} k={arco} abre={n("abre", 0)} blocos={n("blocos", 0)} comp={n("compressao", 0)} emp={n("empurra", 0)} t={tEp} />
      <Suspensa meia={meia} torres={n("torres", 0)} cabos={n("cabos", 0)} ancora={n("ancora", 0)} puxa={n("puxa", 0)} leque={n("leque", 0)} />
      {pista > 0.02 && <PistaVento meia={meia} torce={n("torce", 0)} desaba={n("desaba", 0)} vazado={n("vazado", 0)} ventoV={n("ventoV", 0)} t={tEp} />}
      <Povo meia={meia} k={n("povo", 0)} bal={n("balanco", 0)} amort={n("amort", 0)} t={tEp} />
      <Junta k={n("junta", 0)} calor={n("calor", 0)} t={tEp} />
      <Relogio k={n("relogio", 0)} t={tEp} />
      {n("interroga", 0) > 0.02 && <Texto3D texto="?" p={[-4.6, 4.2 + 0.6 * suave(n("interroga", 0)), 1.5]} h={1.3} escala={suave(n("interroga", 0))} />}
      {furg > 0.02 && <Furgao x={cx} y={furgY - 0.0} rot={0} />}
      {/* a margem direita: moto e pizza (batida 1) */}
      {n("moto", 0) > 0.02 && <group position={[meia + 1.2, 0.1, 0.8]} rotation={[0, -0.5, 0]}><Moto /></group>}
      {entrega > 0.02 && entrega < 1 && <Pizza p={[lerp(meia + 1.0, -meia - 1.0, entrega), 1.62, 1.25]} s={1.0} />}
      {gente.map((g, i) => <Pessoa key={i} g={g} C={C} />)}
    </group>
  );
};

const PonteCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const C = mkCtx(cena, p, t, tEpisodio);
  const { n } = C;
  const meia = n("meia", 2.6);
  const T = meia * 0.45;
  const et: Record<string, EtiqDef> = {
    tabua: { texto: "TÁBUA", para: [0, 0.2, 0.8], off: [0.4, 1.6], cor: "#ffd23f" },
    trian: { texto: "TRIÂNGULOS", para: [meia * 0.4, -0.5, 0.6], off: [0.6, -1.8], cor: "#9fe8b0" },
    pilar: { texto: "PILAR", para: [0.0, -2.0, 0.9], off: [1.6, 0.8], cor: "#ffd23f" },
    areia: { texto: "AREIA", para: [-3.4, -5.0, 2.45], off: [0.6, 1.4], cor: "#ffe08a" },
    rocha: { texto: "ROCHA", para: [-3.4, -7.8, 2.45], off: [0.6, -1.0], cor: "#d6e4ee" },
    estacas: { texto: "ESTACAS", para: [2.15, -5.8, 0.7], off: [0.6, -1.4], cor: "#ffd23f" },
    fund: { texto: "FUNDAÇÃO", para: [1.6, -4.15, 1.2], off: [-1.5, 1.6], cor: "#ffd23f" },
    arco: { texto: "ARCO", para: [0.0, -0.3, 0.9], off: [0.6, 1.8], cor: "#ffd23f" },
    blocos: { texto: "BLOCOS", para: [meia + 0.9, -2.0, 1.0], off: [-1.0, -1.5], cor: "#ffb36a" },
    cabos: { texto: "CABOS", para: [0, 1.7, 0.6], off: [0.8, 1.5], cor: "#ffd23f" },
    torres: { texto: "TORRES", para: [T, 5.0, 2.4], off: [1.4, 0.7], cor: "#ffd23f" },
    leque: { texto: "CABOS EM LEQUE", para: [T + 2.0, 3.0, 0.6], off: [1.3, 1.5], cor: "#ffd23f" },
    amort: { texto: "AMORTECEDORES", para: [0.0, -0.8, 0.6], off: [0.6, -1.6], cor: "#ffd23f" },
    junta: { texto: "JUNTA DE DILATAÇÃO", para: [0.0, 0.55, 1.4], off: [0.4, 1.6], cor: "#ffd23f" },
  };
  const S = n("etiqS", 1);
  const Kt = n("etiqK", 1);
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fimE] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fimE === undefined || p <= fimE) };
  }).filter((x) => x.ok);
  return (
    <group>
      <PonteCena3 C={C} />
      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const off: V = [d.para[0] + d.off[0] * S, d.para[1] + d.off[1] * S, d.para[2] + 0.3];
        return <Etiqueta key={c} texto={d.texto} de={off} para={d.para} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

void THREE;

export const ponte: Cenario3D = {
  Cena: PonteCena,
  padrao: "geral",
  fundo: () => "#9ad0f5",
  luzPropria: true,
  cameras: { geral: { pos: [4, 2.4, 12], alvo: [0, -0.5, 0], fov: 50 } },
};
