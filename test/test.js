var Lock = require('yalock');
var assert = require('assert');
var Singleton = require('../index');

describe('Singleton', () => {
    var yalock;
    var lock11, lock12, lock13;

    beforeEach(() => {
        yalock = new Lock();
        lock11 = Singleton.create("lock1", {ttl: 100});
        lock12 = Singleton.create("lock1", {ttl: 100});
        lock13 = yalock.createLock("lock1", {ttl: 100});
    });

    afterEach(done => {
        lock11.stop(() => {
            lock12.stop(() => {
                lock13.unlock(() => done());
            });
        });
    });


    it("should lock on start", done => {
        lock11.start((err, isOk) => {
            assert.ifError(err);
            assert.ok(isOk);

            lock13.tryLock((err, isOk) => {
                assert.ifError(err);
                assert.ok(!isOk);
                done();
            });
        });
    });

    it("should unlock on stop", done => {
        lock11.start((err, isOk) => {
            assert.ifError(err);
            assert.ok(isOk);

            lock13.tryLock((err, isOk) => {
                assert.ifError(err);
                assert.ok(!isOk);

                lock11.stop((err, isOk) => {
                    assert.ifError(err);
                    assert.ok(isOk);

                    lock13.tryLock((err, isOk) => {
                        assert.ifError(err);
                        assert.ok(isOk);
                        done();
                    });
                });
            });
        });
    });

    it("should wait until first stop", done => {
        lock11.start((err, isOk) => {
            assert.ifError(err);
            assert.ok(isOk);

            var isStopped = false;
            lock12.start((err, isOk) => {
                assert.ifError(err);
                assert.ok(isOk);
                assert.ok(isStopped);
                done();
            });

            setTimeout(() => {
                lock11.stop((err, isOk) => {
                    assert.ifError(err);
                    assert.ok(isOk);
                    isStopped = true;
                });
            }, 30);
        });
    });

    it("should wait until first ttl finished", done => {
        lock11.start((err, isOk) => {
            assert.ifError(err);
            assert.ok(isOk);

            var isStopped = false;

            lock12.start((err, isOk) => {
                assert.ifError(err);
                assert.ok(isOk);
                assert.ok(isStopped);
                done();
            });

            setTimeout(() => {
                lock11._clearTimer();
                isStopped = true;
            }, 300);
        });
    });
});