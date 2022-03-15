USE [PDM]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER procedure [cbs\dshishkin].[category_attributes_list_w_repeating] @cat varchar(2)=''
AS
BEGIN
SET NOCOUNT ON
IF @cat='' PRINT 'Ordered by group/position list of all attributes for specified category.
	Returns group_name, attributes.
			"attributes" is a string, every attribute is separated by char(2),
						attribute contains attribute_id, highlight_id, attribute_name, is_multi, is_repeating separated by char(1)
USAGE: EXEC PDM.[cbs\dshishkin].category_attributes_list_w_repeating @cat=''AB''
'
ELSE
BEGIN 
	SELECT c.attribute_id,c.highlight_style
				,a.group_id
				,gv.group_name, av.attribute_name
				,is_repeating
				,is_multi
				,ROW_NUMBER() OVER(ORDER BY g.position, a.position) position
		INTO #a 
		FROM mdb_mirror.[dbo].[mdb_category_attribute] c WITH(NOLOCK)
		INNER JOIN mdb_mirror.[dbo].[mdb_attribute] a WITH(NOLOCK) ON a.attribute_id=c.attribute_id
		INNER JOIN mdb_mirror.[dbo].[mdb_group] g WITH(NOLOCK) ON g.group_id=a.group_id
		INNER JOIN mdb_mirror.[dbo].[mdb_group_voc] gv WITH(NOLOCK) ON gv.group_id=g.group_id AND gv.lang_code='en'
		INNER JOIN mdb_mirror.[dbo].[mdb_attribute_voc] av WITH(NOLOCK) ON av.attribute_id=a.attribute_id AND av.lang_code='en'
		WHERE category_code=@cat AND c.is_in_use=1 AND c.attribute_id NOT IN (630,600,601) -- exclude manufacturer, PL, model
	SELECT group_id
			,is_repeating
			,MAX(group_name) group_name
			,MIN(position) position
			,CONVERT(NVARCHAR(MAX),CONVERT(VARBINARY(MAX),
				REPLACE((SELECT CONVERT(VARCHAR(MAX),CONVERT(VARBINARY(MAX),CAST(attribute_id AS nvarchar(max))+char(1)+CAST(ISNULL(highlight_style,0) AS NVARCHAR(MAX))+char(1)+attribute_name+char(1)+cast(is_multi as char(1)))  ,2) [data()]
					FROM #a
					WHERE group_id=a.group_id
					ORDER BY position
					FOR XML PATH('')),' ','0200')
				,2)) attributes
		FROM #a a
		GROUP BY group_id, is_repeating
		ORDER BY MIN(position)
END
END

