import { useState } from "react";
import "./styles/neon.css";

function App() {
  const [active, setActive] = useState("home");

  return (
    <div className="app">

      <div className="background-particles">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>


      <main className="content">

        {active === "home" && (
          <div className="home">

            <div className="balance-box">

              <div className="floating coin one"></div>
              <div className="floating coin two"></div>
              <div className="floating diamond"></div>

              <div className="balance-title">
                BALANCE
              </div>

              <div className="balance">
                1 250 000
                <div className="small-coin"></div>
              </div>

            </div>


            <button className="neon-button">
              Перевести другу
            </button>


            <button className="neon-button gold">
              Пополнить монеты
            </button>


            <button className="neon-button">
              Активировать промокод
            </button>


            <button className="neon-button withdraw">
              Вывести
            </button>


          </div>
        )}



        {active === "games" && (
          <div className="page">
            <h1>Игры</h1>
            <div className="card">
              Neon Dice
            </div>
            <div className="card">
              Cyber Cube
            </div>
          </div>
        )}



        {active === "top" && (
          <div className="page">
            <h1>Топ игроков</h1>

            <div className="card">
              1 место — 5 000 000
            </div>

            <div className="card">
              2 место — 2 500 000
            </div>

          </div>
        )}



        {active === "menu" && (
          <div className="page">

            <h1>Меню</h1>

            <div className="card">
              Реферальная система
            </div>

            <div className="card">
              Смена имени
            </div>

            <div className="card">
              Цвет имени
            </div>

          </div>
        )}


      </main>



      <nav className="bottom-menu">

        <button
          className={active==="home" ? "active":""}
          onClick={()=>setActive("home")}
        >
          <div className="icon home-icon"></div>
        </button>


        <button
          className={active==="games" ? "active":""}
          onClick={()=>setActive("games")}
        >
          <div className="icon game-icon"></div>
        </button>


        <button
          className={active==="top" ? "active":""}
          onClick={()=>setActive("top")}
        >
          <div className="icon crown-icon"></div>
        </button>


        <button
          className={active==="menu" ? "active":""}
          onClick={()=>setActive("menu")}
        >
          <div className="icon menu-icon"></div>
        </button>


      </nav>


    </div>
  );
}


export default App;
