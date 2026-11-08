import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, lerp, suave, valor } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Anterior, poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Expressao3D, Personagem3D, Pose3D, V3, Valor } from "../../../src/v3d/tipos";
import { Etiqueta, Halo, Liga, Seta, Texto3D, V } from "./cozinha-base";
import { homemA, mulher } from "./fieis";
import { Raio } from "./elevador-extra";
import { zeca } from "./zeca";

// Banheiro em corte (episódio 17, "por que o cheiro não volta quando você dá descarga?"). Mundo em metros: piso y = 0, plano do encanamento z = ZP (-0,15),
// parede de azulejo atrás (z = -0,62), câmera do lado +z. Buraco do piso em x = 0; o cano desce, (curva em S) e segue para a direita até o esgoto (x = 4,5).
// REGRA: o nome "vaso sanitário" só aparece na batida 15 (campo `vaso`). A bacia é desenhada de lado (corte longitudinal): caixa à esquerda, saída no piso em x = 0.
// Campos da cena (número, { de, para, ini, fim } ou chaves [[progresso, valor], ...]):
//   piso 0..1 (1 = piso e solo em raio-X; 0 = piso opaco, solo some) · buraco · cheiro 0..1 (ondinhas verdes saindo do buraco/da bacia)
//   bacia 0..1 (a bacia de louça de LADO, em raio-X, com a curva em S dentro) · louca 0..1 (opacidade da louça: 0,18 = raio-X; 1 = opaca) · vaso 0..1 (revelação: opaca, assento, caixa desce)
//   tampaAgua 0..1,4 (nível da água: 1 = nível de repouso, no topo da curva; > 1 = sobe acima, na bacia) · sifao 0..1 (a água passa do topo e desce: frente) · cauda 0..1 (fundo da fila que desce)
//   furo 0..1 (o furinho/siphon jet na frente do fundo da bacia, com esguicho para a boca da saída) · empurra 0..1 (bolinhas empurradas do fundo da bacia para TRÁS até a crista)
//   puxa 0..1 (gotas aceleradas) · setas 0..1 · aro 0..1 (água entra pela borda e escorre pelas paredes) · remoinho 0..1 (água do fundo da bacia indo para trás) · glub 0..1 (bolhas de ar + texto)
//   arCano 0..1 (bolinhas verdes dentro do cano) · arBarra 0..1 (batem na água da curva e voltam) · escoa 0..1 (bolinhas de água correndo) · escoaVel
//   respiro 0..1 (o tubo de ventilação cresce até o telhado) · arResp 0..1 (ar entrando por ele) · telhado 0..1
//   baldeX/Y/Z · baldeInc · baldeAgua · jato · baldeVazio · baldeTampa
//   caixa 0..1 · nivelCaixa · alavanca · tampaBorracha · descida (cano da caixa à bacia) · descidaAgua · torneira · boia · transborda · falha · ladrao 0..1 · tubinho 0..1 (tubinho de reposição da válvula à boca do ladrão) · tubinhoAgua
//   historia · interroga · lampada · cachoeira · flor · destaque · gente: lista de { id, x, y, z, rot, acao, exp, pose, incl, esc } · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax
//   chaves de etiq: cano, curva, agua, respiro, caixa, tampa, boia, ladrao, sifao, tubinho, vasoCaixa, vasoBoia, vasoSifao

const n0 = (v: unknown) => v as Valor;
const chaves = (a: [number, number][], p: number) => {
  if (p <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    if (p <= a[i][0]) return lerp(a[i - 1][1], a[i][1], suave(clamp01((p - a[i - 1][0]) / Math.max(a[i][0] - a[i - 1][0], 1e-6))));
  }
  return a[a.length - 1][1];
};

const ZP = -0.15;
const R = 0.11; // raio do cano
const AGUA = "#3f9ae8";
const VERDE = "#74d14c";
const AZULEJO = "#b4dbe6";
const POR = "#f6f6f2";

/* ---------- pessoas ---------- */

const nobre: Personagem3D = { nome: "Nobre", altura: 1.74, pele: "#e3b48a", cabelo: "#3a2a1a", olhos: "#3b2415", camiseta: "#7a1f3a", calca: "#2f2a35", sapato: "#111111", bone: { cor: "#2b1c2a", aba: "#2b1c2a", virado: false }, bigode: "#3a2a1a", sobrancelha: "#3a2a1a", barriga: 0.2 };
const rainha: Personagem3D = { ...mulher, nome: "Rainha", altura: 1.62, pele: "#f0cfae", cabelo: "#b5532a", camiseta: "#c8a02e", calca: "#8a2a4a", sapato: "#3a2a22", barriga: 0.15 };
const PERS: Record<string, Personagem3D> = { zeca, nobre, rainha, mae: mulher, pai: homemA };

type GenteE = { id?: string; x?: Valor; y?: Valor; z?: Valor; rot?: Valor; acao?: string | [number, string, string?][]; exp?: Expressao3D; ant?: Anterior; entradaDur?: number; pose?: Pose3D | [number, Pose3D][]; incl?: Valor; esc?: number; suor?: number; vel?: number };

const vv = (v: unknown, p: number, pad = 0): number => {
  if (Array.isArray(v) && Array.isArray(v[0])) {
    const a = v as [number, number][];
    if (p <= a[0][0]) return a[0][1];
    for (let i = 1; i < a.length; i++) if (p <= a[i][0]) return lerp(a[i - 1][1], a[i][1], (p - a[i - 1][0]) / Math.max(a[i][0] - a[i - 1][0], 1e-6));
    return a[a.length - 1][1];
  }
  return valor(v as Valor, p, pad);
};

const Pessoa: React.FC<{ g: GenteE; p: number; t: number; tAbs: number }> = ({ g, p, t, tAbs }) => {
  const pers = PERS[g.id ?? "zeca"];
  const { acao, exp, pose } = poseGente(g, { p, t: t, tAbs, abs: true, vel: g.vel ?? 1, incl: valor(g.incl, p, 0) });
  const { x, y, z, rot } = posicaoGente(g, t, { x: vv(g.x, p, 0), y: vv(g.y, p, 0), z: vv(g.z, p, 0), rot: vv(g.rot, p, 0) });
  const esc = g.esc ?? 1.06;
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={esc}>
      <Boneco3D p={pers} pose={pose} expressao={exp} pisca={piscar(tAbs + x * 3 + z)} boca={0} olhar={[0, 0]} suor={g.suor} t={tAbs} />
      {g.id === "rainha" && (
        <group position={[0, 1.62, 0]}>
          <mesh position={[0, 0.0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.05, 20, 1, true]} /><meshStandardMaterial color="#e6b92e" metalness={0.6} roughness={0.3} side={THREE.DoubleSide} /></mesh>
          {Array.from({ length: 6 }).map((_, i) => <mesh key={i} position={[Math.cos((i / 6) * Math.PI * 2) * 0.2, 0.06, Math.sin((i / 6) * Math.PI * 2) * 0.2]}><coneGeometry args={[0.04, 0.1, 6]} /><meshStandardMaterial color="#e6b92e" metalness={0.6} roughness={0.3} /></mesh>)}
        </group>
      )}
      {g.id === "nobre" && (
        <mesh position={[0, 1.24, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.13, 0.04, 8, 24]} /><meshStandardMaterial color="#f4efe2" roughness={0.9} /></mesh>
      )}
    </group>
  );
};

/* ---------- o cano: curva morfando, tubo de raio variável, água ---------- */

type P2 = [number, number];
const arco = (cx: number, cy: number, r: number, a0: number, a1: number, m = 22): P2[] => Array.from({ length: m + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / m; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as P2; });
const reta = (a: P2, b: P2): P2[] => { const m = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05)); return Array.from({ length: m + 1 }, (_, i) => [lerp(a[0], b[0], i / m), lerp(a[1], b[1], i / m)] as P2); };
const resamplea = (pts: P2[], m: number): P2[] => {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = acc[acc.length - 1];
  const out: P2[] = [];
  let j = 1;
  for (let i = 0; i < m; i++) {
    const s = (L * i) / (m - 1);
    while (j < pts.length - 1 && acc[j] < s) j++;
    const k = acc[j] === acc[j - 1] ? 0 : (s - acc[j - 1]) / (acc[j] - acc[j - 1]);
    out.push([lerp(pts[j - 1][0], pts[j][0], k), lerp(pts[j - 1][1], pts[j][1], k)]);
  }
  return out;
};
/** O cano de descida (sem curva) e, quando a bacia existe, a curva em S que fica DENTRO da louça (raio-X). */
const RT = 0.038; // raio da passagem dentro da louça
// Bacia de lado: o escoamento sai do fundo da tigela PARA TRÁS (quase horizontal), sobe numa crista (topo da curva, y = 0,265) e só então desce pela saída em x = 0.
const TRAP: P2[] = [...arco(0.29, 0.2, 0.04, 0, -Math.PI / 2, 10), ...reta([0.29, 0.16], [0.14, 0.135]), ...arco(0.14, 0.175, 0.04, -Math.PI / 2, -Math.PI, 10), ...reta([0.1, 0.175], [0.1, 0.215]), ...arco(0.05, 0.215, 0.05, 0, Math.PI), ...reta([0.0, 0.215], [0.0, 0.0])];
const DESCE: P2[] = [...reta([0, 0.0], [0, -1.35]), ...arco(0.2, -1.35, 0.2, Math.PI, Math.PI * 1.5), ...reta([0.2, -1.55], [4.3, -1.55]), ...arco(4.3, -1.75, 0.2, Math.PI / 2, 0), ...reta([4.5, -1.75], [4.5, -2.5])];
const NIVEL_REPOUSO = 0.265; // a água fica na altura do topo da curva
const nivelY = (v: number) => (v <= 1 ? lerp(0.15, NIVEL_REPOUSO, clamp01(v)) : NIVEL_REPOUSO + (v - 1) * 0.35);

type Info = { pts: P2[]; r: number[]; iTop: number; iBot: number; iFim: number; bacia: boolean };
const montaCano = (bacia: boolean): Info => {
  const bruto: P2[] = bacia ? [...TRAP, ...DESCE] : [[0, 0.06], ...DESCE];
  let L = 0;
  for (let i = 1; i < bruto.length; i++) L += Math.hypot(bruto[i][0] - bruto[i - 1][0], bruto[i][1] - bruto[i - 1][1]);
  const pts = resamplea(bruto, Math.ceil(L / 0.03) + 1);
  let iTop = 0, iBot = 0;
  if (bacia) {
    for (let i = 0; i < pts.length; i++) if (pts[i][1] > 0.02) { if (pts[i][1] > pts[iTop][1]) iTop = i; }
    for (let i = 0; i < iTop; i++) if (pts[i][1] < pts[iBot][1]) iBot = i;
  }
  const r = pts.map((p) => (bacia ? lerp(R, RT, clamp01((p[1] + 0.2) / 0.2)) : R));
  return { pts, r, iTop, iBot, iFim: pts.length - 1, bacia };
};

const tuboVar = (pts: P2[], radii: number[], seg = 14, tampa = false): THREE.BufferGeometry => {
  const m = pts.length;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < m; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(m - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    for (let j = 0; j <= seg; j++) {
      const f = (j / seg) * Math.PI * 2;
      const c = Math.cos(f) * radii[i], s = Math.sin(f) * radii[i];
      pos.push(pts[i][0] - ty * c, pts[i][1] + tx * c, ZP + s);
    }
  }
  for (let i = 0; i < m - 1; i++) for (let j = 0; j < seg; j++) {
    const p0 = i * (seg + 1) + j, p1 = p0 + 1, p2 = p0 + seg + 1, p3 = p2 + 1;
    idx.push(p0, p2, p1, p1, p2, p3);
  }
  if (tampa) {
    for (const e of [0, m - 1]) {
      const c = pos.length / 3;
      pos.push(pts[e][0], pts[e][1], ZP);
      for (let j = 0; j < seg; j++) { const q0 = e * (seg + 1) + j; idx.push(c, q0, q0 + 1); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

/** Faixas de água: a parada (até o nível, da bacia à crista) e a que passa da crista e desce (`sifao` = frente, `cauda` = fundo da fila). */
const faixas = (info: Info, v: number, sifao: number, cauda: number): [number, number][] => {
  const { pts, iTop, iBot, iFim } = info;
  const out: [number, number][] = [];
  if (v > 0.015 && info.bacia) {
    const L = nivelY(v);
    let i0 = -1, i1 = -1;
    for (let i = 0; i <= iTop; i++) {
      if (pts[i][1] <= L) { if (i0 < 0) i0 = i; i1 = i; } else if (i0 >= 0 && i > iBot) break;
    }
    if (i0 >= 0 && i1 > i0) out.push([i0, i1]);
  }
  if (sifao > 0.01 && info.bacia) {
    const hi = Math.round(lerp(iTop, iFim, clamp01(sifao)));
    const lo = Math.round(lerp(iTop, iFim, clamp01(cauda)));
    if (hi - lo > 1) out.push([lo, hi]);
  }
  return out;
};

const Cano: React.FC<{ info: Info; vis: number }> = ({ info, vis }) => {
  const geo = useMemo(() => tuboVar(info.pts, info.r, 14), [info]);
  const geoF = useMemo(() => tuboVar(info.pts, info.r.map((x) => x * 1.07), 14), [info]);
  if (vis <= 0.02) return null;
  return (
    <group>
      <mesh geometry={geoF}><meshBasicMaterial color="#2f3a42" side={THREE.BackSide} transparent opacity={0.45 * vis} depthWrite={false} /></mesh>
      <mesh geometry={geo}><meshPhysicalMaterial color="#e7eef1" transparent opacity={0.5 * vis} roughness={0.15} clearcoat={0.6} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>
  );
};

const AguaParada: React.FC<{ info: Info; v: number; sifao: number; cauda: number; vis: number }> = ({ info, v, sifao, cauda, vis }) => {
  const fx = faixas(info, Math.round(v * 80) / 80, Math.round(sifao * 60) / 60, Math.round(cauda * 60) / 60);
  const geos = useMemo(() => fx.map(([a, b]) => tuboVar(info.pts.slice(a, b + 1), info.r.slice(a, b + 1).map((x) => Math.min(x * 0.86, 0.058)), 14, true)), [info, JSON.stringify(fx)]);
  if (vis <= 0.02) return null;
  return <group>{geos.map((g, i) => <mesh key={i} geometry={g} renderOrder={5}><meshBasicMaterial color="#2f8df0" transparent opacity={0.95 * vis} side={THREE.DoubleSide} /></mesh>)}</group>;
};

const pontoEm = (info: Info, i: number): V => {
  const k = Math.max(0, Math.min(info.pts.length - 1, i));
  const a = Math.floor(k), b = Math.min(info.pts.length - 1, a + 1), f = k - a;
  return [lerp(info.pts[a][0], info.pts[b][0], f), lerp(info.pts[a][1], info.pts[b][1], f), ZP];
};

/** Bolinhas de água correndo pelo cano (da entrada até o esgoto). `ini` = índice de onde saem. */
const Gotas: React.FC<{ info: Info; t: number; k: number; vel: number; ini?: number; fim?: number; n?: number; acel?: number }> = ({ info, t, k, vel, ini = 0, fim, n = 22, acel = 0 }) => {
  if (k <= 0.02) return null;
  const f = fim ?? info.pts.length - 1;
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const c = (t * vel * (0.5 + acel) + i / n + rnd(i) * 0.03) % 1;
        const u = acel > 0 ? c * c * 0.6 + c * 0.4 : c;
        const p = pontoEm(info, lerp(ini, f, u));
        const r = (info.r[Math.round(lerp(ini, f, u))] ?? R) * 0.5;
        return <mesh key={i} position={[p[0], p[1], ZP + (rnd(i + 3) - 0.5) * r]} scale={Math.max(0.03, r * 0.6)}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={i % 3 === 0 ? "#bfe3ff" : "#5fb0f2"} transparent opacity={0.95 * k} /></mesh>;
      })}
    </group>
  );
};

/** Ar do esgoto subindo pelo cano. `barra` = bate na água da curva e volta. */
const ArNoCano: React.FC<{ info: Info; t: number; k: number; barra: number }> = ({ info, t, k, barra }) => {
  if (k <= 0.02) return null;
  const N = info.pts.length;
  const stop = info.bacia ? info.iTop + 3 : 0;
  return (
    <group>
      {Array.from({ length: 14 }).map((_, i) => {
        const c = (t * 0.32 + i / 14) % 1;
        let idx: number, op = 1;
        if (barra > 0.5) {
          if (c < 0.62) idx = lerp(N - 1, stop, suave(c / 0.62) * 0.55 + (c / 0.62) * 0.45);
          else { const f = (c - 0.62) / 0.38; idx = lerp(stop, stop + 45, f); op = 1 - f; }
        } else idx = lerp(N - 1, 0, c);
        const p = pontoEm(info, idx);
        return <mesh key={i} position={[p[0], p[1], ZP + (rnd(i + 7) - 0.5) * 0.06]} scale={0.045}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={VERDE} transparent opacity={0.95 * k * op} /></mesh>;
      })}
    </group>
  );
};

/* ---------- cheiro: ondinhas verdes ---------- */

const Cheiro: React.FC<{ t: number; k: number; x?: number; y?: number; z?: number; alt?: number }> = ({ t, k, x = 0, y = 0.12, z = ZP, alt = 1.3 }) => {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(Array.from({ length: 16 }, (_, i) => new THREE.Vector3(-0.11 + (i / 15) * 0.22, Math.sin((i / 15) * Math.PI * 2) * 0.04, 0)));
    return new THREE.TubeGeometry(c, 30, 0.013, 6, false);
  }, []);
  if (k <= 0.02) return null;
  return (
    <group>
      {Array.from({ length: 9 }).map((_, i) => {
        const c = (t * 0.33 + i / 9 + rnd(i) * 0.05) % 1;
        const vis = Math.pow(Math.sin(Math.PI * c), 0.7) * k;
        return (
          <mesh key={i} geometry={geo} position={[x + Math.sin(c * 6 + i) * 0.08 + ((i % 3) - 1) * 0.1, y + c * alt, z + (rnd(i + 4) - 0.3) * 0.2]} rotation={[0, 0, Math.sin(c * 5 + i) * 0.35]} scale={0.8 + 0.7 * c}>
            <meshBasicMaterial color={VERDE} transparent opacity={0.92 * vis} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ---------- balde ---------- */

const Balde: React.FC<{ p: V; inc: number; agua: number; jato: number; t: number; info: Info; alvo?: [number, number] }> = ({ p, inc, agua, jato, t, alvo = [0, 0.08] }) => {
  const a = -inc * 1.75;
  const lipX = p[0] + 0.15 * Math.cos(a) - 0.15 * Math.sin(a);
  const lipY = p[1] + 0.15 * Math.sin(a) + 0.15 * Math.cos(a);
  const nivel = 0.26 * agua * (1 - inc * 0.85);
  return (
    <group>
      <group position={p} rotation={[0, 0, a]}>
        <mesh><cylinderGeometry args={[0.15, 0.115, 0.3, 28, 1, true]} /><meshStandardMaterial color="#e0533d" roughness={0.5} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.115, 0.115, 0.01, 24]} /><meshStandardMaterial color="#c24330" /></mesh>
        <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.15, 0.011, 8, 28]} /><meshStandardMaterial color="#c24330" /></mesh>
        <mesh position={[0, 0.15, 0]}><torusGeometry args={[0.15, 0.008, 6, 20, Math.PI]} /><meshStandardMaterial color="#9aa3ab" metalness={0.7} roughness={0.3} /></mesh>
        {nivel > 0.01 && <mesh position={[0, -0.145 + nivel / 2, 0]}><cylinderGeometry args={[0.142 - 0.025 * (1 - nivel / 0.26), 0.118, nivel, 24]} /><meshPhysicalMaterial color={AGUA} transparent opacity={0.85} roughness={0.1} /></mesh>}
      </group>
      {jato > 0.02 && Array.from({ length: Math.max(3, Math.round(16 * jato)) }).map((_, i, arr) => {
        const c = (t * 1.7 * (0.5 + 0.5 * jato) + i / arr.length) % 1;
        const x = lerp(lipX, alvo[0], c);
        const y = lipY - (lipY - alvo[1]) * c * c;
        return <mesh key={i} position={[x, y, lerp(p[2], ZP, c)]} scale={[0.026, 0.045, 0.026]}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={i % 4 === 0 ? "#cfeaff" : "#4ea6ee"} transparent opacity={0.95} /></mesh>;
      })}
    </group>
  );
};

/* ---------- caixa de água (com tampa de borracha, alavanca, torneira e boia) ---------- */

type CaixaP = { x?: number; z?: number; escala?: number; yb: number; zc: number; d: number; nivel: number; alavanca: number; tampa: number; torneira: number; boia: number; transborda: number; vaso: number; tAbs: number; vis: number; descida: number; descidaAgua: number; ladrao?: number; falha?: number; tubinho?: number; tubinhoAgua?: number };

const W_CX = 0.5;
const H_CX = 0.38;

const Contorno: React.FC<{ t: V; cor: string; op?: number }> = ({ t, cor, op = 1 }) => {
  const g = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(t[0], t[1], t[2])), [t[0], t[1], t[2]]);
  return <lineSegments geometry={g}><lineBasicMaterial color={cor} transparent opacity={op} /></lineSegments>;
};

/** O tubinho flexível de reposição (local da caixa): do corpo da válvula de entrada até a boca do ladrão. */
const TubinhoReposicao: React.FC<{ k: number; agua: number; t: number }> = ({ k, agua, t }) => {
  const curva = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, 0.352, 0.035), new THREE.Vector3(0.13, 0.318, 0.05), new THREE.Vector3(0.02, 0.298, 0.05), new THREE.Vector3(-0.09, 0.322, 0.04), new THREE.Vector3(-0.17, 0.352, 0.0)]), []);
  const geo = useMemo(() => new THREE.TubeGeometry(curva, 40, 0.0105, 8, false), [curva]);
  return (
    <group scale={suave(clamp01(k * 1.5))}>
      <mesh geometry={geo}><meshStandardMaterial color="#26262c" roughness={0.5} /></mesh>
      <mesh position={[0.2, 0.352, 0.035]}><sphereGeometry args={[0.02, 10, 8]} /><meshStandardMaterial color="#26262c" /></mesh>
      {agua > 0.02 && Array.from({ length: 5 }).map((_, i) => { const c = (t * 1.1 + i / 5) % 1; return <mesh key={i} position={curva.getPoint(c)} scale={0.015}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#bfe3ff" transparent opacity={agua} /></mesh>; })}
    </group>
  );
};

const CaixaDagua: React.FC<CaixaP> = ({ yb, zc, d, nivel, alavanca, tampa, torneira, boia, transborda, vaso, tAbs, vis, descida, descidaAgua, ladrao = 0, falha = 0, tubinho = 0, tubinhoAgua = 0 }) => {
  if (vis <= 0.02) return null;
  const nv = clamp01(nivel);
  const aberto = torneira * (boia > 0.5 && falha < 0.5 ? 1 - suave(clamp01((nv - 0.82) / 0.1)) : 1);
  const hAgua = (H_CX - 0.06) * nv;
  const rz = alavanca * 0.6;
  const braco: V = [-0.25 + 0.13 * Math.cos(rz), 0.3 + 0.13 * Math.sin(rz), 0];
  const flap = tampa * 1.15;
  const yBola = 0.02 + hAgua + 0.0;
  const piv: V = [0.2, 0.31, 0];
  const bola: V = [-0.1, Math.max(0.05, yBola), 0];
  const top = yb + H_CX;
  return (
    <group>
      <group position={[0, yb, zc]} scale={vis}>
        {/* paredes de vidro e contorno */}
        <mesh position={[0, H_CX / 2, 0]}><boxGeometry args={[W_CX, H_CX, d]} /><meshPhysicalMaterial color={vaso > 0.5 ? "#fbfbf8" : "#eaf3f7"} transparent opacity={lerp(0.2, 0.72, vaso)} roughness={0.12} depthWrite={false} /></mesh>
        <group position={[0, H_CX / 2, 0]}><Contorno t={[W_CX, H_CX, d]} cor={vaso > 0.5 ? "#c9ccd0" : "#8fa3ad"} /></group>
        <Caixa p={[0, 0.012, 0]} t={[W_CX, 0.024, d]} cor={POR} raio={0.004} rug={0.3} />
        {/* água */}
        {hAgua > 0.005 && <mesh position={[0, 0.024 + hAgua / 2, 0]}><boxGeometry args={[W_CX - 0.03, hAgua, d - 0.03]} /><meshPhysicalMaterial color={AGUA} transparent opacity={0.62} roughness={0.1} depthWrite={false} /></mesh>}
        {/* saída e tampa de borracha */}
        <mesh position={[0, 0.0, 0]}><cylinderGeometry args={[0.052, 0.052, 0.07, 20]} /><meshStandardMaterial color="#c3cad0" roughness={0.4} /></mesh>
        <group position={[0.07, 0.066, 0]} rotation={[0, 0, flap]}>
          <mesh position={[-0.07, 0.008, 0]}><cylinderGeometry args={[0.062, 0.062, 0.016, 22]} /><meshStandardMaterial color="#b02e2e" roughness={0.6} /></mesh>
        </group>
        {/* alavanca (cabo por fora, braço por dentro) e corrente */}
        <group position={[-0.25, 0.3, 0.0]} rotation={[0, 0, rz]}>
          <Caixa p={[-0.07, 0, 0]} t={[0.14, 0.022, 0.03]} cor="#cfd5da" met={0.8} rug={0.25} raio={0.008} />
          <mesh position={[-0.145, 0, 0]}><sphereGeometry args={[0.028, 12, 10]} /><meshStandardMaterial color="#e6ebee" metalness={0.7} roughness={0.25} /></mesh>
          <Caixa p={[0.07, 0, 0]} t={[0.14, 0.016, 0.02]} cor="#9aa3aa" met={0.7} rug={0.3} raio={0.005} />
        </group>
        <Liga a={braco} b={[0.0 + 0.03, 0.07 + flap * 0.06, 0]} w={0.007} cil cor="#8e969c" basico />
        {/* torneira de entrada com válvula, saindo da parede */}
        {torneira > 0.02 && (
          <group scale={suave(clamp01(torneira * 2))}>
            <Liga a={[0.2, 0.46, zc < 0 ? -0.47 : -0.3]} b={[0.2, 0.46, 0]} w={0.04} cil cor="#b6bec5" />
            <Liga a={[0.2, 0.46, 0]} b={[0.2, 0.34, 0]} w={0.04} cil cor="#b6bec5" />
            <Caixa p={[0.2, 0.49, -0.2]} t={[0.07, 0.07, 0.07]} cor={aberto > 0.5 ? "#2f7fd6" : "#d64a3a"} raio={0.012} />
            {aberto > 0.03 && Array.from({ length: 10 }).map((_, i) => {
              const c = (tAbs * 2.2 + i / 10) % 1;
              const y0 = 0.33, y1 = 0.025 + hAgua;
              return <mesh key={i} position={[0.2, lerp(y0, y1, c * c), 0]} scale={[0.014, 0.036, 0.014]}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#8fcaff" transparent opacity={aberto} /></mesh>;
            })}
          </group>
        )}
        {/* boia na ponta de uma haste */}
        {boia > 0.02 && (
          <group scale={suave(clamp01(boia * 2))}>
            <mesh position={piv}><sphereGeometry args={[0.02, 10, 8]} /><meshStandardMaterial color="#7d868d" metalness={0.6} roughness={0.3} /></mesh>
            <Liga a={piv} b={bola} w={0.012} cil cor="#9aa3aa" />
            <mesh position={[bola[0], bola[1] + 0.0, 0]}><sphereGeometry args={[0.052, 18, 14]} /><meshStandardMaterial color="#ff9a1f" roughness={0.35} /></mesh>
          </group>
        )}
        {/* transborda: lâmina de água na frente e pingos caindo */}
        {transborda > 0.02 && (
          <group>
            <mesh position={[0.12, H_CX - 0.04, d / 2 + 0.006]}><boxGeometry args={[0.26, 0.09 * transborda, 0.012]} /><meshBasicMaterial color={AGUA} transparent opacity={0.85} /></mesh>
            {Array.from({ length: 14 }).map((_, i) => {
              const c = (tAbs * 1.5 + i / 14) % 1;
              return <mesh key={i} position={[0.05 + (i % 5) * 0.045, H_CX - 0.06 - c * c * (yb + H_CX - 0.06 - 0.02), d / 2 + 0.03]} scale={[0.016, 0.05, 0.016]}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color={AGUA} transparent opacity={0.9 * transborda} /></mesh>;
            })}
          </group>
        )}
        {/* ladrão: tubo vertical com a boca no alto; o excesso entra nele e desce até a bacia */}
        {ladrao > 0.02 && (
          <group scale={[1, suave(ladrao), 1]}>
            <mesh position={[-0.17, 0.024 + (H_CX * 0.84) / 2, 0]}><cylinderGeometry args={[0.03, 0.03, H_CX * 0.84, 16, 1, true]} /><meshPhysicalMaterial color="#ffd23f" transparent opacity={0.8} side={THREE.DoubleSide} roughness={0.3} /></mesh>
            <mesh position={[-0.17, 0.024 + H_CX * 0.84, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.03, 0.008, 8, 18]} /><meshStandardMaterial color="#ffb300" /></mesh>
            {(nv > 0.86 || tubinhoAgua > 0.02) && Array.from({ length: 6 }).map((_, i) => { const c = (tAbs * 2.4 + i / 6) % 1; return <mesh key={i} position={[-0.17, H_CX * 0.84 - c * (H_CX * 0.84), 0]} scale={[0.014, 0.04, 0.014]}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color={AGUA} /></mesh>; })}
          </group>
        )}
        {/* tubinho de reposição: do corpo da válvula até a boca do ladrão, dentro da caixa */}
        {tubinho > 0.02 && torneira > 0.5 && ladrao > 0.5 && <TubinhoReposicao k={tubinho} agua={tubinhoAgua} t={tAbs} />}
        {/* tampa e botão da caixa acoplada */}
        {vaso > 0.02 && (
          <group scale={[1, vaso, 1]} position={[0, H_CX * (1 - vaso) + 0.0, 0]}>
            <Caixa p={[0, H_CX + 0.012, 0]} t={[W_CX + 0.02, 0.026, d + 0.02]} cor={POR} raio={0.01} rug={0.25} verniz={0.7} />
            <mesh position={[0, H_CX + 0.04, 0]}><cylinderGeometry args={[0.032, 0.036, 0.022, 20]} /><meshStandardMaterial color="#cfd5da" metalness={0.6} roughness={0.3} /></mesh>
          </group>
        )}
        {/* suportes na parede, até a caixa ser acoplada */}
        {vaso < 0.98 && [0.08, 0.3].map((y, i) => <Caixa key={i} p={[0, y, -d / 2 - (0.62 + zc - d / 2 + 0.0) / 2 + 0.0]} t={[0.05, 0.035, Math.max(0.01, 0.62 + zc - d / 2)]} cor="#9aa3aa" met={0.4} rug={0.4} raio={0.008} />)}
      </group>
      {/* descida: o cano da caixa até o buraco */}
      {descida > 0.02 && vaso < 0.98 && (
        <group>
          <mesh position={[0, (yb - 0.04 + 0.45) / 2, zc]} scale={[1, 1, 1]}>
            <cylinderGeometry args={[0.048, 0.048, Math.max(0.02, yb - 0.49), 18]} />
            <meshPhysicalMaterial color="#e1e8ec" transparent opacity={0.4 * descida} roughness={0.2} depthWrite={false} />
          </mesh>
          {descidaAgua > 0.02 && <mesh position={[0, (yb - 0.04 + 0.45) / 2, zc]}><cylinderGeometry args={[0.036, 0.036, Math.max(0.02, yb - 0.49), 14]} /><meshBasicMaterial color={AGUA} transparent opacity={0.9 * descidaAgua} /></mesh>}
          {descidaAgua > 0.02 && Array.from({ length: 6 }).map((_, i) => { const c = (tAbs * 2.5 + i / 6) % 1; return <mesh key={i} position={[0, lerp(yb - 0.05, 0.46, c), zc + 0.01]} scale={[0.02, 0.07, 0.02]}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#dff1ff" transparent opacity={descidaAgua} /></mesh>; })}
        </group>
      )}
      {/* nível do topo para halos/rótulos */}
      <group position={[0, top, zc]} />
    </group>
  );
};

/* ---------- a bacia de louça em raio-X (a curva em S fica dentro dela) ---------- */

const CAV: P2[] = [[0.12, 0.45], [0.17, 0.36], [0.23, 0.28], [0.29, 0.22], [0.34, 0.2], [0.42, 0.21], [0.49, 0.26], [0.56, 0.34], [0.62, 0.45]];
const SILU: P2[] = [[-0.25, 0], [0.38, 0], [0.52, 0.07], [0.62, 0.2], [0.68, 0.34], [0.69, 0.45], [-0.25, 0.45]];
const FORA: P2[] = [[-0.25, 0], [0.38, 0], [0.52, 0.07], [0.62, 0.2], [0.68, 0.34], [0.69, 0.45], ...CAV.slice().reverse(), [-0.25, 0.45]];
const forma = (pts: P2[]) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath(); return sh; };
const piscina = (L: number): P2[] | null => {
  const Lc = Math.min(L, 0.445);
  if (Lc <= 0.205) return null;
  let xl = CAV[0][0], xr = CAV[CAV.length - 1][0];
  for (let i = 0; i < CAV.length - 1; i++) if (CAV[i][1] >= Lc && CAV[i + 1][1] <= Lc) { const f = (CAV[i][1] - Lc) / Math.max(CAV[i][1] - CAV[i + 1][1], 1e-6); xl = lerp(CAV[i][0], CAV[i + 1][0], f); break; }
  for (let i = CAV.length - 1; i > 0; i--) if (CAV[i][1] >= Lc && CAV[i - 1][1] <= Lc) { const f = (CAV[i][1] - Lc) / Math.max(CAV[i][1] - CAV[i - 1][1], 1e-6); xr = lerp(CAV[i][0], CAV[i - 1][0], f); break; }
  return [[xl, Lc], ...CAV.filter((p) => p[1] < Lc), [xr, Lc]];
};
const noPerfil = (rear: boolean, u: number): P2 => {
  const a = rear ? CAV.slice(0, 5) : CAV.slice(4).reverse();
  const m = a.length - 1;
  const f = clamp01(u) * m;
  const i = Math.min(m - 1, Math.floor(f));
  return [lerp(a[i][0], a[i + 1][0], f - i), lerp(a[i][1], a[i + 1][1], f - i)];
};

/**
 * Bacia de louça de lado (a tampa de água, a curva em S, a saída e o aro). `k` aparece · `louca` opacidade (0,2 = raio-X) · `vaso` 0..1 opaca e com assento ·
 * `v` nível da água (ver `nivelY`) · `aro` água entrando pela borda · `remoinho` e `glub` a água sendo puxada.
 */
const Bacia: React.FC<{ k: number; louca: number; vaso: number; v: number; aro: number; remoinho: number; furo: number; glub: number; t: number }> = ({ k, louca, vaso, v, aro, remoinho, furo, glub, t }) => {
  const geoFora = useMemo(() => { const g = new THREE.ExtrudeGeometry(forma(FORA), { depth: 0.4, bevelEnabled: false }); g.translate(0, 0, ZP - 0.2); return g; }, []);
  const geoLinhas = useMemo(() => new THREE.EdgesGeometry(geoFora, 20), [geoFora]);
  const geoSilu = useMemo(() => { const g = new THREE.ShapeGeometry(forma(SILU)); g.translate(0, 0, ZP + 0.2 + 0.003); return g; }, []);
  const Lq = Math.round(nivelY(v) * 200) / 200;
  const geoPisc = useMemo(() => { const p = piscina(Lq); if (!p) return null; const g = new THREE.ExtrudeGeometry(forma(p), { depth: 0.3, bevelEnabled: false }); g.translate(0, 0, ZP - 0.15); return g; }, [Lq]);
  if (k <= 0.02) return null;
  const e = suave(clamp01(k));
  const op = Math.max(louca, vaso) * e;
  const solida = clamp01((Math.max(louca, vaso) - 0.3) / 0.7);
  const Ltopo = nivelY(v);
  return (
    <group scale={[1, e, 1]}>
      <mesh geometry={geoFora}><meshPhysicalMaterial color="#f4f8fa" transparent opacity={op} roughness={0.2} clearcoat={0.8} depthWrite={op > 0.9} side={THREE.DoubleSide} /></mesh>
      <lineSegments geometry={geoLinhas}><lineBasicMaterial color="#3d5566" transparent opacity={0.25 + 0.75 * (1 - solida)} /></lineSegments>
      <mesh geometry={geoSilu}><meshPhysicalMaterial color="#f7fafb" transparent opacity={lerp(0.07, 1, solida) * e} roughness={0.2} clearcoat={0.8} depthWrite={solida > 0.9} /></mesh>
      {geoPisc && <mesh geometry={geoPisc}><meshPhysicalMaterial color="#2f8df0" transparent opacity={0.88 * (1 - 0.6 * solida)} roughness={0.1} depthWrite={false} /></mesh>}
      {/* o canal do aro e a água descendo pelas paredes da bacia */}
      {aro > 0.02 && (
        <group>
          {[-0.17, 0.17].map((dz, j) => <mesh key={j} position={[0.31, 0.432, ZP + dz]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.014, 0.014, 0.62, 8]} /><meshBasicMaterial color="#bfe3ff" transparent opacity={0.9 * aro} /></mesh>)}
          {Array.from({ length: 30 }).map((_, i) => {
            const c = (t * 1.3 + i / 30) % 1;
            const rear = i % 2 === 0;
            const p = noPerfil(rear, c);
            return <mesh key={i} position={[p[0] + (rear ? 0.012 : -0.012), p[1], ZP + (rnd(i + 11) - 0.5) * 0.32]} scale={[0.017, 0.03, 0.017]}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color={i % 3 === 0 ? "#e6f4ff" : "#5fb0f2"} transparent opacity={aro} /></mesh>;
          })}
        </group>
      )}
      {/* a água do fundo da bacia é EMPURRADA para trás, em direção à boca da saída (nada de redemoinho para baixo) */}
      {remoinho > 0.02 && Array.from({ length: 24 }).map((_, i) => {
        const c = (t * 1.1 + i / 24) % 1;
        const x = lerp(0.56, 0.33, c);
        const y = Math.min(Ltopo, 0.43) > 0.24 ? lerp(0.27, 0.2, c) + 0.01 * Math.sin(c * 9 + i) : 0.2;
        return <mesh key={i} position={[x, y, ZP + (rnd(i + 5) - 0.5) * 0.2]} scale={[0.026, 0.014, 0.014]}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#e6f4ff" transparent opacity={remoinho * (1 - 0.6 * c)} /></mesh>;
      })}
      {/* o furinho (siphon jet) na frente do fundo da bacia, com o canalzinho que vem do aro e o esguicho apontado para a boca da saída */}
      {furo > 0.02 && (
        <group>
          <Tubo a={[0.63, 0.42, ZP]} b={[0.585, 0.3, ZP]} r={0.012} op={furo} />
          <Tubo a={[0.585, 0.3, ZP]} b={[0.485, 0.252, ZP]} r={0.012} op={furo} />
          <mesh position={[0.472, 0.246, ZP]} rotation={[0, 0, 0.5]}><cylinderGeometry args={[0.02, 0.02, 0.012, 14]} /><meshBasicMaterial color="#14202a" transparent opacity={furo} /></mesh>
          {Array.from({ length: 14 }).map((_, i) => {
            const c = (t * 2.2 + i / 14) % 1;
            return <mesh key={i} position={[lerp(0.46, 0.34, c), lerp(0.243, 0.205, c) + 0.008 * Math.sin(c * 6 + i), ZP + (rnd(i + 2) - 0.5) * 0.02]} scale={[0.024, 0.012, 0.012]}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color={i % 2 ? "#e6f4ff" : "#7cc4ff"} transparent opacity={furo * (1 - 0.5 * c)} /></mesh>;
          })}
        </group>
      )}
      {glub > 0.02 && Array.from({ length: 10 }).map((_, i) => {
        const c = (t * 1.5 + i / 10) % 1;
        return <mesh key={i} position={[0.34 + (rnd(i) - 0.5) * 0.12, 0.2 + c * 0.22, ZP + (rnd(i + 4) - 0.5) * 0.1]} scale={0.014 + 0.02 * rnd(i + 8)}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={glub * (1 - c * 0.5)} /></mesh>;
      })}
      {/* assento e tampa levantada: só depois da revelação */}
      {vaso > 0.02 && (
        <group scale={[1, vaso, 1]}>
          <Caixa p={[0.475, 0.465, ZP]} t={[0.43, 0.03, 0.38]} cor="#fffdf8" raio={0.012} rug={0.3} verniz={0.6} />
          <group position={[0.27, 0.48, ZP]} rotation={[0, 0, 1.62]}>
            <Caixa p={[0.21, 0, 0]} t={[0.42, 0.024, 0.36]} cor="#fffdf8" raio={0.01} rug={0.3} verniz={0.6} />
          </group>
        </group>
      )}
    </group>
  );
};

/* ---------- respiro (tubo de ventilação) e telhado ---------- */

const XR = 1.1; // posição do respiro
const ZR = -0.45;
const Tubo: React.FC<{ a: V; b: V; r: number; op?: number }> = ({ a, b, r, op = 1 }) => {
  if (op <= 0.02) return null;
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  if (len < 1e-3) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const m: V = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return (
    <group position={m} quaternion={q}>
      <mesh><cylinderGeometry args={[r * 1.12, r * 1.12, len, 12, 1, true]} /><meshBasicMaterial color="#2f3a42" side={THREE.BackSide} transparent opacity={0.8 * op} depthWrite={false} /></mesh>
      <mesh><cylinderGeometry args={[r, r, len, 12, 1, true]} /><meshPhysicalMaterial color="#e7eef1" transparent opacity={0.5 * op} roughness={0.15} clearcoat={0.6} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>
  );
};

const YTOPO = 3.75;
const Respiro: React.FC<{ k: number; ar: number; vis: number; t: number }> = ({ k, ar, vis, t }) => {
  if (k <= 0.02) return null;
  const topo = lerp(-1.55, YTOPO, suave(clamp01(k)));
  return (
    <group>
      <Tubo a={[XR, -1.55, ZP]} b={[XR, -1.55, ZR]} r={0.045} op={vis} />
      <Tubo a={[XR, -1.55, ZR]} b={[XR, Math.min(topo, 0.0), ZR]} r={0.045} op={vis} />
      <Tubo a={[XR, 0.0, ZR]} b={[XR, topo, ZR]} r={0.045} />
      {k > 0.97 && (
        <group>
          <mesh position={[XR, YTOPO + 0.04, ZR]}><coneGeometry args={[0.1, 0.12, 14]} /><meshStandardMaterial color="#8e969c" metalness={0.5} roughness={0.4} /></mesh>
          <Tubo a={[XR, YTOPO - 0.02, ZR]} b={[XR, YTOPO + 0.0, ZR]} r={0.05} />
        </group>
      )}
      {ar > 0.02 && Array.from({ length: 12 }).map((_, i) => {
        const c = (t * 0.55 + i / 12) % 1;
        const descida = YTOPO - 0.05, fundo = -1.55;
        const lV = descida - fundo, lH = XR - 0.3;
        const s = c * (lV + lH);
        const pos: V = s < lV ? [XR, descida - s, ZR] : [XR - (s - lV), fundo, ZP + (ZR - ZP) * Math.max(0, 1 - (s - lV) / 0.45)];
        const fade = s < lV ? 1 : Math.max(0, 1 - (s - lV) / lH);
        return <mesh key={i} position={pos} scale={0.04}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={ar * fade} /></mesh>;
      })}
      {ar > 0.02 && <Seta a={[XR + 0.3, YTOPO + 0.55, ZR + 0.1]} b={[XR + 0.05, YTOPO + 0.12, ZR + 0.1]} cor="#ffffff" w={0.03} op={ar} />}
    </group>
  );
};

const Telhado: React.FC<{ k: number; t: number }> = ({ k }) => {
  if (k <= 0.02) return null;
  return (
    <group scale={[1, suave(k), 1]} position={[0, 3.05 * (1 - suave(k)), 0]}>
      <Caixa p={[1.0, 3.12, -0.3]} t={[7, 0.14, 1.5]} cor="#b0452f" raio={0.02} rug={0.8} />
      {Array.from({ length: 14 }).map((_, i) => <Caixa key={i} p={[-2.4 + i * 0.5, 3.205, -0.3]} t={[0.04, 0.03, 1.5]} cor="#8e3524" raio={0.005} rug={0.8} />)}
    </group>
  );
};

/* ---------- globo ---------- */

const Globo: React.FC<{ k: number; t: number; nao: number }> = ({ k, t, nao }) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#2f7fd6"; g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#4fae4a";
    const blobs: [number, number, number, number][] = [[110, 90, 55, 40], [150, 160, 30, 50], [270, 100, 40, 55], [300, 170, 28, 40], [380, 80, 70, 35], [430, 175, 28, 20]];
    for (const [x, y, rx, ry] of blobs) { g.beginPath(); g.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#f4f8fb"; g.fillRect(0, 0, 512, 16); g.fillRect(0, 240, 512, 16);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  }, []);
  if (k <= 0.02) return null;
  return (
    <group position={[0.68, 1.1, 0.1]} scale={suave(k)}>
      <group rotation={[0, 0, 0.41]}><mesh rotation={[0, t * 1.3, 0]}><sphereGeometry args={[0.24, 32, 24]} /><meshStandardMaterial map={tex} roughness={0.6} /></mesh></group>
      {nao > 0.02 && [Math.PI / 4, -Math.PI / 4].map((a, i) => (
        <mesh key={i} position={[0, 0, 0.35]} rotation={[0, 0, a]} scale={[1, nao, 1]} renderOrder={15}><boxGeometry args={[0.07, 0.8, 0.03]} /><meshBasicMaterial color="#e5342d" depthTest={false} /></mesh>
      ))}
    </group>
  );
};

/* ---------- cenário ---------- */

const texturaAzulejo = () => {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = AZULEJO; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#a9c9d4"; g.lineWidth = 5;
  for (let i = 0; i <= 256; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.fillRect(i * 128 + 12, j * 128 + 12, 40, 14);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

const texturaPiso = () => {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c9c6bd"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#9f9b90"; g.lineWidth = 4;
  for (let i = 0; i <= 256; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

const Planta: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.1, 0.07, 0.24, 14]} /><meshStandardMaterial color="#c9714a" roughness={0.8} /></mesh>
    <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.012, 0.012, 0.52, 6]} /><meshStandardMaterial color="#3f8f3a" /></mesh>
    <mesh position={[0, 0.78, 0]}><sphereGeometry args={[0.06, 12, 10]} /><meshStandardMaterial color="#ff6aa0" roughness={0.6} /></mesh>
    {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos(i * 1.256) * 0.075, 0.78, Math.sin(i * 1.256) * 0.075]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.045, 10, 8]} /><meshStandardMaterial color="#ff9ec2" roughness={0.6} /></mesh>)}
    {[-1, 1].map((s) => <mesh key={s} position={[s * 0.12, 0.42, 0]} rotation={[0, 0, s * -0.7]} scale={[1, 0.3, 0.6]}><sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial color="#3f9a3a" /></mesh>)}
  </group>
);

const Banheiro: React.FC<{ piso: number; tAbs: number; vaso: number; flor: boolean; buraco: boolean }> = ({ piso, vaso, flor, buraco }) => {
  const tex = useMemo(texturaAzulejo, []);
  const texP = useMemo(texturaPiso, []);
  useMemo(() => { tex.repeat.set(36, 14); texP.repeat.set(12, 6); }, [tex, texP]);
  const vidro = piso; // 1 = raio-X
  const solo = vidro > 0.02;
  return (
    <group>
      {/* parede de azulejo */}
      <mesh position={[0.5, 1.6, -0.62]}><planeGeometry args={[9, 3.4]} /><meshStandardMaterial map={tex} roughness={0.35} /></mesh>
      <Caixa p={[0.5, 0.04, -0.6]} t={[9, 0.08, 0.04]} cor="#e7e1d4" raio={0.005} rug={0.5} />
      <Caixa p={[0.5, 1.12, -0.605]} t={[9, 0.05, 0.02]} cor="#4a9bb0" raio={0.003} rug={0.4} />
      {/* janela */}
      <group position={[-1.05, 1.62, -0.6]}>
        <Caixa p={[0, 0, 0]} t={[0.74, 0.9, 0.05]} cor="#f2f2ee" raio={0.01} rug={0.5} />
        <mesh position={[0, 0, 0.03]}><planeGeometry args={[0.6, 0.76]} /><meshBasicMaterial color="#a9dcf7" /></mesh>
        <mesh position={[0.1, 0.12, 0.032]}><circleGeometry args={[0.1, 20]} /><meshBasicMaterial color="#fff6c8" /></mesh>
        <Caixa p={[0, 0, 0.04]} t={[0.025, 0.76, 0.02]} cor="#f2f2ee" raio={0.004} />
        <Caixa p={[0, 0.0, 0.04]} t={[0.6, 0.025, 0.02]} cor="#f2f2ee" raio={0.004} />
        <Caixa p={[0, -0.47, 0.06]} t={[0.84, 0.04, 0.14]} cor="#f2f2ee" raio={0.01} />
      </group>
      {/* toalha, prateleira com frascos, lâmpada */}
      <group position={[1.35, 1.42, -0.6]}>
        <Caixa p={[0, 0.1, 0.05]} t={[0.5, 0.025, 0.04]} cor="#b6bec5" met={0.7} rug={0.3} raio={0.008} />
        <Caixa p={[0, -0.12, 0.06]} t={[0.4, 0.5, 0.025]} cor="#e8744a" raio={0.01} rug={0.9} />
        <Caixa p={[0, -0.04, 0.075]} t={[0.4, 0.04, 0.012]} cor="#f5c04a" raio={0.004} rug={0.9} />
      </group>
      <group position={[0.7, 1.95, -0.6]}>
        <Caixa p={[0, 0, 0.08]} t={[0.5, 0.025, 0.16]} cor="#c9a46a" raio={0.008} rug={0.7} />
        {[[-0.15, "#57b6e8", 0.11], [-0.04, "#f08a4a", 0.14], [0.08, "#7fd17a", 0.09], [0.18, "#e66aa0", 0.12]].map(([x, c, h], i) => (
          <mesh key={i} position={[x as number, (h as number) / 2 + 0.013, 0.09]}><cylinderGeometry args={[0.032, 0.036, h as number, 14]} /><meshStandardMaterial color={c as string} roughness={0.4} /></mesh>
        ))}
      </group>
      <group position={[-0.1, 2.45, -0.58]}>
        <Caixa p={[0, 0, 0.0]} t={[0.5, 0.05, 0.05]} cor="#c9ccd0" met={0.6} raio={0.01} />
        {[-0.18, 0, 0.18].map((x, i) => <mesh key={i} position={[x, -0.06, 0.04]}><sphereGeometry args={[0.06, 14, 10]} /><meshBasicMaterial color="#fff6d0" /></mesh>)}
      </group>
      {/* piso: laje de cerâmica e solo, em raio-X até a revelação */}
      <group>
        <mesh position={[0.5, 0.001, 0.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 4.3]} /><meshStandardMaterial map={texP} transparent opacity={lerp(1, 0.28, vidro)} depthWrite={vidro < 0.5} roughness={0.5} /></mesh>
        <mesh position={[0.5, -0.1, 0.49]}><boxGeometry args={[9, 0.2, 4.22]} /><meshStandardMaterial color="#d3d0c6" transparent opacity={lerp(1, 0.22, vidro)} depthWrite={vidro < 0.5} roughness={0.6} /></mesh>
        <group position={[0.5, -0.1, 0.49]}><Contorno t={[9, 0.2, 4.22]} cor="#7e8a90" op={0.7 * vidro} /></group>
        {solo && (
          <group>
            <mesh position={[0.5, -1.7, 0]}><boxGeometry args={[9, 2.9, 1.24]} /><meshStandardMaterial color="#8a6a4a" transparent opacity={0.34 * vidro} roughness={1} depthWrite={false} /></mesh>
            <group position={[0.5, -1.7, 0]}><Contorno t={[9, 2.9, 1.24]} cor="#5a4630" op={0.8 * vidro} /></group>
            <mesh position={[0.5, -1.7, -0.62]}><planeGeometry args={[9, 2.9]} /><meshBasicMaterial color="#4a3a2c" transparent opacity={vidro} /></mesh>
            {[-0.55, -1.1, -2.35].map((y, i) => <mesh key={i} position={[0.5, y, -0.615]}><planeGeometry args={[9, 0.1 + i * 0.03]} /><meshBasicMaterial color={i === 1 ? "#6a5440" : "#5d4a37"} transparent opacity={vidro} /></mesh>)}
            {Array.from({ length: 26 }).map((_, i) => {
              const x = -3.4 + rnd(i) * 8.6, y = -0.35 - rnd(i + 30) * 2.4;
              const sobre = x > -0.2 && x < 1.1 && y > -1.7;
              return sobre ? null : <mesh key={i} position={[x, y, -0.45 + rnd(i + 60) * 0.2]} scale={0.04 + rnd(i + 9) * 0.05}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#8d8a84" roughness={1} transparent opacity={vidro} /></mesh>;
            })}
            {/* a rede de esgoto da rua */}
            <mesh position={[4.9, -2.5, ZP]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.2, 2.6, 24, 1, true]} /><meshPhysicalMaterial color="#cfd7dc" transparent opacity={0.45 * vidro} side={THREE.DoubleSide} depthWrite={false} /></mesh>
          </group>
        )}
      </group>
      {/* tapete e plantinha */}
      <Caixa p={[-1.35, 0.012, 0.5]} t={[0.8, 0.024, 0.5]} cor="#7cc5d6" raio={0.01} rug={1} op={lerp(1, 0.6, vidro)} />
      {(flor || vaso > 0.5) && <Planta x={-1.6} z={0.1} />}
      {/* buraco no piso */}
      {vaso < 0.98 && buraco && (
        <group position={[0, 0.004, ZP]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.1, 0.17, 28]} /><meshStandardMaterial color="#8a949b" metalness={0.5} roughness={0.4} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.1, 24]} /><meshBasicMaterial color="#14181b" transparent opacity={0.65} /></mesh>
        </group>
      )}
    </group>
  );
};

/* ---------- vinheta de 1596 (palco em x = 60) ---------- */

const Historia: React.FC<{ t: number }> = ({ t }) => (
  <group position={[60, 0, 0]}>
    <mesh position={[0, 1.6, -1.4]}><planeGeometry args={[9, 3.4]} /><meshStandardMaterial color="#6e1f2b" roughness={0.9} /></mesh>
    {[-2.6, -0.9, 0.9, 2.6].map((x, i) => <Caixa key={i} p={[x, 1.6, -1.38]} t={[0.18, 3.4, 0.06]} cor="#d9b14a" met={0.5} rug={0.4} raio={0.02} />)}
    {[0.2, 3.2].map((y, i) => <Caixa key={i} p={[0, y, -1.36]} t={[9, 0.12, 0.08]} cor="#d9b14a" met={0.5} rug={0.4} raio={0.02} />)}
    <mesh position={[0, 0, 0.4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 4]} /><meshStandardMaterial color="#5a3a24" roughness={0.7} /></mesh>
    {Array.from({ length: 9 }).map((_, i) => <mesh key={i} position={[-3.6 + i, 0.002, 0.4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.03, 4]} /><meshBasicMaterial color="#3d2616" /></mesh>)}
    {/* mesa com a primeira descarga em miniatura */}
    <Caixa p={[0, 0.78, 0.3]} t={[1.1, 0.06, 0.6]} cor="#8a5a34" raio={0.015} rug={0.6} />
    {[[-0.5, 0.25], [0.5, 0.25], [-0.5, 0.55], [0.5, 0.55]].map(([x, z], i) => <Caixa key={i} p={[x, 0.38, z]} t={[0.07, 0.76, 0.07]} cor="#6f4526" raio={0.01} />)}
    <group position={[0, 0.81, 0.3]} scale={1.15}>
      <Caixa p={[0, 0.19, 0]} t={[0.46, 0.38, 0.26]} cor="#d9e9f0" op={0.55} raio={0.01} rug={0.2} />
      <Caixa p={[0, 0.1, 0]} t={[0.42, 0.18, 0.22]} cor={AGUA} op={0.7} raio={0.005} />
      <mesh position={[0, -0.12, 0]}><cylinderGeometry args={[0.035, 0.035, 0.25, 14]} /><meshStandardMaterial color="#b6bec5" metalness={0.6} roughness={0.3} /></mesh>
      <Caixa p={[-0.31, 0.28, 0]} t={[0.14, 0.03, 0.03]} cor="#cfd5da" met={0.8} raio={0.008} />
    </group>
    {[-1.9, 1.9].map((x, i) => (
      <group key={i} position={[x, 0, -1.1]}>
        <Caixa p={[0, 0.7, 0]} t={[0.06, 1.4, 0.06]} cor="#6f4526" raio={0.01} />
        <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.04, 0.04, 0.18, 10]} /><meshStandardMaterial color="#f4efe2" /></mesh>
        <mesh position={[0, 1.66, 0]} scale={[0.6, 1.2, 0.6]}><sphereGeometry args={[0.05, 10, 8]} /><meshBasicMaterial color="#ffcf4a" /></mesh>
        <Halo p={[0, 1.66, 0.1]} r={0.5} cor="#ffb347" op={0.4 + 0.1 * Math.sin(t * 9 + i)} />
      </group>
    ))}
  </group>
);

/* ---------- cena ---------- */

type EtiqDef = { texto: string; para: V; off: [number, number]; cor?: string };

/* ---------- mato, quintal, mosquitos, chuva ---------- */

const Mosquito: React.FC<{ p: V; t: number; i: number; aplauso: number }> = ({ p, t, i, aplauso }) => {
  const asa = Math.sin(t * 70 + i) * 0.7;
  const ap = aplauso > 0.02 ? Math.abs(Math.sin(t * 9 + i)) * 0.07 : 0.1;
  return (
    <group position={p}>
      <mesh scale={[1, 0.8, 1.4]}><sphereGeometry args={[0.06, 12, 10]} /><meshStandardMaterial color="#2a2d33" roughness={0.6} /></mesh>
      <mesh position={[0, 0.02, 0.09]}><sphereGeometry args={[0.035, 10, 8]} /><meshStandardMaterial color="#3a3f47" /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.08, 0.06, -0.01]} rotation={[0, 0, s * (0.6 + asa * 0.5)]} scale={[1, 0.15, 0.6]}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color="#e9f4ff" transparent opacity={0.7} /></mesh>
          <mesh position={[s * ap, -0.01, 0.09]}><sphereGeometry args={[0.022, 8, 6]} /><meshBasicMaterial color="#ffd23f" /></mesh>
        </group>
      ))}
    </group>
  );
};

const Mata: React.FC<{ t: number; aplauso: number; dia: number }> = ({ t, aplauso, dia }) => {
  const arvores = useMemo(() => Array.from({ length: 46 }).map((_, i) => {
    const x = -9 + rnd(i) * 18, z = -7 + rnd(i + 50) * 5.4;
    return { x, z, h: 2.2 + rnd(i + 90) * 2.2, i };
  }).filter((a) => !(Math.abs(a.x) < 1.2 && a.z > -2.2)), []);
  const cor = dia > 0.5 ? ["#2f7a3a", "#3b8a45", "#276a32"] : ["#1c3a2a", "#22452f", "#183223"];
  return (
    <group>
      <mesh position={[0, 0, -1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 20]} /><meshStandardMaterial color={dia > 0.5 ? "#5aa14a" : "#2f5a35"} roughness={1} /></mesh>
      <mesh position={[0, 0.005, 1.0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.7, 14]} /><meshStandardMaterial color="#b89466" roughness={1} /></mesh>
      {arvores.map(({ x, z, h, i }) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, h * 0.25, 0]}><cylinderGeometry args={[0.14, 0.2, h * 0.5, 8]} /><meshStandardMaterial color="#6b4a2a" roughness={1} /></mesh>
          <mesh position={[0, h * 0.62, 0]}><coneGeometry args={[0.9 + rnd(i) * 0.4, h * 0.7, 8]} /><meshStandardMaterial color={cor[i % 3]} roughness={0.9} /></mesh>
          <mesh position={[0, h * 0.95, 0]}><coneGeometry args={[0.7 + rnd(i + 3) * 0.3, h * 0.55, 8]} /><meshStandardMaterial color={cor[(i + 1) % 3]} roughness={0.9} /></mesh>
        </group>
      ))}
      {/* a moita escolhida */}
      <group position={[1.9, 0, 0.1]}>
        {[[0, 0.4, 0, 0.55], [0.5, 0.3, 0.2, 0.42], [-0.45, 0.32, 0.15, 0.45], [0.1, 0.35, -0.35, 0.5]].map(([x, y, z, r], i) => <mesh key={i} position={[x, y, z]}><sphereGeometry args={[r, 12, 10]} /><meshStandardMaterial color={["#3b8a45", "#2f7a3a", "#46984f", "#2f7a3a"][i]} roughness={1} /></mesh>)}
      </group>
      {[[-3, 0, -0.5], [3.5, 0, -0.8], [-2.2, 0, 1.5]].map(([x, y, z], i) => <mesh key={i} position={[x, 0.25, z]}><sphereGeometry args={[0.4, 10, 8]} /><meshStandardMaterial color="#2f7a3a" roughness={1} /></mesh>)}
      {/* roda de mosquitos */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + t * 0.9;
        return <Mosquito key={i} i={i} t={t} aplauso={aplauso} p={[Math.cos(a) * 1.25 - 0.1, 1.55 + 0.1 * Math.sin(t * 4 + i), Math.sin(a) * 0.9 + 0.3]} />;
      })}
    </group>
  );
};

const Chuva: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  if (k <= 0.02) return null;
  return (
    <group>
      {Array.from({ length: 140 }).map((_, i) => {
        const x = -5 + rnd(i) * 10, z = -2 + rnd(i + 200) * 6;
        const c = (t * 2.4 + rnd(i + 400)) % 1;
        return <mesh key={i} position={[x - c * 0.3, 4.2 - c * 4.2, z]} rotation={[0, 0, 0.12]} scale={[0.008, 0.28, 0.008]}><cylinderGeometry args={[1, 1, 1, 4]} /><meshBasicMaterial color="#bfe0ff" transparent opacity={0.7 * k} /></mesh>;
      })}
    </group>
  );
};

const Quintal: React.FC<{ t: number; luz: number }> = ({ t, luz }) => (
  <group>
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 20]} /><meshStandardMaterial color="#3b5a3a" roughness={1} /></mesh>
    <mesh position={[-0.2, 0.005, 1.4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[6.4, 1.1]} /><meshStandardMaterial color="#8a6a4a" roughness={1} /></mesh>
    {/* a casa */}
    <group position={[-2.6, 0, -2.4]}>
      <Caixa p={[0, 1.05, 0]} t={[3.4, 2.1, 2.2]} cor="#e8dcc0" raio={0.03} />
      <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[2.6, 1.0, 4]} /><meshStandardMaterial color="#b0452f" roughness={0.8} /></mesh>
      <Caixa p={[-0.6, 0.8, 1.12]} t={[0.7, 1.6, 0.05]} cor="#6a4a32" raio={0.01} />
      <Caixa p={[0.8, 1.2, 1.12]} t={[0.7, 0.6, 0.05]} cor="#ffe9a8" raio={0.01} />
      <Halo p={[0.8, 1.2, 1.4]} r={1.0} cor="#ffd88a" op={0.5 * (0.4 + 0.6 * luz)} />
    </group>
    {/* o buraco e a casinha de tábuas, longe da casa */}
    <group position={[2.8, 0, -0.6]}>
      <mesh position={[0, 0.005, 0.0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.55, 20]} /><meshBasicMaterial color="#1b140e" /></mesh>
      {[[-0.5, 0, 0.55, 0], [0.5, 0, 0.55, 0], [0, -0.5, 0.55, 1], [0, 0.5, 0.55, 1]].map(([x, z, h, rot], i) => <Caixa key={i} p={[x, 1.0, z]} t={rot ? [1.1, 2.0, 0.07] : [0.07, 2.0, 1.1]} cor="#9a7a52" raio={0.01} />)}
      <Caixa p={[0, 2.05, 0]} t={[1.3, 0.1, 1.3]} cor="#6f4526" raio={0.02} />
      <Caixa p={[0, 0.9, 0.55]} t={[0.55, 1.6, 0.05]} cor="#7a5a38" raio={0.01} r={[0, -0.5, 0]} />
    </group>
    {[[-6, 0, -4], [5.5, 0, -3.5], [6.5, 0, 0.5]].map(([x, y, z], i) => (
      <group key={i} position={[x, y, z]}>
        <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.14, 0.2, 2.0, 8]} /><meshStandardMaterial color="#5a3d22" /></mesh>
        <mesh position={[0, 2.5, 0]}><sphereGeometry args={[1.1, 10, 8]} /><meshStandardMaterial color="#244a2c" roughness={1} /></mesh>
      </group>
    ))}
  </group>
);

const BanheiroCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const n = (k: string, pad = 0) => {
    const v = cena[k];
    if (Array.isArray(v)) return chaves(v as [number, number][], p);
    return valor(n0(v), p, pad);
  };
  const historia = cena.historia === true;
  const gente = (cena.gente as GenteE[] | undefined) ?? [];
  const piso = n("piso", 1);
  const bacia = n("bacia", 0);
  const info = useMemo(() => montaCano(bacia > 0.02), [bacia > 0.02]);
  const tampaAgua = n("tampaAgua", 0);
  const sifao = n("sifao", 0);
  const cauda = n("cauda", 0);
  const puxa = n("puxa", 0);
  const vaso = n("vaso", 0);
  const caixa = n("caixa", 0);
  const nivelCaixa = n("nivelCaixa", 1);
  const alavanca = n("alavanca", 0);
  const tampa = n("tampaBorracha", 0);
  const torneira = n("torneira", 0);
  const boia = n("boia", 0);
  const transborda = n("transborda", 0);
  const descida = n("descida", 0);
  const descidaAgua = n("descidaAgua", 0);
  const tubinho = n("tubinho", 0);
  const escoa = n("escoa", 0);
  const glub = n("glub", 0);
  const pipeVis = piso * (1 - vaso * 0.0) * (vaso > 0.3 ? clamp01(1 - (vaso - 0.3) / 0.4) : 1);
  const yb = lerp(0.95, 0.45, suave(vaso));
  const zc = ZP;
  const d = lerp(0.3, 0.2, suave(vaso));
  const S = n("etiqS", 1);
  const Kt = n("etiqK", 1);
  const destaque = n("destaque", 0);
  const pulsa = 0.65 + 0.35 * Math.sin(tEpisodio * 8);
  const topCrest = info.pts[info.iTop];

  const et: Record<string, EtiqDef> = {
    cano: { texto: "CANO", para: [0.0, -0.55, ZP + 0.1], off: [0.85, 0.25], cor: "#ffd9a0" },
    ladrao: { texto: "LADRÃO", para: [-0.17, yb + 0.3, zc + d / 2], off: [-0.8, 0.6], cor: "#ffd23f" },
    curva: { texto: "CURVA EM S", para: [0.2, 0.1, ZP + 0.1], off: [0.75, -0.55], cor: "#ffd9a0" },
    agua: { texto: "ÁGUA", para: [0.2, 0.16, ZP + 0.1], off: [-0.7, -0.45], cor: "#9fdcff" },
    respiro: { texto: "RESPIRO", para: [XR, 1.3, ZR + 0.05], off: [0.55, 0.0], cor: "#ffffff" },
    caixa: { texto: "CAIXA", para: [0.2, yb + 0.3, zc + d / 2], off: [0.75, 0.5], cor: "#cfeaf5" },
    tampa: { texto: "TAMPA", para: [0.0, yb + 0.07, zc + 0.05], off: [0.8, -0.5], cor: "#ff8f84" },
    boia: { texto: "BOIA", para: [-0.1, yb + 0.05 + (H_CX - 0.06) * clamp01(nivelCaixa), zc + d / 2], off: [0.8, 0.5], cor: "#ffb347" },
    sifao: { texto: "SIFÃO", para: [0.07, 0.34, ZP + 0.1], off: [0.85, 0.3], cor: "#ffd23f" },
    tubinho: { texto: "TUBINHO", para: [0.02, yb + 0.3, zc + d / 2], off: [0.75, 0.45], cor: "#ffd23f" },
    terra: { texto: "TERRA?", para: [0.68, 1.1, 0.1], off: [-0.1, 0.5], cor: "#9fdcff" },
    jato: { texto: "JATO", para: [0.47, 0.25, ZP + 0.1], off: [0.55, 0.45], cor: "#9fdcff" },
    jatos: { texto: "JATOS", para: [0.17, 0.42, ZP + 0.15], off: [0.3, 0.3], cor: "#9fdcff" },
    vasoCaixa: { texto: "CAIXA", para: [0.0, 0.7, ZP + 0.12], off: [0.8, 0.62], cor: "#cfeaf5" },
    vasoBoia: { texto: "BOIA", para: [-0.1, 0.78, ZP + 0.12], off: [0.85, 0.34], cor: "#ffb347" },
    vasoSifao: { texto: "SIFÃO", para: [0.07, 0.3, ZP + 0.25], off: [0.85, -0.15], cor: "#ffd23f" },
  };
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, dd] = e.split("@");
    const [ini, fimE] = (dd ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fimE === undefined || p <= fimE) };
  }).filter((x) => x.ok);

  const interroga = n("interroga");
  const lampada = n("lampada");
  const mata = cena.mata === true;
  const quintal = cena.quintal === true;
  const luz = n("luz", 1);
  const flash = n("flash");
  const cach = n("cachoeira");
  const fora = mata || quintal;

  return (
    <group>
      <hemisphereLight args={["#f3fbff", "#8a8070", (1.05 * (0.25 + 0.75 * luz)) + 1.6 * flash]} />
      <directionalLight position={[-2.5, 6, 6]} intensity={1.7 * (0.25 + 0.75 * luz) + 1.5 * flash} color="#fff3dc" />
      {mata && <Mata t={tEpisodio} aplauso={n("aplauso")} dia={1} />}
      {quintal && (<><Quintal t={tEpisodio} luz={luz} /><Chuva t={tEpisodio} k={n("chuva")} /><Raio p={[-0.5, 3.6, -4.5]} k={flash > 0.3 ? 1 : 0} t={tEpisodio} h={4.5} /></>)}
      {fora ? null : historia ? <Historia t={tEpisodio} /> : (
        <>
          <Banheiro piso={piso} tAbs={tEpisodio} vaso={vaso} flor={cena.flor === true} buraco={n("buraco", 1) > 0.5 && bacia < 0.3} />
          <Cano info={info} vis={pipeVis} />
          <AguaParada info={info} v={tampaAgua} sifao={sifao} cauda={cauda} vis={pipeVis} />
          <Gotas info={info} t={tEpisodio} k={escoa * pipeVis} vel={n("escoaVel", 0.9)} n={26} ini={info.bacia ? info.iTop : 0} />
          {puxa > 0.02 && <Gotas info={info} t={tEpisodio} k={puxa * pipeVis} vel={1.4} ini={info.iTop} fim={info.iFim} n={16} acel={1.2 * puxa} />}
          {info.bacia && n("empurra") > 0.02 && <Gotas info={info} t={tEpisodio} k={n("empurra") * pipeVis} vel={0.9} ini={0} fim={info.iTop} n={14} />}
          <ArNoCano info={info} t={tEpisodio} k={n("arCano") * pipeVis} barra={n("arBarra")} />
          <Cheiro t={tEpisodio} k={n("cheiro")} x={info.bacia ? 0.38 : 0} y={info.bacia ? 0.34 : 0.12} />
          <Respiro k={n("respiro")} ar={n("arResp")} vis={pipeVis} t={tEpisodio} />
          <Telhado k={n("telhado")} t={tEpisodio} />
          {n("setas") > 0.02 && pipeVis > 0.02 && (
            <group>
              <Seta a={[0.0, -0.3, ZP + 0.2]} b={[0.0, -0.9, ZP + 0.2]} cor="#ffffff" w={0.022} op={n("setas")} />
              {info.bacia && <Seta a={[0.3, 0.07, ZP + 0.2]} b={[0.12, 0.07, ZP + 0.2]} cor="#ffffff" w={0.016} op={n("setas")} />}
              {info.bacia && n("furo") > 0.02 && <Seta a={[0.46, 0.33, ZP + 0.2]} b={[0.36, 0.27, ZP + 0.2]} cor="#ffffff" w={0.012} op={n("setas")} />}
              <Seta a={[0.5, -1.72, ZP + 0.2]} b={[1.5, -1.72, ZP + 0.2]} cor="#ffffff" w={0.022} op={n("setas")} />
            </group>
          )}
          {glub > 0.02 && <Texto3D texto="glub" p={[0.78, 0.62, ZP + 0.3]} h={0.16} cor="#ffffff" escala={glub} />}
          <CaixaDagua yb={yb} zc={zc} d={d} nivel={nivelCaixa} alavanca={alavanca} tampa={tampa} torneira={torneira} boia={boia} transborda={transborda} vaso={vaso} tAbs={tEpisodio} vis={caixa} descida={descida} descidaAgua={descidaAgua} ladrao={n("ladrao")} falha={n("falha")} tubinho={tubinho} tubinhoAgua={n("tubinhoAgua")} />
          {cena.baldeVazio !== true && n("baldeX", -99) > -50 && <Balde p={[n("baldeX"), n("baldeY", 0.85), n("baldeZ", 0.1)]} inc={n("baldeInc")} agua={n("baldeAgua", 1)} jato={n("jato")} t={tEpisodio} info={info} alvo={[n("alvoX", 0), n("alvoY", 0.08)]} />}
          {n("baldeTampa") > 0.5 && <mesh position={[n("baldeX"), n("baldeY", 0.85) + 0.16, n("baldeZ", 0.1)]}><cylinderGeometry args={[0.165, 0.165, 0.025, 24]} /><meshStandardMaterial color="#b83a28" roughness={0.5} /></mesh>}
          <Bacia k={Math.max(vaso, bacia)} louca={n("louca", 0.3)} vaso={vaso} v={tampaAgua} aro={n("aro")} remoinho={n("remoinho")} furo={n("furo")} glub={glub} t={tEpisodio} />
          <Globo k={n("terra")} t={tEpisodio} nao={n("nao")} />
          {destaque > 0.02 && (
            <group>
              <Halo p={[0, yb + 0.2, zc + d / 2 + 0.1]} r={0.3} cor="#ffd23f" op={0.2 * destaque * pulsa} />
              <Halo p={[-0.1, yb + 0.15, zc + d / 2 + 0.1]} r={0.15} cor="#ff9a1f" op={0.35 * destaque * (1.3 - pulsa)} />
              <Halo p={[0, 0.16, ZP + 0.35]} r={0.25} cor="#9fdcff" op={0.2 * destaque * pulsa} />
            </group>
          )}
        </>
      )}
      {cach > 0.02 && !fora && (
        <group position={[-1.05, 1.62, -0.55]} scale={suave(cach)}>
          <mesh position={[0, 0, 0]}><planeGeometry args={[0.62, 0.78]} /><meshBasicMaterial color="#8fcf7a" /></mesh>
          <mesh position={[0, 0.0, 0.01]}><planeGeometry args={[0.16, 0.78]} /><meshBasicMaterial color="#9fd8ff" /></mesh>
          {Array.from({ length: 10 }).map((_, i) => { const c = (tEpisodio * 1.4 + i / 10) % 1; return <mesh key={i} position={[(rnd(i) - 0.5) * 0.12, 0.38 - c * 0.76, 0.02]} scale={[0.018, 0.07, 0.01]}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>; })}
        </group>
      )}
      {interroga > 0.02 && <Texto3D texto="?" p={[0.68, 1.3 + 0.5 * suave(interroga), 0.2]} h={0.9} escala={suave(clamp01(interroga * 2)) * (1 - 0.9 * lampada)} />}
      {lampada > 0.02 && (
        <group position={[0.68, 1.75, 0.2]} scale={suave(lampada)}>
          <mesh><sphereGeometry args={[0.2, 24, 18]} /><meshBasicMaterial color="#ffe36a" /></mesh>
          <mesh position={[0, -0.24, 0]}><cylinderGeometry args={[0.09, 0.07, 0.12, 14]} /><meshStandardMaterial color="#9aa3ab" metalness={0.6} roughness={0.3} /></mesh>
          <Halo p={[0, 0, 0.1]} r={0.6} cor="#ffe36a" op={0.55 * pulsa} />
        </group>
      )}
      {etiqs.map(({ c, ini }) => {
        const dd = et[c];
        const de: V = [dd.para[0] + dd.off[0] * S, dd.para[1] + dd.off[1] * S, dd.para[2] + 0.2];
        return <Etiqueta key={c} texto={dd.texto} de={de} para={dd.para} k={Kt} cor={dd.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
      {gente.map((gd, i) => <Pessoa key={i} g={gd} p={p} t={t} tAbs={tEpisodio} />)}
      <group position={topCrest ? [0, 0, 0] : [0, 0, 0]} />
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 50) => ({ pos, alvo, fov });

export const banheiro: Cenario3D = {
  Cena: BanheiroCena,
  padrao: "geral",
  fundo: (cena) => (cena.historia === true ? "#2a1218" : cena.mata === true ? "#a8d8f0" : cena.quintal === true ? "#1b2238" : "#dfeaf0"),
  luzPropria: true,
  cameras: { geral: c([0.3, 0.7, 5.2], [0.1, 0.4, 0], 50) },
};
