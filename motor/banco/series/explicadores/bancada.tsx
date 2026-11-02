import React, { useMemo } from "react";
import * as THREE from "three";
import { valor } from "../../../src/v3d/anima";
import { CalorIndo, Nuvem } from "../../../src/v3d/particulas";
import { Caixa, Mat, rnd, useSeg } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, V3, Valor } from "../../../src/v3d/tipos";

// Bancada das analogias: um objeto do dia a dia por vez, para explicar um princípio antes de usá-lo no aparelho.
//   objeto: "mao" (álcool evaporando: esfria) · "panela" (pressão sobe o ponto de fervura)
//           "bomba" (comprimir esquenta) · "copo" (superfície gelada "sua")
//           "aquecedor" (resistência acendendo, calor saindo) · "chuveiro" (chuveiro elétrico ligado, com uma
//           condensadora pequena ao lado: a pergunta do fim do episódio 2)
//   seca 0..1 (mão: quanto do álcool já evaporou) · acende 0..1 (aquecedor) · t do episódio anima o resto

const PELE = "#c98f63";

const Mao: React.FC<{ t: number; seca: number }> = ({ t, seca }) => {
  const seg = useSeg();
  const gotas = useMemo(() => Array.from({ length: 7 }, (_, i) => [(rnd(i) - 0.5) * 0.12, (rnd(i + 5) - 0.5) * 0.12, 0.02 + rnd(i + 9) * 0.012] as V3), []);
  return (
    <group position={[0, 0.98, 0]} rotation={[-0.15, 0.2, 0]}>
      {/* palma virada para cima, dedos para a frente */}
      <Caixa p={[0, 0, 0]} t={[0.17, 0.045, 0.19]} cor={PELE} raio={0.02} rug={0.55} emissivo="#5fb6ff" brilho={0.35 * seca} />
      {[-0.06, -0.02, 0.02, 0.06].map((x, i) => (
        <mesh key={i} position={[x, 0.005, 0.15 - Math.abs(x) * 0.3]} rotation={[Math.PI / 2 - 0.15, 0, 0]} castShadow>
          <capsuleGeometry args={[0.018, 0.08 - Math.abs(x) * 0.25, seg(3, 8), seg(8, 16)]} />
          <Mat cor={PELE} rug={0.55} emissivo="#5fb6ff" brilho={0.35 * seca} />
        </mesh>
      ))}
      <mesh position={[-0.1, 0.01, 0.03]} rotation={[Math.PI / 2, 0, 0.9]} castShadow>
        <capsuleGeometry args={[0.02, 0.06, seg(3, 8), seg(8, 16)]} />
        <Mat cor={PELE} rug={0.55} />
      </mesh>
      {/* gotas de álcool encolhendo, vapor subindo e o calor da mão entrando nelas */}
      {gotas.map((g, i) => (
        <mesh key={i} position={[g[0], g[2], g[1]]} scale={[0.016 * (1 - seca), 0.009 * (1 - seca), 0.016 * (1 - seca)]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshPhysicalMaterial color="#e9f6ff" transparent opacity={0.8} roughness={0.02} clearcoat={1} />
        </mesh>
      ))}
      {seca < 0.98 && <Nuvem t={t} de={[0, 0.05, 0]} rumo={[0.05, 0.6, -0.1]} n={7} tamanho={0.18} forca={(1 - seca) * 0.7} />}
      {seca < 0.98 && <CalorIndo t={t} de={[0, -0.05, 0]} para={[0, 0.03, 0]} espalha={0.08} espalhaFim={0.06} n={10} tamanho={0.5} forca={1 - seca} />}
    </group>
  );
};

const Panela: React.FC<{ t: number }> = ({ t }) => {
  const seg = useSeg();
  const perfil = useMemo(() => [new THREE.Vector2(0, 0), new THREE.Vector2(0.16, 0), new THREE.Vector2(0.17, 0.02), new THREE.Vector2(0.17, 0.2)], []);
  return (
    <group position={[0, 0.9, 0]}>
      {/* fogão: grelha e chama azul */}
      <Caixa p={[0, -0.02, 0]} t={[0.5, 0.04, 0.5]} cor="#2b2e33" raio={0.01} met={0.4} />
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const h = 0.035 + Math.sin(t * 18 + i * 2.3) * 0.008;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.07, 0.02 + h / 2, Math.sin(a) * 0.07]}>
            <coneGeometry args={[0.012, h, 8]} />
            <meshBasicMaterial color="#4fa3ff" transparent opacity={0.85} />
          </mesh>
        );
      })}
      <group position={[0, 0.05, 0]}>
        <mesh castShadow>
          <latheGeometry args={[perfil, seg(20, 56)]} />
          <Mat cor="#b9c0c8" met={0.75} rug={0.3} dupla />
        </mesh>
        {/* tampa travada, cabo e o peso da válvula girando */}
        <mesh position={[0, 0.21, 0]}><cylinderGeometry args={[0.175, 0.175, 0.025, seg(20, 56)]} /><Mat cor="#a9b0b8" met={0.75} rug={0.3} /></mesh>
        <Caixa p={[0.27, 0.205, 0]} t={[0.2, 0.03, 0.05]} cor="#1e1e1e" raio={0.012} />
        <group position={[0, 0.25, 0]} rotation={[0, t * 9, Math.sin(t * 25) * 0.08]}>
          <mesh><cylinderGeometry args={[0.025, 0.03, 0.05, 12]} /><Mat cor="#2b2b2b" rug={0.4} verniz={0.5} /></mesh>
        </group>
        <Nuvem t={t} de={[0, 0.28, 0]} rumo={[0.15, 0.8, 0]} n={12} tamanho={0.6} />
      </group>
    </group>
  );
};

const Bomba: React.FC<{ t: number }> = ({ t }) => {
  const seg = useSeg();
  // empurra (comprime) e solta, 1 vez por segundo
  const c = (t * 1.0) % 1;
  const desce = c < 0.55 ? Math.sin((c / 0.55) * Math.PI * 0.5) : 1 - (c - 0.55) / 0.45;
  const h = 0.42; // altura do cilindro
  const ar = h * (1 - desce * 0.6); // coluna de ar embaixo do êmbolo
  const quente = desce;
  const cor = new THREE.Color("#eef3f8").lerp(new THREE.Color("#ff4436"), quente).getStyle();
  return (
    <group position={[0, 0.89, 0]}>
      <Caixa p={[0, 0.01, 0]} t={[0.3, 0.02, 0.12]} cor="#2b2b2b" raio={0.008} />
      {/* cilindro transparente: o ar dentro avermelha quando é espremido */}
      <mesh position={[0, 0.02 + h / 2, 0]}>
        <cylinderGeometry args={[0.045, 0.045, h, seg(14, 36), 1, true]} />
        <meshPhysicalMaterial color="#ffd6d0" transparent opacity={0.25} roughness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {Array.from({ length: 22 }).map((_, i) => (
        <mesh key={i} position={[(rnd(i) - 0.5) * 0.06, 0.03 + rnd(i + 3) * ar * 0.95, (rnd(i + 6) - 0.5) * 0.06]} scale={0.009}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* êmbolo, haste e cabo em T */}
      <mesh position={[0, 0.02 + ar + 0.01, 0]}><cylinderGeometry args={[0.044, 0.044, 0.02, seg(14, 36)]} /><Mat cor="#222" rug={0.5} /></mesh>
      <mesh position={[0, 0.02 + ar + 0.2, 0]}><cylinderGeometry args={[0.008, 0.008, 0.38, 10]} /><Mat cor="#c9cdd2" met={0.8} rug={0.3} /></mesh>
      <mesh position={[0, 0.02 + ar + 0.39, 0]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.022, 0.22, 4, 12]} /><Mat cor="#1e1e1e" rug={0.5} /></mesh>
      <mesh position={[0, 0.02 + h + 0.005, 0]}><cylinderGeometry args={[0.05, 0.05, 0.015, seg(14, 36)]} /><Mat cor="#d33a2c" rug={0.4} verniz={0.6} /></mesh>
      {quente > 0.6 && <CalorIndo t={t} de={[0, 0.06 + ar / 2, 0]} para={[0.15, 0.25, 0.1]} espalha={0.03} espalhaFim={0.12} n={8} tamanho={0.6} forca={(quente - 0.6) / 0.4} />}
    </group>
  );
};

const Copo: React.FC<{ t: number }> = ({ t }) => {
  const seg = useSeg();
  const perfil = useMemo(() => [new THREE.Vector2(0.045, 0), new THREE.Vector2(0.06, 0.2)], []);
  const gotas = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ a: rnd(i) * Math.PI * 2, y: 0.02 + rnd(i + 4) * 0.17, s: 0.004 + rnd(i + 8) * 0.004, nasce: rnd(i + 12) * 3 })), []);
  return (
    <group position={[0, 0.9, 0]}>
      <mesh>
        <latheGeometry args={[perfil, seg(20, 56)]} />
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.3} roughness={0.05} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.052, 0.045, 0.14, seg(20, 56)]} />
        <meshPhysicalMaterial color="#9fd3f5" transparent opacity={0.6} roughness={0.05} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <Caixa key={i} p={[(i - 1) * 0.025, 0.13 + (i % 2) * 0.02, (i - 1) * 0.01]} r={[i, i * 0.7, 0]} t={[0.035, 0.035, 0.035]} raio={0.007} cor="#e9f6ff" op={0.85} verniz={1} />
      ))}
      {/* gotas aparecendo do lado de fora: a umidade do ar condensa no vidro gelado */}
      {gotas.map((g, i) => {
        const k = Math.min(1, Math.max(0, (t % 4) - g.nasce * 0.6));
        if (k <= 0) return null;
        const r = 0.045 + (g.y / 0.2) * 0.015 + 0.002;
        return (
          <mesh key={i} position={[Math.cos(g.a) * r, g.y, Math.sin(g.a) * r]} scale={g.s * k}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.85} roughness={0.02} clearcoat={1} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Resistência: fio em espiral que vai do cinza ao vermelho-alaranjado conforme `k`. */
const Resistencia: React.FC<{ p: V3; comp: number; k: number; t: number; r?: number }> = ({ p, comp, k, t, r = 0.022 }) => {
  const curva = useMemo(() => {
    const voltas = Math.round(comp * 70);
    const pts = Array.from({ length: voltas * 8 + 1 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return new THREE.Vector3(-comp / 2 + (comp * i) / (voltas * 8), Math.sin(a) * r, Math.cos(a) * r);
    });
    return new THREE.CatmullRomCurve3(pts);
  }, [comp, r]);
  const pisca = 1 + Math.sin(t * 9) * 0.04 * k;
  const cor = new THREE.Color("#4a4a4a").lerp(new THREE.Color("#ff5a1f"), k).getStyle();
  return (
    <group position={p}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 0.45, r * 0.45, comp, 10]} /><Mat cor="#e9e2d6" rug={0.6} /></mesh>
      <mesh>
        <tubeGeometry args={[curva, Math.round(comp * 500), 0.004, 6, false]} />
        <meshStandardMaterial color={cor} emissive="#ff4a10" emissiveIntensity={1.6 * k * pisca} roughness={0.5} />
      </mesh>
    </group>
  );
};

const Aquecedor: React.FC<{ t: number; acende: number }> = ({ t, acende }) => (
  <group position={[0, 0.89, 0]}>
    {/* pés, caixa com refletor e grade na frente */}
    {[-0.17, 0.17].map((x) => <Caixa key={x} p={[x, 0.015, 0.02]} t={[0.05, 0.03, 0.2]} cor="#3a3f44" raio={0.008} />)}
    <Caixa p={[0, 0.2, -0.04]} t={[0.44, 0.34, 0.06]} cor="#eceae4" raio={0.02} verniz={0.4} />
    <Caixa p={[0, 0.2, -0.008]} t={[0.4, 0.3, 0.01]} cor="#d9dde1" met={0.9} rug={0.15} raio={0.004} />
    {[0.11, 0.2, 0.29].map((y) => <Resistencia key={y} p={[0, y, 0.03]} comp={0.34} k={acende} t={t} />)}
    {Array.from({ length: 11 }).map((_, i) => (
      <mesh key={i} position={[-0.2 + i * 0.04, 0.2, 0.075]}><cylinderGeometry args={[0.003, 0.003, 0.32, 6]} /><Mat cor="#b9c0c8" met={0.8} rug={0.3} /></mesh>
    ))}
    <Caixa p={[0.18, 0.39, -0.04]} t={[0.05, 0.03, 0.04]} cor="#e0483a" raio={0.008} emissivo="#ff3a2a" brilho={acende} />
    {acende > 0.3 && <CalorIndo t={t} de={[0, 0.2, 0.06]} para={[0.05, 0.42, 0.75]} espalha={0.14} espalhaFim={0.3} n={22} tamanho={0.9} forca={(acende - 0.3) / 0.7} />}
  </group>
);

const Chuveiro: React.FC<{ t: number }> = ({ t }) => {
  const seg = useSeg();
  return (
    <group>
      {/* chuveiro elétrico na parede: cano, corpo branco translúcido com a resistência acesa dentro, água caindo */}
      <group position={[-0.3, 1.62, -0.55]}>
        <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.014, 0.014, 0.2, 10]} /><Mat cor="#d9dde1" met={0.6} rug={0.3} /></mesh>
        <group position={[0, -0.04, 0.24]}>
          <mesh>
            <cylinderGeometry args={[0.11, 0.08, 0.1, seg(18, 40)]} />
            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.55} roughness={0.2} clearcoat={1} />
          </mesh>
          <Resistencia p={[0, 0.0, 0]} comp={0.14} k={1} t={t} r={0.018} />
          <mesh position={[0, -0.055, 0]}><cylinderGeometry args={[0.112, 0.112, 0.012, seg(18, 40)]} /><Mat cor="#e4e7ea" rug={0.4} /></mesh>
          {Array.from({ length: 36 }).map((_, i) => {
            const c = (t * 1.6 + rnd(i + 3)) % 1;
            const a = rnd(i) * Math.PI * 2;
            const rr = rnd(i + 9) * 0.09;
            return (
              <mesh key={i} position={[Math.cos(a) * (rr + c * 0.06), -0.07 - c * 0.66, Math.sin(a) * (rr + c * 0.06)]} scale={[0.006, 0.02, 0.006]}>
                <sphereGeometry args={[1, 6, 5]} />
                <meshPhysicalMaterial color="#9fd3f5" transparent opacity={0.75} roughness={0.05} />
              </mesh>
            );
          })}
          <Nuvem t={t} de={[0.05, -0.62, 0.08]} rumo={[0.25, 0.25, 0.3]} n={6} tamanho={0.45} forca={0.6} />
        </group>
      </group>
      {/* bacia de inox embaixo */}
      <Caixa p={[-0.3, 0.9, -0.24]} t={[0.36, 0.03, 0.3]} cor="#c9cdd2" met={0.8} rug={0.25} raio={0.02} />
      {/* condensadora pequena ao lado, com a hélice girando */}
      <group position={[0.38, 1.06, -0.1]} scale={0.42}>
        <Caixa p={[0, 0, 0]} t={[0.95, 0.62, 0.5]} cor="#e6e8ea" raio={0.05} rug={0.4} />
        <group position={[-0.12, 0, 0.26]}>
          <mesh><ringGeometry args={[0.2, 0.25, seg(24, 48)]} /><meshStandardMaterial color="#3a3f44" side={THREE.DoubleSide} /></mesh>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} rotation={[0, 0, (i / 6) * Math.PI]}><boxGeometry args={[0.4, 0.008, 0.004]} /><meshStandardMaterial color="#3a3f44" /></mesh>
          ))}
          <group rotation={[0, 0, t * 12]} position={[0, 0, -0.01]}>
            {[0, 1, 2].map((i) => (
              <group key={i} rotation={[0, 0, (i / 3) * Math.PI * 2]}>
                <mesh position={[0, 0.1, 0]} rotation={[0, 0.4, 0]}><boxGeometry args={[0.1, 0.17, 0.006]} /><meshStandardMaterial color="#20252a" /></mesh>
              </group>
            ))}
          </group>
        </group>
        {Array.from({ length: 6 }).map((_, i) => <Caixa key={i} p={[0.33, -0.18 + i * 0.07, 0.255]} t={[0.18, 0.012, 0.005]} cor="#b8bcc0" raio={0.002} />)}
      </group>
    </group>
  );
};

const Bancada: React.FC<Cenario3DProps> = ({ cena, progresso, tEpisodio: t }) => {
  const objeto = (cena.objeto as string | undefined) ?? "mao";
  const seca = valor(cena.seca as Valor, progresso, 0);
  const acende = valor(cena.acende as Valor, progresso, 1);
  return (
    <group>
      {/* cantinho de cozinha: piso, parede de azulejo, bancada */}
      <Caixa p={[0, -0.03, 0]} t={[6, 0.06, 6]} cor="#cdbfae" raio={0.004} rug={0.9} />
      <Caixa p={[0, 1.5, -0.6]} t={[6, 3, 0.1]} cor="#e9eef0" raio={0.003} rug={0.6} />
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} position={[-3 + i * 0.5, 1.5, -0.548]}><planeGeometry args={[0.006, 3]} /><meshBasicMaterial color="#cdd6da" /></mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, 0.9 + i * 0.5, -0.548]}><planeGeometry args={[6, 0.006]} /><meshBasicMaterial color="#cdd6da" /></mesh>
      ))}
      <Caixa p={[0, 0.86, 0]} t={[1.6, 0.06, 0.9]} cor="#8a6a4f" raio={0.01} verniz={0.4} />
      <Caixa p={[0, 0.42, 0]} t={[1.55, 0.82, 0.85]} cor="#5d7f8c" raio={0.01} />
      {objeto === "mao" && <Mao t={t} seca={seca} />}
      {objeto === "panela" && <Panela t={t} />}
      {objeto === "bomba" && <Bomba t={t} />}
      {objeto === "copo" && <Copo t={t} />}
      {objeto === "aquecedor" && <Aquecedor t={t} acende={acende} />}
      {objeto === "chuveiro" && <Chuveiro t={t} />}
    </group>
  );
};

const c = (pos: V3, alvo: V3, fov = 40) => ({ pos, alvo, fov });

export const bancada: Cenario3D = {
  Cena: Bancada,
  padrao: "objeto",
  fundo: "#e9eef0",
  cameras: {
    objeto: c([0.15, 1.3, 1.05], [0, 1.0, 0], 38),
    perto: c([0.08, 1.15, 0.62], [0, 1.0, 0], 36),
    mao: c([0.05, 1.32, 0.48], [0, 0.99, 0.02], 38),
    bomba: c([0.2, 1.4, 1.35], [0, 1.22, 0], 40),
    alto: c([0.1, 1.55, 0.9], [0, 1.05, 0], 40),
    aquecedor: c([0.25, 1.3, 1.15], [0, 1.08, 0], 40),
    "aquecedor-perto": c([0.14, 1.18, 0.78], [0, 1.08, 0], 36),
    chuveiro: c([0.06, 1.42, 2.15], [0.04, 1.36, -0.3], 44),
  },
};
