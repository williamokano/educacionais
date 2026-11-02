#!/usr/bin/env python3
"""Biblioteca de efeitos sonoros sintetizados (sem download, sem internet).

Uso:
  python3 sfx.py listar                 # lista todos os sons, por categoria
  python3 sfx.py gerar NOME [-d SEG] [-o ARQUIVO.wav]

Os sons são gerados por síntese (senos, ruído filtrado, envelopes e pequenos
padrões). Nomes aceitam acento ou não: "digitação" = "digitacao".
Biblioteca combinada: sons base + sons de criatura, sino, estática e objetos.
"""
import argparse
import os
import sys
import unicodedata

import numpy as np
from scipy import signal as sg
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
rng = np.random.default_rng(7)  # semente fixa: o mesmo som sai igual sempre


# ---------- utilidades ----------

def chave(nome):
    """Normaliza o nome: minúsculo, sem acento, espaço e hífen viram underline."""
    s = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    return s.lower().strip().replace(" ", "_").replace("-", "_")


def T(d):
    return np.arange(int(d * SR)) / SR


def ruido(d):
    return rng.standard_normal(int(d * SR))


def lp(x, fc, o=2):
    return sosfilt(butter(o, fc, "lowpass", fs=SR, output="sos"), x)


def hp(x, fc, o=2):
    return sosfilt(butter(o, fc, "highpass", fs=SR, output="sos"), x)


def bp(x, f1, f2, o=2):
    return sosfilt(butter(o, [f1, f2], "bandpass", fs=SR, output="sos"), x)


def normaliza(x, pico=0.9):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * pico


def env(d, a=0.005, r=0.1, curve=3):
    """Envelope de ataque (a) e queda exponencial (r)."""
    t = T(d)
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4) * curve / 3)


def fade(x, fi=0.01, fo=0.05):
    x = x.copy()
    n1, n2 = int(fi * SR), int(fo * SR)
    if n1:
        x[:n1] *= np.linspace(0, 1, n1)
    if n2:
        x[-n2:] *= np.linspace(1, 0, n2)
    return x


def soma_em(destino, t0, x, vol=1.0):
    """Soma x dentro de destino a partir de t0 (segundos), cortando o que passar do fim."""
    s = int(t0 * SR)
    if s < 0:
        x = x[-s:]
        s = 0
    if s >= len(destino) or len(x) == 0:
        return
    n = min(len(x), len(destino) - s)
    destino[s:s + n] += x[:n] * vol


def loop_suave(x, fade_s=1.0):
    """Transforma o trecho num loop sem emenda: o fim se funde ao começo."""
    f = int(fade_s * SR)
    body = x[:-f].copy()
    r = np.linspace(0, 1, f)
    body[:f] = body[:f] * r + x[-f:] * (1 - r)
    return body


def reverb(x, dec=1.2, mix=0.35):
    ir = ruido(dec) * np.exp(-T(dec) * 5 / dec)
    ir = lp(ir, 4000)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    w = sg.fftconvolve(x, ir)[:len(x) + int(dec * SR)]
    y = np.zeros_like(w)
    y[:len(x)] += x * (1 - mix)
    return y + w * mix * 0.6


# =====================================================================
# SONS DA SKILL ORIGINAL (cena de tensão, ação e transição)
# =====================================================================

def whoosh(d=1.0):
    n = int(d * SR)
    x = ruido(d)
    escuro, claro = lp(x, 500), lp(x, 3000)
    a = np.linspace(0, 1, n)
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.6
    return normaliza(((1 - a) * escuro + a * claro) * e, 0.8)


def whoosh_rev(d=0.6):
    return normaliza(whoosh(d)[::-1], 0.8)


def pop(d=0.2):
    t = T(d)
    freq = 420 * np.exp(-t * 18) + 110
    tom = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 22)
    clique = lp(ruido(d), 3000) * np.exp(-t * 160) * 0.6
    return normaliza(tom + clique, 0.8)


def impacto(d=1.2):
    t = T(d)
    freq = 35 + 60 * np.exp(-t * 14)
    sub = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 4.0)
    corpo = lp(ruido(d), 350) * np.exp(-t * 7) * 0.9
    clique = hp(ruido(d), 2500) * np.exp(-t * 250) * 0.5
    return normaliza(sub * 0.9 + corpo + clique, 0.9)


def _passo(pitch=1.0, soft=1.0):
    t = T(0.12)
    x = lp(ruido(0.12), 900 * pitch) * np.exp(-t * 40) * 0.8 + np.sin(2 * np.pi * 90 * t) * np.exp(-t * 40) * 0.6
    return normaliza(x, 0.9) * soft


def passos(d=3.0):
    out = np.zeros(int(d * SR))
    t, i = 0.0, 0
    while t < d - 0.15:
        p = _passo(rng.uniform(0.85, 1.15)) * (1.0 if i % 2 == 0 else 0.8)
        soma_em(out, t, p)
        t += rng.uniform(0.42, 0.52)
        i += 1
    return normaliza(out, 0.8)


def passos_lentos(d=2.5):
    out = np.zeros(int(d * SR))
    t = 0.0
    while t < d - 0.15:
        soma_em(out, t, _passo(rng.uniform(0.9, 1.1), 0.7))
        t += 0.5
    return normaliza(out, 0.7)


def passos_rapidos(d=2.4):
    out = np.zeros(int(d * SR))
    t = 0.0
    while t < d - 0.1:
        soma_em(out, t, _passo(rng.uniform(0.85, 1.15), 1.0))
        t += rng.uniform(0.22, 0.28)
    return normaliza(out, 0.9)


def porta(d=2.0):
    t = T(d)
    freq = 170 + 70 * np.sin(2 * np.pi * 0.9 * t) + 25 * np.sin(2 * np.pi * 5.3 * t)
    rangido = np.sin(2 * np.pi * np.cumsum(freq) / SR)
    e = np.sin(np.pi * np.clip(t / (d * 0.7), 0, 1)) ** 2
    creak = rangido * e * 0.35 + bp(ruido(d), 700, 1600) * e * 0.08
    out = creak.copy()
    soma_em(out, d - 0.35, impacto(0.5) * 0.9)
    return normaliza(out, 0.9)


def rangido(d=0.8):
    """Rangido de madeira/dobradiça (sem batida)."""
    t = T(d)
    f = 180 + 60 * np.sin(2 * np.pi * 1.3 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sg.sawtooth(ph) * (np.sin(2 * np.pi * 31 * t) > 0)
    return fade(normaliza(bp(x, 300, 2200), 0.9), 0.05, 0.1)


def sirene(d=3.0):
    t = T(d)
    freq = 950 + 280 * np.sin(2 * np.pi * 0.7 * t)
    fase = 2 * np.pi * np.cumsum(freq) / SR
    y = (np.sin(fase) + 0.25 * np.sin(2 * fase)) * 0.6
    return normaliza(y * np.minimum(1, t * 20), 0.8)


def sirene_longe(d=3.0):
    return lp(sirene(d), 1200) * 0.8


def digitacao(d=3.0):
    out = np.zeros(int(d * SR))
    t = 0.1
    while t < d - 0.05:
        n = int(0.015 * SR)
        clique = hp(ruido(0.015), 2200) * np.exp(-np.arange(n) / SR * 350) * rng.uniform(0.5, 1.0)
        soma_em(out, t, clique)
        t += rng.uniform(0.08, 0.25)
    return normaliza(out, 0.8)


def batida_tum(f=58, dur=0.16):
    tt = np.arange(int(dur * SR)) / SR
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 28)


def coracao(d=4.0, bpm=65):
    out = np.zeros(int(d * SR))
    per = 60 / bpm
    for b in np.arange(0, d, per):
        soma_em(out, b, batida_tum(), 1.0)
        soma_em(out, b + 0.28, batida_tum(), 0.6)
    return normaliza(out, 0.9)


def batimento_rapido(d=4.0):
    return coracao(d, 110)


def ding(d=1.8):
    t = T(d)
    y = (np.sin(2 * np.pi * 1318 * t) + 0.3 * np.sin(2 * np.pi * 2636 * t)) * np.exp(-t * 3.2)
    return normaliza(y, 0.7)


def sino(d=3.5, f=520):
    """Sino de igreja: vários harmônicos com decaimento próprio."""
    t = T(d)
    parts = [(1, 1), (2.0, 0.5), (2.4, 0.45), (3.0, 0.3), (4.2, 0.25), (5.4, 0.18), (0.5, 0.4)]
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * (1.2 + r * 0.6)) for r, a in parts)
    x[:200] *= np.linspace(0, 1, 200)
    return normaliza(x)


def sino_longe(d=3.5):
    return lp(sino(d), 1500)


def impacto_seco(d=0.4):
    """Estalo de metal ou pancada seca, sem corpo grave."""
    t = T(d)
    return normaliza(hp(ruido(d), 1500) * np.exp(-t * 60) + np.sin(2 * np.pi * 140 * t) * np.exp(-t * 15) * 0.6)


def estalo(d=0.4):
    return impacto_seco(d)


def clique(d=0.06):
    t = T(d)
    return normaliza(np.concatenate([hp(ruido(0.03), 2000) * np.exp(-T(0.03) * 150), np.zeros(int(0.03 * SR))]))


def carimbo(d=0.5):
    """Carimbo: pancada grave seguida de um clique de metal."""
    out = np.zeros(int(d * SR))
    soma_em(out, 0.0, batida_tum(90, 0.25))
    soma_em(out, 0.0, clique() * 0.6)
    return normaliza(out, 0.9)


def bips(d=0.8, n=3, f=1400, gap=0.2):
    """Três bipes curtos de aviso (d é ignorado; a duração vem de n e gap)."""
    x = np.zeros(int((n * gap + 0.2) * SR))
    for k in range(n):
        t = T(0.1)
        b = np.sin(2 * np.pi * f * t) * env(0.1, 0.003, 0.05)
        soma_em(x, k * gap, b)
    return normaliza(x, 0.6)


def chocalho(d=2.4):
    x = np.zeros(int(d * SR))
    for _ in range(int(d * 9)):
        tt = T(0.15)
        h = sum(np.sin(2 * np.pi * f * tt) for f in (820, 1310, 2240)) * np.exp(-tt * 30)
        i = int(rng.random() * (len(x) - len(h)))
        x[i:i + len(h)] += h * rng.random()
    return normaliza(x)


def chalk(d=1.0):
    """Giz ou lápis raspando."""
    t = T(d)
    g = (np.sin(2 * np.pi * 11 * t) > -0.2).astype(float)
    return fade(normaliza(bp(ruido(d), 1500, 6000)) * g * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t)), 0.02, 0.05)


def lapis(d=0.7):
    return chalk(d) * 0.6


def papel(d=0.9):
    x = np.zeros(int(d * SR))
    for _ in range(int(d * 40)):
        b = hp(ruido(0.02), 2500) * np.exp(-T(0.02) * 200)
        i = int(rng.random() * (len(x) - len(b)))
        x[i:i + len(b)] += b * rng.random()
    return normaliza(x)


def agua(d=1.6):
    x = normaliza(lp(ruido(d), 1500)) * 0.4
    for _ in range(int(d * 25)):
        tt = T(0.05)
        f = 600 + rng.random() * 900
        b = np.sin(2 * np.pi * f * (1 + tt * 8) * tt) * np.exp(-tt * 60)
        i = int(rng.random() * (len(x) - len(b)))
        x[i:i + len(b)] += b * 0.4
    return fade(x, 0.05, 0.2)


def chuveiro(d=1.0):
    return fade(normaliza(bp(ruido(d), 1500, 9000)) * 0.6, 0.05, 0.1)


def buzina(d=0.35):
    t = T(d)
    return normaliza(lp(sg.square(2 * np.pi * 140 * t), 1500)) * env(d, 0.005, 0.3, 1)


def jingle(d=1.2):
    x = np.zeros(int(d * SR))
    for k in range(10):
        tt = T(0.5)
        h = sum(np.sin(2 * np.pi * f * tt) for f in (2600, 3900, 5100)) * np.exp(-tt * 9)
        i = int(k * 0.11 * SR)
        x[i:i + len(h)] += h[:len(x) - i]
    return normaliza(x)


def chiado(d=0.6):
    t = T(d)
    return normaliza(hp(ruido(d), 3000)) * np.exp(-t * 4)


def sopro(d=0.4):
    t = T(d)
    return normaliza(bp(ruido(d), 300, 2500)) * np.sin(np.pi * t / d)


def queda_energia(d=1.2):
    t = T(d)
    f = 120 * np.exp(-t * 2.5)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = lp(sg.sawtooth(ph), 800) * np.exp(-t * 2) * 0.5
    x[:int(0.3 * SR)] += batida_tum(60, 0.3)[:int(0.3 * SR)]
    return normaliza(x)


def raio(d=0.5):
    """Raio: chiado elétrico crescente com um estalo seco no fim."""
    x = fade(normaliza(bp(ruido(d), 900, 4000)) * np.linspace(0.3, 1, int(d * SR)), 0.02, 0.02)
    soma_em(x, d - 0.05, clique() * 0.5)
    return normaliza(x)


def motor(d=3.0, idle=False):
    t = T(d)
    f = 38 if idle else 38 + 10 * np.minimum(1, t)
    ph = 2 * np.pi * np.cumsum(np.full(len(t), f) if np.isscalar(f) else f) / SR
    x = lp(sg.sawtooth(ph), 300) + normaliza(lp(ruido(d), 200)) * 0.4
    return fade(normaliza(x), 0.2, 0.3)


def tique(d=0.03):
    return normaliza(hp(ruido(0.03), 2000)) * env(0.03, 0.001, 0.01)


def tique_relogio(d=1.0):
    """Tique-taque de relógio, um tique por segundo."""
    x = np.zeros(int(d * SR))
    for k in range(int(d)):
        soma_em(x, k * 0.5, tique() * 0.7)
        soma_em(x, k * 0.5 + 0.0, tique() * 0.4)
    return normaliza(x, 0.5)


def ruido_metal(d=1.0):
    return normaliza(bp(ruido(d), 2000, 5000)) * env(d, 0.001, 0.3)


def trovao(d=3.5):
    """Trovão: estrondo grave que cai aos poucos."""
    t = T(d)
    x = lp(ruido(d), 250) * np.exp(-t * 1.1) * 1.0 + lp(ruido(d), 120) * np.exp(-t * 0.8) * 0.8
    x[:int(0.02 * SR)] += np.linspace(1, 0, int(0.02 * SR)) * 0.6
    return normaliza(x)


def vidro(d=1.2):
    """Vidro quebrando: estilhaços em cascata."""
    x = np.zeros(int(d * SR))
    for k in range(40):
        b = hp(ruido(0.04), 3000) * np.exp(-T(0.04) * 80) * rng.uniform(0.3, 1)
        soma_em(x, 0.05 + (k / 40) * 0.5 + rng.random() * 0.02, b)
    return normaliza(x)


def fogo(d=4.0):
    """Fogueira crepitando."""
    x = normaliza(bp(ruido(d), 300, 2500)) * 0.25
    for _ in range(int(d * 15)):
        b = hp(ruido(0.02), 1500) * np.exp(-T(0.02) * 180) * rng.uniform(0.2, 0.8)
        i = int(rng.random() * (len(x) - len(b)))
        x[i:i + len(b)] += b
    return fade(normaliza(x, 0.6), 0.2, 0.3)


def telefone(d=2.4):
    """Toque de telefone fixo, dois toques."""
    x = np.zeros(int(d * SR))
    for k in range(2):
        t = T(0.7)
        tom = (sg.square(2 * np.pi * 440 * t) + sg.square(2 * np.pi * 480 * t)) * 0.2 * env(0.7, 0.005, 0.5, 1)
        soma_em(x, k * 1.1, tom)
    return normaliza(x, 0.7)


def elevador_ding(d=1.0):
    return normaliza(np.sin(2 * np.pi * 880 * T(d)) * np.exp(-T(d) * 5), 0.7)


def respiracao(d=2.4):
    """Respiração pesada, dois ciclos."""
    t = T(d)
    env_r = np.sin(np.pi * np.clip(t / (d / 2), 0, 1)) ** 2
    x = bp(ruido(d), 400, 1800) * env_r
    return normaliza(x, 0.5)


def passaros_cantando(d=4.0):
    """Pássaros cantando em cadência."""
    x = normaliza(lp(ruido(d), 800)) * 0.05
    for _ in range(int(d * 2)):
        n = rng.integers(2, 5)
        st = rng.random() * (d - 0.6)
        for k in range(n):
            tt = T(0.09)
            f0 = 2500 + rng.random() * 1500
            b = np.sin(2 * np.pi * (f0 + 800 * np.sin(tt * 30)) * tt) * env(0.09, 0.01, 0.05)
            soma_em(x, st + k * 0.12, b * 0.2)
    return fade(normaliza(x, 0.5), 0.2, 0.3)


def uivo(d=3.0):
    t = T(d)
    f = 320 + 180 * np.sin(np.pi * np.clip(t / d, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = bp(sg.sawtooth(ph), 400, 1200) * (0.5 + 0.5 * np.sin(2 * np.pi * 4 * t)) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7
    return normaliza(reverb(x, 1.2, 0.3), 0.7)


def carro_passando(d=2.5):
    """Carro passando de um lado ao outro."""
    n = int(d * SR)
    x = normaliza(bp(ruido(d), 150, 800))
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    return normaliza(x * e, 0.6)


def pisca(d=2.0):
    """Luz de néon piscando: zumbido elétrico com falhas."""
    t = T(d)
    x = lp(sg.square(2 * np.pi * 120 * t), 900) * 0.3 * (np.sin(2 * np.pi * 3 * t) > 0)
    return fade(normaliza(x), 0.05, 0.1)


def grilos(d=8.0):
    """Grilos de noite (loop)."""
    car = np.sin(2 * np.pi * 4300 * T(d)) + 0.3 * np.sin(2 * np.pi * 8600 * T(d))
    am = (np.sin(2 * np.pi * 28 * T(d)) > 0).astype(float)
    burst = (np.sin(2 * np.pi * 0.9 * T(d) + rng.random() * 6) > 0.2).astype(float)
    return loop_suave(normaliza(lp(car * am * burst, 9000)), 1.0)


# ---------- vozes e sons de criatura ----------

def latido(d=0.28, f0=520):
    t = T(d)
    f = f0 * (1 + 0.5 * np.exp(-t * 25)) * np.exp(-t * 1.5)
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = sg.sawtooth(ph) + 0.4 * ruido(d) * np.exp(-t * 30)
    y = bp(src, 700, 1500) * 1.0 + bp(src, 1800, 3200) * 0.5 + bp(src, 250, 600) * 0.6
    return normaliza(y * env(d, 0.008, 0.12, 2.2))


def rosnado(d=1.6, f0=85, vogal=(450, 850)):
    t = T(d)
    jit = 1 + 0.06 * np.sin(2 * np.pi * 5.3 * t) + 0.04 * lp(ruido(d), 8) * 8
    ph = 2 * np.pi * np.cumsum(f0 * jit) / SR
    src = sg.sawtooth(ph) * (1 + 0.5 * np.sin(2 * np.pi * 13 * t)) + ruido(d) * 0.35
    y = bp(src, vogal[0] * 0.7, vogal[0] * 1.3) + bp(src, vogal[1] * 0.8, vogal[1] * 1.2) * 0.6 + lp(src, 200) * 0.5
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.6
    return normaliza(y * e)


def tosse(d=0.32):
    t = T(d)
    x = bp(ruido(d), 300, 2500) * np.exp(-t * 14) + np.sin(2 * np.pi * 140 * t) * np.exp(-t * 20) * 0.4
    return normaliza(x)


def passo_leve(d=0.12):
    return _passo(1.0, 0.6)


def arrastar(d=3.0):
    """Arrastar os pés no chão, em ciclos."""
    x = np.zeros(int(d * SR))
    t = 0.0
    while t < d - 0.5:
        s = fade(bp(ruido(0.45), 200, 1800) * np.hanning(int(0.45 * SR)), 0.01, 0.05) * 0.5
        soma_em(x, t, s)
        t += 0.62
    return x


def estatica(d=1.2, crack=False):
    x = normaliza(bp(ruido(d), 800, 5000)) * 0.5
    if crack:
        for _ in range(int(d * 12)):
            i = int(rng.random() * (len(x) - 500))
            x[i:i + 300] += ruido(300 / SR) * rng.random()
    return fade(normaliza(x, 0.7), 0.03, 0.05)


def estatica_longa(d=2.4):
    return estatica(d, crack=True)


def rangido_curto(d=0.2):
    return rangido(d)


def chocalhar_metal(d=2.4):
    return chocalho(d)


def vento_curto(d=2.6):
    t = T(d)
    return fade(normaliza(bp(ruido(d), 200, 700)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t)), 0.3, 0.3)


def drone(d=8.0):
    """Zumbido grave de tensão (loop)."""
    t = T(d)
    x = sum(np.sin(2 * np.pi * f * t + rng.random() * 6) * a for f, a in [(55, 1), (55.4, 0.8), (82.5, 0.4), (110.3, 0.25)])
    x = x + normaliza(lp(ruido(d), 120)) * 0.4
    x = x * (1 + 0.2 * np.sin(2 * np.pi * 0.07 * t))
    return loop_suave(fade(normaliza(x), 2, 2), 1.5)


def zumbido(d=2.5):
    """Zumbido elétrico grave (rede de 50 Hz com harmônicos até ~400 Hz): ouve-se até em alto-falante de celular,
    ao contrário do drone de 55 Hz puro. Ataque rápido, oscilação lenta, final curto."""
    t = T(d)
    x = sum(np.sin(2 * np.pi * 50 * k * t) / k ** 0.8 for k in range(1, 9))
    x = x * (1 + 0.25 * np.sin(2 * np.pi * 3.1 * t)) + lp(ruido(d), 400)[: len(t)] * 0.15
    return fade(normaliza(x, 0.9), 0.04, min(0.5, d / 3))


def ambiente_noite(d=8.0):
    """Noite: vento leve e grilos (loop)."""
    w = lp(ruido(d), 300) * 0.6
    c = grilos(d) * 0.18
    n = min(len(w), len(c))
    return loop_suave(fade(normaliza(w[:n]) * 0.35 + c[:n], 1, 1), 1.0)


def ambiente_dia(d=8.0):
    """Dia de rua: vento e pássaros (loop)."""
    w = bp(ruido(d), 120, 900) * 0.5
    x = normaliza(w) * 0.3
    for _ in range(int(d * 1.3)):
        st = rng.random() * max(0.1, d - 0.4)
        tt = T(0.18)
        ch = np.sin(2 * np.pi * (3200 + 900 * np.sin(tt * 40)) * tt) * env(0.18, 0.01, 0.08)
        soma_em(x, st, ch * 0.18)
    return loop_suave(fade(x, 1, 1), 1.0)


def vento(d=8.0):
    """Vento contínuo, em loop."""
    n = int((d + 1) * SR)
    t = np.arange(n) / SR
    x = lp(ruido(d + 1), 800)
    x2 = lp(ruido(d + 1), 250)
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * (1 / d) * t)
    lfo2 = 0.7 + 0.3 * np.sin(2 * np.pi * (2 / d) * t + 1.3)
    y = x * lfo * 0.5 + x2 * lfo2 * 0.7
    return loop_suave(normaliza(y, 0.7), 1.0)


def chuva(d=8.0):
    """Chuva leve com gotas, em loop."""
    n = int((d + 1) * SR)
    base = (hp(ruido(d + 1), 1800) * 0.12 + lp(ruido(d + 1), 300) * 0.12)[:n]
    gotas = np.zeros(n)
    k = int((d + 1) * 45)
    tt = np.arange(500) / SR
    for p in rng.integers(0, n - 500, k):
        f = rng.uniform(2000, 4500)
        amp = rng.uniform(0.08, 0.35)
        gotas[p:p + 500] += amp * np.sin(2 * np.pi * f * tt) * np.exp(-tt * rng.uniform(120, 220))
    return loop_suave(normaliza(base + gotas, 0.6), 1.0)


def cidade(d=10.0):
    """Rua da cidade: trânsito contínuo e buzinas, em loop."""
    n = int((d + 1) * SR)
    base = (lp(ruido(d + 1), 400) * 0.35 + bp(ruido(d + 1), 80, 200) * 0.3)[:n]
    passa = np.zeros(n)
    for _ in range(max(2, int(d / 2.5))):
        ini = int(rng.uniform(0, n - 2.5 * SR))
        L = min(int(rng.uniform(1.5, 2.5) * SR), n - ini)
        env_p = np.sin(np.pi * np.linspace(0, 1, L)) ** 2
        passa[ini:ini + L] += lp(rng.standard_normal(L), 1200) * env_p * rng.uniform(0.2, 0.45)
    buzina_x = np.zeros(n)
    tb = np.arange(int(0.45 * SR)) / SR
    for _ in range(int(d / 4)):
        c = int(rng.uniform(0, n - 0.6 * SR))
        buzina_x[c:c + len(tb)] += 0.12 * (np.sin(2 * np.pi * 420 * tb) + np.sin(2 * np.pi * 520 * tb)) * np.exp(-tb * 4)
    return loop_suave(normaliza(base + passa + buzina_x, 0.6), 1.0)


# ---------- ambiências: rádio ----------

def radio(d=2.4):
    """Rádio chiando, com estalos (para cena de transmissão)."""
    return estatica_longa(d) * 0.6


# =====================================================================
# REGISTRO
# nome: (função(duração), duração padrão, tipo, descrição)
# tipo: efeito (uma vez) ou ambiencia (loop, com fim)
# =====================================================================
REGISTRO = {
    # --- ação e transição ---
    "whoosh":          (whoosh,          1.0,  "efeito", "Swoosh de movimento rápido"),
    "whoosh_reverso":  (whoosh_rev,      0.6,  "efeito", "Swoosh invertido, para entrar numa cena"),
    "pop":             (pop,             0.2,  "efeito", "Estalo curto, tipo bolha ou botão"),
    "impacto":         (impacto,         1.2,  "efeito", "Batida grave e forte"),
    "impacto_seco":    (impacto_seco,    0.4,  "efeito", "Pancada seca de metal, sem corpo grave"),
    "estalo":          (estalo,          0.4,  "efeito", "Estalo de metal curto"),
    "clique":          (clique,          0.06, "efeito", "Clique de botão ou interruptor"),
    "carimbo":         (carimbo,         0.5,  "efeito", "Carimbo batendo na mesa"),
    "raio":            (raio,            0.5,  "efeito", "Raio: estalo elétrico seco"),
    "trovao":          (trovao,          3.5,  "efeito", "Trovão grave que se espalha"),
    "vidro":           (vidro,           1.2,  "efeito", "Vidro quebrando em cascata"),
    "queda_energia":   (queda_energia,   1.2,  "efeito", "Queda de energia com grave descendente"),
    "sopro":           (sopro,           0.4,  "efeito", "Sopro de vento curto"),
    "chiado":          (chiado,          0.6,  "efeito", "Chiado de freio ou vapor"),
    # --- portas, passos e objetos ---
    "porta":           (porta,           2.0,  "efeito", "Porta rangendo e batendo no fim"),
    "rangido":         (rangido,         0.8,  "efeito", "Rangido de madeira ou dobradiça"),
    "passos":          (passos,          3.0,  "efeito", "Passos alternados num piso"),
    "passos_lentos":   (passos_lentos,   2.5,  "efeito", "Passos lentos e pesados"),
    "passos_rapidos":  (passos_rapidos,  2.4,  "efeito", "Passos rápidos, de corrida"),
    "passo_leve":      (passo_leve,      0.12, "efeito", "Um passo leve"),
    "arrastar":        (arrastar,        3.0,  "efeito", "Arrastar os pés no chão"),
    "chocalho":        (chocalho,        2.4,  "efeito", "Chocalho de metal, objetos batendo"),
    "giz":             (chalk,           1.0,  "efeito", "Giz raspando no quadro"),
    "lapis":           (lapis,           0.7,  "efeito", "Lápis escrevendo ou raspando"),
    "papel":           (papel,           0.9,  "efeito", "Papel amassando"),
    "agua":            (agua,            1.6,  "efeito", "Água escorrendo e gotejando"),
    "chuveiro":        (chuveiro,        1.0,  "efeito", "Chuveiro ligado"),
    "carro_passando":  (carro_passando,  2.5,  "efeito", "Carro passando de um lado ao outro"),
    "motor":           (motor,           3.0,  "efeito", "Motor de carro ligando e acelerando"),
    "freada":          (chiado,          0.6,  "efeito", "Freada (chiado longo)"),
    "tique":           (tique,           0.03, "efeito", "Tique curto, tipo relógio"),
    "tique_relogio":   (tique_relogio,   3.0,  "efeito", "Relógio de parede, um tique por segundo"),
    "metal":           (ruido_metal,     1.0,  "efeito", "Metal vibrando"),
    # --- tela, eletrônicos e interface ---
    "digitacao":       (digitacao,       3.0,  "efeito", "Teclas de digitação"),
    "ding":            (ding,            1.8,  "efeito", "Sino de acerto ou notificação"),
    "elevador":        (elevador_ding,   1.0,  "efeito", "Ding de elevador chegando"),
    "bips":            (bips,            0.8,  "efeito", "Três bipes de aviso ou tela"),
    "telefone":        (telefone,        2.4,  "efeito", "Telefone fixo tocando"),
    "estatica":        (estatica,        1.2,  "efeito", "Estática de rádio ou TV"),
    "estatica_longa":  (estatica_longa,  2.4,  "efeito", "Estática com estalos, de rádio antigo"),
    "radio":           (radio,           2.4,  "efeito", "Transmissão de rádio chiando"),
    "pisca":           (pisca,           2.0,  "efeito", "Néon ou lâmpada piscando"),
    "jingle":          (jingle,          1.2,  "efeito", "Jingle de propaganda ou vinheta"),
    "buzina":          (buzina,          0.35, "efeito", "Buzina de carro curta"),
    "sirene":          (sirene,          3.0,  "efeito", "Sirene de polícia ou ambulância"),
    "sirene_longe":    (sirene_longe,    3.0,  "efeito", "Sirene ao longe, abafada"),
    # --- sinos e batidas de coração ---
    "sino":            (sino,            3.5,  "efeito", "Sino de igreja, vários harmônicos"),
    "sino_longe":      (sino_longe,      3.5,  "efeito", "Sino ao longe, abafado"),
    "coracao":         (coracao,         4.0,  "efeito", "Batimento cardíaco lento (use com fim para repetir)"),
    "batimento_rapido": (batimento_rapido, 4.0, "efeito", "Batimento cardíaco acelerado (tensão)"),
    "respiracao":      (respiracao,      2.4,  "efeito", "Respiração pesada, de medo ou esforço"),
    "tosse":           (tosse,           0.32, "efeito", "Tosse curta"),
    # --- criaturas e vozes ---
    "latido":          (latido,          0.28, "efeito", "Latido de cachorro"),
    "rosnado":         (rosnado,         1.6,  "efeito", "Rosnado grave e rouco"),
    "rosnado_curto":   (lambda d=0.9: rosnado(d, 95), 0.9, "efeito", "Rosnado curto"),
    "rosnado_longo":   (lambda d=2.2: rosnado(d, 75), 2.2, "efeito", "Rosnado longo, com eco"),
    "uivo":            (uivo,            3.0,  "efeito", "Uivo de lobo ou cachorro"),
    # --- ambiências (loop) ---
    "vento":           (vento,           8.0,  "ambiencia", "Vento contínuo, em loop"),
    "chuva":           (chuva,           8.0,  "ambiencia", "Chuva leve com gotas, em loop"),
    "cidade":          (cidade,          10.0, "ambiencia", "Rua da cidade: trânsito e buzinas, em loop"),
    "noite":           (ambiente_noite,  8.0,  "ambiencia", "Noite: vento leve e grilos, em loop"),
    "dia":             (ambiente_dia,    8.0,  "ambiencia", "Dia de rua: vento e pássaros, em loop"),
    "grilos":          (grilos,          8.0,  "ambiencia", "Grilos de noite, em loop"),
    "passaros":        (passaros_cantando, 4.0, "ambiencia", "Pássaros cantando, de manhã"),
    "fogo":            (fogo,            4.0,  "ambiencia", "Fogueira crepitando"),
    "drone":           (drone,           8.0,  "ambiencia", "Zumbido grave de tensão, em loop (55 Hz: some em alto-falante pequeno)"),
    "zumbido":         (zumbido,         2.5,  "efeito", "Zumbido elétrico grave (50 Hz + harmônicos), audível no celular"),
}

def sons_por_tipo():
    grupos = {}
    for nome, (_, dur, tipo, desc) in REGISTRO.items():
        grupos.setdefault(tipo, []).append((nome, dur, desc))
    return grupos


def gerar(nome, duracao=None):
    """Devolve o som como array mono float (-1 a 1) em SR."""
    k = chave(nome)
    if k not in REGISTRO:
        raise KeyError(f"Som desconhecido: {nome}. Use 'listar' para ver os disponíveis.")
    funcao, dur_padrao, _, _ = REGISTRO[k]
    d = dur_padrao if duracao is None else duracao
    return funcao(d)


def salvar_wav(caminho, x):
    wavfile.write(caminho, SR, x.astype(np.float32))


def main(argv=None):
    p = argparse.ArgumentParser(description="Efeitos sonoros sintetizados")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("listar", help="Lista os sons disponíveis")
    g = sub.add_parser("gerar", help="Gera um som em WAV para testar")
    g.add_argument("nome")
    g.add_argument("-d", "--duracao", type=float, default=None)
    g.add_argument("-o", "--saida", default=None)
    a = p.parse_args(argv)

    if a.cmd == "listar":
        for tipo, lista in sons_por_tipo().items():
            titulo = "EFEITOS (uma vez)" if tipo == "efeito" else "AMBIÊNCIAS (loop, use com fim)"
            print(f"\n{titulo}")
            print(f"  {'nome':<18}{'duração':>9}  descrição")
            for nome, dur, desc in lista:
                print(f"  {nome:<18}{dur:>7.2f}s  {desc}")
        print(f"\nTotal: {len(REGISTRO)} sons.")
        return 0

    x = gerar(a.nome, a.duracao)
    saida = a.saida or f"{chave(a.nome)}.wav"
    salvar_wav(saida, x)
    print(f"OK: {saida} ({len(x) / SR:.2f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
