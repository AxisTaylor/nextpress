# Content Component

The `Content` component renders WordPress HTML content in React, automatically handling Gutenberg blocks, HTML entities, and table structures.

## Basic Usage

```tsx
import { Content } from '@axistaylor/nextpress';

export default function Page({ content }: { content: string }) {
  return <Content content={content} />;
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `content` | `string` | Yes | WordPress HTML content to render |
| `customParser` | `CustomParserCallback` | No | Function to customize element rendering |
| `instance` | `string` | No | WordPress instance slug (for multi-WordPress setups) |

## How It Works

The `Content` component:

1. **Parses HTML** - Uses `html-react-parser` to convert HTML string to React elements
2. **Decodes Entities** - Automatically decodes HTML entities (`&amp;` → `&`, `&lt;` → `<`, etc.)
3. **Fixes Tables** - Wraps table rows in `<tbody>` if missing (required by React)
4. **Preserves Attributes** - Maintains `data-*` attributes, `aria-*` attributes, and class names

## Custom Parsers

Custom parsers allow you to intercept and modify how specific HTML elements are rendered. This is useful for:

- Replacing WordPress blocks with React components
- Adding click handlers or interactivity
- Modifying styles or classes
- Lazy loading images
- Integrating with React state

### Creating a Custom Parser

A custom parser is a function that receives the element's tag name, props, and children, and returns either a React element or `null` to use default rendering:

```tsx
import { Content, CustomParserCallback } from '@axistaylor/nextpress';

const customParser: CustomParserCallback = (tagName, props, children) => {
  // Return a React element to override rendering
  // Return null to use default rendering

  if (tagName === 'img') {
    // Replace img tags with Next.js Image component
    return (
      <Image
        key={props.key}
        src={props.src}
        alt={props.alt || ''}
        width={800}
        height={600}
        className={props.className}
      />
    );
  }

  // Return null for default rendering
  return null;
};

export default function Page({ content }: { content: string }) {
  return <Content content={content} customParser={customParser} />;
}
```

### Custom Parser Signature

```ts
type CustomParserCallback = (
  tagName: string,
  props: HTMLReactParserProps & { key?: string },
  children: React.ReactNode
) => React.ReactElement | null;
```

**Parameters:**

- `tagName` - The HTML tag name (e.g., `'div'`, `'img'`, `'a'`)
- `props` - The element's attributes converted to React props, including:
  - `className` - CSS classes
  - `id` - Element ID
  - `data-*` - Data attributes (as `data-block-name`, etc.)
  - `key` - React key for list rendering
- `children` - The element's children (already converted to React nodes)

**Return Value:**

- Return a `React.ReactElement` to replace the element
- Return `null` to use default rendering

### Example: Replace WordPress Blocks with React Components

```tsx
import { Content, CustomParserCallback } from '@axistaylor/nextpress';
import { MyGalleryComponent } from '@/components/Gallery';
import { MyButtonComponent } from '@/components/Button';

const customParser: CustomParserCallback = (tagName, props, children) => {
  // Get the WordPress block name from data attribute
  const blockName = props['data-block-name'];

  // Replace gallery blocks with custom component
  if (blockName === 'core/gallery') {
    return (
      <MyGalleryComponent
        key={props.key}
        className={props.className}
      >
        {children}
      </MyGalleryComponent>
    );
  }

  // Replace button blocks with interactive component
  if (blockName === 'core/button') {
    return (
      <MyButtonComponent
        key={props.key}
        href={props.href}
        className={props.className}
      >
        {children}
      </MyButtonComponent>
    );
  }

  return null;
};
```

### Example: Add Click Tracking to Links

```tsx
const customParser: CustomParserCallback = (tagName, props, children) => {
  if (tagName === 'a' && props.href) {
    return (
      <a
        key={props.key}
        href={props.href}
        className={props.className}
        onClick={() => {
          // Track link click
          analytics.track('link_click', { url: props.href });
        }}
      >
        {children}
      </a>
    );
  }

  return null;
};
```

### Example: Lazy Load Images

```tsx
import Image from 'next/image';

const customParser: CustomParserCallback = (tagName, props, children) => {
  if (tagName === 'img') {
    // Extract dimensions from WordPress classes or attributes
    const width = parseInt(props.width) || 800;
    const height = parseInt(props.height) || 600;

    return (
      <Image
        key={props.key}
        src={props.src}
        alt={props.alt || ''}
        width={width}
        height={height}
        loading="lazy"
        className={props.className}
      />
    );
  }

  return null;
};
```

### Example: Transform Specific Block Types

```tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

const customParser: CustomParserCallback = (tagName, props, children) => {
  // Transform code blocks with syntax highlighting
  if (tagName === 'pre' && props['data-block-name'] === 'core/code') {
    // Extract language from class (e.g., "language-javascript")
    const langMatch = props.className?.match(/language-(\w+)/);
    const language = langMatch ? langMatch[1] : 'text';

    // Get the code text from children
    const codeText = extractTextFromChildren(children);

    return (
      <SyntaxHighlighter
        key={props.key}
        language={language}
        className={props.className}
      >
        {codeText}
      </SyntaxHighlighter>
    );
  }

  return null;
};

// Helper to extract text content from React children
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren(children.props.children);
  }
  return '';
}
```

## Multi-WordPress Support

When using multiple WordPress backends, specify the instance:

```tsx
<Content content={content} instance="blog" />
```

See [Multi-WordPress Setup](./multi-wordpress.md) for configuration details.

## TypeScript

Import the types for full TypeScript support:

```tsx
import { Content, CustomParserCallback } from '@axistaylor/nextpress';
import type { HTMLReactParserProps } from 'html-react-parser';
```

## Related

- [Getting Started](./getting-started.md) - Initial setup
- [HeadScripts](./head-scripts.md) - Loading WordPress scripts
- [RenderStylesheets](./render-stylesheets.md) - Loading WordPress styles
