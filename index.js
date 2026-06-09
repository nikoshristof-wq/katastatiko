const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const config = require("./config.json");
const services = require("./services.json");

const app = express();

app.get("/", (req, res) => {
  res.send("ELAS Katastatika Bot is online ✅");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web server running.");
});

const TOKEN = process.env.TOKEN || config.token;
const CLIENT_ID = process.env.CLIENT_ID || config.clientId;
const GUILD_ID = process.env.GUILD_ID || config.guildId;

if (!TOKEN || TOKEN === "ΒΑΛΕ_ΤΟ_TOKEN_ΣΟΥ") {
  console.error("❌ Λείπει το TOKEN. Βάλτο στο config.json ή στα Render Environment Variables.");
  process.exit(1);
}

if (!CLIENT_ID || CLIENT_ID === "ΒΑΛΕ_CLIENT_ID") {
  console.error("❌ Λείπει το CLIENT_ID.");
  process.exit(1);
}

if (!GUILD_ID || GUILD_ID === "ΒΑΛΕ_SERVER_ID") {
  console.error("❌ Λείπει το GUILD_ID.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

function hexToNumber(hex) {
  return parseInt((hex || "#2563eb").replace("#", ""), 16);
}

function isPlaceholderRole(roleId) {
  return !roleId || roleId === "-" || roleId.startsWith("ROLE_ID_");
}

async function getMembersByRole(guild, roleId) {
  if (isPlaceholderRole(roleId)) return "`Δεν έχει οριστεί.`";

  const role = guild.roles.cache.get(roleId);
  if (!role) return "`Δεν βρέθηκε ο ρόλος.`";

  await guild.members.fetch();

  const members = role.members.map(member => `<@${member.id}>`);
  return members.length ? members.join(" ") : "`Κανένα μέλος.`";
}

async function buildStaffText(guild, service) {
  const lines = [];

  for (const group of service.roles || []) {
    const members = await getMembersByRole(guild, group.roleId);
    lines.push(`**${group.title}:**\n${members}`);
  }

  return lines.join("\n\n") || "`Δεν υπάρχουν ρόλοι.`";
}

function splitTextToFields(text, maxLength = 1024) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let current = "";

  for (const part of text.split("\n\n")) {
    if ((current + "\n\n" + part).length > maxLength) {
      if (current) chunks.push(current);
      current = part;
    } else {
      current = current ? `${current}\n\n${part}` : part;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

async function buildMainEmbed() {
  const embed = new EmbedBuilder()
    .setColor(hexToNumber(config.embedColor))
    .setTitle("📋 ΚΑΤΑΣΤΑΤΙΚΑ ΥΠΗΡΕΣΙΩΝ")
    .setDescription(
      "**Επίλεξε υπηρεσία από το μενού για πλήρη προβολή.**\n\n" +
      "Το panel εμφανίζει αυτόματα **Υπεύθυνους**, **Βοηθούς** και **Εκπαιδευτές** ανάλογα με τα roles."
    )
    .setThumbnail(config.logoUrl)
    .setFooter({ text: "HARMLORK POLICE" })
    .setTimestamp();

  for (const service of services) {
    embed.addFields({
      name: `${service.emoji} ${service.name} — ${service.fullName}`,
      value: `> ${service.description}`,
      inline: false
    });
  }

  return embed;
}

async function buildServiceEmbed(guild, service) {
  const staffText = await buildStaffText(guild, service);
  const staffChunks = splitTextToFields(staffText);

  const embed = new EmbedBuilder()
    .setColor(hexToNumber(config.embedColor))
    .setTitle(`${service.emoji} ${service.name} — ${service.fullName}`)
    .setDescription(`**${service.description}**`)
    .setThumbnail(config.logoUrl)
    .setFooter({ text: `${service.name} • ` })
    .setTimestamp();

  staffChunks.forEach((chunk, index) => {
    embed.addFields({
      name: index === 0 ? "👥 Στελέχωση Υπηρεσίας" : "👥 Στελέχωση Υπηρεσίας συνέχεια",
      value: chunk,
      inline: false
    });
  });

  embed.addFields({
    name: "📖 Καταστατικό",
    value: `[Άνοιγμα καταστατικού](${service.url})`,
    inline: false
  });

  return embed;
}

function buildMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("katastatika_menu")
      .setPlaceholder("📌 Επίλεξε υπηρεσία")
      .addOptions(
        services.map(service => ({
          label: `${service.name} - ${service.fullName}`.slice(0, 100),
          description: service.description.slice(0, 100),
          value: service.id,
          emoji: service.emoji
        }))
      )
  );
}

function buildButtons(service) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("📖 ΚΑΤΑΣΤΑΤΙΚΟ")
      .setStyle(ButtonStyle.Link)
      .setURL(service.url),

    new ButtonBuilder()
      .setCustomId("back_to_katastatika")
      .setLabel("⬅️ Πίσω")
      .setStyle(ButtonStyle.Secondary)
  );
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("katastatika")
      .setDescription("Εμφανίζει το panel με τα καταστατικά υπηρεσιών.")
      .toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

client.once("ready", async () => {
  console.log(`✅ Συνδέθηκε ως ${client.user.tag}`);
  await registerCommands();
  console.log("✅ Το /katastatika έγινε register.");
});

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== "katastatika") return;

      const embed = await buildMainEmbed();

      await interaction.reply({
        embeds: [embed],
        components: [buildMenu()]
      });
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId !== "katastatika_menu") return;

      const service = services.find(item => item.id === interaction.values[0]);
      if (!service) return;

      const embed = await buildServiceEmbed(interaction.guild, service);

      await interaction.update({
        embeds: [embed],
        components: [buildMenu(), buildButtons(service)]
      });
    }

    if (interaction.isButton()) {
      if (interaction.customId !== "back_to_katastatika") return;

      const embed = await buildMainEmbed();

      await interaction.update({
        embeds: [embed],
        components: [buildMenu()]
      });
    }
  } catch (error) {
    console.error(error);

    const payload = {
      content: "❌ Κάτι πήγε λάθος. Έλεγξε τα role IDs, τα links και τα permissions του bot.",
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

client.login(TOKEN);
