import { spawn } from "node:child_process";
export class HeuristicSummarizer {
    async summarizeNode(messages, node) {
        const text = messages.map((m) => m.content).join("\n");
        const words = text.toLowerCase().replace(/[^a-z0-9_\-\s]/g, " ").split(/\s+/).filter((w) => w.length > 4);
        const counts = new Map();
        for (const w of words)
            counts.set(w, (counts.get(w) || 0) + 1);
        const keywords = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w);
        return { title: node.title, summary: node.summary, keywords, confidence: 0.45, trace: ["heuristic summarizer; no LLM used"] };
    }
}
export class PiCliSummarizer {
    command;
    constructor(command = process.env.PI_RAG_PI_COMMAND || "pi") {
        this.command = command;
    }
    async summarizeNode(messages, node, doc) {
        const transcript = messages.map((m, i) => `[${node.start + i}] ${m.role}: ${m.content}`).join("\n").slice(0, 16000);
        const prompt = `Summarize this bounded agent-session node as strict JSON. Do not call external APIs directly; you are running through pi.\nSession: ${doc.title || doc.id}\nNode: ${node.id} range ${node.start}-${node.end}\nReturn: {"title":string,"summary":string,"keywords":string[],"confidence":number,"trace":string[]}\nTranscript:\n${transcript}`;
        const out = await runPi(this.command, prompt);
        const json = extractJson(out);
        return { title: String(json.title || node.title), summary: String(json.summary || node.summary), keywords: Array.isArray(json.keywords) ? json.keywords.map(String) : [], confidence: Number(json.confidence ?? 0.6), trace: Array.isArray(json.trace) ? json.trace.map(String) : ["summarized via pi CLI"] };
    }
}
function runPi(command, prompt) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, ["-p", "--no-session", "--no-extensions", prompt], { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "", stderr = "";
        child.stdout.on("data", (d) => stdout += d);
        child.stderr.on("data", (d) => stderr += d);
        child.on("error", reject);
        child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(`pi exited ${code}: ${stderr.slice(0, 2000)}`)));
    });
}
function extractJson(text) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    const src = fenced || text;
    const start = src.indexOf("{");
    const end = src.lastIndexOf("}");
    if (start < 0 || end < start)
        throw new Error(`no JSON object in pi output: ${text.slice(0, 500)}`);
    return JSON.parse(src.slice(start, end + 1));
}
