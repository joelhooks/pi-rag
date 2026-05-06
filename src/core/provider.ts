import type { CandidateSession, SessionDocument } from "./types.js";

export interface SearchOptions {
  limit?: number;
  filterBy?: string;
  sortBy?: string;
  preset?: string;
  projectHints?: string[];
  rerank?: boolean;
  corpusTree?: boolean;
}

export interface SessionProvider {
  readonly name: string;
  search(query: string, options?: SearchOptions): Promise<CandidateSession[]>;
  get(id: string): Promise<SessionDocument>;
}

export interface ProviderFactoryContext {
  env: Record<string, string | undefined>;
  fetch?: typeof fetch;
}

export type ProviderFactory = (ctx: ProviderFactoryContext) => SessionProvider;

const factories = new Map<string, ProviderFactory>();

export function registerProvider(name: string, factory: ProviderFactory): void {
  factories.set(name, factory);
}

export function listProviders(): string[] {
  return [...factories.keys()].sort();
}

export function createProvider(name = process.env.PI_RAG_PROVIDER || "typesense", ctx: ProviderFactoryContext = { env: process.env }): SessionProvider {
  const factory = factories.get(name);
  if (!factory) throw new Error(`Unknown pi-rag provider '${name}'. Available: ${listProviders().join(", ") || "none"}`);
  return factory(ctx);
}
