import { createFileRoute } from "@tanstack/react-router";
import { LoginView } from "@/components/login-view";
import { ensureDemoUsers } from "@/lib/server/demo-seed";

export const Route = createFileRoute("/login")({
  loader: async () => {
    await ensureDemoUsers();
    return {};
  },
  component: LoginView,
});
