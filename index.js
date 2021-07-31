const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const path = require("path");

app.commandLine.appendSwitch("enable-features", "ElectronSerialChooser");

app.on("ready", () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      enableBlinkFeatures: "Serial",
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.loadFile(path.join(__dirname, "public/index.html"));

  ipcMain.handle("dark-mode:toggle", () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = "light";
    } else {
      nativeTheme.themeSource = "dark";
    }

    return nativeTheme.shouldUseDarkColors;
  });

  mainWindow.webContents.session.on(
    "select-serial-port",
    (event, portList, webContent, callback) => {
      event.preventDefault();

      function handleSerialSelectedPort(event, arg) {
        callback(arg);
      }

      ipcMain.once("serial:selected-port", handleSerialSelectedPort);

      mainWindow.webContents.send("serial:ports-available", portList);
    }
  );
});
