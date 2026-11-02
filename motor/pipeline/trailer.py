#!/usr/bin/env python3
"""Trailer para story (9:16, 10–15 s): cortes do episódio final + cartão de chamada. Sem render novo, sem voz nova.

Uso (a partir de motor/):
  python3 pipeline/trailer.py public/<slug>/<pasta>/episode.json --video FINAL.mp4 --batidas 3,6,12.1 \
      --cartao cartao.png -o trailer.mp4 [--max 3.5] [--cartao-dur 2.8] [--som impacto_seco]

--batidas: batidas do episódio (contadas a partir de 1, como na folha de cenas), na ordem do trailer. "12.1" começa
no trecho 1 da batida 12. Cada corte vai do início da batida (ou do trecho) até o início da seguinte, no máximo --max s.
O áudio é o do episódio final (voz + som já mixados); o cartão (PNG 1080×1920, ex.: composição "capa") fecha com
um efeito da biblioteca. A saída passa pelo masterizar.sh (−14 LUFS, −2 dBTP).
Escolha dos cortes (skill publicar): só a premissa e a escalada; nunca a última virada, a resposta ou o gancho final.
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SFX = ROOT / "pipeline"  # sfx.py e masterizar.sh moram no próprio pipeline do motor
FADE = 0.06  # sem estalo nos cortes de áudio


def cortes(ep, pedidos, maximo):
    beats, out = ep["beats"], []
    for p in pedidos:
        b, _, t = p.partition(".")
        i = int(b) - 1
        ini = beats[i]["segmentStarts"][int(t)] if t else beats[i]["start"]
        fim = beats[i + 1]["start"] if i + 1 < len(beats) else ep["endcardStart"]
        out.append((ini, min(fim, ini + maximo)))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episode")
    ap.add_argument("--video", required=True)
    ap.add_argument("--batidas", required=True)
    ap.add_argument("--cartao", required=True)
    ap.add_argument("-o", required=True)
    ap.add_argument("--max", type=float, default=3.5)
    ap.add_argument("--cartao-dur", type=float, default=2.8)
    ap.add_argument("--som", default="impacto_seco")
    a = ap.parse_args()

    ep = json.loads(Path(a.episode).read_text())
    cs = cortes(ep, a.batidas.split(","), a.max)
    with tempfile.TemporaryDirectory() as tmp:
        som = Path(tmp) / "som.wav"
        subprocess.run(["python3", str(SFX / "sfx.py"), "gerar", a.som, "-o", str(som)], check=True, capture_output=True)
        filtros, pares = [], []
        for k, (ini, fim) in enumerate(cs):
            d = fim - ini
            filtros.append(f"[0:v]trim=start={ini:.3f}:end={fim:.3f},setpts=PTS-STARTPTS,fps=30,format=yuv420p[v{k}]")
            filtros.append(f"[0:a]atrim=start={ini:.3f}:end={fim:.3f},asetpts=PTS-STARTPTS,aresample=48000,"
                           f"afade=t=in:d={FADE},afade=t=out:st={d - FADE:.3f}:d={FADE}[a{k}]")
            pares.append(f"[v{k}][a{k}]")
        cd = a.cartao_dur
        filtros.append(f"[1:v]scale=1080:1920,fps=30,format=yuv420p,trim=duration={cd},fade=t=in:d=0.25[vc]")
        filtros.append(f"[2:a]aresample=48000,aformat=channel_layouts=mono|stereo,apad=whole_dur={cd},atrim=duration={cd}[ac]")
        pares.append("[vc][ac]")
        filtros.append(f"{''.join(pares)}concat=n={len(pares)}:v=1:a=1[v][a]")
        bruto = Path(tmp) / "trailer.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-loop", "1", "-t", str(cd), "-i", a.cartao, "-i", str(som),
                        "-filter_complex", ";".join(filtros), "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                        "-r", "30", "-c:a", "aac", "-ar", "48000", str(bruto)], check=True)
        subprocess.run(["bash", str(SFX / "masterizar.sh"), str(bruto), a.o], check=True)
    total = sum(f - i for i, f in cs) + cd
    print(f"{len(cs)} cortes + cartão: {total:.1f} s -> {a.o}")
    for p, (i, f) in zip(a.batidas.split(","), cs):
        print(f"  batida {p:<5} {i:6.2f}–{f:6.2f} s")


if __name__ == "__main__":
    main()
