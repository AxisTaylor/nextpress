import React from 'react';
import parse, {
  DOMNode,
  domToReact,
  HTMLReactParserOptions,
  Element,
  attributesToProps,
} from 'html-react-parser';

export default function parseHtml(
  html: string,
  customParser?: (node: DOMNode, props: any, children?: DOMNode[]|DOMNode) => JSX.Element
) {
  const options: HTMLReactParserOptions = {
    replace(node) {
      const { name, attribs, children } = node as Element;
      if (!name) {
        return undefined;
      }
      
      const Component = name as keyof JSX.IntrinsicElements;
      const props = attributesToProps(attribs);

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

      if (customParser) {
        const result = customParser(node, props, children as Element[]);
        if (result) {
          return result;
        }
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

export interface ContentProps {
  content: string;
  customParser?: (node: DOMNode, props: any, children?: DOMNode[]|DOMNode) => JSX.Element
}

export function Content({ content, customParser }: ContentProps) {
  return (<>{parseHtml(content, customParser)}</>);
}