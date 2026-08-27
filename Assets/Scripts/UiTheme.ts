// ✏️ EDITÁ ACÁ LA FUENTE DE TODA LA UI:
// 1. Arrastrá un archivo .ttf u .otf al Asset Browser (se importa como Font)
// 2. Seleccioná el objeto UIRoot y asigná esa fuente en el campo "font"
// 3. Refrescá el preview: todos los textos de la interfaz la usan
// (Si el campo queda vacío, se usa la fuente por defecto del sistema.
//  Ojo: para árabe/farsi/chino/japonés la fuente elegida debe tener esos
//  caracteres, si no van a verse cuadraditos.)

import { setUiFont } from "./UiLite";

@component
export class UiTheme extends BaseScriptComponent {
  @input
  @allowUndefined
  font: Font;

  onAwake() {
    if (this.font !== undefined && !isNull(this.font)) {
      setUiFont(this.font);
    }
  }
}
