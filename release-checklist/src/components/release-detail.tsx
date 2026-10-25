"use client";

import { useMutation } from "@apollo/client/react";
import { useState } from "react";
import {
  DELETE_RELEASE,
  RELEASES,
  TOGGLE_STEP,
  UPDATE_INFO,
} from "@/lib/operations";
import type { ReleaseView } from "@/lib/types";

export function ReleaseDetail({
  release,
  onDeleted,
}: {
  release: ReleaseView;
  onDeleted: () => void;
}) {
  const [info, setInfo] = useState(release.additionalInfo ?? "");
  const [toggle] = useMutation(TOGGLE_STEP);
  const [saveInfo, { loading: saving, error: saveError }] = useMutation(UPDATE_INFO);
  const [remove, { loading: deleting }] = useMutation(DELETE_RELEASE, {
    refetchQueries: [RELEASES],
  });

  const dirty = info !== (release.additionalInfo ?? "");

  async function onDelete() {
    if (!confirm(`Delete "${release.name}"?`)) return;
    await remove({ variables: { id: release.id } });
    onDeleted();
  }

  return (
    <section className="card">
      <header className="detail-head">
        <div>
          <h2>{release.name}</h2>
          <small>{new Date(release.dueDate).toLocaleString()}</small>
        </div>
        <span className={`badge ${release.status}`}>{release.status}</span>
      </header>

      <ul className="steps">
        {release.steps.map((s) => (
          <li key={s.id}>
            <label>
              <input
                type="checkbox"
                checked={s.completed}
                onChange={(e) =>
                  toggle({
                    variables: {
                      releaseId: release.id,
                      stepId: s.id,
                      completed: e.target.checked,
                    },
                  })
                }
              />
              {s.label}
            </label>
          </li>
        ))}
      </ul>

      <label>
        Additional info
        <textarea value={info} onChange={(e) => setInfo(e.target.value)} rows={4} />
      </label>
      {saveError && <p className="error">{saveError.message}</p>}
      <div className="actions">
        <button
          disabled={!dirty || saving}
          onClick={() =>
            saveInfo({ variables: { releaseId: release.id, additionalInfo: info } })
          }
        >
          {saving ? "Saving…" : "Save info"}
        </button>
        <button className="danger" disabled={deleting} onClick={onDelete}>
          Delete release
        </button>
      </div>
    </section>
  );
}
