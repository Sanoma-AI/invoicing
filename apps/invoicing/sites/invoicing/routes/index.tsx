import { createFileRoute } from "@tanstack/react-router";
import { redirect } from "sanoma/site";

// The site's home is its invoices.
export const Route = createFileRoute("/sites/invoicing/invoicing/")({
  beforeLoad: () => {
    throw redirect({ to: "/sites/invoicing/invoicing/invoices" });
  },
});
