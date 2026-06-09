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
  res.send("🚓 Harmlork Police Database Online");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web server running.");
});

/* ---------------- BOT ---------------- */

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ Missing TOKEN in environment variables");
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

/* ---------------- SAFETY ---------------- */

process.on("unhandledRejection", err => {
  console.log("Unhandled Error:", err);
});

/* ---------------- HELPERS ---------------- */

function hexToNumber(hex) {
  return parseInt((hex || "#1e3a8a").replace("#", ""), 16);
}

/* SAFE ROLE FETCH (NO RATE LIMIT CRASH) */
async function getRoleMembers(guild, roleId) {
  if (!roleId || roleId === "-") return "`➖`";

  const role = await guild.roles.fetch(roleId).catch(() => null);
  if (!role) return "`Not found`";

  const members = [...role.members.values()]
    .slice(0, 10)
    .map(m => `👤 <@${m.id}>`);

  return members.length ? members.join("\n") : "`➖`";
}

/* ---------------- EMBED ---------------- */

async function buildPanelEmbed(guild) {
  const embed = new EmbedBuilder()
    .setColor(hexToNumber(config.embedColor))
    .setDescription(
`╔════════════════════════════════════════════╗
            👮 HARMLORK POLICE
             ΚΑΤΑΣΤΑΤΙΚΑ ΥΠΗΡΕΣΙΩΝ
╚════════════════════════════════════════════╝

📋 Επιλέξτε υπηρεσία από το menu παρακάτω.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    )
    .setThumbnail(config.logoUrl)
    .setTimestamp();

  const formatLine = async (title, roleId) => {
    const members = await getRoleMembers(guild, roleId);
    return `👤 ${title.padEnd(18, " ")} ${members}`;
  };

  for (const service of services) {
    const lines = [];

    for (const r of service.roles || []) {
      lines.push(await formatLine(r.title, r.roleId));
    }

    embed.addFields({
      name: `${service.emoji} ${service.fullName}`,
      value:
`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${lines.join("\n")}

🔗 Καταστατικό:
${service.url && service.url !== "-" 
  ? `[📄 Άνοιγμα](${service.url})`
  : "`➖ Δεν υπάρχει link`"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      inline: false
    });
  }

  embed.addFields({
    name: "⚡ QUICK MENU",
    value:
`⚡ Ο.Δ    🚦 Ο.Τ.ΕΛ    🏍️ Ο.ΔΙ.Δ
🚔 Ο.Δ.ΑΣ  🏛️ ΑΚΑΔΗΜΙΑ  🏙️ Δ.Α  🚁 Ο.Ε.Μ`,
    inline: false
  });

  return embed;
}

/* ---------------- MENU ---------------- */

function buildMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("service_select")
      .setPlaceholder("🚓 Select Department")
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

  const text = await buildPanelEmbed(interaction.guild);

  const embed = new EmbedBuilder()
    .setColor(hexToNumber(config.embedColor))
    .setTitle(`${service.emoji} ${service.fullName}`)
    .setDescription(
      "📋 **Department Selected**\n━━━━━━━━━━━━━━━━━━━━━━"
    )
    .addFields({
      name: "🔗 Καταστατικό",
      value: service.url && service.url !== "-"
        ? `[Άνοιγμα Καταστατικού](${service.url})`
        : "`Δεν υπάρχει link`"
    })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
});

/* ---------------- LOGIN ---------------- */

client.login(TOKEN);
