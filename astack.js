/*
aStack - v2.0.3

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to README.md to see what this is about.
*/

(function () {

   // *** SETUP ***

   // This code allows us to export aStack in the browser and in the server.
   // Taken from http://backbonejs.org/docs/backbone.html
   var root = this;
   var a;
   if (typeof exports !== 'undefined') a = exports;
   else                                a = root.a = {};

   // The function below is from the teishi library (github.com/fpereiro/teishi). I added it manually because it wasn't worth it to add a dependency.
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
      for (var argument in arguments) {
         process.stdout.write (arguments [argument] + ' ');
      }
      process.stdout.write ('\n');
      return false;
   }

   // *** VALIDATION ***

   a.validate = {};

   a.validate.aPest = function (aPest) {
      if (type (aPest) !== 'array') {
         return (e ('aPest (aPath or aStep) must be an array but instead is', aPest));
      }
      return true;
   }

   a.validate.aStep = function (aStep) {
      if (a.validate.aPest (aStep) === false) return false;
      if (type (aStep [0]) !== 'function') {
         return (e ('First element of aStep must be a function but instead is', aStep [0]));
      }
      return true;
   }

   a.validate.aStack = function (aStack) {
      if (type (aStack) !== 'object') {
         return (e ('aStack must be an object but instead is', aStack));
      }
      if (a.validate.aPest (aStack.aPath) === false) {
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

   // createIf means that it returns a new aStack, if it received an undefined one as argument, or returns that aStack if it's not undefined.
   a.createIf = function (aStack) {
      if (aStack !== undefined) return aStack;
      else return aStack = {aPath: []}
   }

   a.pestToPath = function (aPest) {
      if (a.validate.aPest (aPest) === false) return false;
      if (type (aPest [0]) === 'array' || aPest.length === 0) return aPest;
      else return [aPest];
   }

   // *** SEQUENTIAL EXECUTION ***

   a.call = function () {

      var aStack;
      var aPest;

      if (arguments.length === 1) aPest = arguments [0];
      else {
         aStack = arguments [0];
         aPest = arguments [1];
      }

      aStack = a.createIf (aStack);

      if (a.validate.aStack (aStack) === false) return false;

      if (a.validate.aPest (aPest) === false) return a.return (aStack, false);

      var aPath = a.pestToPath (aPest);

      aStack.aPath = aPath.concat (aStack.aPath);

      if (aStack.aPath.length === 0) return aStack.last;

      var aStep = aStack.aPath.shift ();

      if (a.validate.aStep (aStep) === false) return false;

      var aFunction = aStep.shift ();

      for (var Argument in aStep) {
         if (type (aStep [Argument]) === 'string' && aStep [Argument].match (/^@.+$/)) {
            var parameterName = aStep [Argument].match (/^@.+$/) [0].replace ('@', '');
            aStep [Argument] = aStack [parameterName]
         }
      }

      aStep.unshift (aStack);

      aFunction.apply (aFunction, aStep);
   }

   a.return = function (aStack, last, copy) {
      if (a.validate.aStack (aStack) === false) return false;

      if (copy !== undefined && type (copy) !== 'string' && type (copy) !== 'number') {
         return e ('copy parameter passed to a.return must be string, number or undefined');
      }

      if (copy !== undefined) aStack [copy + ''] = last;

      aStack.last = last;
      a.call (aStack, []);
      return aStack.last;
   }

   // *** CONDITIONAL EXECUTION ***

   a.pick = function (aStack, aMap) {

      if (a.validate.aMap (aMap) === false) {
         return a.return (aStack, false);
      }

      var last = aStack.last + '';

      var aPest;

      if (aMap [last] === undefined) {
         if (aMap ['default'] === undefined) {
            return (e ('aPick received as last argument', last, 'but aMap [', last, '] is undefined and aMap.default is also undefined!', 'aMap is:', aMap));
         }
         aPest = aMap ['default'];
      }
      else {
         aPest = aMap [last];
      }

      a.call (aStack, aPest);
   }

   a.cond = function () {

      var aStack;
      var aCond;
      var aMap;

      if (arguments.length === 2) {
         aCond = arguments [0];
         aMap = arguments [1];
      }
      else {
         aStack = arguments [0];
         aCond = arguments [1];
         aMap = arguments [2];
      }

      aStack = a.createIf (aStack);

      if (a.validate.aPest (aCond) === false) return a.return (aStack, false);

      if (a.validate.aMap (aMap) === false) return a.return (aStack, false);

      aCond = a.pestToPath (aCond);

      aCond.push ([a.pick, aMap]);

      a.call (aStack, aCond);
   }

   // *** PARALLEL EXECUTION ***

   a.fork = function () {

      var aStack;
      var aPest;

      if (arguments.length === 1) aPest = arguments [0];
      else {
         aStack = arguments [0];
         aPest = arguments [1];
      }

      aStack = a.createIf (aStack);

      if (a.validate.aPest (aPest) === false) return a.return (aStack, false);

      if (aPest.length === 0) return a.return (aStack, []);

      var aPath = a.pestToPath (aPest);

      for (var k in aPath) {
         if (a.validate.aStep (aPath [k]) === false) return a.return (aStack, false);
      }

      var original_aStack = aStack;
      var paths = aPath.length;
      var results = [];

      // Collect is the callback function invoked by each aStep within the aPath passed to the function.
      function collect (aStack, index) {
         results [index] = aStack.last;
         paths--;
         if (paths === 0) a.return (original_aStack, results);
      }

      for (var k in aPath) {
         a.call (undefined, [
            aPath [k],
            [collect, k]
         ]);
      }
   }

   // *** TWO USEFUL FUNCTIONS ***

   a.stop = function () {

      var aStack;
      var stopValue;
      var aPest;

      if (arguments.length === 2) {
         stopValue = arguments [0];
         aPest = arguments [1];
      }
      else {
         aStack = arguments [0];
         stopValue = arguments [1];
         aPest = arguments [2];
      }

      aStack = a.createIf (aStack);

      if (a.validate.aPest (aPest) === false) return a.aReturn (aStack, false);

      if (aPest.length === 0) return a.return (aStack, aStack.last);

      var aPath = a.pestToPath (aPest);

      var next = aPath.shift ();

      var aMap = {default: [a.stop, stopValue, aPath]};
      aMap [stopValue + ''] = [a.return, stopValue];

      a.cond (aStack, next, aMap);
   }

   a.log = function (aStack) {
      // We want Arguments to hold all the arguments, with the sole exception that we don't want aStack.last to be there.
      var Arguments = [];
      for (var iterator in arguments) {
         if (iterator === '0') {
            Arguments [0] = {};
            for (var key in aStack) {
               if (key !== 'aPath') Arguments [0] [key] = aStack [key];
            }
         }
         else Arguments.push (arguments [iterator]);
      }
      console.log.apply (console.log, Arguments);
      a.return (aStack, aStack.last);
   }

}).call (this);
