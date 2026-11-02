import React, { useMemo } from "react";
import * as THREE from "three";
import { valor } from "../../../src/v3d/anima";
import { Calor, Fluxo } from "../../../src/v3d/particulas";
import { Caixa, Mat, rnd, useSeg } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, V3, Valor } from "../../../src/v3d/tipos";

// Sala da demo "balde de gelo na frente do ventilador".
// Campos da cena: gelo (0..1 derretido), relogio (minutos do dia), vento (true/false), calor (0..1: o calor entra no balde),
// balde (false = sem o balde, só o ventilador).

type V = [number, number, number];

const Piso: React.FC = () => {
  const tabuas = useMemo(() => {
    const out: { x: number; z: number; w: number; cor: string }[] = [];
    const cores = ["#d9a25b", "#cf9550", "#e0ad68", "#c98d4a"];
    for (let i = 0; i < 16; i++) {
      const z = -1.3 + i * 0.24;
      let x = -3.2 + rnd(i) * 0.8;
      let k = 0;
      while (x < 3.4) {
        const w = 0.9 + rnd(i * 10 + k) * 0.8;
        out.push({ x: x + w / 2, z, w: w - 0.015, cor: cores[Math.floor(rnd(i * 7 + k * 3) * 4)] });
        x += w;
        k++;
      }
    }
    return out;
  }, []);
  return (
    <group>
      <Caixa p={[0, -0.06, 0.6]} t={[7, 0.1, 4.2]} cor="#8a5a2e" raio={0.001} />
      {tabuas.map((t, i) => (
        <Caixa key={i} p={[t.x, 0, t.z]} t={[t.w, 0.03, 0.228]} cor={t.cor} rug={0.7} raio={0.012} sombra={false} />
      ))}
    </group>
  );
};

export const Arvore: React.FC<{ p: V; s?: number }> = ({ p, s = 1 }) => {
  const seg = useSeg();
  return (
    <group position={p} scale={s}>
      <Caixa p={[0, 0.35, 0]} t={[0.1, 0.7, 0.1]} cor="#7a4a26" />
      <mesh position={[0, 0.95, 0]} castShadow>
        <icosahedronGeometry args={[0.42, seg(0, 3)]} />
        <Mat cor="#4caf50" rug={0.9} />
      </mesh>
      <mesh position={[0.18, 1.2, 0.05]}>
        <icosahedronGeometry args={[0.26, seg(0, 3)]} />
        <Mat cor="#5cc05f" rug={0.9} />
      </mesh>
    </group>
  );
};

const Quadro: React.FC<{ p: V }> = ({ p }) => {
  const montanha = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.28, -0.16); s.lineTo(-0.08, 0.06); s.lineTo(0.04, -0.04); s.lineTo(0.16, 0.08); s.lineTo(0.28, -0.16);
    return s;
  }, []);
  return (
    <group position={p}>
      <Caixa p={[0, 0, 0]} t={[0.7, 0.48, 0.04]} cor="#6b3d1f" raio={0.012} />
      <mesh position={[0, 0, 0.022]}><planeGeometry args={[0.6, 0.38]} /><meshBasicMaterial color="#9fd3f0" /></mesh>
      <mesh position={[0, 0, 0.026]}><shapeGeometry args={[montanha]} /><meshBasicMaterial color="#3fa34d" /></mesh>
      <mesh position={[0.16, 0.1, 0.025]}><circleGeometry args={[0.05, 24]} /><meshBasicMaterial color="#f5c542" /></mesh>
    </group>
  );
};

const Relogio: React.FC<{ p: V; minutos: number }> = ({ p, minutos }) => {
  const seg = useSeg();
  return (
    <group position={p}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.04, seg(20, 48)]} />
        <Mat cor="#2b2b2b" rug={0.4} verniz={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.021]}><circleGeometry args={[0.175, seg(20, 48)]} /><meshBasicMaterial color="#fbfaf5" /></mesh>
      <mesh position={[0, 0, 0.03]} rotation={[0, 0, -(minutos / 60) * Math.PI * 2]}>
        <boxGeometry args={[0.012, 0.3, 0.005]} /><meshBasicMaterial color="#222" />
      </mesh>
      <mesh position={[0, 0, 0.032]} rotation={[0, 0, -(minutos / 720) * Math.PI * 2]}>
        <boxGeometry args={[0.02, 0.2, 0.005]} /><meshBasicMaterial color="#d33" />
      </mesh>
    </group>
  );
};

const Sala: React.FC<{ minutos: number }> = ({ minutos }) => {
  const parede = "#efe1c6";
  return (
    <group>
      <Piso />
      {/* parede do fundo com o vão da janela (x -1.6..-0.6, y 1.1..2.1) */}
      <Caixa p={[-2.4, 2.2, -1.45]} t={[1.6, 4.4, 0.1]} cor={parede} raio={0.002} rug={0.95} />
      <Caixa p={[1.25, 2.2, -1.45]} t={[3.7, 4.4, 0.1]} cor={parede} raio={0.002} rug={0.95} />
      <Caixa p={[-1.1, 0.55, -1.45]} t={[1.0, 1.1, 0.1]} cor={parede} raio={0.002} rug={0.95} />
      <Caixa p={[-1.1, 3.25, -1.45]} t={[1.0, 2.3, 0.1]} cor={parede} raio={0.002} rug={0.95} />
      <Caixa p={[0, 0.07, -1.38]} t={[6.8, 0.14, 0.04]} cor="#c9b89a" raio={0.01} />
      <Caixa p={[-3.2, 2.2, 0.6]} t={[0.1, 4.4, 4.2]} cor="#e8d8ba" raio={0.002} rug={0.95} />
      {/* moldura da janela */}
      <Caixa p={[-1.1, 1.1, -1.38]} t={[1.08, 0.06, 0.12]} cor="#ffffff" raio={0.015} />
      <Caixa p={[-1.1, 2.1, -1.38]} t={[1.08, 0.06, 0.12]} cor="#ffffff" raio={0.015} />
      <Caixa p={[-1.62, 1.6, -1.38]} t={[0.06, 1.06, 0.12]} cor="#ffffff" raio={0.015} />
      <Caixa p={[-0.58, 1.6, -1.38]} t={[0.06, 1.06, 0.12]} cor="#ffffff" raio={0.015} />
      <Caixa p={[-1.1, 1.6, -1.38]} t={[0.04, 1.0, 0.06]} cor="#ffffff" raio={0.012} />
      {/* lado de fora */}
      <mesh position={[-1.1, 2, -3.5]}><planeGeometry args={[8, 5]} /><meshBasicMaterial color="#8fd0f5" /></mesh>
      <mesh position={[-1.1, 0.3, -2.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[8, 3]} /><meshBasicMaterial color="#7cc86a" /></mesh>
      {Array.from({ length: 12 }).map((_, i) => <Caixa key={i} p={[-2.4 + i * 0.22, 0.75, -2.1]} t={[0.08, 0.5, 0.03]} cor="#ffffff" raio={0.01} />)}
      <Caixa p={[-1.1, 0.9, -2.1]} t={[2.7, 0.05, 0.03]} cor="#ffffff" raio={0.01} />
      <Arvore p={[-1.35, 0.3, -2.7]} s={1.4} />
      <Quadro p={[0.55, 2.05, -1.38]} />
      <Relogio p={[-0.15, 2.55, -1.38]} minutos={minutos} />
      {/* tapete */}
      <Caixa p={[-0.1, 0.02, 0.35]} t={[2.6, 0.015, 1.8]} cor="#ef8a4c" raio={0.006} rug={1} tecido />
      <Caixa p={[-0.1, 0.026, 0.35]} t={[2.3, 0.015, 1.5]} cor="#f4a565" raio={0.006} rug={1} tecido />
    </group>
  );
};

export const Banquinho: React.FC<{ p: V }> = ({ p }) => {
  const seg = useSeg();
  return (
    <group position={p}>
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.07, seg(18, 64)]} />
        <Mat cor="#b9773f" rug={0.55} verniz={0.4} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.26, 0.37, Math.sin(a) * 0.26]} rotation={[Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]} castShadow>
            <cylinderGeometry args={[0.035, 0.03, 0.76, seg(8, 20)]} />
            <Mat cor="#7a4522" rug={0.55} verniz={0.4} />
          </mesh>
        );
      })}
    </group>
  );
};

const ALTURA = 0.46;
const raio = (y: number) => 0.215 + (y / ALTURA) * 0.075;

const Gelo: React.FC<{ derretido: number }> = ({ derretido }) => {
  const seg = useSeg();
  const cubos = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => {
      const a = rnd(i + 3) * Math.PI * 2;
      const d = rnd(i + 40) * 0.15;
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, y: 0.08 + (i % 4) * 0.1 + rnd(i) * 0.04, s: 0.13 + rnd(i + 9) * 0.05, r: [rnd(i), rnd(i + 1), rnd(i + 2)].map((v) => v * 1.5) as V };
    }),
    [],
  );
  const agua = 0.04 + derretido * 0.24;
  return (
    <group>
      {cubos.map((c, i) => {
        const s = c.s * (1 - derretido * 0.6);
        const y = Math.max(agua - s * 0.2, c.y * (1 - derretido * 0.55) + s / 2 + 0.03);
        return (
          <Caixa key={i} p={[c.x, y, c.z]} r={c.r} t={[s, s, s]} raio={s * 0.18} cor="#dcefff" rug={0.12} op={0.88} emissivo="#a9dcff" brilho={0.08} verniz={1} />
        );
      })}
      <mesh position={[0, agua / 2 + 0.01, 0]}>
        <cylinderGeometry args={[raio(agua) - 0.008, raio(0) - 0.008, agua, seg(22, 48)]} />
        <meshPhysicalMaterial color="#7ec4ea" transparent opacity={0.75} roughness={0.05} clearcoat={1} />
      </mesh>
    </group>
  );
};

export const Balde: React.FC<{ p: V; derretido: number }> = ({ p, derretido }) => {
  const seg = useSeg();
  const lateral = useMemo(() => [new THREE.Vector2(raio(0), 0), new THREE.Vector2(raio(ALTURA), ALTURA)], []);
  return (
    <group position={p}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[lateral, seg(24, 64)]} />
        <Mat cor="#9aa0a6" rug={0.38} met={0.6} dupla />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[raio(0), seg(24, 64)]} />
        <Mat cor="#6f747a" met={0.5} rug={0.5} />
      </mesh>
      {[0.03, 0.17, 0.31, ALTURA].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[raio(y) + 0.006, 0.013, seg(6, 12), seg(28, 72)]} />
          <Mat cor="#7b8086" met={0.65} rug={0.35} />
        </mesh>
      ))}
      <mesh position={[0, ALTURA, 0]} castShadow>
        <torusGeometry args={[raio(ALTURA) + 0.01, 0.011, seg(6, 12), seg(28, 64), Math.PI]} />
        <Mat cor="#3d3f42" met={0.6} rug={0.35} />
      </mesh>
      <Gelo derretido={derretido} />
    </group>
  );
};

export const Ventilador: React.FC<{ p: V; giro: number; rotY: number }> = ({ p, giro, rotY }) => {
  const seg = useSeg();
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.34, 0.06, seg(20, 56)]} />
        <Mat cor="#f2f2f2" rug={0.35} verniz={0.6} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.95, seg(10, 24)]} />
        <Mat cor="#d8d8d8" rug={0.25} met={0.8} />
      </mesh>
      <group position={[0, 1.02, 0]}>
        <mesh position={[0, 0, -0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 0.18, seg(14, 40)]} />
          <Mat cor="#f4f4f4" rug={0.3} verniz={0.7} />
        </mesh>
        <group rotation={[0, 0, giro]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[0.35, 0, (i / 3) * Math.PI * 2]} position={[0, 0, 0.02]} castShadow>
              <boxGeometry args={[0.13, 0.27, 0.01]} />
              <Mat cor="#6cb9e8" rug={0.25} op={0.85} verniz={1} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.05, seg(12, 32)]} />
            <Mat cor="#ffffff" rug={0.3} />
          </mesh>
        </group>
        {[-0.04, 0.08].map((z) => (
          <mesh key={z} position={[0, 0, z]}>
            <torusGeometry args={[0.32, 0.01, seg(5, 10), seg(30, 80)]} />
            <Mat cor="#c8c8c8" met={0.8} rug={0.25} />
          </mesh>
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} position={[0, 0, 0.02]} rotation={[0, 0, (i / 12) * Math.PI * 2]}>
            <boxGeometry args={[0.006, 0.64, 0.12]} />
            <meshStandardMaterial color="#cfcfcf" transparent opacity={0.6} metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ventilador apontado para o balde (na origem)
const FAN = { x: 1.15, z: 0.75 };
const FAN_ROT = Math.atan2(-FAN.x, -FAN.z);

const SalaBalde: React.FC<Cenario3DProps> = ({ cena, progresso, t, tEpisodio: tg }) => {
  const derretido = valor(cena.gelo as Valor, progresso);
  const minutos = valor(cena.relogio as Valor, progresso, 14 * 60) + t * 0.5;
  const puxa = valor(cena.calor as Valor, progresso);
  const temBalde = cena.balde !== false; // balde: false = só o ventilador (antes da ideia do gelo)
  return (
    <group>
      <Sala minutos={minutos} />
      <Banquinho p={[0, 0, 0]} />
      {temBalde && <Balde p={[0, 0.795, 0]} derretido={derretido} />}
      <Ventilador p={[FAN.x, 0, FAN.z]} giro={tg * 27} rotY={FAN_ROT} />
      {cena.vento !== false && <Fluxo t={tg} de={[FAN.x, 1.02, FAN.z]} para={[0, 1.02, 0]} altura={0.5} troca={temBalde ? 1 - derretido * 0.9 : 0} />}
      <Calor t={tg} min={[-1.8, 0.55, -1.0]} max={[1.8, 2.45, 1.2]} puxa={temBalde ? puxa : 0} alvo={[0, 1.05, 0]} />
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 42) => ({ pos, alvo, fov });

export const salaBalde: Cenario3D = {
  Cena: SalaBalde,
  padrao: "geral",
  fundo: "#efe1c6",
  cameras: {
    geral: c([0.35, 1.75, 5.5], [-0.12, 1.0, 0], 44),
    "geral-perto": c([0.25, 1.6, 4.5], [-0.15, 0.98, 0], 44),
    zeca: c([0.2, 1.5, 3.4], [-0.4, 1.25, 1.3], 34),
    "zeca-medio": c([0.25, 1.45, 4.3], [-0.25, 1.0, 1.1], 40),
    balde: c([-0.75, 1.7, 1.45], [0.05, 0.98, 0], 42),
    "balde-perto": c([-0.6, 1.62, 1.12], [0, 0.98, 0], 42),
    "balde-cima": c([-0.3, 2.0, 1.15], [0, 0.98, 0], 42),
    "balde-cima-perto": c([-0.22, 1.88, 0.92], [0, 0.98, 0], 42),
  },
};
