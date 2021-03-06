var util = require('util');

function env(key, options) {
    var opt = (typeof options === 'object' ? options : (options ? { "default" : options } : {}));
    
    if (process.env.hasOwnProperty(key)) {
        return process.env[key];
    } else if (opt.hasOwnProperty("default")) {
        return opt.default;
    } else {
        var msg = util.format(opt.error || "The `%s` environemnt variable is required.", key);
        throw Error(msg);
    }
}

module.exports = env;

//this is how all the variables are found/hidden
