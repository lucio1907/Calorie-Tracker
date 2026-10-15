import { Suspense } from "react";
import { AuthGate, SignOutButton } from "@/features/auth";
import { AppShell, BottomTabBarContainer, PageSkeleton, SidebarNavContainer } from "@/features/shell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell
      sidebar={<SidebarNavContainer />}
      sidebarFooter={<SignOutButton className="w-full md:px-0 lg:justify-start lg:px-8" />}
      tabBar={<BottomTabBarContainer />}
    >
      <Suspense fallback={<PageSkeleton />}>
        <AuthGate>{children}</AuthGate>
      </Suspense>
    </AppShell>
  );
}
