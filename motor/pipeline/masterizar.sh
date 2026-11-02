#!/usr/bin/env bash
# Loudness final em 2 passes: compressor + limitador antes (a mixagem sai a ~-24 LUFS e o loudnorm sozinho não chega a -14 sem estourar -2 dBTP).
# Uso: masterizar.sh entrada.mp4 saida.mp4     -> -14 LUFS, -2 dBTP, AAC 192k, 48 kHz (vídeo copiado)
set -euo pipefail
in="$1"; out="$2"; tmp="$(mktemp --suffix=.mov)"; trap 'rm -f "$tmp"' EXIT
PRE="acompressor=threshold=0.04:ratio=4:attack=5:release=120:makeup=6,alimiter=limit=0.708:level=disabled"
ffmpeg -loglevel error -y -i "$in" -af "$PRE" -c:v copy -c:a pcm_s16le -ar 48000 "$tmp"
J=$(ffmpeg -hide_banner -i "$tmp" -af loudnorm=I=-14:TP=-2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -loglevel error -y -i "$tmp" -af "loudnorm=I=-14:TP=-2:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,alimiter=limit=0.708:level=disabled" -ar 48000 -c:v copy -c:a aac -b:a 192k -movflags +faststart "$out"
ffmpeg -hide_banner -i "$out" -af loudnorm=I=-14:TP=-2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p' | grep -E "input_i|input_tp"
