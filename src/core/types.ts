export type Role = "system" | "user" | "assistant" | "tool" | "custom" | string;

export interface SessionMessage {
  id: string;
  role: Role;
  content: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionDocument {
  id: string;
  title?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  messages: SessionMessage[];
  metadata?: Record<string, unknown>;
}

export interface RagNode {
  id: string;
  title: string;
  summary: string;
  start: number;
  end: number;
  roleMix: Record<string, number>;
  children?: RagNode[];
  trace: string[];
}

export interface SessionStructure {
  sessionId: string;
  generatedAt: string;
  messageCount: number;
  root: RagNode;
  trace: string[];
}

export interface ContentSlice {
  sessionId: string;
  nodeId?: string;
  start: number;
  end: number;
  messages: SessionMessage[];
  trace: string[];
}

export interface CandidateSession {
  id: string;
  title?: string;
  score?: number;
  highlights?: string[];
  createdAt?: string;
  updatedAt?: string;
  trace: string[];
}
