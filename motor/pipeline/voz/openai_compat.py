"""Qualquer servidor compatível com a API de áudio da OpenAI: OpenAI, LocalAI, Kokoro-FastAPI, Speaches,
gateways na frente do Ollama etc.

TTS (POST {base}/v1/audio/speech): cfg base (padrão http://127.0.0.1:8880), modelo, voz, velocidade,
     chave_env (nome da variável com a chave, opcional).
STT (POST {base}/v1/audio/transcriptions, verbose_json + word): cfg stt_base, stt_modelo, chave_env.
"""
import json
import os
import subprocess
from pathlib import Path

from .base import Fala


def _auth(cfg):
    env = cfg.get("chave_env")
    return ["-H", f"Authorization: Bearer {os.environ[env]}"] if env and os.environ.get(env) else []


class OpenAITTS:
    nome = "openai"
    texto_inteiro = False
    tem_seed = False

    def chave(self, cfg):
        return [self.nome, cfg.get("base"), cfg.get("modelo"), cfg.get("voz"), cfg.get("velocidade", 1.0)]

    def gerar(self, texto, destino, cfg, seed=0):
        base = cfg.get("base", "http://127.0.0.1:8880")
        corpo = {"model": cfg.get("modelo", "tts-1"), "input": texto, "voice": cfg.get("voz", "alloy"),
                 "speed": cfg.get("velocidade", 1.0), "response_format": "wav"}
        destino = Path(destino)
        r = subprocess.run(["curl", "-sS", "--fail-with-body", f"{base}/v1/audio/speech", "-H", "Content-Type: application/json",
                            *_auth(cfg), "-d", json.dumps(corpo), "-o", str(destino)], capture_output=True)
        if r.returncode:
            raise RuntimeError(f"TTS {base} falhou: {r.stderr.decode()}")
        return Fala(destino)


class OpenAISTT:
    nome = "openai"

    def __init__(self, cfg):
        self.cfg = cfg

    def transcrever(self, audio, idioma="pt"):
        base = self.cfg.get("stt_base", "https://api.openai.com")
        r = subprocess.run(["curl", "-sS", "--fail-with-body", f"{base}/v1/audio/transcriptions", *_auth(self.cfg),
                            "-F", f"file=@{audio}", "-F", f"model={self.cfg.get('stt_modelo', 'whisper-1')}",
                            "-F", f"language={idioma}", "-F", "response_format=verbose_json",
                            "-F", "timestamp_granularities[]=word"], capture_output=True)
        if r.returncode:
            raise RuntimeError(f"STT {base} falhou: {r.stderr.decode()} {r.stdout[:300]!r}")
        d = json.loads(r.stdout)
        return [{"word": w["word"].strip(), "start": w["start"], "end": w["end"]} for w in d.get("words", []) if w["word"].strip()]
