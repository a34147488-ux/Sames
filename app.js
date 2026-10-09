```javascript
"use strict";

/* DICE CASINO — совместимый app.js */

(() => {
  const $ = id => document.getElementById(id);

  const STORAGE = "dice_casino_state_v2";
  const PROMO = "gsusyfshdhzjdbsvfs";

  let user;
  let currentScreen = "homeScreen";
  let currentGame = "wheel";
  let selectedBet = null;
  let bet = 1000;
  let busy = false;
  let roundNumber = 1;
  let timerInterval = null;
  let toastTimer = null;
  let resultTimer = null;
  let history = [];

  const gameNames = {
    wheel: "Dice Wheel",
    dice: "Dice",
    zeus: "Dice Zeus",
    house: "Dice House"
  };

  const defaultUser = () => ({
    nickname: "Игрок",
    nicknameColor: "#ffffff",
    balance: 10000,
    totalWon: 0,
    totalLost: 0,
    weekWon: 0,
    weekLost: 0,
    rounds: 0,
    createdAt: Date.now(),
    promoUsed: false,
    usedPromos: [],
    createdPromos: [],
    transactions: []
  });

  function loadUser() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
      return saved ? { ...defaultUser(), ...saved } : defaultUser();
    } catch {
      return defaultUser();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(user));
    } catch (e) {
      console.error("Не удалось сохранить данные", e);
    }
  }

  function fmt(value) {
    return Math.floor(Number(value) || 0).toLocaleString("ru-RU");
  }

  function money(value) {
    return (Math.max(0, Number(value) || 0) * 0.0009)
      .toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
  }

  function toast(message) {
    const el = $("toast");

    if (!el) {
      alert(message);
      return;
    }

    el.textContent = message;
    el.classList.add("show");
    el.style.display = "block";
    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      el.classList.remove("show");
      el.style.display = "";
    }, 2600);
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
      const el = $(id);
      if (el) el.textContent = fmt(value);
    });

    const nick = $("profileNickname");
    if (nick) {
      nick.textContent = user.nickname;
      nick.style.color = user.nicknameColor;
    }

    const avatar = $("profileAvatar");
    if (avatar) avatar.textContent = user.nickname.slice(0, 1).toUpperCase();

    const id = $("profileId");
    if (id) id.textContent = "ID: " + getPlayerId();

    const rank = $("profileRank");
    if (rank) rank.textContent = "Локальный рейтинг";

    const potential = $("potentialWin");
    if (potential) {
      potential.textContent = fmt(bet * (selectedBet?.multiplier || 12));
    }

    save();
  }

  function getPlayerId() {
    let id = localStorage.getItem("dice_casino_player_id");
    if (!id) {
      id = String(Math.floor(100000 + Math.random() * 900000));
      localStorage.setItem("dice_casino_player_id", id);
    }
    return id;
  }

  function navigateTo(screenId) {
    const screen = $(screenId);

    if (!screen || !screen.classList.contains("screen")) {
      toast("Раздел не найден: " + screenId);
      return;
    }

    currentScreen = screenId;

    document.querySelectorAll(".screen").forEach(el => {
      const active = el.id === screenId;
      el.classList.toggle("active", active);
      el.hidden = !active;
      el.setAttribute("aria-hidden", String(!active));
    });

    document.querySelectorAll(".nav-item").forEach(el => {
      el.classList.toggle("active", el.dataset.screen === screenId);
    });

    updateBalance();

    if (screenId === "topScreen") renderLeaderboard();
    if (screenId === "profileScreen") renderProfile();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openGame(mode) {
    if (!gameNames[mode]) {
      toast("Игровой режим не найден");
      return;
    }

    currentGame = mode;
    selectedBet = null;

    const title = $("gameTitle");
    if (title) title.textContent = gameNames[mode];

    const status = $("roundStatus");
    if (status) status.textContent = "Приём ставок";

    const caption = $("stageCaption");
    if (caption) caption.textContent = "СДЕЛАЙ СТАВКУ";

    const sub = $("stageSubcaption");
    if (sub) sub.textContent = "Выбери ставку и размер";

    const round = $("roundNumber");
    if (round) round.textContent = "#" + String(roundNumber).padStart(6, "0");

    renderBetOptions();
    renderGameStage(true);
    updateBalance();
    navigateTo("gameScreen");
    startRoundTimer();
  }

  function renderBetOptions() {
    const container = $("betOptions");
    if (!container) return;

    container.replaceChildren();

    let options;

    if (currentGame === "wheel") {
      options = [
        ["Число 2", "number", "2", 12],
        ["Число 3", "number", "3", 12],
        ["Число 4", "number", "4", 12],
        ["Число 5", "number", "5", 12],
        ["Число 6", "number", "6", 12],
        ["Число 7", "number", "7", 12],
        ["Число 8", "number", "8", 12],
        ["Число 9", "number", "9", 12],
        ["Число 10", "number", "10", 12],
        ["Число 11", "number", "11", 12],
        ["Число 12", "number", "12", 12],
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
        ...[1, 2, 3, 4, 5, 6].map(n => ["Число " + n, "number", String(n), 6]),
        ["Чёт", "even", "even", 2],
        ["Нечёт", "odd", "odd", 2],
        ["Чёрный", "black", "black", 2],
        ["Белый", "white", "white", 2]
      ];
    } else {
      options = [
        ["Любая пара", "pair", "pair", 2],
        ["Три одинаковых", "triple", "triple", 8],
        ["Главный символ", "special", "special", 20]
      ];
    }

    options.forEach(([label, type, value, multiplier]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "bet-option";
      button.innerHTML = "";

      const title = document.createElement("span");
      title.textContent = label;

      const odds = document.createElement("strong");
      odds.textContent = "×" + multiplier;

      button.append(title, odds);
      button.addEventListener("click", () => {
        selectedBet = { type, value, multiplier, label };

        container.querySelectorAll(".bet-option").forEach(el => {
          el.classList.remove("active", "selected");
          el.setAttribute("aria-pressed", "false");
        });

        button.classList.add("active", "selected");
        button.setAttribute("aria-pressed", "true");

        updateBalance();
      });

      container.appendChild(button);
    });
  }

  function renderGameStage(initial = false) {
    const display = $("diceDisplay");
    if (!display) return;

    display.replaceChildren();

    if (currentGame === "zeus" || currentGame === "house") {
      const slot = document.createElement("div");
      slot.className = "slot-frame";

      for (let i = 0; i < 3; i++) {
        const tile = document.createElement("div");
        tile.className = "slot-die";
        tile.textContent = initial ? "?" : "6";
        slot.appendChild(tile);
      }

      display.appendChild(slot);
      return;
    }

    const count = currentGame === "wheel" ? 2 : 1;

    for (let i = 0; i < count; i++) {
      const die = document.createElement("div");
      die.className = "drawn-die white-die result-die";
      die.textContent = "?";
      display.appendChild(die);
    }
  }

  function setBet(value) {
    const amount = Math.floor(Number(value));

    if (!Number.isFinite(amount) || amount < 1) {
      toast("Ставка должна быть больше нуля");
      return;
    }

    bet = amount;

    const input = $("betAmount");
    if (input) input.value = String(bet);

    updateBalance();
  }

  function changeBet(direction) {
    const input = $("betAmount");
    const current = input ? Number(input.value) : bet;
    const step = Math.max(100, Math.floor((Number(current) || 1000) * 0.25));

    setBet(Math.max(1, (Number(current) || 1000) + direction * step));
  }

  function readBet() {
    const input = $("betAmount");
    const amount = Math.floor(Number(input?.value || bet));

    if (!Number.isFinite(amount) || amount < 1) {
      toast("Введи корректную сумму ставки");
      return null;
    }

    if (amount > user.balance) {
      toast("Недостаточно монет");
      return null;
    }

    bet = amount;
    return amount;
  }

  function placeBet() {
    if (busy) {
      toast("Дождись завершения раунда");
      return;
    }

    if (!selectedBet) {
      toast("Сначала выбери ставку");
      return;
    }

    const amount = readBet();
    if (amount === null) return;

    if (currentScreen !== "gameScreen") {
      toast("Сначала открой игру");
      return;
    }

    busy = true;

    const button = $("placeBetButton");
    if (button) {
      button.disabled = true;
      button.textContent = "РАУНД ИДЁТ…";
    }

    const status = $("roundStatus");
    if (status) status.textContent = "Ставка принята";

    const caption = $("stageCaption");
    if (caption) caption.textContent = "БРОСОК…";

    const sub = $("stageSubcaption");
    if (sub) sub.textContent = "Определяем результат раунда";

    if (timerInterval) clearInterval(timerInterval);

    user.balance -= amount;
    updateBalance();

    const display = $("diceDisplay");
    if (display) display.classList.add("rolling");

    setTimeout(() => finishRound(amount), 1000);
  }

  function finishRound(amount) {
    const display = $("diceDisplay");
    if (display) {
      display.classList.remove("rolling");
      display.replaceChildren();
    }

    let payout = 0;
    let resultDescription = "";

    if (currentGame === "wheel") {
      const gold = Math.random() < 0.025;
      const a = gold ? "★" : random(1, 6);
      const b = random(1, 6);
      const total = (a === "★" ? 0 : a) + b;

      showDice([a, b]);
      resultDescription = gold
        ? "Выпал золотой кубик"
        : `Выпали ${a} и ${b}. Сумма: ${total}`;

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
      showDice([die]);
      resultDescription = "Выпало число " + die;

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
        symbols[random(0, symbols.length - 1)],
        symbols[random(0, symbols.length - 1)],
        symbols[random(0, symbols.length - 1)]
      ];

      showDice(reels);
      resultDescription = reels.join(" · ");

      const triple = reels[0] === reels[1] && reels[1] === reels[2];
      const pair = reels[0] === reels[1] ||
        reels[1] === reels[2] ||
        reels[0] === reels[2];

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
    user.rounds += 1;

    if (net > 0) {
      user.totalWon += net;
      user.weekWon += net;
    } else if (net < 0) {
      user.totalLost += Math.abs(net);
      user.weekLost += Math.abs(net);
    }

    history.unshift({
      round: roundNumber,
      game: gameNames[currentGame],
      net,
      description: resultDescription,
      time: new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      })
    });

    history = history.slice(0, 10);
    roundNumber++;

    save();
    updateBalance();
    renderHistory();
    showResult(net, resultDescription);

    const status = $("roundStatus");
    if (status) status.textContent = "Раунд завершён";

    const caption = $("stageCaption");
    if (caption) caption.textContent = net > 0 ? "ПОБЕДА" : "РАУНД ЗАВЕРШЁН";

    const sub = $("stageSubcaption");
    if (sub) sub.textContent = resultDescription;

    busy = false;

    const button = $("placeBetButton");
    if (button) {
      button.disabled = false;
      button.textContent = "СДЕЛАТЬ СТАВКУ";
    }

    const round = $("roundNumber");
    if (round) round.textContent = "#" + String(roundNumber).padStart(6, "0");

    startRoundTimer();
  }

  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function showDice(values) {
    const display = $("diceDisplay");
    if (!display) return;

    display.replaceChildren();

    values.forEach(value => {
      const die = document.createElement("div");
      die.className = "drawn-die white-die result-die";
      die.textContent = String(value);
      display.appendChild(die);
    });
  }

  function startRoundTimer() {
    if (timerInterval) clearInterval(timerInterval);

    let remaining = 15;
    const timer = $("roundTimer");
    const status = $("roundStatus");

    if (timer) timer.textContent = remaining;
    if (status) status.textContent = "Приём ставок";

    timerInterval = setInterval(() => {
      if (busy) {
        clearInterval(timerInterval);
        return;
      }

      remaining--;

      if (timer) timer.textContent = Math.max(0, remaining);

      if (remaining <= 0) {
        clearInterval(timerInterval);
        if (status) status.textContent = "Ставки открыты";
        if (timer) timer.textContent = "∞";
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

      const name = document.createElement("span");
      name.textContent = `#${item.round} · ${item.game} · ${item.time}`;

      const result = document.createElement("strong");
      result.textContent = (item.net >= 0 ? "+" : "−") + fmt(Math.abs(item.net));
      result.className = item.net >= 0 ? "positive" : "negative";

      row.append(name, result);
      container.appendChild(row);
    });
  }

  function showResult(net, description) {
    const overlay = $("resultOverlay");
    if (!overlay) {
      toast((net >= 0 ? "ВЫ ВЫИГРАЛИ " : "ВЫ ПРОИГРАЛИ ") + fmt(Math.abs(net)));
      return;
    }

    const title = $("resultTitle");
    const amount = $("resultAmount");
    const desc = $("resultDescription");
    const card = $("resultCard");
    const symbol = $("resultSymbol");

    if (title) title.textContent = net > 0 ? "ВЫ ВЫИГРАЛИ" : "ВЫ ПРОИГРАЛИ";
    if (amount) amount.textContent = fmt(Math.abs(net));
    if (desc) desc.textContent = description;
    if (symbol) symbol.textContent = net > 0 ? "★" : "D";
    if (card) card.classList.toggle("loss", net <= 0);

    overlay.classList.add("show");
    overlay.style.display = "flex";

    clearTimeout(resultTimer);
    resultTimer = setTimeout(closeResult, 5000);
  }

  function closeResult() {
    const overlay = $("resultOverlay");
    if (!overlay) return;

    overlay.classList.remove("show");
    overlay.style.display = "";
    clearTimeout(resultTimer);
  }

  function openModal(title, content, actions = []) {
    const backdrop = $("modalBackdrop");
    const heading = $("modalTitle");
    const body = $("modalBody");
    const actionBox = $("modalActions");

    if (!backdrop || !heading || !body || !actionBox) {
      alert(title + "\n\n" + content);
      return;
    }

    heading.textContent = title;
    body.replaceChildren();
    actionBox.replaceChildren();

    if (typeof content === "string") {
      const p = document.createElement("p");
      p.textContent = content;
      body.appendChild(p);
    } else if (content instanceof Node) {
      body.appendChild(content);
    }

    actions.forEach(action => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = action.className || "action-button";
      button.textContent = action.label;
      button.addEventListener("click", () => action.onClick());
      actionBox.appendChild(button);
    });

    backdrop.classList.add("show");
    backdrop.style.display = "flex";
  }

  function closeModal() {
    const backdrop = $("modalBackdrop");
    if (!backdrop) return;
    backdrop.classList.remove("show");
    backdrop.style.display = "";
  }

  function closeModalFromBackdrop(event) {
    if (event.target === $("modalBackdrop")) closeModal();
  }

  function makeInput(placeholder, value = "", type = "text") {
    const input = document.createElement("input");
    input.type = type;
    input.placeholder = placeholder;
    input.value = value;
    input.className = "modal-input";
    input.autocomplete = "off";
    return input;
  }

  function openMoneyModal(kind) {
    if (kind === "deposit") {
      const input = makeInput("Сумма в рублях, минимум 150", "150", "number");

      openModal("Пополнение баланса", input, [{
        label: "ПРОДОЛЖИТЬ",
        onClick: () => {
          const amount = Number(input.value);

          if (!Number.isFinite(amount) || amount < 150) {
            toast("Минимальная сумма пополнения — 150 ₽");
            return;
          }

          closeModal();
          toast("Реальные платежи не подключены. Деньги не списаны.");
        }
      }]);
      return;
    }

    const info = document.createElement("div");
    const p = document.createElement("p");
    p.textContent = "Доступно: " + fmt(user.balance) + " монет (" + money(user.balance) + ").";
    info.appendChild(p);

    const calc = document.createElement("p");
    calc.textContent = "Курс: 1 000 монет = 0,90 ₽. Минимум: 1 000 000 монет.";
    info.appendChild(calc);

    openModal("Вывод средств", info, [{
      label: "СОЗДАТЬ ЗАЯВКУ",
      onClick: () => {
        if (user.balance < 1000000) {
          toast("Минимальный вывод — 1 000 000 монет");
          return;
        }

        closeModal();
        toast("Фактический вывод не подключён. Баланс не списан.");
      }
    }]);
  }

  function openSubscription() {
    openModal("Подписка", "Покупка подписки через Telegram Stars пока не подключена.", [
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
            toast("Никнейм должен быть от 2 до 20 символов");
            return;
          }

          user.nickname = value;
          save();
          updateBalance();
          closeModal();
          toast("Никнейм изменён");
        }
      }]);
      return;
    }

    if (type === "color") {
      const colors = [
        ["Белый", "#ffffff"],
        ["Золотой", "#ffd45a"],
        ["Фиолетовый", "#b58cff"],
        ["Красный", "#ff667d"],
        ["Зелёный", "#68e6a0"]
      ];

      const box = document.createElement("div");
      box.className = "color-options";

      colors.forEach(([label, color]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.style.color = color;
        button.addEventListener("click", () => {
          user.nicknameColor = color;
          save();
          updateBalance();
          closeModal();
          toast("Цвет никнейма изменён");
        });
        box.appendChild(button);
      });

      openModal("Цвет никнейма", box);
      return;
    }

    if (type === "promo") {
      const input = makeInput("Введи промокод");

      const activate = () => {
        const code = input.value.trim().toLowerCase();

        if (code !== PROMO) {
          toast("Промокод не найден");
          return;
        }

        if (user.promoUsed) {
          toast("Промокод уже активирован в этом профиле");
          return;
        }

        user.balance += 100000000;
        user.promoUsed = true;
        user.usedPromos.push(PROMO);
        save();
        updateBalance();
        closeModal();
        toast("+100 000 000 монет");
      };

      const create = () => {
        const field = makeInput("Новый код (4–24 символа)");

        openModal("Создание промокода", field, [{
          label: "СОЗДАТЬ",
          onClick: () => {
            const code = field.value.trim().toLowerCase();

            if (!/^[a-z0-9_-]{4,24}$/.test(code)) {
              toast("Используй 4–24 латинских символа, цифры, _ или -");
              return;
            }

            user.createdPromos.push(code);
            save();
            closeModal();
            toast("Код сохранён локально. Для активации другими пользователями нужен сервер.");
          }
        }]);
      };

      openModal("Промокоды", input, [
        { label: "АКТИВИРОВАТЬ", onClick: activate },
        { label: "СОЗДАТЬ КОД", className: "secondary-action", onClick: create }
      ]);
      return;
    }

    if (type === "referrals") {
      const link = "Реферальные начисления требуют серверной проверки приглашений. Эта версия не начисляет бонусы за переход по ссылке.";

      openModal("Реферальная система", link, [
        { label: "ПОНЯТНО", onClick: closeModal }
      ]);
      return;
    }

    if (type === "transfer") {
      const recipient = makeInput("Никнейм получателя");
      const amount = makeInput("Количество монет", "1000", "number");

      const box = document.createElement("div");
      box.append(recipient, amount);

      openModal("Перевод монет", box, [{
        label: "ПЕРЕВЕСТИ",
        onClick: () => {
          if (!recipient.value.trim() || Number(amount.value) < 1) {
            toast("Укажи получателя и сумму");
            return;
          }

          toast("Переводы другим пользователям требуют серверной проверки. Монеты не списаны.");
          closeModal();
        }
      }]);
      return;
    }

    if (type === "agreement") {
      openModal(
        "Пользовательское соглашение",
        "Эта версия содержит демонстрационные игровые механики. Баланс хранится в браузере и не защищён от изменения. Реальные платежи, выплаты и переводы не подключены. Не отправляй деньги на основании отображаемого баланса. Перед запуском денежных игр необходимо проверить законодательство и правила платформы.",
        [{ label: "ЗАКРЫТЬ", onClick: closeModal }]
      );
    }
  }

  function renderProfile() {
    updateBalance();
  }

  function renderLeaderboard() {
    const list = $("leaderboardList");
    if (!list) return;

    list.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "Общий рейтинг появится после подключения серверной базы данных.";
    list.appendChild(empty);

    const firstName = $("topFirstName");
    const firstWon = $("topFirstWon");
    if (firstName) firstName.textContent = user.nickname + " (этот браузер)";
    if (firstWon) firstWon.textContent = fmt(user.totalWon);

    const secondName = $("topSecondName");
    const secondWon = $("topSecondWon");
    const thirdName = $("topThirdName");
    const thirdWon = $("topThirdWon");

    if (secondName) secondName.textContent = "Пока нет данных";
    if (secondWon) secondWon.textContent = "0";
    if (thirdName) thirdName.textContent = "Пока нет данных";
    if (thirdWon) thirdWon.textContent = "0";
  }

  function showLoading(text = "Загрузка игрового зала") {
    const overlay = $("loadingOverlay");
    const caption = $("loadingText");

    if (caption) caption.textContent = text;
    if (overlay) {
      overlay.classList.add("show");
      overlay.style.display = "flex";

      setTimeout(() => {
        overlay.classList.remove("show");
        overlay.style.display = "";
      }, 500);
    }
  }

  function bindKeyboardAndInput() {
    const input = $("betAmount");
    if (input) {
      input.addEventListener("input", () => {
        const value = Number(input.value);
        if (Number.isFinite(value) && value > 0) {
          bet = Math.floor(value);
          const potential = $("potentialWin");
          if (potential) potential.textContent =
            fmt(bet * (selectedBet?.multiplier || 12));
        }
      });

      input.addEventListener("keydown", event => {
        if (event.key === "Enter") placeBet();
      });
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
    } catch (e) {
      console.warn("Telegram WebApp API:", e);
    }
  }

  function init() {
    user = loadUser();

    // Поддержка встроенных onclick в index.html.
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

    // Делаем кнопки и разделы доступными для клика.
    document.querySelectorAll("button").forEach(button => {
      if (!button.hasAttribute("type") && button.closest("form")) {
        button.type = "button";
      }
    });

    document.querySelectorAll(".screen").forEach(screen => {
      const active = screen.id === "homeScreen";
      screen.classList.toggle("active", active);
      screen.hidden = !active;
    });

    document.querySelectorAll(".nav-item").forEach(button => {
      button.classList.toggle("active", button.dataset.screen === "homeScreen");
    });

    bindKeyboardAndInput();
    initTelegram();
    updateBalance();
    renderBetOptions();
    renderLeaderboard();

    console.log("Dice Casino готов. Все основные обработчики подключены.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
```
