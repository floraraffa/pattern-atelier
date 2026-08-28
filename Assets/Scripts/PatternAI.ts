// Servicio de AI del taller de moldes (Remote Service Gateway).
// Cadena de proveedores con fallback automático: OpenAI → Gemini (Google)
// → DeepSeek (Snap-hosted). Si uno falla, prueba el siguiente.
// Dos operaciones:
//  - generateGarment: prenda elegida + descripción de estilo → una o más cards
//  - modifyCard: card existente + instrucción → card actualizada

import { OpenAI } from "RemoteServiceGateway.lspkg/HostedExternal/OpenAI";
import { Gemini } from "RemoteServiceGateway.lspkg/HostedExternal/Gemini";
import { DeepSeek } from "RemoteServiceGateway.lspkg/HostedSnap/Deepseek";
import { t, tf } from "./I18n";

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

  // Idioma de las respuestas ("Spanish (Rioplatense)", "Persian (Farsi)"...)
  setLanguage(aiName: string) {
    this.languageName = aiName;
  }

  private langRule(): string {
    return "\nIMPORTANTE: los ejemplos de arriba están en español, pero eso es solo el formato. " +
      "TODO texto visible de tu respuesta — \"name\", \"section\" y \"explica\" — va EXCLUSIVAMENTE en " +
      this.languageName + ". Nombres cortos y naturales en ese idioma (no dejes NINGUNA palabra en " +
      "español si el idioma es otro).";
  }

  // Guía de corte paso a paso, hablada por la mascota en el idioma elegido.
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

  private callText(systemPrompt: string, userMsg: string, onDone: (text: string) => void) {
    const providers = this.providerList();
    const tryIdx = (idx: number) => {
      if (idx >= providers.length) {
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
