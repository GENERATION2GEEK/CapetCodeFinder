
var fs      = require('fs');
var downloadEmailAttachments = require('download-email-attachments');
var cron = require('node-cron');
var pdfParser = require('pdf-parser');

const { Client, Intents } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES], partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });


var lastcode = "";
var facture_day = "28";

var gmail_account = ''; // your gmail account

var cron_download_facture = '0 0 0' + facture_day + ' * *'; // facture day at 00:00
cron_download_facture = '0 * * * * *';
var cron_reminder = '0 0 8 10 * *'; // 8h du matin le 10 du mois

var discord_user_id = "389176492963135489"; // discord user id

client.on('ready', async() => {
	console.log('Ready!');

  var discord_user = await client.users.fetch(discord_user_id);
  discord_user = await discord_user.createDM();

  
  
  cron.schedule(cron_download_facture, () => { // at 00h05 every day
    var date = new Date();

    var datestr = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + (date.getDate()-2);
    getFacture(datestr, gmail_account, function(result) {
      if(result.error) { 
        console.log(result.error);
        discord_user.send("Erreur : " + result.error);
        return
      }
      console.log("Done");
      console.log(result.latestTime);
      pdfParser.pdf2json("facture.pdf", function(error, pdf) {
        if(error != null){
          console.log(error);
        }else{
          var page0 = pdf["pages"][0]["texts"];
          
          page0.forEach(function(element) {
              if(element["text"].startsWith("Le code")) {
                var new_code = element["text"];
                if(lastcode != new_code) {
                  lastcode = new_code;
                  // console.log("New code : " + lastcode); // debug
                  discord_user.send(lastcode);
                }
            
              }
          });
        }
      });
      
    });
      
  });
  
  cron.schedule(cron_reminder, () =>  { // Rappel du code avant le changement
    if(lastcode != "") {
      discord_user.send(lastcode);
    }
  });

});

function delFacture() {
  try {
    fs.unlinkSync('facture.pdf');
  } catch (error) {
    console.log(error);
  }
}



function getFacture(datestr, account, callback) {
  delFacture();
  
  downloadEmailAttachments({
    //invalidChars: /[^A-Z]/g, //Regex of Characters that are invalid and will be replaced by X
    account: account, // all options and params besides account are optional
    filenameTemplate: 'facture.pdf',
    filenameFilter: /.pdf?$/,
    timeout: 3000,
    since: datestr,
    sender: "ne-pas-repondre@cap-etudes.com", // The library must be modified to support this option
    log: {warn: console.warn, debug: console.info, error: console.error, info: console.info },
    attachmentHandler: function (attachmentData, callback, errorCB) {
      // console.log(attachmentData)
      callback()
    },
  }, callback);
  
}


client.login('');