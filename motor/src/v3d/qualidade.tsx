import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Qualidade, V3 } from "./tipos";

// Materiais e formas que mudam com a qualidade: lowpoly (facetado) ou suave (liso, bordas arredondadas).

export const QualidadeCtx = React.createContext<Qualidade>("suave");
export const useQualidade = () => React.useContext(QualidadeCtx);

/** número de segmentos de uma curva: poucos no lowpoly, muitos no suave */
export const useSeg = () => {
  const q = useQualidade();
  return (lowpoly: number, suave = lowpoly * 4) => (q === "lowpoly" ? lowpoly : suave);
};

type MatProps = {
  cor: string;
  rug?: number; // roughness
  met?: number; // metalness
  op?: number; // opacidade
  dupla?: boolean; // os dois lados
  emissivo?: string;
  brilho?: number; // emissiveIntensity
  verniz?: number; // clearcoat (só no suave): plástico, louça, olho
  tecido?: boolean; // sheen (só no suave): roupa
};

export const Mat: React.FC<MatProps> = ({ cor, rug = 0.75, met = 0, op, dupla, emissivo, brilho = 0, verniz = 0, tecido }) => {
  const q = useQualidade();
  const comum = {
    color: cor,
    roughness: rug,
    metalness: met,
    transparent: op !== undefined,
    opacity: op ?? 1,
    side: dupla ? THREE.DoubleSide : THREE.FrontSide,
    emissive: emissivo ?? "#000000",
    emissiveIntensity: brilho,
  };
  if (q === "lowpoly") return <meshStandardMaterial {...comum} flatShading />;
  return (
    <meshPhysicalMaterial
      {...comum}
      clearcoat={verniz}
      clearcoatRoughness={0.3}
      sheen={tecido ? 0.6 : 0}
      sheenRoughness={0.8}
      sheenColor={tecido ? cor : "#000000"}
    />
  );
};

/** Caixa: no suave, com cantos arredondados (raio proporcional ao lado menor). */
export const Caixa: React.FC<{ p: V3; t: V3; cor: string; r?: V3; raio?: number; sombra?: boolean } & Omit<MatProps, "cor">> = ({
  p, t, cor, r, raio, sombra = true, ...mat
}) => {
  const q = useQualidade();
  const geo = useMemo(() => {
    if (q === "lowpoly") return new THREE.BoxGeometry(...t);
    const menor = Math.min(...t);
    return new RoundedBoxGeometry(t[0], t[1], t[2], 3, Math.min(raio ?? 0.025, menor * 0.45));
  }, [q, t[0], t[1], t[2], raio]);
  return (
    <mesh position={p} rotation={r} geometry={geo} castShadow={sombra} receiveShadow>
      <Mat cor={cor} {...mat} />
    </mesh>
  );
};

/** número pseudoaleatório fixo por semente (nada de Math.random: todo quadro precisa ser igual em todo render) */
export const rnd = (s: number) => {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
