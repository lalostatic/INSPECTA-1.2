import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Protected } from "@/components/protected";

export const Route = createFileRoute("/almacen")({
  component: () => (
    <Protected>
      <Outlet />
    </Protected>
  ),
});
