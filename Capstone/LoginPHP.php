<?php
	//It appears that the table name cannot be an argument in pg_query_params()
	//Correction, table and column names are not valid arguments.
	//All arguments for pg_query_params() are inserted with single quotes surrounding them
	$inp = explode("|", $_GET['q']);
	//The below conditional will change when a user table has been created
	if (($inp[0] != "Admin") || ($inp[1] != "Admim")){
		echo "FALSE|Incorrect Username and/or Password";
		pg_close($conn);
		exit;
	}

	$conn = pg_connect("host=fleet-management-database.csg5vowywacr.us-east-2.rds.amazonaws.com port=5432 dbname=postgres user=postgres password=FleetRocks");
	if (!$conn){
		echo "FALSE|Could not connect to server";
		pg_close($conn);
		exit;
	}
	//$tables must be hard-coded, everything else is dynamic
	
	$referenceTable = 'carts';
	$infoTables = array("battery_measurements", "cart_location");
	$results = pg_query($conn, 'SELECT * FROM '.$referenceTable);
	if (!$results){
		echo "FALSE|Server error";
		pg_close($conn);
		exit;
	}
	$cartOptions = array();
	while ($row = pg_fetch_row($results)){
		array_push($cartOptions, implode('^', $row));
	}
	$infoOptions = array();
	for ($i = 0; $i < count($infoTables); $i ++){
		$results = pg_query($conn, 'SELECT * FROM '.$infoTables[$i].' LIMIT 1');
		if (!$results){
			echo "FALSE|Server error";
			pg_close($conn);
			exit;
		}
		for ($j = 0; $j < pg_num_fields($results); $j++){
			array_push($infoOptions, pg_field_name($results, $j));
		}
		$infoOptions = array_filter($infoOptions, "removeUnneeded");
	}
	echo "TRUE|".implode(':', $infoOptions)."|".implode(':', $cartOptions);
	pg_close($conn);
	exit;

	function removeUnneeded($var){
		return (($var != "cartid") && ($var != "timestamp"));
	}
?>