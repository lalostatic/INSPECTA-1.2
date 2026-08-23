import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Protected } from "@/components/protected";

export const Route = createFileRoute("/inspecciones")({
  component: () => (
    <Protected>
      <Outlet />
    </Protected>
  ),
});
