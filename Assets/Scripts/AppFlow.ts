// Director del taller: máquina de estados del flujo completo.
// LANG (elegir idioma, carrusel) → MENU (elegir prenda, carrusel) → STYLE
// (describir cómo la querés) → CARDS (moldes del proyecto, modificables)
// → CUT (molde sobre la tela + guía hablada por Nube en tu idioma).

import { Carousel, CarouselItem } from "./Carousel";
import { ProjectCards } from "./ProjectCards";
import { PromptButton } from "./PromptButton";
import { Mascot } from "./Mascot";
import { PatternAI, AICard } from "./PatternAI";
import { PatternRenderer } from "./PatternRenderer";
import { buildSpecFromCard } from "./BlockRegistry";
import { saveProject, loadProject, ProjectData } from "./PatternStore";
import { LANGS, GARMENT_KEYS, setLang, getLangDef, t, garmentName, stepNames } from "./I18n";
import { ProgressSteps } from "./ProgressSteps";

// Talles XXS→4XL por género: busto/pecho, cintura, cadera (cm, punto medio
// de los rangos de las cards de Flor)
const SIZE_LABELS = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const SIZES_F = [
  { bust: 78, waist: 60, hip: 86 },
  { bust: 83, waist: 64, hip: 91 },
  { bust: 88, waist: 69, hip: 96 },
  { bust: 93, waist: 75, hip: 101 },
  { bust: 98, waist: 82, hip: 106 },
  { bust: 105, waist: 91, hip: 113 },
  { bust: 112, waist: 100, hip: 120 },
  { bust: 119, waist: 107, hip: 127 },
  { bust: 126, waist: 114, hip: 134 }
];
const SIZES_M = [
  { bust: 78, waist: 66, hip: 82 },
  { bust: 84, waist: 72, hip: 88 },
  { bust: 91, waist: 77, hip: 93 },
  { bust: 100, waist: 86, hip: 101 },
  { bust: 106, waist: 93, hip: 107 },
  { bust: 113, waist: 101, hip: 114 },
  { bust: 121, waist: 109, hip: 121 },
  { bust: 130, waist: 118, hip: 129 },
  { bust: 141, waist: 132, hip: 140 }
];

@component
export class AppFlow extends BaseScriptComponent {
  @input langCarousel: Carousel;
  @input garmentCarousel: Carousel;
  @input sizeCarousel: Carousel;
  @input
  @allowUndefined
  progress: ProgressSteps;
  @input cards: ProjectCards;
  @input promptBtn: PromptButton;
  @input mascot: Mascot;
  @input ai: PatternAI;
  @input renderer: PatternRenderer;
  @input demoSeed: boolean = false;
  @input
  @allowUndefined
  logoObject: SceneObject; // LogoRoot: se agranda en la pantalla de estilo
  // Cards ilustradas del selector de idiomas (mismo orden que LANGS)
  @input
  @allowUndefined
  langCardTextures: Texture[];
  // Cards ilustradas de prendas (mismo orden que GARMENT_KEYS)
  @input
  @allowUndefined
  garmentCardTextures: Texture[];
  // Íconos de género [mujer, hombre] y cards de talles XXS→4XL por género
  @input
  @allowUndefined
  genderIconTextures: Texture[];
  @input
  @allowUndefined
  sizeCardTexturesF: Texture[];
  @input
  @allowUndefined
  sizeCardTexturesM: Texture[];

  private garment: string = "";
  private garmentLabel: string = "";
  private sizeLabel: string = "";
  private measurements: string = "";
  private genderIdx: number = 0; // 0 = mujer, 1 = hombre
  private lastCutIndex: number = -1;
  private stylePrompt: string = "";
  private projectCards: AICard[] = [];
  private modifyIndex: number = -1;
  private state: string = "LANG";

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.start());
  }

  private setLogoScale(scale: number) {
    if (this.logoObject !== undefined && !isNull(this.logoObject)) {
      this.logoObject.getTransform().setLocalScale(new vec3(scale, scale, scale));
    }
  }

  private setStep(i: number) {
    if (this.progress !== undefined && !isNull(this.progress)) {
      this.progress.setSteps(stepNames(), i);
    }
  }

  private start() {
    this.langCarousel.onPick = (i) => this.onLangPicked(i);
    this.langCarousel.onCentered = (i) => this.previewLang(i);
    this.garmentCarousel.onPick = (i) => this.onGarmentSelected(i);
    this.sizeCarousel.onPick = (i) => {
      if (this.state === "GENDER") {
        this.onGenderPicked(i);
      } else {
        this.onSizePicked(i);
      }
    };
    this.cards.onModify = (i) => this.enterModify(i);
    this.cards.onToCut = (i) => this.sendToFabric(i);
    this.cards.onBack = () => this.enterMenu();
    this.promptBtn.onPrompt = (text) => this.onPrompt(text);
    this.ai.onStatus = (msg, isError) => {
      this.promptBtn.setStatus(msg);
      if (isError) {
        this.mascot.showError(t("mError"));
      }
    };
    this.ai.onCardsReady = (cards, explica) => this.onCardsReady(cards, explica);
    if (this.progress !== undefined && !isNull(this.progress)) {
      this.progress.onStepTapped = (i) => this.jumpToStep(i);
    }
    this.ai.onCardModified = (card, explica) => this.onCardModified(card, explica);

    if (this.demoSeed) {
      // Proyecto de muestra para recorrer todas las pantallas sin AI
      this.garment = "vestido";
      this.garmentLabel = garmentName(4);
      this.measurements = "mujer, talle M: busto 93, cintura 75, cadera 101";
      this.projectCards = [
        { block: "bodice", name: "Corpiño 1950", section: "tops", params: { bust: 93, waist: 75, length: 40 } },
        { block: "circle_skirt", name: "Pollera plato", section: "faldas", params: { waist: 75, length: 65, fullness: 1 } }
      ];
    }

    this.enterLang();
  }

  // La botonera de arriba navega: tocás un paso y volvés/saltás a él
  private jumpToStep(index: number) {
    if (index === 0) {
      this.enterLang();
    } else if (index === 1) {
      this.enterMenu();
    } else if (index === 2) {
      if (this.garment !== "") {
        this.enterGender();
      } else {
        this.enterMenu();
      }
    } else if (index === 3) {
      if (this.measurements !== "") {
        this.enterStyle();
      }
    } else if (index === 4) {
      if (this.projectCards.length > 0) {
        this.enterCards(t("mCards"));
      }
    } else if (index === 5) {
      if (this.lastCutIndex >= 0 && this.lastCutIndex < this.projectCards.length) {
        this.sendToFabric(this.lastCutIndex);
      }
    }
  }

  // ---- Estados ----

  // Al deslizar el carrusel, TODA la pantalla cambia al idioma centrado
  private previewLang(index: number) {
    setLang(LANGS[index].code);
    this.langCarousel.setHeader(t("chooseLang"), t("atelierSpeak"));
    this.langCarousel.setConfirmLabel(t("continueBtn"));
    this.setStep(0);
    this.mascot.say(t("mIntroLang"));
  }

  private enterLang() {
    this.state = "LANG";
    this.setLogoScale(1);
    this.setVisible(true, false, false, false);
    this.setStep(0);
    this.langCarousel.setHeader(t("chooseLang"), t("atelierSpeak"));
    this.langCarousel.setConfirmLabel(t("continueBtn"));
    const texs = this.langCardTextures;
    const items: CarouselItem[] = LANGS.map((l, i) => ({
      title: l.native,
      subtitle: "",
      texture: texs !== undefined && !isNull(texs) && i < texs.length ? texs[i] : undefined
    }));
    this.langCarousel.setItems(items, 0, "🌍");
    this.mascot.say(t("mIntroLang"));
  }

  private onLangPicked(index: number) {
    setLang(LANGS[index].code);
    this.ai.setLanguage(getLangDef().aiName);
    // Siempre al menú de prendas: el proyecto arranca acá
    this.enterMenu();
  }

  private enterMenu() {
    this.state = "MENU";
    this.setLogoScale(1);
    this.setVisible(false, true, false, false);
    this.setStep(1);
    this.garmentCarousel.setHeader(t("menuTitle"), "");
    this.garmentCarousel.setConfirmLabel(t("continueBtn"));
    const gtexs = this.garmentCardTextures;
    const items: CarouselItem[] = GARMENT_KEYS.map((k, i) => ({
      title: garmentName(i),
      subtitle: "",
      texture: gtexs !== undefined && !isNull(gtexs) && i < gtexs.length ? gtexs[i] : undefined
    }));
    this.garmentCarousel.setItems(items, 0, t("menuTitle"));
    this.mascot.speak(t("mIntroMenu"));
  }

  private onGarmentSelected(index: number) {
    this.garment = GARMENT_KEYS[index];
    this.garmentLabel = garmentName(index);
    this.enterGender();
  }

  // ¿Mujer u hombre? (define la tabla de talles y el trazado)
  private enterGender() {
    this.state = "GENDER";
    this.setLogoScale(1);
    this.setVisible(false, false, false, false);
    this.sizeCarousel.getSceneObject().enabled = true;
    this.setStep(2);
    this.sizeCarousel.setShowCenteredTitle(true);
    this.sizeCarousel.setHeader(t("mGender"), "");
    this.sizeCarousel.setConfirmLabel(t("continueBtn"));
    const gtex = this.genderIconTextures;
    const items: CarouselItem[] = [t("genderF"), t("genderM")].map((label, i) => ({
      title: label,
      subtitle: "",
      texture: gtex !== undefined && !isNull(gtex) && i < gtex.length ? gtex[i] : undefined
    }));
    this.sizeCarousel.setItems(items, 0, t("mGender"));
    this.mascot.speak(t("mGender"));
  }

  private onGenderPicked(index: number) {
    this.genderIdx = index;
    this.enterSize();
  }

  // Guía de talles: cards XXS→4XL del género elegido
  private enterSize() {
    this.state = "SIZE";
    this.setLogoScale(1);
    this.setStep(2);
    this.setVisible(false, false, false, false);
    this.sizeCarousel.getSceneObject().enabled = true;
    this.sizeCarousel.setShowCenteredTitle(false);
    const texs = this.genderIdx === 0 ? this.sizeCardTexturesF : this.sizeCardTexturesM;
    const items: CarouselItem[] = SIZE_LABELS.map((label, i) => ({
      title: label,
      subtitle: "",
      texture: texs !== undefined && !isNull(texs) && i < texs.length ? texs[i] : undefined
    }));
    this.sizeCarousel.setHeader(t("sizeTitle"), "");
    this.sizeCarousel.setConfirmLabel(t("continueBtn"));
    this.sizeCarousel.setItems(items, 3, t("sizeTitle"));
    this.mascot.speak(t("mSize"));
  }

  private onSizePicked(index: number) {
    const table = this.genderIdx === 0 ? SIZES_F : SIZES_M;
    const sz = table[index];
    this.sizeLabel = SIZE_LABELS[index];
    const genderWord = this.genderIdx === 0 ? "mujer" : "hombre";
    const bustWord = this.genderIdx === 0 ? "busto" : "pecho";
    this.measurements = genderWord + ", talle " + this.sizeLabel + ": " + bustWord + " " + sz.bust + ", cintura " + sz.waist + ", cadera " + sz.hip;
    this.enterStyle();
  }

  private enterStyle() {
    this.state = "STYLE";
    this.setStep(3);
    this.setLogoScale(1.35);
    this.setVisible(false, false, false, true);
    this.promptBtn.configure(t("tellStyle"), t("typeHint"), []);
    this.mascot.speak(t("mStyle"));
  }

  private enterCards(mascotMsg: string) {
    this.state = "CARDS";
    this.setLogoScale(1);
    this.setStep(4);
    this.setVisible(false, false, true, false);
    this.cards.show(this.projectCards, -1);
    this.mascot.say(mascotMsg);
  }

  private enterModify(index: number) {
    this.state = "MODIFY";
    this.modifyIndex = index;
    this.setVisible(false, false, true, true);
    this.promptBtn.configure(t("sayChange"), t("typeHint"), []);
    this.mascot.speak(t("mModify"));
  }

  private sendToFabric(index: number) {
    this.lastCutIndex = index;
    const card = this.projectCards[index];
    const spec = buildSpecFromCard(card);
    if (spec === null) {
      return;
    }
    this.renderer.renderPattern(spec);
    this.setStep(5);
    this.mascot.setMood("wink");
    // Guía de corte paso a paso, generada por la AI y hablada por Nube
    const foldInfo = spec.pieces.map((p) => ({ name: p.name, cutOnFold: p.cutOnFold === true, doubleFabric: p.doubleFabric === true }));
    this.mascot.setThinking(true);
    this.ai.generateCuttingGuide(JSON.stringify({ card: card, pieces: foldInfo }), (guide) => {
      this.mascot.setThinking(false);
      this.mascot.speak(guide);
    });
  }

  // ---- Voz / teclado y AI ----

  private onPrompt(text: string) {
    this.mascot.setMood("");
    if (this.state === "STYLE") {
      this.stylePrompt = text;
      this.mascot.setThinking(true);
      this.ai.generateGarment(this.garmentLabel + " (" + this.garment + ")", text, this.measurements);
      this.mascot.say(t("working"));
    } else if (this.state === "MODIFY" && this.modifyIndex >= 0) {
      this.mascot.setThinking(true);
      this.ai.modifyCard(this.projectCards[this.modifyIndex], text);
      this.mascot.say(t("working"));
    }
  }

  private onCardsReady(cards: AICard[], explica: string) {
    this.mascot.setThinking(false);
    this.mascot.setMood("happy");
    this.projectCards = cards;
    this.persist();
    this.enterCards("");
    this.mascot.speak((explica !== "" ? explica + ". " : "") + t("mCards"));
  }

  private onCardModified(card: AICard, explica: string) {
    this.mascot.setThinking(false);
    if (this.modifyIndex >= 0 && this.modifyIndex < this.projectCards.length) {
      this.projectCards[this.modifyIndex] = card;
      this.persist();
      const idx = this.modifyIndex;
      this.modifyIndex = -1;
      this.state = "CARDS";
      this.setVisible(false, false, true, false);
      this.cards.show(this.projectCards, idx);
      this.mascot.speak(explica !== "" ? explica : card.name);
    }
  }

  private persist() {
    const data: ProjectData = {
      garment: this.garment,
      garmentLabel: this.garmentLabel,
      stylePrompt: this.stylePrompt,
      cards: this.projectCards
    };
    saveProject(data);
  }

  private setVisible(langOn: boolean, menuOn: boolean, cardsOn: boolean, promptOn: boolean) {
    this.langCarousel.getSceneObject().enabled = langOn;
    this.garmentCarousel.getSceneObject().enabled = menuOn;
    this.sizeCarousel.getSceneObject().enabled = false;
    this.cards.getSceneObject().enabled = cardsOn;
    this.promptBtn.getSceneObject().enabled = promptOn;
  }
}
