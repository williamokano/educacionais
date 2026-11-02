import React from "react";
import { Mat, useSeg } from "./qualidade";
import { Cenario3D } from "./tipos";

// Estúdio 3D neutro (fundo infinito curvo) para folhas de personagem e cenas de apresentação.

const Ciclorama: React.FC = () => {
  const seg = useSeg();
  // chão que sobe em curva até virar parede: um quarto de cilindro deitado + chão + parede
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.5]} receiveShadow>
        <planeGeometry args={[20, 7]} />
        <Mat cor="#e9e4da" rug={0.95} />
      </mesh>
      <mesh position={[0, 1.5, -2]} rotation={[0, 0, Math.PI / 2]} receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 20, seg(16, 48), 1, true, Math.PI, Math.PI / 2]} />
        <Mat cor="#e9e4da" rug={0.95} dupla />
      </mesh>
      <mesh position={[0, 4, -3.5]} receiveShadow>
        <planeGeometry args={[20, 5]} />
        <Mat cor="#e9e4da" rug={0.95} />
      </mesh>
    </group>
  );
};

const c = (pos: [number, number, number], alvo: [number, number, number], fov = 35) => ({ pos, alvo, fov });

export const FUNDO_ESTUDIO = "#e9e4da";

export const estudio3d: Cenario3D = {
  Cena: () => <Ciclorama />,
  padrao: "corpo",
  fundo: FUNDO_ESTUDIO,
  cameras: {
    corpo: c([0, 1.1, 4.4], [0, 0.85, 0]),
    rosto: c([0, 1.42, 1.25], [0, 1.38, 0], 30),
    tres4: c([2.2, 1.3, 3.6], [0, 0.85, 0]),
    // folha de ações: 6 poses lado a lado em x = -3.75 .. 3.75
    fila: c([0, 1.2, 9.4], [0, 0.8, 0], 30),
    rostos: c([0, 1.4, 6.1], [0, 1.38, 0], 14),
  },
};

/** cenários 3D que todo pacote tem */
export const CENARIOS3D_GENERICOS: Record<string, Cenario3D> = { "estudio-3d": estudio3d };
