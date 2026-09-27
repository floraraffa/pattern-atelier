// Minimal language control: "EN ▾" pill — never a landing page.
// Opens a short list of codes; choosing one updates I18n live.

import { LANGS, setLang, getLang, getLangDef } from "./I18n";
import { makeLabel, makePlate, makeTappable, resetLocal, safeDestroy } from "./UiLite";

const INK = new vec4(0.08, 0.08, 0.08, 1);

@component
export class LangDropdown extends BaseScriptComponent {
  @input plateMaterial: Material;
  @input
  @allowUndefined
  widthCm: number = 5.5;
  @input
  @allowUndefined
  heightCm: number = 2.2;

  public onChanged: ((code: string) => void) | null = null;

  private root: SceneObject | null = null;
  private menu: SceneObject | null = null;
  private open: boolean = false;
  private codeLabel: Text | null = null;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.build());
  }

  private build() {
    if (this.root !== null && !isNull(this.root)) {
      safeDestroy(this.root);
    }
    this.root = global.scene.createSceneObject("langDrop");
    this.root.setParent(this.sceneObject);
    resetLocal(this.root);

    const w = this.widthCm;
    const h = this.heightCm;
    const plate = makePlate(this.root, "pill", w, h, this.plateMaterial);
    plate.getTransform().setLocalPosition(new vec3(0, 0, 0));
    this.codeLabel = makeLabel(plate, this.codeText(), 0.85, new vec3(0, 0, 0.15), INK);
    makeTappable(plate, w + 1, h + 1, () => this.toggle());
  }

  private codeText(): string {
    return getLang().toUpperCase() + " ▾";
  }

  refresh() {
    if (this.codeLabel !== null && !isNull(this.codeLabel)) {
      this.codeLabel.text = this.codeText();
    }
    if (this.open) {
      this.closeMenu();
      this.openMenu();
    }
  }

  private toggle() {
    if (this.open) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  private closeMenu() {
    this.open = false;
    if (this.menu !== null && !isNull(this.menu)) {
      safeDestroy(this.menu);
      this.menu = null;
    }
  }

  private openMenu() {
    this.closeMenu();
    this.open = true;
    this.menu = global.scene.createSceneObject("langMenu");
    this.menu.setParent(this.root);
    resetLocal(this.menu);

    const rowH = 1.8;
    const w = this.widthCm + 1.5;
    const n = LANGS.length;
    const totalH = n * rowH + 0.4;
    const bg = makePlate(this.menu, "menuBg", w, totalH, this.plateMaterial);
    bg.getTransform().setLocalPosition(new vec3(0, -(totalH / 2 + this.heightCm / 2 + 0.3), -0.05));

    for (let i = 0; i < n; i++) {
      const y = -(i * rowH + rowH / 2 + this.heightCm / 2 + 0.5);
      const row = makePlate(this.menu, "row_" + LANGS[i].code, w - 0.3, rowH - 0.15, this.plateMaterial);
      row.getTransform().setLocalPosition(new vec3(0, y, 0.1));
      const label =
        LANGS[i].code.toUpperCase() + "  " + LANGS[i].native;
      makeLabel(row, label, 0.7, new vec3(0, 0, 0.15), INK);
      const code = LANGS[i].code;
      makeTappable(row, w, rowH, () => this.pick(code));
    }
  }

  private pick(code: string) {
    setLang(code);
    this.closeMenu();
    if (this.codeLabel !== null && !isNull(this.codeLabel)) {
      this.codeLabel.text = this.codeText();
    }
    if (this.onChanged !== null) {
      this.onChanged(code);
    }
  }

  setVisible(on: boolean) {
    this.sceneObject.enabled = on;
    if (!on) {
      this.closeMenu();
    }
  }
}
