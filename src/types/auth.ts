/**
 * Types representing authentication, users, sessions, and workspace projects
 * based on the database schema and frontend requirements.
 */

export interface User {
  id: string;
  email: string;
  plan: 'free' | 'paid';
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  projectId: string;
  prefix: string; // e.g., "cf_live_"
  createdAt: string;
}

export interface Session {
  user: User;
  activeProject: Project | null;
  projects: Project[];
  expiresAt: string;
}

export interface Token {
  accessToken: string;
  refreshToken: string;
  tokenType: string; // e.g., "Bearer"
  expiresIn: number; // in seconds
}
