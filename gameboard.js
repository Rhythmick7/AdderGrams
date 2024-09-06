
class gameBoard {
    constructor() {
        this.version = "gameboard.js";
        let newDate = new Date();
        // let y = newDate.getFullYear();
        // let m = newDate.getMonth();
        // let d = newDate.getDate();
        // newDate = new Date(y,m,d); // midnight just gone
        newDate = setMidnight(newDate);

        this.gbd = new Date(newDate); // Default to todays date and time
        this.firstPuzzle = new Date(2023, 6, 18) // first puzzle date 18th July 2023
        this.nextDate = new Date(newDate); // Next date to load - not used (yet)

        this.pid = "";
        this.rating = "H"; // option to publish Hard, Medium and Easy puzzles
        this.status = "N"; // N = Not Started. P = Partial. C = Complete.
        this.clueSet = {};
        this.guesses = {};
        this.scores = {};
        this.totalScore = 0; // 0 if not completed
        this.shareData = "";
        this.fileList = {};
        this.filestatus = {};
        this.completed = 0;
        this.partial = 0;
        this.available = 0;
        this.puzzleCount = 0;
        this.currentPuzzle = 0; // index number of current puzzle
        this.board = document.getElementById("game-board");
        this.clue = document.getElementById("clue");
        this.csrClue = 0;
        this.csrLett = 0;
        this.checks = "L"; // L = Letters, W = Words, N = None
        this.checksmap = new Map(); // maps difficulty modes to letter scores
        this.checksmap.set("L",2);
        this.checksmap.set("W",4);
        this.checksmap.set("N",5);
        this.movingKeyboard = false;
        this.movingClue = false;
        this.boxWidth = 6; // letter box width in %
        this.showHints = false;
        this.solvePuzzleWarned = false;
        this.bombWarned = false;
        this.showDateMenu = false;
        this.maxLetters = 0; // 0 = Not Set
    }
    fileName(useNextDate = false) {
        let d, m, y;
        if (useNextDate) {
            d = this.nextDate.getDate();
            m = this.nextDate.getMonth();
            y = this.nextDate.getFullYear();
        } else {
            d = this.gbd.getDate();
            m = this.gbd.getMonth();
            y = this.gbd.getFullYear();
        }
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
            "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        let month = months[m];
        let f = String(d).padStart(2,"0")
        + "-"
        + month
        + "-"
        + String(y)
        + "-"
        + this.rating;
        return f;
    }
    cycleChecks() {
        switch (this.checks) {
            case "L":
                this.checks = "W";
                break;
            case "W":
                this.checks = "N";
                break;
            case "N":
                this.checks = "L";
                break;
          }
          localStorage.setItem("checks", this.checks);
          this.setButtons();
    }

    setDate(d) {
        if (Object.prototype.toString.call(d) !== "[object Date]") {
            throw new TypeError("Parameter passed should be a date");
        }
        let d2 = new Date();
        d2 = setMidnight(d2);
        // let y = d2.getFullYear();
        // let m = d2.getMonth();
        // let dd = d2.getDate()
        // d2 = new Date(y,m,dd);
        // y = d.getFullYear();
        // m = d.getMonth();
        // dd = d.getDate()
        // d = new Date(y,m,dd); // set back to midnight
        d = setMidnight(d);

        if (d < d2 && d >= this.firstPuzzle) {
            this.gbd = d;
        }
        this.load();
    }
    changeDate(delta) {
        // get newDate value
        this.gbd.setDate(this.gbd.getDate() + delta);
        let todayDate = new Date();
        let dd = todayDate.getDate();
        let mm = todayDate.getMonth();
        let yy = todayDate.getFullYear();
        todayDate = new Date(yy,mm,dd);
    
        if (localStorage.getItem("AllowFuture") == "Yes") {
            // allow traversal beyond date range
        } else { 
            // constrain within range
            if (this.gbd > todayDate) {
                this.gbd = new Date(todayDate);
            } else if (this.gbd < this.firstPuzzle) {
                this.gbd = new Date(this.firstPuzzle);
            }
        }
        this.load();
        this.showStatus();
    }
    showStatus() {
        let s = "";
        switch (this.status) {
            case "N":
                s = "Not started";
                break;
            case "P":
                s = "Partially completed";
                break;
            case "C":
                s = "Completed";
                break;
            }
        // update puzzle panel button text
        document.getElementById("btnStatus").innerHTML = s;
    }
    
    failedToLoad() {
        let text = '[' +
            '{"answer":"AB","clue":"Puzzle missing - test alphabet" },' +
            '{"answer":"ABC","clue":"Puzzle missing - test alphabet" },' +
            '{"answer":"ABCD","clue":"Puzzle missing - test alphabet" },' +
            '{"answer":"ABCDE","clue":"Puzzle missing - test alphabet" },' +
            '{"answer":"ABCDEF","clue":"Puzzle missing - test alphabet" }' +
            ' ]';
        let cls = JSON.parse(text);
        this.loaded(cls);
    }
    load() {
        console.log(this.version);
        this.pid = localStorage.getItem("PlayerID");
        // callback to this.loaded after file is loaded and JSON parsed
        // callback to this.failedToLoad on error
        fetchPuzzle(this.fileName());
        //fetchFileList(); // In parallel to file load

        // Show welcome tour if not already seen
        if (localStorage.getItem("welcomeTourShown") != "Y") {
            showWelcome1();
            localStorage.setItem("welcomeTourShown", "Y");
        }
    }
    loaded(clues) {
        // Called by fetchPuzzle function after file loaded and text parsed
        // store clues passed in
        this.clueSet = clues;
        try {
            // Load stored settings from local storage
            // Checks
            this.checks = localStorage.getItem("checks");
            if (!this.checks) {
                this.checks = localStorage.getItem("difficulty"); // in case of transit between versions
                if (!this.checks) {
                    this.checks = "L";
                } else {
                    if (this.checks == "NORMAL") {
                        this.checks = "W";
                    } else if (this.checks == "HARD") {
                        this.checks = "N";
                    } else {
                        this.checks = "L"
                    }
                }
                localStorage.setItem("checks",this.checks);
            }
            localStorage.removeItem("difficulty"); // transition from difficulty levels
            localStorage.removeItem("allowReveals");
            //document.getElementById("hints").style.visibility = "hidden";
            let fn = this.fileName(); 
            this.rating = fn.substring(12,13);
            let localGuesses = localStorage.getItem(fn + "_G"); 
            let localScores = localStorage.getItem(fn + "_S"); 
            if (!localGuesses) {
                if (!localScores) {
                    // No local guesses or scores - this puzzle has not been started
                    // Initiate both guesses and scores
                    this.status = "N";
                    this.totalScore = 0;
                    this.initGuesses();
                    this.initScores();
                } else {
                    // Puzzle has been completed
                    // Load scores, Initiate guesses (but not used ?)
                    this.status = "C";
                    this.initGuesses();
                    this.scores = localScores.split(",");
                    this.totalScore = this.TotScore();
                    localStorage.setItem(`${this.fileName()}_S`,this.scores.toString());
                }
            } else {
                // Puzzle is partially complete
                // Load both guesses and stores
                this.status = "P";
                this.guesses = localGuesses.split(",");
                this.scores = localScores.split(",");
                this.totalScore = this.TotScore();
            }
        }
        catch {
            console.log(err);
            console.log("failed in load");
            this.checks = "L";
            this.initGuesses();
            this.initScores();
        }
        this.build();
    }
    build() {
        this.clear();
        this.solvePuzzleWarned = false;
        this.bombWarned = false;
        let lastClue = this.clueSet[this.clueSet.length-1].answer;
        let maxLength = lastClue.length;
        this.boxWidth = 8;
        if (maxLength > 10 && maxLength <13) {
            this.boxWidth = 7;
        } else if (maxLength >=13) {
            this.boxWidth = 6;
        }
        let firstIncomplete = -1; // first incomplete word
        // construct the grid
        for (let i = 0; i < this.clueSet.length; i++) {
            let row = document.createElement("div");
            row.className = "answer";
            row.id = "answer" + i;
            let ans=this.clueSet[i].answer;
            let guess=this.guesses[i];
            if (firstIncomplete == -1 && ans != guess) {
                firstIncomplete = i;
            }
            for (let j = 0; j < ans.length; j++) {
                let box = document.createElement("button");
                box.className = "letter";
                box.id = "A" + (i) + "L" + (j); 
                box.addEventListener("click", (e) => {
                    gb.setCursor(i,j);
                })
                box.style.width = `${this.boxWidth}%`;
                switch (this.status) {
                    case "C":
                        box.classList.add(`letter-${this.scores[i].substring(j,j+1)}`); // style according to score
                        break;
                    case "N":
                        box.textContent = "-";
                        break;
                    case "P":
                        box.textContent = this.guesses[i].substring(j,j+1);
                        if (Number(this.scores[i].substring(j,j+1)) <= this.checksmap.get("L")) {
                            if (this.guesses[i].substring(j,j+1) == this.clueSet[i].answer.substring(j,j+1)) {
                                box.classList.add("letter-correct");
                            } else if (this.guesses[i].substring(j,j+1) != "-") {
                                box.classList.add("letter-wrong");
                            }
                        }
                        break;
                }
                row.appendChild(box);
            } 
            if (!this.scores[i].includes("-") && this.scores[i].includes(this.checksmap.get("W").toString) && this.status == "P") { 
                // Word completed in NORMAL so show answer correct
                row.classList.add("answer-correct");
            }
            const box = document.createElement("button");
            switch (i) {
                case 0:
                    box.id = "hint-letter";
                    box.className = "hint-button";
                    box.textContent = "Show Letter";
                    box.addEventListener("click", (e) => {
                        revealLetter();
                    })
                    row.appendChild(box);
                    break;
                case 1:
                    box.id = "hint-added";
                    box.className = "hint-button";
                    box.textContent = "New Letter";
                    box.addEventListener("click", (e) => {
                        revealNewLetter();
                    })
                    row.appendChild(box);
                    break;
                case 2:
                    box.id = "hint-word";
                    box.className = "hint-button";
                    box.textContent = "Show Word";
                    box.addEventListener("click", (e) => {
                        revealClue();
                    })
                    row.appendChild(box);
                    break;
                case 3:
                    box.id = "hint-puzzle";
                    box.className = "hint-button";
                    box.textContent = "Solve Puzzle";
                    box.addEventListener("click", (e) => {
                        revealPuzzle();
                    })
                    row.appendChild(box);
                    break;
                    default:
                break;
            }
            this.board.appendChild(row);
        }
        switch (this.status) {
            case "C":
                this.totalScore = this.TotScore();
                this.clue.textContent = `Puzzle Complete - Score ${this.totalScore}%`
                this.removeCsrOutline
                break;
            case "N":
                this.totalScore = 0;
                this.setCursor(Math.max(firstIncomplete,0),0);
                this.clue.textContent = this.clueSet[this.csrClue].clue;
                break;
            case "P":
                this.totalScore = 0;
                this.setCursor(Math.max(firstIncomplete,0),0);
                this.clue.textContent = this.clueSet[this.csrClue].clue;
                break;
        }
        this.setButtons();
    }
    clear() {
        // move the keyboard back outside the game-board element, to avoid it being erased during clear()
        let kb = document.getElementById("keyboard-cont");
        this.board.after(kb);
        let cl = document.getElementById("clue");
        this.board.before(cl);
        this.board.innerHTML="";
        this.board.classList.remove("puzzle-complete");
        this.clue.classList.remove("puzzle-complete");
    }
    setCursor(c,l) {
        //this.csrClue=Math.min(c,this.clueSet.length);
        this.removeCsrOutline();
        if (c >= this.clueSet.length) {
            this.csrClue = 0; // back to top
        } else {
            this.csrClue = c;
        }
        this.csrLett=l;
        // Move keyboard to after this clue
        let ansbox = document.getElementById("answer" + this.csrClue);
        let kb = document.getElementById("keyboard-cont");
        let cl = document.getElementById("clue");
        if (this.movingKeyboard) {ansbox.after(kb);}
        if (this.movingClue) {ansbox.before(cl);}
        //this.setButtons();
        if (this.status != "C") {
            this.drawCsrOutline();
        }
        if (!this.puzzleComplete()) {// Not complete
            this.clue.textContent = this.clueSet[this.csrClue].clue;
        } else {
            this.itsDone();
        }
    }
    drawCsrOutline() {
        let lb = document.getElementById("A"+this.csrClue+"L"+this.csrLett);
        lb.classList.add("letter-outline");
    }    
    removeCsrOutline() {
        let lb = document.getElementById("A"+this.csrClue+"L"+this.csrLett);
        lb.classList.remove("letter-outline");
    }
    advanceCursor() {
        let ans = this.clueSet[this.csrClue].answer;
        let newLett = this.csrLett + 1;
        let newClue = this.csrClue;
        if (newLett >= ans.length) {
            newLett = 0;
            newClue += 1;
        }
        this.setCursor(newClue, newLett);
    }
    
    getCursorBoxID(){
        let lett = document.getElementById("A" + this.csrClue + "L" + this.csrLett);
        return lett; 
    }
    toggleDateMenu() {
        this.showDateMenu = !this.showDateMenu;
        this.setButtons();
    }
    setButtons() {
        if (this.showDateMenu) {
            document.getElementById("dateMenu").style.display = "block";
        } else {
            document.getElementById("dateMenu").style.display = "none";
        }
        let d2 = new Date();
        let y = d2.getFullYear();
        let m = d2.getMonth();
        let dd = d2.getDate()
        d2 = new Date(y,m,dd);
        let fn = this.fileName();
        // 012345678901
        // 23-SEP-2023
        let s = fn.substring(0,6) + "<br>" + fn.substring(7,11);
        document.getElementById("btnPuzzle").innerHTML = s; 
        this.rating = fn.substring(12,13);
        this.showStatus();
        
        if (this.bombWarned) {
            document.getElementById("btnBomb").style.color = "#fc5b20"; // Orange
        } else {
            document.getElementById("btnBomb").style.color = "#b0acac"; // grey
        }

        switch (this.checks) {
            case "L":
                document.getElementById("btnCheckLetters").style.color = "#fc5b20"; // Orange
                document.getElementById("btnCheckWords").style.color = "#b0acac"; // grey
                document.getElementById("btnNoChecks").style.color = "#b0acac"; // grey
                break;
            case "W":
                document.getElementById("btnCheckLetters").style.color = "#b0acac"; // grey
                document.getElementById("btnCheckWords").style.color = "#fc5b20"; // Orange
                document.getElementById("btnNoChecks").style.color = "#b0acac"; // grey
                break;
            case "N":
                document.getElementById("btnCheckLetters").style.color = "#b0acac"; // grey
                document.getElementById("btnCheckWords").style.color = "#b0acac"; // grey
                document.getElementById("btnNoChecks").style.color = "#fc5b20"; // Orange
                break;
        }
        this.toggleHints(0);
    }
    toggleHints(x = -1) { // 0 = off, 1 = on, else = toggle
        if (this.status == "C") {
            x = 0
        }
        if (x == 0) {
            this.showHints = false;
        } else if (x == 1) {
            this.showHints = true;
        } else {
            this.showHints = !this.showHints;
        }
        this.showOrHideHints();
    }
    showOrHideHints() {
        let allHints = document.getElementsByClassName("hint-button");
        for (let h of allHints) {
            if (this.showHints) {
                h.style.visibility = "visible";
            } else {
                h.style.visibility = "hidden";
            }
        }
        document.getElementById("hint-puzzle").textContent = "Solve Puzzle"
        if (this.showHints) {
            document.getElementById("btnHints").style.color = "#f5fc20"; // Yellow
        } else {
            document.getElementById("btnHints").style.color = "	#f5f5f5"; // Whitesmoke
        }
    }
    receiveLetter(l) {
        this.showDateMenu = false;
        let csrBox = this.getCursorBoxID();
        if (l == "-") { // DEL pressed
            if (csrBox.textContent == "-") {
                // Backspace behaviour - go back then delete
                this.setCursor(this.csrClue, Math.max(0, this.csrLett - 1));
                this.updateGuess(this.csrClue,this.csrLett,"-");
                // no change to score needed after backspace - if guess was entered and scored, that score is the best it can get
            } else {
                // Delete then go back
                this.updateGuess(this.csrClue,this.csrLett,"-");
                // no change to score needed after backspace - if guess was entered and scored, that score is the best it can get
                this.setCursor(this.csrClue, Math.max(0, this.csrLett - 1));
            }
        } else { // Letter pressed
            this.status = "P";
            this.showStatus();
            this.updateGuess(this.csrClue,this.csrLett,l);
            this.scoreLetter(this.csrClue, this.csrLett);
            switch (this.checks) {
                case "L":
                    break;
                case "W":
                    let newguess = subChar(this.guesses[this.csrClue],this.csrLett,l)
                    if (newguess.includes("-")) {

                    } else { // Word checking on and word full after this guess
                        this.scoreWord(this.csrClue);
                    }
                    break;
                case "N":
                    if (this.puzzleComplete()) {
                        this.itsDone();
                    }
                    break;
            }
            this.advanceCursor();
        }
        //this.setStats("P");
    }
    // ??? review this
    setStats(stat) {
        switch (this.filestatus[this.currentPuzzle]) {
            case "A":
                this.available -= 1;
                break;
            case "U":
                this.available -= 1;
                break;
            case "P":
                this.partial -= 1;
                break;
            case "C":
                this.completed -= 1;
                break;
        }
        this.filestatus[this.currentPuzzle] = stat;
        switch (stat) {
            case "A":
                this.available += 1;
                break;
            case "U":
                this.available += 1;
                break;
            case "P":
                this.partial += 1;
                break;
            case "C":
                this.completed += 1;
                break;
        }
    }
    countCompleted() {
        let d = setMidnight(new Date());
        this.completed = 0;
        this.puzzleCount = 0;
        do {
            this.puzzleCount += 1;
            let fn = filenameFromDate(d);
            console.log(fn);
            let s = localStorage.getItem(`${fn}_S`);
            let g = localStorage.getItem(`${fn}_G`);
            if (!g && s != null) { // Complete
                this.completed += 1;
            }
            d.setDate(d.getDate() - 1);
        } while (d >= this.firstPuzzle)
    }
    revealClue(i) {
        let ans = this.clueSet[i].answer;
        for (let j = 0; j < ans.length; j++) {
            // remove scores for any incorrect letters
            if (this.guesses[i].substring(j,j+1) != ans.substring(j,j+1)) {
                this.scores[i] = subChar(this.scores[i],j,"-");
                localStorage.setItem(`${this.fileName()}_S`,this.scores.toString());
            }
            // put correct letter in place, including screen updates
            
            this.updateGuess(i, j, ans[j]);
        }
        this.scoreWord(i, 0);
        this.advanceClue();
    }
    advanceClue() {
        this.setCursor(this.csrClue+1,0);
    }
    revealPuzzle() {
        for (let i = 0; i < this.clueSet.length; i++) {
            if (this.guesses[i] != this.clueSet[i].answer) {
                this.revealClue(i);
            }
        }
        this.itsDone(true);
    }
    revealLetter() {
        let a = this.clueSet[this.csrClue].answer[this.csrLett];
        this.updateGuess(this.csrClue, this.csrLett, a);
        this.scoreLetter(this.csrClue, this.csrLett, true);
        this.advanceCursor();
    }
    revealNewLetter() {
        if (this.csrClue > 0) {
            // Determine which of the letters is the new letter
            let ans = this.clueSet[this.csrClue].answer;
            let ansPrev = this.clueSet[this.csrClue-1].answer;
            let newLetter = "";
            let newLetterPlace = -1;
            for (let i=0; i<ans.length; i++) {
                let found = false;
                for (let j=0; j<ansPrev.length; j++) {
                    if (ans[i] == ansPrev[j]) {
                        found = true;
                         // Remove that letter so not matched again
                        let s = ans[i];
                        ans = ans.replace(s,"-");
                        ansPrev = ansPrev.replace(s,"-");
                        break;
                    }
                }
                if (!found) {
                    // This is the new letter
                    newLetter = ans[i];
                    newLetterPlace = i;
                    this.updateGuess(this.csrClue, newLetterPlace, newLetter);
                    this.scoreLetter(this.csrClue, newLetterPlace, true);
                        break;
                }
            }
        }
    }
    bomb() { // Clear all guesses and scores
        if (this.bombWarned) {
            localStorage.removeItem(`${this.fileName()}_G`);
            localStorage.removeItem(`${this.fileName()}_S`);
            this.loaded(this.clueSet); //will initiate game board guesses and scores
            if (localStorage.getItem("AllowFuture") != "Yes") {
                localStorage.setItem("AllowFuture","Almost")
            }
        } else {
            alert("This will clear all guesses and scores from this puzzle. \n\nTap bomb again to clear it all out.");
            this.bombWarned = true;
            document.getElementById("btnBomb").style.color = "#fc5b20"; // Orange
        }
    }
    initGuesses() {
        const gs = [];
        for (let i = 0; i < this.clueSet.length; i++) {
            let ans = this.clueSet[i].answer;
            let a = "";
            for (let j = 0; j < ans.length; j++) {
                a += "-";
            }
            gs[i] = a;
        }
        this.guesses = gs;
        //localStorage.setItem(`${this.fileName()}_G`, this.guesses.toString());
    }
    updateGuess(cluenum, lettnum, letter) {
        // store letter
        this.guesses[cluenum] = subChar(this.guesses[cluenum],lettnum,letter);
        localStorage.setItem(`${this.fileName()}_G`, this.guesses.toString());
        // display letter
        const box = document.getElementById(`A${cluenum}L${lettnum}`);
        box.textContent = letter;
    }
    wordFull(i) {
        if (this.guesses[i].includes("-")) {
            return false;
        } else {
            return true;
        }
    }
    puzzleComplete() {
        for (let i = 0; i < this.clueSet.length; i++) {
            if (this.clueSet[i].answer != this.guesses[i]) {
                return false;
            }
        }
        return true;
    }
    initScores() {
        const gs = [];
        for (let i = 0; i < this.clueSet.length; i++) {
            let ans = this.clueSet[i].answer;
            let a = "";
            for (let j = 0; j < ans.length; j++) {
                a += "-"; // indicates letter has not yet been scored
            }
            gs[i] = a;
        }
        this.scores = gs;
        //localStorage.setItem(`${this.fileName()}_S`,this.scores.toString());
    }
    scoreLetter(clue, letter, revealed = false) {
        // score letter
        let score = 0;
        if (!revealed) {
            score = this.getScore();
        }
        let cs = this.scores[clue].substring(letter,letter+1);
        if (cs == "-" || revealed) { //no score entered yet or letter revealed
            this.scores[clue] = subChar(this.scores[clue],letter,score.toString());
        } else if (score < Number(this.scores[clue].substring(letter,letter+1))) { // downgrading score
            this.scores[clue] = subChar(this.scores[clue],letter,score.toString());
        }
        localStorage.setItem(`${this.fileName()}_S`,this.scores.toString());
        const box = document.getElementById(`A${clue}L${letter}`);
        // show colours - mode dependent
        box.classList.remove("letter-wrong");
        if (revealed) {
            box.classList.add("letter-correct");
        } else {
            switch (this.checks) {
                case "L":
                    if (this.guesses[clue].substring(letter,letter+1) == this.clueSet[clue].answer.substring(letter,letter+1)) {
                        box.classList.remove("letter-wrong");
                        box.classList.add("letter-correct");
                    } else if (this.guesses[clue].substring(letter,letter+1) != "-") {
                        box.classList.remove("letter-correct");
                        box.classList.add("letter-wrong");
                    }
                    if (this.wordFull(clue)) {
                        this.scoreWord(clue);
                    }
                    break;
                case "W":
                    if (this.wordFull(clue)) {
                        this.scoreWord(clue);
                    }
                    break;
                case "N":
                    break;
            }
        }
    }
    scoreWord(clue, score = -1) { // -1 means use the current mode
        if (this.clueSet[clue].answer == this.guesses[clue]) {
            if (score < 0) {
                score = this.getScore();
            } else if (!this.checksmap.has(score)) { //invalid score passed
                score = 0
            }
            let sc = this.scores[clue];
            let score_text = score.toString();
            sc = sc.replaceAll("-",score_text); // Set all non-scoring letters when word scored
            sc = sc.replaceAll(this.checksmap.get("N"),this.checksmap.get("W")); // Downgrade all top-scoring letters when word scored
            this.scores[clue] = sc;
            localStorage.setItem(`${this.fileName()}_S`,this.scores.toString());
            document.getElementById(`answer${clue}`).classList.add("answer-correct");
            this.disableAnswer(clue);
        }
        if (this.puzzleComplete()) {
            this.itsDone(); 
        } 
    }
    itsDone(revealed = false) {
        this.toggleHints(0);
        let score = 0;
        if (!revealed) {
            score = this.getScore();
        } else {
            if (localStorage.getItem("AllowFuture") == "Almost") {
                localStorage.setItem("AllowFuture", "Yes");
            }
        }
        // replace all "-" scores
        let sc = this.scores.toString();
        sc = sc.replaceAll("-", score.toString());
        this.scores = sc.split(",");
        localStorage.setItem(`${this.fileName()}_S`,this.scores.toString());
        // update total score
        this.totalScore = this.TotScore();
        // remove guesses from local storage
        localStorage.removeItem(`${this.fileName()}_G`);
        let s = ""; // emojis for sharing
        for (let i = 0; i < this.clueSet.length; i++) {
            document.getElementById(`answer${i}`).classList.remove("answer-correct");
            this.disableAnswer(i);
            for (let j = 0; j < this.clueSet[i].answer.length; j++) {
                let box = document.getElementById(`A${i}L${j}`)
                // remove letters from boxes
                //box.textContent = "";
                // set classes based on scores
                box.classList.remove("letter-wrong", "letter-correct");
                box.classList.add("letter-" + this.scores[i].substring(j,j+1)); // Colour by score
                switch (Number(this.scores[i].substring(j,j+1))) {
                    case 0:
                        s += s0;
                        break;
                    case 2:
                        s += s2;
                        break;
                    case 4:
                        s += s4;
                        break;
                    case 5:
                        s += s5;
                        break;
                }
            }
            s += "\n";
        }
        this.totalScore = this.TotScore();
        this.countCompleted();
        let todayDate = setMidnight(new Date())
        document.getElementById("totalScore").innerHTML = `Score = ${this.totalScore}% : ${this.completed} of ${this.puzzleCount} completed`;
        this.clue.innerHTML = 
            "<i class='fa fa-star' style='color:gold; font-size:3rem'></i>"
            + "Puzzle Complete : " + (this.totalScore) + "%"
        this.clue.classList.add("puzzle-complete");
        this.showDateMenu = true;
        this.setButtons();
        this.removeCsrOutline();

        // construct share date
        s = "I just finished the Addergram puzzle for " + this.fileName().substring(0,11) + "\n\n"
            + "I scored " + this.totalScore + " %"
            + "\n\n"
            + s;
        this.shareData = {
            title: "Addergrams",
            text: s,
            url: "https://addergrams.com",
          };
    
        // show Winner overlay
        if (this.status != "C" && this.totalScore > 0) { // only show panel if just completed, rather than loaded as complete
            showPanel("completion-star",3000);
        }
        this.status = "C"; 
        this.setStats("C");
        //this.clue.textContent = `${this.completed} completed of 
        //    ${this.completed + this.available + this.partial} available`;
    }

    disableAnswer(clue) {
        let ans = this.clueSet[clue].answer;
        for (let j = 0; j < ans.length; j++) {
            document.getElementById(`A${clue}L${j}`).disabled = true;
        }
    }
    TotScore() {
        let ts = 0;
        let max = 0;
        for (let i = 0; i < this.clueSet.length; i++) {
            for (let j = 0; j < this.clueSet[i].answer.length; j++) {
                let ij = this.scores[i].substring(j,j+1);
                if (ij != "-") { // not scored yet
                    ts += Number(ij);
                    max += this.checksmap.get("N");
                }
            }
        }
        if (max == 0) {
            return 0;
        } else {
            return Math.floor(ts/max*100);
        }
    }
    getScore() {
        if (this.checksmap.has(this.checks)) {
            return this.checksmap.get(this.checks);
        } else {
            return 0;
        }
    }
}

