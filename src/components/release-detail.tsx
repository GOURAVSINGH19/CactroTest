"use client";

import { useMutation } from "@apollo/client/react";
import { useState } from "react";
import {
  DELETE_RELEASE,
  RELEASES,
  TOGGLE_STEP,
  UPDATE_RELEASE,
} from "@/lib/operations";
import type { ReleaseView } from "@/lib/types";
import { CheckIcon, TrashIcon } from "./icons";

// ISO (UTC) -> value for <input type="datetime-local"> in the browser's timezone.
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export function ReleaseDetail({
  release,
  onBack,
}: {
  release: ReleaseView;
  onBack: () => void;
}) {
  const [name, setName] = useState(release.name);
  const [dueDate, setDueDate] = useState(toLocalInput(release.dueDate));
  const [info, setInfo] = useState(release.additionalInfo ?? "");
  const [toggle] = useMutation(TOGGLE_STEP);
  const [save, { loading: saving, error: saveError }] = useMutation(UPDATE_RELEASE);
  const [remove, { loading: deleting }] = useMutation(DELETE_RELEASE, {
    refetchQueries: [RELEASES],
  });

  const dirty =
    name !== release.name ||
    dueDate !== toLocalInput(release.dueDate) ||
    info !== (release.additionalInfo ?? "");
  const valid = name.trim() !== "" && dueDate !== "";

  async function onDelete() {
    if (!confirm(`Delete "${release.name}"?`)) return;
    await remove({ variables: { id: release.id } });
    onBack();
  }

  async function onSave() {
    try {
      await save({
        variables: {
          id: release.id,
          name,
          dueDate: new Date(dueDate).toISOString(),
          additionalInfo: info,
        },
        refetchQueries: [RELEASES],
      });
    } catch {
      // surfaced through saveError
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <button className="crumb" onClick={onBack}>
            All releases
          </button>
          <span className="sep">&gt;</span>
          <span className="crumb current">{release.name}</span>
        </nav>
        <button className="btn" disabled={deleting} onClick={onDelete}>
          Delete <TrashIcon />
        </button>
      </div>

      <div className="panel-body">
        <div className="fields">
          <label>
            Release
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Date
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </label>
          <span className={`status ${release.status}`}>{release.status}</span>
        </div>

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
                      // Tick instantly; the server response then confirms it.
                      optimisticResponse: {
                        toggleStep: {
                          ...release,
                          steps: release.steps.map((x) =>
                            x.id === s.id ? { ...x, completed: e.target.checked } : x,
                          ),
                        },
                      },
                    })
                  }
                />
                {s.label}
              </label>
            </li>
          ))}
        </ul>

        <label className="block">
          Additional remarks / tasks
          <textarea
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder="Please enter any other important notes for the release"
            rows={6}
          />
        </label>
        {saveError && <p className="error">{saveError.message}</p>}
        <div className="footer">
          <button className="btn" disabled={!dirty || !valid || saving} onClick={onSave}>
            {saving ? "Saving…" : "Save"} <CheckIcon />
          </button>
        </div>
      </div>
    </section>
  );
}
