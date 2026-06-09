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
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers // 🔥 REQUIRED
  ]
});

/* ---------------- SAFETY ---------------- */

process.on("unhandledRejection", console.error);
client.on("error", console.error);
client.on("shardError", console.error);

/* ---------------- HELPERS ---------------- */

function hexToNumber(hex) {
  return parseInt((hex || "#1e3a8a").replace("#", ""), 16);
}

/* ---------------- FIXED ROLE SYSTEM ---------------- */

async function getRoleMentions(guild, roleId) {
  if (!roleId || roleId === "-") return "—";

  const role = await guild.roles.fetch(roleId).catch(() => null);
  if (!role) return "—";

  // 🔥 FULL FETCH (this fixes missing users)
  await guild.members.fetch().catch(() => {});

  const members = role.members.map(m => `<@${m.id}>`);

  return members.length ? members.join(" ") : "—";
}

/* ---------------- EMBED ---------------- */

async function buildPanelEmbed(guild) {
  const embed = new EmbedBuilder()
    .setColor(hexToNumber(config.embedColor))
    .setTitle("👮 HARMLORK POLICE ")
    .setDescription(
`━━━━━━━━━━━━━━━━━━━━
📁 ΚΛΙΜΑΚΙΑ: ${services.length}
━━━━━━━━━━━━━━━━━━━━`
    )
    .setThumbnail(config.logoUrl)
    .setTimestamp();

  for (const service of services) {
    let block = "";

    for (const r of service.roles || []) {
      const mentions = await getRoleMentions(guild, r.roleId);
      block += `👤 **${r.title}** ➜ ${mentions}\n`;
    }

    embed.addFields({
      name: `${service.emoji} ${service.fullName}`,
      value:
`━━━━━━━━━━━━━━━━━━━━
📄 Καταστατικό: ${
        service.url && service.url !== "-"
          ? `[ΠΑΤΑ ΕΔΩ](${service.url})`
          : "ΔΕΝ ΥΠΑΡΧΕΙ"
      }

${block || "ΚΑΝΕΝΑ ΠΡΟΣΩΠΙΚΟ"}

━━━━━━━━━━━━━━━━━━━━`,
      inline: false
    });
  }

  embed.addFields({
    name: "📌 ΚΛΙΜΑΚΙΑ",
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

  if (!message.content.toLowerCase().startsWith("!katastatika")) return;

  try {
    const embed = await buildPanelEmbed(message.guild);
    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("PANEL ERROR:", err);
    message.channel.send("❌ Error loading panel.");
  }
});

/* ---------------- LOGIN ---------------- */

client.login(TOKEN);
