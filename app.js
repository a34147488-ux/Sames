
"use strict";

(() => {
  const $ = (id) => document.getElementById(id);

  const STORAGE_KEY = "dice_casino_state_v2";
  const PROMO_CODE = "gsusyfshdhzjdbsvfs";

  const SCREENS = [
    "homeScreen",
    "gamesScreen",
    "gameScreen",
    "profileScreen",
    "topScreen",
    "moreScreen"
  ];

  const GAME_NAMES = {
    wheel: "Dice Wheel",
    dice: "Dice",
    zeus: "Dice Zeus",
    house: "Dice House"
  };

  let user;
  let currentGame = "wheel";
  let selectedBet = null;
  let currentBet = 1000;
  let busy = false;
  let roundNumber = 1;
  let timerId = null;
  let toastId = null;
  let resultId = null;
  let history = [];

  function defaultUser() {
    return {
      nickname: "Игрок",
      nicknameColor: "#ffffff",
      balance: 10000,
      totalWon: 0,
      totalLost: 0,
      weekWon: 0,
      weekLost: 0,
      promoUsed: false,
      createdPromos: []
    };
  }

  function loadUser() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored
        ? { ...defaultUser(), ...JSON.parse(stored) }
        : defaultUser();
    } catch (error) {
      console.error("Ошибка чтения сохранения:", error);
      return defaultUser();
    }
  }

  function saveUser() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error("Ошибка сохранения:", error);
    }
  }

  function formatNumber(value) {
    return Math.floor(Number(value) || 0).toLocaleString("ru-RU");
  }

  function notify(message) {
    const toast = $("toast");

    if (!toast) {
      alert(message);
      return;
    }

    toast.textContent = message;
    toast.style.display = "block";
    toast.classList.add("show");

    clearTimeout(toastId);
    toastId = setTimeout(() => {
      toast.classList.remove("show");
      toast.style.display = "";
    }, 2600);
  }

  function getPlayerId() {
    let id = localStorage.getItem("dice_casino_player_id");

    if (!id) {
      id = String(Math.floor(100000 + Math.random() * 900000));
      localStorage.setItem("dice_casino_player_id", id);
    }

    return id;
  }

  function updateBalance() {
    const values = {
      headerBalance: user.balance,
      gamesBalance: user.balance,
      gameBalance: user.balance,
      profileBalance: user.balance,
      totalWon: user.totalWon,
      totalLost: user.totalLost,
      weekWon: user.weekWon,
      weekLost: user.weekLost
    };

    Object.entries(values).forEach(([id, value]) => {
      const element = $(id);
      if (element) element.textContent = formatNumber(value);
    });

    if ($("profileNickname")) {
      $("profileNickname").textContent = user.nickname;
      $("profileNickname").style.color = user.nicknameColor;
    }

    if ($("profileAvatar")) {
      $("profileAvatar").textContent =
        (user.nickname || "И").slice(0, 1).toUpperCase();
    }

    if ($("profileId")) {
      $("profileId").textContent = "ID: " + getPlayerId();
    }

    updatePotentialWin();
    saveUser();
  }

  function updatePotentialWin() {
    const element = $("potentialWin");
    if (!element) return;

    const multiplier = selectedBet ? selectedBet.multiplier : 12;
    element.textContent = formatNumber(currentBet * multiplier);
  }

  // НАВИГАЦИЯ
  function navigateTo(screenId) {
    if (!SCREENS.includes(screenId) || !$(screenId)) {
      console.error("Экран не найден:", screenId);
      notify("Не удалось открыть раздел: " + screenId);
      return;
    }

    SCREENS.forEach(id => {
      const screen = $(id);
      screen.classList.toggle("active", id === screenId);
      screen.hidden = id !== screenId;
      screen.setAttribute("aria-hidden", String(id !== screenId));
    });

    document.querySelectorAll(".nav-item").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.screen === screenId
      );
    });

    if (screenId === "profileScreen") renderProfile();
    if (screenId === "topScreen") renderLeaderboard();

    window.scrollTo({ top: 0, behavior: "smooth" });
    updateBalance();
  }

  // ИГРЫ
  function openGame(mode) {
    if (!GAME_NAMES[mode]) {
      notify("Неизвестный игровой режим");
      return;
    }

    currentGame = mode;
    selectedBet = null;

    if ($("gameTitle")) $("gameTitle").textContent = GAME_NAMES[mode];
    if ($("roundNumber")) {
      $("roundNumber").textContent =
        "#" + String(roundNumber).padStart(6, "0");
    }

    if ($("roundStatus")) $("roundStatus").textContent = "Приём ставок";
    if ($("stageCaption")) $("stageCaption").textContent = "СДЕЛАЙ СТАВКУ";
    if ($("stageSubcaption")) {
      $("stageSubcaption").textContent = "Выбери ставку и её размер";
    }

    renderBetOptions();
    renderGameStage();
    navigateTo("gameScreen");
    startTimer();
  }

  function renderBetOptions() {
    const container = $("betOptions");
    if (!container) return;

    container.replaceChildren();

    let options;

    if (currentGame === "wheel") {
      options = [
        ...Array.from({ length: 11 }, (_, i) => [
          "Число " + (i + 2), "number", String(i + 2), 12
        ]),
        ["Чёт", "even", "even", 2],
        ["Нечёт", "odd", "odd", 2],
        ["Оба чёрные", "black", "black", 2],
        ["Оба белые", "white", "white", 2],
        ["Диапазон 2–6", "range", "2-6", 2],
        ["Диапазон 7–12", "range", "7-12", 2],
        ["Золотой кубик", "gold", "gold", 12]
      ];
    } else if (currentGame === "dice") {
      options = [
        ...Array.from({ length: 6 }, (_, i) => [
          "Число " + (i + 1), "number", String(i + 1), 6
        ]),
        ["Чёт", "even", "even", 2],
        ["Нечёт", "odd", "odd", 2],
        ["Чёрный", "black", "black", 2],
        ["Белый", "white", "white", 2]
      ];
    } else {
      options = [
        ["Пара", "pair", "pair", 2],
        ["Три одинаковых", "triple", "triple", 8],
        ["Главный символ", "special", "special", 20]
      ];
    }

    options.forEach(([label, type, value, multiplier]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "bet-option";
      button.setAttribute("aria-pressed", "false");

      const name = document.createElement("span");
      name.textContent = label;

      const odds = document.createElement("strong");
      odds.textContent = "×" + multiplier;

      button.append(name, odds);

      button.addEventListener("click", () => {
        selectedBet = { type, value, multiplier, label };

        container.querySelectorAll(".bet-option").forEach(item => {
          item.classList.remove("active", "selected");
          item.setAttribute("aria-pressed", "false");
        });

        button.classList.add("active", "selected");
        button.setAttribute("aria-pressed", "true");
        updatePotentialWin();
      });

      container.appendChild(button);
    });
  }

  function renderGameStage(values) {
    const display = $("diceDisplay");
    if (!display) return;

    display.replaceChildren();

    if (currentGame === "zeus" || currentGame === "house") {
      const frame = document.createElement("div");
      frame.className = "slot-frame";

      (values || ["?", "?", "?"]).forEach(value => {
        const tile = document.createElement("div");
        tile.className = "slot-die";
        tile.textContent = value;
        frame.appendChild(tile);
      });

      display.appendChild(frame);
      return;
    }

    const count = currentGame === "wheel" ? 2 : 1;

    (values || Array(count).fill("?")).forEach(value => {
      const die = document.createElement("div");
      die.className = "drawn-die white-die result-die";
      die.textContent = String(value);
      display.appendChild(die);
    });
  }

  function setBet(value) {
    const amount = Math.floor(Number(value));

    if (!Number.isFinite(amount) || amount < 1) {
      notify("Укажи корректную ставку");
      return;
    }

    currentBet = amount;

    if ($("betAmount")) $("betAmount").value = String(amount);
    updatePotentialWin();
  }

  function changeBet(direction) {
    const inputValue = Number($("betAmount")?.value || currentBet);
    const step = Math.max(100, Math.floor(inputValue * 0.25));

    setBet(Math.max(1, inputValue + direction * step));
  }

  function placeBet() {
    if (busy) return notify("Дождись завершения раунда");
    if (!selectedBet) return notify("Сначала выбери ставку");

    const amount = Math.floor(Number($("betAmount")?.value || currentBet));

    if (!Number.isFinite(amount) || amount < 1) {
      return notify("Укажи корректную сумму");
    }

    if (amount > user.balance) {
      return notify("Недостаточно монет");
    }

    currentBet = amount;
    busy = true;

    if (timerId) clearInterval(timerId);

    const button = $("placeBetButton");
    if (button) {
      button.disabled = true;
      button.textContent = "РАУНД ИДЁТ…";
    }

    user.balance -= amount;
    updateBalance();

    if ($("roundStatus")) $("roundStatus").textContent = "Раунд идёт";
    if ($("stageCaption")) $("stageCaption").textContent = "БРОСОК…";

    setTimeout(() => finishRound(amount), 900);
  }

  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function finishRound(amount) {
    let payout = 0;
    let description = "";

    if (currentGame === "wheel") {
      const gold = Math.random() < 0.025;
      const a = gold ? "★" : random(1, 6);
      const b = random(1, 6);
      const total = (a === "★" ? 0 : a) + b;

      renderGameStage([a, b]);
      description = gold ? "Выпал золотой кубик" :
        `Кубики: ${a} и ${b}. Сумма: ${total}`;

      if (gold) {
        if (selectedBet.type === "gold") payout = amount * 12;
      } else {
        switch (selectedBet.type) {
          case "number":
            if (total === Number(selectedBet.value)) payout = amount * 12;
            break;
          case "even":
            if (total % 2 === 0) payout = amount * 2;
            break;
          case "odd":
            if (total % 2 !== 0) payout = amount * 2;
            break;
          case "black":
            if (a % 2 === 0 && b % 2 === 0) payout = amount * 2;
            break;
          case "white":
            if (a % 2 !== 0 && b % 2 !== 0) payout = amount * 2;
            break;
          case "range":
            if (
              (selectedBet.value === "2-6" && total >= 2 && total <= 6) ||
              (selectedBet.value === "7-12" && total >= 7 && total <= 12)
            ) payout = amount * 2;
            break;
        }
      }
    } else if (currentGame === "dice") {
      const die = random(1, 6);
      renderGameStage([die]);
      description = "Выпало число " + die;

      switch (selectedBet.type) {
        case "number":
          if (die === Number(selectedBet.value)) payout = amount * 6;
          break;
        case "even":
          if (die % 2 === 0) payout = amount * 2;
          break;
        case "odd":
          if (die % 2 !== 0) payout = amount * 2;
          break;
        case "black":
          if ([2, 4, 6].includes(die)) payout = amount * 2;
          break;
        case "white":
          if ([1, 3, 5].includes(die)) payout = amount * 2;
          break;
      }
    } else {
      const symbols = currentGame === "zeus"
        ? ["ZEUS", "CROWN", "GEM", "LIGHTNING"]
        : ["HOUSE", "DOG", "BONE", "GEM"];

      const reels = [
        symbols[random(0, 3)],
        symbols[random(0, 3)],
        symbols[random(0, 3)]
      ];

      renderGameStage(reels);
      description = reels.join(" · ");

      const triple = reels[0] === reels[1] && reels[1] === reels[2];
      const pair = reels[0] === reels[1] ||
        reels[1] === reels[2] || reels[0] === reels[2];

      if (selectedBet.type === "special" && triple && reels[0] === symbols[0]) {
        payout = amount * 20;
      } else if (selectedBet.type === "triple" && triple) {
        payout = amount * 8;
      } else if (selectedBet.type === "pair" && pair) {
        payout = amount * 2;
      }
    }

    const net = payout - amount;
    user.balance += payout;

    if (net > 0) {
      user.totalWon += net;
      user.weekWon += net;
    } else {
      user.totalLost += Math.abs(net);
      user.weekLost += Math.abs(net);
    }

    history.unshift({
      round: roundNumber,
      game: GAME_NAMES[currentGame],
      net,
      description
    });

    history = history.slice(0, 10);
    roundNumber++;

    saveUser();
    updateBalance();
    renderHistory();

    if ($("roundStatus")) $("roundStatus").textContent = "Раунд завершён";
    if ($("stageCaption")) {
      $("stageCaption").textContent = net > 0 ? "ПОБЕДА" : "РАУНД ЗАВЕРШЁН";
    }
    if ($("stageSubcaption")) $("stageSubcaption").textContent = description;
    if ($("roundNumber")) {
      $("roundNumber").textContent =
        "#" + String(roundNumber).padStart(6, "0");
    }

    busy = false;

    if (button = $("placeBetButton")) {
      button.disabled = false;
      button.textContent = "СДЕЛАТЬ СТАВКУ";
    }

    showResult(net, description);
    startTimer();
  }

  function showResult(net, description) {
    const overlay = $("resultOverlay");

    if (!overlay) {
      notify((net > 0 ? "Вы выиграли " : "Вы проиграли ") +
        formatNumber(Math.abs(net)));
      return;
    }

    if ($("resultTitle")) {
      $("resultTitle").textContent =
        net > 0 ? "ВЫ ВЫИГРАЛИ" : "ВЫ ПРОИГРАЛИ";
    }

    if ($("resultAmount")) {
      $("resultAmount").textContent = formatNumber(Math.abs(net));
    }

    if ($("resultDescription")) {
      $("resultDescription").textContent = description;
    }

    overlay.classList.add("show");
    overlay.style.display = "flex";

    clearTimeout(resultId);
    resultId = setTimeout(closeResult, 4500);
  }

  function closeResult() {
    const overlay = $("resultOverlay");
    if (!overlay) return;

    overlay.classList.remove("show");
    overlay.style.display = "";
    clearTimeout(resultId);
  }

  function startTimer() {
    clearInterval(timerId);

    let seconds = 15;
    if ($("roundTimer")) $("roundTimer").textContent = seconds;

    timerId = setInterval(() => {
      if (busy) {
        clearInterval(timerId);
        return;
      }

      seconds--;

      if ($("roundTimer")) {
        $("roundTimer").textContent = Math.max(0, seconds);
      }

      if (seconds <= 0) {
        clearInterval(timerId);
        if ($("roundStatus")) $("roundStatus").textContent = "Приём ставок";
        if ($("roundTimer")) $("roundTimer").textContent = "∞";
      }
    }, 1000);
  }

  function renderHistory() {
    const container = $("roundHistory");
    if (!container) return;

    container.replaceChildren();

    if (!history.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "История появится после завершения раундов";
      container.appendChild(empty);
      return;
    }

    history.forEach(item => {
      const row = document.createElement("div");
      row.className = "history-item";

      const label = document.createElement("span");
      label.textContent = `#${item.round} · ${item.game}`;

      const result = document.createElement("strong");
      result.textContent = (item.net >= 0 ? "+" : "−") +
        formatNumber(Math.abs(item.net));
      result.className = item.net >= 0 ? "positive" : "negative";

      row.append(label, result);
      container.appendChild(row);
    });
  }

  // МОДАЛЬНЫЕ ОКНА
  function closeModal() {
    const backdrop = $("modalBackdrop");
    if (!backdrop) return;

    backdrop.classList.remove("show");
    backdrop.style.display = "";
  }

  function closeModalFromBackdrop(event) {
    if (event.target === $("modalBackdrop")) closeModal();
  }

  function openModal(title, content, actions = []) {
    if (!$("modalBackdrop")) {
      alert(title + "\n" + content);
      return;
    }

    $("modalTitle").textContent = title;
    $("modalBody").replaceChildren();
    $("modalActions").replaceChildren();

    if (typeof content === "string") {
      const paragraph = document.createElement("p");
      paragraph.textContent = content;
      $("modalBody").appendChild(paragraph);
    } else {
      $("modalBody").appendChild(content);
    }

    actions.forEach(action => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = action.className || "action-button";
      button.textContent = action.label;
      button.addEventListener("click", action.onClick);
      $("modalActions").appendChild(button);
    });

    $("modalBackdrop").classList.add("show");
    $("modalBackdrop").style.display = "flex";
  }

  function makeInput(placeholder, value = "", type = "text") {
    const input = document.createElement("input");
    input.type = type;
    input.placeholder = placeholder;
    input.value = value;
    input.className = "modal-input";
    return input;
  }

  function openMoneyModal(kind) {
    if (kind === "deposit") {
      const input = makeInput("Сумма в рублях (от 150)", "150", "number");

      openModal("Пополнение", input, [{
        label: "ПРОДОЛЖИТЬ",
        onClick: () => {
          if (Number(input.value) < 150) return notify("Минимум 150 ₽");
          closeModal();
          notify("Реальные платежи ещё не подключены");
        }
      }]);
      return;
    }

    openModal(
      "Вывод средств",
      `Баланс: ${formatNumber(user.balance)} монет. Минимум для вывода — 1 000 000 монет. Реальные выплаты не подключены, баланс не будет списан.`,
      [{ label: "ЗАКРЫТЬ", onClick: closeModal }]
    );
  }

  function openSubscription() {
    openModal("Подписка", "Покупка подписки пока не подключена.", [
      { label: "ПОНЯТНО", onClick: closeModal }
    ]);
  }

  function openUtility(type) {
    if (type === "nickname") {
      const input = makeInput("Новый никнейм", user.nickname);

      openModal("Изменение никнейма", input, [{
        label: "СОХРАНИТЬ",
        onClick: () => {
          const value = input.value.trim();

          if (value.length < 2 || value.length > 20) {
            return notify("Ник должен содержать от 2 до 20 символов");
          }

          user.nickname = value;
          saveUser();
          updateBalance();
          closeModal();
          notify("Никнейм сохранён");
        }
      }]);
      return;
    }

    if (type === "color") {
      const box = document.createElement("div");

      [
        ["Белый", "#ffffff"],
        ["Золотой", "#ffd45a"],
        ["Фиолетовый", "#b58cff"],
        ["Красный", "#ff667d"],
        ["Зелёный", "#68e6a0"]
      ].forEach(([label, color]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.style.color = color;

        button.addEventListener("click", () => {
          user.nicknameColor = color;
          saveUser();
          updateBalance();
          closeModal();
        });

        box.appendChild(button);
      });

      openModal("Цвет ника", box);
      return;
    }

    if (type === "promo") {
      const input = makeInput("Введите промокод");

      openModal("Промокоды", input, [{
        label: "АКТИВИРОВАТЬ",
        onClick: () => {
          if (input.value.trim().toLowerCase() !== PROMO_CODE) {
            return notify("Промокод не найден");
          }

          if (user.promoUsed) {
            return notify("В этой версии код можно активировать один раз");
          }

          user.balance += 100000000;
          user.promoUsed = true;
          saveUser();
          updateBalance();
          closeModal();
          notify("Начислено 100 000 000 монет");
        }
      }]);
      return;
    }

    if (type === "referrals") {
      openModal(
        "Реферальная система",
        "Для безопасного начисления бонусов необходим сервер, который проверяет приглашения.",
        [{ label: "ЗАКРЫТЬ", onClick: closeModal }]
      );
      return;
    }

    if (type === "transfer") {
      const recipient = makeInput("Никнейм получателя");
      const amount = makeInput("Сумма", "1000", "number");
      const box = document.createElement("div");
      box.append(recipient, amount);

      openModal("Перевод монет", box, [{
        label: "ПЕРЕВЕСТИ",
        onClick: () => {
          notify("Переводы пока не подключены. Монеты не списаны.");
          closeModal();
        }
      }]);
      return;
    }

    if (type === "agreement") {
      openModal(
        "Пользовательское соглашение",
        "Игровые механики демонстрационные. Баланс хранится в браузере, не является защищённым серверным счётом. Реальные платежи и выплаты не подключены.",
        [{ label: "ЗАКРЫТЬ", onClick: closeModal }]
      );
    }
  }

  function renderProfile() {
    updateBalance();
  }

  function renderLeaderboard() {
    if ($("topFirstName")) $("topFirstName").textContent = user.nickname;
    if ($("topFirstWon")) $("topFirstWon").textContent = formatNumber(user.totalWon);
    if ($("topSecondName")) $("topSecondName").textContent = "Пока нет данных";
    if ($("topSecondWon")) $("topSecondWon").textContent = "0";
    if ($("topThirdName")) $("topThirdName").textContent = "Пока нет данных";
    if ($("topThirdWon")) $("topThirdWon").textContent = "0";

    if ($("leaderboardList")) {
      $("leaderboardList").textContent =
        "Общий рейтинг появится после подключения серверной базы.";
    }
  }

  // ПРИВЯЗКА ВСЕХ КНОПОК
  function bindButtons() {
    // Дублируем onclick-функции, чтобы они работали и после обновления JS.
    window.navigateTo = navigateTo;
    window.openGame = openGame;
    window.changeBet = changeBet;
    window.setBet = setBet;
    window.placeBet = placeBet;
    window.openMoneyModal = openMoneyModal;
    window.openSubscription = openSubscription;
    window.openUtility = openUtility;
    window.closeModal = closeModal;
    window.closeModalFromBackdrop = closeModalFromBackdrop;
    window.closeResult = closeResult;

    // Навигация внизу.
    document.querySelectorAll(".nav-item").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        const screenId = button.dataset.screen;
        if (screenId) navigateTo(screenId);
      });
    });

    // Кнопки назад и главная кнопка игры.
    document.querySelectorAll(".back-button").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();

        const parent = button.closest(".screen");
        if (parent?.id === "gameScreen") {
          navigateTo("gamesScreen");
        } else {
          navigateTo("homeScreen");
        }
      });
    });

    const playMain = document.querySelector(".play-main");
    if (playMain) {
      playMain.addEventListener("click", event => {
        event.preventDefault();
        navigateTo("gamesScreen");
      });
    }

    // Карточки игр.
    document.querySelectorAll(".game-card, .mode-row").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();

        const inline = button.getAttribute("onclick") || "";
        const match = inline.match(/openGame\(['"]([^'"]+)['"]\)/);
        if (match) openGame(match[1]);
      });
    });

    // Открытие профиля, топа, раздела «Ещё» через любые элементы меню.
    document.querySelectorAll("[onclick]").forEach(element => {
      const code = element.getAttribute("onclick") || "";

      if (code.includes("navigateTo(")) {
        const match = code.match(/navigateTo\(['"]([^'"]+)['"]\)/);
        if (match) {
          element.addEventListener("click", event => {
            event.preventDefault();
            navigateTo(match[1]);
          });
        }
      }
    });

    if ($("betAmount")) {
      $("betAmount").addEventListener("input", () => {
        const value = Number($("betAmount").value);
        if (Number.isFinite(value) && value > 0) {
          currentBet = Math.floor(value);
          updatePotentialWin();
        }
      });
    }

    if ($("modalBackdrop")) {
      $("modalBackdrop").addEventListener("click", closeModalFromBackdrop);
    }

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeModal();
        closeResult();
      }
    });
  }

  function initTelegram() {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg) return;

      tg.ready();
      tg.expand();

      if (tg.setHeaderColor) tg.setHeaderColor("#130824");
      if (tg.setBackgroundColor) tg.setBackgroundColor("#130824");
    } catch (error) {
      console.warn("Telegram WebApp:", error);
    }
  }

  function init() {
    user = loadUser();

    bindButtons();
    initTelegram();

    SCREENS.forEach(id => {
      if ($(id)) {
        const active = id === "homeScreen";
        $(id).classList.toggle("active", active);
        $(id).hidden = !active;
      }
    });

    renderBetOptions();
    renderLeaderboard();
    updateBalance();

    console.log("Dice Casino app.js успешно запущен");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

