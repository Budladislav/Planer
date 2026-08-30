export interface ReleaseSection {
  title: string;
  changes: string[];
}

export interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  sections: ReleaseSection[];
}

const CANONICAL_HEADING_PATTERN = /^##\s+\[(\d+\.\d+\.\d+)\]\s+—\s+(\d{2}\.\d{2}\.\d{4})\s+—\s+(.+)$/;
const LEGACY_HEADING_PATTERN = /^##\s+(\d+\.\d+\.\d+)\s+—\s+(\d{2}\.\d{2}\.\d{4})$/;
const SECTION_PATTERN = /^###\s+(.+)$/;

export const parseReleaseHistory = (markdown: string): ReleaseEntry[] => {
  const releases: ReleaseEntry[] = [];
  let current: ReleaseEntry | null = null;
  let currentSection: ReleaseSection | null = null;

  markdown.split(/\r?\n/).forEach(line => {
    const canonicalHeading = CANONICAL_HEADING_PATTERN.exec(line);
    if (canonicalHeading) {
      current = {
        version: canonicalHeading[1],
        date: canonicalHeading[2],
        title: canonicalHeading[3].trim(),
        sections: [],
      };
      releases.push(current);
      currentSection = null;
      return;
    }

    const legacyHeading = LEGACY_HEADING_PATTERN.exec(line);
    if (legacyHeading) {
      current = {
        version: legacyHeading[1],
        date: legacyHeading[2],
        title: '',
        sections: [],
      };
      releases.push(current);
      currentSection = null;
      return;
    }

    const section = SECTION_PATTERN.exec(line);
    if (current && section) {
      currentSection = { title: section[1].trim(), changes: [] };
      current.sections.push(currentSection);
      return;
    }

    if (current && line.startsWith('- ')) {
      if (!currentSection) {
        currentSection = { title: 'Изменения', changes: [] };
        current.sections.push(currentSection);
      }
      currentSection.changes.push(line.slice(2).trim());
    }
  });

  return releases;
};
