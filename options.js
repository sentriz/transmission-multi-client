import { app, h } from "./hyperapp201.js";

//
// begin helpers
const exampleRPCUrl = `http://my.domain/transmission/rpc`;
const exampleDLFolders = [
  "/downloads/film",
  "/downloads/series",
  "/downloads/music"
].join("\n");
const newServ = name => ({
  name,
  username: "",
  password: "",
  rpc: "",
  folders: ""
});

//
// begin generic effect constructors
const StorageR = props => [
  async (dispatch, { action = s => s, key }) => {
    const data = await browser.storage.sync.get(key);
    dispatch(action, data[key]);
  },
  props
];

const StorageW = props => [
  async (dispatch, { action = s => s, key, data }) => {
    await browser.storage.sync.set({ [key]: data });
    dispatch(action);
  },
  props
];

//
// begin actions
const ServStorageR = state => [
  state,
  StorageR({
    key: "servers",
    action: (state, servers) => ({ ...state, servers: servers || [] })
  })
];
const ServStorageW = state => [
  { ...state, canSave: false },
  StorageW({ key: "servers", data: state.servers })
];
const ServCreate = state => ({
  ...state,
  canSave: true,
  servers: state.servers.concat(newServ(""))
});
const ServUpdate = (state, change) => ({
  ...state,
  canSave: true,
  servers: state.servers.map((server, i) =>
    i === change.i ? { ...server, [change.k]: change.v } : server
  )
});
const ServDelete = (state, index) => ({
  ...state,
  canSave: true,
  servers: state.servers.filter((_, i) => i != index)
});

//
// begin components
const SField = (type, i, k, v, exprop) =>
  h(type, {
    ...exprop,
    value: v,
    oninput: [ServUpdate, e => ({ i, k, v: e.target.value })]
  });
const SText = (i, k, v, exprop) =>
  SField("input", i, k, v, { ...exprop, type: "text" });
const SPassword = (i, k, v, exprop) =>
  SField("input", i, k, v, { ...exprop, type: "password" });
const STextArea = (i, k, v, { ...exprop }) =>
  SField("textarea", i, k, v, exprop);
const SRow = (k, sk, v) => {
  const items = [h("p", { class: "row-text" }, k)];
  if (sk) {
    items.push(h("p", { class: "row-sub-text" }, sk));
  }
  return h("tr", {}, [h("td", { class: "row-desc" }, items), h("td", {}, v)]);
};
const Serv = (i, server) =>
  h("div", { class: "server" }, [
    // prettier-ignore
    h("table", {}, [
      SRow("server alias", "",
        SText(i, "name", server.name)),
      SRow("username", "",
        SText(i, "username", server.username)),
      SRow("password", "",
        SPassword(i, "password", server.password)),
      SRow("rpc url", "",
        SText(i, "rpc", server.rpc, { placeholder: exampleRPCUrl })),
      SRow("download folders", "(one per line)",
        STextArea(i, "folders", server.folders, { placeholder: exampleDLFolders })),
    ]),
    h("div", { class: "button-row" }, [
      h("button", { onClick: [ServDelete, i] }, "delete server")
    ])
  ]);
const ServList = servers => servers.map((server, i) => Serv(i, server));
const App = state =>
  h("div", { class: "container" }, [
    h("h4", {}, "transmission multi client"),
    ...ServList(state.servers),
    h("div", { class: "button-row" }, [
      h("button", { onClick: ServCreate }, "new server")
    ]),
    h("div", { class: "button-row save-controls" }, [
      h("button", { onClick: ServStorageW, disabled: !state.canSave }, "save"),
      h("button", { onClick: ServStorageR }, "cancel")
    ])
  ]);

//
// begin app
app({
  init: ServStorageR({ canSave: false, servers: [] }),
  view: App,
  node: document.getElementById("app")
});
