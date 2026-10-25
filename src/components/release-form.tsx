"use client";

import { useMutation } from "@apollo/client/react";
import { useState, type FormEvent } from "react";
import { CREATE_RELEASE, RELEASES } from "@/lib/operations";
import type { ReleaseView } from "@/lib/types";
import { CheckIcon } from "./icons";

export function ReleaseForm({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [info, setInfo] = useState("");
  const [create, { loading, error }] = useMutation<{ createRelease: ReleaseView }>(
    CREATE_RELEASE,
    { refetchQueries: [RELEASES] },
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await create({
      variables: {
        name,
        dueDate: new Date(dueDate).toISOString(),
        additionalInfo: info || null,
      },
    });
    if (res.data) onCreated(res.data.createRelease.id);
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="panel-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <button type="button" className="crumb" onClick={onBack}>
            All releases
          </button>
          <span className="sep">&gt;</span>
          <span className="crumb current">New release</span>
        </nav>
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
        </div>

        <label className="block">
          Additional remarks / tasks
          <textarea
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder="Please enter any other important notes for the release"
            rows={6}
          />
        </label>
        {error && <p className="error">{error.message}</p>}
        <div className="footer">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create"} <CheckIcon />
          </button>
        </div>
      </div>
    </form>
  );
}
