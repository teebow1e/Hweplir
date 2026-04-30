import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { errorEmbed } from './embed.builder';

export async function requireRole(
  interaction: ChatInputCommandInteraction,
  roleId: string
): Promise<boolean> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      embeds: [errorEmbed('This command must be used in a server')],
      ephemeral: true,
    });
    return false;
  }

  const member = interaction.member as GuildMember;
  const hasRole = member.roles.cache.has(roleId);
  const isAdministrator = member.permissions.has(PermissionFlagsBits.Administrator);

  if (!hasRole && !isAdministrator) {
    await interaction.reply({
      embeds: [errorEmbed('You do not have permission to use this command')],
      ephemeral: true,
    });
    return false;
  }

  return true;
}
