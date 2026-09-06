// Servicio de AI del taller de moldes (Remote Service Gateway).
// Cadena de proveedores con fallback automático: OpenAI → Gemini (Google)
// → DeepSeek (Snap-hosted). Si uno falla, prueba el siguiente.
// Dos operaciones:
//  - generateGarment: prenda elegida + descripción de estilo → una o más cards
//  - modifyCard: card existente + instrucción → card actualizada

import { OpenAI } from "RemoteServiceGateway.lspkg/HostedExternal/OpenAI";
import { Gemini } from "RemoteServiceGateway.lspkg/HostedExternal/Gemini";
import { DeepSeek } from "RemoteServiceGateway.lspkg/HostedSnap/Deepseek";
import { Imagen } from "RemoteServiceGateway.lspkg/HostedExternal/Imagen";
import { GoogleGenAITypes } from "RemoteServiceGateway.lspkg/HostedExternal/GoogleGenAITypes";
import { Snap3D } from "RemoteServiceGateway.lspkg/HostedSnap/Snap3D";
import { Snap3DTypes } from "RemoteServiceGateway.lspkg/HostedSnap/Snap3DTypes";
import { t, tf } from "./I18n";

const BURDA_IMAGE_STYLE =
  "Burda magazine fashion illustration, watercolor, clean lines, white background, no text. ";

export interface AICard {
  block: string;
  name: string;
  section: string;
  params: { [key: string]: number };
}

const BLOCKS_DOC =
  "Bloques disponibles y sus params (todo en cm):\n" +
  '- skirt (falda/pollera recta, tubo, evasé, campana, lápiz): {"waist","hip","length","flare"}. length: mini=40, rodilla=55, midi=65, maxi=85. flare (vuelo del ruedo): recta/tubo/lápiz=0, semi evasé=6, evasé/con vuelo=12, campana/mucha caída=18.\n' +
  '- circle_skirt (pollera plato / al plato / falda circular / de vals, típica años 50): {"waist","length","fullness"}. fullness: plato completo=1, semi plato o media campana=0.5.\n' +
  '- bodice (corpiño base, top, blusa, remera, camisa base, parte de arriba de un vestido): {"bust","waist","length"}. length = largo de talle: normal=42, crop/corto=32, largo/por la cadera=48.\n' +
  '- sleeve (manga): {"armhole","length","wrist"}. length: corta=22, 3/4=42, larga=58. armhole=contorno de sisa, wrist=puño.\n' +
  '- pants (pantalón, jean, palazzo): {"waist","hip","length","rise","legOpening"}. length: short=35, capri=80, largo=100. rise (tiro): normal=26, alto=30. legOpening (boca): chupín=34, recto=40, palazzo=56.\n' +
  '- leggings (calza, malla deportiva): {"waist","hip","length","ankle"}. length: ciclista=50, capri=70, larga=90.\n' +
  '- underwear (bombacha, ropa interior): {"hip","rise"}. rise: menos tela=18, clásica=22, tiro alto=28.\n' +
  '- shirt (camisa: cuerpo con cartera de botones y canesú): {"bust","waist","length"}. length típico 68; corta=60, larga=75.\n' +
  '- collar (cuello camisero con pie de cuello): {"neck","height"}. neck típico 39. height: clásico=7, mao/bajo=4.\n' +
  '- cuff (puño de camisa): {"wrist","height"}. wrist típico 22. height: clásico=6, ancho=9.\n' +
  "Vocabulario: pollera = falda = skirt. Corpiño = top = bodice. Si dan solo cintura, estimá cadera = cintura + 26 y busto = cintura + 20.\n" +
  "Defaults si no dan medidas: cintura 72, cadera 98, busto 92, sisa 44, puño 24.\n" +
  "Composiciones: vestido = bodice + (skirt o circle_skirt). Mono/jumpsuit = bodice + pants. Conjunto deportivo = bodice + leggings. " +
  "CAMISA = SIEMPRE sus 4 partes: shirt + sleeve + collar + cuff (una card cada una).\n" +
  'Secciones válidas: "faldas", "tops", "mangas", "pantalones", "ropa interior", "cuellos", "puños".';

const GENERATE_PROMPT =
  "Sos una moldista experta de indumentaria. El usuario eligió una PRENDA y describe cómo la quiere, " +
  "en español rioplatense. Interpretá su intención con flexibilidad (sinónimos, estilos, épocas) y " +
  "descomponé la prenda en los moldes necesarios. Respondé SOLO con JSON válido, sin markdown:\n" +
  '{"explica":"<1 frase corta: qué entendiste y qué decisiones tomaste>","cards":[{"block":"...","name":"...","section":"...","params":{...}}, ...]}\n' +
  BLOCKS_DOC + "\n" +
  "Reglas:\n" +
  "- Un vestido = card bodice + card de falda (skirt o circle_skirt según el estilo). Si piden mangas, sumá una card sleeve.\n" +
  "- Una pollera sola = 1 card. Un corpiño/top solo = 1 card (+ sleeve si piden mangas).\n" +
  "- Máximo 5 cards. name: corto, evocando el estilo (ej. \"Corpiño 1950\").\n" +
  "- Si piden algo que los bloques no cubren (bolsillos, volados, escote especial), acercate con los params y contalo en \"explica\".\n" +
  "Ejemplos:\n" +
  'Usuario: "vestido estilo años 50 con pollera plato" → {"explica":"Vestido años 50: corpiño entallado más pollera plato completa hasta la rodilla","cards":[{"block":"bodice","name":"Corpiño 1950","section":"tops","params":{"bust":92,"waist":72,"length":40}},{"block":"circle_skirt","name":"Pollera plato","section":"faldas","params":{"waist":72,"length":60,"fullness":1}}]}\n' +
  'Usuario: "pollera tubo a la rodilla, cintura 80" → {"explica":"Pollera recta al cuerpo, largo rodilla; estimé cadera 106 desde tu cintura 80","cards":[{"block":"skirt","name":"Pollera tubo","section":"faldas","params":{"waist":80,"hip":106,"length":55,"flare":0}}]}\n' +
  'Usuario: "blusa con mangas tres cuartos" → {"explica":"Blusa base con manga al codo (tres cuartos)","cards":[{"block":"bodice","name":"Blusa base","section":"tops","params":{"bust":92,"waist":72,"length":42}},{"block":"sleeve","name":"Manga 3/4","section":"mangas","params":{"armhole":44,"length":42,"wrist":26}}]}';

const MODIFY_PROMPT =
  "Sos una moldista experta. Te paso una card de molde existente (JSON) y una instrucción de cambio " +
  "en español rioplatense. Interpretá la intención y aplicá SOLO ese cambio, conservando todo lo demás. " +
  "Cambiá block únicamente si el pedido lo exige (ej. de skirt a circle_skirt si piden \"al plato\"). " +
  "Respondé SOLO con JSON válido, sin markdown:\n" +
  '{"explica":"<1 frase: qué cambio aplicaste, o qué no pudiste hacer y cómo lo aproximaste>","card":{"block":"...","name":"...","section":"...","params":{...}}}\n' +
  BLOCKS_DOC + "\n" +
  "Ejemplos:\n" +
  'Card {"block":"circle_skirt",...,"params":{"waist":72,"length":65,"fullness":1}} + "que sea semi plato" → {"explica":"Le bajé el vuelo a semi plato (media circunferencia)","card":{"block":"circle_skirt","name":"Pollera semi plato","section":"faldas","params":{"waist":72,"length":65,"fullness":0.5}}}\n' +
  'Card {"block":"skirt",...,"params":{"waist":72,"hip":98,"length":55,"flare":0}} + "más suelta en la cintura" → {"explica":"Le sumé 4 cm de holgura en cintura","card":{"block":"skirt","name":"Falda recta holgada","section":"faldas","params":{"waist":76,"hip":98,"length":55,"flare":0}}}\n' +
  'Card {"block":"sleeve",...} + "manga con volumen" → {"explica":"Todavía no puedo fruncir la copa; la aproximé ensanchando la sisa","card":{"block":"sleeve","name":"Manga amplia","section":"mangas","params":{"armhole":50,"length":58,"wrist":24}}}';

const PROVIDER_LABELS: { [key: string]: string } = {
  openai: "OpenAI",
  gemini: "Gemini",
  deepseek: "DeepSeek (Snap)"
};

@component
export class PatternAI extends BaseScriptComponent {
  @input openaiModel: string = "gpt-4o";
  @input geminiModel: string = "gemini-2.0-flash";
  // Orden de proveedores, separados por coma; si uno falla se prueba el siguiente
  @input providerOrder: string = "openai,gemini,deepseek";

  private busy: boolean = false;
  private fitBusy: boolean = false;
  private internetModule: InternetModule = require("LensStudio:InternetModule") as InternetModule;
  private remoteMediaModule: RemoteMediaModule = require("LensStudio:RemoteMediaModule") as RemoteMediaModule;
  private languageName: string = "Spanish (Rioplatense)";
  public onCardsReady: ((cards: AICard[], explica: string) => void) | null = null;
  public onCardModified: ((card: AICard, explica: string) => void) | null = null;
  public onStatus: ((message: string, isError: boolean) => void) | null = null;

  private setStatus(message: string, isError: boolean) {
    if (this.onStatus !== null) {
      this.onStatus(message, isError);
    }
  }

  isBusy(): boolean {
    return this.busy;
  }

  setLanguage(aiName: string) {
    this.languageName = aiName;
  }

  private langRule(): string {
    return "\nIMPORTANTE: los ejemplos de arriba están en español, pero eso es solo el formato. " +
      "TODO texto visible de tu respuesta — \"name\", \"section\" y \"explica\" — va EXCLUSIVAMENTE en " +
      this.languageName + ". Nombres cortos y naturales en ese idioma (no dejes NINGUNA palabra en " +
      "español si el idioma es otro).";
  }

  generateCuttingGuide(cardJson: string, onDone: (text: string) => void) {
    const system =
      "Sos una profe de corte y confección muy didáctica, guiando dentro de unos anteojos de realidad " +
      "aumentada: el molde es VIRTUAL y se ve proyectado a escala real sobre la tela — NO existe molde de " +
      "papel, NUNCA digas de alfilerar o sujetar el molde. La persona acomoda la tela debajo del molde " +
      "proyectado (o mueve el molde con la manija) y corta directo con la tijera siguiendo la línea AMARILLA " +
      "(la blanca es la de costura). Explicá paso a paso asumiendo que NUNCA cosió: cómo preparar la tela " +
      "bien plana y estirada; si una pieza dice cutOnFold, doblar la tela y alinear el borde recto del molde " +
      "contra el doblez; si dice doubleFabric, poner tela doble derecho contra derecho y ahí SÍ sujetar LAS " +
      "CAPAS DE TELA entre sí con alfileres o pesitos para que no se muevan; alinear la tela bajo el molde " +
      "proyectado y cortar por la línea amarilla con la cabeza quieta. " +
      "Máximo 5 frases cortas, cálidas y claras. Respondé SOLO el texto, sin listas ni markdown, en " +
      this.languageName + ".";
    this.callText(system, "Molde: " + cardJson, onDone);
  }

  // Predice calce (frase corta) + ilustración Burda vía Imagen 3 (RSG).
  generateFitPreview(contextJson: string, onDone: (fitPhrase: string, texture: Texture | null) => void) {
    if (this.fitBusy) {
      return;
    }
    this.fitBusy = true;
    this.setStatus(t("fitWorking"), false);

    let ctx: {
      garment?: string;
      style?: string;
      cards?: AICard[];
    } = {};
    try {
      ctx = JSON.parse(contextJson) as typeof ctx;
    } catch (e) {
      print("PatternAI: contexto fit inválido");
    }

    const imagePrompt = this.buildFitImagePrompt(ctx);
    print("PatternAI: prompt imagen → " + imagePrompt.substring(0, 100));

    let phraseDone = false;
    let imageDone = false;
    let fitPhrase = "";
    let texture: Texture | null = null;

    const finish = () => {
      if (!phraseDone || !imageDone) {
        return;
      }
      this.fitBusy = false;
      if (fitPhrase === "") {
        fitPhrase = t("fitDefault");
      }
      onDone(fitPhrase, texture);
    };

    const system =
      "You are an expert fashion fit analyst. Given sewing pattern data (JSON), write ONE short warm " +
      "phrase (max 12 words) about how the finished garment will look and fit on the body. " +
      "Respond ONLY with valid JSON, no markdown:\n" +
      '{"fitPhrase":"<one sentence in ' + this.languageName + '>"}';
    this.callText(system, "Project: " + contextJson, (raw) => {
      try {
        const clean = this.extractJson(raw);
        const parsed = JSON.parse(clean) as { fitPhrase?: string; fitAnalysis?: string };
        fitPhrase = parsed.fitPhrase !== undefined ? parsed.fitPhrase.trim() : "";
        if (fitPhrase === "" && parsed.fitAnalysis !== undefined) {
          fitPhrase = parsed.fitAnalysis.split(".")[0].trim();
        }
      } catch (e) {
        fitPhrase = raw.trim().substring(0, 80);
      }
      phraseDone = true;
      finish();
    }, () => {
      phraseDone = true;
      finish();
    });

    this.generatePreviewImage(imagePrompt, (tex) => {
      texture = tex;
      imageDone = true;
      finish();
    }, () => {
      imageDone = true;
      finish();
    });
  }

  private buildFitImagePrompt(ctx: {
    garment?: string;
    style?: string;
    cards?: AICard[];
  }): string {
    const garment = ctx.garment !== undefined ? ctx.garment : "garment";
    const style = ctx.style !== undefined && ctx.style !== "" ? ctx.style : "classic";
    let pieces = "";
    if (ctx.cards !== undefined && ctx.cards.length > 0) {
      pieces = ctx.cards.map((c) => c.name).join(", ");
    }
    return garment + ", " + style + (pieces !== "" ? ". Pieces: " + pieces : "");
  }

  private generatePreviewImage(prompt: string, onOk: (texture: Texture) => void, onFail: () => void) {
    const fullPrompt = BURDA_IMAGE_STYLE + prompt;
    print("PatternAI: generando ilustración…");
    // Snap3D image artifact: funciona en RSG con token SNAP (mismo gateway que el chat).
    this.trySnap3DImage(fullPrompt, onOk, () => {
      print("PatternAI: Snap3D sin imagen, probando gpt-image-1…");
      this.tryOpenAIImage(fullPrompt, onOk, () => {
        print("PatternAI: gpt-image-1 falló, probando Imagen 3…");
        this.tryImagen3(fullPrompt, onOk, onFail);
      });
    });
  }

  private trySnap3DImage(prompt: string, onOk: (texture: Texture) => void, onFail: () => void) {
    print("PatternAI: Snap3D.submitAndGetStatus…");
    let settled = false;
    const finish = (texture: Texture | null) => {
      if (settled) {
        return;
      }
      settled = true;
      if (texture !== null && !isNull(texture)) {
        print("PatternAI: ilustración lista vía Snap3D");
        onOk(texture);
      } else {
        onFail();
      }
    };
    const timeout = this.createEvent("DelayedCallbackEvent");
    timeout.bind(() => {
      print("PatternAI: Snap3D timeout");
      finish(null);
    });
    timeout.reset(120);

    Snap3D.submitAndGetStatus({
      prompt: prompt,
      format: "glb",
      refine: false,
      use_vertex_color: false
    })
      .then((result) => {
        result.event.add(([artifactType, assetOrError]) => {
          if (artifactType === "image") {
            finish((assetOrError as Snap3DTypes.TextureAssetData).texture);
          } else if (artifactType === "failed") {
            const err = assetOrError as Snap3DTypes.ErrorData;
            print("PatternAI: Snap3D error: " + err.errorMsg);
            finish(null);
          }
        });
      })
      .catch((err) => {
        print("PatternAI: Snap3D submit error: " + err);
        finish(null);
      });
  }

  private tryImagen3(fullPrompt: string, onOk: (texture: Texture) => void, onFail: () => void) {
    const request: GoogleGenAITypes.Imagen.ImagenRequest = {
      model: "imagen-3.0-generate-002",
      body: {
        parameters: {
          sampleCount: 1,
          addWatermark: false,
          aspectRatio: "3:4",
          enhancePrompt: true,
          language: "en",
          personGeneration: "allow_adult",
          seed: 0
        },
        instances: [{ prompt: fullPrompt }]
      }
    };
    Imagen.generateImage(request)
      .then((response) => {
        if (response.predictions === undefined || response.predictions.length === 0) {
          onFail();
          return;
        }
        print("PatternAI: ilustración lista vía Imagen 3");
        this.decodeB64Texture(response.predictions[0].bytesBase64Encoded, onOk, onFail);
      })
      .catch((err) => {
        print("PatternAI: Imagen 3 error: " + err);
        onFail();
      });
  }

  // RSG OpenAI proxy: solo gpt-image-1 (DALL-E no está disponible). Sin response_format.
  private tryOpenAIImage(fullPrompt: string, onOk: (texture: Texture) => void, onFail: () => void) {
    print("PatternAI: OpenAI.imagesGenerate → gpt-image-1");
    OpenAI.imagesGenerate({
      model: "gpt-image-1",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1536",
      quality: "medium"
    })
      .then((response) => {
        if (response.data === undefined || response.data.length === 0) {
          onFail();
          return;
        }
        const datum = response.data[0];
        if (datum.b64_json !== undefined && datum.b64_json !== "") {
          print("PatternAI: ilustración lista vía gpt-image-1 (b64)");
          this.decodeB64Texture(datum.b64_json, onOk, onFail);
          return;
        }
        if (datum.url !== undefined && datum.url !== "") {
          print("PatternAI: ilustración lista vía gpt-image-1 (url)");
          this.loadTextureFromUrl(datum.url, onOk, onFail);
          return;
        }
        onFail();
      })
      .catch((err) => {
        print("PatternAI: gpt-image-1 error: " + err);
        onFail();
      });
  }

  private decodeB64Texture(b64: string, onOk: (texture: Texture) => void, onFail: () => void) {
    Base64.decodeTextureAsync(b64, onOk, onFail);
  }

  private loadTextureFromUrl(url: string, onOk: (texture: Texture) => void, onFail: () => void) {
    const httpRequest = RemoteServiceHttpRequest.create();
    httpRequest.url = url;
    this.internetModule.performHttpRequest(httpRequest, (response) => {
      if (response.statusCode !== 200) {
        print("PatternAI: HTTP image download failed: " + response.statusCode);
        onFail();
        return;
      }
      const resource = response.asResource();
      this.remoteMediaModule.loadResourceAsImageTexture(resource, onOk, () => onFail());
    });
  }

  private callText(systemPrompt: string, userMsg: string, onDone: (text: string) => void, onFail?: () => void) {
    const providers = this.providerList();
    const tryIdx = (idx: number) => {
      if (idx >= providers.length) {
        if (onFail !== undefined) {
          onFail();
        }
        return;
      }
      this.callProvider(providers[idx], systemPrompt, userMsg)
        .then((raw) => onDone(raw.trim()))
        .catch(() => tryIdx(idx + 1));
    };
    tryIdx(0);
  }

  private providerList(): string[] {
    const providers = this.providerOrder
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => PROVIDER_LABELS[s] !== undefined);
    if (providers.length === 0) {
      providers.push("openai");
    }
    return providers;
  }

  generateGarment(garment: string, stylePrompt: string, measurements: string) {
    if (this.busy) {
      return;
    }
    this.busy = true;
    let userMsg = "Prenda elegida: " + garment + ". Estilo pedido: " + stylePrompt;
    if (measurements !== "") {
      userMsg += ". Medidas del usuario (por talle elegido): " + measurements +
        ". Usá estas medidas salvo que el estilo indique otras explícitas.";
    }
    print("PatternAI: generando → " + userMsg);
    this.setStatus(t("working"), false);

    this.call(GENERATE_PROMPT, userMsg, (clean) => {
      const parsed = JSON.parse(clean) as { explica?: string; cards: AICard[] };
      if (parsed.cards === undefined || parsed.cards.length === 0) {
        throw new Error("sin cards");
      }
      const cards = parsed.cards.slice(0, 5);
      const explica = parsed.explica !== undefined ? parsed.explica : "";
      print("PatternAI: " + cards.length + " cards generadas. " + explica);
      this.setStatus(tf("aiReady", String(cards.length)), false);
      if (this.onCardsReady !== null) {
        this.onCardsReady(cards, explica);
      }
    });
  }

  modifyCard(card: AICard, instruction: string) {
    if (this.busy) {
      return;
    }
    this.busy = true;
    const userMsg = "Card actual: " + JSON.stringify(card) + "\nInstrucción: " + instruction;
    print("PatternAI: modificando '" + card.name + "' → " + instruction);
    this.setStatus(t("aiAdjusting"), false);

    this.call(MODIFY_PROMPT, userMsg, (clean) => {
      const parsed = JSON.parse(clean) as { explica?: string; card?: AICard } & AICard;
      // Acepta {explica, card:{...}} y también la card suelta (formato viejo)
      const updated = parsed.card !== undefined ? parsed.card : (parsed as AICard);
      if (updated.block === undefined || updated.params === undefined) {
        throw new Error("card inválida");
      }
      const explica = parsed.explica !== undefined ? parsed.explica : "";
      print("PatternAI: card actualizada → " + JSON.stringify(updated) + " | " + explica);
      this.setStatus(t("aiUpdated") + ": " + updated.name, false);
      if (this.onCardModified !== null) {
        this.onCardModified(updated, explica);
      }
    });
  }

  private call(systemPrompt: string, userMsg: string, handle: (clean: string) => void) {
    this.tryProvider(this.providerList(), 0, systemPrompt + this.langRule(), userMsg, handle);
  }

  private tryProvider(
    providers: string[],
    idx: number,
    systemPrompt: string,
    userMsg: string,
    handle: (clean: string) => void
  ) {
    if (idx >= providers.length) {
      this.busy = false;
      print("PatternAI: ninguna AI respondió (¿token de RSG configurado?)");
      this.setStatus(t("aiNone"), true);
      return;
    }
    const name = providers[idx];
    this.callProvider(name, systemPrompt, userMsg)
      .then((raw) => {
        this.busy = false;
        try {
          const clean = this.extractJson(raw);
          print("PatternAI: respondió " + PROVIDER_LABELS[name]);
          handle(clean);
        } catch (e) {
          print("PatternAI: respuesta inválida de " + PROVIDER_LABELS[name] + ": " + raw);
          this.setStatus("La AI no devolvió un molde válido, probá de nuevo", true);
        }
      })
      .catch((error) => {
        print("PatternAI: " + PROVIDER_LABELS[name] + " falló: " + error);
        if (idx + 1 < providers.length) {
          this.setStatus("Probando con " + PROVIDER_LABELS[providers[idx + 1]] + "…", false);
        }
        this.tryProvider(providers, idx + 1, systemPrompt, userMsg, handle);
      });
  }

  private callProvider(name: string, systemPrompt: string, userMsg: string): Promise<string> {
    if (name === "openai") {
      return OpenAI.chatCompletions({
        model: this.openaiModel,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg }
        ]
      }).then((r) => r.choices[0].message.content);
    }
    if (name === "gemini") {
      return Gemini.models({
        model: this.geminiModel,
        type: "generateContent",
        body: {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMsg }] }],
          generationConfig: { temperature: 0.2 }
        }
      }).then((r) => {
        if (r.candidates === undefined || r.candidates.length === 0) {
          throw new Error("Gemini sin candidatos");
        }
        return (r.candidates[0].content.parts[0] as { text: string }).text;
      });
    }
    if (name === "deepseek") {
      return DeepSeek.chatCompletions({
        model: "DeepSeek-R1",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg }
        ]
      }).then((r) => r.choices[0].message.content as string);
    }
    return Promise.reject("proveedor desconocido: " + name);
  }

  // Extrae el bloque JSON de la respuesta (tolera fences y razonamiento de R1).
  private extractJson(raw: string): string {
    const noFences = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const first = noFences.indexOf("{");
    const last = noFences.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return noFences.substring(first, last + 1);
    }
    return noFences;
  }
}
