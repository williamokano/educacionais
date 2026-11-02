import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PACOTES } from "../../banco";
import { FONT } from "../theme";
import { poseDe3D } from "./acoes";
import { estudio3d, FUNDO_ESTUDIO } from "./estudio";
import { Boneco3D, piscar } from "./personagem";
import { QualidadeCtx } from "./qualidade";
import { Expressao3D, Personagem3D, PontoCamera, Qualidade } from "./tipos";

// Folha do personagem 3D (composição "folha3d"): 6 ações em cima, 6 expressões embaixo, num só canvas cada
// (um contexto WebGL por fileira). Props: personagem (id em personagens3d de qualquer pacote), qualidade.

export const FOLHA3D_W = 1920;
export const FOLHA3D_H = 1480; // CORPO + ROSTO + rótulos
const ACOES = ["em-pe", "acenando", "apontando", "explicando", "pensando", "comemorando"];
const EXPRESSOES: Expressao3D[] = ["neutro", "sorriso", "eureka", "surpreso", "preocupado", "pensativo"];

export const personagem3dDoBanco = (id: string): Personagem3D => {
  for (const p of Object.values(PACOTES)) if (p.personagens3d?.[id]) return p.personagens3d[id];
  throw new Error(`personagem 3D "${id}" não está em nenhum pacote do banco`);
};

const Cam: React.FC<{ c: PontoCamera }> = ({ c }) => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(...c.pos);
  cam.fov = c.fov ?? 35;
  cam.updateProjectionMatrix();
  cam.lookAt(...c.alvo);
  return null;
};

const Luz: React.FC<{ q: Qualidade }> = ({ q }) => {
  const { gl, scene } = useThree();
  const tex = React.useMemo(() => {
    if (q !== "suave") return null;
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return t;
  }, [gl, q]);
  scene.environment = tex;
  scene.environmentIntensity = 0.55;
  return (
    <>
      <hemisphereLight args={["#ffffff", "#bba98f", q === "suave" ? 0.8 : 1.3]} />
      <directionalLight position={[3, 6, 5]} intensity={2.3} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={4} shadow-camera-bottom={-2} shadow-bias={-0.0004} shadow-normalBias={0.02} />
    </>
  );
};

const Fileira: React.FC<{ p: Personagem3D; q: Qualidade; camera: PontoCamera; altura: number; children: (i: number, t: number) => React.ReactNode }> = ({ q, camera, altura, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <div style={{ position: "relative", width: FOLHA3D_W, height: altura }}>
      <ThreeCanvas width={FOLHA3D_W} height={altura} shadows={q === "suave" ? "soft" : true} flat={q === "lowpoly"} camera={{ fov: 30, near: 0.05, far: 80 }}
        style={{ background: FUNDO_ESTUDIO }}>
        <QualidadeCtx.Provider value={q}>
          <Cam c={camera} />
          <Luz q={q} />
          <estudio3d.Cena cena={{ cenario: "estudio-3d" }} progresso={0} t={t} tEpisodio={t} trechos={[]} qualidade={q} />
          {Array.from({ length: 6 }).map((_, i) => children(i, t))}
        </QualidadeCtx.Provider>
      </ThreeCanvas>
    </div>
  );
};

const Rotulos: React.FC<{ nomes: string[]; top: number }> = ({ nomes, top }) => (
  <div style={{ position: "absolute", top, left: 0, width: FOLHA3D_W, display: "flex" }}>
    {nomes.map((n) => (
      <div key={n} style={{ width: FOLHA3D_W / 6, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 30, color: "#4a4339", letterSpacing: 2, textTransform: "uppercase" }}>{n}</div>
    ))}
  </div>
);

/** distância entre personagens para que as 6 colunas ocupem a largura toda no plano z = 0 */
const passoDe = (c: PontoCamera, altura: number) => {
  const d = Math.hypot(c.pos[0] - c.alvo[0], c.pos[1] - c.alvo[1], c.pos[2] - c.alvo[2]);
  const meia = d * Math.tan(((c.fov ?? 35) * Math.PI) / 360) * (FOLHA3D_W / altura);
  return meia / 3;
};

const CORPO = 880;
const ROSTO = 520;

export const Folha3D: React.FC<{ personagem: string; qualidade?: Qualidade }> = ({ personagem, qualidade = "suave" }) => {
  const p = personagem3dDoBanco(personagem);
  const camCorpo: PontoCamera = { pos: [0, 1.15, 7.4], alvo: [0, 1.02, 0], fov: 30 };
  const camRosto: PontoCamera = { pos: [0, 1.4, 9.4], alvo: [0, 1.4, 0], fov: 8.6 };
  const passo = passoDe(camCorpo, CORPO);
  const passoR = passoDe(camRosto, ROSTO);
  return (
    <AbsoluteFill style={{ background: FUNDO_ESTUDIO }}>
      <Fileira p={p} q={qualidade} camera={camCorpo} altura={CORPO}>
        {(i, t) => (
          <group key={i} position={[(i - 2.5) * passo, 0, 0]} rotation={[0, i === 2 ? -0.35 : 0, 0]}>
            <Boneco3D p={p} pose={poseDe3D(ACOES[i], t)} expressao={i === 5 ? "eureka" : i === 4 ? "pensativo" : "sorriso"} pisca={piscar(t + i * 0.7)} />
          </group>
        )}
      </Fileira>
      <Fileira p={p} q={qualidade} camera={camRosto} altura={ROSTO}>
        {(i, t) => (
          <group key={i} position={[(i - 2.5) * passoR, 0, 0]}>
            <Boneco3D p={p} pose={poseDe3D("em-pe", t)} expressao={EXPRESSOES[i]} boca={EXPRESSOES[i] === "eureka" ? 0.5 : 0} pisca={0} />
          </group>
        )}
      </Fileira>
      <div style={{ position: "absolute", top: 30, left: 40, fontFamily: FONT, fontWeight: 700, fontSize: 56, color: "#2f2a24", letterSpacing: 3 }}>
        {p.nome.toUpperCase()} · {qualidade.toUpperCase()}
      </div>
      <Rotulos nomes={ACOES} top={CORPO - 60} />
      <Rotulos nomes={EXPRESSOES} top={CORPO + ROSTO + 10} />
    </AbsoluteFill>
  );
};
