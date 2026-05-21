"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { LineItem, Fee, Person, Split } from "./types";

const SESSION_KEY = "warikan_flow";

interface SplitFlowState {
  image: string | null;
  imageMimeType: string | null;
  restaurantName: string;
  lineItems: LineItem[];
  fees: Fee[];
  taxAmount: number;
  tipAmount: number;
  people: Person[];
  editingSplitId: string | null;
}

const initialState: SplitFlowState = {
  image: null,
  imageMimeType: null,
  restaurantName: "",
  lineItems: [],
  fees: [],
  taxAmount: 0,
  tipAmount: 0,
  people: [],
  editingSplitId: null,
};

function loadFromSession(): SplitFlowState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState;
  } catch {
    return initialState;
  }
}

interface SplitFlowContextValue {
  state: SplitFlowState;
  loaded: boolean;
  setImage: (image: string, mimeType: string) => void;
  setReceiptData: (data: {
    restaurantName?: string;
    lineItems: LineItem[];
    fees: Fee[];
    taxAmount: number;
    tipAmount: number;
  }) => void;
  setPeople: (people: Person[]) => void;
  updateLineItems: (lineItems: LineItem[]) => void;
  updateFees: (fees: Fee[]) => void;
  updateRestaurantName: (name: string) => void;
  updateTax: (amount: number) => void;
  updateTip: (amount: number) => void;
  loadSplit: (split: Split) => void;
  reset: () => void;
}

const SplitFlowContext = createContext<SplitFlowContextValue | null>(null);

export function SplitFlowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SplitFlowState>(initialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadFromSession();
    if (saved !== initialState) setState(saved);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // Exclude raw image data — it can be up to 10 MB and contains PII.
    const { image: _img, imageMimeType: _mime, ...persistable } = state;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(persistable)); } catch (e) { console.error("Failed to save session state:", e); }
  }, [state, loaded]);

  const setImage = useCallback((image: string, mimeType: string) => {
    setState((prev) => ({ ...prev, image, imageMimeType: mimeType }));
  }, []);

  const setReceiptData = useCallback(
    (data: {
      restaurantName?: string;
      lineItems: LineItem[];
      fees: Fee[];
      taxAmount: number;
      tipAmount: number;
    }) => {
      setState((prev) => ({
        ...prev,
        restaurantName: data.restaurantName ?? "",
        lineItems: data.lineItems,
        fees: data.fees,
        taxAmount: data.taxAmount,
        tipAmount: data.tipAmount,
      }));
    },
    []
  );

  const setPeople = useCallback((people: Person[]) => {
    setState((prev) => ({ ...prev, people }));
  }, []);

  const updateLineItems = useCallback((lineItems: LineItem[]) => {
    setState((prev) => ({ ...prev, lineItems }));
  }, []);

  const updateFees = useCallback((fees: Fee[]) => {
    setState((prev) => ({ ...prev, fees }));
  }, []);

  const updateRestaurantName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, restaurantName: name }));
  }, []);

  const updateTax = useCallback((amount: number) => {
    setState((prev) => ({ ...prev, taxAmount: amount }));
  }, []);

  const updateTip = useCallback((amount: number) => {
    setState((prev) => ({ ...prev, tipAmount: amount }));
  }, []);

  const loadSplit = useCallback((split: Split) => {
    setState({
      image: null,
      imageMimeType: null,
      restaurantName: split.restaurantName ?? "",
      lineItems: split.lineItems,
      fees: split.fees,
      taxAmount: split.taxAmount,
      tipAmount: split.tipAmount,
      people: split.people,
      editingSplitId: split.id,
    });
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  return (
    <SplitFlowContext.Provider
      value={{
        state,
        loaded,
        setImage,
        setReceiptData,
        setPeople,
        updateLineItems,
        updateFees,
        updateRestaurantName,
        updateTax,
        updateTip,
        loadSplit,
        reset,
      }}
    >
      {children}
    </SplitFlowContext.Provider>
  );
}

export function useSplitFlow() {
  const context = useContext(SplitFlowContext);
  if (!context) {
    throw new Error("useSplitFlow must be used within a SplitFlowProvider");
  }
  return context;
}
