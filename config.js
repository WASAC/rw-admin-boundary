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
              ST_AsGeoJSON(ST_MakeValid(st_simplify(p.geom,1222.99/100000)))::json AS geometry,
              row_to_json((
                SELECT p FROM (
                  SELECT
                    p.prov_id, 
                    p.prov_name as province,
                    ST_AsText(ST_Centroid(p.geom)) as centroid,
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
              ST_AsGeoJSON(ST_MakeValid(st_simplify(d.geom,305.75/100000)))::json AS geometry,
              row_to_json((
                SELECT p FROM (
                  SELECT
                    d.dist_id, 
                    d.district,
                    ST_AsText(ST_Centroid(d.geom)) as centroid,
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
              ST_AsGeoJSON(ST_MakeValid(st_simplify(s.geom,76.44/100000)))::json AS geometry,
              row_to_json((
                SELECT p FROM (
                  SELECT
                    s.sect_id, 
                    s.sector,
                    ST_AsText(ST_Centroid(s.geom)) as centroid,
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
              ST_AsGeoJSON(ST_MakeValid(st_simplify(c.geom,19.11/100000)))::json AS geometry,
              row_to_json((
                SELECT p FROM (
                  SELECT
                    c.cell_id, 
                    c.cell,
                    ST_AsText(ST_Centroid(c.geom)) as centroid,
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
              ST_AsGeoJSON(ST_MakeValid(v.geom))::json AS geometry,
              row_to_json((
                SELECT p FROM (
                  SELECT
                    v.vill_id, 
                    v.village,
                    ST_AsText(ST_Centroid(v.geom)) as centroid,
                    v.population, 
                    v.household
                ) AS p
              )) AS properties
            FROM public.village v
            WHERE v.cell_id = {cell_id}
            ORDER BY v.cell_id
          ) AS feature
        ) AS featurecollection
      `
    },
  ]
}