"use client";

import { useQuery } from "@apollo/client/react";
import { useState } from "react";
import { RELEASES } from "@/lib/operations";
import type { ReleaseView } from "@/lib/types";
import { ReleaseDetail } from "./release-detail";
import { ReleaseForm } from "./release-form";
import { ReleaseList } from "./release-list";

type View = { name: "list" } | { name: "new" } | { name: "detail"; id: string };

export function ReleaseApp() {
  const { data, loading, error } = useQuery<{ releases: ReleaseView[] }>(RELEASES);
  const [view, setView] = useState<View>({ name: "list" });

  const releases = data?.releases ?? [];
  const toList = () => setView({ name: "list" });
  const selected =
    view.name === "detail" ? releases.find((r) => r.id === view.id) : undefined;

  return (
    <main className="container">
      <header className="hero">
        <h1>ReleaseCheck</h1>
        <p>Your all-in-one release checklist tool</p>
      </header>

      {view.name === "new" && (
        <ReleaseForm
          onBack={toList}
          onCreated={(id) => setView({ name: "detail", id })}
        />
      )}
      {view.name === "detail" && selected && (
        <ReleaseDetail key={selected.id} release={selected} onBack={toList} />
      )}
      {(view.name === "list" || (view.name === "detail" && !selected)) && (
        <ReleaseList
          releases={releases}
          loading={loading}
          error={error?.message}
          onView={(id) => setView({ name: "detail", id })}
          onNew={() => setView({ name: "new" })}
        />
      )}
    </main>
  );
}
