#!/usr/bin/env python3
"""Roteiro v2 (roteiro.json) -> narração por qualquer provedor de voz -> episode.json do motor.

Uso (a partir de motor/):
  python3 pipeline/narrar.py ROTEIRO --estimar         caracteres e duração estimada (não chama nenhum provedor)
  python3 pipeline/narrar.py ROTEIRO                   voz pelo provedor configurado + episode.json
  python3 pipeline/narrar.py ROTEIRO --tts elevenlabs  troca o provedor só nesta rodada (idem --stt)
  python3 pipeline/narrar.py ROTEIRO --audio x.mp3     áudio feito à mão: tempos pelo STT
  python3 pipeline/narrar.py ROTEIRO --mudo            sem voz: cada batida dura "duracao" (padrão 3 s)

Provedor: bloco "voz" do roteiro por cima de pipeline/voz/padrao.json (padrão: VoiceStudio local para TTS e STT).
Várias vozes: "vozes": {"radio": {...}} no roteiro e "falante": "radio" na batida; cada sequência de batidas com a mesma
voz vira um pedaço (num pedido só, se o provedor gera texto inteiro). Os pedaços são igualados em volume e masterizados.
Interfaces e provedores em pipeline/voz/ (elevenlabs, voicestudio, openai-compatível, whisper-local).
Saída em public/<slug>/<pasta>/: narration.(mp3|wav) + episode.json, lido pela composição "episodio".
O texto nunca muda aqui. As marcas de pausa ([leve], [longa]…) só dividem a batida em trechos para o motor.
Recap: batida com "recorte": {"episodio": N, "batida": B, "trecho": T} reaproveita o áudio já narrado do episódio N
(mesmo idioma), sem voz nova; o "texto" dela é o que foi dito lá (a legenda sai dele).
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import voz  # noqa: E402
from voice import (PAUSE_MARK, PAUSES, align, master, normalize, plain, segments,  # noqa: E402
                   sem_tags_audio, similarity, tokens, trim_edges)
from voz.numeros import por_extenso  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
LEAD = 0.1        # a cena troca um pouco antes da primeira palavra (s)
TAIL = 0.6        # respiro depois da última fala, antes do cartão final (s)
ENDCARD = 3.0     # cartão final (s)
SEM_FINAL = 1.0   # sem cartão final: segura o último quadro (s)
MIN_SIMILARIDADE = 0.82
TENTATIVAS = 3
SR = 48000


def texto_falado(batidas):
    """O texto que a voz lê: as batidas em sequência, sem marcas de cor nem de pausa (o recap não passa pela voz)."""
    return " ".join(falado(b) for b in batidas if b.get("texto") and not b.get("recorte"))


def falado(b):
    return " ".join(plain(PAUSE_MARK.sub(" ", b["texto"])).split())


def palavras_por_batida(batidas):
    """Para cada batida: as palavras com cor e o índice da primeira palavra de cada trecho."""
    out = []
    for b in batidas:
        ws, inicios = [], []
        for marcado, _pausa in segments(b.get("texto", "")):
            inicios.append(len(ws))
            ws += tokens(sem_tags_audio(marcado))
        out.append((ws, inicios))
    return out


def ffprobe_dur(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                                capture_output=True, text=True, check=True).stdout)


def ouvir(stt, audio, idioma):
    """Palavras ouvidas pelo STT, com os dígitos trocados pelas palavras faladas ("6" → "sechs"), dividindo o
    tempo entre elas. Sem isso, número escrito por extenso no roteiro parece fala errada."""
    out = []
    for w in stt.transcrever(audio, idioma):
        chave = re.sub(r"[^0-9]", "", w["word"])
        if chave and chave == re.sub(r"[.,:;!?]", "", w["word"]) and int(chave) < 1000:
            partes = por_extenso(int(chave), idioma)
            passo = (w["end"] - w["start"]) / len(partes)
            out += [{"word": p, "start": w["start"] + i * passo, "end": w["start"] + (i + 1) * passo} for i, p in enumerate(partes)]
        else:
            out.append(w)
    return out


def para_wav(src, dst):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(dst)], check=True)


def pausa_s(v, padrao):
    if v is None:
        return padrao
    return PAUSES[v] if isinstance(v, str) else float(v)


def cfg_da_batida(ep, base, b):
    """Voz da batida: o bloco "voz" do roteiro (narrador) com a voz do `falante` por cima (roteiro → "vozes").
    Batida de recap ("recorte") não tem voz: o áudio vem de um episódio anterior."""
    if b.get("recorte"):
        return {"recorte": b["recorte"]}
    extra = (ep.get("vozes") or {}).get(b.get("falante"), {}) if b.get("falante") else {}
    return {**base, **extra}


def recortar(rec, out, nome):
    """Recap: o áudio de uma batida de um episódio anterior, já narrado (sem voz nova, sem crédito gasto).
    rec = {"episodio": 1, "batida": 9, "trecho": 2}: batida contada a partir de 1 (como na folha de cenas), trecho a
    partir de 0 (opcional: o recorte começa nele). A pasta é a do episódio atual com o número trocado (ep02-de → ep01-de).
    Devolve (wav, palavras com tempo)."""
    sufixo = re.sub(r"^ep\d+", "", out.name)
    origem = out.parent / f"ep{rec['episodio']:02d}{sufixo}"
    epj = json.loads((origem / "episode.json").read_text())
    if not epj.get("audio"):
        sys.exit(f"recap: {origem.name} não tem narração (foi gerado com --mudo)")
    beat = epj["beats"][rec["batida"] - 1]
    t_trecho = beat["segmentStarts"][rec.get("trecho", 0)]
    ws = [w for w in beat["words"] if w["start"] >= t_trecho - 0.001]
    t0, t1 = max(ws[0]["start"] - 0.08, 0.0), ws[-1]["end"] + 0.15
    wav = out / "batidas" / f"{nome}.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t0:.3f}", "-to", f"{t1:.3f}", "-i", str(ROOT / "public" / epj["audio"]),
                    "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(wav)], check=True)
    normalize(wav)
    return wav, [{"word": w["text"], "start": w["start"] - t0, "end": w["end"] - t0} for w in ws]


def pedacos(ep, base):
    """Sequências de batidas com a mesma voz: [(cfg, [índices])]. Cada uma sai junta quando o provedor gera
    texto inteiro (mantém a entonação); senão, uma batida por pedido."""
    out = []
    for i, b in enumerate(ep["batidas"]):
        cfg = cfg_da_batida(ep, base, b)
        if out and out[-1][0] == cfg:
            out[-1][1].append(i)
        else:
            out.append((cfg, [i]))
    return out


FILTROS = {
    # voz saindo de um rádio: banda de telefonia/AM, um pouco de saturação e chiado baixo por baixo
    "radio": "highpass=f=300,lowpass=f=3400,acompressor=threshold=-18dB:ratio=3,volume=1.4",
}


def filtrar(wav, filtro):
    """Aplica o filtro de voz do falante (roteiro → vozes → "filtro") no WAV, mantendo duração e formato."""
    tmp = wav.with_suffix(".f.wav")
    af = FILTROS[filtro]
    if filtro == "radio":
        dur = ffprobe_dur(wav)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-f", "lavfi", "-t", str(dur), "-i",
                        "anoisesrc=color=pink:amplitude=0.012:seed=7", "-filter_complex",
                        f"[0]{af}[v];[1]highpass=f=800,lowpass=f=5000[n];[v][n]amix=inputs=2:duration=first:normalize=0",
                        "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", str(tmp)], check=True)
    else:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-af", af, "-ar", str(SR), "-ac", "1",
                        "-c:a", "pcm_s16le", str(tmp)], check=True)
    tmp.replace(wav)


def preparar(bruto, wav):
    """Áudio do provedor -> WAV 48 kHz mono, sem silêncio nas bordas e com o volume igual entre vozes.
    Devolve quantos segundos saíram do começo (as palavras andam junto)."""
    para_wav(bruto, wav)
    corte = trim_edges(wav)
    normalize(wav)
    return corte


def gerar_pedaco(nome, texto, cfg, tts, stt, pasta, seed):
    """Gera um pedaço (com cache) e devolve (wav, palavras ouvidas com tempo, nota do STT ou None)."""
    wav, meta = pasta / f"{nome}.wav", pasta / f"{nome}.json"
    chave = hashlib.sha1(json.dumps([texto, tts.chave(cfg), seed, cfg.get("filtro")]).encode()).hexdigest()
    m = json.loads(meta.read_text()) if meta.exists() else None
    if m and m["chave"] == chave and wav.exists():
        return wav, m["ouvidas"], m["nota"]
    # o cache é pelo conteúdo, não pelo nome: dividir ou juntar batidas muda o nome do pedaço (b01-29 → b01-33)
    # sem mudar o texto, e isso não pode gerar (nem cobrar) a voz de novo
    for outro in sorted(pasta.glob("*.json")):
        if outro == meta or outro.name.endswith(".palavras.json"):
            continue
        try:
            mo = json.loads(outro.read_text())
        except (json.JSONDecodeError, OSError):
            continue
        wo = outro.with_suffix(".wav")
        if isinstance(mo, dict) and mo.get("chave") == chave and wo.exists():
            wav.write_bytes(wo.read_bytes())
            meta.write_text(outro.read_text())
            print(f"  cache: {nome} = {outro.stem} (mesmo texto, voz e ajustes; sem gerar de novo)")
            return wav, mo["ouvidas"], mo["nota"]
    idioma = cfg.get("idioma", "pt")
    melhor = None
    for a in range(TENTATIVAS if tts.tem_seed else 1):
        lido = texto if getattr(tts, "aceita_tags", lambda _cfg: False)(cfg) else sem_tags_audio(texto)
        fala = tts.gerar(lido, pasta / f"{nome}.bruto", cfg, seed=seed + a)
        corte = preparar(fala.audio, wav)
        if fala.palavras:  # o provedor já mediu (ElevenLabs): sem STT, sem nova tentativa
            ouvidas, nota = fala.palavras, None
        else:
            ouvidas = ouvir(stt, wav, idioma)
            nota = similarity(sem_tags_audio(texto), ouvidas)
            corte = 0.0  # o STT ouviu o arquivo já cortado
        ouvidas = [{**w, "start": max(w["start"] - corte, 0.0), "end": max(w["end"] - corte, 0.0)} for w in ouvidas]
        if fala.palavras is None:
            Path(fala.audio).unlink(missing_ok=True)
        if melhor is None or (nota or 1.0) > (melhor[0] or 1.0):
            melhor = (nota, ouvidas, wav.read_bytes())
        if nota is None or nota >= MIN_SIMILARIDADE:
            break
    nota, ouvidas, audio = melhor
    wav.write_bytes(audio)
    if cfg.get("filtro"):
        filtrar(wav, cfg["filtro"])
    meta.write_text(json.dumps({"chave": chave, "nota": nota, "ouvidas": ouvidas}, ensure_ascii=False))
    return wav, ouvidas, nota


def narrar(ep, base, stt, out, pb):
    """Gera todos os pedaços, junta com as pausas e masteriza. Devolve (wav, tempo de cada palavra)."""
    pasta = out / "batidas"
    pasta.mkdir(exist_ok=True)
    params, blocos, tempos, cursor = None, [], [], 0.0
    # nome e seed de cada pedaço contam só as batidas de voz: pôr um recap no começo não invalida o cache já pago
    nv, conta = [], 0
    for b in ep["batidas"]:
        nv.append(conta)
        conta += 0 if b.get("recorte") else 1
    for cfg, idx in pedacos(ep, base):
        tts = None if cfg.get("recorte") else voz.obter_tts(cfg["tts"])
        quem = "recap" if tts is None else ep["batidas"][idx[0]].get("falante") or "narrador"
        grupos = [idx] if tts is None or tts.texto_inteiro else [[i] for i in idx]
        for g in grupos:
            texto = " ".join(falado(ep["batidas"][i]) for i in g)
            if tts is None:
                nome = f"r{g[0] + 1:02d}"
                wav, ouvidas = recortar(cfg["recorte"], out, nome)
                nota = similarity(sem_tags_audio(texto), ouvidas)
            else:
                nome = f"b{nv[g[0]] + 1:02d}" + (f"-{nv[g[-1]] + 1:02d}" if len(g) > 1 else "")
                wav, ouvidas, nota = gerar_pedaco(nome, texto, cfg, tts, stt, pasta, cfg.get("seed", 0) + nv[g[0]] * 100)
            ws = [w for i in g for w in pb[i][0]]
            with wave.open(str(wav)) as src:
                params = params or src.getparams()
                blocos.append(src.readframes(src.getnframes()))
                dur = src.getnframes() / src.getframerate()
            tempos += [(cursor + s, cursor + e) for s, e in align(ws, ouvidas, dur)]
            aviso = "" if nota is None or nota >= MIN_SIMILARIDADE else "  <-- confira esta fala"
            nota_txt = "API" if nota is None else f"{nota:.2f}"
            print(f"{nome:<8} {dur:5.2f}s  {tts.nome if tts else 'recorte':<11} {quem:<9} STT {nota_txt}  {texto[:45]}{aviso}")
            gap = pausa_s(ep["batidas"][g[-1]].get("pausa"), base.get("pausa", 0.18))
            blocos.append(b"\x00" * (round(gap * params.framerate) * params.sampwidth * params.nchannels))
            cursor += dur + gap
    saida = out / "narration.wav"
    with wave.open(str(saida), "wb") as dst:
        dst.setparams(params)
        dst.writeframes(b"".join(blocos))
    master(saida)
    return saida, tempos


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("roteiro")
    ap.add_argument("--estimar", action="store_true")
    ap.add_argument("--audio")
    ap.add_argument("--mudo", action="store_true")
    ap.add_argument("--tts")
    ap.add_argument("--stt")
    a = ap.parse_args()

    ep = json.loads(Path(a.roteiro).read_text())
    slug, n = ep["slug"], ep["episodio"]
    batidas = ep["batidas"]
    texto = texto_falado(batidas)
    if a.estimar:
        print(f"{len(texto)} caracteres · {len(texto.split())} palavras · ~{len(texto.split()) / 3.2:.0f} s a 3,2 palavras/s "
              f"(~{len(texto.split()) / 3.9:.0f} s a 3,9)")
        return

    cfg = voz.configuracao(ep.get("voz"))
    cfg_idioma = ep.get("idioma", cfg.get("idioma", "pt"))
    cfg["idioma"] = cfg_idioma
    if a.tts:
        cfg["tts"] = a.tts
    if a.stt:
        cfg["stt"] = a.stt
    pasta = ep.get("pasta", f"ep{n:02d}")
    out = ROOT / "public" / slug / pasta
    out.mkdir(parents=True, exist_ok=True)
    pb = palavras_por_batida(batidas)
    todas = [w for ws, _ in pb for w in ws]
    audio = None

    if a.mudo:
        tempos, cursor = [], 0.0
        for b, (ws, _) in zip(batidas, pb):
            d = b.get("duracao", 3.0)
            passo = d / max(len(ws), 1)
            tempos += [(cursor + i * passo, cursor + (i + 1) * passo) for i in range(len(ws))]
            cursor += d
        fim_fala = cursor
    else:
        stt = voz.obter_stt(cfg["stt"], cfg)
        if a.audio:
            src = Path(a.audio)
            arq = out / f"narration{src.suffix}"
            shutil.copyfile(src, arq)
            tempos = align(todas, ouvir(stt, arq, cfg["idioma"]), ffprobe_dur(arq))
            print(f"voz: arquivo pronto · tempos pelo STT {stt.nome}")
        else:
            arq, tempos = narrar(ep, cfg, stt, out, pb)
            vozes = sorted({b.get("falante") or "narrador" for b in batidas})
            print(f"voz: {', '.join(vozes)} · STT {stt.nome}")
        fim_fala = tempos[-1][1]
        audio = f"{slug}/{pasta}/{arq.name}"
        print(f"áudio: {ffprobe_dur(arq):.1f} s -> {arq}")

    beats, k, fim_anterior = [], 0, 0.0
    for i, (b, (ws, inicios)) in enumerate(zip(batidas, pb)):
        ts = tempos[k:k + len(ws)]
        k += len(ws)
        palavras = [{**w, "start": round(s, 3), "end": round(e, 3)} for w, (s, e) in zip(ws, ts)]
        start = 0.0 if i == 0 else max(fim_anterior, ts[0][0] - LEAD)
        beats.append({"start": round(start, 3), "end": round(ts[-1][1], 3),
                      "segmentStarts": [round(ts[j][0] if j else start, 3) for j in inicios],
                      "scene": b["cena"], "words": palavras})
        fim_anterior = ts[-1][1]
    print(f"\n{'#':>2} {'início':>6} {'dur':>5} {'car/s':>5}  texto")
    for i, bt in enumerate(beats):
        prox = beats[i + 1]["start"] if i + 1 < len(beats) else bt["end"]
        d = prox - bt["start"]
        txt = " ".join(w["text"] for w in bt["words"])
        aviso = "  <-- mais de 5 s parada" if d > 5 else ""
        print(f"{i + 1:>2} {bt['start']:6.2f} {d:5.2f} {len(txt) / max(bt['end'] - bt['start'], 0.01):5.1f}  {txt[:60]}{aviso}")

    final = ep.get("cartaoFinal")
    endcard_start = fim_fala + (TAIL if final else SEM_FINAL)
    total = endcard_start + (ENDCARD if final else 0)
    (out / "episode.json").write_text(json.dumps({
        "version": 2, "slug": slug, "idioma": cfg_idioma, "series": ep.get("serie", slug), "episode": n, "clock": ep.get("relogio"), **({"tema": ep["tema"]} if ep.get("tema") else {}), **{k: ep[k] for k in ("transicao", "transicaoDur", "transicaoFinal") if k in ep},
        "fps": FPS, "audio": audio, "endcardStart": round(endcard_start, 3),
        "durationInFrames": int(total * FPS) + 1, "endcard": final, "beats": beats,
    }, ensure_ascii=False, indent=1))
    print(f"\nfala: {fim_fala:.1f} s · total: {total:.1f} s -> {out / 'episode.json'}")


if __name__ == "__main__":
    main()
