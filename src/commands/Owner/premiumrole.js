const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require("discord.js");
const PremiumRole = require("../../schema/premiumrole");

module.exports = {
  name: "premiumrole",
  category: "Owner",
  aliases: ["prole"],
  description: "Set or clear premium role for this server",
  cooldown: 3,
  owner: true,
  userPerms: [],
  botPerms: [],
  slashOptions: [
    {
      name: "action",
      description: "set or clear",
      type: 3,
      required: true,
      choices: [
        { name: "set", value: "set" },
        { name: "clear", value: "clear" }
      ]
    },
    {
      name: "role",
      description: "Premium role",
      type: 8,
      required: false
    }
  ],
  async slashExecute(interaction, client) {
    const action = interaction.options.getString("action");
    const role = interaction.options.getRole("role");
    const args = [action, role ? role.id : undefined].filter(Boolean);
    return this.execute(interaction, args, client, client.prefix);
  },
  async execute(message, args, client, prefix) {
    const action = (args[0] || "").toLowerCase();
    if (!["set", "clear"].includes(action)) {
      const d = new TextDisplayBuilder().setContent(`**Usage:** \`${prefix}premiumrole set @role\` or \`${prefix}premiumrole clear\``);
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }
    if (action === "set") {
      const roleId = args[1];
      const role = message.guild.roles.cache.get(roleId) || message.guild.roles.cache.find(r => `<@&${r.id}>` === args[1]);
      if (!role) {
        const d = new TextDisplayBuilder().setContent(`**Role not found**`);
        const c = new ContainerBuilder().addTextDisplayComponents(d);
        return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
      }
      await PremiumRole.findOneAndUpdate(
        { Guild: message.guild.id },
        { Guild: message.guild.id, RoleId: role.id },
        { upsert: true, new: true }
      );
      const d = new TextDisplayBuilder().setContent(`**Premium role set to <@&${role.id}>**`);
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    } else {
      await PremiumRole.findOneAndDelete({ Guild: message.guild.id });
      const d = new TextDisplayBuilder().setContent(`**Premium role cleared**`);
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
