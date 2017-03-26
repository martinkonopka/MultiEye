const fs = require("fs");
const path = require("path");

//Function creates a new CodeWindow object with text from file 
function loadFile(filePath){
    projectFilePath = filePath;
    
    let extension = path.extname(projectFilePath);

    if(extension === ".json"){
        let data = fs.readFileSync(projectFilePath, 'utf-8');    

        if(project !== null){
            ipcRenderer.send("open", projectFilePath);
            return;
        }

        project = new Project(JSON.parse(data));
        loadProject();

        let max = project.getFixations().length;

        let seekbar = document.getElementById("seekbar");

        createTicks(max);
    }
}

//Function loads all fixations and patterns
function loadProject(){
    let lastColor = null;
    
    for(const json of project.getFixations()){
        playIndex++;
    
        let codeWindow = codeWindows.objectWithFile(json.file); //find if CodeWindow with file already exists

        if(codeWindow === null){
            codeWindow = new CodeWindow(json.file);
            
            let data = fs.readFileSync(json.file, "utf-8");
            
            codeWindow.addText(data);
            codeWindows.push(codeWindow);
        }

        //if next fixation is in another file then generate a color for current fixations
        if(playIndex < project.getFixations().length - 1 && json.file !== project.getFixations()[playIndex + 1].file){
            lastColor = '#'+Math.random().toString(16).substr(-6);
            
            let node = codeWindow.addNode(json, lastColor);
            
            fileLines.push({ //add first end of file line
                "color": lastColor,
                "codeWindow1": codeWindow,
                "node1": node
            });
        }
        else if(lastColor !== null){ //if current fixation is first in this file set its color
            let node = codeWindow.addNode(json, lastColor);
            lastColor = null;
            
            fileLines[fileIndex].node2 = node; //add second end of file line
            fileLines[fileIndex].codeWindow2 = codeWindow;
            fileIndex++;
        }
        else{
            codeWindow.addNode(json);
        }
        
        codeWindow.edits.push({
           "range": json.range,
            "text": json.text
        });
    }
    
    let patternWrapper = document.getElementById("patternWrapper");
    let seekbar = document.getElementById("seekbar");
    
    playIndex++;
    let step = seekbar.clientWidth / playIndex;
    
    for(let i = 0; i <= playIndex - 1; i++){
        let line = document.createElement("div");
                
        line.style.left = (174 + ((i + 1) * step) + (11 - 22 * (i / playIndex))) + "px";
        line.setAttribute("id", "fix" + i);
        line.classList.add("fixation");
        line.textContent = i;
        
        patternWrapper.appendChild(line);
    }
    
    playIndex = -1; //reinitialize playIndex
    fileIndex = 0; //reinitialize fileIndex
    
    //load all patterns saved in project
    for(const pattern of project.getPatterns()){
        new Pattern(pattern);
    }
    
    sortPatternLines();
}

function createTicks(max){
    let tickWrapper = document.getElementById("tickWrapper");
    let seekbar = document.getElementById("seekbar");
    
    let step = seekbar.clientWidth / max;

    seekbar.max = max; //set the number of steps on seekbar to the amount of fixations

    tickWrapper.style.width = seekbar.clientWidth + "px";
    
    for(let i = 1; i <= max; i++){
        let tick = document.createElement("div");
        let div = document.createElement("div");
        tick.classList.add("tick");        
        
        tick.style.left = (i * step) + (11 - 22 * (i / max)) + "px";
        tick.appendChild(div);
        tickWrapper.appendChild(tick);
    }
}

(function() {   
    let body = document.getElementsByTagName("body")[0];
    
    body.ondragover = function(){
        body.style.opacity = 0.3;
        
        return false;
    }
    
    body.ondragleave = function(){ 
        body.style.opacity = 1;
        
        return false;
    }
    
    body.ondrop = function(e){
        e.preventDefault();
        
        body.style.opacity = 1;

        let file = e.dataTransfer.files[0];
        
        loadFile(file.path);
        
        return false;
    };
})();