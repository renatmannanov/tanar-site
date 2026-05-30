import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Storefront chrome. Wraps every public route (/, /catalog, /blog) with the
// Header/Footer that the admin segment must NOT inherit. The (public) route
// group does not affect URLs — /catalog stays /catalog.
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
