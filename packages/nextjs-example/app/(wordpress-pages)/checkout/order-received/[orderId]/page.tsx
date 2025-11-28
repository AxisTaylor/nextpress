import Link from 'next/link';
import { fetchOrder, Order } from '@/lib/utils';

interface OrderReceivedPageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ key?: string }>;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: 'Pending Payment',
    PROCESSING: 'Processing',
    ON_HOLD: 'On Hold',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
    FAILED: 'Failed',
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    ON_HOLD: 'bg-orange-100 text-orange-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    REFUNDED: 'bg-purple-100 text-purple-800',
    FAILED: 'bg-red-100 text-red-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

export default async function OrderReceivedPage({ params, searchParams }: OrderReceivedPageProps) {
  const { orderId } = await params;
  await searchParams; // Consume searchParams even if not used

  const order = await fetchOrder(orderId);

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-2">Order Not Found</h1>
          <p className="text-red-600 mb-4">
            We couldn&apos;t find the order you&apos;re looking for. Please check the order number and try again.
          </p>
          <Link href="/shop" className="inline-block bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-center">
        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-2xl font-bold text-green-800 mb-2">Thank you for your order!</h1>
        <p className="text-green-600">Your order has been received and is being processed.</p>
      </div>

      {/* Order Summary Header */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h2 className="text-xl font-semibold">Order #{order.orderNumber}</h2>
            <p className="text-gray-500 text-sm">{formatDate(order.date)}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
            {formatStatus(order.status)}
          </span>
        </div>
        {order.paymentMethodTitle && (
          <p className="text-gray-600 mt-2">
            <span className="font-medium">Payment Method:</span> {order.paymentMethodTitle}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Billing Address */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-3">Billing Address</h3>
          <address className="not-italic text-gray-600 text-sm leading-relaxed">
            {order.billing.firstName} {order.billing.lastName}<br />
            {order.billing.company && <>{order.billing.company}<br /></>}
            {order.billing.address1}<br />
            {order.billing.address2 && <>{order.billing.address2}<br /></>}
            {order.billing.city}, {order.billing.state} {order.billing.postcode}<br />
            {order.billing.country}<br />
            {order.billing.phone && <><br />Phone: {order.billing.phone}</>}
            {order.billing.email && <><br />Email: {order.billing.email}</>}
          </address>
        </div>

        {/* Shipping Address */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-3">Shipping Address</h3>
          <address className="not-italic text-gray-600 text-sm leading-relaxed">
            {order.shipping.firstName} {order.shipping.lastName}<br />
            {order.shipping.company && <>{order.shipping.company}<br /></>}
            {order.shipping.address1}<br />
            {order.shipping.address2 && <>{order.shipping.address2}<br /></>}
            {order.shipping.city}, {order.shipping.state} {order.shipping.postcode}<br />
            {order.shipping.country}
          </address>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white border rounded-lg overflow-hidden mb-6">
        <h3 className="font-semibold text-lg p-6 border-b">Order Items</h3>
        <div className="divide-y">
          {order.lineItems.nodes.map((item, index) => {
            const product = item.product?.node;
            const variation = item.variation?.node;
            const image = variation?.image || product?.image;
            const name = variation?.name || product?.name || 'Product';

            return (
              <div key={index} className="flex items-center gap-4 p-4">
                {image?.sourceUrl ? (
                  <img
                    src={image.sourceUrl}
                    alt={image.altText || name}
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{name}</p>
                  <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium" dangerouslySetInnerHTML={{ __html: item.total }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Totals */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Order Total</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span dangerouslySetInnerHTML={{ __html: order.subtotal }} />
          </div>

          {order.shippingLines.nodes.map((shipping, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-600">{shipping.methodTitle}</span>
              <span dangerouslySetInnerHTML={{ __html: shipping.total }} />
            </div>
          ))}

          {order.feeLines.nodes.map((fee, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-600">{fee.name}</span>
              <span dangerouslySetInnerHTML={{ __html: fee.total }} />
            </div>
          ))}

          {order.taxLines.nodes.map((tax, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-600">{tax.label}</span>
              <span dangerouslySetInnerHTML={{ __html: tax.taxTotal }} />
            </div>
          ))}

          {order.discountTotal && order.discountTotal !== '$0.00' && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-<span dangerouslySetInnerHTML={{ __html: order.discountTotal }} /></span>
            </div>
          )}

          <div className="flex justify-between font-semibold text-lg pt-2 border-t mt-2">
            <span>Total</span>
            <span dangerouslySetInnerHTML={{ __html: order.total }} />
          </div>
        </div>
      </div>

      {/* Customer Note */}
      {order.customerNote && (
        <div className="bg-white border rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-lg mb-2">Order Notes</h3>
          <p className="text-gray-600">{order.customerNote}</p>
        </div>
      )}

      {/* Continue Shopping Button */}
      <div className="mt-8 text-center">
        <Link href="/shop" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
