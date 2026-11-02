# Estilo 3D: o que muda no `roteiro.json`

O estilo 3D usa o mesmo roteiro v2 (`docs/roteiro-v2.md`): batidas, trechos, voz, legenda, cartões, `sfx` e
`ambiencia` funcionam igual. O que muda é o cenário e os personagens. Eles são desenhados em Three.js
(`@remotion/three`) em vez de SVG.

Uma batida é 3D quando o `cenario` dela está em `cenarios3d` do pacote, ou é o genérico `estudio-3d`.
Dá para misturar batidas 2D e 3D no mesmo episódio. Exemplo completo e testado:
`motor/exemplos/explicador-3d/roteiro.json` (pacote `demo-3d`, em `banco/benchmark/demo3d/`).
O pacote `demo-3d` é só a demonstração (sala do balde de gelo + Zeca Parafuso). Os cenários, cartões e personagens de uma
série de verdade ficam no pacote do projeto, em `motor/banco/series/<slug>/`, registrado no `banco/index.ts` do projeto
(que o `motion-videos-motor` nunca sobrescreve). Os arquivos de `banco/benchmark/demo3d/` servem de molde: o `index.tsx`
mostra como registrar `cenarios3d`, `personagens3d` e `cartoes`, e o `sala.tsx`, como é um cenário completo (câmeras com
nome, campos animados, partículas). Imports do núcleo, a partir de `banco/series/<slug>/`: `../../../src/v3d/...`.

## Cenário 3D novo

`Cenario3D` (`src/v3d/tipos.ts`): `Cena` (componente com `cena`, `progresso`, `t`, `tEpisodio`, `trechos`,
`qualidade`), `cameras` (pontos com nome), `padrao`, `fundo` (cor, ou função da cena e do progresso: um céu que
muda com a cena) e `luzPropria`. Use `Mat`, `Caixa` e `useSeg` de
`qualidade.tsx` para o objeto obedecer à qualidade. Tudo é função do tempo: sem `Math.random`, sem `Date.now`, sem
`useFrame`. Use `rnd(semente)` para variar e `tEpisodio` para movimento contínuo entre batidas (pás, partículas).

## Render

O 3D usa WebGL. Com placa de vídeo, o render usa a GPU (`remotion.config.ts`: `angle` por padrão). Sem GPU
(nuvem, CI), use `--gl=swangle` (software, mais lento):

```bash
npx remotion render src/index.ts episodio out/ep.mp4 --props='{"episode":"demo-3d/ep01"}'               # GPU
npx remotion render src/index.ts episodio out/ep.mp4 --props='{"episode":"demo-3d/ep01"}' --gl=swangle  # CPU
MOTOR_GL=vulkan npx remotion render …   # Linux com NVIDIA, se o angle não pegar a GPU
```

Medido com o exemplo `explicador-3d` (715 quadros, qualidade `suave`, sala com personagem):

| Máquina | `--gl` | Tempo |
|---|---|---|
| RTX 5090, Linux, 16 núcleos | `angle` (padrão) | 9 s (~80 quadros/s) |
| RTX 5090, Linux, 16 núcleos | `vulkan` | 11 s |
| RTX 5090, Linux, 16 núcleos | `swangle` (sem GPU) | ~6 min (60 quadros em 33 s) |
| nuvem, 4 núcleos, sem GPU | `swangle` | 23 min |

`angle-egl` não abre o contexto WebGL nessa máquina. Os três que funcionam geram o mesmo quadro.

Cada batida 3D é um contexto WebGL. A folha de cenas abre todos de uma vez, e o Chrome segura uns 16. Num episódio
com mais batidas 3D que isso, renderize o vídeo (na GPU leva menos de um minuto) e tire o quadro do meio de cada
batida com o `ffmpeg`.
