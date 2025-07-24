import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { produce } from "immer";

export type ModelSettings = {
  sttModel: string;
  translationModel: string;
  conversationModel: string;
  selectedCompanies: string[];
};

type ModelSettingsStore = {
  settings: ModelSettings;
  setSettings: (settings: Partial<ModelSettings>) => void;
  getSttModel: () => string;
  getTranslationModel: () => string;
  getConversationModel: () => string;
};

export const useModelSettings = create(
  persist<ModelSettingsStore>(
    (set, get) => ({
      settings: {
        sttModel: 'whisper-1',
        translationModel: 'gpt-4o-mini',
        conversationModel: 'gpt-4o-mini',
        selectedCompanies: ['openai'],
      },
      setSettings: (settings: Partial<ModelSettings>) => {
        set(
          produce((state: ModelSettingsStore) => {
            state.settings = { ...state.settings, ...settings };
          })
        );
      },
      getSttModel: () => get().settings.sttModel,
      getTranslationModel: () => get().settings.translationModel,
      getConversationModel: () => get().settings.conversationModel,
    }),
    {
      name: "model-settings",
      storage: createJSONStorage(() => localStorage)
    }
  )
);