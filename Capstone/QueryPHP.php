<?php
    //To prevent SQL injection, create an array of all column names to verify the user input against
    //Extra precautions will be taken to help prevent SQL-injection attacks
    //An ssl connection to the database is attempted
	$conn = pg_connect("host=fleet-management-database.csg5vowywacr.us-east-2.rds.amazonaws.com port=5432 dbname=postgres user=postgres password=FleetRocks sslmode=require");
	if (!$conn){
		echo "FALSE|Could not connect to server2";
		exit;
	}

    //$inp holds the user input from main.js
    $inp = explode('|', $_GET['q']);
    $timeChosen = explode(':', $inp[0]);
    //$importantTimes = ["Specific Date", "Most Recent"]; A guide for the programmer, NOT an array
    $cartChosen = explode(':', $inp[1]);
    $infoChosen = explode(':', $inp[2]);
    //Sanitizing now to avoid repeated sanitization
    $referenceTable = pg_escape_string($conn, 'carts');
    $infoTable = pg_escape_string($conn, 'battery_measurements');

    //$*Options variables fulfill the same function they do in LoginPHP.php
    //$cartOptions is set to all carts existing in the reference table
    $results = pg_query($conn, 'SELECT cartid FROM '.$referenceTable);
    if (!$results){
        echo "FALSE|Server error2";
        pg_close($conn);
        exit;
    }
    $cartOptions = array();
    while ($row = pg_fetch_row($results)){
        array_push($cartOptions, $row[0]);
    }

    //$infoOptions is set to all column names in the info table
    $infoOptions = array();
    $results = pg_query($conn, 'SELECT * FROM '.$infoTable.' LIMIT 1');
    if (!$results){
        echo "FALSE|Server error2";
        pg_close($conn);
        exit;
    }
    for ($j = 0; $j < pg_num_fields($results); $j++){
        array_push($infoOptions, pg_field_name($results, $j));
    }
    $infoOptions = array_filter($infoOptions, "removeUnneeded");

    //$querySuffix is set depending on the time selected by the user
    //The 'Most Recent' option orders by timestamp ascending but only needs one entry
    //The 'Specific Date' option queries for data with timestamps between the midnight of the users date and the midnight of the following day
    //All other options queries for data with timestamps between the current timestamp and some amount of time, given by $timeChosen[1]
    $querySuffix;
    if ($timeChosen[0] == "Most Recent"){
        $querySuffix = ' ORDER BY timestamp DESC LIMIT 1';
    }else{
        //Checking to confirm that a number has been received
        if (!is_numeric($timeChosen[1])){
            echo "FALSE|Invalid time2";
            pg_close();
            exit;
        }
        if ($timeChosen[0] == "Specific Date"){
            $querySuffix = ' AND '.$infoTable.'.timestamp > '.$timeChosen[1].' AND '.$infoTable.'.timestamp < '.($timeChosen[1] + 86400000);
        }else{
            $querySuffix = ' AND '.$infoTable.'.timestamp > '.((time()*1000) - ((int) $timeChosen[1]));
        }
        //All options other than 'Most Recent' need to be ordered by timestamp ascending but NOT limited to one entry
        $querySuffix .= ' ORDER BY '.$infoTable.'.timestamp ASC';
    }
    //Sanitizing now to avoid repeated sanitization
    $querySuffix = pg_escape_string($conn, $querySuffix);

    //$stamps holds all timestamps for the future query(s)
    $stamps = array();
    $results = pg_query($conn, 'SELECT timestamp FROM '.$infoTable.' WHERE 1 = 1'.$querySuffix);
    if (!$results){
        echo "FALSE|Server error2 3";
        pg_close($conn);
        exit;
    }
    while ($row = pg_fetch_row($results)){
        array_push($stamps, date('Y-m-d H:i:s', ($row[0] / 1000)));
        //WARNING
        //No error will occur if there is no timestamp, the date returned is the epoch
        //Do not use the timestamp to check if data exists, use data to check if the timestamp exists
    }
    
    //Comparing the user input with the options available from the database
    $cartChosen = array_filter($cartOptions, "validCart");
    $infoChosen = array_filter($infoOptions, "validInfo");

    //$ret becomes a three-dimensional array
    //Changing 'x' in $ret[x] changes the information
    //Changing 'y' in $ret[x][y] changes the cart
    //Changing 'z' in $ret[x][y][z] changes the data
    $ret = array();
    for ($i = 0; $i < count($infoChosen); $i ++){
        $ret[$i] = array();
    }
    //Imploding the info desired to run the fewest queries, and tests the connection
    $queryInfos = pg_escape_string($conn, implode(', ', $infoChosen));
    $forParams = 'SELECT '.$queryInfos.' FROM '.$infoTable.' LIMIT 1';
    $results = pg_query($conn, $forParams);
    if (!$results){
        echo "FALSE|Server error2 4";
        pg_close($conn);
        exit;
    }
    //This JOIN allows for the surrogate key to never leave the database
    $joined = $infoTable.' JOIN '.$referenceTable.' ON '.$infoTable.'.cartid = '.$referenceTable.'.id';
    $forParams = 'SELECT '.$queryInfos.' FROM '.$joined.' WHERE '.$referenceTable.'.cartid = ';
    //A query is sent for each cart, then pushed into $ret with a for loop iterating through the first dimension
    foreach ($cartChosen as $cart){
        $results = pg_query($conn, $forParams.pg_escape_string($conn, $cart).$querySuffix);
        if (!$results){
            echo "FALSE|Server error2 5";
            pg_close($conn);
            exit;
        }
        for ($i = 0; $i < count($infoChosen); $i ++){
            array_push($ret[$i], pg_fetch_all_columns($results, $i));
        }
    }

    //Implode the second and third dimensions of $ret
    for ($i = 0; $i < count($infoChosen); $i ++){
        for ($c = 0; $c < count($cartChosen); $c ++){
            $ret[$i][$c] = implode('~', $ret[$i][$c]);
        }
        $ret[$i] = implode('^', $ret[$i]);
    }

    //Implode and concatenate everything to echo back to main.js
    $ret = 'TRUE|'.implode(':', $ret).'|'.implode('^', $stamps).'|'.implode(':', $infoChosen).'|'.implode(':', $cartChosen);
    echo $ret;
	pg_close($conn);
	exit;

    //Helper function to remove the foreign key and timestamp columns
    function removeUnneeded($var){
        return (($var != "cartid") && ($var != "timestamp"));
    }

    //Helper function to compare the user input with options from the database
    function validCart($var){
        global $cartChosen;
        foreach ($cartChosen as $temp){
            if ($temp == $var){
                return true;
            }
        }
        return false;
    }

    //Helper function to compare the user input with options from the database
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
