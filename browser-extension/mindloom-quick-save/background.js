const DEFAULT_API_BASE_URL = 'http://localhost:5000';
const MENU_ROOT = 'mindloom-root';
const MENU_SAVE_DEFAULT = 'mindloom-save-default';
const MENU_SAVE_SUB = 'mindloom-save-sub';
const MENU_SET_DEFAULT_SUB = 'mindloom-set-default-sub';
const MENU_REFRESH = 'mindloom-refresh';
const MENU_OPTIONS = 'mindloom-options';
const MENU_SAVE_PREFIX = 'mindloom-save::';
const MENU_DEFAULT_PREFIX = 'mindloom-default::';
const MENU_CONTEXTS = ['action', 'page', 'link'];
let menuRebuildChain = Promise.resolve();

async function getSettings() {
  const stored = await chrome.storage.sync.get(['apiBaseUrl', 'token', 'defaultShelfId', 'shelfId']);
  return {
    apiBaseUrl: (stored.apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/$/, ''),
    token: (stored.token || '').trim(),
    defaultShelfId: (stored.defaultShelfId || '').trim(),
    legacyShelfId: (stored.shelfId || '').trim(),
  };
}

async function setBadge(text, color) {
  await chrome.action.setBadgeText({ text });
  if (color) {
    await chrome.action.setBadgeBackgroundColor({ color });
  }
}

async function safeSetBadge(text, color) {
  try {
    await setBadge(text, color);
  } catch (err) {
    console.warn('MindLoom badge update failed:', err);
  }
}

async function clearBadgeSoon(ms = 1800) {
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' }).catch((err) => {
      console.warn('MindLoom badge clear failed:', err);
    });
  }, ms);
}

async function getDefaultShelfId(apiBaseUrl, token) {
  const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Could not load your account details.');
  }

  const data = await res.json();
  const defaultShelfId = data?.defaultShelfId || '';
  if (!defaultShelfId) {
    throw new Error('No default shelf found. Set one in MindLoom profile.');
  }

  return String(defaultShelfId);
}

async function fetchShelves(apiBaseUrl, token) {
  const res = await fetch(`${apiBaseUrl}/api/shelves/mine`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Could not load shelves.');
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function createMenuItem(options) {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create(options, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve();
    });
  });
}

function sanitizeMenuTitle(value, fallback = 'Untitled shelf') {
  const label = String(value || '').trim() || fallback;
  return label.length > 55 ? `${label.slice(0, 52)}...` : label;
}

async function rebuildContextMenus() {
  await chrome.contextMenus.removeAll();

  await createMenuItem({
    id: MENU_ROOT,
    title: 'MindLoom',
    contexts: MENU_CONTEXTS,
  });

  await createMenuItem({
    id: MENU_SAVE_DEFAULT,
    parentId: MENU_ROOT,
    title: 'Save current URL (default shelf)',
    contexts: MENU_CONTEXTS,
  });

  await createMenuItem({
    id: MENU_SAVE_SUB,
    parentId: MENU_ROOT,
    title: 'Save current URL to shelf',
    contexts: MENU_CONTEXTS,
  });

  await createMenuItem({
    id: MENU_SET_DEFAULT_SUB,
    parentId: MENU_ROOT,
    title: 'Set default shelf',
    contexts: MENU_CONTEXTS,
  });

  const settings = await getSettings();

  if (!settings.token) {
    await createMenuItem({
      id: 'mindloom-no-token',
      parentId: MENU_ROOT,
      title: 'Set token in options first',
      enabled: false,
      contexts: MENU_CONTEXTS,
    });
  } else {
    try {
      const shelves = await fetchShelves(settings.apiBaseUrl, settings.token);
      const resolvedDefaultShelfId = settings.defaultShelfId
        || settings.legacyShelfId
        || await getDefaultShelfId(settings.apiBaseUrl, settings.token);

      if (!settings.defaultShelfId && resolvedDefaultShelfId) {
        await chrome.storage.sync.set({ defaultShelfId: resolvedDefaultShelfId });
      }

      if (shelves.length === 0) {
        await createMenuItem({
          id: 'mindloom-no-shelves',
          parentId: MENU_ROOT,
          title: 'No shelves found',
          enabled: false,
          contexts: MENU_CONTEXTS,
        });
      } else {
        for (const shelf of shelves) {
          const shelfId = String(shelf?._id || '');
          const shelfName = sanitizeMenuTitle(shelf?.name);
          if (!shelfId) continue;

          await createMenuItem({
            id: `${MENU_SAVE_PREFIX}${shelfId}`,
            parentId: MENU_SAVE_SUB,
            title: shelfName,
            contexts: MENU_CONTEXTS,
          });

          await createMenuItem({
            id: `${MENU_DEFAULT_PREFIX}${shelfId}`,
            parentId: MENU_SET_DEFAULT_SUB,
            title: shelfName,
            type: 'radio',
            checked: shelfId === String(resolvedDefaultShelfId || ''),
            contexts: MENU_CONTEXTS,
          });
        }
      }
    } catch (err) {
      await createMenuItem({
        id: 'mindloom-shelves-error',
        parentId: MENU_ROOT,
        title: 'Could not load shelves',
        enabled: false,
        contexts: MENU_CONTEXTS,
      });
      console.warn('MindLoom menu rebuild warning:', err);
    }
  }

  await createMenuItem({
    id: 'mindloom-sep-2',
    parentId: MENU_ROOT,
    type: 'separator',
    contexts: MENU_CONTEXTS,
  });

  await createMenuItem({
    id: MENU_REFRESH,
    parentId: MENU_ROOT,
    title: 'Refresh shelf list',
    contexts: MENU_CONTEXTS,
  });

  await createMenuItem({
    id: MENU_OPTIONS,
    parentId: MENU_ROOT,
    title: 'Open extension options',
    contexts: MENU_CONTEXTS,
  });
}

function queueRebuildContextMenus() {
  menuRebuildChain = menuRebuildChain
    .catch(() => {
      // Keep the queue alive even if one rebuild failed.
    })
    .then(async () => {
      try {
        await rebuildContextMenus();
      } catch (err) {
        console.warn('MindLoom menu rebuild warning:', err);
      }
    });

  return menuRebuildChain;
}

async function getUrlFromContext(info, tab) {
  const candidate = String(info?.linkUrl || info?.pageUrl || tab?.url || '').trim();
  if (candidate && !/^chrome:\/\//i.test(candidate) && !/^edge:\/\//i.test(candidate)) {
    return candidate;
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const fallback = String(activeTab?.url || '').trim();
  if (!fallback || /^chrome:\/\//i.test(fallback) || /^edge:\/\//i.test(fallback)) {
    return '';
  }

  return fallback;
}

async function saveUrlToMindLoom(url, forcedShelfId = '') {
  const { apiBaseUrl, token, defaultShelfId, legacyShelfId } = await getSettings();

  if (!token) {
    await setBadge('!', '#B91C1C');
    await chrome.runtime.openOptionsPage();
    return;
  }

  const cleanedUrl = String(url || '').trim();
  if (!cleanedUrl) {
    await setBadge('X', '#B91C1C');
    await clearBadgeSoon();
    return;
  }

  const targetShelfId = String(
    forcedShelfId
      || defaultShelfId
      || legacyShelfId
      || await getDefaultShelfId(apiBaseUrl, token)
  );

  if (!defaultShelfId && targetShelfId) {
    await chrome.storage.sync.set({ defaultShelfId: targetShelfId });
  }

  const res = await fetch(`${apiBaseUrl}/api/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      shelfId: targetShelfId,
      url: cleanedUrl,
      mode: 'url',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to save link.');
  }

  await setBadge('OK', '#15803D');
  await clearBadgeSoon();
}

async function saveCurrentTabToMindLoom() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = (tab?.url || '').trim();
  await saveUrlToMindLoom(url);
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(['apiBaseUrl']);
  if (!existing.apiBaseUrl) {
    await chrome.storage.sync.set({ apiBaseUrl: DEFAULT_API_BASE_URL });
  }

  await queueRebuildContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  void queueRebuildContextMenus();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.apiBaseUrl || changes.token || changes.defaultShelfId || changes.shelfId) {
    void queueRebuildContextMenus();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const id = String(info.menuItemId || '');

    if (id === MENU_OPTIONS) {
      await chrome.runtime.openOptionsPage();
      return;
    }

    if (id === MENU_REFRESH) {
      await queueRebuildContextMenus();
      await setBadge('R', '#1D4ED8');
      await clearBadgeSoon();
      return;
    }

    if (id === MENU_SAVE_DEFAULT) {
      const url = await getUrlFromContext(info, tab);
      await saveUrlToMindLoom(url);
      return;
    }

    if (id.startsWith(MENU_SAVE_PREFIX)) {
      const shelfId = id.slice(MENU_SAVE_PREFIX.length);
      const url = await getUrlFromContext(info, tab);
      await saveUrlToMindLoom(url, shelfId);
      return;
    }

    if (id.startsWith(MENU_DEFAULT_PREFIX)) {
      const shelfId = id.slice(MENU_DEFAULT_PREFIX.length);
      await chrome.storage.sync.set({ defaultShelfId: shelfId });
      await setBadge('DEF', '#0369A1');
      await clearBadgeSoon();
      await queueRebuildContextMenus();
    }
  } catch (err) {
    await safeSetBadge('ERR', '#B91C1C');
    await clearBadgeSoon(2600);
    console.warn('MindLoom context menu warning:', err);
  }
});

chrome.action.onClicked.addListener(() => {
  void saveCurrentTabToMindLoom().catch(async (err) => {
    await safeSetBadge('ERR', '#B91C1C');
    await clearBadgeSoon(2600);
    console.warn('MindLoom Quick Save warning:', err);
  });
});
