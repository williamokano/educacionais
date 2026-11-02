#!/usr/bin/env python3
"""Narração pelo ElevenLabs via HTTP, com o tempo de cada palavra.

Usa a chave da variável de ambiente ELEVEN_API_KEY (ou ELEVENLABS_API_KEY). Só biblioteca padrão + ffmpeg.

Comandos:
  vozes [--todas]                         lista as vozes da conta (id, nome, tipo, idioma)
  efeito "DESCRIÇÃO" -o som.mp3            efeito sonoro (Sound Effects), --duracao 0.5–22 s, --loop
  estimar TEXTO                           conta os caracteres que serão cobrados, sem chamar a API
  gerar TEXTO -o narracao.mp3 --voz ID    gera o áudio e grava narracao.palavras.json ao lado
        [--modelo eleven_multilingual_v2] [--velocidade 1.0] [--estabilidade 0.5]
        [--similaridade 0.75] [--estilo 0.0] [--idioma pt] [--amostra N]

TEXTO é um roteiro.md (usa o bloco de código da seção "Texto para o ElevenLabs" / "Texto para a voz")
ou um arquivo .txt. Para o roteiro.json do motor, use pipeline/narrar.py (que chama gerar() daqui). --amostra N gera só os primeiros N caracteres (para testar vozes gastando pouco).
Tudo que muda o resultado (voz, modelo, ajustes) vai explícito na chamada e na chave do cache.
"""
import argparse
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.elevenlabs.io"
MAX_CHARS = 4500  # abaixo do limite por pedido dos modelos multilíngues


def chave():
    k = os.environ.get("ELEVEN_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not k:
        sys.exit("Sem chave: defina ELEVEN_API_KEY no ambiente.")
    return k


def pedir(metodo, caminho, corpo=None):
    req = urllib.request.Request(API + caminho, method=metodo, headers={"xi-api-key": chave()})
    if corpo is not None:
        req.add_header("Content-Type", "application/json")
        req.data = json.dumps(corpo).encode()
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read()), dict(r.headers)
    except urllib.error.HTTPError as e:
        corpo_erro = e.read().decode(errors="replace")
        try:
            det = json.loads(corpo_erro).get("detail", corpo_erro)
            det = det.get("message", det) if isinstance(det, dict) else det
        except json.JSONDecodeError:
            det = corpo_erro
        sys.exit(f"ElevenLabs respondeu {e.code}: {det}")


def ler_texto(caminho):
    s = Path(caminho).read_text(encoding="utf-8")
    if caminho.endswith(".md"):
        m = re.search(r"^## .*Texto para.*?\n.*?```[^\n]*\n(.*?)```", s, re.S | re.M)
        if not m:
            sys.exit(f"Não achei o bloco de código da seção 'Texto para…' em {caminho}.")
        s = m.group(1)
    return " ".join(s.split())


def pedacos(texto):
    """Corta em pedaços de até MAX_CHARS, sempre em fim de frase."""
    if len(texto) <= MAX_CHARS:
        return [texto]
    frases = re.split(r"(?<=[.!?…])\s+", texto)
    out, cur = [], ""
    for f in frases:
        if cur and len(cur) + 1 + len(f) > MAX_CHARS:
            out.append(cur)
            cur = f
        else:
            cur = f"{cur} {f}".strip()
    out.append(cur)
    return out


def duracao(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def palavras_do_alinhamento(al, desloc):
    """Caracteres com tempo -> palavras com início e fim (separadas por espaço, como no texto enviado)."""
    words, cur = [], None
    for ch, a, b in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                words.append(cur)
            cur = None
            continue
        if cur is None:
            cur = {"palavra": ch, "inicio": round(a + desloc, 3), "fim": round(b + desloc, 3)}
        else:
            cur["palavra"] += ch
            cur["fim"] = round(b + desloc, 3)
    if cur:
        words.append(cur)
    return sem_tags(words)


def sem_tags(words):
    """Tira as tags de áudio do Eleven v3/v4 ([whispers], [speaks softly]...): não são faladas e não entram na legenda."""
    fora, dentro = [], False
    for w in words:
        p = w["palavra"]
        if not dentro and p.startswith("["):
            dentro = True
        if dentro:
            resto = p[p.index("]") + 1:] if "]" in p else ""
            if "]" in p:
                dentro = False
            if resto:
                fora.append({**w, "palavra": resto})
            continue
        fora.append(w)
    return fora


def cmd_vozes(a):
    d, _ = pedir("GET", "/v1/voices")
    for v in d["voices"]:
        lb = v.get("labels") or {}
        if not a.todas and v.get("category") == "professional" and lb.get("language") not in (None, "pt"):
            continue
        print(f"{v['voice_id']} | {v['name']} | {v.get('category')} | "
              f"{lb.get('language', '-')} {lb.get('gender', '')} {lb.get('age', '')} {lb.get('accent', '')} "
              f"{lb.get('use_case', '')}")


def cmd_estimar(a):
    t = ler_texto(a.texto)
    print(f"{len(t)} caracteres em {len(pedacos(t))} pedido(s). A conta cobra por caractere; o custo real vem no "
          f"cabeçalho character-cost de cada resposta.")


def gerar(texto, out, voz, modelo="eleven_multilingual_v2", velocidade=1.0, estabilidade=0.5, similaridade=0.75,
          estilo=0.0, idioma="pt"):
    """Gera `out` (mp3) e `out`.palavras.json; devolve o dicionário gravado no .palavras.json."""
    out = Path(out)
    meta_path = out.with_suffix(".palavras.json")
    ajustes = {"stability": estabilidade, "similarity_boost": similaridade, "style": estilo,
               "speed": velocidade, "use_speaker_boost": True}
    chave_cache = hashlib.sha256(json.dumps([texto, voz, modelo, ajustes, idioma], sort_keys=True).encode()
                                 ).hexdigest()[:16]
    if out.exists() and meta_path.exists():
        m = json.loads(meta_path.read_text())
        if m.get("cache") == chave_cache:
            print(f"Já gerado com o mesmo texto, voz e ajustes: {out} (nada cobrado).")
            return m
    partes = pedacos(texto)
    print(f"Gerando {len(texto)} caracteres em {len(partes)} pedido(s) · voz {voz} · modelo {modelo} · "
          f"velocidade {velocidade}")
    palavras, custo, desloc = [], 0, 0.0
    with tempfile.TemporaryDirectory() as tmp:
        arquivos = []
        for i, p in enumerate(partes):
            corpo = {"text": p, "model_id": modelo, "voice_settings": ajustes}
            if idioma:
                corpo["language_code"] = idioma
            if i > 0:
                corpo["previous_text"] = partes[i - 1][-500:]
            if i < len(partes) - 1:
                corpo["next_text"] = partes[i + 1][:500]
            d, h = pedir("POST", f"/v1/text-to-speech/{voz}/with-timestamps?output_format=mp3_44100_128", corpo)
            custo += int(h.get("character-cost") or h.get("Character-Cost") or 0)
            f = Path(tmp) / f"p{i:02d}.mp3"
            f.write_bytes(base64.b64decode(d["audio_base64"]))
            arquivos.append(f)
            palavras += palavras_do_alinhamento(d["alignment"], desloc)
            desloc += duracao(f)
        out.parent.mkdir(parents=True, exist_ok=True)
        if len(arquivos) == 1:
            out.write_bytes(arquivos[0].read_bytes())
        else:
            lista = Path(tmp) / "lista.txt"
            lista.write_text("".join(f"file '{f}'\n" for f in arquivos))
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lista),
                            "-c", "copy", str(out)], check=True)
    total = duracao(out)
    meta = {"fonte": "elevenlabs", "cache": chave_cache, "voz": voz, "modelo": modelo, "ajustes": ajustes,
            "idioma": idioma, "caracteres": len(texto), "custo": custo, "duracao": round(total, 3),
            "texto": texto, "palavras": palavras}
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    print(f"OK: {out} · {total:.1f} s · {len(palavras)} palavras com tempo -> {meta_path.name} · "
          f"custo informado pela API: {custo} créditos")
    return meta


def cmd_efeito(a):
    """Efeito sonoro (Sound Effects): texto em inglês descrevendo o som -> mp3. Duração de 0,5 a 22 s."""
    corpo = {"text": a.descricao, "duration_seconds": a.duracao, "prompt_influence": a.influencia}
    if a.loop:
        corpo["loop"] = True
    req = urllib.request.Request(API + "/v1/sound-generation", method="POST",
                                 headers={"xi-api-key": chave(), "Content-Type": "application/json"},
                                 data=json.dumps(corpo).encode())
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            audio, custo = r.read(), r.headers.get("character-cost")
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs respondeu {e.code}: {e.read().decode(errors='replace')[:300]}")
    out = Path(a.o)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(audio)
    print(f"OK: {out} · {duracao(out):.1f} s · custo informado pela API: {custo or '-'}")


def cmd_gerar(a):
    texto = ler_texto(a.texto)
    if a.amostra:
        texto = texto[: a.amostra].rsplit(" ", 1)[0]
    gerar(texto, a.o, a.voz, a.modelo, a.velocidade, a.estabilidade, a.similaridade, a.estilo, a.idioma)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("vozes"); v.add_argument("--todas", action="store_true"); v.set_defaults(f=cmd_vozes)
    e = sub.add_parser("estimar"); e.add_argument("texto"); e.set_defaults(f=cmd_estimar)
    g = sub.add_parser("gerar")
    g.add_argument("texto"); g.add_argument("-o", required=True); g.add_argument("--voz", required=True)
    g.add_argument("--modelo", default="eleven_multilingual_v2")
    g.add_argument("--velocidade", type=float, default=1.0)
    g.add_argument("--estabilidade", type=float, default=0.5)
    g.add_argument("--similaridade", type=float, default=0.75)
    g.add_argument("--estilo", type=float, default=0.0)
    g.add_argument("--idioma", default="pt")
    g.add_argument("--amostra", type=int, default=0)
    g.set_defaults(f=cmd_gerar)
    x = sub.add_parser("efeito")
    x.add_argument("descricao"); x.add_argument("-o", required=True)
    x.add_argument("--duracao", type=float, default=20.0); x.add_argument("--influencia", type=float, default=0.5)
    x.add_argument("--loop", action="store_true")
    x.set_defaults(f=cmd_efeito)
    a = ap.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
