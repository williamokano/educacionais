import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Background, StoreCounter } from "./scene/Background";
import { Captions } from "./scene/Captions";
import { Character } from "./scene/Character";
import { Overlays } from "./scene/Overlays";
import { C, FONT, W } from "./theme";
import { Beat, EpisodeData } from "./types";

const FADE = 5;

const BeatView: React.FC<{ beat: Beat; frames: number; offset: number; fadeIn: boolean }> = ({ beat, frames, offset, fadeIn }) => {
  const frame = useCurrentFrame();
  const { scene } = beat;
  const opacity = fadeIn ? interpolate(frame, [0, FADE], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const shake = scene.shake ? interpolate(frame, [0, 14], [18, 0], { extrapolateRight: "clamp" }) * Math.sin(frame * 2.3) : 0;

  return (
    <AbsoluteFill style={{ opacity, transform: `translate(${shake}px, ${shake * 0.4}px)` }}>
      <Background bg={scene.bg} />
      {scene.chars?.map((c, i) => <Character key={`${c.id}-${i}`} spec={c} startFrame={0} />)}
      {scene.bg === "store" && <StoreCounter />}
      <Overlays scene={scene} frames={frames} />
      <Captions words={beat.words} offset={offset} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ data: EpisodeData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center", opacity: o, fontFamily: FONT, textTransform: "uppercase" }}>
      <div style={{ fontWeight: 700, fontSize: 190, color: C.white, lineHeight: 1 }}>{data.endcard.part}</div>
      <div style={{ fontWeight: 700, fontSize: 64, color: C.red, marginTop: 24 }}>{data.endcard.question}</div>
      <div style={{ fontWeight: 500, fontSize: 34, color: C.white, opacity: 0.8, marginTop: 18, letterSpacing: 2 }}>{data.endcard.cta}</div>
      <div style={{ position: "absolute", bottom: 160, width: W, textAlign: "center", fontWeight: 500, fontSize: 30, color: C.white, opacity: 0.35, letterSpacing: 8 }}>
        {data.series}
      </div>
    </AbsoluteFill>
  );
};

export const Episode: React.FC<{ episode: string; data: EpisodeData | null }> = ({ data }) => {
  if (!data) return null;
  const { fps } = data;
  const endFrame = Math.round(data.endcardStart * fps);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio src={staticFile(data.audio)} />
      {data.beats.map((beat, i) => {
        const from = Math.round(beat.start * fps);
        const next = i + 1 < data.beats.length ? Math.round(data.beats[i + 1].start * fps) : endFrame;
        return (
          <Sequence key={i} from={from} durationInFrames={next - from} name={`batida ${i + 1}`}>
            <BeatView beat={beat} frames={next - from} offset={from / fps} fadeIn={i > 0} />
          </Sequence>
        );
      })}
      <Sequence from={endFrame} name="cartão final">
        <EndCard data={data} />
      </Sequence>
    </AbsoluteFill>
  );
};
