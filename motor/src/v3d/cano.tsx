import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01 } from "./anima";
import { Mat, useSeg } from "./qualidade";
import { V3 } from "./tipos";

// Cano por um caminho (cobre translúcido) e bolinhas que correm dentro dele, mudando de cor ao longo do trecho:
// é como o vídeo mostra o estado do fluido (líquido frio, gás frio, gás quente, líquido quente).
// Tudo é função do tempo `t`; nada guarda estado entre quadros.

/** Caminho reto com cantos arredondados (raio `r`), percorrido por comprimento de arco. */
export const caminhoReto = (pts: V3[], r = 0.08): THREE.Curve<THREE.Vector3> => {
  const v = pts.map((p) => new THREE.Vector3(...p));
  const path = new THREE.CurvePath<THREE.Vector3>();
  let atual = v[0].clone();
  for (let i = 1; i < v.length; i++) {
    const canto = v[i];
    if (i === v.length - 1) {
      path.add(new THREE.LineCurve3(atual, canto.clone()));
      break;
    }
    const prox = v[i + 1];
    const a = canto.clone().sub(atual);
    const b = prox.clone().sub(canto);
    const ra = Math.min(r, a.length() / 2, b.length() / 2);
    const p1 = canto.clone().sub(a.normalize().multiplyScalar(ra));
    const p2 = canto.clone().add(b.normalize().multiplyScalar(ra));
    if (p1.distanceTo(atual) > 1e-4) path.add(new THREE.LineCurve3(atual, p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, canto.clone(), p2));
    atual = p2;
  }
  return path;
};

/** Caminho liso por pontos (serpentinas, curvas). */
export const caminhoSuave = (pts: V3[]): THREE.Curve<THREE.Vector3> =>
  new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal");

/** Serpentina em hélice ao longo de x: de `x0` a `x1`, raio `r`, `voltas` voltas, centro (y, z). */
export const helice = (x0: number, x1: number, y: number, z: number, r: number, voltas: number, fase = 0): V3[] => {
  const n = Math.max(12, Math.round(voltas * 24));
  return Array.from({ length: n + 1 }, (_, i) => {
    const k = i / n;
    const a = fase + k * voltas * Math.PI * 2;
    return [x0 + (x1 - x0) * k, y + Math.sin(a) * r, z + Math.cos(a) * r] as V3;
  });
};

/** Serpentina em zigue-zague num plano vertical (condensador): fileiras de `xa` a `xb`, de `y0` descendo até `y1`. */
export const zigue = (xa: number, xb: number, y0: number, y1: number, z: number, fileiras: number): V3[] => {
  const pts: V3[] = [];
  for (let i = 0; i < fileiras; i++) {
    const y = y0 + ((y1 - y0) * i) / Math.max(fileiras - 1, 1);
    const [a, b] = i % 2 === 0 ? [xa, xb] : [xb, xa];
    pts.push([a, y, z], [b, y, z]);
  }
  return pts;
};

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

/** cor na posição u (0..1) a partir de paradas [u, cor] */
export const corEm = (paradas: [number, string][], u: number) => {
  if (paradas.length === 1) return tmpA.set(paradas[0][1]).getStyle();
  let i = 0;
  while (i + 1 < paradas.length && paradas[i + 1][0] <= u) i++;
  if (i + 1 >= paradas.length) return tmpA.set(paradas[i][1]).getStyle();
  const [u0, c0] = paradas[i];
  const [u1, c1] = paradas[i + 1];
  const k = clamp01((u - u0) / Math.max(u1 - u0, 1e-6));
  return tmpA.set(c0).lerp(tmpB.set(c1), k * k * (3 - 2 * k)).getStyle();
};

export type Trecho = {
  curva: THREE.Curve<THREE.Vector3>;
  cores: [number, string][]; // estado do fluido ao longo do trecho (0 = entrada, 1 = saída)
  raio?: number; // raio do cano (m)
  bola?: number; // raio das bolinhas (padrão: 62% do cano); maior que o cano = contas correndo por um fio (capilar)
  densidade?: number; // bolinhas por metro
  vel?: number; // m/s (multiplicado pela velocidade do motor)
  cano?: string; // cor do cano
  opaco?: boolean; // cano sem transparência (sem bolinhas visíveis)
};

/** Um trecho: o cano e as bolinhas. `vel` > 0 anda da entrada para a saída; < 0 ao contrário. */
export const CanoComFluxo: React.FC<{ trecho: Trecho; t: number; ritmo?: number; deslocamento?: number }> = ({ trecho, t, ritmo = 1, deslocamento = 0 }) => {
  const seg = useSeg();
  const raio = trecho.raio ?? 0.032;
  const comprimento = useMemo(() => trecho.curva.getLength(), [trecho.curva]);
  const tubo = useMemo(
    () => new THREE.TubeGeometry(trecho.curva, Math.max(16, Math.round(comprimento * 40)), raio, seg(6, 14), false),
    [trecho.curva, raio, comprimento, seg(6, 14)],
  );
  const bola = useMemo(() => new THREE.SphereGeometry(trecho.bola ?? raio * 0.62, seg(6, 14), seg(5, 10)), [raio, trecho.bola, seg(6, 14)]);
  const n = Math.max(3, Math.round(comprimento * (trecho.densidade ?? 26)));
  // deslocamento = distância (m) que o fluido já andou: as bolinhas não "pulam" quando a velocidade muda
  const andou = deslocamento !== 0 ? deslocamento : t * (trecho.vel ?? 0.35) * ritmo;
  const p = new THREE.Vector3();
  return (
    <group>
      <mesh geometry={tubo} castShadow={trecho.opaco} renderOrder={2}>
        {trecho.opaco ? (
          <Mat cor={trecho.cano ?? "#c8743c"} rug={0.35} met={0.7} />
        ) : (
          <meshPhysicalMaterial color={trecho.cano ?? "#e08a4f"} transparent opacity={0.26} roughness={0.2} metalness={0.1} clearcoat={0.6} depthWrite={false} />
        )}
      </mesh>
      {!trecho.opaco &&
        Array.from({ length: n }).map((_, i) => {
          const u = (((i / n + andou / comprimento) % 1) + 1) % 1;
          trecho.curva.getPointAt(u, p);
          return (
            <mesh key={i} geometry={bola} position={[p.x, p.y, p.z]}>
              <meshStandardMaterial color={corEm(trecho.cores, u)} roughness={0.35} emissive={corEm(trecho.cores, u)} emissiveIntensity={0.3} />
            </mesh>
          );
        })}
    </group>
  );
};

/** Estados do fluido (as mesmas cores no vídeo inteiro). */
export const FLUIDO = {
  liquidoFrio: "#3f8ff0",
  gasFrio: "#eef3f8",
  gasQuente: "#ff4436",
  liquidoQuente: "#ff9a3c",
} as const;
