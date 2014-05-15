/*jshint node:true*/
"use strict";

var fs = require('fs'),
  path = require('path'),
  xmldoc = require('xmldoc');

if (process.argv.length != 3) {
  console.log('Usage: node convert.js [package directory]');
  return;
}

/**
 * Process the snippet into cson
 */
function processSnippet(snippetFile) {
  fs.readFile(snippetFile, function(err, data) {
    if (err) { return; }

    var snippetDir = path.basename(path.dirname(snippetFile)),
      snippet = new xmldoc.XmlDocument(data),
      thisSnippet = {};
    snippet.eachChild(function(child) {
      thisSnippet[child.name] = child.val;
    });
    console.log(thisSnippet);
  });
}

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
