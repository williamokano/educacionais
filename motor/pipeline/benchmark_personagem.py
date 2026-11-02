#!/usr/bin/env python3
"""Vídeo benchmark de um personagem: passa por todas as ações, vistas, deslocamentos, transições e expressões
no pipeline real (composição "episodio": câmera, continuidade de pose, legenda), num estúdio com régua de altura.

Uso (a partir de motor/):
  python3 pipeline/benchmark_personagem.py nina [--look padrao] [--so-roteiro]

Saída: benchmark/personagens/<id>.json (roteiro) → public/benchmark/<id>/episode.json
       → out/folhas/<id>_benchmark.mp4 (mudo, 1080×1920). A legenda de cada batida diz o que está sendo testado.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = 2.2  # s por batida

# ações de frente, em sequência no mesmo plano (testa a transição de pose entre batidas)
FRENTE = ["em-pe", "olhando-em-volta", "acenando", "gesticulando", "pensando", "bracos-cruzados", "apontando",
          "mao-erguida", "olhando-celular", "segurando", "mao-estendida", "tapando-ouvidos", "negando-com-a-cabeca",
          "susto", "comemorando", "encostado", "sentado", "agachado"]
EXPRESSOES = ["neutro", "alerta", "cansado", "concentrado", "tenso", "medo",
              "serio", "alivio", "suplicante", "raiva", "dor", "sorriso", "preocupado"]


def rotulo(acao):
    return acao.replace("-", " ")


def roteiro(pid, look):
    p = lambda **k: {"id": pid, "look": look, "expressao": "neutro", **k}  # noqa: E731
    b = []
    # 1. entra andando de perfil, vira de frente ao chegar
    b.append({"texto": "entra andando, vira de frente", "duracao": 3.2, "cena": {
        "cenario": "estudio", "camera": {"plano": "geral", "movimento": "parado"}, "transicao": "corte",
        "cartoes": [{"tipo": "etiqueta", "texto": f"BENCHMARK · {pid.upper()}"}],
        "personagens": [p(vista="perfil", acao="andando", de=-0.15, x=0.5, tempoMov=2.2, vistaChegada="frente")]}})
    # 2. ações de frente, plano médio contínuo
    for a in FRENTE:
        extra = {"mao": "carteira"} if a == "segurando" else {}
        fala = {"fala": True} if a in ("gesticulando", "acenando") else {}
        b.append({"texto": rotulo(a), "duracao": D, "cena": {
            "cenario": "estudio", "camera": {"plano": "medio"}, "transicao": "corte",
            "personagens": [p(vista="frente", acao=a, x=0.5, **extra, **fala)]}})
    # 3. perfil: deslocamentos e ciclos
    b.append({"texto": "perfil andando", "duracao": 3.0, "cena": {
        "cenario": "estudio", "camera": {"plano": "geral", "movimento": "parado"}, "transicao": "whip",
        "personagens": [p(vista="perfil", acao="andando", de=0.15, x=0.8, tempoMov=2.8)]}})
    b.append({"texto": "correndo de volta", "duracao": 2.4, "cena": {
        "cenario": "estudio", "camera": {"plano": "geral", "movimento": "parado"}, "transicao": "corte",
        "personagens": [p(vista="perfil", acao="correndo", de=0.8, x=0.2, tempoMov=1.4, expressao="tenso")]}})
    b.append({"texto": "mancando", "duracao": 3.0, "cena": {
        "cenario": "estudio", "camera": {"plano": "geral", "movimento": "parado"}, "transicao": "corte",
        "personagens": [p(vista="perfil", acao="mancando", de=0.2, x=0.6, tempoMov=2.8, expressao="dor")]}})
    for a in ["gesticulando", "mao-estendida", "olhando-celular", "susto", "agachado", "sentado"]:
        b.append({"texto": f"perfil {rotulo(a)}", "duracao": D, "cena": {
            "cenario": "estudio", "camera": {"plano": "medio"}, "transicao": "corte",
            "personagens": [p(vista="perfil", acao=a, x=0.5)]}})
    # 4. close: as 12 expressões, uma por trecho, com a boca falando
    for metade in (EXPRESSOES[:6], EXPRESSOES[6:]):
        # vírgula = um nome por bloco de legenda
        b.append({"texto": ", [leve] ".join(metade) + ".", "duracao": 4.8, "cena": {
            "cenario": "estudio", "camera": {"plano": "close", "movimento": "parado"}, "transicao": "fade",
            "personagens": [p(vista="frente", acao="em-pe", x=0.5, expressao=metade[0], fala=True,
                              muda=[{"trecho": k, "expressao": e} for k, e in enumerate(metade) if k])]}})
    # 5. olhar e saída
    b.append({"texto": "olhar esquerda, [leve] olhar direita.", "duracao": 2.6, "cena": {
        "cenario": "estudio", "camera": {"plano": "close", "movimento": "parado"}, "transicao": "corte",
        "personagens": [p(vista="frente", acao="em-pe", x=0.5, olhar=-1, muda=[{"trecho": 1, "acao": "olhando-em-volta"}])]}})
    b.append({"texto": "sai correndo", "duracao": 2.4, "cena": {
        "cenario": "estudio", "camera": {"plano": "geral", "movimento": "parado"}, "transicao": "whip",
        "personagens": [p(vista="perfil", acao="correndo", de=0.5, x=1.2, tempoMov=1.6)]}})
    return {"slug": "benchmark", "pasta": pid, "serie": f"BENCHMARK · {pid.upper()}", "episodio": 0,
            "cartaoFinal": None, "batidas": b}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("personagem")
    ap.add_argument("--look", default="padrao")
    ap.add_argument("--tema", help='tema do rig (padrão: o do pacote "benchmark", "plano")')
    ap.add_argument("--so-roteiro", action="store_true")
    a = ap.parse_args()

    rot = ROOT / "benchmark" / "personagens" / f"{a.personagem}.json"
    rot.parent.mkdir(parents=True, exist_ok=True)
    r = roteiro(a.personagem, a.look)
    if a.tema:
        r["tema"] = a.tema
    rot.write_text(json.dumps(r, ensure_ascii=False, indent=1))
    print(f"roteiro -> {rot}")
    if a.so_roteiro:
        return
    subprocess.run([sys.executable, str(ROOT / "pipeline" / "narrar.py"), str(rot), "--mudo"], check=True,
                   stdout=subprocess.DEVNULL)
    saida = ROOT / "out" / "folhas" / f"{a.personagem}_benchmark.mp4"
    saida.parent.mkdir(parents=True, exist_ok=True)
    props = json.dumps({"episode": f"benchmark/{a.personagem}"})
    subprocess.run(["npx", "remotion", "render", "src/index.ts", "episodio", str(saida), f"--props={props}",
                    "--codec=h264", "--log=error"], check=True, cwd=ROOT)
    print(f"vídeo -> {saida}")


if __name__ == "__main__":
    main()
