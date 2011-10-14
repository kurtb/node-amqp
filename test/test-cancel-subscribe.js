require('./harness');

var recvCount = 0;
var body = "hello world";
var basicCancelOkCount = 0;

connection.addListener('ready', function () {
  puts("connected to " + connection.serverProperties.product);

  var e = connection.exchange('node-ack-fanout', {type: 'fanout'});
  var q = connection.queue('node-123ack-queue', function() {
    q.bind(e, 'ackmessage.*');
    q.on('queueBindOk', function() {
      q.on('basicConsumeOk', function () {
        puts("publishing 2 json messages");

        e.publish('ackmessage.json1', { name: 'A' });
        e.publish('ackmessage.json2', { name: 'B' });
      });
      
      q.subscribe({ ack: true }, function (json, headers, deliveryInfo) {
        recvCount++;
        puts('Got message ' + JSON.stringify(json));

        if (recvCount == 1) {
          puts('Got message 1.. waiting');
          assert.equal('A', json.name);
          
          // cancel the subscription and then do the shift - this should make sure
          // we only have one message
          q.cancelSubscribe(deliveryInfo.consumerTag).addCallback(function() {
                  puts('shift!');
                  q.shift();
                  connection.end();              
              });
        } else {
          throw new Error('Too many message!');
        }
      })
    })
  });

  q.on('basicCancel', function() {
          puts('basicCancel');
          basicCancelCount++;
      });
  
  q.on('basicCancelOk', function() {
          puts('basicCancelOk');
          basicCancelOkCount++;
      });
});


process.addListener('exit', function () {
  assert.equal(1, recvCount);
  assert.equal(1, basicCancelOkCount);
});
