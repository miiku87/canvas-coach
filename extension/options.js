const fields = ["serverUrl", "token", "showForAll"];

chrome.storage.sync.get(fields, (values) => {
  document.getElementById("serverUrl").value = values.serverUrl ?? "";
  document.getElementById("token").value = values.token ?? "";
  document.getElementById("showForAll").checked = values.showForAll === true;
});

document.getElementById("save").addEventListener("click", () => {
  const serverUrl = document.getElementById("serverUrl").value.trim().replace(/\/$/, "");
  chrome.storage.sync.set(
    {
      serverUrl,
      token: document.getElementById("token").value.trim(),
      showForAll: document.getElementById("showForAll").checked,
    },
    () => {
      document.getElementById("status").textContent = "Tallennettu. Päivitä Canvas-sivu.";
    },
  );
});
