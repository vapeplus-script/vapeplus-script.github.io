// app.js
const cooldownTime = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const claimBtn = document.getElementById("claim-account");
const usernameField = document.getElementById("username");
const passwordField = document.getElementById("password");
const cooldownMessage = document.getElementById("cooldown-message");
const cooldownTimer = document.getElementById("cooldown-timer");

let lastClaimTime = localStorage.getItem('lastClaimTime');

// Function to check if user is under cooldown
function isCooldownActive() {
  const now = new Date().getTime();
  return lastClaimTime && now - lastClaimTime < cooldownTime;
}

// Update UI for cooldown timer
function startCooldownCountdown() {
  const now = new Date().getTime();
  const timeLeft = cooldownTime - (now - lastClaimTime);

  let minutes = Math.floor(timeLeft / (1000 * 60));
  let seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  cooldownTimer.textContent = `${minutes}m ${seconds}s`;

  if (timeLeft <= 0) {
    cooldownMessage.classList.add('hidden');
    claimBtn.disabled = false;
  } else {
    setTimeout(startCooldownCountdown, 1000);
  }
}

// Function to claim account
async function claimAccount() {
  // Disable button
  claimBtn.disabled = true;

  try {
    const response = await fetch('/claim-account', { method: 'POST' });
    const data = await response.json();

    if (data.success) {
      // Update UI with account credentials
      usernameField.textContent = `Username: ${data.username}`;
      passwordField.textContent = `Password: ${data.password}`;

      // Notify Discord webhook
      await fetch(data.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Account ${data.username} was claimed!`
        })
      });

      // Set cooldown
      lastClaimTime = new Date().getTime();
      localStorage.setItem('lastClaimTime', lastClaimTime);
      cooldownMessage.classList.remove('hidden');
      startCooldownCountdown();
    } else {
      alert('No accounts available, try again later!');
      claimBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error claiming account:', error);
    alert('An error occurred. Please try again.');
    claimBtn.disabled = false;
  }
}

// Event listener for claiming account
claimBtn.addEventListener('click', () => {
  if (isCooldownActive()) {
    alert('You need to wait for the cooldown period!');
  } else {
    claimAccount();
  }
});

// Check if cooldown is active on page load
if (isCooldownActive()) {
  cooldownMessage.classList.remove('hidden');
  startCooldownCountdown();
} else {
  claimBtn.disabled = false;
}
