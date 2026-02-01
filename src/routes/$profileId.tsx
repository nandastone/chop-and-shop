import {
  createFileRoute,
  Outlet,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import { UtensilsCrossed, ShoppingCart, Store, Package } from "lucide-react";
import { ProfileProvider } from "~/contexts/ProfileContext";

export const Route = createFileRoute("/$profileId")({
  component: ProfileLayout,
});

function ProfileLayout() {
  const { profileId } = Route.useParams();

  return (
    <ProfileProvider profileId={profileId}>
      <Outlet />
      <BottomNav profileId={profileId} />
    </ProfileProvider>
  );
}

function BottomNav({ profileId }: { profileId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = [
    { to: "/$profileId", icon: ShoppingCart, label: "List" },
    { to: "/$profileId/dishes", icon: UtensilsCrossed, label: "Dishes" },
    { to: "/$profileId/ingredients", icon: Package, label: "Ingredients" },
    { to: "/$profileId/stores", icon: Store, label: "Stores" },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const itemPath = item.to.replace("$profileId", profileId);
        const isActive =
          item.to === "/$profileId"
            ? pathname === `/${profileId}` || pathname === `/${profileId}/`
            : pathname.startsWith(itemPath);
        return (
          <Link
            key={item.to}
            to={item.to}
            params={{ profileId }}
            className={`bottom-nav-item ${isActive ? "bottom-nav-item-active" : ""}`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
