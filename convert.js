/*jshint node:true*/
"use strict";

var fs = require('fs'),
  xmldoc = require('xmldoc');

if (process.argv.length != 3) {
  console.log('Usage: node convert.js [package directory]');
  return;
}

function processSnippet(snippetFile) {
  fs.readFile(snippetFile, function(err, data) {

  });
}

function scanDirectory(directory) {
  fs.readdir(directory, function(err, files) {
    if (!err) {
      files.forEach(function(filename) {
        // skip "hidden" files
        if (/^\./.test(filename)) { return; }

        fs.stat(directory + '/' + filename, function(err, stats) {
          if (!err) {
            if (stats.isDirectory()) {
              scanDirectory(directory + '/' + filename);
            }
            else if (/\.sublime-snippet$/.test(filename)) {
              // console.log(directory + '/' + filename);
              processSnippet(directory + '/' + filename);
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
