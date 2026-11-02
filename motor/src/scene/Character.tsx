import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, H, W } from "../theme";
import { CharSpec, Pose } from "../types";

// Personagens flat: cabeça redonda, sem contorno, 2–3 cores. Coordenadas com origem no centro do corpo (x=0).
type Look = {
  skin: string;
  hair: string;
  top: string;
  pants: string;
  size: number; // altura em px na tela
};

const LOOKS: Record<CharSpec["id"], Look> = {
  jakob: { skin: "#E2B48C", hair: "#3B2A20", top: "#5E6B3A", pants: "#2F3E5C", size: 720 },
  mara: { skin: "#F1C9A5", hair: "#A4442A", top: "#4D6E9A", pants: "#2B2B33", size: 690 },
  leo: { skin: "#F3D2B0", hair: "#E3BE5A", top: C.yellow, pants: "#3A5A8C", size: 520 },
};

const SHOULDER_Y = 150;
const HIP_Y = 275;

// Ângulos em graus. [braço, antebraço]: 0 = apontando pra baixo; positivo abre pra fora do corpo.
// O antebraço tem ângulo absoluto: 180 = apontando pra cima; >90 dobra de volta pra cabeça.
const ARM_POSES: Record<Pose, { back: [number, number]; front: [number, number] }> = {
  idle: { back: [12, 0], front: [12, 0] },
  walk: { back: [12, 0], front: [12, 0] },
  radio: { back: [12, 0], front: [120, 137] }, // mão com o rádio na orelha
  listen: { back: [12, 0], front: [120, 137] },
  crowbar: { back: [20, 10], front: [100, 175] }, // braço erguido ao lado do corpo
};
// Leo segura o coelho no peito com o braço de trás
const HUG: [number, number] = [10, 80];

const Arm: React.FC<{ side: 1 | -1; a1: number; a2: number; color: string; skin: string; children?: React.ReactNode }> = ({
  side, a1, a2, color, skin, children,
}) => {
  // side=1 braço da frente (direita da tela), side=-1 o de trás; ângulos espelhados entre os lados
  const sx = 46 * side;
  const r1 = (a1 * Math.PI) / 180;
  const ex = sx + side * Math.sin(r1) * 62;
  const ey = SHOULDER_Y + Math.cos(r1) * 62;
  const r2 = (a2 * Math.PI) / 180;
  const hx = ex - side * Math.sin(r2) * 56;
  const hy = ey + Math.cos(r2) * 56;
  return (
    <g>
      <line x1={sx} y1={SHOULDER_Y} x2={ex} y2={ey} stroke={color} strokeWidth={22} strokeLinecap="round" />
      <line x1={ex} y1={ey} x2={hx} y2={hy} stroke={color} strokeWidth={20} strokeLinecap="round" />
      <circle cx={hx} cy={hy} r={12} fill={skin} />
      <g transform={`translate(${hx} ${hy})`}>{children}</g>
    </g>
  );
};

const Radio = () => (
  <g transform="translate(-6 -30)">
    <rect x={-16} y={-8} width={34} height={52} rx={6} fill="#2A2D33" />
    <rect x={-10} y={0} width={22} height={14} rx={2} fill={C.yellow} opacity={0.85} />
    <line x1={12} y1={-8} x2={18} y2={-40} stroke="#2A2D33" strokeWidth={4} strokeLinecap="round" />
  </g>
);

const Bat = () => (
  <g transform="rotate(-8)">
    <rect x={-7} y={-6} width={14} height={150} rx={7} fill="#B9874F" />
    <rect x={-8} y={30} width={16} height={34} fill="#C9CDD2" />
  </g>
);

const Crowbar = () => (
  <g transform="rotate(200)">
    <rect x={-8} y={-30} width={16} height={170} rx={6} fill="#9AA1AB" />
    <path d="M 0 140 q 0 30 28 30" stroke="#9AA1AB" strokeWidth={16} fill="none" strokeLinecap="round" />
  </g>
);

const Rabbit = () => (
  <g>
    <ellipse cx={0} cy={0} rx={24} ry={28} fill="#8B5E3C" />
    <circle cx={0} cy={-34} r={18} fill="#8B5E3C" />
    <ellipse cx={-9} cy={-62} rx={6} ry={18} fill="#8B5E3C" />
    <ellipse cx={9} cy={-62} rx={6} ry={18} fill="#8B5E3C" />
    <circle cx={-6} cy={-36} r={2.5} fill={C.ink} />
    <circle cx={6} cy={-36} r={2.5} fill={C.ink} />
  </g>
);

const Hair: React.FC<{ id: CharSpec["id"]; color: string }> = ({ id, color }) => {
  if (id === "jakob") {
    return <path d="M -47 74 Q -52 20 0 18 Q 50 18 47 72 L 40 52 L 30 44 L 14 48 L 2 40 L -12 48 L -28 44 L -38 54 Z" fill={color} />;
  }
  if (id === "mara") {
    return (
      <g fill={color}>
        <circle cx={28} cy={6} r={20} />
        <circle cx={44} cy={-14} r={16} />
        <circle cx={36} cy={-34} r={13} />
        <path d="M -48 82 Q -54 20 0 20 Q 52 20 48 82 Q 40 40 0 40 Q -40 40 -48 82 Z" />
      </g>
    );
  }
  return <path d="M -47 70 Q -50 22 0 22 Q 50 22 47 70 L 36 50 L 22 56 L 10 44 L -4 54 L -18 44 L -30 54 Z" fill={color} />;
};

export const Character: React.FC<{ spec: CharSpec; startFrame: number }> = ({ spec, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - startFrame;
  const look = LOOKS[spec.id];
  const pose: Pose = spec.pose ?? "idle";
  const arms = spec.id === "leo" && pose !== "walk" ? { ...ARM_POSES[pose], back: HUG } : ARM_POSES[pose];

  const enterP = spec.enter ? spring({ frame: t, fps, config: { damping: 18, mass: 0.7 } }) : 1;
  const offX = spec.enter === "left" ? -W * 0.6 : spec.enter === "right" ? W * 0.6 : 0;
  const offY = spec.enter === "bottom" ? H * 0.4 : 0;

  const walking = pose === "walk";
  const swing = walking ? Math.sin(frame / 4) * 16 : 0;
  const bob = walking ? Math.abs(Math.sin(frame / 4)) * -8 : Math.sin(frame / 22) * 3;
  const blink = frame % 96 < 4 ? 0.15 : 1;
  const tilt = pose === "listen" ? -8 : 0;

  const size = look.size * (spec.scale ?? 1);
  const unit = size / 420;
  const x = spec.x * W + offX * (1 - enterP);
  const feetY = H * 0.86 + offY * (1 - enterP);

  const backArm = (
    <Arm side={-1} a1={arms.back[0] + swing} a2={arms.back[1] + swing} color={look.top} skin={look.skin}>
      {spec.id === "jakob" && <Bat />}
      {spec.id === "leo" && <g transform="translate(14 -14)"><Rabbit /></g>}
    </Arm>
  );
  const frontArm = (
    <Arm side={1} a1={arms.front[0] - swing} a2={arms.front[1] - swing} color={look.top} skin={look.skin}>
      {(pose === "radio" || pose === "listen") && <Radio />}
      {pose === "crowbar" && <Crowbar />}
    </Arm>
  );

  return (
    <svg
      viewBox="-120 -60 240 480"
      width={240 * unit}
      height={480 * unit}
      style={{
        position: "absolute",
        left: x - 120 * unit,
        top: feetY - 420 * unit + bob,
        transform: spec.flip ? "scaleX(-1)" : undefined,
        overflow: "visible",
      }}
    >
      {/* sombra */}
      <ellipse cx={0} cy={412} rx={70} ry={10} fill="#000" opacity={0.18} />
      {/* mochila */}
      {spec.id === "jakob" && <rect x={-62} y={138} width={34} height={112} rx={10} fill="#6E7378" />}
      {spec.id === "leo" && <circle cx={0} cy={84} r={56} fill="#D9AA22" />}
      {spec.id !== "leo" && backArm}
      {/* pernas */}
      <g transform={`rotate(${swing} -16 ${HIP_Y})`}>
        <rect x={-30} y={HIP_Y - 10} width={24} height={135} rx={10} fill={look.pants} />
        <rect x={-34} y={HIP_Y + 112} width={32} height={16} rx={8} fill="#24262B" />
      </g>
      <g transform={`rotate(${-swing} 16 ${HIP_Y})`}>
        <rect x={6} y={HIP_Y - 10} width={24} height={135} rx={10} fill={look.pants} />
        <rect x={2} y={HIP_Y + 112} width={32} height={16} rx={8} fill="#24262B" />
      </g>
      {/* tronco */}
      {spec.id === "leo" ? (
        <path d="M -40 128 L 40 128 L 56 330 Q 0 340 -56 330 Z" fill={look.top} />
      ) : (
        <rect x={-46} y={126} width={92} height={160} rx={24} fill={look.top} />
      )}
      {spec.id === "jakob" && <path d="M -24 124 L 24 124 L 0 156 Z" fill="#C8372D" />}
      {spec.id === "jakob" && <line x1={-30} y1={132} x2={-36} y2={240} stroke="#555A60" strokeWidth={8} />}
      {spec.id === "mara" && <rect x={-60} y={168} width={24} height={16} rx={3} fill={C.white} transform="rotate(10 -48 176)" />}
      {spec.id === "mara" && <line x1={0} y1={130} x2={0} y2={284} stroke="#3E5B82" strokeWidth={4} />}
      {/* Leo abraça o coelho: braço por cima da capa */}
      {spec.id === "leo" && backArm}
      {/* cabeça */}
      <g transform={`rotate(${tilt} 0 120)`}>
        <circle cx={0} cy={72} r={48} fill={look.skin} />
        {spec.id === "jakob" && <path d="M -40 92 Q 0 132 40 92 Q 30 116 0 120 Q -30 116 -40 92 Z" fill="#8A6A52" opacity={0.35} />}
        <Hair id={spec.id} color={look.hair} />
        <g transform={`translate(0 76) scale(1 ${blink}) translate(0 -76)`}>
          <ellipse cx={-16} cy={76} rx={5} ry={6} fill={C.ink} />
          <ellipse cx={16} cy={76} rx={5} ry={6} fill={C.ink} />
        </g>
        <line x1={-24} y1={62} x2={-9} y2={pose === "crowbar" ? 66 : 60} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        <line x1={24} y1={62} x2={9} y2={pose === "crowbar" ? 66 : 60} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        {pose === "listen" ? (
          <ellipse cx={0} cy={100} rx={6} ry={7} fill="#7A3B32" />
        ) : (
          <path d="M -9 100 Q 0 104 9 100" stroke="#7A3B32" strokeWidth={4} fill="none" strokeLinecap="round" />
        )}
      </g>
      {frontArm}
    </svg>
  );
};
