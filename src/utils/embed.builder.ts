import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { CTFEmbedData } from '../types';

/**
 * Create a Discord embed from embed data
 */
export function createEmbed(data: Partial<CTFEmbedData>): EmbedBuilder {
  const embed = new EmbedBuilder();

  if (data.title) embed.setTitle(data.title);
  if (data.description) embed.setDescription(data.description);
  if (data.url) embed.setURL(data.url);
  if (data.color !== undefined) embed.setColor(data.color as ColorResolvable);
  if (data.thumbnail) embed.setThumbnail(data.thumbnail);
  if (data.footer) embed.setFooter({ text: data.footer });

  if (data.fields && data.fields.length > 0) {
    data.fields.forEach((field) => {
      embed.addFields({
        name: field.name,
        value: field.value,
        inline: field.inline || false,
      });
    });
  }

  return embed;
}

/**
 * Create a simple embed with title and description
 */
export function simpleEmbed(
  title: string,
  description: string,
  color: number = 0xfcba03
): EmbedBuilder {
  return createEmbed({
    title,
    description,
    color,
    fields: [],
  });
}

/**
 * Create an error embed
 */
export function errorEmbed(message: string = "Can't see shit"): EmbedBuilder {
  return simpleEmbed('Error', message, 0x000000);
}

/**
 * Create a loading embed
 */
export function loadingEmbed(): EmbedBuilder {
  return simpleEmbed('Đợi chút...', '', 0xfee12b);
}

/**
 * Create a success embed
 */
export function successEmbed(message: string): EmbedBuilder {
  return simpleEmbed('Xong!', message, 0x03ac13);
}

/**
 * Create a warning embed
 */
export function warningEmbed(title: string, message: string): EmbedBuilder {
  return simpleEmbed(title, message, 0xfee12b);
}
