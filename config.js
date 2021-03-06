require('dotenv').config();

const export_dir = __dirname + '/public';

module.exports = {
  db: {
      user:process.env.DB_USER,
      password:process.env.DB_PASSWORD,
      host:process.env.DB_HOST,
      port:process.env.DB_PORT,
      database:'rwss_assets',
  },
  layers : [
    {
      name: 'province',
      geojsonFileName: export_dir + '/province.geojson',
      select: `
        SELECT row_to_json(featurecollection) AS json FROM (
          SELECT
            'FeatureCollection' AS type,
            array_to_json(array_agg(feature)) AS features
          FROM (
            SELECT
              'Feature' AS type,
              ARRAY[ST_XMin(ST_Extent(p.geom)),ST_YMin(ST_Extent(p.geom)),ST_XMax(ST_Extent(p.geom)),ST_YMax(ST_Extent(p.geom))]::double precision[] as bbox,
              ST_AsGeoJSON(ST_MakeValid(p.geom))::json AS geometry,
              row_to_json((
                SELECT p FROM (
                  SELECT
                    p.prov_id as id, 
                    p.prov_name as name,
                    sum(v.population) as population, 
                    sum(v.household) as household
                ) AS p
              )) AS properties
            FROM public.village v
            INNER JOIN province p ON v.prov_id = p.prov_id
            GROUP BY p.prov_id, p.prov_name, p.geom
            ORDER BY p.prov_id
          ) AS feature
        ) AS featurecollection
      `
    },
    {
      name: 'district',
      geojsonFileName: export_dir + '/{prov_id}/district.geojson',
      select: `
        SELECT row_to_json(featurecollection) AS json FROM (
          SELECT
            'FeatureCollection' AS type,
            array_to_json(array_agg(feature)) AS features
          FROM (
            SELECT
              'Feature' AS type,
              ARRAY[ST_XMin(ST_Extent(d.geom)),ST_YMin(ST_Extent(d.geom)),ST_XMax(ST_Extent(d.geom)),ST_YMax(ST_Extent(d.geom))]::double precision[] as bbox,
              ST_AsGeoJSON(ST_MakeValid(d.geom))::json AS geometry,
              row_to_json((
                SELECT p FROM (
                  SELECT
                    d.dist_id as id, 
                    d.district as name,
                    sum(v.population) as population, 
                    sum(v.household) as household
                ) AS p
              )) AS properties
            FROM public.village v
            INNER JOIN district d ON v.dist_id = d.dist_id
            WHERE d.prov_id = {prov_id}
            GROUP BY d.dist_id, d.district, d.geom
            ORDER BY d.dist_id
          ) AS feature
        ) AS featurecollection
      `
    },
    {
      name: 'sector',
      geojsonFileName: export_dir + '/{prov_id}/{dist_id}/sector.geojson',
      select: `
        SELECT row_to_json(featurecollection) AS json FROM (
          SELECT
            'FeatureCollection' AS type,
            array_to_json(array_agg(feature)) AS features
          FROM (
            SELECT
              'Feature' AS type,
              ARRAY[ST_XMin(ST_Extent(s.geom)),ST_YMin(ST_Extent(s.geom)),ST_XMax(ST_Extent(s.geom)),ST_YMax(ST_Extent(s.geom))]::double precision[] as bbox,
              ST_AsGeoJSON(ST_MakeValid(s.geom))::json AS geometry,
              row_to_json((
                SELECT p FROM (
                  SELECT
                    s.sect_id as id, 
                    s.sector as name,
                    sum(v.population) as population, 
                    sum(v.household) as household
                ) AS p
              )) AS properties
            FROM public.village v
            INNER JOIN sector s ON v.sect_id = s.sect_id
            WHERE s.dist_id = {dist_id}
            GROUP BY s.sect_id, s.sector, s.geom
            ORDER BY s.sect_id
          ) AS feature
        ) AS featurecollection
      `
    },
    {
      name: 'cell',
      geojsonFileName: export_dir + '/{prov_id}/{dist_id}/{sect_id}/cell.geojson',
      select: `
        SELECT row_to_json(featurecollection) AS json FROM (
          SELECT
            'FeatureCollection' AS type,
            array_to_json(array_agg(feature)) AS features
          FROM (
            SELECT
              'Feature' AS type,
              ARRAY[ST_XMin(ST_Extent(c.geom)),ST_YMin(ST_Extent(c.geom)),ST_XMax(ST_Extent(c.geom)),ST_YMax(ST_Extent(c.geom))]::double precision[] as bbox,
              ST_AsGeoJSON(ST_MakeValid(c.geom))::json AS geometry,
              row_to_json((
                SELECT p FROM (
                  SELECT
                    c.cell_id as id, 
                    c.cell as name,
                    sum(v.population) as population, 
                    sum(v.household) as household
                ) AS p
              )) AS properties
            FROM public.village v
            INNER JOIN cell c ON v.cell_id = c.cell_id
            WHERE c.sect_id = {sect_id}
            GROUP BY c.cell_id, c.cell, c.geom
            ORDER BY c.cell_id
          ) AS feature
        ) AS featurecollection
      `
    },
    {
      name: 'village',
      geojsonFileName: export_dir + '/{prov_id}/{dist_id}/{sect_id}/{cell_id}/village.geojson',
      select: `
        SELECT row_to_json(featurecollection) AS json FROM (
          SELECT
            'FeatureCollection' AS type,
            array_to_json(array_agg(feature)) AS features
          FROM (
            SELECT
              'Feature' AS type,
              ARRAY[ST_XMin(ST_Extent(v.geom)),ST_YMin(ST_Extent(v.geom)),ST_XMax(ST_Extent(v.geom)),ST_YMax(ST_Extent(v.geom))]::double precision[] as bbox,
              ST_AsGeoJSON(ST_MakeValid(v.geom))::json AS geometry,
              row_to_json((
                SELECT p FROM (
                  SELECT
                    v.vill_id as id, 
                    v.village as name,
                    v.population, 
                    v.household
                ) AS p
              )) AS properties
            FROM public.village v
            WHERE v.cell_id = {cell_id}
            GROUP BY v.vill_id, v.village, v.geom
            ORDER BY v.cell_id
          ) AS feature
        ) AS featurecollection
      `
    },
  ]
}