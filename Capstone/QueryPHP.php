<?php
    //To prevent SQL injection, create an array of all column names to verify the user input against
    //Extra precautions will be taken to help prevent SQL-injection attacks

	$conn = pg_connect("host=fleet-management-database.csg5vowywacr.us-east-2.rds.amazonaws.com port=5432 dbname=postgres user=postgres password=FleetRocks");
	if (!$conn){
		echo "FALSE|Could not connect to server2";
		exit;
	}

    $inp = explode('|', $_GET['q']);
    $timeChosen = explode(':', $inp[0]);
    $importantTimes = ["Specific Date", "Most Recent"];
    //$importantTimes isn't used as an array, just a guide
    $cartChosen = explode(':', $inp[1]);
    $infoChosen = explode(':', $inp[2]);
    $referenceTable = 'carts';
    $infoTable = 'battery_measurements';
    //The large array of $cartChosen matches the $infoTables array

    $results = pg_query($conn, 'SELECT * FROM '.pg_escape_string($conn, $referenceTable));
    if (!$results){
        echo "FALSE|Server error2 1";
        pg_close($conn);
        exit;
    }
    $cartOptions = array();
    while ($row = pg_fetch_row($results)){
        array_push($cartOptions, $row);
    }

    $infoOptions = array();
    $results = pg_query($conn, 'SELECT * FROM '.pg_escape_string($conn, $infoTable).' LIMIT 1');
    if (!$results){
        echo "FALSE|Server error2 2";
        pg_close($conn);
        exit;
    }
    for ($j = 0; $j < pg_num_fields($results); $j++){
        array_push($infoOptions, pg_field_name($results, $j));
    }
    $infoOptions = array_filter($infoOptions, "removeUnneeded");

    $querySuffix;
    if ($timeChosen[0] == "Most Recent"){
        $querySuffix = ' ORDER BY timestamp DESC LIMIT 1';
    }else{
        if (!is_numeric($timeChosen[1])){
            echo "FALSE|Invalid time2";
            pg_close();
            exit;
        }
        if ($timeChosen[0] == "Specific Date"){
            $querySuffix = ' AND timestamp > '.$timeChosen[1].' AND timestamp < '.($timeChosen[1] + 86400000);
        }else{
            $querySuffix = ' AND timestamp > '.((time()*1000) - ((int) $timeChosen[1]));
        }
        $querySuffix .= ' ORDER BY timestamp DESC';
    }

    $stamps = array();
    $results = pg_query($conn, 'SELECT timestamp FROM '.pg_escape_string($conn, $infoTable).' WHERE 1 = 1'.pg_escape_string($conn, $querySuffix));
    if (!$results){
        echo "FALSE|Server error2 3";
        pg_close($conn);
        exit;
    }
    while ($row = pg_fetch_row($results)){
        //array_push($tempStamps, $row[0]);
        array_push($stamps, date('Y-m-d H:i:s', ($row[0] / 1000)));
        //WARNING
        //No error will occur if there is no timestamp, the date returned is the epoch
        //Do not use the timestamp to check if data exists, use data to check if the timestamp exists
    }
    
    $cartChosen = array_filter($cartOptions, "validCart");
    $infoChosen = array_filter($infoOptions, "validInfo");
    //*Chosen variables and $querySuffix cannot have any SQL-Injection possibilities now
    //Filters the *Options for their inclusion in *Chosen
    //This method ensures that the column names are in order for $tableIndex to work
    //Do I need pg_query_params if I guard against SQL-Injection before-hand?
    //I assume no

    $keys = array();
    for ($i = 0; $i < count($infoChosen); $i ++){
        array_push($keys, $i);
    }
    $infoChosen = array_combine($keys, $infoChosen);
    //This is dumb, but the keys roll over from all the filtering so this resets them

    $ret = array();
    for ($info = 0; $info < count($infoChosen); $info ++){
        $forParams = 'SELECT '.pg_escape_string($conn, $infoChosen[$info]).' FROM '.pg_escape_string($conn, $infoTable).' LIMIT 1';
        $results = pg_query($conn, $forParams);
        if (!$results){
            echo "FALSE|Server error2 4";
            pg_close($conn);
            exit;
        }else{
            $forParams = 'SELECT '.pg_escape_string($conn, $infoChosen[$info]).' FROM '.pg_escape_string($conn, $infoTable).' WHERE cartid = ';
        }
        $ret[$info] = array();
        foreach ($cartChosen as $cart){
            $results = pg_query($conn, $forParams.pg_escape_string($conn, $cart[0]).pg_escape_string($conn, $querySuffix));
            if (!$results){
                echo "FALSE|Server error2 5";
                pg_close($conn);
                exit;
            }
            array_push($ret[$info], pg_fetch_all_columns($results));
        }
    }

    for ($i = 0; $i < count($infoChosen); $i ++){
        for ($c = 0; $c < count($cartChosen); $c ++){
            $ret[$i][$c] = implode('~', $ret[$i][$c]);
        }
        $ret[$i] = implode('^', $ret[$i]);
    }
    for ($i = 0; $i < count($cartChosen); $i ++){
        $cartChosen[$i] = $cartChosen[$i][1];
    }

    $ret = 'TRUE|'.implode(':', $ret).'|'.implode('^', $stamps).'|'.implode(':', $infoChosen).'|'.implode(':', $cartChosen);
    echo $ret;
	pg_close($conn);
	exit;

    function removeUnneeded($var){
        return (($var != "cartid") && ($var != "timestamp"));
    }

    function validCart($var){
        global $cartChosen;
        foreach ($cartChosen as $temp){
            if ($temp == $var[0]){
                return true;
            }
        }
        return false;
    }

    function validInfo($var){
        global $infoChosen;
        foreach ($infoChosen as $temp){
            if ($temp == $var){
                return true;
            }
        }
        return false;
    }
?>
