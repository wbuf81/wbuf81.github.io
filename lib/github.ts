// GitHub API utilities for client-side commits

const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubFileResponse {
  sha: string;
  content: string;
  encoding: string;
}

interface GitHubUserResponse {
  login: string;
  name: string;
}

export async function validateToken(token: string): Promise<{ valid: boolean; user?: string }> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.ok) {
      const data: GitHubUserResponse = await response.json();
      return { valid: true, user: data.login };
    }

    return { valid: false };
  } catch {
    return { valid: false };
  }
}

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data: GitHubFileResponse = await response.json();
    const content = atob(data.content);
    return { content, sha: data.sha };
  } catch (error) {
    console.error('Error fetching file from GitHub:', error);
    throw error;
  }
}

export async function commitFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<boolean> {
  try {
    const body: {
      message: string;
      content: string;
      sha?: string;
    } = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('GitHub commit error:', error);
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error committing to GitHub:', error);
    throw error;
  }
}

// Helper to extract owner and repo from various GitHub URL formats or env vars
export function getRepoInfo(): { owner: string; repo: string } | null {
  // These would typically come from environment variables or be hardcoded
  // For this implementation, we'll use the repo name from the project
  // You should update these values or use environment variables
  const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER || '';
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO || '';

  if (!owner || !repo) {
    return null;
  }

  return { owner, repo };
}
