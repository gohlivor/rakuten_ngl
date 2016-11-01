console.log("hello");

//bot framework includes
const restify = require('restify');
const builder = require('botbuilder');
const botauth = require('botauth'); //npm made by Matt Dotson
const envx = require('envx');

//app includes
const path = require('path');
const crypto = require('crypto');
const passport = require('passport');
const RakutenStrategy = require('passport-rakuten').RakutenStrategy;
const mongoose = require('mongoose');
const url = require('url');

//private modules (this looks for the js file path from root folder)
const User = require('./src/models/user');
const Authorization = require('./src/models/authorization');
const Rakuten = require('./src/rakuten');
const env = require('./src/env');
const request = require('request');


//get environment variables
const MICROSOFT_APP_ID = env("microsoft_app_id");
const MICROSOFT_APP_PASSWORD = env("microsoft_app_password");
const SERVER_HOST = env("server_host", "localhost");
const PORT = env("port", 3978);
const SERVER_PORT = env("server_port", 3978);
const SERVER_PROTOCOL = env("server_protocol", "https");
const RAKUTEN_APP_KEY = env("rakuten_app_key");
const RAKUTEN_APP_SECRET = env("rakuten_app_secret");
const DB_URI = env("db_uri"); //this is from mlab
const LUIS_URL = env("luis_url", "https://api.projectoxford.ai/luis/v1");
const BOTAUTH_SECRET = env("BOTAUTH_SECRET");


// Ichiba API
const ICHIBA_API_SEARCH = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20140222?format=json&applicationId=" + RAKUTEN_APP_KEY + "&keyword=";


const AUTH_URL = SERVER_PROTOCOL + "://" + SERVER_HOST + "/auth/rakuten";

//took out port because it was causing errors ":" + SERVER_PORT

//---------------------------------------------------------------//

//start up
console.log("starting bot...");
console.log(DB_URI);
//connect to mongo
mongoose.connect(DB_URI);

//var authorizations = {};




// // ####### Create chat bot using bot framework ############
var connector = new builder.ChatConnector({
    appId: MICROSOFT_APP_ID,
    appPassword: MICROSOFT_APP_PASSWORD
});



///########## Setup Passport JS Auth ##########
//standard passportjs serialization
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

//standard passportjs deserialization
passport.deserializeUser(function (userId, done) {
    User.findById(userId, function (err, user) {
        if (err) {
            return done(err);
        }

        if (!user) {
            return done(null, false, { message: 'user not found' });
        }

        return done(null, user);
    });
});

//configure passport authentication using passport for rakuten
passport.use(new RakutenStrategy({
    clientID: RAKUTEN_APP_KEY, 
    clientSecret: RAKUTEN_APP_SECRET,
    callbackURL: AUTH_URL + "/callback" 
},
    function (accessToken, refreshToken, profile, done) { //this will access user profile
        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;
        return done(null, profile);
    }
    ));
 
 // ########### Set Up Restify #############
var app = restify.createServer();
app.use(restify.queryParser());
app.use(restify.bodyParser());
app.use(passport.initialize());
app.use(passport.session());
 
 
 console.log(app);
 console.log(bot);   
 
 
 //## listen for messages ##//
var bot = new builder.UniversalBot(connector);
app.post('/api/messages', connector.listen());


 // Initialize with the strategies we want to use (from Matt Dotson)
var ba = new botauth.BotAuthenticator(app, bot, { baseUrl : "https://" + SERVER_HOST, secret : BOTAUTH_SECRET })
    .provider("rakuten", (options) => { 
        return new RakutenStrategy({
            clientID : RAKUTEN_APP_KEY,
            clientSecret : RAKUTEN_APP_SECRET,
            callbackURL : options.callbackURL,
            scope : ["rakuten_favoritebookmark_read"],
            skipUserProfile : true
        }, (accessToken, refreshToken, profile, done) => {
            //botauth stores profile object in bot userData, so make sure any token data you need is included
            profile = profile || {};
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            profile.provider = "rakuten"; //workaround, shouldn't need this
            return done(null, profile);
        });
    });   
    




app.get('/', restify.serveStatic({
    directory: './public',
    default: 'index.html'
}));


    

//start redirect to oauth provider

/*app.get('/auth/rakuten', function (req, res, next) {
    passport.authenticate('rakuten', {
        state: req.query.aid
    })(req, res, next);
});


//oauth provider redirects back to us here with token
app.get('/auth/rakuten/callback',
    passport.authenticate('rakuten', { failureRedirect: '/' }),
    function (req, res, next) {
        //get the authId out of the querystring
        var authId = req.query.state;
        console.log('[rest:/auth/rakuten/callback] success ' + authId);
    });
        
        */
        
  /*
        //lookup authorization details
        Authorization.findOne({ id : authId}, function (err, a) {
            if (err) {
                console.log("error getting auth %j", err);
                res.send("Error getting auth token.  Please refresh this page");
            } else if(a) {
                console.log("got the auth info %j", a);
                
                bot.beginDialog(a.address, "/auth_callback", req.user);

                res.send("Thanks, we're all done here. You can go back to our chat to continue."); 
            } else {
                console.log("didn't find auth info");
                res.send("Invalid auth token");
            }
        });
    });
*/

//############### bot implementation ###################

//Authentication Middleware



/*bot.dialog('/login', function (session, next) {
        //console.log("[bot:middleware] *****SESSION*******\n", session);
        if ('/auth_callback' === session.options.dialogId
            || session.userData.rakutenProfile) {
            //user is authenticated or in the process of being authenticated
            next();
        } else {
            session.beginDialog('/auth');
        }
    })
    */



var recognizer = new builder.LuisRecognizer(LUIS_URL);

//root dialog just routes you to dialogs defined later
bot.dialog('/', new builder.IntentDialog({ recognizers: [recognizer]})
    .matches("Login", '/login')
    .matches("Search Items", '/search_items')
    .matches("Search Books", '/search_books')
    .matches(/^auth/i, '/auth')
    .matches("Hello", '/askSearch' )
    .matches("SayHello", "/hello")
    .matches("Query", "/query")
    .matches("Forget", "/forget")
    .matches("Game", "/game")
    .matches("Help", "/help")
    .onDefault(builder.DialogAction.send("Huh? Why don't you say something I understand??"))
    );



bot.dialog('/askSearch', [
    function (session) {
        builder.Prompts.text(session, 'hi! I can help you search Rakuten! Do you want to search for "items" or "books"? Remember, im just a bot! Please only say one of those two things! Or say "auth" if you want to log in!');
    }
]);

bot.dialog("/login", [].concat( 
    ba.authenticate("rakuten"),
    function(session, results) {
        //get the profile
        var user = ba.profile(session, "rakuten");

        //todo: get bookmarks and not just dump user info in chat
        session.endDialog(`your user info is ${ JSON.stringify(user) }`);
    }
));




/*
bot.add('/forget', [
    function (session) {
        console.log('[bot:/forget]');
        builder.Prompts.confirm(session, "Are you sure you want me to forget your account data?");
    },
    function (session, result) {
        if (result.response) {
            session.userData = {};
            session.endDialog("Done. Who are you? Why are you talking to me?");
        } else {
            session.endDialog("Ok. Thanks for not using the Men In Black flashy thing on me");
        }
    }]);  
 */

//say hello to the user
bot.dialog('/hello', function (session) {
    console.log('[bot:/hello]');
    if (session.userData.rakutenProfile
        && session.userData.rakutenProfile.name
        && session.userData.rakutenProfile.name.givenName) {
        session.endDialog('Hello %s', session.userData.rakutenProfile.name.givenName);
    } else {
        session.endDialog("hi!");
    }
});




//this dialog is used to start the oauth flow with rakuten
bot.dialog('/auth', function (session) {
    console.log('[bot:/auth] ' + session.message);

    var authId = crypto.randomBytes(32).toString('hex');
    var authObj = {
        id :  authId,
        address : session.message.address   
    };

    Authorization.create(authObj, function (err, obj) {
        console.log("reswtryjh");
        if (err) {
            console.log("[bot:/auth] error creating authorization");
            session.endDialog('Failed to create an authorization request. Try again later.'); 
        } else {
            console.log("[bot:/auth] created authorization " + obj);
            var url = AUTH_URL + "?aid=" + encodeURIComponent(authId);
            session.endDialog('Hello. I can help you use Rakuten! But first please log in here ' + url); 
            //var dbxlogo = builder.CardImage(session).url("https://cfl.dropboxstatic.com/static/images/brand/glyph@2x-vflJ1vxbq.png"); 
               
            var msg = new builder.Message(session)
                .text("Hello. I can help you shop on Rakuten. But first please log in here.")
                .attachments([ 
                    new builder.SigninCard(session) 
                        .text("Connect to Rakuten") 
                        .button("connect", url) 
                ]);
    
            session.endDialog(msg); 
        }
    });
});



//this dialog is initiated from the end of the oauth callback in restify
bot.dialog("/auth_callback", function (session, args) {
    //console.log("[/auth_callback]");
    //console.log(args);
    session.userData.rakutenProfile = args;
    session.endDialog("Thanks %s. I'm all connected now", session.userData.rakutenProfile.name.givenName);
    //session.endDialog("It might take me a few minutes learn about your files.  I'll let you know when I'm ready.");
});


bot.dialog("/search_items", [
    function(session){
        builder.Prompts.text(session, 'What items do you want to search for?');
    },
    function(session, results) {
    
        console.log("api search: " + ICHIBA_API_SEARCH + encodeURIComponent(results.response));
        request(ICHIBA_API_SEARCH + encodeURIComponent(results.response), 
            function(error, response, body){
                var body = JSON.parse(response.body);

                session.send(getHeroCardCarousel(session, body));
            }
        )}
])


bot.dialog("/search_books", [
    function(session){
        builder.Prompts.text(session, 'What books do you want to search for?');
    },
    function(session, results) {
        request("https://app.rakuten.co.jp/services/api/BooksTotal/Search/20130522?format=json&applicationId=1048495454231282153&keyword=" + encodeURIComponent(results), 
            function(error, response, body){
                console.log(body);

                var body = JSON.parse(response.body);

                var msg = new builder.Message(session)
                    .text("Here is the first result.")
                    .attachments([
                        new builder.HeroCard(session)
                            .text(body.Items[0].Item.title) 
                            .tap(builder.CardAction.openUrl(session, body.Items[0].Item.itemUrl))
                            .images([
                                builder.CardImage.create(session, body.Items[0].Item.mediumImageUrl)
                            ])
                    ]);
        
                session.endDialog(msg); 
            }
        )}
])








//start listening for messages
app.listen(PORT, function () {
    console.log("listening on %s", app.name, app.url);
});
//console.log("listening on %s", PORT);

// Card Functions
function getHeroCardCarousel(session, body) {

    var cards = [];

    for (var i = 0; i < body.Items.length && i < 5; i++ ) {

        //URL
        var itemUrl = url.parse(body.Items[i].Item.itemUrl);
        var urlHttps = "https://" + itemUrl.host + itemUrl.path;

        var msg = new builder.HeroCard(session)
                    .text(body.Items[i].Item.itemName) 
                    .tap(builder.CardAction.openUrl(session, urlHttps))
                    .buttons([
                        builder.CardAction.openUrl(session, urlHttps, 'View Item')
                    ])
                    .images([
                        builder.CardImage.create(session, body.Items[i].Item.mediumImageUrls[0].imageUrl)
                    ])
          
        cards[i] = msg;
    }


    var reply = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(cards);

    return reply;
}