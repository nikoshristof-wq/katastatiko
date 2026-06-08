const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const config = require("./config.json");
const services = require("./services.json");

const app = express();

app.get("/", (req, res) => {
  res.send("Harmlork Police DataBase Online ✅");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web server running.");
});

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ Λείπει το TOKEN από Render Environment Variables.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function hexToNumber(hex) {
  return parseInt((hex || "#2563eb").replace("#", ""), 16);
}

function isEmptyRole(roleId) {
  return !roleId || roleId === "-" || roleId.startsWith("ROLE_ID_");
}

async function getRoleMembers(guild, roleId) {
  if (isEmptyRole(roleId)) return null;

  const role = guild.roles.cache.get(roleId);
  if (!role) return "`Δεν βρέθηκε ο ρόλος.`";

  await guild.members.fetch();

  const members = role.members.map(member => `<@${member.id}>`);
  return members.length ? members.join(", ") : "`Κανένα μέλος.`";
}

async function buildServiceText(guild, service) {
  const lines = [];

  for (const group of service.roles || []) {
    const members = await getRoleMembers(guild, group.roleId);
    if (!members) continue;

    lines.push(`**${group.title}:** ${members}`);
  }

  if (!lines.length) {
    lines.push("**Υπεύθυνοι:** `Δεν έχει οριστεί.`");
  }

  return lines.join("\n");
}

async function buildPanelEmbed(guild) {
  const embed = new EmbedBuilder()
    .setColor(hexToNumber(config.embedColor))
    .setTitle("📋 ΚΑΤΑΣΤΑΤΙΚΑ")
    .setDescription("**Επιλέξτε μία υπηρεσία για να δείτε το καταστατικό της**")
    .setThumbnail(config.logoUrl)
    .setFooter({ text: "Harmlork Police DataBase • Dynamic Staff System" });

  for (const service of services) {
    const staffText = await buildServiceText(guild, service);

    embed.addFields({
      name: `${service.emoji} ${service.fullName}`,
      value: `${staffText}`,
      inline: false
    });
  }

  return embed;
}

function buildButtonRows() {
  const rows = [];
  let currentRow = new ActionRowBuilder();

  services.forEach((service, index) => {
    const button = new ButtonBuilder()
      .setLabel(`${service.name} ΚΑΤΑΣΤΑΤΙΚΟ`)
      .setStyle(ButtonStyle.Link)
      .setURL(service.url)
      .setEmoji(service.emoji);

    currentRow.addComponents(button);

    if (currentRow.components.length === 5 || index === services.length - 1) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
  });

  return rows;
}

client.once("ready", () => {
  console.log(`✅ Συνδέθηκε ως ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const command = config.command || "!katastatika";

  if (message.content !== command) return;

  try {
    await message.delete().catch(() => {});

    const embed = await buildPanelEmbed(message.guild);
    const rows = buildButtonRows();

    await message.channel.send({
      embeds: [embed],
      components: rows
    });
  } catch (error) {
    console.error(error);

    await message.channel.send({
      content: "❌ Κάτι πήγε λάθος. Έλεγξε role IDs, permissions και intents."
    });
  }
});

client.login(TOKEN);
