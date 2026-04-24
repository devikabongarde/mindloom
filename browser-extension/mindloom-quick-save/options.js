const form = document.getElementById('settings-form');
const apiBaseUrlInput = document.getElementById('apiBaseUrl');
const tokenInput = document.getElementById('token');
const defaultShelfIdInput = document.getElementById('defaultShelfId');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');

async function loadSettings() {
  const stored = await chrome.storage.sync.get(['apiBaseUrl', 'token', 'defaultShelfId', 'shelfId']);
  apiBaseUrlInput.value = stored.apiBaseUrl || 'http://localhost:5000';
  tokenInput.value = stored.token || '';
  defaultShelfIdInput.value = stored.defaultShelfId || stored.shelfId || '';
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b42318' : '#2c5e30';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const apiBaseUrl = apiBaseUrlInput.value.trim().replace(/\/$/, '');
  const token = tokenInput.value.trim();
  const defaultShelfId = defaultShelfIdInput.value.trim();

  if (!apiBaseUrl) {
    setStatus('API Base URL is required.', true);
    return;
  }

  await chrome.storage.sync.set({ apiBaseUrl, token, defaultShelfId });
  setStatus('Settings saved. You can now click the extension icon to save tabs.');
});

clearBtn.addEventListener('click', async () => {
  await chrome.storage.sync.remove(['token', 'defaultShelfId', 'shelfId']);
  tokenInput.value = '';
  defaultShelfIdInput.value = '';
  setStatus('Token and shelf ID cleared.');
});

loadSettings().catch((err) => {
  console.error(err);
  setStatus('Could not load settings.', true);
});
