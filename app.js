```javascript
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
    try {
      let id = localStorage.getItem("dice_casino_player_id");

      if (!id) {
        id = String(Math.floor(100000 + Math.random() * 900000));
        localStorage.setItem("dice_casino_player_id", id);
      }

      return id;
    } catch (error) {
      return "DEMO";
    }
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

    if ($("gameTitle")) {
      $("gameTitle").textContent = GAME_NAMES[mode];
    }

    if ($("roundNumber")) {
      $("roundNumber").textContent =
        "#" + String(roundNumber).padStart(6, "0");
    }

    if ($("roundStatus")) {
      $("roundStatus").textContent = "Приём ставок";
    }

    if ($("stageCaption")) {
      $("stageCaption").textContent = "СДЕЛАЙ СТАВКУ";
    }

    if ($("stageSubcaption")) {
      $("stageSubcaption").textContent =
        "Выбери ставку и её размер";
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
      die.className = "drawn-die";

      if (value === "★") {
        die.classList.add("gold-die");
        die.textContent = "★";
      } else {
        const number = Number(value);
        die.classList.add(number % 2 === 0 ? "black-die" : "white-die");

        for (let i = 0; i < 6; i++) {
          const dot = document.createElement("i");
          dot.className = "die-dot";
          die.appendChild(dot);
        }

        die.dataset.value = String(value);
        die.setAttribute("aria-label", "Кубик " + value);
      }

      display.appendChild(die);
    });
  }
```
```javascript
  // ТАЙМЕР РАУНДА
  function startTimer() {
    clearInterval(timerId);

    let seconds = 15;
    const timer = $("roundTimer");

    if (timer) timer.textContent = seconds;

    timerId = setInterval(() => {
      seconds--;

      if (timer) timer.textContent = seconds;

      if (seconds <= 0) {
        clearInterval(timerId);
        timerId = null;

        if ($("roundStatus")) {
          $("roundStatus").textContent = "Раунд завершён";
        }
      }
    }, 1000);
  }

  // РАЗМЕР СТАВКИ
  function setBet(amount) {
    const next = Math.floor(Number(amount));

    if (!Number.isFinite(next) || next < 1) {
      notify("Минимальная ставка — 1");
      return;
    }

    currentBet = Math.min(next, 100000000);

    const input = $("betAmount");
    if (input) input.value = String(currentBet);

    document.querySelectorAll("[data-bet]").forEach(button => {
      button.classList.toggle(
        "active",
        Number(button.dataset.bet) === currentBet
      );
    });

    updatePotentialWin();
  }

  function changeBet(direction) {
    const input = $("betAmount");
    const value = input ? Number(input.value) : currentBet;
    const step = value < 100 ? 10 : value < 1000 ? 100 : 1000;

    setBet(Math.max(1, (Number(value) || 1) + direction * step));
  }

  // БРОСОК КУБИКОВ
  function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
  }

  function rollSlots() {
    const symbols = ["7", "◆", "★", "●", "♛", "A"];
    return Array.from({ length: 3 }, () =>
      symbols[Math.floor(Math.random() * symbols.length)]
    );
  }

  function isWinningBet(result) {
    if (!selectedBet) return false;

    switch (selectedBet.type) {
      case "number":
        return result.includes(Number(selectedBet.value));

      case "even":
        return result.every(n => n % 2 === 0);

      case "odd":
        return result.every(n => n % 2 !== 0);

      case "black":
        return result.every(n => n % 2 === 0);

      case "white":
        return result.every(n => n % 2 !== 0);

      case "range": {
        const [min, max] = selectedBet.value.split("-").map(Number);
        return result.some(n => n >= min && n <= max);
      }

      case "gold":
        return result.includes(6);

      case "pair":
        return result[0] === result[1];

      case "triple":
        return result[0] === result[1] &&
          result[1] === result[2];

      case "special":
        return result.every(n => n === "★");

      default:
        return false;
    }
  }

  function placeBet() {
    if (busy) return;

    if (!selectedBet) {
      notify("Сначала выбери вариант ставки");
      return;
    }

    const input = $("betAmount");
    if (input) {
      const parsed = Number(input.value);

      if (!Number.isFinite(parsed) || parsed < 1) {
        notify("Укажи корректную сумму ставки");
        return;
      }

      currentBet = Math.floor(parsed);
    }

    if (currentBet > user.balance) {
      notify("Недостаточно средств для ставки");
      return;
    }

    if (currentBet < 1) {
      notify("Ставка должна быть больше нуля");
      return;
    }

    busy = true;

    const button = $("placeBetButton");
    if (button) {
      button.disabled = true;
      button.textContent = "ИДЁТ ИГРА...";
    }

    clearInterval(timerId);
    timerId = null;

    if ($("roundStatus")) {
      $("roundStatus").textContent = "Бросок...";
    }

    const isSlots = currentGame === "zeus" || currentGame === "house";
    let result;
    let won;

    if (isSlots) {
      result = rollSlots();
      won = selectedBet.type === "special"
        ? result.every(value => value === "★")
        : selectedBet.type === "triple"
          ? result[0] === result[1] && result[1] === result[2]
          : result[0] === result[1];
    } else {
      const count = currentGame === "wheel" ? 2 : 1;
      result = Array.from({ length: count }, rollDie);
      won = isWinningBet(result);
    }

    user.balance -= currentBet;

    const payout = won
      ? Math.floor(currentBet * selectedBet.multiplier)
      : 0;

    if (won) {
      user.balance += payout;
      user.totalWon += payout - currentBet;
      user.weekWon += payout - currentBet;
    } else {
      user.totalLost += currentBet;
      user.weekLost += currentBet;
    }

    roundNumber++;

    history.unshift({
      game: currentGame,
      bet: currentBet,
      won,
      payout,
      result: result.join(" ")
    });

    history = history.slice(0, 10);

    renderGameStage(result);
    updateBalance();
    renderHistory();

    if ($("stageCaption")) {
      $("stageCaption").textContent = won ? "ВЫИГРЫШ" : "НЕ ПОВЕЗЛО";
    }

    if ($("stageSubcaption")) {
      $("stageSubcaption").textContent = won
        ? "Выплата: " + formatNumber(payout)
        : "Попробуй ещё раз";
    }

    if ($("roundStatus")) {
      $("roundStatus").textContent = won ? "Выигрыш" : "Проигрыш";
    }

    showResult(won, payout, result);

    setTimeout(() => {
      busy = false;

      const betButton = $("placeBetButton");

      if (betButton) {
        betButton.disabled = false;
        betButton.textContent = "СДЕЛАТЬ СТАВКУ";
      }

      if ($("roundNumber")) {
        $("roundNumber").textContent =
          "#" + String(roundNumber).padStart(6, "0");
      }

      if ($("roundStatus")) {
        $("roundStatus").textContent = "Приём ставок";
      }

      startTimer();
    }, 1400);
  }

  // РЕЗУЛЬТАТ РАУНДА
  function showResult(won, payout, result) {
    const modal = $("resultModal");
    if (!modal) {
      notify(won
        ? "Выигрыш: " + formatNumber(payout)
        : "Ставка проиграла");
      return;
    }

    const title = $("resultTitle");
    const amount = $("resultAmount");
    const description = $("resultDescription");

    if (title) title.textContent = won ? "Выигрыш!" : "Раунд завершён";
    if (amount) {
      amount.textContent = won
        ? "+" + formatNumber(payout)
        : "-" + formatNumber(currentBet);
    }
    if (description) {
      description.textContent = "Результат: " + result.join(" · ");
    }

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    modal.style.display = "flex";
  }

  function closeModal() {
    ["resultModal", "moneyModal", "utilityModal"].forEach(id => {
      const modal = $(id);
      if (!modal) return;

      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
      modal.style.display = "";
    });
  }

  function renderHistory() {
    const list = $("historyList");
    if (!list) return;

    list.replaceChildren();

    if (!history.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "История раундов пока пуста";
      list.appendChild(empty);
      return;
    }

    history.forEach(item => {
      const row = document.createElement("div");
      row.className = "history-item " + (item.won ? "win" : "loss");

      const game = document.createElement("span");
      game.textContent = GAME_NAMES[item.game] || item.game;

      const result = document.createElement("span");
      result.textContent = item.result;

      const amount = document.createElement("strong");
      amount.textContent = item.won
        ? "+" + formatNumber(item.payout - item.bet)
        : "-" + formatNumber(item.bet);

      row.append(game, result, amount);
      list.appendChild(row);
    });
  }

  function renderProfile() {
    updateBalance();

    const nickname = $("nicknameInput");
    if (nickname) nickname.value = user.nickname;

    const color = $("nicknameColor");
    if (color) color.value = user.nicknameColor;
  }

  function renderLeaderboard() {
    const list = $("leaderboardList");
    if (!list) return;

    list.replaceChildren();

    const row = document.createElement("div");
    row.className = "leaderboard-item";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = "1";

    const player = document.createElement("span");
    player.className = "leaderboard-user";
    player.textContent = user.nickname + " · Вы";

    const score = document.createElement("strong");
    score.className = "leaderboard-value";
    score.textContent = formatNumber(user.balance);

    row.append(rank, player, score);
    list.appendChild(row);
  }

  function openUtility(title, description) {
    const modal = $("utilityModal");

    if (!modal) {
      notify(title + ": " + description);
      return;
    }

    const heading = $("utilityTitle");
    const text = $("utilityDescription");

    if (heading) heading.textContent = title;
    if (text) text.textContent = description;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    modal.style.display = "flex";
  }
```
```javascript
  // ДЕНЕЖНОЕ ОКНО
  function openMoneyModal() {
    openUtility(
      "Баланс",
      "Текущий баланс: " + formatNumber(user.balance) +
      ". В этой демоверсии пополнение и вывод средств не подключены."
    );
  }

  // ПРОМОКОД
  function usePromo() {
    const input = $("promoInput");
    const code = input ? input.value.trim() : "";

    if (!code) {
      notify("Введи промокод");
      return;
    }

    if (user.promoUsed) {
      notify("Промокод уже использован");
      return;
    }

    if (code !== PROMO_CODE) {
      notify("Такого промокода нет");
      return;
    }

    user.balance += 5000;
    user.promoUsed = true;
    saveUser();
    updateBalance();

    if (input) input.value = "";

    notify("Промокод активирован: +5 000");
  }

  // СОХРАНЕНИЕ ПРОФИЛЯ
  function saveProfile() {
    const input = $("nicknameInput");
    const color = $("nicknameColor");

    if (input) {
      const nickname = input.value.trim();

      if (nickname.length < 2 || nickname.length > 20) {
        notify("Ник должен содержать от 2 до 20 символов");
        return;
      }

      user.nickname = nickname;
    }

    if (color && /^#[0-9a-f]{6}$/i.test(color.value)) {
      user.nicknameColor = color.value;
    }

    saveUser();
    updateBalance();
    renderProfile();
    notify("Профиль сохранён");
  }

  // ПРИВЯЗКА КНОПОК
  function bindButtons() {
    // Навигация нижнего меню
    document.querySelectorAll(".nav-item").forEach(button => {
      button.addEventListener("click", () => {
        const target = button.dataset.screen;

        if (target) {
          navigateTo(target);
        } else {
          notify("Для этой кнопки не задан экран");
        }
      });
    });

    // Переходы по кнопкам с data-screen
    document.querySelectorAll("[data-screen]").forEach(button => {
      if (button.classList.contains("nav-item")) return;

      button.addEventListener("click", () => {
        navigateTo(button.dataset.screen);
      });
    });

    // Открытие игрового режима
    document.querySelectorAll("[data-game]").forEach(button => {
      button.addEventListener("click", () => {
        openGame(button.dataset.game);
      });
    });

    // Открытие игр по классам карточек
    document.querySelectorAll(".game-card, .mode-row").forEach(button => {
      if (button.hasAttribute("data-game")) return;

      button.addEventListener("click", () => {
        const game = button.dataset.mode || button.dataset.id;

        if (game && GAME_NAMES[game]) {
          openGame(game);
        } else {
          notify("Для этой игры ещё не настроен режим");
        }
      });
    });

    // Возврат назад
    document.querySelectorAll(".back-button, [data-back]").forEach(button => {
      button.addEventListener("click", () => {
        closeModal();

        const target = button.dataset.back;

        if (target && $(target)) {
          navigateTo(target);
        } else {
          navigateTo("gamesScreen");
        }
      });
    });

    // Размер ставки
    const betInput = $("betAmount");

    if (betInput) {
      betInput.addEventListener("change", () => {
        setBet(betInput.value);
      });

      betInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          setBet(betInput.value);
        }
      });
    }

    document.querySelectorAll("[data-bet]").forEach(button => {
      button.addEventListener("click", () => {
        setBet(button.dataset.bet);
      });
    });

    const increase = $("increaseBet");
    const decrease = $("decreaseBet");

    if (increase) {
      increase.addEventListener("click", () => changeBet(1));
    }

    if (decrease) {
      decrease.addEventListener("click", () => changeBet(-1));
    }

    // Основная ставка
    const placeButton = $("placeBetButton");

    if (placeButton) {
      placeButton.addEventListener("click", placeBet);
    }

    // Закрытие окон
    document.querySelectorAll("[data-close-modal], .modal-close").forEach(button => {
      button.addEventListener("click", closeModal);
    });

    ["resultModal", "moneyModal", "utilityModal"].forEach(id => {
      const modal = $(id);

      if (!modal) return;

      modal.addEventListener("click", event => {
        if (event.target === modal) closeModal();
      });
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeModal();
    });

    // Профиль
    const saveProfileButton = $("saveProfileButton");

    if (saveProfileButton) {
      saveProfileButton.addEventListener("click", saveProfile);
    }

    // Промокод
    const promoButton = $("promoButton");

    if (promoButton) {
      promoButton.addEventListener("click", usePromo);
    }

    // Баланс
    ["addBalanceButton", "topUpButton", "balancePlus"].forEach(id => {
      const button = $(id);

      if (button) {
        button.addEventListener("click", openMoneyModal);
      }
    });

    // Универсальные действия
    document.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", () => {
        switch (button.dataset.action) {
          case "profile":
            navigateTo("profileScreen");
            break;

          case "leaderboard":
          case "top":
            navigateTo("topScreen");
            break;

          case "home":
            navigateTo("homeScreen");
            break;

          case "games":
            navigateTo("gamesScreen");
            break;

          case "balance":
            openMoneyModal();
            break;

          case "promo":
            openUtility(
              "Промокод",
              "Введи промокод в поле на странице профиля."
            );
            break;

          case "close":
            closeModal();
            break;

          default:
            notify("Это действие пока не подключено");
        }
      });
    });
  }

  // ЗАПУСК
  function init() {
    user = loadUser();

    if ($("betAmount") && !$("betAmount").value) {
      $("betAmount").value = String(currentBet);
    }

    bindButtons();
    updateBalance();
    renderHistory();

    const firstScreen = SCREENS.find(id => $(id) && $(id) .classList.contains("active"))
      || "homeScreen";

    if ($(firstScreen)) {
      navigateTo(firstScreen);
    } else {
      const availableScreen = SCREENS.find(id => $(id));

      if (availableScreen) {
        navigateTo(availableScreen);
      } else {
        console.error("Не найдено ни одного экрана. Проверь index.html.");
      }
    }

    if ($("placeBetButton")) {
      $("placeBetButton").disabled = false;
      $("placeBetButton").textContent = "СДЕЛАТЬ СТАВКУ";
    }

    console.log("Dice Casino запущен");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
```
