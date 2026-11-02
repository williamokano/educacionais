#!/usr/bin/env python3
"""Narração local: roteiro (JSON) -> fala por batida (VoiceStudio TTS) -> timestamps por palavra (VoiceStudio STT).

Uso: python3 pipeline/voice.py benchmark/dia-48/ep01.json

Gera em public/<serie>/epNN/:
  beat_NN_K.wav    fala de cada trecho da batida (cache: só regenera se texto/tom/velocidade mudarem)
  narration.wav    todas as batidas concatenadas com uma pausa curta
  episode.json     batidas com início/fim e legenda palavra a palavra, lido pelo Remotion
"""
import array
import difflib
import hashlib
import json
import re
import subprocess
import sys
import unicodedata
import urllib.error
import urllib.request
import wave
from pathlib import Path

API = "http://127.0.0.1:3900"
FPS = 30
# silêncio (s) depois da batida ("pausa") ou dentro dela ("Dia 41. [longa] Jakob…")
PAUSES = {"nenhuma": 0.0, "curta": 0.08, "leve": 0.18, "media": 0.3, "longa": 0.5, "dramatica": 0.75}
EDGE_KEEP = 0.04     # o TTS deixa ~0,2 s mudo nas bordas; corta e mantém só isto (s)
TARGET_RMS = 3300    # volume médio alvo das falas (~ -20 dBFS)
PEAK_LIMIT = 30000   # nunca passar disto no pico (evita estourar)
TAIL = 0.6           # respiro depois da última frase antes do cartão final (s)
ENDCARD = 3.0        # duração do cartão final (s)
MIN_SIMILARITY = 0.82
MAX_ATTEMPTS = 3

ROOT = Path(__file__).resolve().parent.parent


def plain(text):
    return text.replace("*", "").replace("_", "")


def norm(word):
    word = unicodedata.normalize("NFKD", word.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in word if not unicodedata.combining(c)))


def tokens(text):
    """Separa o texto marcado em palavras com cor: *amarelo*, _vermelho_ (podem cobrir várias palavras)."""
    out, color = [], None
    for raw in text.split():
        start = color
        if raw.startswith("*"):
            start = color = "yellow"
        elif raw.startswith("_"):
            start = color = "red"
        word = raw.replace("*", "").replace("_", "")
        if raw.rstrip(".,:;!?").endswith(("*", "_")):
            color = None
        out.append({"text": word, "color": start})
    return out


UNITS = "zero um dois tres quatro cinco seis sete oito nove dez onze doze treze quatorze quinze dezesseis dezessete dezoito dezenove".split()
TENS = "_ _ vinte trinta quarenta cinquenta sessenta setenta oitenta noventa".split()


def number_words(n):
    """Por extenso (0–999), já normalizado; o STT escreve '41' onde o roteiro diz 'quarenta e um'."""
    if n < 20:
        return [UNITS[n]]
    if n < 100:
        return [TENS[n // 10]] + (["e", UNITS[n % 10]] if n % 10 else [])
    if n == 100:
        return ["cem"]
    hundreds = "_ cento duzentos trezentos quatrocentos quinhentos seiscentos setecentos oitocentos novecentos".split()
    return [hundreds[n // 100]] + (["e", *number_words(n % 100)] if n % 100 else [])


def expand_heard(heard):
    """Troca dígitos ouvidos pelas palavras faladas, dividindo o tempo entre elas."""
    out = []
    for w in heard:
        key = norm(w["word"])
        if key.isdigit() and int(key) < 1000:
            parts = number_words(int(key))
            step = (w["end"] - w["start"]) / len(parts)
            out += [{"word": p, "start": w["start"] + i * step, "end": w["start"] + (i + 1) * step}
                    for i, p in enumerate(parts)]
        else:
            out.append(w)
    return out


def curl(args):
    result = subprocess.run(["curl", "-sS", "-g", "--fail-with-body", *args], capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"VoiceStudio falhou: {result.stderr.decode()} {result.stdout[:500]!r}")
    return result.stdout


DRAMA3_API = "http://127.0.0.1:8010"  # ~/.local/share/webseries-engines/drama3/servir.sh


def http_post_json(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{url} falhou ({e.code}): {e.read()[:500]!r}") from None


def tts(text, voice, profile_id, seed, dest):
    # Inicial maiúscula: o modelo emenda o texto à transcrição da referência (que termina em ponto); um trecho
    # começando minúsculo ("e começa a puxar…") fazia o ponto ser lido em voz alta ("Ponto. E começa…").
    text = text[:1].upper() + text[1:]
    if voice["engine"] == "drama3":
        # Fish Audio Drama 3: clona a partir de uma referência fixa (áudio + transcrição); não usa os perfis de tom
        ref = voice["referencia"]
        dest.write_bytes(http_post_json(f"{DRAMA3_API}/v1/audio/speech", {
            "input": text, "references": [{"audio_path": str(ROOT / ref["audio"]), "text": ref["texto"]}],
        }))
        return
    if voice.get("referencias"):
        # referência limpa (sem o ronco da sala) enviada direto, no lugar do perfil — o clone copia o ambiente
        # da gravação junto com a voz; ver vozes/limpas/LIMPEZA.txt
        base = ROOT / voice["referencias"] / profile_id
        voz = ["-F", f"ref_audio=@{base}.wav", "-F", f"ref_text={base.with_suffix('.txt').read_text().strip()}"]
    else:
        voz = ["-F", f"profile_id={profile_id}"]
    dest.write_bytes(curl([
        f"{API}/generate", "-F", f"text={text}", "-F", f"language={voice['language']}",
        # motor sempre explícito: sem ele vale o motor ativo no VoiceStudio, que muda ao usar outros motores
        "-F", f"engine={voice['engine']}",
        *voz, "-F", f"speed={voice['speed']}", "-F", f"seed={seed}",
        # áudio cru: o preset "broadcast" padrão realça agudos e comprime — somado ao ganho da masterização
        # virava chiado/sibilância; a cadeia de tratamento é só a de master()
        "-F", f"effect_preset={EFFECT_PRESET}",
    ]))


def trim_edges(path):
    """Corta o silêncio das bordas da fala; devolve quantos segundos saíram do início."""
    with wave.open(str(path)) as src:
        params = src.getparams()
        samples = array.array("h", src.readframes(src.getnframes()))
    threshold = max(abs(s) for s in samples) * 0.05
    loud = [i for i, s in enumerate(samples) if abs(s) > threshold]
    keep = int(EDGE_KEEP * params.framerate)
    first, last = max(loud[0] - keep, 0), min(loud[-1] + keep, len(samples) - 1)
    with wave.open(str(path), "wb") as dst:
        dst.setparams(params)
        dst.writeframes(samples[first:last + 1].tobytes())
    return first / params.framerate


STT_PYTHON = Path.home() / ".local/share/webseries-engines/stt/.venv/bin/python"
_stt_local = None


def voicestudio_aberto():
    try:
        with urllib.request.urlopen(f"{API}/health", timeout=3):
            return True
    except OSError:
        return False


def stt_local(path, language):
    """Whisper local num processo persistente (pipeline/stt_worker.py) — carrega o modelo uma vez só."""
    global _stt_local
    if _stt_local is None:
        _stt_local = subprocess.Popen([str(STT_PYTHON), "-I", "-u", str(ROOT / "pipeline" / "stt_worker.py")],
                                      stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        json.loads(_stt_local.stdout.readline())  # {"pronto": true}
    _stt_local.stdin.write(json.dumps({"path": str(path), "language": language}) + "\n")
    _stt_local.stdin.flush()
    resposta = json.loads(_stt_local.stdout.readline())
    if "error" in resposta:
        raise RuntimeError(f"STT local falhou: {resposta['error']}")
    return resposta["words"]


def stt(path, language):
    if voicestudio_aberto():
        words = json.loads(curl([
            f"{API}/v1/audio/transcriptions", "-F", f"file=@{path}", "-F", f"language={language}",
            "-F", "response_format=verbose_json", "-F", "timestamp_granularities=word",
        ])).get("words", [])
    else:
        words = stt_local(path, language)
    return expand_heard([w for w in words if norm(w["word"])])


PONTUACAO_FALADA = {"ponto", "virgula", "pontoevirgula", "doispontos", "reticencias"}


def similarity(text, heard):
    # pontuação lida em voz alta ("Ponto. E começa…") é defeito mesmo que o resto bata
    ditas = {norm(w["word"]) for w in heard} & PONTUACAO_FALADA
    if ditas - {norm(w) for w in text.split()}:
        return 0.0
    return difflib.SequenceMatcher(
        None, [norm(w) for w in text.split()], [norm(w["word"]) for w in heard], autojunk=False).ratio()


def duration(path):
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def align(script_words, heard, total):
    """Dá tempo a cada palavra do roteiro usando as palavras ouvidas pelo STT; o que não casar é interpolado."""
    a = [norm(w["text"]) for w in script_words]
    b = [norm(w["word"]) for w in heard]
    times = [None] * len(a)
    for block in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(block.size):
            h = heard[block.b + k]
            times[block.a + k] = (h["start"], h["end"])
    # interpola trechos sem correspondência (ex.: "quarenta e um" ouvido como "41")
    i = 0
    while i < len(times):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(times) and times[j] is None:
            j += 1
        left = times[i - 1][1] if i > 0 else 0.0
        right = times[j][0] if j < len(times) else total
        weights = [max(len(a[k]), 1) for k in range(i, j)]
        span, acc = max(right - left, 0.05), left
        for k, wgt in zip(range(i, j), weights):
            step = span * wgt / sum(weights)
            times[k] = (acc, acc + step)
            acc += step
        i = j
    return times


PAUSE_MARK = re.compile(r"\s*\[(" + "|".join(PAUSES) + r")\]\s*")
# tags de áudio do Eleven v3/v4 ([whispers], [speaks softly]): só a voz que aceita lê; legenda e STT nunca
AUDIO_TAG = re.compile(r"\s*\[(?!(?:" + "|".join(PAUSES) + r")\])[^\[\]]+\]\s*")


def sem_tags_audio(text):
    return " ".join(AUDIO_TAG.sub(" ", text).split())


def segments(text):
    """'Dia 41. [longa] Jakob está sozinho.' -> [('Dia 41.', 'longa'), ('Jakob está sozinho.', None)]"""
    parts = PAUSE_MARK.split(text.strip())
    return [(parts[i], parts[i + 1] if i + 1 < len(parts) else None) for i in range(0, len(parts), 2)]


def normalize(path):
    """Mesmo volume médio para todas as falas — os clones de cada tom saem com níveis bem diferentes."""
    with wave.open(str(path)) as src:
        params = src.getparams()
        samples = array.array("h", src.readframes(src.getnframes()))
    rms = (sum(s * s for s in samples) / len(samples)) ** 0.5
    gain = min(TARGET_RMS / max(rms, 1.0), PEAK_LIMIT / max(max(abs(s) for s in samples), 1))
    with wave.open(str(path), "wb") as dst:
        dst.setparams(params)
        dst.writeframes(array.array("h", (int(s * gain) for s in samples)).tobytes())


_versions = None


def profile_version(profile_id):
    """Versão do áudio de referência do perfil (muda quando a voz é regravada no VoiceStudio)."""
    global _versions
    if _versions is None:
        _versions = {p["id"]: p.get("audio_url", "") for p in json.loads(curl([f"{API}/profiles"]))}
    return _versions.get(profile_id, "")


def voice_version(voice, profile_id):
    """Identidade da voz de referência: muda quando a voz é regravada (perfil do VoiceStudio ou arquivo do Drama 3)."""
    if voice["engine"] == "drama3":
        ref = voice["referencia"]
        return hashlib.sha1((ROOT / ref["audio"]).read_bytes() + ref["texto"].encode()).hexdigest()
    if voice.get("referencias"):
        base = ROOT / voice["referencias"] / profile_id
        return hashlib.sha1(base.with_suffix(".wav").read_bytes() + base.with_suffix(".txt").read_bytes()).hexdigest()
    return profile_version(profile_id)


def speak(text, voice, profile_id, speed, seed, wav):
    """Gera um trecho (com cache), corta as bordas, normaliza; devolve (palavras ouvidas, similaridade)."""
    meta = wav.with_suffix(".json")
    # a versão do áudio de referência entra na chave: regravar a voz invalida o cache
    key = hashlib.sha1(json.dumps([text, voice["language"], profile_id, voice_version(voice, profile_id), speed,
                                   EDGE_KEEP, TARGET_RMS, EFFECT_PRESET, voice["engine"]]).encode()).hexdigest()
    cached = json.loads(meta.read_text()) if meta.exists() else None
    if cached and cached["key"] == key and wav.exists():
        heard = expand_heard(cached["heard"])
        return heard, similarity(text, heard)

    params = {**voice, "speed": speed}
    best = None
    for attempt in range(MAX_ATTEMPTS):
        tts(text, params, profile_id, seed + attempt, wav)
        heard = stt(wav, voice["language"])
        score = similarity(text, heard)
        if best is None or score > best[0]:
            best = (score, heard, wav.read_bytes())
        if score >= MIN_SIMILARITY:
            break
    score, heard, audio = best
    wav.write_bytes(audio)
    lead = trim_edges(wav)
    normalize(wav)
    heard = [{**w, "start": max(w["start"] - lead, 0.0), "end": max(w["end"] - lead, 0.0)} for w in heard]
    meta.write_text(json.dumps({"key": key, "heard": heard, "score": score}, ensure_ascii=False))
    return heard, score


EFFECT_PRESET = "raw"  # pedido ao VoiceStudio (ver tts())
LOUDNESS = -16.0     # LUFS integrado: -14 subia demais o chiado; -16 ainda fica no padrão de vídeo curto
TRUE_PEAK = -1.5     # dBTP
# corta graves inúteis, suaviza "s"/"x" (de-esser) e comprime de leve antes de normalizar o volume
TRATAMENTO = "highpass=f=70,deesser=i=0.5:m=0.5:f=0.5,acompressor=threshold=-20dB:ratio=2:attack=8:release=120"


def master(path):
    """Tratamento + loudness final da narração (EBU R128, duas passadas). Os tempos continuam iguais."""
    path = str(path)
    alvo = f"I={LOUDNESS}:TP={TRUE_PEAK}:LRA=11"
    medido = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af",
                             f"{TRATAMENTO},loudnorm={alvo}:print_format=json", "-f", "null", "-"],
                            capture_output=True, text=True).stderr
    m = json.loads(medido[medido.rindex("{"):medido.rindex("}") + 1])
    with wave.open(path) as w:
        rate = w.getframerate()
    tmp = path + ".master.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-af",
                    f"{TRATAMENTO},loudnorm={alvo}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
                    f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true",
                    "-ar", str(rate), "-c:a", "pcm_s16le", tmp], check=True)
    Path(tmp).replace(path)


def silence(params, seconds):
    return b"\x00" * (round(seconds * params.framerate) * params.sampwidth * params.nchannels)


def from_v2(ep):
    """Roteiro v2 (em português: batidas/texto/cena/voz) -> formato interno usado abaixo."""
    if "batidas" not in ep:
        return ep
    voz = ep["voz"]
    return {
        "version": 2,
        "series": ep["serie"],
        "episode": ep["episodio"],
        "clock": ep.get("relogio"),
        "endcard": ep["cartaoFinal"],
        "voice": {"language": voz["idioma"], "speed": voz["velocidade"], "seed": voz["seed"], "tons": voz["tons"],
                  "engine": voz.get("motor", "omnivoice"), "referencia": voz.get("referencia"),
                  "referencias": voz.get("referencias")},
        "beats": [{**b, "text": b["texto"], "scene": b["cena"]} for b in ep["batidas"]],
    }


def main(script_path):
    script_path = Path(script_path).resolve()
    ep = from_v2(json.loads(script_path.read_text()))
    slug = script_path.parent.name
    out = ROOT / "public" / slug / f"ep{ep['episode']:02d}"
    out.mkdir(parents=True, exist_ok=True)
    voice = {"engine": "omnivoice", **ep["voice"]}

    beats, cursor, params = [], 0.0, None
    narration = []  # bytes de áudio na ordem, já com as pausas
    for n, beat in enumerate(ep["beats"], 1):
        tone = beat.get("tom", "narrador")
        profile_id = voice["tons"][tone]
        speed = beat.get("velocidade", voice["speed"])
        words_out, beat_start, worst, starts = [], cursor, 1.0, []

        for k, (marked, inner_pause) in enumerate(segments(beat["text"])):
            starts.append(round(cursor, 3))
            text = plain(marked)
            wav = out / f"beat_{n:02d}_{k}.wav"
            heard, score = speak(text, voice, profile_id, speed, voice["seed"] + n * 100 + k * 10, wav)
            worst = min(worst, score)
            dur = duration(wav)
            words = tokens(marked)
            for w, (s, e) in zip(words, align(words, heard, dur)):
                words_out.append({**w, "start": round(cursor + s, 3), "end": round(cursor + e, 3)})
            with wave.open(str(wav)) as src:
                params = params or src.getparams()
                assert src.getparams()[:3] == params[:3], f"formato diferente em {wav}"
                narration.append(src.readframes(src.getnframes()))
            cursor += dur
            gap = PAUSES[inner_pause] if inner_pause else PAUSES[beat.get("pausa", "curta")]
            narration.append(silence(params, gap))
            speech_end = cursor
            cursor += gap

        flag = "" if worst >= MIN_SIMILARITY else "  <-- confira esta fala"
        print(f"batida {n:02d}  {speech_end - beat_start:5.2f}s  {tone:<10} similaridade {worst:.2f}  {plain(PAUSE_MARK.sub(' ', beat['text']))[:55]}{flag}")
        beats.append({"start": round(beat_start, 3), "end": round(speech_end, 3), "segmentStarts": starts,
                      "scene": beat["scene"], "words": words_out})

    with wave.open(str(out / "narration.wav"), "wb") as dst:
        dst.setparams(params)
        dst.writeframes(b"".join(narration))
    master(out / "narration.wav")

    speech_end = beats[-1]["end"]
    total = speech_end + TAIL + ENDCARD
    (out / "episode.json").write_text(json.dumps({
        "version": ep.get("version", 1),
        "clock": ep.get("clock"),
        "series": ep["series"],
        "episode": ep["episode"],
        "fps": FPS,
        "audio": f"{slug}/ep{ep['episode']:02d}/narration.wav",
        "endcardStart": round(speech_end + TAIL, 3),
        "durationInFrames": int(total * FPS) + 1,
        "endcard": ep["endcard"],
        "beats": beats,
    }, ensure_ascii=False, indent=1))
    print(f"\nnarração: {speech_end:.1f}s · total com cartão final: {total:.1f}s -> {out / 'episode.json'}")


if __name__ == "__main__":
    main(sys.argv[1])
