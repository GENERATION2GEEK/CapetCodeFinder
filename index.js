
var fs      = require('fs');
var downloadEmailAttachments = require('download-email-attachments');
var cron = require('node-cron');
var pdfParser = require('pdf-parser');
const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

const { Client, Intents } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES], partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

var lastcode = "";
if (fs.existsSync("lastcode.txt")) {
  lastcode = fs.readFileSync("lastcode.txt", "utf8");
}
else {
  fs.writeFileSync("lastcode.txt", lastcode);
}
console.log(lastcode);


var facture_day = process.env.FACTURE_DAYS;

var email = process.env.GMAIL_ID;
var password = process.env.GMAIL_APP_PASS;

var gmail_account = '"' + email + '":' + password + '@imap.gmail.com';
//var cron_download_facture = '0 * * ' + facture_day + ' * *'; // facture day at 00:00:00
cron_download_facture = '0 * * * * *'; // facture day at 00:00:00



var discord_users = process.env.DISCORD_USERS.split(",");

var cron_reminder = '0 * * * * *'; // rappel à 7h du matin

function parseFactureDate(codestr) {
  var monthsarray = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  codestr = codestr.split(' ');
  var day = codestr[10];
  var monthname = codestr[11];
  var year = codestr[12];
  var month = monthsarray.indexOf(monthname) + 1;
  var date = new Date(year, month, day);
  return date;
}

async function send_discord_msg(message) {
  for (const id of discord_users) {
    var discord_user = await client.users.fetch(id);
    discord_user = await discord_user.createDM();
    discord_user.send(message);
  }
}

// Send a sms message through the Free Mobile API
async function send_sms(message) {
  message_encoded = encodeURIComponent(message);
  var url = "https://smsapi.free-mobile.fr/sendmsg?user=" + process.env.FREE_SMS_USERID + "&pass=" + process.env.FREE_SMS_PASSKEY + "&msg=" + message_encoded;
  https.get(url, (resp) => {}).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}

client.on('ready', () => {
	console.log('Ready!');
  cron.schedule(cron_download_facture, () => {
    var date = new Date();
  
    var datestr = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + (date.getDate()-5);
    datestr = "2022" + "-" + "04" + "-" + "26"; // DEBUG
    getFacture(datestr, gmail_account, function(result) {
      if(result.error) { 
        console.log(result.error);
        return
      }
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
                  console.log("New code : " + lastcode); // debug
                  send_discord_msg(lastcode);
                  send_sms(lastcode);
                  
                  fs.writeFileSync("lastcode.txt", lastcode);
                }
            
              }
          });
        }
      });
      
    });
      
  });
  
  

});

cron.schedule(cron_reminder, () =>  { // Rappel du code avant le changement
  if (lastcode == "") {return;}
  var change_date = parseFactureDate(lastcode);
  var datenow = new Date();
  if (change_date.getDay() == datenow.getDay()) {
    send_discord_msg("Rappel : " + lastcode);
    send_sms("Rappel : " + lastcode);
  }
});

function delFacture() {
  try {
    fs.unlinkSync('facture.pdf');
  } catch (error) {
    // console.log(error);
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

client.login(process.env.DISCORD_TOKEN);
