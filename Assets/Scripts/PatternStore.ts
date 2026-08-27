// Persistencia del proyecto actual (prenda + estilo + cards) con
// Persistent Storage: al reabrir la lente, el taller sigue donde quedó.

import { AICard } from "./PatternAI";

const PROJECT_KEY = "pattern_project_v3";

export interface ProjectData {
  garment: string;
  garmentLabel: string;
  stylePrompt: string;
  cards: AICard[];
}

export function saveProject(project: ProjectData) {
  const store = global.persistentStorageSystem.store;
  store.putString(PROJECT_KEY, JSON.stringify(project));
  print("PatternStore: proyecto guardado (" + project.cards.length + " cards)");
}

export function loadProject(): ProjectData | null {
  const store = global.persistentStorageSystem.store;
  const raw = store.getString(PROJECT_KEY);
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  try {
    const p = JSON.parse(raw) as ProjectData;
    if (p.cards === undefined || p.cards.length === 0) {
      return null;
    }
    return p;
  } catch (e) {
    print("PatternStore: proyecto corrupto, se descarta");
    return null;
  }
}

export function clearProject() {
  const store = global.persistentStorageSystem.store;
  store.putString(PROJECT_KEY, "");
}
