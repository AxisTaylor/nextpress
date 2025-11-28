import React, { useState, useEffect, createContext, useContext } from 'react';
import { EnqueuedScript } from "@/types";

interface ScriptLoaderContextValue {
  scriptsReady: boolean;
  stylesheetsReady: boolean;
  contentReady: boolean;
  headScriptsLoaded: boolean;
  bodyScriptsLoaded: boolean;
  setHeadScriptsLoaded: (headScriptsLoaded: boolean) => void,
  setBodyScriptsLoaded: (bodyScriptsLoaded: boolean) => void,
}

const ScriptLoaderContext = createContext<ScriptLoaderContextValue>({
  scriptsReady: false,
  stylesheetsReady: false,
  contentReady: false,
  headScriptsLoaded: false,
  bodyScriptsLoaded: false,
  setHeadScriptsLoaded: () => {},
  setBodyScriptsLoaded: () => {},
});

export function useScriptsReady() {
  return useContext(ScriptLoaderContext);
}

// Alias for better semantics
export const useContentReady = useScriptsReady;

export interface ScriptLoaderProps {
  scripts: EnqueuedScript[];
  children: React.ReactNode;
}

/**
 * Client component that manages sequential script loading.
 * Provides scriptsReady and stylesheetsReady state via context to child components.
 *
 * Content should show as soon as stylesheets are ready, while scripts continue loading in background.
 */
export function ScriptLoader({ children }: ScriptLoaderProps) {
  const [headScriptsLoaded, setHeadScriptsLoaded] = useState(false);
  const [bodyScriptsLoaded, setBodyScriptsLoaded] = useState(false);
  const [stylesheetsReady, setStylesheetsReady] = useState(false);

  const scriptsReady = headScriptsLoaded && bodyScriptsLoaded;
  const contentReady = stylesheetsReady; // Content shows as soon as CSS is ready

  // Check when all stylesheets have loaded
  useEffect(() => {
    // Get all stylesheet links in the document
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

    if (links.length === 0) {
      // No stylesheets to load, mark as ready immediately
      setStylesheetsReady(true);
      return;
    }

    let loadedCount = 0;
    const totalCount = links.length;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalCount) {
        setStylesheetsReady(true);
      }
    };

    // Check if stylesheets are already loaded or add load listeners
    links.forEach((link) => {
      const linkElement = link as HTMLLinkElement;

      // If stylesheet is already loaded (has a sheet property)
      if (linkElement.sheet) {
        checkAllLoaded();
      } else {
        // Add load listener for stylesheets not yet loaded
        linkElement.addEventListener('load', checkAllLoaded);
        linkElement.addEventListener('error', checkAllLoaded); // Also count errors as "loaded" to avoid hanging
      }
    });

    // Cleanup listeners
    return () => {
      links.forEach((link) => {
        const linkElement = link as HTMLLinkElement;
        linkElement.removeEventListener('load', checkAllLoaded);
        linkElement.removeEventListener('error', checkAllLoaded);
      });
    };
  }, []);

  const store = {
    scriptsReady,
    stylesheetsReady,
    contentReady,
    headScriptsLoaded,
    bodyScriptsLoaded,
    setHeadScriptsLoaded,
    setBodyScriptsLoaded,
  };

  return (
    <ScriptLoaderContext.Provider value={store}>
      {children}
    </ScriptLoaderContext.Provider>
  );
}
