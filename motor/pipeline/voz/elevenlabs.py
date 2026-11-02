"""ElevenLabs pela API (ELEVEN_API_KEY): TTS com o tempo de cada caractere, num pedido só (mantém a entonação).

Chaves de cfg: id (voice_id), modelo, velocidade, estabilidade, similaridade, estilo, idioma.
velocidade (0,7–1,2): nos modelos v3/v4 a API ignora; o áudio é acelerado depois com o ffmpeg (atempo, mesmo tom).
Usa o cliente pipeline/elevenlabs.py (cache por texto + voz + ajustes, corte em pedidos de 4.500 caracteres).
"""
import subprocess
import sys
from pathlib import Path

from .base import Fala

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import elevenlabs as cliente  # noqa: E402


class ElevenLabsTTS:
    nome = "elevenlabs"
    texto_inteiro = True
    tem_seed = False

    def aceita_tags(self, cfg):
        """Os modelos v3/v4 leem tags de áudio ([whispers], [sighs]) sem falar a tag."""
        return cfg.get("modelo", "").startswith(("eleven_v3", "eleven_v4"))

    def chave(self, cfg):
        k = [self.nome, cfg["id"], cfg.get("modelo"), cfg.get("velocidade"), cfg.get("estabilidade"),
             cfg.get("similaridade"), cfg.get("estilo"), cfg.get("idioma")]
        # v3/v4 com velocidade ≠ 1: o áudio é acelerado depois (resultado diferente do cache antigo, que saía em 1,0)
        if str(cfg.get("modelo", "")).startswith(("eleven_v3", "eleven_v4")) and abs(float(cfg.get("velocidade", 1.0)) - 1.0) > 1e-3:
            k.append("atempo")
        return k

    def gerar(self, texto, destino, cfg, seed=0):
        destino = Path(destino).with_suffix(".mp3")
        modelo = cfg.get("modelo", "eleven_multilingual_v2")
        velocidade = float(cfg.get("velocidade", 1.0))
        # os modelos v3/v4 ignoram a velocidade da API (medido em 30/10/2026: 9,7 s em 1,0 e 9,8 s em 1,2);
        # neles a voz é gerada em 1,0 e acelerada depois, sem mudar o tom, com os tempos das palavras na mesma escala
        depois = velocidade if modelo.startswith(("eleven_v3", "eleven_v4")) and abs(velocidade - 1.0) > 1e-3 else 1.0
        bruto = destino.with_name(destino.stem + ".bruto.mp3") if depois != 1.0 else destino
        meta = cliente.gerar(texto, bruto, cfg["id"], modelo, 1.0 if depois != 1.0 else velocidade,
                             cfg.get("estabilidade", 0.5), cfg.get("similaridade", 0.75), cfg.get("estilo", 0.0), cfg.get("idioma", "pt"))
        if depois != 1.0:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(bruto), "-filter:a", f"atempo={depois:.4f}", "-c:a", "libmp3lame",
                            "-q:a", "2", str(destino)], check=True)
        palavras = [{"word": w["palavra"], "start": w["inicio"] / depois, "end": w["fim"] / depois} for w in meta["palavras"]]
        return Fala(destino, palavras, meta.get("custo"))
