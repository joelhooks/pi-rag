const factories = new Map();
export function registerProvider(name, factory) {
    factories.set(name, factory);
}
export function listProviders() {
    return [...factories.keys()].sort();
}
export function createProvider(name = process.env.PI_RAG_PROVIDER || "typesense", ctx = { env: process.env }) {
    const factory = factories.get(name);
    if (!factory)
        throw new Error(`Unknown pi-rag provider '${name}'. Available: ${listProviders().join(", ") || "none"}`);
    return factory(ctx);
}
