const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

const cooldownTime = 2 * 60 * 60 * 1000; // 2 hours cooldown
let usersClaimed = {};

// Load accounts from JSON file
function loadAccounts() {
  const accountsPath = path.resolve(__dirname, 'accounts.json');
  const data = fs.readFileSync(accountsPath, 'utf-8');
  return JSON.parse(data);
}

// Save updated accounts to the JSON file
function saveAccounts(accounts) {
  const accountsPath = path.resolve(__dirname, 'accounts.json');
  fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
}

// Handle account claiming
app.post('/claim-account', (req, res) => {
  const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const now = new Date().getTime();

  if (usersClaimed[userIP] && now - usersClaimed[userIP].lastClaimTime < cooldownTime) {
    const timeLeft = cooldownTime - (now - usersClaimed[userIP].lastClaimTime);
    return res.status(403).json({
      success: false,
      message: `You need to wait before claiming again. Time left: ${Math.ceil(timeLeft / 1000 / 60)} minutes`
    });
  }

  // Load the current accounts from the file
  let accounts = loadAccounts();
  let account;

  if (!usersClaimed[userIP]) {
    // If it's the first time the user is claiming, give them a "better" account
    if (accounts.betterAccounts.length > 0) {
      account = accounts.betterAccounts.shift();
      usersClaimed[userIP] = { claimedType: 'better', lastClaimTime: now };
    } else {
      return res.status(404).json({ success: false, message: 'No better accounts available' });
    }
  } else {
    // If they've already claimed, give them a "normal" account
    if (accounts.normalAccounts.length > 0) {
      account = accounts.normalAccounts.shift();
      usersClaimed[userIP].lastClaimTime = now;
    } else {
      return res.status(404).json({ success: false, message: 'No normal accounts available' });
    }
  }

  // Save the updated accounts back to the JSON file
  saveAccounts(accounts);

  // Send a webhook notification to Discord
  const webhookUrl = "https://discord.com/api/webhooks/1291773387080728737/9BS1-bLPbT5GGwB89Z7lr2qBxSOtmbxApxToKGqGKISs1HSjXZ3zXT4nieSbzBDovPZn";
  const webhookPayload = {
    content: `Account ${account.username} was claimed!`
  };

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload)
  })
  .then(() => console.log(`Sent webhook for account: ${account.username}`))
  .catch(err => console.error('Error sending webhook:', err));

  // Send the claimed account to the client
  res.json({
    success: true,
    username: account.username,
    password: account.password
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
