/*
aStack - v3.0.0

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Run the examples by either including the script in a webpage or by running `node example` at the command prompt.
*/

(function () {

   // *** SETUP ***

   var isNode = typeof exports === 'object';

   var a  = isNode ? require ('./astack.js') : window.a;

   var fs = isNode ? require ('fs') : {

      delay: function (callback, args) {
         setTimeout (function () {
            callback.apply (callback, args);
         }, 100);
      },

      writeFile: function (path, data, encoding, callback) {
         window.files [path] = data;
         fs.delay (callback, []);
      },

      readFile: function (path, callback) {
         window.files = window.files || {};
         fs.delay (callback, [null, window.files [path]]);
      },

      unlink: function (path, callback) {
         delete window.files [path];
         fs.delay (callback, []);
      },

      readdir: function (path, callback) {
         if (path !== '.') return fs.delay (callback, ['Path does not exist!']);
         var output = [];
         for (var key in files) {
            output.push (key);
         }
         fs.delay (callback, [null, output]);
      }
   }

   var TESTS = [];

   // *** CLEANUP ***

   var deleteFile = function (s, path) {
      fs.unlink (path, function (error) {
         if (error) return a.return (s, false);
                    return a.return (s, true);
      });
   }

   var CLEANUP = function (s, files) {
      a.call (s, [
         [a.fork, files, function (v) {
            return [deleteFile, 'count' + v + '.txt'];
         }],
         function (s) {
            for (var key in s.last) {
               if (s.last [key] !== true) return a.return (s, false);
            }
            a.return (s, true);
         }
      ]);
   }

   // *** SEQUENTIAL EXECUTION ***

   // Read the file at `path`
   // If the file cannot be read, we assume it doesn't exist. Hence, the next async function will receive `undefined`
   // If the file can be read, the next async function will receive `data`

   var readFile = function (s, path, mute) {
      fs.readFile (path, function (error, data) {
         if (error) {
            if (! mute) console.log ('File', path, 'is empty');
            a.return (s, undefined);
         }
         else {
            if (! mute) console.log ('File', path, 'contains', data + '');
            a.return (s, data + '');
         }
      });
   }

   // Write `data` to the file at `path`
   // Whether successful or not, when the operation is complete, pass `data` to the next async function.

   var writeFile = function (s, path, data) {
      fs.writeFile (path, data, {encoding: 'utf8'}, function (error) {
         a.return (s, data);
      });
   }

   var SEQUENTIAL = function (s) {
      console.log ('Starting SEQUENTIAL test.');
      a.call (s, [
         // Read the file for the first time.
         [readFile,  'count.txt'],
         // Write 0 to the file.
         [writeFile, 'count.txt', 0],
         // Read the file for the second time.
         [readFile,  'count.txt'],
         // Write 1 to the file.
         [writeFile, 'count.txt', 1],
         // Read the file for the third time.
         [readFile,  'count.txt'],
      ]);
   }

   TESTS.push ([SEQUENTIAL, '1']);
   TESTS.push ([[CLEANUP, ['']], true]);

   // Read the file at `path` using `readFile`.
   // If the result of `readFile` was `undefined`, write 0 to the file at path.
   // Otherwise, parse the result of `readFile` into an integer, increment it, and write it to the file.

   var incrementFile = function (s, path, mute) {
      a.cond (s, [readFile, path, mute], {
         undefined: [writeFile, path, 0],
         default:   function (s) {
            var data = parseInt (s.last);
            writeFile (s, path, data + 1);
         }
      });
   }

   var CONDITIONAL = function (s) {
      console.log ('Starting CONDITIONAL test.');
      a.call (s, [
         // Increment the file for the first time.
         [incrementFile, 'count.txt'],
         // Increment the file for the second time.
         [incrementFile, 'count.txt'],
         // Increment the file for the third time.
         [incrementFile, 'count.txt']
      ]);
   }

   TESTS.push ([CONDITIONAL, 2]);
   TESTS.push ([[CLEANUP, ['']], true]);

   // *** PARALLEL EXECUTION ***

   // Invoke `incrementFile` twice in a row for each of three files.
   // After finishing the operation, pass an array of results to the next asynchronous function.

   var PARALLEL = function (s) {
      console.log ('Starting PARALLEL test.');
      a.call (s, [
         [a.fork, ['count0.txt', 'count1.txt', 'count2.txt'], function (v) {
            return [
               // Invoke `incrementFile` for the first time.
               [incrementFile, v],
               // Invoke `incrementFile` for the second time.
               [incrementFile, v]
            ];
         }],
         function (s) {
            console.log ('Parallel operation ready. Result was', s.last);
            a.return (s, s.last);
         }
      ]);
   }

   TESTS.push ([PARALLEL, [1, 1, 1]]);
   TESTS.push ([[CLEANUP, [0, 1, 2]], true]);

   // *** TWO USEFUL FUNCTIONS ***

   var STOP = function (s) {
      console.log ('Starting STOP test.');
      a.stop (s, 1, [
         [incrementFile, 'count.txt'],
         [incrementFile, 'count.txt'],
         // The steps below won't be executed
         [incrementFile, 'count.txt'],
         [incrementFile, 'count.txt']
      ]);
   }

   TESTS.push ([STOP, 1]);
   TESTS.push ([[CLEANUP, ['']], true]);

   var EXAMPLE1 = function (s) {
      console.log ('Starting EXAMPLE1.');

      var async1 = function (data, callback) {
         callback (data);
      }

      var async2 = async1;
      var async3 = async2;

      var asyncSequence1 = function (data, callback) {
         async1 (data, function (data) {
            async2 (data, function (data) {
               async3 (data, function (data) {
                  callback (data);
               });
            });
         });
      }

      asyncSequence1 ('This is data!', function (data) {
         console.log (data)
      });

      var async4 = function (s, data) {
         // If data is received as an argument, leave it as is. Otherwise, set data to `s.last`.
         data = data || s.last;
         // Do stuff to data here...
         a.return (s, data);
      }

      var async5 = async4;
      var async6 = async5;

      var asyncSequence2 = function (s, data, callback) {
         a.call (s, [[async4, data], async5, async6, callback]);
      }

      asyncSequence2 (s, 'This is data!', function (s) {
         console.log (s.last);
         a.return (s, s.last);
      });
   }

   TESTS.push ([EXAMPLE1, 'This is data!']);

   var EXAMPLE2 = function (s) {
      console.log ('Starting EXAMPLE2.');

      s.last = 0;

      var someFunction = function (s) {
         a.return (s, s.last + 1);
      }

      a.call (s, [
         [a.call, someFunction],
         [a.call, [someFunction, 'arg1', 'arg2']],
         [a.call, [
            [someFunction, 'arg1', 'arg2'],
            [someFunction, 'arg3', 'arg4']
         ]],
         [a.call, [
            [someFunction],
            someFunction
         ]],
         [a.call, [[
            [someFunction, 'arg1', 'arg2'],
            [someFunction, 'arg3', 'arg4']
         ]]],
         [a.call, [[
            [],
            [[[]], [someFunction, 'arg1', 'arg2'], []],
            [someFunction, 'arg3', 'arg4']
         ]]],
         [a.call, [
            [someFunction, 'arg1', 'arg2'],
            [someFunction, 'arg1', 'arg2']
         ]],
         function (s) {
            console.log ('Iterations done:', s.last);
            a.return (s, s.last);
         }
      ]);
   }

   TESTS.push ([EXAMPLE2, 12]);

   var EXAMPLE3 = function (s) {
      console.log ('Starting EXAMPLE3.');

      var async1 = function (s) {
         a.call (s, /invalid/);
      }

      a.call (s, [
         [async1],
         function (s) {
            console.log ('The last asynchronous function returned', s.last);
            a.return (s, s.last);
         }
      ]);
   }

   TESTS.push ([EXAMPLE3, false]);

   var EXAMPLE4 = function (s) {
      console.log ('Starting EXAMPLE4.');
      a.call (s, [
         [function (s) {
            s.value = 1;
            a.return (s);
         }],
         function (s) {
            a.return (s, 2);
         },
         function (s) {
            console.log ('s.value is', value, 'and s.last is', s.last);
            var value = s.value;
            delete s.value;
            a.return (s, [value, s.last]);
         }
      ]);
   }

   TESTS.push ([EXAMPLE4, [1, 2]]);

   var EXAMPLE5 = function (s) {
      console.log ('Starting EXAMPLE5.');

      var async1 = function (s) {
         console.log (arguments [1], arguments [2]);
         a.return (s, s.last);
      }

      a.call (s, [
         [function (s) {
            s.data = 'b52';
            a.return (s, true);
         }],
         [async1, '@data', '@last'],
         function (s) {
            delete s.data;
            a.return (s, {data: 'b52', moreData: [1, 2, 3]});
         },
         [async1, '@last.data', '@last.moreData.1'],
         [function (s, first, second, third) {
            a.return (s, first === 'b52' && second === 2 && third === undefined)
         }, '@last.data', '@last.moreData.1', '@last.does.not.exist']
      ]);
   }

   TESTS.push ([EXAMPLE5, true]);

   var EXAMPLE6 = function (s) {
      console.log ('Starting EXAMPLE6.');

      a.call (s, [
         [function (s) {
            // Incorrect! Keys with dots in their name won't be resolved correctly.
            s ['key.with.dots'] = 'b52';
            a.return (s, true);
         }],
         [function (s, data) {
            // data will be `undefined`
            console.log ('data is', data);
            a.return (s, data);
         }, '@key.with.dots'],
         function (s) {
            delete s ['key.with.dots'];
            a.return (s, s.last);
         }
      ]);
   }

   TESTS.push ([EXAMPLE6, undefined]);

   var EXAMPLE7 = function (s) {
      console.log ('Starting EXAMPLE7.');
      var async1 = function (s, data) {
         a.return (s, data);
      }
      a.call (s, [
         [a.fork, [
            [async1, 'a'],
            [async1, 'b'],
            [async1, 'c']
         ]],
         a.log
      ]);
   }

   TESTS.push ([EXAMPLE7, ['a', 'b', 'c']]);

   var EXAMPLE8 = function (s) {
      console.log ('Starting EXAMPLE8.');
      var async1 = function (s, data) {
         a.return (s, data);
      }
      a.call (s, [
         [a.fork, {
            first:  [async1, 'a'],
            second: [async1, 'b'],
            third:  [async1, 'c']
         }],
         function (s) {
            console.log (s.last);
            a.return (s, JSON.stringify (s.last) === JSON.stringify ({first: 'a', second: 'b', third: 'c'}));
         }
      ]);
   }

   TESTS.push ([EXAMPLE8, true]);

   var EXAMPLE9 = function (s) {
      console.log ('Starting EXAMPLE9.');
      var async1 = function (s, data) {
         a.return (s, data);
      }
      a.fork (s, ['a', 'b', 'c'], function (v) {
         console.log (v);
         return [async1, v];
      });
   }

   TESTS.push ([EXAMPLE9, ['a', 'b', 'c']]);

   var EXAMPLE10 = function (s) {
      console.log ('Starting EXAMPLE10.');

      var async1 = function (s) {
         console.log (s.last);
         a.return (s, true);
      }

      a.fork (s, [[async1], async1, async1]);
   }

   TESTS.push ([EXAMPLE10, [true, true, true]]);

   var EXAMPLE11 = function (s) {
      console.log ('Starting EXAMPLE11.');
      var total = 1000;
      var data = [];
      while (total > 0) {
         data.push (total--);
      }
      var waitCounter = 0;
      a.stop (s, false, [
         [a.fork, data, function (v) {
            return [incrementFile, 'count' + v + '.txt', true];
         }, {max: 200}],
         function (s) {
            for (var key in s.last) {
               if (s.last [key] !== 0) return a.return (s, false);
            }
            a.return (s, true);
         },
         a.log,
         [a.fork, data, function (v) {
            return [deleteFile, 'count' + v + '.txt'];
         }, {max: 200, beat: 200, test: function () {
            waitCounter++;
            if (waitCounter > 4) return true;
            console.log ('Waiting until 5. waitCounter', waitCounter);
         }}],
         function (s) {
            for (var key in s.last) {
               if (s.last [key] !== true) return a.return (s, false);
            }
            a.return (s, true);
         }
      ]);
   }

   TESTS.push ([EXAMPLE11, true]);

   var EXAMPLE12 = function (s) {

      console.log ('Starting EXAMPLE12.');

      var async1 = function (s, data) {
         a.return (s, data);
      }

      var item = 10000;
      var queue = [];

      a.fork (s, queue, function (v) {
         return [async1, v];
      }, {max: 1000, beat: 100});

      while (item > 0) {
         queue.push (item--);
      }
   }

   TESTS.push ([EXAMPLE12, function () {
      item = 10000;
      var output = [];
      while (item > 0) {
         output.push (item--);
      }
      return output;
   } ()]);

   var EXAMPLE13 = function (s) {
      console.log ('Starting EXAMPLE13.');

      // http://stackoverflow.com/a/19323120
      s.circular = [];
      s.circular [0] = s.circular;

      s.data = [];

      var inner = function (s) {
         var random = Math.random ();
         console.log ('Pushing', random, 'to s.data');
         s.data.push (random);
         a.return (s, true);
      }

      a.call (s, [
         [a.fork, [[inner], inner, inner]],
         a.log,
         function (s) {
            var data = s.data;
            delete s.data;
            delete s.circular;
            a.return (s, data.length);
         },
      ]);
   }

   TESTS.push ([EXAMPLE13, 1]);

   var EXAMPLE14 = function (s) {
      console.log ('Starting EXAMPLE14.');

      var async1 = function (s, path) {
         fs.readdir (path, function (error, files) {
            if (error) {
               console.log (error);
               return a.return (s, false);
            }
            a.return (s, files);
         });
      }

      var async2 = function (s, path) {
         var read = a.convert (fs.readdir);
         read (s, path);
      }

      var async3 = function (s, path) {
         var read = a.convert (fs.readdir, function (error) {
            console.log ('There was an error:', error);
            return undefined;
         });
         read (s, path);
      }

      a.stop (s, false, [
         [async1, '.'],
         function (s) {
            a.return (s, s.last.length);
         },
         a.log,
         [async2, '.'],
         function (s) {
            a.return (s, s.last.length);
         },
         a.log,
         [async3, '.'],
         function (s) {
            a.return (s, s.last.length);
         },
         a.log,
         [a.cond, [async1, 'boom'], {
            false:   [a.return, true],
            default: [a.return, false]
         }],
         a.log,
         [a.cond, [async2, 'boom'], {
            false:   [a.return, true],
            default: [a.return, false]
         }],
         a.log,
         [a.cond, [async3, 'boom'], {
            undefined: [a.return, true],
            default:   [a.return, false]
         }],
      ]);
   }

   TESTS.push ([EXAMPLE14, true]);

   // *** EXECUTING ALL THE TESTS ***

   for (var test in TESTS) {
      var map = {default: [a.return, false]};
      map [TESTS [test] [1]] = [a.return, true];
      TESTS [test] = [a.cond, [TESTS [test] [0]], map];
   }

   TESTS.push ([a.return, true]);

   a.cond ([a.stop, false, TESTS], {
      true:  function () {console.log ('==========================\nALL TESTS WERE SUCCESSFUL!\n==========================')},
      false: function () {console.log (  '========================\nONE OF THE TESTS FAILED!\n========================')}
   });

}) ();
