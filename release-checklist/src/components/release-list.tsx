"use client";

import type { ReleaseView } from "@/lib/types";

export function ReleaseList({
  releases,
  selectedId,
  onSelect,
}: {
  releases: ReleaseView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (releases.length === 0) return <p className="muted">No releases yet.</p>;
  return (
    <ul className="list">
      {releases.map((r) => {
        const done = r.steps.filter((s) => s.completed).length;
        return (
          <li key={r.id}>
            <button
              className={`row ${r.id === selectedId ? "selected" : ""}`}
              onClick={() => onSelect(r.id)}
            >
              <span className="row-main">
                <strong>{r.name}</strong>
                <small>{new Date(r.dueDate).toLocaleString()}</small>
              </span>
              <span className="row-side">
                <span className={`badge ${r.status}`}>{r.status}</span>
                <small>
                  {done}/{r.steps.length}
                </small>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
