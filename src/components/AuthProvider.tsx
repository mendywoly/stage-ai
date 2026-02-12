"use client";

import { useEffect, useState } from "react";
import { ensureAuthenticated } from "@/lib/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure user is authenticated (anonymously if needed)
    ensureAuthenticated()
      .then(() => {
        setIsReady(true);
      })
      .catch((error) => {
        console.error("Failed to initialize auth:", error);
        // Still set ready to true so app doesn't hang
        setIsReady(true);
      });
  }, []);

  // Show nothing while initializing auth
  // This prevents flash of content before auth is ready
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
