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

/* ---------------- WEB SERVER ---------------- */
app.get("/", (req, res) => {
  res.send("🚓 Harmlork Police DataBase Online ✅");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web server running.");
});

/* ---------------- BOT SETUP ---------------- */
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ Missing TOKEN in environment variables.");
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

/* ---------------- HELPERS ---------------- */

function hexToNumber(hex) {
  return parseInt((hex || "#1e3a8a").replace("#", ""), 16);
}

function isEmptyRole(roleId) {
  return !roleId || roleId === "-" || roleId.startsWith("ROLE_ID_");
}

async function getRoleMembers(guild, roleId) {
  if (isEmptyRole(roleId)) return null;

  const role = guild.roles.cache.get(roleId);
  if (!role) return "`Role not found`";

  const members = role.members.map(m => `• <@${m.id}>`);
  return members.length ? members.join("\n") : "`No members`";
}

async function buildServiceText(guild, service) {
  const lines = [];

  for (const group of service.roles || []) {
    const members = await getRoleMembers(guild, group.roleId);
    if (!members) continue;

    lines.push(`➜ **${group.title}**\n${members}`);
  }

  if (!lines.length) {
    lines.push("➜ **No staff assigned**");
  }

  return lines.join("\n\n");
}

/* ---------------- EMBED ---------------- */

async function buildPanelEmbed(guild) {
  const embed = new EmbedBuilder()
    .setColor(hexToNumber(config.embedColor))
    .setTitle("🚓 HARMLOK POLICE | STAFF DATABASE")
    .setDescription(
      "━━━━━━━━━━━━━━━━━━\n📋 **STAFF CONTROL PANEL**\n━━━━━━━━━━━━━━━━━━\n\n**Επίλεξε μια υπηρεσία από τα buttons παρακάτω**"
    )
    .setThumbnail(config.logoUrl)
    .setImage(config.bannerUrl || null)
    .setFooter({
      text: "Harmlork Police • Dynamic Staff System",
      iconURL: config.logoUrl
    })
    .setTimestamp();

  for (const service of services) {
    const staffText = await buildServiceText(guild, service);

    embed.addFields({
      name: `${service.emoji || "📌"} ${service.fullName}`,
      value: staffText,
      inline: false
    });
  }

  return embed;
}

/* ---------------- BUTTONS (DASHBOARD STYLE) ---------------- */

function buildButtonRows() {
  const rows = [];
  let row = new ActionRowBuilder();

  services.forEach((service, index) => {
    const button = new ButtonBuilder()
      .setLabel(service.name.toUpperCase())
      .setStyle(ButtonStyle.Primary)
      .setEmoji(service.emoji || "📌")
      .setCustomId(`service_${index}`);

    row.addComponents(button);

    if (row.components.length === 5 || index === services.length - 1) {
      rows.push(row);
      row = new ActionRowBuilder();
    }
  });

  return rows;
}

/* ---------------- READY ---------------- */

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ---------------- MESSAGE COMMAND ---------------- */

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const command = config.command || "!katastatika";

  if (message.content.trim().toLowerCase() !== command.toLowerCase()) return;

  try {
    await message.delete().catch(() => {});

    const embed = await buildPanelEmbed(message.guild);
    const rows = buildButtonRows();

    await message.channel.send({
      embeds: [embed],
      components: rows
    });
  } catch (error) {
    console.error("PANEL ERROR:", error);

    message.channel.send("❌ Error loading panel.");
  }
});

/* ---------------- INTERACTIONS ---------------- */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const index = parseInt(interaction.customId.split("_")[1]);
  const service = services[index];

  if (!service) {
    return interaction.reply({
      content: "❌ Service not found.",
      ephemeral: true
    });
  }

  const text = await buildServiceText(interaction.guild, service);

  const embed = new EmbedBuilder()
    .setColor(hexToNumber(config.embedColor))
    .setTitle(`${service.emoji || "📌"} ${service.fullName}`)
    .setDescription("📋 **Current Staff List**")
    .addFields({
      name: "👮 Team Members",
      value: text || "`No members`"
    })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
});

/* ---------------- LOGIN ---------------- */

client.login(TOKEN);
