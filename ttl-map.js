var ttlMap = function (config) {
  var MAX_TIMEOUT = 2147483647;

  var params = {
    ttl: MAX_TIMEOUT,
    subscribers: [],
  };
  var config = {} || config;
  params.ttl = config.ttl || params.ttl;
  params.subscribers = config.subscribers || params.subscribers;

  var map = {};

  var timeout = null;
  var current_evt = null;

  var sorted_events_list = [];

  var expireEvents = function () {
    sorted_events_list.sort(function (a, b) {
      if (a.expires_at < b.expires_at) {
        return -1;
      }
      if (a.expires_at > b.expires_at) {
        return 1;
      }
      return 0;
    });

    var now = Date.now();
    var _list = [];
    for (var i = 0; i < sorted_events_list.length; i++) {
      var evt = sorted_events_list[i];
      if (now >= evt.expires_at) {
        _list.push( evt );
        delete map[evt.key];
        continue;
      }
      break;
    };

    // remove expired events from the list and map
    sorted_events_list = sorted_events_list.slice( _list.length );

    // notify subscribers for EXPIRE
    if (_list.length > 0) {
      for (var i = 0; i < params.subscribers.length; i++) {
        var sub = params.subscribers[i];
        sub({
          type: 'EXPIRE',
          events: _list
        });
      };
    }

    // udate timeout
    var evt = sorted_events_list[0];
    if (evt) {
      current_evt = evt;
      timeout = setTimeout(function () {
        expireEvents();
      }, evt.expires_at - now);
    } else {
      current_evt = null;
      timeout = null;
    }
  };

  var addEvent = function (evt) {
    var now = Date.now();

    var key = evt.key;
    // check if key already exists
    if (map[key]) {
      //console.log("updating key");
      if (timeout && current_evt.key === key) {
        clearTimeout( timeout );
        timeout = null; // re-calculate timeout
      }

      for (var i = 0; i < sorted_events_list.length; i++) {
        if (evt.key == sorted_events_list[i].key) {
          sorted_events_list[i] = evt;
          break;
        };
      };
      map[key] = evt;

      // notify subscribers for UPDATE
      for (var i = 0; i < params.subscribers.length; i++) {
        var sub = params.subscribers[i];
        sub({
          type: 'UPDATE',
          events: [evt]
        });
      };
    } else {
      //console.log("adding key");
      map[key] = evt;
      sorted_events_list.push(evt);

      // notify subscribers for SET
      for (var i = 0; i < params.subscribers.length; i++) {
        var sub = params.subscribers[i];
        sub({
          type: 'SET',
          events: [evt]
        });
      };
    }

    if (evt && current_evt && evt.expires_at >= current_evt.expires_at) {
      return;
    }

    if (timeout) {
      clearTimeout( timeout );
    }

    current_evt = evt;
    timeout = setTimeout(function () {
      expireEvents();
    }, Math.max(evt.expires_at - Date.now(), 0));
  };

  return {
    set: function (key, value, ttl) {
      var ttl = Math.min(typeof ttl === 'number' ? ttl : params.ttl, MAX_TIMEOUT);

      var now = Date.now();
      var evt = {
        key: key,
        value: value,
        expires_at: now + ttl,
        created_at: now,
      };

      // add to queue
      addEvent( evt );
    },
    get: function (key) {
      var evt = map[key] || {};
      var now = Date.now();

      if (evt.expires_at < now)
        return undefined;
      return evt.value;
    },
    size: function (accurate) {
      var array = sorted_events_list;
      if (accurate) {
        var now = Date.now();
        // filter expired results for exact precision
        var array = sorted_events_list.filter(function (evt) {
          return evt.expires_at > now;
        });
      };
      return array.length;
    },
    isEmpty: function (accurate) {
      return this.size(accurate) === 0;
    },
    subscribe: function (sub) {
      params.subscribers.push(sub);

      // return unsubscribe function
      return function () {
        var index = params.subscribers.indexOf(sub);
        params.subscribers.splice(index, 1);
      };
    }
  };
};

if (module && module.exports !== undefined) {
  module.exports = ttlMap;
}
