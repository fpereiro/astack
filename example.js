/*
aStack - v2.4.2

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
         window.files = window.files || {};
         window.files [path] = data;
         fs.delay (callback, []);
      },

      readFile: function (path, callback) {
         fs.delay (callback, [null, window.files [path]]);
      },

      unlink: function (path, callback) {
         window.files [path] = undefined;
         fs.delay (callback, []);
      }
   }

   // *** SEQUENTIAL EXECUTION ***

   function writeFile (aStack, path, data, mute) {
      if (typeof (path) !== 'string') {
         a.return (aStack, false);
      }
      else {
         fs.writeFile (path, data, {encoding: 'utf8'}, function (error) {
            if (error) return a.return (aStack, false);
            if (! mute) console.log ('Current value of', path, 'is', data);
            a.return (aStack, data);
         });
      }
   }

   function incrementFile (aStack, path, mute) {
      fs.readFile (path, function (error, data) {
         writeFile (aStack, path, parseInt (data) + 1, mute);
      });
   }

   function SEQUENTIAL (aStack) {
      console.log ('Starting SEQUENTIAL test.');
      a.call (aStack, [
         [writeFile, 'count.txt', '0'],
         [incrementFile, 'count.txt'],
         [incrementFile, 'count.txt'],
         [incrementFile, 'count.txt']
      ]);
   }

   // *** CONDITIONAL EXECUTION ***

   function writeAndIncrement (aStack, path, mute) {
      a.cond (aStack, [writeFile, path, '0', mute], {
         false: [function (aStack) {
            console.log ('There was an error when writing to the file', path, 'so no incrementing will take place.');
            a.return (aStack, false);
         }],
         default: [incrementFile, path, mute]
      });
   }

   function CONDITIONAL (aStack) {
      console.log ('Starting CONDITIONAL test.');
      a.call (aStack, [
         [writeAndIncrement, 'count.txt'],
         [writeAndIncrement]
      ]);
   }

   // *** PARALLEL EXECUTION ***

   function PARALLEL (aStack) {
      console.log ('Starting PARALLEL test.');
      a.call (aStack, [
         [a.fork, [0, 1, 2], function (v) {
            return [writeAndIncrement, 'count' + v + '.txt'];
         }],
         [function (aStack) {
            console.log ('a.fork operation ready. Result was', aStack.last);
            for (var key in aStack.last) {
               if (aStack.last [key] !== 1) return a.return (aStack, false);
            }
            a.return (aStack, true);
         }]
      ]);
   }

   // *** TWO USEFUL FUNCTIONS ***

   function STOP (aStack) {
      console.log ('Starting STOP test.');
      a.stop (aStack, false, [
         [a.log, 'was returned by the previous call'],
         [writeAndIncrement, 'count.txt'],
         [a.log, 'was returned by the previous call'],
         [writeAndIncrement],
         [a.log, 'was returned by the previous call'],
         [writeAndIncrement, 'count.txt'],
      ]);
   }

   // *** CLEANUP ***

   function deleteFile (aStack, path) {
      fs.unlink (path, function (error) {
         if (error) return a.return (aStack, false);
                    return a.return (aStack, true);
      });
   }

   function CLEANUP (aStack, files) {
      console.log ('Starting CLEANUP.');
      a.call (aStack, [
         [a.fork, files, function (v) {
            return [deleteFile, 'count' + v + '.txt'];
         }],
         [function (aStack, last) {
            for (var key in last) {
               if (last [key] !== true) return a.return (aStack, false);
            }
            a.return (aStack, true);
         }]
      ]);
   }

   function EXAMPLE1 (aStack) {
      console.log ('Starting EXAMPLE1.');

      function async1 (data, callback) {
         callback (data);
      }

      function async2 (data, callback) {
         callback (data);
      }

      function async3 (data, callback) {
         callback (data);
      }

      function asyncSequence1 (data, callback) {
         async1 (data, function (data) {
            async2 (data, function (data) {
               async3 (data, function (data) {
                  callback (data);
               });
            });
         });
      }

      asyncSequence1 ('This is data!', function (data) {console.log (data)});

      function async4 (aStack, data) {
         a.return (aStack, data);
      }

      function async5 (aStack, data) {
         a.return (aStack, data);
      }

      function async6 (aStack, data) {
         a.return (aStack, data);
      }

      function asyncSequence2 (aStack, data, callback) {
         a.call (aStack, [
            [async4, data],
            [async5],
            [async6],
            [callback]
         ]);
      }

      asyncSequence2 (aStack, 'This is data!', function (aStack, message) {
         console.log (message);
         a.return (aStack, true);
      });
   }

   function EXAMPLE2 (aStack) {
      console.log ('Starting EXAMPLE2.');
      function async1 (aStack, data) {
         a.return (aStack, data);
      }

      a.call (aStack, [
         [async1, 'hey'],
         [async1],
         [a.log]
      ]);
   }

   function EXAMPLE3 (aStack) {
      console.log ('Starting EXAMPLE3.');
      var counter = 0;

      function someFunction (aStack) {
         counter++;
         console.log (arguments [1], arguments [2]);
         a.return (aStack, counter);
      }

      function someOtherFunction (aStack) {
         counter++;
         console.log (arguments [1]);
         a.return (aStack, counter);
      }

      a.call (aStack, [
         [[someFunction, 'arg1', 'arg2']],
         [someFunction, 'arg1', 'arg2'],
         [
            [someFunction, 'arg1', 'arg2'],
            [someOtherFunction, 'arg3']
         ],
         [
            [[someFunction, 'arg1', 'arg2']],
            [[someOtherFunction, 'arg3']]
         ]
      ]);
   }

   function EXAMPLE4 (aStack) {
      console.log ('Starting EXAMPLE4.');
      a.call (aStack, [
         [function (aStack) {
            a.return (aStack, 'Hey there!', 'message');
         }],
         [function (aStack) {
            console.log (aStack.last, aStack.message);
            a.return (aStack, aStack.last);
         }],
         [function (aStack) {
            console.log (aStack.last, aStack.message);
            delete aStack.message;
            a.return (aStack, aStack.last);
         }]
      ]);
   }

   function EXAMPLE5 (aStack) {
      console.log ('Starting EXAMPLE5.');

      function async1 (aStack) {
         console.log (arguments [1], arguments [2]);
         a.return (aStack, aStack.last);
      }

      a.call (aStack, [
         [function (aStack) {
            aStack.data = 'b52';
            a.return (aStack, true);
         }],
         [async1, '@data', '@last'],
         [function (aStack) {
            delete aStack.data;
            a.return (aStack, {data: 'b52', moreData: [1, 2, 3]});
         }],
         [async1, '@last.data', '@last.moreData.1'],
         [function (aStack, b52, two, undef) {
            a.return (aStack, b52 === 'b52' && two === 2 && undef === undefined)
         }, '@last.data', '@last.moreData.1', '@last.does.not.exist']
      ]);
   }

   function EXAMPLE6 (aStack) {
      console.log ('Starting EXAMPLE6.');

      a.stop (aStack, false, [
         [a.fork, {
            'count0': [writeAndIncrement, 'count0.txt'],
            'count1': [writeAndIncrement, 'count1.txt'],
            'count2': [writeAndIncrement, 'count2.txt']
         }],
         [function (aStack, last) {
            console.log ('a.fork operation ready. Result was', aStack.last);
            for (var key in last) {
               if (last [key] !== 1) return a.return (aStack, false);
            }
            a.return (aStack, true);
         }],
         [CLEANUP, [0, 1, 2]],
      ]);
   }

   function EXAMPLE7 (aStack) {
      console.log ('Starting EXAMPLE7.');

      function async1 (aStack) {
         a.return (aStack, true);
      }

      a.stop (aStack, false, [
         [a.fork, [
            [async1],
            [async1],
            [async1]
         ]],
         [a.log],
         [function (aStack, last) {
            a.return (aStack, JSON.stringify (last) === JSON.stringify ([true, true, true]));
         }],
         [a.fork, {
            first: [async1],
            second: [async1],
            third: [async1]
         }],
         [a.log],
         [function (aStack, last) {
            a.return (aStack, JSON.stringify (last) === JSON.stringify ({first: true, second: true, third: true}));
         }],
      ]);
   }

   function EXAMPLE8 (aStack) {
      console.log ('Starting EXAMPLE8.');

      // http://stackoverflow.com/a/19323120
      aStack.circular = [];
      aStack.circular [0] = aStack.circular;

      aStack.data = [];

      function inner (aStack) {
         var random = Math.random ();
         console.log ('Pushing', random, 'to aStack.data');
         aStack.data.push (random);
         a.return (aStack, true);
      }

      a.call (aStack, [
         [a.fork, [
            [inner],
            [inner],
            [inner]
         ]],
         [a.log],
         [function (aStack) {
            a.return (aStack, aStack.data.length);
         }]
      ]);
   }

   function EXAMPLE9 (aStack) {
      console.log ('Starting EXAMPLE9.');
      var total = 1000;
      var data = [];
      while (total > 0) {
         data.push (total--);
      }
      var waitCounter = 0;
      a.call (aStack, [
         [a.fork, data, function (v) {
            return [writeAndIncrement, 'count' + v + '.txt', true];
         }, {max: 200}],
         [a.fork, data, function (v) {
            return [deleteFile, 'count' + v + '.txt'];
         }, {max: 200, beat: 200, test: function () {
            waitCounter++;
            if (waitCounter > 4) return true;
            console.log ('Waiting until 5. waitCounter', waitCounter);
         }}],
         [a.return, true]
      ]);
   }

   function EXAMPLE10 (aStack) {
      console.log ('Starting EXAMPLE10.');
      function async1 (aStack, data) {
         a.return (aStack, data);
      }
      a.fork (aStack, [
         [async1, 'a'],
         [async1, 'b'],
         [async1, 'c']
      ]);
   }

   function EXAMPLE11 (aStack) {
      console.log ('Starting EXAMPLE11.');

      function async1 (aStack, data) {
         a.return (aStack, data);
      }

      a.fork (aStack, ['a', 'b', 'c'], function (v) {
         return [async1, v];
      });
   }

   function EXAMPLE12 (aStack) {
      console.log ('Starting EXAMPLE12.');

      function async1 (aStack, data) {
         a.return (aStack, data);
      }

      a.fork (aStack, ['a', 'b', 'c'], function (v) {
         return [async1, v];
      }, {max: 1});
   }

   function EXAMPLE13 (aStack) {

      console.log ('Starting EXAMPLE13.');

      function async1 (aStack, data) {
         a.return (aStack, data);
      }

      var item = 10000;
      var queue = [];

      a.fork (aStack, queue, function (v) {
         return [async1, v];
      }, {max: 1000, beat: 100});

      while (item > 0) {
         queue.push (item--);
      }
   }

   // *** INVOKING ALL THE EXAMPLES IN SEQUENCE ***

   function tester (tests) {
      for (var test in tests) {
         var map = {default: [a.return, false]};
         map [tests [test] [1]] = [a.return, true];
         tests [test] = [a.cond, [tests [test] [0]], map];
      }
      tests.push ([a.return, true]);
      a.cond ([a.stop, false, tests], {
         true: [function () {console.log ('All tests finished successfully!')}],
         false: [function () {console.log ('One of the tests failed!')}]
      });
   }

   tester ([
      [SEQUENTIAL, 3],
      [CONDITIONAL, false],
      [PARALLEL, true],
      [STOP, false],
      [[CLEANUP, ['', 0, 1, 2]], true],
      [EXAMPLE1, true],
      [EXAMPLE2, 'hey'],
      [EXAMPLE3, 6],
      [EXAMPLE4, 'Hey there!'],
      [EXAMPLE5, true],
      [EXAMPLE6, true],
      [EXAMPLE7, true],
      [EXAMPLE8, 1],
      [EXAMPLE9, true],
      [EXAMPLE10, ['a', 'b', 'c']],
      [EXAMPLE11, ['a', 'b', 'c']],
      [EXAMPLE12, ['a', 'b', 'c']],
      [EXAMPLE13, function () {
         item = 10000;
         var output = [];
         while (item > 0) {
            output.push (item--);
         }
         return output;
      } ()]
   ]);

}) ();
