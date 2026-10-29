// Runs in the extension's isolated world: copies the options to <html> data
// attributes, where the widget (running in the page's world) reads them.
const KEYS = { serverUrl: "canvasCoachServer", token: "canvasCoachToken", showForAll: "canvasCoachShowForAll" };

function apply(values) {
  const data = document.documentElement.dataset;
  for (const [key, attr] of Object.entries(KEYS)) {
    if (values[key] === undefined) continue;
    if (values[key] === "" || values[key] === false) delete data[attr];
    else data[attr] = String(values[key]);
  }
}

chrome.storage.sync.get(Object.keys(KEYS), apply);
chrome.storage.onChanged.addListener((changes) => {
  apply(Object.fromEntries(Object.entries(changes).map(([k, c]) => [k, c.newValue ?? ""])));
});
