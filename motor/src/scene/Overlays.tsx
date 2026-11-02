import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, ChipColor, chipBg, FONT, H, W } from "../theme";
import { CharSpec, Scene } from "../types";

const pop = (frame: number, fps: number, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });

const text = (size: number, color: string, weight = 700): React.CSSProperties => ({
  fontFamily: FONT, fontWeight: weight, fontSize: size, color, lineHeight: 1, textTransform: "uppercase",
});

export const Chip: React.FC<{ label: string; color?: ChipColor; delay?: number; size?: number }> = ({ label, color = "yellow", delay = 0, size = 40 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, delay);
  return (
    <div style={{
      ...text(size, color === "yellow" || color === "white" ? C.ink : C.white),
      background: chipBg(color), padding: "10px 22px 12px", borderRadius: 8,
      transform: `scale(${p})`, opacity: p, boxShadow: "0 6px 0 rgba(0,0,0,0.25)",
    }}>{label}</div>
  );
};

const Card: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, delay);
  return (
    <div style={{
      background: C.white, borderRadius: 18, padding: "26px 44px", textAlign: "center",
      transform: `scale(${p}) rotate(${(1 - p) * -6}deg)`, opacity: p, boxShadow: "0 10px 0 rgba(0,0,0,0.25)",
    }}>{children}</div>
  );
};

const TopStack: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = 170 }) => (
  <div style={{ position: "absolute", top, left: 0, width: W, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
    {children}
  </div>
);

const Center: React.FC<{ children: React.ReactNode; y?: number }> = ({ children, y = 0.5 }) => (
  <div style={{ position: "absolute", top: H * y, left: 0, width: W, transform: "translateY(-50%)", display: "flex", justifyContent: "center", alignItems: "center", gap: 40 }}>
    {children}
  </div>
);

const BigRadio: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = 0.6 + Math.sin(frame / 5) * 0.25;
  return (
    <svg width={520} height={420} viewBox="-130 -120 260 210">
      <line x1={70} y1={-60} x2={110} y2={-115} stroke="#3A3E46" strokeWidth={8} strokeLinecap="round" />
      <rect x={-120} y={-60} width={240} height={150} rx={22} fill="#2A2D33" />
      <rect x={-96} y={-38} width={110} height={52} rx={6} fill={C.yellow} opacity={glow} />
      {Array.from({ length: 4 }).map((_, i) => <rect key={i} x={-96} y={30 + i * 13} width={110} height={5} fill="#3D424B" />)}
      <circle cx={70} cy={20} r={34} fill="#3D424B" />
      <circle cx={70} cy={20} r={10} fill="#5A606A" />
    </svg>
  );
};

const Waves: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      {[0, 1, 2].map((i) => {
        const t = ((frame + i * 12) % 36) / 36;
        return (
          <path key={i} d={`M ${x + 30 + t * 90} ${y - 60 - t * 50} a ${80 + t * 90} ${80 + t * 90} 0 0 1 0 ${120 + t * 100}`}
            stroke={C.yellow} strokeWidth={10} fill="none" strokeLinecap="round" opacity={1 - t} />
        );
      })}
    </svg>
  );
};

// posição aproximada do rádio na mão do personagem (ver Character.tsx)
const radioPos = (c: CharSpec) => {
  const size = { jakob: 720, mara: 690, leo: 520 }[c.id] * (c.scale ?? 1);
  const unit = size / 420;
  return { x: c.x * W + (c.flip ? -1 : 1) * 85 * unit, y: H * 0.86 - 420 * unit + 95 * unit };
};

export const Overlays: React.FC<{ scene: Scene; frames: number }> = ({ scene, frames }) => {
  const frame = useCurrentFrame();
  const radioChar = scene.chars?.find((c) => c.pose === "radio" || c.pose === "listen");

  return (
    <AbsoluteFill>
      {/* com personagem em cena o rádio já está na mão dele; o rádio grande só aparece sozinho */}
      {scene.radio && !scene.chars && <Center y={0.45}><BigRadio /></Center>}
      {scene.radioWaves && (radioChar ? <Waves {...radioPos(radioChar)} /> : <Waves x={W / 2 + 60} y={H * 0.5} />)}

      {scene.big && (
        <Center>
          <div style={{ ...text(210, chipBg(scene.big.color ?? "red")), transform: `translateX(${Math.sin(frame * 1.7) * 4}px)` }}>
            {scene.big.text}
          </div>
        </Center>
      )}

      {scene.counter && (
        <>
          <Center y={0.42}>
            <div style={text(360, chipBg(scene.counter.color ?? "white"))}>
              {Math.round(interpolate(frame, [0, Math.max(frames - 6, 1)], [scene.counter.from, scene.counter.to], { extrapolateRight: "clamp" }))}
            </div>
          </Center>
          <TopStack top={H * 0.6}><Chip label={scene.counter.label} color={scene.counter.color ?? "yellow"} /></TopStack>
        </>
      )}

      {scene.chips && (
        <TopStack top={H * (scene.radio ? 0.62 : 0.45)}>
          {scene.chips.map((c, i) => <Chip key={i} label={c.text} color={c.color} delay={i * Math.floor(frames / (scene.chips!.length + 1))} size={50} />)}
        </TopStack>
      )}

      {scene.clock && (
        <TopStack>
          <Chip label={scene.clock.day} color="red" />
          <div style={{ ...text(170, C.white), textShadow: "0 6px 0 rgba(0,0,0,0.2)" }}>{scene.clock.time}</div>
        </TopStack>
      )}

      {scene.tag && (
        <TopStack>
          <Card>
            <div style={text(110, C.red)}>{scene.tag.title}</div>
            <div style={{ ...text(42, C.ink, 500), marginTop: 10 }}>{scene.tag.sub}</div>
          </Card>
        </TopStack>
      )}

      {scene.stat && (
        <Center y={0.48}>
          <Card>
            <div style={text(220, C.ink)}>{scene.stat.value}</div>
            <div style={{ ...text(56, C.red), marginTop: 8 }}>{scene.stat.unit}</div>
          </Card>
          {scene.stat2 && (
            <Card delay={Math.floor(frames / 2)}>
              <div style={text(220, C.ink)}>{scene.stat2.value}</div>
              <div style={{ ...text(56, C.red), marginTop: 8 }}>{scene.stat2.unit}</div>
            </Card>
          )}
        </Center>
      )}

      {scene.versus && (
        <Center y={0.48}>
          <Card>
            <div style={text(200, C.ink)}>{scene.versus.left}</div>
            <div style={{ ...text(50, C.green), marginTop: 8 }}>{scene.versus.leftLabel}</div>
          </Card>
          <div style={text(70, C.white, 500)}>VS</div>
          <Card delay={Math.floor(frames / 2)}>
            <div style={text(200, C.red)}>{scene.versus.right}</div>
            <div style={{ ...text(50, C.red), marginTop: 8 }}>{scene.versus.rightLabel}</div>
          </Card>
        </Center>
      )}

      {scene.vignette && <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 55%, transparent 35%, rgba(0,0,0,0.75))" }} />}
    </AbsoluteFill>
  );
};
