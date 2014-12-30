/*
aStack - v2.2.3

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to readme.md to read the annotated source.
*/

(function () {

   // *** SETUP ***

   var isNode = typeof exports === 'object';

   if (isNode) var a = exports;
   else        var a = window.a = {};

   // *** HELPER FUNCTIONS ***

   function type (value) {
      var type = typeof value;
      if (type === 'number') {
         if      (isNaN (value))      type = 'nan';
         else if (! isFinite (value)) type = 'infinity';
         else if (value % 1 === 0)    type = 'integer';
         else                         type = 'float';
      }
      if (type === 'object') {
         if (value === null)                                               type = 'null';
         if (Object.prototype.toString.call (value) === '[object Date]')   type = 'date';
         if (Object.prototype.toString.call (value) === '[object Array]')  type = 'array';
         if (Object.prototype.toString.call (value) === '[object RegExp]') type = 'regex';
      }
      return type;
   }

   function e () {
      console.log (arguments);
      return false;
   }

   function copy (input) {

      if (type (input) !== 'object' && type (input) !== 'array') return input;

      var output = type (input) === 'array' ? [] : {};

      for (var i in input) {
         output [i] = copy (input [i]);
      }

      return output;
   }

   // *** VALIDATION ***

   a.validate = {
      aPath: function (input) {
         if (type (input) !== 'array') {
            return (e ('aPath or aStep must be an array but instead is', input, 'with type', type (input)));
         }
         if (type (input [0]) === 'function') return 'aStep';
                                              return 'aPath';
      },
      aStack: function (aStack) {
         if (type (aStack) !== 'object') {
            return (e ('aStack must be an array but instead is', aStack, 'with type', type (aStack)));
         }
         if (a.validate.aPath (aStack.aPath) === false) return false;
         return true;
      }
   }

   a.create = function () {
      return {aPath: []}
   }

   a.flatten = function (input) {
      var type = a.validate.aPath (input);
      if (type === false)   return false;
      if (type === 'aStep') return [input];
      if (type === 'aPath') {
         var aPath = [];
         for (var i in input) {
            var result = a.flatten (input [i]);
            if (result === false) return false;
            else aPath = aPath.concat (result);
         }
         return aPath;
      }
   }

   // *** SEQUENTIAL EXECUTION ***

   a.call = function () {

      var aStack   = type (arguments [0]) !== 'object' ? a.create ()   : arguments [0];
      var aPath    = type (arguments [0]) !== 'object' ? arguments [0] : arguments [1];
      var external = arguments [arguments.length - 1] === true ? false : true;

      if (a.validate.aStack (aStack) === false) return false;

      if (external) {
         aPath = a.flatten (aPath);
         if (aPath === false) return a.return (aStack, false);
      }

      aStack.aPath = aPath.concat (aStack.aPath);

      if (aStack.aPath.length === 0) return aStack.last;

      var aStep = aStack.aPath.shift ();

      var aFunction = aStep.shift ();

      for (var Argument in aStep) {
         if (type (aStep [Argument]) === 'string' && aStep [Argument].match (/^@.+$/)) {
            try {
               var parameterName = aStep [Argument].match (/^@.+/) [0].replace (/^@/, '');
               parameterName = parameterName.split ('.');
               for (var item in parameterName) {
                  if (item === '0') aStep [Argument] = aStack [parameterName [item]];
                  else aStep [Argument] = aStep [Argument] [parameterName [item]];
               }
            }
            catch (error) {
               aStep [Argument] = undefined;
            }
         }
      }

      aStep.unshift (aStack);

      return aFunction.apply (aFunction, aStep);
   }

   a.return = function (aStack, last, copy) {
      if (a.validate.aStack (aStack) === false) return false;

      aStack.last = last;

      if (copy !== undefined && type (copy) !== 'string' && type (copy) !== 'integer') {
         return e ('copy parameter passed to a.return must be string, integer or undefined but instead is', copy, 'with type', type (copy));
      }

      if (copy !== undefined) aStack [copy] = last;

      return a.call (aStack, []);
   }

   // *** CONDITIONAL EXECUTION ***

   a.cond = function () {

      var aStack   = type (arguments [0]) !== 'object' ? a.create ()   : arguments [0];
      var aCond    = type (arguments [0]) !== 'object' ? arguments [0] : arguments [1];
      var aMap     = type (arguments [0]) !== 'object' ? arguments [1] : arguments [2];
      var external = arguments [arguments.length - 1] === true ? false : true;

      if (type (aMap) !== 'object') return a.return (aStack, false);

      if (external) {
         aCond = a.flatten (aCond);
         if (aCond === false) return a.return (aStack, false);
      }

      aCond.push ([function (aStack) {
         if (aMap [aStack.last])      return a.call (aStack, aMap [aStack.last]);
         if (aMap ['default'])        return a.call (aStack, aMap ['default']);
         return a.return (aStack, e ('aPick received as last argument', last, 'but aMap [', last, '] is undefined and aMap.default is also undefined!', 'aMap is:', aMap));
      }]);

      return a.call (aStack, aCond, true);
   }

   // *** PARALLEL EXECUTION ***

   a.fork = function () {

      var aStack = type (arguments [0]) !== 'object' ? a.create ()   : arguments [0];
      var aPath  = type (arguments [0]) !== 'object' ? arguments [0] : arguments [1];

      aPath = a.flatten (aPath);

      if (aPath === false) return a.return (aStack, false);

      if (aPath.length === 0) return a.return (aStack, []);

      var originalStack = aStack;
      var steps = aPath.length;
      var output = [];

      function collect (aStack, index) {
         output [index] = aStack.last;
         for (var key in aStack) {
            if (key !== 'aPath' && key !== 'last') originalStack [key] = aStack [key];
         }
         steps--;
         if (steps === 0) return a.return (originalStack, output);
      }

      for (var k in aPath) {
         var newStack = copy (aStack);
         newStack.aPath = [];

         a.call (newStack, [
            aPath [k],
            [collect, k]
         ]);
      }
   }

   // *** TWO USEFUL FUNCTIONS ***

   a.stop = function () {

      var aStack    = type (arguments [0]) !== 'object' ? a.create ()   : arguments [0];
      var stopValue = type (arguments [0]) !== 'object' ? arguments [0] : arguments [1];
      var aPath     = type (arguments [0]) !== 'object' ? arguments [1] : arguments [2];
      var external  = arguments [arguments.length - 1] === true ? false : true;

      if (external) {
         aPath = a.flatten (aPath);
         if (aPath === false) return a.return (aStack, false);
      }

      if (aPath.length === 0) return a.return (aStack, aStack.last);

      var next = aPath.shift ();

      var aMap = {default: [a.stop, stopValue, aPath, true]};
      aMap [stopValue] = [a.return, stopValue];

      return a.cond (aStack, [next], aMap, true);
   }

   a.log = function (aStack) {
      var Arguments = [{}].concat (Array.prototype.slice.call (arguments, 1));
      for (var key in aStack) {
         if (key !== 'aPath') Arguments [0] [key] = aStack [key];
      }
      console.log (Arguments);
      return a.return (aStack, aStack.last);
   }

}) ();
