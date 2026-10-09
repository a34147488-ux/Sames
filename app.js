```javascript
/* =========================================================
   DICE CASINO — app.js
   Игровая логика, баланс, профиль, топ, промокоды и режимы
   ========================================================= */

"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const STORAGE_KEY = "dice_casino_user_v1";
  const PROMO_CODE = "gsusyfshdhzjdbsvfs";
  const PROMO_REWARD = 100_000_000;
  const MIN_WITHDRAW = 1_000_000;
  const COINS_PER_RUBLE = 1000 / 0.9;

  const state = {
    user: null,
    currentMode: "wheel",
    currentBet: 1000,
    selectedBet: null,
    history: [],
    roundBusy: false,
    requestCounter: 1
  };

  function defaultUser() {
    return {
      id: "user_" + Math.random().toString(36).slice(2, 10),
      nickname: "Игрок",
      nicknameColor: "#ffffff",
      balance: 10000,
      totalWon: 0,
      totalLost: 0,
      weekWon: 0,
      weekLost: 0,
      rounds: 0,
      referrals: 0,
      promoUses: [],
      createdPromos: [],
      transactions: [],
      weeklyStarted: Date.now()
    };
  }

  function loadUser() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultUser(), ...parsed };
      }
    } catch (error) {
      console.warn("Не удалось загрузить профиль:", error);
    }
    return defaultUser();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.user));
    } catch (error) {
      console.warn("Не удалось сохранить профиль:", error);
    }
  }

  function formatNumber(value) {
    return Math.floor(Number(value) || 0).toLocaleString("ru-RU");
  }

  function rublesForCoins(coins) {
    return (Math.max(0, Number(coins) || 0) * 0.9 / 1000);
  }

  function showToast(message) {
    let toast = $("#casino-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "casino-toast";
      toast.setAttribute("role", "status");
      Object.assign(toast.style, {
        position: "fixed",
        left: "50%",
        bottom: "28px",
        transform: "translate(-50%, 20px)",
        zIndex: "99999",
        maxWidth: "90vw",
        padding: "13px 18px",
        borderRadius: "14px",
        background: "rgba(35, 20, 68, .96)",
        color: "#fff",
        border: "1px solid rgba(206, 170, 255, .45)",
        boxShadow: "0 8px 35px rgba(0,0,0,.35)",
        fontSize: "14px",
        textAlign: "center",
        opacity: "0",
        transition: "opacity .22s ease, transform .22s ease",
        pointerEvents: "none"
      });
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, 0)";

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%, 20px)";
    }, 2600);
  }

  function setText(selector, value) {
    $$(selector).forEach(element => {
      element.textContent = value;
    });
  }

  function renderBalance() {
    const balance = formatNumber(state.user.balance);

    setText("#balance", balance);
    setText("#user-balance", balance);
    setText(".balance-value", balance);
    setText("[data-balance]", balance);

    setText("#total-won", formatNumber(state.user.totalWon));
    setText("#total-lost", formatNumber(state.user.totalLost));
    setText("#week-won", formatNumber(state.user.weekWon));
    setText("#week-lost", formatNumber(state.user.weekLost));
    setText("#referral-count", formatNumber(state.user.referrals));

    setText("#withdraw-rubles", rublesForCoins(state.user.balance).toLocaleString("ru-RU", {
      maximumFractionDigits: 2
    }) + " ₽");

    const nickname = state.user.nickname;
    $$("#nickname, #profile-nickname, [data-nickname]").forEach(element => {
      element.textContent = nickname;
      element.style.color = state.user.nicknameColor;
    });
  }

  function addHistory(entry) {
    state.history.unshift({
      ...entry,
      time: new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      })
    });

    state.history = state.history.slice(0, 15);
    renderHistory();
  }

  function renderHistory() {
    const containers = [
      $("#round-history"),
      $("#game-history"),
      $("#history-list")
    ].filter(Boolean);

    containers.forEach(container => {
      container.replaceChildren();

      if (!state.history.length) {
        const empty = document.createElement("div");
        empty.className = "history-empty";
        empty.textContent = "История раундов появится здесь";
        container.appendChild(empty);
        return;
      }

      state.history.forEach(item => {
        const row = document.createElement("div");
        row.className = "history-item";

        const title = document.createElement("span");
        title.textContent = item.title;

        const amount = document.createElement("strong");
        amount.textContent = (item.amount >= 0 ? "+" : "−") +
          formatNumber(Math.abs(item.amount));
        amount.style.color = item.amount >= 0 ? "#61e7a3" : "#ff747e";

        const time = document.createElement("small");
        time.textContent = item.time;

        row.append(title, amount, time);
        container.appendChild(row);
      });
    });
  }

  function showResult(won, amount, title) {
    const heading = won ? "ВЫ ВЫИГРАЛИ" : "ВЫ ПРОИГРАЛИ";
    const formatted = formatNumber(amount);

    const titleElement = $("#result-title");
    const amountElement = $("#result-amount");
    const panel = $("#round-result");

    if (titleElement) titleElement.textContent = heading;
    if (amountElement) amountElement.textContent =
      (won ? "+" : "−") + formatted + " монет";

    if (panel) {
      panel.hidden = false;
      panel.classList.remove("win", "loss", "show");
      panel.classList.add(won ? "win" : "loss");
      requestAnimationFrame(() => panel.classList.add("show"));
    }

    const message = `${heading}: ${formatted} монет${title ? " · " + title : ""}`;
    showToast(message);
  }

  function settleRound(stake, payout, title) {
    const safeStake = Math.max(0, Math.floor(Number(stake) || 0));
    const safePayout = Math.max(0, Math.floor(Number(payout) || 0));

    state.user.balance -= safeStake;
    state.user.balance += safePayout;
    state.user.rounds += 1;

    const net = safePayout - safeStake;

    if (net >= 0) {
      state.user.totalWon += net;
      state.user.weekWon += net;
    } else {
      state.user.totalLost += Math.abs(net);
      state.user.weekLost += Math.abs(net);
    }

    save();
    renderBalance();
    addHistory({ title, amount: net });
    showResult(net >= 0, Math.abs(net), title);

    return net;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function getBetAmount() {
    const input = $("#bet-amount") || $("#bet-input") || $("[name='bet']");
    const value = input ? Number(input.value) : state.currentBet;

    if (!Number.isFinite(value) || value < 1) {
      showToast("Укажи корректную ставку");
      return null;
    }

    const bet = Math.floor(value);

    if (bet > state.user.balance) {
      showToast("Недостаточно монет для этой ставки");
      return null;
    }

    state.currentBet = bet;
    return bet;
  }

  function getSelectedBet() {
    const active = $("[data-bet].selected, [data-bet].active, .bet-option.active");
    if (active) {
      return {
        type: active.dataset.bet || active.dataset.type || active.textContent.trim(),
        value: active.dataset.value || active.dataset.number || active.textContent.trim()
      };
    }

    if (state.selectedBet) return state.selectedBet;

    showToast("Сначала выбери ставку");
    return null;
  }

  function animateDice(container, values) {
    if (!container) return;

    container.classList.add("rolling");
    container.replaceChildren();

    values.forEach(value => {
      const die = document.createElement("div");
      die.className = "casino-die";
      die.textContent = String(value);
      die.setAttribute("aria-label", "Результат кубика: " + value);
      container.appendChild(die);
    });

    setTimeout(() => container.classList.remove("rolling"), 650);
  }

  function playWheel() {
    if (state.roundBusy) return;

    const stake = getBetAmount();
    const bet = getSelectedBet();
    if (stake === null || !bet) return;

    state.roundBusy = true;

    const button = $("#play-round") || $("#roll-button");
    if (button) button.disabled = true;

    const dieContainer = $("#dice-display") || $("#dice-result");
    let first = randomInt(1, 6);
    let second = randomInt(1, 6);
    let gold = Math.random() < 0.025;

    if (gold) first = "★";

    animateDice(dieContainer, [first, second]);

    setTimeout(() => {
      let payout = 0;
      let title = "Dice Wheel";

      const type = String(bet.type).toLowerCase();
      const value = String(bet.value).toLowerCase();
      const total = (first === "★" ? 0 : first) + second;

      if (gold) {
        if (type.includes("gold") || type.includes("золот")) {
          payout = stake * 12;
          title = "Золотой кубик";
        } else {
          title = "Золотой кубик — обычные ставки отменены";
        }
      } else if (
        type.includes("number") ||
        type.includes("число") ||
        type === "total"
      ) {
        if (Number(value) === total) payout = stake * 12;
        title = "Сумма " + total;
      } else if (type.includes("even") || type.includes("чёт")) {
        if (total % 2 === 0) payout = stake * 2;
        title = "Чётная сумма";
      } else if (type.includes("odd") || type.includes("нечёт")) {
        if (total % 2 !== 0) payout = stake * 2;
        title = "Нечётная сумма";
      } else if (type.includes("black") || type.includes("чёрн")) {
        if (first % 2 === 0 && second % 2 === 0) payout = stake * 2;
        title = "Оба кубика чёрные";
      } else if (type.includes("white") || type.includes("бел")) {
        if (first % 2 !== 0 && second % 2 !== 0) payout = stake * 2;
        title = "Оба кубика белые";
      } else if (type.includes("range") || type.includes("диапаз")) {
        const range = value.replace(/\s/g, "");
        if (range === "2-6" && total >= 2 && total <= 5) payout = stake * 2;
        if (range === "6-12" && total >= 7 && total <= 12) payout = stake * 2;
        title = "Диапазон " + value;
      } else {
        showToast("Неизвестный тип ставки");
      }

      settleRound(stake, payout, title);
      state.roundBusy = false;
      if (button) button.disabled = false;
    }, 700);
  }

  function playSingleDice() {
    if (state.roundBusy) return;

    const stake = getBetAmount();
    const bet = getSelectedBet();
    if (stake === null || !bet) return;

    state.roundBusy = true;
    const button = $("#play-round") || $("#roll-button");
    if (button) button.disabled = true;

    const value = randomInt(1, 6);
    animateDice($("#dice-display") || $("#dice-result"), [value]);

    setTimeout(() => {
      let payout = 0;
      const type = String(bet.type).toLowerCase();
      const chosen = Number(bet.value);
      let title = "Dice";

      if (type.includes("number") || type.includes("число")) {
        if (chosen === value) payout = stake * 6;
        title = "Выпало " + value;
      } else if (type.includes("even") || type.includes("чёт")) {
        if (value % 2 === 0) payout = stake * 2;
        title = "Чёт / нечёт";
      } else if (type.includes("odd") || type.includes("нечёт")) {
        if (value % 2 !== 0) payout = stake * 2;
        title = "Нечёт";
      } else if (type.includes("black") || type.includes("чёрн")) {
        if ([2, 4, 6].includes(value)) payout = stake * 2;
        title = "Чёрный кубик";
      } else if (type.includes("white") || type.includes("бел")) {
        if ([1, 3, 5].includes(value)) payout = stake * 2;
        title = "Белый кубик";
      }

      settleRound(stake, payout, title);
      state.roundBusy = false;
      if (button) button.disabled = false;
    }, 650);
  }

  function playSlot(mode) {
    if (state.roundBusy) return;

    const stake = getBetAmount();
    if (stake === null) return;

    state.roundBusy = true;

    const button = $("#play-round") || $("#roll-button");
    if (button) button.disabled = true;

    const symbols = mode === "zeus"
      ? ["ZEUS", "LIGHTNING", "CROWN", "GEM", "A", "K"]
      : ["HOUSE", "DOG", "BONE", "GEM", "A", "K"];

    const result = [
      symbols[randomInt(0, symbols.length - 1)],
      symbols[randomInt(0, symbols.length - 1)],
      symbols[randomInt(0, symbols.length - 1)]
    ];

    const container = $("#slot-display") || $("#dice-display") || $("#dice-result");
    if (container) {
      container.replaceChildren();
      container.classList.add("rolling");

      result.forEach(symbol => {
        const tile = document.createElement("div");
        tile.className = "slot-symbol";
        tile.textContent = symbol;
        container.appendChild(tile);
      });
    }

    setTimeout(() => {
      if (container) container.classList.remove("rolling");

      let multiplier = 0;
      if (result[0] === result[1] && result[1] === result[2]) {
        multiplier = result[0] === (mode === "zeus" ? "ZEUS" : "HOUSE") ? 20 : 8;
      } else if (
        result[0] === result[1] ||
        result[1] === result[2] ||
        result[0] === result[2]
      ) {
        multiplier = 2;
      }

      const payout = stake * multiplier;
      settleRound(stake, payout, mode === "zeus" ? "Dice Zeus" : "Dice House");

      state.roundBusy = false;
      if (button) button.disabled = false;
    }, 850);
  }

  function playCurrentMode() {
    switch (state.currentMode) {
      case "wheel":
        playWheel();
        break;
      case "dice":
        playSingleDice();
        break;
      case "zeus":
        playSlot("zeus");
        break;
      case "house":
        playSlot("house");
        break;
      default:
        showToast("Выбери игровой режим");
    }
  }

  function setMode(mode) {
    const allowed = ["wheel", "dice", "zeus", "house"];
    if (!allowed.includes(mode)) return;

    state.currentMode = mode;

    $$("[data-mode]").forEach(button => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    $$("[data-game-panel]").forEach(panel => {
      panel.hidden = panel.dataset.gamePanel !== mode;
    });

    const titles = {
      wheel: "Dice Wheel",
      dice: "Dice",
      zeus: "Dice Zeus",
      house: "Dice House"
    };

    setText("#game-title", titles[mode]);
    const result = $("#round-result");
    if (result) result.hidden = true;
  }

  function renderTop() {
    const container = $("#leaderboard") || $("#top-list");
    if (!container) return;

    const list = [{
      nickname: state.user.nickname,
      totalWon: state.user.totalWon,
      current: true
    }];

    container.replaceChildren();

    list.sort((a, b) => b.totalWon - a.totalWon).forEach((player, index) => {
      const row = document.createElement("div");
      row.className = "leaderboard-item place-" + (index + 1);

      const place = document.createElement("span");
      place.textContent = String(index + 1);

      const name = document.createElement("span");
      name.textContent = player.nickname;

      const prize = document.createElement("strong");
      prize.textContent = formatNumber(player.totalWon) + " монет выиграно";

      row.append(place, name, prize);
      container.appendChild(row);
    });
  }

  function openWithdraw() {
    const balance = state.user.balance;

    if (balance < MIN_WITHDRAW) {
      showToast("Вывод доступен от 1 000 000 монет (900 ₽)");
      return;
    }

    const requestNumber = state.requestCounter++;
    const date = new Date().toLocaleDateString("ru-RU");

    state.user.balance = 0;
    state.user.transactions.push({
      type: "withdrawal_request",
      amount: balance,
      requestNumber,
      date,
      status: "pending"
    });
    save();
    renderBalance();

    const message =
      `ЗАЯВКА НА ВЫВОД №${requestNumber}\n\n` +
      `Сумма: ${formatNumber(balance)} монет\n` +
      `Расчётная сумма: ${rublesForCoins(balance).toLocaleString("ru-RU", {
        maximumFractionDigits: 2
      })} ₽\n` +
      `Дата: ${date}\n\n` +
      `Сделай скриншот этого окна и напиши мне в Telegram @vladubrat5.\n\n` +
      `Важно: это демонстрационная заявка. Фактическая выплата не выполнена.`;

    showDialog("Заявка на вывод", message);
  }

  function showDialog(title, message) {
    let dialog = $("#casino-dialog");

    if (!dialog) {
      dialog = document.createElement("div");
      dialog.id = "casino-dialog";
      Object.assign(dialog.style, {
        position: "fixed",
        inset: "0",
        zIndex: "100000",
        display: "grid",
        placeItems: "center",
        padding: "20px",
        background: "rgba(10, 5, 25, .78)"
      });

      const card = document.createElement("div");
      card.className = "casino-dialog-card";
      Object.assign(card.style, {
        width: "min(420px, 100%)",
        padding: "24px",
        borderRadius: "22px",
        background: "#241344",
        color: "#fff",
        border: "1px solid rgba(210, 178, 255, .5)",
        boxShadow: "0 15px 60px rgba(0,0,0,.5)",
        whiteSpace: "pre-line"
      });

      const heading = document.createElement("h2");
      heading.id = "casino-dialog-title";

      const content = document.createElement("p");
      content.id = "casino-dialog-message";

      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Закрыть";
      close.addEventListener("click", () => dialog.remove());
      Object.assign(close.style, {
        width: "100%",
        marginTop: "12px",
        padding: "13px",
        border: "0",
        borderRadius: "12px",
        background: "#d5a8ff",
        color: "#241344",
        fontWeight: "700"
      });

      card.append(heading, content, close);
      dialog.appendChild(card);
      dialog.addEventListener("click", event => {
        if (event.target === dialog) dialog.remove();
      });
      document.body.appendChild(dialog);
    }

    $("#casino-dialog-title").textContent = title;
    $("#casino-dialog-message").textContent = message;
  }

  function openTopUp() {
    showDialog(
      "Пополнение",
      "Пополнение предусмотрено только в рублях.\nМинимальная сумма: 150 ₽.\n\nРеальные платежи пока не подключены. Не отправляй деньги через это окно."
    );
  }

  function redeemPromo() {
    const input = $("#promo-input") || $("#promo-code");
    const code = input ? input.value.trim().toLowerCase() : "";

    if (!code) {
      showToast("Введи промокод");
      return;
    }

    if (code === PROMO_CODE) {
      if (state.user.promoUses.includes(PROMO_CODE)) {
        showToast("Этот промокод уже активирован в данном профиле");
        return;
      }

      state.user.balance += PROMO_REWARD;
      state.user.promoUses.push(PROMO_CODE);
      state.user.transactions.push({
        type: "promo",
        code: PROMO_CODE,
        amount: PROMO_REWARD,
        date: new Date().toISOString()
      });

      save();
      renderBalance();
      if (input) input.value = "";
      showToast("Промокод активирован: +" + formatNumber(PROMO_REWARD));
      return;
    }

    const custom = state.user.createdPromos.find(item => item.code === code);
    if (custom) {
      showToast("Этот промокод создан локально. Проверка награды доступна только после подключения сервера.");
      return;
    }

    showToast("Промокод не найден");
  }

  function createPromo() {
    const input = $("#create-promo-input");
    const code = input ? input.value.trim().toLowerCase() : "";

    if (!/^[a-z0-9_-]{4,24}$/.test(code)) {
      showToast("Код: 4–24 символа, латинские буквы и цифры");
      return;
    }

    if (code === PROMO_CODE || state.user.createdPromos.some(item => item.code === code)) {
      showToast("Такой промокод уже существует");
      return;
    }

    state.user.createdPromos.push({
      code,
      createdAt: new Date().toISOString()
    });

    save();
    if (input) input.value = "";
    showDialog(
      "Промокод создан",
      `Код: ${code}\n\nСейчас он сохранён только в этом браузере. Чтобы другие пользователи могли активировать его, нужен сервер.`
    );
  }

  function changeNickname() {
    const input = $("#nickname-input");
    const nickname = input ? input.value.trim() : "";

    if (nickname.length < 2 || nickname.length > 20) {
      showToast("Никнейм должен содержать от 2 до 20 символов");
      return;
    }

    state.user.nickname = nickname;
    save();
    renderBalance();
    showToast("Никнейм изменён");
  }

  function changeNicknameColor(color) {
    const allowed = ["#ffffff", "#ffd45a", "#b58cff", "#ff667d", "#68e6a0"];
    if (!allowed.includes(color)) return;

    state.user.nicknameColor = color;
    save();
    renderBalance();
    showToast("Цвет никнейма изменён");
  }

  function transferCoins() {
    const nameInput = $("#transfer-nickname");
    const amountInput = $("#transfer-amount");
    const recipient = nameInput ? nameInput.value.trim() : "";
    const amount = amountInput ? Math.floor(Number(amountInput.value)) : 0;

    if (!recipient) {
      showToast("Введи никнейм получателя");
      return;
    }

    if (!Number.isFinite(amount) || amount < 1) {
      showToast("Укажи корректную сумму");
      return;
    }

    if (amount > state.user.balance) {
      showToast("Недостаточно монет");
      return;
    }

    showDialog(
      "Перевод не выполнен",
      "Для безопасного перевода между разными пользователями требуется серверная проверка получателя и баланса.\n\nДеньги не списаны."
    );
  }

  function bind(selector, eventName, handler) {
    $$(selector).forEach(element => {
      element.addEventListener(eventName, handler);
    });
  }

  function bindEvents() {
    bind("[data-mode]", "click", event => {
      const button = event.currentTarget;
      setMode(button.dataset.mode);
    });

    bind("[data-bet]", "click", event => {
      const button = event.currentTarget;

      $$("[data-bet]").forEach(item => {
        item.classList.remove("selected", "active");
        item.setAttribute("aria-pressed", "false");
      });

      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");

      state.selectedBet = {
        type: button.dataset.bet || button.dataset.type || button.textContent.trim(),
        value: button.dataset.value || button.dataset.number || button.textContent.trim()
      };
    });

    bind("#play-round, #roll-button", "click", playCurrentMode);
    bind("#top-up, #deposit-button", "click", openTopUp);
    bind("#withdraw, #withdraw-button", "click", openWithdraw);
    bind("#activate-promo, #promo-activate", "click", redeemPromo);
    bind("#create-promo, #promo-create", "click", createPromo);
    bind("#save-nickname, #nickname-save", "click", changeNickname);
    bind("#transfer-button, #send-transfer", "click", transferCoins);

    bind("[data-nickname-color]", "click", event => {
      changeNicknameColor(event.currentTarget.dataset.nicknameColor);
    });

    bind("[data-page]", "click", event => {
      const page = event.currentTarget.dataset.page;

      $$("[data-page]").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
      });

      $$("[data-screen]").forEach(screen => {
        screen.hidden = screen.dataset.screen !== page;
      });

      if (page === "top") renderTop();
      if (page === "profile") renderBalance();
    });

    bind("#agreement-button, #user-agreement", "click", () => {
      showDialog(
        "Пользовательское соглашение",
        "Игровые монеты внутри интерфейса не являются банковским счётом или гарантированным денежным активом. Результаты игр могут быть демонстрационными. Реальные пополнения и выплаты не подключены. Перед запуском проекта с денежными ставками необходимо проверить применимые законы, правила Telegram и требования платёжных провайдеров."
      );
    });

    bind("#subscription-button, #star-subscription", "click", () => {
      showDialog(
        "Подписка",
        "Кнопка подписки подготовлена визуально. Покупка Telegram Stars ещё не подключена."
      );
    });

    bind("#referral-button, #referrals-button", "click", () => {
      const botUsername = window.TELEGRAM_BOT_USERNAME || "";
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      const referralId = telegramUser?.id || state.user.id;

      if (!botUsername) {
        showDialog(
          "Реферальная система",
          "Реферальная ссылка будет доступна после настройки имени Telegram-бота и серверной проверки приглашений."
        );
        return;
      }

      const link = `https://t.me/${botUsername}?start=${encodeURIComponent(referralId)}`;
      showDialog("Твоя ссылка", link + "\n\nВознаграждения начисляются только после серверного подтверждения приглашения.");
    });
  }

  function initTelegram() {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor("#241344");
      tg.setBackgroundColor("#180d30");
    } catch (error) {
      console.warn("Telegram WebApp API недоступен:", error);
    }
  }

  function init() {
    state.user = loadUser();

    bindEvents();
    initTelegram();
    renderBalance();
    renderHistory();
    renderTop();
    setMode(state.currentMode);

    const betInput = $("#bet-amount") || $("#bet-input") || $("[name='bet']");
    if (betInput && !betInput.value) betInput.value = String(state.currentBet);

    document.documentElement.classList.add("casino-ready");
    document.body.classList.add("casino-ready");

    console.info("Dice Casino frontend initialized.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
```
