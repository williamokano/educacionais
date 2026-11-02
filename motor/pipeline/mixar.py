#!/usr/bin/env python3
"""Mixa voz + ambiências + efeitos a partir de um roteiro JSON.

A voz fica sempre na frente: enquanto ela fala, as ambiências e os efeitos
marcados com "abaixa" (padrão: sim) são reduzidos automaticamente (ducking).

Uso:
  python3 mixar.py roteiro.json -o saida.mp3
  python3 mixar.py roteiro.json -o saida.mp4 --video video_base.mp4
  python3 mixar.py roteiro.json -o saida.wav --sem-voz-na-saida   (só efeitos)

Formato do roteiro.json:
{
  "duracao": 30,                       # segundos (opcional se houver voz ou vídeo)
  "voz": "narracao.mp3",               # opcional
  "ducking": {"quanto": 0.7, "ataque": 0.05, "soltura": 0.5},   # opcional
  "sons_proprios": {"minha_porta": "/caminho/porta.wav"},       # opcional
  "sons": [
    {"som": "cidade", "inicio": 0, "fim": 30, "volume": 0.35},  # ambiência em loop
    {"som": "whoosh", "em": 4.2, "volume": 0.8},                # efeito único
    {"som": "minha_porta", "em": 11.0, "volume": 0.9, "abaixa": false}
  ]
}
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfx  # noqa: E402

SR = sfx.SR


def ler_audio(caminho):
    """Lê qualquer áudio ou vídeo com ffmpeg e devolve mono float64 em SR."""
    cmd = ["ffmpeg", "-v", "error", "-i", caminho, "-vn", "-ac", "1",
           "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def duracao_video(caminho):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", caminho],
        capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def carregar_fonte(nome, sons_proprios, cache):
    if nome in cache:
        return cache[nome]
    if nome in sons_proprios:
        x = ler_audio(sons_proprios[nome])
    elif os.path.isfile(nome):
        x = ler_audio(nome)
    else:
        x = sfx.gerar(nome)  # levanta erro se não existir
    cache[nome] = x
    return x


def repetir_ate(x, n, fade=0.5, cruzar=1.5):
    """Repete x até cobrir n amostras. Cada cópia entra sobre o fim da anterior com crossfade de potência
    constante (`cruzar` s), para uma gravação real virar loop sem emenda audível; fade in e out nas pontas."""
    if len(x) == 0:
        return np.zeros(n)
    c = min(int(cruzar * SR), len(x) // 3)
    passo = len(x) - c
    y = np.zeros(n + len(x))
    if c > 0:
        a = np.linspace(0, np.pi / 2, c)
        entra, sai = np.sin(a), np.cos(a)
    pos, primeira = 0, True
    while pos < n:
        seg = x.copy()
        if c > 0:
            if not primeira:
                seg[:c] *= entra
            seg[-c:] *= sai
        y[pos:pos + len(seg)] += seg
        pos += passo
        primeira = False
    y = y[:n]
    f = min(int(fade * SR), n // 2)
    if f > 0:
        r = np.linspace(0, 1, f)
        y[:f] *= r
        y[-f:] *= r[::-1]
    return y


def envelope_voz(voz, ataque, soltura, janela=0.02):
    """Nível da voz por quadro (0 a 1), subindo rápido e descendo devagar."""
    w = int(janela * SR)
    n_fr = int(np.ceil(len(voz) / w))
    pad = np.zeros(n_fr * w)
    pad[:len(voz)] = voz
    rms = np.sqrt((pad.reshape(n_fr, w) ** 2).mean(axis=1))
    ref = np.percentile(rms, 95) + 1e-9
    e = np.clip(rms / ref, 0, 1)
    k_att = 1 - np.exp(-janela / ataque)
    k_rel = 1 - np.exp(-janela / soltura)
    s = np.zeros(n_fr)
    cur = 0.0
    for i, v in enumerate(e):
        k = k_att if v > cur else k_rel
        cur += k * (v - cur)
        s[i] = cur
    return np.repeat(s, w)[:len(voz)]


def salvar(caminho_saida, x):
    """Grava WAV direto, ou converte para MP3 via ffmpeg."""
    if caminho_saida.lower().endswith(".wav"):
        wavfile.write(caminho_saida, SR, (x * 32767).astype(np.int16))
        return
    tmp = caminho_saida + ".tmp.wav"
    wavfile.write(tmp, SR, (x * 32767).astype(np.int16))
    try:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-b:a", "192k",
                        caminho_saida], check=True)
    finally:
        os.remove(tmp)


def db(x):
    v = np.max(np.abs(x)) if np.ndim(x) else abs(x)
    return 20 * np.log10(v + 1e-12)


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def montar(cfg, base_dir="."):
    cfg = dict(cfg)
    sons_proprios = cfg.get("sons_proprios", {})
    ducking = {"quanto": 0.8, "ataque": 0.03, "soltura": 0.4}
    ducking.update(cfg.get("ducking", {}))

    voz = None
    if cfg.get("voz"):
        voz = ler_audio(os.path.join(base_dir, cfg["voz"]))
    dur_voz = len(voz) / SR if voz is not None else 0.0
    total = float(cfg.get("duracao") or dur_voz)
    if total <= 0:
        raise SystemExit("Defina 'duracao' no roteiro ou informe uma 'voz'.")
    N = int(total * SR)

    bed_duck = np.zeros(N)   # ambiências e efeitos que abaixam com a voz
    bed_fixo = np.zeros(N)   # efeitos que não abaixam ("abaixa": false)
    colocados = []
    cache = {}

    for item in cfg.get("sons", []):
        nome = item["som"]
        vol = float(item.get("volume", 1.0))
        inicio = float(item.get("em", item.get("inicio", 0.0)))
        src = carregar_fonte(nome, sons_proprios, cache)
        s0 = int(inicio * SR)
        if s0 >= N:
            continue
        if "fim" in item:
            L = int((float(item["fim"]) - inicio) * SR)
            seg = repetir_ate(src, min(L, N - s0), fade=float(item.get("fade", 0.5)))
        else:
            seg = src
            if "dur" in item:
                seg = seg[:int(float(item["dur"]) * SR)]
            seg = seg[:N - s0].copy()
            f = min(int(0.03 * SR), len(seg) // 2)
            if f > 0:
                seg[-f:] *= np.linspace(1, 0, f)
        destino = bed_duck if item.get("abaixa", True) else bed_fixo
        destino[s0:s0 + len(seg)] += seg * vol
        colocados.append((inicio, nome, vol, item.get("abaixa", True)))

    if voz is not None:
        g = 1 - ducking["quanto"] * envelope_voz(
            np.pad(voz, (0, max(0, N - len(voz))))[:N],
            ducking["ataque"], ducking["soltura"])
    else:
        g = np.ones(N)

    voz_arr = np.zeros(N)
    if voz is not None:
        n = min(N, len(voz))
        voz_arr[:n] = voz[:n]

    mix = voz_arr + bed_duck * g + bed_fixo
    pico = np.max(np.abs(mix))
    if pico > 0.89:  # limita a -1 dBFS para não estourar
        mix = mix * (0.89 / pico)
    return mix, voz_arr, bed_duck * g + bed_fixo, colocados


def main(argv=None):
    p = argparse.ArgumentParser(description="Mixa voz, ambiências e efeitos")
    p.add_argument("roteiro", help="arquivo JSON com a descrição do som")
    p.add_argument("-o", "--saida", required=True, help="ex.: saida.mp3 ou saida.wav")
    p.add_argument("--video", default=None, help="vídeo base: o áudio é trocado e o vídeo sai em MP4")
    a = p.parse_args(argv)

    with open(a.roteiro, encoding="utf-8") as f:
        cfg = json.load(f)
    base_dir = os.path.dirname(os.path.abspath(a.roteiro))

    if a.video and not cfg.get("duracao"):
        cfg["duracao"] = duracao_video(a.video)

    mix, voz_arr, fundo, colocados = montar(cfg, base_dir)

    if a.video:
        tmp = a.saida + ".tmp.wav"
        wavfile.write(tmp, SR, (mix * 32767).astype(np.int16))
        try:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-i", tmp,
                            "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                            "-c:a", "aac", "-b:a", "192k", "-shortest",
                            "-movflags", "+faststart", a.saida], check=True)
        finally:
            os.remove(tmp)
    else:
        salvar(a.saida, mix)

    print(f"OK: {a.saida}")
    print(f"duração: {len(mix) / SR:.2f}s")
    print(f"pico: {db(mix):.1f} dBFS | nível médio: {rms_db(mix):.1f} dBFS")
    if np.any(voz_arr):
        print(f"voz: {rms_db(voz_arr[voz_arr != 0]):.1f} dBFS médio | "
              f"fundo: {rms_db(fundo[fundo != 0]) if np.any(fundo) else float('nan'):.1f} dBFS médio")
    print("sons colocados:")
    for t, nome, vol, abaixa in sorted(colocados):
        marca = "" if abaixa else " (fixo, não abaixa)"
        print(f"  {t:6.2f}s  {nome}  volume {vol}{marca}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
