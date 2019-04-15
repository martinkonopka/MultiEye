//Function creates a new CodeWindow object with text from file 
function loadFile(filePath) {
    let extension = path.extname(filePath);

    if (extension === projectExtension) {
        let data = fs.readFileSync(filePath, 'utf-8');

        if (project !== null) {
            ipcRenderer.send("open", filePath);
            return;
        }

        document.title += " - " + filePath;

        project = new Project(JSON.parse(data), filePath);
        loadProject();

        createTicks();
    }
}

function loadCodeWindow(ev) {
    let codeWindow = codeWindows.objectWithFile(ev.data.path);
    if (codeWindow === null) {
        codeWindow = new CodeWindow(ev.data);
        
        let data = "";
        if (ev.data.contents) {
            data = ev.data.contents;
        }
        else {
            console.log("loading data: " + ev.data.path);
          try {
              data = fs.readFileSync(ev.data.path, "utf-8");
          }
          catch (e) {
              console.log(ev);
          }
        }
        let extension = path.extname(ev.data.path);
        
        codeWindow.addText(data, extension);
        codeWindows.push(codeWindow);
    }
    return codeWindow;
}

//Function loads all fixations and patterns
function loadProject() {
    let lastColor = null;
    let wholeProject = project.getWhole();
    let fixations = project.getFixations();
    let events = project.getEvents();

    events.filter(ev => ev.name === "EditorOpen" && ev.data)
          .forEach(ev => loadCodeWindow(ev));

    for (let i = 0; i < fixations.length; i++) {
        let codeWindow = codeWindows.objectWithFile(fixations[i].data.path); //find if CodeWindow with file already exists

        // TODO remove
        if (codeWindow === null) { // this is only fallback if the code window was not loaded from the EditorOpen event before
            codeWindow = loadCodeWindow(fixations[i]);
        }

        if (fixations[i].name !== "Fixation") {
            continue;
        }

        // CLEANUP
        // nodeIndex++;

        //if next fixation is in another file then generate a color for current fixations
        // CLEANUP
        //if(nodeIndex < fixations.length - 1 && fixations[nodeIndex].data.path !== fixations[nodeIndex + 1].data.path){
        if (i < fixations.length - 1
            && fixations[i].data.path !== fixations[i + 1].data.path) {
            lastColor = '#' + Math.random().toString(16).substr(-6);

            codeWindow.addNode(i, fixations[i], lastColor);
        }
        else if (lastColor !== null) { //if current fixation is first in this file set its color
            codeWindow.addNode(i, fixations[i], lastColor);
            lastColor = null;
        }
        else {
            codeWindow.addNode(i, fixations[i]);
        }
    }

    changeScale(true, window.innerHeight - 110, true);

    nodeIndex = -1; //reinitialize nodeIndex
}

function createTicks() {
    let max = project.getWhole().length;
    let patternWrapper = document.getElementById("patternWrapper");
    let tickWrapper = document.getElementById("tickWrapper");
    let seekbar = document.getElementById("seekbar");

    originalWidth = max * 10;

    originalWidth = (originalWidth > 1700) ? originalWidth : 1700;

    seekbar.style.width = originalWidth + "px";

    let step = seekbar.clientWidth / max;

    seekbar.max = max; //set the number of steps on seekbar to the amount of fixations

    tickWrapper.style.width = seekbar.clientWidth + "px";

    let fixationCounter = 0;
    for (let i = 0; i < max; i++) {
        if (project.getWhole()[i].name !== "Fixation") {
            continue;
        }

        nodeOrder[fixationCounter].playIndex = i;

        let tick = document.createElement("div");
        let div = document.createElement("div");
        tick.classList.add("tick");
        tick.style.left = ((i + 1) * step) + (11 - 22 * (i / max)) + "px";
        tick.appendChild(div);
        tickWrapper.appendChild(tick);

        let line = document.createElement("div");
        line.style.left = ((i + 1) * step) + (11 - 22 * (i / max)) + "px";
        line.setAttribute("id", "fix" + fixationCounter);
        line.classList.add("fixation");
        line.textContent = fixationCounter;

        let fontSize = 80 / (max - 1);

        line.style.fontSize = ((fontSize > 1.5) ? 1.5 : fontSize) + "em";

        patternWrapper.appendChild(line);

        fixationCounter++;
    }

    //Fixes scrolling desynchronization at the end of seekbar
    let pushLine = document.createElement("div");
    pushLine.classList.add("fixation");
    pushLine.style.left = (max * step + 200) + "px";
    patternWrapper.appendChild(pushLine);

    if (project.getPatterns() !== undefined) {
        //load all patterns saved in project
        for (const pattern of project.getPatterns()) {
            new Pattern(pattern);
        }

        sortPatternLines();
    }

    createSlidingWindow(config.fixationsDisplayed);
}

function createSlidingWindow(fixationsDisplayed) {
    let max = project.getWhole().length;
    let seekbar = document.getElementById("seekbar");

    let step = seekbar.clientWidth / max;

    let slidingWindow = document.getElementById("slidingWindow");

    slidingWindow.style.width = (fixationsDisplayed * step) + "px";
    slidingWindow.style.left = (174 + 30 - fixationsDisplayed * step) + "px";

}

function importPatterns(filePath) {
    let patterns = fs.readFileSync(filePath, "utf-8");

    savedPatterns = [];

    project.setPatterns(JSON.parse(patterns));


    let patternLines = document.getElementsByClassName("patternLine");
    let patternWrapper = document.getElementById("patternWrapper");
    let length = patternLines.length;

    for (let i = 1; i < length; i++) {
        patternWrapper.removeChild(patternLines[1]);
    }

    for (const pattern of project.getPatterns()) {
        new Pattern(pattern);
    }

    sortPatternLines();
}

(function () {
    let body = document.getElementsByTagName("body")[0];

    body.ondragover = function () {
        body.style.opacity = 0.3;

        return false;
    }

    body.ondragleave = function () {
        body.style.opacity = 1;

        return false;
    }

    body.ondrop = function (e) {
        e.preventDefault();

        body.style.opacity = 1;

        let file = e.dataTransfer.files[0];

        loadFile(file.path);

        return false;
    };
})();