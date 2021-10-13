
var fs      = require('fs');
var downloadEmailAttachments = require('download-email-attachments');

var lastcode = "";

function delFacture() {
  // delete a file
  try {
    fs.unlinkSync('facture.pdf');
  } catch (error) {
    console.log(error);
  }
}

var onEnd = function(result) {
  if(result.error) { 
    console.log(result.error);
    return
  }
  console.log("Done");
  console.log(result.latestTime);
};

function getLastCode(file) {
  var pdfParser = require('pdf-parser');


  pdfParser.pdf2json(file, function (error, pdf) {
      if(error != null){
          console.log(error);
      }else{
          var page0 = pdf["pages"][0];
          page0.forEach(function(element) {
              console.log(element);
          })
      }
  });

}


function getFacture(account) {
  delFacture();
  var date = new Date();

  var datestr = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + "27";
  
  downloadEmailAttachments({
    //invalidChars: /[^A-Z]/g, //Regex of Characters that are invalid and will be replaced by X
    account: '"v.moucadeau@gmail.com":pbkfqnwmcdocqrfc@imap.gmail.com', // all options and params besides account are optional
    filenameTemplate: 'facture.pdf',
    filenameFilter: /.pdf?$/,
    timeout: 3000,
    since: datestr,
    sender: "e-pas-repondre@capetude.com",
    log: {warn: console.warn, debug: console.info, error: console.error, info: console.info },
    attachmentHandler: function (attachmentData, callback, errorCB) {
      console.log(attachmentData)
      callback()
    },
  }, onEnd)
  
}

getFacture("loegjl");