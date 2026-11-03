import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { clamp01, lerp, lerp3, suave, valor } from "../../../src/v3d/anima";
import { Cenario3D, Cenario3DProps, V3, Valor } from "../../../src/v3d/tipos";
import { Etiqueta, Fluxo, Fumaca, Halo, Liga, Seta, Texto3D, V } from "./cozinha-base";
import { Ambiente, CY, Fogao, Gente, GenteDef, H_PANELA, POT_ESC, POT_POS, R_PANELA, RelogioParede, Z_PAREDE } from "./cozinha-fogao";
import { Chama, mostradorTex } from "./cozinha-forno";
import {
  Aluminio, Aneis, AZUL, CaixaMetal, CH, Corpo, CX0, CX1, CZ0, CZ1, Faiscas, FatiaCorte, FioTomada, GarfoMesa, Gotinhas, Inducao, LAR,
  Compartimento, Lupa, LinhasZoom, MapaCima, Magnetron, Molecula, OndaSeno, Porta, Prato, PX, PY, PZ, Regua3, SetaCampo, TermoLupa, Tigela,
} from "./microondas-pecas";

// Micro-ondas do episódio 10 (como esquentar comida sem fogo), na mesma cozinha EM ESCALA REAL do episódio 9 (Zeca ~1,7 m, bancada 0,9 m,
// fogão à esquerda com a panela de sopa, caixa de metal de ~40 cm na bancada, aparelho final de ~52 cm). Vista em CORTE (z = 0 é de vidro).
// Moléculas, ondas, furinhos e o corte da fatia aparecem em LUPAS (círculos de zoom), nunca do tamanho da cozinha.
// REGRA: o nome do aparelho só aparece na batida 15 (rótulo/cartão); antes disso as peças têm só o nome da peça.
// Campos da cena (número ou { de, para, ini, fim }; booleanos com true):
//   fogão     fogo 0..1 · panela 0..1 · queima 0..1 (o fundo escurece) · calor 0..1 (até onde o calor entrou, de fora para dentro) · fumaca 0..1
//             setasCalor 0..1 (da chama para a panela, da panela para a sopa, de fora para dentro) · relogio: true · relogioVel (voltas/s)
//   lupa      lupa 0..1 · lupaX, lupaY, lupaR (m) · lupaModo "agua" | "mol" | "giro" | "onda" | "tela" · zoomDe [x,y,z] (linhas do zoom)
//             lasanha 0..1 (a fatia de lasanha entra na lupa) · agua 0..1 (gotinhas azuis) · sinais 0..1 (+ nos átomos pequenos e − no grande)
//             gira 0..1 (as moléculas giram juntas) · quente 0..1 (azul → laranja) · termoL 0..1 (termômetro da lupa) · campo 0..1 (a seta que troca de lado)
//             onda 0..1 (a onda senoidal azul) · grade 0..1 (a tela de furos com a onda parando) · bloqueio 0..1 (onda larga bate e para)
//   tubo      tubo 0..1 (magnetron na bancada) · aneis 0..1 (anéis de onda) · espalha 0..1 (ondas grandes pela cozinha) · fio 0..1 (fio na tomada)
//   caixa     caixa 0..1 (as paredes de metal fecham) · frente 0..1 (placa lisa na frente: fechada, não se vê dentro) · tela 0..1 (porta com a tela de furinhos)
//             abre 0..1 (a porta abre) · corpo 0..1 (casca preta, painel com display e botões) · tigela 0..1 · prato 0..1 · gira 0..1 (o prato gira)
//             ondasDentro 0..1 (as ondas batem nas paredes e voltam) · vapor 0..1 · aquece 0..1 (a sopa na tigela esquenta) · tela texto: `visor`
//   mapa      mapa 0..1 (a caixa vista de cima, em xadrez quente/frio) · mapaMix 0..1 (o prato gira e as manchas se misturam) · mapaX, mapaY, mapaEsc
//   fatia     fatia 0..1 (a fatia de lasanha dentro da caixa) · corte 0..1 (o corte da fatia em primeiro plano) · pen (cm de calor entrando) · regua 0..1
//   metal     garfoAr 0..1 (o garfo no ar, na mão do Zeca, diante da porta aberta) · garfo 0..1 · faisca 0..1 · aluminio 0..1 · fogoAl 0..1 (o alumínio pega fogo)
//   fim       indu 0..1 (silhueta do fogão de indução) · interroga 0..1 · destaque 0..1 (as quatro peças piscam)
//   rota      paradas de câmera { p, pos, alvo, fov } · gente: lista de { id: "zeca", x, y, z, rot, acao | [[ate, acao, exp]…], exp, incl, braco, segura "garfo" }
//   etiq      "chave@ini-fim" · etiqS (afasta o texto) · etiqK (tamanho) · etiqYmax (limite de cima, ndc)
//             chaves: fundo, meio, agua, molecula, magnetron, caixa, onda, furo, quente, frio, prato, mMagnetron, mCaixa, mTela, mPrato

const n0 = (v: unknown) => v as Valor;
type Parada = { p: number; pos: V3; alvo: V3; fov?: number };

const RotaCamera: React.FC<{ rota: Parada[]; p: number }> = ({ rota, p }) => {
  const { camera } = useThree();
  let i = 0;
  while (i + 1 < rota.length && rota[i + 1].p <= p) i++;
  const a = rota[i];
  const b = rota[Math.min(i + 1, rota.length - 1)];
  const k = b.p > a.p ? suave(clamp01((p - a.p) / (b.p - a.p))) : 0;
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(...lerp3(a.pos, b.pos, k));
  cam.fov = lerp(a.fov ?? 50, b.fov ?? 50, k);
  cam.updateProjectionMatrix();
  cam.lookAt(new THREE.Vector3(...lerp3(a.alvo, b.alvo, k)));
  return null;
};

/* ---------- panela de sopa: o fundo queima, o meio fica frio ---------- */

const FRAG = `
varying vec2 vUv;
uniform float uQ;
uniform float uH;
void main(){
  float edge = min(vUv.x, 1.0 - vUv.x);
  float v = vUv.y;
  float hot = max(1.0 - smoothstep(0.0, uH, edge * 1.6), 1.0 - smoothstep(0.0, uH * 0.8, v));
  vec3 sopa = vec3(0.86,0.38,0.15);
  vec3 c = mix(mix(sopa, vec3(0.62,0.68,0.76), 0.55), mix(sopa, vec3(1.0,0.55,0.12), 0.5), hot);
  float fundo = (1.0 - smoothstep(0.0, 0.22, v)) * uQ;
  c = mix(c, vec3(0.10,0.06,0.04), fundo);
  gl_FragColor = vec4(c, 1.0);
}`;
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

const PanelaSopa: React.FC<{ k: number; queima: number; calor: number }> = ({ k, queima, calor }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uQ: { value: 0 }, uH: { value: 0.1 } } }), []);
  mat.uniforms.uQ.value = queima;
  mat.uniforms.uH.value = 0.08 + 0.4 * calor;
  if (k <= 0.01) return null;
  const R = R_PANELA;
  const H = H_PANELA;
  const nivel = 0.2;
  return (
    <group scale={k}>
      <mesh position={[0, H / 2, 0]}><cylinderGeometry args={[R, R * 0.9, H, 28, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#9aa1ab" metalness={0.7} roughness={0.35} side={THREE.DoubleSide} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}><circleGeometry args={[R * 0.9, 24, 0, Math.PI]} /><meshStandardMaterial color="#4a4743" metalness={0.5} roughness={0.5} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, nivel / 2 + 0.01, 0.002]} material={mat}><planeGeometry args={[R * 1.84, nivel]} /></mesh>
      <mesh position={[0, nivel + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[R * 0.93, 24, 0, Math.PI]} /><meshStandardMaterial color="#d6652b" roughness={0.4} /></mesh>
      <mesh position={[0, H, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[R, 0.02, 8, 28, Math.PI]} /><meshStandardMaterial color="#c9cfd6" metalness={0.8} roughness={0.25} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (R + 0.1), H - 0.06, 0]}><boxGeometry args={[0.22, 0.05, 0.07]} /><meshStandardMaterial color="#2a2d33" roughness={0.6} /></mesh>)}
      {/* colher de pau */}
      <Liga a={[0.1, 0.12, 0.05]} b={[0.26, 0.5, 0.05]} w={0.035} cil cor="#a8743f" />
      <mesh position={[0.1, 0.12, 0.05]} scale={[1.3, 0.8, 0.6]}><sphereGeometry args={[0.05, 12, 8]} /><meshStandardMaterial color="#a8743f" roughness={0.8} /></mesh>
    </group>
  );
};

/* ---------- cena ---------- */

type EtiqDef = { texto: string; para: V; off: [number, number]; cor?: string };

const MicroCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const n = (k: string, pad = 0) => valor(n0(cena[k]), p, pad);
  const b = (k: string) => cena[k] === true;
  const modo = (cena.lupaModo as string | undefined) ?? "mol";
  const lupaK = n("lupa");
  const lx = n("lupaX", -0.75);
  const ly = n("lupaY", 1.5);
  const R = n("lupaR", 0.38);
  const lz = 0.25;
  const queima = n("queima");
  const sinais = n("sinais");
  const quente = n("quente");
  const gira = n("gira");
  const onda = n("onda");
  const campo = n("campo");
  const corpo = n("corpo");
  const tubo = n("tubo");
  const caixa = n("caixa");
  const tela = n("tela");
  const visor = (cena.visor as string | undefined) ?? "0:30";
  const tex = useMemo(() => mostradorTex(visor), [visor]);
  const mapaK = n("mapa");
  const aquece = n("aquece");
  const gp = n("giraPrato");
  const angPrato = gp > 0 ? tEpisodio * 1.2 : 0;
  const raiox = n("raiox");
  const tubo0: V = [0.67, CY + 0.15, PZ]; // dentro da carcaça, ao lado da cavidade (atrás do painel)
  const E: V = [CX1 - 0.01, CY + 0.15, PZ]; // a onda sai pela abertura da parede direita da cavidade
  const fogoAl = n("fogoAl");

  // moléculas na lupa
  const f = 0.9;
  const fase = Math.sin(tEpisodio * f * Math.PI * 2);
  const angMol = (gira * 1.0) * fase * 1.3;
  const posMol: V[] = [[0, 0, 0], ...Array.from({ length: 6 }, (_, i): V => [Math.cos((i / 6) * Math.PI * 2 + 0.3) * 0.22, Math.sin((i / 6) * Math.PI * 2 + 0.3) * 0.22, 0])];

  // rótulos 3D
  const S = n("etiqS", 0.3);
  const Kt = n("etiqK", 1);
  const et: Record<string, EtiqDef> = {
    fundo: { texto: "FUNDO", para: [POT_POS[0] + 0.02, POT_POS[1] + 0.03, -0.05], off: [-0.3, -1.3], cor: "#ff6a4a" },
    meio: { texto: "MEIO", para: [POT_POS[0], POT_POS[1] + 0.06, -0.05], off: [1.3, 0.4], cor: "#7fc4ff" },
    agua: { texto: "ÁGUA", para: [lx - 0.12, ly + 0.12, lz + 0.03], off: [-1.0, 0.9] },
    molecula: { texto: "MOLÉCULA DE ÁGUA", para: [lx + 0.02, ly + 0.1, lz + 0.1], off: [0.0, 1.3] },
    magnetron: { texto: "MAGNETRON", para: [tubo0[0], tubo0[1] + 0.09, tubo0[2]], off: [-0.2, 1.1] },
    caixa: { texto: "CAIXA DE METAL", para: [CX0, CY + 0.2, CZ1], off: [-0.4, 1.4] },
    onda: { texto: "ONDA 12 cm", para: [lx - R * 0.4, ly + 0.07, lz + 0.03], off: [-0.5, 1.2] },
    furo: { texto: "FURO 2 mm", para: [lx + R * 0.1, ly - 0.14, lz + 0.03], off: [0.8, -1.2] },
    quente: { texto: "QUENTE", para: [n("mapaX", 0.46) - 0.12, n("mapaY", 1.55) + 0.12, 0.3], off: [-0.9, 0.5], cor: "#ff6a4a" },
    frio: { texto: "FRIO", para: [n("mapaX", 0.46) + 0.14, n("mapaY", 1.55) - 0.1, 0.3], off: [0.9, -0.5], cor: "#7fc4ff" },
    prato: { texto: "PRATO GIRATÓRIO", para: [PX + 0.12, CY + 0.04, PZ + 0.1], off: [-0.5, -1.4] },
    mMagnetron: { texto: "MAGNETRON", para: [tubo0[0], tubo0[1] - 0.05, tubo0[2]], off: [0.2, -1.9] },
    mCaixa: { texto: "CAIXA", para: [CX0 + 0.01, CY + CH * 0.5, CZ1], off: [-1.5, 0.6] },
    mTela: { texto: "TELA", para: [0.4, CY + CH * 0.85, CZ1 + 0.02], off: [1.8, 1.2] },
    mPrato: { texto: "PRATO", para: [PX + 0.11, CY + 0.04, PZ + 0.1], off: [-1.6, -1.4] },
  };
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fim] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fim === undefined || p <= fim) };
  }).filter((x) => x.ok);

  const destaque = n("destaque");
  const pulso = (i: number) => {
    const k = destaque * 4 - i;
    return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
  };
  const gente = (cena.gente as GenteDef[] | undefined) ?? [];

  // ondas que batem e voltam dentro da caixa
  const zr = PZ + 0.08;
  const rotasDentro: V[][] = [
    [E, [0.33, CY + 0.1, zr]],
    [E, [0.42, CY + 0.268, zr], [0.3, CY + 0.12, zr]],
    [E, [CX0 + 0.014, CY + 0.17, zr], [0.3, CY + 0.09, zr]],
    [E, [0.4, CY + 0.014, zr], [0.3, CY + 0.08, zr]],
  ];
  const ondasDentro = n("ondasDentro");

  // lupa: conteúdo
  const lzz = 0.03;
  const conteudoLupa = (() => {
    if (modo === "agua") {
      const l = n("lasanha");
      return (
        <group>
          <mesh position={[0, 0, 0.01]} scale={[1 - l, 1 - l, 1]}><circleGeometry args={[R * 0.8, 40]} /><meshStandardMaterial color="#d6652b" roughness={0.5} /></mesh>
          <Gotinhas p={[0, 0, lzz]} w={R * 1.2 * (1 - l)} h={R * 1.2 * (1 - l)} k={n("agua") * (1 - l)} t={t} n={20} r={0.028} />
          <FatiaCorte p={[0, 0, 0.012]} larg={R * 1.45} modo={0} pen={0} k={l} />
          <Gotinhas p={[0, 0, lzz]} w={R * 1.3} h={R * 0.7} k={n("agua") * l} t={t} n={16} r={0.026} />
        </group>
      );
    }
    if (modo === "mol") {
      return <Molecula p={[0, -0.04, 0.06]} r={0.13} ang={Math.sin(tEpisodio * 1.4) * 0.15} k={0} sinais={sinais} />;
    }
    if (modo === "giro" || modo === "onda") {
      return (
        <group>
          {posMol.map((m, i) => (
            <Molecula key={i} p={[m[0] * (R / 0.38), m[1] * (R / 0.38) - 0.02, 0.06]} r={0.055} ang={angMol * (i % 2 ? 1 : 1)} k={quente} vibra={gira * 1.0} sinais={0} />
          ))}
          <SetaCampo p={[0, R * 0.72, 0.06]} L={0.17} s={campo * Math.sign(fase) * Math.min(1, Math.abs(fase) * 3)} />
          {modo === "onda" && <OndaSeno p={[0, -R * 0.62, 0.06]} x0={-R * 0.85} x1={R * 0.85} amp={0.07 * onda} lambda={0.2} t={tEpisodio} vel={1.1} />}
          {modo === "giro" && <TermoLupa p={[R * 0.82, -0.02, 0.05]} h={R * 1.2} nivel={n("termoL")} />}
        </group>
      );
    }
    if (modo === "tela") {
      const g = n("grade");
      const xg = 0.0;
      return (
        <group>
          {/* grade: placa escura com furos pequenos; a luz passa pelos furos */}
          <mesh position={[xg, 0, 0.02]}><boxGeometry args={[0.07, R * 1.7, 0.03]} /><meshStandardMaterial color="#3a3f48" metalness={0.5} roughness={0.5} /></mesh>
          {Array.from({ length: 7 }).map((_, i) => <mesh key={i} position={[xg, -R * 0.78 + i * (R * 1.56 / 6), 0.04]}><boxGeometry args={[0.072, 0.014, 0.03]} /><meshBasicMaterial color="#fff6c0" /></mesh>)}
          {/* onda grande à esquerda (amplitude cai a zero na grade) e pontos de luz passando */}
          <OndaSeno p={[-R * 0.0, R * 0.0, 0.06]} x0={-R * 0.95} x1={0.0} amp={R * 0.42 * n("bloqueio", 1) * g} lambda={R * 0.9} t={tEpisodio} vel={0.8} w={0.022} />
          {Array.from({ length: 14 }).map((_, i) => {
            const row = i % 7;
            const u = (tEpisodio * 0.5 + Math.floor(i / 7) * 0.5 + row * 0.07) % 1;
            const x = -R * 0.9 + u * R * 1.8;
            return <mesh key={i} position={[x, -R * 0.78 + row * (R * 1.56 / 6), 0.07]}><sphereGeometry args={[0.014, 8, 6]} /><meshBasicMaterial color="#ffe98a" transparent opacity={g} /></mesh>;
          })}
          {/* régua do comprimento da onda (12 cm) */}
          <Liga a={[-R * 0.72, R * 0.62, 0.07]} b={[-R * 0.72 + R * 0.9, R * 0.62, 0.07]} w={0.012} cil cor="#ffd23f" basico />
          {[0, 1].map((i) => <Liga key={i} a={[-R * 0.72 + i * R * 0.9, R * 0.58, 0.07]} b={[-R * 0.72 + i * R * 0.9, R * 0.66, 0.07]} w={0.012} cil cor="#ffd23f" basico />)}
        </group>
      );
    }
    return null;
  })();

  // setas de calor da cena 2
  const sc = n("setasCalor");
  const pulsa = 0.65 + 0.35 * Math.sin(t * 6);
  const bx = POT_POS[0];
  const by = POT_POS[1];

  return (
    <group>
      {Array.isArray(cena.rota) && <RotaCamera rota={cena.rota as Parada[]} p={p} />}
      <hemisphereLight args={["#fff3dd", "#8a6a4a", 1.05]} />
      <directionalLight position={[-1.2, 3.6, 3.8]} intensity={2.2} color="#fff0d2" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-2.6} shadow-camera-right={2.6} shadow-camera-top={2.6} shadow-camera-bottom={-1.2} shadow-camera-near={0.5} shadow-camera-far={12} shadow-bias={-0.0004} />
      <Ambiente />
      {b("relogio") && <RelogioParede p={[-0.35, 1.62, Z_PAREDE + 0.04]} t={t} voltas={n("relogioVel", 0.2)} escala={0.75} />}

      {/* fogão, panela de sopa e fumaça */}
      <Fogao fogo={n("fogo")} t={t} vazio={0.03} />
      <group position={POT_POS} scale={POT_ESC}><PanelaSopa k={n("panela", 1)} queima={queima} calor={n("calor")} /></group>
      <Fumaca p={[bx, by + 0.12, -0.1]} t={t} k={n("fumaca")} cor="#3a3633" alt={0.5} larg={0.14} op={0.6} n={10} />
      {sc > 0.02 && (
        <group>
          {[-0.04, 0, 0.04].map((dx, i) => <Seta key={i} a={[bx + dx, by - 0.03, -0.04]} b={[bx + dx, by + 0.03 + 0.02 * pulsa, -0.04]} cor="#ff8a2a" w={0.012} op={clamp01(sc * 3) * pulsa} />)}
          {sc > 0.33 && [-1, 1].map((s) => [0.02, 0.06].map((h, j) => <Seta key={`${s}${j}`} a={[bx + s * 0.17, by + h + 0.02, -0.04]} b={[bx + s * (0.1 + 0.02 * pulsa), by + h + 0.02, -0.04]} cor="#ff8a2a" w={0.012} op={clamp01((sc - 0.33) * 3) * pulsa} />))}
          {sc > 0.66 && [-0.05, 0.05].map((dx, i) => <Seta key={i} a={[bx + dx * 1.4, by + 0.045, -0.04]} b={[bx + dx * 0.4, by + 0.045, -0.04]} cor="#ffb26b" w={0.012} op={clamp01((sc - 0.66) * 3) * pulsa} />)}
        </group>
      )}

      {/* lupa */}
      <LinhasZoom de={cena.zoomDe as V ?? [bx, by + 0.08, 0]} p={[lx, ly, lz]} R={R} k={lupaK} />
      <Lupa p={[lx, ly, lz]} R={R} k={lupaK}>{conteudoLupa}</Lupa>

      {/* tubo, fio, anéis */}
      <Magnetron p={tubo0} k={corpo > 0.02 ? tubo * raiox : tubo} t={t} tomada={n("fio")} esc={0.7} vert />
      <FioTomada de={[tubo0[0], tubo0[1] - 0.11, PZ]} k={n("fio")} />
      <Compartimento k={caixa * (1 - clamp01(corpo * 4))} />
      <Aneis p={[E[0], E[1], 0.05]} t={tEpisodio} k={n("aneis")} rmax={0.45} vel={0.5} />
      <Aneis p={[E[0], E[1], 0.05]} t={tEpisodio} k={n("espalha")} rmax={2.6} vel={0.22} n={5} />
      {n("espalha") > 0.02 && [[-1.4, 0.55], [1.5, 0.5], [0.1, 1.2], [-1.0, -0.25]].map(([dx, dy], i) => <Seta key={i} a={[E[0] + dx * 0.2, E[1] + dy * 0.2, 0.06]} b={[E[0] + dx * (0.45 + 0.25 * ((tEpisodio * 0.35 + i * 0.25) % 1)), E[1] + dy * (0.45 + 0.25 * ((tEpisodio * 0.35 + i * 0.25) % 1)), 0.06]} cor="#2f8cff" w={0.02} op={n("espalha")} />)}

      {/* caixa, prato, tigela, porta, corpo */}
      <CaixaMetal k={caixa} frente={n("frente")} />
      <Prato k={n("prato")} ang={angPrato} />
      <Tigela k={n("tigela")} ang={angPrato} quente={aquece} vapor={n("vapor")} t={t} y={n("prato") > 0.5 ? PY + 0.012 : CY + 0.004} />
      {ondasDentro > 0.02 && <Fluxo rotas={rotasDentro} t={t} n={3} vel={0.28} cor="#2f8cff" w={0.014} tam={0.07} op={ondasDentro} />}
      <Porta k={tela} abre={n("abre")} corpo={corpo} />
      <Corpo k={corpo} tela={visor} tex={tex} vidro={raiox} />

      {/* fatia de lasanha dentro da caixa, corte em primeiro plano e régua */}
      {n("fatia") > 0.02 && (
        <group position={[PX + 0.03, PY + 0.012, PZ + 0.1]} scale={suave(n("fatia")) * 1.05}>
          {[["#f0d27a", 0.022], ["#c8472a", 0.016], ["#f6e08a", 0.022], ["#c8472a", 0.016], ["#f0d27a", 0.022], ["#f7e9a6", 0.03]].map(([cor, h], i, arr) => {
            const y0 = arr.slice(0, i).reduce((acc, x) => acc + (x[1] as number), 0);
            return <mesh key={i} position={[0, y0 + (h as number) / 2, 0]}><boxGeometry args={[0.24, h as number, 0.1]} /><meshStandardMaterial color={cor as string} roughness={0.6} /></mesh>;
          })}
        </group>
      )}
      <FatiaCorte p={[n("corteX", 0.46), n("corteY", 1.45), 0.3]} larg={n("corteL", 0.5)} modo={1} pen={n("pen")} k={n("corte")} />
      <Regua3 p={[n("corteX", 0.46), n("corteY", 1.45), 0.3]} larg={n("corteL", 0.5)} k={n("regua")} />

      {/* caixa vista de cima */}
      <MapaCima p={[n("mapaX", 0.46), n("mapaY", 1.55), 0.3]} k={mapaK} mix={n("mapaMix")} esc={n("mapaEsc", 1.1)} t={t} />

      {/* metal */}
      <GarfoMesa p={[PX + 0.05, PY + 0.09, PZ + 0.1]} k={n("garfo")} rot={-0.35} />
      <GarfoMesa p={[0.1, CY + 0.2, 0.12]} k={n("garfoAr")} rot={-0.15} />
      <Faiscas p={[PX + 0.06, PY + 0.17, PZ + 0.12]} k={n("faisca")} t={t} />
      <Aluminio p={[PX + 0.13, PY + 0.07, PZ + 0.1]} k={n("aluminio")} queima={fogoAl} t={t} />
      {fogoAl > 0.02 && <Chama p={[PX + 0.13, PY + 0.07, PZ + 0.1]} k={clamp01(fogoAl * 3)} t={t} esc={0.35} />}

      {/* revelação: as quatro peças piscam */}
      {destaque > 0.001 && (
        <group>
          <Halo p={[tubo0[0], tubo0[1], 0.05]} r={0.2} cor="#7fc4ff" op={0.9 * pulso(0)} />
          <Halo p={[CX0, CY + CH / 2, 0.05]} r={0.28} cor="#ffe9a8" op={0.9 * pulso(1)} />
          <Halo p={[0.42, CY + CH / 2, 0.05]} r={0.3} cor="#ffd23f" op={0.9 * pulso(2)} />
          <Halo p={[PX, CY + 0.04, 0.05]} r={0.2} cor="#9fdcff" op={0.9 * pulso(3)} />
        </group>
      )}

      {/* fogão de indução (silhueta) e o ponto de interrogação */}
      <Inducao p={[1.05, CY, -0.2]} k={n("indu")} />
      {n("interroga") > 0.02 && <Texto3D texto="?" p={[0.75, CY + 0.5 + 0.1 * suave(n("interroga")) + 0.02 * Math.sin(t * 3), 0.1]} h={0.3} escala={suave(clamp01(n("interroga") * 2))} />}

      {gente.map((gd, i) => <Gente key={`${gd.id}${i}`} g={gd} p={p} t={t} tAbs={tEpisodio} />)}

      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const de: V = [d.para[0] + d.off[0] * S, d.para[1] + d.off[1] * S, d.para[2] + 0.1];
        return <Etiqueta key={c} texto={d.texto} de={de} para={d.para} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

void CX1; void CZ0; void H_PANELA;

const c = (pos: V3, alvo: V3, fov = 50) => ({ pos, alvo, fov });

export const microondas: Cenario3D = {
  Cena: MicroCena,
  padrao: "geral",
  fundo: () => "#f3d6a4",
  luzPropria: true,
  cameras: { geral: c([0.0, 1.2, 3.2], [0.0, 1.1, 0], 50) },
};
