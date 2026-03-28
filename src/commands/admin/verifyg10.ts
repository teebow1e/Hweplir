import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, TextChannel } from 'discord.js';
import { Command } from '../../types';
import logger from '../../utils/logger';
import { config } from '../../config/env';

const REMOVE_ROLE_ID = '1484250239438164131';
const GRANT_ROLE_ID = '1484249543703924898';
const ALLOWED_ROLE_ID = '1348719400483557386';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('verifyg10')
    .setDescription('Verify a user into G10: remove guest role and grant member role')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to verify').setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'This command must be used in a server', ephemeral: true });
        return;
      }

      const invoker = await interaction.guild.members.fetch(interaction.user.id);
      if (!invoker.roles.cache.has(ALLOWED_ROLE_ID)) {
        await interaction.reply({ content: 'You do not have permission to use this command', ephemeral: true });
        return;
      }

      const targetUser = interaction.options.getMember('user') as GuildMember;

      if (!targetUser) {
        await interaction.reply({ content: 'User not found in this server', ephemeral: true });
        return;
      }

      const removeRole = interaction.guild.roles.cache.get(REMOVE_ROLE_ID);
      const grantRole = interaction.guild.roles.cache.get(GRANT_ROLE_ID);

      if (!grantRole) {
        await interaction.reply({ content: `Could not find grant role (${GRANT_ROLE_ID})`, ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      // Remove the guest role if the user has it
      if (removeRole && targetUser.roles.cache.has(REMOVE_ROLE_ID)) {
        await targetUser.roles.remove(removeRole);
        logger.info(`Removed role ${removeRole.name} from ${targetUser.user.tag}`);
      }

      // Grant the member role
      await targetUser.roles.add(grantRole);
      logger.info(`Granted role ${grantRole.name} to ${targetUser.user.tag}`);

      await interaction.editReply({
        content: `Done. ${targetUser.user.username} has been verified into G10.`,
      });

      if (config.LOG_CHANNELID) {
        const logChannel = interaction.guild.channels.cache.get(config.LOG_CHANNELID) as TextChannel;
        if (logChannel) {
          await logChannel.send(
            `${interaction.user.username} verified ${targetUser.user.username} into G10 (removed: ${REMOVE_ROLE_ID}, granted: ${GRANT_ROLE_ID})`
          );
        }
      }
    } catch (error) {
      logger.error('Error in verifyg10 command:', error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'An error occurred while verifying the user' });
      } else {
        await interaction.reply({ content: 'An error occurred while verifying the user', ephemeral: true });
      }
    }
  },
};

export default command;
