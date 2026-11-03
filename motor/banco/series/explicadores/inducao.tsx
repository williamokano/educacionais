import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, suave, valor } from "../../../src/v3d/anima";
import { Caixa, Mat, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, V3, Valor } from "../../../src/v3d/tipos";
import { Etiqueta, Fluxo, Fumaca, Halo, Liga, mistura, Seta, Texto3D, V } from "./cozinha-base";
import { Ambiente, CY, Fogao, Gente, GenteDef, H_PANELA, POT_ESC, POT_POS, R_PANELA, XS, Z_FRENTE } from "./cozinha-fogao";
import { Chama } from "./cozinha-forno";
import { LinhasZoom, Lupa } from "./microondas-pecas";

// Fogão de indução (episódio 11, "como esquentar a panela sem esquentar a mão"): acampamento (batidas 1–5), cozinha do episódio 9 com fogão a gás
// (6–7), cooktop de vidro com resistência (8–9) e cooktop de indução com bobina em raio-X (10–20). Escala real (Zeca ~1,7 m, bancada 0,9 m).
// REGRA: o nome do aparelho só aparece na batida 16.
// Campos da cena (número ou { de, para, ini, fim }; booleanos com true):
//   acampamento  acamp: true · lenha 0..1 (0 só o pau, 1 a fogueira) · fogo 0..1,6 · vento 0..1 · fumaca 0..1 · fuligem 0..1 · setasCalor 0..1
//                barras 0..1 + barrasModo "ar" | "ef" + barrasX/barrasY (m) · faiscas 0..1
//   fogão        fogao: "gas" | "vidro" · gas 0..1 (chama azul) · botao 0..1 (giro do botão) · lambe 0..1 (chama passa da panela) · ondasCalor 0..1
//   panela       pote: "ferro" | "aluminio" · panela 0..1 · quente 0..1 (sopa e base) · bolhas 0..1
//   vidro        res 0..1 (resistência avermelhada) · vidroQuente 0..1 · luzH 0..1 · bobina 0..1 (espiral de cobre) · corrente 0..1 (setas na bobina)
//                campo 0..1 (linhas azuis que trocam de lado) · vidroFrio 0..1 (azul ao redor da panela) · painel 0..1 (botões de toque)
//   lupa         lupa 0..1 · lupaX, lupaY, lupaR · redemoinho 0..1 (correntes na base da panela)
//   ímã          ima 0..1 (aproxima) · imaGruda: true (gruda; senão cai)
//   fim          celular 0..1 · interroga 0..1 · destaque 0..1 (bobina, vidro e panela piscam)
//   gente        lista de { id: "zeca", x, y, z, rot, acao, exp, queima … } · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax
//                chaves: panela, ar, fumaca, botao, resistencia, hq, bobina, campo, corrente, ima, vVidro, vPanela, vBobina

const n0 = (v: unknown) => v as Valor;
const PX0 = POT_POS[0]; // panela em x = -0,8
const PZ0 = POT_POS[2];
const PCAMP: V = [PX0, 0.17, PZ0]; // panela sobre as pedras, no acampamento
const BIC = CY - 0.034; // altura da bobina/resistência sob o vidro
const VID = CY + 0.012; // topo do vidro

/* ---------- panela de sopa (corte) ---------- */

const FRAG = `
varying vec2 vUv;
uniform float uQ;
void main(){
  vec3 fria = vec3(0.70,0.76,0.82);
  vec3 sopa = vec3(0.86,0.38,0.15);
  vec3 c = mix(fria, sopa, uQ);
  float edge = min(vUv.x, 1.0 - vUv.x);
  c = mix(c, vec3(1.0,0.62,0.18), uQ * (1.0 - smoothstep(0.0, 0.25, edge)) * 0.5);
  gl_FragColor = vec4(c, 1.0);
}`;
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

const PanelaI: React.FC<{ k: number; ferro: boolean; fuligem: number; quente: number; bolhas: number; t: number }> = ({ k, ferro, fuligem, quente, bolhas, t }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uQ: { value: 0 } } }), []);
  mat.uniforms.uQ.value = quente;
  if (k <= 0.01) return null;
  const R = R_PANELA;
  const H = H_PANELA;
  const nivel = 0.2;
  const casco = mistura(ferro ? "#555a63" : "#cfd5dc", "#14110f", fuligem * 0.92);
  const fundo = mistura(ferro ? "#3d4046" : "#b8c0c8", "#ff7a1e", quente * 0.75);
  const fundoCor = mistura(fundo, "#0d0b0a", fuligem * 0.9);
  return (
    <group scale={k}>
      <mesh position={[0, H / 2, 0]}><cylinderGeometry args={[R, R * 0.9, H, 28, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color={casco} metalness={ferro ? 0.55 : 0.85} roughness={ferro ? 0.55 : 0.28} side={THREE.DoubleSide} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}><circleGeometry args={[R * 0.9, 24, 0, Math.PI]} /><meshStandardMaterial color={fundoCor} emissive="#ff6a10" emissiveIntensity={quente * 0.7} roughness={0.5} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.012, 0.001]}><planeGeometry args={[R * 1.8, 0.03]} /><meshStandardMaterial color={fundoCor} emissive="#ff6a10" emissiveIntensity={quente * 0.8} /></mesh>
      <mesh position={[0, nivel / 2 + 0.02, 0.002]} material={mat}><planeGeometry args={[R * 1.84, nivel]} /></mesh>
      <mesh position={[0, nivel + 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[R * 0.93, 24, 0, Math.PI]} /><meshStandardMaterial color={mistura("#c9d3dd", "#d6652b", quente)} roughness={0.4} /></mesh>
      <mesh position={[0, H, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[R, 0.02, 8, 28, Math.PI]} /><meshStandardMaterial color={ferro ? "#6a6f78" : "#e0e5ea"} metalness={0.8} roughness={0.25} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (R + 0.1), H - 0.06, 0]}><boxGeometry args={[0.22, 0.05, 0.07]} /><meshStandardMaterial color="#2a2d33" roughness={0.6} /></mesh>)}
      {bolhas > 0.02 && Array.from({ length: 14 }).map((_, i) => {
        const u = (t * (0.8 + rnd(i + 40) * 0.8) + rnd(i + 70)) % 1;
        const x = (rnd(i + 11) - 0.5) * R * 1.3;
        const y = 0.06 + u * (nivel - 0.02);
        const r = (0.018 + 0.03 * u) * (0.6 + 0.4 * bolhas);
        return <mesh key={i} position={[x, y, -0.02 - rnd(i + 3) * 0.12]}><sphereGeometry args={[r, 8, 6]} /><meshStandardMaterial color="#fffbe6" transparent opacity={0.7 * bolhas * Math.min(1, u * 4)} roughness={0.2} /></mesh>;
      })}
    </group>
  );
};

/* ---------- acampamento ---------- */

const ceuTex = () => {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#5b7ea8");
  gr.addColorStop(0.55, "#f0b98a");
  gr.addColorStop(1, "#f7d9a4");
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const Acampamento: React.FC = () => {
  const ceu = useMemo(ceuTex, []);
  return (
    <group>
      <mesh position={[0, 2.2, -3.2]}><planeGeometry args={[16, 7]} /><meshBasicMaterial map={ceu} /></mesh>
      <mesh position={[0, 0, -1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[16, 8]} /><meshStandardMaterial color="#a9814f" roughness={0.95} /></mesh>
      {[[-2.4, 0.5, 1.0], [2.6, 0.4, 0.8], [-1.2, 0.3, 0.6], [1.6, 0.35, 0.7]].map(([x, h, w], i) => (
        <mesh key={i} position={[x, h * 0.5, -2.3 - i * 0.1]} scale={[w * 1.8, h, 0.6]}><icosahedronGeometry args={[0.6, 0]} /><meshStandardMaterial color={i % 2 ? "#8c7a5a" : "#7c8a5c"} roughness={1} flatShading /></mesh>
      ))}
    </group>
  );
};

const Pedra: React.FC<{ p: V; s: number }> = ({ p, s }) => (
  <mesh position={p} scale={[s * 1.2, s, s * 0.9]} rotation={[0.3, 0.8, 0.2]} castShadow><icosahedronGeometry args={[0.1, 0]} /><meshStandardMaterial color="#8b8680" roughness={0.95} flatShading /></mesh>
);

const Lenha: React.FC<{ c: V; k: number; fogo: number; vento: number; t: number }> = ({ c, k, fogo, vento, t }) => {
  const toras: [number, number, number][] = [[-0.5, 0.0, 0.0], [0.5, 0.0, 0.03], [1.8, -0.02, -0.03], [2.6, 0.02, 0.04]];
  const lean = vento * 0.85;
  return (
    <group position={c}>
      {toras.map(([a, dy, dz], i) => {
        const e = clamp01(k * 4 - i * 0.8);
        if (e <= 0) return null;
        return <mesh key={i} position={[Math.cos(a) * 0.04, 0.03 + dy, dz]} rotation={[0, 0, Math.PI / 2 + Math.sin(a) * 0.35]} scale={e}><cylinderGeometry args={[0.022, 0.026, 0.34, 8]} /><meshStandardMaterial color="#4a2e18" roughness={0.9} /></mesh>;
      })}
      {fogo > 0.02 && (
        <group rotation={[0, 0, -lean]}>
          {[-0.07, 0, 0.07].map((dx, i) => <Chama key={i} p={[dx, 0.05, (i - 1) * 0.03]} k={clamp01(fogo * 2) * (i === 1 ? 1 : 0.7 * clamp01(k * 3))} t={t + i} esc={0.5 + 0.45 * fogo} />)}
        </group>
      )}
    </group>
  );
};

const Pau: React.FC<{ p: V; fogo: number; t: number }> = ({ p, fogo, t }) => (
  <group position={p} rotation={[0, 0, 0.55]}>
    <mesh position={[0.1, 0.0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.018, 0.022, 0.62, 8]} /><meshStandardMaterial color="#6a4526" roughness={0.9} /></mesh>
    {fogo > 0.02 && <group position={[-0.2, 0.0, 0]} rotation={[0, 0, -0.55]}><Chama p={[0, 0, 0]} k={clamp01(fogo * 2)} t={t} esc={0.4} /></group>}
  </group>
);

/** Duas barras de cena (sem número): rótulos à esquerda, comprimento relativo. */
const Barras: React.FC<{ p: V; k: number; modo: string; t: number }> = ({ p, k, modo, t }) => {
  if (k <= 0.02) return null;
  const e = suave(k);
  const par = modo === "ar" ? [["PANELA", 0.14, "#ff8a2a"], ["AR", 0.9, "#9fb4c7"]] : [["INDUÇÃO", 0.92, "#3ed36f"], ["GÁS", 0.42, "#ff6a4a"]];
  const L = 0.55;
  return (
    <group position={p} scale={e * 1.9}>
      <Caixa p={[0, 0, -0.02]} t={[0.95, 0.3, 0.02]} cor="#1f2a44" raio={0.02} sombra={false} />
      {par.map(([nome, v, cor], i) => (
        <group key={nome as string} position={[0, 0.06 - i * 0.12, 0]}>
          <Texto3D texto={nome as string} p={[-0.3, 0, 0.03]} h={0.06} cor="#ffffff" />
          <mesh position={[-0.12 + ((v as number) * L) / 2, 0, 0]}><boxGeometry args={[(v as number) * L * (0.92 + 0.08 * Math.sin(t * 3 + i)), 0.07, 0.02]} /><meshBasicMaterial color={cor as string} /></mesh>
        </group>
      ))}
    </group>
  );
};

/* ---------- cooktop de vidro com resistência ou bobina ---------- */

const Cooktop: React.FC<{ res: number; vidroQuente: number; luzH: number; bobina: number; corrente: number; campo: number; frio: number; painel: number; t: number; cx: number; cz: number }> = ({ res, vidroQuente, luzH, bobina, corrente, campo, frio, painel, t, cx, cz }) => {
  const s = Math.sign(Math.sin(t * 5.5)) || 1;
  const vidro = mistura("#262a31", "#b84a22", vidroQuente * 0.8);
  const nTurn = 4;
  const segs = nTurn * 22;
  const pts: V[] = Array.from({ length: segs + 1 }, (_, i) => {
    const u = i / segs;
    const a = u * nTurn * Math.PI * 2;
    const r = 0.014 + u * 0.074;
    return [cx + Math.cos(a) * r, BIC, cz + Math.sin(a) * r];
  });
  const corRes = mistura("#5a1c14", "#ff3a14", res);
  const corBob = mistura("#8a4a22", "#e0974a", bobina);
  const ehRes = res > 0.001 && bobina < 0.01;
  return (
    <group>
      {/* armário embaixo e janela de raio-X sob o vidro */}
      <Caixa p={[XS, (CY - 0.1) / 2, (Z_FRENTE - 0.55) / 2]} t={[0.8, CY - 0.1, Z_FRENTE + 0.55]} cor="#cf9650" raio={0.01} sombra={false} />
      <Caixa p={[XS, CY - 0.05, (Z_FRENTE - 0.55) / 2]} t={[0.8, 0.1, Z_FRENTE + 0.55]} cor="#c9ced6" op={0.28} raio={0.006} sombra={false} />
      <Caixa p={[XS, CY + 0.0005, (Z_FRENTE - 0.55) / 2]} t={[0.8, 0.024, Z_FRENTE + 0.55]} cor={vidro} op={0.66} rug={0.12} met={0.2} raio={0.006} />
      {/* resistência (espiral vermelha) ou bobina (espiral de cobre) */}
      {(ehRes || bobina > 0.01) && pts.slice(1).map((b, i) => <Liga key={i} a={pts[i]} b={b} w={bobina > 0.01 ? 0.011 : 0.014} cil cor={bobina > 0.01 ? corBob : corRes} emi={bobina > 0.01 ? "#e0974a" : "#ff3a14"} brilho={bobina > 0.01 ? 0.25 : res * 1.2} />)}
      {res > 0.05 && <Halo p={[cx, BIC + 0.01, cz + 0.02]} r={0.2} cor="#ff4a1a" op={0.5 * res} />}
      {vidroQuente > 0.05 && <Halo p={[cx, VID + 0.01, cz + 0.02]} r={0.28} cor="#ff6a2a" op={0.4 * vidroQuente} />}
      {/* corrente que troca de lado, embaixo da bobina */}
      {corrente > 0.02 && <Seta a={[cx - 0.07 * s, BIC - 0.028, cz + 0.03]} b={[cx + 0.07 * s, BIC - 0.028, cz + 0.03]} cor="#ffd23f" w={0.014} op={corrente} />}
      {/* campo: linhas azuis que sobem pela panela e trocam de sentido */}
      {campo > 0.02 && [-2, -1, 0, 1, 2].map((i) => {
        const x = cx + i * 0.035;
        const a: V = [x, BIC + 0.02 + 0.045 * (s > 0 ? 0 : 1), cz + 0.03];
        const b: V = [x, BIC + 0.02 + 0.045 * (s > 0 ? 1 : 0), cz + 0.03];
        return <group key={i}><Liga a={[x, BIC + 0.012, cz + 0.03]} b={[x, VID + 0.07, cz + 0.03]} w={0.004} cil cor="#4db4ff" op={0.55 * campo} basico /><Seta a={a} b={b} cor="#4db4ff" w={0.01} op={campo} /></group>;
      })}
      {/* vidro frio ao redor da panela */}
      {frio > 0.02 && <mesh position={[cx, VID + 0.001, cz]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.15, 0.36, 40]} /><meshBasicMaterial color="#6fc6ff" transparent opacity={0.45 * frio} depthWrite={false} /></mesh>}
      {/* luz H e painel de toque */}
      <group position={[XS + 0.3, VID + 0.001, 0.12]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.022, 18]} /><meshBasicMaterial color={mistura("#3a2a1a", "#ff8a1a", luzH * (0.7 + 0.3 * Math.sin(t * 5)))} /></mesh>
        {luzH > 0.05 && <Texto3D texto="H" p={[0.05, 0.035, 0.02]} h={0.045} cor="#ff9a2a" escala={luzH} />}
      </group>
      {painel > 0.02 && [-0.16, -0.08, 0, 0.08, 0.16].map((dx, i) => (
        <mesh key={i} position={[XS + dx - 0.05, VID + 0.001, 0.14]} rotation={[-Math.PI / 2, 0, 0]} scale={suave(painel)}><circleGeometry args={[0.018, 14]} /><meshBasicMaterial color={i === 2 ? "#ffd23f" : "#8fd3ff"} /></mesh>
      ))}
    </group>
  );
};

/* ---------- ímã, celular e carregador ---------- */

const Ima: React.FC<{ p: V; rot: number }> = ({ p, rot }) => (
  <group position={p} rotation={[0, 0, rot]}>
    <mesh position={[0, 0, 0]}><boxGeometry args={[0.022, 0.09, 0.022]} /><meshStandardMaterial color="#b8bec6" metalness={0.7} roughness={0.35} /></mesh>
    <mesh position={[0.03, 0.034, 0]}><boxGeometry args={[0.06, 0.022, 0.022]} /><meshStandardMaterial color="#d6322a" roughness={0.45} /></mesh>
    <mesh position={[0.03, -0.034, 0]}><boxGeometry args={[0.06, 0.022, 0.022]} /><meshStandardMaterial color="#2a62d6" roughness={0.45} /></mesh>
  </group>
);

const Celular: React.FC<{ p: V; k: number; t: number }> = ({ p, k, t }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p} scale={suave(k)}>
      <mesh position={[0, 0.006, 0]}><cylinderGeometry args={[0.06, 0.06, 0.012, 24]} /><meshStandardMaterial color="#e8e8ec" roughness={0.5} /></mesh>
      <mesh position={[0, 0.026, 0]}><boxGeometry args={[0.15, 0.016, 0.075]} /><meshStandardMaterial color="#1e2026" roughness={0.3} /></mesh>
      <mesh position={[0, 0.0345, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.14, 0.066]} /><meshBasicMaterial color="#2c7fd6" /></mesh>
      <Halo p={[0, 0.05, 0.03]} r={0.12} cor="#7fc4ff" op={0.4 + 0.2 * Math.sin(t * 4)} />
      {[0, 1, 2].map((i) => {
        const u = (t * 0.6 + i / 3) % 1;
        return <mesh key={i} position={[0, 0.013 + u * 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.05 + u * 0.03, 0.002, 6, 40]} /><meshBasicMaterial color="#4db4ff" transparent opacity={(1 - u) * 0.9} depthWrite={false} /></mesh>;
      })}
    </group>
  );
};

/* ---------- cena ---------- */

type EtiqDef = { texto: string; para: V; off: [number, number]; cor?: string };

const InducaoCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const n = (k: string, pad = 0) => valor(n0(cena[k]), p, pad);
  const b = (k: string) => cena[k] === true;
  const acamp = b("acamp");
  const fogaoModo = (cena.fogao as string | undefined) ?? "";
  const ferro = (cena.pote as string | undefined) !== "aluminio";
  const pot0: V = acamp ? PCAMP : POT_POS;
  const px = pot0[0];
  const pz = pot0[2];
  const quente = n("quente");
  const lupaK = n("lupa");
  const lx = n("lupaX", -0.75);
  const ly = n("lupaY", 1.5);
  const R = n("lupaR", 0.36);
  const s = Math.sign(Math.sin(tEpisodio * 5.5)) || 1;
  const redemoinho = n("redemoinho");
  const sc = n("setasCalor");
  const pulsa = 0.65 + 0.35 * Math.sin(t * 6);
  const destaque = n("destaque");
  const pulso = (i: number) => {
    const k = destaque * 3 - i;
    return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
  };
  const gente = (cena.gente as GenteDef[] | undefined) ?? [];
  const fogoLenha = n("fogo");
  const gas = n("gas");
  const lambe = n("lambe");
  const imaK = n("ima");
  const gruda = cena.imaGruda !== false;
  const botao = n("botao");

  // ímã: aproxima da lateral da panela e gruda (ferro) ou cai (alumínio)
  const alvoIma: V = [px - 0.152, CY + 0.035 + 0.075, pz + 0.01];
  const ap = suave(clamp01(imaK / 0.55));
  const queda = gruda ? 0 : clamp01((imaK - 0.58) / 0.42) ** 2;
  const posIma: V = [alvoIma[0] - 0.5 * (1 - ap) - (gruda ? 0 : 0.03 * queda), alvoIma[1] + 0.3 * (1 - ap) - 0.85 * queda, alvoIma[2]];
  const rotIma = gruda ? 0 : -1.6 * queda;

  // rótulos
  const S = n("etiqS", 0.3);
  const Kt = n("etiqK", 1);
  const bicoCoil: V = [px + 0.06, BIC, pz];
  const et: Record<string, EtiqDef> = {
    panela: { texto: "PANELA", para: [px + 0.02, pot0[1] + 0.12, pz], off: [1.2, 0.9] },
    ar: { texto: "AR", para: [px + 0.22, pot0[1] + 0.32, pz], off: [0.9, 0.8] },
    fumaca: { texto: "FUMAÇA", para: [px, pot0[1] + 0.52, pz], off: [-1.2, 0.5], cor: "#c9c1b8" },
    botao: { texto: "BOTÃO", para: [XS - 0.24, 0.8, Z_FRENTE + 0.035], off: [-1.6, -0.9] },
    resistencia: { texto: "RESISTÊNCIA", para: bicoCoil, off: [1.5, -1.0] },
    hq: { texto: "H · QUENTE", para: [XS + 0.3, VID + 0.02, 0.12], off: [1.2, 1.4], cor: "#ff6a4a" },
    bobina: { texto: "BOBINA", para: bicoCoil, off: [1.6, -1.0] },
    campo: { texto: "CAMPO", para: [px - 0.07, VID + 0.04, pz + 0.03], off: [-1.7, 0.6], cor: "#7fc4ff" },
    corrente: { texto: "CORRENTE", para: [lx - R * 0.35, ly - 0.02, 0.28], off: [-1.1, 1.3], cor: "#ffb26b" },
    ima: { texto: "ÍMÃ", para: [posIma[0] + 0.03, posIma[1] + 0.03, posIma[2]], off: [-1.5, 1.0] },
    vVidro: { texto: "VIDRO", para: [px + 0.28, VID, pz + 0.05], off: [1.0, -1.2] },
    vPanela: { texto: "PANELA", para: [px + 0.02, CY + 0.1, pz], off: [-1.7, 1.2] },
    vBobina: { texto: "BOBINA", para: bicoCoil, off: [1.6, -1.3] },
  };
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fim] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fim === undefined || p <= fim) };
  }).filter((x) => x.ok);

  // lupa: base da panela com correntes em redemoinho
  const conteudoLupa = (
    <group>
      <mesh position={[0, -0.06, 0.02]}><boxGeometry args={[R * 1.7, R * 0.42, 0.02]} /><meshStandardMaterial color={mistura("#6b7078", "#ff7a1e", redemoinho)} emissive="#ff5a10" emissiveIntensity={0.7 * redemoinho} roughness={0.5} /></mesh>
      {[-0.42, 0, 0.42].map((dx, k) => [0.07, 0.12].map((r, j) => (
        <group key={`${k}${j}`} position={[dx * R, -0.06, 0.05]}>
          <mesh><torusGeometry args={[r * (R / 0.36), 0.006, 6, 28]} /><meshBasicMaterial color="#ffb26b" transparent opacity={0.8 * redemoinho} /></mesh>
          {Array.from({ length: 3 }).map((_, i) => {
            const a = tEpisodio * (j ? -3 : 3) * s * 0 + tEpisodio * (j ? 3.2 : -3.2) + (i / 3) * Math.PI * 2;
            return <mesh key={i} position={[Math.cos(a) * r * (R / 0.36), Math.sin(a) * r * (R / 0.36), 0.01]}><sphereGeometry args={[0.013, 8, 6]} /><meshBasicMaterial color="#fff2a0" /></mesh>;
          })}
        </group>
      )))}
      <Seta a={[0, -R * 0.62, 0.05]} b={[0, -R * 0.62 + 0.15 * (s > 0 ? 1 : -1) * redemoinho, 0.05]} cor="#4db4ff" w={0.016} op={redemoinho} />
    </group>
  );

  return (
    <group>
      <hemisphereLight args={["#fff3dd", "#8a6a4a", 1.05]} />
      <directionalLight position={[-1.2, 3.6, 3.8]} intensity={2.2} color="#fff0d2" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-2.6} shadow-camera-right={2.6} shadow-camera-top={2.6} shadow-camera-bottom={-1.2} shadow-camera-near={0.5} shadow-camera-far={12} shadow-bias={-0.0004} />
      {acamp ? <Acampamento /> : <Ambiente />}

      {/* acampamento: pedras, pau, lenha, fogo, fumaça e setas de calor */}
      {acamp && (
        <group>
          <Pedra p={[px - 0.12, 0.07, pz]} s={1.2} />
          <Pedra p={[px + 0.12, 0.07, pz]} s={1.2} />
          {n("lenha") < 0.05 ? <Pau p={[px, 0.07, pz]} fogo={fogoLenha} t={t} /> : <Lenha c={[px, 0, pz]} k={n("lenha")} fogo={fogoLenha} vento={n("vento")} t={t} />}
          {n("faiscas") > 0.02 && Array.from({ length: 10 }).map((_, i) => {
            const u = (t * (0.6 + rnd(i) * 0.5) + rnd(i + 3)) % 1;
            return <mesh key={i} position={[px + (rnd(i + 5) - 0.2) * 0.5 + u * 0.5 * n("vento"), 0.1 + u * 0.9, pz + (rnd(i + 9) - 0.5) * 0.2]} scale={1 - u}><sphereGeometry args={[0.012, 6, 6]} /><meshBasicMaterial color="#ffb040" /></mesh>;
          })}
          <Fumaca p={[px, PCAMP[1] + 0.2, pz - 0.1]} t={t} k={n("fumaca")} cor="#2e2b29" alt={0.9} larg={0.2} op={0.7} n={12} />
          {sc > 0.02 && (
            <group>
              {[-0.1, 0, 0.1].map((dx, i) => <Seta key={i} a={[px + dx * 2.6, 0.32, pz + 0.05]} b={[px + dx * 3.6, 0.52 + 0.04 * pulsa, pz + 0.05]} cor="#ff8a2a" w={0.012} op={clamp01(sc * 3) * pulsa} />)}
              {[-1, 1].map((sg) => [0.22, 0.34].map((h, j) => <Seta key={`${sg}${j}`} a={[px + sg * 0.15, h, pz + 0.05]} b={[px + sg * (0.3 + 0.04 * pulsa), h + 0.06, pz + 0.05]} cor="#ff8a2a" w={0.012} op={clamp01(sc * 3) * pulsa} />))}
              <Seta a={[px + 0.02, 0.1, pz + 0.05]} b={[px + 0.02, 0.17, pz + 0.05]} cor="#ffd23f" w={0.012} op={clamp01(sc * 3)} />
            </group>
          )}
        </group>
      )}
      <Barras p={[n("barrasX", px + 0.55), n("barrasY", 0.75), 0.15]} k={n("barras")} modo={(cena.barrasModo as string | undefined) ?? "ar"} t={t} />

      {/* cozinha: fogão a gás ou cooktop */}
      {fogaoModo === "gas" && <Fogao fogo={gas} t={t} vazio={0.03} />}
      {fogaoModo === "gas" && botao > 0.001 && (
        <group position={[XS - 0.24, 0.8, Z_FRENTE + 0.032]}>
          <mesh rotation={[0, 0, -botao * 2.4]} position={[0, 0.0, 0]}><boxGeometry args={[0.008, 0.044, 0.006]} /><meshBasicMaterial color="#ffffff" /></mesh>
          <Halo p={[0, 0, 0.02]} r={0.07} cor="#ffd23f" op={0.6 * (0.7 + 0.3 * Math.sin(t * 6))} />
        </group>
      )}
      {fogaoModo === "gas" && lambe > 0.02 && [-1, 1].map((sg) => (
        <group key={sg}>
          <Chama p={[px + sg * 0.15, CY + 0.07, pz + 0.01]} k={clamp01(lambe * 2)} t={t + sg} esc={0.45} />
          <Halo p={[px + sg * 0.15, CY + 0.12, pz + 0.05]} r={0.2} cor="#ff7a2a" op={0.4 * lambe} />
        </group>
      ))}
      {n("ondasCalor") > 0.02 && (
        <Fluxo rotas={[[[px + 0.18, CY + 0.18, 0.0], [px + 0.5, CY + 0.35, 0.0], [px + 1.0, CY + 0.55, 0.0]], [[px - 0.18, CY + 0.18, 0.0], [px - 0.5, CY + 0.35, 0.0], [px - 0.9, CY + 0.6, 0.0]], [[px, CY + 0.4, 0.0], [px + 0.1, CY + 0.9, 0.0], [px + 0.1, CY + 1.4, 0.0]]]} t={t} n={3} vel={0.5} cor="#ff9a3c" w={0.03} op={n("ondasCalor")} tam={0.2} />
      )}
      {fogaoModo === "vidro" && (
        <Cooktop res={n("res")} vidroQuente={n("vidroQuente")} luzH={n("luzH")} bobina={n("bobina")} corrente={n("corrente")} campo={n("campo")} frio={n("vidroFrio")} painel={n("painel")} t={tEpisodio} cx={px} cz={pz} />
      )}

      {/* a panela */}
      <group position={pot0} scale={POT_ESC}><PanelaI k={n("panela", 1)} ferro={ferro} fuligem={n("fuligem")} quente={quente} bolhas={n("bolhas")} t={t} /></group>
      {fogaoModo === "vidro" && quente > 0.3 && <Fumaca p={[px, CY + 0.2, pz]} t={t} k={quente * 0.5} cor="#ffffff" alt={0.4} larg={0.12} op={0.5} n={6} />}

      {/* lupa */}
      <LinhasZoom de={[px, CY + 0.045, 0]} p={[lx, ly, 0.25]} R={R} k={lupaK} />
      <Lupa p={[lx, ly, 0.25]} R={R} k={lupaK}>{conteudoLupa}</Lupa>

      {/* ímã */}
      {imaK > 0.01 && <Ima p={posIma} rot={rotIma} />}

      {/* revelação, celular e interrogação */}
      {destaque > 0.001 && (
        <group>
          <Halo p={[px, BIC, 0.05]} r={0.22} cor="#ffb26b" op={0.9 * pulso(0)} />
          <Halo p={[px, VID, 0.05]} r={0.3} cor="#9fdcff" op={0.9 * pulso(1)} />
          <Halo p={[px, CY + 0.1, 0.05]} r={0.25} cor="#ffe9a8" op={0.9 * pulso(2)} />
        </group>
      )}
      <Celular p={[0.25, CY, 0.0]} k={n("celular")} t={t} />
      {n("interroga") > 0.02 && <Texto3D texto="?" p={[-0.3 + 0.25, CY + 0.42 + 0.08 * suave(n("interroga")) + 0.02 * Math.sin(t * 3), 0.1]} h={0.3} escala={suave(clamp01(n("interroga") * 2))} />}

      {gente.map((gd, i) => <Gente key={`${gd.id}${i}`} g={gd} p={p} t={t} tAbs={tEpisodio} />)}

      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const de: V = [d.para[0] + d.off[0] * S, d.para[1] + d.off[1] * S, d.para[2] + 0.1];
        return <Etiqueta key={c} texto={d.texto} de={de} para={d.para} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

void H_PANELA; void Mat;
const c = (pos: V3, alvo: V3, fov = 50) => ({ pos, alvo, fov });

export const inducao: Cenario3D = {
  Cena: InducaoCena,
  padrao: "geral",
  fundo: () => "#f3d6a4",
  luzPropria: true,
  cameras: { geral: c([-0.5, 1.2, 3.2], [-0.5, 1.0, 0], 50) },
};
