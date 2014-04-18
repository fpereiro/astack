/*
aStack - v1.0.2

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to README.md to see what this is about.
*/

(function () {

   var log = console.log;

   // This code allows us to export the lith in the browser and in the server.
   // Taken from http://backbonejs.org/docs/backbone.html
   var root = this;
   var a;
   if (typeof exports !== 'undefined') {
      a = exports;
   }
   else {
      a = root.dale = {};
   }

   // Taken from http://javascript.crockford.com/remedial.html and modified to add detection of regexes.
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

   // Error reporting function.
   function e () {
      if (console) console.log (arguments);
      return false;
   }

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

   a.validate.aMap = function (aMap) {
      if (type (aMap) !== 'object') {
         return (e ('aMap must be an object but instead is', aMap));
      }
      return true;
   }

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

      aCond.push ([aPick, aMap]);

      a.aCall (aStack, aCond);
   }

   a.aFork = function (aStack, aPath) {
      if (a.validate.aPath (aPath) === false) return false;
      var original_aStack = aStack;
      var paths = aPath.length;
      var results = [];
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

}).call (this);
