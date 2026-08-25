import {
  SOURCES,
  SOURCE_METADATA,
  NoticeSource,
  SourceQuery,
  isNoticeSource,
  isValidSource,
  SourceMeta
} from 'tu-scraper';

export { SOURCES, SOURCE_METADATA, isNoticeSource, isValidSource };
export type { NoticeSource, SourceQuery, SourceMeta };

/**
 * All valid source keys in tu-scraper (iost, fohss, ioe, ac, iaas, iof, foe, fol)
 */
export const SUPPORTED_FACULTY_KEYS = SOURCES as readonly NoticeSource[];

/**
 * Normalizes user input into a valid SourceQuery (lowercases and trims)
 */
export function normalizeSourceInput(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Returns clean metadata for a faculty source, or null if invalid
 */
export function getFacultyMeta(sourceKey: string): SourceMeta | null {
  const normalized = normalizeSourceInput(sourceKey);
  if (isNoticeSource(normalized)) {
    return SOURCE_METADATA[normalized];
  }
  return null;
}

/**
 * Returns human-readable faculty name with code (e.g. "IOST — Institute of Science and Technology")
 */
export function formatFacultyName(sourceKey: string): string {
  const meta = getFacultyMeta(sourceKey);
  if (!meta) return sourceKey.toUpperCase();
  return `${meta.code} — ${meta.name}`;
}

/**
 * Returns proper brand color for faculty embed (in decimal for Discord)
 */
export function getFacultyColor(sourceKey?: string): number {
  switch (sourceKey?.toLowerCase()) {
    case 'iost':
      return 0x2563eb; // Blue
    case 'ioe':
      return 0xd97706; // Amber
    case 'ac':
      return 0x059669; // Emerald
    case 'fohss':
      return 0x9333ea; // Purple
    case 'iaas':
      return 0x16a34a; // Green
    case 'iof':
      return 0x0d9488; // Teal
    case 'foe':
      return 0xe11d48; // Rose
    case 'fol':
      return 0x4f46e5; // Indigo
    default:
      return 0x3b82f6; // TU Brand Blue
  }
}
