"""STT local (faster-whisper) como processo persistente: lê um pedido JSON por linha, responde um JSON por linha.

Usado por voice.py quando o VoiceStudio não está aberto. Roda no ambiente
~/.local/share/webseries-engines/stt/.venv, na CPU (a GPU costuma estar ocupada pelo motor de voz).

Pedido:   {"path": "/caminho/fala.wav", "language": "pt"}
Resposta: {"words": [{"word": "Eu", "start": 0.0, "end": 0.21}, ...]}  ou  {"error": "..."}
"""
import json
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

MODEL = "deepdml/faster-whisper-large-v3-turbo-ct2"


def carregar_audio(path):
    # o decodificador embutido do faster-whisper quebra com a versão instalada do PyAV; decodifica via ffmpeg
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def main():
    modelo = WhisperModel(MODEL, device="cpu", compute_type="int8")
    print(json.dumps({"pronto": True}), flush=True)
    for linha in sys.stdin:
        try:
            pedido = json.loads(linha)
            segmentos, _ = modelo.transcribe(carregar_audio(pedido["path"]), language=pedido["language"],
                                             word_timestamps=True)
            palavras = [{"word": w.word.strip(), "start": w.start, "end": w.end}
                        for s in segmentos for w in (s.words or [])]
            print(json.dumps({"words": palavras}, ensure_ascii=False), flush=True)
        except Exception as e:  # noqa: BLE001 — devolve o erro ao pipeline em vez de derrubar o processo
            print(json.dumps({"error": f"{type(e).__name__}: {e}"}), flush=True)


if __name__ == "__main__":
    main()
