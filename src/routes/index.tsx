import { createFileRoute, redirect } from "@tanstack/react-router";
import { nanoid } from "nanoid";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Generate a new 8-character profile ID and redirect.
    const profileId = nanoid(8);
    throw redirect({ to: "/$profileId", params: { profileId } });
  },
  component: () => null,
});
