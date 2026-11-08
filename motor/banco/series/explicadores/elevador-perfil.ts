// Perfil de velocidade do elevador (episódio 14), usado pelo cenário (posição da cabine) e pelo cartão `curva` (gráfico), para os dois andarem juntos.
// u = 0..1 ao longo da viagem. "seco": velocidade constante e parada de uma vez (tranco). "suave": acelera aos poucos, anda rápido, desacelera devagar (curva em S).

const ss = (k: number) => {
  const x = Math.min(Math.max(k, 0), 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
export const ACEL = 0.22;
export const DESACEL = 0.48;
export const velSuave = (u: number) => (u < ACEL ? ss(u / ACEL) : u > 1 - DESACEL ? ss((1 - u) / DESACEL) : 1);
export const velSeco = (u: number) => (u <= 0 || u >= 1 ? 0 : 1);

const N = 600;
const TAB: number[] = [0];
for (let i = 1; i <= N; i++) TAB.push(TAB[i - 1] + velSuave((i - 0.5) / N) / N);
const TOT = TAB[N];
/** posição normalizada (0..1) da cabine na curva suave */
export const posSuave = (u: number) => {
  const x = Math.min(Math.max(u, 0), 1) * N;
  const i = Math.min(N - 1, Math.floor(x));
  return (TAB[i] + (TAB[i + 1] - TAB[i]) * (x - i)) / TOT;
};
export const posSeco = (u: number) => Math.min(Math.max(u, 0), 1);
