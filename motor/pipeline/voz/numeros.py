"""Números por extenso (0–999) para comparar o que o STT ouviu ("6") com o texto do roteiro ("sechs").
Devolve a lista de palavras como o roteiro escreveria; o alemão junta tudo numa palavra ("einundzwanzig")."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from voice import number_words as _pt  # noqa: E402

DE_U = "null eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn".split()
DE_D = "_ _ zwanzig dreißig vierzig fünfzig sechzig siebzig achtzig neunzig".split()
EN_U = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
EN_D = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
ES_U = ("cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete "
        "dieciocho diecinueve veinte veintiuno veintidós veintitrés veinticuatro veinticinco veintiséis veintisiete "
        "veintiocho veintinueve").split()
ES_D = "_ _ veinte treinta cuarenta cincuenta sesenta setenta ochenta noventa".split()
ES_C = "_ ciento doscientos trescientos cuatrocientos quinientos seiscientos setecientos ochocientos novecientos".split()


def _de(n):
    if n < 20:
        return DE_U[n] if n != 1 else "eins"
    if n < 100:
        d, u = divmod(n, 10)
        return (("ein" if u == 1 else DE_U[u]) + "und" if u else "") + DE_D[d]
    c, r = divmod(n, 100)
    return ("ein" if c == 1 else DE_U[c]) + "hundert" + (_de(r) if r else "")


def _en(n):
    if n < 20:
        return [EN_U[n]]
    if n < 100:
        d, u = divmod(n, 10)
        return [EN_D[d] + (f"-{EN_U[u]}" if u else "")]
    c, r = divmod(n, 100)
    return [EN_U[c], "hundred"] + (_en(r) if r else [])


def _es(n):
    if n < 30:
        return [ES_U[n]]
    if n < 100:
        d, u = divmod(n, 10)
        return [ES_D[d]] + (["y", ES_U[u]] if u else [])
    if n == 100:
        return ["cien"]
    c, r = divmod(n, 100)
    return [ES_C[c]] + (_es(r) if r else [])


def por_extenso(n, idioma):
    lang = idioma[:2]
    if lang == "pt":
        return _pt(n)
    if lang == "de":
        return [_de(n)]
    if lang == "en":
        return _en(n)
    if lang == "es":
        return _es(n)
    return [str(n)]
