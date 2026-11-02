"""Registro de provedores de voz. Para acrescentar um: crie o módulo com a classe e registre aqui.

  tts: elevenlabs · voicestudio · openai (qualquer servidor compatível com /v1/audio/speech: OpenAI, LocalAI,
       Kokoro-FastAPI, Ollama com gateway OpenAI…)
  stt: voicestudio · whisper-local (faster-whisper no venv local) · openai (/v1/audio/transcriptions) · elevenlabs
       (só para quem já vem com tempo da API: o narrar.py nem chama o STT nesse caso)
"""
import json
from pathlib import Path

from .base import STT, TTS, Fala  # noqa: F401

PADRAO = json.loads((Path(__file__).parent / "padrao.json").read_text())


def obter_tts(nome: str) -> TTS:
    if nome == "elevenlabs":
        from .elevenlabs import ElevenLabsTTS
        return ElevenLabsTTS()
    if nome == "voicestudio":
        from .voicestudio import VoiceStudioTTS
        return VoiceStudioTTS()
    if nome == "openai":
        from .openai_compat import OpenAITTS
        return OpenAITTS()
    raise SystemExit(f"provedor de TTS desconhecido: {nome} (existem: elevenlabs, voicestudio, openai)")


def obter_stt(nome: str, cfg: dict | None = None) -> STT:
    if nome == "voicestudio":
        from .voicestudio import VoiceStudioSTT
        return VoiceStudioSTT()
    if nome == "whisper-local":
        from .whisper_local import WhisperLocalSTT
        return WhisperLocalSTT()
    if nome == "openai":
        from .openai_compat import OpenAISTT
        return OpenAISTT(cfg or {})
    raise SystemExit(f"provedor de STT desconhecido: {nome} (existem: voicestudio, whisper-local, openai)")


def configuracao(voz: dict | None) -> dict:
    """Bloco "voz" do roteiro por cima do padrão do projeto (pipeline/voz/padrao.json)."""
    cfg = {**PADRAO, **(voz or {})}
    cfg.setdefault("tts", "voicestudio")
    cfg.setdefault("stt", "voicestudio")
    return cfg
