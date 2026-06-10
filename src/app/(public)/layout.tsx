import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/cart/CartProvider";

// Storefront chrome. Wraps every public route (/, /catalog, /blog) with the
// Header/Footer that the admin segment must NOT inherit. The (public) route
// group does not affect URLs — /catalog stays /catalog.
// CartProvider wraps the chrome too: the Header needs the cart badge.
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </CartProvider>
  );
}
