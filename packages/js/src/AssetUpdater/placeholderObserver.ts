import { replaceProxyPlaceholders } from '@/compatibility/woocommerce';

const PLACEHOLDER = '__NEXTPRESS_';

/**
 * Replace `__NEXTPRESS_*` placeholders found in any of the element's
 * attribute values with their resolved proxy values. Skips text content
 * and the element's children — call the observer to handle subtrees.
 */
function processElementAttributes(
  el: Element,
  instance: string,
  pathname: string,
): void {
  const { attributes } = el;
  for (let i = 0; i < attributes.length; i += 1) {
    const attr = attributes[i];
    const value = attr.value;
    if (!value || value.indexOf(PLACEHOLDER) === -1) continue;
    const replaced = replaceProxyPlaceholders(value, instance, pathname);
    if (replaced !== value) {
      el.setAttribute(attr.name, replaced);
    }
  }
}

/**
 * Walk an element and every element descendant, applying
 * `processElementAttributes` to each.
 */
function processSubtree(root: Element, instance: string, pathname: string): void {
  processElementAttributes(root, instance, pathname);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.nextNode();
  while (node) {
    processElementAttributes(node as Element, instance, pathname);
    node = walker.nextNode();
  }
}

/**
 * Start a MutationObserver that resolves `__NEXTPRESS_*` placeholders
 * found in element attribute values everywhere in the document. Runs
 * one initial sweep over the existing tree, then watches:
 *
 *   - `attributes` mutations — covers in-place updates to a single
 *     attribute on an existing element.
 *   - `childList` mutations with `subtree: true` — covers new elements
 *     inserted anywhere (each new element + its descendants get swept).
 *
 * Text node content and characterData mutations are NOT processed —
 * only element attributes.
 *
 * Returns a disconnect function that the caller invokes on cleanup.
 */
export function startPlaceholderObserver(
  instance: string,
  pathname: string,
): () => void {
  processSubtree(document.documentElement, instance, pathname);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes' && record.target.nodeType === Node.ELEMENT_NODE) {
        const attrName = record.attributeName;
        const el = record.target as Element;
        if (!attrName) continue;
        const value = el.getAttribute(attrName);
        if (!value || value.indexOf(PLACEHOLDER) === -1) continue;
        const replaced = replaceProxyPlaceholders(value, instance, pathname);
        if (replaced !== value) {
          el.setAttribute(attrName, replaced);
        }
        continue;
      }
      if (record.type === 'childList') {
        for (let i = 0; i < record.addedNodes.length; i += 1) {
          const added = record.addedNodes[i];
          if (added.nodeType === Node.ELEMENT_NODE) {
            processSubtree(added as Element, instance, pathname);
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    attributes: true,
    subtree: true,
  });

  return () => observer.disconnect();
}
