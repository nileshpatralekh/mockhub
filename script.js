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
    reader.onload = function(e) {
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
    if(questionsStatus[currentQuestion] === 'not-visited') {
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
        if(rad) rad.checked = true;
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
    for(let i=1; i<=totalQuestions; i++) {
        let s = questionsStatus[i];
        if(s === 'not-visited' && i === currentQuestion) s = 'not-answered'; // Active unseen is technically not answered
        if(counts[s] !== undefined) counts[s]++;
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
                if (u === c) correct++;
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
            
            if(u && c) {
                btn.style.backgroundColor = (u === c) ? 'green' : 'red';
                btn.style.color = 'white';
                btn.style.borderRadius = '4px'; // Remove shape for clarity
                btn.style.clipPath = 'none';
            }
        }
    }

    alert(msg);
    document.querySelector('.btn-submit').innerText = "Test Completed";
    document.querySelector('.btn-submit').disabled = true;
}
