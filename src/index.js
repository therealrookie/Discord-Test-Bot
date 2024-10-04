require("dotenv").config();
const { Client, IntentsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

// State to track anonymous mode for users
const anonymousUsers = new Set();
// State to track agree and disagree votes
const messageVotes = {};

client.on("ready", (c) => {
  console.log(`👍 ${c.user.tag} is ready!`);
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "bs") {
      const messageContent = interaction.options.getString("message");

      // Create "Agree" and "Disagree" buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`agree_${interaction.id}`).setLabel("Agree").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`disagree_${interaction.id}`).setLabel("Disagree").setStyle(ButtonStyle.Danger)
      );

      // Send the anonymous message with buttons
      await interaction.channel.send({ content: `Anonymous: ${messageContent}`, components: [row] });

      // Respond to the user who used the slash command, but only they can see it
      await interaction.reply({ content: "Your anonymous message has been sent.", ephemeral: true });
    }
  }
});

client.on("messageCreate", (msg) => {
  if (msg.author.bot) {
    return;
  }

  // Check if the user is in anonymous mode
  if (anonymousUsers.has(msg.author.id)) {
    // Create "Agree" and "Disagree" buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`agree_${msg.id}`).setLabel("Agree").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`disagree_${msg.id}`).setLabel("Disagree").setStyle(ButtonStyle.Danger)
    );

    // Send the anonymous message with buttons
    msg.channel.send({ content: `${msg.content}`, components: [row] }).then(() => {
      // Optionally delete the original message to keep it truly anonymous
      msg.delete();
    });

    // Initialize votes for this message
    messageVotes[msg.id] = { agree: 0, disagree: 0 };
  } else {
    if (msg.content === "hello") {
      msg.reply("Hello back!");
    }
  }

  console.log(msg);
});

// Handle button interactions
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) return;

  console.log(interaction.customId);
  //const [action, messageId] = interaction.customId.split("_");
  /*
  if (action === "agree" || action === "disagree") {
    // Update the vote count
    if (messageVotes[messageId]) {
      if (action === "agree") {
        messageVotes[messageId].agree += 1;
      } else if (action === "disagree") {
        messageVotes[messageId].disagree += 1;
      }

      await interaction.reply({
        content: `You have ${action === "agree" ? "agreed" : "disagreed"} with the message.`,
        ephemeral: true, // Show the response only to the user who clicked
      });

      // Optionally, you can edit the original message to display vote counts
      const messageContent = `Anonymous: [Original message] | 👍 ${messageVotes[messageId].agree} | 👎 ${messageVotes[messageId].disagree}`;
      interaction.message.edit({ content: messageContent, components: [interaction.message.components[0]] });
    } else {
      await interaction.reply({
        content: "Could not find the message for this vote.",
        ephemeral: true,
      });
    }
  }
*/
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "anonymous") {
      // Toggle anonymous mode for the user
      if (anonymousUsers.has(interaction.user.id)) {
        anonymousUsers.delete(interaction.user.id);
        interaction.reply({ content: "You are no longer anonymous.", ephemeral: true });
      } else {
        anonymousUsers.add(interaction.user.id);
        interaction.reply({ content: "You are now in anonymous mode.", ephemeral: true });
      }
    }

    if (interaction.commandName === "embed") {
      const embed = new EmbedBuilder()
        .setTitle("Embed Title")
        .setDescription("This is an embed description")
        .setColor(0xeaeaea)
        .addFields(
          { name: "Field title", value: "Some random value", inline: true },
          { name: "Second field title", value: "Some random value", inline: true }
        );
      interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === "ping") {
      interaction.reply("Pong!");
    }

    if (interaction.commandName === "add") {
      const firstNum = interaction.options.get("first-number").value;
      const secondNum = interaction.options.get("second-number").value;

      interaction.reply(`The sum is: ${firstNum + secondNum}`);
    }
  }
});

// Handle button interactions
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    console.log("INTERACTION", interaction.message.content);
    const [action, messageId] = interaction.customId.split("_");

    if (action === "agree" || action === "disagree") {
      // Update the vote count
      if (messageVotes[messageId]) {
        if (action === "agree") {
          messageVotes[messageId].agree += 1;
        } else if (action === "disagree") {
          messageVotes[messageId].disagree += 1;
        }

        // Optionally, you can edit the original message to display vote counts
        const messageContent = `${interaction.message.content} | 👍 ${messageVotes[messageId].agree} | 👎 ${messageVotes[messageId].disagree}`;
        interaction.message.edit({ content: messageContent, components: [interaction.message.components[0]] });
      } else {
        await interaction.reply({
          content: "Could not find the message for this vote.",
          ephemeral: true,
        });
      }
    }
  }
});

client.login(process.env.TOKEN);
