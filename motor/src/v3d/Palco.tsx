import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useVideoConfig } from "remotion";
import { H, W } from "../theme";
import { Word } from "../types";
import { usePacote } from "../v2/pacote";
import { CenaV2 } from "../v2/tipos";
import { clamp01, empurra, lerp, mistura, suave, valor } from "./anima";
import { misturar3D, poseDe3D } from "./acoes";
import { aberturaFala, Boneco3D, piscar } from "./personagem";
import { QualidadeCtx } from "./qualidade";
import { CENARIOS3D_GENERICOS } from "./estudio";
import { Pacote } from "../v2/pacote";
import { Cenario3D, Expressao3D, PontoCamera, Personagem3DEmCena, Pose3D, Qualidade } from "./tipos";

// Palco 3D de uma batida: canvas WebGL, luz, câmera e personagens. O cenário 3D do pacote desenha o resto.
// Continuidade: no mesmo cenário da batida anterior, a câmera parte de onde a anterior parou e os personagens
// saem da pose final dela (MISTURA s).

const MISTURA = 0.35;

type CameraCena = { de?: string | PontoCamera; para?: string | PontoCamera; tempo?: number; tremor?: boolean };

const ponto = (def: Cenario3D, v: string | PontoCamera | undefined): PontoCamera | undefined => {
  if (v == null) return undefined;
  if (typeof v !== "string") return v;
  const p = def.cameras[v];
  if (!p) throw new Error(`câmera 3D desconhecida: "${v}" (existem: ${Object.keys(def.cameras).join(", ")})`);
  return p;
};

/** início e fim da câmera numa batida; sem `para`, a câmera chega um pouco mais perto (nunca fica parada) */
export const camerasDa = (def: Cenario3D, cena: CenaV2, anterior?: CenaV2): [PontoCamera, PontoCamera] => {
  const cam = (cena.camera ?? {}) as CameraCena;
  let de = ponto(def, cam.de);
  if (!de && anterior && anterior.cenario === cena.cenario) de = camerasDa(def, anterior)[1];
  de = de ?? def.cameras[def.padrao];
  const para = ponto(def, cam.para) ?? empurra(de);
  return [de, para];
};

const Camera: React.FC<{ de: PontoCamera; para: PontoCamera; k: number }> = ({ de, para, k }) => {
  const { camera } = useThree();
  const c = mistura(de, para, k);
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(...c.pos);
  cam.fov = c.fov ?? 40;
  cam.updateProjectionMatrix();
  cam.lookAt(new THREE.Vector3(...c.alvo));
  return null;
};

/**
 * Materiais que mudam `transparent` entre quadros (parede que vira vidro, peça que some) precisam recompilar: o three.js põe
 * `transparent === false` no programa do shader (define OPAQUE, alfa fixo em 1), e mudar a flag sem `needsUpdate` deixa o
 * programa antigo valendo. Aí o quadro sai opaco ou translúcido conforme o histórico de cada aba do render em paralelo
 * (a piscada "translúcida, material, translúcida"). Este componente confere a flag a cada commit e força a recompilação.
 */
const MateriaisEstaveis: React.FC = () => {
  const { scene } = useThree();
  React.useLayoutEffect(() => {
    scene.traverse((o) => {
      const mats = (o as THREE.Mesh).material;
      if (!mats) return;
      for (const m of Array.isArray(mats) ? mats : [mats]) {
        const visto = m.userData.transpVisto as boolean | undefined;
        if (visto !== undefined && visto !== m.transparent) m.needsUpdate = true;
        m.userData.transpVisto = m.transparent;
      }
    });
  });
  return null;
};

/** Reflexo de ambiente (só no suave): um estúdio genérico do three.js, para metais, verniz e olhos brilharem. */
const Ambiente: React.FC<{ forca: number }> = ({ forca }) => {
  const { gl, scene } = useThree();
  const tex = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return t;
  }, [gl]);
  scene.environment = tex;
  scene.environmentIntensity = forca;
  useEffect(() => () => tex.dispose(), [tex]);
  return null;
};

/** Luz padrão: céu/chão + sol com sombra macia. */
const LuzPadrao: React.FC<{ q: Qualidade }> = ({ q }) => (
  <>
    <hemisphereLight args={["#fff6e5", "#c58b4f", q === "suave" ? 0.75 : 1.25]} />
    <directionalLight
      position={[3.5, 5, 3]}
      intensity={q === "suave" ? 2.4 : 2.1}
      color="#fff1d6"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-4}
      shadow-camera-right={4}
      shadow-camera-top={4}
      shadow-camera-bottom={-4}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-radius={6}
    />
  </>
);

/* ---------- personagem em cena ---------- */

type Estado = { acao: string; expressao: Expressao3D; desde: number };

const linha = (a: Personagem3DEmCena, segmentos: number[], dur: number): Estado[] => {
  const lista: Estado[] = [{ acao: a.acao, expressao: a.expressao ?? "neutro", desde: 0 }];
  const extras: { desde: number; acao?: string; expressao?: Expressao3D }[] = [];
  if (a.de) extras.push({ desde: a.tempoMov ?? dur * 0.85, acao: a.acaoChegada ?? "em-pe" });
  for (const m of a.muda ?? []) extras.push({ desde: (segmentos[m.trecho] ?? 0) + (m.atraso ?? 0), acao: m.acao, expressao: m.expressao });
  extras.sort((x, y) => x.desde - y.desde);
  for (const e of extras) {
    const u = lista[lista.length - 1];
    lista.push({ acao: e.acao ?? u.acao, expressao: e.expressao ?? u.expressao, desde: e.desde });
  }
  return lista;
};

const poseNa = (lista: Estado[], tl: number, inicial?: Pose3D): { pose: Pose3D; estado: Estado } => {
  let i = 0;
  while (i + 1 < lista.length && lista[i + 1].desde <= tl) i++;
  const e = lista[i];
  const atual = poseDe3D(e.acao, Math.max(tl - e.desde, 0)); // o ciclo da ação começa na troca
  const k = (tl - e.desde) / MISTURA;
  if (k < 1) {
    const antes = i > 0 ? poseDe3D(lista[i - 1].acao, e.desde - lista[i - 1].desde) : inicial;
    if (antes) return { pose: misturar3D(antes, atual, suave(k)), estado: e };
  }
  return { pose: atual, estado: e };
};

const fase = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) / 97;

type Contexto = { segmentos: number[]; dur: number; offset: number; words: Word[]; t: number };

const Ator: React.FC<{ a: Personagem3DEmCena; ctx: Contexto; anterior?: { a: Personagem3DEmCena; segmentos: number[]; dur: number } }> = ({ a, ctx, anterior }) => {
  const pacote = usePacote();
  const p = pacote.personagens3d?.[a.id];
  if (!p) throw new Error(`personagem 3D desconhecido: "${a.id}" (existem: ${Object.keys(pacote.personagens3d ?? {}).join(", ")})`);
  const { t, segmentos, dur, offset, words } = ctx;
  const entra = a.entra != null && !anterior ? segmentos[a.entra] ?? 0 : 0;
  if (t < entra) return null;

  const inicial = anterior ? poseNa(linha(anterior.a, anterior.segmentos, anterior.dur), anterior.dur).pose : undefined;
  const { pose, estado } = poseNa(linha(a, segmentos, dur), t, inicial);

  // posição: anda de `de` até `pos`; sem `de`, desliza da posição anterior
  const alvo = a.pos ?? [0, 0];
  let x = alvo[0];
  let z = alvo[1];
  let rot = a.rot ?? 0;
  if (a.de) {
    const k = clamp01((t - entra) / (a.tempoMov ?? dur * 0.85));
    x = lerp(a.de[0], alvo[0], k);
    z = lerp(a.de[1], alvo[1], k);
    // enquanto anda, olha para onde vai; ao chegar, vira para `rot`
    const rumo = Math.atan2(alvo[0] - a.de[0], alvo[1] - a.de[1]);
    rot = k < 1 ? rumo : lerp(rumo, rot, clamp01((t - entra - (a.tempoMov ?? dur * 0.85)) / 0.4));
  } else if (anterior?.a.pos && (anterior.a.pos[0] !== alvo[0] || anterior.a.pos[1] !== alvo[1])) {
    const k = suave(t / 0.5);
    x = lerp(anterior.a.pos[0], alvo[0], k);
    z = lerp(anterior.a.pos[1], alvo[1], k);
  }

  // fala: boca abre nas palavras (todas, ou só as dos trechos listados)
  const agora = offset + t;
  const ini = (k: number) => offset + (segmentos[k] ?? 0);
  const daFala = (w: Word) => a.fala === true || (Array.isArray(a.fala) && a.fala.some((k) => w.start >= ini(k) - 0.01 && (k + 1 >= segmentos.length || w.start < ini(k + 1) - 0.01)));
  const palavra = a.fala ? words.find((w) => agora >= w.start && agora < w.end && daFala(w)) : undefined;
  const boca = palavra ? aberturaFala(palavra, agora) : 0;

  // olhar: a cabeça (e um pouco os olhos) viram para `olharPara`
  let cab = { y: 0, x: 0 };
  if (a.olharPara) {
    const [ox, oy, oz] = a.olharPara;
    const dx = ox - x;
    const dz = oz - z;
    const yaw = Math.atan2(dx, dz) - rot;
    const ang = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    const alturaOlhos = 1.38 * ((p.altura ?? 1.6) / 1.6);
    cab = { y: Math.max(-1.0, Math.min(1.0, ang)) * 0.7, x: -Math.atan2(oy - alturaOlhos, Math.hypot(dx, dz)) * 0.6 };
  }
  const poseFinal: Pose3D = { ...pose, "cabeca.y": (pose["cabeca.y"] ?? 0) + cab.y, "cabeca.x": (pose["cabeca.x"] ?? 0) + cab.x };
  const olhar: [number, number] = a.olharPara ? [Math.max(-1, Math.min(1, cab.y * 0.6)), -cab.x * 0.8] : [0, 0];

  return (
    <group position={[x, a.elev ?? 0, z]} rotation={[0, rot, 0]} scale={a.escala ?? 1}>
      <Boneco3D p={p} pose={poseFinal} expressao={estado.expressao} boca={boca} olhar={olhar} pisca={piscar(agora + fase(a.id))}
        suor={valor(a.suor, t / Math.max(dur, 0.01), 0)} cobertor={valor(a.cobertor, t / Math.max(dur, 0.01), 0)}
        bafo={valor(a.bafo, t / Math.max(dur, 0.01), 0)} t={agora} />
    </group>
  );
};

/* ---------- palco ---------- */

/** cenário 3D do pacote ou genérico (estudio-3d); undefined = a batida é 2D */
export const cenario3d = (pacote: Pacote, nome: string): Cenario3D | undefined => pacote.cenarios3d?.[nome] ?? CENARIOS3D_GENERICOS[nome];

export const Palco: React.FC<{
  cena: CenaV2; anterior?: { cena: CenaV2; dur: number; segmentos: number[] }; t: number; dur: number; progresso: number;
  segmentos: number[]; words: Word[]; offset: number;
}> = ({ cena, anterior, t, dur, progresso, segmentos, words, offset }) => {
  const { fps } = useVideoConfig();
  const pacote = usePacote();
  const def = cenario3d(pacote, cena.cenario);
  if (!def) throw new Error(`cenário 3D desconhecido: "${cena.cenario}"`);
  const q: Qualidade = (cena.qualidade as Qualidade) ?? pacote.qualidade3d ?? "suave";
  const continua = anterior && anterior.cena.cenario === cena.cenario ? anterior : undefined;
  const [de, para] = camerasDa(def, cena, continua?.cena);
  const tempo = (cena.camera as CameraCena | undefined)?.tempo ?? dur;
  const k = suave(clamp01(t / Math.max(tempo, 1 / fps)));
  const atores = (cena.personagens ?? []) as unknown as Personagem3DEmCena[];
  const atoresAntes = (continua?.cena.personagens ?? []) as unknown as Personagem3DEmCena[];
  const ctx: Contexto = { segmentos, dur, offset, words, t };
  const Cena = def.Cena;
  return (
    <ThreeCanvas
      width={W}
      height={H}
      shadows={q === "suave" ? "soft" : true}
      flat={q === "lowpoly"}
      style={{ position: "absolute", inset: 0, background: (typeof def.fundo === "function" ? def.fundo(cena, progresso) : def.fundo) ?? "#efe1c6" }}
      camera={{ fov: de.fov ?? 40, near: 0.05, far: 80 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <QualidadeCtx.Provider value={q}>
        <Camera de={de} para={para} k={k} />
        {q === "suave" && <Ambiente forca={0.55} />}
        {!def.luzPropria && <LuzPadrao q={q} />}
        <Cena cena={cena} progresso={progresso} t={t} tEpisodio={offset + t} trechos={segmentos} qualidade={q} />
        {atores.map((a, i) => {
          const antes = atoresAntes.find((o) => o.id === a.id);
          return <Ator key={`${a.id}-${i}`} a={a} ctx={ctx} anterior={antes && continua ? { a: antes, segmentos: continua.segmentos, dur: continua.dur } : undefined} />;
        })}
        <MateriaisEstaveis />
      </QualidadeCtx.Provider>
    </ThreeCanvas>
  );
};

