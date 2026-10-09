let mode = "buy";


const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");

const coinInput = document.getElementById("coinInput");
const rubInput = document.getElementById("rubInput");

const rubResult = document.getElementById("rubResult");

const mainAction = document.getElementById("mainAction");



function openBuy(){

mode="buy";

modalTitle.innerText="Купить World Coin";

mainAction.innerText="Перейти к оплате";

coinInput.value="";

rubInput.value="";

rubResult.innerText="0.00 ₽";

modal.style.display="flex";

}



function openSell(){

mode="sell";

modalTitle.innerText="Продать World Coin";

mainAction.innerText="Получить ссылку";

coinInput.value="";

rubInput.value="";

rubResult.innerText="0.00 ₽";

modal.style.display="flex";

}



function closeModal(){

modal.style.display="none";

}




function calculateFromCoins(){

let coins=Number(coinInput.value);


if(!coins)return;


let rate = mode==="buy" ? 10.60 : 9.00;


let rub=(coins/1000000)*rate;


rubInput.value=rub.toFixed(2);

rubResult.innerText=rub.toFixed(2)+" ₽";

}




function calculateFromRub(){

let rub=Number(rubInput.value);


if(!rub)return;


let rate = mode==="buy" ? 10.60 : 9.00;


let coins=(rub/rate)*1000000;


coinInput.value=Math.floor(coins);


rubResult.innerText=rub.toFixed(2)+" ₽";

}






mainAction.onclick=async()=>{


alert(
"Подключение оплаты добавим следующим этапом"
);


};





if(window.Telegram && Telegram.WebApp){

Telegram.WebApp.ready();

Telegram.WebApp.expand();

}
