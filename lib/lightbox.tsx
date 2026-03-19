"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface LightboxContextType {
  open: (src: string, alt: string) => void;
  close: () => void;
}

const LightboxContext = createContext<LightboxContextType>({
  open: () => {},
  close: () => {},
});

export function useLightbox() {
  return useContext(LightboxContext);
}

function LightboxOverlay({ src, alt, close }: { src: string; alt: string; close: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [close]);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      onClick={close}
    >
      <button
        style={{ position: "absolute", top: 16, right: 16, fontFamily: "monospace", fontSize: 13, padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", zIndex: 1 }}
        onClick={close}
      >
        ✕ close
      </button>
      <img
        src={src}
        alt={alt}
        style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, cursor: "default" }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ src: string; alt: string } | null>(null);
  function open(src: string, alt: string) { setState({ src, alt }); }
  function close() { setState(null); }
  return (
    <LightboxContext.Provider value={{ open, close }}>
      {children}
      {state && <LightboxOverlay src={state.src} alt={state.alt} close={close} />}
    </LightboxContext.Provider>
  );
}
