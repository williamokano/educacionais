import { Personagem, Tema } from "../src/rig/types";
import { Pacote } from "../src/v2/pacote";
import { benchmarkEstudio } from "./benchmark/estudio";
import { avulsas } from "./series/avulsas";
import { explicadores } from "./series/explicadores";
import { contornado } from "./temas/contornado";
import { plano } from "./temas/plano";

// Registro de pacotes. A chave é o slug: o mesmo de public/<slug>/epNN/ e do campo "slug" do roteiro.json.
// Este arquivo é do projeto: o motion-videos-motor cria uma vez e nunca sobrescreve.
export const PACOTES: Record<string, Pacote> = {
  benchmark: benchmarkEstudio, // estúdio dos benchmarks de personagem e de cartões
  // série dos explicadores 3D (os roteiros usam o slug "demo-3d"; o pacote "demo-3d" do plugin fica de fora de propósito)
  "demo-3d": explicadores,
  // cenas avulsas (skill cenas-animadas)
  avulsas,
};

export const TEMAS: Record<string, Tema> = { plano, contornado };

/** Todos os personagens do banco, para as folhas de revisão. Ids repetidos entre pacotes são erro. */
export const PERSONAGENS: Record<string, Personagem> = (() => {
  const todos: Record<string, Personagem> = {};
  for (const [slug, p] of Object.entries(PACOTES)) {
    for (const [id, personagem] of Object.entries(p.personagens)) {
      if (todos[id]) throw new Error(`personagem "${id}" repetido no banco (pacote ${slug})`);
      todos[id] = personagem;
    }
  }
  return todos;
})();
