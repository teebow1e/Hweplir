import axios, { AxiosError, AxiosInstance } from 'axios';
import { config } from '../config/env';
import logger from '../utils/logger';

export type RepoPermission = 'pull' | 'push' | 'triage' | 'maintain' | 'admin';

export type InviteResult =
  | { kind: 'invited'; invitationId: number; htmlUrl?: string }
  | { kind: 'already_collaborator' }
  | { kind: 'failed'; status: number; message: string };

class GitHubService {
  private readonly api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${config.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Hweplir-Discord-Bot',
      },
      timeout: 10_000,
    });
  }

  async inviteCollaborator(
    username: string,
    permission: RepoPermission = 'push'
  ): Promise<InviteResult> {
    const owner = config.GH_INVITE_REPO_OWNER;
    const repo = config.GH_INVITE_REPO_NAME;
    const path = `/repos/${owner}/${repo}/collaborators/${encodeURIComponent(username)}`;

    try {
      const res = await this.api.put(path, { permission });

      if (res.status === 204) {
        return { kind: 'already_collaborator' };
      }

      if (res.status === 201 && res.data?.id) {
        return {
          kind: 'invited',
          invitationId: res.data.id,
          htmlUrl: res.data.html_url,
        };
      }

      return {
        kind: 'failed',
        status: res.status,
        message: `Unexpected response: ${res.status}`,
      };
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status ?? 0;
      const message = err.response?.data?.message ?? err.message ?? 'Unknown error';
      logger.error(`GitHub inviteCollaborator failed for ${username}: ${status} ${message}`);
      return { kind: 'failed', status, message };
    }
  }
}

export default new GitHubService();
