<?php
	//An ssl connection to the database is attempted
	$conn = pg_connect("host=fleet-management-database.csg5vowywacr.us-east-2.rds.amazonaws.com port=5432 dbname=postgres user=postgres password=FleetRocks sslmode=require");
	if (!$conn){
		echo "FALSE|Could not connect to server";
		pg_close($conn);
		exit;
	}
	
	//$inp holds the user input from main.js
	$inp = explode("|", $_GET['q']);
	//The below conditional will change when a user table has been created
	if (($inp[0] != "Admin") || ($inp[1] != "Admim")){
		echo "FALSE|Incorrect Username and/or Password";
		pg_close($conn);
		exit;
	}

	//$*Table variables must be hard-coded, everything else is dynamic
	$referenceTable = 'carts';
	$infoTable = 'battery_measurements';
	//The reference table is queried for all carts in existance, and held by $cartOptions
	$results = pg_query($conn, 'SELECT cartid FROM '.pg_escape_string($conn, $referenceTable));
	if (!$results){
		echo "FALSE|Server error";
		pg_close($conn);
		exit;
	}
	$cartOptions = array();
	while ($row = pg_fetch_row($results)){
		array_push($cartOptions, $row[0]);
	}
	//The info table is queried to all column names
	$results = pg_query($conn, 'SELECT * FROM '.pg_escape_string($conn, $infoTable).' LIMIT 1');
	if (!$results){
		echo "FALSE|Server error";
		pg_close($conn);
		exit;
	}
	$infoOptions = array();
	for ($i = 0; $i < pg_num_fields($results); $i++){
		array_push($infoOptions, pg_field_name($results, $i));
	}
	$infoOptions = array_filter($infoOptions, "removeUnneeded");
	//The *Options arrays are imploded to echo a string back to main.js
	echo "TRUE|".implode(':', $infoOptions)."|".implode(':', $cartOptions);
	pg_close($conn);
	exit;

	//Helper function to remove the foreign key and timestamp columns
	function removeUnneeded($var){
		return (($var != "cartid") && ($var != "timestamp"));
	}
?>
