module.exports = {
  name: "search",
  description: "Search for a song",
  category: "Music",
  slashExecute: true,
  slashOptions: [
    {
      name: "query",
      description: "The song you want to search for",
      type: 3,
      required: true,
    },
  ],
  run: async (client, interaction) => {
    const query = interaction.options.getString("query");
    await interaction.reply(`Searching for: ${query} (Stub implementation)`);
  },
};
