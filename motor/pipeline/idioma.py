#!/usr/bin/env python3
"""Versões de um roteiro em outros idiomas. O roteiro mestre (roteiro.json) é escrito e aprovado em pt-BR;
o vídeo sai no idioma da versão (roteiro.<idioma>.json), com a mesma estrutura de cenas.

Uso (a partir de motor/):
  python3 pipeline/idioma.py extrair  MESTRE --para de [-o traducao.de.json]   tabela plana de textos a transcriar
  python3 pipeline/idioma.py aplicar  MESTRE traducao.de.json [-o roteiro.de.json]
  python3 pipeline/idioma.py verificar MESTRE roteiro.de.json

A tabela tem uma linha por texto que aparece ou é falado: {"chave", "pt", "<idioma>"}. Só os campos visíveis entram
(texto, título, rótulo, valor, pergunta…); ids, ícones, cenários e números ficam iguais. As marcas de pausa ([leve])
e de destaque (*amarelo*, _vermelho_) precisam continuar na versão: os trechos comandam quem entra e quando.
"""
import argparse
import copy
import json
import re
import sys
from pathlib import Path

VISIVEIS = {"texto", "titulo", "sub", "rotulo", "valor", "pergunta", "chamada", "dia", "prefixo", "sufixo", "serie"}
PAUSA = re.compile(r"\[(nenhuma|curta|leve|media|longa|dramatica)\]")
DESTAQUE = re.compile(r"[*_][^*_]+[*_]")


def textos(no, caminho=""):
    """(chave, valor) de cada texto visível, em ordem."""
    if isinstance(no, dict):
        for k, v in no.items():
            if k.startswith("_") or k in ("voz", "status"):
                continue
            c = f"{caminho}.{k}" if caminho else k
            if isinstance(v, str) and k in VISIVEIS and v.strip():
                yield c, v
            else:
                yield from textos(v, c)
    elif isinstance(no, list):
        for i, v in enumerate(no):
            yield from textos(v, f"{caminho}.{i}")


def pegar(no, chave):
    for p in chave.split("."):
        no = no[int(p)] if isinstance(no, list) else no[p]
    return no


def definir(no, chave, valor):
    partes = chave.split(".")
    for p in partes[:-1]:
        no = no[int(p)] if isinstance(no, list) else no[p]
    no[partes[-1]] = valor


def forma(no):
    """Estrutura sem os textos visíveis (para comparar mestre e versão)."""
    if isinstance(no, dict):
        return {k: ("<texto>" if isinstance(v, str) and k in VISIVEIS else forma(v)) for k, v in no.items()
                if not k.startswith("_") and k not in ("voz", "status", "idioma", "pasta")}
    if isinstance(no, list):
        return [forma(v) for v in no]
    return no


def cmd_extrair(a):
    m = json.loads(Path(a.mestre).read_text())
    linhas = [{"chave": c, "pt": v, a.para: ""} for c, v in textos(m)]
    saida = Path(a.o or Path(a.mestre).with_name(f"traducao.{a.para}.json"))
    saida.write_text(json.dumps({"idioma": a.para, "linhas": linhas}, ensure_ascii=False, indent=1))
    print(f"{len(linhas)} textos -> {saida}")


def cmd_aplicar(a):
    m = json.loads(Path(a.mestre).read_text())
    t = json.loads(Path(a.traducao).read_text())
    lang = t["idioma"]
    vazias = [l["chave"] for l in t["linhas"] if not l.get(lang, "").strip()]
    if vazias:
        sys.exit(f"faltam {len(vazias)} traduções: {', '.join(vazias[:8])}…")
    v = copy.deepcopy(m)
    for l in t["linhas"]:
        definir(v, l["chave"], l[lang])
    v["idioma"] = lang
    v["pasta"] = f"{m.get('pasta', 'ep%02d' % m['episodio'])}-{lang}"
    v.setdefault("voz", {})["idioma"] = lang
    v["_mestre"] = Path(a.mestre).name
    saida = Path(a.o or Path(a.mestre).with_name(f"roteiro.{lang}.json"))
    saida.write_text(json.dumps(v, ensure_ascii=False, indent=1))
    print(f"-> {saida}")
    a.versao = str(saida)
    cmd_verificar(a)


def cmd_verificar(a):
    m = json.loads(Path(a.mestre).read_text())
    v = json.loads(Path(a.versao).read_text())
    problemas, avisos = [], []
    if forma(m) != forma(v):
        problemas.append("a estrutura mudou (cenas, personagens, campos ou números diferentes do mestre)")
    for i, (bm, bv) in enumerate(zip(m["batidas"], v["batidas"]), 1):
        pm, pv = len(PAUSA.findall(bm.get("texto", ""))), len(PAUSA.findall(bv.get("texto", "")))
        if pm != pv:
            problemas.append(f"batida {i}: {pm} marcas de pausa no mestre, {pv} na versão (os trechos comandam entra/muda)")
        if len(DESTAQUE.findall(bv.get("texto", ""))) > 1:
            problemas.append(f"batida {i}: mais de um destaque")
        if bool(DESTAQUE.search(bm.get("texto", ""))) != bool(DESTAQUE.search(bv.get("texto", ""))):
            avisos.append(f"batida {i}: o destaque sumiu ou apareceu na versão")
        for w in re.sub(r"[*_\[\]]", " ", bv.get("texto", "")).split():
            if len(w.strip(".,:;!?…\"“”„")) > 16:
                avisos.append(f"batida {i}: palavra longa para a legenda ({w}); se puder, troque")
    iguais = [c for (c, x), (_, y) in zip(textos(m), textos(v)) if x == y and not re.fullmatch(r"[\d\s.,:%°+\-–/]+", x)]
    if iguais:
        avisos.append(f"{len(iguais)} textos iguais ao mestre (nome próprio está ok): {', '.join(iguais[:6])}")
    pal = lambda r: sum(len(PAUSA.sub(" ", b.get("texto", "")).split()) for b in r["batidas"])  # noqa: E731
    car = lambda r: sum(len(PAUSA.sub(" ", b.get("texto", ""))) for b in r["batidas"])  # noqa: E731
    print(f"mestre: {pal(m)} palavras, {car(m)} caracteres · versão ({v.get('idioma')}): {pal(v)} palavras, "
          f"{car(v)} caracteres ({car(v) / max(car(m), 1):.0%} do mestre)")
    for x in avisos:
        print("  aviso:", x)
    for x in problemas:
        print("  PROBLEMA:", x)
    if problemas:
        sys.exit(1)
    print("ok: mesma estrutura, mesmos trechos")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("extrair"); e.add_argument("mestre"); e.add_argument("--para", required=True); e.add_argument("-o")
    e.set_defaults(f=cmd_extrair)
    p = sub.add_parser("aplicar"); p.add_argument("mestre"); p.add_argument("traducao"); p.add_argument("-o")
    p.set_defaults(f=cmd_aplicar)
    v = sub.add_parser("verificar"); v.add_argument("mestre"); v.add_argument("versao"); v.set_defaults(f=cmd_verificar)
    a = ap.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
