import React from "react";
import { Link } from "react-router-dom";
import { useShopContext } from "../context/ShopContext";

const TAX_RATE = 0.115; // 11.5%
const SHIPPING = 5;     // flat rate, free above a threshold if you want

const ShoppingCart = () => {
  const { cart, updateCartItem, removeCartItem, clearCart, currency } = useShopContext();

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => {
    const price = item.product?.price ?? item.price ?? 0;
    const discount = item.product?.discountPercentage ?? 0;
    const finalPrice = discount > 0 ? price * (1 - discount / 100) : price;
    return sum + finalPrice * (item.quantity || 1);
  }, 0);

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax + SHIPPING;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 mt-16">
        <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600 mb-4">Your cart is empty.</p>
          <Link
            to="/collection"
            className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Cart items table ──────────────────────────────────────────── */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cart.map((item) => {
                  // Support both DB cart shape and anonymous cart shape
                  const product = item.product ?? item;
                  const price = product.price ?? 0;
                  const discount = product.discountPercentage ?? 0;
                  const finalPrice = discount > 0 ? price * (1 - discount / 100) : price;
                  const imageUrl = Array.isArray(product.imageUrl)
                    ? product.imageUrl[0]
                    : product.imageUrl;
                  const size = item.size ?? item.selectedSize;

                  return (
                    <tr key={item.id}>
                      {/* Product info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            className="h-16 w-16 rounded object-cover flex-shrink-0"
                            src={imageUrl || "/placeholder-image.jpg"}
                            alt={product.name}
                            onError={(e) => { e.target.src = "/placeholder-image.jpg"; }}
                          />
                          <div className="ml-4">
                            <Link
                              to={`/product/${product.id ?? item.productId}`}
                              className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                            >
                              {product.name}
                            </Link>
                            {size && (
                              <p className="text-xs text-gray-500 mt-0.5">Size: {size}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Unit price */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currency}{finalPrice.toFixed(2)}
                        {discount > 0 && (
                          <span className="block text-xs text-red-500 line-through">
                            {currency}{price.toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Quantity stepper */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex border border-gray-300 rounded-md w-24">
                          <button
                            onClick={() => item.quantity > 1 && updateCartItem(item.id, item.quantity - 1)}
                            className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 1) updateCartItem(item.id, val);
                            }}
                            className="w-10 text-center border-x border-gray-300 py-1 focus:outline-none"
                          />
                          <button
                            onClick={() => updateCartItem(item.id, item.quantity + 1)}
                            className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Line total */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currency}{(finalPrice * item.quantity).toFixed(2)}
                      </td>

                      {/* Remove */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => removeCartItem(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between">
            <Link
              to="/collection"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Continue Shopping
            </Link>
            <button
              onClick={clearCart}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Clear Cart
            </button>
          </div>
        </div>

        {/* ── Order summary ─────────────────────────────────────────────── */}
        <div className="lg:w-1/3">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>

            <div className="border-t border-gray-200 py-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{currency}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (11.5%)</span>
                <span>{currency}{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span>{currency}{SHIPPING.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-4 border-t border-gray-200 text-lg font-bold">
                <span>Total</span>
                <span>{currency}{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/checkout"
                className="w-full inline-flex justify-center items-center px-6 py-3 rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-800"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
