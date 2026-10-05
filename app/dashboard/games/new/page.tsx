"use client";

import Link from "next/link";
import { useState } from "react";

type DataSource =
  | "firestore"
  | "rest"
  | "supabase"
  | "postgres"
  | "mongodb"
  | "upload"
  | null;

export default function NewGamePage() {
  const [gameName, setGameName] =
    useState("");

  const [developerName, setDeveloperName] =
    useState("");

  const [platform, setPlatform] =
    useState("android");

  const [dataSource, setDataSource] =
    useState<DataSource>(null);

  const dataSources = [
    {
      id: "firestore" as const,
      name: "Google Firestore",
      description:
        "Connect an existing Firestore database and let AMY securely read telemetry.",
      available: true,
    },
    {
      id: "rest" as const,
      name: "AMY REST API",
      description:
        "Send gameplay events directly to AMY using the AMY telemetry API.",
      available: false,
    },
    {
      id: "supabase" as const,
      name: "Supabase",
      description:
        "Connect telemetry stored in a Supabase project.",
      available: false,
    },
    {
      id: "postgres" as const,
      name: "PostgreSQL",
      description:
        "Connect an existing PostgreSQL telemetry database.",
      available: false,
    },
    {
      id: "mongodb" as const,
      name: "MongoDB",
      description:
        "Connect gameplay telemetry stored in MongoDB.",
      available: false,
    },
    {
      id: "upload" as const,
      name: "File Upload",
      description:
        "Import historical telemetry from JSON or CSV files.",
      available: false,
    },
  ];

  const canContinue =
    gameName.trim().length > 0 &&
    developerName.trim().length > 0 &&
    dataSource === "firestore";

  function continueSetup() {
    if (!canContinue) {
      return;
    }

    const params =
      new URLSearchParams({
        gameName: gameName.trim(),
        developerName:
          developerName.trim(),
        platform,
        provider: dataSource,
      });

    window.location.href =
      `/dashboard/games/new/firestore?${params.toString()}`;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#181817]">
      <div className="mx-auto max-w-5xl px-6 py-12">

        <Link
          href="/dashboard/games"
          className="text-sm font-medium text-neutral-500 transition hover:text-black"
        >
          ← Games
        </Link>

        <div className="mt-10 max-w-2xl">
          <p className="text-sm font-medium text-neutral-500">
            New integration
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Connect a game to AMY
          </h1>

          <p className="mt-4 text-base leading-7 text-neutral-600">
            Tell AMY about your game and choose how
            gameplay telemetry should be connected.
          </p>
        </div>


        {/* GAME DETAILS */}

        <section className="mt-12 rounded-3xl border border-neutral-200 bg-white p-8">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Step 1
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Game details
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Game name
              </span>

              <input
                value={gameName}
                onChange={(event) =>
                  setGameName(
                    event.target.value
                  )
                }
                placeholder="Example: Galaxy Runner"
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none transition focus:border-black"
              />
            </label>


            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Developer / Studio
              </span>

              <input
                value={developerName}
                onChange={(event) =>
                  setDeveloperName(
                    event.target.value
                  )
                }
                placeholder="Example: Acme Games"
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none transition focus:border-black"
              />
            </label>


            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Platform
              </span>

              <select
                value={platform}
                onChange={(event) =>
                  setPlatform(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none transition focus:border-black"
              >
                <option value="android">
                  Android
                </option>

                <option value="ios">
                  iOS
                </option>

                <option value="web">
                  Web
                </option>

                <option value="cross-platform">
                  Cross-platform
                </option>
              </select>
            </label>


            <div>
              <span className="mb-2 block text-sm font-medium">
                Environment
              </span>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                Test
              </div>

              <p className="mt-2 text-xs text-neutral-400">
                New integrations begin in the test environment.
              </p>
            </div>
          </div>
        </section>


        {/* DATA SOURCE */}

        <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-8">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Step 2
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Choose a data source
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Select where your game's telemetry
              currently lives.
            </p>
          </div>


          <div className="grid gap-4 md:grid-cols-2">

            {dataSources.map(
              (source) => {
                const selected =
                  dataSource ===
                  source.id;

                return (
                  <button
                    key={source.id}
                    type="button"
                    disabled={
                      !source.available
                    }
                    onClick={() =>
                      source.available &&
                      setDataSource(
                        source.id
                      )
                    }
                    className={`rounded-2xl border p-5 text-left transition ${
                      selected
                        ? "border-black bg-neutral-50"
                        : source.available
                          ? "border-neutral-200 hover:border-neutral-400"
                          : "cursor-not-allowed border-neutral-100 bg-neutral-50 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">

                      <div>
                        <h3 className="font-semibold">
                          {source.name}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-neutral-500">
                          {
                            source.description
                          }
                        </p>
                      </div>

                      {source.available ? (
                        <div
                          className={`mt-1 h-5 w-5 rounded-full border ${
                            selected
                              ? "border-[6px] border-black"
                              : "border-neutral-300"
                          }`}
                        />
                      ) : (
                        <span className="whitespace-nowrap rounded-full bg-neutral-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                          Soon
                        </span>
                      )}

                    </div>
                  </button>
                );
              }
            )}

          </div>
        </section>


        {/* CONTINUE */}

        <div className="mt-8 flex items-center justify-between">

          <p className="text-sm text-neutral-500">
            You can change these settings
            before activating the integration.
          </p>

          <button
            type="button"
            disabled={!canContinue}
            onClick={continueSetup}
            className={`rounded-full px-6 py-3 text-sm font-medium transition ${
              canContinue
                ? "bg-black text-white hover:bg-neutral-800"
                : "cursor-not-allowed bg-neutral-200 text-neutral-400"
            }`}
          >
            Continue →
          </button>

        </div>
      </div>
    </main>
  );
}