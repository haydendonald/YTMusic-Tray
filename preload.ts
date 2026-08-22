const { ipcRenderer } = require('electron')

//The left controls buttons block
const leftControlsButtons = {
    element: () => {
        for (let element of document.getElementById("left-controls")?.children || []) {
            if (element.classList.contains("left-controls-buttons")) {
                return element;
            }
        }
    }
}

//The middle controls block
const middleControls = {
    buttons: () => {
        return document.getElementsByClassName("middle-controls")[0]?.getElementsByClassName("middle-controls-buttons")[0]?.getElementsByTagName("button")
    },
    track: () => { return document.getElementsByClassName("middle-controls")[0]?.getElementsByClassName("content-info-wrapper style-scope ytmusic-player-bar")[0] }
}

//The current track name
const track = {
    element: () => { return middleControls.track()?.getElementsByClassName("title")[0] },
    get: () => { return track.element()?.innerHTML || "Not Playing" }
}

//The like button
const likeButton = {
    element: () => {
        const buttons = middleControls.buttons();
        if (!buttons) { return undefined; }
        for (const button of buttons) {
            if (button.getAttribute("aria-label") == "Like") {
                return button;
            }
        }
    },
    get: () => { return likeButton.element()?.getAttribute("aria-pressed") == "true" || false },
    click: () => { likeButton.element()?.click() }
}

//The dislike button
const dislikeButton = {
    element: () => {
        const buttons = middleControls.buttons();
        if (!buttons) { return undefined; }
        for (const button of buttons) {
            if (button.getAttribute("aria-label") == "Dislike") {
                return button;
            }
        }
    },
    get: () => { return dislikeButton.element()?.getAttribute("aria-pressed") == "true" || false },
    click: () => { dislikeButton.element()?.click() }
}

//The play button
const playButton = {
    element: () => { return document.getElementById("play-pause-button")?.getElementsByTagName("button")[0] },
    get: () => { return playButton.element()?.getAttribute("aria-label") != "Play" || false },
    click: () => { playButton.element()?.click() }
}

//The previous track button
const prevButton = {
    element: () => {
        for (let element of leftControlsButtons.element()?.children || []) {
            if (element.getAttribute("title") == "Previous") {
                return element as HTMLButtonElement;
            }
        }
    },
    click: () => {
        prevButton.element()?.click();
    }
}

//The next track button
const nextButton = {
    element: () => {
        for (let element of leftControlsButtons.element()?.children || []) {
            if (element.getAttribute("title") == "Next") {
                return element as HTMLButtonElement;
            }
        }
    },
    click: () => {
        nextButton.element()?.click();
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
    let currentTrack = track.get();
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