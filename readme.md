# aStack

> "Callbacks are merely the continuation of control flow by other means." -- Carl von Clausewitz

aStack is a tool for writing asynchronous functions almost as if they were synchronous, using plain javascript and no dependencies.

aStack strives to be the simplest solution to the [async problem](https://github.com/fpereiro/astack#the-async-problem). I confronted this problem when writing a [Javascript toolset for devops](https://github.com/fpereiro/kaboot), where I needed to execute asynchronous functions in varying order. aStack emerged from that need.

Besides sequential execution, aStack also supports conditional and parallel execution.

## Installation

aStack is written in Javascript. You can use it in the browser by sourcing the main file.

```html
<script src="astack.js"></script>
```
And you also can use it in node.js. To install: `npm install astack`

## Index

- [Usage examples](https://github.com/fpereiro/astack#usage-examples): see aStack in action.
- [The async problem](https://github.com/fpereiro/astack#the-async-problem): why we are doing this.
- [Goodbye callbacks, hello aFunctions](https://github.com/fpereiro/astack#goodbye-callbacks-hello-afunctions): from callback hell to aStack.
- [The elements of aStack](https://github.com/fpereiro/astack#the-elements-of-astack): `aFunction`, `aStep`, `aPath`, `aInput` and `aStack`.
- [Core aFunctions](https://github.com/fpereiro/astack#core-afunctions): `a.call` and `a.return`.
- [Five more aFunctions](https://github.com/fpereiro/astack#five-more-afunctions): conditional execution, parallel execution, and a couple more.
- [Annotated source code](https://github.com/fpereiro/astack#source-code).

## Usage examples

### Sequential execution

```javascript
var a  = require ('astack');
var fs = require ('fs');

// Read the file at `path`
// If the file cannot be read, the next async function will receive `undefined`
// If the file can be read, the next async function will receive `data`

var readFile = function (s, path) {
   fs.readFile (path, function (error, data) {
      if (error) {
         console.log ('File', path, 'is empty');
         a.return (s, undefined);
      }
      else {
         console.log ('File', path, 'contains', data + '');
         a.return (s, data + '');
      }
   });
}

// Write `data` to the file at `path`
// Whether successful or not, when the operation is complete, pass `data` to the next async function.

var writeFile = function (s, path, data, mute) {
   fs.writeFile (path, data, {encoding: 'utf8'}, function (error) {
      a.return (s, data);
   });
}

a.call ([
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
```

This script prints the following:

```
File count.txt is empty
File count.txt contains 0
File count.txt contains 1
```

### Conditional execution

```javascript
// Read the file at `path` using `readFile`.
// If the result of `readFile` was `undefined`, write 0 to the file at path.
// Otherwise, parse the result of `readFile` into an integer, increment it, and write it to the file.

var incrementFile = function (s, path, mute) {
   a.cond (s, [readFile, path], {
      undefined: [writeFile, path, 0],
      default:   function (s) {
         var data = parseInt (s.last);
         writeFile (s, path, data + 1);
      }
   });
}

a.call (s, [
   // Increment the file for the first time.
   [incrementFile, 'count.txt'],
   // Increment the file for the second time.
   [incrementFile, 'count.txt'],
   // Increment the file for the third time.
   [incrementFile, 'count.txt']
]);
```

This script prints the following:

```
File count.txt is empty
File count.txt contains 0
File count.txt contains 1
```

### Parallel execution

```javascript
// Invoke `incrementFile` twice in a row for each of three files.
// After finishing the operation, pass an array of results to the next asynchronous function.

a.call ([
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
```

This script prints the following:

```
File count0.txt is empty
File count1.txt is empty
File count2.txt is empty
File count0.txt contains 0
File count1.txt contains 0
File count2.txt contains 0
Parallel operation ready. Result was [ 1, 1, 1 ]
```

Notice that the order of lines 1 to 6 may vary, depending on the actual order on which the files were written.

Run concurrently an expensive operation, without doing more than `n` operations simultaneously.

```javascript
var memoryIntensiveOperation = function (s, datum) {
   ...
}

var bigData = [1, 2, 3, ..., 999999, 1000000];

a.fork (bigData, function (v) {
   return [memoryIntensiveOperation, v];
}, {max: n});
```

Run concurrently a memory expensive operation, spawning concurrent operations unless the process' memory usage exceeds a `threshold`.

```javascript
a.fork (bigData, function (v) {
   return [memoryIntensiveOperation, v];
}, {test: function () {
   return process.memoryUsage.heapTotal < threshold;
}});
```

## The async problem

As you may know, hard disks and networks are many times slower than CPUs and RAM. Broadly speaking, programs usually are executed at the speed of CPUs and RAM. However, when a program has to execute a disk or network operation, this fast process is drastically slowed down, because the CPUs/RAM have to wait for the disk/network operation to finish. While the CPUs/RAM are waiting for the disk/network to be done, no other operations can be performed, so that's why it's said that the disk/network **blocks** the CPUs/RAM.

Asynchronous functions are a powerful tool that prevent this situation. When the program finds a disk/network operation, it issues the command to the disk/network, but instead of waiting for them to be finished, **it keeps on executing the program**. This pattern is called **asynchronous programming**.

By not waiting for disk/network operations, the CPUs/RAM can do many other things while these operations finish. In practice, it means that a single process can deal with many slow operations at the same time.

You may first ask: **what could the CPUs/RAM be doing while they wait for disk/network? After all, if you need to perform a disk/network operation, it is because you need that information to proceed with the program!**

Well, if you are the only one using the program at a given time, you don't mind waiting for the disk/network, because you have nothing to do except to get the result of that operation and then use it to perform further computations. However, if a program is invoked by many users at the same time, and this program has many slow operations, you will quickly see the value of asynchronous programming.

Imagine that you write a web server. A web server is used/invoked by many users at the same time. With synchronous programming, if a user requires a file from the web server (a slow operation, since it involves the disk), while that file was served, the CPUs/RAM (or to be more precise, the thread of execution, a unit made of CPUs/RAM) would be blocked by the disk operation.

Or imagine that you are writing a web browser. The web browser allows you to interact with elements that it has already loaded (imagine a text box), while it retrieves data from the network and redraws the screen accordingly. With the synchronous model, user interaction would be impossible while network operations/screen redrawing are taking place. With the asynchronous model, you can still interact with the browser while it is loading data and changing other elements in the screen.

Historically, the first example was the motivation to make node.js asynchronous, and the second one is what made javascript asynchronous.

Going back to the nuts and bolts, you may ask: **when the disk/network is called asynchronously and the operation is finished, where do you send the result of that operation?** The answer is: to the **callback**.

A **callback** is simply a function that is executed when the disk/network operation is ready. In node.js and javascript in general, every asynchronous function receives a callback as its last argument, so that the function knows what to execute once its slow operations are complete.

Synchronous functions do not need callbacks. This is because when their are invoked by the thread of execution, the thread waits for them to be done. How does a synchronous function inform the thread that it's execution is complete? In functional programming, this is done through the `return` statement. Synchronous functions `return` their output when they are done, which means two things: 1) the next operation is executed; 2) the next operation has the output of the previous function available.

Let's see an example:

```javascript
var sync1 = function (data) {
   // Do some stuff to data
   return data;
}

var sync2 = function (data) {
   // Do some other stuff to data
   return data;
}

var syncSequence = function (data) {
   return sync2 (sync1 (data));
}
```

When you execute `syncSequence`, the thread of execution does the following:

- Execute `sync1 (data)` and wait for it to be completed.
- When it's completed, take the value returned by `sync1`, and call `sync2` passing that value as its argument.
- When `sync2` finishes executing, the returned value is returned.

If you wrote this example in an asynchronous way, this is how it would look like:

```javascript
var async1 = function (data, callback) {
   // Do some stuff to data
   callback (data);
}

var async2 = function (data, callback) {
   // Do some stuff to data
   callback (data);
}

var asyncSequence = function (data, callback) {
   async1 (data, function (data) {
      async2 (data, function (data) {
         callback (data);
      });
   });
}
```

When you execute `asyncSequence`, this is what happens:

- `async1` is executed with two arguments, `data` and a `callback` function. Let's name the latter as `callback1`. When `async1` finishes processing `data`, `callback1` is executed.
- Within `callback1`, `async2` is executed with two arguments, `data` (which is the data returned by `async1`) and another callback function, which we'll name `callback2`. When `async2` finishes processing `data`, `callback2` is executed.
- Within `callback2`, the `callback` that was passed to `asyncSequence` is executed, receiving the `data` processed first by `async1`, then `async2`.

Imagine that asyncSequence had to invoke three functions instead of two. It would look like this:

```javascript
var asyncSequence = function (data, callback) {
   async1 (data, function (data) {
      async2 (data, function (data) {
         async3 (data, function (data) {
            callback (data);
         });
      });
   });
}
```

The above pattern of nested anonymous functions invoking asynchronous functions is affectionately known as **callback hell**. Compare this with its synchronous counterpart:

```javascript
var syncSequence = function (data) {
   return sync3 (sync2 (sync1 (data)));
}
```

The difference in clarity and succintness reflects the cost of asynchronous programming. Synchronous functions do not need to know which function is run after them, because the execution thread is in charge of determining that. But since the thread of execution doesn't wait for asynchronous functions, the latter have the burden of having to know where to send their results (where to `return`) when they are done.

The standard way to avoid callback hell is to hardwire the callbacks into the asynchronous functions. For example, if `async2` always calls `async1` and `async3` always calls `async2`, then you can rewrite the example above as:

```javascript
var async1 = function (data, callback) {
   callback (data);
}

var async2 = function (data, callback) {
   async1 (data, callback);
}

var async3 = function (data, callback) {
   async2 (data, callback)
}

var asyncSequence = function (data, callback) {
   async3 (data, callback);
}
```

This is of course much clearer, but it relies on asynchronous functions being run in a specific order. However, if you wanted to run `async1`, `async2` or `async3` in different orders, it is impossible to do this: you need these functions to retain their general form, and then write an `asyncSequence` function with n levels of nested callbacks (where n is the number of asynchronous functions you need to run in sequence). Worse, you need to write one of these sequence functions for each sequence that you are going to run.

Let's remember that synchronous functions don't have this problem, because they can `return` their values when they are done, and they **don't need to know who to call next**. In this way, synchronous functions don't lose their generality, and invoking sequences of them is straightforward.

This is the async problem: how to execute arbitrary sequences of asynchronous functions, without falling into callback hell. Or in other words, the problem is how to write sequences of asynchronous functions with an ease comparable to that of writing sequences of synchronous functions.

## Goodbye callbacks, hello aFunctions

Faced with the async problem, how can we make asynchronous functions behave more like synchronous functions, without callback hell and without loss of generality?

Let's see how we can transform callback hell into aStack <del>hell</del>.

**Callback hell:**

```javascript

var async1 = function (data, callback) {
   // Do stuff to data here...
   callback (data);
}

// `async2` and `async3` are just like `async1`

var asyncSequence = function (data, callback) {
   async1 (data, function (data) {
      async2 (data, function (data) {
         async3 (data, function (data) {
            callback (data);
         });
      });
   });
}
```

**With astack:**

```javascript
var a = require ('astack');

var async1 = function (s, data) {
   // If data is received as an argument, leave it as is. Otherwise, set data to `s.last`.
   data = data || s.last;
   // Do stuff to data here...
   a.return (s, data);
}

// async2 and async3 are just like async1

var asyncSequence = function (s, data, callback) {
   a.call (s, [[async1, data], async2, async3, callback]);
}
```

Let's count the differences between both examples:

1. In the first example, every async function takes a `callback` as its last argument. In the second one, every async function takes `s` (an `aStack`) as its first argument.
2. In the first example, `data` is passed directly to all functions. In the second one, `async2` and `async3` retrieve the data from `s.last`.
3. In the first example, `async1` finish their execution by invoking the `callback`. In the second one, they invoke a function named `a.return`, and pass to it both the `aStack` and the `a.returned` value.
4. In the first example, we have nested anonymous functions passing callbacks. In the second one, `asyncSequence` invokes a function named `a.call`, which receives as argument the `aStack` and an array with asynchronous functions and their arguments.
5. In the second example, every combination of function + arguments is wrapped in an array, even when the function has no arguments.

Let's see these differences in detail:

**Difference #1: instead of passing the callback as the last function, pass `s` (the `aStack`) as the first one**

Before:

```javascript
var async1 = function (data, callback)
```

After:

```javascript
var async1 = function (s, data) {
```

**Difference #2: instead of receiving the result from the previous function explicitly, receive it from `s.last`**.

```javascript
var async1 = function (s, data);
   // Do stuff to `data` here...
```

After:

```javascript
var async1 = function (s, data) {
   data = data || s.last;
   // Do stuff to `data` here...
```

**Difference #3: instead of passing the result of the function to the callback, invoke `a.return` and pass it both `s` and the result as its arguments**

Before:

```javascript
   callback (data);
```

After:

```javascript
   a.return (s, data);
```

**Difference #4: instead of callback hell, invoke a.call with an array of functions to be executed**

Before:

```javascript
var asyncSequence = function (data, callback) {
   async1 (data, function (data) {
      async2 (data, function (data) {
         async3 (data, function (data) {
            callback (data);
         });
      });
   });
}
```

After:

```javascript
var asyncSequence = function (s, data, callback) {
   a.call (s, [[async1, data], async2, async3, callback]);
}
```

Notice that `a.call` receives `s` as its first argument, and an array with functions as its second argument.

But what about `[async1, data]`?

**Rule #5: if one of the asynchronous functions receives explicit arguments, wrap the function and the arguments in an array.**

```javascript
      // `async1` receives `data` as an argument
      [async1, data]
```

## The elements of aStack

aStack is built upon five structures:

1) `aFunction`

2) `aStep`

3) `aPath`

4) `aInput`

5) `aStack`

### aFunction

An `aFunction` is a normal function (usually asynchronous, but not necessarily) that adheres to the following conventions:

1) Receives an `aStack` as its first argument. Henceforth, when writing code, I'll employ the convention of referring to the `aStack` as `s`.

   ```javascript
   // Incorrect
   var async = function (arg1, arg2) {
      ...
   }

   // Correct
   var async = function (s, arg1, arg2) {
      ...
   }
   ```

2) In any of its possible execution paths, the last thing that the function does is to invoke either `a.call`, `a.return` or any other `aFunction`, passing the `aStack` as the first argument to it.

   ```javascript
   // Incorrect
   var async = function (s, arg1, arg2) {
      if (arg1 === true) {
         ...
         // ERROR: this branch does not end with a call to an `aFunction`.
      }
      else {
         ...
         a.call (s, ...);
      }
   }

   // Correct
   var async = function (s, arg1, arg2) {
      // Correct: both possible execution branches finish with a call to an `aFunction`.
      if (arg1 === true) {
         ...
         a.call (s, ...);
      }
      else {
         ...
         a.call (s, ...);
      }
   }
   ```

3) In any execution path, there cannot be more than one call to `a.call` or another `aFunction` other than the last call.

   ```javascript
   // Incorrect
   var async = function (s, arg1, arg2) {
      a.call (s, ...);
      ...
      // ERROR: You already made a call to `a.call` above.
      a.call (s, ...);
   }

   // Incorrect
   var async2 = function (s) {
      async1 (s, ...);
      ...
      // ERROR: You already invoked one aFunction above.
      a.call (s, ...);
   }
   ```

4) To read the value returned by the last asynchronous function, use `a.last`.

   ```javascript
   a.call ([
      [a.return, 'somevalue'],
      function (s) {
         // This function will print 'somevalue'.
         console.log (s.last);
         a.return (s);
      }
   ])
   ```
In short:

1. Mind the `aStack`.
2. Call `a.call` or another `aFunction` as the last thing you do in every execution path.
3. Call `a.call` or another `aFunction` only once per execution path.
4. To retrieve the value of the previous `aFunction`, use `s.last`.

### `aStep`

An `aStep` is an `aFunction`, wrapped in an array, and followed by zero or more arguments.

`var aStep = [mysqlQuery, 'localhost', 'SELECT * FROM records']`

The `aStep` represents a single step in a sequence of asynchronous functions.

### `aPath`

The `aPath` is an array containing zero or more of the following:

- `aFunctions`
- `aSteps`
- `aPaths`

All of these are valid `aPaths`:

`[aStep, aFunction]`

`[aStep, aPath, aStep]`

`[]`

`[[], [[aStep]]]`

**Please note a very important point: an `aPath` cannot start with an aFunction, because it will be interpreted as an aStep!**.

```javascript
// Incorrect! `aStep` will be passed as an argument to `aFunction`
[aFunction, aStep]

// Correct
[[aFunction], aStep]
```

### `aInput`

An `aInput` is either an `aFunction`, an `aStep` or an `aPath`.

### `aStack`

The `aStack` is the argument that asynchronous functions will pass around instead of callbacks. It is an object that contains two keys:

1. `aPath`.
2. `last`, which contains the value returned by the last asynchronous function executed.

A generic `aStack` looks like this:

```javascript
var aStack = {
   aPath: [aStep, aStep, ...],
   last: ...
}
```

`last` can have any value (even undefined).

## Core `aFunctions`

### `a.call`

`a.call` is the main function of aStack and the soul of the library. Every `aFunction` calls either `a.call` directly, or through another `aFunction`. `a.call` keeps the ball rolling and ensures that all asynchronous functions are eventually executed.

`a.call` takes one or two arguments:
- An optional `aStack`.
- An `aInput` (`aFunction`, `aPath` or `aStep`).

If no `aStack` is passed to `a.call`, a new one will be created automatically. This is useful when you do the initial invocation of an asynchronous sequence.

Notice that you can pass any `aInput` to `a.call`.

```javascript
// Passing an `aFunction`
a.call (someFunction);

// Passing an aStep
a.call ([someFunction, 'arg1', 'arg2']);

// Passing an `aPath` with two `aSteps`
a.call ([
   [someFunction, 'arg1', 'arg2'],
   [someFunction, 'arg3', 'arg4']
]);

// Passing another `aPath` with two `aSteps`
a.call ([
   [someFunction],
   someFunction
]);
```

Note that, in the last example, although we wanted to invoke `someFunction` with no arguments, we have to wrap it in an array, otherwise `a.call` will think that the whole `aInput` (two consecutive invocations to `someFunction`) is actually a single invocation to `someFunction`, in which the second `someFunction` is actually an argument to the first.

Remember that `aPaths` can contain elements with arbitrary levels of nestedness. For example:

```javascript
a.call ([
   [someFunction, 'arg1', 'arg2'],
   [someFunction, 'arg3', 'arg4']
]);
```

is equivalent to:

```javascript
a.call ([[
   [someFunction, 'arg1', 'arg2'],
   [someFunction, 'arg3', 'arg4']
]]);
```

and to:

```javascript
a.call ([[
   [],
   [[[]], [someFunction, 'arg1', 'arg2'], []],
   [someFunction, 'arg3', 'arg4']
]]);
```

If you passed an invalid `aInput` to `a.call`, `a.call` will pass `false` to the first asynchronous function in `aStack.aPath`. In addition, an error message will be printed.

```javascript
var async1 = function (s) {
   a.call (s, /invalid/);
}

a.call ([
   [async1],
   function (s) {
      console.log ('The last asynchronous function returned', s.last);
      a.return (s, s.last);
   }
]);

// This will print the following:

// aStack error: aInput must be an array or function but instead is /invalid/ with type regex
// The last asynchronous function returned false

```

If the `aStack` is invalid, there's no valid `aFunction` to which to `a.return`, so `a.call` will directly `return` a `false` value and print an error message.

```javascript
// This will print an error message, plus `false`.
console.log (a.call (/invalid/));
```

### `a.return`

`a.return` takes two arguments:
- An `aStack` (since it's an `aFunction`).
- `last`, which is the value being `returned` by the invoking function.

Notice that the `aStack` argument is not optional (as it is in `a.call`), since `a.return` needs to return *somewhere*, and that somewhere is stored in `aStack.last`.

`a.return` does the following things:

1. Validate `s`.
2. Set `s.last` to the `last` argument.
3. Call `a.call` passing it `s` and an empty `aPath`.

Notice that `a.return` is an `aFunction`, and as such, the last thing that it does is to invoke `a.call`. Calling `a.call` with an empty `aPath` effectively works as a return function, because it ends up executing the first function in `s.aPath`.

### Some useful remarks

#### Implicit stack passing to `aInput`

When invoking `a.call` with a previously existing `aStack`, notice that the `aStack` is passed as the first argument to the function, but it is nowhere referenced in the `aInput`.

For example, in:

```javascript
   a.call (s, [
      [someFunction, 'arg1', 'arg2'],
      [someFunction, 'arg1', 'arg2']
   ]);
```

`s` will be automatically passed to both instances of `someFunction` as the first argument, and `arg1` and `arg2` will be the second and third arguments respectively. And by *automatically*, I mean through `a.call`.

#### Recursive calls

`aFunctions` can be recursive and they can call themselves, provided that they obey the general rules for `aFunctions` set above.

As a matter of fact, even `a.call` can call itself recursively.

```javascript
   a.call (s, [a.call, [
      [someFunction, 'arg1', 'arg2'],
      [someFunction, 'arg1', 'arg2']
   ]]);
```

#### `return a.return`

It is worthy to note the following pattern: if an aFunction has many conditional branches, you can both `return` and `a.return` in the same line. This has a double effect:

- Invoke `a.return`, keeping the asynchronous ball rolling.
- Invoke `return`, stopping execution at the current `aFunction`.

Take the following `aFunction`:

```javascript
var async = function (s) {
   if (s.last === false) a.return (s, false);
   else {
      if (s.last > 100) {
         // Do something here...
         a.return (s, ...);
      }
      else {
         // Do something else here...
         a.return (s, ...);
      }
   }
}
```

Using the `return a.return` pattern, you can rewrite it in a quite nicer form that avoids nested conditionals.

```javascript
var async = function (s) {
   if (s.last === false) return a.return (s, false);
   if (s.last > 100) {
      // Do something here...
      return a.return (s, ...);
   }
   // Do something else here...
   a.return (s, ...);
}
```

#### Beyond `s.last`

What happens when you have an asynchronous sequence more than two steps long and you wish to use the value of (say) the results of the first and second asynchronous functions in the third one? In this situation, `s.last` won't do, because it can only hold a single value.

The easiest way to cope with this is to set another variable in `s`.

```javascript
a.call ([
   [function (s) {
      s.value = 1;
      a.return (s);
   }],
   function (s) {
      a.return (s, 2);
   },
   function (s) {
      // This will print 's.value is 1 and s.last is 2'
      console.log ('s.value is', value, 'and s.last is', s.last);
      var value = s.value;
      // We delete `s.value` because we don't need it in subsequent calls
      delete s.value;
      a.return (s, [value, s.last]);
   }
]);
```

In this case, we are setting `s.value` to `1`. If you have long or nested sequences, this scheme can get dirty quickly, because essentially it creates a dynamic variable - hence, there's no separate scope for nested calls. To use these variables without problems, try to:

- Use unique names that you know are not used by other asynchronous functions in the same sequence.
- Delete the variables as soon as you use them.

One last important note: **please don't overwrite `s.aPath`**, since that's where `a.call` stores the state for a given asynchronous sequence!

#### Stack parameters

*Stack parameters* are a shorthand that allow you to reference return values in the `aStack` from within an `aStep`.

Stack parameters allow you to refer statically (through a string) to a variable whose value you won't know until the required async functions are executed. If it wasn't for them, you'd have to either hardwire the logic into the async function (for example, make it read `s.last`) or wrap a generic function with a specific lambda function that passes `s.last` to the former.

Stack parameters can also refer to other objects in the `aStack`.

```javascript
a.call ([
   [function (s) {
      s.data = 'b52';
      a.return (s, true);
   }],
   [async1, '@data', '@last']
]);
```

When `async1` is invoked, it will receive `'b52'` as its second argument and `true` as its third argument.

Stack parameters support dot notation so that you can access elements in arrays and objects.

```javascript
a.call ([
   [function (s) {
      a.return (s, {data: 'b52', moreData: [1, 2, 3]});
   }],
   [async1, '@last.data', '@last.moreData.1']
]);
```

When `async1` is invoked, it will receive `'b52'` as its second argument and `2` as its third argument.

Notice that you cannot use dots as part of the name of a stack parameter, because any dot will be interpreted as access to a subelement.

```javascript
a.call (s, [
   [function (s) {
      // Incorrect! Keys with dots in their name won't be resolved correctly.
      s ['key.with.dots'] = 'b52;
      a.return (s, ...);
   }],
   [function (s) {
      // data will be `undefined`
      var data = s ['key.with.dots'];
   }, '@key.with.dots']
]);
```

If there's an exception generated by the dot notation (because you are trying to access a subelement of something that's neither an array nor an object, or a subelement with a stringified key from an array instead of an object), the stack parameter will be replaced by `undefined`. This is the reason for the example above yielding `data` equal to `undefined`, as opposed to throwing an exception.

## Five more aFunctions

Besides `a.call` and `a.return`, aStack provides five additional functions:

- **`a.cond`**, for conditional execution.
- **`a.fork`**, for parallel execution.
- **`a.stop`**, for stopping a sequence when a certain value is `a.returned`.
- **`a.log`**, for logging the `aStack` and additional parameters.
- **`a.convert`**, for converting asynchronous functions that use callbacks into `aFunctions`.

### `a.cond`

`a.cond` is a function that is useful for asynchronous *conditional* execution. You can see it in action in the [conditional execution example above](https://github.com/fpereiro/astack#conditional-execution).

`a.cond` takes two or three arguments:
- An optional `aStack`.
- An `aCond` (which is an `aInput`).
- An `aMap`.

As with `a.call`, if no `aStack` is passed, a new one will be created automatically. This is useful when you do the initial invocation of an asynchronous sequence.

An `aMap` is an object where each key points to an `aInput`.

`a.cond` executes the `aCond`, obtains a result (we will call it `X`) and then executes the `aPath` contained at `aMap.X`.

Notice that `X` will be stringified, since object keys are always strings in javascript. For an example of this, refer to the conditional execution example above, where `true` and `false` are converted into `'true'` and `'false'`.

You can also insert a `default` key in the `aMap`. This key will be executed if `X` is not found in the `aMap`.

If neither `aMap.X` nor `aMap.default` are defined, an error message will be printed and `a.cond` will `a.return` `false`.

### `a.fork`

`a.fork` is a function that is useful for asynchronous *parallel* execution. You can see it in action in the [parallel execution example above](https://github.com/fpereiro/astack#parallel-execution).

`a.fork` takes one to four arguments:
- An optional `aStack`.
- `data`, which can be:
   - An array.
   - An object.
   - An `aInput`.
   - An object where every key maps to an `aInput`.
- An optional `fun`, which is a function that outputs an `aInput` for each item in `data`.
- An optional object `options`, which can have up to three keys:
   - `options.max`, an integer that determines the maximum number of concurrent operations.
   - `options.test`, a function that returns `true` or a falsy value, depending on whether `a.fork` can keep on firing concurrent operations.
   - `options.beat`, an integer that determines the amount of milliseconds to wait for new data after processing the existing one.

As with `a.call`, if no `aStack` is passed, a new one will be created automatically. This is useful when you do the initial invocation of an asynchronous sequence.

If you pass an empty array or object as `data`, `a.fork` will just `a.return` an empty array or object.

Let's see now how to use `a.fork`. We will also explain in detail the relationship between `data`, `fun` and `options`.

The simplest way of using `a.fork` is passing it an `aInput` (which can also be a single `aFunction` or `aStep`, although having only one operation to execute renders `a.fork` equivalent to invoking `a.call`).

```javascript
var async1 = function (s, data) {
   a.return (s, data);
}

a.fork ([
   [async1, 'a'],
   [async1, 'b'],
   [async1, 'c']
]);
```

In this case, `a.fork` will return `['a', 'b', 'c']`, that is, an array with one result per `aInput` passed.

`a.fork` takes care to wait for all `aSteps` to `a.return`, and to assign their results to the correct place in the array, no matter the order in which the `aSteps` finished their execution.

Slightly more interesting is passing as `data` an object where each value is an `aInput`.

```javascript
a.fork ({
   first:  [async1, 'a'],
   second: [async1, 'b'],
   third:  [async1, 'c']
});
```

In this case, `a.fork` will return `{first: 'a', second: 'b', third: 'c'}`, that is, one result per `aPath` passed.

Notice that `a.fork` returns an array/object where each element corresponds with the `aStep`/`aPath` it received, even if the concurrent operations returned *in an order different to which they were fired*.

Most of the time, however, you don't want to pass an `aInput`. Rather, you want to pass a function that generates an `aInput` *from an array of data*. This function, called `fun`, receives each item from `data` and outputs an `aInput` per each of them.

```javascript
a.fork (['a', 'b', 'c'], function (v) {
   return [async1, v];
});
```

In this case, `a.fork` will yield the same output than in the first example: `['a', 'b', 'c']`.

Now, let's go to the really interesting cases.

Imagine that you have a million data points, and you want to execute an async process for each of them. In most cases, firing all of these processes concurrently will overload your system. Through the `options` object, you can limit the amount of concurrent operations by setting `options.max` to `n` (where `n` is the maximum of concurrent operations).

```javascript
a.fork ([1, 2, 3, ..., 999999, 1000000], function (v) {
   return [async1, v];
}, {max: n});
```

Or imagine that `async1` is memory heavy and you want to limit the memory usage to a certain `threshold`. In this case, set `options.test` to a function that returns `true` when the memory usage is below `threshold`.

```javascript
a.fork ([1, 2, 3, ..., 999999, 1000000], function (v) {
   return [async1, v];
}, {test: function () {
   return process.memoryUsage.heapTotal < threshold;
});
```

You can combine both `options.max` and `options.test`.

```javascript
a.fork ([1, 2, 3, ..., 999999, 1000000], function (v) {
   return [async1, v];
}, {max: n, test: function () {
   return process.memoryUsage.heapTotal < threshold;
});
```

The most sophisticated use case is streaming data items into `a.fork`, without having to batch the data.

```javascript

var queue = [];

a.fork (queue, function (v) {
   return [async1, v];
}, {max: 1000, beat: 500});

event.on ('data', function (data) {
   queue.push (data);
});
```

In the above code, `a.fork` will receive data items as they are generated by `event`, simply by pushing the data items into `queue`. Because of how `a.fork` is implemented, if you pass an array to it, `a.fork` will process data items that are pushed to the array, *even if they are added after `a.fork` started executing*.

`options.beat` is an integer that tells `a.fork` how many milliseconds to wait for new data items. When `options.beat` is greater than 0, after reaching the end of its `data`, `a.fork` will wait and recheck if there are new `data` elements. If after this period there are no further elements, `a.fork` returns.

If neither `options.max` nor `options.test` are defined, `options.beat` is set to `0`. If either of these are defined, it is set to `100`. Naturally, you can override this value.

When `a.fork` executes parallel `aPaths`, it will create copies of the `aStack` that are local to them. The idea behind this is to avoid side effects between parallel asynchronous calls. However, you should bear in mind two caveats:

- Some objects, however, like circular structures or HTTP connections cannot be copied (or at least not easily), so if any of the parallel threads changes these special objects, the change will be visible to other parallel threads.
- If any of the parallel threads sets a key in its `aStack` that's neither `aPath` or `last`, that key will still be set after `a.fork` is done. If more than one parallel thread sets that key, the thread that sets it last (in real time, not by its order in the `aPath`) will overwrite the key set by the other thread.

```javascript
function (s) {

   s.data = [];

   var inner = function (s) {
      s.data.push (Math.random ());
      a.return (s, true);
   }

   a.fork (s, [[inner], inner, inner]);
}
```

After the call to `a.fork` above, the `aStack` will look something like:

`{last: [true, true, true], data: [0.6843374725431204]}`

Because the `aStack` is copied for each `aPath`, `s.data` will have just one element (the last value set) instead of three.

### `a.stop`

`a.stop` takes two or three arguments:
- An optional `aStack`.
- A `stopValue`.
- An `aInput`.

As with `a.call`, if no `aStack` is passed, a new one will be created automatically. This is useful when you do the initial invocation of an asynchronous sequence.

The `stopValue` is any value, which is coerced onto a string. `a.stop` starts executing the first `aStep` in the `aInput`, and then, if the value `a.returned` by it is equal to the `stopValue`, that value is `a.returned` and no further `aSteps` are executed. If it's not equal, then `a.stop` will execute the next `aStep`.

An important point: the `stopValue` cannot be equal to `'default'`.

`a.stop` is particularly useful when you have a sequence of asynchronous actions where you want to stop as soon as you find an error. A canonical example of this is doing multiple chained requests to a database in order to serve an HTTP request:

```javascript
// `aFunction` for accessing the database
var db = function (s, a, b, c) {
   dbAPIFunction (a, b, c, function (error, data) {
      if (error) s.error = error;
      a.return (s, error ? false : data);
   });
}

var serveRequest = function (request, response) {
   a.cond ([a.stop, false, [
      [db, ...],
      function (s) {
         // Do some processing of s.last here...

         db (s, ...);
      },
      function (s) {
         // Do some processing of s.last here...

         db (s, ...);
      },
      function (s) {
         // Do some processing of s.last here...

         db (s, ...);
      },
   ]], {
      false: function (s) {
         response.end (s.error);
      },
      default: function (s) {
         response.end (s.last);
      }
   });
}
```

In `serveRequest`, we did four chained db requests. If any of these requests yield an error, execution will be stopped immediately and the error will be sent to the `response`. If every request is successful, the output of the last db request will be sent to the `response`.

Notice how this pattern eliminates the boilerplate of checking for `error` after each db call.

### `a.log`

To inspect the contents of the `aStack`, place an `aStep` calling `a.log` just below the `aStep` you wish to inspect.

`a.log` prints the contents of the aStack (but without printing the `aPath`), plus further arguments you pass to it. It then `returns` `s.last`, so execution resumes unaffected.

### `a.convert`

If you start using aStack, very soon you'll find yourself writing wrappers around the core asynchronous functions you have to work with, because those functions use callbacks.

For example, consider the following `aFunction`, which reads the files existing in a path.

```javascript
var readdir = function (s, path) {
   fs.readdir (path, function (error, files) {
      if (error) {
         console.log (error);
         return a.return (s, false);
      }
      a.return (s, files);
   });
}
```

`readdir` is an `aFunction` that's a wrapper around `fs.readdir`. It invokes `fs.readdir`, passing `path` to it, plus a callback. The callback does the following:

- In case of error it will a) print the error and b) `a.return` `false`.
- In case of success, it will `a.return` `data`.

`a.convert` is an utility function that receives a standard asynchronous function and returns an `aFunction`, designed to simplify the writing of wrappers around standard (callback-oriented) asynchronous functions.

It takes one to three arguments:
- `fun`, a function which is the asynchronous function at the core of our new `aFunction`.
- `errfun`, an optional function that specifies what to print and what to `a.return` in case of error.
- `This`, an optional value for specifying the correct value of `this` for `fun`.

Using `a.convert`, we can rewrite `readdir` as follows:

```javascript
var readdir = function (s, path) {
   var read = a.convert (fs.readdir);
   read (s, path);
}
```

By default, if `fun` yields an error (which is passed as the first argument of its callback), the corresponding `aFunction` will log the error to the console, and `a.return` `false`.

However, if you want to either change the logging (or disable it entirely), or `a.return` a different value in case of error, you can pass an `errfun` when constructing your `aFunction`:

```javascript
var readdir = function (s, path) {
   var read = a.convert (fs.readdir, function (error) {
      console.log ('There was an error:', error);
      return undefined;
   });
   read (s, path);
}
```

Notice that the `errfun` passed as the second argument to `a.convert` prints a custom error, and then `returns` `undefined`. An important point: whatever is `returned` from the `errfun` will be `a.returned` in case there is an error.

`readdir` will now print a longer error message that starts with `There was an error:`, and `a.return` `undefined`, in case of finding an error.

By default, the value of `this` with which `fun` is invoked is set to `fun` itself. In some cases, however, this will break the asynchronous functions you are wrapping. To fix this, you can pass a third argument which will be used as the value for `this`.

If you don't need to specify `errfun` but you need to specify `This`, set `errfun` to `undefined`, since `This` can only be passed as the third argument to `a.convert`.

## Source code

The complete source code is contained in `astack.js`. It is about 310 lines long.

Below is the annotated source.

```javascript
/*
aStack - v3.0.0

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to readme.md to read the annotated source.
*/
```

### Setup

We wrap the entire file in a self-executing lambda function. This practice is usually named *the javascript module pattern*. The purpose of it is to wrap our code in a closure and hence avoid making our local variables exceed their scope, as well as avoiding unwanted references to local variables from other scripts.

```javascript
(function () {
```

Since this file must run both in the browser and in node.js, we define a variable `isNode` to check where we are. The `exports` object only exists in node.js.

```javascript
   var isNode = typeof exports === 'object';
```

This is the most succinct form I found to export an object containing all the public members (functions and constants) of a javascript module.

```javascript
   if (isNode) var a = exports;
   else        var a = window.a = {};
```

### Helper functions

The `type` function below is <del>copypasted</del> taken from [teishi](https://github.com/fpereiro/teishi). This is because I wanted to write astack without any dependencies and I didn't want to add teishi (and [dale](https://github.com/fpereiro/dale), on which teishi relies) just for a single function.

The purpose of `type` is to create an improved version of `typeof`. The improvements are two:

- Distinguish between types of numbers: `nan`, `infinity`, `integer` and `float` (all of which return `number` in `typeof`).
- Distinguish between `array`, `date`, `null`, `regex` and `object` (all of which return `object` in `typeof`).

For the other types that `typeof` recognizes successfully, `type` will return the same value as `typeof`.

`type` takes a single argument (of any type, naturally) and returns a string with its type.

The possible types of a value can be grouped into three:
- *Values which `typeof` detects appropriately*: `boolean`, `string`, `undefined`, `function`.
- *Values which `typeof` considers `number`*: `nan`, `infinity`, `integer`, `float`.
- *values which `typeof` considers `object`*: `array`, `date`, `null`, `regex` and `object`.

If you pass `true` as a second argument, `type` will distinguish between *true objects* (ie: object literals) and other objects. If you pass an object that belongs to a class, `type` will return the lowercased class name instead.

The clearest example of this is the `arguments` object:

```javascript
type (arguments)        // returns 'object'
type (arguments, true)  // returns 'arguments'
```

Below is the function.

```javascript
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
```

`copy` copies a complex value (an array or an object). It will produce a new output that is equal to the input. If it finds circular references, it will leave them untouched.

The "public" interface of the function (if we allow that distinction) takes a single argument, the `input` we want to copy. However, we define a second "private" argument (`seen`) that the function will use to pass information to recursive calls.

This function is recursive. On recursive calls, `input` won't represent the `input` that the user passed to the function, but rather one of the elements that are contained within the original `input`.

```javascript
   var copy = function (input, seen) {
```

We get the `type` of `input` and store it at `typeInput`.

```javascript
      var typeInput = type (input);
```

If `input` is not a complex object, we return it.

```javascript
      if (typeInput !== 'object' && typeInput !== 'array') return input;
```

If we are here, `input` is a complex object. We initialize `output` to either an array or an object, depending on the type of `input`.

```javascript
      var output = typeInput === 'array' ? [] : {};
```

We create a new array `Seen`, to store all references to complex objects.

```javascript
      var Seen = [];
```

If the `seen` argument received above is not `undefined`, this means that the current call to `copy` was done recursively by `copy` itself. If this is the case, `seen` contains a list of *already seen* objects and arrays. If this is the case, we copy each of the references into `Seen`, a new array.

```javascript
      if (seen !== undefined) {
         for (var i in seen) Seen [i] = seen [i];
      }
```

`seen` is where we store the information needed to detect circular references. For any given `input`, `seen` will contain a reference to all arrays and objects that *contain* the current input. For example, if you have an array `a` (the outermost element) which contains an object `b`, and that object `b` contains an array `c`, these will be the values of `seen`:

`When processing a: []`

`When processing b: [a]`

`When processing c: [a, b]`

Now imagine that `c` contains a reference to `a`: this would be a circular reference, because `a` contains `c` and `c` contains `a`. What we want to do here is leave the reference to `a` within `c` untouched, to avoid falling into an infinite loop.

On the initial (non-recursive) call to the function, `seen` will be `undefined`.

If `seen` is already an array, it will be replaced by a new array with the same elements. We do this to create a *local copy* of `seen` that will only be used by the instance of the function being executed (and no other parallel recursive calls).

Why do we copy `seen`? Interestingly enough, for the same reason that we write this function: arrays and objects in javascript are passed by reference. If many simultaneous recursive calls received `seen`, the modifications they will do to it will be visible to other parallel recursive calls, and we want to avoid precisely this.

The detection of circular references in `copy` is best thought of as a path in a graph, from container object to contained one. For any point in the graph, we want to have the list of all containing nodes, and verify that none of them will be repeated. Any other path through the graph is what I tried to convey by *parallel recursive function call*.

We now iterate the elements of `input`.

```javascript
      for (var i in input) {
```

We initalize a local variable `circular` to `false`, to track whether the object currently being iterated has already been *seen* before.

```javascript
         var circular = false;
```

We get the type of the element.

```javascript
         typeInput = type (input [i]);
```

If the element is a complex object:

```javascript
         if (typeInput === 'object' || typeInput === 'array') {
```

We iterate `Seen`. If any of its values is equal to `input [i]`, we set `circular` to `true` and break the loop.

```javascript
            for (var j in Seen) {
               if (Seen [j] === input [i]) {
                  circular = true;
                  break;
               }
            }
```

If the element is complex but it hasn't been *seen* before, we push it into `Seen`.

```javascript
            if (! circular) Seen.push (input [i]);
         }
```

For each element of `input`, we assign it to the corresponding element of `output`, making a recursive invocation of `copy`. If `input [i]` is not a complex object, `copy` will return its value. If `input [i]` is complex, `copy` will return a new array or object that's a copy of `input [i]`. And if the element is a circular reference, we don't make a recursive call to `copy`.

```javascript
         output [i] = circular ? input [i] : copy (input [i], Seen);
      }
```

We return `output` and close the function.

```javascript
      return output;
   }
```

We define a function `e` for performing two functions:
- log its arguments to the console.
- Return `false`.

```javascript
   var e = function () {
      console.log.apply (console, arguments);
      return false;
   }
```

### Validation

We define an object `a.validate` to hold the validation functions.

```
   a.validate = {
```

We will now define `a.validate.aInput`. This function both validates an `aInput` and tells us which kind of `aInput` we are processing. This function will return `'aFunction'` if the input is an `aFunction`, `'aStep'` if the input is an `aStep`, `'aPath'` if the input is an `aPath`, and `false` otherwise.

```javascript
      aInput: function (input) {
```

A valid `aInput` must be either of type `function` or `array`. If it is neither, we print an error and return false.

```javascript
         var typeInput = type (input);
         if (typeInput !== 'array' && typeInput !== 'function') {
            return (e ('aStack error: aInput must be an array or function but instead is', input, 'with type', typeInput));
         }
```

If `input` is a function, we will consider it to be an `aFunction`. Short of parsing the source code, there's no way to guarantee that a function is an `aFunction`, so we leave to the user the burden of checking whether `aFunctions` are really valid `aFunctions`.

```javascript
         if (typeInput === 'function')        return 'aFunction';
```

If we're here, `input` is an array. If the first element of `input` is a function (presumably an `aFunction`), we will consider `input` to be an `aStep`.

```javascript
         if (type (input [0]) === 'function') return 'aStep';
```

If `input` is an array and not an `aStep`, we will assume it is an `aPath`. Validation of its constituent elements will be deferred to recursive calls to this function.

```javascript
                                              return 'aPath';
      },
```

We will now write a function for validating the `aStack`.

```javascript
      aStack: function (s) {
```

The `aStack` must be an object.

```javascript
         if (type (s) !== 'object') return (e ('aStack error: aStack must be an object but instead is', s, 'with type', type (s)));
```

`aStack.aPath` must be an `aPath` (and not just any `aInput` - we'll see why below).

```javascript
         if (a.validate.aInput (s.aPath) === false) return false;
```

If we're here, `aStack` is valid. We return `true` and close both the function and the `a.validate` module.

```javascript
         return true;
      }
   }
```

We will write here a function `a.create` for initializing an empty `aStack`.

```javascript
   a.create = function () {
```

We return an empty `aStack`, which is just an object with the key `aPath` set to an empty array (which represents an `aPath` with zero elements).

```javascript
      return {aPath: []}
   }
```

We will write a function `a.flatten` that takes an `aInput` (`aFunction`, `aStep` or `aPath`), validates it, and returns a flattened `aPath` containing zero or more `aSteps`.

The purpose of this function is twofold:

- Validate `input` through `a.validate.aInput`.
- Transform any `input` into a flattened `aPath` (or `false`, if `input` turns out to be invalid).

This function will call itself recursively in case its input is an `aPath`.

```javascript
   a.flatten = function (input) {
```

We validate the `input` using `a.validate.aPath` and store the result in a local variable `type`.

```javascript
      var type = a.validate.aPath (input);
```

If `input` is invalid we return `false`.

```javascript
      if (type === false)   return false;
```

If `input` is an `aFunction`, we wrap it in an array twice (once to make it into an `aStep`, and the second time to make it into an `aPath`) and return it.

```javascript
      if (type === 'aFunction') return [[input]];
```

If `input` is an `aStep`, we wrap it in an array and return it - thus, returning an `aPath` with a single `aStep` inside it.

```javascript
      if (type === 'aStep') return [input];
```

If `input` is an `aPath`, we create an array named `aPath` where we'll store the `aSteps` from `input`.

```javascript
      if (type === 'aPath') {
         var aPath = [];
```

We iterate through the elements of `input`, which presumably is an `aPath`.

```javascript
         for (var i in input) {
```

We invoke `a.flatten` recursively on each of the elements of the `aPath` and store this in a local variable `result`.

```javascript
            var result = a.flatten (input [i]);
```

If the recursive call returns `false`, it means that this particular element of the `aPath` is not a valid `aInput`. Hence, we return `false`, thus discarding `input`. If any part of `input` is invalid, we consider all of it to be invalid.

```javascript
            if (result === false) return false;
```

If we're here, all elements of the `aPath` are valid. we concatenate the result (which will be a flattened `aPath`) with `aPath`.

```javascript
            else aPath = aPath.concat (result);
         }
      }
```

We return the flattened `aPath` and close the function.

```javascript
      return aPath;
   }
```

### Sequential execution

We will now define `a.call`, the main function of the library.

```javascript
   a.call = function () {
```

`a.call` is a [variadic function](http://en.wikipedia.org/wiki/Variadic_function), because it can be invoked with or without an `aStack`.

We will define a local variable `arg`, initializing to `0`, to count how many arguments we have already processed. This pattern allows for succint argument recognition code in variadic functions, as we'll see below.

```javascript
      var arg = 0;
```

If the first argument received by the function is an object, it can only be an `aStack`, since the second argument must be either an `aFunction` (which is a function) or an `aPath` or `aStep` (which is an array). In this case, we will assign `aStack` to `arguments [0]` and increment `arg`. Otherwise, we will initialize the `aStack`.

```javascript
      var s        = type (arguments [arg]) === 'object' ? arguments [arg++] : a.create ();
```

Notice that if there's an `aStack` present, `arg` will now be `1`, otherwise it will be `0`. Effectively, `arg` keeps track of which argument we have to "parse" next.

We will set a local variable `aPath` to the next argument. Although this can be an `aFunction`, `aStep` or also invalid, we will call it `aPath`, since we will soon validate it and convert it to a flattened `aPath`.

```javascript
      var aPath    = arguments [arg++];
```

Notice that we increment `arg` unconditionally.

`a.call` supports a private argument, `external`, which is a boolean flag that is passed as the last argument to `a.call`. We will see the purpose of `external` below.

For now, we just need to know that if the last argument passed to `a.call` is `true`, `external` will be set to `false`, and it will be set to `true` otherwise.

```javascript
      var external = arguments [arg] === true ? false : true;
```

We validate the `aStack`. If it's not valid, we `return` `false`. Notice that we cannot `a.return` because there's no valid `aFunction` to which to `a.return`.

```javascript
      if (a.validate.aStack (s) === false) return false;
```

The default case is that `external` will be `true`. If you're reading this function for the first time, assume that we will enter the block below.

```javascript
      if (external) {
```

We invoke `a.flatten`, to transform our `aInput` it into a flattened `aPath`.

```javascript
         aPath = a.flatten (aPath);
```

This action has two benefits:

- We don't need to clutter `a.call` (or other core `aFunctions`, as we shall see) with logic to detect and deal with the cases where `aPath` is an `aFunction` or `aStep` or a nested `aPath`.
- We effectively create a local copy of `aPath`, since `a.flatten` does not modify its inputs and returns a brand new `aPath`. Since we'll use destructive modifications on the `aPath` below, this copying avoids modifications to the original `aPath` passed to the function.

*** stylistical diggression ***

Let's recall that `a.flatten` works recursively on its input, processing all of it at once. I hesitated long before deciding to do a "deep" operation in the `aPath`, since deep operations in recursive structures are tantamount to batching, something that is [ill-advised](http://en.wikipedia.org/wiki/Taiichi_Ohno). In other libraries, such as [teishi](https://github.com/fpereiro/teishi) or [lith](https://github.com/fpereiro/lith), whenever I deal with recursive structures (`aPaths` are recursive structures, because they can contain themselves), I make validation and generation operations to deal with the topmost level of the input, and leave the deeper structures to be validated and generated through recursive function calls.

For aStack, however, I have decided that batching is the way to go. As soon as `a.call` (or other basic `aFunctions`) receives its input, it process it all at once, converts it to a normal form (a flattened `aPath`, which is an `aPath` where every step is an `aStep`), and then proceed. Why did I decide this?

The core difference between aStack and other libraries like teishi and lith is that in aStack, recursive calls cannot be done synchronously. Hence, if `a.call` were to process its input on a shallow way, leaving nested structures for recursive calls, it would have to do this asynchronously. This has two consequences which are highly undesirable:

- If a part of the input is invalid, the user may have to wait a considerable amount of time to find out, because asynchronous functions may take a long time to be executed, and each part of the input won't be validated until it is its turn to be executed.
- For every execution, aStack would have to walk `input`, find the first `aFunction` or `aStep`, remove it from `input`, and execute it. This requires keeping additional state. Furthermore, the implementation would be quite complex. This extra state and complexity stems from the fact that we need to manage "by hand" what otherwise would be done by recursive calls.

For both reasons (decreased user experience, inefficiency/complexity of implementation) I have decided against a recursive approach to validation in aStack.

*** end stylistical diggression ***

Although we cannot avoid batching, we can avoid flattening an `aPath` more than once. Other functions in the library (`a.cond` and `a.stop`) need to flatten the `aInput` they receive, before invoking `a.call`. When they invoke `a.call` with an already flattened `aPath`, they will pass `true` as the last argument to `a.call`, and thus letting the latter know that it needs not to either flatten or validate the `aPath`. Here we can understand what `external` stands for: it means that the call to `a.call` was done from an external source that didn't take the trouble to flatten/validate the `aPath` it's passing to `a.call`.

If the `aPath` is invalid, we both `return` and `a.return` `false`.

In any case, we also close the conditional block relying on `external`.

```javascript
         if (aPath === false) return a.return (s, false);
      }
```

The `return a.return` pattern serves multiple purposes:
- By placing `return`, we stop the execution flow in the current function.
- By placing `a.return`, we jump to the next function in the `aStack`, hence we activate the "next" asynchronous function.
- If the `aStack` is also `false`, the function will return a `false` value, so if an asynchronous sequence is impossible (because the aSync stack is invalid), the calling function will know this immediately, in a synchronous way.

Recall that `s.aPath` is a flattened `aPath`. We know this because it's either an empty `aPath` (as created by `a.create`), or because it's the product of previous calls to `a.call` or other `aFunctions` (remember that one of the principles of `aFunctions` is not to modify `s.aPath` directly).

Now, we take `s.aPath`, which is a sequence of all functions that are already in the execution stack, and *prepend* to it the new `aPath` that we received as an argument. This is tantamount to putting the `aPath` at the top of the stack. Since both `aPath` and `s.aPath` are flattened, we know we're dealing with a simple stack (instead of a stack of stacks).

After this step, `s.aPath` will be the updated stack, containing all async functions to be executed in the correct order.

`a.call` does three main things:
- Flattens and validates the `aInput` into an `aPath` - we'll call this the `new aPath`.
- Prepends the `new aPath` to `s.aPath`.
- Executes the first function of this combined `aPath`, passing it the `aStack`.

In essence, when you pass an `aInput`, you are putting it **on top** of the previously existing stack of functions to execute, which is held in `s.aPath`.

This stack-like nature of `a.call` allows for nested asynchronous calls and recursive `aFunctions` without any extra effort. When `a.call` encounters a new call, it is flattened, pushed onto the stack and then executed. The previously existing functions are still there, waiting for the call you just made. An execution thread is simply a pipeline where a single function is executed every time. By using a stack, we convert nested structures into a flattened sequence that executes things one after another.

```javascript
      s.aPath = aPath.concat (s.aPath);
```

Now, if the stack has no functions left to execute (because both `aPath` and `s.aPath` were empty), we `return` the value contained in `s.last`. Usually, normal `return` values from asynchronous functions are useless, because the synchronous execution flow didn't stick around to see the result of the async calls. However, given the choice of `return`ing `undefined` or returning the proper last value (which is `s.last`), we opt for the latter.

```javascript
      if (s.aPath.length === 0) return s.last;
```

We take out the first element of `s.aPath`, which is an `aStep`. We store it in a local variable `aStep`.

```javascript
      var aStep = s.aPath.shift ();
```

We take out the first element of `aStep`, which is an `aFunction`. We store it in a local variable `aFunction`.

```javascript
      var aFunction = aStep.shift ();
```

We now deal with stack parameters, replacing their placeholders with the actual parameters.

We iterate the arguments in the `aStep`. We name the iterator `Argument` with a capital `A` because `argument` is a reserved javascript word.

```javascript
      for (var Argument in aStep) {
```

If the argument is a string and it starts with an `@` following by one or more characters, we consider it to be a reference to a stack parameter.

```javascript
         if (type (aStep [Argument]) === 'string' && aStep [Argument].match (/^@.+$/)) {
```

Since stack parameters support dot notation (to access properties of nested arrays and objects) we have the risk of referencing a subelement of something that's neither an array or an object. If that happens, the program will throw an exception. Hence, we wrap this section in a `try` clause.

```javascript
            try {
```

We create a local variable `parameterName` where place the stack parameter name, which is the argument itself minus the `@` sign. For example, if the argument is `'@last'`, `parameterName` will be `last`.

```javascript
               var parameterName = aStep [Argument].match (/^@.+/) [0].replace (/^@/, '');
```

We split `parameterName` into an array, using the dots as separators. If, for example, `parameterName` is `'last.data'`, it will now be `['last', 'data']`.

```javascript
               parameterName = parameterName.split ('.');
```

We iterate the elements of `parameterName`, which can be one or more.

```javascript
               for (var item in parameterName) {
```

If this is the first element of the loop, we set `aStep [Argument]` (the argument we're currently processing) to the corresponding value in the `aStack`.

```javascript
                  if (item === '0') aStep [Argument] = s [parameterName [item]];
```

If this is not the first element of the loop, this means that dot notation was used. Hence, we access the subelements of `aStep [Argument]`. By using `aStep [Argument]` as our placeholder, in each successive iteration we select the appropriate subelement and set it to `aStep [Argument]`, until it has the intended value.

If it wasn't for this recursive approach, we'd probably have to use `eval`.


```javascript
                  else aStep [Argument] = aStep [Argument] [parameterName [item]];
```

We close the `parameterName` loop and the `try` clause.

```javascript
               }
            }
```

We write a `catch` block. If we're here, the dot notation generated an exception. Hence, we deem the argument to be `undefined`.

```javascript
            catch (error) {
               aStep [Argument] = undefined;
            }
```

We're done with stack parameters, so we close the conditional and the `aStep` loop.

```javascript
         }
      }
```

We place the `aStack` as the first element of the `aStep`.

```javascript
      aStep.unshift (s);
```

We invoke the `aFunction`, passing the `aStep` as the array of arguments that will be applied to it. Since this function is (or should be) an `aFunction`, when that function is done doing its asynchronous actions, it will invoke either `a.call` or another `aFunction` (which in turn will invoke `a.call`), so this process will be repeated until all asynchronous functions in the stack are executed.

Notice we place a `return` clause, in case the `aFunction` returns early (because recursive invocations to `a.call` `returned` `false` (invalid `aStack`) or one of them was invoked with an empty `aPath`.

```javascript
      return aFunction.apply (aFunction, aStep);
```

There's nothing else to do, so we close the function.

```javascript
   }
```

We will now define `a.return`.

`a.return` takes two arguments, `s` and `last`.

```javascript
   a.return = function (s, last) {
```

We validate that `s` is an object. If it is false, we use a synchronous `return` since there's no valid `aFunction` in the `s.aPath` to which to `a.return` the `false` value.

```javascript
      if (type (s) !== 'object') return (e ('aStack error: aStack must be an object but instead is', s, 'with type', type (s)));
```

We set the `last` key of the `aStack` to the second argument, `last`.

```javascript
      s.last = last;
```

We invoke `a.call`, passing the `aStack` and an empty `aPath`. Because of how `a.call` works, this will effectively invoke the next function within `s.aPath`, so that `last` is actually `a.returned` to the next function.

Also notice that we pass `true` as the last argument to `a.call`, to tell that function not to bother flattening the empty array we're passing as `aPath` (since it's empty).

```javascript
      return a.call (s, [], true);
   }
```

### Conditional execution

`a.cond` is the function that provides conditional asynchronous execution. It is variadic, so we'll determine its arguments below.

```javascript
   a.cond = function () {
```

As with `a.call` above, we use a local variable `arg` to keep count of the "parsed" arguments.

If the first argument to the function is an object, we consider that element to be the `aStack`. Otherwise, we create it.

```javascript
      var arg = 0;
      var s        = type (arguments [arg]) === 'object' ? arguments [arg++] : a.create ();
```

We define `aCond`, which is the `aInput` that represents the asynchronous condition. Depending on whether an `aStack` was passed or not, it is either the first or the second argument.

```javascript
      var aCond    = arguments [arg++];
```

We define `aMap`, which is an object containing one `aInput`. Depending on whether an `aStack` was passed or not, it is either the second or the third argument.

```javascript
      var aMap     = arguments [arg++];
```

Since `a.stop` below invokes `a.cond`, and we never want to flatten an `aPath` more than once, we set this flag to precisely avoid this, as we did on `a.call` above.

```javascript
      var external = arguments [arg] === true ? false : true;
```

If `aMap` is not an object, we print an error and `a.return` `false`.

```javascript
      if (type (aMap) !== 'object') return a.return (s, e ('aStack error: aMap has to be an object but instead is', aMap, 'with type', type (aMap)));
```

As we did above in `a.call`, if the `aPath` (which in this case is named `aCond`) was not validated/flattened, we do so. If it is invalid, we `return` `false`, both synchronously and asynchronously.

```javascript
      if (external) {
         aCond = a.flatten (aCond);
         if (aCond === false) return a.return (s, false);
      }
```

If we're here, we know that `aCond` is now a flattened `aPath`. We now want to execute `aCond` asynchronously (by invoking `a.call`), and after it is done, to execute the appropriate conditional asynchronous branch.

The simplest way to do this is to append an `aStep` to the `aCond`, containing a special `aFunction` which will be executed after the last asynchronous function of `aCond`.

```javascript
      aCond.push ([function (s) {
```

If there's a key in `aMap` which is equivalent to `s.last` (the value `a.returned` by the last `aFunction` of `aCond`), we invoke `a.call`, passing as `aPath` the corresponding branch of the `aMap`.

```javascript
         if (aMap [s.last]) return a.call (s, aMap [s.last]);
```

Notice how `aMap` is not passed as an explicit parameter, but rather is bound to the function because it's defined within the scope of the current invocation of `a.cond`. Such are the joys of lexical scope.

Now, if `aMap [last]` is not defined but `aMap.default` is, we pass that branch to `a.call`.

```javascript
         if (aMap.default)  return a.call (s, aMap.default);
```

If neither a branch corresponding to `s.last` nor a `default` branch are defined in the `aMap`, we report an error message and `return` `false`.

```javascript
         return a.return (s, e ('aStack error: The last aFunction received', last, 'as last argument', 'but aMap [', last, '] is undefined and aMap.default is also undefined!', 'aMap is:', aMap));
```

There's nothing else to do in this `aFunction`, so we close it. We also close its containing `aStep`.

```javascript
      }]);
```

The last thing to do is to invoke `a.call`, passing it the modified `aCond` and also the `external` flag, so that `a.call` will not flatten the `aCond` again.

```javascript
      return a.call (aStack, aCond, true);
   }
```

### Parallel execution

`a.fork` is the function that provides parallel asynchronous execution. It is variadic, so we'll determine its arguments below.

```javascript
   a.fork = function () {
```

Like `a.call` and `a.cond` above, `a.fork` can be invoked with or without an `aStack`. We determine whether the `aStack` is present or not. Notice that `data`, the following argument, might be an object, so it's not enough to determine that the first argument it's an object. In this case, we add an extra check: we consider the first element to be an `aStack` if it has an `aPath` element that's an array.

In the unlikely case that you 1) don't pass an `aStack` to `a.fork` and 2) `data` is an object that has an `aPath` key, `a.fork` will confuse `data` with `aStack`.

However, because of the variability of the rest of the arguments of this function, this is the only way I see to determine the presence or absence of an `aStack`.

If the `aStack` is not present, we create it.

```javascript
      var arg = 0;
      var s       = type (arguments [arg]) === 'object' && type (arguments [arg].aPath) === 'array' ? arguments [arg++] : a.create ();
```

- `data` is a mandatory argument that contains an array or object.
- `fun` is an optional function. If it's not present, `data` will be considered as an `aFunction` (if it's a function), as an `aStep`/`aPath` (if it's an array), or as an object where every key is an `aStep`/`aPath`. If `fun` *is* present, `data` will be fed to the `fun` - the output will be an `aStep` or `aPath` per each item in `data`.
- `options` is an optional object. If it's not defined, we initialize it to an empty object.

```javascript
      var data    = arguments [arg++];
      var fun     = type (arguments [arg]) === 'function' ? arguments [arg++] : undefined;
      var options = arguments.length > arg && type (arguments [arg]) === 'object' ? arguments [arg] : {};
```

If `data` is a function, we wrap it in an array. If it's not a function, an array or an object, we print an error and `a.return` false.

The case where `data` is a single `aFunction` or `aStep` is only added for consistency, since the purpose of `a.fork` is performing *multiple* simultaneous operations.

```javascript
      var dataType = type (data);
      if (dataType === 'function') data = [data], dataType = 'array';

      if (dataType !== 'array' && dataType !== 'object') {
         return a.return (s, e ('aStack error: data passed to a.fork must be a function, an array or an object but instead is', data, 'with type', dataType));
      }
```

We validate the `options` object, placing the following conditions:
- `options.max`, if defined, must be an integer greater than 0.
- `options.beat`: same than `options.max`.
- `options.test`, if defined, must be a function.

```javascript
      if (options.max && (type (options.max)   !== 'integer' || options.max  < 1)) return a.return (s, e ('aStack error: if defined, options.max passed to a.fork must be an integer greater than 0 but instead is',  options.max, 'with type', type (options.max)));
      if (options.beat && (type (options.beat) !== 'integer' || options.beat < 1)) return a.return (s, e ('aStack error: if defined, options.beat passed to a.fork must be an integer greater than 0 but instead is', options.beat, 'with type', type (options.beat)));
      if (options.test && type (options.test)  !== 'function')                     return a.return (s, e ('aStack error: If defined, options.test passed to a.fork must be a function but instead is',                options.test, 'with type', type (options.test)));
```

If `options.beat` is not set, we initialize it to `0` if `options.max` and `options.test` are both `undefined`. Otherwise, we initialize it to `100`.

```javascript
      options.beat = options.beat || ((options.max || options.test) ? 100 : 0);
```

In the special case where data is empty, we return an empty array/object (corresponding to `data`'s type). Notice that when `data` is an array, we only return immediately if `options.beat` is zero. If `options.beat` is not zero, `a.fork` will wait for new elements to be added to the array until `options.beat` is elapsed.

```javascript
      if (dataType === 'array'  && data.length === 0 && options.beat === 0) return a.return (s, []);
      if (dataType === 'object' && Object.keys (data).length === 0)         return a.return (s, {});
```

We determine a local variable `output` to be either an array or an object, depending on `aPathType`. Notice that when `data` is an array, `output` will be an empty array, whereas if `data` is an object, `output` will be now equal to `data`.

```javascript
      var output = dataType === 'array' ? [] : data;
```

If `data` is an object, we set `data` to the *keys* of data. The values of data will still be available in `output`. The reason for this operation will soon become clear.

```javascript
      if (dataType === 'object') data = Object.keys (data);
```

We set `counter` and `active` to two counters, initialized to `0`. `counter` will count how many concurrent processes have been spawned, whereas `active` will count how many concurrent processes are being executed at a given time.

```javascript
      var counter = 0;
      var active  = 0;
```

We initialize a variable `test` to `true`. This variable will hold the current value of `options.test`, if the test is defined.

```javascript
      var test = true;
```

We create a helper function `fire`, that will return `true` or `false`. It will return true only if:
- `counter` is less than `data.length`, which means we still have to spawn more functions.
- `test` is `true`, which means that `options.test` is either absent or it allows us to keep on spawning functions.
- `options.max` is either `undefined`, or if defined, it is less than the amount of active functions running right now.

What this function does is respond two questions:
- Do we need to keep on spawning functions?
- Can we afford to do it currently?

```javascript
      var fire = function () {
         return counter < data.length && test && (! options.max || options.max > active);
      }
```

Because it would be computationally expensive to compute `options.test` every time a concurrent process starts or ends, we will execute this function at intervals, using `options.beat` as the time interval. We set this interval in a local variable `testInterval`.

```javascript
      var testInterval;
```

If `options.test` is defined, every `option.beat` milliseconds, we set `test` to the result of executing `options.test`. We then execute `fire`, and if it's `true`, we execute `load`, which is the function that spawns more functions. It is necessary to invoke `load` here, because if `a.fork` was waiting for `test` to become `true`, without firing `load` the spawning process won't restart.

```javascript
      if (options.test) {
         testInterval = setInterval (function () {
            test = options.test ();
            if (fire ()) load ();
         }, options.beat);
      }
```

Now we get to the interesting part: we need to make parallel asynchronous calls, without any kind of race conditions, and make `a.fork` return the results (`output`) only when the last parallel call has `a.returned`.

To this effect, we'll define a helper function within the scope of the current call to `a.fork`. This function, `collect`, will take two arguments: an `aStack` (because it's an `aFunction`) and a `key`.

`collect` is the `aFunction` that will be called *after* each `aStep` run in parallel, and to which we'll task to *collect* the results of each parallel `aStep`.

```javascript
      var collect = function (stack, key) {
```

Notice that the `aStack` passed to `collect` is named `stack`, so that `collect` can also refer to the original `aStack`.

The first thing that this function does is to set `output [key]` to the value `a.returned` by the last asynchronous function. This value will have been `a.returned` by the `aStep` at position `key` of the `aPath`. Notice this will work for both an array and an object. It will also work if elements are appended to `data` after `a.fork` fired.

```javascript
         output [key] = stack.last;
```

Notice that `output` is the array/object we created a few lines above. By defining `collect` within each call to `a.fork`, we allow each parallel execution thread to have a reference common to all of them, which allows all of them to behave as a unit.

In case `data` is an `array`, `output [key]` will be undefined before setting it to `stack.last`. If it's an object, `output [key]` will contain the `aStep`/`aPath` being executed (or data that generates this `aStep`/`aPath` through `fun`). In this case, that value will be replaced by the `a.returned` value of the corresponding `aStep`/`aPath`.

If in the `stack` there are any keys that are neither `aPath` nor `last` (that is, other stack parameters), we place them in the original `aStack`, which is the `aStack` that `a.fork` received. If there's any overlap within stack parameters from different parallel `aSteps`, the last `aStep` to `a.return` will prevail. For example, if `aPath [4]` sets `aStack.data` and `aPath [2]` sets `aStack.data` too, if `aPath [2]` `a.returns` later than `aPath [4]`, it will overwrite the value of `aStack.data` set by `aPath [4]`.

```javascript
         for (var key in stack) {
            if (key !== 'aPath' && key !== 'last') s [key] = stack [key];
         }
```

We decrement `active`, since if we're invoking `collect`, it's because one of the `aSteps` just `a.returned` (and hence, it's not executing anymore).

```javascript
         active--;
```

At this point, we invoke `fire` and if it returns `true`, we invoke `load`. Notice that so far we've invoked `load` in two places:
- When we recalculate `options.test`.
- When a function `a.returns` and `active` goes down, hence making room for another function in case `active` === `options.max`.

A simpler way of putting this is: the two points where so far we invoked `load` are both places where a resource has been freed.

```javascript
         if (fire ()) return load ();
```

Now, if there are no `active` functions, and `counter` equals `data.length`, we are neither waiting for processes nor having to process more elements.

```javascript
         if (active === 0 && counter === data.length) {
```

If we didn't allow the possibility of waiting for more data, we would now return and be done. However, since we allow the possibility of new data being pushed to `data`, we set a timeout.

```javascript
            setTimeout (function () {
```

After waiting, if there's new data (we check this through `fire`), we execute `load`. Notice we execute `load` only if the possibility that new data arrives. If `fire` returns `true`, we also `return` from the timeout.

```javascript
               if (fire ()) return load ();
```

If we are here, no more data arrived. We are ready to finish. We clear `testInterval` and return `output`.

```javascript
               if (testInterval) clearInterval (testInterval);
               if (active === 0 && counter === data.length) return a.return (s, output);
```

We set `options.beat` as the interval for the `setTimeout`. We close the conditional and the `collect` function.

```javascript
            }, options.beat);
         }
      }
```

Notice that `collect` is an exceptional `aFunction`, in that not always finishes by making a call to another `aFunction` - it only does it when a certain condition is met. However, this condition will be met exactly once - when the last `aStep` finished its execution. `collect and `a.fork`, together, behave like a proper `aFunction`.

We now create a copy of the `aStack` and store it in a local variable `s2`. We then reset its `aPath` to an empty array.

```javascript
      var s2 = copy (s);
      s2.aPath = [];
```

The purpose of `s2` is to have a clean copy of the `aStack` that is not the `aStack` itself. The reason for this is extremely abstruse, but since you're reading this, I might as well explain it. Remember above when `collect` iterated through special keys (i.e.: neither `last` nor `aPath`) of its `aStack` and placed them into the original `aStack`? Well, any of these changes will be visible to parallel calls that are executed later. By making a copy of the original `aStack`, we preserve the original `aStack` as it was before any of the parallel calls starts executing.

We set a variable `loading` that will determine whether we are currently spawning concurrent calls or not. The variable is initalized to `false`, since we haven't issued any concurrent functions yet.

```javascript
      var loading = false;
```

We now define `load`, the function that will issue concurrent function calls. The whole function consists of a while loop which will be executed only if `fire` returns `true` (hence, we need to process more data AND we have have available resources to do so) and if `load` is not currently being executed.

```javascript
      var load = function () {
         while (fire () && loading === false) {
```

The first things we do are set `loading` to `true` (to block simultaneous calls to `call`), and increment both `counter` (to move forward the data element we're processing) and `active` (to indicate that we'll spawn a concurrent function).

```javascript
            loading = true;
            counter++;
            active++;
```

We define `key` to be either the `counter - 1` (in case `data` is an array) or the `counter - 1` element of `data` (in case `data` is an object - remember that by this point, if `data` was an object, it was later converted to an array holding keys).

`key` allows the `a.return`ing call to know to which element of the `output` it belongs. If it wasn't for this, `a.fork` would return arrays/objects where each result corresponding to the order in which each parallel process finished, which not necessarily corresponds to the order these processes where presented to `a.fork`.

```javascript
            var key   = dataType === 'array' ? counter - 1 : data [counter - 1];
```

You may wonder: why don't we first set `key` and *then* increase `counter` (to avoid the clumsy `- 1`s)? Well, when the async functions being executed are really fast, incrementing the counter after this ends up setting strange race conditions. So far, the only way I found to avoid them was to increment the `counter` immediately when entering the loop.

We define `value` to be either the element at `data [key]` (if `data` was originally an array) or to the `key` element of `output` (if `data` was originally an object).

```javascript
            var value = dataType === 'array' ? data [key]  : output [key];
```

If `fun` is defined, we set `value` to the output of `fun`, passing `value` and `key` as arguments (in that order). If `fun` returns a falsy value (usually `undefined`), `value` will be set to an empty array. The purpose of this empty array is to allow `fun` to return meanignful values only for certain items of `data` (and not others), without producing exceptions.

```javascript
            if (fun) value = fun (value, key) || [];
```

We invoke `a.call` passing as its `aStack` a **copy** of `s2`. This copy will be unique to the particular parallel thread we are initializing.

```javascript
            a.call (copy (s2), [
```

Using this newly created `aStack`, we invoke `a.call`, passing to it `value` (which will be the `aStep`/`aPath` corresponding to the current `data` element), followed by an `aStep` containing `collect` and `key`.

Notice that we wrap `value` in an array, because if it is an `aFunction`, `[collect, key]` will be interpreted as an argument to it, instead of as a contiguous `aStep`.

```javascript
               [value],
               [collect, key]
            ]);
```

Immediately after, we set `loading` to `false`. We then close the `while` loop and then `load`.

```javascript
            loading = false;
         }
      }
```

We set a timeout for running `load` after `options.beat` milliseconds. This is the initial invocation of `load`. Because of the timeout, `a.fork` can wait for new data elements even if it originally receives an empty array. If `options.beat` is zero, this will execute immediately.

```javascript
      setTimeout (load, options.beat);
```

There's nothing else to do. We close the function.

```javascript
   }
```

### Three useful functions

`a.stop` is a function that will execute an `aInput` until one of its `aSteps` `a.returns` a value equal to `stopValue`. Both this return value and `stopValue` will be coerced into strings.

```javascript
   a.stop = function () {
```

This function, like `a.call`, `a.cond` and `a.fork` above, is variadic, and can either receive an `aStack` or create it.

The other arguments are `stopValue`, `aPath` (which can be any `aInput`) and `external`.

Since `a.stop` calls itself recursively, we enable the `external` flag to avoid repeated flattening of its `aPath`.

```javascript
      var arg = 0;
      var s         = type (arguments [arg]) === 'object' ? arguments [arg++] : a.create ();
      var stopValue = arguments [arg++];
      var aPath     = arguments [arg++];
      var external  = arguments [arg] === true ? false : true;
```

If the function wasn't invoked by itself, we flatten the `aPath` and `return` `false` if the `aPath` is invalid.

```javascript
      if (external) {
         aPath = a.flatten (aPath);
         if (aPath === false) return a.return (s, false);
      }
```

If `aPath` has length 0, there's nothing else to do, so we just `return` and `a.return` `s.last`.

```javascript
      if (aPath.length === 0) return a.return (s, s.last);
```

We extract the first `aStep` from the `aPath` and store it in a local variable `next`.

```javascript
      var next = aPath.shift ();
```

We create an `aMap`. Its `default` key will be an `aStep` that calls `a.stop`, with arguments `stopValue`, `aPath` and `true`. Remember that the `aPath` now has one less `aStep` than when it entered the function.

Notice that we pass `true` as the last argument to the recursive call to `a.stop`, since `aPath` is already flattened.

```javascript
      var aMap = {default: [a.stop, stopValue, aPath, true]};
```

We set another branch in the `aMap`, corresponding to the `stopValue`. If this branch is activated, we simply `a.return` the `stopValue`.

```javascript
      aMap [stopValue] = [a.return, stopValue];
```

By this point, what we're doing should be clear: `a.stop` is actually invoking `a.cond` every time. If the value returned by the next `aStep` is equal to the `stopValue`, the branch taken in the `aCond` will `a.return` the `stopValue` and interrupt the execution. Otherwise, `a.stop` will call itself with a shorter `aPath`.

We invoke `a.cond`, passing the `aStack`, `next`, `aMap`, and external set to `true`. Notice that we wrap `next` in an array to make it into an `aPath`, since we're setting `external` to `true` in our call to `a.cond` (hence `a.cond` is expecting a flattened `aPath` as its input).

```javascript
      return a.cond (s, [next], aMap, true);
   }
```

`a.log` is a function for logging the data in `s` at any given moment, plus other arguments that you pass to it. It does two things:

- Log its arguments, with the exception of `s.aPath`.
- `a.return` the same value that was in `s.last`.

```javascript
   a.log = function (s) {
```

We create a local variable `Arguments` where we'll store a copy of `arguments`. Notice that we place an empty object instead of `aStack` as its first argument.

We copy the `aPath` into a local variable. We then delete it from the stack.

The purpose of this is to preserve `s.aPath`, but to prevent it from actually being printed.

```javascript
      var aPath = s.aPath;
      delete s.aPath;
```

We apply console.log to the arguments received by `a.log`.

```javascript
      console.log.apply (console, arguments);
```

We restore `s.aPath` and `return` `s.last`, effectively leaving untouched the chain of asynchronous execution.

```javascript
      s.aPath = aPath;
      return a.return (s, s.last);
   }
```

`a.convert` is a function for taking callback-oriented asynchronous functions and converting them into `aFunctions`.

`a.convert` takes three arguments:

- `fun`, the asynchronous function to be converted. This function is expected to receive a callback that receives two elements, `error` and `data`.
- `errfun`, a function for providing alternate behavior in case of error.
- `This`, an alternate value for binding the `this` value of `fun`.

```javascript
   a.convert = function (fun, errfun, This) {
```

We validate that `fun` is a function and that `errfun` is either `undefined` or a function.

```javascript
      if (type (fun) !== 'function')                            return e ('aStack error: fun passed to a.convert must be a function but instead is', fun, 'with type', type (fun));
      if (errfun !== undefined && type (errfun) !== 'function') return e ('aStack error: errfun passed to a.convert must be a function but instead is', errfun, 'with type', type (errfun));
```

If we're here, the input is valid. We proceed to return an `aFunction`. This function, naturally, takes `s` as its first argument.

```javascript
      return function (s) {
```

We copy `arguments` into a local array `Arguments`. Notice that we don't copy the first element of `arguments`, which is the `aStack`.

```javascript
         var Arguments = [].slice.call (arguments, 1);
```

We push a callback into `Arguments`. This callback takes an `error` and `data`, as any normal callback.

```javascript
         Arguments.push (function (error, data) {
```

If `fun` yields an error, our default choice is to print the error and `a.return` `false`.

If, however, `errfun` is defined, we will invoke `errfun` passing it the error and we will `a.return` whatever is `returned` by `errfun`.

```javascript
            if (error) return a.return (s, errfun ? errfun (error) : e (error));
```

If `fun` executed without errors, we will simply `a.return` `data`.

```javascript
                       return a.return (s, data);
         });
```

Now we will execute `fun`, passing it `Arguments` as its `arguments`. Notice that if `This` is defined, we use it as the `this` value for invoking `fun`; otherwise, we will use `fun` itself.

There's nothing else to do, so we close the function to be `returned` and also `a.convert`.

```javascript
         fun.apply (This || fun, Arguments);
      }
   }
```

We close the module.

```javascript
}) ();
```

## License

aStack is written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.
