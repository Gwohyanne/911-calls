//const elasticsearch = require('elasticsearch');
const csv = require('csv-parser');
const fs = require('fs');
const { Client } = require('@elastic/elasticsearch');

const ELASTIC_SEARCH_URI = 'http://localhost:9200';
const INDEX_NAME = '911-calls';

async function run() {
  const client = new Client({ node: ELASTIC_SEARCH_URI});

  // Drop index if exists
  await client.indices.delete({
    index: 'calls',
    ignore_unavailable: true
  });

  // Création de l'indice
  client.indices.create({ index: 'calls', body: {mappings: {properties:{location:{type :"geo_point" }, date : {type : "date"}}}}}, (err, resp) => {
    if (err) console.log(err.message);
  });

  let calls = [];
  fs.createReadStream('../911.csv')
    .pipe(csv())
    .on('data', data => {
      const call = {
        lng: parseFloat(data.lng),
        lat: parseFloat(data.lat),
        location : data.lat + ", " + data.lng,
        zip: data.zip,
        title: data.title,
        timeStamp: data.timeStamp,
        month: data.timeStamp.slice(5, 7) + "/" + data.timeStamp.slice(0, 4),
        twp: data.twp,
        addr: data.addr,
        e: data.e
      };
      calls.push(call)
      // TODO créer l'objet call à partir de la ligne
    })
    .on('end', () => {
      client.bulk(createBulkInsertQuery(calls), (err, resp) => {
          if (err) console.log(err.message);
          else console.log(`Inserted ${resp.body.items.length} calls`);
          client.close();
          });
      });

}

function createBulkInsertQuery(calls) {
  const body = calls.reduce((acc, call) => {
      const { lat, lng, location, date, desc, zip, title, timeStamp, month, twp, addr, e } = call;
      acc.push({ index: { _index: 'calls', _type: '_doc'}})
      acc.push({ lat, lng, location, date, desc, zip, title, timeStamp, month, twp, addr, e })
      return acc
      }, []);
      return { body };
}

run().catch(console.log);


