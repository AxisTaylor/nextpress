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
          <Link href="/shop" className="hover:text-gray-300">Shop</Link>
          <Link href="/cart" className="hover:text-gray-300">Cart</Link>
        </div>
      </nav>
    </header>
  );
}
