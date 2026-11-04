import json,re,sys,os,math
# Gera episodios/para-raios/roteiro.json (episódio 15, "como proteger uma casa de um raio, peça por peça") a partir da tabela de cenas de tasks/roteiro-para-raios.md.
# As falas vêm sempre do .md; cenas, cartões e efeitos ficam aqui. Uso (da raiz): python3 tasks/geradores/para-raios.py episodios/para-raios/roteiro.json
# Depois: cd motor && python3 pipeline/narrar.py ../episodios/para-raios/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/pararaios.tsx (veja a lista de campos no topo). Palcos: casa x = 0 · estrada x = 60 · franklin x = 120 · mapa x = 180.
# REGRA: o nome "para-raios" só aparece a partir da batida 12 (fala, rótulo, cartão).
AQUI=os.path.dirname(os.path.abspath(__file__))
md=open(os.path.join(AQUI,'..','roteiro-para-raios.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Fontes')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==21,len(falas)
NLEVE=[f.count('[leve]') for f in falas]

def palavras_de(i):
    t=re.sub(r'\[[a-z]+\]','',falas[i-1]).replace('*','').replace('_','')
    return t.split()
def W(i,pat,fim=False):
    """progresso (0..1 da batida) em que a palavra que casa com `pat` começa (ou termina, com fim=True)"""
    ps=palavras_de(i)
    for k,w in enumerate(ps):
        if re.search(pat,w,re.I): return round((k+(1 if fim else 0))/len(ps),3)
    raise AssertionError((i,pat))

M=lambda *ds,**k: {**{kk:v for d in ds for kk,v in d.items()},**k}
V=lambda de,para,ini=None,fim=None: dict(de=de,para=para,**({"ini":ini} if ini is not None else {}),**({"fim":fim} if fim is not None else {}))
KF=lambda *pares: [list(p) for p in pares]
TAN=math.tan(math.radians(25))
def T(cx,ty,D,fov=50,el=0.08,x0=None,up=0.2,z0=0.0):
    """câmera olhando para (cx, ., z0) a D metros; o assunto (cx, ty) cai no terço de cima do quadro (`up` = fração da meia-altura)"""
    h=D*math.tan(math.radians(fov/2))
    ay=ty-up*h
    return dict(pos=[round(x0 if x0 is not None else cx,3),round(ay+el*D,3),round(z0+D,3)],alvo=[cx,round(ay,3),z0],fov=fov)
cam=lambda de=None,para=None,**k: {**{kk:v for kk,v in (("de",de),("para",para)) if v},**k}
rot=lambda txt,tr=0,y=40,tam=96: dict(tipo="rotulo",texto=txt,trecho=tr,y=y,tamanho=tam)
chamada=lambda icone,txt,sub=None,tr=0: dict(tipo="chamada",icone=icone,texto=txt,trecho=tr,**({"sub":sub} if sub else {}))
def G(x=0.0,z=3.4,rot=0.0,acao="em-pe",exp="sorriso",**k): return dict(x=x,z=z,rot=rot,acao=acao,exp=exp,**k)

OLHA_CEU={"cabeca.x":-0.55,"ombroE.x":-0.2,"ombroD.x":-0.2}
TOCA={"ombroE.z":0.6,"cotoveloE.x":-0.2,"ombroE.x":-0.5,"maos":0.2}
GOLPE={"ombroE.x":-1.3,"ombroD.x":-1.3,"cotoveloE.x":-0.2,"cotoveloD.x":-0.2,"tronco.x":0.3,"maos":0.2}
APONTA={"ombroD.z":-1.2,"ombroD.x":-0.4,"cotoveloD.x":-0.1,"maos":0.1}
VIRA_E=-math.pi/2

# camadas de estado (acumulam: cada peça só entra quando a fala a introduz)
SEMNADA=dict()
COM_HASTE=dict(haste=1)
COM_CABO=M(COM_HASTE,cabo=1)
COMPLETO=M(COM_CABO,terra=1)

cenas={}
# 1: tempestade, o raio estoura no telhado; o Zeca na porta, de frente
a=W(1,'^cai',False)
cenas[1]=M(SEMNADA,raio=V(0,1,round(a-0.03,3),round(a+0.2,3)),fogo=V(0,1,W(1,'^telhado'),round(W(1,'^fogo',True)+0.05,3)),pisca=V(0,1,round(a+0.06,3),1.0),estoura=V(0,1,W(1,'^tomadas'),1.0),luz=1,
  camera=cam(T(0,3.6,13.5,50,0.1,x0=-4.5,up=0.1),T(0,3.5,12.0,50,0.1,x0=-3.4,up=0.1)),
  gente=[G(-1.6,3.5,0.35,"em-pe","surpreso",pose=OLHA_CEU)],c=[])
# 2: a câmera sobe: terreno aberto, a casa sozinha no ponto mais alto; ramos escolhem o telhado
cenas[2]=M(SEMNADA,ramos=KF((0,0),(0.28,0.0),(0.55,1),(0.7,1),(0.74,0),(1,0)),raio=V(0,1,0.7,0.92),
  camera=cam(T(0,3.0,18,50,0.1,x0=-3,up=0.1),T(0,2.4,34,50,0.42,x0=-6,up=0.0)),
  gente=[G(-1.6,3.5,0.35,"em-pe","surpreso",pose=OLHA_CEU)],c=[])
# 3: a haste sobe na cumeeira; o Zeca no telhado passa a mão nela
cenas[3]=M(SEMNADA,haste=V(0,1,W(3,'^haste'),W(3,'^pontuda',True)),escada=1,etiq=["haste@%s"%W(3,'^haste')],etiqS=0.9,
  camera=cam(T(-0.1,4.9,6.8,50,0.05,x0=-1.2,up=0.1),T(0,5.0,5.0,50,0.05,x0=-0.5,up=0.1)),
  gente=[G(-0.95,0.15,0.25,"em-pe","sorriso",y=4.35,pose=TOCA,esc=0.95)],c=[])
# 4: o raio cai na haste, o telhado fica intacto e as luzes acesas
cenas[4]=M(COM_HASTE,raio=V(0,1,0.18,0.55),alvo="haste",luz=1,
  camera=cam(T(0,4.2,10,50,0.06,x0=-2.2,up=0.1),T(0,4.4,8.6,50,0.06,x0=-1.4,up=0.1)),
  gente=[],c=[])
# 5: a corrente entra na haste e procura as paredes e a fiação
cenas[5]=M(COM_HASTE,raio=V(0,1,0.0,0.3),alvo="haste",espalha=V(0,1,W(5,'^Ela'),0.95),fiacao=V(0,1,W(5,'^as$'),W(5,'^fiação',True)),pisca=V(0,1,0.62,0.95),
  camera=cam(T(-0.2,3.6,11,50,0.08,x0=-2.4,up=0.1),T(0,3.2,9.4,50,0.08,x0=-1.4,up=0.1)),
  gente=[G(-4.3,3.4,0.3,"em-pe","surpreso")],c=[])
# 6: o cabo desce da haste pela parede até o chão
cenas[6]=M(COM_HASTE,cabo=V(0,1,W(6,'^cabo'),W(6,'^chão',True)),etiq=["cabo@%s"%W(6,'^cabo')],etiqS=0.9,escada=0,
  camera=cam(T(1.3,3.4,10.5,50,0.08,x0=-1.2,up=0.1),T(2.2,1.6,8.4,50,0.04,x0=0.2,up=0.1)),
  gente=[G(4.3,3.4,-0.4,"explicando","sorriso")],c=[])
# 7: o raio entra pela haste, desce pelo cabo, e a casa por dentro fica intacta
cenas[7]=M(COM_CABO,raio=V(0,1,0.02,0.3),alvo="haste",onda=V(0,1,0.24,0.68),fiacao=1,raiox=V(0,1,0.4,0.7),
  camera=cam(T(1.0,3.0,11.5,50,0.08,x0=-2,up=0.1),T(1.6,2.2,9.2,50,0.05,x0=-0.4,up=0.1)),
  gente=[G(4.3,3.4,-0.4,"comemorando","sorriso")],c=[])
# 8: corte do solo: o cabo só encosta no chão e a corrente fica presa
cenas[8]=M(COM_CABO,acumula=V(0,1,0.08,0.55),pisca=V(0,1,0.4,0.9),luz=1,
  camera=cam(T(2.7,-0.2,7.2,50,0.02,x0=2.2,up=0.05),T(2.7,-0.1,6.2,50,0.02,x0=2.6,up=0.05)),
  gente=[G(5.0,3.4,VIRA_E,"em-pe","surpreso")],c=[])
# 9: o Zeca finca as hastes em volta da casa; o cabo se liga a elas
cenas[9]=M(COM_CABO,terra=V(0,1,W(9,'^enterre'),W(9,'^ligadas',True)),etiq=["aterra@%s"%W(9,'^hastes')],etiqS=0.9,
  camera=cam(T(3.4,-0.5,9.6,50,0.02,x0=1.9,up=0.05),T(3.4,-0.6,8.8,50,0.02,x0=2.3,up=0.05)),
  gente=[G(4.6,3.4,VIRA_E,"em-pe","sorriso",pose=[(0.15,{}),(0.3,GOLPE),(0.45,{}),(0.6,GOLPE),(0.75,{}),(1,GOLPE)])],c=[])
# 10: a corrente abre em leque pela terra e some
cenas[10]=M(COMPLETO,onda=V(0,1,0.0,0.4),leque=V(0,1,0.3,0.98),
  camera=cam(T(3.0,-1.1,8.8,50,0.02,x0=1.6,up=0.05),T(3.0,-1.2,8.0,50,0.02,x0=2.0,up=0.05)),
  gente=[G(4.6,3.4,VIRA_E,"em-pe","sorriso")],c=[])
# 11: o teste: o raio, a descida, o leque na terra; a casa de pé e acesa
cenas[11]=M(COMPLETO,raio=V(0,1,0.02,0.24),alvo="haste",onda=V(0,1,0.22,0.5),leque=V(0,1,0.46,0.96),luz=1,
  camera=cam(T(1.0,2.6,15.5,50,0.1,x0=-3.2,up=0.0),T(2.6,0.6,12.5,50,0.04,x0=-0.6,up=0.0)),
  gente=[G(-4.4,3.4,0.45,"em-pe","surpreso")],c=[])
# 12: plano aberto: as três peças acesas juntas; aparece o nome
cenas[12]=M(COMPLETO,destaque=V(0,1,0.12,0.9),raiox=0,
  etiq=["haste@0.3-0.95","cabo@0.3-0.95","aterra@0.3-0.95"],etiqS=1.0,etiqK=0.8,etiqYmax=0.4,
  camera=cam(T(1.0,1.5,17,52,0.08,x0=-1.5,up=0.08),T(1.2,1.5,15.5,52,0.08,x0=-0.6,up=0.08)),
  gente=[G(-4.2,3.4,0.4,"comemorando","sorriso")],c=[rot("PARA-RAIOS",0,40,100)])
# 13: gravura de Franklin
cenas[13]=M(palco="franklin",raio=V(0,1,0.45,0.85),
  camera=cam(dict(pos=[121.0,2.4,15.0],alvo=[121.0,2.2,0],fov=44),dict(pos=[121.0,2.4,13.2],alvo=[121.0,2.2,0],fov=44)),c=[])
# 14: o para-raios não impede o raio de cair, só dá o caminho
cenas[14]=M(COMPLETO,raio=V(0,1,0.06,0.3),alvo="haste",onda=V(0,1,W(14,'^Ele'),0.97),
  camera=cam(T(1.4,2.4,15,50,0.1,x0=-2,up=0.08),T(2.2,1.2,13,50,0.06,x0=0.2,up=0.08)),
  gente=[G(-4.4,3.4,0.45,"explicando","sorriso")],c=[])
# 15: o Brasil à noite, raios por todo lado
cenas[15]=M(palco="mapa",flashes=V(0.35,1,0,0.5),
  camera=cam(dict(pos=[180,13.5,13.5],alvo=[180,0,0.6],fov=50),dict(pos=[180,12.0,12.0],alvo=[180,0,0.6],fov=50)),c=[])
# 16: o Zeca na estrada, noite de tempestade; entra no carro e fecha a porta
e16=W(16,'^Dentro')
cenas[16]=M(palco="estrada",carro=True,carroRot=2.5,porta=KF((0,0),(0.42,0),(0.58,1),(1,1)),zecaDentro=V(0,1,0.5,0.501),
  camera=cam(T(60.9,1.2,9.5,50,0.06,x0=59.0,up=0.0),T(60.6,1.2,8.0,50,0.06,x0=59.4,up=0.0)),
  gente=[G(V(2.6,1.5,0.08,0.5),V(2.5,1.7,0.08,0.5),-2.2,[(0.5,"andando","sorriso"),(1,"em-pe","sorriso")],"sorriso",ate=0.5)],c=[])
# 17: o carro fechado é uma gaiola de metal; o raio cai no teto e a corrente corre por fora
cenas[17]=M(palco="estrada",carro=True,carroRot=2.5,porta=1,zecaDentro=1,segura=V(0,0.5,0.1,0.5),gaiola=V(0,1,0.02,0.22),
  raio=V(0,1,W(17,'^cai')-0.02,round(W(17,'^cai')+0.2,3)),alvo="carro",corrCarro=V(0,1,round(W(17,'^corrente')-0.02,3),0.97),
  etiq=["gaiola@0.04-0.4"],etiqS=1.0,etiqK=1.0,
  camera=cam(T(60.2,1.6,11,50,0.1,x0=58.4,up=0.0),T(60.1,1.5,10,50,0.1,x0=58.9,up=0.0)),c=[])
# 18: por dentro, quem está lá não sente nada
cenas[18]=M(palco="estrada",carro=True,carroRot=2.5,porta=1,zecaDentro=1,gaiola=1,segura=V(0.3,1,0,0.4),
  raio=V(0,1,0.0,0.3),alvo="carro",corrCarro=V(0,1,0.2,0.85),
  camera=cam(T(60.0,1.3,7.2,50,0.1,x0=58.8,up=0.0),T(60.0,1.2,6.2,50,0.1,x0=59.2,up=0.0)),c=[])
# 19: o Zeca sai do carro sob a chuva; a casa protegida ao fundo, acesa
cenas[19]=M(palco="estrada",carro=True,carroRot=2.5,porta=0,zecaDentro=0,casaFundo=True,
  camera=cam(dict(pos=[65.2,2.3,9.0],alvo=[58.6,3.3,-14],fov=52),dict(pos=[64.6,2.3,8.2],alvo=[58.2,3.3,-14],fov=52)),
  gente=[G(62.6-60,-1.5,-0.5,"comemorando","sorriso")],c=[])
# 20: o close permanece; entra o cartão de comentar
cenas[20]=M(palco="estrada",carro=True,carroRot=2.5,porta=0,zecaDentro=0,casaFundo=True,
  camera=cam(dict(pos=[64.6,2.3,8.2],alvo=[58.2,3.3,-14],fov=52),dict(pos=[64.2,2.2,7.6],alvo=[58.0,3.3,-14],fov=52)),
  gente=[G(62.6-60,-1.5,-0.5,"em-pe","sorriso")],
  c=[chamada("comentar","COMENTE RAIO","O Brasil leva dezenas de milhões de raios por ano",0)])
# 21: pedido de envio e de seguir
cenas[21]=M(palco="estrada",carro=True,carroRot=2.5,porta=0,zecaDentro=0,casaFundo=True,
  camera=cam(dict(pos=[64.2,2.2,7.6],alvo=[58.0,3.3,-14],fov=52),dict(pos=[63.8,2.2,7.2],alvo=[57.8,3.3,-14],fov=52)),
  gente=[G(62.6-60,-1.5,-0.5,"acenando","sorriso")],
  c=[chamada("compartilhar","COMPARTILHE","com quem tem medo de tempestade",0),chamada("seguir","SIGA","PRA SABER COMO AS COISAS FUNCIONAM",1)])

SFX={
1:[("trovao",0,0.6),("queda_energia",1,0.4),("estalo",2,0.5)],
2:[("vento",0,0.4),("raio",2,0.5),("trovao",3,0.5)],
3:[("pop",0,0.4),("metal",1,0.5)],
4:[("raio",0,0.55),("ding",0,0.4)],
5:[("zumbido",0,0.4),("pisca",1,0.5)],
6:[("pop",0,0.4),("metal",1,0.5)],
7:[("raio",0,0.55),("whoosh",1,0.4),("ding",2,0.45)],
8:[("estatica",0,0.4),("estalo",1,0.5)],
9:[("pop",0,0.4),("impacto_seco",1,0.5)],
10:[("whoosh",0,0.4),("chiado",1,0.35)],
11:[("raio",0,0.55),("whoosh",1,0.4),("chiado",2,0.35),("ding",3,0.5)],
12:[("jingle",0,0.5)],
13:[("papel",0,0.4),("carimbo",1,0.4)],
14:[("raio",0,0.5),("ding",1,0.45)],
15:[("trovao",0,0.5),("raio",1,0.4)],
16:[("trovao",0,0.4),("porta",1,0.55),("pop",2,0.4)],
17:[("pop",0,0.4),("raio",1,0.6),("whoosh",2,0.4),("ding",3,0.4)],
18:[("ding",0,0.45)],
19:[("jingle",0,0.45)],
20:[("pop",0,0.5)],
21:[("pop",0,0.5),("ding",1,0.55)],
}
AMB={i:("chuva",0.12) for i in range(1,12)}
AMB.update({i:("chuva",0.1) for i in range(14,22)})
AMB[12]=("nenhuma",0); AMB[13]=("nenhuma",0); AMB[15]=("nenhuma",0)

reg=open(os.path.join(AQUI,'..','..','motor','pipeline','sfx.py'),encoding='utf-8').read().split('REGISTRO = {')[1]
validos=set(re.findall(r'^\s+"([a-z_0-9]+)":\s+\(',reg,re.M))
for i,l in SFX.items():
    for sf in l:
        assert sf[0] in validos,(i,sf[0])
        assert sf[1]<=NLEVE[i-1],(i,sf,NLEVE[i-1])
for i,(sn,v) in AMB.items(): assert sn=="nenhuma" or sn in validos,(i,sn)
for i,d in cenas.items():
    for cartao in d['c']:
        if 'trecho' in cartao: assert cartao['trecho']<=NLEVE[i-1],(i,cartao,NLEVE[i-1])
assert set(cenas)==set(range(1,22)) and set(SFX)==set(range(1,22))

bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"pararaios",**d}
    sn,v=AMB.get(i,("chuva",0.1))
    cena["ambiencia"]="nenhuma" if sn=="nenhuma" else {"som":sn,"volume":v}
    if c: cena["cartoes"]=c
    cena["sfx"]=[{"som":sf[0],"trecho":sf[1],"volume":sf[2]} for sf in SFX[i]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})
for i,b in enumerate(bat,1):
    txt=(b["texto"]+json.dumps({k:v for k,v in b["cena"].items() if k!="cenario"},ensure_ascii=False)).lower()
    if i<12: assert 'para-raios' not in txt and 'pararaios' not in txt,(i)
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":15,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])),exist_ok=True)
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s',sum(len(v) for v in SFX.values()),'efeitos')
