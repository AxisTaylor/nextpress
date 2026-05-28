---
"@axistaylor/nextpress": patch
---

Export `CustomParser` and `ElementProps` types from the package root. Consumers writing a `Content` `customParser` can now `import type { CustomParser, ElementProps } from '@axistaylor/nextpress'` instead of mirroring the type signature locally. Types are sourced from a new dedicated `parsers/types` module so the parsing utility (`utils/parseHtml`) no longer owns both runtime helpers and public types.
