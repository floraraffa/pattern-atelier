// Pattern Atelier — editorial UI face (mockup boards) + AI pattern pipeline.
// Flow: LANDING → GARMENT → BODY → MEASURE → DESIGN → GENERATE → PREVIEW → FABRIC
// Language is a minimal EN▾ dropdown overlay — never a landing page.

import { Carousel, CarouselItem } from "./Carousel";
import { ProjectCards } from "./ProjectCards";
import { PromptButton } from "./PromptButton";
import { Mascot } from "./Mascot";
import { PatternAI, AICard } from "./PatternAI";
import { PatternRenderer } from "./PatternRenderer";
import { FitPreview } from "./FitPreview";
import { buildSpecFromCard } from "./BlockRegistry";
import { saveProject, ProjectData } from "./PatternStore";
import { LANGS, GARMENT_KEYS, setLang, getLangDef, t, garmentName, stepNames } from "./I18n";
import { ProgressSteps } from "./ProgressSteps";
import { BackNav } from "./BackNav";
import { AtelierFace, HOTSPOTS, AtelierScreenId } from "./AtelierFace";
import { LangDropdown } from "./LangDropdown";

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

// Mockup garment carousel: TOP / DRESS / TROUSERS / SKIRT / JACKET → existing keys
const ATELIER_GARMENTS: { key: string; garmentIndex: number }[] = [
  { key: "camisa", garmentIndex: 2 },
  { key: "vestido", garmentIndex: 4 },
  { key: "pantalon", garmentIndex: 3 },
  { key: "pollera", garmentIndex: 0 },
  { key: "camisa", garmentIndex: 2 }
];

@component
export class AppFlow extends BaseScriptComponent {
  @input langCarousel: Carousel;
  @input garmentCarousel: Carousel;
  @input sizeCarousel: Carousel;
  @input
  @allowUndefined
  progress: ProgressSteps;
  @input
  @allowUndefined
  backNav: BackNav;
  @input cards: ProjectCards;
  @input promptBtn: PromptButton;
  @input mascot: Mascot;
  @input ai: PatternAI;
  @input renderer: PatternRenderer;
  @input
  @allowUndefined
  fitPreview: FitPreview;
  @input
  @allowUndefined
  atelierFace: AtelierFace;
  @input
  @allowUndefined
  langDropdown: LangDropdown;
  @input demoSeed: boolean = false;
  @input
  @allowUndefined
  logoObject: SceneObject;
  @input
  @allowUndefined
  langCardTextures: Texture[];
  @input
  @allowUndefined
  garmentCardTextures: Texture[];
  @input
  @allowUndefined
  genderIconTextures: Texture[];
  @input
  @allowUndefined
  genderLabelTextures: Texture[];
  @input
  @allowUndefined
  sizeCardTexturesF: Texture[];
  @input
  @allowUndefined
  sizeCardTexturesM: Texture[];

  private garment: string = "";
  private garmentLabel: string = "";
  private sizeLabel: string = "M";
  private measurements: string = "";
  private genderIdx: number = 0;
  private sizeIdx: number = 3; // M
  private garmentPick: number = 1; // DRESS default
  private lastCutIndex: number = -1;
  private stylePrompt: string = "";
  private projectCards: AICard[] = [];
  private modifyIndex: number = -1;
  private state: string = "LANDING";
  private seededDemo: boolean = false;
  private useAtelier: boolean = false;

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
      // Progress chrome lives inside mockups when atelier face is active
      this.progress.getSceneObject().enabled = !this.useAtelier;
      if (!this.useAtelier) {
        this.progress.setSteps(stepNames(), i);
      }
    }
  }

  private start() {
    this.useAtelier =
      this.atelierFace !== undefined && !isNull(this.atelierFace);

    setLang("en");
    this.ai.setLanguage(getLangDef().aiName);

    this.langCarousel.onPick = (i) => this.onLangPicked(i);
    this.langCarousel.onCentered = (i) => this.previewLang(i);
    this.garmentCarousel.onPick = (i) => this.onGarmentSelected(i);
    this.sizeCarousel.onPick = (i) => {
      if (this.state === "GENDER" || this.state === "BODY") {
        this.onGenderPicked(i);
      } else {
        this.onSizePicked(i);
      }
    };
    this.cards.onModify = (i) => this.enterModify(i);
    this.cards.onToCut = (i) => this.enterPreview(i);
    this.cards.onBack = () => this.enterDesign();
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
    if (this.backNav !== undefined && !isNull(this.backNav)) {
      this.backNav.onBack = () => this.goBack();
      this.backNav.getSceneObject().enabled = !this.useAtelier;
    }
    this.ai.onCardModified = (card, explica) => this.onCardModified(card, explica);
    if (this.fitPreview !== undefined && !isNull(this.fitPreview)) {
      this.fitPreview.onCut = () => {
        if (this.lastCutIndex >= 0) {
          this.sendToFabric(this.lastCutIndex);
        }
      };
      this.fitPreview.onBack = () => this.enterCards(t("mCards"));
    }

    if (this.atelierFace !== undefined && !isNull(this.atelierFace)) {
      this.atelierFace.onHotspot = (id) => this.onAtelierHotspot(id);
    }
    if (this.langDropdown !== undefined && !isNull(this.langDropdown)) {
      this.langDropdown.onChanged = (code) => {
        this.ai.setLanguage(getLangDef().aiName);
        this.langDropdown.refresh();
        this.mascot.say(t("mLangChanged"));
        // Refresh current atelier screen captions via re-show
        this.refreshCurrentScreen();
      };
      this.langDropdown.setVisible(true);
    }

    if (this.logoObject !== undefined && !isNull(this.logoObject)) {
      this.logoObject.enabled = !this.useAtelier;
    }

    if (this.demoSeed) {
      this.garment = "vestido";
      this.garmentLabel = garmentName(4);
      this.measurements = "mujer, talle M: busto 93, cintura 75, cadera 101";
      this.projectCards = [
        { block: "bodice", name: "Corpiño 1950", section: "tops", params: { bust: 93, waist: 75, length: 40 } },
        { block: "circle_skirt", name: "Pollera plato", section: "faldas", params: { waist: 75, length: 65, fullness: 1 } }
      ];
      this.seededDemo = true;
    }

    if (this.useAtelier) {
      // Defer one frame so AtelierFace OnStart has created its root
      const delay = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent;
      delay.bind(() => this.enterLanding());
      delay.reset(0.05);
    } else {
      this.enterLang();
    }
  }

  private refreshCurrentScreen() {
    if (!this.useAtelier) {
      return;
    }
    if (this.state === "LANDING") this.enterLanding();
    else if (this.state === "GARMENT" || this.state === "MENU") this.enterGarment();
    else if (this.state === "BODY" || this.state === "GENDER") this.enterBody();
    else if (this.state === "MEASURE" || this.state === "SIZE") this.enterMeasure();
    else if (this.state === "DESIGN" || this.state === "STYLE") this.enterDesign();
    else if (this.state === "GENERATE") this.showAtelier("generate", HOTSPOTS.generate);
    else if (this.state === "PREVIEW" || this.state === "FIT" || this.state === "CARDS") {
      this.showAtelier("preview", HOTSPOTS.preview);
    }
  }

  private showAtelier(id: AtelierScreenId, spots: typeof HOTSPOTS.landing) {
    this.hideLegacyUi();
    if (this.atelierFace !== undefined && !isNull(this.atelierFace)) {
      this.atelierFace.show(id, spots);
    }
    if (this.langDropdown !== undefined && !isNull(this.langDropdown)) {
      this.langDropdown.setVisible(true);
      this.langDropdown.refresh();
    }
  }

  private hideLegacyUi() {
    this.langCarousel.getSceneObject().enabled = false;
    this.garmentCarousel.getSceneObject().enabled = false;
    this.sizeCarousel.getSceneObject().enabled = false;
    this.cards.getSceneObject().enabled = false;
    this.promptBtn.getSceneObject().enabled = false;
    if (this.fitPreview !== undefined && !isNull(this.fitPreview)) {
      this.fitPreview.hide();
    }
    if (this.progress !== undefined && !isNull(this.progress)) {
      this.progress.getSceneObject().enabled = false;
    }
    if (this.backNav !== undefined && !isNull(this.backNav)) {
      this.backNav.getSceneObject().enabled = false;
    }
  }

  private onAtelierHotspot(id: string) {
    if (this.state === "LANDING") {
      if (id === "enter") this.enterGarment();
      return;
    }
    if (this.state === "GARMENT") {
      if (id === "prev") {
        this.garmentPick = (this.garmentPick + 4) % 5;
        return;
      }
      if (id === "next") {
        this.garmentPick = (this.garmentPick + 1) % 5;
        return;
      }
      if (id.indexOf("card") === 0) {
        const n = parseInt(id.substring(4), 10);
        if (!isNaN(n) && n >= 0 && n < 5) {
          this.garmentPick = n;
          this.commitGarment();
        }
      }
      return;
    }
    if (this.state === "BODY") {
      if (id === "woman") {
        this.genderIdx = 0;
        this.sizeIdx = 3;
      } else if (id === "man") {
        this.genderIdx = 1;
        this.sizeIdx = 3;
      } else if (id === "confirm") {
        this.commitBody();
        this.enterMeasure();
      }
      return;
    }
    if (this.state === "MEASURE") {
      if (id === "back") {
        this.enterBody();
        return;
      }
      if (id === "scan" || id === "manual" || id === "standard" || id === "confirm") {
        this.commitMeasurements();
        this.enterDesign();
      }
      return;
    }
    if (this.state === "DESIGN") {
      if (id === "back") {
        this.enterMeasure();
        return;
      }
      if (id === "type" || id === "voice") {
        // Reveal prompt under the board for text/ASR
        this.promptBtn.getSceneObject().enabled = true;
        this.promptBtn.configure(t("tellStyle"), t("typeHint"), []);
        if (id === "voice") {
          this.mascot.speak(t("mStyle"));
        }
      }
      return;
    }
    if (this.state === "PREVIEW" || this.state === "CARDS" || this.state === "FIT") {
      if (id === "back") {
        this.enterDesign();
        return;
      }
      if (id === "approve") {
        const idx = this.lastCutIndex >= 0 ? this.lastCutIndex : 0;
        this.sendToFabric(idx);
        return;
      }
      if (id === "regenerate") {
        this.enterDesign();
        return;
      }
      return;
    }
    if (this.state === "FABRIC" || this.state === "CUT") {
      if (id === "back") {
        this.enterPreview(this.lastCutIndex >= 0 ? this.lastCutIndex : 0);
      } else if (id === "nextPiece") {
        if (this.projectCards.length > 1) {
          const next = (this.lastCutIndex + 1) % this.projectCards.length;
          this.sendToFabric(next);
        }
      }
    }
  }

  private commitGarment() {
    const g = ATELIER_GARMENTS[this.garmentPick];
    this.garment = g.key;
    this.garmentLabel = garmentName(g.garmentIndex);
    this.enterBody();
  }

  private commitBody() {
    // genderIdx + sizeIdx already set
  }

  private commitMeasurements() {
    const table = this.genderIdx === 0 ? SIZES_F : SIZES_M;
    const sz = table[this.sizeIdx];
    this.sizeLabel = SIZE_LABELS[this.sizeIdx];
    const genderWord = this.genderIdx === 0 ? "mujer" : "hombre";
    const bustWord = this.genderIdx === 0 ? "busto" : "pecho";
    this.measurements =
      genderWord +
      ", talle " +
      this.sizeLabel +
      ": " +
      bustWord +
      " " +
      sz.bust +
      ", cintura " +
      sz.waist +
      ", cadera " +
      sz.hip;
  }

  // ---- Atelier screens ----

  private enterLanding() {
    this.state = "LANDING";
    this.setStep(0);
    this.showAtelier("landing", HOTSPOTS.landing);
    // Prefer spoken intro; hard-fallback if i18n cache is stale
    let intro = t("mIntroLanding");
    if (intro === "mIntroLanding") {
      intro = "Welcome to the atelier. Tap ENTER ATELIER to begin.";
    }
    this.mascot.speak(intro);
  }

  private enterGarment() {
    this.state = "GARMENT";
    this.setStep(1);
    this.showAtelier("garment", HOTSPOTS.garment);
    this.mascot.speak(t("mIntroMenu"));
  }

  private enterBody() {
    this.state = "BODY";
    this.setStep(2);
    this.showAtelier("body", HOTSPOTS.body);
    this.mascot.speak(t("mGender"));
  }

  private enterMeasure() {
    this.state = "MEASURE";
    this.setStep(3);
    this.showAtelier("measure", HOTSPOTS.measure);
    this.mascot.speak(t("mSize"));
  }

  private enterDesign() {
    this.state = "DESIGN";
    this.setStep(4);
    this.showAtelier("design", HOTSPOTS.design);
    this.promptBtn.getSceneObject().enabled = false;
    this.mascot.speak(t("mStyle"));
  }

  private enterGenerate() {
    this.state = "GENERATE";
    this.setStep(5);
    this.showAtelier("generate", HOTSPOTS.generate);
    this.mascot.setThinking(true);
    this.mascot.say(t("working"));
  }

  private enterPreview(index: number) {
    this.lastCutIndex = index;
    this.state = "PREVIEW";
    this.setStep(6);
    this.showAtelier("preview", HOTSPOTS.preview);
    this.mascot.setMood("happy");
    this.mascot.say(t("mCards"));
  }

  // ---- Legacy carousel path (fallback if AtelierFace not wired) ----

  private jumpToStep(index: number) {
    if (this.useAtelier) {
      if (index === 0) this.enterLanding();
      else if (index === 1) this.enterGarment();
      else if (index === 2 && this.garment !== "") this.enterBody();
      else if (index === 3 && this.measurements !== "") this.enterMeasure();
      else if (index === 4 && this.measurements !== "") this.enterDesign();
      else if (index === 5 && this.projectCards.length > 0) this.enterGenerate();
      else if (index === 6 && this.projectCards.length > 0) {
        this.enterPreview(this.lastCutIndex >= 0 ? this.lastCutIndex : 0);
      }
      return;
    }
    if (index === 0) this.enterLang();
    else if (index === 1) this.enterMenu();
    else if (index === 2) {
      if (this.garment !== "") this.enterGender();
      else this.enterMenu();
    } else if (index === 3) {
      if (this.measurements !== "") this.enterStyle();
    } else if (index === 4) {
      if (this.projectCards.length > 0) this.enterCards(t("mCards"));
    } else if (index === 5) {
      if (this.projectCards.length > 0) {
        const idx = this.lastCutIndex >= 0 ? this.lastCutIndex : 0;
        this.enterFitPreview(idx);
      }
    } else if (index === 6) {
      if (this.lastCutIndex >= 0 && this.lastCutIndex < this.projectCards.length) {
        this.sendToFabric(this.lastCutIndex);
      }
    }
  }

  private goBack() {
    if (this.useAtelier) {
      if (this.state === "GARMENT") this.enterLanding();
      else if (this.state === "BODY") this.enterGarment();
      else if (this.state === "MEASURE") this.enterBody();
      else if (this.state === "DESIGN") this.enterMeasure();
      else if (this.state === "GENERATE") this.enterDesign();
      else if (this.state === "PREVIEW") this.enterDesign();
      else if (this.state === "FABRIC" || this.state === "CUT") {
        this.enterPreview(this.lastCutIndex >= 0 ? this.lastCutIndex : 0);
      }
      return;
    }
    if (this.state === "MENU") this.enterLang();
    else if (this.state === "GENDER") this.enterMenu();
    else if (this.state === "SIZE") this.enterGender();
    else if (this.state === "STYLE") this.enterSize();
    else if (this.state === "CARDS") this.enterStyle();
    else if (this.state === "MODIFY") this.enterCards(t("mCards"));
    else if (this.state === "FIT") this.enterCards(t("mCards"));
    else if (this.state === "CUT") {
      const idx = this.lastCutIndex >= 0 ? this.lastCutIndex : 0;
      this.enterFitPreview(idx);
    }
  }

  private syncBackNav() {
    if (this.backNav === undefined || isNull(this.backNav) || this.useAtelier) {
      return;
    }
    this.backNav.setVisible(this.state !== "LANG");
  }

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
    this.syncBackNav();
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
    this.enterMenu();
  }

  private enterMenu() {
    this.state = "MENU";
    this.setLogoScale(1);
    this.setVisible(false, true, false, false);
    this.setStep(1);
    this.syncBackNav();
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

  private enterGender() {
    this.state = "GENDER";
    this.setLogoScale(1);
    this.setVisible(false, false, false, false);
    this.sizeCarousel.getSceneObject().enabled = true;
    this.setStep(2);
    this.syncBackNav();
    this.sizeCarousel.setShowCenteredTitle(true);
    this.sizeCarousel.setHeader(t("mGender"), "");
    this.sizeCarousel.setConfirmLabel(t("continueBtn"));
    const gtex = this.genderIconTextures;
    const gpill = this.genderLabelTextures;
    const items: CarouselItem[] = [t("genderF"), t("genderM")].map((label, i) => ({
      title: label,
      subtitle: "",
      texture: gtex !== undefined && !isNull(gtex) && i < gtex.length ? gtex[i] : undefined,
      labelTexture: gpill !== undefined && !isNull(gpill) && i < gpill.length ? gpill[i] : undefined
    }));
    this.sizeCarousel.setItems(items, 0, t("mGender"));
    this.mascot.speak(t("mGender"));
  }

  private onGenderPicked(index: number) {
    this.genderIdx = index;
    this.enterSize();
  }

  private enterSize() {
    this.state = "SIZE";
    this.setLogoScale(1);
    this.setStep(2);
    this.setVisible(false, false, false, false);
    this.syncBackNav();
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
    this.sizeIdx = index;
    this.commitMeasurements();
    if (this.useAtelier) {
      this.enterDesign();
    } else {
      this.enterStyle();
    }
  }

  private enterStyle() {
    this.state = "STYLE";
    this.setStep(3);
    this.setLogoScale(1.35);
    this.setVisible(false, false, false, true);
    this.syncBackNav();
    this.promptBtn.configure(t("tellStyle"), t("typeHint"), []);
    this.mascot.speak(t("mStyle"));
  }

  private enterCards(mascotMsg: string) {
    if (this.seededDemo && this.projectCards.length >= 2) {
      this.projectCards[0].name = t("demoBodice");
      this.projectCards[1].name = t("demoSkirt");
    }
    if (this.useAtelier) {
      this.enterPreview(0);
      if (mascotMsg !== "") {
        this.mascot.say(mascotMsg);
      }
      return;
    }
    this.state = "CARDS";
    this.setLogoScale(1);
    this.setStep(4);
    this.setVisible(false, false, true, false);
    this.syncBackNav();
    this.cards.show(this.projectCards, -1);
    this.mascot.say(mascotMsg);
  }

  private enterModify(index: number) {
    this.state = "MODIFY";
    this.modifyIndex = index;
    this.setVisible(false, false, true, true);
    this.syncBackNav();
    this.promptBtn.configure(t("sayChange"), t("typeHint"), []);
    this.mascot.speak(t("mModify"));
  }

  private enterFitPreview(index: number) {
    this.lastCutIndex = index;
    this.state = "FIT";
    this.setLogoScale(1);
    this.setVisible(false, false, false, false, true);
    this.setStep(5);
    this.syncBackNav();
    if (this.fitPreview === undefined || isNull(this.fitPreview)) {
      print("AppFlow: fitPreview no cableado");
      this.mascot.speak(t("fitError"));
      return;
    }
    this.fitPreview.showLoading();
    this.mascot.setThinking(true);
    this.mascot.say(t("fitWorking"));
    const context = JSON.stringify({
      garment: this.garmentLabel,
      garmentKey: this.garment,
      measurements: this.measurements,
      style: this.stylePrompt,
      cards: this.projectCards
    });
    this.ai.generateFitPreview(context, (fitPhrase, texture) => {
      this.mascot.setThinking(false);
      this.mascot.setMood("happy");
      if (texture !== null && !isNull(texture)) {
        this.fitPreview.showResult(texture, fitPhrase);
      } else {
        this.fitPreview.showTextOnly(fitPhrase, true);
      }
      this.mascot.speak(fitPhrase);
    });
  }

  private sendToFabric(index: number) {
    this.lastCutIndex = index;
    this.state = this.useAtelier ? "FABRIC" : "CUT";
    const card = this.projectCards[index];
    if (card === undefined) {
      return;
    }
    const spec = buildSpecFromCard(card);
    if (spec === null) {
      return;
    }
    this.renderer.renderPattern(spec);
    this.setStep(7);
    this.syncBackNav();
    if (this.fitPreview !== undefined && !isNull(this.fitPreview)) {
      this.fitPreview.hide();
    }
    if (this.useAtelier) {
      this.showAtelier("fabric", HOTSPOTS.fabric);
    } else {
      this.setVisible(false, false, false, false, false);
    }
    this.mascot.setMood("wink");
    const foldInfo = spec.pieces.map((p) => ({
      name: p.name,
      cutOnFold: p.cutOnFold === true,
      doubleFabric: p.doubleFabric === true
    }));
    this.mascot.setThinking(true);
    this.ai.generateCuttingGuide(JSON.stringify({ card: card, pieces: foldInfo }), (guide) => {
      this.mascot.setThinking(false);
      this.mascot.speak(guide);
    });
  }

  private onPrompt(text: string) {
    this.mascot.setMood("");
    if (this.state === "STYLE" || this.state === "DESIGN") {
      this.stylePrompt = text;
      if (this.useAtelier) {
        this.enterGenerate();
      } else {
        this.mascot.setThinking(true);
        this.mascot.say(t("working"));
      }
      this.ai.generateGarment(this.garmentLabel + " (" + this.garment + ")", text, this.measurements);
      if (!this.useAtelier) {
        this.mascot.setThinking(true);
      }
    } else if (this.state === "MODIFY" && this.modifyIndex >= 0) {
      this.mascot.setThinking(true);
      this.ai.modifyCard(this.projectCards[this.modifyIndex], text);
      this.mascot.say(t("working"));
    }
  }

  private onCardsReady(cards: AICard[], explica: string) {
    this.mascot.setThinking(false);
    this.mascot.setMood("happy");
    this.seededDemo = false;
    this.projectCards = cards;
    this.persist();
    if (this.useAtelier) {
      this.enterPreview(0);
      this.mascot.speak((explica !== "" ? explica + ". " : "") + t("mCards"));
    } else {
      this.enterCards("");
      this.mascot.speak((explica !== "" ? explica + ". " : "") + t("mCards"));
    }
  }

  private onCardModified(card: AICard, explica: string) {
    this.mascot.setThinking(false);
    if (this.modifyIndex >= 0 && this.modifyIndex < this.projectCards.length) {
      this.projectCards[this.modifyIndex] = card;
      this.persist();
      const idx = this.modifyIndex;
      this.modifyIndex = -1;
      if (this.useAtelier) {
        this.enterPreview(idx);
      } else {
        this.state = "CARDS";
        this.setVisible(false, false, true, false);
        this.cards.show(this.projectCards, idx);
      }
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

  private setVisible(langOn: boolean, menuOn: boolean, cardsOn: boolean, promptOn: boolean, fitOn: boolean = false) {
    if (this.useAtelier && this.atelierFace !== undefined && !isNull(this.atelierFace)) {
      this.atelierFace.hide();
    }
    this.langCarousel.getSceneObject().enabled = langOn;
    this.garmentCarousel.getSceneObject().enabled = menuOn;
    this.sizeCarousel.getSceneObject().enabled = false;
    this.cards.getSceneObject().enabled = cardsOn;
    this.promptBtn.getSceneObject().enabled = promptOn;
    if (this.fitPreview !== undefined && !isNull(this.fitPreview)) {
      if (!fitOn) {
        this.fitPreview.hide();
      }
    }
  }
}
