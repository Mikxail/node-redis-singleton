var Singleton = require('./singleton');
module.exports = Singleton;
module.exports.create = function(name, options, client){
    return new Singleton(client, Object.assign({name}, options));
};