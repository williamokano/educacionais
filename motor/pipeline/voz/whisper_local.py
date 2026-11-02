"""faster-whisper local, num processo persistente (pipeline/stt_worker.py, venv em
~/.local/share/webseries-engines/stt/.venv). Roda na CPU; não depende do VoiceStudio."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class WhisperLocalSTT:
    nome = "whisper-local"

    def transcrever(self, audio, idioma="pt"):
        from voice import stt_local  # reaproveita o worker do voice.py (carrega o modelo uma vez)
        return stt_local(Path(audio), idioma)
