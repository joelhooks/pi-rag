import type { CandidateSession, SessionDocument, SessionMessage } from "../core/types.js";
import type { SearchOptions, SessionProvider } from "../core/provider.js";
import { rerankCandidates } from "../core/rerank.js";

type QueryResult = { rows: any[] };
type LibSqlClient = { execute: (args: { sql: string; args?: any[] } | string) => Promise<QueryResult> };

export interface LibSqlProviderOptions {
  client: LibSqlClient;
  sessionsTable?: string;
  messagesTable?: string;
}

export class LibSqlSessionProvider implements SessionProvider {
  readonly name = "libsql";
  private sessionsTable: string;
  private messagesTable: string;
  constructor(private opts: LibSqlProviderOptions) {
    this.sessionsTable = opts.sessionsTable || "sessions";
    this.messagesTable = opts.messagesTable || "messages";
  }

  async search(query: string, options: SearchOptions = {}): Promise<CandidateSession[]> {
    const limit = Math.max(options.limit ?? 8, (options.limit ?? 8) * 4);
    const sql = `select s.id, s.title, s.source, s.created_at as createdAt, s.updated_at as updatedAt, group_concat(m.content, '\n') as content from ${this.sessionsTable} s left join ${this.messagesTable} m on m.session_id = s.id where s.title like ? or m.content like ? group by s.id order by coalesce(s.updated_at, s.created_at) desc limit ?`;
    const result = await this.opts.client.execute({ sql, args: [`%${query}%`, `%${query}%`, limit] });
    const candidates: CandidateSession[] = result.rows.map((r) => ({ id: String(r.id), title: r.title, createdAt: r.createdAt, updatedAt: r.updatedAt, highlights: [String(r.content || "").slice(0, 500)], trace: ["libsql provider"] }));
    return (options.rerank === false ? candidates : rerankCandidates(candidates, { query, projectHints: options.projectHints })).slice(0, options.limit ?? 8);
  }

  async get(id: string): Promise<SessionDocument> {
    const session = (await this.opts.client.execute({ sql: `select * from ${this.sessionsTable} where id = ? limit 1`, args: [id] })).rows[0];
    if (!session) throw new Error(`session not found: ${id}`);
    const rows = (await this.opts.client.execute({ sql: `select * from ${this.messagesTable} where session_id = ? order by coalesce(position, rowid) asc`, args: [id] })).rows;
    const messages: SessionMessage[] = rows.map((m, i) => ({ id: String(m.id ?? i), role: String(m.role ?? "custom"), content: String(m.content ?? m.text ?? ""), createdAt: m.created_at ?? m.createdAt, metadata: m }));
    return { id: String(session.id), title: session.title, source: session.source, createdAt: session.created_at ?? session.createdAt, updatedAt: session.updated_at ?? session.updatedAt, messages, metadata: session };
  }
}
