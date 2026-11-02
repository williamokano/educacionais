import { ChipColor } from "./theme";

export type Pose = "idle" | "walk" | "radio" | "crowbar" | "listen";

export type CharSpec = {
  id: "jakob" | "mara" | "leo";
  x: number; // 0..1 da largura
  pose?: Pose;
  flip?: boolean;
  scale?: number;
  enter?: "left" | "right" | "bottom";
};

export type Scene = {
  bg: "dark" | "dusk_city" | "store_front" | "store" | "map";
  chars?: CharSpec[];
  big?: { text: string; color?: ChipColor };
  counter?: { from: number; to: number; label: string; color?: ChipColor };
  chips?: { text: string; color?: ChipColor }[];
  clock?: { day: string; time: string };
  stat?: { value: string; unit: string };
  stat2?: { value: string; unit: string };
  versus?: { left: string; leftLabel: string; right: string; rightLabel: string };
  tag?: { title: string; sub: string };
  radio?: boolean;
  radioWaves?: boolean;
  shake?: boolean;
  vignette?: boolean;
};

export type Word = { text: string; color: "yellow" | "red" | null; start: number; end: number };

export type Beat = { start: number; end: number; scene: Scene; words: Word[] };

export type EpisodeData = {
  series: string;
  episode: number;
  fps: number;
  audio: string;
  endcardStart: number;
  durationInFrames: number;
  endcard: { part: string; question: string; cta: string };
  beats: Beat[];
};
