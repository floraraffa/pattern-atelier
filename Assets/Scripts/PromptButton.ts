// Botón de dictado genérico: en Spectacles escucha con ASR (voz) y entrega
// el texto al callback onPrompt; en el editor (sin micrófono) abre el teclado
// para escribir el pedido tal cual. El flujo (AppFlow) lo configura por paso.

import { makePlate, makeLabel, makeTappable, makeSticker } from "./UiLite";
import { buildQuadMesh } from "./LineMesh";
import { t } from "./I18n";

@component
export class PromptButton extends BaseScriptComponent {
  @input buttonMaterial: Material;
  @input listeningMaterial: Material;
  @input width: number = 26;
  @input height: number = 6;
  // Skin (arte de Flor): barra de dictado + tablero decorativo arriba
  @input
  @allowUndefined
  stickerMaterial: Material; // base unlit+alpha para los stickers (CloudMat)
  @input
  @allowUndefined
  barTexture: Texture;
  @input
  @allowUndefined
  boardTexture: Texture;
  @input barWidth: number = 46;
  @input boardWidth: number = 34;
  @input boardY: number = 21; // altura del tablero sobre la barra

  public onPrompt: ((text: string) => void) | null = null;

  private asrModule: AsrModule = require("LensStudio:AsrModule");
  private listening: boolean = false;
  private statusText: Text | null = null;
  private buttonText: Text | null = null;
  private buttonVisual: RenderMeshVisual | null = null;
  private idleLabel: string = "● Hablá";
  private editorPrompts: string[] = [];
  private pendingStatus: string = "";
  private typing: boolean = false;
  private typedText: string = "";
  private typedSubmitted: boolean = false;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.setup());
  }

  private setup() {
    const skinned = this.barTexture !== undefined && !isNull(this.barTexture) &&
      this.stickerMaterial !== undefined && !isNull(this.stickerMaterial);
    if (skinned) {
      // Barra de dictado (nota · campo · mic · enviar) — todo el ancho es tappeable
      const bar = makeSticker(this.sceneObject, "promptBar", this.stickerMaterial, this.barTexture, this.barWidth);
      const barH = this.barWidth * this.barTexture.getHeight() / this.barTexture.getWidth();
      // El texto va dentro del campo punteado del centro
      this.buttonText = makeLabel(bar, "", 1.3, new vec3(-1.5, 0, 0.3), new vec4(0.13, 0.17, 0.32, 1));
      this.statusText = this.buttonText;
      makeTappable(this.sceneObject, this.barWidth, barH + 1, () => this.onTap());
      if (this.boardTexture !== undefined && !isNull(this.boardTexture)) {
        const board = makeSticker(this.sceneObject, "styleBoard", this.stickerMaterial, this.boardTexture, this.boardWidth);
        board.getTransform().setLocalPosition(new vec3(0, this.boardY, -1));
      }
    } else {
      const mesh = buildQuadMesh(this.width, this.height);
      if (mesh !== null) {
        this.buttonVisual = this.sceneObject.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
        this.buttonVisual.mesh = mesh;
        this.buttonVisual.mainMaterial = this.buttonMaterial;
      }
      this.buttonText = makeLabel(this.sceneObject, this.idleLabel, 1.8, new vec3(0, 0, 0.2));
      this.statusText = makeLabel(this.sceneObject, this.pendingStatus, 1.4, new vec3(0, this.height / 2 + 2.4, 0.2));
      makeTappable(this.sceneObject, this.width, this.height, () => this.onTap());
    }
  }

  // Configura el botón para el paso actual del flujo.
  configure(idleLabel: string, statusHint: string, editorPrompts: string[]) {
    this.idleLabel = idleLabel;
    this.editorPrompts = editorPrompts;
    if (this.buttonText !== null) {
      this.buttonText.text = idleLabel;
    }
    // En editor los ejemplos son solo sugerencia, no se disparan solos
    if (global.deviceInfoSystem.isEditor() && editorPrompts.length > 0) {
      this.setStatus(statusHint + " (ej: " + editorPrompts[0] + ")");
    } else {
      this.setStatus(statusHint);
    }
  }

  setStatus(message: string) {
    const short = message.length > 46 ? message.substring(0, 45) + "…" : message;
    this.pendingStatus = short;
    if (this.statusText !== null) {
      this.statusText.text = short;
    }
  }

  private emit(text: string) {
    if (this.onPrompt !== null && text !== "") {
      this.onPrompt(text);
    }
  }

  private onTap() {
    if (global.deviceInfoSystem.isEditor()) {
      // Editor: sin micrófono → teclado, para escribir el pedido tal cual
      if (!this.typing) {
        this.openKeyboard();
      }
      return;
    }

    if (this.listening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  private openKeyboard() {
    this.typing = true;
    this.typedText = "";
    this.typedSubmitted = false;
    this.setButtonLook(true, "⌨ …");
    this.setStatus(t("typeHint"));

    const options = new TextInputSystem.KeyboardOptions();
    options.enablePreview = true;
    options.keyboardType = TextInputSystem.KeyboardType.Text;
    options.returnKeyType = TextInputSystem.ReturnKeyType.Done;
    options.onTextChanged = (text: string, range: vec2) => {
      this.typedText = text;
      this.setStatus(text === "" ? t("typeHint") : text);
    };
    options.onReturnKeyPressed = () => {
      this.typedSubmitted = true;
      global.textInputSystem.dismissKeyboard();
    };
    options.onKeyboardStateChanged = (keyboardIsOpen: boolean) => {
      if (!keyboardIsOpen && this.typing) {
        this.typing = false;
        this.setButtonLook(false, this.idleLabel);
        const text = this.typedText.trim();
        this.typedText = "";
        if (this.typedSubmitted && text !== "") {
          this.emit(text);
        } else {
          this.setStatus(t("typeHint"));
        }
      }
    };
    global.textInputSystem.requestKeyboard(options);
  }

  private startListening() {
    this.listening = true;
    this.setButtonLook(true, t("listening"));

    const options = AsrModule.AsrTranscriptionOptions.create();
    options.silenceUntilTerminationMs = 1200;
    options.mode = AsrModule.AsrMode.HighAccuracy;
    options.onTranscriptionUpdateEvent.add((args) => {
      this.setStatus(args.text);
      if (args.isFinal) {
        this.stopListening();
        this.emit(args.text);
      }
    });
    options.onTranscriptionErrorEvent.add((code) => {
      this.stopListening();
      this.setStatus(t("voiceError") + " (" + code + ")");
    });

    this.asrModule.startTranscribing(options);
  }

  private stopListening() {
    this.listening = false;
    this.setButtonLook(false, this.idleLabel);
    this.asrModule.stopTranscribing();
  }

  private setButtonLook(listening: boolean, label: string) {
    if (this.buttonText !== null) {
      this.buttonText.text = label;
    }
    if (this.buttonVisual !== null && this.listeningMaterial !== undefined && !isNull(this.listeningMaterial)) {
      this.buttonVisual.mainMaterial = listening ? this.listeningMaterial : this.buttonMaterial;
    }
  }
}
