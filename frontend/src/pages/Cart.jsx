// This file is superseded by ShoppingCart.jsx (App.jsx routes /cart → ShoppingCart).
// Kept as a redirect to avoid a broken import if referenced anywhere.
import { Navigate } from 'react-router-dom';
const Cart = () => <Navigate to="/cart" replace />;
export default Cart;
