import { Message } from 'discord.js';
import { createHelpEmbed } from '../utils/embeds';
import { config } from '../config';

export async function handleHelpCommand(message: Message): Promise<void> {
  const embed = createHelpEmbed(config.prefix);
  await message.reply({ embeds: [embed] });
}
