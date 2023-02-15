// begin utils
const passFromServer = (server) =>
  btoa(server.username + ":" + server.password);

//
// begin notifications
const notify = (message, icon) => {
  browser.notifications.create("torrentAdded", {
    type: "basic",
    title: "transmission multi client",
    message: message,
    iconUrl: icon,
  });
  setTimeout(() => {
    browser.notifications.clear("torrentAdded");
  }, 6000);
};
const notifyGood = (message) => notify(message, "icons/checkmark.png");
const notifyBad = (message) => notify(message, "icons/xmark.png");

//
// begin transmission logic
const downloadTorrent = async (server, url, directory) => {
  const authHeaders = {
    Authorization: `Basic ${passFromServer(server)}`,
  };
  const sessResp = await fetch(server.rpc, {
    method: "get",
    headers: authHeaders,
  });
  if (sessResp.status !== 409) {
    notifyBad(`error getting session: ${sessResp.statusText}`);
    return;
  }
  const sessionID = sessResp.headers.get("x-transmission-session-id");
  if (!sessionID) {
    notifyBad("error getting session: server didn't return a session id");
    return;
  }
  const postResp = await fetch(server.rpc, {
    method: "post",
    headers: {
      ...authHeaders,
      "Content-Type": "json",
      "x-transmission-session-id": sessionID,
    },
    body: JSON.stringify({
      method: "torrent-add",
      arguments: {
        filename: url,
        ...(directory ? { "download-dir": directory } : {}),
      },
    }),
  });
  if (postResp.status !== 200) {
    notifyBad(`error adding torrent: ${postResp.statusText}`);
    return;
  }
  const jsonResp = await postResp.json();
  if (jsonResp.result !== "success") {
    notifyBad(`error adding torrent: ${jsonResp.result}`);
    return;
  }
  notifyGood("added successfully");
};

//
// begin context menu
// exported function (called from options) is created then called
const createMenu = (title, callback, props) => {
  browser.contextMenus.create({
    ...props,
    title: title,
    contexts: ["link"],
    onclick: callback,
  });
};
export const createMenus = async () => {
  browser.contextMenus.removeAll();
  const data = await browser.storage.sync.get("servers");
  const servers = data.servers;
  if (!servers) {
    return;
  }
  for (let server of servers) {
    const serverName = server.name || "default";
    for (let folder of server.folders.split("\n")) {
      if (!folder) {
        continue;
      }
      createMenu(`${serverName}: ${folder}`, (info, tab) => {
        downloadTorrent(server, info.linkUrl, folder);
      });
    }
    createMenu(`${serverName}: default folder`, (info, tab) => {
      downloadTorrent(server, info.linkUrl, null);
    });
    if (servers.length < 2) {
      continue;
    }
    createMenu(null, null, { type: "separator" });
  }
};
createMenus();
