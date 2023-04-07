//The *Options variables are globals used to format 'infoFormSection'
let infoOptions;
let cartOptions;
let timeOptions = [["Specific Date", 0],
["Most Recent", 0],
["Past 24 hours", 86400000],
["Past 7 days", 86400000*7],
["Past 30 days", 86400000*30]];
//The *Chosen variables are set by choose() upon completion and used by queryData()
let infoChosen;
let cartChosen;
let timeChosen;
//myInterval allows the interval to be started then stopped by a variety of functions
let myInterval;
//Controls the eventListener and loginVal()
let stopLogin = false;
let mapChosen = false;

//This event listener makes the login process a little nicer by being able to hit enter to submit the form
document.addEventListener("keypress", function(event) {
    if ((!stopLogin) && (event.key === "Enter")){
        loginVal();
    }
});

//loginVal() passes the username and password given by the user to LoginPHP.php
//Acts on what is returned by the PHP and hides the login form if it's successful
function loginVal () {
    //This conditional stops the function from being completed if another instance is already running or the user has already logged in
    if (stopLogin){
        return;
    }
    stopLogin = true;

    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    const xhttp = new XMLHttpRequest();
    xhttp.onload = function() {
        //Receives a string from LoginPHP.php with either an error message or the data requested
        const returned = this.responseText.split('|');
        if (returned[0] == "TRUE"){
            //Hides the login form and presents checkboxes
            document.getElementById("loginFormSection").style.display = "none";
            document.getElementById("logout").style.display = "block";
            document.getElementById("title").innerHTML = "Mobile Microgrid";
            returned.shift();
            infoOptions = returned[0].split(':');
            cartOptions = returned[1].split(':');

            document.getElementById("infoFormSection").insertAdjacentHTML('beforeend', 
            '<section id="optionList"><header>Info</header>'+infoOptions.map(createInfoBox).join('')+'</section>');
            document.getElementById("optionList").insertAdjacentHTML('beforeend',
            '<input type="checkbox" id="cart_location" onchange="choose()"><label for="cart_location"> Cart Location</label><br>');
            document.getElementById("infoFormSection").insertAdjacentHTML('beforeend', 
            '<section id="cartList"><header>Carts</header>'+cartOptions.map(createCartBox).join('')+'</section>');
            document.getElementById("infoFormSection").insertAdjacentHTML('beforeend', 
            '<section id="timeList"><header>Time</header><p><b>Warning! Times above 24 hours will lag the site</b></p>'+timeOptions.map(createTimeBox).join('')+'</section>');
            document.getElementById("failure").innerHTML = "";
        }else{
            document.getElementById("failure").innerHTML = returned[1];
            stopLogin = false;
        }
    }
    xhttp.open("GET", "LoginPHP.php?q="+user+"|"+pass);
    xhttp.send();
}

//logout() resets the form to the login page
function logout() {
    document.getElementById("logout").style.display = "none";
    document.getElementById("title").innerHTML = "Mobile Microgrid Login";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("loginFormSection").style.display = "block";
    document.getElementById("infoFormSection").innerHTML = "";
    document.getElementById("failure").innerHTML = "";
    document.getElementById("infoSection").innerHTML = "";
    document.getElementById("chartSection").innerHTML = "";
    document.getElementById("mapSection").innerHTML = "";
    stopLogin = false;
    if (myInterval != undefined){
        clearInterval(myInterval);
        myInterval = undefined;
    }
}

//Helper function to format the infomation checkboxes
function createInfoBox(data) {
    const word = data.split('_').map(capitalizeWord).join(' ');
    if ((data != "cart_longitude") && (data != "cart_latitude") && (data != "altitude")){
        return `
        <input type="checkbox" id="${data}" onchange="choose()">
        <label for="${data}">${word}</label><br>
        `;
    }
}

//Helper function to format the cart checkboxes
function createCartBox(data) {
    const word = data.split('_').map(capitalizeWord).join(' ');
    return `
    <input type="checkbox" id="${data}" onchange="choose()">
    <label for="${data}">${word}</label><br>
    `;
}

//Helper function to format the time radio buttons
function createTimeBox(data) {
    if (data[0] == "Specific Date"){
        return `
        <input type="radio" id="${data[0]}" name="timeOption" onchange="choose()">
        <label for="${data[0]}">${data[0]}: <input type="text" id="${data[0]}:inp" placeholder="MMDDYYYY" oninput="choose(false)"></label><br>
        `;
    }else{
        return `
        <input type="radio" id="${data[0]}" name="timeOption" value="${data[1]}" onchange="choose()">
        <label for="${data[0]}">${data[0]}</label><br>
        `;
    }
}

//Helper function to capitalize the first letter of a word
function capitalizeWord(word) {
    return word.replace(word.charAt(0), word.charAt(0).toUpperCase());
}

//choose() runs anytime there is meaningful user input
//Scans the entire page for all user information and handles it accordingly
function choose(reload = true) {
    document.getElementById("failure").innerHTML = "";
    infoTemp = [];
    cartTemp = [];
    timeTemp = undefined;

    //Scans the information checkboxes for user input
    infoOptions.forEach(function(opt) {
        if ((document.getElementById(opt) != null) && (document.getElementById(opt).checked)){
            infoTemp.push(opt);
        }
    });
    if (document.getElementById('cart_location').checked){
        infoTemp.push('cart_longitude');
        infoTemp.push('cart_latitude');
        infoTemp.push('altitude');
    }
    if (infoTemp.length == 0){
        document.getElementById("failure").innerHTML = "No info selected";
        if (myInterval != undefined){
            clearInterval(myInterval);
            myInterval = undefined;
        }
        return;
    }

    //Scans the cart checkboxes for user input
    cartOptions.forEach(function(opt) {
        if (document.getElementById(opt).checked){
            cartTemp.push(opt);
        }
    });
    if (cartTemp.length == 0){
        document.getElementById("failure").innerHTML = "No cart selected";
        if (myInterval != undefined){
            clearInterval(myInterval);
            myInterval = undefined;
        }
        return;
    }

    //Scans the time radio buttons for user input
    const radios = document.getElementsByName("timeOption");
    for (let i = 0; i < radios.length; i ++){
        if (radios[i].checked){
            timeTemp = radios[i];
            //The conditional below prevents the page from reloading if a date is being typed without the radio button selected
            if ((i != 0) && (!reload)){
                return;
            }
        }
    }
    if (timeTemp == undefined){
        document.getElementById("failure").innerHTML = "No time period selected";
        if (myInterval != undefined){
            clearInterval(myInterval);
            myInterval = undefined;
        }
        return;
    }
    timeOptions.forEach(function(time) {
        if (time[0] == timeTemp.id){
            timeTemp = time;
            if (timeTemp[0] == "Specific Date"){
                timeTemp[1] = document.getElementById(time[0]+":inp").value;
            }
        }
    });
    //Handles user input if 'Specific Date' radio button is selected
    if (timeTemp[0] == "Specific Date"){
        if (timeTemp[1].length != 8){
            document.getElementById("failure").innerHTML = "No valid date entered";
            if (myInterval != undefined){
                clearInterval(myInterval);
                myInterval = undefined;
            }
            return;
        }else{
            //Formats the user input to be handled by Date.parse()
            timeTemp[1] = `${timeTemp[1].substring(0,2)}/${timeTemp[1].substring(2,4)}/${timeTemp[1].substring(4,8)}`;
            timeTemp[1] = Date.parse(timeTemp[1]);
            if (timeTemp[1] == NaN){
                document.getElementById("failure").innerHTML = "No valid date selected";
                if (myInterval != undefined){
                    clearInterval(myInterval);
                    myInterval = undefined;
                }
                return;
            }
        }
    }
    //*Chosen variables are set here
    infoChosen = infoTemp;
    cartChosen = cartTemp;
    timeChosen = timeTemp;
    //Run queryData() immediately upon completion, then set an interval to run queryData() every ten seconds
    queryData(true);
    if (myInterval == undefined){
        myInterval = setInterval(queryData, 10000);
    }
}

//queryData() sends the user input to QueryPHP.php and receives the data to present to the user
//inject is false be default and only true during the first function with this particular set of *Chosen variables
function queryData(inject = false) {
    //Stringify the *Chosen variables to be sent to QueryPHP.php
    let toPHP = timeChosen.join(':') + "|";
    toPHP += cartChosen.join(':') + "|";
    toPHP += infoChosen.join(':');

    const xhttp = new XMLHttpRequest();
    xhttp.onload = function () {
        const full = this.responseText;
        //Receives a string from QueryPHP.php with either an error message or the data requested
        let fullArr = full.split('|');
        if (fullArr[0] == 'TRUE'){
            //Separates fullArr into it's components to be more easily understood and used
            document.getElementById("chartSection").style.display = "block";
            fullArr.shift();
            let carts = fullArr.pop().split(':');
            let infos = fullArr.pop().split(':');
            let stamps = fullArr.pop().split('^');
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

            //Resets the info space
            document.getElementById("infoSection").innerHTML = "";
            //Resets the chart space if this is the first function call with this particular set of *Chosen variables
            if (inject){
                document.getElementById("chartSection").innerHTML = "";
                document.querySelector("body").style.gridTemplateColumns = "100%";
            }
            // document.getElementById("mapSection").innerHTML = "";
            //Nested loops to present data for each cart-info pair
            for (let c = 0; c < carts.length; c ++){
                let latData = null;
                let lngData = null;
                let altData = null;
                for (let i = 0; i < infos.length; i ++){
                    //Setting map data, provided by Lake Smith
                    if(infos[i] == "cart_longitude"){
                        lngData = fullArr[i][c];
                    }else if(infos[i] == "cart_latitude"){
                        latData = fullArr[i][c];
                    }else if(infos[i] == "altitude"){
                        altData = fullArr[i][c];
                    }
                    if(mapChosen == true){
                        //make  it invisible
                        document.getElementById('mapSection').innerHTML = "";
                        mapChosen = false;
                    }
                    if((latData != null) && (lngData != null) && (altData != null)){
                        if (inject){
                            document.querySelector("body").style.gridTemplateColumns = "60% 40%";
                        }
                        mapChosen = true;
                        addCartData(latData, lngData, altData, stamps, carts[c]);
                    }
                    //top holds the label for each cart-info pair
                    const top = infos[i].split('_').map(capitalizeWord).join(' ') + ' for ' + carts[c];
                    if ((fullArr[i][c] == undefined) || (fullArr[i][c].length == 0)){
                        document.getElementById("infoSection").insertAdjacentHTML('beforeend', "<p>No data found for chart: "+top+"</p>");
                        continue;
                    }
                    if (fullArr[i][c].length == 1){
                        document.getElementById("infoSection").insertAdjacentHTML('beforeend', "<p>"+top+", "+stamps[0]+" = "+fullArr[i][c][0]+"</p>");
                        continue;
                    }
                    //Only created new HTML elements if this is the first function call with this particular set of *Chosen variables
                    if (inject){
                        document.getElementById("chartSection").insertAdjacentHTML('beforeend', 
                        "<p>"+top+"</p><canvas id="+infos[i]+carts[c]+"></canvas>");
                    }
                    makeChart(stamps, fullArr[i][c], infos[i], carts[c]);
                }
            }
        }else{
            document.getElementById("failure").innerHTML = fullArr[1];
        }
    }
    xhttp.open("GET", "QueryPHP.php?q=" + toPHP);
    xhttp.send();
}

//makeChart() is sent the needed information and is in charge of creating the Chart to be handled by the Chart.js library
function makeChart(xVals, yVals, iLabel, cLabel){
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
            legend: {
                display: false
            }
        }
    })
    
}

//Function provided by Lake Smith
function addCartData (latData, lngData, altData, timeStamps, cart){
    //injects html for new map 
    //document.getElementById('mapSection').style.display = "block";
    let html = `
        <div id="cart${cart}">
            <p>Map data for cart ${cart}</p>
            <div id="map"></div>
        </div>
    `;
    let path = document.getElementById("mapSection");
    path.insertAdjacentHTML("afterbegin", html);
    //make map object visible if it is not the first time generating it
    //const map = initMap();
    
    //initMap();
    const unca = {lat: 35.616110 , lng: -82.564630};
    const map = new google.maps.Map(document.getElementById("map"),{
        zoom: 16,
        center: unca
    });   
    //add markers to given points But only if they are new points
    
    for (let i = 0; i < latData.length; i++){
        
        var cartLocation =  {
            lat: parseFloat(latData[i]), 
            lng: parseFloat(lngData[i])
        };
        //console.log("lat and lng: ", cartLocation.lat, cartLocation.lng);
        //var elevation = data[2][i];
        data = `
            Latitude: ${latData[i]}<br/>
            Longitude: ${lngData[i]}<br/>
            Altitude: ${altData[i]}<br/>
            Time: ${timeStamps[i]}<br/>
        `;
        const infowindow = new google.maps.InfoWindow({
            content: data,
            title: `Cart ${cart + 1}`,
            ariaLabel: `Cart ${cart + 1}`
        });
        const marker = new google.maps.Marker({
            position:cartLocation,
            map: map
        });
        marker.addListener("click", () => {
            infowindow.open({
                anchor: marker,
                map,
            });
        });
    }  
    
    
}
