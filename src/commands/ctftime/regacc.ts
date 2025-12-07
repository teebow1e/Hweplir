import { SlashCommandBuilder, CommandInteraction, TextChannel } from 'discord.js';
import { Command, CTFInfo } from '../../types';
import ctftimeService from '../../services/ctftime.service';
import databaseService from '../../services/database.service';
import { createEmbed, loadingEmbed, errorEmbed, successEmbed } from '../../utils/embed.builder';
import logger from '../../utils/logger';
import { config } from '../../config/env';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ct-regacc')
    .setDescription('[CTFTime] Update thông tin tài khoản của CTF đã tạo')
    .addStringOption((option) =>
      option
        .setName('username')
        .setDescription('Tên đăng nhập của account đã tạo')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('password')
        .setDescription('Mật khẩu của account đã tạo')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('cate_id')
        .setDescription(
          'Nhập Discord Category ID của giải CTF trong server [Hoặc chỉ cần chạy trong channel thuộc CTF đó]'
        )
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: CommandInteraction) {
    try {
      if (!interaction.guild || !interaction.channel) {
        await interaction.reply({ embeds: [errorEmbed('This command must be used in a server')], ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const username = interaction.options.get('username')?.value as string;
      const password = interaction.options.get('password')?.value as string;
      let cateId = interaction.options.get('cate_id')?.value as string | undefined;

      // Get category ID from current channel if not provided
      if (!cateId || cateId === '0') {
        const channel = interaction.channel as TextChannel;
        if (!channel.parent) {
          await interaction.editReply({ embeds: [errorEmbed('This channel is not in a category')] });
          return;
        }
        cateId = channel.parent.id;
      }

      // Validate category ID
      if (!/^\d+$/.test(cateId)) {
        await interaction.editReply({ embeds: [errorEmbed('Invalid category ID')] });
        return;
      }

      // Find CTF data
      const ctf = await databaseService.findByCategoryId(cateId);

      if (!ctf || ctf.data.ctftimeid === 0) {
        await interaction.editReply({ embeds: [errorEmbed('CTF not found in database')] });
        return;
      }

      // Get updated CTF info with credentials
      const result = await ctftimeService.getCTF(ctf.data.ctftimeid, true, username, password);

      if (!result || !('title' in result)) {
        await interaction.editReply({ embeds: [errorEmbed('Failed to fetch CTF info')] });
        return;
      }

      const ctfInfo = result as CTFInfo;

      // Update the pinned message in info channel
      const channel = interaction.guild.channels.cache.get(ctf.data.channel) as TextChannel;

      if (!channel) {
        await interaction.editReply({ embeds: [errorEmbed('Info channel not found')] });
        return;
      }

      const message = await channel.messages.fetch(ctf.data.infom);

      if (!message) {
        await interaction.editReply({ embeds: [errorEmbed('Info message not found')] });
        return;
      }

      const embed = createEmbed(ctfInfo.embedData);
      await message.edit({ embeds: [embed] });

      await interaction.editReply({
        embeds: [successEmbed(`Login info của <***${ctf.data.name}***> đã được update`)],
      });

      // Log to log channel
      if (config.LOG_CHANNELID) {
        const logChannel = interaction.guild.channels.cache.get(config.LOG_CHANNELID) as TextChannel;
        if (logChannel) {
          await logChannel.send(
            `${interaction.user.username} has updated login info for ***${ctf.data.name}***`
          );
        }
      }

      logger.info(
        `User ${interaction.user.tag} updated login info for CTF: ${ctf.data.name}`
      );
    } catch (error) {
      logger.error('Error in ct-regacc command:', error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed('An error occurred')] });
      }
    }
  },
};

export default command;
