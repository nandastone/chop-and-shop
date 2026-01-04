import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import * as React from "react";
import type { QueryClient } from "@tanstack/react-query";
import { UtensilsCrossed, ShoppingCart, Store, Package } from "lucide-react";
import { Toaster } from "sonner";
import appCss from "~/styles/app.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { title: "Chop & Shop" },
      { name: "description", content: "Shopping list generator for Vani" },
      { name: "theme-color", content: "#f97352" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-stone-500">Page not found</p>
    </div>
  ),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
      <BottomNav />
      <Toaster position="top-center" richColors />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen pb-20">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = [
    { to: "/list", icon: ShoppingCart, label: "List" },
    { to: "/", icon: UtensilsCrossed, label: "Dishes" },
    { to: "/ingredients", icon: Package, label: "Ingredients" },
    { to: "/stores", icon: Store, label: "Stores" },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive =
          item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
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
