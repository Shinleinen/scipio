<?php
define ('SESSION_VAR_SPACE','Scipio');
define ('ROLE_GROUP','Scipio');
define ('ROLE_NAME','Scipio user');
define ('UUID', uniqid());

define ('SKU_LIMIT',6000);

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require 'vars.php';
require '../roles.php';
require_once '../includes/sql.php';



if (!isset($roles[2]) ) die('Not Allowed!');

//define ('USER_ID', $roles[2]['uid']);
//define ('USER_NAME', $roles[1]);

define ('USER_LOGIN', substr(str_replace("'","''",preg_replace('/^.*\\\\/i', '', $_SESSION['AUTH_USER'])),0,100));

$sql_query ='';


// ################## SESSION VALUES
if (session_status() == PHP_SESSION_NONE) 	session_start();
if(!isset($_SESSION[SESSION_VAR_SPACE])) $_SESSION[SESSION_VAR_SPACE] = array();
$session_vars = $_SESSION[SESSION_VAR_SPACE];
/*
if (!isset($session_vars['selected_wf']) ) $session_vars['selected_wf'] = array();
//if (!isset($session_vars['wf_cat'])) $session_vars['wf_cat'] = "'_'";
if (!isset($session_vars['per_page'])) $session_vars['per_page']=10;
if (isset($_POST['per_page'])) {
	$session_vars['per_page'] = (int) $_POST['per_page'] ? (int)$_POST['per_page'] : 10;
}
if ( (isset($_POST['type']) && $_POST['type']==='reset')) unset($session_vars['filters']);
*/

$_SESSION[SESSION_VAR_SPACE] = $session_vars;

session_write_close();

if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['type'])) post();



$sql_query = "SELECT [id], [name] FROM ".SQL_PRESETS." WHERE [user]='".USER_LOGIN."' ORDER BY [name]";
tsql_connect(array(),0);
$dat = sql2object(sql_get_columns());
$saved_presets = '';
for($i=0; $i<$dat->length; $i++){
	$name = htmlspecialchars(rawurldecode($dat->data['name'][$i]));
	$id = $dat->data['id'][$i];
	$saved_presets .= "<option value=\"{$id}\">{$name}</option>";
}




function	post() {
	global $output, $roles;
	$output = array();
	header("Content-Type: text/plain");
	switch ($_POST['type']) {
		case 'ping':
			$output='[1]';
			break;
		case 'get_info_preset':
			get_info(true);
			break;
		case 'get_info':
			get_info(false);
			break;
		case 'pdel':
			post_pdel();
			break;
		case 'pren':
			post_pren();
			break;
		case 'preset':
			if(!isset($_POST['action'])) STOP( __LINE__);
			if($_POST['action']==='save') get_preset_save();
			break;
		case 'tst':
			tst();
			break;
		default:
			die('error');
	}
	$o = json_encode($output);
	if(strlen($o)>4096) {
		header('Content-Encoding: gzip');
		$o = gzencode($o,5);
	}
	echo $o;
	die();
}


function	tst(){
	global	$output;
	$a = 'tipa';

	die();
}

function check_db_available($list) {
	global $sql_query, $output, $stmt;
	$sql_query = "SELECT SUM([state]), MAX(case when [state]!=0 THEN [name] END) FROM sys.databases WHERE [name] IN ({$list})";
	tsql_connect(array(),1);
	$t = sqlsrv_fetch_array ($stmt, SQLSRV_FETCH_NUMERIC);
	$output['db_fail'] = [$t[0],$t[1]];

}

function	post_pren() {
	global $sql_query, $output, $stmt;
	if (!isset($_POST['id']) || (int)$_POST['id'] ===0 || !isset($_POST['name']) || $_POST['name']==='') STOP( __LINE__);
	$name = str_replace("'","''",$_POST['name']);
	$id = (int)$_POST['id'];
	$user = USER_LOGIN;
	$sql_query = "UPDATE ".SQL_PRESETS." SET [name]=N'{$name}' WHERE [id]=$id AND [user]='{$user}'
		SELECT [name] FROM ".SQL_PRESETS." WHERE [id]=$id AND [user]='{$user}'";
	tsql_connect();
	$output['ok'] = 1===sqlsrv_rows_affected( $stmt);
	sql_next_resultive();
	$output['name'] = sqlsrv_fetch_array ($stmt, SQLSRV_FETCH_NUMERIC)[0];
}

function	post_pdel() {
	global $sql_query, $output, $stmt;
	if (!isset($_POST['id']) || (int)$_POST['id'] ===0 ) STOP( __LINE__);
	$id = (int)$_POST['id'];
	$user = USER_LOGIN;
	$sql_query = "DELETE FROM ".SQL_PRESETS." WHERE [id]=$id AND [user]='{$user}'";
	tsql_connect();
	$output['deleted'] = 1===sqlsrv_rows_affected( $stmt);
}

function	get_minmaxpn() {
	$minsku = isset($_POST['minsku']) ? (int)$_POST['minsku'] : '';
	$maxsku = isset($_POST['maxsku']) ? (int)$_POST['maxsku'] : '';
	$minsku = $minsku<=0 || $minsku>99999999 ? null : $minsku;
	$maxsku = $maxsku<=0 || $maxsku>99999999 ? null : $maxsku;
	$pnmask = isset($_POST['pnmask']) && $_POST['pnmask']!=='' ? str_replace("'","''",substr($_POST['pnmask'],0,20)) : null;
	return [$minsku,$maxsku,$pnmask];
}

function	get_preset_save() {
	global $sql_query, $output, $stmt; 
	if (!isset($_POST['sku']) || !isset($_POST['listed']) || !isset($_POST['name']) || !isset($_POST['filter'])) STOP( __LINE__);
	$skus = check_skus($_POST['sku']);
	$skus = implode($skus,',');
	$listed = (int) $_POST['listed'];
	if ($listed<0 || $listed>1) STOP( __LINE__);
	$name = str_replace("'","''",$_POST['name']);
	$user = USER_LOGIN;
	$f = json_decode($_POST['filter']);
	if (!(json_last_error()===JSON_ERROR_NONE && gettype($f)==='array')) STOP( __LINE__);
	$filter = str_replace("'","''",$_POST['filter']);

	[$minsku,$maxsku,$pnmask] = get_minmaxpn();
	if ($minsku===null) $minsku = 'NULL';
	if ($maxsku===null) $maxsku = 'NULL';
	$pnmask = $pnmask===null ? 'NULL' : "'".$pnmask."'";

	$sql_query = "
	IF EXISTS(SELECT * FROM ".SQL_PRESETS." WHERE [user]='{$user}' AND [name]=N'{$name}')
	UPDATE ".SQL_PRESETS." SET [filter]='{$filter}',sku_list='{$skus}', is_listed_only={$listed}, ts=GETDATE(), minsku={$minsku}, maxsku={$maxsku}, pnmask={$pnmask}  WHERE [user]='{$user}' AND [name]=N'{$name}'
	ELSE INSERT INTO ".SQL_PRESETS."([name],sku_list,is_listed_only,[filter],[user],ts,minsku,maxsku,pnmask) VALUES(N'{$name}', '{$skus}',{$listed},'{$filter}','{$user}',GETDATE(),{$minsku},{$maxsku},{$pnmask})
	SELECT [id], [name] FROM ".SQL_PRESETS." WHERE [user]='{$user}' AND [name]=N'{$name}'
	";
	tsql_connect();
	sql_next_resultive();
	$output['svd'] = sql_get_columns();
}

function	check_skus($skus) {
 	$skus = json_decode($skus);
	if (!(json_last_error()===JSON_ERROR_NONE && gettype($skus)==='array')) STOP( __LINE__);
	if (sizeof($skus)===1 && $skus[0]==='') $skus = [];
	foreach($skus as $i=>$v){
		$v = (int) $v;
		if($v <=0 || $v>2147483647) STOP( __LINE__);
		$skus[$i] = $v;		
	}
	return $skus;
}

function	get_info($is_preset) {
	global $sql_query, $output, $stmt;
	check_db_available("'workdb','MDB_Mirror','TPD_Mirror','PDM'");
	if($output['db_fail'][0]!='0') return;

	if ($is_preset) {
		if (!isset($_POST['preset']) || (int)$_POST['preset'] ===0 ) STOP( __LINE__);
		$id = (int)$_POST['preset'];
		$sql_query = "SELECT sku_list, is_listed_only, [filter], minsku, maxsku, pnmask FROM ".SQL_PRESETS." WHERE [id]={$id} AND [user]='".USER_LOGIN."'";
		tsql_connect();
		$t = sqlsrv_fetch_array ($stmt, SQLSRV_FETCH_NUMERIC);
		$skus = $t[0];
		if($skus===null) {
				$output['skus'] = $skus;
				return;
		}
		$listed = $t[1]===1 ? true : false;
		$output['filters'] = $t[2];
		$minsku = $t[3];
		$maxsku = $t[4];
		$pnmask = $t[5];
	} else {
		if (!isset($_POST['sku']) ) STOP( __LINE__);
		$skus = check_skus($_POST['sku']);
		$skus = implode($skus,',');
		$listed = isset($_POST['listed']) && $_POST['listed']==='1' ? true : false;
		[$minsku,$maxsku,$pnmask] = get_minmaxpn();
	}

	$output['minmaxpn'] = [$minsku,$maxsku,str_replace("''","'",$pnmask)];
	if ($skus==='' && $pnmask==='') STOP( __LINE__);
	$output['is_listed'] = $listed || $skus==='';
	
	$sql_query = $skus==='' ? "SELECT REPLACE((SELECT TOP 500 sku_id [data()] FROM Extranet_Mirror.dbo.xnet_sku WITH(NOLOCK) WHERE mfg_pn LIKE '{$pnmask}' AND status_id=500 ORDER BY sku_id for XML PATH(''),TYPE).value('.','varchar(max)'),' ',', ')"
				: "SELECT REPLACE((SELECT sku_id [data()] FROM workdb.dbo.sku_cat_type1_stat500 s WHERE sku_id IN ({$skus}) for XML PATH(''),TYPE).value('.','varchar(max)'),' ',', ')";
	tsql_connect(array(),1);
	if ($skus==='') {
		$pnmask = '';
		$listed = true;
	}
	$skus = sqlsrv_fetch_array ($stmt, SQLSRV_FETCH_NUMERIC)[0];
	$output['skus'] = $skus;
	if ($skus===null) {
		return;
	}
	// logging
	$sql_query = "INSERT INTO ".SQL_LOG." (tool,request,request_len,[user],ts) VALUES('scipio',N'".substr($skus,0,512)."',".strlen($skus).",'".USER_LOGIN."',GETDATE())";
	tsql_connect();

	$output['sku_qty'] = sizeof(explode($skus,', '));
	$sku_limit = SKU_LIMIT;
	$sql_query = 	"
	SET NOCOUNT ON
	DECLARE @q int, @cat char(2), @name varchar(max)
		SELECT @cat=max(category_code), @q = COUNT(distinct category_code),
			@name=(SELECT TOP 1 category_name FROM mdb_mirror.dbo.mdb_category_voc WITH(NOLOCK) WHERE category_code=MAX(s.category_code) AND lang_code='en') 
			FROM workdb.dbo.sku_cat_type1_stat500 s WITH(NOLOCK)
			WHERE sku_id IN ({$skus})
		SELECT @q qty, @cat cat, @name name
		IF @q=1
		BEGIN
			SELECT s.sku_id,s.manufacturer_pn pn, s.product_line_id, s.model_id, DENSE_RANK() over(order by s.product_line_id, s.model_id) m
			INTO #s
				FROM tpd_mirror.dbo.tpd_sku s WITH(NOLOCK) 
	".($listed ?	'':	"INNER JOIN (SELECT manufacturer_id ,product_line_id ,model_id FROM tpd_mirror.dbo.tpd_sku s WITH(NOLOCK) WHERE sku_id IN ({$skus}) GROUP BY manufacturer_id,product_line_id ,model_id) p ON p.manufacturer_id=s.manufacturer_id and p.product_line_id=s.product_line_id AND ISNULL(p.model_id,0)=ISNULL(s.model_id,0)")."
				WHERE sku_id IN (SELECT sku_id FROM workdb.dbo.sku_cat_type1_stat500 s WITH(NOLOCK) WHERE category_code=@cat)
	".($listed ? "AND sku_id in ({$skus})" : '').($minsku ? " AND sku_id>={$minsku}" : '' ).($maxsku ? " AND sku_id<={$maxsku}" : '' ).($pnmask ? " AND manufacturer_pn like '$pnmask'" : ''). "

			DECLARE @total_qty int = @@ROWCOUNT
			SELECT @total_qty
			IF @total_qty>" . ($sku_limit+500) . " 	DELETE FROM #s WHERE sku_id NOT IN (SELECT TOP {$sku_limit} sku_id FROM #s ORDER BY sku_id)

			SELECT s.product_line_id pl_id,s.model_id m_id, p.value_name productline, ISNULL(m.value_name,'') model, f.value_name manf,
					(SELECT COUNT(*) FROM #s WHERE product_line_id=s.product_line_id AND ISNULL(model_id,0)=ISNULL(s.model_id,0)) qty,
					DENSE_RANK() over(order by s.product_line_id, s.model_id) m
				FROM tpd_mirror.dbo.tpd_sku s WITH(NOLOCK) 
				LEFT JOIN mdb_mirror.dbo.mdb_value_voc p WITH(NOLOCK) ON p.value_id=s.product_line_id AND p.value_ecode='p' AND p.lang_code='en'
				LEFT JOIN mdb_mirror.dbo.mdb_value_voc m WITH(NOLOCK) ON m.value_id=s.model_id AND m.value_ecode='M' AND m.lang_code='en'
				LEFT JOIN mdb_mirror.dbo.mdb_value_voc f WITH(NOLOCK) ON f.value_id=s.manufacturer_id AND f.value_ecode='F' AND f.lang_code='en'
				WHERE sku_id in ({$skus})
				GROUP BY s.manufacturer_id, s.product_line_id,s.model_id, p.value_name, m.value_name, f.value_name
				ORDER BY p.value_name, m.value_name

			SELECT a.* 
				INTO #avu  
				FROM tpd_mirror.dbo.tpd_avu a WITH(NOLOCK)
				INNER JOIN #s s ON s.sku_id=a.sku_id

			SELECT attribute_id attr, value_id val, unit_id [unit], set_no [set]
					,REPLACE(CAST((SELECT sku_id AS [data()] FROM #avu WHERE attribute_id=a.attribute_id AND value_id=a.value_id AND unit_id=a.unit_id AND set_no=a.set_no  FOR XML PATH(''),TYPE) AS VARCHAR(MAX)),' ','.') sku
				FROM #avu a
				GROUP BY attribute_id,value_id,unit_id,set_no

			SELECT sku_id, pn, m FROM #s
			SELECT value_id id, value_name [name] FROM MDB_Mirror.dbo.mdb_value_voc WITH(NOLOCK) WHERE value_id IN (SELECT value_id FROM #avu) AND value_ecode = 'K' AND lang_code = 'en'
			SELECT unit_id id, unit_name [name]  FROM MDB_Mirror.dbo.mdb_unit_voc WITH(NOLOCK) WHERE unit_id in (SELECT unit_id FROM #avu) and lang_code = 'en'

			EXEC PDM.[cbs\dshishkin].category_attributes_list_w_repeating @cat=@cat
	END
	";
$output['w']=$sql_query;

	tsql_connect(array(),1);
	$output['category'] = sql_get_columns();
	if ($output['category']['rows'][0][0]==1) {
		sqlsrv_next_result($stmt);
		$output['total_qty'] = sqlsrv_fetch_array ($stmt, SQLSRV_FETCH_NUMERIC)[0];
		$output['sku_limit'] = SKU_LIMIT;
		$output['PLMs'] = sql_get_columns(1);
		$output['avus'] = sql_get_columns(1);
		$output['sku_pn'] = sql_get_columns(1);
		$output['value'] = sql_get_columns(1);
		$output['unit'] = sql_get_columns(1);
		$output['attributes'] = sql_get_columns(1);
	}
}




?>
<!DOCTYPE html><html lang="en">
<head><title>Scipio</title>
	<link rel="stylesheet" href="resources/font/shinen.css">
	<link rel="preload" href="resources/font/shinen.woff2" as="font" type="font/woff2" crossorigin="anonymous">
	<script src=<?php echo '"index.js?'.UUID.'"'; ?> type="text/javascript"></script>

<style>
body {
	overflow: hidden;
	height: 100%;
	user-select: none;
	margin: 0 5px;
}
#scroll {
	position: relative;
	height: 100vh;
	overflow: auto;
}

#rfsh{
	display: inline-block;
	vertical-align: middle;
	width: 32px;
	height: 32px;
	margin-left: 10px;
	margin-right: 20px;
	margin-top: -2px;
	pointer-events: none;
}
#rfsh[act="1"] {
	cursor: wait;
}
#rfsh > svg {
	fill:#7770;
	transition: 0.4s fill linear;
	transform: rotateZ(0deg) rotateY(180deg);
}
#rfsh[act="1"] > svg {
	fill:#800E;
	animation: rotate1 1s infinite ;
}
@keyframes rotate1 {
	100% {
		transform: rotateZ(180deg) rotateY(180deg);
	}
}

h4 {
	margin-top: 5px;
	margin-bottom: 5px;
}

.title{
	display: block;
	position: absolute;
	top: 0;
	font-family: sans-serif;
	font-weight: bold;
	color: #FFF;
	width: 100%;
	text-align: center;
	font-size: 23px;
	text-shadow: 0px 1px 5px #446;
}
input {
	outline: none!important;
}

textarea {
	border: 2px solid #68D8;
	border-radius: 5px;
	resize: none;
	padding: 0;
	padding-left: 2px;
	font-family: inherit;
	font-size: 16px;
	width: 100px;
	min-width: 100px;
	line-height: 16px;
	outline: none!important;
	white-space: nowrap;
}
textarea::placeholder {
	font-size: 12px;
	line-height: 25px;
	font-family: sans-serif;
}
textarea[rows="1"] {
	line-height: 25px;
}

#sku {
	height: fit-content;
	margin-right: 20px;
}

::-webkit-scrollbar-track
{
	background-color: transparent;
	border: solid 1px transparent;
}
::-webkit-scrollbar-thumb {
	background-color: #cfcff1;
	border: 2px solid rgba(0, 0, 0, 0);
	background-clip: content-box;
	border-radius: 3px;
}
::-webkit-scrollbar {
	width: 18px;
	cursor: pointer !important;;
}

textarea::-webkit-scrollbar {
	width: 8px;
	cursor: pointer !important;
}


textarea:focus {
	border: 2px solid #68D;
}

.corner {
	position: sticky;
    top: 0;
    width: 100%;
    z-index: 10000;
	pointer-events: none;
}

.links {
	display: flex;
	margin-left:20px;
}

.flex {
	display: flex;
}

a {
	text-decoration: none;
	color: inherit;
}

/* for modal window */
.modal {
	background: #8888;
	position: absolute;
	text-align: center;
	height: calc(100% + 10px);
	width: calc(100% + 10px); 
	left: -5px;
	top: -5px;
	opacity: 0;
	z-index: 1000;
	visibility: hidden;
	transition: opacity 1s, visibility 0s linear 1s;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: wait;
	border-radius: 8px;
}
.modal[show="2"] {
	transition-delay: 100ms;
	opacity: 1;
	visibility: visible;
}
.modal[show="1"] {
	opacity: 1;
	visibility: visible;
}
.modal > div {
	position: relative;
	border: 1px solid #c62f4e;
	box-shadow: 0 0 4px 1px #c62f4e;
	background: #FFFF;
	border-radius: 10px;
	display: flex;
	flex-direction: column;
	align-items: center;
	width: fit-content;
/*	max-width: min(200%, 80vw);*/
	cursor: default;
}
.modal > div > div:first-child{
	overflow-y: auto;
	font-size: 16px;
	margin: 5px 10px;
	min-height: max(3em, 10vh);
	line-height: 2em;
	display: flex;
	align-items: center;
	text-shadow: 1px 1px 2px #ccc;
}
.modal > div > div:last-child:not(:first-child){
	margin: 10px;
	width: 80%;
	display: flex;
	justify-content: space-around;
}
.modal_btn {
	margin-left: 5px;
	border: 1px solid #666;
	border-radius: 5px;
	background-image: linear-gradient(#fff 10%, #eee 40%, #ddd 100%);
	font-size: 14px;
	font-family: sans-serif;
	padding: 2px 10px;
	cursor: pointer;
	user-select: none;
	transition: 0.1s all;
}
.modal_btn:hover {
	box-shadow: 0 0 2px 1px #8585f7;
}
.modal_btn:active{
	background-image: linear-gradient(#ddd 60%, #eee 80%, #fff 100%);
}

.sta textarea {
	overflow: hidden;
	width: 400px;
	height: 80px;
	white-space: normal;
}

.links a {
	margin-left: 5px;
	margin-right: 5px;
}
.links div {
	margin: 4px 0px !important;
}
select,
.links div,
.button {
	cursor: pointer;
	position: relative;
	white-space: nowrap;
	text-align: center;
	font-size: 14px;
	border: 1px solid #0005;
	padding: 2px 6px;
	margin: 4px;
	text-shadow: 1px 1px 1px #FFF;
	border-radius: .4em;
	opacity: 0.9;
	transition: 0.1s all;
	background: #ddd;
	box-shadow: inset 1px 1px 1px 1px #FFFB, inset -1px -1px 1px 1px #000A;
	color: #222;
	user-select: none;
}

.links div:hover,
.button:hover {
	opacity: 1;
	background: #ccc;
}

.links div:active,
.button:active {
	top: 1px;
	box-shadow: inset 1px 1px 1px 1px #000A, inset -1px -1px 1px 1px #FFFB;
}

select {
	outline: none !important;
	height: 25px;
	text-align-last: center;
}
select:hover:not(:disabled),
.button:hover {
	opacity: 1;
	background: #ccc;
}
select:disabled {
	cursor: default;
	opacity: 0.7;
	box-shadow: none;
	-webkit-appearance: none; 
}
select:focus:not(:disabled),
select:active:not(:disabled),
.button:active {
	top: 1px;
	box-shadow: inset 1px 1px 1px 1px #000A, inset -1px -1px 1px 1px #FFFB;
}

.preset {
	position: sticky;
	top: 0;
	display: flex;
	flex-direction: column;
	z-index: 1;
}
.preset1 {
	display: flex;
	background: #ddd;
	font-size: 12px;
	line-height: 24px;
	font-family: system-ui;
	padding-left: 24px;
	color: #444;
	font-weight: bold;
}
.preset >div:nth-child(2) {
	display: none;
	margin: 0;
	padding: 5px;
	background: #eee;
}
.preset[fold="0"] >div:nth-child(2) {
	display: flex;
}
.preset1 >div {
	margin: 0 5px;
}
.preset1 select {
	font-size: 11px;
	margin: 2px;
	height: 20px;
	font-family: monospace
}
.preset2 {
	position: relative;
	max-height: 200px;
	overflow-y: auto;
}


.fold {
	display: none;
	position: absolute;
	top: 0;
	left: 0;
	fill: #888;
	transition: all 0.1s;
	cursor: pointer;
}
.preset[fold="0"] .fold:nth-child(1),
.preset[fold="1"] .fold:nth-child(2) {
	display: block;
}

.fold:hover {
	transform: scale(1.4);
	fill: blue;
}

.table4 {
	grid-template-columns: auto auto auto auto;
	position: relative;
}
.table4 >div {
	border-left: 1px solid #BBC;
	border-bottom: 1px solid #BBC;
	padding: 0 5px;
	background: #fff;
	user-select: text;
}
.table4 >div:nth-child(4n) {
	border-right: 1px solid #BBC;
}
.table4 >div:nth-child(-n+4) {
	border-top: 1px solid #BBC;
	user-select: none;
}

.tablef {
	grid-template-columns: auto auto auto;
}
.tablef >.row >.header:first-child {
	grid-column: span 2;
}

.tablef,
.table3,
.table4 {
	margin: 2px 5px;
	display: grid;
	width: fit-content;
	grid-gap: 0;
	height: fit-content;
	text-align: center;
}
.table3 {
	grid-template-columns: auto auto auto;
}
.table3 >div {
	border-left: 1px solid #BBC;
	border-bottom: 1px solid #BBC;
	padding: 0 5px;
	background: #fff;
	user-select: text;
}
.table3 >div:nth-child(3n) {
	border-right: 1px solid #BBC;
}
.table3 >div:nth-child(-n+3) {
	border-top: 1px solid #BBC;
	user-select: none;
}

.flex_table0 {
	display: flex;
	flex-direction: column;
	margin: 0px 5px;
	height: fit-content;
	width: fit-content;
}
#flt {
	text-align: left;
	border: none;
}
#flt >div:only-child {
	display:none;
}
#flt div.header:last-child {
	border-right: 1px solid #BBC;
}
#flt div.header {
	border-left: 1px solid #BBC;
}
#flt >.crow >div {
	border: 1px solid #D4D4D9;
	border-top: 1px solid transparent;
	border-right: 1px solid transparent; 
}
#flt >.crow >div:last-child {
	border-right: 1px solid #D4D4D9;
}


.flex_table {
	display: flex;
	flex-direction: column;
	text-align: center;
	border: 1px solid #BBC;
	margin: 2px 5px;
	height: fit-content;
	width: fit-content;
}
#attr >div:first-child >div,
.flex_table >div {
	padding: 0 5px;
	background: #fff;
}
.sku_list >.header,
.tablef >.row>.header,
.table3 >.header,
.table4 >.header,
#attr >div:first-child >div,
.flex_table >div:first-child {
	background: #D0D0E0;
	font-weight: bold;
	text-align: center;
	border-bottom: 1px solid #BBC;
	padding: 0 3px;
}
#attr >div:first-child >div:not(first-child) {
	border-left: 1px solid #BBC;
}
#attr >div:first-child >div{
	position: sticky;
	z-index: 1;
}

.table4:empty,
.table3:empty,
.flex_table:empty {
	display:none;
}
#attr >div:nth-child(2) {
	text-align: initial;
/*	min-height: 200px;
	max-height: 50vh;
	overflow-y: auto;*/
	padding: 0 1px;
}

/* attributes */
.groupr {
	color: #4b576d;
    font-size: 11px !important;
    text-align: center;
}
.group {
	font-family: sans-serif;
	font-weight: bold;
	font-size: 13px;
	line-height: 18px;
	background: #D4D4D9;
	border-bottom: 1px solid #BBC;
}
.groupf {
	font-family: sans-serif;
	color: black;
	font-weight: bold;
	font-size: 13px;
	line-height: 18px;
	background: #D4D4D9;
	display: inline-block;
	padding: 0 5px;}

.attribute[chk="1"]:hover,
div[empty="0"][neq="1"] >.attribute:hover {
	background: #dde;
	cursor: pointer;
}
div:not([neq="1"]) >.attribute[chk="0"]:before {
	visibility: hidden;
}

.attribute[chk]:first-child {
	margin-left: 5px;
}
.attribute:not(:first-child) {
	border-left: 1px solid #D4D4D9;
}
.attribute>div[val] {
	padding: 0 5px;
}
.attribute:first-child {
	pointer-events: none;
}
.attribute.icon-:before {
	pointer-events: all;
}
.attribute {
	background: #f0f0f0;
	position: relative;
	white-space: nowrap;
	font-family: sans-serif;
	font-size: 13px;
	line-height: 16px;
	border: 1px solid transparent;
	border-bottom: 1px solid #D4D4D9;
}
span[ca="help"] {
	pointer-events: auto;
	border-radius: 5px;
	cursor: help;
}
span[ca="help"]:hover {
	background: #ffe;
}

.attribute[hl="17"]:first-child {
	color: #A90000;
	font-weight: bold;
}

.attribute[hl="10"]:first-child {
	color: #00008B;
	font-weight: bold;
}

#attr div[chk]:before{
	color: #444;
}
#attr div[chk="0"]:before{
	content: '\f096';
}
#attr div[chk="1"]:before{
	content: '\e806';
}

#attr >div::-webkit-scrollbar {
	width: 10px;
}

#attr {
	display: grid;
	grid-template-columns: auto auto;
	width: fit-content;
	grid-gap: 0;
	height: fit-content;
}
.crow,
.row {
	display: contents;
}

span.qty {
	display: inline-block;
	font-size: 10px;
	font-family: system-ui;
	position: relative;
	top: -5px;
	left: 4px;
	color: #F00;
	transition: all 0.1s;
	font-style: normal;
}

span.qty:hover {
	transform: scale(1.4);
}


.empty {
	color: #66a;
	font-size: 12px;
	font-style: italic;
}
.all {
	color: #097909;
}

.crow[neq="1"] >div:first-child {
	/*background: #Fdd;*/
	border-right: 3px solid red;
}

.value_name {
	position: relative;
	font-size: 14px;
	color: #333;
	user-select: text;
}
.value_name>span {
	font-size: 12px;
	text-shadow: none;
	color: #888;
	user-select: none;
}

.sku_list {
	display: grid;
	grid-template-columns: auto auto;
	line-height: 14px;
	max-height: 50vh;
	overflow-y: auto;
	margin: 0px auto;
	font-size: 12px;
}
.sku_list >.header {
	position: sticky;
	top: 0;
}
.sku_list >div:not(.header) {
	border-top: none;
	white-space: pre;
	user-select: text;
	cursor: text;
	padding: 0 5px;
	text-align: initial;
}

.sku_list >div {
	border: 1px solid #D4D4D9;
}
.sku_list >div:nth-child(odd) {
	border-right: none;
}

.sku_list::-webkit-scrollbar {
	width: 8px;
}

.sku_list::-webkit-scrollbar-thumb {
	border: 1px solid transparent;
	border-top: 16px solid transparent;
}
.crow >div >select {
	float: right;
	font-size: 11px;
	margin: 1px;
	height: 20px;
	font-family: monospace;
}


#attr[view="2"] >div[empty="0"]:not([neq]),
#attr[view="2"] >div[empty="1"],
#attr[view="1"] >div[empty="1"] {
	display: none;
}

label {
	font-size: 12px;
	font-family: system-ui;
	text-shadow: 1px 1px 2px #ccc;
}

#clear {
	cursor: pointer;
	opacity: 0.6;
	position: absolute;
	left: 110px;
	width: 20px;
	height: 20px;
	background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjAiIGZpbGw9InJlZCIgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMjAiPjxwYXRoIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNNiAxOWMwIDEuMS45IDIgMiAyaDhjMS4xIDAgMi0uOSAyLTJWN0g2djEyek0xOSA0aC0zLjVsLTEtMWgtNWwtMSAxSDV2MmgxNFY0eiIvPjwvc3ZnPg==");
	transition: all 0.3s;
	filter: grayscale(0.5);
}

#clear:hover {
	filter: none;
	opacity: 0.8 !important;
	transform: scale(1.4);
}
.values {
	background: white;
	cursor: pointer;
	text-align: left;
	transition: all 0.2s;
}
.values:empty:after {
	content: '...';
	padding: 0 5px;
	display: block;
	color: #66a;
	font-weight: bold;
	line-height: 8px;
	text-align: center;
}
.values:hover {
	border-color: red !important;
}

.vflt {
	grid-template-columns: auto auto;
	display: grid;
	max-height: 80vh;
	width: fit-content;
	grid-gap: 0;
	height: fit-content;
	line-height: initial;
	padding: 10px;
	border: 2px solid #ddf;
	border-radius: 9px;
	margin-top: 5px;
}
.vflt >div >div {
	cursor: pointer;
	border-bottom: 1px solid #bbc;
	padding: 2px 5px;
	white-space: pre;
	min-width: 14px;
	text-align: left;
}
.vflt .row:hover >div {
	background: #eef;
}
.vflt .row[sel] >div:first-child:before {
	font-family: "shinen";
	font-size: 14px;
	content: '\F096';
}
.vflt .row[sel="1"] >div:first-child:before {
	content: '\F0FE';
	color: green;
}
.vflt .row[sel="2"] >div:first-child:before {
	content: '\F146';
	color: red;
}
.vflt .row[title] >div:last-child {
	font-style: italic;
	color: gray;
}
.values >span[mode] {
	pointer-events: none;
	padding: 0 5px;
}
.values >span[mode]:not(:last-child) {
	border-right: 2px solid #888;
}
.values >span[mode="1"]  {
	color: green;
}
.values >span[mode="2"]  {
	color: red;
}
#flt .vqty {
	background: white;
	border: 1px solid #D4D4D9;
	border-top: 1px solid transparent;
	padding: 0 5px;
	text-align: center;
	color: #448;

}

#plm >div[plm_m] {
	white-space: pre;
}
.fqty {
	color: red;
	transition: all 0.1s;
	cursor: pointer;
	position: relative;
	display: inline-block;
}
.fqty:hover {
	transform: scale(1.4);
}

#plm >.row >div {
	border-bottom: 1px solid #BBC;
	padding: 0 5px;
	background: #f8f8ff;
}
#plm >.row >div:last-child {
	border-right: 1px solid #BBC;
}
#plm >.row >div:first-child {
	border-left: 1px solid #BBC;
}

.pbtns {
	display: none;
}
.pbtns >div {
	display: none;
	font-weight: normal;
	font-size: 12px;
	line-height: 11px;
	height: 13px;
	margin: 2px 4px;
}
.pbtns:not([sel="0"]) {
	display: inline-flex;
}
.pbtns[sel="2"] >#psave {
	display: block;
}
.pbtns[sel="3"] >div {
	display: block;
}


input[type="number"]::-webkit-inner-spin-button, 
input[type="number"]::-webkit-outer-spin-button { 
  display: none;
}

.grid0 {
	padding: 12px 5px 2px 5px;
	display: grid;
	grid-template-columns: 55px 80px;
	font-size: 12px;
	font-family: system-ui;
	text-shadow: 1px 1px 2px #ccc;
	border: 1px solid #bbb;
	border-radius: 5px;
	position: relative;
}
.grid0:before {
	content: 'Limit by';
	position: absolute;
	color: #666;
	top: -2px;
	font-size: 10px;
	text-align: center;
	width: 100%;
}
.grid0 >input {
	margin-bottom: 2px;
	padding: 0 2px;
	border-radius: 3px;
	border: 1px solid #68D8;
}
.grid0 >input:focus {
	border-color: #68D;
}

.mask {
    color: blue;
    text-decoration: underline;
    cursor: pointer;
}
.clkmask {
	line-height: 20px;
	white-space: pre;
	text-align: start;
}

.rgroup {
    font-size: 10px;
    color: #336;
    margin-left: 5px;
    position: relative;
    top: -4px;
}

.a_set {
    display: grid;
	width: fit-content;
}

.a_set div[val] {
	display: contents;
}

.set_aname {
	padding: 0 5px;
    border-right: 1px solid #C0C0D9;
	font-family: system-ui;
    color: #336;
    font-size: 11px;
    font-weight: 500;
	background: #e0e0e8;
	text-align: center;
}
.rrow {
	display: contents;
}
.rrow >div:not(:last-child) {
    padding: 0 5px;
    border-right: 1px solid #C0C0D9;
}
.rrow >span {
    left: 0px;
	padding: 0 2px;
}


</style>
</head>
<body>
<div id='scroll'> 
<div class="flex corner">
	<div ca='refresh' id='rfsh' title="Network activity indicator" act="0">
		<svg height="32px" x="0px" y="0px" viewBox="0 0 1000 1000">
			<g><path d="M393.9,236.7c-107.1,43.7-171.8,145.4-175.5,254l162.1-48.4L246.3,700.6L10,578.9l76.8-32.6c-19.3-180,80.1-359,257.6-431.4C525.3,41.1,726.2,102.7,837.1,251l-130.1,53.3C628.6,222.1,505.4,191.1,393.9,236.7z M608.7,763.3C715,719.9,779.6,619.5,784.1,511.8l-163.6,50.4l141.7-254.7L990,422.5l-74,32.1c18.8,179.8-80.5,358.3-257.6,430.5c-181,73.9-381.9,12.2-492.8-136.1l130.1-53.4C374.1,777.9,497.2,808.8,608.7,763.3z"/></g>
		</svg>
		<div><div id="rfsh_info"><span></span><span></span></div></div>
	</div>
</div>
<div class="title">Scipio</div>

<div class="preset" fold="0">
	<div class="preset1">
		<svg act="fold" class="fold" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M7.41 18.59L8.83 20 12 16.83 15.17 20l1.41-1.41L12 14l-4.59 4.59zm9.18-13.18L15.17 4 12 7.17 8.83 4 7.41 5.41 12 10l4.59-4.59z"/></svg>
		<svg act="fold" class="fold" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z"/></svg>
		<div>Preset</div>
		<select id="psel"><option value="0">-=none=-</option><?php echo $saved_presets; ?></select>
		<div style="flex-grow: 1;"></div>
		<div class="pbtns" sel="0"><div id="pren" class="button">Rename</div><div id="pupd" class="button">Update</div><div id="psave" class="button">Save New</div><div id="pdel" class="button">Delete</div></div>
	</div>
	<div class="preset2">
		<textarea id="sku" placeholder="SKU ID(s)" rows=1></textarea><div id="clear"></div>
		<div class="flex_table0">
			<div><input id="listed" type="checkbox"><label for="listed">Listed SKU only</label></div>
			<div class="grid0">
				<div>Min SKU:</div><input id="minsku" type="number">
				<div>Max SKU:</div><input id="maxsku" type="number">
				<div>PN <span class="mask" id="clkmask">mask</span>:</div><input id="pnmask" type="text" maxlength=20>
			</div>
			<div id="submit" class="button">Submit</div>
		</div>
		<div id="cat" class="flex_table"></div>
		<div id="plm" class="table4"></div>
		<div id="flt" class="tablef"><div class="row"><div class="header">Attribute Filters</div><div class="header">SKUs</div></div></div>
		<div style="flex-grow: 1;"></div>

	</div>
</div>
<div id='cnt'>
	<div id="attr"></div>
</div>
</div>
</body></html>


