import { PontoCamera, V3, Valor } from "./tipos";

export const clamp01 = (k: number) => Math.min(Math.max(k, 0), 1);
export const suave = (k: number) => -(Math.cos(Math.PI * clamp01(k)) - 1) / 2;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** Valor de um campo do cenário no `progresso` da batida (número fixo ou { de, para, ini, fim }). */
export const valor = (v: Valor | undefined, progresso: number, padrao = 0): number => {
  if (v == null) return padrao;
  if (typeof v === "number") return v;
  const k = clamp01((progresso - (v.ini ?? 0)) / Math.max((v.fim ?? 1) - (v.ini ?? 0), 1e-6));
  return lerp(v.de, v.para, suave(k));
};

/** Valor no fim da batida (para a batida seguinte continuar de onde parou). */
export const valorFinal = (v: Valor | undefined, padrao = 0) => valor(v, 1, padrao);

/** Câmera que não fica parada: sem `para`, chega 6% mais perto do alvo durante a batida. */
export const empurra = (p: PontoCamera, k = 0.06): PontoCamera => ({ ...p, pos: lerp3(p.pos, p.alvo, k) });

export const mistura = (a: PontoCamera, b: PontoCamera, k: number): PontoCamera => ({
  pos: lerp3(a.pos, b.pos, k),
  alvo: lerp3(a.alvo, b.alvo, k),
  fov: lerp(a.fov ?? 40, b.fov ?? 40, k),
});
