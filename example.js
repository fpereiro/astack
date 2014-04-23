// *** SETUP ***

var fs = require ('fs');
var a = require ('./astack.js');

// *** SEQUENTIAL EXECUTION ***

function write_file (aStack, path, data) {
   if (typeof (path) !== 'string') {
      a.aReturn (aStack, false);
   }
   else {
      fs.writeFile (path, data, {encoding: 'utf8'}, function () {
         console.log ('Current value of', path, 'is', data);
         a.aReturn (aStack, true);
      });
   }
}

function increment_file (aStack, path) {
   fs.readFile (path, function (error, data) {
      write_file (aStack, path, parseInt (data) + 1);
   });
}

// Uncomment example below. Be sure to leave commented the other three execution blocks, otherwise they will try to execute at the same time!.

/*
a.aCall (undefined, [
   [write_file, 'count.txt', '0'],
   [increment_file, 'count.txt'],
   [increment_file, 'count.txt'],
   [increment_file, 'count.txt']
]);
*/

// *** CONDITIONAL EXECUTION ***

function write_and_increment (aStack, path) {
   a.aCond (aStack, [write_file, path, '0'], {
      true: [increment_file, path],
      false: [function (aStack) {
         console.log ('There was an error when writing to the file', path, 'so no incrementing will take place.');
      }]
   });
}

// Uncomment example below. Be sure to leave commented the other three execution blocks, otherwise they will try to execute at the same time!.

/*
a.aCall (undefined, [
   [write_and_increment, 'count.txt'],
   [write_and_increment]
]);
*/

// *** PARALLEL EXECUTION ***

// Uncomment example below. Be sure to leave commented the other three execution blocks, otherwise they will try to execute at the same time!.

/*
a.aCall (undefined, [
   [a.aFork, [
      [write_and_increment, 'count_0.txt'],
      [write_and_increment, 'count_1.txt'],
      [write_and_increment, 'count_2.txt']
   ]],
   [function (aStack) {
      console.log ('aFork operation ready. Result was', aStack.last);
   }]
]);
*/

// *** TWO USEFUL FUNCTIONS ***

// Uncomment example below. Be sure to leave commented the other three execution blocks, otherwise they will try to execute at the same time!.

/*
a.aStop (undefined, false, [
   [a.log, 'was returned by the previous call'],
   [write_and_increment, 'count.txt'],
   [a.log, 'was returned by the previous call'],
   [write_and_increment],
   [a.log, 'was returned by the previous call'],
   [write_and_increment, 'count.txt'],
]);
*/
