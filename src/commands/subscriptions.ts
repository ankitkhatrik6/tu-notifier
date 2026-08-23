import { Message } from 'discord.js';
import { subscriptionRepository } from '../database/repositories/subscriptionRepository';
import { guildRepository } from '../database/repositories/guildRepository';
import { createSubscriptionsEmbed, createErrorEmbed } from '../utils/embeds';

export async function handleSubscriptionsCommand(message: Message): Promise<void> {
  if (!message.guild) {
    await message.reply({
      embeds: [
        createErrorEmbed(
          'Server Only Command',
          'This command can only be used inside a Discord server (guild).'
        ),
      ],
    });
    return;
  }

  const subscriptions = await subscriptionRepository.getGuildSubscriptions(message.guild.id);
  const guildData = await guildRepository.getGuild(message.guild.id);

  let channelText = '⚠️ *Not configured yet* (Run `!tu channel` in your desired channel)';
  if (guildData?.notification_channel_id) {
    channelText = `<#${guildData.notification_channel_id}>`;
  }

  const embed = createSubscriptionsEmbed(
    message.guild.name,
    subscriptions,
    channelText
  );

  await message.reply({ embeds: [embed] });
}
