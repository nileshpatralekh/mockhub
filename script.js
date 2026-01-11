let totalQuestions = 65;
let currentQuestion = 1;
let questionsStatus = [];
let userAnswers = {};
let correctAnswers = {};
let timerInterval;

// Start Test
function startTest() {
    const pdfInput = document.getElementById('pdf-question');
    const excelInput = document.getElementById('excel-upload');
    const totalInput = document.getElementById('total-qs').value;
    const durationInput = document.getElementById('exam-duration').value;

    if (pdfInput.files.length === 0) {
        alert("Please upload the Question Paper PDF.");
        return;
    }

    // Load PDF
    const fileURL = URL.createObjectURL(pdfInput.files[0]);
    document.getElementById('pdf-viewer').src = fileURL;

    // Load Excel
    if (excelInput.files.length > 0) {
        readExcel(excelInput.files[0]);
    }

    // Init Logic
    totalQuestions = parseInt(totalInput);
    initQuestions(totalQuestions);
    startTimer(parseInt(durationInput) * 60);

    // Switch Screens
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('test-screen').classList.remove('hidden');

    // Set First Question
    loadQuestion(1);
}

// Read Excel
function readExcel(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        jsonData.forEach((row, index) => {
            if (index > 0 && row[0] && row[1]) {
                correctAnswers[row[0]] = row[1].toString().toUpperCase().trim();
            }
        });
    };
    reader.readAsArrayBuffer(file);
}

// Initialize Palette
function initQuestions(num) {
    const grid = document.getElementById('question-grid');
    grid.innerHTML = '';
    questionsStatus = new Array(num + 1).fill('not-visited');

    for (let i = 1; i <= num; i++) {
        const btn = document.createElement('div');
        btn.className = 'q-btn';
        btn.innerText = i;
        btn.id = `q-btn-${i}`;
        btn.onclick = () => loadQuestion(i);
        grid.appendChild(btn);
    }
    updateCounts();
}

// Timer
function startTimer(duration) {
    let timer = duration, minutes, seconds, hours;
    const display = document.getElementById('timer');
    timerInterval = setInterval(function () {
        hours = parseInt(timer / 3600, 10);
        minutes = parseInt((timer % 3600) / 60, 10);
        seconds = parseInt(timer % 60, 10);

        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = hours + ":" + minutes + ":" + seconds;
        if (--timer < 0) submitTest();
    }, 1000);
}

// Navigation Logic
function loadQuestion(qNum) {
    // If previous was not visited, mark as not answered (Red)
    if (questionsStatus[currentQuestion] === 'not-visited') {
        updateStatus(currentQuestion, 'not-answered');
    }

    currentQuestion = qNum;
    document.getElementById('current-q-num').innerText = currentQuestion;

    // Reset Radio
    document.querySelectorAll('input[name="option"]').forEach(r => r.checked = false);

    // Load existing answer
    if (userAnswers[currentQuestion]) {
        const val = userAnswers[currentQuestion];
        const rad = document.querySelector(`input[name="option"][value="${val}"]`);
        if (rad) rad.checked = true;
    }

    // Visual: Border for active question
    document.querySelectorAll('.q-btn').forEach(b => b.classList.remove('active-q'));
    document.getElementById(`q-btn-${currentQuestion}`).classList.add('active-q');
}

// Action: Save & Next
function saveAndNext() {
    const selected = document.querySelector('input[name="option"]:checked');
    if (selected) {
        userAnswers[currentQuestion] = selected.value;
        updateStatus(currentQuestion, 'answered'); // Green
    } else {
        updateStatus(currentQuestion, 'not-answered'); // Red
    }
    nextQ();
}

// Action: Mark for Review
function markForReview() {
    const selected = document.querySelector('input[name="option"]:checked');
    if (selected) {
        userAnswers[currentQuestion] = selected.value;
        updateStatus(currentQuestion, 'marked-ans'); // Purple + Green tick
    } else {
        updateStatus(currentQuestion, 'marked'); // Purple
    }
    nextQ();
}

// Action: Clear
function clearResponse() {
    document.querySelectorAll('input[name="option"]').forEach(r => r.checked = false);
    delete userAnswers[currentQuestion];
    updateStatus(currentQuestion, 'not-visited'); // Back to Grey/Default
}

function nextQ() {
    if (currentQuestion < totalQuestions) {
        loadQuestion(currentQuestion + 1);
    }
}

// Helper: Update Status & Counts
function updateStatus(qNum, status) {
    questionsStatus[qNum] = status;
    const btn = document.getElementById(`q-btn-${qNum}`);
    btn.className = `q-btn ${status}`;
    updateCounts();
}

function updateCounts() {
    // Count occurrences of each status
    const counts = { 'answered': 0, 'not-answered': 0, 'not-visited': 0, 'marked': 0, 'marked-ans': 0 };

    // Iterate 1 to totalQuestions
    for (let i = 1; i <= totalQuestions; i++) {
        let s = questionsStatus[i];
        if (s === 'not-visited' && i === currentQuestion) s = 'not-answered'; // Active unseen is technically not answered
        if (counts[s] !== undefined) counts[s]++;
    }

    // Update Legend Numbers
    document.querySelector('.badge.answered').innerText = counts['answered'];
    document.querySelector('.badge.not-answered').innerText = counts['not-answered'];
    document.querySelector('.badge.not-visited').innerText = counts['not-visited'];
    document.querySelector('.badge.marked').innerText = counts['marked'];
    document.querySelector('.badge.marked-ans').innerText = counts['marked-ans'];
}

// Submit & Grading
function submitTest() {
    clearInterval(timerInterval);
    if (!confirm("Are you sure you want to submit?")) return;

    let correct = 0, wrong = 0, unattempted = 0;
    const hasKey = Object.keys(correctAnswers).length > 0;

    for (let i = 1; i <= totalQuestions; i++) {
        const u = userAnswers[i];
        const c = correctAnswers[i];

        if (u) {
            if (hasKey && c) {
                // Flexible Match: 1=A, 2=B, etc.
                if (normalizeAnswer(u) === normalizeAnswer(c)) correct++;
                else wrong++;
            }
        } else {
            unattempted++;
        }
    }

    let msg = `Test Submitted!\n\nSummary:\nAttempted: ${Object.keys(userAnswers).length}\nUnattempted: ${unattempted}`;
    if (hasKey) {
        msg += `\n\nSCORE:\nCorrect: ${correct}\nWrong: ${wrong}\n\nCheck palette for results (Green=Correct, Red=Wrong).`;

        // Visual Feedback on Palette
        for (let i = 1; i <= totalQuestions; i++) {
            const btn = document.getElementById(`q-btn-${i}`);
            const u = userAnswers[i];
            const c = correctAnswers[i];

            if (u && c) {
                const isMatch = normalizeAnswer(u) === normalizeAnswer(c);
                btn.style.backgroundColor = isMatch ? 'green' : 'red';
                btn.style.color = 'white';
                btn.style.borderRadius = '4px'; // Remove shape for clarity
                btn.style.clipPath = 'none';
            }
        }
    }

    // alert(msg);
    // document.querySelector('.btn-submit').innerText = "Test Completed";
    // document.querySelector('.btn-submit').disabled = true;

    // Switch to Review Screen
    document.getElementById('test-screen').classList.add('hidden');
    document.getElementById('calculator').classList.add('hidden');
    document.getElementById('review-screen').classList.remove('hidden');

    generateReview(correct, wrong, unattempted, hasKey);
}

// Helper: Normalize Answer (1->A, 2->B, etc.)
function normalizeAnswer(ans) {
    if (!ans) return "";
    let s = ans.toString().toUpperCase().trim();
    if (s === "1") return "A";
    if (s === "2") return "B";
    if (s === "3") return "C";
    if (s === "4") return "D";
    return s;
}

function generateReview(correct, wrong, unattempted, hasKey) {
    // Populate Summary
    document.getElementById('review-total').innerText = totalQuestions;
    document.getElementById('review-attempted').innerText = Object.keys(userAnswers).length;
    document.getElementById('review-correct').innerText = hasKey ? correct : "N/A";
    document.getElementById('review-wrong').innerText = hasKey ? wrong : "N/A";

    // Simple Score Calc (Assuming +1 for correct, 0 neg) - Update logic if needed
    // The previous logic was: marks for correct = 1.
    const score = hasKey ? correct : "N/A";
    document.getElementById('review-score').innerText = score;

    // Populate Table
    const tbody = document.getElementById('review-table-body');
    tbody.innerHTML = "";

    for (let i = 1; i <= totalQuestions; i++) {
        const u = userAnswers[i]; // User Answer (A, B, C, D)
        const c = correctAnswers[i]; // Correct Answer (May be 1,2,3,4 or A,B,C,D)

        // Comparisons
        const normU = normalizeAnswer(u);
        const normC = normalizeAnswer(c);
        const isCorrect = (normU && normC && normU === normC);

        const tr = document.createElement('tr');

        // Q.No
        const tdNo = document.createElement('td');
        tdNo.innerText = i;
        tr.appendChild(tdNo);

        // User Answer
        const tdUser = document.createElement('td');
        tdUser.innerText = u ? u : "-";
        tr.appendChild(tdUser);

        // Correct Answer
        const tdCorrect = document.createElement('td');
        tdCorrect.innerText = hasKey ? (c ? c : "-") : "N/A";
        tr.appendChild(tdCorrect);

        // Status
        const tdStatus = document.createElement('td');
        if (!hasKey) {
            tdStatus.innerHTML = "<span class='status-manual'>Manual Check</span>";
        } else {
            if (!u) {
                tdStatus.innerHTML = "<span class='status-unattempted'>Unattempted</span>";
            } else if (isCorrect) {
                tdStatus.innerHTML = "<span class='status-correct'>Correct</span>";
            } else {
                tdStatus.innerHTML = "<span class='status-wrong'>Wrong</span>";
            }
        }
        tr.appendChild(tdStatus);

        tbody.appendChild(tr);
    }
}

/* --- Calculator Logic --- */

// Toggle Calculator
function toggleCalculator() {
    const calc = document.getElementById('calculator');
    calc.classList.toggle('hidden');
}

// Drag Functionality
const calcEl = document.getElementById('calculator');
const headerEl = document.getElementById('calc-header');

let isDragging = false;
let offsetX, offsetY;

headerEl.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - calcEl.offsetLeft;
    offsetY = e.clientY - calcEl.offsetTop;
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        calcEl.style.left = `${e.clientX - offsetX}px`;
        calcEl.style.top = `${e.clientY - offsetY}px`;
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// Calc Logic
let calcExpression = ""; // For internal evaluation (e.g. Math.sin(..))
let displayExpression = ""; // For user display (e.g. sin(..))
let isDeg = true; // Default to Degree

function updateDisplay() {
    document.getElementById('keyPad_UserInput').value = displayExpression;
    // Secondary display often shows the previous answer or operation in progress
    // For now we keep it simple or use it for "Ans"
}

function calcInput(val) {
    calcExpression += val;
    displayExpression += val;
    updateDisplay();
}

function calcOp(op) {
    const display = document.getElementById('keyPad_UserInput');

    if (op === 'C') {
        calcExpression = calcExpression.slice(0, -1);
        displayExpression = displayExpression.slice(0, -1);
        updateDisplay();
        return;
    }
    if (op === 'AC') {
        calcExpression = "";
        displayExpression = "";
        updateDisplay();
        return;
    }
    if (op === 'backspace') {
        calcExpression = calcExpression.slice(0, -1);
        displayExpression = displayExpression.slice(0, -1);
        updateDisplay();
        return;
    }

    // Deg/Rad Toggle
    if (op === 'deg') { isDeg = true; return; }
    if (op === 'rad') { isDeg = false; return; }

    // Constants
    if (op === 'pi') {
        calcExpression += 'Math.PI';
        displayExpression += 'π';
        updateDisplay();
        return;
    }
    if (op === 'e') {
        calcExpression += 'Math.E';
        displayExpression += 'e';
        updateDisplay();
        return;
    }

    // Handling various ops
    // Note: To truly match TCS behavior, we need robust parsing. 
    // Here we map button clicks to JS Math functions.

    switch (op) {
        case 'sin':
        case 'cos':
        case 'tan':
            // JS trig is in Radians. If Deg mode, we need conversion.
            // Math.sin(x * Math.PI / 180)
            // But we are building a string string.
            // This is tricky with simple eval. 
            // Better approach: wrap the input in a converting function?
            // OR: Standard scientific calc appends "sin(".

            calcExpression += `trig('${op}',`;
            displayExpression += `${op}(`;
            break;

        case 'asin':
        case 'acos':
        case 'atan':
        case 'sinh':
        case 'cosh':
        case 'tanh':
            calcExpression += `Math.${op}(`;
            displayExpression += `${op}(`;
            break;

        case 'log': // Base 10
            calcExpression += `Math.log10(`;
            displayExpression += `log(`;
            break;
        case 'ln': // Natural log
            calcExpression += `Math.log(`;
            displayExpression += `ln(`;
            break;

        case 'sqrt':
            calcExpression += `Math.sqrt(`;
            displayExpression += `√(`;
            break;
        case 'cbrt':
            calcExpression += `Math.cbrt(`;
            displayExpression += `∛(`;
            break;

        case 'sqr': // x^2. Usually this applies to the *previous* number.
            // If we are strictly expression binding:
            calcExpression += '**2';
            displayExpression += '^2';
            break;
        case 'cube':
            calcExpression += '**3';
            displayExpression += '^3';
            break;
        case 'pow': // y^x
            calcExpression += '**';
            displayExpression += '^';
            break;
        case 'pow10':
            calcExpression += '10**';
            displayExpression += '10^';
            break;

        case 'inv': // 1/x
            calcExpression = `(1/(${calcExpression}))`;
            // This replaces current expression?? Or appends?
            // Standard calc behavior: 1/x applies to current number.
            // Let's assume user types number then hits 1/x?
            displayExpression += '^(-1)';
            break;

        case 'fact':
            calcExpression += 'fact('; // custom function
            displayExpression += '!';
            break;

        case 'root': // x root y ?? Or y root x.
            // Javascript doesn't have easy nth root operator syntax like ** 
            // x^(1/y)
            // This is hard to do with naive string eval without a proper parser.
            // Simulating as power:
            calcExpression += '**(1/';
            displayExpression += '^(1/';
            break;

        default:
            calcExpression += op;
            displayExpression += op;
    }
    updateDisplay();
}

function calcResult() {
    const display = document.getElementById('keyPad_UserInput');
    const display1 = document.getElementById('keyPad_UserInput1');

    try {
        // Special Helper for Degrees
        const trig = (type, val) => {
            if (isDeg) {
                return Math[type](val * Math.PI / 180);
            } else {
                return Math[type](val);
            }
        };
        // Expose to eval scope
        window.trig = trig;

        // Factorial helper
        const fact = (n) => {
            if (n === 0 || n === 1) return 1;
            for (let i = n - 1; i >= 1; i--) n *= i;
            return n;
        }
        window.fact = fact;

        if (!calcExpression) return;

        const res = eval(calcExpression);

        // Show result
        document.getElementById('keyPad_UserInput').value = res;

        // Move expression to top
        document.getElementById('keyPad_UserInput1').value = displayExpression + " =";

        // Prepare for next
        calcExpression = res.toString();
        displayExpression = res.toString();

    } catch (e) {
        document.getElementById('keyPad_UserInput').value = "Error";
        calcExpression = "";
        displayExpression = "";
    }
}
