const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const config = require("./config.json");
const services = require("./services.json");

const app = express();

/* ---------------- WEB ---------------- */
app.get("/", (req, res) => {
  res.send("🚓 Police Database Online");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web server running.");
});

/* ---------------- BOT ---------------- */
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ Missing TOKEN");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // 🔥 REQUIRED
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ---------------- HELPERS ---------------- */

function hexToNumber(hex) {
  return parseInt((hex || "#1e3a8a").replace("#", ""), 16);
}

async function getRoleMembers(guild, roleId) {
  if (!roleId || roleId === "-") return "`No role`";

  await guild.members.fetch(); // 🔥 IMPORTANT FIX

  const role = await guild.roles.fetch(roleId).catch(() => null);
  if (!role) return "`Role not found`";

  const members = role.members.map(m => `👤 <@${m.id}>`);

  return members.length ? members.join("\n") : "`No members`";
}

async function buildServiceText(guild, service) {
  const lines = [];

  for (const group of service.roles || []) {
    const members = await getRoleMembers(guild, group.roleId);

    if (!members) continue;

    lines.push(
      `👮 **${group.title}**\n${members}`
    );
  }

  if (!lines.length) {
    return "```diff\n- No staff assigned\n```";
  }

  return lines.join("\n\n");
}

/* ---------------- EMBED ---------------- */

async function buildPanelEmbed(guild) {
  const embed = new EmbedBuilder()
    .setColor(hexToNumber(config.embedColor))
    .setTitle("🚓 HARMLOK POLICE | COMMAND CENTER")
    .setDescription(
      "```ansi\n" +
      "POLICE DATABASE DASHBOARD\n" +
      "Select department below\n```"
    )
    .setThumbnail(config.logoUrl)
    .setImage(config.bannerUrl || null)
    .setFooter({
      text: "Harmlork Police System",
      iconURL: config.logoUrl
    })
    .setTimestamp();

  for (const service of services) {
    const text = await buildServiceText(guild, service);

    embed.addFields({
      name: `${service.emoji} ${service.fullName}`,
      value: text,
      inline: false
    });
  }

  return embed;
}

/* ---------------- MENU ---------------- */

function buildMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("service_select")
      .setPlaceholder("Select Department")
      .addOptions(
        services.map((s, i) => ({
          label: s.fullName,
          value: String(i),
          emoji: s.emoji,
          description: (s.description || "").slice(0, 80)
        }))
      )
  );
}

/* ---------------- READY ---------------- */

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ---------------- COMMAND ---------------- */

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.content.toLowerCase() !== "!katastatika") return;

  const embed = await buildPanelEmbed(message.guild);

  await message.channel.send({
    embeds: [embed],
    components: [buildMenu()]
  });
});

/* ---------------- INTERACTION ---------------- */

client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "service_select") return;

  const service = services[interaction.values[0]];
  if (!service) return;

  const text = await buildServiceText(interaction.guild, service);

  const embed = new EmbedBuilder()
    .setColor(hexToNumber(config.embedColor))
    .setTitle(`${service.emoji} ${service.fullName}`)
    .setDescription("📋 STAFF LIST")
    .addFields({
      name: "👮 Members",
      value: text
    })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
});

/* ---------------- LOGIN ---------------- */

client.login(TOKEN);
client.login(TOKEN);
