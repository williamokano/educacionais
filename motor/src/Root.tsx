import React from "react";
import { CalculateMetadataFunction, Composition, staticFile, Still } from "remotion";
import { Episode } from "./Episode";
import { CapaComp, EpisodioV2Comp, revisaoTamanho, RevisaoComp, TiraComp } from "./v2/Episodio";
import { EpisodioV2 } from "./v2/tipos";
import { PerfilComp } from "./v2/Perfil";
import { ELENCO_H, ELENCO_W, FolhaElenco, FOLHA_H, FOLHA_W, FolhaRevisao } from "./FolhaRevisao";
import { H, W } from "./theme";
import { Folha3D, FOLHA3D_H, FOLHA3D_W } from "./v3d/Folha3D";
import { EpisodeData } from "./types";

type Props = { episode: string; data: EpisodeData | null };

// episode.json é gerado por pipeline/voice.py; ele define a duração do vídeo
const calculateMetadata: CalculateMetadataFunction<Props> = async ({ props }) => {
  const data: EpisodeData = await fetch(staticFile(`${props.episode}/episode.json`)).then((r) => r.json());
  return { durationInFrames: data.durationInFrames, fps: data.fps, props: { ...props, data } };
};

const carregarV2 = async (episode: string): Promise<EpisodioV2> =>
  fetch(staticFile(`${episode}/episode.json`)).then((r) => r.json());

export const Root: React.FC = () => (
  <>
    <Composition
      id="episode"
      component={Episode}
      width={W}
      height={H}
      fps={30}
      durationInFrames={30}
      defaultProps={{ episode: "dia-48/ep01", data: null } as Props}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="episodio"
      component={EpisodioV2Comp}
      width={W}
      height={H}
      fps={30}
      durationInFrames={30}
      defaultProps={{ episode: "avulsas/ep01", data: null as EpisodioV2 | null }}
      calculateMetadata={async ({ props }) => {
        const data = await carregarV2(props.episode);
        return { durationInFrames: data.durationInFrames, fps: data.fps, props: { ...props, data } };
      }}
    />
    {/* folha de cenas: um quadro por batida, num PNG só (remotion still … revisao) */}
    <Composition
      id="revisao"
      component={RevisaoComp}
      width={W}
      height={H}
      fps={30}
      durationInFrames={1}
      defaultProps={{ episode: "avulsas/ep01", data: null as EpisodioV2 | null, em: 0.6 }}
      calculateMetadata={async ({ props }) => {
        const data = await carregarV2(props.episode);
        // a duração do episódio deixa o Freeze chegar em qualquer quadro; o still usa o quadro 0
        return { ...revisaoTamanho(data.beats.length), durationInFrames: data.durationInFrames, props: { ...props, data } };
      }}
    />
    {/* foto de perfil do canal (quadrada; o Instagram recorta em círculo) */}
    <Composition id="perfil" component={PerfilComp} width={1080} height={1080} fps={30} durationInFrames={1}
      defaultProps={{ modo: "personagem" as "personagem" | "simbolo", personagem: "lukas", look: "padrao", fundo: "#12161C", cor: "#7FD3C0" }} />
    {/* capa e artes de lançamento: um quadro do episódio + título (skill publicar) */}
    <Composition
      id="capa"
      component={CapaComp}
      width={W}
      height={H}
      fps={30}
      durationInFrames={1}
      defaultProps={{ episode: "avulsas/ep01", data: null as EpisodioV2 | null, quadro: 0, titulo: "", sub: "", selo: "", escurecer: 0.45, tamanho: 200, legenda: true, hud: true }}
      calculateMetadata={async ({ props }) => {
        const data = await carregarV2(props.episode);
        return { durationInFrames: data.durationInFrames, props: { ...props, data } };
      }}
    />
    {/* tira de quadros sequenciais de uma batida (movimento) */}
    <Composition
      id="tira"
      component={TiraComp}
      width={W}
      height={H}
      fps={30}
      durationInFrames={1}
      defaultProps={{ episode: "avulsas/ep01", data: null as EpisodioV2 | null, batida: 1, passo: 4 }}
      calculateMetadata={async ({ props }) => {
        const data = await carregarV2(props.episode);
        return { ...revisaoTamanho(12), fps: data.fps, durationInFrames: data.durationInFrames, props: { ...props, data } };
      }}
    />
    <Composition
      id="folha"
      component={FolhaRevisao}
      width={FOLHA_W}
      height={FOLHA_H}
      fps={30}
      durationInFrames={90}
      defaultProps={{ personagem: "tiao", tema: "plano" }}
    />
    <Composition
      id="elenco"
      component={FolhaElenco}
      width={ELENCO_W}
      height={ELENCO_H}
      fps={30}
      durationInFrames={90}
      defaultProps={{ ids: ["tiao", "dandara", "bento", "rosana", "valdir", "fabricio"], tema: "plano" }}
    />
    {/* folha do personagem 3D: 6 ações + 6 expressões (remotion still … folha3d --props='{"personagem":"zeca"}') */}
    <Composition id="folha3d" component={Folha3D} width={FOLHA3D_W} height={FOLHA3D_H} fps={30} durationInFrames={90}
      defaultProps={{ personagem: "zeca", qualidade: "suave" as "suave" | "lowpoly" }} />
  </>
);
