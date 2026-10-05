"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ConfigureFirestorePage() {
  const searchParams =
    useSearchParams();

  const gameName =
    searchParams.get("gameName") ??
    "New Game";

  const developerName =
    searchParams.get("developerName") ??
    "";

  const platform =
    searchParams.get("platform") ??
    "android";

  const projectId =
    searchParams.get("projectId") ??
    "";

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#181817]">
      <div className="mx-auto max-w-5xl px-6 py-12">

        <Link
          href="/dashboard/games/new"
          className="text-sm font-medium text-neutral-500 transition hover:text-black"
        >
          ← Back
        </Link>

        <div className="mt-10 max-w-2xl">
          <p className="text-sm font-medium text-neutral-500">
            {gameName}
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Configure telemetry
          </h1>

          <p className="mt-4 text-base leading-7 text-neutral-600">
            Tell AMY how gameplay events are organized
            in your Firestore database.
          </p>
        </div>

        <div className="mt-10 flex items-center gap-3 text-sm">

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 font-medium text-green-700">
            ✓
          </div>

          <span className="text-neutral-500">
            Connect
          </span>

          <div className="h-px w-10 bg-neutral-300" />

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black font-medium text-white">
            2
          </div>

          <span className="font-medium">
            Configure
          </span>

          <div className="h-px w-10 bg-neutral-300" />

          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-500">
            3
          </div>

          <span className="text-neutral-500">
            Activate
          </span>

        </div>

        <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6">

          <div className="grid gap-4 sm:grid-cols-4">

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Game
              </p>

              <p className="mt-1 font-medium">
                {gameName}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Developer
              </p>

              <p className="mt-1 font-medium">
                {developerName ||
                  "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Platform
              </p>

              <p className="mt-1 font-medium capitalize">
                {platform}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Firestore project
              </p>

              <p className="mt-1 break-all font-medium">
                {projectId}
              </p>
            </div>

          </div>

        </section>

        <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-8">

          <h2 className="text-xl font-semibold">
            Discover telemetry
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            AMY will inspect a small sample of your
            Firestore telemetry to identify the event
            structure and suggest field mappings.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">

            <p className="font-medium">
              Ready to inspect Firestore
            </p>

            <p className="mt-2 text-sm text-neutral-500">
              Project: {projectId}
            </p>

          </div>

        </section>

      </div>
    </main>
  );
}