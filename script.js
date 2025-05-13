// DOM Elements - Main UI
const timerDisplay = document.getElementById('timer-display');
const miniTimerDisplay = document.getElementById('mini-timer-display');
const sessionLabel = document.getElementById('session-label');
const miniTimerLabel = document.getElementById('mini-timer-label');
const timerProgress = document.getElementById('timer-progress');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const miniStartBtn = document.getElementById('mini-start-btn');
const miniPauseBtn = document.getElementById('mini-pause-btn');
const miniCloseBtn = document.getElementById('mini-close-btn');
const completedCounter = document.getElementById('completed-counter');
const workDurationInput = document.getElementById('work-duration');
const shortBreakDurationInput = document.getElementById('short-break-duration');
const longBreakDurationInput = document.getElementById('long-break-duration');
const autoStartCheckbox = document.getElementById('auto-start');
const soundEnabledCheckbox = document.getElementById('sound-enabled');
const darkModeCheckbox = document.getElementById('dark-mode');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const notificationSound = document.getElementById('notification-sound');
const testSoundBtn = document.getElementById('test-sound-btn');

// Tab navigation elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// New feature elements
const fullscreenBtn = document.getElementById('fullscreen-btn');
const toggleMiniTimerBtn = document.getElementById('toggle-mini-timer-btn');
const toggleDarkModeBtn = document.getElementById('toggle-dark-mode-btn');
const miniTimer = document.getElementById('mini-timer');
const mainContainer = document.getElementById('main-container');
const exportStatsBtn = document.getElementById('export-stats-btn');
const periodBtns = document.querySelectorAll('.period-btn');
const prevPeriodBtn = document.getElementById('prev-period-btn');
const nextPeriodBtn = document.getElementById('next-period-btn');
const calendarTitle = document.getElementById('calendar-title');
const calendarGrid = document.getElementById('calendar-grid');
const statsChart = document.getElementById('stats-chart');

// Timer variables
let timerInterval;
let timeLeft;
let isRunning = false;
let currentMode = 'work';
let sessionsCompleted = 0;
let originalDuration;
let isFullscreen = false;
let isMiniTimerActive = false;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Stats variables
let currentStatsPeriod = 'day';
let currentDate = new Date();
let pomodoroStats = {};
let chart = null;

// Auth variables
let currentUser = null;

// Default settings
const defaultSettings = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    autoStart: true,
    soundEnabled: true,
    darkMode: false
};

// Current settings
let settings = { ...defaultSettings };

// Tasks array
let tasks = [];

// Loading screen elements
const loadingScreen = document.getElementById('loading-screen');

// Initialize app
function initApp() {
    loadSettingsFromLocalStorage();
    loadTasksFromLocalStorage();
    loadStatsFromLocalStorage();
    applySettings();
    renderTasks();
    setupTabNavigation();
    setupDragAndDrop();
    resetTimer();
    setupEventListeners();
    initializeStats();
}

// Event listeners
function setupEventListeners() {
    // Original event listeners
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    saveSettingsBtn.addEventListener('click', saveSettings);
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    darkModeCheckbox.addEventListener('change', toggleDarkMode);
    testSoundBtn.addEventListener('click', testSound);
    
    // New feature event listeners
    fullscreenBtn.addEventListener('click', toggleFullscreenMode);
    toggleMiniTimerBtn.addEventListener('click', toggleMiniTimer);
    toggleDarkModeBtn.addEventListener('click', () => {
        darkModeCheckbox.checked = !darkModeCheckbox.checked;
        toggleDarkMode();
        // Save settings when dark mode is toggled
        settings.darkMode = darkModeCheckbox.checked;
        saveSettingsToLocalStorage();
    });
    
    miniStartBtn.addEventListener('click', startTimer);
    miniPauseBtn.addEventListener('click', pauseTimer);
    miniCloseBtn.addEventListener('click', closeMiniTimer);
    
    exportStatsBtn.addEventListener('click', exportStats);
    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchStatsPeriod(btn.dataset.period);
        });
    });
    prevPeriodBtn.addEventListener('click', () => navigatePeriod('prev'));
    nextPeriodBtn.addEventListener('click', () => navigatePeriod('next'));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (isRunning) {
                pauseTimer();
            } else {
                startTimer();
            }
        } else if (e.code === 'Escape') {
            if (isFullscreen) {
                exitFullscreenMode();
            }
        }
    });
}

// Setup tab navigation
function setupTabNavigation() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
            
            // Special handling for stats tab
            if (btn.dataset.tab === 'stats') {
                renderStatsView();
            }
        });
    });
}

// Setup drag and drop for mini timer
function setupDragAndDrop() {
    const miniTimerHandle = document.querySelector('.mini-timer-handle');
    
    miniTimerHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragOffset.x = e.clientX - miniTimer.getBoundingClientRect().left;
        dragOffset.y = e.clientY - miniTimer.getBoundingClientRect().top;
        miniTimer.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const left = e.clientX - dragOffset.x;
        const top = e.clientY - dragOffset.y;
        
        // Keep within window bounds
        const maxX = window.innerWidth - miniTimer.offsetWidth;
        const maxY = window.innerHeight - miniTimer.offsetHeight;
        
        miniTimer.style.left = `${Math.max(0, Math.min(left, maxX))}px`;
        miniTimer.style.top = `${Math.max(0, Math.min(top, maxY))}px`;
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        miniTimer.style.cursor = 'move';
    });
}

// Timer functions
function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    miniStartBtn.disabled = true;
    miniPauseBtn.disabled = false;
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        updateTimerProgress();
        
        if (timeLeft <= 0) {
            completeSession();
        }
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;
    
    isRunning = false;
    clearInterval(timerInterval);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    miniStartBtn.disabled = false;
    miniPauseBtn.disabled = true;
}

function resetTimer() {
    pauseTimer();
    
    switch (currentMode) {
        case 'work':
            timeLeft = settings.workDuration * 60;
            originalDuration = timeLeft;
            break;
        case 'shortBreak':
            timeLeft = settings.shortBreakDuration * 60;
            originalDuration = timeLeft;
            break;
        case 'longBreak':
            timeLeft = settings.longBreakDuration * 60;
            originalDuration = timeLeft;
            break;
    }
    
    updateTimerDisplay();
    updateTimerProgress();
}

function completeSession() {
    pauseTimer();
    
    if (settings.soundEnabled) {
        playNotificationSound();
    }
    
    if (currentMode === 'work') {
        sessionsCompleted++;
        updateCompletedCounter();
        recordCompletedPomodoro(); // Add session to stats
        
        if (sessionsCompleted % 4 === 0) {
            switchMode('longBreak');
        } else {
            switchMode('shortBreak');
        }
    } else {
        switchMode('work');
    }
    
    resetTimer();
    
    if (settings.autoStart) {
        startTimer();
    }
}

function switchMode(mode) {
    currentMode = mode;
    document.body.classList.remove('work-mode', 'short-break-mode', 'long-break-mode');
    
    switch (mode) {
        case 'work':
            sessionLabel.textContent = 'Work Time';
            miniTimerLabel.textContent = 'Work';
            document.body.classList.add('work-mode');
            break;
        case 'shortBreak':
            sessionLabel.textContent = 'Short Break';
            miniTimerLabel.textContent = 'Break';
            document.body.classList.add('short-break-mode');
            break;
        case 'longBreak':
            sessionLabel.textContent = 'Long Break';
            miniTimerLabel.textContent = 'Long Break';
            document.body.classList.add('long-break-mode');
            break;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    timerDisplay.textContent = timeString;
    miniTimerDisplay.textContent = timeString;
    
    // Check if fullscreen container exists and update it too
    const fullscreenContainer = document.getElementById('fullscreen-container');
    if (fullscreenContainer) {
        const fsTimerDisplay = fullscreenContainer.querySelector('.timer-display');
        if (fsTimerDisplay) {
            fsTimerDisplay.textContent = timeString;
        }
    }
    
    // Update page title with timer
    document.title = `${timeString} - Pomodoro Timer`;
}

function updateTimerProgress() {
    // Calculate progress percentage
    const progressPercentage = ((originalDuration - timeLeft) / originalDuration);
    
    // Update circle progress - SVG circle has circumference of 2*PI*r (r=45)
    const circumference = 2 * Math.PI * 45;
    const dashOffset = circumference * (1 - progressPercentage);
    timerProgress.style.strokeDashoffset = dashOffset;
    
    // Check if fullscreen container exists and update it too
    const fullscreenContainer = document.getElementById('fullscreen-container');
    if (fullscreenContainer) {
        const fsTimerProgress = fullscreenContainer.querySelector('.circle-timer-progress');
        if (fsTimerProgress) {
            fsTimerProgress.style.strokeDashoffset = dashOffset;
        }
    }
}

function updateCompletedCounter() {
    completedCounter.textContent = sessionsCompleted;
    saveCompletedSessionsToLocalStorage();
}

function playNotificationSound() {
    // Create a new Audio object using the local file
    const sound = new Audio('audio1.mp3');
    
    // Set volume
    sound.volume = 0.7;
    
    // Play with error handling and user interaction check
    sound.play()
        .then(() => console.log('Notification sound played successfully'))
        .catch(error => {
            console.log('Error playing sound:', error);
            // Fallback to the original audio element as a backup
            notificationSound.currentTime = 0;
            notificationSound.play().catch(e => console.log('Backup audio also failed:', e));
        });
    
    // Also send a browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Pomodoro Timer', {
            body: `${currentMode === 'work' ? 'Work session' : 'Break'} completed!`,
            icon: 'https://icons.iconarchive.com/icons/paomedia/small-n-flat/256/clock-icon.png'
        });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// Settings functions
function saveSettings() {
    // Get values from settings form
    const workDuration = parseInt(workDurationInput.value);
    const shortBreakDuration = parseInt(shortBreakDurationInput.value);
    const longBreakDuration = parseInt(longBreakDurationInput.value);
    const autoStart = autoStartCheckbox.checked;
    const soundEnabled = soundEnabledCheckbox.checked;
    const darkMode = darkModeCheckbox.checked;
    
    // Validate inputs
    if (isNaN(workDuration) || isNaN(shortBreakDuration) || isNaN(longBreakDuration) || 
        workDuration < 1 || shortBreakDuration < 1 || longBreakDuration < 1) {
        alert('Please enter valid durations (minimum 1 minute).');
        return;
    }
    
    // Update settings
    settings = {
        workDuration,
        shortBreakDuration,
        longBreakDuration,
        autoStart,
        soundEnabled,
        darkMode
    };
    
    // Apply settings
    applySettings();
    
    // Save to local storage
    saveSettingsToLocalStorage();
    
    // Show message
    alert('Settings saved successfully!');
}

function applySettings() {
    workDurationInput.value = settings.workDuration;
    shortBreakDurationInput.value = settings.shortBreakDuration;
    longBreakDurationInput.value = settings.longBreakDuration;
    autoStartCheckbox.checked = settings.autoStart;
    soundEnabledCheckbox.checked = settings.soundEnabled;
    darkModeCheckbox.checked = settings.darkMode;
    
    // Apply dark mode if enabled
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
        toggleDarkModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-mode');
        toggleDarkModeBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleDarkMode() {
    const isDarkMode = darkModeCheckbox.checked;
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        toggleDarkModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-mode');
        toggleDarkModeBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    // If chart exists, update it
    if (chart) {
        chart.update();
    }
}

// Task functions
function addTask() {
    const taskText = taskInput.value.trim();
    
    if (taskText) {
        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        renderTasks();
        saveTasksToLocalStorage();
        
        // Clear input field
        taskInput.value = '';
    }
}

function toggleTaskCompletion(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        renderTasks();
        saveTasksToLocalStorage();
    }
}

function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    renderTasks();
    saveTasksToLocalStorage();
}

function renderTasks() {
    taskList.innerHTML = '';
    
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = task.completed ? 'completed' : '';
        
        const taskText = document.createElement('span');
        taskText.textContent = task.text;
        taskText.addEventListener('click', () => toggleTaskCompletion(task.id));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete task';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        li.appendChild(taskText);
        li.appendChild(deleteBtn);
        taskList.appendChild(li);
    });
}

// Local Storage functions
function saveSettingsToLocalStorage() {
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
}

function loadSettingsFromLocalStorage() {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }
}

function saveTasksToLocalStorage() {
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
}

function loadTasksFromLocalStorage() {
    const savedTasks = localStorage.getItem('pomodoroTasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
}

function saveCompletedSessionsToLocalStorage() {
    localStorage.setItem('pomodoroCompletedSessions', sessionsCompleted);
}

function loadCompletedSessionsFromLocalStorage() {
    const savedSessions = localStorage.getItem('pomodoroCompletedSessions');
    if (savedSessions) {
        sessionsCompleted = parseInt(savedSessions);
        updateCompletedCounter();
    }
}

function saveStatsToLocalStorage() {
    localStorage.setItem('pomodoroStats', JSON.stringify(pomodoroStats));
}

function loadStatsFromLocalStorage() {
    const savedStats = localStorage.getItem('pomodoroStats');
    if (savedStats) {
        pomodoroStats = JSON.parse(savedStats);
    }
}

// Statistics functions
function initializeStats() {
    // Initialize Chart.js
    const ctx = document.getElementById('stats-chart').getContext('2d');
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Pomodoros Completed',
                data: [],
                backgroundColor: 'rgba(255, 99, 71, 0.5)',
                borderColor: 'rgba(255, 99, 71, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
    
    // Initial render with current period
    renderStatsView();
}

function recordCompletedPomodoro() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!pomodoroStats[today]) {
        pomodoroStats[today] = 0;
    }
    
    pomodoroStats[today]++;
    saveStatsToLocalStorage();
    
    // Update statistics display if on stats tab
    if (document.getElementById('stats-tab').classList.contains('active')) {
        renderStatsView();
    }
}

function renderStatsView() {
    updateCalendarTitle();
    renderCalendar();
    updateChart();
}

function updateCalendarTitle() {
    let title = '';
    
    switch (currentStatsPeriod) {
        case 'day':
            title = currentDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            break;
        case 'week':
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            title = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            break;
        case 'month':
            title = currentDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
            break;
    }
    
    calendarTitle.textContent = title;
}

function renderCalendar() {
    calendarGrid.innerHTML = '';
    
    switch (currentStatsPeriod) {
        case 'day':
            renderDayView();
            break;
        case 'week':
            renderWeekView();
            break;
        case 'month':
            renderMonthView();
            break;
    }
}

function renderDayView() {
    const dateStr = currentDate.toISOString().split('T')[0];
    const completedToday = pomodoroStats[dateStr] || 0;
    
    const dayContainer = document.createElement('div');
    dayContainer.className = 'day-view';
    
    const countDisplay = document.createElement('div');
    countDisplay.className = 'day-pomodoro-count';
    countDisplay.innerHTML = `
        <div class="day-count-label">Pomodoros completed today:</div>
        <div class="day-count-value">${completedToday}</div>
    `;
    
    dayContainer.appendChild(countDisplay);
    calendarGrid.appendChild(dayContainer);
}

function renderWeekView() {
    // Create day headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    weekdays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Get the week start date (Sunday)
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    
    // Create day cells for the week
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        
        const dateStr = day.toISOString().split('T')[0];
        const completedCount = pomodoroStats[dateStr] || 0;
        
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        // Highlight today
        if (isSameDay(day, new Date())) {
            dayCell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day.getDate();
        
        const dayCount = document.createElement('div');
        dayCount.className = 'calendar-day-sessions';
        dayCount.textContent = completedCount;
        
        dayCell.appendChild(dayNumber);
        dayCell.appendChild(dayCount);
        
        calendarGrid.appendChild(dayCell);
    }
}

function renderMonthView() {
    // Create day headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    weekdays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Get the first day of the month
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Fill in leading empty days
    const firstDayOfWeek = firstDayOfMonth.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyCell);
    }
    
    // Fill in days of the month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = date.toISOString().split('T')[0];
        const completedCount = pomodoroStats[dateStr] || 0;
        
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        // Highlight today
        if (isSameDay(date, new Date())) {
            dayCell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        
        const dayCount = document.createElement('div');
        dayCount.className = 'calendar-day-sessions';
        dayCount.textContent = completedCount;
        
        dayCell.appendChild(dayNumber);
        dayCell.appendChild(dayCount);
        
        calendarGrid.appendChild(dayCell);
    }
    
    // Fill in trailing empty days
    const lastDayOfWeek = lastDayOfMonth.getDay();
    for (let i = lastDayOfWeek; i < 6; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyCell);
    }
}

function updateChart() {
    let labels = [];
    let data = [];
    
    switch (currentStatsPeriod) {
        case 'day': {
            // Show hourly breakdown for the day
            const today = currentDate.toISOString().split('T')[0];
            labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
            data = Array(24).fill(0);
            
            // Note: For hourly data, we would need to track hour-specific data
            // For now, we'll just show the total for the day
            const total = pomodoroStats[today] || 0;
            if (total > 0) {
                // Distribute sessions across working hours (9-5) for visualization
                const workHours = 8;
                const hourlyDistribution = Math.ceil(total / workHours);
                for (let i = 9; i < 17; i++) {
                    data[i] = Math.min(hourlyDistribution, total - (i - 9) * hourlyDistribution);
                }
            }
            break;
        }
        case 'week': {
            // Show daily data for the week
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            
            for (let i = 0; i < 7; i++) {
                const day = new Date(weekStart);
                day.setDate(weekStart.getDate() + i);
                const dateStr = day.toISOString().split('T')[0];
                
                labels.push(day.toLocaleDateString('en-US', { weekday: 'short' }));
                data.push(pomodoroStats[dateStr] || 0);
            }
            break;
        }
        case 'month': {
            // Show daily data for the month
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateStr = date.toISOString().split('T')[0];
                
                labels.push(day);
                data.push(pomodoroStats[dateStr] || 0);
            }
            break;
        }
    }
    
    // Update chart data
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

function switchStatsPeriod(period) {
    currentStatsPeriod = period;
    
    // Update active button
    periodBtns.forEach(btn => {
        if (btn.dataset.period === period) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderStatsView();
}

function navigatePeriod(direction) {
    const newDate = new Date(currentDate);
    
    switch (currentStatsPeriod) {
        case 'day':
            newDate.setDate(newDate.getDate() + (direction === 'prev' ? -1 : 1));
            break;
        case 'week':
            newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
            break;
        case 'month':
            newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
            break;
    }
    
    currentDate = newDate;
    renderStatsView();
}

function exportStats() {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Pomodoros Completed\n';
    
    for (const dateStr in pomodoroStats) {
        const count = pomodoroStats[dateStr];
        // Format date as MM/DD/YYYY
        const date = new Date(dateStr);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        
        csvContent += `${formattedDate},${count}\n`;
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'pomodoro_stats.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper functions
function isSameDay(date1, date2) {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

// Fullscreen mode functions
function toggleFullscreenMode() {
    if (isFullscreen) {
        exitFullscreenMode();
    } else {
        enterFullscreenMode();
    }
}

function enterFullscreenMode() {
    isFullscreen = true;
    
    // Create fullscreen container
    const fullscreenContainer = document.createElement('div');
    fullscreenContainer.className = 'fullscreen-mode';
    fullscreenContainer.id = 'fullscreen-container';
    
    // Create exit button
    const exitBtn = document.createElement('button');
    exitBtn.className = 'fullscreen-exit';
    exitBtn.innerHTML = '<i class="fas fa-times"></i>';
    exitBtn.addEventListener('click', exitFullscreenMode);
    
    // Clone timer elements
    const timerClone = document.querySelector('.circle-timer').cloneNode(true);
    const sessionLabelClone = document.querySelector('.session-label').cloneNode(true);
    
    // Add elements to container
    fullscreenContainer.appendChild(exitBtn);
    fullscreenContainer.appendChild(sessionLabelClone);
    fullscreenContainer.appendChild(timerClone);
    
    // Add to body
    document.body.appendChild(fullscreenContainer);
    
    // Update fullscreen button icon
    fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    
    // Initial updates for fullscreen view
    updateTimerDisplay();
    updateTimerProgress();
}

function exitFullscreenMode() {
    isFullscreen = false;
    
    // Remove fullscreen container
    const fullscreenContainer = document.getElementById('fullscreen-container');
    if (fullscreenContainer) {
        document.body.removeChild(fullscreenContainer);
    }
    
    // Update fullscreen button icon
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
}

// Mini Timer functions
function toggleMiniTimer() {
    if (isMiniTimerActive) {
        closeMiniTimer();
    } else {
        openMiniTimer();
    }
}

function openMiniTimer() {
    isMiniTimerActive = true;
    miniTimer.classList.remove('hidden');
    
    // Set initial position if not set already
    if (!miniTimer.style.top && !miniTimer.style.left) {
        miniTimer.style.bottom = '20px';
        miniTimer.style.right = '20px';
    }
    
    // Update mini timer state
    updateTimerDisplay();
    if (isRunning) {
        miniStartBtn.disabled = true;
        miniPauseBtn.disabled = false;
    } else {
        miniStartBtn.disabled = false;
        miniPauseBtn.disabled = true;
    }
    
    // Update toggle button icon
    toggleMiniTimerBtn.innerHTML = '<i class="fas fa-compress-alt"></i>';
}

function closeMiniTimer() {
    isMiniTimerActive = false;
    miniTimer.classList.add('hidden');
    
    // Update toggle button icon
    toggleMiniTimerBtn.innerHTML = '<i class="fas fa-external-link-alt"></i>';
}

// Fixing the testSound function which was accidentally removed
function testSound() {
    // Create a temporary audio object with the local file
    const tempSound = new Audio('audio1.mp3');
    tempSound.volume = 0.7;
    
    // Play the sound
    tempSound.play()
        .then(() => {
            console.log('Test sound played successfully');
            // Give visual feedback
            testSoundBtn.textContent = 'Sound Works!';
            setTimeout(() => {
                testSoundBtn.textContent = 'Test Sound';
            }, 2000);
        })
        .catch(error => {
            console.error('Error playing test sound:', error);
            notificationSound.play().catch(e => {
                console.error('Backup audio also failed:', e);
                // Show visual feedback for error
                testSoundBtn.textContent = 'Sound Failed!';
                setTimeout(() => {
                    testSoundBtn.textContent = 'Test Sound';
                }, 2000);
            });
        });
}

// Initialize app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Show loading screen for 1 second
    setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        mainContainer.classList.remove('hidden');
        
        // After fade animation completes, hide loading screen completely
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 500);
    }, 1000);
    
    initApp();
    loadCompletedSessionsFromLocalStorage();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}); 