// Valores que mudam com a fala: um valor só, ou uma lista em que o item i vale a partir do trecho i.
// Usado pelos cenários e cartões dos pacotes (ex.: "foco": ["tudo", "notas", "rg"], "onda": ["fala", "linha"]).

export const porTrecho = <T,>(v: T | T[] | undefined, t: number, trechos: number[]): { atual?: T; anterior?: T; desde: number; indice: number } => {
  if (!Array.isArray(v)) return { atual: v, desde: 0, indice: 0 };
  let i = 0;
  while (i + 1 < v.length && (trechos[i + 1] ?? Infinity) <= t) i++;
  return { atual: v[i], anterior: i > 0 ? v[i - 1] : undefined, desde: i > 0 ? trechos[i] : 0, indice: i };
};

/** "aleatório" determinístico (regra 3 do CLAUDE.md): mesmo n, mesmo valor */
export const hash01 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
