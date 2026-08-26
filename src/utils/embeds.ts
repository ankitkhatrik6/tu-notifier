import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageCreateOptions
} from 'discord.js';
import { Notice, NoticeDetail } from 'tu-scraper';
import {
  SOURCES,
  SOURCE_METADATA,
  formatFacultyName,
  getFacultyColor,
  getFacultyMeta
} from './faculties';

/**
 * Helper to extract the real title from the notice content since the scraper 
 * often puts the faculty name in the title field and the real title in content.
 */
function getNoticeDisplayTitle(notice: Notice | NoticeDetail): string {
  const content = 'content' in notice ? notice.content : undefined;
  if (content && content !== 'undefined') {
    // Content often looks like "Real Title 2026-08-21 Real Title"
    const parts = content.split(/\s*\d{4}-\d{2}-\d{2}\s*/);
    let title = parts[0] && parts[0].trim().length > 0 ? parts[0].trim() : content.trim();
    
    // Ensure it's not too long for Discord embed limits
    if (title.length > 250) {
      title = title.substring(0, 247) + '...';
    }
    return title;
  }
  return notice.title || 'Untitled Notice';
}

/**
 * Creates the !tu help embed
 */
export function createHelpEmbed(prefix = '!tu'): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x1e40af)
    .setTitle('🎓 TU Notifier — Command Center')
    .setDescription(
      `Tribhuvan University official notice notifications and search for your Discord server.\n\n` +
      `**Prefix:** \`${prefix}\``
    )
    .addFields(
      {
        name: '📖 General Commands (Everyone)',
        value:
          `\`${prefix} help\` — View all available bot commands\n` +
          `\`${prefix} faculties\` — View all 8 supported TU faculties and institutions\n` +
          `\`${prefix} latest <source>\` — View the most recent notice for a faculty (e.g. \`${prefix} latest ioe\`)\n` +
          `\`${prefix} search <query>\` — Search notices across all faculties\n` +
          `\`${prefix} search <source> <query/id>\` — Search notices in a faculty or look up by ID\n` +
          `\`${prefix} subscriptions\` — Check which faculties this server is subscribed to`,
        inline: false,
      },
      {
        name: '⚙️ Server Administration (Admin / Manage Server)',
        value:
          `\`${prefix} channel\` — Set current text channel as the TU notice notification channel\n` +
          `\`${prefix} subscribe <source>\` — Subscribe this server to a faculty (e.g. \`${prefix} subscribe iost\`)\n` +
          `\`${prefix} subscribe all\` — Subscribe this server to **all 8 faculties**\n` +
          `\`${prefix} unsubscribe <source>\` — Unsubscribe from a single faculty\n` +
          `\`${prefix} unsubscribe all\` — Remove all faculty subscriptions for this server`,
        inline: false,
      },
      {
        name: '🏛️ Supported Faculty Codes',
        value: SOURCES.map((s) => `\`${s}\` (${SOURCE_METADATA[s].code})`).join(' • '),
        inline: false,
      }
    )
    .setFooter({ text: 'Tribhuvan University Notice Notification Service' })
    .setTimestamp();
}

/**
 * Creates the !tu faculties embed
 */
export function createFacultiesEmbed(): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x2563eb)
    .setTitle('🏛️ Supported Tribhuvan University Faculties & Institutions')
    .setDescription(
      'Below is the official list of supported TU institutes and faculties. ' +
      'Use the code in commands like `!tu latest <source>` or `!tu subscribe <source>`.'
    );

  for (const source of SOURCES) {
    const meta = SOURCE_METADATA[source];
    embed.addFields({
      name: `\`${source}\` — ${meta.code} (${meta.name})`,
      value: `🇳🇵 **${meta.nepaliName}**\n📍 ${meta.location} | 🔗 [Dean Portal](${meta.url})`,
      inline: false,
    });
  }

  embed.setFooter({ text: 'Use "!tu subscribe <source>" or "!tu subscribe all" to receive notices' });
  embed.setTimestamp();
  return embed;
}

/**
 * Builds action row buttons for notice URL and PDF attachment if present
 */
export function createNoticeButtons(notice: Notice | NoticeDetail): ActionRowBuilder<ButtonBuilder> | null {
  const row = new ActionRowBuilder<ButtonBuilder>();
  let hasButton = false;

  if (notice.url) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('🔗 View Notice')
        .setStyle(ButtonStyle.Link)
        .setURL(notice.url)
    );
    hasButton = true;
  }

  if (notice.pdf) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('📄 View PDF')
        .setStyle(ButtonStyle.Link)
        .setURL(notice.pdf)
    );
    hasButton = true;
  }

  return hasButton ? row : null;
}

/**
 * Creates a Discord notice embed for new notifications or latest command
 */
export function createNoticeEmbed(
  notice: Notice | NoticeDetail,
  options: { isNewNotification?: boolean; titlePrefix?: string } = {}
): MessageCreateOptions {
  const meta = getFacultyMeta(notice.source);
  const facultyName = meta ? `${meta.code} — ${meta.name}` : notice.source.toUpperCase();
  const color = getFacultyColor(notice.source);

  const titleHeader = options.isNewNotification
    ? `📢 New ${meta ? meta.code : notice.source.toUpperCase()} Notice`
    : (options.titlePrefix || `📢 ${meta ? meta.code : notice.source.toUpperCase()} Notice`);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(titleHeader)
    .setDescription(`**${getNoticeDisplayTitle(notice)}**`)
    .addFields(
      { name: '🏛️ Faculty / Institution', value: facultyName, inline: false },
      { name: '🆔 Notice ID', value: `\`${notice.id}\``, inline: true },
      { name: '📅 Date', value: notice.date || 'Recently published', inline: true }
    );

  if (meta?.url) {
    embed.addFields({ name: '🌐 Official Portal', value: `[${meta.baseUrl}](${meta.url})`, inline: true });
  }

  // Include image thumbnail / preview if notice has scanned media
  const detail = notice as NoticeDetail;
  if (detail.image) {
    embed.setImage(detail.image);
  }

  embed.setFooter({
    text: `Tribhuvan University • ${notice.source.toUpperCase()}`,
  });
  embed.setTimestamp();

  const buttonRow = createNoticeButtons(notice);
  const result: MessageCreateOptions = {
    embeds: [embed],
  };

  if (buttonRow) {
    result.components = [buttonRow];
  }

  return result;
}

/**
 * Creates search results embed
 */
export function createSearchEmbed(
  results: Notice[],
  query: string,
  source?: string,
  maxDisplay = 6
): EmbedBuilder {
  const color = source ? getFacultyColor(source) : 0x2563eb;
  const sourceLabel = source ? formatFacultyName(source) : 'All Faculties';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🔍 TU Notice Search Results`)
    .setDescription(
      `Query: **"${query}"**\n` +
      `Scope: **${sourceLabel}**\n` +
      `Found **${results.length}** matching notice${results.length === 1 ? '' : 's'}.`
    );

  if (results.length === 0) {
    embed.addFields({
      name: 'No Results Found',
      value: 'Try searching with different keywords or check `!tu latest <source>` to see recent notices.',
    });
    return embed;
  }

  const itemsToShow = results.slice(0, maxDisplay);

  itemsToShow.forEach((notice, idx) => {
    const meta = getFacultyMeta(notice.source);
    const facultyCode = meta ? meta.code : notice.source.toUpperCase();
    const pdfIndicator = notice.pdf ? ' • 📄 [PDF]' : '';
    const dateText = notice.date ? ` • 📅 ${notice.date}` : '';

    embed.addFields({
      name: `${idx + 1}. [${facultyCode}] ${getNoticeDisplayTitle(notice)}`,
      value: `🆔 \`${notice.id}\`${dateText}${pdfIndicator}\n🔗 [Open Notice URL](${notice.url})`,
      inline: false,
    });
  });

  if (results.length > maxDisplay) {
    embed.setFooter({
      text: `Showing first ${maxDisplay} of ${results.length} results. Narrow your search keyword for more precise results.`,
    });
  } else {
    embed.setFooter({
      text: `Total ${results.length} results found.`,
    });
  }

  embed.setTimestamp();
  return embed;
}

/**
 * Creates the !tu subscriptions embed
 */
export function createSubscriptionsEmbed(
  guildName: string,
  subscriptions: { source: string; channelId: string | null }[],
  defaultChannelText: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(subscriptions.length > 0 ? 0x10b981 : 0xf59e0b)
    .setTitle('📡 TU Notice Subscriptions')
    .setTimestamp();

  if (subscriptions.length === 0) {
    embed.setDescription(
      `**${guildName}** is currently **not subscribed** to any Tribhuvan University faculties.\n\n` +
      `To subscribe, use:\n` +
      `• \`!tu subscribe <source>\` (e.g. \`!tu subscribe iost\`)\n` +
      `• \`!tu subscribe all\` (to subscribe to all 8 faculties)\n\n` +
      `Don't forget to set a notification channel with \`!tu channel\`!`
    );
    return embed;
  }

  const facultyListText = subscriptions
    .map((sub) => {
      const meta = getFacultyMeta(sub.source);
      const name = meta
        ? `**${meta.code}** — ${meta.name}`
        : `**${sub.source.toUpperCase()}**`;
      const channelLabel = sub.channelId ? ` (in <#${sub.channelId}>)` : '';
      return `• ${name}${channelLabel}`;
    })
    .join('\n');

  embed.setDescription(
    `**${guildName}** receives automatic notifications for **${subscriptions.length}** TU ${
      subscriptions.length === 1 ? 'source' : 'sources'
    }:\n\n${facultyListText}\n\n` +
    `**Default Notification Channel:**\n${defaultChannelText}`
  );

  embed.setFooter({
    text: `Manage subscriptions using !tu subscribe / !tu unsubscribe`,
  });

  return embed;
}

/**
 * Helper embed builders for notifications
 */
export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x10b981)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function createWarningEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function createErrorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}
