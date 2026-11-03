import json,re,sys,os,math
# Gera episodios/microondas/roteiro.json (episódio 10, "como esquentar comida sem fogo") a partir da tabela de cenas de tasks/roteiro-microondas.md.
# As falas vêm sempre do .md; as cenas, os cartões e os efeitos ficam aqui. Uso (da raiz do repositório):
#   python3 tasks/geradores/microondas.py episodios/microondas/roteiro.json
# Depois: cd motor && python3 pipeline/narrar.py ../episodios/microondas/roteiro.json --mudo
# REGRA: o nome do aparelho só aparece em rótulo, cartão ou texto de tela a partir da batida 15 (a fala dá o nome na 15).
AQUI=os.path.dirname(os.path.abspath(__file__))
md=open(os.path.join(AQUI,'..','roteiro-microondas.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Contas')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==22,len(falas)
NLEVE=[f.count('[leve]') for f in falas]   # trecho máximo de cada batida = número de [leve]

# ---------- cenário em ESCALA REAL (constantes de motor/banco/series/explicadores/microondas*.tsx e cozinha-fogao.tsx) ----------
# Magnetron dentro da carcaça (x 0,67, ao lado da cavidade); `raiox`=1 deixa a carcaça de vidro (batidas 15, 16, 22); fechada, só a comida aparece.
# Zeca ~1,7 m; bancada 0,9 m; fogão com a panela de sopa em x -0,8; caixa de metal em x 0,22..0,62 na bancada; aparelho final ~52 cm.
CY=0.9
M=lambda *ds,**k: {**{kk:v for d in ds for kk,v in d.items()},**k}
V=lambda de,para,ini=None,fim=None: dict(de=de,para=para,**({"ini":ini} if ini is not None else {}),**({"fim":fim} if fim is not None else {}))
def T(cx,ty,D,fov=50,el=0.14):
    """Câmera de frente a D metros olhando o ponto (cx, ty) do plano do corte (largura visível ≈ 0,525·D)."""
    return dict(pos=[cx,round(ty+el*D,3),D],alvo=[cx,ty,0],fov=fov)
cam=lambda de=None,para=None,**k: {**{kk:v for kk,v in (("de",de),("para",para)) if v},**k}

rot=lambda txt,tr=0,y=40,tam=96: dict(tipo="rotulo",texto=txt,trecho=tr,y=y,tamanho=tam)
termo=lambda txt,de,para,dur,tr=0,x=10: dict(tipo="termometro",trecho=tr,de=de,para=para,dur=dur,texto=txt,x=x,y=60)
chamada=lambda icone,txt,sub=None,tr=0: dict(tipo="chamada",icone=icone,texto=txt,trecho=tr,**({"sub":sub} if sub else {}))
G=lambda x=0,z=0.3,rot=0,acao="em-pe",exp="neutro",**k: dict(id="zeca",x=x,z=z,rot=rot,acao=acao,exp=exp,**k)
ZL=lambda x,acao,exp,**k: G(x,0.3,-1.2,acao,exp,**k)   # de frente para a esquerda
ZR=lambda x,acao,exp,**k: G(x,0.3,1.3,acao,exp,**k)    # de frente para a direita (a caixa)

BX=0.42   # centro da cavidade (prato centralizado)
CAIXA=dict(caixa=1,tubo=1,fio=1,tigela=1)
PRONTA=M(CAIXA,prato=1,tela=1)
AP=M(PRONTA,corpo=1)

cenas={}
cenas[1]=dict(fogo=1,queima=V(0,0.85,0.2,0.8),calor=0.12,fumaca=V(0,1,0.2,0.9),camera=cam(T(-0.55,1.0,2.9),T(-0.55,1.0,2.7)),
  gente=[ZL(-0.15,"mexendo","dor")],c=[termo("MEIO",0.18,0.2,1,2)],etiq=["fundo@0.3-0.6","meio@0.62"],etiqS=0.35)
cenas[2]=dict(fogo=1,queima=0.85,calor=V(0.1,0.5),fumaca=0.6,setasCalor=V(0,1,0.05,0.85),relogio=True,relogioVel=0.5,
  camera=cam(T(-0.45,1.0,2.9),T(-0.45,1.0,2.7)),gente=[ZL(-0.1,"bracos-cruzados","cansado")],c=[])
LU=dict(lupa=V(0,1,0,0.15),lupaX=-0.75,lupaY=1.45,fogo=0.3,queima=0.5,calor=0.4)
cenas[3]=M(LU,lupaModo="agua",agua=V(0,1,0.1,0.5),lasanha=V(0,1,0.5,0.7),camera=cam(T(-0.75,1.2,1.9),T(-0.75,1.2,1.8)),c=[],etiq=["agua@0.25"],etiqS=0.3)
cenas[4]=M(LU,lupaModo="mol",lupa=1,sinais=V(0,1,0.45,0.85),camera=cam(T(-0.75,1.2,1.9),T(-0.75,1.2,1.8)),c=[],etiq=["molecula@0.2"],etiqS=0.25)
cenas[5]=M(LU,lupaModo="giro",lupa=1,gira=V(0,1,0,0.2),quente=V(0,1,0.35,1),termoL=V(0.05,1,0.35,1),campo=1,camera=cam(T(-0.75,1.2,1.9),T(-0.75,1.2,1.8)),c=[])
cenas[6]=M(LU,lupaModo="onda",lupa=1,gira=1,quente=1,onda=V(0,1,0,0.3),campo=1,lupaY=1.35,camera=cam(T(-0.75,1.15,1.9),T(-0.75,1.15,1.8)),c=[dict(tipo="contador245",trecho=3,y=40,dur=1.2)])
cenas[7]=dict(tubo=V(0,1,0,0.3),aneis=V(0,1,0.3,0.5),fio=V(0,1,0.3,0.7),camera=cam(T(0.6,1.02,0.9),T(0.6,1.02,0.85)),gente=[],c=[],etiq=["magnetron@0.35"],etiqS=0.2)
cenas[8]=dict(tubo=1,fio=1,espalha=V(0,1,0.05,0.4),tigela=V(0,1,0,0.2),fogo=0,camera=cam(T(0.2,1.2,2.6),T(0.2,1.2,2.4)),gente=[ZL(0.8,"mao-na-testa","cansado")],c=[])
cenas[9]=dict(tubo=1,fio=1,tigela=1,caixa=V(0,1,0,0.55),ondasDentro=V(0,1,0.55,0.8),camera=cam(T(0.5,1.05,1.45),T(0.5,1.05,1.35)),gente=[],c=[],etiq=["caixa@0.3"],etiqS=0.25)
cenas[10]=M(CAIXA,frente=V(0,1,0,0.3),camera=cam(T(0.05,1.1,3.0),T(0.05,1.1,2.9)),gente=[G(-0.28,0.1,1.4,"em-pe","tenso",incl=V(0,0.5,0.2,0.6))],c=[])
cenas[11]=M(CAIXA,frente=V(1,0,0,0.3),tela=V(0,1,0.25,0.4),lupa=V(0,1,0.4,0.55),lupaModo="tela",lupaX=BX,lupaY=1.6,lupaR=0.36,zoomDe=[0.4,CY+0.15,0.0],grade=V(0,1,0.55,0.7),
  camera=cam(T(BX,1.3,1.6),T(BX,1.3,1.5)),gente=[],c=[],etiq=["onda@0.55","furo@0.75"],etiqS=0.3)
cenas[12]=M(PRONTA,mapa=V(0,1,0.1,0.4),mapaX=BX,mapaY=1.6,mapaEsc=0.8,camera=cam(T(BX,1.3,1.5),T(BX,1.3,1.45)),gente=[],c=[],etiq=["quente@0.45","frio@0.7"],etiqS=0.3)
cenas[13]=M(PRONTA,mapa=1,mapaMix=V(0,1,0.2,0.9),giraPrato=1,aquece=V(0,0.6),vapor=V(0,1,0.5,0.9),mapaX=BX,mapaY=1.6,mapaEsc=0.8,camera=cam(T(BX,1.3,1.5),T(BX,1.3,1.45)),gente=[],c=[],etiq=["prato@0.2"],etiqS=0.3)
cenas[14]=M(PRONTA,abre=V(0,1,0,0.35),aquece=1,vapor=1,giraPrato=0,camera=cam(T(0.5,1.1,1.7),T(0.5,1.1,1.6)),gente=[],c=[])
cenas[15]=M(PRONTA,raiox=1,abre=V(1,0,0,0.25),corpo=V(0,1,0.1,0.5),aquece=1,vapor=0.6,destaque=V(0,1,0.35,1),camera=cam(T(0.5,1.1,1.65),T(0.5,1.1,1.55)),gente=[],
  c=[rot("MICRO-ONDAS",1,40,120)],etiq=["mMagnetron@0.4-0.6","mCaixa@0.5-0.75","mTela@0.66-0.88","mPrato@0.8"],etiqS=0.25,etiqYmax=0.2)
cenas[16]=M(CAIXA,raiox=1,prato=1,corpo=1,ondasDentro=1,aquece=0.6,vapor=0.3,camera=cam(T(0.5,1.05,1.5),T(0.5,1.05,1.4)),gente=[],c=[],etiq=["mCaixa@0.05-0.4","mMagnetron@0.4-0.7","mPrato@0.72"],etiqS=0.25)
cenas[17]=M(CAIXA,tigela=0,prato=1,corpo=1,fatia=1,camera=cam(T(0.5,1.1,1.45),T(0.5,1.1,1.35)),gente=[],c=[])
cenas[18]=M(CAIXA,tigela=0,prato=1,corpo=1,fatia=1,corte=V(0,1,0,0.15),pen=V(0,5.6,0.4,1),regua=V(0,1,0.1,0.35),corteX=BX,corteY=1.5,corteL=0.52,
  camera=cam(T(BX,1.3,1.6),T(BX,1.3,1.5)),gente=[],c=[])
cenas[19]=M(PRONTA,corpo=1,abre=V(0,1,0,0.3),aquece=0.3,garfoAr=V(0,1,0,0.2),camera=cam(T(0.5,1.2,1.7),T(0.5,1.2,1.6)),gente=[],c=[dict(tipo="atencao",trecho=1,y=40,dx=90)])
cenas[20]=M(CAIXA,tigela=0,prato=1,corpo=1,garfo=1,faisca=V(0,1,0,0.3),aluminio=V(0,1,0.3,0.45),fogoAl=V(0,1,0.6,1),
  camera=cam(T(0.5,1.1,1.35),T(0.5,1.1,1.25)),gente=[G(x=V(-0.1,-1.2,0.5,1),z=0.3,rot=-1.4,acao="andando",exp="medo")],c=[])
cenas[21]=M(PRONTA,corpo=1,indu=V(0,1,0.3,0.5),interroga=V(0,1,0.55,1),camera=cam(T(0.65,1.2,2.5),T(0.65,1.2,2.3)),gente=[],c=[])
cenas[22]=M(CAIXA,raiox=1,prato=1,corpo=1,ondasDentro=1,aquece=1,vapor=0.5,camera=cam(T(BX,1.8,2.4),T(BX,1.8,2.3)),gente=[],
  c=[chamada("curtir","CURTA",None,0),chamada("comentar","COMENTE","o que você já esqueceu lá dentro",1),chamada("compartilhar","COMPARTILHE",None,2),chamada("seguir","SIGA","PRA SABER COMO AS COISAS FUNCIONAM",4)])

SFX={
1:[("chiado",0,0.5),("pop",1,0.5),("tosse",2,0.4),("estalo",2,0.35,0.6)],
2:[("chiado",0,0.35),("sopro",1,0.35),("tique_relogio",2,0.35),("tique_relogio",3,0.3)],
3:[("pop",0,0.5),("agua",0,0.35,0.3),("ding",1,0.5)],
4:[("pop",0,0.5),("ding",1,0.45),("clique",2,0.5),("clique",3,0.5)],
5:[("whoosh",0,0.4),("chocalho",1,0.3),("zumbido",2,0.25),("chiado",3,0.35),("ding",4,0.5)],
6:[("pop",0,0.4),("whoosh",1,0.5),("zumbido",2,0.3),("bips",3,0.4)],
7:[("clique",0,0.6),("zumbido",0,0.3,0.4)],
8:[("sopro",0,0.45),("estatica",1,0.3),("passos",1,0.3,0.5)],
9:[("whoosh",0,0.5),("impacto_seco",0,0.5,0.9),("estalo",1,0.4)],
10:[("rangido",0,0.35),("batimento_rapido",0,0.25),("pop",1,0.4)],
11:[("clique",0,0.5),("ding",1,0.5),("whoosh",2,0.4)],
12:[("estalo",0,0.4),("bips",1,0.4),("pop",2,0.4),("pop",2,0.4,0.5)],
13:[("rangido",0,0.4),("whoosh",1,0.4),("sopro",2,0.4)],
14:[("chiado",0,0.4),("ding",1,0.5),("pop",2,0.5)],
15:[("whoosh",0,0.4),("pop",0,0.5,0.4),("jingle",1,0.5),("ding",1,0.5,0.6)],
16:[("zumbido",0,0.3),("pop",1,0.4),("chiado",2,0.35)],
17:[("pop",0,0.5),("clique",1,0.4)],
18:[("ding",0,0.5),("tique",1,0.4),("sopro",2,0.35)],
19:[("porta",0,0.4),("bips",1,0.5),("estalo",2,0.4)],
20:[("raio",0,0.4),("estalo",1,0.5),("fogo",2,0.35),("batimento_rapido",2,0.4,0.2)],
21:[("pop",0,0.5),("ding",1,0.4),("pop",2,0.4),("pop",3,0.4)],
22:[("pop",0,0.5),("pop",1,0.5),("pop",2,0.5),("ding",4,0.6)],
}
AMB={1:("fogo",0.15),3:("nenhuma",0),7:("drone",0.1),15:("nenhuma",0),21:("dia",0.08)}

reg=open(os.path.join(AQUI,'..','..','motor','pipeline','sfx.py'),encoding='utf-8').read().split('REGISTRO = {')[1]
validos=set(re.findall(r'^\s+"([a-z_]+)":\s+\(',reg,re.M))
for i,l in SFX.items():
    for sf in l:
        assert sf[0] in validos,(i,sf[0])
        assert sf[1]<=NLEVE[i-1],(i,sf)
for i,(sn,v) in AMB.items(): assert sn=="nenhuma" or sn in validos,(i,sn)
for i,d in cenas.items():
    for cartao in d['c']:
        if 'trecho' in cartao: assert cartao['trecho']<=NLEVE[i-1],(i,cartao)
assert set(cenas)==set(range(1,23)) and set(SFX)==set(range(1,23))

bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"microondas",**d}
    if i in AMB:
        sn,v=AMB[i]
        cena["ambiencia"]="nenhuma" if sn=="nenhuma" else {"som":sn,"volume":v}
    cena.setdefault("visor","0:00")
    if c: cena["cartoes"]=c
    cena["sfx"]=[{"som":sf[0],"trecho":sf[1],"volume":sf[2],**({"em":sf[3]} if len(sf)>3 else {})} for sf in SFX[i]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})

# o nome do aparelho só pode aparecer em cena (rótulo, cartão, texto de tela) a partir da batida 15
for i,b in enumerate(bat,1):
    cena=json.dumps({k:v for k,v in b["cena"].items() if k!="cenario"},ensure_ascii=False).lower()
    if i<15: assert not re.search(r'micro-?ondas|microwave',cena),(i)
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":10,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])),exist_ok=True)
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s',sum(len(v) for v in SFX.values()),'efeitos')
