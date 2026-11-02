#!/usr/bin/env python3
"""episode.json (tempos reais) -> roteiro de som do mixar.py (skill efeitos-sonoros).

Uso (a partir de motor/):
  python3 pipeline/som.py public/<slug>/epNN/episode.json -o ../series/<slug>/episodios/epNN/roteiro-som.json

Lê de cada batida (campo "cena" do roteiro.json):
  "ambiencia": "noite"        som em loop (nome da biblioteca ou arquivo, ex.: "series/<slug>/sons/chuva.mp3") do início da batida até a próxima batida que mudar de ambiência
                               ("nenhuma" corta); volume padrão 0.3
  "sfx": ["whoosh", {"som": "impacto", "trecho": 1, "em": 0.2, "volume": 0.9}]
        texto = no início da batida; "trecho" k = no início do trecho k da fala; "em" = segundos a mais
O cartão final não ganha som sozinho: ponha um sfx na última batida, se quiser.
"""
import argparse
import json
from pathlib import Path

AMBIENCIA_VOL = 0.3
REPO = Path(__file__).resolve().parents[2]


def fonte(nome):
    """Nome da biblioteca (sfx.py) ou arquivo próprio; arquivo com caminho relativo é relativo à raiz do repositório."""
    if "/" in nome or nome.endswith((".mp3", ".wav", ".ogg", ".flac")):
        caminho = Path(nome) if Path(nome).is_absolute() else REPO / nome
        if not caminho.is_file():
            raise SystemExit(f"som próprio não encontrado: {caminho}")
        return str(caminho)
    return nome


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episode")
    ap.add_argument("-o", required=True)
    ap.add_argument("--ducking", type=float, default=0.8)
    a = ap.parse_args()

    src = Path(a.episode).resolve()
    ep = json.loads(src.read_text())
    duracao = ep["durationInFrames"] / ep["fps"]
    sons, amb = [], None  # amb = (nome, início, volume)

    def fecha_ambiencia(fim):
        if amb and amb[0] != "nenhuma":
            sons.append({"som": fonte(amb[0]), "inicio": round(amb[1], 3), "fim": round(fim, 3), "volume": amb[2]})

    for b in ep["beats"]:
        cena = b["scene"]
        if "ambiencia" in cena:
            nome = cena["ambiencia"]
            nome, vol = (nome, AMBIENCIA_VOL) if isinstance(nome, str) else (nome["som"], nome.get("volume", AMBIENCIA_VOL))
            if not amb or amb[0] != nome:
                fecha_ambiencia(b["start"])
                amb = (nome, b["start"], vol)
        for s in cena.get("sfx", []):
            s = {"som": s} if isinstance(s, str) else dict(s)
            base = b["segmentStarts"][s.pop("trecho")] if "trecho" in s else b["start"]
            item = {"som": fonte(s.pop("som")), "em": round(max(base + s.pop("em", 0.0) - 0.05, 0), 3)}  # 0,05 s adiantado soa natural
            item.update(s)
            sons.append(item)
    fecha_ambiencia(duracao)

    cfg = {"duracao": round(duracao, 3), "ducking": {"quanto": a.ducking, "ataque": 0.03, "soltura": 0.4}, "sons": sons}
    if ep.get("audio"):
        cfg["voz"] = str((src.parent.parent.parent / ep["audio"]).resolve())
    Path(a.o).parent.mkdir(parents=True, exist_ok=True)
    Path(a.o).write_text(json.dumps(cfg, ensure_ascii=False, indent=1))
    efeitos = [s for s in sons if "em" in s]
    print(f"{len(efeitos)} efeitos ({len(efeitos) / duracao * 60:.1f}/min; meta 3–4/min) · "
          f"{len(sons) - len(efeitos)} ambiências -> {a.o}")


if __name__ == "__main__":
    main()
