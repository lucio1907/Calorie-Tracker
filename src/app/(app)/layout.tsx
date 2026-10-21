import { Suspense } from "react";
import { AuthGate, SignOutButtonContainer } from "@/features/auth";
import { AppShell, BottomTabBarContainer, SidebarNavContainer } from "@/features/shell";

/*
 * Each page owns the <Suspense> boundary around its per-user data. A boundary
 * here would not cover client navigations between these pages (the layout
 * stays mounted), so they would block on the server instead of showing the
 * destination's shell right away.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell
      sidebar={<SidebarNavContainer />}
      sidebarFooter={<SignOutButtonContainer className="w-full md:px-0 lg:justify-start lg:px-8" />}
      tabBar={<BottomTabBarContainer />}
    >
      <Suspense fallback={null}>
        <AuthGate />
      </Suspense>
      {children}
    </AppShell>
  );
}
