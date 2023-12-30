const { spawn } = require('child_process');

// Start the server process
const serverProcess = spawn('node', ['server.js']);

serverProcess.stdout.on('data', (data) => {
  console.log(`Server output: ${data}`);
});

// Start the bot process
const botProcess = spawn('node', ['bot.js']);

botProcess.stdout.on('data', (data) => {
  console.log(`Bot output: ${data}`);
});

// Listen for process exit events
serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
});

botProcess.on('exit', (code) => {
  console.log(`Bot process exited with code ${code}`);
});
