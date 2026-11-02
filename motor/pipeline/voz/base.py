"""Interfaces de voz. Todo provedor de fala (TTS) e de transcrição (STT) segue um destes contratos,
para o narrar.py trocar de provedor só pela configuração (roteiro.json → "voz", ou pipeline/voz/padrao.json).

TTS: gerar(texto, destino, cfg) -> Fala
     Grava o áudio em `destino` (o formato que o provedor devolver; o narrar.py converte) e devolve as palavras
     com tempo, se o provedor souber (ElevenLabs sabe; os outros devolvem None e o tempo sai do STT).
     `cfg` é o bloco "voz" do roteiro: cada provedor lê as chaves dele e ignora as outras.
     `chave(cfg)` diz o que muda o resultado (para o cache).
     `aceita_tags(cfg)` (opcional, padrão False): o provedor lê tags de áudio ([whispers]); sem ele, o narrar.py tira as tags.
STT: transcrever(audio, idioma) -> [{"word", "start", "end"}]
"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Protocol


@dataclass
class Fala:
    audio: Path
    palavras: Optional[list] = None   # [{"word", "start", "end"}] ou None (o tempo sai do STT)
    custo: Optional[int] = None       # créditos cobrados, quando o provedor informa
    extra: dict = field(default_factory=dict)


class TTS(Protocol):
    nome: str
    texto_inteiro: bool  # True: gera o episódio num pedido só (mantém a entonação); False: uma batida por pedido
    tem_seed: bool       # aceita seed (o narrar.py tenta outra seed quando o STT não confere)

    def gerar(self, texto: str, destino: Path, cfg: dict, seed: int = 0) -> Fala: ...

    def chave(self, cfg: dict) -> list: ...


class STT(Protocol):
    nome: str

    def transcrever(self, audio: Path, idioma: str) -> list: ...
