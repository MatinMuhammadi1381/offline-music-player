"use strict";

const fileInput = document.querySelector("#audio-files");
const selectionStatus = document.querySelector("#selection-status");
const folderSupport = document.querySelector("#folder-support");
const trackPickerLabel = document.querySelector("#track-picker-label");
const trackPicker = document.querySelector("#track-picker");
const audioPlayer = document.querySelector("#audio-player");
const playbackStatus = document.querySelector("#playback-status");
const storageStatus = document.querySelector("#storage-status");
const persistButton = document.querySelector("#persist-button");
const secureContextStatus = document.querySelector("#secure-context-status");
const installStatus = document.querySelector("#install-status");
const deviceDetails = document.querySelector("#device-details");
const observations = document.querySelector("#observations");
const copyReportButton = document.querySelector("#copy-report");
const reportStatus = document.querySelector("#report-status");

let currentObjectUrl;

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function playSelectedFile() {
  const file = fileInput.files && fileInput.files[Number(trackPicker.value)];
  if (!file) return;

  if (currentObjectUrl) {
    audioPlayer.pause();
    URL.revokeObjectURL(currentObjectUrl);
  }
  currentObjectUrl = URL.createObjectURL(file);
  audioPlayer.src = currentObjectUrl;
  audioPlayer.hidden = false;
  playbackStatus.textContent = `Ready to play: ${file.name}.`;
}

function updateStorageStatus(persisted) {
  if (!navigator.storage) {
    storageStatus.textContent = "The Storage API is not available in this browser.";
    persistButton.disabled = true;
    return;
  }

  const persistCapability = typeof navigator.storage.persist === "function";
  storageStatus.textContent = `Storage API available. Persistent storage API: ${persistCapability ? "available" : "not available"}. Persistent grant: ${persisted === undefined ? "not requested or unavailable" : persisted ? "granted" : "not granted"}.`;
  persistButton.disabled = !persistCapability;
}

fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files || []);
  if (currentObjectUrl) {
    audioPlayer.pause();
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = undefined;
  }

  trackPicker.replaceChildren();
  if (files.length === 0) {
    selectionStatus.textContent = "No files selected.";
    audioPlayer.removeAttribute("src");
    audioPlayer.hidden = true;
    trackPicker.hidden = true;
    trackPickerLabel.hidden = true;
    playbackStatus.textContent = "";
    return;
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  selectionStatus.textContent = `${files.length} file${files.length === 1 ? "" : "s"} selected · ${formatBytes(totalBytes)} total.`;
  files.forEach((file, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = file.name;
    trackPicker.append(option);
  });
  trackPicker.hidden = files.length < 2;
  trackPickerLabel.hidden = files.length < 2;
  playSelectedFile();
});

trackPicker.addEventListener("change", playSelectedFile);

audioPlayer.addEventListener("error", () => {
  playbackStatus.textContent = "This file could not be played by the browser. Try another supported audio file.";
});

persistButton.addEventListener("click", async () => {
  if (!navigator.storage || typeof navigator.storage.persist !== "function") {
    updateStorageStatus();
    return;
  }

  persistButton.disabled = true;
  storageStatus.textContent = "Requesting persistent storage…";
  try {
    const granted = await navigator.storage.persist();
    updateStorageStatus(granted);
  } catch (error) {
    storageStatus.textContent = `The persistent storage request failed: ${error.message || "unknown error"}`;
  } finally {
    persistButton.disabled = false;
  }
});

copyReportButton.addEventListener("click", async () => {
  const report = [
    "iOS File Access Feasibility Test",
    `Date: ${new Date().toISOString()}`,
    `User agent: ${navigator.userAgent}`,
    `Secure context: ${window.isSecureContext ? "yes" : "no"}`,
    `Installed display mode: ${window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser"}`,
    `Directory picker API: ${"showDirectoryPicker" in window ? "available" : "not available"}`,
    `Multiple file input: ${fileInput.multiple ? "enabled" : "disabled"}`,
    `Selected file count: ${fileInput.files ? fileInput.files.length : 0}`,
    `Storage: ${storageStatus.textContent}`,
    `Device and OS: ${deviceDetails.value.trim() || "not recorded"}`,
    `Reload/reopen observations: ${observations.value.trim() || "not recorded"}`,
    "",
    "No audio data or filenames are included in this report."
  ].join("\n");

  try {
    await navigator.clipboard.writeText(report);
    reportStatus.textContent = "Test report copied to the clipboard.";
  } catch (error) {
    reportStatus.textContent = `Clipboard access failed: ${error.message || "use the browser's copy or share action"}`;
  }
});

folderSupport.textContent = `Directory picker API: ${"showDirectoryPicker" in window ? "available in this browser (not tested by this page)" : "not available"}. Multiple file picker: ${fileInput.multiple ? "enabled" : "disabled"}.`;
secureContextStatus.textContent = `Secure context: ${window.isSecureContext ? "yes" : "no"}. PWA installation and service workers require HTTPS, except on localhost.`;
installStatus.textContent = `Installed app display mode: ${window.matchMedia("(display-mode: standalone)").matches ? "standalone (Home Screen app)" : "browser tab"}.`;

if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    installStatus.textContent += ` Offline app-shell setup failed: ${error.message || "unknown error"}`;
  });
}

updateStorageStatus();
