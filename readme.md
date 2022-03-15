# Scipio

SKU attribute comparison tool.

***available parameters in the URL:***
* #sku_id    example : #444
* #sku_id1,sku_id2,...  example: #444,445
* #pnmask=[SQL PATTERN]   example: #pnmask=MQ702%

## Resources

### SQL server dp-sql11.cnetcontent.net / DB dptools

* TABLE dbo.scipio_presets - contains user presets
* TABLE dbo.tools_log - logging user requests (tool='scipio')

### SQL server mirr.db.cnetcontent.net / DB PDM

* PROCEDURE [cbs\dshishkin].category_attributes_list_w_repeating
