#!/usr/bin/env bash
# Mostra como um Reel aparece num iPhone (tela alta): corta ~68 px de cada lado do vídeo 1080×1920, marca em
# vermelho a faixa dos botões do Reels (x 914–970), em verde a coluna segura de texto (x 162–918) e em branco o
# centro da tela. Texto fora do verde some na borda ou fica sob os botões.
#
# Uso (a partir de motor/):
#   bash tools/simular-iphone.sh <video.mp4 | quadro.png> <saida.png> [segundos_entre_quadros=4]
set -euo pipefail
entrada="${1:?uso: simular-iphone.sh <video|png> <saida.png> [segundos]}"
saida="${2:?uso: simular-iphone.sh <video|png> <saida.png> [segundos]}"
passo="${3:-4}"
# coordenadas já no vídeo cortado (x - 68): botões 846–902, coluna segura 94–850, centro 472
guias="drawbox=x=846:y=0:w=56:h=1920:color=red@0.28:t=fill,drawbox=x=94:y=0:w=756:h=1920:color=lime@0.9:t=3,drawbox=x=471:y=0:w=2:h=1920:color=white@0.5:t=fill"
if [[ "$entrada" == *.png ]]; then
  ffmpeg -loglevel error -y -i "$entrada" -vf "crop=944:1920:68:0,${guias},scale=472:-1" -frames:v 1 "$saida"
else
  ffmpeg -loglevel error -y -i "$entrada" -vf "fps=1/${passo},crop=944:1920:68:0,${guias},scale=236:-1,tile=8x3" -frames:v 1 "$saida"
fi
echo "simulação do iPhone -> $saida"
