export interface ReleaseEntry {
  version: string;
  date: string;
  changes: string[];
}

const HEADING_PATTERN = /^##\s+(\d+\.\d+\.\d+)\s+—\s+(\d{2}\.\d{2}\.\d{4})$/;

export const parseReleaseHistory = (markdown: string): ReleaseEntry[] => {
  const releases: ReleaseEntry[] = [];
  let current: ReleaseEntry | null = null;

  markdown.split(/\r?\n/).forEach(line => {
    const heading = HEADING_PATTERN.exec(line);
    if (heading) {
      current = { version: heading[1], date: heading[2], changes: [] };
      releases.push(current);
      return;
    }

    if (current && line.startsWith('- ')) {
      current.changes.push(line.slice(2).trim());
    }
  });

  return releases;
};
