import React from "react";
import * as THREE from "three";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { Caixa } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps } from "../../../src/v3d/tipos";
import { Etiqueta, Halo, Liga, Seta, Texto3D } from "./cozinha-base";
import { useThree } from "@react-three/fiber";
import { Arvore, Bolhas, Ctx, Dome, EtiqDef, GenteE, Nuvens, Pessoa, V, mkCtx, mistura } from "./rasc";

// Submarino (episódio 19, "como um barco de aço afunda de propósito e volta?"). Um tanque de vidro com água em corte (face da frente aberta para a câmera),
// um deck na frente onde fica o Zeca (z = 2,3) e o modelo de ~3,6 m no tanque (z = -0,2). Mundo em metros; a água vai de y = -3,4 a 0.
//   palco       "tanque" (padrão) | "vitrine" (x = 60: o barco de 1775 num tanque pequeno)
//   barco       sy (altura do centro; 0,15 flutua) · sx · pitch (rad, + = nariz para cima) · subVis 0..1 (escala) · raiox 0..1 (casco vira vidro) · ar 0..1 (bolinhas de ar dentro)
//   encher      cheio 0..1 (o casco todo cheio de água)
//   tanque      tanque 0..1 (aparece na barriga) · nivT 0..1 (nível) · tampaC, tampaB 0..1 (abertura das tampas de cima e de baixo) · bolhas 0..1 (ar saindo pelo respiro)
//   ar          cil 0..1 (cilindro de ar comprimido) · sopra 0..1 (ar entra e a água sai)
//   equilíbrio  trimVis 0..1 · nivF, nivR 0..1 (nível dos tanques da frente e de trás) · passa 0..1 (seta de água de um para o outro)
//   asas        asaVis 0..1 · asaAng (rad; + = borda da frente para cima) · fluxo 0..1 (setas de água passando)
//   mar         aperta 0..1 (setas do mar apertando) · grosso 0..1 (casco grosso de aço) · torre 0..1 (torre e periscópio) · entardecer 0..1
//   vitrine     turtle 0..1 · turtleY · bomba 0..1
//   gente       lista de { x, y, z, rot, acao, exp, pose, incl, esc } (sempre o `zeca`) · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax
//               chaves: tanque, ar, equil, asas, casco

const L = 3.6; // comprimento do casco
const R = 0.55; // raio
const ZB = -0.2; // z do barco
const FUNDO = -3.4;
const XT = 3.0;
const K = 1.1; // escala do modelo no tanque // meia largura do tanque
const ZT0 = -1.6;
const ZT1 = 1.0;
const AGUA_C = "#2f78c4";

const Casco: React.FC<{ raiox: number; grosso: number; torre: number }> = ({ raiox, grosso, torre }) => {
  const op = lerp(1, 0.22, raiox);
  const cor = mistura("#8d99a3", "#b8c8d4", raiox);
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[R, L - 2 * R, 8, 24]} />
        <meshStandardMaterial color={cor} roughness={0.35} metalness={0.5} transparent={op < 0.99} opacity={op} depthWrite={op > 0.9} />
      </mesh>
      {/* cintas de aço: o contorno continua legível em raio-X */}
      {[-1.3, -0.65, 0, 0.65, 1.3].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[R + 0.005, 0.018 + 0.05 * grosso, 6, 28]} /><meshStandardMaterial color="#e8eef2" metalness={0.6} roughness={0.3} /></mesh>
      ))}
      {grosso > 0.02 && (
        <mesh rotation={[0, 0, Math.PI / 2]} scale={[1 + 0.09 * grosso, 1, 1 + 0.09 * grosso]}>
          <capsuleGeometry args={[R, L - 2 * R, 8, 24]} />
          <meshStandardMaterial color="#6f7d88" roughness={0.4} metalness={0.7} transparent opacity={0.55 * grosso} depthWrite={false} />
        </mesh>
      )}
      {torre > 0.02 && (
        <group scale={torre}>
          <Caixa p={[0.2, R + 0.18, 0]} t={[0.7, 0.4, 0.28]} cor="#7a8892" met={0.6} rug={0.4} raio={0.08} />
          <Liga a={[0.35, R + 0.38, 0]} b={[0.35, R + 0.7, 0]} w={0.05} cil cor="#c9d3da" />
          <Caixa p={[0.4, R + 0.7, 0]} t={[0.14, 0.05, 0.05]} cor="#c9d3da" raio={0.01} />
        </group>
      )}
    </group>
  );
};

const Tanque: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const vis = n("tanque", 0);
  if (vis < 0.02) return null;
  const nivel = n("nivT", 0);
  const tc = n("tampaC", 0);
  const tb = n("tampaB", 0);
  const bol = n("bolhas", 0);
  const sopra = n("sopra", 0);
  const H = 0.32;
  const W = 2.2;
  const hw = Math.max(0.001, H * nivel);
  return (
    <group scale={[1, vis, 1]} position={[0, -0.34 + (1 - vis) * -0.1, 0]}>
      {/* moldura do tanque */}
      <mesh><boxGeometry args={[W, H, 0.7]} /><meshStandardMaterial color="#ffd23f" transparent opacity={0.22} depthWrite={false} /></mesh>
      {[[-W / 2, 0], [W / 2, 0]].map(([x], i) => <Liga key={i} a={[x, -H / 2, 0.35]} b={[x, H / 2, 0.35]} w={0.04} cil cor="#ffd23f" />)}
      <Liga a={[-W / 2, H / 2, 0.35]} b={[W / 2, H / 2, 0.35]} w={0.04} cil cor="#ffd23f" />
      <Liga a={[-W / 2, -H / 2, 0.35]} b={[W / 2, -H / 2, 0.35]} w={0.04} cil cor="#ffd23f" />
      {/* água do tanque */}
      <mesh position={[0, -H / 2 + hw / 2, 0]}><boxGeometry args={[W - 0.06, hw, 0.64]} /><meshStandardMaterial color={AGUA_C} transparent opacity={0.9} roughness={0.2} /></mesh>
      {/* tampa de cima (respiro) */}
      <Liga a={[0.6, H / 2, 0]} b={[0.6, H / 2 + 0.33, 0]} w={0.07} cil cor="#aab6bf" />
      <group position={[0.6, H / 2 + 0.33, 0]} rotation={[0, 0, -tc * 1.2]}><Caixa p={[0.07, 0.02, 0]} t={[0.2, 0.035, 0.12]} cor={tc > 0.5 ? "#37c26a" : "#e5473a"} raio={0.01} /></group>
      {/* tampa de baixo (por onde a água entra e sai) */}
      <group position={[-0.6, -H / 2, 0]} rotation={[0, 0, tb * 1.2]}><Caixa p={[0.09, -0.02, 0]} t={[0.24, 0.035, 0.2]} cor={tb > 0.5 ? "#37c26a" : "#e5473a"} raio={0.01} /></group>
      {bol > 0.02 && <Bolhas p={[0.6, H / 2 + 0.38, 0]} t={tEp} k={bol} alt={0.35} n={6} larg={0.05} />}
      {tb > 0.5 && <>
        <Seta a={[-0.6, -H / 2 - 0.5, 0.1]} b={[-0.6, -H / 2 - 0.05, 0.1]} cor="#8fd0ff" w={0.04} op={clamp01(tb) * (1 - sopra)} />
      </>}
      {sopra > 0.02 && <>
        <Seta a={[-0.6, -H / 2 - 0.05, 0.1]} b={[-0.6, -H / 2 - 0.55, 0.1]} cor="#8fd0ff" w={0.04} op={sopra} />
        <Seta a={[-0.2, H / 2 + 0.35, 0.1]} b={[0.25, 0.05, 0.1]} cor="#ffffff" w={0.04} op={sopra} />
      </>}
    </group>
  );
};

const Barco: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const vis = n("subVis", 1);
  if (vis < 0.02) return null;
  const sy = n("sy", 0.15);
  const sx = n("sx", 0);
  const pitch = n("pitch", 0);
  const raiox = n("raiox", 1);
  const cheio = n("cheio", 0);
  const ar = n("ar", 0);
  const cil = n("cil", 0);
  const sopra = n("sopra", 0);
  const trim = n("trimVis", 0);
  const asaVis = n("asaVis", 0);
  const asaAng = n("asaAng", 0);
  const fluxo = n("fluxo", 0);
  const aperta = n("aperta", 0);
  const grosso = n("grosso", 0);
  const torre = n("torre", 0);
  const nivF = n("nivF", 0.5);
  const nivR = n("nivR", 0.5);
  const passa = n("passa", 0);
  return (
    <group position={[sx, sy, ZB]} rotation={[0, 0, pitch]} scale={vis * K}>
      <group scale={[1 - 0.12 * n("amassa", 0), 1 - 0.38 * n("amassa", 0), 1 - 0.38 * n("amassa", 0)]}>
      <Casco raiox={raiox} grosso={grosso} torre={torre} />
      {/* ar dentro do barco oco */}
      {ar > 0.02 && cheio < 0.5 && Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} position={[-1.4 + (i % 7) * 0.45, -0.15 + Math.sin(tEp * 1.5 + i * 1.9) * 0.12 + (i > 6 ? 0.22 : 0), Math.sin(i * 3.1) * 0.15]} scale={0.07 * ar}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.75} /></mesh>
      ))}
      {/* o casco inteiro cheio de água */}
      {cheio > 0.01 && <mesh position={[0, -R * 0.85 + (R * 0.85 * 2 * 0.95 * cheio) / 2, 0]}><boxGeometry args={[L - 0.5, R * 0.85 * 2 * 0.95 * cheio, R * 1.3]} /><meshStandardMaterial color={AGUA_C} transparent opacity={0.85} roughness={0.2} /></mesh>}
      <Interiores C={C} />
      <Tanque C={C} />
      </group>
      {/* cilindro de ar comprimido, na frente do tanque, com tubo até o tanque */}
      {cil > 0.02 && (
        <group scale={cil} position={[-1.15, 0.02, 0.1]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.15, 0.5, 6, 14]} /><meshStandardMaterial color="#cfd6db" metalness={0.5} roughness={0.35} /></mesh>
          <Caixa p={[0.42, 0.0, 0]} t={[0.1, 0.1, 0.1]} cor="#e5473a" raio={0.02} />
          <Halo p={[0, 0, 0.2]} r={0.4} cor="#bfe4ff" op={0.35 * sopra} />
        </group>
      )}
      {/* tanques pequenos de equilíbrio, na frente e atrás */}
      {trim > 0.02 && [[1.35, nivF], [-1.35, nivR]].map(([x, nv], i) => (
        <group key={i} position={[x, 0.18, 0.0]} scale={trim}>
          <mesh><boxGeometry args={[0.44, 0.34, 0.6]} /><meshStandardMaterial color="#ffd23f" transparent opacity={0.25} depthWrite={false} /></mesh>
          <mesh position={[0, -0.17 + (0.34 * nv) / 2, 0]}><boxGeometry args={[0.4, Math.max(0.001, 0.34 * nv), 0.56]} /><meshStandardMaterial color={AGUA_C} transparent opacity={0.9} /></mesh>
        </group>
      ))}
      {trim > 0.02 && passa > 0.02 && <Seta a={[-1.15, 0.5, 0.35]} b={[1.15, 0.5, 0.35]} cor="#8fd0ff" w={0.04} op={passa} />}
      {/* asinhas */}
      {asaVis > 0.02 && [[1.2, 1], [-1.45, 0.8]].map(([x, s], i) => (
        <group key={i} position={[x, -0.05, R + 0.2]} scale={asaVis * s}>
          <group rotation={[0, 0, asaAng]}><Caixa p={[0, 0, 0]} t={[0.55, 0.05, 0.42]} cor="#ff8a2a" raio={0.015} /></group>
        </group>
      ))}
      {asaVis > 0.02 && fluxo > 0.02 && [-0.3, 0.1].map((dy, i) => <Seta key={i} a={[2.1, dy, R + 0.2]} b={[1.5, dy - Math.sin(asaAng) * 0.2, R + 0.2]} cor="#bfe9ff" w={0.03} op={fluxo} />)}
      {/* o mar apertando */}
      {aperta > 0.02 && Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const d = 0.55 - 0.1 * Math.sin(tEp * 4 + i);
        return <Seta key={i} a={[0.1 + Math.cos(a) * (R + 0.7), Math.sin(a) * (R + 0.7), R + 0.25]} b={[0.1 + Math.cos(a) * (R + d - 0.1 + 0.0), Math.sin(a) * (R + d - 0.1), R + 0.25]} cor={mistura("#ff8f84", "#ff3b2f", aperta)} w={0.05} op={aperta * (grosso > 0.5 ? 0.0 : 1)} />;
      })}
    </group>
  );
};

/* ---------- peças internas e extras do episódio 19 (rascunho v2) ---------- */

const Interiores: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const cinza = n("arCinza", 0), oxi = n("oxi", 0), filtro = n("filtro", 0), diesel = n("diesel", 0), bat = n("bat", 0), motorE = n("motorE", 0), reator = n("reator", 0), camara = n("camara", 0), peri = n("peri", 0), cam = n("camAgua", 0);
  const batNiv = n("batNiv", 1);
  const hel = tEp * (motorE > 0.5 ? 14 : 0);
  return (
    <group>
      {cinza > 0.02 && <mesh scale={[L / 2 - 0.35, R * 0.8, R * 0.8]}><sphereGeometry args={[1, 18, 12]} /><meshBasicMaterial color="#6d7378" transparent opacity={0.5 * cinza} depthWrite={false} /></mesh>}
      {oxi > 0.02 && (
        <group position={[0.55, -0.2, 0.05]} scale={suave(oxi)}>
          <Caixa p={[0, 0, 0]} t={[0.5, 0.36, 0.4]} cor="#3aa0e8" met={0.3} rug={0.4} raio={0.04} />
          <Liga a={[0, -0.18, 0]} b={[0, -R + 0.02, 0]} w={0.05} cil cor="#8fd0ff" />
          {Array.from({ length: 4 }).map((_, i) => { const c = (tEp * 0.9 + i / 4) % 1; return <mesh key={i} position={[0.04 * Math.sin(i * 2 + tEp), 0.2 + c * 0.35, 0.22]} scale={0.04 + 0.03 * c}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#e8fbff" transparent opacity={1 - c * 0.8} /></mesh>; })}
          <Texto3D texto="O₂" p={[0, 0.5, 0.3]} h={0.2} cor="#bfe9ff" />
        </group>
      )}
      {filtro > 0.02 && (
        <group position={[-0.5, -0.12, 0.05]} scale={suave(filtro)}>
          <mesh><cylinderGeometry args={[0.16, 0.16, 0.5, 18]} /><meshStandardMaterial color="#58b36a" metalness={0.3} roughness={0.4} /></mesh>
          {[0.15, 0, -0.15].map((y) => <mesh key={y} position={[0, y, 0]}><torusGeometry args={[0.165, 0.014, 6, 18]} /><meshStandardMaterial color="#2f6f3c" /></mesh>)}
          <Seta a={[-0.55, 0.3, 0.1]} b={[-0.2, 0.1, 0.1]} cor="#9a9fa4" w={0.03} />
          <Texto3D texto="CO₂" p={[-0.5, 0.45, 0.2]} h={0.18} cor="#d9dde0" />
        </group>
      )}
      {diesel > 0.02 && (
        <group position={[-1.05 + 0.012 * Math.sin(tEp * 50) * diesel, -0.2, 0]} scale={suave(diesel)}>
          <Caixa p={[0, 0, 0]} t={[0.55, 0.4, 0.4]} cor="#4a4f56" met={0.4} rug={0.5} raio={0.04} />
          {[-0.15, 0, 0.15].map((x) => <Caixa key={x} p={[x, 0.26, 0]} t={[0.09, 0.14, 0.09]} cor="#2a2d33" raio={0.01} />)}
          {Array.from({ length: 5 }).map((_, i) => { const c = (tEp * 0.8 + i / 5) % 1; return <mesh key={i} position={[(i - 2) * 0.07, 0.4 + c * 0.35, 0]} scale={0.07 + 0.08 * c}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#555a60" transparent opacity={0.7 * (1 - c)} /></mesh>; })}
        </group>
      )}
      {bat > 0.02 && (
        <group position={[0.1, -0.3, 0.0]} scale={suave(bat)}>
          {[-0.25, 0, 0.25].map((x, i) => <Caixa key={i} p={[x, 0, 0]} t={[0.22, 0.2, 0.3]} cor={batNiv > 0.2 ? "#ffd23f" : "#e5473a"} raio={0.02} />)}
          <Texto3D texto={batNiv > 0.2 ? "BATERIA" : "VAZIA"} p={[0, 0.3, 0.2]} h={0.14} cor={batNiv > 0.2 ? "#ffe9a8" : "#ff8f84"} />
        </group>
      )}
      {motorE > 0.02 && (
        <group position={[-1.2, -0.12, 0]} scale={suave(motorE)}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.18, 0.18, 0.5, 18]} /><meshStandardMaterial color="#3f7fd6" metalness={0.5} roughness={0.35} /></mesh>
          <group position={[-0.62, 0, 0]} rotation={[hel, 0, 0]}>{[0, 1, 2].map((i) => <Caixa key={i} p={[0, 0.14 * Math.cos((i * 2 * Math.PI) / 3), 0.14 * Math.sin((i * 2 * Math.PI) / 3)]} t={[0.03, 0.26, 0.07]} cor="#c9d3da" raio={0.01} />)}</group>
        </group>
      )}
      {reator > 0.02 && (
        <group position={[0.25, -0.1, 0]} scale={suave(reator)}>
          <mesh><sphereGeometry args={[0.24, 20, 16]} /><meshStandardMaterial color="#9dff7a" emissive="#5fe34a" emissiveIntensity={0.9} roughness={0.3} /></mesh>
          <Halo p={[0, 0, 0.1]} r={0.8} cor="#9dff7a" op={0.55 * (0.8 + 0.2 * Math.sin(tEp * 6))} />
        </group>
      )}
      {camara > 0.02 && (
        <group position={[-1.5, 0.0, 0]} scale={suave(camara)}>
          <mesh><boxGeometry args={[0.5, 0.6, 0.5]} /><meshStandardMaterial color="#e8eef2" transparent opacity={0.35} depthWrite={false} /></mesh>
          <mesh position={[0, -0.3 + (0.6 * cam) / 2, 0]}><boxGeometry args={[0.46, Math.max(0.001, 0.6 * cam), 0.46]} /><meshStandardMaterial color={AGUA_C} transparent opacity={0.8} /></mesh>
          <Caixa p={[0.26, 0, 0]} t={[0.04, 0.5, 0.4]} cor="#ffd23f" raio={0.01} />
        </group>
      )}
      {peri > 0.02 && (
        <group>
          <Liga a={[0.35, R, 0]} b={[0.35, R + 3.4 * peri, 0]} w={0.05} cil cor="#c9d3da" />
          <Caixa p={[0.42, R + 3.4 * peri, 0]} t={[0.2, 0.07, 0.07]} cor="#c9d3da" raio={0.01} />
        </group>
      )}
    </group>
  );
};

const Chinelo: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <group scale={s}>
    {[0, 0.2].map((z, i) => (
      <group key={i} position={[0, 0, z * 0.9]} rotation={[0, i * 0.12, 0]}>
        <Caixa p={[0, 0, 0]} t={[0.34, 0.04, 0.13]} cor="#ff6a3a" raio={0.02} />
        <Liga a={[0.02, 0.02, 0.05]} b={[-0.04, 0.02, -0.05]} w={0.025} cil cor="#3a3a3a" />
        <Liga a={[0.02, 0.02, -0.05]} b={[-0.04, 0.02, 0.05]} w={0.025} cil cor="#3a3a3a" />
      </group>
    ))}
  </group>
);

const Pato: React.FC<{ x: number; t: number; i: number }> = ({ x, t, i }) => (
  <group position={[x + 0.15 * Math.sin(t * 0.5 + i), 0.02 + 0.04 * Math.sin(t * 2 + i), ZT1 - 0.3 - i * 0.5]} rotation={[0, i ? 0.6 : -0.5, 0]}>
    <mesh scale={[1.1, 0.7, 0.8]}><sphereGeometry args={[0.22, 14, 10]} /><meshStandardMaterial color="#ffd84a" roughness={0.6} /></mesh>
    <mesh position={[0.17, 0.2, 0]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color="#ffd84a" roughness={0.6} /></mesh>
    <mesh position={[0.3, 0.19, 0]} scale={[1.3, 0.5, 1]}><sphereGeometry args={[0.06, 8, 6]} /><meshStandardMaterial color="#ff8a2a" /></mesh>
  </group>
);

/* ---------- o tanque de vidro ---------- */

const Peixe: React.FC<{ i: number; t: number }> = ({ i, t }) => {
  const x = ((((i * 1.9 + t * (0.25 + (i % 3) * 0.08)) % 5.2) + 5.2) % 5.2) - 2.6;
  return (
    <group position={[x, -1.0 - ((i * 0.7) % 2.1), ZT0 + 0.6]} rotation={[0, 0, 0]}>
      <mesh scale={[0.2, 0.1, 0.07]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color={i % 2 ? "#ffb347" : "#ffe14a"} /></mesh>
      <mesh position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.07, 0.1, 0.02]}><coneGeometry args={[1, 1, 4]} /><meshStandardMaterial color={i % 2 ? "#ff8a2a" : "#ffcf1f"} /></mesh>
    </group>
  );
};

const TanqueGrande: React.FC<{ C: Ctx }> = ({ C }) => {
  const gente = (C.cena.gente as GenteE[] | undefined) ?? [];
  const { tEp, n } = C;
  const ent = n("entardecer", 0);
  const topo = mistura("#3f86d8", "#364a8c", ent);
  const meio = mistura("#9ad0f5", "#f19a62", ent);
  const base = mistura("#e6f4fb", "#ffd2a0", ent);
  const W = XT * 2 + 0.2;
  const { scene } = useThree();
  scene.environmentIntensity = 0.55 * (1 - 0.7 * n("escuro", 0));
  return (
    <group>
      <hemisphereLight args={["#e8f4ff", "#8a8070", 1.1 * (1 - 0.7 * n("escuro", 0))]} />
      <directionalLight position={[-4, 10, 9]} intensity={1.6 * (1 - 0.7 * n("escuro", 0))} color={mistura("#fff3dc", "#ffb877", ent)} />
      <Dome topo={topo} meio={meio} base={base} />
      <Nuvens t={tEp} lista={[[-12, 12, -30, 3], [14, 15, -34, 3.4], [-34, 11, -36, 2.6], [32, 13, -28, 2.8]]} cor={mistura("#ffffff", "#ffd2b8", ent)} />
      {/* porto ao fundo: mar, guindastes, galpões e colinas */}
      <mesh position={[0, -0.2, -12]}><boxGeometry args={[80, 0.2, 22]} /><meshStandardMaterial color={mistura("#4a90c8", "#c88a68", ent * 0.7)} roughness={0.5} /></mesh>
      {[[-14, -7, 5, 3.2, "#c9c2b4"], [-8, -8.5, 7, 4.2, "#b7bfc6"], [10, -8, 6, 3.5, "#c9c2b4"], [17, -9, 8, 4.8, "#b7bfc6"]].map(([x, z, w, h, c], i) => <Caixa key={i} p={[x as number, (h as number) / 2 - 0.1, z as number]} t={[w as number, h as number, 3]} cor={c as string} raio={0.05} rug={0.8} />)}
      {[-3, 6].map((x, i) => (
        <group key={i} position={[x, 0, -9.5]}>
          <Liga a={[0, 0, 0]} b={[0, 5.5, 0]} w={0.25} cil cor="#e5473a" />
          <Liga a={[-2.4, 5.4, 0]} b={[2.8, 5.4, 0]} w={0.22} cil cor="#e5473a" />
          <Liga a={[2.2, 5.4, 0]} b={[2.2, 3.4, 0]} w={0.05} cil cor="#333333" />
        </group>
      ))}
      <mesh position={[-34, 3, -20]} scale={[16, 7, 8]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#6aa84f" roughness={1} flatShading /></mesh>
      <mesh position={[36, 3, -20]} scale={[18, 7.5, 8]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#5c9a46" roughness={1} flatShading /></mesh>
      {/* cais atrás do tanque: o Zeca fica de pé nele, de frente */}
      <Caixa p={[0, -0.25, -4.0]} t={[22, 0.5, 4.6]} cor="#a9825a" raio={0.04} rug={0.8} />
      {Array.from({ length: 12 }).map((_, i) => <Liga key={i} a={[-9 + i * 1.65, 0.005, -6.2]} b={[-9 + i * 1.65, 0.005, -1.75]} w={0.04} cil cor="#8a6a46" basico />)}
      <Caixa p={[3.2, 0.35, -3.3]} t={[0.7, 0.7, 0.7]} cor="#c9a24a" raio={0.04} rug={0.7} />
      <Caixa p={[-4.2, 0.45, -3.0]} t={[0.9, 0.9, 0.9]} cor="#3b82c4" raio={0.04} rug={0.7} />
      {/* tanque de vidro */}
      <Caixa p={[0, FUNDO - 0.15, (ZT0 + ZT1) / 2]} t={[W, 0.3, ZT1 - ZT0 + 0.2]} cor="#d8c58e" raio={0.03} rug={0.9} />
      <mesh position={[0, FUNDO / 2, ZT0]}><planeGeometry args={[W, -FUNDO]} /><meshStandardMaterial color="#1c4f86" roughness={0.9} /></mesh>
      {[-XT - 0.05, XT + 0.05].map((x, i) => <mesh key={i} position={[x, FUNDO / 2, (ZT0 + ZT1) / 2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[ZT1 - ZT0, -FUNDO]} /><meshStandardMaterial color="#2a6fb0" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
      {[-1.8, -0.4, 1.3].map((x, i) => <Arvore key={i} x={x} y={FUNDO + 0.0} z={ZT0 + 0.5} s={0.35 + 0.08 * i} cor="#2f9a5a" />)}
      {[...Array(5)].map((_, i) => <Peixe key={i} i={i} t={tEp} />)}
      {/* quinas do vidro */}
      {[-XT - 0.05, XT + 0.05].map((x) => <Liga key={x} a={[x, FUNDO, ZT1]} b={[x, 0.0, ZT1]} w={0.08} cil cor="#e8eef2" />)}
      <Liga a={[-XT - 0.05, 0, ZT1]} b={[XT + 0.05, 0, ZT1]} w={0.08} cil cor="#e8eef2" />
      <Liga a={[-XT - 0.05, FUNDO, ZT1]} b={[XT + 0.05, FUNDO, ZT1]} w={0.08} cil cor="#e8eef2" />
      <Barco C={C} />
      {n("chinelo", 1) > 0.02 && <group position={[1.4, FUNDO + 0.05, ZT0 + 0.9]} rotation={[0, 0.5, 0]}><Chinelo s={1.7} /></group>}
      {[-2.3, 2.2].map((x, i) => <Pato key={i} x={x} t={tEp} i={i} />)}
      {n("sonar", 0) > 0.02 && (() => {
        const so = n("sonar", 0);
        const out = clamp01(so * 2), back = clamp01(so * 2 - 1);
        const bx = n("sx", 0) + 1.8 * K, by = n("sy", 0.15);
        const rock = so > 0.02;
        return (
          <group>
            {rock && <mesh position={[2.5, FUNDO + 0.6, ZT0 + 1.0]} scale={[0.5, 0.6, 0.4]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#6b6f74" roughness={1} /></mesh>}
            {[0, 1, 2].map((i) => { const u = clamp01(out * 1.2 - i * 0.12); return u > 0.01 && back < 0.99 ? <mesh key={i} position={[bx + 2.4 * u * (1 - 0.0), by, ZB + 0.3]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.3 + 0.5 * u, 0.025, 6, 28]} /><meshBasicMaterial color="#d7f3ff" transparent opacity={(1 - u) * 0.9} /></mesh> : null; })}
            {back > 0.02 && [0, 1].map((i) => { const u = clamp01(back - i * 0.15); return <mesh key={i} position={[2.5 - 2.2 * u, FUNDO + 0.6 + (by - FUNDO - 0.6) * u, ZB + 0.3]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.3 + 0.4 * (1 - u), 0.025, 6, 28]} /><meshBasicMaterial color="#ffe9a8" transparent opacity={(1 - u) * 0.9} /></mesh>; })}
          </group>
        );
      })()}
      {n("periVis", 0) > 0.02 && (
        <group position={[-0.2, -1.05, 1.2]} scale={suave(n("periVis", 0))}>
          <mesh><circleGeometry args={[0.95, 40]} /><meshBasicMaterial color="#9ad0f5" /></mesh>
          <mesh position={[0, -0.45, 0.01]}><planeGeometry args={[1.9, 0.5]} /><meshBasicMaterial color="#4a90c8" /></mesh>
          <mesh position={[0.45, -0.1, 0.02]} scale={[1.0, 0.5, 1]}><circleGeometry args={[0.4, 16]} /><meshBasicMaterial color="#6aa84f" /></mesh>
          <mesh position={[0, 0, 0.03]}><torusGeometry args={[0.95, 0.05, 8, 40]} /><meshBasicMaterial color="#222" /></mesh>
        </group>
      )}
      {n("dias", 0) > 0.02 && <Texto3D texto={`DIA ${Math.max(1, Math.round(n("dias", 0) * 90))}`} p={[0, 2.6, 2.0]} h={0.9} cor="#ffd23f" escala={1} />}
      {n("cadeado", 0) > 0.02 && (
        <group position={[0, 4.6, -3.5]} scale={suave(n("cadeado", 0)) * 1.5}>
          <Caixa p={[0, 0, 0]} t={[1.0, 0.8, 0.3]} cor="#1c1f24" raio={0.06} />
          <mesh position={[0, 0.5, 0]}><torusGeometry args={[0.32, 0.07, 8, 24, Math.PI]} /><meshStandardMaterial color="#1c1f24" /></mesh>
          <Texto3D texto="?" p={[0.9, 0.6, 0.3]} h={0.8} escala={1 - n("lampada", 0)} />
          {n("lampada", 0) > 0.02 && <group position={[0.9, 0.6, 0.3]} scale={suave(n("lampada", 0))}><mesh><sphereGeometry args={[0.3, 16, 12]} /><meshBasicMaterial color="#ffe36a" /></mesh><Halo p={[0, 0, 0.1]} r={0.9} cor="#ffe36a" op={0.6} /></group>}
        </group>
      )}
      {/* água: véu da frente e superfície, por último */}
      <mesh position={[0, FUNDO / 2, ZT1 - 0.02]} renderOrder={10}><planeGeometry args={[W - 0.1, -FUNDO]} /><meshStandardMaterial color={AGUA_C} transparent opacity={0.22} depthWrite={false} /></mesh>
      <mesh position={[0, -0.02, (ZT0 + ZT1) / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}><planeGeometry args={[W - 0.1, ZT1 - ZT0]} /><meshStandardMaterial color="#5aa7ea" transparent opacity={0.45} depthWrite={false} /></mesh>
      {gente.map((gd, i) => <Pessoa key={i} g={gd} p={C.p} t={C.t} tAbs={tEp} renderObj={(nm) => (nm === "chinelo" ? <group rotation={[0, 0, 0]}><Chinelo s={1.2} /></group> : null)} />)}
    </group>
  );
};

/* ---------- a vitrine de 1775 ---------- */

const Vitrine: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp } = C;
  const gente = (C.cena.gente as GenteE[] | undefined) ?? [];
  const ty = n("turtleY", -0.2);
  const bomba = n("bomba", 0);
  return (
    <group>
      <hemisphereLight args={["#f6f9fc", "#9a9080", 1.1]} />
      <directionalLight position={[-3, 6, 7]} intensity={1.6} color="#fff3dc" />
      <mesh position={[0, 1.5, -3]}><planeGeometry args={[30, 12]} /><meshStandardMaterial color="#cdb996" roughness={1} /></mesh>
      <Caixa p={[0, -0.25, 1]} t={[12, 0.5, 8]} cor="#8a5a34" raio={0.04} rug={0.8} />
      {[-4.5, 4.5].map((x) => <Caixa key={x} p={[x, 1.7, -2.6]} t={[1.6, 2.6, 0.3]} cor="#6b4a2c" raio={0.04} />)}
      {/* tanque d'água da vitrine */}
      <mesh position={[0, -1.0, 0]}><boxGeometry args={[4.2, 2.0, 2.2]} /><meshStandardMaterial color="#7fc0f0" transparent opacity={0.35} depthWrite={false} /></mesh>
      <group position={[0, ty, 0.0]} scale={n("turtle", 0)}>
        <mesh scale={[0.62, 0.78, 0.62]}><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color="#8a5a34" roughness={0.8} /></mesh>
        {[-0.3, 0.1, 0.5].map((y, i) => <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1 - Math.abs(y) * 0.5, 1 - Math.abs(y) * 0.5, 1]}><torusGeometry args={[0.62, 0.025, 6, 24]} /><meshStandardMaterial color="#3a2a1a" /></mesh>)}
        <mesh position={[0, 0.82, 0]}><cylinderGeometry args={[0.2, 0.28, 0.22, 14]} /><meshStandardMaterial color="#6b4a2c" /></mesh>
        <mesh position={[0, 1.0, 0]} scale={[1, 0.5, 1]}><sphereGeometry args={[0.22, 12, 8]} /><meshStandardMaterial color="#4a3a2a" /></mesh>
        <mesh position={[0.15, 1.35, 0]} rotation={[0, 0, 0.3]}><cylinderGeometry args={[0.012, 0.012, 0.5, 6]} /><meshStandardMaterial color="#222" /></mesh>
        {/* bomba de mão */}
        <group position={[0.7, 0.2, 0.0]}>
          <mesh><cylinderGeometry args={[0.07, 0.07, 0.5, 10]} /><meshStandardMaterial color="#b9a46a" metalness={0.5} /></mesh>
          <mesh position={[0, 0.5 + 0.25 * Math.sin(tEp * 6) * bomba, 0]}><cylinderGeometry args={[0.025, 0.025, 0.6, 8]} /><meshStandardMaterial color="#555" /></mesh>
          <Caixa p={[0, 0.8 + 0.25 * Math.sin(tEp * 6) * bomba, 0]} t={[0.3, 0.05, 0.05]} cor="#3a2a1a" raio={0.01} />
        </group>
        <Liga a={[0.7, 0.0, 0]} b={[0.3, -0.5, 0]} w={0.04} cil cor="#b9a46a" />
      </group>
      <Texto3D texto="1775" p={[-2.3, 1.6, 1.4]} h={0.7} cor="#ffd23f" escala={n("turtle", 0)} />
      {gente.map((gd, i) => <Pessoa key={i} g={gd} p={C.p} t={C.t} tAbs={tEp} />)}
    </group>
  );
};

/* ---------- cena ---------- */

const PALCO_X: Record<string, number> = { tanque: 0, vitrine: 60 };

const SubCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const C = mkCtx(cena, p, t, tEpisodio);
  const { n } = C;
  const palco = (cena.palco as string | undefined) ?? "tanque";
  const X0 = PALCO_X[palco] ?? 0;
  const sy = n("sy", 0.15);
  const sx = n("sx", 0);
  const q = (dx: number, dy: number, dz: number): V => [sx + dx * K, sy + dy * K, dz * K];
  const et: Record<string, EtiqDef> = {
    tanque: { texto: "TANQUE", para: q(0, -0.34, 0.4), off: [-1.0, -0.9], cor: "#ffd23f" },
    ar: { texto: "AR COMPRIMIDO", para: q(-1.15, 0.02, 0.3), off: [-0.6, 0.9], cor: "#bfe4ff" },
    equil: { texto: "EQUILÍBRIO", para: q(1.35, 0.18, 0.4), off: [0.3, 1.1], cor: "#ffd23f" },
    asas: { texto: "ASINHAS", para: q(1.2, -0.05, 0.78), off: [0.7, -0.9], cor: "#ff8a2a" },
    oxi: { texto: "OXIGÊNIO", para: q(0.55, -0.2, 0.3), off: [0.9, 0.9], cor: "#bfe9ff" },
    filtro: { texto: "FILTRO CO₂", para: q(-0.5, -0.12, 0.3), off: [-0.8, -1.1], cor: "#9dff9d" },
    peri: { texto: "PERISCÓPIO", para: q(0.35, 1.2, 0.2), off: [1.0, 0.6], cor: "#e8eef2" },
    sonar: { texto: "SONAR", para: q(1.8, 0.0, 0.3), off: [0.2, 1.1], cor: "#d7f3ff" },
    bateria: { texto: "BATERIA", para: q(0.1, -0.3, 0.3), off: [0.2, -1.2], cor: "#ffd23f" },
    motorE: { texto: "MOTOR ELÉTRICO", para: q(-1.2, -0.12, 0.3), off: [-0.4, 1.2], cor: "#7cc4ff" },
    reator: { texto: "REATOR", para: q(0.25, -0.1, 0.3), off: [0.5, 1.2], cor: "#9dff7a" },
    camara: { texto: "CÂMARA DE SAÍDA", para: q(-1.5, 0.0, 0.3), off: [-0.3, 1.3], cor: "#ffd23f" },
    sub: { texto: "SUBMARINO", para: q(0.3, 0.6, 0.3), off: [0.2, 1.4], cor: "#ffd23f" },
    casco: { texto: "CASCO", para: q(0.6, 0.5, 0.2), off: [0.8, 1.0], cor: "#e8eef2" },
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
      <group position={[X0, 0, 0]}>
        {palco === "tanque" && <TanqueGrande C={C} />}
        {palco === "vitrine" && <Vitrine C={C} />}
      </group>
      {palco === "tanque" && etiqs.map(({ c, ini }) => {
        const d = et[c];
        const base: V = [d.para[0], d.para[1], d.para[2] + ZB];
        const off: V = [base[0] + d.off[0] * S, base[1] + d.off[1] * S, base[2] + 0.35];
        return <Etiqueta key={c} texto={d.texto} de={off} para={base} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

void suave;

export const submarino: Cenario3D = {
  Cena: SubCena,
  padrao: "geral",
  fundo: () => "#9ad0f5",
  luzPropria: true,
  cameras: { geral: { pos: [-0.2, -0.2, 9], alvo: [-0.2, -1.2, 0], fov: 50 } },
};
