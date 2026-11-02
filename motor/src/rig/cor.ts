const parse = (hex: string) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const toHex = (rgb: number[]) => "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

export const escurecer = (hex: string, f: number) => toHex(parse(hex).map((v) => v * f));

export const misturar = (a: string, b: string, t: number) => {
  const [x, y] = [parse(a), parse(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};

/** roupa gasta: desbota em direção ao cinza */
export const desbotar = (hex: string) => misturar(hex, "#9A9A92", 0.28);
