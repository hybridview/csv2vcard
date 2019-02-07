var vCard = require('vcards-js');
var fs = require('fs');

var vCard = require('vcard-parser');
// https://github.com/Heymdall/vcard

var argv = require('minimist')(process.argv.slice(2), { alias: { o: 'output' } });


/*
a.moore:
Very ugly de-dupe script to fix my address book after I tried merging contacts multiple times. I had 
multiple duplicates, but could not clear everything because I had some older contacts I wanted to keep.

This version uses simple mapping so only the LAST of duplicates is used for the write. I'm sure this could be 
enhanced to perform merge operations without too much difficulty.
https://stackoverflow.com/questions/18498801/how-to-merge-two-object-values-by-keys
*/



var file = argv._[0] || 'contacts.vcf';
var outputDir = argv.output || './output';

fs.mkdir(outputDir, function () {
  console.log('mkdir ' + outputDir);
  fs.readFile(file, 'utf8', function (err, output) {
    console.log('Opened file ' + file);

    var combinedFilePath = outputDir + '/_merged-contacts.vcf';
    var stream = fs.createWriteStream(combinedFilePath);
    
    stream.once('open', function (fd) {
      //console.log(fd);
      parsedVcf = output.split('END:VCARD');

      var vcfItems = {};

      parsedVcf.forEach(function (raw) {
        raw += 'END:VCARD';
        var vcardContact = vCard.parse(raw);
        
        if (vcardContact !== undefined && vcardContact.fn !== undefined) {
          var key = generateKey(vcardContact);
          
          var dupe = findDuplicate(vcardContact, vcfItems);
          if (dupe !== undefined && dupe.fn !== undefined) {
            vcardContact = mergeContact(dupe, vcardContact);
          }
          vcfItems[key] = vcardContact;
          
        }
      });

      var cnt = 0;
      for (var m in vcfItems) {
        stream.write(vCard.generate(vcfItems[m]) + "\n");
        cnt++;
      }
      stream.end();
      console.log('\n' + cnt + ' combined contacts written to file ' + combinedFilePath);
    });
  });
});


function mergeContact(left, right){
  //TODO: NOT YET IMPLEMENTED.
  /*
  Loop through each item in RIGHT.
    if LEFT[item] or RIGHT[item] is null, easy... Just choose which one is not NULL.
    if LEFT[item] and RIGHT[item] are NOT NULL...
      if LEFT[item] and RIGHT[item] only have single value, then set LEFT[item] = RIGHT[item]
      if LEFT[item] and RIGHT[item] have multiple values (like TEL), then.....
        loop through all in RIGHT[item][]
          does RIGHT[item][i].meta.type exist in any LEFT[item][].meta.type?
            YES: 
              GET index of matching LEFT[item][].meta.type
              SET LEFT[item][index] = RIGHT[item][i]
            NO:
              ADD RIGHT[item][i] to LEFT[item][]
  */
  return right;
}

function generateKey(vcardContact) {
  // TODO: Do something more to try and normalize names so we can consider alt name formats as duplicate.
  var key = vcardContact.fn[0]['value'];
  return key;
}

function findDuplicate(vcardContact, vcfItems) {
  // TODO: Add intelligent duplicate detection code with level of fuzziness.
  var foundVcf = vcfItems[generateKey(vcardContact)];
  return foundVcf;
}
