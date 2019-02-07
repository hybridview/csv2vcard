var parse = require('csv-parse');
var vCard = require('vcards-js');
var fs = require('fs');

var argv = require('minimist')(process.argv.slice(2), { alias: { o: 'output' }});

var file = argv._[0] || 'contacts.csv';
var vcardContact;
var path;
var outputDir = argv.output || './output';

function getColumns(header, match) {
  var cols = [];
  header.forEach(function(v, i) {
    if (v.toLowerCase().match(match)) {
      cols.push(i);
    }
  });
  return cols;
}

function getEntries(entry, cols) {
  var r = cols.map(i => entry[i]).filter(v => (v !== undefined && v !== ""));
  return r.length <= 1 ? r[0] : r;
}

fs.mkdir(outputDir, function() {
  fs.readFile(file, 'utf8', function(err, output) {
    console.log('Opened source file ' + file);
    var combinedFilePath = outputDir + '/_all-contacts.vcf';
    var combinedOutFileStream = fs.createWriteStream(combinedFilePath);
    combinedOutFileStream.once('open', function(fd) {
      parse(output, function(err, parsedCSV){
        if (err) {
          throw 'error parsing file: ' + err;
        }
        var header = parsedCSV.shift();
        var firstNameCol = header.findIndex(v => v.toLowerCase() === 'first name');
        var middleNameCol = header.findIndex(v => v.toLowerCase() === 'middle name');
        var lastNameCol = header.findIndex(v => v.toLowerCase() === 'last name');
        var cellPhoneCols = getColumns(header, /(primary|mobile|personal) phone/);
        var homePhoneCols = getColumns(header, 'home phone');
        var workPhoneCols = getColumns(header, /(company.*|business|work|assistant.s) phone/);
        var otherPhoneCols = getColumns(header, 'other phone');
        var emailCols = getColumns(header, /e.?mail .*address/);

        parsedCSV.forEach(function(contact) {
          // positions from Outlook contacts schema in the README file of this project
          var firstName = contact[firstNameCol];
          var middleName = contact[middleNameCol];
          var lastName = contact[lastNameCol];

          if (firstName || lastName) {
            var vcardName = [(firstName || ''), (middleName || ''), (lastName || '')].join(' ').trim();
            console.log('Adding contact: ' + vcardName);
            vcardContact = vCard();
            vcardContact.firstName = firstName || '';
            vcardContact.middleName = middleName || '';
            vcardContact.lastName = lastName || '';
            
            vcardContact.cellPhone = getEntries(contact, cellPhoneCols);
            vcardContact.homePhone = getEntries(contact, homePhoneCols);
            vcardContact.workPhone = getEntries(contact, workPhoneCols);
            vcardContact.otherPhone = getEntries(contact, otherPhoneCols);
            vcardContact.email = getEntries(contact, emailCols);
            // TODO: Identify useful entries from Outlook column list below and include in VCard.
            // Name:      Title,First Name,Middle Name,Last Name,Suffix,
            // Company 1: Company,Department,Job Title,Office Location,Organizational ID Number,
            // Company 2: Business Street,Business Street 2,Business Street 3,Business City,Business State,Business Postal Code,Business Country/Region,
            // Company 3: Business Address PO Box, Manager's Name,Billing Information,Directory Server,
            // Home:      Home Street,Home Street 2,Home Street 3,Home City,Home State,Home Postal Code,Home Country/Region,
            // Other Adr :Other Street,Other Street 2,Other Street 3,Other City,Other State,Other Postal Code,Other Country/Region,Other Address PO Box,
            // Phone 1:   Assistant's Phone,Business Fax,Business Phone,Business Phone 2,Callback,Car Phone,Company Main Phone,Home Fax,Home Phone,Home Phone 2,ISDN,
            // Phone 2:   Mobile Phone,Other Fax,Other Phone,Pager,Primary Phone,Radio Phone,TTY/TDD Phone,Telex,Account,Anniversary,Assistant's Name,
            // Email 1:   E-mail Address,E-mail Type,E-mail Display Name,E-mail 2 Address,E-mail 2 Type,E-mail 2 Display Name,
            // Email 2:   E-mail 3 Address,E-mail 3 Type,E-mail 3 Display Name,Gender,Government ID Number,Hobby,Home Address PO Box,Initials,
            // Misc 1:    Birthday,Categories,Children,
            // Misc 2:    Internet Free Busy,Keywords,Language,Location,Mileage,Notes,
            // Misc 3:    Priority,Private,Profession,Referred By,Sensitivity,Spouse,User 1,User 2,User 3,User 4,Web Page


            path = outputDir + '/';
            // join with space, trim extra space, replace whitespace with '-'
            path += vcardName.toLowerCase().replace(/[\W]{1,}/ig, '-');
            path += '.vcf';
            vcardContact.saveToFile(path);

            console.log('\tIndividual VCard contact saved to: ' + path);
            combinedOutFileStream.write(vcardContact.getFormattedString()  + "\n");
          }
        });
        combinedOutFileStream.end();
        console.log('\nCombined contacts saved to: ' + combinedFilePath);
      });

    });
  });
});
