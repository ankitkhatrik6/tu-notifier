import { Message } from 'discord.js';
import { createFacultiesEmbed } from '../utils/embeds';

export async function handleFacultiesCommand(message: Message): Promise<void> {
  const embed = createFacultiesEmbed();
  await message.reply({ embeds: [embed] });
}
