let mode = "buy";


const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const coinInput = document.getElementById("coinInput");
const rubResult = document.getElementById("rubResult");
const mainAction = document.getElementById("mainAction");



function openBuy(){

    mode = "buy";

    modalTitle.innerText = "Купить World Coin";

    mainAction.innerText = "Перейти к оплате";

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



    let rate = mode === "buy" ? 10.60 : 9.00;



    let rub = (coins / 1000000) * rate;


    rubResult.innerText = rub.toFixed(2) + " ₽";

}






mainAction.onclick = async function(){


    let coins = Number(coinInput.value);



    if(!coins || coins <= 0){

        alert("Введите количество коинов");

        return;

    }




    if(mode === "buy"){


        // создаём сумму платежа

        let rub = (coins / 1000000) * 10.60;



        try {


            const response = await fetch("/create-payment", {


                method:"POST",


                headers:{


                    "Content-Type":"application/json"


                },


                body:JSON.stringify({


                    amount: rub.toFixed(2),


                    code: Date.now()


                })


            });



            const data = await response.json();



            if(data.success){


                window.open(
                    data.link,
                    "_blank"
                );


            } else {


                alert(
                    "Ошибка создания оплаты"
                );


            }



        } catch(e){


            alert(
                "Ошибка соединения с сервером"
            );


        }



    }






    else {



        alert(
            "Здесь добавим ссылку для передачи коинов"
        );


    }



};







if(window.Telegram && Telegram.WebApp){


    Telegram.WebApp.ready();


    Telegram.WebApp.expand();


}
