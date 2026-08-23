import { Message } from 'discord.js';
import { scraperService } from '../services/scraper';
import { createNoticeEmbed, createErrorEmbed, createWarningEmbed } from '../utils/embeds';
import {
  SOURCES,
  SOURCE_METADATA,
  isValidSource,
  normalizeSourceInput,
  getFacultyMeta,
  SourceQuery
} from '../utils/faculties';

export async function handleLatestCommand(message: Message, args: string[]): Promise<void> {
  if (!args[0]) {
    const supportedList = SOURCES.map((s) => `\`${s}\` (${SOURCE_METADATA[s].code})`).join(', ');
    await message.reply({
      embeds: [
        createWarningEmbed(
          'Missing Faculty Argument',
          `Please specify which faculty to fetch the latest notice for.\n\n` +
          `**Usage:** \`!tu latest <source>\`\n` +
          `**Example:** \`!tu latest ioe\` or \`!tu latest iost\`\n\n` +
          `**Supported faculties:**\n${supportedList}`
        ),
      ],
    });
    return;
  }

  const rawSource = normalizeSourceInput(args[0]);

  if (!isValidSource(rawSource)) {
    const supportedList = SOURCES.map((s) => `\`${s}\``).join(', ');
    await message.reply({
      embeds: [
        createErrorEmbed(
          'Invalid Faculty Source',
          `\`${args[0]}\` is not a recognized TU faculty source.\n\n` +
          `**Supported faculties:** ${supportedList}\n` +
          `Run \`!tu faculties\` to see detailed information for each institute.`
        ),
      ],
    });
    return;
  }

  // Send typing indicator
  if ('sendTyping' in message.channel && typeof message.channel.sendTyping === 'function') {
    message.channel.sendTyping().catch(() => {});
  }

  try {
    const notice = await scraperService.getLatest(rawSource as SourceQuery);

    if (!notice) {
      const meta = getFacultyMeta(rawSource);
      const name = meta ? meta.code : rawSource.toUpperCase();
      await message.reply({
        embeds: [
          createWarningEmbed(
            'No Notices Found',
            `Could not retrieve any recent notices for **${name}** at this moment. Please check again later or visit their official portal.`
          ),
        ],
      });
      return;
    }

    const embedPayload = createNoticeEmbed(notice, {
      titlePrefix: `📢 Latest ${getFacultyMeta(notice.source)?.code || notice.source.toUpperCase()} Notice`,
    });

    await message.reply(embedPayload);
  } catch (err: any) {
    console.error(`[LatestCommand] Error fetching latest notice for ${rawSource}:`, err);
    await message.reply({
      embeds: [
        createErrorEmbed(
          'Scraper Error',
          `Failed to retrieve the latest notice for **${rawSource.toUpperCase()}**.\n` +
          `Error: ${err.message || 'TU Portal connection timeout or temporary network issue.'}\n\n` +
          `Please try again in a few moments.`
        ),
      ],
    });
  }
}
