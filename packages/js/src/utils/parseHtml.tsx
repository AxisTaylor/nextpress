import React from 'react';
import parse, {
  DOMNode,
  domToReact,
  HTMLReactParserOptions,
  Element,
  attributesToProps,
} from 'html-react-parser';

/**
 * Type for HTML element props returned by attributesToProps
 */
export type ElementProps = ReturnType<typeof attributesToProps>;

/**
 * Type for custom parser functions
 */
export type CustomParser = (node: DOMNode, props: ElementProps, children?: DOMNode[]|DOMNode) => JSX.Element | undefined;

export function parseHtml(
  html: string,
  ...parsers: (CustomParser|undefined)[]
) {
  const options: HTMLReactParserOptions = {
    replace(node) {
      const { name, attribs, children } = node as Element;
      if (!name) {
        return undefined;
      }

      const Component = name as keyof JSX.IntrinsicElements;
      const props = attributesToProps(attribs);

      // Try each custom parser in order
      for (const parser of parsers) {
        if (!parser) {
          continue;
        }
        const result = parser(node, props, children as Element[]);
        if (result) {
          return result;
        }
      }

      if (name === 'a' && !props.href) {
        return (
          <a {...props}>
            {children && domToReact(children as Element[], options)}
          </a>
        );
      }

      const voidElements = ['br', 'hr', 'input', 'img', 'link', 'meta'];
      if (voidElements.includes(name)) {
        return (<Component {...props} />);
      }

      // If nothing special render it as normal.
      return (
        <Component {...props}>
          {children && domToReact(children as Element[], options)}
        </Component>
      );
    },
  };

  return parse(html, options as HTMLReactParserOptions);
}