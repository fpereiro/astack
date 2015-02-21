/*
aStack - v2.3.3

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

   function writeFile (aStack, path, data) {
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

   function incrementFile (aStack, path) {
      fs.readFile (path, function (error, data) {
         writeFile (aStack, path, parseInt (data) + 1);
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

   function writeAndIncrement (aStack, path) {
      a.cond (aStack, [writeFile, path, '0'], {
         true: [incrementFile, path],
         false: [function (aStack) {
            console.log ('There was an error when writing to the file', path, 'so no incrementing will take place.');
            a.return (aStack, false);
         }]
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
         [a.fork, [
            [writeAndIncrement, 'count0.txt'],
            [writeAndIncrement, 'count1.txt'],
            [writeAndIncrement, 'count2.txt']
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

   function CLEANUP (aStack) {
      console.log ('Starting CLEANUP.');
      a.fork (aStack, [
         [deleteFile, 'count.txt'],
         [deleteFile, 'count0.txt'],
         [deleteFile, 'count1.txt'],
         [deleteFile, 'count2.txt']
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

      function someFunction (aStack) {
         console.log (arguments [1], arguments [2]);
         a.return (aStack, true);
      }

      function someOtherFunction (aStack) {
         console.log (arguments [1]);
         a.return (aStack, true);
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
            a.return (aStack, true);
         }],
         [function (aStack) {
            console.log (aStack.last, aStack.message);
            delete aStack.message;
            a.return (aStack, true);
         }]
      ]);
   }

   function EXAMPLE5 (aStack) {
      console.log ('Starting EXAMPLE5.');

      function async1 (aStack) {
         console.log (arguments [1], arguments [2]);
         a.return (aStack, true);
      }

      a.call (aStack, [
         [function (aStack) {
            aStack.data = 'b52';
            a.return (aStack, true);
         }],
         [async1, '@data', '@last'],
         [function (aStack) {
            a.return (aStack, {data: 'b52', moreData: [1, 2, 3]});
         }],
         [async1, '@last.data', '@last.moreData.1'],
         [function (aStack) {delete aStack.data; a.return (aStack, true)}]
      ]);
   }

   function EXAMPLE6 (aStack) {
      console.log ('Starting EXAMPLE6.');

      a.call (aStack, [
         [a.fork, {
            'count0': [writeAndIncrement, 'count0.txt'],
            'count1': [writeAndIncrement, 'count1.txt'],
            'count2': [writeAndIncrement, 'count2.txt']
         }],
         [function (aStack) {
            console.log ('a.fork operation ready. Result was', aStack.last);
            a.return (aStack, true);
         }],
         [CLEANUP]
      ]);
   }

   function EXAMPLE7 (aStack) {
      console.log ('Starting EXAMPLE7.');

      function async1 (aStack) {
         a.return (aStack, true);
      }

      a.call (aStack, [
         [a.fork, [
            [async1],
            [async1],
            [async1]
         ]],
         [a.log],
         [a.fork, {
            first: [async1],
            second: [async1],
            third: [async1]
         }],
         [a.log],
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
         [a.log]
      ]);
   }

   // *** INVOKING ALL THE EXAMPLES IN SEQUENCE ***

   a.call ([
      [SEQUENTIAL],
      [CONDITIONAL],
      [PARALLEL],
      [STOP],
      [CLEANUP],
      [EXAMPLE1],
      [EXAMPLE2],
      [EXAMPLE3],
      [EXAMPLE4],
      [EXAMPLE5],
      [EXAMPLE6],
      [EXAMPLE7],
      [EXAMPLE8],
      [function () {console.log ('All tests finished!')}]
   ]);

}) ();
