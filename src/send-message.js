require("dotenv").config();
const { Client, IntentsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

const roles = [
  {
    id: "1271412606061510781",
    label: "Green",
  },
  {
    id: "1271412815285977229",
    label: "Blue",
  },
  {
    id: "1271412869518331948",
    label: "Red",
  },
];

client.on("ready", async (c) => {
  try {
    const channel = await client.channels.cache.get("1271078627538108502");
    if (!channel) return;

    const row = new ActionRowBuilder();

    roles.forEach((role) => {
      row.components.push(new ButtonBuilder().setCustomId(role.id).setLabel(role.label).setStyle(ButtonStyle.Primary));
    });

    await channel.send({
      content: "Claim or remove a role below",
      components: [row],
    });

    process.exit();
  } catch (error) {
    console.log(error);
  }
});

client.login(process.env.TOKEN);
