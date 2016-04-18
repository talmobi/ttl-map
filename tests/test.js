var ttlMap = require('../ttl-map.js');

var assert = require('assert');

describe('test ttl-map', function () {
  this.timeout(3000);

  it('should display correct size', function (done) {
    var map = ttlMap();
    map.set('one', 1);
    assert.equal(map.size(), 1);

    map.set('two', 2);
    assert.equal(map.size(), 2);

    // set same key, size should stay unchanged
    map.set('two', 2);
    assert.equal(map.size(), 2);

    map.set('three', 3, 100);
    assert.equal(map.size(), 3);

    setTimeout(function () {
      assert.equal(map.size(), 2);
      done();
    }, 100);
  });

  it('should publish events in correct order', function (done) {
    var map = ttlMap();

    var changes = "";
    var unsub = map.subscribe(function (change) {
      if (changes.length > 0) {
        changes += ",";
      }

      evt = change.events[0];
      changes += change.type + ":" + evt.key;

      if (changes === "SET:one,SET:two,UPDATE:two,SET:three,UPDATE:one,EXPIRE:one,EXPIRE:three,EXPIRE:two") {
        unsub();
        done();
      };
    });

    map.set('one', 1);
    map.set('two', 2);
    map.set('two', 2, 200);
    map.set('three', 3, 100);
    map.set('one', 1, 50);
  });

  it('it should get correct values from keys', function (done) {
    var map = ttlMap();

    map.set('one', 1);
    assert.equal(map.get('one'), 1);

    map.set('two', 2);
    assert.equal(map.get('two'), 2);

    map.set('two', 22, 200);
    assert.equal(map.get('two'), 22);

    map.set('three', 3, 100);
    assert.equal(map.get('three'), 3);

    assert.equal(map.get('one'), 1);

    setTimeout(function () {
      assert.equal(map.get('three'), null);
      assert.equal(map.get('two'), 22);
      setTimeout(function () {
        assert.equal(map.get('two'), null);
        done();
      }, 100);
    }, 100);
  });

  it('should not miss any events during stress test - SET', function (done) {
    var map = ttlMap();

    var count = 0;
    var unsub = map.subscribe(function (change) {
      count += change.events.length;
    });

    var amount = 10000;

    for (var i = 0; i < amount; i++) {
      map.set('keys-' + (i % 400), i);
    };

    setTimeout(function () {
      if (count === amount) {
        unsub();
        done();
      };
    }, 600);
  });

  it('should not miss any events during stress test - EXPIRE', function (done) {
    var map = ttlMap();

    var count = 0;
    var changes = "";
    var unsub = map.subscribe(function (change) {
      count += change.events.length;

      //if (changes.length > 0) {
      //  changes += ",";
      //}

      //for (var i = 0; i < change.events.length; i++) {
      //  var evt = change.events[i];
      //  if (i != 0)
      //    changes += ",";
      //  changes += change.type + ":" + evt.key;
      //};
      //console.log(changes);
    });

    var amount = 10000;

    for (var i = 0; i < amount; i++) {
      map.set('k' + i, i, i % 400);
    };

    setTimeout(function () {
      // double amount for each expiration
      //console.log("count: " + count);
      if (count === amount * 2) {
        unsub();
        done();
      };
    }, 600);
  });

});
