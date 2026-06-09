const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const config = require("./config.json");
const services = require("./services.json");

const app = express();

/* ---------------- WEB ---------------- */
app.get("/", (req, res) => {
  res.send("Harmlork Police System Online");
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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

process.on("unhandledRejection", err => {
  console.log("ERROR:", err);
});

/* ---------------- HELPERS ---------------- */

function hexToNumber(hex) {
  return parseInt((hex || "#1e3a8a").replace("#", ""), 16);
}

async function getRoleMentions(guild, roleId) {
  if (!roleId || roleId === "-") return "—";

  const role = await guild.roles.fetch(roleId).catch(() => null);
  if (!role) return "—";

  await guild.members.fetch().catch(() => {});

  const members = role.members.map(m => `<@${m.id}>`);

  return members.length ? members.join(" ") : "—";
}

/* ---------------- EMBED (SAFE MDT UI) ---------------- */

async function buildPanelEmbed(guild) {
  const embed = new EmbedBuilder()
    .setColor(hexToNumber(config.embedColor))
    .setTitle("👮 HARMLORK POLICE ")
    .setDescription(
`ΕΝΕΡΓΑ ΚΛΙΜΑΚΙΑ: ${services.length}`
    )
    .setThumbnail(config.logoUrl)
    .setTimestamp();

  for (const service of services) {
    let block = "";

    for (const r of service.roles || []) {
      const members = await getRoleMentions(guild, r.roleId);
      block += `• ${r.title}: ${members}\n`;
    }

    embed.addFields({
      name: `${service.emoji} ${service.fullName}`,
      value:
`────────────────────
📄 ${service.url && service.url !== "-" ? `[ΠΑΤΑ ΕΔΩR](${service.url})` : "NO FILE"}

${block || "NO PERSONNEL"}

STATUS: ACTIVE
────────────────────`,
      inline: false
    });
  }

  embed.addFields({
    name: "ΚΛΙΜΑΚΙΟ",
    value:
`⚡ Ο.Δ | 🚦 Ο.Τ.ΕΛ | 🏍️ Ο.ΔΙ.Δ
🚔 Ο.Δ.ΑΣ | 🏛️ ΑΚΑΔΗΜΙΑ | 🏙️ Δ.Α | 🚁 Ο.Ε.Μ`,
    inline: false
  });

  return embed;
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

  await message.channel.send({ embeds: [embed] });
});

/* ---------------- LOGIN ---------------- */

client.login(TOKEN);
