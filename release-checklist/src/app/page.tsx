import { Providers } from "@/components/apollo-provider";
import { ReleaseApp } from "@/components/release-app";

export default function Home() {
  return (
    <Providers>
      <ReleaseApp />
    </Providers>
  );
}
