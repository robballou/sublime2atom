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
  if (this.added == this.expects) {
    this.emit('done');
  }
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
            snippet.body = snippet.body.replace(/\$\{(\d)+:\s*\$\{TM_[^}]+\s*\}\s*\}/g, '$$1');

            data += "  '" + snippet.name + "':\n";
            data += "    'prefix': '" + snippet.prefix + "'\n";
            data += "    'body': '''" + snippet.body + "'''\n";
          });
        }
        fs.writeFile('output/' + snippetFilename, data);
      }
    }
  });
});

/**
 * Process the snippet into cson
 */
function processSnippet(snippetFile) {
  convertSnippets.expects++;

  fs.readFile(snippetFile, function(err, data) {
    if (err) {
      convertSnippets.expects--;
      return;
    }

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
  });
}
var count = 0;
/**
 * Scan the directory for snippets
 */
function scanDirectory(directory) {
  fs.readdir(directory, function(err, files) {
    if (!err) {
      files.forEach(function(filename) {
        // skip "hidden" files
        if (/^\./.test(filename)) { return; }

        fs.stat(path.join(directory, filename), function(err, stats) {
          if (!err) {
            // is this a directory? then keep scanning
            if (stats.isDirectory()) {
              scanDirectory(path.join(directory, filename));
            }
            // is this a snippet? then process it
            else if (/\.sublime-snippet$/.test(filename)) {
              count++;
              processSnippet(path.join(directory, filename));
            }
          }
        });
      });
    }
  });
}

fs.exists(process.argv[2], function(exists) {
  if (exists) {
    console.log('Starting converison');
  }

  var directory = process.argv[2];
  if (/\/$/.test(directory)) {
    directory = directory.substr(0, directory.length - 1);
  }
  scanDirectory(process.argv[2]);
});
