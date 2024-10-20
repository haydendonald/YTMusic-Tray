const { ipcRenderer } = require('electron')

//Get the left control buttons element
function getLeftControlButtons() {
    const controls = document.getElementById("left-controls");
    for (let element of controls.children) {
        if (element.classList.contains("left-controls-buttons")) {
            return element;
        }
    }
}

//Get the middle control element
function getMiddleControl() {
    return document.getElementsByClassName("middle-controls")[0].getElementsByClassName("content-info-wrapper")[0];
}

//Get the track name
function getTrack() {
    return getMiddleControl().getElementsByClassName("title")[0].innerHTML || "Not Playing";
}

//The like button
const likeButton = {
    get: () => { return document.getElementById("button-shape-like").getAttribute("aria-pressed") == "true" || false },
    click: () => { document.getElementById("button-shape-like").getElementsByTagName("button")[0].click() }
}

//The dislike button
const dislikeButton = {
    get: () => { return document.getElementById("button-shape-dislike").getAttribute("aria-pressed") == "true" || false },
    click: () => { document.getElementById("button-shape-dislike").getElementsByTagName("button")[0].click() }
}

//The play button
const playButton = {
    get: () => { return document.getElementById("play-pause-button").getAttribute("aria-label") != "Play" || false },
    click: () => { document.getElementById("play-pause-button").click() }
}

//The previous track button
const prevButton = {
    click: () => {
        for (let element of getLeftControlButtons().children) {
            console.log(element);
            if (element.getAttribute("title") == "Previous") {
                return (element as HTMLButtonElement).click();
            }
        }
    }
}

//The next track button
const nextButton = {
    click: () => {
        for (let element of getLeftControlButtons().children) {
            console.log(element);
            if (element.getAttribute("title") == "Next") {
                return (element as HTMLButtonElement).click();
            }
        }
    }
}

let lastTrack: string | undefined;
let lastLike: boolean | undefined;
let lastDislike: boolean | undefined;
let lastPlay: boolean | undefined;

//If the main thread requests a state update, reset the last states so we can send them again
ipcRenderer.on("getStates", () => {
    lastTrack = undefined;
    lastLike = undefined;
    lastDislike = undefined;
    lastPlay = undefined;
});

//Periodically check if there were any updates
setInterval(() => {
    //Track
    let currentTrack = getTrack();
    if (currentTrack != lastTrack) {
        console.log(`Track changed to ${currentTrack}`);
        lastTrack = currentTrack;
        ipcRenderer.invoke("trackChanged", currentTrack);
    }

    //Like
    let currentLike = likeButton.get();
    if (currentLike != lastLike) {
        console.log(`Like changed to ${currentLike}`);
        lastLike = currentLike;
        ipcRenderer.invoke("likeChanged", currentLike);
    }

    //Dislike
    let currentDislike = dislikeButton.get();
    if (currentDislike != lastDislike) {
        console.log(`Dislike changed to ${currentDislike}`);
        lastDislike = currentDislike;
        ipcRenderer.invoke("dislikeChanged", currentDislike);
    }

    //Play
    let currentPlay = playButton.get();
    if (currentPlay != lastPlay) {
        console.log(`Play changed to ${currentPlay}`);
        lastPlay = currentPlay;
        ipcRenderer.invoke("playChanged", currentPlay);
    }
}, 1000);

//Handle incoming actions
ipcRenderer.on("pressLike", () => {
    likeButton.click();
});
ipcRenderer.on("pressDislike", () => {
    dislikeButton.click();
});
ipcRenderer.on("pressPlay", () => {
    playButton.click();
});
ipcRenderer.on("pressNext", () => {
    nextButton.click();
});
ipcRenderer.on("pressPrevious", () => {
    prevButton.click();
});