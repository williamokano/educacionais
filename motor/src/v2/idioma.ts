import React from "react";

// Idioma de saída do episódio (episode.json → "idioma"). As instruções e a aprovação do texto são em pt-BR;
// o vídeo sai em qualquer idioma daqui. Idioma novo: acrescente uma entrada em TEXTOS e em FRACAS.

export type Idioma = "pt" | "de" | "en" | "es";

/** textos fixos do motor (cartão final, escolha, versus) */
export const TEXTOS: Record<Idioma, { siga: string; comente: string; ou: string; parte: string; vs: string; locale: string }> = {
  pt: { siga: "SIGA", comente: "COMENTE A OU B", ou: "OU", parte: "PARTE", vs: "VS", locale: "pt-BR" },
  de: { siga: "FOLGEN", comente: "KOMMENTIERE A ODER B", ou: "ODER", parte: "TEIL", vs: "VS", locale: "de-DE" },
  en: { siga: "FOLLOW", comente: "COMMENT A OR B", ou: "OR", parte: "PART", vs: "VS", locale: "en-US" },
  es: { siga: "SÍGUENOS", comente: "COMENTA A O B", ou: "O", parte: "PARTE", vs: "VS", locale: "es-ES" },
};

/** palavras que não podem terminar um bloco de legenda (artigo, preposição, conjunção) */
export const FRACAS: Record<Idioma, Set<string>> = {
  pt: new Set("o a os as um uma uns umas de da do das dos em na no nas nos pra pro pras pros por pelo pela com e ou que se ao à mas sem meu minha seu sua".split(" ")),
  de: new Set("der die das den dem des ein eine einen einem einer eines und oder aber zu zum zur von vom mit in im an am auf aus bei für nach um durch über unter vor dass wenn als wie nicht kein keine mein meine meinen meinem meiner meines dein deine deinen deinem deiner sein seine seinen seinem seiner seines ihr ihre ihren ihrem ihrer unser unsere unseren euer eure".split(" ")),
  en: new Set("the a an of to in on at for and or but with from by as that if into than not no my your his her its our their".split(" ")),
  es: new Set("el la los las un una unos unas de del en con y o pero por para que si al sin".split(" ")),
};

export const IdiomaCtx = React.createContext<Idioma>("pt");
export const useIdioma = () => React.useContext(IdiomaCtx);
export const useTextos = () => TEXTOS[useIdioma()] ?? TEXTOS.pt;
export const idiomaDe = (v?: string): Idioma => ((v ?? "pt").slice(0, 2) as Idioma) in TEXTOS ? ((v ?? "pt").slice(0, 2) as Idioma) : "pt";
