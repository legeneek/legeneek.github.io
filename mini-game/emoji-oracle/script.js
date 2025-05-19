function createParticles() {
  const container = document.createElement("div");
  container.className = "particles";

  // 生成80个粒子
  for (let i = 0; i < 80; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";

    // 使用CSS变量控制运动路径
    particle.style.setProperty("--x", Math.random()); // 水平随机系数
    particle.style.setProperty("--y", Math.random()); // 垂直随机系数

    // 随机动画参数
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animation = `particle ${
      2 + Math.random() * 2
    }s ease-out infinite`;
    particle.style.animationDelay = `${Math.random() * 2}s`;

    // 随机尺寸变化
    const size = 4 + Math.random() * 8;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    container.appendChild(particle);
  }
  return container;
}

function triggerTimeStop() {
  const effect = document.createElement("div");
  effect.className = "time-stop";

  // 添加裂纹层
  const cracks = document.createElement("div");
  cracks.className = "cracks";

  // 添加文字
  const text = document.createElement("div");
  text.className = "time-stop-text";
  text.textContent = "時よ止まれ！";

  // 添加粒子
  const particles = createParticles();

  effect.appendChild(cracks);
  effect.appendChild(text);
  effect.appendChild(particles);
  document.body.appendChild(effect);

  // 5秒后移除效果
  setTimeout(() => effect.remove(), 5000);

  // 添加音效（需要准备音频文件）
  new Audio("./skill.mp3").play();
}

const correctSequence = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
];
// 保存用户输入的按键
let inputSequence = [];

document.addEventListener("DOMContentLoaded", () => {
  const oracleReactionEl = document.getElementById("oracle-reaction");
  const riddleDisplayEl = document.getElementById("riddle-display");
  const optionsAreaEl = document.getElementById("options-area");
  const scoreEl = document.getElementById("score");
  const timerEl = document.getElementById("timer");
  const livesEl = document.getElementById("lives");
  const streakEl = document.getElementById("streak");
  const messageTextEl = document.getElementById("message-text");
  const startButton = document.getElementById("start-button");
  const theWorldButton = document.getElementById("the-world");
  const gameOverScreenEl = document.getElementById("game-over-screen");
  const finalScoreEl = document.getElementById("final-score");
  const restartButton = document.getElementById("restart-button");
  const gameContainerEl = document.getElementById("game-container");
  const hellButton = document.getElementById("hell-btn");
  const audioEl = document.getElementById("bg");

  // --- Game Data ---
  const riddles = [
    {
      sequence: ["👨‍🍳", "🔥", "🍕"],
      answer: "🍕",
      distractors: ["🍔", "🎂", "🍜", "🧊"],
    },
    {
      sequence: ["💧", "🌱", "☀️"],
      answer: "🌸",
      distractors: ["🌲", "🍄", "🌵", "🍂"],
    },
    {
      sequence: ["📚", "🧑‍🎓", "🏫"],
      answer: "🧠",
      distractors: ["💪", "🎓", "🍎", "🧪"],
    },
    {
      sequence: ["🌙", "⭐", "🦉"],
      answer: "😴",
      distractors: ["☀️", "🥳", "🏃", "🛌"],
    },
    {
      sequence: ["🚗", "💨", "🏁"],
      answer: "🏆",
      distractors: ["🥈", "💰", "🚧", "🚦"],
    },
    {
      sequence: ["📧", "💻", "💬"],
      answer: "🧑‍💻",
      distractors: ["📞", "📝", "📺", "🎮"],
    },
    {
      sequence: ["🥶", "❄️", "🧥"],
      answer: "☃️",
      distractors: ["☀️", "🏖️", "🔥", "🧣"],
    },
    {
      sequence: ["🎂", "🎉", "🎁"],
      answer: "🥳",
      distractors: ["😢", "🎈", "🎊", "🍰"],
    },
    {
      sequence: ["👻", "🎃", "🍬"],
      answer: "💀",
      distractors: ["😈", "🕸️", "🌕", "🧙"],
    },
    {
      sequence: ["🎣", "🛶", "🐟"],
      answer: "🐠",
      distractors: ["🐡", "🦀", "🌊", "🎣"],
    },
    {
      sequence: ["✈️", "☁️", "🌍"],
      answer: "🧳",
      distractors: ["🗼", "🗺️", "🛂", "🧭"],
    },
    {
      sequence: ["🎨", "🖌️", "🖼️"],
      answer: "🧑‍🎨",
      distractors: ["🎭", "🗿", "📷", "🖍️"],
    },
    {
      sequence: ["🎤", "🎶", "💃"],
      answer: "🌟",
      distractors: ["🎸", "🥁", "🎟️", "🎬"],
    }, // Music, performance, star
    {
      sequence: ["🔬", "🧪", "💡"],
      answer: "🧑‍🔬",
      distractors: ["🧬", "🔭", "⚗️", "📊"],
    }, // Microscope, test tube, idea -> scientist
    {
      sequence: ["🧱", "🏗️", "👷"],
      answer: "🏠",
      distractors: ["🛠️", "🏢", "🔩", "📐"],
    }, // Bricks, crane, worker -> house
    {
      sequence: ["🚀", "⭐", "🪐"],
      answer: "🧑‍🚀",
      distractors: ["👽", "🛸", "🌌", "🛰️"],
    }, // Rocket, stars, planet -> astronaut
    {
      sequence: ["🧑‍🌾", "🚜", "🌾"],
      answer: "🍞",
      distractors: ["🌽", "🐄", "🐔", "🥕"],
    }, // Farmer, tractor, wheat -> bread
    {
      sequence: ["🎬", "🎥", "🍿"],
      answer: "🎞️",
      distractors: ["🌟", "🎭", "🎟️", "🧛"],
    }, // Clapperboard, camera, popcorn -> film
    {
      sequence: ["🔥", "🚒", "🧑‍🚒"],
      answer: "🧯",
      distractors: ["💧", "💨", "🚨", "🪜"],
    }, // Fire, fire engine, firefighter -> fire extinguisher
    {
      sequence: ["🌊", "🏄", "🏅"],
      answer: "🏆",
      distractors: ["🏊", "☀️", "🌊", "🥈"],
    }, // Wave, surfer, medal -> trophy (similar to existing race one, but surf specific)
    {
      sequence: ["✏️", "🗒️", "💡"],
      answer: "📖",
      distractors: ["✒️", "📜", "⌨️", "📚"],
    }, // Pencil, notebook, idea -> book (story)
    {
      sequence: ["💰", "🏦", "💳"],
      answer: "🤑",
      distractors: ["💵", "🪙", "🧾", "🧑‍💼"],
    }, // Money bag, bank, card -> money-mouth face
    {
      sequence: ["❤️", "💌", "💍"],
      answer: "💒",
      distractors: ["💔", "🌹", "🍫", "💘"],
    }, // Heart, love letter, ring -> wedding
    {
      sequence: ["⏰", "☕", "📰"],
      answer: "👔",
      distractors: ["🌙", "😴", "🥞", "🦷"],
    }, // Alarm, coffee, newspaper -> tie (ready for work)
  ];

  const oracleReactions = {
    correct: ["✨", "👍", "😄", "💯", "🎉", "🤩", "👌"],
    incorrect: ["😕", "🤦", "💢", "😥", "😬", "🙅"],
    timeout: ["😴", "💨", "😒", "⏳"],
    start: ["🔮", "🤔", "🧐"],
  };

  // --- Game State ---
  let score = 0;
  let lives = 3;
  let streak = 0;
  let currentRiddle = null;
  let timerInterval = null;
  let timeLeft = 10; // Initial time per riddle
  let optionsChangeInterval = null;
  let gameActive = false;
  let optionCycleSpeed = 2000; // ms for options to change if not answered
  let numOptions = 3; // Number of options displayed
  let stopTheTime = false;
  let hellMode = false;

  function theWorld() {
    stopTheTime = true;
    audioEl.pause();
    triggerTimeStop();
    setTimeout(() => {
      stopTheTime = false;
      if (hellMode) {
        audioEl.play();
      }
    }, 5000);
  }

  // --- Game Functions ---
  function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function updateUI() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    streakEl.textContent = streak;
    timerEl.textContent = timeLeft;
  }

  function setOracleReaction(type) {
    oracleReactionEl.textContent = getRandomElement(oracleReactions[type]);
    oracleReactionEl.style.transform = "scale(1.2)";
    setTimeout(() => {
      oracleReactionEl.style.transform = "scale(1)";
    }, 200);
  }

  function presentRiddle() {
    if (!gameActive || lives <= 0) return;

    currentRiddle = getRandomElement(riddles);
    riddleDisplayEl.textContent = currentRiddle.sequence.join(" + ");

    generateOptions();
    startRoundTimer();
  }

  function generateOptions() {
    optionsAreaEl.innerHTML = ""; // Clear previous options

    let options = [currentRiddle.answer];
    let availableDistractors = [...currentRiddle.distractors];

    while (options.length < numOptions && availableDistractors.length > 0) {
      const distractorIndex = Math.floor(
        Math.random() * availableDistractors.length
      );
      options.push(availableDistractors.splice(distractorIndex, 1)[0]);
    }
    // Fill with generic emojis if not enough specific distractors
    const genericEmojis = [
      "🍎",
      "🍌",
      "🍓",
      "🍒",
      "😊",
      "😂",
      "😍",
      "😎",
      "🤔",
      "😮",
      "🤯",
    ];
    while (options.length < numOptions) {
      let randomEmoji = getRandomElement(genericEmojis);
      if (!options.includes(randomEmoji)) {
        options.push(randomEmoji);
      }
    }

    options = shuffleArray(options);

    options.forEach((opt) => {
      const button = document.createElement("button");
      button.classList.add("option-button");
      button.textContent = opt;
      button.addEventListener("click", () => handleOptionClick(opt));
      optionsAreaEl.appendChild(button);
    });

    // Clear previous options change interval if any
    if (optionsChangeInterval) clearInterval(optionsChangeInterval);
    // Start interval to change options if not answered
    optionsChangeInterval = setInterval(() => {
      if (gameActive && lives > 0) {
        // Check if game is still active
        // Subtle visual cue that options are about to change or just changed
        optionsAreaEl.style.opacity = "0.5";
        setTimeout(() => {
          optionsAreaEl.style.opacity = "1";
          if (gameActive && lives > 0) generateOptions(); // Regenerate if game still active
        }, 150);
      } else {
        clearInterval(optionsChangeInterval);
      }
    }, optionCycleSpeed);
  }

  function handleOptionClick(selectedOption) {
    if (!gameActive) return;

    clearInterval(timerInterval);
    clearInterval(optionsChangeInterval); // Stop options from changing once an answer is clicked

    if (selectedOption === currentRiddle.answer) {
      score += 10 + timeLeft + streak * 2; // Base + time bonus + streak bonus
      streak++;
      setOracleReaction("correct");
      messageTextEl.textContent = "Correct! Nicely interpreted!";
      gameContainerEl.classList.add("correct-flash");
      setTimeout(() => gameContainerEl.classList.remove("correct-flash"), 500);
      // Increase difficulty slightly
      if (timeLeft > 3) timeLeft--; // Make rounds faster
      if (optionCycleSpeed > 800) optionCycleSpeed -= 100;
      if (streak % 5 === 0 && numOptions < 5) numOptions++; // Add more options
    } else {
      lives--;
      streak = 0;
      setOracleReaction("incorrect");
      messageTextEl.textContent = `Oops! The Oracle expected ${currentRiddle.answer}.`;
      gameContainerEl.classList.add("incorrect-flash");
      setTimeout(
        () => gameContainerEl.classList.remove("incorrect-flash"),
        500
      );
    }
    updateUI();

    if (lives <= 0) {
      endGame();
    } else {
      setTimeout(presentRiddle, 1500); // Delay before next riddle
    }
  }

  function startRoundTimer() {
    // timeLeft is now dynamically adjusted, so reset it for the round based on current difficulty
    // Let's set a base time for each round and adjust from there
    let currentRoundTime = Math.max(3, 10 - Math.floor(score / 100)); // Example: Time decreases as score increases
    timeLeft = currentRoundTime;
    timerEl.textContent = timeLeft;

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (stopTheTime) return;
      timeLeft--;
      timerEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        clearInterval(optionsChangeInterval);
        handleTimeout();
      }
    }, 1000);
  }

  function handleTimeout() {
    if (!gameActive) return;
    lives--;
    streak = 0;
    setOracleReaction("timeout");
    messageTextEl.textContent = "Too slow! The Oracle got bored.";
    updateUI();
    if (lives <= 0) {
      endGame();
    } else {
      setTimeout(presentRiddle, 1500);
    }
  }

  function startGame() {
    score = 0;
    lives = 3;
    streak = 0;
    timeLeft = 10; // Reset initial time
    optionCycleSpeed = 2000; // Reset option cycle speed
    numOptions = 3; // Reset number of options
    gameActive = true;

    startButton.classList.add("hidden");
    messageTextEl.textContent = "The Oracle is pondering...";
    gameOverScreenEl.classList.add("hidden");
    document.getElementById("info-area").classList.remove("hidden");
    document.getElementById("oracle-area").classList.remove("hidden");
    optionsAreaEl.classList.remove("hidden");

    setOracleReaction("start");
    updateUI();
    setTimeout(presentRiddle, 1000);
  }

  function endGame() {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    if (optionsChangeInterval) clearInterval(optionsChangeInterval);

    finalScoreEl.textContent = score;
    gameOverScreenEl.classList.remove("hidden");

    messageTextEl.textContent = "Game Over! The Oracle needs a nap.";
    riddleDisplayEl.textContent = "💤";
    optionsAreaEl.innerHTML = ""; // Clear options

    // Optionally hide game elements that are not needed on game over screen
    document.getElementById("info-area").classList.add("hidden");
    // document.getElementById('oracle-area').classList.add('hidden'); // Keep oracle reaction visible
    optionsAreaEl.classList.add("hidden");
  }

  // Event Listeners
  hellButton.addEventListener("click", () => {
    hellMode = true;
    audioEl.play();
  });
  theWorldButton.addEventListener("click", theWorld);
  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", () => {
    gameOverScreenEl.classList.add("hidden");
    startButton.classList.remove("hidden"); // Show start button again
    messageTextEl.textContent = 'Click "Start Game" to begin!';
    oracleReactionEl.textContent = "🔮"; // Reset oracle
    riddleDisplayEl.textContent = "🤔 + 🤔"; // Reset riddle display
    // Ensure main game UI elements are reset correctly for a new game
    lives = 3; // Reset lives for UI before game starts
    score = 0;
    streak = 0;
    timeLeft = 10;
    updateUI(); // Update UI to show initial state
  });
  // 监听键盘按下事件
  document.addEventListener("keydown", function (e) {
    // 忽略重复按键（长按触发的额外事件）
    if (e.repeat) return;

    // 将当前按键添加到输入序列
    inputSequence.push(e.key);

    // 保持输入序列长度不超过正确序列
    if (inputSequence.length > correctSequence.length) {
      inputSequence.shift(); // 移除最早的按键
    }

    // 检查输入序列是否匹配正确序列
    if (
      inputSequence.length === correctSequence.length &&
      inputSequence.every((key, index) => key === correctSequence[index])
    ) {
      lives += 99;
      // 清空输入序列以允许重新触发
      inputSequence = [];
      updateUI();
    }
  });

  // Initial setup
  updateUI(); // Show initial values
  document.getElementById("info-area").classList.add("hidden"); // Hide info until game starts
  optionsAreaEl.classList.add("hidden"); // Hide options until game starts
});
