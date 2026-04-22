import Link from 'next/link';

/**
 * Navbar Component
 */
export function Navbar() {
  return (
    <header className="bg-gray-800 text-white p-4">
      <nav className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-gray-300">
          NextPress E2E
        </Link>
        <div className="flex gap-6">
          <Link href="/" className="hover:text-gray-300">Home</Link>
          <Link href="/typography-showcase" className="hover:text-gray-300">Typography Showcase</Link>
          <Link href="/block-showcase" className="hover:text-gray-300">Block Showcase</Link>
          <Link href="/interactive-blocks" className="hover:text-gray-300">Interactive Blocks</Link>
          <Link href="/session-blocks" className="hover:text-gray-300">Session Blocks</Link>
          <Link href="/shop" className="hover:text-gray-300">Shop</Link>
          <Link href="/cart" className="hover:text-gray-300">Cart</Link>
          <Link href="/checkout" className="hover:text-gray-300">Checkout</Link>
        </div>
      </nav>
    </header>
  );
}
