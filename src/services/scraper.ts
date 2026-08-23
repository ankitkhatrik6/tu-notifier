import {
  getNotices,
  getLatest,
  searchNotices,
  getNoticeDetail,
  Notice,
  NoticeDetail,
  SourceQuery,
  NoticeSource,
  ScrapeOptions,
  TuScrapperError,
  InvalidSourceError,
  NetworkError,
  TimeoutError,
  ParseError,
  SOURCES,
  SOURCE_METADATA,
  isNoticeSource,
  isValidSource,
} from 'tu-scraper';

export {
  TuScrapperError,
  InvalidSourceError,
  NetworkError,
  TimeoutError,
  ParseError,
  SOURCES,
  SOURCE_METADATA,
  isNoticeSource,
  isValidSource,
};

export class ScraperService {
  /**
   * Fetches notices list for a specific source or 'all'
   */
  async getNotices(source: SourceQuery, options?: ScrapeOptions): Promise<Notice[]> {
    return await getNotices(source, { timeout: 15000, ...options });
  }

  /**
   * Fetches the latest notice from a source or all
   */
  async getLatest(source: SourceQuery, options?: ScrapeOptions): Promise<Notice | NoticeDetail | null> {
    return await getLatest(source, { timeout: 15000, ...options });
  }

  /**
   * Searches notices by title keyword across a faculty or all
   */
  async searchNotices(query: string, source: SourceQuery = 'all', options?: ScrapeOptions): Promise<Notice[]> {
    return await searchNotices(query, source, { timeout: 15000, ...options });
  }

  /**
   * Looks up a notice by exact ID within a source
   * Tries getNoticeDetail directly, with fallback to getNotices list search
   */
  async getNoticeById(source: NoticeSource, noticeId: string): Promise<Notice | NoticeDetail | null> {
    try {
      // Attempt deep detail extraction first
      const detail = await getNoticeDetail(noticeId, source, { timeout: 15000 });
      if (detail && detail.id === noticeId) {
        return detail;
      }
    } catch {
      // Fallback to getNotices list match
    }

    try {
      const list = await this.getNotices(source, { timeout: 15000 });
      const found = list.find((n) => n.id === noticeId || n.id.includes(noticeId));
      return found || null;
    } catch (err) {
      console.warn(`[ScraperService] Error searching notice ID ${noticeId} in ${source}:`, err);
      return null;
    }
  }
}

export const scraperService = new ScraperService();
