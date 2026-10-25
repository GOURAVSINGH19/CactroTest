"use client";

import { useMutation } from "@apollo/client/react";
import { DELETE_RELEASE, RELEASES } from "@/lib/operations";
import type { ReleaseView } from "@/lib/types";
import { EyeIcon, PlusCircleIcon, TrashIcon } from "./icons";

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export function ReleaseList({
  releases,
  loading,
  error,
  onView,
  onNew,
}: {
  releases: ReleaseView[];
  loading: boolean;
  error?: string;
  onView: (id: string) => void;
  onNew: () => void;
}) {
  const [remove, { loading: deleting }] = useMutation(DELETE_RELEASE, {
    refetchQueries: [RELEASES],
  });

  async function onDelete(r: ReleaseView) {
    if (!confirm(`Delete "${r.name}"?`)) return;
    await remove({ variables: { id: r.id } });
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="crumb current">All releases</span>
        <button className="btn" onClick={onNew}>
          New release <PlusCircleIcon />
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Release</th>
              <th>Date</th>
              <th>Status</th>
              <th colSpan={2} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {releases.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{formatDate(r.dueDate)}</td>
                <td className={`status ${r.status}`}>{r.status}</td>
                <td className="action">
                  <button className="link" onClick={() => onView(r.id)}>
                    View <EyeIcon />
                  </button>
                </td>
                <td className="action">
                  <button
                    className="link"
                    disabled={deleting}
                    onClick={() => onDelete(r)}
                  >
                    Delete <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !error && releases.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No releases yet. Create your first one.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5} className="empty">
                  Loading…
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="empty error">
                  {error}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
