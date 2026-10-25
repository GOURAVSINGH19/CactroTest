"use client";

import { useQuery } from "@apollo/client/react";
import { useState } from "react";
import { RELEASES } from "@/lib/operations";
import type { ReleaseView } from "@/lib/types";
import { ReleaseDetail } from "./release-detail";
import { ReleaseForm } from "./release-form";
import { ReleaseList } from "./release-list";

const PAGE_SIZE = 20;

type View = { name: "list" } | { name: "new" } | { name: "detail"; id: string };
type Page = { items: ReleaseView[]; total: number; hasMore: boolean };

export function ReleaseApp() {
  const { data, loading, error, fetchMore } = useQuery<{ releases: Page }>(RELEASES, {
    variables: { limit: PAGE_SIZE, offset: 0 },
  });
  const [view, setView] = useState<View>({ name: "list" });
  const [loadingMore, setLoadingMore] = useState(false);

  const releases = data?.releases.items ?? [];
  const toList = () => setView({ name: "list" });
  const selected =
    view.name === "detail" ? releases.find((r) => r.id === view.id) : undefined;

  async function loadMore() {
    setLoadingMore(true);
    try {
      await fetchMore({ variables: { limit: PAGE_SIZE, offset: releases.length } });
    } finally {
      setLoadingMore(false);
    }
  }

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
          total={data?.releases.total ?? 0}
          hasMore={data?.releases.hasMore ?? false}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          loading={loading}
          error={error?.message}
          onView={(id) => setView({ name: "detail", id })}
          onNew={() => setView({ name: "new" })}
        />
      )}
    </main>
  );
}
