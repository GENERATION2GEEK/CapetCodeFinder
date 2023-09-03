
var fs      = require('fs');
var downloadEmailAttachments = require('download-email-attachments');
var cron = require('node-cron');
var pdfParser = require('pdf-parser');


const dotenv = require('dotenv');
dotenv.config();

const moment = require('moment');
const MyImap = require('./myimap');
const logger = require('pino')({
    transport: {
        target: 'pino-pretty',
        options: {
            translateTime: false,
            colorize: true,
            ignore: 'pid,hostname,time',
        },
    },
});


var lastcode = "";
if (fs.existsSync("lastcode.txt")) {
  lastcode = fs.readFileSync("lastcode.txt", "utf8");
}
else {
  fs.writeFileSync("lastcode.txt", lastcode);
}
console.log(lastcode);


var facture_day = process.env.FACTURE_DAY;

var email = process.env.GMAIL_ID;
var password = process.env.GMAIL_APP_PASS;

var gmail_account = '"' + email + '":' + password + '@imap.gmail.com';
var cron_download_facture = '0 * * ' + facture_day + ' * *'; // facture day at 00:00:00

var ntfyserver = process.env.NTFY_SERVER;
var ntfytoken = process.env.NTFY_TOKEN;


var cron_reminder = '0 0 7 * * *'; // rappel à 7h du matin

function parseFactureDate(codestr) {
  codestr = codestr.toLowerCase();
  codestr = codestr.split(' ');

  var monthsarray = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var days_array = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  var change_day;
  var change_daynumb;
  var change_month;
  var change_year;

  for(day in days_array) {
    var daypos = codestr.findIndex(days_array[day]);
    change_day = days_array[day];
    if(daypos != -1) {
      change_daynumb = codestr[daypos+1];
      change_month = codestr[daypos+2];
      change_year = codestr[daypos+3];
      var date = new Date(change_year, monthsarray.indexOf(change_month), change_daynumb, 0, 0, 10);
      return date;
    }
  }
  return false;
  
}

// Post ntfy message
async function post_ntfy(message) {
  fetch(ntfyserver + "/capetude", {
    method: 'POST', // PUT works too
    body: message,
    headers: {
        'Authorization': 'Bearer ' + ntfytoken,
    }
})
}

cron.schedule(cron_download_facture, () => {
  var date = new Date();
  var day = date.getTime() - (1000 * 60 * 60 * 24 * 5); // 5 days ago
  date.setTime(day);

  var monthstr = (date.getMonth+1) < 10 ? "0" + (date.getMonth()+1) : (date.getMonth()+1);
  var daystr = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();

  var datestr = date.getFullYear() + "-" + monthstr + "-" + daystr;
  datestr = "2023" + "-" + "08" + "-" + "26"; // DEBUG
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
                post_ntfy(lastcode);
                
                fs.writeFileSync("lastcode.txt", lastcode);
              }
          
            }
        });
      }
    });
    
  });
    
});

cron.schedule(cron_reminder, () =>  { // Rappel du code avant le changement
  if (lastcode == "") {return;}
  var change_date = parseFactureDate(lastcode);
  if(change_date == false) {
    if(datenow.getDate() in [1,3,10]) {
      post_ntfy("Rappel : " + lastcode);
    }
    return;
  }
  var datenow = new Date();
  if (change_date.getDate() == datenow.getDate()) {
    post_ntfy("Rappel : " + lastcode);
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
    ssl: true,
    sender: "ne-pas-repondre@cap-etudes.com", // The library must be modified to support this option
    log: {warn: console.warn, debug: console.info, error: console.error, info: console.info },
    attachmentHandler: function (attachmentData, callback, errorCB) {
      // console.log(attachmentData)
      callback()
    },
  }, callback);
  
}


console.log(gmail_account);