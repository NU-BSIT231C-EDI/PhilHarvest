import { create } from "zustand";

export interface EdiPrefill {
  ediType: "855" | "856" | "810" | "204";
  body: Record<string, unknown>;
  sourceDescription: string;
}

interface EdiPrefillStore {
  prefill: EdiPrefill | null;
  setPrefill: (prefill: EdiPrefill) => void;
  clearPrefill: () => void;
}

export const useEdiPrefill = create<EdiPrefillStore>()((set) => ({
  prefill: null,
  setPrefill: (prefill) => set({ prefill }),
  clearPrefill: () => set({ prefill: null }),
}));
