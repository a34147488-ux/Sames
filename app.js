let mode = "buy";


const modal = document.getElementById("modal");

const modalTitle = document.getElementById("modalTitle");

const coinInput = document.getElementById("coinInput");

const rubResult = document.getElementById("rubResult");

const mainAction = document.getElementById("mainAction");





function openBuy(){


    mode = "buy";


    modalTitle.innerText = "Купить World Coin";


    mainAction.innerText = "Получить реквизиты";


    coinInput.value = "";


    rubResult.innerText = "0.00 ₽";


    modal.style.display = "flex";


}







function openSell(){


    mode = "sell";


    modalTitle.innerText = "Продать World Coin";


    mainAction.innerText = "Получить ссылку";


    coinInput.value = "";


    rubResult.innerText = "0.00 ₽";


    modal.style.display = "flex";


}







function closeModal(){


    modal.style.display = "none";


}








function calculate(){


    let coins = Number(coinInput.value);



    if(!coins || coins <= 0){


        rubResult.innerText = "0.00 ₽";


        return;


    }



    let rate;



    if(mode === "buy"){


        rate = 10.60;


    } else {


        rate = 9.00;


    }




    let result = (coins / 1000000) * rate;



    rubResult.innerText = result.toFixed(2) + " ₽";


}








mainAction.onclick = function(){



    if(mode === "buy"){


        /*
        Здесь позже вставим:

        - твои реквизиты
        - ссылку оплаты
        - API другого проекта

        */


        alert(
            "Здесь появятся реквизиты для оплаты"
        );


    }



    else {



        /*
        Здесь позже вставим:

        - ссылку на перевод коинов

        */


        alert(
            "Здесь появится ссылка для перевода коинов"
        );


    }



};







// Telegram Mini App


if(window.Telegram && Telegram.WebApp){


    Telegram.WebApp.ready();


    Telegram.WebApp.expand();


}
