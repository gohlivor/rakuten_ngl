//bot framework includes
const restify = require('restify');
const builder = require('botbuilder');
const msrest = require('ms-rest');

//app includes
const path = require('path');
const crypto = require('crypto');
const passport = require('passport');
const RakutenOAuth2Strategy = require('passport-rakuten-oauth2').Strategy;
const unirest = require("unirest");
const azs = require('azure-storage');
//const insights = require('applicationinsights');
const mongoose = require('mongoose');

//private modules (this looks for the js file path from root folder)
const User = require('./src/models/user');
const Authorization = require('./src/models/authorization');
const Rakuten = require('./rakuten');
const env = require('./env');



//get environment variables
const MICROSOFT_APP_ID = env("microsoft_app_id");
const MICROSOFT_APP_SECRET = env("microsoft_app_secret");
const SERVER_HOST = env("server_host", "localhost");
const PORT = env("port", 3978);
const SERVER_PORT = env("server_port", 3978);
const SERVER_PROTOCOL = env("server_protocol", "https");
const RAKUTEN_APP_KEY = env("rakuten_app_key");
const RAKUTEN_APP_SECRET = env("rakuten_app_secret");
const DB_URI = env("db_uri"); //this is from mlab
const LUIS_URL = env("luis_url", "https://api.projectoxford.ai/luis/v1");


const AUTH_URL = SERVER_PROTOCOL + "://" + SERVER_HOST + ":" + SERVER_PORT + "/auth/dropbox";

//---------------------------------------------------------------//

//start up
console.log("starting bot...");

//connect to mongo
mongoose.connect(DB_URI);
//mongoose.connect(DB_URI);

//var authorizations = {};


// ####### Create chat bot using bot framework ############
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());


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
    clientID: RAKUTEN_APP_ID, 
    clientSecret: RAKUTEN_APP_SECRET,
    callbackURL: AUTH_URL + "/callback" //figure this thing out
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

app.get('/', restify.serveStatic({
    directory: './public',
    default: 'index.html'
}));


// Start Redirect to Auth Provider
app.get('/auth/rakuten', function (req, res, next) {
    passport.authenticate('rakuten-oauth2', {
        state: req.query.aid
    })(req, res, next);
});

app.get('/auth/rakuten/callback',
    passport.authenticate('rakuten-oauth2', { failureRedirect: '/' }),
    function (req, res, next) {
//get the authID out of the query string
        var authId = req.query.state;
        
/*
//lookup authorization details
        Authorization.findOne({ id : authId}, function (err, a) {
            if (err) {
                console.log("error getting auth %j", err);
            }

            console.log("got the auth info %j", a);
        });

        bot.beginDialog({
            to: authAddr.to,
            from: authAddr.from
        }, "/auth_callback", req.user);

        res.send("Thanks, we're all done here. You can go back to our chat to continue.");
    });

*/

/*//Bot Dialogs ################## //

bot.use(function (session, next) {
    if (session.message.from.isBot) {
        next();
    } else {
        // console.log("*****SESSION*******\n", session.userData);
        console.log("*****USER*****\n", session.message.from.id);
        if (!session.userData.dropboxProfile) {
            session.beginDialog('/auth');
        } else {
            next();
        }
    }
});



bot.configure({
    userWelcomeMessage: "Hello... Welcome to the group.",
    goodbyeMessage: "Goodbye..."
});

bot.add('/', new builder.LuisDialog(LUIS_URL)
    .on("SayHello", "/hello")
    .on("Photo", "/photo")
    .on("Forget", "/forget")
    .on("Game", "/game")
    .on("Help", "/help")
    .onDefault(builder.DialogAction.send("you speak weird. I no understand you"))
    );

bot.add('/photo', function (session) {
    console.log('[bot:/photo]');
    session.send("one sec, I'm looking for a photo for you");
    var db = new Dropbox(session.userData.dropboxProfile._accessToken);
    db.getRecentPhotos(function (photos) {
        console.log("about to create photo message");
        var msg = new builder.Message();
        console.log("created message");
        msg.setText(session, "I like this photo you took");
        console.log("set the text");
        msg.addAttachment({
            contentType: "image/jpeg",
            contentUrl: photos[0].link,
            fallbackText: "if you were using a better messaging client, you'd see a photo right here"
        });

        session.send(msg);
        session.endDialog();
    });
});

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

bot.add('/hello', function (session) {
    console.log('[bot:/hello]');
    if (session.userData.dropboxProfile
        && session.userData.dropboxProfile.name
        && session.userData.dropboxProfile.name.givenName) {
        session.endDialog('Hello %s', session.userData.dropboxProfile.name.givenName);
    } else {
        session.endDialog("hi!");
    }
});

bot.add('/help', function(session) {
   session.endDialog("I can do lots of interesting things. Try asking me to 'show you photos of something'. I can even 'play a game'."); 
});

bot.add('/game', function(session) {
    session.endDialog("I haven't quite figured out how this game works yet.  Check back in a few days");
});

bot.add('/auth', function (session) {
    console.log('[bot:/auth]');

    var authId = crypto.randomBytes(32).toString('hex');
    authorizations[authId] = {
        id: authId,
        to: session.message.from,
        from: session.message.to
    };

    Authorization.create(authorizations[authId], function (err, obj) {
        if (err) { console.log("error creating authorization"); }
    });

    var url = AUTH_URL + "?aid=" + encodeURIComponent(authId);
    session.endDialog('Hello. I can help you use your dropbox files in coversations, but first I need you to grant me access to your dropbox here ' + url);
});

bot.add("/auth_callback", function (session, args) {
    console.log("[/auth_callback]");
    console.log(args);
    session.userData.dropboxProfile = args;
    session.endDialog("Thanks %s. I'm all connected now", session.userData.dropboxProfile.name.givenName);
    //session.endDialog("It might take me a few minutes learn about your files.  I'll let you know when I'm ready.");
});

bot.on('DeleteUserData', function (message) {
    // ... delete users data
    console.log('[DeleteUserData]');
});



*/


//hook up the bot connector
app.post('/api/messages', bot.verifyBotFramework(), bot.listen());

//start listening for messages
app.listen(PORT, function () {
    console.log("listening on %s", PORT);
    console.log("startup duration = %s",(new Date() - startTime));
    insights.client.trackMetric("StartupTime", new Date() - startTime);
});