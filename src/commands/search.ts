import { Message } from 'discord.js';
import { scraperService } from '../services/scraper';
import { createSearchEmbed, createNoticeEmbed, createErrorEmbed, createWarningEmbed } from '../utils/embeds';
import {
  isValidSource,
  isNoticeSource,
  normalizeSourceInput,
  SourceQuery,
  NoticeSource
} from '../utils/faculties';

export async function handleSearchCommand(message: Message, args: string[]): Promise<void> {
  if (args.length === 0) {
    await message.reply({
      embeds: [
        createWarningEmbed(
          'Missing Search Query',
          `Please provide a keyword or notice ID to search for.\n\n` +
          `**Usage Examples:**\n` +
          `• \`!tu search exam\` — Search across all faculties\n` +
          `• \`!tu search iost exam\` — Search within IOST\n` +
          `• \`!tu search ioe 14417\` — Look up notice by ID in IOE`
        ),
      ],
    });
    return;
  }

  let source: SourceQuery = 'all';
  let queryTerms: string[] = [];

  const firstArgNormalized = normalizeSourceInput(args[0]);

  if (isValidSource(firstArgNormalized)) {
    source = firstArgNormalized as SourceQuery;
    queryTerms = args.slice(1);
    if (queryTerms.length === 0) {
      await message.reply({
        embeds: [
          createWarningEmbed(
            'Missing Search Keyword',
            `You specified faculty **${args[0].toUpperCase()}**, but didn't provide any keyword or notice ID.\n\n` +
            `**Example:** \`!tu search ${args[0]} exam\` or \`!tu search ${args[0]} 12345\``
          ),
        ],
      });
      return;
    }
  } else {
    // No specific faculty specified, search all
    queryTerms = args;
    source = 'all';
  }

  const query = queryTerms.join(' ').trim();

  // Send typing indicator
  if ('sendTyping' in message.channel && typeof message.channel.sendTyping === 'function') {
    message.channel.sendTyping().catch(() => {});
  }

  try {
    // Check if searching by numeric notice ID in a specific source
    const isNumericId = /^\d+$/.test(query);
    if (isNumericId && source !== 'all' && isNoticeSource(source as string)) {
      const notice = await scraperService.getNoticeById(source as NoticeSource, query);
      if (notice) {
        const payload = createNoticeEmbed(notice, {
          titlePrefix: `🔍 Found Notice ID: ${notice.id}`,
        });
        await message.reply(payload);
        return;
      }
    }

    // Title keyword search
    const results = await scraperService.searchNotices(query, source);

    const embed = createSearchEmbed(
      results,
      query,
      source === 'all' ? undefined : (source as string)
    );

    await message.reply({ embeds: [embed] });
  } catch (err: any) {
    console.error(`[SearchCommand] Error executing search:`, err);
    await message.reply({
      embeds: [
        createErrorEmbed(
          'Search Failed',
          `An error occurred while searching notices on Tribhuvan University portals.\n` +
          `Error: ${err.message || 'Network timeout'}`
        ),
      ],
    });
  }
}
