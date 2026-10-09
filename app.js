```javascript
"use strict";

(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  let selectedMode = "wheel";
  let selectedBet = null;
  let balance = Number(localStorage.getItem("dice_balance") || 10000);
  let busy = false;

  const money = n => Math.floor(n).toLocaleString("ru-RU");

  function toast(message) {
    let el = $("#casino-toast");

    if (!el) {
      el = document.createElement("div");
      el.id = "casino-toast";
      Object.assign(el.style, {
        position: "fixed",
        zIndex: "999999",
        left: "50%",
        bottom: "25px",
        transform: "translateX(-50%)",
        padding: "14px 20px",
        borderRadius: "14px",
        background: "#291448",
        color: "#fff",
        border: "1px solid #bd8aff",
        boxShadow: "0 8px 30px #0006",
        textAlign: "center",
        maxWidth: "90%",
        fontSize: "14px"
      });
      document.body.appendChild(el);
    }

    el.textContent = message;
    el.style.display = "block";
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.style.display = "none", 2500);
  }

  function updateBalance() {
    localStorage.setItem("dice_balance", String(balance));

    $$("#balance, #user-balance, #profile-balance, .balance-value, [data-balance]")
      .forEach(el => el.textContent = money(balance));
  }

  function openPage(page) {
    const aliases = {
      profile: ["profile", "профиль"],
      game: ["game", "играть", "игра"],
      top: ["top", "топ", "рейтинг"],
      more: ["more", "ещё", "еще", "настройки"],
      wheel: ["wheel", "dice wheel", "dice-wheel"],
      dice: ["dice"],
      zeus: ["zeus", "dice zeus"],
      house: ["house", "dice house"]
    };

    const wanted = aliases[page] || [page];

    let found = false;

    $$("[data-screen], [data-page], [data-game-panel], .screen, .page, .tab-content")
      .forEach(el => {
        const value = (
          el.dataset.screen ||
          el.dataset.page ||
          el.dataset.gamePanel ||
          el.id ||
          ""
        ).toLowerCase();

        const match = wanted.some(name => value === name || value.includes(name));

        if (match) {
          el.hidden = false;
          el.style.display = "";
          el.classList.add("active");
          found = true;
        } else if (
          el.hasAttribute("data-screen") ||
          el.hasAttribute("data-page") ||
          el.hasAttribute("data-game-panel")
        ) {
          el.hidden = true;
          el.classList.remove("active");
        }
      });

    if (page === "wheel" || page === "dice" || page === "zeus" || page === "house") {
      selectedMode = page;
      $$("[data-mode]").forEach(el => {
        el.classList.toggle("active", el.dataset.mode === page);
      });
    }

    if (page === "top") renderTop();

    if (!found) {
      toast("Раздел «" + page + "»: проверь разметку index.html");
    }
  }

  function renderTop() {
    const container = $("#leaderboard") || $("#top-list");
    if (!container) return;

    container.replaceChildren();

    const row = document.createElement("div");
    row.className = "leaderboard-item";
    row.textContent = "Твой результат: " +
      money(Number(localStorage.getItem("dice_total_won") || 0)) +
      " выигранных монет";

    container.appendChild(row);
  }

  function getBet() {
    const input = $("#bet-amount") ||
      $("#bet-input") ||
      $('input[name="bet"]') ||
      $('input[type="number"]');

    const amount = input ? Math.floor(Number(input.value)) : 1000;

    if (!Number.isFinite(amount) || amount < 1) {
      toast("Введи ставку больше нуля");
      return null;
    }

    if (amount > balance) {
      toast("Недостаточно монет");
      return null;
    }

    return amount;
  }

  function rollGame() {
    if (busy) return;

    const stake = getBet();
    if (stake === null) return;

    if (!selectedBet && selectedMode !== "zeus" && selectedMode !== "house") {
      toast("Сначала выбери ставку");
      return;
    }

    busy = true;
    const button = $("#play-round") || $("#roll-button");

    if (button) button.disabled = true;

    balance -= stake;
    updateBalance();

    const diceContainer = $("#dice-display") ||
      $("#dice-result") ||
      $("#slot-display");

    let payout = 0;
    let resultText = "";

    if (selectedMode === "wheel") {
      const a = 1 + Math.floor(Math.random() * 6);
      const b = 1 + Math.floor(Math.random() * 6);
      const total = a + b;

      resultText = `Кубики: ${a} и ${b}. Сумма: ${total}`;

      if (diceContainer) diceContainer.textContent = `${a}  ·  ${b}`;

      const type = String(selectedBet.type).toLowerCase();
      const value = String(selectedBet.value).toLowerCase();

      if (type.includes("gold") || type.includes("золот")) {
        toast("Золотой кубик в этой демонстрационной версии не выпал");
      } else if (type.includes("number") || type.includes("число") || type === "total") {
        if (Number(value) === total) payout = stake * 12;
      } else if (type.includes("even") || type.includes("чёт")) {
        if (total % 2 === 0) payout = stake * 2;
      } else if (type.includes("odd") || type.includes("нечёт")) {
        if (total % 2 !== 0) payout = stake * 2;
      } else if (type.includes("black") || type.includes("чёрн")) {
        if (a % 2 === 0 && b % 2 === 0) payout = stake * 2;
      } else if (type.includes("white") || type.includes("бел")) {
        if (a % 2 !== 0 && b % 2 !== 0) payout = stake * 2;
      } else if (type.includes("range") || type.includes("диапаз")) {
        if (value.replace(/\s/g, "") === "2-6" && total >= 2 && total <= 5) payout = stake * 2;
        if (value.replace(/\s/g, "") === "6-12" && total >= 7 && total <= 12) payout = stake * 2;
      }
    } else if (selectedMode === "dice") {
      const die = 1 + Math.floor(Math.random() * 6);
      resultText = "Выпало: " + die;
      if (diceContainer) diceContainer.textContent = String(die);

      const type = String(selectedBet.type).toLowerCase();
      const value = String(selectedBet.value).toLowerCase();

      if ((type.includes("number") || type.includes("число")) && Number(value) === die) {
        payout = stake * 6;
      } else if ((type.includes("even") || type.includes("чёт")) && die % 2 === 0) {
        payout = stake * 2;
      } else if ((type.includes("odd") || type.includes("нечёт")) && die % 2 !== 0) {
        payout = stake * 2;
      } else if ((type.includes("black") || type.includes("чёрн")) && die % 2 === 0) {
        payout = stake * 2;
      } else if ((type.includes("white") || type.includes("бел")) && die % 2 !== 0) {
        payout = stake * 2;
      }
    } else {
      const symbols = selectedMode === "zeus"
        ? ["ZEUS", "CROWN", "GEM", "LIGHTNING"]
        : ["HOUSE", "DOG", "BONE", "GEM"];

      const result = Array.from({ length: 3 }, () =>
        symbols[Math.floor(Math.random() * symbols.length)]
      );

      resultText = result.join(" · ");
      if (diceContainer) diceContainer.textContent = resultText;

      if (result[0] === result[1] && result[1] === result[2]) {
        payout = stake * (result[0] === symbols[0] ? 20 : 8);
      } else if (
        result[0] === result[1] ||
        result[1] === result[2] ||
        result[0] === result[2]
      ) {
        payout = stake * 2;
      }
    }

    setTimeout(() => {
      balance += payout;
      updateBalance();

      if (payout > stake) {
        const total = Number(localStorage.getItem("dice_total_won") || 0);
        localStorage.setItem("dice_total_won", String(total + payout - stake));
      }

      const net = payout - stake;
      const title = net >= 0 ? "ВЫ ВЫИГРАЛИ" : "ВЫ ПРОИГРАЛИ";
      const amount = Math.abs(net);

      const titleEl = $("#result-title");
      const amountEl = $("#result-amount");
      const panel = $("#round-result");

      if (titleEl) titleEl.textContent = title;
      if (amountEl) amountEl.textContent =
        (net >= 0 ? "+" : "−") + money(amount) + " монет";

      if (panel) panel.hidden = false;

      toast(`${title}: ${money(amount)} монет. ${resultText}`);

      busy = false;
      if (button) button.disabled = false;
    }, 550);
  }

  function bindEverything() {
    document.addEventListener("click", event => {
      const button = event.target.closest(
        "button, [role='button'], [data-page], [data-mode], [data-bet], .menu-item, .nav-item, .mode-card, .bet-option"
      );

      if (!button) return;

      const label = (
        button.innerText ||
        button.getAttribute("aria-label") ||
        button.title ||
        ""
      ).trim().toLowerCase();

      const mode = button.dataset.mode;
      const page = button.dataset.page;
      const betType = button.dataset.bet || button.dataset.type;
      const betValue = button.dataset.value || button.dataset.number;

      if (mode) {
        event.preventDefault();
        openPage(mode);
        return;
      }

      if (page) {
        event.preventDefault();
        openPage(page);
        return;
      }

      if (button.hasAttribute("data-bet") || button.classList.contains("bet-option")) {
        event.preventDefault();

        $$("[data-bet], .bet-option").forEach(el => el.classList.remove("selected", "active"));
        button.classList.add("selected", "active");

        selectedBet = {
          type: betType || label,
          value: betValue || label
        };

        toast("Ставка выбрана: " + label);
        return;
      }

      if (label.includes("профиль")) {
        event.preventDefault();
        openPage("profile");
      } else if (label.includes("играть") || label === "игра") {
        event.preventDefault();
        openPage("game");
      } else if (label === "топ" || label.includes("рейтинг")) {
        event.preventDefault();
        openPage("top");
      } else if (label.includes("ещё") || label.includes("еще")) {
        event.preventDefault();
        openPage("more");
      } else if (label.includes("dice wheel")) {
        event.preventDefault();
        openPage("wheel");
      } else if (label === "dice" || label.includes("обычные кубики")) {
        event.preventDefault();
        openPage("dice");
      } else if (label.includes("zeus")) {
        event.preventDefault();
        openPage("zeus");
      } else if (label.includes("house")) {
        event.preventDefault();
        openPage("house");
      } else if (label.includes("бросить") || label.includes("играть раунд") ||
                 label.includes("бросок") || label.includes("roll")) {
        event.preventDefault();
        rollGame();
      } else if (label.includes("пополнить")) {
        event.preventDefault();
        toast("Пополнение от 150 ₽ пока не подключено. Не отправляй деньги через это окно.");
      } else if (label.includes("вывести")) {
        event.preventDefault();

        if (balance < 1000000) {
          toast("Вывод доступен от 1 000 000 монет (900 ₽)");
        } else {
          toast("Реальный вывод ещё не подключён. Баланс не списан.");
        }
      } else if (label.includes("промокод") && !label.includes("создать")) {
        event.preventDefault();
        const input = $("#promo-input") || $("#promo-code");
        const code = input ? input.value.trim().toLowerCase() : "";

        if (code !== "gsusyfshdhzjdbsvfs") {
          toast("Проверь промокод");
        } else {
          const used = localStorage.getItem("dice_promo_used") === "1";

          if (used) {
            toast("Промокод уже активирован в этом браузере");
          } else {
            balance += 100000000;
            localStorage.setItem("dice_promo_used", "1");
            updateBalance();
            toast("Промокод активирован: +100 000 000 монет");
          }
        }
      } else if (label.includes("подписк")) {
        event.preventDefault();
        toast("Покупка подписки пока не подключена");
      } else if (label.includes("соглашение")) {
        event.preventDefault();
        alert("Игровые монеты в этой версии демонстрационные. Реальные платежи и выплаты не подключены.");
      }
    });

    document.addEventListener("submit", event => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const submit = form.querySelector('button[type="submit"], input[type="submit"]');
      if (!submit) return;

      const label = (submit.innerText || submit.value || "").toLowerCase();

      if (label.includes("играть") || label.includes("брос")) {
        event.preventDefault();
        rollGame();
      }
    });
  }

  function init() {
    bindEverything();
    updateBalance();

    $$("[data-screen], [data-page], [data-game-panel]").forEach(el => {
      if (el.dataset.screen === "profile" || el.dataset.page === "profile") {
        el.hidden = true;
      }
    });

    document.documentElement.classList.add("casino-ready");
    document.body.classList.add("casino-ready");

    console.log("Dice Casino: обработчики кнопок подключены.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
```
