const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const emoji = require("../../emojis.js");

module.exports = {
  name: "queue",
  aliases: ["q"],
  category: "Music",
  description: "Show the server queue",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  player: true,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  slashOptions: [],

  async slashExecute(interaction, client) {
    const interactionWrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      reply: async (options) => {
        if (interaction.deferred) {
          return await interaction.editReply(options);
        } else if (interaction.replied) {
          return await interaction.followUp(options);
        } else {
          return await interaction.reply(options);
        }
      },
    };

    const args = [];
    if (interaction.options) {
      const options = interaction.options.data;
      for (const option of options) {
        if (option.value !== undefined) {
          args.push(option.value.toString());
        }
      }
    }

    const prefix = client.prefix;
    return this.execute(interactionWrapper, args, client, prefix);
  },

  async execute(message, args, client, prefix) {
    const player = client.manager.players.get(message.guild.id);

    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} Nothing is playing right now.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const queue = player.queue;

    const multiple = 10;
    const pages = Math.ceil((queue.length || 1) / multiple);

    let page = 0;

    const current = queue.current;
    const currDuration = convertTime(current.length || 0);

    let totalDuration = current.length;
    for (const track of queue) {
      totalDuration += track.length;
    }

    const generateContainer = (page) => {
      const start = page * multiple;
      const queueList = queue.slice(start, start + multiple);

      const headerDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.info} Queue**`);

      const separator1 = new SeparatorBuilder();

      const currentDisplay = new TextDisplayBuilder()
        .setContent(`**\`0\` | [${current.title}](${current.uri}) - \`${currDuration}\`**`);

      const separator2 = new SeparatorBuilder();

      const queueText = queueList.map((track, i) =>
        `**\`${start + i + 1}\` | [${track.title}](${track.uri}) - \`${convertTime(track.length)}\`**`
      ).join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(headerDisplay)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(currentDisplay);

      if (queueText) {
        const queueDisplay = new TextDisplayBuilder()
          .setContent(queueText);

        container
          .addSeparatorComponents(separator2)
          .addTextDisplayComponents(queueDisplay);
      }

      return container;
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("home")
        .setLabel("Home")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("previous")
        .setLabel("Previous")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("close")
        .setLabel("Close")
        .setStyle(ButtonStyle.Secondary)
    );

    const components = [generateContainer(0)];
    if (queue.length > 10) {
      components.push(row);
    }

    const queueMsg = await message.channel.send({
      components,
      flags: MessageFlags.IsComponentsV2
    });

    if (queue.length > 10) {
      const collector = queueMsg.createMessageComponentCollector({
        filter: (b) => {
          if (b.user.id === message.author.id) return true;

          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.cross} Only ${message.author.tag} can use these buttons!**`);

          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          b.reply({
            components: [errorContainer],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
          return false;
        },
        idle: 20000
      });

      collector.on("collect", async (button) => {
        if (!button.deferred) await button.deferUpdate().catch(() => { });

        if (button.customId === "previous") {
          page = page > 0 ? --page : pages - 1;
        } else if (button.customId === "home") {
          page = 0;
        } else if (button.customId === "next") {
          page = page + 1 < pages ? ++page : 0;
        } else if (button.customId === "close") {
          return collector.stop();
        }

        const updatedComponents = [generateContainer(page), row];

        await queueMsg.edit({
          components: updatedComponents,
          flags: MessageFlags.IsComponentsV2
        }).catch(() => { });
      });

      collector.on("end", () => {
        queueMsg.edit({
          components: [generateContainer(page)]
        }).catch(() => { });
      });
    }
  }
};

