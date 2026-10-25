"use client";

import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new ApolloClient({
        link: new HttpLink({ uri: "/api/graphql" }),
        cache: new InMemoryCache({
          typePolicies: {
            Step: { keyFields: false },
            Query: {
              fields: {
                releases: {
                  keyArgs: false, // all pages live under one cached list
                  merge(existing, incoming, { args }) {
                    const offset = args?.offset ?? 0;
                    // offset 0 = fresh load or refetch after create/delete: replace
                    const prev: unknown[] = existing?.items ?? [];
                    const items =
                      offset === 0 ? incoming.items : [...prev.slice(0, offset), ...incoming.items];
                    return { ...incoming, items };
                  },
                },
              },
            },
          },
        }),
      }),
  );
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
