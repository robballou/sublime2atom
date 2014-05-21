/*jshint node:true*/
"use strict";

var fs = require('fs'),
  events = require('events'),
  util = require('util'),
  path = require('path'),
  xmldoc = require('xmldoc');

if (process.argv.length != 3) {
  console.log('Usage: node convert.js [package directory]');
  return;
}

var Snippets = function() {
  this.added = 0;
  this.expects = 0;
  this.snippets = {};
};
util.inherits(Snippets, events.EventEmitter);

Snippets.prototype.addSnippet = function(filename, snippet) {
  if (typeof this.snippets[filename] === 'undefined') {
    this.snippets[filename] = {};
  }

  if (typeof this.snippets[filename][snippet.scope] === 'undefined') {
    this.snippets[filename][snippet.scope] = [];
  }

  this.snippets[filename][snippet.scope].push(snippet);

  this.added++;
};

var convertSnippets = new Snippets();
convertSnippets.on('done', function() {
  var self = this;
  // create a directory for the snippets
  fs.mkdir('output', function() {
    // write the snippets
    for (var file in self.snippets) {
      if (self.snippets.hasOwnProperty(file)) {
        var snippetFilename = file + '.cson',
          data = '';
        snippetFilename = snippetFilename.toLowerCase().replace(/ /g, '-');
        for (var scope in self.snippets[file]) {
          if (!self.snippets[file].hasOwnProperty(scope)) { continue; }

          data += "'." + scope + "':\n";
          self.snippets[file][scope].forEach(function(snippet) {
            // from https://github.com/atom/apm/blob/master/src/package-converter.coffee
            snippet.body = snippet.body.replace(/\$\{TM_[A-Z_]+:([^}]+)}/g, '$1');
            snippet.body = snippet.body.replace(/\$\{(\d)+:\s*\$\{TM_[^}]+\s*\}\s*\}/g, '$$1');

            // conversions
            snippet.body = snippet.body.replace(/\${1:\${TM_FILENAME\/\(\[\^\\\.\]\+\)\\\.\.\*\/\$1\/}/g, '${1:hook');
            snippet.body = snippet.body.replace(/\${TM_FILENAME\/\(\[\^\\\.\]\+\)\\\.\.\*\/\$1\/}/g, '${1:hook}');

            data += "  '" + snippet.name + "':\n";
            data += "    'prefix': '" + snippet.prefix + "'\n";
            data += "    'body': '''" + snippet.body + "'''\n";
          });
        }
        fs.writeFile('output/' + snippetFilename, data);
        console.log('Updated: output/' + snippetFilename);
      }
    }
    console.log('Done');
  });
});

/**
 * Process the snippet into cson
 */
function processSnippet(snippetFile) {
  convertSnippets.expects++;

  var data = fs.readFileSync(snippetFile);

  var snippetFilename = path.basename(path.dirname(snippetFile)),
    snippet = new xmldoc.XmlDocument(data),
    thisSnippet = {};
  snippet.eachChild(function(child) {
    thisSnippet[child.name] = child.val;
  });

  var csonSnippet = {
    name: thisSnippet.tabTrigger,
    prefix: thisSnippet.tabTrigger,
    body: thisSnippet.content,
    scope: thisSnippet.scope
  };

  convertSnippets.addSnippet(snippetFilename, csonSnippet);
}
var count = 0;
/**
 * Scan the directory for snippets
 */
function scanDirectory(directory) {
  var files = fs.readdirSync(directory);
  files.forEach(function(filename) {
    // skip "hidden" files
    if (/^\./.test(filename)) { return; }
    var stats = fs.statSync(path.join(directory, filename));
    // is this a directory? then keep scanning
    if (stats.isDirectory()) {
      scanDirectory(path.join(directory, filename));
    }
    // is this a snippet? then process it
    else if (/\.sublime-snippet$/.test(filename)) {
      count++;
      processSnippet(path.join(directory, filename));
    }
  });
}

if (fs.existsSync(process.argv[2])) {
  console.log('Starting converison');
  var directory = process.argv[2];

  // check if the directory ends with a slash and remove it
  if (/\/$/.test(directory)) {
    directory = directory.substr(0, directory.length - 1);
  }

  scanDirectory(process.argv[2]);
  convertSnippets.emit('done');
  console.log('Done');
}
