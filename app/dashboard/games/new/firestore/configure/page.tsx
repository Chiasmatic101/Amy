import { Suspense } from "react";
import FirestoreConfigureClient from "./FirestoreConfigureClient";

export default function ConfigureFirestorePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f7f5] text-[#181817]">
          <div className="mx-auto max-w-5xl px-6 py-12">
            <p className="text-sm text-neutral-500">
              Loading telemetry configuration...
            </p>
          </div>
        </main>
      }
    >
      <FirestoreConfigureClient />
    </Suspense>
  );
}