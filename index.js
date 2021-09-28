
var fs      = require('fs');
var downloadEmailAttachments = require('download-email-attachments');

var lastcode = "";

var onEnd = function(result) {
  if(result.error) { 
    console.log(result.error);
    return
  }
  console.log("Done");
  console.log(result.latestTime);
};


function getFacture(account) {
  var date = new Date();

  var datestr = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + "27";
  
  downloadEmailAttachments({
    //invalidChars: /[^A-Z]/g, //Regex of Characters that are invalid and will be replaced by X
    account: '"v.moucadeau@gmail.com":@imap.gmail.com', // all options and params besides account are optional
    filenameTemplate: 'facture.pdf',
    filenameFilter: /.pdf?$/,
    timeout: 3000,
    since: datestr,
    log: {warn: console.warn, debug: console.info, error: console.error, info: console.info },
    attachmentHandler: function (attachmentData, callback, errorCB) {
      console.log(attachmentData)
      callback()
    },
  }, onEnd)
  
}

