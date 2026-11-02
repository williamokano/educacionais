import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { clamp01 } from "./anima";
import { rnd } from "./qualidade";
import { V3 } from "./tipos";

// Partículas que explicam o que não se vê: fluxo de ar (e a temperatura dele) e calor.
// Todas são função do tempo `t` (s); nada guarda estado entre quadros.

const tmp = new THREE.Color();

/**
 * Fluxo: traços que saem de `de` na direção de `para` e seguem `alcance` m além.
 * Mudam de `cor` para `corDepois` ao passar por `para`, na proporção `troca` (0..1).
 */
export const Fluxo: React.FC<{
  t: number; de: V3; para: V3; alcance?: number; n?: number; largura?: number; altura?: number;
  cor?: string; corDepois?: string; troca?: number; vel?: number; espessura?: number;
  desce?: boolean; // true = o ar vai descendo de de[1] até para[1] (split no alto da parede soprando no sofá)
}> = ({ t, de, para, alcance = 2.2, n = 46, largura = 0.6, altura = 0.5, cor = "#f6c27c", corDepois = "#8fd6f7", troca = 1, vel = 1, espessura = 0.011, desce = false }) => {
  const dx = para[0] - de[0];
  const dz = para[2] - de[2];
  const dist = Math.hypot(dx, dz);
  const ux = dx / dist;
  const uz = dz / dist;
  const total = dist + alcance;
  const rotY = Math.atan2(-uz, ux);
  const { camera } = useThree();
  const v = new THREE.Vector3();
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const u = (t * (0.35 + rnd(i) * 0.25) * vel + rnd(i + 100)) % 1;
        const lado = (rnd(i + 300) - 0.5) * largura;
        const ao = 0.12 + u * total;
        const x = de[0] + ux * ao + uz * lado;
        const z = de[2] + uz * ao - ux * lado;
        const y = de[1] + (desce ? ((para[1] - de[1]) * Math.min(ao, dist)) / dist : 0) + (rnd(i + 200) - 0.5) * altura;
        // perto da câmera o traço vira uma placa: some antes
        const alfa = Math.min(1, u * 8, (1 - u) * 4) * clamp01((camera.position.distanceTo(v.set(x, y, z)) - 0.35) / 0.4);
        if (alfa <= 0.01) return null;
        const passou = clamp01((ao - dist + 0.1) / 0.35) * troca;
        tmp.set(cor).lerp(new THREE.Color(corDepois), passou);
        return (
          <mesh key={i} position={[x, y, z]} rotation={[0, rotY, desce ? Math.atan2(para[1] - de[1], dist) : 0]}>
            <boxGeometry args={[0.32 + rnd(i + 400) * 0.25, espessura, espessura]} />
            <meshBasicMaterial color={tmp.getStyle()} transparent opacity={alfa * 0.8} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Calor: hexágonos laranja boiando numa caixa (min/max). Com `puxa` (0..1), metade deles voa até `alvo` e some
 * (o calor entrando em algo frio). Os que chegam perto da câmera somem, para não virar borrão no close.
 */
export const Calor: React.FC<{ t: number; min: V3; max: V3; n?: number; puxa?: number; alvo?: V3; cor?: string; tamanho?: number }> = ({
  t, min, max, n = 34, puxa = 0, alvo = [0, 1, 0], cor = "#ff8a3d", tamanho = 1,
}) => {
  const { camera } = useThree();
  const v = new THREE.Vector3();
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const base: V3 = [0, 1, 2].map((k) => min[k] + rnd(i + k * 50) * (max[k] - min[k])) as V3;
        let pos: V3 = [base[0] + Math.sin(t * 0.6 + i) * 0.06, base[1] + Math.sin(t * 0.9 + i * 2) * 0.05, base[2]];
        let s = (0.028 + rnd(i + 90) * 0.025) * tamanho;
        if (i % 2 === 0 && puxa > 0) {
          const c = ((t * 0.62 + rnd(i + 5)) % 1) * puxa;
          const a: V3 = [alvo[0] + Math.cos(i) * 0.12, alvo[1], alvo[2] + Math.sin(i) * 0.12];
          const e = c * c;
          pos = pos.map((p, k) => p + (a[k] - p) * e) as V3;
          s *= 1 - e * 0.85;
        }
        s *= clamp01((camera.position.distanceTo(v.set(...pos)) - 0.5) / 0.5);
        if (s <= 0.001) return null;
        return (
          <mesh key={i} position={pos} rotation={[Math.PI / 2 + t * 0.7 + i, t * 0.5, i]} scale={s}>
            <cylinderGeometry args={[1, 1, 0.45, 6]} />
            <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={0.35} flatShading roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Calor indo de um lugar para outro: hexágonos que nascem espalhados em volta de `de` (raio `espalha`) e voam até
 * `para`, encolhendo ao chegar. `forca` (0..1) controla quantos estão no ar (0 = nenhum).
 * Para o calor saindo de algo (condensador → rua), troque `de` e `para`.
 */
export const CalorIndo: React.FC<{ t: number; de: V3; para: V3; espalha?: number; espalhaFim?: number; n?: number; forca?: number; vel?: number; cor?: string; tamanho?: number; semente?: number }> = ({
  t, de, para, espalha = 0.5, espalhaFim = 0.05, n = 18, forca = 1, vel = 0.55, cor = "#ff8a3d", tamanho = 1, semente = 0,
}) => {
  if (forca <= 0) return null;
  const vivos = Math.round(n * Math.min(forca, 1));
  return (
    <group>
      {Array.from({ length: vivos }).map((_, i) => {
        const s0 = i * 7.13 + semente * 31.7;
        const c = (t * vel + rnd(s0)) % 1;
        const e = c * c * (3 - 2 * c);
        const o: V3 = [rnd(s0 + 1) - 0.5, rnd(s0 + 2) - 0.5, rnd(s0 + 3) - 0.5];
        const pos: V3 = [0, 1, 2].map((k) => {
          const a = de[k] + o[k] * espalha * 2;
          const b = para[k] + o[k] * espalhaFim * 2;
          return a + (b - a) * e + Math.sin(t * 2 + i + k) * 0.015;
        }) as V3;
        const s = (0.026 + rnd(s0 + 4) * 0.02) * tamanho * Math.min(1, c * 6) * (1 - e * 0.7);
        return (
          <mesh key={i} position={pos} rotation={[Math.PI / 2 + t * 0.8 + i, t * 0.6, i]} scale={s}>
            <cylinderGeometry args={[1, 1, 0.45, 6]} />
            <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={0.35} flatShading roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Nuvem de gás/vapor saindo de um ponto e subindo (esferas brancas translúcidas que crescem e somem). */
export const Nuvem: React.FC<{ t: number; de: V3; rumo?: V3; n?: number; forca?: number; cor?: string; tamanho?: number }> = ({
  t, de, rumo = [0, 1, 0], n = 14, forca = 1, cor = "#f4f7fb", tamanho = 1,
}) => {
  if (forca <= 0) return null;
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const c = (t * 0.45 + rnd(i * 3.1)) % 1;
        const d = c * 1.1;
        const pos: V3 = [
          de[0] + rumo[0] * d + (rnd(i + 9) - 0.5) * 0.25 * c,
          de[1] + rumo[1] * d + (rnd(i + 11) - 0.5) * 0.1,
          de[2] + rumo[2] * d + (rnd(i + 13) - 0.5) * 0.25 * c,
        ];
        const s = (0.04 + c * 0.14) * tamanho;
        return (
          <mesh key={i} position={pos} scale={s}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={cor} transparent opacity={(1 - c) * 0.7 * forca} roughness={0.9} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};
