# Sublime Snippet Converter

Convert Sublime Snippets to Atom format.

**Work in progress**

## Usage

Clone the repo and then:

    npm install
    node convert.js [path to snippets]

It will recursively scan for `*.sublime-snippet` and convert to files based on directory name, placing everything into an `ouput` directory.
