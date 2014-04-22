/*
aStack - v1.0.7

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to README.md to see what this is about.
*/

(function () {

   // *** SETUP ***

   // Useful shorthand.
   if (typeof exports !== 'undefined') {
      var log = console.log;
   }
   else {
      window.log = function () {
         if (console) console.log (arguments);
         else alert (arguments);
      }
   }

   // This code allows us to export the lith in the browser and in the server.
   // Taken from http://backbonejs.org/docs/backbone.html
   var root = this;
   var a;
   if (typeof exports !== 'undefined') a = exports;
   else                                a = root.a = {};

   // The function below is from the teishi library (github.com/fpereiro/teishi). I added it manually because it wasn't worth it to add a dependence.
   function type (value) {
      var type = typeof value;
      if (type === 'object') {
         if (value) {
            if (Object.prototype.toString.call (value) == '[object Array]') {
               type = 'array';
            }
            if (value instanceof RegExp) {
               type = 'regex';
            }
         } else {
            type = 'null';
         }
      }
      return type;
   }

   function e () {
      log (arguments);
      return false;
   }

   // *** VALIDATION ***

   a.validate = {};

   a.validate.aStep = function (aStep) {
      if (type (aStep) !== 'array') {
         return (e ('aStep must be an array but instead is', aStep));
      }
      if (type (aStep [0]) !== 'function') {
         return (e ('First element of aStep must be a function but instead is', aStep));
      }
   }

   a.validate.aPath = function (aPath) {
      if (type (aPath) !== 'array') {
         return (e ('aPath or aStep must be an array but instead is', aPath));
      }
      return true;
   }

   a.validate.aStack = function (aStack) {
      if (type (aStack) !== 'object') {
         return (e ('aStack must be an object but instead is', aStack));
      }
      if (a.validate.aPath (aStack.aPath) === false) {
         return false;
      }
      return true;
   }

   a.validate.aMap = function (aMap) {
      if (type (aMap) !== 'object') {
         return (e ('aMap must be an object but instead is', aMap));
      }
      return true;
   }

   // *** SEQUENTIAL EXECUTION ***

   a.aCall = function (aStack, aPath) {

      if (aStack === undefined) {
         aStack = {aPath: []}
      }

      if ((a.validate.aStack (aStack) && a.validate.aPath (aPath)) === false) {
        return false;
      }

      if (type (aPath [0]) === 'function') aPath = [aPath];

      aStack.aPath = aPath.concat (aStack.aPath);

      if (aStack.aPath.length === 0) return true;

      var aStep = aStack.aPath.shift ();

      if (a.validate.aStep (aStep) === false) {
         return false;
      }

      var aFunction = aStep.shift ();

      aStep.unshift (aStack);

      aFunction.apply (aFunction, aStep);
   }

   a.aReturn = function (aStack, last) {
      if (a.validate.aStack (aStack) === false) {
         return false;
      }

      aStack.last = last;
      a.aCall (aStack, []);
   }

   // *** CONDITIONAL EXECUTION ***

   a.aPick = function (aStack, aMap) {

      if (a.validate.aMap (aMap) === false) {
         return false;
      }

      var last = aStack.last + '';

      var aPath;

      if (aMap [last] === undefined) {
         if (aMap ['default'] === undefined) {
            return (e ('aPick received as last argument', last, 'but aMap [', last, '] is undefined and aMap.default is also undefined!', 'aMap is:', aMap));
         }
         aPath = aMap ['default'];
      }
      else {
         aPath = aMap [last];
      }
      a.aCall (aStack, aPath);
   }

   a.aCond = function (aStack, aCond, aMap) {

      if (a.validate.aPath (aCond) === false) return false;

      if (a.validate.aMap (aMap) === false) return false;

      if (type (aCond [0]) === 'function') aCond = [aCond];

      aCond.push ([a.aPick, aMap]);

      a.aCall (aStack, aCond);
   }

   // *** PARALLEL EXECUTION ***

   a.aFork = function (aStack, aPath) {

      if (a.validate.aPath (aPath) === false) return false;

      var original_aStack = aStack;
      var paths = aPath.length;
      var results = [];

      // Collect is the callback function invoked by each aStep within the aPath passed to the function.
      function collect (aStack, index) {
         results [index] = aStack.last;
         paths--;
         if (paths === 0) {
            a.aReturn (original_aStack, results);
         }
      }

      // If aPath is empty, we aReturn an empty path, otherwise, the function would not aReturn anything.
      if (aPath.length === 0) {
         a.aReturn (aStack, []);
         return;
      }

      for (var k in aPath) {
         if (a.validate.aStep (aPath [k]) === false) return false;
      }

      for (var k in aPath) {
         a.aCall (undefined, [
            aPath [k],
            [collect, k]
         ]);
      }
   }

   a.log = function (aStack) {
      var Arguments = [];
      for (var iterator in arguments) {
         if (iterator === '0') Arguments.push (arguments [iterator].last);
         else Arguments.push (arguments [iterator]);
      }
      log.apply (a.log, Arguments);
      a.aReturn (aStack, aStack.last);
   }

}).call (this);
