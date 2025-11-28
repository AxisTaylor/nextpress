import React from 'react';
import { Content } from '.';
import { mockNodeByUriQueryResult } from '../testing/mock';

describe('Content', () => {
  // Extract HTML content from mock
  const mockContent = mockNodeByUriQueryResult.data.nodeByUri.content;

  describe('snapshot testing', () => {
    it('should render WooCommerce cart block HTML from mock', () => {
      const element = <Content content={mockContent} />;
      expect(element).toMatchSnapshot();
    });

    it('should render simple HTML content', () => {
      const element = <Content content="<p>Hello World</p>" />;
      expect(element).toMatchSnapshot();
    });

    it('should render empty content', () => {
      const element = <Content content="" />;
      expect(element).toMatchSnapshot();
    });

    it('should render nested HTML structures', () => {
      const content = `
        <div class="wrapper">
          <h1>Title</h1>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
        </div>
      `;
      const element = <Content content={content} />;
      expect(element).toMatchSnapshot();
    });

    it('should correctly decode HTML entities', () => {
      const element = <Content content="<p>Price: &#036;10.00</p>" />;
      expect(element).toMatchSnapshot();
    });

    it('should handle multiple HTML entities', () => {
      const element = <Content content="<p>Symbols: &#036; &amp; &lt; &gt; &quot;</p>" />;
      expect(element).toMatchSnapshot();
    });

    it('should render void elements correctly', () => {
      const content = `
        <div>
          <br />
          <hr />
          <img src="/test.jpg" alt="test" />
        </div>
      `;
      const element = <Content content={content} />;
      expect(element).toMatchSnapshot();
    });

    it('should handle links without href', () => {
      const element = <Content content='<a class="button">Click me</a>' />;
      expect(element).toMatchSnapshot();
    });

    it('should handle links with href', () => {
      const element = <Content content='<a href="/page">Link</a>' />;
      expect(element).toMatchSnapshot();
    });

    it('should preserve data-block-name attributes', () => {
      const element = <Content content='<div data-block-name="woocommerce/cart">Cart</div>' />;
      expect(element).toMatchSnapshot();
    });

    it('should preserve multiple data attributes', () => {
      const element = <Content content='<div data-product-id="123" data-quantity="2" data-price="10">Product</div>' />;
      expect(element).toMatchSnapshot();
    });

    it('should fix tables missing tbody wrapper', () => {
      const content = `
        <table>
          <tr>
            <td>Cell 1</td>
            <td>Cell 2</td>
          </tr>
        </table>
      `;
      const element = <Content content={content} />;
      expect(element).toMatchSnapshot();
    });

    it('should not double-wrap tables with existing tbody', () => {
      const content = `
        <table>
          <tbody>
            <tr>
              <td>Cell 1</td>
            </tr>
          </tbody>
        </table>
      `;
      const element = <Content content={content} />;
      expect(element).toMatchSnapshot();
    });

    it('should handle complex table structures', () => {
      const content = `
        <table class="shop_table">
          <tr class="cart_item">
            <td class="product-name">Product</td>
            <td class="product-price">$10.00</td>
          </tr>
        </table>
      `;
      const element = <Content content={content} />;
      expect(element).toMatchSnapshot();
    });

    it('should preserve aria attributes', () => {
      const element = <Content content='<div aria-label="Product on sale" aria-hidden="true">Sale</div>' />;
      expect(element).toMatchSnapshot();
    });
  });

  describe('custom parser', () => {
    it('should render with customParser transforming elements', () => {
      const customParser = jest.fn((node) => {
        if ((node as any).name === 'custom') {
          return <div className="custom-parsed">Custom</div>;
        }
        return null as any;
      });

      const element = <Content content="<custom>Test</custom>" customParser={customParser} />;
      expect(element).toMatchSnapshot();
    });

    it('should use custom parser result when returned', () => {
      const customParser = jest.fn((node) => {
        if ((node as any).name === 'special') {
          return <span className="special-element">Custom Rendered</span>;
        }
        return null as any;
      });

      const element = <Content content="<special>Original</special>" customParser={customParser} />;
      expect(element).toMatchSnapshot();
    });

    it('should fallback to default rendering when customParser returns null', () => {
      const customParser = jest.fn(() => null as any);

      const element = <Content content='<p class="normal">Normal paragraph</p>' customParser={customParser} />;
      expect(element).toMatchSnapshot();
    });
  });
});
