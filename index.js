var express = require('express')
var app = express()
var Discord = require("discord.js");
var ver ="0.86"
var mybot = new Discord.Client();
var getJSON = require('get-json');

var redisClient = require('redis').createClient(process.env.REDIS_URL);

var settings = {
    assume_existing_users_are_good : true,
}

var util = {
    keyFromParts : function(){
        return [...arguments].join(":");
    },
    whitelistMessage : ["aren't asshats", "are all good blokes", "are fine", "are not replicants"],
}

mybot.on("ready", function () {
	console.log("Ready to begin! Serving in " + mybot.guilds.size + " guilds");
	console.log(mybot.guilds.values());
	for(let guild of mybot.guilds.values()){
	    console.log("Processing " + guild.name);
	    redisClient.sadd(util.keyFromParts(guild.id, "whitelist"), guild.members.map((member) => member.id));
	    console.log("Assuming " + 
	        guild.members
	            .map((member)=>member.displayName)
	            .join("\n") +
	        util.whitelistMessage[Math.floor(Math.random() * util.whitelistMessage.length)]);
	}
	
});


mybot.on("message", function(message) {
    if (message.content === "!live") {
        getJSON("https://api.twitch.tv/kraken/streams/lalicel", function(err, res) {
            if (res.stream == null) {
                mybot.reply(message, "she is currently not live");
            } else {
                mybot.reply(message, "she is currently live");
				mybot.sendMessage(message, "https://www.twitch.tv/lalicel");
            }
        });
    }
});




app.set('port', (process.env.PORT || 5000))
app.use(express.static(__dirname + '/public'))

app.get('/', function(request, response) {
  mybot.generateInvite(['ADMINISTRATOR'])
    .then(link => {
        console.log(`Generated bot invite link: ${link}`);
        response.send(`<html><body>Generated bot invite link: <a href="${link}">${link}</a></body></html>`);
    });

})

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})

mybot.login(process.env.DISCORD_TOKEN).then(function(){
    console.log("Logged in!");
},function(err){
    console.log("Porblem!");
    console.log(err);
});