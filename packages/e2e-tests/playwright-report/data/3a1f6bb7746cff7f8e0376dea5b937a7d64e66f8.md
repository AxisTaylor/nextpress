# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - navigation [ref=e3]:
      - link "NextPress E2E" [ref=e4] [cursor=pointer]:
        - /url: /
      - generic [ref=e5]:
        - link "Home" [ref=e6] [cursor=pointer]:
          - /url: /
        - link "Shop" [ref=e7] [cursor=pointer]:
          - /url: /shop
        - link "Cart" [ref=e8] [cursor=pointer]:
          - /url: /cart
  - main [ref=e9]:
    - generic [ref=e13]:
      - img [ref=e14]
      - strong [ref=e17]: Your cart is currently empty!
      - paragraph [ref=e18]: Checkout is not available whilst your cart is empty—please take a look through our store and come back when you're ready to place an order.
      - link "Browse store" [ref=e20] [cursor=pointer]:
        - /url: http://localhost:3000/shop/
  - contentinfo [ref=e21]:
    - paragraph [ref=e23]: NextPress E2E Test Application
  - generic [ref=e28] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e29]:
      - img [ref=e30]
    - generic [ref=e33]:
      - button "Open issues overlay" [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e36]: "0"
          - generic [ref=e37]: "1"
        - generic [ref=e38]: Issue
      - button "Collapse issues badge" [ref=e39]:
        - img [ref=e40]
  - alert [ref=e42]
  - paragraph [ref=e43]: Notifications
  - generic [ref=e45]: "\"T-Shirt with Logo\" was removed from your cart."
  - status [ref=e46]
```