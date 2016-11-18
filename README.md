# READ ME
## Rakuten Auth Bot - In Chat authentication with Rakuten's ID Service

This bot allows users to: <br />
-Log in with Rakuten and see their profile details <br />
-Upload images of objects, and with our Vision API, search the Rakuten catalogue for associated products <br />
-Search for products on Rakuten Ichiba and Rakuten Bookstore within the chat <br />

## Set up
You'll want to make sure you install the necessary npm packages
```
npm install --save botbuilder
npm install --save restify
npm install --save botauth
```

## Create your chat bot and listen for messages
 ```
 // ####### Create chat bot using bot framework ############
var connector = new builder.ChatConnector({
appId: MICROSOFT_APP_ID,
appPassword: MICROSOFT_APP_PASSWORD
});
 //## listen for messages ##//
var bot = new builder.UniversalBot(connector);
app.post('/api/messages', connector.listen());
```

### For full documentation on using Microsoft Bot Framework see here: <https://docs.botframework.com/en-us/node/builder/overview/>

## Host your bot on Azure as a Web App
Hosting your bot as an Azure Web App makes it easy for you as a developer to build, test, and deploy your bot. I really enjoyed testing my bot that way, and also liked that I could store my environment variables in Azure too. If you're interested in doing the same you can learn how to here: <https://azure.microsoft.com/en-us/services/app-service/web/>

## Authentication
This bot uses the *botauth* npm handling auth. It was created by Matt Dotson and you can find details on using it here: <https://github.com/mattdot/botauth> <br />
*botauth* is authentication middleware for bots built using the botframework and nodejs. botauth leverages passportjs authentication strategies to help bot developers connect to 3rd party oauth providers. You can use botauth to connect your bot's users to their Facebook, Dropbox, or any other API protected by OAuth 2.0. <br />

After using *botauth*, you can use the *authenticate* method which returns an array of dialog steps which you can combine with your own.

```
bot.dialog("/login", [].concat( 
 ba.authenticate("rakuten"), 
 function(session, results) {
    //get the profile
    var user = ba.profile(session, "rakuten");
    session.endDialog(`your user info is ${ JSON.stringify(user) }`);
    }
));
```
