

interface GitHubStats {
  stars: number;
  forks: number;
  language: string;
  lastUpdated: Date;
  description: string;
}

export async function fetchGitHubStats(url: string): Promise<GitHubStats | null> {
  const { owner, repo } = parseGitHubUrl(url);
  
  if (!owner || !repo) {
    console.error('Invalid GitHub URL');
    return null;
  }

  try {
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
    };
    
    // Check if process is running in an environment where process.env is defined
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      next: { revalidate: 3600 } // Revalidate every hour
    });

    if (!response.ok) {
       // If Rate limit exceeded or repo not found, return null or handle appropriately
       console.warn(`GitHub API request failed: ${response.status} ${response.statusText}`);
       return null; 
    }

    const data = await response.json();

    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language || 'Unknown',
      lastUpdated: new Date(data.updated_at),
      description: data.description
    };
  } catch (error) {
    console.error('Error fetching GitHub stats:', error);
    return null;
  }
}

export function parseGitHubUrl(url: string): { owner: string | null; repo: string | null } {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const isGitHubHost = ['github.com', 'www.github.com'].includes(urlObj.hostname.toLowerCase());
    const validParts = pathParts.length === 2 && pathParts.every((part) => /^[a-z\d](?:[a-z\d_.-]{0,99})$/i.test(part));

    if (isGitHubHost && validParts) {
      return { owner: pathParts[0], repo: pathParts[1] };
    }
    return { owner: null, repo: null };
  } catch {
     // Fallback for non-standard URLs or if just "owner/repo" string provided
     const parts = url.split('/').map((part) => part.trim());
     if (parts.length === 2 && parts.every((part) => /^[a-z\d](?:[a-z\d_.-]{0,99})$/i.test(part))) {
         return { owner: parts[0].trim(), repo: parts[1].trim() };
     }
    return { owner: null, repo: null };
  }
}
