"use client";

import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new ApolloClient({
        link: new HttpLink({ uri: "/api/graphql" }),
        // Step ids (1..7) repeat across releases, so steps must not be cached
        // as shared `Step:<id>` entities; keep them embedded in their release.
        cache: new InMemoryCache({
          typePolicies: { Step: { keyFields: false } },
        }),
      }),
  );
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
