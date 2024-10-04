require("dotenv").config();
const { REST, Routes, ApplicationCommandOptionType } = require("discord.js");

const commands = [
  {
    name: "embed",
    description: "Sends an embed",
  },
  {
    name: "ping",
    description: "Pong!",
  },
  {
    name: "anonymous",
    description: "Toggle anonymous mode for your messages.",
  },
  {
    name: "bs",
    description: "Send an anonymous message",
    options: [
      {
        name: "message",
        description: "The content of the anonymous message",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "add",
    description: "Adds two numbers",
    options: [
      {
        name: "first-number",
        description: "The first number",
        type: ApplicationCommandOptionType.Number,
        choices: [
          {
            name: "one",
            value: 1,
          },
          {
            name: "two",
            value: 2,
          },
          {
            name: "three",
            value: 3,
          },
        ],
        required: true,
      },
      {
        name: "second-number",
        description: "The second number",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Start listening to slash commands...");
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
      body: commands,
    });
    console.log("Finished listening to slash commands");
  } catch (error) {
    console.error(error);
  }
})();
