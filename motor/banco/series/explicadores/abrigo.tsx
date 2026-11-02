import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { clamp01, lerp, lerp3, suave, valor } from "../../../src/v3d/anima";
import { caminhoReto, CanoComFluxo, Trecho } from "../../../src/v3d/cano";
import { Nuvem } from "../../../src/v3d/particulas";
import { rnd } from "../../../src/v3d/qualidade";
import { FONT } from "../../../src/theme";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Cenario3D, Cenario3DProps, Expressao3D, Personagem3D, V3, Valor } from "../../../src/v3d/tipos";
import { zeca } from "./zeca";
import { MORADORES } from "./moradores";

// Abrigo do episódio 8 (como montar um bunker). Visto em CORTE: o plano z = 0 é a "parede de vidro" da frente; tudo o que está
// em z < 0 é o terreno. O quintal fica em cima (y = 0 é o chão), o buraco desce até y = -4 e a caixa de concreto fica dentro dele.
// Medidas (m): buraco x ±3,1 · z -3,9..0 · fundo 4; caixa x ±2,1 (vão interno ±1,8) · z -3,4..0 · piso em y = -3,75 · teto reto
// -1,3..-1,0 ou abóbada (mola em y = -1,9, topo em -1,0) · saída (poço com escada) em x 2,1..3,1 · a parede engrossa 0,3 m para
// fora (campo `grossa`); a sala do gerador fica à esquerda, em x -5,2..-2,4. Terra por cima: 1 m.
// Campos da cena (número ou { de, para, ini, fim }; booleanos com true):
//   buraco  furo 0..1 (profundidade; padrão 1) · desaba 0..1 (a terra molhada cai das paredes) · agua (m de água no buraco)
//           umido 0..1 (terra molhada, mais escura) · chuva 0..1 · pa: true (a pá e a terra voando para o monte)
//   caixa   caixa: true · ferro 0..1 (grade de vergalhões) · concreto 0..1 (despeja e sobe) · raioX 0..1 (concreto transparente)
//           saida 0..1 (poço, escada e tampa) · tampa 0..1 (1 = aberta) · laje 0..1 (laje larga e grossa no fundo)
//           sobe (m, a caixa flutua) · lencol (y do lençol de água, em m; some se faltar) · balanca 0..1 (balança na água)
//           terra 0..1 (aterro de 1 m; com a escavadeira) · escavadeira: true · grossa 0..1 (paredes mais grossas por dentro)
//   teto    troca 0..1 (teto reto → abóbada) · verga 0..1 (o teto reto entorta) · racha 0..1 (rachadura e poeira)
//           setasDe (0..1 da batida em que as setas entram) · setas: "peso" | "tracao" | "curva" | "empuxo" | "agua" · coluna 0..1 (coluna de 1 m de terra sobre 1 m²)
//   ar      canos: true · fluxo 0..1 (o ar anda nos canos) · fechados 0..1 (tampas nos canos) · vent 0..1 (ventilador)
//           co2 0..1 (cor dos pontinhos de ar) · ar: true (pontinhos) · vela: true · torre: true · cal 0..1 (cal escurecendo)
//           fluxoTorre 0..1 · escuro 0..1 (luz geral) · lampada 0..1 · noite 0..1 (céu escuro, lua e estrelas) · torneira: true
//   salaEx: true (sala extra de água e comida, à direita do poço) · porta 0..1 (a porta abre) · luzEx 0..1 (a luz acende; 1 se faltar)
//   rota    lista de paradas de câmera { p, pos, alvo, fov }: segura cada ponto e só depois vai ao seguinte (vale mais que `camera`)
//   gente   também aceita `pula` (altura do pulo, m)
//   etiq    "chave", "chave@0.4" (aparece aos 40%) ou "chave@0.2-0.6" (só entre 20% e 60%)
//   sala    sala: true (segunda sala, à esquerda da caixa, fechada com porta vedada) · gerador: "sala" (o gerador dentro dela) · escape: true
//           (cano de escape até o quintal, ≈ 6 m da tampa) · detector: true (detector de monóxido na porta) · isola 0..1 (placas de isolamento)
//           ruido 0..1 (ondas de som saindo da sala; 0 some)
//   energia gerador: "dentro" | "sala" | "fora" · gerLigado: true · gerCinza 0..1 (apagado, cinza) · tanque 0..1 · fumaca 0..1 · monoxido 0..1 · ruido: true
//           regua: true (cota de ≈ 6 m entre a tampa e o cano) · fio: true · painel: true · sol 0..1 · bateria 0..1 (nível; some se faltar) · vizinhos: true
//   gente   lista de { id: "zeca"|"vizinha"|"menino"|"vovo", x, y, z (Valor), rot, esc, deita (Valor 0..1), acao, exp }; `acao` pode
//           ser uma lista [[ate, acao, exp]…] (ate = 0..1 da batida)
//   etiq    lista de etiquetas 3D, cada uma "chave" ou "chave@0.4" (aparece aos 40% da batida) · etiqL (largura, m; padrão 2,3)
//   casa: false tira a casa e as árvores.

type V = V3;
const HW = 3.1; // meia largura do buraco
const HZ = 3.9; // fundo do buraco (z)
const FUNDO = 4.0;
const BX = 2.1; // caixa: meia largura externa (a parede tem 0,3 m)
const BXI = 1.8; // meia largura interna: o vão tem 3,6 m e não muda nunca
const ENG = 0.3; // quanto a parede engrossa PARA FORA, contra a terra (batida 12)
const WC = (BX + BXI) / 2; // centro da parede (ferragem)
const BZ = 3.4;
const BZI = 3.1;
const BASE = -4.0;
const PISO = -3.75;
const TETO_B = -1.3;
const TETO_T = -1.0;
const MOLA = -1.9;
const ZF = 0.02; // o concreto sai um pouco do plano do corte, para não brigar com a terra
const AMARELO = "#ffd23f";
const CONC = "#c4c7cb";
const FERRO = "#b4602a";
const AZUL = "#3ea6ff";
const VERMELHO = "#ff3a3a";

const mistura = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getStyle();

/* ---------- peças simples ---------- */

type BP = { p: V; t: V; cor: string; op?: number; r?: V; rug?: number; met?: number; emi?: string; brilho?: number; sombra?: boolean };
const B: React.FC<BP> = ({ p, t, cor, op, r, rug = 0.85, met = 0, emi, brilho = 0, sombra }) => {
  if (op !== undefined && op <= 0.01) return null;
  return (
    <mesh position={p} rotation={r} castShadow={sombra}>
      <boxGeometry args={t} />
      <meshStandardMaterial color={cor} roughness={rug} metalness={met} transparent={op !== undefined && op < 1} opacity={op ?? 1} depthWrite={op === undefined || op >= 1} emissive={emi ?? "#000000"} emissiveIntensity={brilho} />
    </mesh>
  );
};

/** Haste/faixa entre dois pontos (cilindro ou fita). */
const Liga: React.FC<{ a: V; b: V; w?: number; e?: number; cor: string; op?: number; cil?: boolean; emi?: string; brilho?: number; basico?: boolean }> = ({ a, b, w = 0.05, e = 0.03, cor, op, cil, emi, brilho = 0, basico }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  if (len < 1e-4 || (op !== undefined && op <= 0.01)) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const trans = op !== undefined && op < 1;
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={q}>
      {cil ? <cylinderGeometry args={[w / 2, w / 2, len, 8]} /> : <boxGeometry args={[w, len, e]} />}
      {basico ? <meshBasicMaterial color={cor} transparent={trans} opacity={op ?? 1} /> : <meshStandardMaterial color={cor} roughness={0.8} transparent={trans} opacity={op ?? 1} depthWrite={!trans} emissive={emi ?? "#000000"} emissiveIntensity={brilho} />}
    </mesh>
  );
};

/** Seta 3D (cabo e ponta), sem luz: lê bem em qualquer cor de fundo. */
const Seta3: React.FC<{ a: V; b: V; cor: string; w?: number; op?: number }> = ({ a, b, cor, w = 0.09, op }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  if (len < 0.05) return null;
  const dir = d.clone().normalize();
  const head = Math.min(0.3, len * 0.45);
  const base: V = [b[0] - dir.x * head, b[1] - dir.y * head, b[2] - dir.z * head];
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <group>
      <Liga a={a} b={base} w={w} cil cor={cor} op={op} basico />
      <mesh position={[b[0] - dir.x * head * 0.5, b[1] - dir.y * head * 0.5, b[2] - dir.z * head * 0.5]} quaternion={q} renderOrder={5}>
        <coneGeometry args={[w * 1.9, head, 10]} />
        <meshBasicMaterial color={cor} transparent={op !== undefined} opacity={op ?? 1} />
      </mesh>
    </group>
  );
};

/* ---------- solo ---------- */

const SOLO: [number, number, string][] = [[0, -0.18, "#4f8f3d"], [-0.18, -0.9, "#5a3b25"], [-0.9, -2.3, "#8b5b39"], [-2.3, -3.7, "#a8744b"], [-3.7, -90, "#b98a5f"]];

/** Camadas de terra num bloco; `top`/`base` cortam o bloco; `verde` 0..1 troca o topo de terra por grama. */
const Camadas: React.FC<{ x0: number; x1: number; z0: number; z1: number; top: number; base?: number; umido: number; verde?: number; fade?: number }> = ({ x0, x1, z0, z1, top, base = -90, umido, verde = 1, fade = 0 }) => (
  <group>
    {SOLO.map(([a, b, cor], i) => {
      const ya = Math.min(a, top);
      const yb = Math.max(b, base);
      if (ya <= yb + 1e-3) return null;
      const c0 = i === 0 ? mistura(SOLO[1][2], cor, verde) : cor;
      return (
        <mesh key={i} position={[(x0 + x1) / 2, (ya + yb) / 2, (z0 + z1) / 2]}>
          <boxGeometry args={[x1 - x0, ya - yb, z1 - z0]} />
          <meshStandardMaterial color={mistura(mistura(c0, "#24160d", umido * 0.4), "#020309", fade * 0.92)} roughness={0.95} />
        </mesh>
      );
    })}
  </group>
);

const SALA_X0 = -5.2;
const SALA_X1 = -(BX + ENG);
const SALA_Z = 3.0;
const SALA_TETO = -1.8; // topo da laje da sala
const EX_X0 = HW; // sala extra (água e comida): do lado oposto à sala do gerador, à direita do poço da saída
const EX_X1 = 7.3; // tem o mesmo vão largo (3,6 m) entre as paredes

const Solo: React.FC<{ depth: number; umido: number; sala: boolean; salaEx: boolean; fade: number }> = ({ depth, umido, sala, salaEx, fade }) => (
  <group>
    {sala ? (
      <group>
        <Camadas x0={-40} x1={SALA_X0} z0={-40} z1={0} top={0} umido={umido} fade={fade} />
        <Camadas x0={SALA_X0} x1={-HW} z0={-40} z1={-SALA_Z} top={0} umido={umido} fade={fade} />
        <Camadas x0={SALA_X0} x1={-HW} z0={-SALA_Z} z1={0} top={0} base={SALA_TETO} umido={umido} fade={fade} />
        <Camadas x0={SALA_X0} x1={-HW} z0={-SALA_Z} z1={0} top={BASE} umido={umido} fade={fade} />
      </group>
    ) : <Camadas x0={-40} x1={-HW} z0={-40} z1={0} top={0} umido={umido} fade={fade} />}
    {salaEx ? (
      <group>
        <Camadas x0={EX_X1} x1={40} z0={-40} z1={0} top={0} umido={umido} fade={fade} />
        <Camadas x0={EX_X0} x1={EX_X1} z0={-40} z1={-SALA_Z} top={0} umido={umido} fade={fade} />
        <Camadas x0={EX_X0} x1={EX_X1} z0={-SALA_Z} z1={0} top={0} base={SALA_TETO} umido={umido} fade={fade} />
        <Camadas x0={EX_X0} x1={EX_X1} z0={-SALA_Z} z1={0} top={BASE} umido={umido} fade={fade} />
      </group>
    ) : <Camadas x0={HW} x1={40} z0={-40} z1={0} top={0} umido={umido} fade={fade} />}
    <Camadas x0={-HW} x1={HW} z0={-40} z1={-HZ} top={0} umido={umido} fade={fade} />
    <Camadas x0={-HW} x1={HW} z0={-HZ} z1={0} top={-depth} umido={umido} fade={fade} />
  </group>
);

/** Faixa de terra que cai das paredes do buraco (vista de frente: dois montes triangulares). */
const Desabamento: React.FC<{ k: number; depth: number; t: number }> = ({ k, depth, t }) => {
  const geo = useMemo(() => {
    const g = (lado: number) => {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.lineTo(lado * 1, 0);
      s.lineTo(0, 1);
      s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: HZ, bevelEnabled: false });
    };
    return [g(1), g(-1)];
  }, []);
  if (k <= 0.01) return null;
  const w = 2.3 * k;
  const h = 2.6 * k;
  return (
    <group>
      {[0, 1].map((i) => (
        <mesh key={i} geometry={geo[i]} position={[i === 0 ? -HW : HW, -depth, -HZ]} scale={[w, h, 1]}>
          <meshStandardMaterial color="#6b4a2f" roughness={0.95} />
        </mesh>
      ))}
      {Array.from({ length: 14 }).map((_, i) => {
        const lado = i % 2 ? 1 : -1;
        const u = (t * 0.9 + rnd(i)) % 1;
        const x = lado * (HW - 0.1 - rnd(i + 3) * 0.5 * k);
        const y = -depth + 3.4 * (1 - u) * (0.4 + 0.6 * k) + 0.2;
        return <B key={i} p={[x, y, -0.4 - rnd(i + 8) * 2.5]} t={[0.18, 0.15, 0.18]} cor="#6b4a2f" r={[u * 3, u * 2, 0]} />;
      })}
    </group>
  );
};

/* ---------- quintal ---------- */

const Casa: React.FC = () => (
  <group position={[-5.4, 0, -10]}>
    <B p={[0, 1.5, 0]} t={[6.6, 3.0, 4.6]} cor="#f3d9a4" />
    <mesh position={[0, 3.85, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.62, 1, 1.1]}>
      <coneGeometry args={[3.4, 1.7, 4]} />
      <meshStandardMaterial color="#c4513d" roughness={0.8} />
    </mesh>
    <B p={[0, 1.0, 2.31]} t={[1.0, 2.0, 0.08]} cor="#7a4a26" />
    {[-2.2, 2.2].map((x) => <B key={x} p={[x, 1.7, 2.31]} t={[1.1, 1.0, 0.08]} cor="#9fe0f7" emi="#bfeaff" brilho={0.25} />)}
    <B p={[2.4, 3.6, -0.6]} t={[0.6, 1.2, 0.6]} cor="#a8553e" />
  </group>
);

const Cerca: React.FC = () => (
  <group>
    {Array.from({ length: 36 }).map((_, i) => <B key={i} p={[-9 + i * 0.5, 0.45, -6.5]} t={[0.22, 0.9, 0.06]} cor="#f4f1ea" />)}
    <B p={[0, 0.7, -6.52]} t={[18, 0.06, 0.05]} cor="#e6e1d4" />
  </group>
);

const Arvore: React.FC<{ x: number; z: number; s: number }> = ({ x, z, s }) => (
  <group position={[x, 0, z]} scale={s}>
    <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.18, 0.26, 2.4, 8]} /><meshStandardMaterial color="#5b4330" roughness={0.9} /></mesh>
    <mesh position={[0, 3.4, 0]}><icosahedronGeometry args={[1.5, 1]} /><meshStandardMaterial color="#3f6b3c" roughness={0.9} /></mesh>
    <mesh position={[0.6, 2.8, 0.3]}><icosahedronGeometry args={[1.0, 1]} /><meshStandardMaterial color="#4a7a43" roughness={0.9} /></mesh>
  </group>
);

const Monte: React.FC<{ k: number }> = ({ k }) => {
  if (k <= 0.02) return null;
  return (
    <mesh position={[-5.0, 0.7 * k, -1.3]} scale={[1, k, 1]}>
      <coneGeometry args={[2.1 * k + 0.2, 1.4, 9]} />
      <meshStandardMaterial color="#6b4a2f" roughness={0.95} flatShading />
    </mesh>
  );
};

const Chuva: React.FC<{ forca: number; t: number }> = ({ forca, t }) => {
  if (forca <= 0.02) return null;
  const n = Math.round(260 * forca);
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const x = (rnd(i) - 0.5) * 20 + 0.5;
        const z = 5 - rnd(i + 50) * 14;
        const y = 8 - (((t * 7 + rnd(i + 99)) % 1) + 1) % 1 * 9.5;
        return <mesh key={i} position={[x, y, z]}><boxGeometry args={[0.014, 0.55, 0.014]} /><meshBasicMaterial color="#d3e6f6" transparent opacity={0.6} /></mesh>;
      })}
    </group>
  );
};

/** A pá e a terra voando do buraco para o monte. */
const Pa: React.FC<{ t: number; x: number; y: number }> = ({ t, x, y }) => {
  const f = Math.sin(t * 6);
  return (
    <group position={[x + 0.55, y, -0.8]}>
      <group rotation={[0, 0, 0.5 + 0.35 * f]}>
        <Liga a={[0, 0, 0]} b={[0, 1.5, 0]} w={0.05} cil cor="#8a5a2e" />
        <B p={[0, -0.12, 0]} t={[0.34, 0.3, 0.05]} cor="#aeb6be" met={0.5} />
      </group>
      {Array.from({ length: 9 }).map((_, i) => {
        const u = (t * 1.3 + i / 9) % 1;
        return <B key={i} p={[-0.9 - u * 1.4, 0.6 + 2.0 * 4 * u * (1 - u), 0.1]} t={[0.14, 0.12, 0.14]} cor="#6b4a2f" r={[u * 6, u * 3, 0]} />;
      })}
    </group>
  );
};

/* ---------- etiquetas 3D ---------- */

type Etiq = { texto: string; de: V; para: V; esc?: number };
const ETIQ: Record<string, Etiq> = {
  concreto: { texto: "CONCRETO", de: [-2.9, -2.3, 0.5], para: [-WC, -2.5, 0.06] },
  ferro: { texto: "FERRO", de: [-2.9, -3.6, 0.5], para: [-WC, -3.3, 0.06] },
  saida: { texto: "SAÍDA", de: [3.2, -1.7, 0.5], para: [2.6, -0.5, 0.08] },
  laje: { texto: "LAJE PESADA", de: [-2.8, -4.8, 0.5], para: [-2.4, -4.1, 0.06] },
  abobada: { texto: "ABÓBADA", de: [-2.9, -1.35, 0.5], para: [-1.3, -1.3, 0.12] },
  canoBaixo: { texto: "CANO BAIXO", de: [-2.9, 1.3, 0.5], para: [-1.45, 0.5, 0.18] },
  canoAlto: { texto: "CANO ALTO", de: [2.3, 2.4, 0.5], para: [1.45, 1.4, 0.18] },
  ventilador: { texto: "VENTILADOR", de: [-2.9, -0.3, 0.5], para: [-1.45, -0.7, 0.3] },
  torre: { texto: "TORRE DE CAL", de: [-2.9, -3.3, 0.5], para: [-1.25, -2.9, -1.6] },
  gerador: { texto: "GERADOR", de: [-2.9, -2.9, 0.5], para: [0.35, -3.3, -1.6] },
  painel: { texto: "PAINEL", de: [5.0, 3.6, 0.5], para: [5.0, 1.9, -0.8] },
  agua: { texto: "ÁGUA", de: [4.0, -0.7, 0.5], para: [4.2, -3.1, -2.6], esc: 2.0 },
  comida: { texto: "COMIDA", de: [5.7, -0.7, 0.5], para: [5.9, -2.4, -2.6], esc: 2.1 },
  gerEmerg: { texto: "EMERGÊNCIA", de: [-3.9, -0.9, 0.5], para: [-3.9, -3.0, -1.4], esc: 3.0 },
  bateria: { texto: "BATERIA", de: [-1.4, -4.8, 0.5], para: [1.35, -3.4, -1.9] },
  salaGer: { texto: "SALA DO GERADOR", de: [-3.9, -0.9, 0.5], para: [-3.9, -2.1, 0.1], esc: 3.2 },
  canoEsc: { texto: "CANO", de: [-1.7, 2.5, 0.5], para: [-3.5, 0.9, 0.15], esc: 2.6 },
  isolamento: { texto: "ISOLAMENTO", de: [-3.9, -0.9, 0.5], para: [-3.9, -2.8, -2.7], esc: 2.8 },
  umMetro: { texto: "1 m", de: [1.5, -0.4, 0.5], para: [0.55, -0.5, 0.1], esc: 1.2 },
  seis: { texto: "≈ 6 m", de: [-0.4, 2.3, 0.5], para: [-0.4, 1.7, 0.1], esc: 2.0 },
};

const EtiquetaS: React.FC<{ e: Etiq; larg: number }> = ({ e, larg }) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 128;
    const g = c.getContext("2d")!;
    // encolhe a letra até o texto (com o contorno) caber inteiro no canvas: nunca corta
    g.font = `700 80px ${FONT}, sans-serif`;
    const larguraTexto = g.measureText(e.texto).width + 40;
    const tam = Math.max(34, Math.floor(80 * Math.min(1, c.width / larguraTexto)));
    g.font = `700 ${tam}px ${FONT}, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.lineWidth = 22;
    g.strokeStyle = "#241403";
    g.strokeText(e.texto, 320, 68);
    g.fillStyle = AMARELO;
    g.fillText(e.texto, 320, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [e.texto]);
  const dir = new THREE.Vector3(...e.para).sub(new THREE.Vector3(...e.de));
  const comp = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const meio: V = [(e.de[0] + e.para[0]) / 2, (e.de[1] + e.para[1]) / 2, (e.de[2] + e.para[2]) / 2];
  const l = e.esc ?? larg;
  return (
    <group>
      <sprite position={e.de} scale={[l, l * 0.2, 1]} renderOrder={20}><spriteMaterial map={tex} transparent depthTest={false} /></sprite>
      <mesh position={meio} quaternion={q} renderOrder={19}><cylinderGeometry args={[0.018, 0.018, comp, 6]} /><meshBasicMaterial color={AMARELO} depthTest={false} /></mesh>
      <mesh position={e.para} renderOrder={19}><sphereGeometry args={[0.06, 8, 8]} /><meshBasicMaterial color={AMARELO} depthTest={false} /></mesh>
    </group>
  );
};

/* ---------- a caixa de concreto ---------- */

type Cx = {
  ferro: number; concreto: number; raioX: number; saida: number; tampa: number; laje: number; grossa: number;
  troca: number; verga: number; racha: number; t: number; sala: boolean;
};

type Haste = { a: V; b: V; ordem: number };
const HASTES: Haste[] = (() => {
  const h: Haste[] = [];
  const yv = [PISO + 0.05, TETO_B + 0.15];
  let i = 0;
  const N = 40;
  // verticais nas três paredes
  for (let z = -3.3; z <= -0.15; z += 0.55) { h.push({ a: [-WC, yv[0], z], b: [-WC, yv[1], z], ordem: (i++ % N) / N }); h.push({ a: [WC, yv[0], z], b: [WC, yv[1], z], ordem: (i++ % N) / N }); }
  for (let x = -(BXI - 0.5); x <= BXI - 0.49; x += 0.5) h.push({ a: [x, yv[0], -3.25], b: [x, yv[1], -3.25], ordem: (i++ % N) / N });
  // horizontais
  for (let y = -3.55; y <= -1.5; y += 0.5) {
    h.push({ a: [-WC, y, -3.3], b: [-WC, y, -0.1], ordem: (i++ % N) / N });
    h.push({ a: [WC, y, -3.3], b: [WC, y, -0.1], ordem: (i++ % N) / N });
    h.push({ a: [-WC, y, -3.25], b: [WC, y, -3.25], ordem: (i++ % N) / N });
  }
  // malha do piso e do teto
  for (const y of [-3.9, TETO_B + 0.15]) {
    for (let x = -WC; x <= WC + 0.01; x += 0.52) h.push({ a: [x, y, -3.3], b: [x, y, -0.1], ordem: (i++ % N) / N });
    for (let z = -3.3; z <= -0.09; z += 0.55) h.push({ a: [-WC, y, z], b: [WC, y, z], ordem: (i++ % N) / N });
  }
  return h;
})();

const Ferragem: React.FC<{ k: number }> = ({ k }) => (
  <group>
    {HASTES.map((h, i) => {
      const s = clamp01((k * 1.4 - h.ordem * 0.4) / 0.35);
      if (s <= 0) return null;
      const b: V = [h.a[0] + (h.b[0] - h.a[0]) * s, h.a[1] + (h.b[1] - h.a[1]) * s, h.a[2] + (h.b[2] - h.a[2]) * s];
      return <Liga key={i} a={h.a} b={b} w={0.06} cil cor={FERRO} />;
    })}
  </group>
);

const tetoRetoGeo = (sag: number) => {
  const g = new THREE.BoxGeometry(2 * BX, TETO_T - TETO_B, BZ + ZF, 28, 1, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setY(i, pos.getY(i) - sag * (1 - (x / BX) * (x / BX)));
  }
  g.computeVertexNormals();
  return g;
};

const timpanoGeo = () => {
  const s = new THREE.Shape();
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const th = (Math.PI * i) / N;
    const x = BXI * Math.cos(th);
    const y = MOLA + 0.6 * Math.sin(th);
    if (i) s.lineTo(x, y); else s.moveTo(x, y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: BZ - BZI, bevelEnabled: false });
  g.translate(0, 0, -BZ);
  return g;
};

const arcoGeo = () => {
  const s = new THREE.Shape();
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const th = (Math.PI * i) / N;
    const x = BX * Math.cos(th);
    const y = MOLA + 0.9 * Math.sin(th);
    if (i) s.lineTo(x, y); else s.moveTo(x, y);
  }
  for (let i = N; i >= 0; i--) {
    const th = (Math.PI * i) / N;
    s.lineTo(BXI * Math.cos(th), MOLA + 0.6 * Math.sin(th));
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: BZ + ZF, bevelEnabled: false });
  g.translate(0, 0, -BZ);
  return g;
};

/** A terra que enche o canto entre a abóbada e o teto reto (de y = -1,9 a -1,0). */
const reforcoGeo = () => {
  const s = new THREE.Shape();
  s.moveTo(-BX, MOLA);
  s.lineTo(-BX, TETO_T);
  s.lineTo(BX, TETO_T);
  s.lineTo(BX, MOLA);
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const th = (Math.PI * i) / N;
    s.lineTo(BX * Math.cos(th), MOLA + 0.9 * Math.sin(th));
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: HZ, bevelEnabled: false });
  g.translate(0, 0, -HZ);
  return g;
};

const Concreto: React.FC<{ c: Cx }> = ({ c }) => {
  const arco = useMemo(arcoGeo, []);
  const timpano = useMemo(timpanoGeo, []);
  const sagQ = Math.round(c.verga * 56) / 200; // até 0,28 m, em passos de 5 mm
  const reto = useMemo(() => tetoRetoGeo(sagQ), [sagQ]);
  const op = 1 - 0.72 * c.raioX;
  const trans = c.raioX > 0.02;
  const pour = clamp01((c.concreto - 0.1) / 0.6);
  const vaultWall = clamp01((c.troca - 0.1) / 0.3);
  const wallTop = lerp(TETO_B, MOLA, vaultWall);
  const topoVisivel = PISO + (wallTop - PISO) * pour;
  const piso = clamp01(c.concreto * 8);
  const gE = ENG * c.grossa; // a parede engrossa PARA FORA, contra a terra; o vão não muda
  const xi = BXI;
  const foraE = BX + gE;
  const retoOp = op * clamp01((c.concreto - 0.85) / 0.15) * (1 - clamp01(c.troca / 0.4));
  const arcoOp = op * clamp01((c.troca - 0.3) / 0.4);
  const ladoDireito = c.saida > 0.3;
  const alturaPar = Math.max(topoVisivel - PISO, 0);
  const mat = (cor: string) => <meshStandardMaterial color={cor} roughness={0.85} transparent={trans} opacity={op} depthWrite={!trans} />;
  const parede = (s: number, a: number, b2: number, cor: string, baixoFrente: number) => {
    const h2 = Math.max(PISO + alturaPar - baixoFrente, 0);
    return (
      <group>
        <mesh position={[(s * (a + b2)) / 2, PISO + alturaPar / 2, (-BZ - 0.9) / 2]}><boxGeometry args={[b2 - a, alturaPar, BZ - 0.9]} />{mat(cor)}</mesh>
        {h2 > 0.01 && <mesh position={[(s * (a + b2)) / 2, baixoFrente + h2 / 2, (ZF - 0.9) / 2]}><boxGeometry args={[b2 - a, h2, 0.9 + ZF]} />{mat(cor)}</mesh>}
      </group>
    );
  };
  const laje = c.laje;
  const lx = BX + laje * (HW - 0.05 - BX);
  const lb = BASE - 0.4 * laje;
  return (
    <group>
      {/* piso (e a laje larga e grossa) */}
      {piso > 0.01 && (
        <mesh position={[0, (lb + PISO) / 2, (ZF - BZ - laje * 0.45) / 2]}>
          <boxGeometry args={[2 * lx, PISO - lb, BZ + laje * 0.45 + ZF]} />
          {mat(laje > 0.05 ? "#a7abb0" : "#b5b8bc")}
        </mesh>
      )}
      {/* paredes */}
      {alturaPar > 0.01 && (
        <group>
          {parede(-1, xi, BX, CONC, c.sala ? -2.2 : PISO)}
          {gE > 0.01 && parede(-1, BX, foraE, "#f1f3f5", c.sala ? -2.2 : PISO)}
          {parede(1, xi, BX, CONC, ladoDireito ? -2.2 : PISO)}
          <mesh position={[0, PISO + alturaPar / 2, -(BZ + BZI) / 2 + ZF / 2 - 0.0]}><boxGeometry args={[2 * BX, alturaPar, BZ - BZI]} />{mat("#b8bbbf")}</mesh>
        </group>
      )}
      {/* teto reto */}
      {retoOp > 0.01 && (
        <mesh geometry={reto} position={[0, (TETO_B + TETO_T) / 2 + 0.6 * c.troca, (ZF - BZ) / 2]}>
          <meshStandardMaterial color={CONC} roughness={0.85} transparent={retoOp < 1} opacity={retoOp} depthWrite={retoOp >= 1} />
        </mesh>
      )}
      {/* abóbada */}
      {arcoOp > 0.01 && (
        <mesh geometry={arco} position={[0, -(1 - clamp01((c.troca - 0.3) / 0.4)) * 0.6, 0]}>
          <meshStandardMaterial color="#cfd2d6" roughness={0.85} transparent={arcoOp < 1} opacity={arcoOp} depthWrite={arcoOp >= 1} />
        </mesh>
      )}
      {arcoOp > 0.01 && (
        <mesh geometry={timpano} position={[0, -(1 - clamp01((c.troca - 0.3) / 0.4)) * 0.6, 0]}>
          <meshStandardMaterial color="#b8bbbf" roughness={0.85} transparent={arcoOp < 1} opacity={arcoOp} depthWrite={arcoOp >= 1} />
        </mesh>
      )}
      {/* rachadura e poeira */}
      {c.racha > 0.02 && c.troca < 0.2 && (() => {
        const yb = TETO_B - sagQ;
        const r = c.racha;
        const z = ZF + 0.012;
        return (
          <group>
            <Liga a={[0.0, yb, z]} b={[0.07, yb + 0.1 * r, z]} w={0.035} e={0.01} cor="#1d1a18" />
            <Liga a={[0.07, yb + 0.1 * r, z]} b={[-0.05, yb + 0.2 * r, z]} w={0.035} e={0.01} cor="#1d1a18" />
            <Liga a={[-0.05, yb + 0.2 * r, z]} b={[0.06, yb + 0.3 * r, z]} w={0.035} e={0.01} cor="#1d1a18" />
            <Liga a={[-0.5, yb + 0.03, z]} b={[-0.42, yb + 0.03 + 0.18 * r, z]} w={0.03} e={0.01} cor="#1d1a18" />
            <Liga a={[0.55, yb + 0.03, z]} b={[0.46, yb + 0.03 + 0.2 * r, z]} w={0.03} e={0.01} cor="#1d1a18" />
            {Array.from({ length: 10 }).map((_, i) => {
              const u = (c.t * 0.8 + rnd(i)) % 1;
              return <B key={i} p={[(rnd(i + 4) - 0.5) * 0.9, yb - u * 1.1, 0.12]} t={[0.07, 0.07, 0.07]} cor="#a9acb0" op={r > 0.4 ? 1 - u * 0.6 : 0} />;
            })}
          </group>
        );
      })()}
      {/* saída: poço com escada e tampa */}
      {c.saida > 0.01 && (
        <group>
          {(() => {
            const s = clamp01(c.saida);
            const h = (0 - BASE) * Math.min(s * 1.4, 1);
            return (
              <group>
                <B p={[HW - 0.075, BASE + h / 2, (ZF - 1.6) / 2]} t={[0.15, h, 1.6 + ZF]} cor={CONC} />
                <B p={[(BX + HW) / 2, BASE + h / 2, -1.525]} t={[HW - BX, h, 0.15]} cor="#b8bbbf" />
                <B p={[(BX + HW) / 2, (BASE + PISO) / 2, (ZF - 1.6) / 2]} t={[HW - BX, PISO - BASE, 1.6 + ZF]} cor="#b5b8bc" />
                <B p={[BX + ENG / 2, BASE + h / 2, -1.25]} t={[ENG, h, 0.7]} cor={CONC} />
                <B p={[BX + ENG / 2, -2.2 + Math.max(BASE + h + 2.2, 0) / 2, (ZF - 0.9) / 2]} t={[ENG, Math.max(BASE + h + 2.2, 0.001), 0.9 + ZF]} cor={CONC} />
              </group>
            );
          })()}
          {c.saida > 0.6 && (
            <group>
              {[2.55, 2.8].map((x) => <Liga key={x} a={[x, PISO, -1.38]} b={[x, 0.0, -1.38]} w={0.05} cil cor="#e0e3e7" />)}
              {Array.from({ length: 13 }).map((_, i) => <Liga key={i} a={[2.55, PISO + 0.25 + i * 0.3, -1.38]} b={[2.8, PISO + 0.25 + i * 0.3, -1.38]} w={0.04} cil cor="#e0e3e7" />)}
              <group position={[0, 0.07, -1.6]} rotation={[-c.tampa * 1.75, 0, 0]}>
                <B p={[(BX + HW) / 2, 0, 0.8]} t={[HW - BX + 0.04, 0.14, 1.64]} cor="#e0a22a" sombra />
                <B p={[(BX + HW) / 2, 0.09, 1.2]} t={[0.4, 0.04, 0.08]} cor="#6b4a14" />
              </group>
            </group>
          )}
        </group>
      )}
    </group>
  );
};

/* ---------- aterro, água, setas ---------- */

const Aterro: React.FC<{ terra: number; troca: number; umido: number; sala: boolean; fade: number }> = ({ terra, troca, umido, sala, fade }) => {
  const reforco = useMemo(reforcoGeo, []);
  if (terra <= 0.01) return null;
  const yfill = lerp(BASE, 0, terra);
  const verde = clamp01((terra - 0.85) / 0.15);
  return (
    <group>
      <Camadas x0={-HW} x1={-BX} z0={-HZ} z1={0} top={yfill} base={sala ? Math.max(BASE, SALA_TETO) : BASE} umido={umido} verde={verde} fade={fade} />
      <Camadas x0={BX} x1={HW} z0={-HZ} z1={-1.6} top={yfill} base={BASE} umido={umido} verde={verde} fade={fade} />
      <Camadas x0={-BX} x1={BX} z0={-HZ} z1={-BZ} top={yfill} base={BASE} umido={umido} verde={verde} fade={fade} />
      {yfill > TETO_T && <Camadas x0={-BX} x1={BX} z0={-HZ} z1={0} top={yfill} base={TETO_T} umido={umido} verde={verde} fade={fade} />}
      {troca > 0.2 && yfill > TETO_T && (
        <mesh geometry={reforco}><meshStandardMaterial color="#8b5b39" roughness={0.95} /></mesh>
      )}
    </group>
  );
};

const Agua: React.FC<{ nivel: number; depth: number; t: number }> = ({ nivel, depth, t }) => {
  if (nivel <= 0.02) return null;
  const y = -depth + nivel;
  return (
    <group>
      <mesh position={[0, -depth + nivel / 2, -HZ / 2 + 0.01]}>
        <boxGeometry args={[2 * HW - 0.02, nivel, HZ]} />
        <meshStandardMaterial color="#3f93e6" transparent opacity={0.5} roughness={0.2} depthWrite={false} />
      </mesh>
      <mesh position={[0, y + 0.01, -HZ / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2 * HW - 0.02, HZ]} />
        <meshStandardMaterial color="#9fd0ff" transparent opacity={0.6 + 0.1 * Math.sin(t * 4)} />
      </mesh>
    </group>
  );
};

/** O lençol de água: tinge a terra abaixo do nível `L` e enche as folgas em volta da caixa. */
const Lencol: React.FC<{ L: number; sobe: number; folgas: boolean }> = ({ L, sobe, folgas }) => {
  const cor = "#1f6fd0";
  const faixa = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) => (y1 - y0 > 0.01 ? (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]}>
      <boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} />
      <meshStandardMaterial color={cor} transparent opacity={0.16} depthWrite={false} roughness={0.3} />
    </mesh>
  ) : null);
  return (
    <group>
      {faixa(-14, -HW, -40, 0.015, -16, L)}
      {faixa(HW, 14, -40, 0.015, -16, L)}
      {faixa(-HW, HW, -40, -HZ, -16, L)}
      {faixa(-HW, HW, -HZ, 0.015, -16, Math.min(L, BASE))}
      {folgas && (
        <group>
          {faixa(-HW, -BX, -HZ, 0.015, BASE, L)}
          {faixa(BX, HW, -HZ, -1.6, BASE, L)}
          {faixa(-BX, BX, -HZ, -BZ, BASE, L)}
          {sobe > 0.01 && faixa(-BX, BX, -BZ, 0.015, BASE, Math.min(L, BASE + sobe))}
        </group>
      )}
      <Liga a={[-HW - 8, L, 0.03]} b={[-HW, L, 0.03]} w={0.07} e={0.01} cor="#cfeaff" basico />
      <Liga a={[HW, L, 0.03]} b={[HW + 8, L, 0.03]} w={0.07} e={0.01} cor="#cfeaff" basico />
    </group>
  );
};

/** Setas de força, desenhadas na frente do corte. */
const Setas: React.FC<{ modo: string; sag: number; t: number; gE: number }> = ({ modo, sag, t, gE }) => {
  const pulso = 0.85 + 0.15 * Math.sin(t * 7);
  const z = 0.12;
  if (modo === "tracao") {
    const y = TETO_B - sag - 0.12;
    return (
      <group>
        <Seta3 a={[-0.3, y, z]} b={[-1.5 * pulso, y, z]} cor={VERMELHO} w={0.1} />
        <Seta3 a={[0.3, y, z]} b={[1.5 * pulso, y, z]} cor={VERMELHO} w={0.1} />
      </group>
    );
  }
  if (modo === "curva") {
    const pts: [number, number][] = [];
    for (let i = 1; i < 8; i++) { const th = (Math.PI * i) / 8; pts.push([th, 0]); }
    return (
      <group>
        {pts.map(([th], i) => {
          const x = BX * Math.cos(th) * 0.98;
          const y = MOLA + 0.9 * Math.sin(th) * 0.98 + 0.04;
          // tangente apontando para o pé do arco mais próximo
          const lado = th < Math.PI / 2 ? 1 : -1;
          const tx = -BX * Math.sin(th);
          const ty = 0.9 * Math.cos(th);
          const n = Math.hypot(tx, ty);
          const dx = (lado === 1 ? 1 : -1) * Math.abs(tx / n) * 0.5 * pulso;
          const dy = (ty / n) * (lado === 1 ? -1 : 1) * -0.5 * pulso * (lado === 1 ? 1 : 1);
          return <Seta3 key={i} a={[x, y, z]} b={[x + dx, y - Math.abs(dy) * 1.0 - 0.1, z]} cor={AZUL} w={0.085} />;
        })}
        {[-1, 1].map((s) => <Seta3 key={s} a={[s * (BXI + 0.1), MOLA - 0.05, z]} b={[s * (BXI + 0.1), MOLA - 0.95 * pulso, z]} cor={AZUL} w={0.1} />)}
      </group>
    );
  }
  if (modo === "empuxo") {
    // o empuxo da abóbada empurra a base para fora e PARA na parede (grossa) e na terra ao lado
    const xo = BX + gE;
    const y = MOLA - 0.7;
    return (
      <group>
        <Seta3 a={[-(BXI - 0.9), y, z]} b={[-(xo - 0.05 + 0.2 * (pulso - 0.85)), y, z]} cor={VERMELHO} w={0.12} />
        <Seta3 a={[BXI - 0.9, y, z]} b={[BX - 0.05 + 0.2 * (pulso - 0.85), y, z]} cor={VERMELHO} w={0.12} />
        <Liga a={[-xo, y - 0.35, z]} b={[-xo, y + 0.35, z]} w={0.07} e={0.02} cor={AMARELO} basico />
        <Liga a={[BX, y - 0.35, z]} b={[BX, y + 0.35, z]} w={0.07} e={0.02} cor={AMARELO} basico />
      </group>
    );
  }
  if (modo === "agua") {
    return (
      <group>
        {[-1.6, -0.55, 0.55, 1.6].map((x) => <Seta3 key={x} a={[x, BASE - 0.55, z]} b={[x, BASE + 0.25 * pulso + 0.15, z]} cor={AZUL} w={0.11} />)}
      </group>
    );
  }
  if (modo === "peso") {
    return (
      <group>
        {[-1.4, 0, 1.4].map((x) => <Seta3 key={x} a={[x, 1.7, z]} b={[x, 0.2 + 0.1 * pulso, z]} cor="#ff8a1f" w={0.12} />)}
      </group>
    );
  }
  return null;
};

/* ---------- ar, canos, torre, ventilador ---------- */

const CANO_BAIXO: V[] = [[-1.45, 0.85, 0.15], [-1.45, -0.7, 0.15], [-1.45, -3.45, 0.15]];
const CANO_ALTO: V[] = [[1.45, -1.5, 0.15], [1.45, 1.45, 0.15]];

const Canos: React.FC<{ t: number; fluxo: number; fechados: number; vent: number }> = ({ t, fluxo, fechados, vent }) => {
  const baixo: Trecho = { curva: caminhoReto(CANO_BAIXO, 0.05), cores: [[0, "#7fd0ff"]], raio: 0.095, bola: 0.075, densidade: 5, cano: "#d6dee6" };
  const alto: Trecho = { curva: caminhoReto(CANO_ALTO, 0.05), cores: [[0, "#ff9a3c"], [1, "#ff4a3a"]], raio: 0.095, bola: 0.075, densidade: 5, cano: "#d6dee6" };
  const andou = t * 0.8 * fluxo;
  const ang = t * 18 * vent;
  return (
    <group>
      <CanoComFluxo trecho={baixo} t={t} deslocamento={andou} />
      <CanoComFluxo trecho={alto} t={t} deslocamento={andou} />
      {/* chapéus nas pontas */}
      {[[-1.45, 0.9], [1.45, 1.5]].map(([x, y]) => (
        <mesh key={x} position={[x, y, 0.15]}><coneGeometry args={[0.28, 0.2, 10]} /><meshStandardMaterial color="#8d949c" roughness={0.6} metalness={0.4} /></mesh>
      ))}
      {/* ventilador no cano de baixo */}
      <group position={[-1.45, -0.7, 0.15]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 0.2, 20, 1, true]} /><meshStandardMaterial color="#6e7782" roughness={0.5} metalness={0.5} side={THREE.DoubleSide} /></mesh>
        <group rotation={[0, 0, ang]} position={[0, 0, 0.02]}>
          {[0, 1, 2].map((i) => <B key={i} p={[0, 0, 0]} t={[0.52, 0.11, 0.025]} cor="#ffd23f" r={[0, 0, (i * Math.PI) / 3]} />)}
          <mesh><cylinderGeometry args={[0.06, 0.06, 0.06, 10]} /><meshStandardMaterial color="#2b2f35" /></mesh>
        </group>
      </group>
      {/* tampas nos canos */}
      {fechados > 0.02 && [[-1.45, 0.98], [1.45, 1.58]].map(([x, y]) => (
        <group key={x} position={[x, y + (1 - fechados) * 0.5, 0.15]} scale={fechados}>
          <B p={[0, 0, 0]} t={[0.5, 0.1, 0.3]} cor="#d62c2c" />
        </group>
      ))}
    </group>
  );
};

const Ar: React.FC<{ t: number; co2: number; fluxo: number; n: number }> = ({ t, co2, fluxo, n }) => {
  const cor = mistura("#bfe8ff", "#ff4b3a", co2);
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const bx = (rnd(i) - 0.5) * 3.2;
        const by = PISO + 0.35 + rnd(i + 7) * 1.9;
        const bz = -0.4 - rnd(i + 13) * 2.4;
        const u = (t * 0.25 * fluxo + rnd(i + 21)) % 1;
        const x = bx + Math.sin(t * 0.8 + i) * 0.06 + (u - 0.5) * 1.0 * (fluxo > 0 ? 1 : 0);
        const y = by + Math.cos(t * 0.7 + i * 2) * 0.05 + (fluxo > 0 ? Math.sin(u * Math.PI) * 0.25 : 0);
        return <mesh key={i} position={[x, y, bz]}><sphereGeometry args={[0.045, 8, 8]} /><meshBasicMaterial color={cor} transparent opacity={0.85} /></mesh>;
      })}
    </group>
  );
};

const Vela: React.FC<{ t: number; fluxo: number }> = ({ t, fluxo }) => (
  <group position={[0.05, PISO, -1.9]}>
    <B p={[0, 0.2, 0]} t={[0.4, 0.4, 0.4]} cor="#7a4a26" />
    <B p={[0, 0.5, 0]} t={[0.06, 0.2, 0.06]} cor="#f4f1ea" />
    <mesh position={[0, 0.65, 0]} scale={[1, 1.5 + 0.2 * Math.sin(t * 20), 1]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#ffb52e" /></mesh>
    <Nuvem t={t} de={[0, 0.7, 0]} rumo={[fluxo * 0.4, 1, 0]} n={7} tamanho={0.5} forca={0.9} cor="#cfd3d8" />
  </group>
);

const Torre: React.FC<{ cal: number; fluxo: number; t: number; monoxido: number }> = ({ cal, fluxo, t, monoxido }) => {
  const camadas = 12;
  return (
    <group position={[-1.25, PISO, -2.5]}>
      <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.36, 0.36, 1.9, 20]} /><meshStandardMaterial color="#bfe0ee" transparent opacity={0.22} roughness={0.1} depthWrite={false} /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.42, 0.42, 0.05, 20]} /><meshStandardMaterial color="#5b6570" /></mesh>
      <mesh position={[0, 1.92, 0]}><cylinderGeometry args={[0.4, 0.4, 0.05, 20]} /><meshStandardMaterial color="#5b6570" /></mesh>
      {Array.from({ length: camadas }).map((_, i) => {
        const cheia = i < Math.round(cal * camadas);
        return <mesh key={i} position={[0, 0.12 + i * 0.15, 0]}><cylinderGeometry args={[0.33, 0.33, 0.13, 18]} /><meshStandardMaterial color={cheia ? "#3b3e44" : "#f0ede4"} roughness={0.95} /></mesh>;
      })}
      {fluxo > 0 && Array.from({ length: 8 }).map((_, i) => {
        const u = (t * 0.5 * fluxo + i / 8) % 1;
        const cor = mistura("#ff4b3a", "#bfe8ff", clamp01(u * 1.4 + (cal > 0.5 ? 0.0 : 0)));
        return <mesh key={i} position={[Math.sin(i * 2.1) * 0.15, 0.15 + u * 1.7, Math.cos(i * 2.1) * 0.15]}><sphereGeometry args={[0.05, 8, 8]} /><meshBasicMaterial color={cor} /></mesh>;
      })}
      {monoxido > 0.02 && Array.from({ length: 4 }).map((_, i) => {
        const u = (t * 0.5 + i / 4) % 1;
        return <mesh key={i} position={[0, 0.1 + u * 1.8, 0.0]} scale={0.14 + 0.03 * Math.sin(t * 3 + i)}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color="#b58cff" wireframe /></mesh>;
      })}
    </group>
  );
};

/* ---------- gerador, painel, bateria ---------- */

const Gas: React.FC<{ t: number; de: V; rumo: V; k: number; n?: number }> = ({ t, de, rumo, k, n = 6 }) => {
  if (k <= 0.02) return null;
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const u = (t * 0.4 + i / n) % 1;
        const d = u * 2.2;
        return <mesh key={i} position={[de[0] + rumo[0] * d, de[1] + rumo[1] * d + Math.sin(t + i) * 0.05, de[2] + rumo[2] * d]} scale={(0.09 + u * 0.34) * k}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color="#b58cff" wireframe /></mesh>;
      })}
    </group>
  );
};

const Gerador: React.FC<{ onde: string; ligado: boolean; tanque: number; fumaca: number; monoxido: number; t: number; cinza?: number }> = ({ onde, ligado, tanque, fumaca, monoxido, t, cinza = 0 }) => {
  const cor = (c: string) => mistura(c, "#868b92", cinza);
  const dentro = onde === "dentro";
  const naSala = onde === "sala";
  const pos: V = naSala ? [-3.9, PISO, -1.5] : dentro ? [0.35, PISO, -2.1] : [7.9, 0, -0.6];
  const tr = ligado ? Math.sin(t * 70) * 0.006 : 0;
  const dirx = dentro || naSala ? -1 : 1; // o escapamento aponta para longe do bunker (fora) ou para o quarto (dentro)
  return (
    <group position={pos}>
      <group position={[tr, 0, 0]}>
        <B p={[0, 0.38, 0]} t={[0.95, 0.56, 0.6]} cor={cor("#f0a020")} sombra />
        <B p={[0, 0.08, 0]} t={[1.05, 0.12, 0.7]} cor="#2b2f35" />
        <B p={[0, 0.78, 0]} t={[0.7, 0.26, 0.5]} cor={cor("#d94a3a")} />
        <B p={[0.28, 0.38, 0.31]} t={[0.3, 0.3, 0.02]} cor="#2b2f35" />
        {/* medidor de combustível */}
        <B p={[-0.3, 0.4, 0.31]} t={[0.1, 0.4, 0.03]} cor="#f4f1ea" />
        <B p={[-0.3, 0.2 + 0.2 * tanque, 0.33]} t={[0.07, 0.4 * tanque + 0.01, 0.03]} cor={tanque < 0.15 ? "#ff3a3a" : "#3ed36f"} />
        {/* escapamento */}
        {!naSala && <Liga a={[dirx * 0.45, 0.55, -0.1]} b={[dirx * 0.95, 0.7, -0.1]} w={0.1} cil cor="#7d858e" />}
      </group>
      {!naSala && fumaca > 0.02 && <Nuvem t={t} de={[dirx * 0.95, 0.75, -0.1]} rumo={[dirx * 0.6, 0.8, 0]} n={10} tamanho={0.8} forca={fumaca} cor="#585d63" />}
      {!naSala && <Gas t={t} de={[dirx * 0.95, 0.75, -0.1]} rumo={[dirx * 0.9, 0.3, 0.1]} k={monoxido} />}
    </group>
  );
};

/** A sala extra: porta ligada ao poço da escada (abre para a câmera), luz que acende e prateleiras com galões de água e caixas de comida. */
const SalaExtra: React.FC<{ porta: number; luz: number }> = ({ porta, luz }) => {
  const zf = ZF + 0.01;
  const x0 = EX_X0 + 0.3; // face de dentro da parede da esquerda
  const x1 = EX_X1 - 0.3; // face de dentro da parede da direita
  const gal = (x: number, y: number, z: number, i: number) => (
    <group key={`g${i}`} position={[x, y, z]}>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.17, 0.17, 0.4, 14]} /><meshStandardMaterial color="#5ab3ff" transparent opacity={0.85} roughness={0.2} /></mesh>
      <mesh position={[0, 0.43, 0]}><cylinderGeometry args={[0.07, 0.07, 0.06, 10]} /><meshStandardMaterial color="#f4f1ea" /></mesh>
    </group>
  );
  const caixa = (x: number, y: number, z: number, cor: string, i: number) => (
    <group key={`c${i}`} position={[x, y, z]}>
      <B p={[0, 0.14, 0]} t={[0.4, 0.28, 0.3]} cor={cor} />
      <B p={[0, 0.14, 0.152]} t={[0.3, 0.12, 0.01]} cor="#f4f1ea" />
    </group>
  );
  const cores = ["#e0493a", "#f0b429", "#3ea6ff", "#6bbf59"];
  return (
    <group>
      {/* paredes, piso e laje */}
      <B p={[(EX_X0 + EX_X1) / 2, (BASE + PISO) / 2, (zf - SALA_Z) / 2]} t={[EX_X1 - EX_X0, PISO - BASE, SALA_Z + zf]} cor="#b5b8bc" />
      <B p={[(EX_X0 + EX_X1) / 2, -1.95, (zf - SALA_Z) / 2]} t={[EX_X1 - EX_X0, 0.3, SALA_Z + zf]} cor={CONC} />
      <B p={[EX_X1 - 0.15, (BASE + SALA_TETO) / 2, (zf - SALA_Z) / 2]} t={[0.3, SALA_TETO - BASE, SALA_Z + zf]} cor={CONC} />
      <B p={[EX_X0 + 0.15, -2.95, (-SALA_Z + 0.9) / 2 - 0.0]} t={[0.3, 1.75, SALA_Z - 0.9]} cor={CONC} />
      <B p={[EX_X0 + 0.15, -2.15, (zf - 0.9) / 2]} t={[0.3, 0.3, 0.9 + zf]} cor={CONC} />
      <B p={[(x0 + x1) / 2, (PISO - 2.1) / 2, -SALA_Z + 0.1]} t={[x1 - x0, 1.65, 0.2]} cor="#b8bbbf" />
      {/* prateleiras: galões de água embaixo e no chão, caixas de comida em cima */}
      {[-3.3, -2.6].map((y) => <B key={y} p={[(x0 + x1) / 2 + 0.2, y, -2.7]} t={[x1 - x0 - 0.5, 0.06, 0.5]} cor="#8a5a2e" />)}
      {Array.from({ length: 6 }).map((_, i) => gal(x0 + 0.4 + i * 0.5, -3.27, -2.7, i))}
      {Array.from({ length: 4 }).map((_, i) => gal(x0 + 0.55 + i * 0.55, PISO, -1.7, 10 + i))}
      {Array.from({ length: 6 }).map((_, i) => caixa(x0 + 0.4 + i * 0.5, -2.57, -2.7, cores[i % 4], i))}
      {Array.from({ length: 5 }).map((_, i) => caixa(x0 + 0.45 + i * 0.55, PISO, -2.5, cores[(i + 1) % 4], 20 + i))}
      {/* a porta de aço entre o poço e a sala (a folha abre para a câmera, presa pela direita) */}
      <group position={[EX_X0 + 0.5, -2.975, 0.08]}>
        <group rotation={[0, porta * 1.5, 0]}>
          <B p={[-0.45, 0, 0]} t={[0.88, 1.52, 0.05]} cor="#8a6a3a" met={0.2} />
          <B p={[-0.8, 0, 0.04]} t={[0.1, 0.24, 0.05]} cor={AMARELO} />
        </group>
      </group>
      {/* escuro até a luz acender */}
      <mesh position={[(x0 + x1) / 2, (PISO - 2.1) / 2, (0.06 - SALA_Z) / 2]}>
        <boxGeometry args={[x1 - x0, 1.65, SALA_Z + 0.06]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.62 * (1 - luz)} depthWrite={false} />
      </mesh>
      <Liga a={[(x0 + x1) / 2, -2.1, -1.4]} b={[(x0 + x1) / 2, -2.3, -1.4]} w={0.02} cil cor="#2b2f35" />
      <mesh position={[(x0 + x1) / 2, -2.38, -1.4]}><sphereGeometry args={[0.09, 10, 10]} /><meshStandardMaterial color="#fff2c4" emissive="#ffe49a" emissiveIntensity={0.1 + 2.4 * luz} /></mesh>
      {luz > 0.02 && <pointLight position={[(x0 + x1) / 2, -2.5, -1.0]} intensity={22 * luz} distance={7} decay={1.4} color="#ffe2b0" />}
    </group>
  );
};

/** Um painel solar de pé, inclinado para cima, com a FACE (células e grade) virada para a câmera: 4 × 3 células. */
const PainelUm: React.FC<{ x: number; sol: number }> = ({ x, sol }) => (
  <group position={[x, 0, -1.0]}>
    <group position={[0, 1.15, 0]} rotation={[0.95, 0, 0]}>
      <B p={[0, 0, 0]} t={[2.3, 0.08, 1.5]} cor="#c9ced4" met={0.5} />
      {Array.from({ length: 4 }).flatMap((_, i) => Array.from({ length: 3 }).map((__, j) => (
        <B key={`${i}${j}`} p={[-0.855 + i * 0.57, 0.05, -0.46 + j * 0.46]} t={[0.52, 0.02, 0.4]} cor={mistura("#070d24", "#1c3f8f", sol)} emi="#3a7bff" brilho={0.9 * sol} rug={0.2} met={0.4} />
      )))}
    </group>
    {[-1, 1].map((s) => <Liga key={s} a={[s * 0.85, 0, -0.6]} b={[s * 0.85, 1.6, -0.4]} w={0.08} cil cor="#8d949c" />)}
  </group>
);

/** Dois painéis lado a lado (24 células no total). */
const Painel: React.FC<{ sol: number }> = ({ sol }) => (
  <group>
    <PainelUm x={5.0} sol={sol} />
    <PainelUm x={7.5} sol={sol} />
  </group>
);

const Bateria: React.FC<{ nivel: number }> = ({ nivel }) => {
  const barras = 5;
  const aceso = Math.round(nivel * barras);
  const cor = nivel > 0.5 ? "#3ed36f" : nivel > 0.25 ? "#ffd23f" : "#ff3a3a";
  return (
    <group position={[1.35, PISO, -2.55]}>
      <B p={[0, 0.3, 0]} t={[0.5, 0.6, 0.45]} cor="#2d3a55" sombra />
      <B p={[-0.13, 0.64, 0]} t={[0.08, 0.07, 0.08]} cor="#c9ced4" />
      <B p={[0.13, 0.64, 0]} t={[0.08, 0.07, 0.08]} cor="#c9ced4" />
      {Array.from({ length: barras }).map((_, i) => <B key={i} p={[-0.18 + i * 0.09, 0.3, 0.24]} t={[0.07, 0.3, 0.02]} cor={i < aceso ? cor : "#454d5c"} emi={i < aceso ? cor : undefined} brilho={i < aceso ? 1.4 : 0} />)}
    </group>
  );
};

const Sol: React.FC<{ k: number; t: number }> = ({ k, t }) => (
  <group position={[8.6, 7.4, -14]} scale={k}>
    <mesh><sphereGeometry args={[1.0, 16, 16]} /><meshBasicMaterial color="#ffe36a" /></mesh>
    {Array.from({ length: 10 }).map((_, i) => (
      <group key={i} rotation={[0, 0, (i / 10) * Math.PI * 2 + t * 0.2]}>
        <mesh position={[0, 1.55, 0]}><coneGeometry args={[0.2, 0.7, 4]} /><meshBasicMaterial color="#ffd23f" /></mesh>
      </group>
    ))}
  </group>
);

const Lua: React.FC<{ k: number }> = ({ k }) => {
  if (k <= 0.02) return null;
  return (
    <group>
      <mesh position={[-5.5, 7, -14]}><sphereGeometry args={[0.9, 16, 16]} /><meshBasicMaterial color="#f4f1e0" /></mesh>
      {Array.from({ length: 36 }).map((_, i) => <mesh key={i} position={[(rnd(i) - 0.5) * 30, 2.5 + rnd(i + 30) * 8, -22]} scale={0.05 + rnd(i + 60) * 0.08}><sphereGeometry args={[1, 6, 6]} /><meshBasicMaterial color="#fff6c8" transparent opacity={k} /></mesh>)}
    </group>
  );
};

/* ---------- gente ---------- */

type Estado = [number, string, string?];
type GenteDef = { pula?: number; id: string; x?: Valor; y?: Valor; z?: Valor; rot?: number; esc?: number; deita?: Valor; acao?: string | Estado[]; exp?: Expressao3D };
const PERSONAGENS: Record<string, Personagem3D> = { zeca, ...MORADORES };

const Gente: React.FC<{ g: GenteDef; p: number; t: number }> = ({ g, p, t }) => {
  const pers = PERSONAGENS[g.id];
  if (!pers) throw new Error(`personagem do abrigo desconhecido: ${g.id}`);
  let acao = "em-pe";
  let exp: Expressao3D = g.exp ?? "neutro";
  if (typeof g.acao === "string") acao = g.acao;
  else if (Array.isArray(g.acao)) {
    const e = g.acao.find((x) => p <= x[0]) ?? g.acao[g.acao.length - 1];
    acao = e[1];
    if (e[2]) exp = e[2] as Expressao3D;
  }
  const deita = valor(g.deita, p, 0);
  const pose = poseDe3D(acao, t);
  const x = valor(g.x, p, 0);
  const y = valor(g.y, p, 0) + (g.pula ? Math.abs(Math.sin(t * 5.5)) * g.pula : 0);
  const z = valor(g.z, p, 0);
  const ang = -Math.PI / 2 * deita; // deitado de lado, com a cabeça para a esquerda do quadro
  return (
    <group position={[x, y + 0.2 * deita, z]} rotation={[0, g.rot ?? 0, 0]} scale={g.esc ?? 1}>
      <group rotation={[0, 0, -ang]}>
        <Boneco3D p={pers} pose={pose} expressao={deita > 0.5 ? "cansado" : exp} pisca={piscar(t + x)} t={t} />
      </group>
    </group>
  );
};

/* ---------- escavadeira ---------- */

const ik2 = (base: V, alvo: V, l1: number, l2: number): V => {
  const dx = alvo[0] - base[0];
  const dy = alvo[1] - base[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-3);
  const a = Math.atan2(dy, dx);
  const c = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  return [base[0] + Math.cos(a + c) * l1, base[1] + Math.sin(a + c) * l1, base[2]];
};

const Escavadeira: React.FC<{ t: number; terra: number }> = ({ t, terra }) => {
  const ciclo = (t * 0.45) % 1;
  const k = ciclo < 0.5 ? ciclo / 0.5 : 1 - (ciclo - 0.5) / 0.5; // 0 = no monte, 1 = sobre o buraco
  const eased = k * k * (3 - 2 * k);
  const base: V = [-7.4, 1.5, -1.6];
  const alvo: V = [lerp(-5.0, -1.6, eased), lerp(0.4, 2.3, eased), -1.6];
  const cotovelo = ik2(base, alvo, 3.2, 2.9);
  const bal = (terra > 0.01 && eased > 0.85) ? 1 : 0;
  return (
    <group>
      {[-0.6, 0.6].map((z) => <B key={z} p={[-7.9, 0.3, -1.6 + z]} t={[2.8, 0.6, 0.5]} cor="#2b2f35" />)}
      <B p={[-7.9, 0.95, -1.6]} t={[2.4, 0.7, 1.5]} cor="#f0b429" sombra />
      <B p={[-8.5, 1.7, -1.6]} t={[1.1, 0.9, 1.1]} cor="#f0b429" sombra />
      <B p={[-8.25, 1.75, -1.0]} t={[0.7, 0.55, 0.04]} cor="#9fe0f7" />
      <Liga a={base} b={cotovelo} w={0.4} e={0.3} cor="#f0b429" />
      <Liga a={cotovelo} b={alvo} w={0.3} e={0.25} cor="#e0a020" />
      <group position={alvo} rotation={[0, 0, lerp(0.2, -1.1, eased)]}>
        <B p={[0.15, -0.2, 0]} t={[0.9, 0.55, 1.0]} cor="#8d949c" met={0.4} />
      </group>
      {bal ? Array.from({ length: 6 }).map((_, i) => {
        const u = (t * 1.5 + i / 6) % 1;
        return <B key={i} p={[alvo[0] + 0.1 + (rnd(i) - 0.5) * 0.7, alvo[1] - 0.5 - u * 2.0, -1.6 + (rnd(i + 4) - 0.5) * 0.8]} t={[0.18, 0.16, 0.18]} cor="#6b4a2f" r={[u * 4, u * 2, 0]} />;
      }) : null}
    </group>
  );
};

/* ---------- vizinhos e ruído ---------- */

const Ondas: React.FC<{ t: number; p: V; k?: number; alcance?: number }> = ({ t, p, k = 1, alcance = 4 }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p}>
      {[0, 1, 2, 3].map((i) => {
        const u = (t * 0.6 + i / 4) % 1;
        return <mesh key={i} scale={0.4 + u * alcance}><torusGeometry args={[1, 0.035, 6, 36]} /><meshBasicMaterial color="#ffd23f" transparent opacity={(1 - u) * 0.75 * k} /></mesh>;
      })}
    </group>
  );
};

/* ---------- a sala do gerador ---------- */

const Sala: React.FC<{ isola: number; ligado: boolean; tanque: number; monoxido: number; escape: boolean; detector: boolean; gerador: boolean; t: number; cinza: number }> = ({ isola, ligado, tanque, monoxido, escape, detector, gerador, t, cinza }) => {
  const cano: Trecho = { curva: caminhoReto([[-3.5, -3.15, 0.15], [-3.5, 0.7, 0.15]], 0.08), cores: [[0, "#b58cff"]], raio: 0.095, bola: 0.07, densidade: 5, cano: "#9aa2aa" };
  const fio: Trecho = { curva: caminhoReto([[-3.4, -3.45, -1.6], [-1.5, -3.45, -1.6], [1.3, -3.6, -2.4]], 0.04), cores: [[0, AMARELO]], raio: 0.03, bola: 0.024, densidade: 18, cano: "#2c3136" };
  const placas = Array.from({ length: 5 }).flatMap((_, i) => Array.from({ length: 3 }).map((__, j) => ({ i, j, o: (i + j * 5) / 15 })));
  const led = Math.sin(t * 6) > 0 ? "#ff3a3a" : "#5a1010";
  const zf = ZF + 0.01;
  return (
    <group>
      {/* concreto: piso, laje, parede da esquerda e parede do fundo */}
      <B p={[(SALA_X0 + SALA_X1) / 2, (BASE + PISO) / 2, (zf - SALA_Z) / 2]} t={[SALA_X1 - SALA_X0, PISO - BASE, SALA_Z + zf]} cor="#b5b8bc" />
      <B p={[(SALA_X0 + SALA_X1) / 2, -1.95, (zf - SALA_Z) / 2]} t={[SALA_X1 - SALA_X0, 0.3, SALA_Z + zf]} cor={CONC} />
      <B p={[SALA_X0 + 0.15, (BASE + SALA_TETO) / 2, (zf - SALA_Z) / 2]} t={[0.3, SALA_TETO - BASE, SALA_Z + zf]} cor={CONC} />
      <B p={[(SALA_X0 + 0.3 + SALA_X1) / 2, (PISO - 2.1) / 2, -SALA_Z + 0.1]} t={[SALA_X1 - SALA_X0 - 0.3, 1.65, 0.2]} cor="#b8bbbf" />
      {/* porta vedada na parede entre as salas (folha de aço com borracha em volta) */}
      <B p={[-2.1, -2.975, 0.06]} t={[0.99, 1.63, 0.03]} cor="#1f2329" />
      <B p={[-2.1, -2.975, 0.095]} t={[0.88, 1.52, 0.04]} cor="#46808c" met={0.3} />
      <B p={[-2.1, -2.975, 0.12]} t={[0.74, 1.38, 0.015]} cor="#3a6e79" />
      <B p={[-1.78, -2.95, 0.15]} t={[0.1, 0.24, 0.05]} cor={AMARELO} />
      {/* detector de monóxido ao lado da porta */}
      {detector && (
        <group position={[-1.48, -2.55, 0.1]}>
          <B p={[0, 0, 0]} t={[0.26, 0.34, 0.09]} cor="#f4f1ea" />
          <B p={[0, 0.07, 0.05]} t={[0.16, 0.1, 0.01]} cor="#2b2f35" />
          <mesh position={[0, -0.08, 0.055]}><sphereGeometry args={[0.035, 10, 10]} /><meshStandardMaterial color={led} emissive={led} emissiveIntensity={2} /></mesh>
        </group>
      )}
      {/* isolamento: placas de espuma no fundo da sala */}
      {placas.map(({ i, j, o }) => {
        const s = clamp01(isola * 1.6 - o * 0.6);
        if (s <= 0.01) return null;
        return <B key={`${i}${j}`} p={[-4.65 + i * 0.5, -3.5 + j * 0.57, -SALA_Z + 0.27]} t={[0.46 * s, 0.53 * s, 0.1]} cor={(i + j) % 2 ? "#4a4f57" : "#393d44"} rug={1} />;
      })}
      {isola > 0.3 && [0, 1, 2].map((j) => <B key={j} p={[-4.86, -3.5 + j * 0.57, -1.5]} t={[0.06, 0.53, 2.6 * clamp01(isola * 1.4 - 0.2)]} cor="#43474f" rug={1} />)}
      {/* o gerador, o cano de escape que sobe até o quintal e o fio que passa pela parede */}
      {gerador && <Gerador onde="sala" ligado={ligado} tanque={tanque} fumaca={0} monoxido={0} t={t} cinza={cinza} />}
      {gerador && escape && (
        <group>
          <CanoComFluxo trecho={cano} t={t} deslocamento={ligado ? t * 0.9 : 0} />
          <mesh position={[-3.5, 0.72, 0.15]}><coneGeometry args={[0.28, 0.2, 10]} /><meshStandardMaterial color="#7d858e" roughness={0.6} metalness={0.4} /></mesh>
          <Gas t={t} de={[-3.5, 0.95, 0.15]} rumo={[-0.3, 1, 0]} k={monoxido} />
        </group>
      )}
      {gerador && escape && <CanoComFluxo trecho={fio} t={t} deslocamento={ligado ? t * 0.9 : 0} />}
    </group>
  );
};

/* ---------- cena ---------- */

const mesmoQue = (v: unknown) => v as Valor;

type Parada = { p: number; pos: V3; alvo: V3; fov?: number };

/** Câmera com paradas: segura um ponto e só depois vai ao seguinte. Roda depois da câmera do palco e a sobrepõe. */
const RotaCamera: React.FC<{ rota: Parada[]; p: number }> = ({ rota, p }) => {
  const { camera } = useThree();
  let i = 0;
  while (i + 1 < rota.length && rota[i + 1].p <= p) i++;
  const a = rota[i];
  const b2 = rota[Math.min(i + 1, rota.length - 1)];
  const k = b2.p > a.p ? suave(clamp01((p - a.p) / (b2.p - a.p))) : 0;
  const pos = lerp3(a.pos, b2.pos, k);
  const alvo = lerp3(a.alvo, b2.alvo, k);
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(...pos);
  cam.fov = lerp(a.fov ?? 50, b2.fov ?? 50, k);
  cam.updateProjectionMatrix();
  cam.lookAt(new THREE.Vector3(...alvo));
  return null;
};

const AbrigoCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, tEpisodio: t }) => {
  const n = (k: string, pad = 0) => valor(mesmoQue(cena[k]), p, pad);
  const b = (k: string) => cena[k] === true;
  const furo = n("furo", 1);
  const depth = FUNDO * furo;
  const umido = n("umido");
  const chuva = n("chuva");
  const noite = n("noite");
  const fade = n("fade");
  const escuro = Math.max(n("escuro"), noite * 0.82, fade * 0.9);
  const reverso = b("reverso");
  const tc = reverso ? -t : t;
  const caixa = b("caixa");
  const terra = n("terra");
  const troca = n("troca");
  const sobe = n("sobe");
  const verga = n("verga");
  const lampada = n("lampada");
  const casa = cena.casa !== false;
  const monteK = (caixa ? 1 : furo) * (1 - 0.97 * terra);
  const lencol = cena.lencol === undefined ? null : n("lencol");
  const sky = mistura(noite > 0.5 ? "#0c1530" : chuva > 0.3 ? "#8d9aa6" : "#bfe3f5", "#03040a", fade);
  const bal = n("balanca") ? Math.sin(t * 2.0) * 0.012 * n("balanca") : 0;
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).filter((e) => {
    const [c, d] = e.split("@");
    const [ini, fim] = (d ?? "0").split("-").map(parseFloat);
    return ETIQ[c] && p >= ini && (fim === undefined || p <= fim);
  }).map((e) => e.split("@")[0]);
  const gente = (cena.gente as GenteDef[] | undefined) ?? [];
  const cx: Cx = { ferro: n("ferro"), concreto: caixa ? n("concreto", 1) : n("concreto"), raioX: n("raioX"), saida: caixa ? n("saida", 0) : n("saida"), tampa: n("tampa", 1), laje: n("laje"), grossa: n("grossa"), troca, verga, racha: n("racha"), t, sala: b("sala") };
  const mostraFerro = cx.ferro > 0.01 && (cx.concreto < 0.98 || cx.raioX > 0.02);
  const mostraCaixa = caixa || cx.concreto > 0.01;
  const ger = cena.gerador as string | undefined;
  const lenco = lencol !== null;
  const fluxo = n("fluxo");
  const sagQ = Math.round(verga * 56) / 200;
  return (
    <group>
      {Array.isArray(cena.rota) && <RotaCamera rota={cena.rota as Parada[]} p={p} />}
      <fog attach="fog" args={[sky, lerp(40, 30, fade), lerp(120, 50, fade)]} />
      <hemisphereLight args={[escuro > 0.5 ? "#8fa6d8" : "#fff6e5", "#6b5a4a", lerp(1.0, 0.36, escuro) * (1 - 0.88 * fade)]} />
      <directionalLight position={[-4, 9, 11]} intensity={lerp(2.4, 0.42, escuro) * (1 - 0.9 * fade)} color={escuro > 0.5 ? "#a9bff5" : "#fff1d6"} castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={40} shadow-bias={-0.0005} />
      {lampada > 0.02 && <pointLight position={[0, -1.7, -1.0]} intensity={26 * lampada} distance={9} decay={1.4} color="#ffd9a0" />}

      <Solo depth={depth} umido={umido} sala={b("sala")} salaEx={b("salaEx")} fade={fade} />
      <Desabamento k={n("desaba")} depth={depth} t={t} />
      <Agua nivel={n("agua")} depth={depth} t={t} />
      <Monte k={monteK} />
      {casa && fade < 0.9 && <Casa />}
      {casa && fade < 0.9 && <Cerca />}
      {casa && fade < 0.9 && [[-10, -8, 1.1], [9.5, -9, 1.0], [-3, -14, 1.3]].map(([x, z, s], i) => <Arvore key={i} x={x} z={z} s={s} />)}
      <Chuva forca={chuva} t={tc} />
      {b("pa") && <Pa t={t} x={-3.5} y={0} />}
      {n("sol") > 0.02 && <Sol k={n("sol")} t={t} />}
      <Lua k={noite} />

      {mostraCaixa && (
        <group position={[0, -2.9 + sobe, 0]}>
          <group rotation={[0, 0, bal]} position={[0, 0, 0]}>
            <group position={[0, 2.9, 0]}>
              <Concreto c={cx} />
              {mostraFerro && <Ferragem k={cx.ferro} />}
              {lampada >= 0 && cena.lampada !== undefined && (
                <group>
                  <Liga a={[0, TETO_B + 0.05, -1.0]} b={[0, -1.75, -1.0]} w={0.02} cil cor="#2b2f35" />
                  <mesh position={[0, -1.82, -1.0]}><sphereGeometry args={[0.09, 10, 10]} /><meshStandardMaterial color="#fff2c4" emissive="#ffe49a" emissiveIntensity={0.2 + 2.4 * lampada} /></mesh>
                </group>
              )}
              {b("ar") && <Ar t={t} co2={n("co2")} fluxo={fluxo} n={46} />}
              {b("vela") && <Vela t={t} fluxo={fluxo} />}
              {b("torre") && <Torre cal={n("cal")} fluxo={n("fluxoTorre")} t={t} monoxido={n("monoxido")} />}
              {ger === "dentro" && <Gerador onde="dentro" ligado={b("gerLigado")} tanque={n("tanque", 1)} fumaca={n("fumaca")} monoxido={n("monoxido")} t={t} />}
              {cena.bateria !== undefined && <Bateria nivel={n("bateria")} />}
            </group>
          </group>
        </group>
      )}
      <Aterro terra={terra} troca={troca} umido={umido} sala={b("sala")} fade={fade} />
      {lenco && <Lencol L={lencol as number} sobe={sobe} folgas={terra < 0.05} />}
      {b("escavadeira") && <Escavadeira t={t} terra={terra} />}
      {b("canos") && <Canos t={t} fluxo={fluxo} fechados={n("fechados")} vent={n("vent")} />}
      {b("salaEx") && <SalaExtra porta={n("porta")} luz={n("luzEx", 1)} />}
      {b("sala") && <Sala cinza={n("gerCinza")} isola={n("isola")} ligado={b("gerLigado")} tanque={n("tanque", 1)} monoxido={n("monoxido")} escape={b("escape")} detector={b("detector")} gerador={ger === "sala"} t={t} />}
      {b("painel") && <Painel sol={n("sol")} />}
      {b("fio") && (
        <CanoComFluxo
          trecho={{ curva: caminhoReto([[4.9, 0.1, -0.4], [2.7, 0.1, -0.4], [2.7, -3.6, -0.4], [1.35, -3.6, -0.4], [1.35, -3.6, -2.5]], 0.04), cores: [[0, AMARELO]], raio: 0.03, bola: 0.024, densidade: 18, cano: "#2c3136" }}
          t={t} deslocamento={t * 0.9}
        />
      )}
      {b("regua") && (
        <group>
          <Liga a={[-3.5, 1.2, 0.1]} b={[(BX + HW) / 2, 1.2, 0.1]} w={0.06} e={0.02} cor={AMARELO} basico />
          {[-3.5, (BX + HW) / 2].map((x) => <Liga key={x} a={[x, 0.95, 0.1]} b={[x, 1.45, 0.1]} w={0.06} e={0.02} cor={AMARELO} basico />)}
        </group>
      )}
      {n("ruido") > 0.02 && <Ondas t={t} p={[-3.9, -2.9, 0.2]} k={n("ruido")} alcance={5.8} />}
      {b("vizinhos") && (
        <group>
          <Gente g={{ id: "vizinha", x: -8.0, z: -2.4, rot: 1.2, acao: "apontando", exp: "surpreso" }} p={p} t={t} />
          <Gente g={{ id: "vovo", x: -7.1, z: -2.0, rot: 1.25, acao: "bracos-cruzados", exp: "serio" }} p={p} t={t} />
        </group>
      )}
      {cena.setas && p >= n("setasDe") ? <Setas modo={cena.setas as string} sag={sagQ} t={t} gE={ENG * n("grossa")} /> : null}
      {n("coluna") > 0.01 && (
        <group>
          <mesh position={[0, -0.5, -0.5 + 0.01]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#ffd23f" transparent opacity={0.4 * clamp01(n("coluna") * 2)} depthWrite={false} /></mesh>
          <lineSegments position={[0, -0.5, -0.5 + 0.01]}><edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} /><lineBasicMaterial color="#ffd23f" /></lineSegments>
          {[-1.5, 1.5].map((x) => <B key={x} p={[x, -0.5, -0.5 + 0.01]} t={[1, 1, 1]} cor="#ffffff" op={0.1 * clamp01(n("coluna") * 2)} />)}
        </group>
      )}
      {gente.map((g, i) => <Gente key={`${g.id}${i}`} g={g} p={p} t={t} />)}
      {etiqs.map((k) => <EtiquetaS key={k} e={ETIQ[k]} larg={n("etiqL", 2.2)} />)}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 50) => ({ pos, alvo, fov });

export const abrigo: Cenario3D = {
  Cena: AbrigoCena,
  padrao: "corte",
  fundo: (cena, progresso) => {
    const chuva = valor(cena.chuva as Valor, progresso, 0);
    const fade = valor(cena.fade as Valor, progresso, 0);
    const noite = valor(cena.noite as Valor, progresso, 0);
    return mistura(noite > 0.5 ? "#0c1530" : chuva > 0.3 ? "#8d9aa6" : "#bfe3f5", "#03040a", fade);
  },
  luzPropria: true,
  cameras: {
    quintal: c([1.0, 2.4, 14], [-0.3, -1.2, -1], 56),
    "quintal-perto": c([-2.4, 1.4, 9.5], [-2.4, -1.4, 0], 52),
    corte: c([0, -1.6, 15.2], [0, -1.9, 0], 50),
    "corte-largo": c([0, -1.4, 18], [0, -1.8, 0], 50),
    "corte-alto": c([0, 0.6, 15], [0, -1.8, 0], 50),
    sala: c([0, -2.7, 8.6], [0, -2.7, -1.5], 50),
    terra: c([-3.2, 1.4, 17], [-3.2, -0.9, -1], 52),
    largo: c([2.2, 1.2, 19], [2.2, -0.9, -1], 52),
    topo: c([2.4, 1.8, 10], [2.4, 0.4, -1], 50),
    largo2: c([-2.7, 0.6, 20.6], [-2.7, -1.5, -1], 54),
  },
};
