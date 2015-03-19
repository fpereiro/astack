# aStack

> "Callbacks are merely the continuation of control flow by other means." -- Carl von Clausewitz

aStack is a Javascript tool for writing asynchronous functions almost as if they were synchronous.

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
- [From callbacks to aStack](https://github.com/fpereiro/astack#from-callbacks-to-astack): count the differences.
- [The elements of aStack](https://github.com/fpereiro/astack#the-elements-of-astack): the gist.
- [Four more functions](https://github.com/fpereiro/astack#four-more-functions): conditional execution, parallel execution, and a couple more.
- [Why so many square brackets?!](https://github.com/fpereiro/astack#why-so-many-square-brackets): it took me a while to figure this one out.
- [Annotated source code](https://github.com/fpereiro/astack#source-code).

## Usage examples

### Sequential execution

Write "0" to a file, then read that value, increment it by 1 three times. Everything is executed in order without using synchronous functions.

```javascript

var fs = require ('fs');
var a = require ('./astack.js');

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

a.call ([
   [writeFile, 'count.txt', '0'],
   [incrementFile, 'count.txt'],
   [incrementFile, 'count.txt'],
   [incrementFile, 'count.txt']
]);
```

This script prints the following:

```
Current value of count.txt is 0
Current value of count.txt is 1
Current value of count.txt is 2
Current value of count.txt is 3
```

### Conditional execution

Try writing '0' to the specified path. If the action was successful, increment that file, otherwise print an error message.

```javascript
function writeAndIncrement (aStack, path) {
   a.cond (aStack, [writeFile, path, '0'], {
      true: [incrementFile, path],
      false: [function (aStack) {
         console.log ('There was an error when writing to the file', path, 'so no incrementing will take place.');
         a.return (aStack, false);
      }]
   });
}

a.call ([
   [writeAndIncrement, 'count.txt'],
   [writeAndIncrement],
]);
```

This script prints the following:

```
Current value of count.txt is 0
Current value of count.txt is 1
There was an error when writing to the file true so no incrementing will take place.
```

### Parallel execution

Try writing '0' and then incrementing, for three different files at the same time. When all actions are completed, print the results of each action.

```javascript
a.call ([
   [a.fork, [0, 1, 2], function (v) {
      return [writeAndIncrement, 'count' + v + '.txt']
   }],
   [function (aStack) {
      console.log ('a.fork operation ready. Result was', aStack.last);
      a.return (aStack, true);
   }]
]);
```

This script prints the following:

```
Current value of count0.txt is 0
Current value of count1.txt is 0
Current value of count2.txt is 0
Current value of count1.txt is 1
Current value of count0.txt is 1
Current value of count2.txt is 1
a.fork operation ready. Result was [ true, true, true ]
```

Notice that the order of lines 4 to 6 may vary, depending on the actual order on which the files were written.

Run concurrently an expensive operation, without doing more than `n` operations simultaneously.

```javascript
function memoryIntensiveOperation (aStack, datum) {
   ...
}

var bigData = [1, 2, 3, ..., 999999, 1000000];

a.fork (data, function (v) {
   return [memoryIntensiveOperation, v];
}, {max: n});
```

Run concurrently an expensive operation, spawning operations unless the process' memory usage exceeds a `threshold`.

```javascript
a.fork (data, function (v) {
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
function sync1 (data) {
   // Do some stuff to data
   return data;
}

function sync2 (data) {
   // Do some other stuff to data
   return data;
}

function syncSequence (data) {
   return sync2 (sync1 (data));
}
```

When you execute `syncSequence`, the thread of execution does the following:

- Execute `sync1 (data)` and wait for it to be completed.
- When it's completed, take the value returned by `sync1`, and call `sync2` passing that value as its argument.
- When `sync2` finishes executing, the returned value is returned.

If you wrote this example in an asynchronous way, this is how it would look like:

```javascript
function async1 (data, callback) {
   // Do some stuff to data
   callback (data);
}

function async2 (data, callback) {
   // Do some stuff to data
   callback (data);
}

function asyncSequence (data, callback) {
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
function asyncSequence (data, callback) {
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
function syncSequence (data) {
   return sync3 (sync2 (sync1 (data)));
}
```

The difference in clarity and succintness reflects the cost of asynchronous programming. Synchronous functions do not need to know which function is run after them, because the execution thread is in charge of determining that. But since the thread of execution doesn't wait for asynchronous functions, the latter have the burden of having to know where to send their results (where to `return`) when they are done.

The standard way to avoid callback hell is to hardwire the callbacks into the asynchronous functions. For example, if `async2` always calls `async1` and `async3` always calls `async2`, then you can rewrite the example above as:

```javascript
function async1 (data, callback) {
   callback (data);
}

function async2 (data, callback) {
   async1 (data, callback);
}

function async3 (data, callback) {
   async2 (data, callback)
}

function asyncSequence (data, callback) {
   async3 (data, callback);
}
```

This is of course much clearer, but it relies on asynchronous functions being run in a specific order. However, if you wanted to run `async1`, `async2` or `async3` in different orders, it is impossible to do this: you need these functions to retain their general form, and then write an `asyncSequence` function with n levels of nested callbacks (where n is the number of asynchronous functions you need to run in sequence). Worse, you need to write one of these sequence functions for each sequence that you are going to run.

Let's remember that synchronous functions don't have this problem, because they can `return` their values when they are done, and they **don't need to know who to call next**. In this way, synchronous functions don't lose their generality, and invoking sequences of them is straightforward.

This is the async problem: how to execute arbitrary sequences of asynchronous functions, without falling into callback hell. Or in other words, the problem is how to write sequences of asynchronous functions with an ease comparable to that of writing sequences of synchronous functions.

## From callbacks to aStack

Faced with the async problem, how can we make asynchronous functions behave more like synchronous functions, without callback hell and without loss of generality?

Let's see how we can transform callback hell into aStack <del>hell</del>.

**Callback hell:**

```javascript

function async1 (data, callback) {
   // Do stuff to data here...
   callback (data);
}

// async2 and async3 are just like async1

function asyncSequence (data, callback) {
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

function async1 (aStack, data) {
   // Do stuff to data
   a.return (aStack, data);
}

// async2 and async3 are just like async1

function asyncSequence (aStack, data, callback) {
   a.call (aStack, [
      [async1, data],
      [async2],
      [async3],
      [callback]
   ]);
}
```

Let's count the differences between both examples:

1. In the first example, every async function takes a `callback` as its last argument. In the second one, every async function takes an `aStack` as its first argument.
2. In the first example, `async1` finish their execution by invoking the `callback`. In the second one, they invoke a function named `a.return`, and pass to it both the `aStack` and the `return`ed value.
3. In the first example, we have nested anonymous functions passing callbacks. In the second one, `asyncSequence` invokes a function named `a.call`, which receives as argument the `aStack` and an array with asynchronous functions and their arguments.
4. In the second example, every combination of function + arguments is wrapped in an array, even when the function has no arguments.

These three differences (`aStack`, `a.return`, `a.call` and wrapping function+arguments in an array) allow you to write asynchronous functions almost as if they were synchronous. In the next section we will explore how.

## The elements of aStack

The core of aStack is made of four structures and two functions. If you understand them, you can use the library with full confidence.

### The four structures of aStack

aStack is composed of four structures.

1. `aStep`
2. `aPath`
3. `aStack`
4. `aFunction`

#### `aStep`

The `aStep` is a callback (that is, a function), wrapped in an array, and followed by zero or more arguments.

`aStep = [mysqlQuery, 'localhost', 'SELECT * FROM records']`

The `aStep` represents a single step in a sequence of asynchronous functions.

#### `aPath`

The `aPath` is an array containing zero or more `aStep`s. An `aPath` is, in fact, a sequence of asynchronous functions.

`aPath = [aStep, ...]`

#### `aStack`

The `aStack` is the argument that asynchronous functions will pass around instead of callbacks. It is an object that contains two keys:

1. `aPath`.
2. `last`, which contains the value returned by the last asynchronous function executed.

A generic `aStack` looks like this:

```javascript
aStack = {
   aPath: [aStep, aStep, ...],
   last: ...
}
```

`last` can have any value (even undefined).

#### `aFunction`

A detail I haven't mentioned yet: the first element of an `aStep` cannot be any function. Rather, it must be an `aFunction`.

An `aFunction` is a normal function (usually asynchronous, but not necessarily) that adheres to the following conventions:

- Receives an `aStack` as its first element.

```javascript
// Incorrect
function async (arg1, arg2) {
   ...
}

// Correct
function async (aStack, arg1, arg2) {
   ...
}
```

- In any of its possible execution paths, the last thing that the function does is to invoke either `a.call` (a function we'll see below) or any other `aFunction`, passing the `aStack` as the first argument to it.

```javascript
function async (aStack, arg1, arg2) {
   // Incorrect: one of the execution branches does not end with a call to an `aFunction`.
   if (arg1 === true) {
      ...
   }
   else {
      ...
      a.call (...);
   }
}

function async (aStack, arg1, arg2) {
   // Correct: both possible execution branches finish with a call to an `aFunction`.
   if (arg1 === true) {
      ...
      a.call (...);
   }
   else {
      ...
      a.call (...);
   }
}
```

- In any execution path, there cannot be more than one call to `a.call` or another `aFunction` other than the last call. In any execution path, you must merge all calls to `a.call` into one.

```javascript
function async (aStack, arg1, arg2) {
   a.call (...);
   ...
   // Incorrect! You already made a call to a.call above.
   a.call (...);
}

function async2 (aStack) {
   async1 (...);
   ...
   // Incorrect! You already invoked one aFunction above.
   a.call (...);
}
```

- Don't modify `aStack.aPath` and `aStack.last`. Rather, do it through `a.call` and `a.return` (which we'll see in a moment).

In short:

1. Mind the `aStack`.
2. Call `a.call` or another `aFunction` as the last thing you do in every execution path.
3. Call `a.call` or another `aFunction` only once per execution path.
4. Don't modify `aStack.aPath` and `aStack.last` directly.

### `a.call`

`a.call` is the main function of aStack and the soul of the library. Every `aFunction` calls either `a.call` directly, or through another `aFunction`. `a.call` keeps the ball rolling and ensures that all asynchronous functions are eventually executed.

`a.call` takes one or two arguments:
- An `aStack` (optional).
- An `aPath` or `aStep`.

`a.call` receives two `aPath`s: the one in `aStack.aPath`, which we'll name *old aPath*, and the `aPath`/`aStep` it receives as its last argument, which we'll name *new aPath*.

`a.call` does two main things:
- Takes the old and new `aPath`s and  prepends the new one to the old one to form a single `aPath`.
- Executes the first function of this combined `aPath`, passing it the `aStack`.

In essence, when you pass an `aStep`/`aPath`, you are putting that `aStep`/`aPath` **on top** of the previously existing stack of functions to execute, which is held in `aStack.aPath`.

It is the stack-like nature of `a.call` that allows us to make nested asynchronous calls. When you encounter a call, you simply push it onto the stack and execute it first. The previously existing functions are still there, waiting for the call you just made. An execution thread is simply a pipeline where a single function is executed every time. By using a stack, we convert nested structures into a flattened sequence that executes things one after another.

If no `aStack` is passed to `a.call`, a new one will be created. You may ask: **when is it useful to have an undefined `aStack`?** When you do the initial invocation to a asynchronous sequence, you have no previous asynchronous functions in the stack, so you start from zero.

Notice that you can pass both an `aPath` and an `aStep` to `a.call`. If you pass an `aStep`, it will be transformed to an `aPath`.

```javascript
a.call ([[someFunction, 'arg1', 'arg2']]);
```

is equivalent to:

```javascript
a.call ([someFunction, 'arg1', 'arg2']);
```

The latter is more elegant and less error-prone.

Also, instead of passing an `aPath`, you can pass an array that contains `aPath`s or `aStep`s, to arbitrary levels of nestedness. For example:

```javascript
a.call ([
   [someFunction, 'arg1', 'arg2'],
   [someOtherFunction, 'arg3']
]);
```

is equivalent to:

```javascript
a.call ([[
   [someFunction, 'arg1', 'arg2'],
   [someOtherFunction, 'arg3']
]]);
```

and to

```javascript
a.call ([
   [[someFunction, 'arg1', 'arg2']],
   [[someOtherFunction, 'arg3']]
]);
```

`a.call` takes any array-like structure containing `aStep`s and flattens it to an `aPath`.

If you passed an invalid `aPath`/`aStep`, `a.call` will `a.return` a `false` value. This means that the first function in `aStack.aPath` is invoked, receiving `false` as the value of the previous invocation.

If the `aStack` is invalid, there's no valid `aFunction` to which to `a.return`, so `a.call` will directly `return` a `false` value.

It is worthy to note the following pattern: if in an asynchronous function you find a validation error and you want to return `false`, you can both return and `a.return` that error: you `a.return` because you want the next function in the sequence to have that data, and you `return` so that you make the execution flow stop within the current function.

```javascript
function async (aStack, arg1) {
   if (arg1 === false) {
      return a.return (aStack, false);
   }
}
```

If an `aStep` only has an `aFunction` and no other arguments, by default, `a.call` will pass `aStack.last` as the second argument to the function. Let's see an example of this:

```javascript
function async1 (aStack, data) {
   a.return (aStack, data);
}

a.call ([
   [async1, 'hey'],
   [async1]
]);
```

The first `aStep`, `[async1, 'hey']`, invokes `async1`, passing  `'hey'` as the second argument. `async1` then `a.return`s `'hey'`. The second `aStep` has no explicit arguments, so `a.call` will put `aStack.last` as its second argument. As a result, the second `aStep` behaves exactly like the first.

Another example of this is in the `asyncSequence` example above. Let's repeat it here:

```javascript
function asyncSequence (aStack, data, callback) {
   a.call (aStack, [
      [async1, data],
      [async2],
      [async3],
      [callback]
   ]);
}
```

`async2` and `async3` receive whatever was `a.return`ed by `async1`, instead of receiving `undefined`.

The reason for inserting `aStack.last` in `aStep`s without arguments is that **most `aStep`s without arguments are lambda functions written in place to do some operation based on `aStack.last`**.

If you need `aStack.last` in a function that receives explicit parameters, please refer to the description of [stack parameters](https://github.com/fpereiro/astack#stack-parameters) below.

### `a.return`

`a.return` takes two arguments:
- An `aStack` (since it's an `aFunction`).
- `last`, which is the value being `return`ed by the invoking function.

`a.return` does the following things:

1. Validate the aStack.
2. Set `aStack.last` to the `last` argument.
3. Call `a.call` with the `aStack` and an empty `aPath`.

Notice that `a.return` is an `aFunction`, and as such, the last thing that it does is to invoke `a.call`. Calling `a.call` with an empty `aPath` effectively works as a return function, because it ends up executing the first function in `aStack.last`.

`a.return` can take an optional third argument, named `copy`, which should be a string. A copy of the return value will be stored in the aStack, under the key named as the `copy` argument. For example, if you write `a.return (aStack, true, 'someKey')`, the next `aFunction` executed will receive an `aStack` where `aStack.someKey === true`.

`copy` is useful when you want to preserve an `a.return`ed value for more than one `aStep`. Since every `aStep` overwrites `aStack.last`, when you need to preserve states along a chain of `aStep`s, just use this argument. Caution must be taken not to overuse this resource, since it's comparable to setting a global variable within the `aStack` - and hence, you rely on other functions you call in the middle not to modify it and not to be disturbed by it in any way.

Let's see this in an example:

```javascript
a.call ([
   [function (aStack) {
      a.return (aStack, 'Hey there!', 'message');
   }],
   [function (aStack) {
      // Here, both aStack.last and aStack.message are equal to 'Hey there!'
      a.return (aStack, true);
   }],
   [function (aStack) {
      // Here, aStack.last will be equal to true, and aStack.message will still be equal to 'Hey there!'
      ...
   }]
]);
```

### Stack parameters

*Stack parameters* are a shorthand that allow you to reference return values in the `aStack` from within an `aStep`.

Stack parameters allow you to refer statically (through a string) to a variable whose value you won't know until the required async functions are executed. If it wasn't for them, you'd have to either hardwire the logic into the async function (for example, make it read `aStack.last`) or wrap a generic function with a specific lambda function that passes `aStack.last` to the former.

Stack parameters can also refer to other objects in the `aStack`.

```javascript
a.call ([
   [function (aStack) {
      aStack.data = 'b52';
      a.return (aStack, true);
   }],
   [async1, '@data', '@last']
]);
```

When `async1` is invoked, it will receive `'b52'` as its second argument and `true` as its third argument.

Stack parameters support dot notation so that you can access elements in arrays and objects.

```javascript
a.call ([
   [function (aStack) {
      a.return (aStack, {data: 'b52', moreData: [1, 2, 3]});
   }],
   [async1, '@last.data', '@last.moreData.1']
]);
```

When `async1` is invoked, it will receive `'b52'` as its second argument and `2` as its third argument.

Notice that you cannot use dots as part of the name of a stack parameter, because any dot will be interpreted as access to a subelement.

If there's an exception generated by the dot notation (because you are trying to access a subelement of something that's neither an array nor an object, or a subelement with a stringified key from an array instead of an object), the stack parameter will be replaced by `undefined`.

## Four more functions

### `a.cond`

`a.cond` is a function that is useful for asynchronous *conditional* execution. You can see it in action in the [conditional execution example above](https://github.com/fpereiro/astack#conditional-execution).

`a.cond` takes three arguments:
- An `aStack` (optional). If you omit it, `a.cond` will create a new one.
- An `aStep`/`aPath`.
- An `aMap`.

An `aMap` is an object where each key points to an `aStep`/`aPath`.

`a.cond` executes the `aStep`/`aPath`, obtains a result (we will call it `X`) and then executes the `aPath` contained at `aMap.X`.

Notice that `X` will be stringified, since object keys are always strings in javascript. For an example of this, refer to the conditional execution example above, where `true` and `false` are converted into `'true'` and `'false'`.

You can also insert a `default` key in the `aMap`. This key will be executed if `X` is not found in the `aMap`.

If neither `X` nor `default` are defined, `aCond` `a.return`s `false`.

### `fork`

`a.fork` is a function that is useful for asynchronous *parallel* execution. You can see it in action in the [parallel execution example above](https://github.com/fpereiro/astack#parallel-execution).

`a.fork` takes one to four arguments:
- An `aStack` (optional). If you omit it, `a.fork` will create a new one.
- `data`, which can be an array, an object, an `aStep`/`aPath`, or an object where every key is an `aStep`/`aPath`.
- `fun`, which is a function that outputs an `aStep`/`aPath` for each item in `data`.
- `options`, the object with three keys:
   - `options.max`, an integer that determines the maximum number of concurrent operations.
   - `options.test`, a function that returns `true` or a falsy value, depending on whether `a.fork` can keep on firing concurrent operations.
   - `options.beat`, an integer that determines the amount of milliseconds to wait for new data after processing the existing one.

If you pass an empty array or object as data, `a.fork` will just return an empty array or object.

The simplest way of using `a.fork` is passing it an `aPath` (you can also pass a single `aStep`, but having only one operation to execute renders concurrency useless).

```javascript

function async1 (aStack, data) {
   a.return (aStack, data);
}

a.fork ([
   [async1, 'a'],
   [async1, 'b'],
   [async1, 'c']
]);
```

In this case, `a.fork` will return `['a', 'b', 'c']`, that is, one result per `aPath` passed.

Slightly more interesting is passing an object where each value is an `aStep`/`aPath`:

```javascript
a.fork ({
   first: [async1, 'a'],
   second: [async1, 'b'],
   third: [async1, 'c']
});
```

In this case, `a.fork` will return `{first: 'a', second: 'b', third: 'c'}`, that is, one result per `aPath` passed.

Notice that `a.fork` returns an array/object where each element corresponds with the `aStep`/`aPath` it received, even if the concurrent operations returned *in an order different to which they were fired*.

Most of the time, however, you don't want to pass an `aStep`/`aPath`. Rather, you want to pass a function that generates an `aStep`/`aPath` *from an array of data*. This function, called `fun`, receives each item from `data` and outputs an `aStep`/`aPath`.

```javascript
a.fork (['a', 'b', 'c'], function (v) {
   return [async1, v];
});
```

In this case, `a.fork` will return the same output than in the first example: `['a', 'b', 'c']`.

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

When `a.fork` executes parallel `aPath`s, it will create copies of the `aStack` that are local to them. The idea behind this is to avoid side effects between parallel asynchronous calls. However, you should bear in mind two caveats:

- Some objects, however, like circular structures or HTTP connections cannot be copied (or at least not easily), so if any of the parallel threads changes these special objects, the change will be visible to other parallel threads.
- If any of the parallel threads sets a key in its `aStack` that's neither `aPath` or `last`, that key will still be set after `a.fork` is done. If more than one parallel thread sets that key, the thread that sets it last (in real time, not by its order in the `aPath`) will overwrite the key set by the other thread.

```javascript
function (aStack) {

   aStack.data = [];

   function inner (aStack) {
      aStack.data.push (Math.random ());
      a.return (aStack, true);
   }

   a.fork (aStack, [
      [inner],
      [inner],
      [inner]
   ]);
}
```

After the call to `a.fork` above, the `aStack` will look something like:

`{last: [true, true, true], data: [0.6843374725431204]}`

Because the `aStack` is copied for each `aPath`, `aStack.data` will have just one element (the last one set) instead of three.

### `stop`

Apart from the `aStack`, `a.stop` takes two more arguments: `stopValue` and an `aStep`/`aPath`.

If the `aStack` is undefined, `stop` creates it.

The `stopValue` is any value, which is coerced onto a string. `a.stop` starts executing the first `aStep` in the `aPath`, and then, if the value `returned` by it is equal to the `stopValue`, that value is `a.return`ed and no further `aStep`s are executed. If it's not equal, then `a.stop` will execute the next `aStep`.

The `stopValue` cannot be equal to `'default'`.

### `log`

To inspect the contents of the `aStack`, place an `aStep` calling `a.log` just below the `aStep` you wish to inspect.

`a.log` prints the contents of the aStack (but without printing the `aPath`), plus further arguments you pass to it. It then `returns` aStack.last, so execution resumes unaffected.

## Why so many square brackets?!

You may be wondering: why do we need to wrap `aStep`s with no arguments (that is, mere functions) with square brackets? In other words, why can't we pass `aFunctions` without wrapping them in an array?

If we didn't have to do this, the readability of `aStack` would certainly improve. To see this, we can go back to the example where I compare callback hell to aStack <del>hell</del>.

Without requiring `aFunction`s to be wrapped in an array, the following function:

```javascript
function asyncSequence (aStack, data, callback) {
   a.call (aStack, [
      [async1, data],
      [async2],
      [async3],
      [callback]
   ]);
}
```

Could be written like this:

```javascript
function asyncSequence (aStack, data, callback) {
   a.call (aStack, [[async1, data], async2, async3, callback]);
}
```

To do this, we would be able to define an `aPath` as an array containing both `aPath`s and `aFunction`s.

However, consider the following example:

```javascript
[a.log,  [a.call, ...]]

[a.call, [a.log,  ...]]
```

In our eyes, these two `aPath`s mean the following:

1) Execute `a.log`, then execute `a.call` passing `...` as its argument.

2) Execute `a.call`, passing it an `aPath` that contains `a.log` as first argument and `...` as its second argument.

Why do we interpret the first example to have two steps, whereas we interpret the second as having only one step? Structurally speaking, the examples are identical, except for us swapping `a.log` and `a.call`.

The reason we consider them differently is that *we know that `a.call` takes `aStep`/`aPath`s as arguments*, and that `a.log` doesn't (or at least, not often).

If we wanted to write `aFunction`s alongside `aStep`s (or even `aPath`s), we would need to understand when an `aStep` or `aPath` stands on itself, and when it is passed as an argument to the `aFunction` to its left.

I cannot think of any elegant way of giving this information to aStack. Inspecting function signatures seems complicated and error-prone. And hardcoding a list of `aFunction`s that takes `aStep`/`aPath`s impedes you to write higher-order `aFunction`s (it's quite reasonable you'll want to write your own).

To avoid this ambiguity (and clumsy workarounds or limitations) is that we need to wrap every `aStep` in an array.

## Source code

The complete source code is contained in `astack.js`. It is about 310 lines long.

Below is the annotated source.

```javascript
/*
aStack - v2.4.0

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

- Distinguish between `object`, `array`, `regex`, `date` and `null` (all of which return `object` in `typeof`).
- Distinguish between types of numbers: `nan`, `infinity`, `integer` and `float` (all of which return `number` in `typeof`).

`type` takes a single argument (of any type, naturally) and returns a string which can be any of: `nan`, `infinity`, `integer`, `float`, `array`, `object`, `function`, `string`, `regex`, `date`, `null` and `undefined`.

```javascript
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
```

We define a function `e` for performing two functions:
- log its arguments to the console.
- Return `false`.

```javascript
   function e () {
      console.log (arguments);
      return false;
   }
```

`copy` copies a complex value (an array or an object). It will produce a new output that is equal to the input. If it finds circular references, it will leave them untouched.

The "public" interface of the function (if we allow that distinction) takes a single argument, the `input` we want to copy. However, we define a second "private" argument (`seen`) that the function will use to pass information to recursive calls.

This function is recursive. On recursive calls, `input` won't represent the `input` that the user passed to the function, but rather one of the elements that are contained within the original `input`.

```javascript
   function copy (input, seen) {
```

If `input` is not a complex object, we return it.

```javascript
      if (type (input) !== 'object' && type (input) !== 'array') return input;
```

If we are here, `input` is a complex object. We initialize `output` to either an array or an object, depending on the type of `input`.

```javascript
      var output = type (input) === 'array' ? [] : {};
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

If the element is a complex object:

```javascript
         if (type (input [i]) === 'object' || type (input [i]) === 'array') {
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

### Validation

We define an object to hold the validation functions.

```
   a.validate = {
```

We will define `a.validate.aPath`, a function that will return `'aStep'` if the input is an `aStep`, `'aPath'` if the input is an `aPath`, and `false` otherwise.

We unify the validation of `aPath`s and `aStep`s into a single function because they are very similar elements.

Both `aPath`s and `aStep`s must be an array. If `input` is neither, we return false.

```javascript
      aPath: function (input) {
         if (type (input) !== 'array') {
            return (e ('aPath or aStep must be an array but instead is', input, 'with type', type (input)));
         }
```

If the first element of `input` is a function (presumably an `aFunction`), `input` is an `aStep`.

```javascript
         if (type (input [0]) === 'function') return 'aStep';
```

If `input` is an array and not an `aStep`, we will assume it is an `aPath`. Validation of its constituent elements will be deferred to recursive calls.

```javascript
                                              return 'aPath';
      },
```

We will write a function for validating the `aStack`.

```javascript
      aStack: function (aStack) {
```

The `aStack` must be an object.

```javascript
         if (type (aStack) !== 'object') {
            return (e ('aStack must be an array but instead is', aStack, 'with type', type (aStack)));
         }
```

`aStack.aPath` must be an `aPath`.

```javascript
         if (a.validate.aPath (aStack.aPath) !== 'aPath') return false;
```

We return `true` and close both the function and the `a.validate` module.

```javascript
         return true;
      }
   }
```

We will write here a function `a.create` for initializing an empty `aStack`.

```javascript
   a.create = function (aStack) {
```

We return an empty `aStack`, which is just an object with the key `aPath` set to an empty array.

```javascript
      return {aPath: []}
   }
```

We will write a function `a.flatten` that takes an `aPath` or `aStep`, validates it, and returns a flattened `aPath` containing zero or more `aStep`s.

THe purpose of this function is to transform arbitrarily nested `aPath`s into flattened ones (so that `aStack.aPath` can be a stack instead of a stack of stacks), and also convert a single `aStep` into an `aPath` containing it.

```javascript
   a.flatten = function (input) {
```

We validate the `input` using `a.validate.aPath` and store the result in a local variable `type`.

```javascript
      var type = a.validate.aPath (input);
```

If `input` is invalid (because it's neither an `aStep` nor an `aPath`, we return `false`.

```javascript
      if (type === false)   return false;
```

If `input` is an `aStep`, we wrap it in an array and return it - thus, returning an `aPath` with a single `aStep` inside it.

```javascript
      if (type === 'aStep') return [input];
```

If `input` is an `aPath`, we create an array named `aPath` where we'll store the `aStep`s from `input`.

```javascript
      if (type === 'aPath') {
         var aPath = [];
```

We iterate through the elements of `input`.

```javascript
         for (var i in input) {
```

We invoke `a.flatten` recursively on each of the elements of the `aPath` and store this in a local variable `result`.

```javascript
            var result = a.flatten (input [i]);
```

If the element is not a valid `aPath` or `aStep`, we return `false`, thus discarding `aPath`. If any part of `input` is invalid, we consider all of it to be invalid.

```javascript
            if (result === false) return false;
```

Otherwise, we concatenate the result (which will be a flattened `aPath`) with `aPath`.

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

We will now define `a.call`, the main function of the library. This function will run a sequence of `aFunction`s.

```javascript
   a.call = function () {
```

`a.call` is a [variadic function](http://en.wikipedia.org/wiki/Variadic_function), because it can be invoked with or without an `aStack`. How do we determine this? If the first argument received by the function is an object, it can only be an `aStack`, since the second argument is an `aPath` or `aStep` (which is an array).

If the first argument is an object, we consider that argument to be the `aStack`. Otherwise, we consider the first argument to be the `aPath`.

```javascript
      var hasStack = type (arguments [0]) === 'object';
      var aStack   = hasStack ? arguments [0] : a.create ();
      var aPath    = hasStack ? arguments [1] : arguments [0];
```

`a.call` supports a private argument, `external`, which is a boolean flag that is passed as the last argument to `a.call`. We will see the purpose of this `external` below.

For now, we just need to know that if the last argument passed to `a.call` is `true`, `external` will be set to `false`, and it will be set to `true` otherwise.

```javascript
      var external = arguments [arguments.length - 1] === true ? false : true;
```

We validate the `aStack`. If it's not valid, we `return` `false`. Notice that we cannot `a.return` because there's no valid `aFunction` to which to `a.return`.

```javascript
      if (a.validate.aStack (aStack) === false) return false;
```

The default case is that `external` will be `true`. If you're reading for the first time, assume that we will enter the block below.

```javascript
      if (external) {
```

We flatten `aPath` using `a.flatten`. If `aPath` was an `aStep` or an array containing multiple `aPath`s (or any combination of `aStep`s and `aPath`s), it will be converted to a simple `aPath` with zero or more `aStep`s.


```javascript
         aPath = a.flatten (aPath);
```

A further benefit of this action is that it will effectively create a local copy of the `aStep` or `aPath` passed to `a.call`. Since we'll use destructive modifications below, this copy avoids modifications to the original `aStep` or `aPath` passed to the function.

*** stylistical diggression ***

Let's recall that `a.flatten` works recursively on its input. I hesitated long before deciding to do a "deep" operation in the `aPath`, since deep operations in recursive structures are tantamount to batching, something that is [ill-advised](http://en.wikipedia.org/wiki/Taiichi_Ohno). In other libraries, such as [teishi](https://github.com/fpereiro/teishi) or [lith](https://github.com/fpereiro/lith), whenever I deal with recursive structures (`aPath`s are recursive structures, because they can contain themselves), I make validation and generation operations to deal with the topmost level of the input, and leave the deeper structures to be validated and generated through recursive function calls.

In this case, however, I decided that the right thing is to take the `aPath`, and validate it and flatten it as soon as it is received. In teishi and lith, all validation and generation is done synchronously. Hence, I can make recursive calls and receive `return`ed results by these calls. In aStack, however, once `a.call` calls itself, since it is an `aFunction`, it is not possible to `return` - we can only simulate this through `a.call`ing the next function in the `aStack`.

This is the price we have to pay for bootstrapping `return` for asynchronous functions.

Although we cannot avoid batching, we can avoid flattening an `aPath` more than once. Other functions in the library (`a.cond` and `a.stop`) need to flatten the `aStep`/`aPath` they receive. When they invoke `a.call` with an already flattened `aPath`, they will pass `true` as the last argument to `a.call`, and thus letting the latter know that it needs not to either flatten or validate the `aPath`. Here we can understand what `external` stands for: it means that the call to `a.call` was done from an external source that didn't take the trouble to flatten/validate the `aPath` it's passing to `a.call`.

*** end stylistical diggression ***

If the `aPath` is invalid, we both `return` and `a.return` `false`.

In any case, we also close the conditional block relying on `external`.

```javascript
         if (aPath === false) return a.return (aStack, false);
      }
```
The `return a.return` pattern serves multiple purposes:
- By placing `return`, we stop the execution flow in the current function.
- By placing `a.return`, we jump to the next function in the `aStack`, hence we activate the "next" asynchronous function.
- If the `aStack` is also `false`, the function will return a `false` value, so if an asynchronous sequence is impossible (because the aSync stack is invalid), the calling function will know this immediately, in a synchronous way.

Recall that `aStack.aPath` is a flattened `aPath`. We know this because it's either an empty `aPath` (as created by `a.create`), or because it's the product of previous calls to `a.call` or other `aFunction`s (remember that one of the principles of `aFunction`s is not to modify `aStack.aPath` directly).

Now, we take `aStack.aPath`, which is a sequence of all functions that are already in the execution stack, and *prepend* to it the new `aPath` that we received as an argument. This is tantamount to putting the `aPath` at the top of the stack. Since both `aPath` and `aStack.aPath` are flattened, we know we're dealing with a simple stack (instead of a stack of stacks).

After this step, `aStack.aPath` will be the updated stack, containing all async functions to be executed in the correct order.

```javascript
      aStack.aPath = aPath.concat (aStack.aPath);
```

If the stack has no functions (because both `aPath` and `aStack.aPath` were empty), we `return` the value contained in `aStack.last`. Usually, normal `return` values from asynchronous functions are useless, because the synchronous execution flow didn't stick around to see the result of the async calls. However, given the choice of `return`ing `undefined` or returning the proper last value (which is `aStack.last`), we opt for the latter.

```javascript
      if (aStack.aPath.length === 0) return aStack.last;
```

We **remove** the first element of `aStack.aPath`, which is an `aStep`. We store it in a local variable `aStep`.

```javascript
      var aStep = aStack.aPath.shift ();
```

We **remove** the first element of `aStep`, which is an `aFunction`. We store it in a local variable `aFunction`.

```javascript
      var aFunction = aStep.shift ();
```

If the `aStep` has no arguments, we push `aStack.last` to it.

```javascript
      if (aStep.length === 0) aStep.push (aStack.last);
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
                  if (item === '0') aStep [Argument] = aStack [parameterName [item]];
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
      aStep.unshift (aStack);
```

We invoke the `aFunction`, passing the `aStep` as the array of arguments that will be applied to it. Since this function is (or should be) an `aFunction`, when that function is done doing its asynchronous actions, it will invoke either `a.call` or another `aFunction` (which in turn will invoke `a.call`), so this process will be repeated until all asynchronous functions in the stack are executed.

Notice we place a `return` clause, in case the `aFunction` returns early (because recursive invocations to `a.call` `return`ed `false` (invalid `aStack`) or one of them was invoked with an empty `aPath`. In most cases, this `return` clause will be useless.

```javascript
      return aFunction.apply (aFunction, aStep);
```

There's nothing else to do, so we close the function.

```javascript
   }
```

We will now define `a.return`.

`a.return` takes three arguments, `aStack`, `last` and `copy`.

```javascript
   a.return = function (aStack, last, copy) {
```

We validate the `aStack`. If it's invalid, we `return` `false`. We use a synchronous `return` since there's no valid `aFunction` in the `aStack` to which to pass the `false` value.

```javascript
      if (a.validate.aStack (aStack) === false) return false;
```

We set the `last` key of the `aStack` to the second argument, `last`.

```javascript
      aStack.last = last;
```

We validate the `copy` parameter, which can only be `undefined`, a string or an integer.

```javascript
      if (copy !== undefined && type (copy) !== 'string' && type (copy) !== 'integer') {
         return e ('copy parameter passed to a.return must be string, integer or undefined but instead is', copy, 'with type', type (copy));
      }
```

If `copy` is defined, we store an extra copy of the `last` parameter in the `aStack`.

```javascript
      if (copy !== undefined) aStack [copy] = last;
```

We invoke `a.call`, passing the `aStack` and an empty `aPath`. Because of how `a.call` works, this will effectively invoke the next function within `aStack.aPath`, so that `last` is actually `return`ed to the next function.

Also notice that we pass `true` as the last argument to `a.call`, to tell that function not to bother flattening the empty array we're passing as `aPath`.

```javascript
      return a.call (aStack, [], true);
   }
```

### Conditional execution

`a.cond` is the function that provides conditional asynchronous execution. It is variadic, so we'll determine its arguments below.

```javascript
   a.cond = function () {
```

If the first argument to the function is an object, we consider that element to be the `aStack`. Otherwise, we create it.

```javascript
      var hasStack = type (arguments [0]) === 'object';
      var aStack   = hasStack ? arguments [0] : a.create ();
```

We define `aCond`, which is the `aStep` or `aPath` that represents the asynchronous condition. Depending on whether an `aStack` was passed or not, it is either the first or the second argument.

```javascript
      var aCond    = hasStack ? arguments [1] : arguments [0];
```

We define `aMap`, which is an object containing one `aStep` or `aPath` per key. Depending on whether an `aStack` was passed or not, it is either the second or the third argument.

```javascript
      var aMap     = hasStack ? arguments [2] : arguments [1];
```

Since `a.stop` below invokes `a.cond`, and we never want to flatten an `aPath` more than once, we set this flag to precisely avoid this, as we did on `a.call` above.

```javascript
      var external = arguments [arguments.length - 1] === true ? false : true;
```

If `aMap` is not an object, we print an error and `a.return` `false`.

```javascript
      if (type (aMap) !== 'object') return a.return (aStack, e ('aMap has to be an object but instead is', aMap, 'with type', type (aMap)));
```

As we did above in `a.call`, if the `aPath` (which in this case is named `aCond`) was not validated/flattened, we do so. If it is invalid, we `return` `false`, both synchronously and asynchronously.

```javascript
      if (external) {
         aCond = a.flatten (aCond);
         if (aCond === false) return a.return (aStack, false);
      }
```

If we're here, we know that `aCond` is a flattened `aPath`. We now want to execute `aCond` asynchronously (by invoking `a.call`), and after it is done, to execute the appropriate conditional asynchronous branch.

The simplest way to do this is to push an `aStep` with a special `aFunction` into the `aCond`, which will be executed after the last asynchronous function of `aCond`.

```javascript
      aCond.push ([function (aStack, last) {
```

If there's a key in `aMap` which is equivalent to `aStack.last` (the value `a.return`ed by the last `aFunction` of `aCond`), we invoke `a.call`, passing as `aPath` the corresponding branch of the `aMap`.

```javascript
         if (aMap [last])      return a.call (aStack, aMap [last]);

```

Notice how `aMap` is not passed as an explicit parameter, but rather is bound to the function because it's defined within the scope of the current invocation of `a.cond`. Such are the joys of lexical scope.

Now, if `aMap [last]` is not defined but `aMap.default` is, we pass that branch to `a.call`.

```javascript
         if (aMap ['default'])        return a.call (aStack, aMap ['default']);
```

If neither a branch corresponding to `aStack.last` nor a `default` branch are defined in the `aMap`, we report an error message and `return` `false`.

```javascript
         return a.return (aStack, e ('The last aFunction received', last, 'as last argument', 'but aMap [', last, '] is undefined and aMap.default is also undefined!', 'aMap is:', aMap));
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

If the `aStack` is not present, we invoke it.

```javascript
      var hasStack   = type (arguments [0]) === 'object' && type (arguments [0].aPath) === 'array';
      var aStack     = hasStack ? arguments [0] : a.create ();
```

- `data` is a mandatory argument that contains an array or object.
- `fun` is an optional function. If it's not present, `data` will be considered as an `aStep`/`aPath` (if it's an array), or as an object where every key is an `aStep`/`aPath`. If `fun` *is* present, `data` will be fed to the `fun` - the output will be an `aStep` or `aPath` per each item in `data`.
- `options` is an optional object. If it's not defined, we initialize it to an empty object.

```javascript
      var data       = hasStack ? arguments [1] : arguments [0];
      var fun        = type (arguments [hasStack ? 2 : 1]) === 'function' ? arguments [hasStack ? 2 : 1] : undefined;
      var options    = arguments.length > (hasStack ? 2 : 1) && type (arguments [arguments.length - 1]) === 'object' ? arguments [arguments.length - 1] : {};
```

If `data` is neither an array or an object, we print an error and `a.return` false.

```javascript
      var dataType = type (data);

      if ((dataType !== 'array' && dataType !== 'object')) {
         return a.return (aStack, e ('data must be an array/object.'));
      }
```

We validate the `options` object, placing the following conditions:
- `options.max`, if defined, must be an integer greater than 0.
- `options.beat`: same than `options.max`.
- `options.test`, if defined, must be a function.

```javascript
      if (options.max && (type (options.max) !== 'integer' || options.max < 1))  return a.return (aStack, e ('If defined, options.max must be an integer greater than 0.'));
      if (options.beat && (type (options.beat) !== 'integer' || options.beat < 1))  return a.return (aStack, e ('If defined, options.beat must be an integer greater than 0.'));
      if (options.test && type (options.test) !== 'function') return a.return (aStack, e ('If defined, options.test must be a function.'));
```

If `options.beat` is not set, we initialize it to `0` if `options.max` and `options.test` are both `undefined`. Otherwise, we initialize it to `100`.

```javascript
      options.beat = options.beat || ((options.max || options.test) ? 100 : 0);
```

In the special case where data is empty, we return an empty array/object (corresponding to `data`'s type). Notice that when `data` is an array, we only return immediately if `options.beat` is zero. If `options.beat` is not zero, `a.fork` will wait for new elements to be added to the array until `options.beat` is elapsed.

```javascript
      if (dataType === 'array'  && data.length === 0 && options.beat === 0) return a.return (aStack, []);
      if (dataType === 'object' && Object.keys (data).length === 0)         return a.return (aStack, {});
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
      function fire () {
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
         var testRefresh = function () {
            test = options.test ();
            if (fire ()) load ();
         }
```

We set `testInterval` once.

```javascript
         testInterval = setInterval (testRefresh, options.beat);
      }
```

Now we get to the interesting part: we need to make parallel asynchronous calls, without any kind of race conditions, and make `a.fork` return the results (`output`) only when the last parallel call has `a.return`ed.

To this effect, we'll define a helper function within the scope of the current call to `a.fork`. This function, `collect`, will take two arguments: an `aStack` (because it's an `aFunction`) and a `key`.

`collect` is the `aFunction` that will be called *after* each `aStep` run in parallel, and to which we'll task to *collect* the results of each parallel `aStep`.

```javascript
      function collect (stack, key) {
```

Notice that the `aStack` passed to `collect` is named `stack`, so that `collect` can also refer to the original `aStack`.

The first thing that this function does is to set `output [key]` to the value `return`ed by the last asynchronous function. This value will have been `return`ed by the `aStep` at position `key` of the `aPath`. Notice this will work for both an array and an object. It will also work if elements are appended to `data` after `a.fork` fired.

```javascript
         output [key] = stack.last;
```

Notice that `output` is the array/object we created a few lines above. By defining `collect` within each call to `a.fork`, we allow each parallel execution thread to have a reference common to all of them, which allows all of them to behave as a unit.

In case `data` is an `array`, `output [key]` will be undefined before setting it to `stack.last`. If it's an object, `output [key]` will contain the `aStep`/`aPath` being executed (or data that generates this `aStep`/`aPath` through `fun`). In this case, that value will be replaced by the `a.return`ed value of the corresponding `aStep`/`aPath`.

If in the `stack` there are any keys that are neither `aPath` nor `last` (that is, other stack parameters), we place them in the original `aStack`, which is the `aStack` that `a.fork` received. If there's any overlap within stack parameters from different parallel `aStep`s, the last `aStep` to `a.return` will prevail. For example, if `aPath [4]` sets `aStack.data` and `aPath [2]` sets `aStack.data` too, if `aPath [2]` `a.return`s later than `aPath [4]`, it will overwrite the value of `aStack.data` set by `aPath [4]`.

```javascript
         for (var key in stack) {
            if (key !== 'aPath' && key !== 'last') aStack [key] = stack [key];
         }
```

We decrement `active`, since if we're invoking `collect`, it's because one of the `aStep`s just `a.return`ed (and hence, it's not executing anymore).

```javascript
         active--;
```

At this point, we invoke `fire` and if it returns `true`, we invoke `load`. Notice that so far we've invoked `load` in two places:
- When we recalculate `options.test`.
- When a function `a.return`s and `active` goes down, hence making room for another function in case `active` === `options.max`.

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
               if (active === 0 && counter === data.length)      a.return (aStack, output);
```

We set `options.beat` as the interval for the `setTimeout`. We close the conditional and the `collect` function.

```javascript
            }, options.beat);
         }
      }
```

Notice that `collect` is an exceptional `aFunction`, in that not always finishes by making a call to another `aFunction` - it only does it when a certain condition is met. However, this condition will be met exactly once - when the last `aStep` finished its execution. `collect and `a.fork`, together, behave like a proper `aFunction`.

We now create a copy of the `aStack` and store it in a local variable `stack`. We then reset its `aPath` to an empty array.

```javascript
      var stack = copy (aStack);
      stack.aPath = [];
```

The purpose of `stack` is to have a clean copy of the `aStack` that is not the `aStack` itself. The reason for this is extremely abstruse, but since you're reading this, we might as well explain it. Remember above when `collect` iterated through special keys (i.e.: neither `last` nor `aPath`) of its `aStack` and placed them into the original `aStack`? Well, any of these changes will be visible to parallel calls that are executed later. By making a copy of the original `aStack`, we preserve the original `aStack` as it was before any of the parallel calls starts executing.

We set a variable `loading` that will determine whether we are currently spawning concurrent calls or not. The variable is initalized to `false`, since we haven't issued any concurrent functions yet.

```javascript
      var loading = false;
```

We now define `load`, the function that will issue concurrent function calls. The whole function consists of a while loop which will be executed only if `fire` returns `true` (hence, we need to process more data AND we have have available resources to do so) and if `load` is not currently being executed.

```javascript
      function load () {
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

We invoke `a.call` passing as its `aStack` a **copy** of `stack`. This copy will be unique to the particular parallel thread we are initializing.

```javascript
         a.call (copy (stack), [
```

Using this newly created `aStack`, we invoke `a.call`, passing to it `value` (which will be the `aStep`/`aPath` corresponding to the current `data` element), followed by an `aStep` containing `collect` and `key`.

```javascript
               value,
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

### Two useful functions

`a.stop` is a function that will execute an `aPath` until one of its `aStep`s `return`s a value equal to `stopValue`.

```javascript
   a.stop = function () {
```

This function, like `a.call`, `a.cond` and `a.fork` above, is variadic, and can either receive an `aStack` or create it.

The other arguments are `stopValue`, `aPath` (which can be also an `aStep` or an array containing `aPath`s) and `external`.

Since `a.stop` calls itself recursively, we enable the `external` flag to avoid repeated flattening of its `aPath`.

```javascript
      var hasStack  = type (arguments [0]) === 'object';
      var aStack    = hasStack ? arguments [0] : a.create ();
      var stopValue = hasStack ? arguments [1] : arguments [0];
      var aPath     = hasStack ? arguments [2] : arguments [1];
      var external  = arguments [arguments.length - 1] === true ? false : true;
```

If the function wasn't invoked by itself, we flatten the `aPath` and `return` `false` if the `aPath` is invalid.

```javascript
      if (external) {
         aPath = a.flatten (aPath);
         if (aPath === false) return a.return (aStack, false);
      }
```

If `aPath` has length 0, there's nothing else to do, so we just `return` `aStack.last`.

```javascript
      if (aPath.length === 0) return a.return (aStack, aStack.last);
```

We remove the first `aStep` from the `aPath` and store it in a local variable `next`.

```javascript
      var next = aPath.shift ();
```

We create an `aMap`. Its `default` key will be an `aStep` that calls `a.stop`, with arguments `stopValue`, `aPath` and `true`. Remember that the `aPath` now has one less `aStep` than when it entered the function.

```javascript
      var aMap = {default: [a.stop, stopValue, aPath, true]};
```

We set another branch in the `aMap`, corresponding to the `stopValue`. If this branch is activated, we simply `a.return` the `stopValue`.

```javascript
      aMap [stopValue] = [a.return, stopValue];
```

We invoke `a.cond`, passing the `aStack`, `next` wrapped into an array (which makes it an `aPath`), `aMap`, and external set to `true`.

```javascript
      return a.cond (aStack, [next], aMap, true);
   }
```

`a.log` is a function for logging the data in the `aStack` at any given moment, plus other arguments that you pass to it. It does two things:

- Log its arguments, with the exception of `aStack.aPath`.
- `return` the same value that was in `aStack.last`.

```javascript
   a.log = function (aStack) {
```

We create a local variable `Arguments` where we'll store a copy of `arguments`. Notice that we place an empty object instead of `aStack` as its first element.

```javascript
      var Arguments = [{}].concat (Array.prototype.slice.call (arguments, 1));
```

We copy every key of the `aStack` into the first element of `Arguments`, except for `aPath`.

```javascript
      for (var key in aStack) {
         if (key !== 'aPath') Arguments [0] [key] = aStack [key];
      }
```

We log `Arguments`.

```javascript
      console.log (Arguments);
```

We `a.return` `aStack.last` using the `aStack`.

```javascript
      return a.return (aStack, aStack.last);
   }
```

We close the module.

```javascript
}) ();
```

## License

aStack is written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.
