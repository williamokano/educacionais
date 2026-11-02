#!/usr/bin/env python3
"""Transcreve um áudio ou vídeo com tempo por palavra, pelo provedor de STT escolhido (padrão: VoiceStudio).

Uso: python3 pipeline/transcrever.py arquivo.mp4 -o transcricao.json [--stt voicestudio|whisper-local|openai] [--idioma pt]
Grava {"texto", "palavras": [{word, start, end}]} e imprime o texto. Usado na engenharia reversa de referências.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import voz  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("arquivo")
ap.add_argument("-o", required=True)
ap.add_argument("--stt", default=voz.PADRAO["stt"])
ap.add_argument("--idioma", default="pt")
a = ap.parse_args()
with tempfile.TemporaryDirectory() as tmp:
    wav = Path(tmp) / "audio.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.arquivo, "-ac", "1", "-ar", "16000", str(wav)], check=True)
    palavras = voz.obter_stt(a.stt).transcrever(wav, a.idioma)
texto = " ".join(w["word"] for w in palavras)
Path(a.o).write_text(json.dumps({"stt": a.stt, "texto": texto, "palavras": palavras}, ensure_ascii=False, indent=1))
print(texto)
