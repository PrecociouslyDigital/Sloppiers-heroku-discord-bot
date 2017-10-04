import * as express from 'express';

import * as Discord from 'discord.js'

import * as botLogic from './bot';

var mybot = new Discord.Client();
var app = express();

var redisClient = require('redis').createClient(process.env.REDIS_URL);



mybot.on("ready", ()=>botLogic.ready(redisClient, mybot));


mybot.on("message", (message)=> botLogic.onMessage(message, mybot, redisClient)); 




app.set('port', (process.env.PORT || 5000))
app.use(express.static(__dirname + '/public'))

app.get('/', function(request, response) {
    mybot.generateInvite(['ADMINISTRATOR'])
        .then(link => {
            console.log(`Generated bot invite link: ${link}`);
            response.redirect(link);
    });
});
app.get('/reports/:id', function(request, response) {
  redisClient.zrange(request.params.id, (err, result) =>{
      if(result != null){
          //TODO: Replace with mustache.js
          response.send(`<html><body><pre>Report : ${result.join("\n")}</pre></body></html>`);
      }
  });
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
mybot.login(process.env.DISCORD_TOKEN).then(function(){
    console.log("Logged in!");
},function(err){
    console.log("Porblem logging in!");
    console.log(err);
});
