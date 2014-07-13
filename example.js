// *** SETUP ***

var fs = require ('fs');
var a = require ('./astack.js');

// *** SEQUENTIAL EXECUTION ***

function write_file (aStack, path, data) {
   if (typeof (path) !== 'string') {
      a.return (aStack, false);
   }
   else {
      fs.writeFile (path, data, {encoding: 'utf8'}, function () {
         console.log ('Current value of', path, 'is', data);
         a.return (aStack, true);
      });
   }
}

function increment_file (aStack, path) {
   fs.readFile (path, function (error, data) {
      write_file (aStack, path, parseInt (data) + 1);
   });
}

function SEQUENTIAL (aStack) {
   console.log ('Starting SEQUENTIAL test.');
   a.call (aStack, [
      [write_file, 'count.txt', '0'],
      [increment_file, 'count.txt'],
      [increment_file, 'count.txt'],
      [increment_file, 'count.txt']
   ]);
}

// *** CONDITIONAL EXECUTION ***

function write_and_increment (aStack, path) {
   a.cond (aStack, [write_file, path, '0'], {
      true: [increment_file, path],
      false: [function (aStack) {
         console.log ('There was an error when writing to the file', path, 'so no incrementing will take place.');
         a.return (aStack, false);
      }]
   });
}

function CONDITIONAL (aStack) {
   console.log ('Starting CONDITIONAL test.');
   a.call (aStack, [
      [write_and_increment, 'count.txt'],
      [write_and_increment]
   ]);
}

// *** PARALLEL EXECUTION ***

function PARALLEL (aStack) {
   console.log ('Starting PARALLEL test.');
   a.call (aStack, [
      [a.fork, [
         [write_and_increment, 'count_0.txt'],
         [write_and_increment, 'count_1.txt'],
         [write_and_increment, 'count_2.txt']
      ]],
      [function (aStack) {
         console.log ('a.fork operation ready. Result was', aStack.last);
         a.return (aStack, true);
      }]
   ]);
}

// *** TWO USEFUL FUNCTIONS ***

function STOP (aStack) {
   console.log ('Starting STOP test.');
   a.stop (aStack, false, [
      [a.log, 'was returned by the previous call'],
      [write_and_increment, 'count.txt'],
      [a.log, 'was returned by the previous call'],
      [write_and_increment],
      [a.log, 'was returned by the previous call'],
      [write_and_increment, 'count.txt'],
   ]);
}

// *** INVOKING ALL THE EXAMPLES IN SEQUENCE ***

a.call ([
   [SEQUENTIAL],
   [CONDITIONAL],
   [PARALLEL],
   [STOP]
]);
