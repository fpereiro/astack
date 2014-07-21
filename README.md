#aStack

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

## Usage examples

### Sequential execution

Write "0" to a file, then read that value, increment it by 1 three times. Everything is executed in order without using synchronous functions.

```javascript

var fs = require ('fs');
var a = require ('./astack.js');

function write_file (aStack, path, data) {
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

function increment_file (aStack, path) {
   fs.readFile (path, function (error, data) {
      write_file (aStack, path, parseInt (data) + 1);
   });
}

a.call ([
   [write_file, 'count.txt', '0'],
   [increment_file, 'count.txt'],
   [increment_file, 'count.txt'],
   [increment_file, 'count.txt']
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
function write_and_increment (aStack, path) {
   a.cond (aStack, [write_file, path, '0'], {
      true: [increment_file, path],
      false: [function (aStack) {
         console.log ('There was an error when writing to the file', path, 'so no incrementing will take place.');
         a.return (aStack, false);
      }]
   });
}

a.call ([
   [write_and_increment, 'count.txt'],
   [write_and_increment]
]);
```

This script prints the following:

```
Current value of count.txt is 0
Current value of count.txt is 1
There was an error when writing to the file undefined so no incrementing will take place.
```

### Parallel execution

Try writing '0' and then incrementing, for three different files at the same time. When all actions are completed, print the results of each action.

```javascript
a.call ([
   [a.fork, [
      [write_and_increment, 'count_0.txt'],
      [write_and_increment, 'count_1.txt'],
      [write_and_increment, 'count_2.txt']
   ]],
   [function (aStack) {
      console.log ('a.fork operation ready. Result was', aStack.last);
      a.return (aStack, true);
   }]
]);
```

This script prints the following:

```
Current value of count_0.txt is 0
Current value of count_1.txt is 0
Current value of count_2.txt is 0
Current value of count_1.txt is 1
Current value of count_0.txt is 1
Current value of count_2.txt is 1
a.fork operation ready. Result was [ true, true, true ]
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

Going back to the nuts and bolts, you may ask: **when the disk/network are called asynchronously, are done, where do they send the result of their operation?** The answer is: to the **callback**.

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

Let's see how we can transform callback hell into aStack.

```javascript

function async1 (callback, data) {
   // Do stuff to data
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

```javascript
var a = require ('astack');

function async1 (aStack, data) {
   // Do stuff to data
   a.return (aStack, data);
}

// async2 and async3 are just like async1

function asyncSequence (aStack, data) {
   a.call (aStack, [
      [async1, data],
      [async2, '@last'],
      [async3, '@last']
   ]);
}
```

Let's count the differences between both examples:

1. In the first example, every async function takes a `callback` as its last argument. In the second one, every async function takes an `aStack` as its first argument.
2. In the first example, `async1` finish their execution by invoking the `callback`. In the second one, they invoke a function named `a.return`, and pass to it both the `aStack` and the `return`ed value.
3. In the first example, we have nested anonymous functions passing callbacks. In the second one, `asyncSequence` invokes a function named `a.call`, which receives as argument the `aStack` and an array with asynchronous functions and their arguments.

These three differences (`aStack`, `a.call` and `a.return`) allow you to write asynchronous functions almost as if they were synchronous. In the next section we will explore how.

## The elements of aStack

The core of aStack is made of five structures and two functions. If you understand them, you can use the library with full confidence.

### The five structures of aStack

aStack is composed of five structures.

1. `aStep`
2. `aPath`
3. `aPest`
4. `aStack`
5. `aFunction`

#### `aStep`

The `aStep` is a callback (that is, a function), wrapped in an array, and followed by zero or more arguments.

`aStep = [mysqlQuery, 'localhost', 'SELECT * FROM records']`

The `aStep` represents a single step in a sequence of asynchronous functions.

#### `aPath`

The `aPath` is an array containing zero or more `aStep`s. An `aPath` is, in fact, a sequence of asynchronous functions.

`aPath = [aStep, ...]`

#### `aPest`

An `aPest` is an array that can be either an `aPath` or an `aStep`. This definition will be useful later, I promise.

#### `aStack`

The `aStack` is the argument that asynchronous functions will pass around instead of callbacks. It is an object that contains two things:

1. An `aPath`.
2. `last`, which is the value returned by the last asynchronous function executed.

```
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
   if (arg1 === true) {
      ...
      a.call (...);
   }
   else {
      ...
      // Incorrect! If this else block is executed, a.call won't be called!
   }
}
```

- In any execution path, there cannot be more than one call to `call` or another `aFunction` other than the last call. In any execution path, you must merge all calls to `a.call` into one.

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

- Don't modify `aStack.aPath` and `aStack.last`. Rather, do it through `call` and `return` (which we'll see in a moment).

In short:

1. Mind the `aStack`.
2. Call `call` or another `aFunction` as the last thing you do in every execution path.
3. Call `call` or another `aFunction` only once per execution path.
4. Don't tamper with `aStack.aPath` and `aStack.last`.

### `call` and `return`

The two main functions of aStack are `call` and `return`.

`call` is the main function of aStack and the soul of the library. Every `aFunction` calls either `call` directly, or through another `aFunction`. `call` keeps the ball rolling and ensures that all callbacks are executed eventually.

`call` takes one or two arguments: an optional `aStack` and an `aPest` (that is, an `aPath` or `aStep`).

It then does the following:

1. Creates the `aStack` if it is undefined.

   You may ask: **when is it useful to have an undefined `aStack`?** The answer is: when you invoke the first asynchronous function!

   ```javascript

   function asyncProcessing (aStack, arg1, arg2) {
      ...
   }

   a.call ([asyncProcessing]);
   ```

   In the example above, when you want to invoke `asyncProcessing`, you need to invoke `call` without any `aStack`.

2. If the `aPest` is an `aStep`, it is transformed into an `aPath`. This is very handy. If it wasn't for this, the last line of the example above would be: `a.call ([[asyncProcessing]])`, which is both tedious and error prone.

3. Validates the `aStack` and the `aPath`. If they don't pass the test, the function returns false.

   It is worthy to note the following: if in an asynchronous function you find a validation error and you want to return `false`, you can both return and `a.return` that error: you `a.return` because you want the next function in the sequence to have that data, and you `return` so that the execution flow stops in the function that had the error.

   ```javascript
   function async (aStack, arg1) {
      if (arg1 === false) {
         return a.return (aStack, false);
      }
   }
   ```

   All the functions in this library do this, except when the `aStack` is invalid. In this case, there's no valid place to which to `a.return` a `false` value, so we just `return false`.

4. `aStack.aPath = aPath.concat (aStack.aPath);`: the `aPath` of the stack is now the `aPath` received, plus what the `aPath` of the stack had before.

   If `aStack.aPath` is empty, this means that now the functions passed in the `aPath` will be run. But if it wasn't, this means that the functions passed to `a.call` will be run first, and then the functions that were in the `aStack.aPath` will be called.

5. If `aStack.aPath`'s length is 0, there's nothing else to do. This can only happen when both `aStack.aPath` and `aPath` were empty arrays. In this case, we return `aStack.last`, which is the value of the last asynchronous function executed.

6. We take out the first element from the `aStack.aPath` and name it `aStep`.

7. We validate this `aStep`. This step is redundant in the case that 2) was executed. If the validation returns false, the function returns false.

8. We take out the first element from the `aStep` and name it `aFunction`.

9. We scan the `aStep`, which contains the arguments of the `aFunction` we are going to run next. If any of these elements is a string that starts with an `@`, that element will be substituted by the value of the corresponding element in the aStack. This is best shown with an example:

   ```javascript
   function log (aStack, text) {
      console.log (text);
      a.return (aStack, true);
   }

   a.call ([
      [function (aStack) {
         a.return (aStack, 'hola viteh!');
      }],
      [log, '@last']
   ]);
   ```

   This script will print out `hola viteh!`. This is because the `@last` argument is replaced by `aStack.last`. You can also do this with other keys within the `aStack` (as long as you don't mess with `aStack.aPath`)!

   ```javascript
   a.call ([
      [function (aStack) {
         aStack.logMessage = 'hola viteh!';
         a.return (aStack);
      }],
      [log, '@logMessage']
   ]);
   ```

   We call these arguments `at-parameters`, because they start with an `@` sign.

10. We place the modified `aStack` as the first element of the `aStep`. After this, the `aStep` contains the `aStack` as first element, plus all the other elements (arguments) it had in the first place.

11. We apply the `aFunction` with the `aStep` as its array of arguments. Notice that the `aStack` is the first argument passed to the `aFunction`! That's why we did 10) above.

To sum up, `call` takes two `aPath`s (one passed directly, the other one within the `aStack`), merges them (giving priority to `aPath` over `aStack.aPath`), and executes the first `aFunction` in them, passing the `aStack`.

`return` takes two arguments: a return value and an aStack. It does the following:

1. Validate the aStack.
2. Set `aStack.last` to the `last` argument.
3. Call `call` with the `aStack` and an empty `aPath`.

Actually, `return` can take an optional third argument, named `copy`, which should be a string. A copy of the return value will be stored in the aStack, under the key named as the `copy` argument. For example, if you write `a.return (aStack, true, 'someKey')`, the next `aFunction` executed will receive an `aStack` where `aStack.someKey === true`.

This functionality is useful when you want to preserve an `return`ed value for more than one `aStep`. Since every `aStep` overwrites aStack.last, when you need to preserve states along a chain of `aSteps`, just use this argument. Caution must be taken not to overuse this resource, since it's comparable to setting a global variable within the aStack - and hence, you rely on other functions you call in the middle not to modify it or use it in any way.

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

Notice that `return` is an `aFunction`, and as such, the last thing that it does is to invoke `call`.

## Four more functions

### `cond`

Apart from the `aStack`, `cond` takes two additional arguments, an `aPest` and an `aMap`.

An `aMap` is an object where each key points to an `aPest`.

If the `aStack` is undefined, `cond` creates it.

`cond` executes the `aPath`, obtains a result (we will call it `X`) and then executes the `aPath` contained at `aMap.X`.

Notice that `X` will be stringified, since object keys are always strings in javascript. For an example of this, refer to the conditional execution example above, where `true` and `false` are converted into `'true'` and `'false'`.

You can also insert a `default` key in the `aMap`. This key will be executed if `X` is not found in the `aMap`.

If neither `X` nor `default` are defined, `aCond` returns an error.

### `fork`

Apart from the `aStack`, `fork` takes one additional argument: an `aPest`.

If the `aStack` is undefined, `fork` creates it.

If the `aPest` is an `aStep`, it is converted into an `aPath`.

`fork` passes each element within the `aPath` to `call` simultaneously.

When each of the `aSteps` are finished, their results are stored in an array held by `fork`. The `results` array has a one-to-one correspondence with the `aPath` passed to `fork`, in that the first result matches the first `aStep`, the second result matches the second `aStep`, and so on.

When the last action is executed, the results array is `returned`.

If you pass an empty `aPath`, `fork` will just return an empty array.

### `stop`

Apart from the `aStack`, `stop` takes two more arguments: `stop_value` and an `aPath`.

If the `aStack` is undefined, `stop` creates it.

The `stop_value` is any value, which is coerced onto a string. `stop` starts executing the first `aStep` in the `aPath`, and then, if the value `returned` by it is equal to the `stop_value`, that value is `returned` and no further `aSteps` are executed. If it's not equal, then `stop` will execute the next `aStep`.

### `log`

To inspect the contents of the `aStack`, place an `aStep` calling `log` just below the `aStep` you wish to inspect.

`log` prints the contents of the aStack, removing first `aStack.aPath`, and then adding further arguments passed to it. It then `returns` aStack.last, so execution resumes unaffected.

## Source code

The complete source code is contained in `astack.js`. It is about 310 lines long.

## License

aStack is written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.
