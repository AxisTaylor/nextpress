---
"@axistaylor/nextpress": patch
---

Strip hop-by-hop headers (Connection, Keep-Alive, Transfer-Encoding, Upgrade, Proxy-Authenticate, Proxy-Authorization, TE, Trailer) plus Host and Content-Length from `request.headers` before forwarding them to `fetch()` in `proxyByWCR`. Node's built-in `fetch` (undici) rejects these as forbidden request headers (`UND_ERR_INVALID_ARG`), which made `/atx/:instance/wp`, `/atx/:instance/wc`, and `/atx/:instance/wp-json/*` return `500 Internal Server Error` whenever the browser sent `Connection: keep-alive` — i.e. every browser request. End-to-end headers (`Authorization`, `Cookie`, `Cart-Token`, `Accept`, etc.) are still forwarded unchanged.
