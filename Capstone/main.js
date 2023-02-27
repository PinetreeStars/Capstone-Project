let infoOptions;
let cartOptions;
let timeOptions = [["Specific Date", 0],
["Most Recent", 0],
["Past 24 hours", 86400000], 
["Past 7 days", 86400000*7],
["Past 30 days", 86400000*30]];
let infoChosen;
let cartChosen;
let timeChosen;
let myInterval;
let stopLogin = false;
let stopChoosing = false;
let stopQuerying = false;
//The stop* variables effectively lock the function from being called repeatedly
//Unclear if they are necessary, but they make me feel better

document.addEventListener("keypress", function(event) {
    if ((!stopLogin) && (event.key === "Enter")){
        loginVal();
    }
});

function loginVal () {
    if (stopLogin){
        return;
    }
    stopLogin = true;

    console.log("loginVal() Started");

    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    const xhttp = new XMLHttpRequest();
    xhttp.onload = function() {
        const returned = this.responseText.split('|');
        console.log(returned);
        if (returned[0] == "TRUE"){
            document.getElementById("loginFormSection").style.display = "none";
            document.getElementById("logout").style.display = "block";
            document.getElementById("title").innerHTML = "Mobile Microgrid";
            returned.shift();
            infoOptions = returned[0].split(':');
            cartOptions = returned[1].split(':');
            for (let i = 0; i < cartOptions.length; i ++) {
                cartOptions[i] = cartOptions[i].split('^');
            }

            document.getElementById("infoFormSection").insertAdjacentHTML('beforeend', 
            '<section id="optionList">'+infoOptions.map(createInfoBox).join('')+'</section>');
            document.getElementById("infoFormSection").insertAdjacentHTML('beforeend', 
            '<section id="cartList">'+cartOptions.map(createCartBox).join('')+'</section>');
            document.getElementById("infoFormSection").insertAdjacentHTML('beforeend', 
            '<section id="timeList">'+timeOptions.map(createTimeBox).join('')+'</section>');
            document.getElementById("infoFormSection").insertAdjacentHTML('beforeend', 
            '<button onclick="userInput()">Get Data</button>');
            document.getElementById("failure").innerHTML = "";
        }else{
            document.getElementById("failure").innerHTML = returned[1];
            stopLogin = false;
        }
    }
    xhttp.open("GET", "LoginPHP.php?q="+user+"|"+pass);
    xhttp.send();
    console.log("loginVal() Finished")
}

function logout() {
    document.getElementById("logout").style.display = "none";
    document.getElementById("title").innerHTML = "Mobile Microgrid Login";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("loginFormSection").style.display = "block";
    document.getElementById("infoFormSection").innerHTML = "";
    document.getElementById("chartSection").style.display = "none";
    stopLogin = false;
    if (myInterval != undefined){
        clearInterval(myInterval);
    }
}

function createInfoBox(data) {
    const word = data.split('_').map(capitalizeWord).join(' ');
    return `
    <input type="checkbox" id="${data}" onchange="choose()">
    <label for="${data}">${word}</label><br>
    `;
}

function createCartBox(data) {
    let visible = data[1];
    if (!((visible.length > 4) && (visible.substring(0, 5).toLowerCase() == "cart "))){
        visible = "cart_"+visible;
    }
    const word = visible.split('_').map(capitalizeWord).join(' ');
    return `
    <input type="checkbox" id="${data[0]}" onchange="choose()">
    <label for="${data[0]}">${word}</label><br>
    `;
}

function createTimeBox(data) {
    if (data[0] = "Specific Date"){
        return `
        <input type="radio" id="${data[0]}" name="timeOption" onchange="choose()">
        <label for="${data[0]}">${data[0]}: <input type="text" id="${data[0]}:inp" placeholder="MMDDYYYY" onchange="choose()"></label><br>
        `;
    }else{
        return `
        <input type="radio" id="${data[0]}" name="timeOption" value="${data[1]}" onchange="choose()">
        <label for="${data[0]}">${data[0]}</label><br>
        `;
    }
}

function capitalizeWord(word) {
    return word.replace(word.charAt(0), word.charAt(0).toUpperCase());
}

function choose() {
    if (stopChoosing){
        return;
    }
    stopChoosing = true;

    document.getElementById("failure").innerHTML = "";
    infoChosen = [];
    cartChosen = [];
    timeChosen = undefined;

    infoOptions.forEach(function(opt) {
        if (document.getElementById(opt).checked){
            infoChosen.push(opt);
        }
    });
    if (infoChosen.length == 0){
        document.getElementById("failure").innerHTML = "No info selected";
        stopChoosing = false;
        return false;
    }

    cartOptions.forEach(function(opt) {
        if (document.getElementById(opt[0]).checked){
            cartChosen.push(opt);
        }
    });
    if (cartChosen.length == 0){
        document.getElementById("failure").innerHTML = "No cart selected";
        stopChoosing = false;
        return false;
    }

    const radios = document.getElementsByName("timeOption");
    for (let i = 0; i < radios.length; i ++){
        if (radios[i].checked){
            timeChosen = radios[i];
        }
    }
    if (timeChosen == undefined){
        document.getElementById("failure").innerHTML = "No time period selected";
        stopChoosing = false;
        return false;
    }
    timeOptions.forEach(function(time, index) {
        if (time[0] == timeChosen.id){
            timeChosen = time;
            if (index == 0){
                timeChosen[1] = document.getElementById(time[0]+":inp").value;
            }
        }
    });
    if (timeChosen[0] == "Specific Date"){
        if (timeChosen[1].length != 8){
            document.getElementById("failure").innerHTML = "No valid date selected";
            stopChoosing = false;
            return false;
        }else{
            timeChosen[1] = `${timeChosen[1].substring(0,2)}/${timeChosen[1].substring(2,4)}/${timeChosen[1].substring(4,8)}`;
            timeChosen[1] = Date.parse(timeChosen[1]);
            if (timeChosen[1] == NaN){
                document.getElementById("failure").innerHTML = "No valid date selected";
                stopChoosing = false;
                return false;
            }
        }
    }
    console.log(infoChosen, cartChosen, timeChosen);
    stopChoosing = false;
    return true;
}

function userInput() {
    //clear myInterval before anything else, just in case
    //Only repercussion I see is the charts will 'freeze' on the previous request if a new invalid one is asked
    if (myInterval != undefined){
        clearInterval(myInterval);
    }
    if (choose()){
        //After choose(), the global '*chosen' variables are set
        //99% confident choose() won't run while queryData() is using the *Chosen variables
        //If I'm wrong, information could be used by queryData() as it's being manipulated by choose()
        queryData();
        myInterval = setInterval(queryData, 10000);
    }
}

function queryData() {
    if (stopQuerying){
        return;
    }
    stopQuerying = true;
    console.log("queryData() started");

    let toPHP = timeChosen.join(':') + "|";
    for (let i = 0; i < cartChosen.length; i ++) {
        if (i != 0){
            toPHP += ':';
        }
        toPHP += cartChosen[i][0];
    }
    toPHP += '|';
    toPHP += infoChosen.join(':');
    console.log(toPHP);

    const xhttp = new XMLHttpRequest();
    xhttp.onload = function () {
        const full = this.responseText;
        let fullArr = full.split('|');
        if (fullArr[0] == 'TRUE'){
            document.getElementById("chartSection").style.display = "block";
            fullArr.shift();
            let carts = fullArr.pop().split(':');
            let infos = fullArr.pop().split(':');
            let stamps = fullArr.pop().split('^');
            for (let i = 0; i < stamps.length; i ++){
                stamps[i] = stamps[i].split('~');
            }
            let stampIndex = fullArr.pop().split(':');
            fullArr = fullArr[0].split(':');
            for (let i = 0; i < fullArr.length; i ++){
                if (fullArr[i].length > 0){
                    fullArr[i] = fullArr[i].split('^');
                    for (let j = 0; j < fullArr[i].length; j ++){
                        if (fullArr[i][j].length > 0){
                            fullArr[i][j] = fullArr[i][j].split('~');
                        }
                    }
                }
            }
            console.log(carts, infos, stamps, stampIndex, fullArr);
            //Everything appears to function correctly up to this point

            document.getElementById("chartSection").innerHTML = "";
            //document.getElementById("chartSection").insertAdjacentHTML('beforeend', `<canvas id="${infos[0]+carts[0]}"></canvas>`)
            //makeChart(stamps[stampIndex[0]], fullArr[0][0], infos[0], carts[0]);
            
            for (let c = 0; c < carts.length; c ++){
                for (let i = 0; i < infos.length; i ++){
                    //New tables will be drawn everytime because I don't want to mess with updating them
                    makeChart(stamps[stampIndex[i]], fullArr[i][c], infos[i], carts[c]);
                }
            }
            
            stopQuerying = false;
        }else{
            document.getElementById("failure").innerHTML = fullArr[1];
            stopQuerying = false;
        }
    }
    xhttp.open("GET", "QueryPHP.php?q=" + toPHP);
    xhttp.send();
    console.log("queryData() finished");
}

function makeChart(xVals, yVals, iLabel, cLabel){
    console.log(xVals, yVals, iLabel, cLabel);
    let caLabel = cLabel;
    if (!((cLabel.length > 4) && (cLabel.substring(0, 5).toLowerCase() == "cart "))){
        caLabel = "Cart "+cLabel;
    }
    let top = iLabel.split('_').map(capitalizeWord).join(' ') + ' for ' + caLabel;
    if (yVals == undefined){
        document.getElementById("chartSection").insertAdjacentHTML('beforeend', "<p>No data found for chart: "+top+"</p>");
        return;
    }
    if (yVals.length == 1){
        document.getElementById("chartSection").insertAdjacentHTML('beforeend', "<p>"+top+", "+xVals[0]+": "+yVals[0]+"</p>");
        return;
    }
    document.getElementById("chartSection").insertAdjacentHTML('beforeend', 
    "<p>"+top+"</p><canvas id="+iLabel+cLabel+"></canvas>");
    new Chart(iLabel+cLabel, {
        type: "line", 
        data: {
            labels: xVals, 
            datasets: [{
                fill: false, 
                lineTension: 0, 
                data: yVals
            }]
        }, 
        options: {
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    })
    
}

//Now to make it look nice
