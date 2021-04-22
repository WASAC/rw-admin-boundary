const {postgis2geojson} = require('@watergis/postgis2geojson');
const deepcopy = require('deepcopy');
const loadJsonFile = require('load-json-file');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const getLayer = (name, callback) => {
  for (let i = 0; i < config.layers.length; i++) {
    const layer = config.layers[i];
    if (layer.name === name){
      if (callback){
        return deepcopy(callback(layer));
      }else{
        return [deepcopy(layer)];
      }
    }
  }
}

const getGeoJSON = async(srcConfig, callback) =>{
  const pg2json = new postgis2geojson(srcConfig);
  const geojsonFiles = await pg2json.run();
  let layers = [];
  for (let i = 0; i < geojsonFiles.length; i++){
    const geojsonFile = geojsonFiles[i];
    console.log(`geojson file was generated: ${geojsonFile}`);
    const features = await loadJsonFile(geojsonFile)
    features.features.forEach(f=>{
      if (!callback)return;
      layers.push(callback(f))
    })
  }
  
  let distConfig = deepcopy(srcConfig);
  distConfig.layers = layers;
  return distConfig;
}

const generate = async() =>{
  console.time('rw-admins');
  let orgConfig = deepcopy(config);
  orgConfig.layers = getLayer('province');

  getGeoJSON(orgConfig, (province)=>{
    const prov_id = province.properties.id;
    return getLayer('district', (layer=>{
      const newLayer = deepcopy(layer);
      newLayer.geojsonFileName = layer.geojsonFileName.replace(/{prov_id}/g,prov_id);
      fs.mkdirSync(path.dirname(newLayer.geojsonFileName), { recursive: true});
      newLayer.select = layer.select.replace(/{prov_id}/g,prov_id);
      return newLayer;
    }));
  }).then(provConfig=>{
    return getGeoJSON(provConfig, (district)=>{
      const dist_id = district.properties.id.toString();
      const prov_id = dist_id.substr(0,1);
      return getLayer('sector', (layer=>{
        const newLayer = deepcopy(layer);
        newLayer.geojsonFileName = layer.geojsonFileName.replace(/{prov_id}/g,prov_id).replace(/{dist_id}/g,dist_id);
        fs.mkdirSync(path.dirname(newLayer.geojsonFileName), { recursive: true});
        newLayer.select = layer.select.replace(/{prov_id}/g,prov_id).replace(/{dist_id}/g,dist_id);
        return newLayer;
      }));
    })
  }).then(districtConfig=>{
    return getGeoJSON(districtConfig, (sector)=>{
      const sect_id = sector.properties.id.toString();
      const prov_id = sect_id.substr(0,1);
      const dist_id = sect_id.substr(0,2);
      
      return getLayer('cell', (layer=>{
        const newLayer = deepcopy(layer);
        newLayer.geojsonFileName = layer.geojsonFileName.replace(/{prov_id}/g,prov_id).replace(/{dist_id}/g,dist_id).replace(/{sect_id}/g,sect_id);
        fs.mkdirSync(path.dirname(newLayer.geojsonFileName), { recursive: true});
        newLayer.select = layer.select.replace(/{prov_id}/g,prov_id).replace(/{dist_id}/g,dist_id).replace(/{sect_id}/g,sect_id);
        return newLayer;
      }));
    })
  }).then(sectorConfig=>{
    return getGeoJSON(sectorConfig, (cell)=>{
      const cell_id = cell.properties.id.toString();
      const prov_id = cell_id.substr(0,1);
      const dist_id = cell_id.substr(0,2);
      const sect_id = cell_id.substr(0,4);

      return getLayer('village', (layer=>{
        const newLayer = deepcopy(layer);
        newLayer.geojsonFileName = layer.geojsonFileName.replace(/{prov_id}/g,prov_id).replace(/{dist_id}/g,dist_id).replace(/{sect_id}/g,sect_id).replace(/{cell_id}/g,cell_id);
        fs.mkdirSync(path.dirname(newLayer.geojsonFileName), { recursive: true});
        newLayer.select = layer.select.replace(/{prov_id}/g,prov_id).replace(/{dist_id}/g,dist_id).replace(/{sect_id}/g,sect_id).replace(/{cell_id}/g,cell_id);
        return newLayer;
      }));
    })
  }).then(cellConfig=>{
    return getGeoJSON(cellConfig)
  }).then(()=>{
    console.timeEnd('rw-admins');
  })
  .catch(err=>console.error)
};

module.exports = generate();