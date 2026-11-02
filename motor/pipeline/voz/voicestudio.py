"""VoiceStudio local (http://127.0.0.1:3900): TTS por clone (perfil salvo no VoiceStudio ou referência local) e STT.

Chaves de cfg (TTS): perfil (profile_id), motor (engine, sempre explícito), idioma, velocidade, seed;
opcional: referencias (pasta com <perfil>.wav + <perfil>.txt: referência limpa enviada no lugar do perfil),
api (outra URL). Pede áudio cru (effect_preset=raw): o tratamento é a masterização do narrar.py.
"""
import json
import os
import subprocess
import urllib.request
from pathlib import Path

from .base import Fala

API = os.environ.get("VOICESTUDIO_URL", "http://127.0.0.1:3900")
ROOT = Path(__file__).resolve().parents[2]


def _curl(args):
    r = subprocess.run(["curl", "-sS", "-g", "--fail-with-body", *args], capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"VoiceStudio falhou: {r.stderr.decode()} {r.stdout[:400]!r}")
    return r.stdout


def aberto(api=API):
    try:
        with urllib.request.urlopen(f"{api}/health", timeout=3):
            return True
    except OSError:
        return False


def _exige(api):
    if not aberto(api):
        raise SystemExit(f"VoiceStudio fechado em {api}: abra o app (ou troque o provedor em voz.tts / voz.stt).")


class VoiceStudioTTS:
    nome = "voicestudio"
    texto_inteiro = False  # clone local soa melhor em pedidos curtos: uma batida por pedido
    tem_seed = True

    def _versao_perfil(self, api, perfil):
        perfis = json.loads(_curl([f"{api}/profiles"]))
        return next((p.get("audio_url", "") for p in perfis if p["id"] == perfil), "")

    def chave(self, cfg):
        api = cfg.get("api", API)
        ref = cfg.get("referencias")
        if ref:
            base = ROOT / ref / cfg["perfil"]
            versao = base.with_suffix(".wav").stat().st_mtime_ns
        else:
            _exige(api)
            versao = self._versao_perfil(api, cfg["perfil"])  # regravar a voz invalida o cache
        return [self.nome, cfg["motor"], cfg["perfil"], versao, cfg.get("idioma", "pt"), cfg.get("velocidade", 1.0)]

    def gerar(self, texto, destino, cfg, seed=0):
        api = cfg.get("api", API)
        _exige(api)
        # inicial maiúscula: trecho começando minúsculo fazia o modelo ler o ponto da referência ("Ponto. E…")
        texto = texto[:1].upper() + texto[1:]
        if cfg.get("referencias"):
            base = ROOT / cfg["referencias"] / cfg["perfil"]
            voz = ["-F", f"ref_audio=@{base}.wav", "-F", f"ref_text={base.with_suffix('.txt').read_text().strip()}"]
        else:
            voz = ["-F", f"profile_id={cfg['perfil']}"]
        destino = Path(destino)
        destino.write_bytes(_curl([
            f"{api}/generate", "-F", f"text={texto}", "-F", f"language={cfg.get('idioma', 'pt')}",
            "-F", f"engine={cfg['motor']}", *voz, "-F", f"speed={cfg.get('velocidade', 1.0)}", "-F", f"seed={seed}",
            "-F", "effect_preset=raw",
        ]))
        return Fala(destino)


class VoiceStudioSTT:
    nome = "voicestudio"

    def transcrever(self, audio, idioma="pt", api=API):
        _exige(api)
        d = json.loads(_curl([f"{api}/v1/audio/transcriptions", "-F", f"file=@{audio}", "-F", f"language={idioma}",
                              "-F", "response_format=verbose_json", "-F", "timestamp_granularities=word"]))
        return [{"word": w["word"].strip(), "start": w["start"], "end": w["end"]} for w in d.get("words", []) if w["word"].strip()]
