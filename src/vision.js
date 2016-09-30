
var https = require('https');
var request = require('request');
var fs = require('fs');
const env = require('./env');

var API_OCR_URL = "https://api.projectoxford.ai/vision/v1.0/analyze/?visualFeatures=Description,Color";
var API_VISION_KEY = env("api_vision_key");

var getImageDescription = function(image, connector, callback) {

    var post_data = "";

    connector.getAccessToken(function(err, token){

        var headersPost = {
            "Authorization": 'Bearer ' + token,
            "Content-Type" : "application/octet-stream",
            "Ocp-Apim-Subscription-Key" : API_VISION_KEY
        };

        var options2 = {
            url: API_OCR_URL,
            headers: headersPost
        };

        request.get({url: image, headers: {"Authorization": 'Bearer ' + token}})
            .pipe(request.post(options2, requestCallback));
    })

    function requestCallback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);

            callback(data.color.dominantColorForeground + " " + data.description.tags[1]);

        } else {
            console.log(response.statusCode)
        }
    }

}

module.exports = {
    getImageDescription: getImageDescription
}