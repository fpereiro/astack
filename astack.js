/*
aStack - v3.0.0

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to readme.md to read the annotated source.
*/

(function () {

   // *** SETUP ***

   var isNode = typeof exports === 'object';

   if (isNode) var a = exports;
   else        var a = window.a = {};

   // *** HELPER FUNCTIONS ***

   var type = function (value, objectType) {
      var type = typeof value;
      if (type !== 'object' && type !== 'number') return type;
      if (type === 'number') {
         if      (isNaN (value))      return 'nan';
         else if (! isFinite (value)) return 'infinity';
         else if (value % 1 === 0)    return 'integer';
         else                         return 'float';
      }
      type = Object.prototype.toString.call (value).replace ('[object ', '').replace (']', '').toLowerCase ();
      if (type === 'array' || type === 'date' || type === 'null') return type;
      if (type === 'regexp') return 'regex';
      if (objectType) return type;
      return 'object';
   }

   var copy = function (input, seen) {
      var typeInput = type (input);
      if (typeInput !== 'object' && typeInput !== 'array') return input;

      var output = typeInput === 'array' ? [] : {};

      var Seen = [];
      if (seen !== undefined) {
         for (var i in seen) Seen [i] = seen [i];
      }

      for (var i in input) {
         var circular = false;
         typeInput = type (input [i]);
         if (typeInput === 'object' || typeInput === 'array') {
            for (var j in Seen) {
               if (Seen [j] === input [i]) {
                  circular = true;
                  break;
               }
            }
            if (! circular) Seen.push (input [i]);
         }
         output [i] = circular ? input [i] : copy (input [i], Seen);
      }

      return output;
   }

   var e = function () {
      console.log.apply (console, arguments);
      return false;
   }

   // *** VALIDATION ***

   a.validate = {
      aInput: function (input) {
         var typeInput = type (input);
         if (typeInput !== 'array' && typeInput !== 'function') {
            return (e ('aStack error: aInput must be an array or function but instead is', input, 'with type', typeInput));
         }
         if (typeInput === 'function')        return 'aFunction';
         if (type (input [0]) === 'function') return 'aStep';
                                              return 'aPath';
      },
      aStack: function (s) {
         if (type (s) !== 'object') return (e ('aStack error: aStack must be an object but instead is', s, 'with type', type (s)));
         if (a.validate.aInput (s.aPath) === false) return false;
         return true;
      }
   }

   a.create = function () {
      return {aPath: []}
   }

   a.flatten = function (input) {
      var type = a.validate.aInput (input);
      if (type === false)       return false;
      if (type === 'aFunction') return [[input]];
      if (type === 'aStep')     return [input];
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

      var arg = 0;
      var s        = type (arguments [arg]) === 'object' ? arguments [arg++] : a.create ();
      var aPath    = arguments [arg++];
      var external = arguments [arg] === true ? false : true;

      if (a.validate.aStack (s) === false) return false;

      if (external) {
         aPath = a.flatten (aPath);
         if (aPath === false) return a.return (s, false);
      }

      s.aPath = aPath.concat (s.aPath);

      if (s.aPath.length === 0) return s.last;

      var aStep = s.aPath.shift ();

      var aFunction = aStep.shift ();

      for (var Argument in aStep) {
         if (type (aStep [Argument]) === 'string' && aStep [Argument].match (/^@.+$/)) {
            try {
               var parameterName = aStep [Argument].match (/^@.+/) [0].replace (/^@/, '');
               parameterName = parameterName.split ('.');
               for (var item in parameterName) {
                  if (item === '0') aStep [Argument] = s [parameterName [item]];
                  else aStep [Argument] = aStep [Argument] [parameterName [item]];
               }
            }
            catch (error) {
               aStep [Argument] = undefined;
            }
         }
      }

      aStep.unshift (s);

      return aFunction.apply (aFunction, aStep);
   }

   a.return = function (s, last) {
      if (type (s) !== 'object') return (e ('aStack error: aStack must be an object but instead is', s, 'with type', type (s)));
      s.last = last;
      return a.call (s, [], true);
   }

   // *** CONDITIONAL EXECUTION ***

   a.cond = function () {

      var arg = 0;
      var s        = type (arguments [arg]) === 'object' ? arguments [arg++] : a.create ();
      var aCond    = arguments [arg++];
      var aMap     = arguments [arg++];
      var external = arguments [arg] === true ? false : true;

      if (type (aMap) !== 'object') return a.return (s, e ('aStack error: aMap has to be an object but instead is', aMap, 'with type', type (aMap)));

      if (external) {
         aCond = a.flatten (aCond);
         if (aCond === false) return a.return (s, false);
      }

      aCond.push ([function (s) {
         if (aMap [s.last]) return a.call (s, aMap [s.last]);
         if (aMap.default)  return a.call (s, aMap.default);
         return a.return (s, e ('aStack error: The last aFunction received', last, 'as last argument', 'but aMap [', last, '] is undefined and aMap.default is also undefined!', 'aMap is:', aMap));
      }]);

      return a.call (s, aCond, true);
   }

   // *** PARALLEL EXECUTION ***

   a.fork = function () {

      var arg = 0;
      var s       = type (arguments [arg]) === 'object' && type (arguments [arg].aPath) === 'array' ? arguments [arg++] : a.create ();
      var data    = arguments [arg++];
      var fun     = type (arguments [arg]) === 'function' ? arguments [arg++] : undefined;
      var options = arguments.length > arg && type (arguments [arg]) === 'object' ? arguments [arg] : {};

      var dataType = type (data);
      if (dataType === 'function') data = [data], dataType = 'array';

      if (dataType !== 'array' && dataType !== 'object') {
         return a.return (s, e ('aStack error: data passed to a.fork must be a function, an array or an object but instead is', data, 'with type', dataType));
      }

      if (options.max && (type (options.max)   !== 'integer' || options.max  < 1)) return a.return (s, e ('aStack error: if defined, options.max passed to a.fork must be an integer greater than 0 but instead is',  options.max, 'with type', type (options.max)));
      if (options.beat && (type (options.beat) !== 'integer' || options.beat < 1)) return a.return (s, e ('aStack error: if defined, options.beat passed to a.fork must be an integer greater than 0 but instead is', options.beat, 'with type', type (options.beat)));
      if (options.test && type (options.test)  !== 'function')                     return a.return (s, e ('aStack error: If defined, options.test passed to a.fork must be a function but instead is',                options.test, 'with type', type (options.test)));
      options.beat = options.beat || ((options.max || options.test) ? 100 : 0);

      if (dataType === 'array'  && data.length === 0 && options.beat === 0) return a.return (s, []);
      if (dataType === 'object' && Object.keys (data).length === 0)         return a.return (s, {});

      var output = dataType === 'array' ? [] : data;
      if (dataType === 'object') data = Object.keys (data);

      var counter = 0;
      var active  = 0;
      var test = true;

      var fire = function () {
         return counter < data.length && test && (! options.max || options.max > active);
      }

      var testInterval;
      if (options.test) {
         testInterval = setInterval (function () {
            test = options.test ();
            if (fire ()) load ();
         }, options.beat);
      }

      var collect = function (stack, key) {
         output [key] = stack.last;
         for (var key in stack) {
            if (key !== 'aPath' && key !== 'last') s [key] = stack [key];
         }
         active--;
         if (fire ()) return load ();
         if (active === 0 && counter === data.length) {
            setTimeout (function () {
               if (fire ()) return load ();
               if (testInterval) clearInterval (testInterval);
               if (active === 0 && counter === data.length) return a.return (s, output);
            }, options.beat);
         }
      }

      var s2 = copy (s);
      s2.aPath = [];

      var loading = false;
      var load = function () {
         while (fire () && loading === false) {
            loading = true;
            counter++;
            active++;
            var key   = dataType === 'array' ? counter - 1 : data [counter - 1];
            var value = dataType === 'array' ? data [key]  : output [key];
            if (fun) value = fun (value, key) || [];
            a.call (copy (s2), [
               [value],
               [collect, key]
            ]);
            loading = false;
         }
      }
      setTimeout (load, options.beat);
   }

   // *** THREE USEFUL FUNCTIONS ***

   a.stop = function () {

      var arg = 0;
      var s         = type (arguments [arg]) === 'object' ? arguments [arg++] : a.create ();
      var stopValue = arguments [arg++];
      var aPath     = arguments [arg++];
      var external  = arguments [arg] === true ? false : true;

      if (external) {
         aPath = a.flatten (aPath);
         if (aPath === false) return a.return (s, false);
      }

      if (aPath.length === 0) return a.return (s, s.last);

      var next = aPath.shift ();

      var aMap = {default: [a.stop, stopValue, aPath, true]};
      aMap [stopValue] = [a.return, stopValue];

      return a.cond (s, [next], aMap, true);
   }

   a.log = function (s) {
      var aPath = s.aPath;
      delete s.aPath;
      console.log.apply (console, arguments);
      s.aPath = aPath;
      return a.return (s, s.last);
   }

   a.convert = function (fun, errfun, This) {
      if (type (fun) !== 'function')                            return e ('aStack error: fun passed to a.convert must be a function but instead is', fun, 'with type', type (fun));
      if (errfun !== undefined && type (errfun) !== 'function') return e ('aStack error: errfun passed to a.convert must be a function but instead is', errfun, 'with type', type (errfun));
      return function (s) {
         var Arguments = [].slice.call (arguments, 1);
         Arguments.push (function (error, data) {
            if (error) return a.return (s, errfun ? errfun (error) : e (error));
                       return a.return (s, data);
         });
         fun.apply (This || fun, Arguments);
      }
   }

}) ();
