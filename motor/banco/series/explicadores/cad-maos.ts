import * as THREE from "three";
import { Pose3D } from "../../../src/v3d/tipos";

// Cinemática do braço do Boneco3D (cenário do cadeado): onde está a mão (FK) e que ângulos de ombro e cotovelo levam a mão a um ponto (IK).
// Medidas do rig (src/v3d/personagem.tsx), em metros para um boneco de 1,6 m (o rig escala tudo por altura / 1,6):
//   ombro em (±0,205, 0,455) do tronco; braço 0,27 até o cotovelo; do cotovelo ao centro da mão 0,315.
// O braço E está em +x (esquerda dele) e o D em -x. Convenções: ombro.x < 0 levanta para a frente; ombro.z abre; cotovelo.x < 0 dobra para a frente.

export const L1 = 0.27;
export const L2 = 0.315;
const OMB_X = 0.205;
const OMB_Y = 0.455;

type P3 = [number, number, number];

/** matriz do tronco em relação ao pé do rig (quadril + tronco), em metros do boneco de 1,6 m */
const matTronco = (pose: Pose3D): THREE.Matrix4 => {
  const g = (j: string) => pose[j] ?? 0;
  const m = new THREE.Matrix4().makeTranslation(0, 0.635 + g("quadril.y"), 0);
  m.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(g("quadril.x"), 0, 0)));
  m.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(g("tronco.x"), g("tronco.y"), g("tronco.z"))));
  return m;
};

/** posição do ombro (lado 1 = E, -1 = D) no rig */
export const ombro = (pose: Pose3D, lado: 1 | -1): P3 => {
  const v = new THREE.Vector3(lado * OMB_X, OMB_Y, 0).applyMatrix4(matTronco(pose));
  return [v.x, v.y, v.z];
};

/** centro da mão no rig, dados os ângulos da pose (FK) */
export const mao = (pose: Pose3D, lado: 1 | -1): P3 => {
  const k = lado > 0 ? "E" : "D";
  const g = (j: string) => pose[j] ?? 0;
  const eul = (x: number, z: number) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, 0, z));
  const m = matTronco(pose);
  m.multiply(new THREE.Matrix4().makeTranslation(lado * OMB_X, OMB_Y, 0));
  m.multiply(eul(g(`ombro${k}.x`), g(`ombro${k}.z`)));
  m.multiply(new THREE.Matrix4().makeTranslation(0, -L1, 0));
  m.multiply(eul(g(`cotovelo${k}.x`), g(`cotovelo${k}.z`)));
  const v = new THREE.Vector3(0, -L2, 0).applyMatrix4(m);
  return [v.x, v.y, v.z];
};

/**
 * Leva a mão do `lado` até `alvo` (no rig), mexendo em ombro.x, ombro.z e cotovelo.x. `k` mistura com a pose que já estava (0..1).
 * Devolve a distância que sobrou (> 0 = fora do alcance).
 */
export const agarra = (pose: Pose3D, lado: 1 | -1, alvo: P3, k = 1): number => {
  if (k <= 0.001) return 0;
  const lk = lado > 0 ? "E" : "D";
  const inv = matTronco(pose).invert();
  const t = new THREE.Vector3(...alvo).applyMatrix4(inv).sub(new THREE.Vector3(lado * OMB_X, OMB_Y, 0));
  let d = t.length();
  const dmax = (L1 + L2) * 0.999;
  const dmin = Math.abs(L1 - L2) * 1.001 + 0.02;
  const sobra = Math.max(0, d - dmax);
  if (d > dmax) { t.multiplyScalar(dmax / d); d = dmax; }
  if (d < dmin) { t.multiplyScalar(dmin / d); d = dmin; }
  // lei dos cossenos: |w|² = L1² + L2² + 2·L1·L2·cos(cx)  (cx < 0 dobra para a frente)
  const c = THREE.MathUtils.clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
  const cx = -Math.acos(c);
  const wy = -L1 - L2 * Math.cos(cx);
  const wz = -L2 * Math.sin(cx);
  const sz = THREE.MathUtils.clamp(-t.x / wy, -1, 1);
  const az = Math.asin(sz);
  const Y = wy * Math.cos(az);
  const ax = Math.atan2(t.z, t.y) - Math.atan2(wz, Y);
  const nova: Record<string, number> = { [`ombro${lk}.x`]: ax, [`ombro${lk}.z`]: az, [`cotovelo${lk}.x`]: cx, [`cotovelo${lk}.z`]: 0 };
  for (const j of Object.keys(nova)) {
    const velho = pose[j] ?? 0;
    pose[j] = velho + (nova[j] - velho) * k;
  }
  return sobra;
};

/** quadril baixo quando a coxa faz o ângulo `a` e o joelho `k`, para o pé ficar no chão (mesma conta de acoes.ts) */
export const desceQuadril = (a: number, k: number) => 0.29 * (Math.cos(a) - 1) + 0.27 * (Math.cos(a - k) - 1);

/** agacha: flexiona as duas pernas (coxa `a`, joelho `k`) com o quadril acompanhando */
export const agacha = (pose: Pose3D, a: number, k: number) => {
  pose["pernaE.x"] = -a; pose["pernaD.x"] = -a; pose["joelhoE.x"] = k; pose["joelhoD.x"] = k;
  pose["quadril.y"] = desceQuadril(a, k);
};
