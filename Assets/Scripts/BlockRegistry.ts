// Registro de bloques paramétricos: mapea un card guardado (block + params)
// al PatternSpec listo para renderizar. Acá se suman los bloques nuevos.

import { PatternSpec } from "./PatternTypes";
import { draftStraightSkirt } from "./SkirtBlock";
import { draftBodice } from "./BodiceBlock";
import { draftSleeve } from "./SleeveBlock";
import { draftCircleSkirt } from "./CircleSkirtBlock";
import { draftPants, draftLeggings, draftUnderwear } from "./MoreBlocks";
import { draftShirt, draftCollar, draftCuff } from "./ShirtBlock";

export interface CardData {
  id: number;
  block: string;
  name: string;
  section: string;
  params: { [key: string]: number };
  created: number;
}

export function buildSpecFromCard(card: {
  block: string;
  name: string;
  section: string;
  params: { [key: string]: number };
}): PatternSpec | null {
  let spec: PatternSpec | null = null;
  if (card.block === "skirt") {
    spec = draftStraightSkirt({
      waist: card.params["waist"],
      hip: card.params["hip"],
      length: card.params["length"],
      flare: card.params["flare"]
    });
  } else if (card.block === "bodice") {
    spec = draftBodice({
      bust: card.params["bust"],
      waist: card.params["waist"],
      length: card.params["length"]
    });
  } else if (card.block === "sleeve") {
    spec = draftSleeve({
      armhole: card.params["armhole"],
      length: card.params["length"],
      wrist: card.params["wrist"]
    });
  } else if (card.block === "circle_skirt") {
    spec = draftCircleSkirt({
      waist: card.params["waist"],
      length: card.params["length"],
      fullness: card.params["fullness"]
    });
  } else if (card.block === "pants") {
    spec = draftPants({
      waist: card.params["waist"],
      hip: card.params["hip"],
      length: card.params["length"],
      rise: card.params["rise"],
      legOpening: card.params["legOpening"]
    });
  } else if (card.block === "leggings") {
    spec = draftLeggings({
      waist: card.params["waist"],
      hip: card.params["hip"],
      length: card.params["length"],
      ankle: card.params["ankle"]
    });
  } else if (card.block === "underwear") {
    spec = draftUnderwear({
      hip: card.params["hip"],
      rise: card.params["rise"]
    });
  } else if (card.block === "shirt") {
    spec = draftShirt({
      bust: card.params["bust"],
      waist: card.params["waist"],
      length: card.params["length"]
    });
  } else if (card.block === "collar") {
    spec = draftCollar({
      neck: card.params["neck"],
      height: card.params["height"]
    });
  } else if (card.block === "cuff") {
    spec = draftCuff({
      wrist: card.params["wrist"],
      height: card.params["height"]
    });
  }
  if (spec === null) {
    return null;
  }
  if (card.name !== undefined && card.name !== "") {
    spec.name = card.name;
  }
  if (card.section !== undefined && card.section !== "") {
    spec.section = card.section;
  }
  return spec;
}
