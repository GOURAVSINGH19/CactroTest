"use client";

import { useQuery } from "@apollo/client/react";
import { useState } from "react";
import { RELEASES } from "@/lib/operations";
import type { ReleaseView } from "@/lib/types";
import { ReleaseDetail } from "./release-detail";
import { ReleaseForm } from "./release-form";
import { ReleaseList } from "./release-list";

export function ReleaseApp() {
  const { data, loading, error } = useQuery<{ releases: ReleaseView[] }>(RELEASES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const releases = data?.releases ?? [];
  const selected = releases.find((r) => r.id === selectedId) ?? null;

  return (
    <main className="container">
      <h1>Release Checklist</h1>
      <div className="layout">
        <div className="col">
          <ReleaseForm onCreated={setSelectedId} />
          <div className="card">
            <h2>Releases</h2>
            {loading && <p className="muted">Loading…</p>}
            {error && <p className="error">{error.message}</p>}
            <ReleaseList
              releases={releases}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>
        <div className="col">
          {selected ? (
            <ReleaseDetail
              key={selected.id}
              release={selected}
              onDeleted={() => setSelectedId(null)}
            />
          ) : (
            <div className="card muted">Select a release to see its steps.</div>
          )}
        </div>
      </div>
    </main>
  );
}
