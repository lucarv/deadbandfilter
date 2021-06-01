'use strict';
var debug = process.env.DEBUG || false;
var dbfType = process.env.DBF_TYPE || 'percent';
var dbfWeight = process.env.DBF_WEIGHT || 25;
var filteredArray = [];

if (dbfType == 'absolute') {
  const jsonfile = require('jsonfile');
  const file = '/appdata/dbf-config.json';
  var tags = [];

  jsonfile.readFile(file, function (err, obj) {
    if (err) {
      console.error(err);
      console.log('Can\'t find config file nothis will be filtered');
    } else {
      tags = obj;
    }
  });
}

var cache = [];

const getIndex = (els, elName, el) => {
  var index = -1;
  for (var i = 0; els.length > i; i += 1) {
    if (els[i][elName] === el) {
      index = i;
      break;
    }
  }
  return index;
};

const filterAbsolute = (client, payloadArray) => {
  if (tags.length > 0) {
    for (var i = 0; i < payloadArray.length; i++) {
      let appURIindex = getIndex(tags, 'ApplicationUri', payloadArray[i].ApplicationUri);
      if (appURIindex > -1) {
        let nodeIDindex = getIndex(tags[appURIindex].OpcNodes, 'Id', payloadArray[i].NodeId);
        if (nodeIDindex > -1) {
          let min = tags[appURIindex].OpcNodes[nodeIDindex].DBF.min;
          let max = tags[appURIindex].OpcNodes[nodeIDindex].DBF.max;
          if ((payloadArray[i].Value.Value < min || payloadArray[i].Value.Value > max)) {
            if (debug == true) console.log(`${payloadArray[i].ApplicationUri}:${payloadArray[i].NodeId} VALUE ${payloadArray[i].Value.Value} OUT OF BAND (${min}, ${max}), PUSH FORWARD`);
            filteredArray.push(payloadArray[i]);
          } else {
            if (debug == true) console.log(`${payloadArray[i].ApplicationUri}:${payloadArray[i].NodeId}  VALUE ${payloadArray[i].Value.Value} INSIDE BAND (${min}, ${max}), IGNORE`);
          }
        } else {
          if (debug == true) console.log(`${payloadArray[i].ApplicationUri}:${payloadArray[i].NodeId}  Not targetted for filtering`);
          filteredArray.push(payloadArray[i]);
        }
      } else {
        if (debug == true) console.log(`${payloadArray[i].ApplicationUri}:${payloadArray[i].NodeId}  Not targetted for filtering`);
        filteredArray.push(payloadArray[i]);
      }
    }
    var outputMsg = new Message(JSON.stringify(filteredArray));
  } else {
    var outputMsg = new Message(JSON.stringify(payloadArray));
  }
  client.sendOutputEvent('output1', outputMsg, () => { });

}

const filterPercent = (client, payloadArray) => {
  let weight = dbfWeight / 100;

  for (var i = 0; i < payloadArray.length; i++) {
    let assetId = payloadArray[i].ApplicationUri + '-' + payloadArray[i].NodeId;
    let index = getIndex(cache, 'AssetId', assetId);
    if (index > -1) {
      let min = (1 - weight) * cache[index].value;
      let max = (1 + weight) * cache[index].value;
      cache.splice(index, 1);
      if ((payloadArray[i].Value.Value < min || payloadArray[i].Value.Value > max)) {
        if (debug == true) console.log(`${payloadArray[i].ApplicationUri}:${payloadArray[i].NodeId} VALUE ${payloadArray[i].Value.Value} OUT OF BAND (${min}, ${max}), PUSH FORWARD`);
        filteredArray.push(payloadArray[i]);
      } else {
        if (debug == true) console.log(`${payloadArray[i].ApplicationUri}:${payloadArray[i].NodeId} VALUE ${payloadArray[i].Value.Value} INSIDE BAND (${min}, ${max}), IGNORE`);
      }
    }
    let cached = { 'AssetId': assetId, 'value': payloadArray[i].Value.Value };
    cache.push(cached);
  }

  if (debug == true) console.log(`${filteredArray.length} Values in Message after filtering`)

  if (filteredArray.length > 0) {
    var outputMsg = new Message(JSON.stringify(filteredArray));
    client.sendOutputEvent('output1', outputMsg, () => { });
  }
}

var Transport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').ModuleClient;
var Message = require('azure-iot-device').Message;

Client.fromEnvironment(Transport, function (err, client) {
  if (err) {
    throw err;
  } else {
    client.on('error', function (err) {
      throw err;
    });
    // connect to the Edge instance
    client.open(function (err) {
      if (err) {
        throw err;
      } else {
        console.log('IoT Hub module client initialized');
        // Act on input messages to the module.
        client.on('inputMessage', function (inputName, msg) {
          pipeMessage(client, inputName, msg);
        });

        client.getTwin(function (err, twin) {
          if (err) {
            console.error('error getting twin: ' + err);
          }
          // Add a handler for desired property changes
          twin.on('properties.desired', function (delta) {
            if (debug == true) console.log('new desired properties received:' + JSON.stringify(delta));
            if (delta.hasOwnProperty('debug')) {
              debug = delta.debug;
            }
          });
        });
      }
    });
  }
});

// This function just pipes the messages without any change.
function pipeMessage(client, inputName, msg) {
  client.complete(msg, () => { });
  var message = msg.getBytes().toString('utf8');
  if (message) {
    var payloadArray = JSON.parse(message);
    filteredArray = [];
    if (debug == true) console.log(`${payloadArray.length} Values in Message before filtering`)
    if (debug == true) console.time('Filtering latency: ');
    if (dbfType == 'percent') {
      filterPercent(client, payloadArray);
      if (debug == true) console.timeEnd('Filtering latency: ');
    } else {
      filterAbsolute(client, payloadArray);
      if (debug == true) console.timeEnd('Filtering latency: ');
    }
  }
}