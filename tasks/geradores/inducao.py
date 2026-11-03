import json,re,sys,os
# Gera episodios/inducao/roteiro.json (episódio 11, "como esquentar a panela sem esquentar a mão") a partir da tabela de cenas de tasks/roteiro-inducao.md.
# As falas vêm sempre do .md; cenas, cartões e efeitos ficam aqui. Uso (da raiz): python3 tasks/geradores/inducao.py episodios/inducao/roteiro.json
# Depois: cd motor && python3 pipeline/narrar.py ../episodios/inducao/roteiro.json
# REGRA: o nome "indução" só aparece em fala, rótulo, cartão ou tela a partir da batida 16.
AQUI=os.path.dirname(os.path.abspath(__file__))
md=open(os.path.join(AQUI,'..','roteiro-inducao.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Contas')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==20,len(falas)
NLEVE=[f.count('[leve]') for f in falas]

M=lambda *ds,**k: {**{kk:v for d in ds for kk,v in d.items()},**k}
V=lambda de,para,ini=None,fim=None: dict(de=de,para=para,**({"ini":ini} if ini is not None else {}),**({"fim":fim} if fim is not None else {}))
def T(cx,ty,D,fov=50,el=0.14):
    return dict(pos=[cx,round(ty+el*D,3),D],alvo=[cx,ty,0],fov=fov)
cam=lambda de=None,para=None,**k: {**{kk:v for kk,v in (("de",de),("para",para)) if v},**k}
rot=lambda txt,tr=0,y=40,tam=96: dict(tipo="rotulo",texto=txt,trecho=tr,y=y,tamanho=tam)
chamada=lambda icone,txt,sub=None,tr=0: dict(tipo="chamada",icone=icone,texto=txt,trecho=tr,**({"sub":sub} if sub else {}))
G=lambda x=0,z=0.3,rot=0,acao="em-pe",exp="neutro",**k: dict(id="zeca",x=x,z=z,rot=rot,acao=acao,exp=exp,**k)
ZL=lambda x,acao,exp,**k: G(x,0.3,-1.2,acao,exp,**k)

CAMP=dict(acamp=True,pote="aluminio")   # acampamento: panela de alumínio simples
GAS=dict(fogao="gas",pote="aluminio")
VID=dict(fogao="vidro",pote="ferro")
CK=lambda D=3.3,ty=0.3,cx=-0.45: cam(T(cx,ty,D),T(cx,ty,D-0.1))
CC=lambda D=3.4,ty=1.05,cx=-0.5: cam(T(cx,ty,D),T(cx,ty,D-0.1))

cenas={}
cenas[1]=M(CAMP,fogo=V(0,1,0.3,0.8),camera=CK(),gente=[ZL(-0.05,"mexendo","sorriso")],c=[])
cenas[2]=M(CAMP,fogo=1,setasCalor=V(0,1,0.2,0.9),barras=V(0,1,0.3,0.5),barrasModo="ar",barrasX=-0.45,barrasY=1.0,camera=CK(3.5,0.35),gente=[ZL(-0.05,"bracos-cruzados","preocupado")],
  c=[],etiq=["panela@0.3","ar@0.45"],etiqS=0.35)
cenas[3]=M(CAMP,lenha=V(0,1,0,0.4),fogo=V(1,1.5),quente=V(0,0.8,0.3,1),bolhas=V(0,1,0.5,1),camera=CK(),gente=[ZL(-0.05,"mexendo","eureka")],c=[])
cenas[4]=M(CAMP,lenha=1,fogo=1.3,fumaca=V(0,1,0.1,0.5),fuligem=V(0,1,0.3,1),quente=0.7,bolhas=1,camera=CK(3.5,0.4),gente=[ZL(-0.05,"abanando","dor")],c=[],etiq=["fumaca@0.35"],etiqS=0.35)
cenas[5]=M(CAMP,lenha=1,fogo=V(1.3,1.6),vento=V(0.2,1,0.1,0.6),faiscas=V(0,1,0.2,0.8),fumaca=0.7,fuligem=1,quente=0.7,bolhas=1,camera=CK(3.7,0.35),gente=[G(V(-0.05,0.3,0.4,0.9),0.3,-1.2,"abanando","medo")],c=[])
cenas[6]=M(GAS,gas=V(0.3,1,0.35,0.9),botao=V(0,1,0.2,0.9),quente=V(0.2,0.7),camera=cam(T(-0.6,1.0,2.6),T(-0.7,0.85,1.9)),gente=[ZL(-0.05,"apontando","eureka")],c=[],etiq=["botao@0.5"],etiqS=0.3)
cenas[7]=M(GAS,gas=1,botao=1,lambe=V(0,1,0.1,0.4),ondasCalor=V(0,1,0.3,0.7),quente=0.7,camera=CC(3.2,1.1),gente=[G(V(0.0,-0.35,0.4,0.9),0.3,-1.2,"abanando","dor",queima=V(0,1,0.5,1))],c=[])
cenas[8]=M(VID,res=V(0,1,0.4,0.9),quente=0.2,camera=CC(3.2,0.85),gente=[ZL(-0.05,"apontando","eureka")],c=[],etiq=["resistencia@0.45"],etiqS=0.3)
cenas[9]=M(VID,res=V(1,0.3,0.0,0.4),vidroQuente=V(0.2,1,0.1,0.5),luzH=V(0,1,0.5,0.7),quente=0.5,camera=CC(3.2,0.9),gente=[G(V(0.0,-0.35,0.65,0.95),0.3,-1.2,"abanando","dor",queima=V(0,1,0.7,1))],c=[],etiq=["hq@0.55"],etiqS=0.3)
cenas[10]=M(VID,vidroQuente=0.15,luzH=0.6,camera=CC(3.2,1.0),gente=[ZL(-0.05,"cocando-cabeca","pensativo")],interroga=0,c=[])
cenas[11]=M(VID,bobina=V(0,1,0.1,0.3),corrente=V(0,1,0.3,0.5),campo=V(0,1,0.5,0.8),camera=cam(T(-0.7,0.95,2.0),T(-0.7,0.95,1.8)),gente=[],c=[],etiq=["bobina@0.15","campo@0.6"],etiqS=0.3)
cenas[12]=M(VID,bobina=1,corrente=1,campo=1,quente=V(0.1,0.8,0.4,1),lupa=V(0,1,0,0.15),lupaX=-0.55,lupaY=1.55,lupaR=0.34,redemoinho=V(0,1,0.3,0.7),camera=cam(T(-0.65,1.2,2.5),T(-0.65,1.2,2.4)),gente=[],c=[],etiq=["corrente@0.35"],etiqS=0.3)
cenas[13]=M(VID,bobina=1,corrente=1,campo=0.6,quente=1,bolhas=V(0,1,0.2,0.8),vidroFrio=V(0,1,0.2,0.5),camera=CC(3.2,1.0),gente=[ZL(-0.05,"em-pe","sorriso",queima=0)],c=[])
cenas[14]=M(VID,pote="aluminio",bobina=1,corrente=1,campo=1,quente=V(0.6,0.0,0.1,0.4),camera=CC(3.2,1.0),gente=[ZL(-0.05,"bracos-cruzados","preocupado")],c=[])
cenas[15]=M(VID,pote="ferro",bobina=0,ima=V(0,1,0,1),imaGruda=True,quente=0.3,camera=cam(T(-0.8,1.05,2.0),T(-0.8,1.0,1.8)),gente=[],c=[],etiq=["ima@0.2"],etiqS=0.3)
cenas[16]=M(VID,bobina=1,corrente=1,campo=1,quente=1,vidroFrio=0.8,painel=V(0,1,0.1,0.3),destaque=V(0,1,0.3,1),camera=CC(3.2,1.0),gente=[],
  c=[rot("FOGÃO DE INDUÇÃO",1,40,96)],etiq=["vBobina@0.4-0.6","vVidro@0.55-0.8","vPanela@0.75"],etiqS=0.3)
cenas[17]=M(VID,bobina=1,corrente=1,campo=1,quente=1,vidroFrio=0.8,painel=1,camera=cam(T(-0.7,0.95,2.3),T(-0.7,0.95,2.1)),gente=[],c=[],etiq=["vBobina@0.1","vPanela@0.5"],etiqS=0.3)
cenas[18]=M(VID,bobina=V(1,0.2,0.1,0.3),corrente=V(1,0,0.1,0.3),campo=V(1,0,0.1,0.3),quente=V(1,0.2,0.1,0.4),vidroFrio=V(0.8,0,0.1,0.3),barras=V(0,1,0.4,0.6),barrasModo="ef",barrasX=-0.45,barrasY=1.5,camera=CC(3.2,1.05),gente=[ZL(-0.05,"em-pe","sorriso")],c=[])
cenas[19]=M(VID,bobina=0,corrente=0,quente=0,painel=0.6,interroga=V(0,1,0.3,1),camera=cam(T(-0.3,1.05,2.6),T(-0.3,1.05,2.4)),gente=[],c=[])
cenas[20]=M(VID,bobina=1,corrente=1,campo=1,quente=1,vidroFrio=0.8,painel=1,camera=cam(T(-0.7,1.2,2.8),T(-0.7,1.2,2.6)),gente=[],
  c=[chamada("curtir","CURTA",None,0),chamada("comentar","COMENTE","o que você queimou na mão",1),chamada("compartilhar","COMPARTILHE",None,2),chamada("seguir","SIGA","PRA SABER COMO AS COISAS FUNCIONAM",4)])

SFX={
1:[("pop",0,0.5),("fogo",1,0.4),("ding",2,0.4)],
2:[("sopro",0,0.4),("chiado",1,0.35),("tique",2,0.4)],
3:[("pop",0,0.5)],
4:[("sopro",0,0.35),("tosse",1,0.5),("chiado",2,0.35)],
5:[("vento",0,0.4),("whoosh",1,0.4),("batimento_rapido",2,0.35)],
6:[("pop",0,0.4),("clique",1,0.55),("ding",2,0.5)],
7:[("whoosh",0,0.35),("chiado",1,0.4),("estalo",3,0.5)],
8:[("pop",0,0.45),("clique",1,0.4)],
9:[("tique",0,0.35),("sino",1,0.4),("bips",2,0.4),("estalo",3,0.5)],
10:[("pop",0,0.4),("ding",1,0.5)],
11:[("clique",0,0.5),("zumbido",1,0.3),("pop",2,0.4),("whoosh",3,0.4)],
12:[("whoosh",0,0.4),("zumbido",1,0.3),("chiado",2,0.35)],
13:[("pop",0,0.5),("agua",1,0.3),("ding",2,0.5)],
14:[("pop",0,0.4),("sopro",1,0.4)],
15:[("clique",0,0.5),("metal",1,0.5)],
16:[("whoosh",0,0.4),("jingle",1,0.5)],
17:[("pop",0,0.4),("ding",1,0.4)],
18:[("whoosh",0,0.4),("pop",1,0.4),("ding",2,0.4)],
19:[("bips",0,0.4),("whoosh",1,0.4),("ding",2,0.4)],
20:[("pop",0,0.5),("pop",1,0.5),("pop",2,0.5),("ding",4,0.6)],
}
AMB={1:("fogo",0.15),6:("nenhuma",0),8:("dia",0.06),16:("nenhuma",0)}

reg=open(os.path.join(AQUI,'..','..','motor','pipeline','sfx.py'),encoding='utf-8').read().split('REGISTRO = {')[1]
validos=set(re.findall(r'^\s+"([a-z_]+)":\s+\(',reg,re.M))
for i,l in SFX.items():
    for sf in l:
        assert sf[0] in validos,(i,sf[0])
        assert sf[1]<=NLEVE[i-1],(i,sf,NLEVE[i-1])
for i,(sn,v) in AMB.items(): assert sn=="nenhuma" or sn in validos,(i,sn)
for i,d in cenas.items():
    for cartao in d['c']:
        if 'trecho' in cartao: assert cartao['trecho']<=NLEVE[i-1],(i,cartao)
assert set(cenas)==set(range(1,21)) and set(SFX)==set(range(1,21))

bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"inducao",**d}
    if i in AMB:
        sn,v=AMB[i]
        cena["ambiencia"]="nenhuma" if sn=="nenhuma" else {"som":sn,"volume":v}
    if c: cena["cartoes"]=c
    cena["sfx"]=[{"som":sf[0],"trecho":sf[1],"volume":sf[2],**({"em":sf[3]} if len(sf)>3 else {})} for sf in SFX[i]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})
for i,b in enumerate(bat,1):
    cena=json.dumps({k:v for k,v in b["cena"].items() if k!="cenario"},ensure_ascii=False).lower()
    if i<16: assert not re.search(r'indu[cç]',cena),(i)
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":11,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])),exist_ok=True)
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s',sum(len(v) for v in SFX.values()),'efeitos')
