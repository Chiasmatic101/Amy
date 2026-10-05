"use client";

import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useState } from "react";

type ConnectionStatus =
  | "idle"
  | "testing"
  | "success"
  | "error";

export default function FirestoreSetupPage() {
  const searchParams =
    useSearchParams();

    const router =
    useRouter();

  const gameName =
    searchParams.get("gameName") ??
    "New Game";

  const developerName =
    searchParams.get("developerName") ??
    "";

  const platform =
    searchParams.get("platform") ??
    "android";

  const [projectId, setProjectId] =
    useState("");

  const [status, setStatus] =
    useState<ConnectionStatus>("idle");

  const [statusMessage, setStatusMessage] =
    useState("");

  /*
   * Eventually we can retrieve this from an
   * AMY configuration endpoint.
   *
   * For now this uses the server-configured
   * public connector identity.
   */
  const serviceAccountEmail =
    process.env
      .NEXT_PUBLIC_AMY_FIRESTORE_CONNECTOR_SERVICE_ACCOUNT_EMAIL ??
    "AMY connector service account not configured";

  async function testConnection() {
  const cleanProjectId =
    projectId.trim();

  if (!cleanProjectId) {
    return;
  }

  setStatus("testing");

  setStatusMessage(
    "AMY is checking read-only access to your Firestore project..."
  );

  try {
    const response =
      await fetch(
        "/api/onboarding/firestore/test",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            projectId:
              cleanProjectId,
          }),
        }
      );

    const result =
      await response.json();


    if (
      !response.ok ||
      !result.success
    ) {
      setStatus("error");

      setStatusMessage(
        result.error ??
          "AMY could not connect to this Firestore project."
      );

      return;
    }


    setStatus("success");

    setStatusMessage(
      "Connection successful. AMY has read-only access to this Firestore project."
    );

  } catch (error) {
    console.error(
      "Firestore connection test failed:",
      error
    );

    setStatus("error");

    setStatusMessage(
      "AMY could not complete the connection test. Please try again."
    );
  }
}


function continueToConfiguration() {
  if (
    status !== "success" ||
    !projectId.trim()
  ) {
    return;
  }

  const params =
    new URLSearchParams({
      gameName,
      developerName,
      platform,
      provider: "firestore",
      projectId: projectId.trim(),
    });

  router.push(
    `/dashboard/games/new/firestore/configure?${params.toString()}`
  );
}



  function copyServiceAccount() {
    if (
      serviceAccountEmail.startsWith(
        "AMY connector"
      )
    ) {
      return;
    }

    navigator.clipboard.writeText(
      serviceAccountEmail
    );
  }

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
            Connect Firestore
          </h1>

          <p className="mt-4 text-base leading-7 text-neutral-600">
            Give AMY read-only access to your
            game's Firestore telemetry. You
            remain in control of the source
            database and can revoke access at
            any time.
          </p>
        </div>


        {/* PROGRESS */}

        <div className="mt-10 flex items-center gap-3 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black font-medium text-white">
            1
          </div>

          <span className="font-medium">
            Connect
          </span>

          <div className="h-px w-10 bg-neutral-300" />

          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-500">
            2
          </div>

          <span className="text-neutral-500">
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


        {/* GAME SUMMARY */}

        <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-3">

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

          </div>
        </section>


        {/* STEP 1 */}

        <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-8">

          <div className="flex gap-5">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
              1
            </div>

            <div className="flex-1">

              <h2 className="text-xl font-semibold">
                Grant AMY read-only access
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                In Google Cloud IAM, add the
                following AMY service account
                to the project containing your
                Firestore telemetry.
              </p>


              <div className="mt-6 rounded-2xl bg-neutral-50 p-5">

                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  AMY service account
                </p>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">

                  <code className="flex-1 break-all rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm">
                    {serviceAccountEmail}
                  </code>

                  <button
                    type="button"
                    onClick={
                      copyServiceAccount
                    }
                    className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium transition hover:bg-neutral-50"
                  >
                    Copy
                  </button>

                </div>
              </div>


              <div className="mt-6">

                <p className="text-sm font-medium">
                  Assign this role:
                </p>

                <div className="mt-3 rounded-2xl border border-neutral-200 p-5">

                  <p className="font-semibold">
                    Cloud Datastore Viewer
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Read-only access to
                    Firestore data.
                  </p>

                  <code className="mt-3 inline-block rounded-lg bg-neutral-100 px-3 py-2 text-xs">
                    roles/datastore.viewer
                  </code>

                </div>
              </div>


              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">

                <p className="text-sm font-semibold text-blue-900">
                  AMY does not need your
                  service-account private key.
                </p>

                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Access is granted to AMY's
                  connector identity through
                  Google Cloud IAM. You can
                  remove that permission from
                  your project at any time.
                </p>

              </div>

            </div>
          </div>
        </section>


        {/* STEP 2 */}

        <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-8">

          <div className="flex gap-5">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
              2
            </div>

            <div className="flex-1">

              <h2 className="text-xl font-semibold">
                Enter your project ID
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                Enter the Google Cloud project
                ID containing the Firestore
                database you want AMY to read.
              </p>


              <label className="mt-6 block max-w-xl">

                <span className="mb-2 block text-sm font-medium">
                  Google Cloud / Firebase
                  Project ID
                </span>

                <input
                  value={projectId}
                  onChange={(event) => {
                    setProjectId(
                      event.target.value
                    );

                    setStatus("idle");
                    setStatusMessage("");
                  }}
                  placeholder="example-game-production"
                  autoComplete="off"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none transition focus:border-black"
                />

                <p className="mt-2 text-xs text-neutral-400">
                  This is the project ID, not
                  the numeric project number.
                </p>

              </label>

            </div>
          </div>
        </section>


        {/* STEP 3 */}

        <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-8">

          <div className="flex gap-5">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
              3
            </div>

            <div className="flex-1">

              <h2 className="text-xl font-semibold">
                Test the connection
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                AMY will attempt a read-only
                connection to your Firestore
                project to confirm that the IAM
                permission is configured
                correctly.
              </p>


              <button
                type="button"
                disabled={
                  !projectId.trim() ||
                  status === "testing"
                }
                onClick={testConnection}
                className={`mt-6 rounded-full px-6 py-3 text-sm font-medium transition ${
                  projectId.trim() &&
                  status !== "testing"
                    ? "bg-black text-white hover:bg-neutral-800"
                    : "cursor-not-allowed bg-neutral-200 text-neutral-400"
                }`}
              >
                {status === "testing"
                  ? "Testing..."
                  : "Test Connection"}
              </button>


              {statusMessage && (
                <p className="mt-4 text-sm text-neutral-600">
                  {statusMessage}
                </p>
              )}

            </div>
          </div>
        </section>


        {/* NEXT */}

        <div className="mt-8 flex items-center justify-between">

          <p className="text-sm text-neutral-500">
            AMY will not import any telemetry
            until the integration is activated.
          </p>

         <button
  type="button"
  onClick={continueToConfiguration}
  disabled={
    status !== "success"
  }
  className={`rounded-full px-6 py-3 text-sm font-medium ${
    status === "success"
      ? "bg-black text-white"
      : "cursor-not-allowed bg-neutral-200 text-neutral-400"
  }`}
>
  Configure telemetry →
</button>

        </div>

      </div>
    </main>
  );
}