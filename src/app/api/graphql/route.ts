import { yoga } from "@/graphql/yoga";

export async function GET(request: Request) {
  return yoga.fetch(request);
}

export async function POST(request: Request) {
  return yoga.fetch(request);
}

export async function OPTIONS(request: Request) {
  return yoga.fetch(request);
}
