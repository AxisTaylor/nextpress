import type { DOMNode, attributesToProps } from 'html-react-parser';

/**
 * React props produced by `html-react-parser`'s `attributesToProps`
 * for the current node. Used by `Content` customParsers to read the
 * resolved props (data attributes, class names, etc.) without having
 * to walk the raw `attribs` themselves.
 */
export type ElementProps = ReturnType<typeof attributesToProps>;

/**
 * Signature for a `Content` custom parser. Return a JSX element to
 * replace the matched node, or `undefined` to let the next parser in
 * the chain (or the default renderer) handle it.
 */
export type CustomParser = (node: DOMNode, props: ElementProps, children?: DOMNode[] | DOMNode) => JSX.Element | undefined;
