<?php
define ('SQL_LOG','dptools.dbo.tools_log'); //(requested varchar(256), requested_len int, [user_id] int, ts datetime)
define ('SQL_PRESETS','dptools.dbo.scipio_presets'); //(id int primary key identity(1,1),[name] nvarchar(100) not null, sku_list varchar(max) not null, is_listed_only bit default 0 not null, [filter] varchar(max), [user] varchar(100) not null, ts datetime not null)

date_default_timezone_set('UTC');

?>