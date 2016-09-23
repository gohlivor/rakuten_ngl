var env = require('../env');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    id: { type: Number, index : true },
    provider: { type: String },
    displayName: { type: String },
    name: {
        familyName: { type: String },
        givenName: { type: String },
        middleName: { type: String }
    },
    emails: [{ value: { type: String }, type: { type: String } }],
    accessToken: { type: String },
    refreshToken: { type: String }
});

module.exports = mongoose.model('User', UserSchema);