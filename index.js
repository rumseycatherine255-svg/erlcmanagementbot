const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const TOKEN = "YOUR_BOT_TOKEN";
const CLIENT_ID = "YOUR_CLIENT_ID";
const GUILD_ID = "YOUR_GUILD_ID";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const DATA_FILE = "./data.json";

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify({
      welcomeChannel: null,
      trainingChannel: null,
      warnings: {}
    }, null, 2)
  );
}

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const commands = [
  new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Set welcome channel")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Welcome channel")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("settraining")
    .setDescription("Set training channel")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Training channel")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("training")
    .setDescription("Send training announcement")
    .addStringOption(o =>
      o.setName("title")
        .setDescription("Training title")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("time")
        .setDescription("Training time")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("link")
        .setDescription("ERLC server link")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("User")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("User")
        .setRequired(true))
].map(c => c.toJSON());

(async () => {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("Slash commands registered.");
})();

client.once("ready", () => {
  console.log(`${client.user.tag} online`);
});

client.on("guildMemberAdd", member => {
  const data = loadData();

  if (!data.welcomeChannel) return;

  const channel =
    member.guild.channels.cache.get(
      data.welcomeChannel
    );

  if (!channel) return;

  channel.send(
    `👋 Welcome ${member} to **Cosa Nostra**.`
  );
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const data = loadData();

  if (interaction.commandName === "setwelcome") {
    const channel =
      interaction.options.getChannel("channel");

    data.welcomeChannel = channel.id;
    saveData(data);

    return interaction.reply({
      content: `✅ Welcome channel set to ${channel}`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "settraining") {
    const channel =
      interaction.options.getChannel("channel");

    data.trainingChannel = channel.id;
    saveData(data);

    return interaction.reply({
      content: `✅ Training channel set to ${channel}`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "training") {
    if (!data.trainingChannel) {
      return interaction.reply({
        content: "No training channel configured.",
        ephemeral: true
      });
    }

    const title =
      interaction.options.getString("title");

    const time =
      interaction.options.getString("time");

    const link =
      interaction.options.getString("link");

    const channel =
      interaction.guild.channels.cache.get(
        data.trainingChannel
      );

    const embed = new EmbedBuilder()
      .setTitle(`🏴 ${title}`)
      .setDescription(
`**Host:** ${interaction.user}
**Time:** ${time}

**Server Link**
${link}

Attendance Required`
      )
      .setTimestamp();

    await channel.send({
      content: "@everyone",
      embeds: [embed]
    });

    return interaction.reply({
      content: "Training posted.",
      ephemeral: true
    });
  }

  if (interaction.commandName === "warn") {
    const user =
      interaction.options.getUser("user");

    const reason =
      interaction.options.getString("reason");

    if (!data.warnings[user.id]) {
      data.warnings[user.id] = [];
    }

    data.warnings[user.id].push({
      reason,
      moderator: interaction.user.tag,
      date: Date.now()
    });

    saveData(data);

    return interaction.reply(
      `⚠️ Warned ${user.tag}`
    );
  }

  if (interaction.commandName === "warnings") {
    const user =
      interaction.options.getUser("user");

    const warns =
      data.warnings[user.id] || [];

    if (!warns.length) {
      return interaction.reply(
        `${user.tag} has no warnings.`
      );
    }

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag} Warnings`);

    warns.forEach((w, i) => {
      embed.addFields({
        name: `Warning ${i + 1}`,
        value: `Reason: ${w.reason}`
      });
    });

    return interaction.reply({
      embeds: [embed]
    });
  }
});

client.login(TOKEN);
