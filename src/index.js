require("dotenv").config();
const axios = require("axios");
const {
  Client,
  IntentsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

// Track the state of the brainstorm session
let brainstormActive = false;
let brainstormMessageId = null; // To track the message ID of the embed
let contributions = []; // Array to store contributions

client.on("ready", (c) => {
  console.log(`👍 ${c.user.tag} is ready!`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isModalSubmit()) return;

  // Handle the /brainstorm command
  if (interaction.commandName === "brainstorm") {
    if (!interaction.member.permissions.has("ADMINISTRATOR")) {
      await interaction.reply({ content: "Only admins can start a brainstorming session.", ephemeral: true });
      return;
    }

    brainstormActive = true;
    contributions = []; // Reset contributions

    // Create an embed for the brainstorming session
    const embed = new EmbedBuilder()
      .setTitle("Brainstorming Session")
      .setDescription("Click the button below to contribute.")
      .setColor(0x00ff00);

    // Create a button for contributions
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("contribute_brainstorm")
        .setLabel("Contribute to Brainstorm")
        .setStyle(ButtonStyle.Primary)
    );

    // Send the embed with the button and save the message ID
    const brainstormMessage = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    brainstormMessageId = brainstormMessage.id;
  }

  // Handle button click to open modal
  if (interaction.isButton() && interaction.customId === "contribute_brainstorm") {
    if (!brainstormActive) {
      await interaction.reply({ content: "There is no active brainstorming session.", ephemeral: true });
      return;
    }

    const modal = new ModalBuilder().setCustomId("brainstorm_modal").setTitle("Brainstorm Contribution");

    const contributionInput = new TextInputBuilder()
      .setCustomId("brainstorm_contribution")
      .setLabel("Your Brainstorm Idea")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(contributionInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  }

  // Handle modal submission
  if (interaction.isModalSubmit() && interaction.customId === "brainstorm_modal") {
    const contributionText = interaction.fields.getTextInputValue("brainstorm_contribution");

    // Add the contribution with an initial score of 0
    const contribution = { text: contributionText, score: 0 };
    contributions.push(contribution);

    // Create the embed with contributions and scores
    const embed = new EmbedBuilder()
      .setTitle("Brainstorming Session")
      .setDescription("Click the + or - buttons to vote on the contributions.")
      .setColor(0x00ff00);

    // Create the content for each contribution
    contributions.forEach((contrib, index) => {
      embed.addFields({ name: `Contribution #${index + 1}`, value: `${contrib.text} (Score: ${contrib.score})` });
    });

    // Keep the "Contribute to Brainstorm" button intact
    const mainMessageRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("contribute_brainstorm")
        .setLabel("Contribute to Brainstorm")
        .setStyle(ButtonStyle.Primary)
    );

    // Fetch the original message and update it with the new contribution and buttons
    // Fetch the original message and update the embed with contributions (keep the contribute button)
    const channel = interaction.channel;
    const originalMessage = await channel.messages.fetch(brainstormMessageId);
    await originalMessage.edit({ embeds: [embed], components: [mainMessageRow] });

    // Now, send each contribution with its own set of + and - buttons
    for (let i = 0; i < contributions.length; i++) {
      const contrib = contributions[i];

      const contribRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`plus_${i}`) // Unique ID for the + button
          .setLabel("+")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`minus_${i}`) // Unique ID for the - button
          .setLabel("-")
          .setStyle(ButtonStyle.Danger)
      );

      // Send each contribution with its own + / - buttons
      await channel.send({
        content: `Contribution #${i + 1}: ${contrib.text} (Score: ${contrib.score})`,
        components: [contribRow],
      });
    }

    await interaction.reply({
      content: "Your contribution has been added to the brainstorming session.",
      ephemeral: true,
    });

    // Send the contribution to the backend API
    try {
      await axios.post(`${process.env.BACKEND_URL}/contributions`, { contribution });
      //await interaction.reply({ content: "Your contribution has been added.", ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: "Failed to add contribution.", ephemeral: true });
    }
  }

  // Handle + and - button clicks
  if (interaction.isButton() && (interaction.customId.includes("plus") || interaction.customId.includes("minus"))) {
    const [action, index] = interaction.customId.split("_"); // Extract action (+/-) and the index of the contribution
    const contributionIndex = parseInt(index, 10);

    if (action === "plus") {
      // Increase the score
      contributions[contributionIndex].score += 1;
    } else if (action === "minus") {
      // Decrease the score
      contributions[contributionIndex].score -= 1;
    }

    // Recreate the embed with updated scores
    const embed = new EmbedBuilder()
      .setTitle("Brainstorming Session")
      .setDescription("Click the + or - buttons to vote on the contributions.")
      .setColor(0x00ff00);

    // Update the embed with the updated contribution scores
    contributions.forEach((contrib, i) => {
      embed.addFields({ name: `Contribution #${i + 1}`, value: `${contrib.text} (Score: ${contrib.score})` });
    });

    // Edit the original message with the updated embed
    await interaction.message.edit({ embeds: [embed] });

    // Acknowledge the button interaction
    await interaction.deferUpdate(); // Defers the update to prevent loading state
  }
});

client.on("messageCreate", async (message) => {
  // Check if brainstorming is active
  if (brainstormActive) {
    // Ignore bot messages
    if (message.author.bot) return;

    // If the message is not a command (you can check if it starts with a specific prefix like '/')
    if (!message.content.startsWith("/")) {
      // Optionally send a message to let the user know messages are suppressed
      await message.delete();
      await message.channel.send({
        content: `${message.author}, non-command messages are disabled during the brainstorming session.`,
        ephemeral: true, // only visible to the user who sent the message
      });
    }
  }
});

client.login(process.env.TOKEN);

/*
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

*/
