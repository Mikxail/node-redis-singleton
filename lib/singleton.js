var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Lock = require('yalock');

function Singleton(client, options){
    EventEmitter.call(this);

    this._options = options || {};
    this._relockShift = this._options.relockShift;
    if (typeof this._relockShift == 'undefined') {
        this._relockShift = 100;
    }
    this._relockTimeout = this._options.relockTimeout || 150;
    this._lm = new Lock(client, options);
    this._lock = this._lm.createLock(options.name, options);
    this._hasLock = false;
    this._timer = null;
}

util.inherits(Singleton, EventEmitter);

Singleton.prototype.tryStart = function (callback) {
    var self = this;
    callback = callback || function(){};
    this._tryLockAndEmit(function(err, isSuccess, timeout){
        if (err || !isSuccess) {
            callback(null, false);
        } else {
            callback(null, true);
        }
        self._startTimer(timeout);
    });
};

Singleton.prototype.start = function (callback) {
    callback = callback || function(){};
    this.once('lock', () => {
        callback(null, true);
    });
    this.tryStart();
};

Singleton.prototype.stop = function (callback) {
    var self = this;
    callback = callback || function(){};
    if (!this._hasLock) {
        this._clearTimer();
        return callback(null, false);
    }
    this._lock.unlock(function(err, isSuccess){
        if (err) return callback(err, false);
        self._clearTimer();
        if (isSuccess) {
            self._hasLock = false;
            self.emit('unlock');
            callback(null, true);
        } else {
            callback(null, false);
        }
    });
};



Singleton.prototype._tryLock = function (callback) {
    if (this._hasLock) {
        this._lock.tryUpdateLock(callback);
    } else {
        this._lock.tryLock(callback);
    }
};

Singleton.prototype._tryLockAndEmit = function (callback) {
    var self = this;
    this._tryLock(function(err, isSuccess){
        if (err || !isSuccess) {
            if (self._hasLock) {
                self._hasLock = false;
                self.emit('unlock');
            }
        } else {
            var untilTime = self._getUntilTime();
            untilTime -= self._relockShift;
            if (!self._hasLock) {
                self._hasLock = true;
                self.emit('lock', untilTime);
            }
        }
        callback(null, isSuccess);
    });
};

Singleton.prototype._getUntilTime = function () {
    var untilTime = this._lock.getUntilTime();
    if (!untilTime) return 0;
    untilTime -= this._relockShift;
    return untilTime;
};

Singleton.prototype._startTimer = function (timeout) {
    var self = this;
    this._clearTimer();
    this._timer = setTimeout(function(){
        self._tryLockAndEmit(function(err, isSuccess){
            var timeout2;
            if (isSuccess) {
                timeout2 = self._getUntilTime();
            } else {
                var t2 = Math.floor(self._relockTimeout / 2);
                timeout2 = t2 + Math.floor(Math.random()*t2);
            }
            self._startTimer(timeout2);
        });
    }, timeout);
};

Singleton.prototype._clearTimer = function () {
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
};

module.exports = Singleton;