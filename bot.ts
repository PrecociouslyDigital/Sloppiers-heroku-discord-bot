import {RedisClient} from 'redis';
import * as Discord from 'discord.js';
import * as moment from 'moment';


var defaults : any = {
    reportChannel : "mods",
    reportDuration : {
        weeks:1
    },
    beigelistDuration : {
        days: 1
    },
    messageRateNumber : 10,
    messageRateDuration : {
        seconds:1
    },
    whitelistMessage : ["aren't asshats", "are all good blokes", "are fine", "are not replicants"],
    warningMessage : "Hey, that's a lot of messages. While I'm sure you have great intentions and are not at all attempting to harrass or annoy other people, It'd be really nice if you could tone it down a little to prevent channel spam.",
    closenessMessage : "Hey, sorry, but something you said was really similar to something used to spam the channel not so long ago. ",
    mutedMessage : "You've been muted for potentially harassing behavior!",
    serverURL : "I.dunno.yet",
}

var commands : {
    [key : string] : (message : Discord.Message, args : string[]) => void;
} = {
    "help" : function(message){
        
    }
}

var util = {
    keyFromParts : function(...args){
        return args.join(":");
    },
    
}

export function ready(client : Discord.Client, redis: RedisClient) : void {
    if(client.guilds != null){
    	console.log("Ready to begin! Serving in " + client.guilds.array().length + " guilds");
    	for(let guild of client.guilds.array()){
    	    console.log("Processing " + guild.name);
    	    //If I commit this slap me; I'm just testing the kicking.
            //guild.members.each((member) => redis.sadd(util.keyFromParts(guild.id, "status", message.member.id), "whitelist"));
            console.log("Assuming " + 
                guild.members
                    .map((member)=>member.displayName)
                    .join("\n") +
                defaults.whitelistMessage[Math.floor(Math.random() * defaults.whitelistMessage.length)]);
    	}
    }
}

export function onMessage(message : Discord.Message, client : Discord.Client, redis: RedisClient) : void {
    if(message.member != null){
        if(message.content.charAt(0) === "!"){
            let content = message.content.split(" ");
            let command = content.shift().substr(1);
            commands[command](message, content);
        }
        let statusKey = util.keyFromParts(message.guild.id, "status", message.member.id);
        redis.get(statusKey, 
        (err, status) => {
           if(status === "whitelist") return;
           if(status === "blacklist"){
                message.delete();
                message.author.createDM().then((channel) => channel.send(defaults.mutedMessage))
               return;
           }
            
            
           let key = util.keyFromParts(message.guild.id, "messages", message.member.id);
            redis.zadd(
                key,
                moment().add(defaults.messageRateDuration).valueOf(),
                JSON.stringify({
                    id : message.id,
                    message : message.content
                });
            );
            redis.zremrangebyscore(
                key,
                0,
                moment().valueOf()
            );
            redis.zcard(key, (error, result) =>{
                if(result > defaults.messageRateNumber){
                    if(status === "graylist"){
                        addToBlacklist(key, statusKey, redis, message);
                    }else{
                        redis.set(statusKey, "graylist");
                        message.author.createDM().then((channel) => channel.send(defaults.warningMessage));
                    }
                }else{
                    
                }
            });
            let beigelistDurationKey = util.keyFromParts(message.guild.id, "offBeigeList", message.member.id);
            redis.get(beigelistDurationKey, (err, res) => {
                if(res == null){
                    let expireMoment = moment().add(defaults.beigelistDuration).valueOf();
                    redis.set(beigelistDurationKey, "" + expireMoment);
                    redis.pexpireat(key, expireMoment);
                }else{
                    if(parseInt(res) < moment().valueOf()){
                        redis.set(statusKey, "whitelist");
                    }
                }
            });
        });
        
    }
}

function addToBlacklist (reportKey : string, statusKey : string, redis :RedisClient, message:Discord.Message) {
    console.log(`Adding ${message.member.displayName} to blacklist`)
    redis.set(statusKey, "blacklist");
    message.author.createDM().then((channel) => channel.send(defaults.mutedMessage));
    redis.pexpireat(reportKey, moment().add(defaults.reportDuration).valueOf());
    message.member.kick(`${message.member.displayName} has been muted and kicked for spam. For more information see https://${defaults.serverURL}/reports/${reportKey}`);
    message.member.setMute(true, `${message.member.displayName} has been muted and kicked for spam. For more information see https://${defaults.serverURL}/reports/${reportKey}`);
}
