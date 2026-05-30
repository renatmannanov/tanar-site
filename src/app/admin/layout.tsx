// Passthrough layout shared by /admin/login and /admin/(protected)/*.
// The sidebar shell lives in (protected)/layout.tsx so the login page does NOT
// inherit it. No auth-guard here (would redirect-loop on the login page) — auth
// barriers are middleware (step 2) + requireAdmin() in protected pages/actions.
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
