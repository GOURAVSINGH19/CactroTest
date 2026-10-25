"use client";

import { useMutation } from "@apollo/client/react";
import { useState, type FormEvent } from "react";
import { CREATE_RELEASE, RELEASES } from "@/lib/operations";
import type { ReleaseView } from "@/lib/types";

export function ReleaseForm({ onCreated }: { onCreated: (id: string) => void }) {
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
    if (res.data) {
      onCreated(res.data.createRelease.id);
      setName("");
      setDueDate("");
      setInfo("");
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>New release</h2>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Due date
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
        />
      </label>
      <label>
        Additional info (optional)
        <textarea value={info} onChange={(e) => setInfo(e.target.value)} rows={3} />
      </label>
      {error && <p className="error">{error.message}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create release"}
      </button>
    </form>
  );
}
