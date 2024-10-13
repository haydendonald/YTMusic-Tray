import { menubar } from "menubar";
import { app, session, ipcMain, Tray, Menu, shell } from "electron";
import * as path from "path";
import * as fs from "fs";
import AutoLaunch from "auto-launch";

//Set the app name and version
const appName = "YT Music Tray";
const appGit = "https://www.github.com/haydendonald/ytmusic-tray";
const appGitIssues = "https://www.github.com/haydendonald/ytmusic-tray/issues";
const appVersion = process.env.npm_package_version;
const appPath = app.getPath("exe");

//Set our locations for the icons and html
const iconPath = path.join(__dirname, "assets", "icons");
const htmlPath = path.join(__dirname, "assets", "html");
const html = {
  about: path.join(htmlPath, "about.html"),
  aboutGenerated: path.join(htmlPath, "about_gen.html")
}
const icons = {
  youtubeIcon: path.join(iconPath, 'ytmusic.png'),
  likeButton: {
    liked: path.join(iconPath, 'liked.png'),
    notLiked: path.join(iconPath, 'notliked.png')
  },
  dislikeButton: {
    disliked: path.join(iconPath, 'disliked.png'),
    notDisliked: path.join(iconPath, 'notdisliked.png')
  },
  playPauseButton: {
    play: path.join(iconPath, 'play.png'),
    pause: path.join(iconPath, 'pause.png')
  },
  previousButton: path.join(iconPath, 'previous.png'),
  nextButton: path.join(iconPath, 'next.png')
}

//Should we auto launch the app
const autoLaunch = new AutoLaunch({
  name: appName,
  path: appPath
});

async function printInfo() {
  //Print out the version and some information
  console.log("-".repeat(80));
  console.log(`Welcome to ${appName} by Hayden Donald https://www.github.com/haydendonald`);
  console.log(`Version ${appVersion}`)
  console.log(`GitHub: ${appGit}`);
  console.log(`Report any bugs: ${appGitIssues}`);
  console.log(`Auto launch: ${await autoLaunch.isEnabled()}`);
  console.log("-".repeat(80));
  console.log(`Running on Node ${process.versions.node}`);
  console.log(`Running on Electron ${process.versions.electron}`);
  console.log(`Running on Chrome ${process.versions.chrome}`);
  console.log("-".repeat(80));
}
printInfo();

//Generate the about page with the correct links and version
fs.readFile(html.about, 'utf8', function (err, data) {
  if (err) { return console.log(err); }
  data = data.replace(/{APPNAME}/g, appName);
  data = data.replace(/{APPGITURL}/g, appGit);
  data = data.replace(/{APPGITURLISSUES}/g, appGitIssues);
  data = data.replace(/{APPVERSIONURL}/g, `${appGit}/releases/tag/release-v${appVersion}`);
  data = data.replace(/{APPVERSION}/g, appVersion);
  fs.writeFile(html.aboutGenerated, data, 'utf8', function (err) { if (err) return console.log(err); });
});

//Runtime variables
let currentTrack = "";
let isPlaying = false;
let isLiked = false;
let isDisliked = false;
let currentSession: Electron.Session;
let currentCookies: Electron.Cookies;

app.on("ready", () => {
  //Create our tray icons
  const mainTray = new Tray(icons.youtubeIcon);
  const likeButtonTray = new Tray(icons.likeButton.notLiked);
  const nextButtonTray = new Tray(icons.nextButton);
  const playPauseButtonTray = new Tray(icons.playPauseButton.play);
  const previousButtonTray = new Tray(icons.previousButton);
  const dislikeButtonTray = new Tray(icons.dislikeButton.notDisliked);

  mainTray.setToolTip("Open Youtube Music");
  previousButtonTray.setToolTip("Skip to previous track");
  nextButtonTray.setToolTip("Goto the next track");

  //When the user right clicks the icon open the menu
  mainTray.on("right-click", async () => {
    const template: Electron.MenuItemConstructorOptions[] = [
      { label: `${isPlaying ? "Playing " : ""}${currentTrack}`, type: "normal" },

      { type: 'separator' },
      { label: `${isPlaying ? "Pause " : "Play "}${currentTrack}`, type: "normal", click: () => { actions.pressPlay() } },

      { type: 'separator' },
      { label: `${isLiked ? "Remove Like from " : "Like "}${currentTrack}`, type: "normal", click: () => { actions.pressLike() } },
      { label: `${isDisliked ? "Remove Dislike from " : "Dislike "}${currentTrack}`, type: "normal", click: () => { actions.pressDislike() } },

      { type: 'separator' },
      { label: `Next`, type: "normal", click: () => { actions.pressNext() } },
      { label: `Previous`, type: "normal", click: () => { actions.pressPrevious() } },

      { type: 'separator' },
      {
        label: `Advanced`, type: "submenu", submenu: [
          { label: `Reload`, type: "normal", role: "reload" },
          { label: `Toggle Dev Tools`, type: "normal", role: "toggleDevTools" },
          { label: `Reset Zoom`, type: "normal", role: "resetZoom" },
          { label: `Clear Cookies`, type: "normal", click: () => { currentSession.clearStorageData(); } }
        ]
      },
      {
        label: `Launch at login`, type: "checkbox", click: (menuItem, window, event) => {
          console.log("Launch at Login", menuItem.checked);
          autoLaunch.isEnabled().then((enabled) => {
            if (enabled) {
              autoLaunch.disable();
            } else {
              autoLaunch.enable();
            }
          });
        }, checked: await autoLaunch.isEnabled()
      },
      { label: `About ${appName}`, type: "normal", click: () => { aboutWindow.showWindow() } },
      { type: 'separator' },
      { label: `Quit ${appName}`, type: "normal", role: "quit" },
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    mainTray.popUpContextMenu(contextMenu);
  });

  //Create the main window
  const mainWindow = menubar({
    index: "https://music.youtube.com",
    browserWindow: {
      width: 940, //Minimum width for YT music to show the like button
      height: 600,
      resizable: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        partition: 'persist:YTMusic'
      },
    },
    preloadWindow: true,
    tray: mainTray
  });

  //Create the about window
  const aboutWindow = menubar({
    index: `file://${html.aboutGenerated}`,
    browserWindow: {
      width: 500,
      height: 350,
    },
    tray: mainTray,
    disableClick: true
  });

  //Open external links in the default browser
  aboutWindow.on("after-create-window", () => {
    aboutWindow.window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: "deny" }
    })
  });

  mainWindow.on("ready", () => {
    console.log("Load in the previous session");
    currentSession = session.fromPartition('persist:YTMusic');
    currentCookies = currentSession.cookies;

    //Show the main window if this is our first launch
    mainWindow.showWindow();
  });

  mainWindow.app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');
  aboutWindow.app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');

  let changedCookies: Record<string, Electron.CookiesSetDetails> = {};

  //Setup the handles for when the renderer sends us a message
  const handles = {
    "trackChanged": (event: Electron.IpcMainInvokeEvent, title: string) => {
      console.log(`Track changed to ${title}`);
      currentTrack = title;
    },
    "likeChanged": (event: Electron.IpcMainInvokeEvent, state: boolean) => {
      console.log(`Like changed to ${state}`);
      likeButtonTray.setToolTip(`${state ? "Remove Like from " : "Like "}${currentTrack}`);
      likeButtonTray.setImage(state ? icons.likeButton.liked : icons.likeButton.notLiked);
      isLiked = state;
    },
    "dislikeChanged": (event: Electron.IpcMainInvokeEvent, state: boolean) => {
      console.log(`Dislike changed to ${state}`);
      dislikeButtonTray.setToolTip(`${state ? "Remove Dislike from " : "Dislike "}${currentTrack}`);
      dislikeButtonTray.setImage(state ? icons.dislikeButton.disliked : icons.dislikeButton.notDisliked);
      isDisliked = state;
    },
    "playChanged": (event: Electron.IpcMainInvokeEvent, state: boolean) => {
      console.log(`Play changed to ${state}`);
      playPauseButtonTray.setToolTip(`${state ? "Pause " : "Start playing "}${currentTrack}`);
      playPauseButtonTray.setImage(state ? icons.playPauseButton.pause : icons.playPauseButton.play);
      isPlaying = state;
    }
  }

  //Setup the actions to send to the renderer
  const actions = {
    "pressPlay": () => {
      mainWindow.window?.webContents.send("pressPlay");
    },
    "pressLike": () => {
      mainWindow.window?.webContents.send("pressLike");
    },
    "pressDislike": () => {
      mainWindow.window?.webContents.send("pressDislike");
    },
    "pressNext": () => {
      mainWindow.window?.webContents.send("pressNext");
    },
    "pressPrevious": () => {
      mainWindow.window?.webContents.send("pressPrevious");
    }
  }

  //Setup the tray buttons to send the actions
  playPauseButtonTray.on("click", () => { actions.pressPlay() });
  likeButtonTray.on("click", () => { actions.pressLike() });
  dislikeButtonTray.on("click", () => { actions.pressDislike() });
  nextButtonTray.on("click", () => { actions.pressNext() });
  previousButtonTray.on("click", () => { actions.pressPrevious() });


  //Subscribe the handles
  for (let handle in handles) {
    //@ts-ignore
    ipcMain.handle(handle, handles[handle])
  }

  //When the window is created
  mainWindow.on("after-create-window", () => {
    if (mainWindow.window) {

      //Keep track of what cookies changed, save this when the user leaves the window
      mainWindow.window.webContents.session.cookies.on("changed", function (event, cookie, cause, removed) {
        const cookieDetails = {
          url: "https://music.youtube.com",
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          expirationDate: cookie.expirationDate
        };
        changedCookies[cookieDetails.name] = cookieDetails;
      });
    }

    //Tell the window that we are ready
    mainWindow.window?.webContents.send("ready");
  });

  //When the window is closed save the cookies to keep us logged in
  mainWindow.on("hide", () => {
    console.log("Window closed");

    //Save the cookies
    const numCookies = Object.keys(changedCookies).length;
    if (numCookies > 0) {
      console.log(`Saving ${numCookies} cookies to persist:YTMusic`);
      for (const cookieName in changedCookies) {
        currentCookies.set(changedCookies[cookieName]);
      }
      changedCookies = {};
      currentCookies.flushStore();
    }
  });
});