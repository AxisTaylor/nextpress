import { useEffect, useRef } from "react";
import {
  EnqueuedScript,
  EnqueuedStylesheet,
  GlobalStylesType,
  ScriptLoadingGroupEnum,
  ScriptTypeEnum,
} from "@/types";
import { WPImport } from "@/ImportMap";
import { scopeInlineStyles } from "@/utils/scopeStyles";
import { transformAssetUrl, isBypassedHost } from "@/utils/url";
import { firePageEvents } from "@/hooks/usePageEvents";
import { joinScriptContent } from "@/utils/content";
import {
  replaceProxyPlaceholders,
  processWcSettings,
} from "@/compatibility/woocommerce";
import { startPlaceholderObserver } from "./placeholderObserver";

export interface AssetData {
  stylesheets: EnqueuedStylesheet[];
  scripts: EnqueuedScript[];
  globalStyles?: GlobalStylesType | null;
  importMap?: WPImport[] | null;
}

/** Resolved srcs of `reinitBypassHandles` scripts already loaded this session. */
const loadedBypassedSrcs = new Set<string>();

/**
 * Resolves an asset src to load: assets whose host is (or is a subdomain of)
 * a bypassed domain keep their original external URL; everything else is
 * routed through the instance asset proxy.
 */
function resolveAssetSrc(
  src: string,
  instance: string,
  bypassDomains: string[]
): string {
  return isBypassedHost(src, bypassDomains)
    ? src
    : transformAssetUrl(src, instance);
}

export interface AssetUpdaterProps {
  /**
   * The current pathname being rendered.
   */
  pathname: string;
  /**
   * The WordPress instance slug for proxy routing.
   */
  instance?: string;
  /**
   * Async function that fetches asset data for a given URI.
   * This must be implemented by the consuming app (typically as a
   * server action or API route call) since direct GraphQL calls
   * require server-side credentials.
   */
  fetchAssets: (uri: string) => Promise<AssetData>;
  /**
   * Domains whose scripts/stylesheets should load directly from their
   * original URL instead of being proxied through the instance — e.g.
   * `['js.stripe.com', 'fonts.googleapis.com']`. Matched by hostname, with
   * root domains covering subdomains (`stripe.com` covers `js.stripe.com`).
   */
  bypassDomains?: string[];
  /**
   * Script handles to load once and skip re-running on client navigation.
   * See docs/api/asset-updater.md ("Script re-execution on navigation").
   */
  reinitBypassHandles?: string[];
}

/**
 * Removes all DOM elements between the given start and end marker IDs (exclusive),
 * returning the parent element and the end marker for reinsertion.
 */
function clearBetweenMarkers(
  startId: string,
  endId: string
): { parent: HTMLElement; endMarker: HTMLElement } | null {
  const startMarker = document.getElementById(startId);
  const endMarker = document.getElementById(endId);
  if (!startMarker || !endMarker) {
    return null;
  }

  const parent = startMarker.parentElement;
  if (!parent) {
    return null;
  }

  let node = startMarker.nextSibling;
  while (node && node !== endMarker) {
    const next: ChildNode | null = node.nextSibling;
    parent.removeChild(node);
    node = next;
  }

  return { parent, endMarker: endMarker as HTMLElement };
}

/**
 * Creates a <style> element with the given id and CSS content.
 */
function createStyleElement(id: string, css: string): HTMLStyleElement {
  const el = document.createElement("style");
  el.id = id;
  el.textContent = css;
  return el;
}

/**
 * Creates a <link rel="stylesheet"> element with the given id and href.
 */
function createLinkElement(id: string, href: string): HTMLLinkElement {
  const el = document.createElement("link");
  el.id = id;
  el.rel = "stylesheet";
  el.href = href;
  return el;
}

/**
 * Creates a <script> element with the given id and either src or inline content.
 *
 * For external scripts, async is disabled so scripts execute in document order
 * (matching how WordPress enqueues them server-side). Returns a promise that
 * resolves once the script has loaded (or immediately for inline scripts).
 */
function createScriptElement(
  id: string,
  options: { src?: string; content?: string; isModule?: boolean }
): { el: HTMLScriptElement; loaded: Promise<void> } {
  const el = document.createElement("script");
  el.id = id;

  if (options.isModule) {
    el.type = "module";
  }

  let loaded: Promise<void>;

  if (options.src) {
    if (!options.isModule) {
      // Disable async to preserve execution order across multiple script handles.
      el.async = false;
    }
    loaded = new Promise<void>((resolve) => {
      el.addEventListener("load", () => resolve(), { once: true });
      el.addEventListener("error", () => resolve(), { once: true });
    });
    el.src = options.src;
  } else if (options.content) {
    el.textContent = options.content;
    loaded = Promise.resolve();
  } else {
    loaded = Promise.resolve();
  }

  return { el, loaded };
}

/**
 * Replaces the stylesheet list between the nextpress-stylesheets-start/end markers.
 */
function updateStylesheets(
  stylesheets: EnqueuedStylesheet[],
  instance: string,
  bypassDomains: string[]
): void {
  const range = clearBetweenMarkers(
    "nextpress-stylesheets-start",
    "nextpress-stylesheets-end"
  );
  if (!range) return;

  const { parent, endMarker } = range;

  stylesheets.forEach((stylesheet) => {
    const handle = stylesheet.handle;
    if (!handle) return;

    if (stylesheet.before) {
      parent.insertBefore(
        createStyleElement(
          `${handle}-before`,
          scopeInlineStyles(joinScriptContent(stylesheet.before))
        ),
        endMarker
      );
    }

    if (stylesheet.src) {
      parent.insertBefore(
        createLinkElement(
          handle,
          resolveAssetSrc(stylesheet.src, instance, bypassDomains)
        ),
        endMarker
      );
    }

    if (stylesheet.after) {
      parent.insertBefore(
        createStyleElement(
          `${handle}-inline-css`,
          scopeInlineStyles(joinScriptContent(stylesheet.after))
        ),
        endMarker
      );
    }
  });
}

/**
 * Replaces the script list between the given start/end markers.
 */
async function updateScripts(
  scripts: EnqueuedScript[],
  location: ScriptLoadingGroupEnum,
  startId: string,
  endId: string,
  instance: string,
  pathname: string,
  bypassDomains: string[],
  reinitBypassHandles: string[]
): Promise<void> {
  // Seed from scripts already in the DOM so bypassed handles rendered on the
  // initial page are recognized as loaded on the first navigation.
  const startSeed = document.getElementById(startId);
  const endSeed = document.getElementById(endId);
  if (startSeed && endSeed) {
    let node: ChildNode | null = startSeed.nextSibling;
    while (node && node !== endSeed) {
      if (node instanceof HTMLScriptElement) {
        const seedSrc = node.getAttribute("src");
        if (seedSrc) {
          loadedBypassedSrcs.add(seedSrc);
        }
      }
      node = node.nextSibling;
    }
  }

  const range = clearBetweenMarkers(startId, endId);
  if (!range) return;

  const { parent, endMarker } = range;

  // Insert and wait for each script in sequence to preserve execution order.
  // Inline scripts execute synchronously on insert; external scripts must
  // finish loading before the next one is inserted, since later scripts
  // (especially `-before`/`-after` inline blocks) often depend on globals
  // defined by previous external scripts.
  const insert = async (
    id: string,
    options: { src?: string; content?: string; isModule?: boolean }
  ): Promise<void> => {
    const { el, loaded } = createScriptElement(id, options);
    parent.insertBefore(el, endMarker);
    await loaded;
  };

  /**
   * Inserts an inline script and resolves only after its code has actually
   * executed in the browser. Works by appending a synthetic event dispatch
   * to the end of the script body and awaiting that event. Lets callers run
   * follow-up logic (e.g. patching a global the script just defined) with a
   * guarantee that the script's side effects are in place.
   */
  const insertInlineAndAwait = async (
    id: string,
    content: string,
    onExecuted?: () => void
  ): Promise<void> => {
    const eventName = `nextpress:inline-executed:${id}`;
    const instrumented = `${content}\n;document.dispatchEvent(new CustomEvent(${JSON.stringify(
      eventName
    )}));`;
    const executed = new Promise<void>((resolve) => {
      document.addEventListener(eventName, () => resolve(), { once: true });
    });
    await insert(id, { content: instrumented });
    await executed;
    if (onExecuted) {
      onExecuted();
    }
  };

  const filtered = scripts.filter((script) => script.location === location);

  for (const script of filtered) {
    const handle = script.handle || script.id;
    if (!handle) continue;

    const isModule = String(script.type) === ScriptTypeEnum.MODULE;
    const resolvedSrc = script.src
      ? resolveAssetSrc(script.src, instance, bypassDomains)
      : "";

    // Bypassed handles load once and are skipped on later navigations.
    if (reinitBypassHandles.includes(String(handle))) {
      if (resolvedSrc && loadedBypassedSrcs.has(resolvedSrc)) {
        continue;
      }
      if (resolvedSrc) {
        loadedBypassedSrcs.add(resolvedSrc);
      }
    }

    // ES modules don't have inline extra/before/after scripts — just load the src.
    if (isModule) {
      if (resolvedSrc) {
        await insert(handle, { src: resolvedSrc, isModule: true });
      }
      continue;
    }

    const extraData = script.extraData
      ? replaceProxyPlaceholders(script.extraData, instance, pathname)
      : null;

    if (extraData) {
      await insertInlineAndAwait(`${handle}-js-extra`, extraData);
    }

    const beforeScript = joinScriptContent(script.before);
    if (beforeScript) {
      await insertInlineAndAwait(
        `${handle}-js-before`,
        beforeScript,
        handle === "wc-settings" ? () => processWcSettings(instance) : undefined
      );
    }

    if (resolvedSrc) {
      await insert(handle, { src: resolvedSrc });
    }

    const afterScript = joinScriptContent(script.after);
    if (afterScript) {
      await insertInlineAndAwait(`${handle}-js-after`, afterScript);
    }
  }
}

/**
 * Replaces the global styles elements ([data-nextpress="global"]) in the head.
 */
function updateGlobalStyles(
  globalStyles: GlobalStylesType | null | undefined,
  instance: string,
  pathname: string
): void {
  const existing = document.querySelectorAll('[data-nextpress="global"]');
  existing.forEach((el) => el.parentElement?.removeChild(el));

  if (!globalStyles) return;

  const head = document.head;

  // Re-register the wp-theme layer on every navigation so theme.json
  // globalStyles stay below proxied CSS and unlayered author rules in
  // the cascade after the previous declaration is torn down.
  const layerOrder = createStyleElement(
    "nextpress-layer-order",
    "@layer wp-theme;"
  );
  layerOrder.setAttribute("data-nextpress", "global");
  head.appendChild(layerOrder);

  if (globalStyles.renderedFontFaces) {
    const fontFaceCss = replaceProxyPlaceholders(
      globalStyles.renderedFontFaces
        .replace(/<style[^>]*>/gi, "")
        .replace(/<\/style>/gi, "")
        .trim(),
      instance,
      pathname
    );
    if (fontFaceCss) {
      const el = createStyleElement("nextpress-font-faces", fontFaceCss);
      el.setAttribute("data-nextpress", "global");
      head.appendChild(el);
    }
  }

  if (globalStyles.stylesheet) {
    const el = createStyleElement(
      "nextpress-global-styles",
      scopeInlineStyles(globalStyles.stylesheet, { layer: "wp-theme" })
    );
    el.setAttribute("data-nextpress", "global");
    head.appendChild(el);
  }

  if (globalStyles.customCss) {
    const el = createStyleElement(
      "nextpress-custom-css",
      scopeInlineStyles(globalStyles.customCss, { layer: "wp-theme" })
    );
    el.setAttribute("data-nextpress", "global");
    head.appendChild(el);
  }
}

/**
 * Replaces the import map script tag with updated entries. Import maps
 * cannot be modified once inserted, so the existing one is removed and
 * a new one is created.
 */
function updateImportMap(
  imports: WPImport[] | null | undefined,
  instance: string,
  pathname: string
): void {
  const existing = document.getElementById("wp-importmap");
  if (existing) {
    existing.parentElement?.removeChild(existing);
  }

  if (!imports || imports.length === 0) return;

  const map: Record<string, string> = {};
  for (const entry of imports) {
    // Paths use the RELATIVE scheme — route through the asset proxy.
    map[entry.name] = transformAssetUrl(entry.path, instance);
  }

  const el = document.createElement("script");
  el.type = "importmap";
  el.id = "wp-importmap";
  el.textContent = JSON.stringify({ imports: map });
  document.head.appendChild(el);
}

/**
 * Client component that refreshes NextPress server-rendered assets
 * (stylesheets, scripts, global styles) on client-side navigation.
 *
 * On initial SSR, the server components render the asset markup directly.
 * On subsequent navigations, this component fetches fresh asset data for the
 * new pathname, removes the old server-rendered elements, and inserts the new
 * ones between the marker tags rendered by the server components.
 */
export function AssetUpdater({
  pathname,
  instance = "default",
  fetchAssets,
  bypassDomains = [],
  reinitBypassHandles = [],
}: AssetUpdaterProps) {
  // Watch the DOM for `__NEXTPRESS_*` placeholders in element attribute
  // values and rewrite them to proxy values on every mutation. Lives in
  // its own effect so a navigation that re-runs the asset-fetch effect
  // below doesn't tear down the observer mid-flight.
  useEffect(() => {
    return startPlaceholderObserver(instance, pathname);
  }, [instance, pathname]);

  // Skip only the initial mount — the server already rendered those assets.
  // Every effect run after the first one (including returning to the initial
  // pathname) re-fetches and re-applies assets.
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      // Fire synthetic page events on initial mount so WordPress scripts
      // that missed the real DOMContentLoaded can initialize.
      firePageEvents();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const assets = await fetchAssets(pathname);
        if (cancelled) return;

        updateStylesheets(assets.stylesheets, instance, bypassDomains);
        updateGlobalStyles(assets.globalStyles, instance, pathname);
        updateImportMap(assets.importMap, instance, pathname);

        // Insert head scripts sequentially, then body scripts sequentially,
        // so each script (inline or external) finishes executing before the
        // next is inserted.
        await updateScripts(
          assets.scripts,
          ScriptLoadingGroupEnum.HEADER,
          "nextpress-head-scripts-start",
          "nextpress-head-scripts-end",
          instance,
          pathname,
          bypassDomains,
          reinitBypassHandles
        );
        if (cancelled) return;

        await updateScripts(
          assets.scripts,
          ScriptLoadingGroupEnum.FOOTER,
          "nextpress-body-scripts-start",
          "nextpress-body-scripts-end",
          instance,
          pathname,
          bypassDomains,
          reinitBypassHandles
        );
        if (cancelled) return;

        firePageEvents();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[AssetUpdater] Failed to update assets:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, instance, fetchAssets]);

  return null;
}
