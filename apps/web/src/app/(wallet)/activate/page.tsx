"use client";

/**
 * Activate Page (Legacy Redirect)
 *
 * This page now redirects to /dashboard.
 * The activation flow has been split into /fund and /deploy.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ActivatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
