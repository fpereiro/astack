#aStack

aStack is a tool for writing sequences of asynchronous functions in Javascript.

aStack strives to be the simplest solution to the problem of executing arbitrary sequences of asynchronous functions.

aStack works by making functions pass an `aStack` between them, instead of callbacks.

aStack also supports conditional branching (through `aCond`) and parallelization of asynchronous tasks (through `aFork`).

## Installation

aStack is written in Javascript. You can use it in the browser by sourcing the main file.

```html
<script src="astack.js"></script>
```
And you also can use it in node.js. To install: `npm install astack`

## Why aStack?

Asynchronous functions are amazingly useful in Javascript, because they allow you to perform many slow operations (that involve the disk and the network) within a single process. Hence, your browser/server doesn't get stuck while waiting for data.

This power comes with a price: asynchronous functions can't return as normal functions do. To `return` means two things:

1. The flow of execution resumes at the place where the function was called.
2. The value returned by the function is available when execution is resumed.

Since asynchronous functions return control before their asynchronous actions are complete, two things go awry when you want to execute them sequentially:

1. The next function is executed before the previous asynchronous function completed doing its useful work.
2. The next function lacks the data produced by the previous asynchronous function, since the data isn't available yet.

To address this problem, the standard practice is to pass a callback to the first asynchronous function you call. A callback is simply a function that will be executed when the first asynchronous function has completed its asynchronous actions.

The callback approach works well when either:

1. Your asynchronous sequences are short (< 3 functions).
2. Your asynchronous functions usually call each other in the same order. That is, function X always call function Y afterwards, hence you don't need to pass Y as a callback to X, because the call to Y is hardwired within X. This effectively means that you can consider X and Y to be *a single asynchronous function* (although they may be written separately).

But what happens when you want to construct and execute arbitrary sequences of asynchronous functions? If you have X, Y and Z (all three asynchronous functions), and you want to call them in any order (i.e.: arbitrarily), you have to pass two callbacks to the first function you call. In general, if you want to execute an arbitrary sequence of n functions, you need to pass n-1 callbacks to the first function. Hence, a descent into [callback hell](www.callbackhell.com) becomes unavoidable.

I confronted this exact problem when writing a library that's for now `vaporware`, where I needed to execute arbitrary sequences of asynchronous functions. These functions were called in any order and should produce useful return values that should be passed to the next function in the sequence.

Thus, I needed a way of succintly expressing sequences of asynchronous functions. I wanted to treat these sequences as an array of actions to be completed. And I wanted my functions to be the same, no matter which function called them before or what function called them afterwards. In short, I wanted something that allowed me to:

1. Express a sequence of asynchronous functions as an array that I could easily construct and pass around.
2. Provide asynchronous functions with a way of returning values and resuming execution at the next function of the sequence.
3. Treat a sequence of asynchronous functions as a single function, to allow me to nest them arbitrarily.
4. Impose minimal constraints to the functions.

aStack emerged from that need.

## The elements of `aStack`

aStack is composed of four elements. If you understand them, you'll understand the library.

1. `aStep`
2. `aPath`
3. `aStack`
4. `aFunction`

The first concept is the `aStep` (short for asynchronous step). An `aStep` is an array that contains a function as its first element, and further elements, which are the arguments passed to that function. For example:

`aStep = [mysqlQuery, 'localhost', 'SELECT * FROM records']`

Think of the `aStep` as a callback, wrapped in an array, and followed by zero or more arguments, because that's exactly what it is!

The `aStep` represents a single step in a sequence of asynchronous functions.

The second concept is the `aPath`, which is an array of zero or more `aStep`s. an `aPath` is, in fact, a sequence of asynchronous functions.

`aPath = [aStep, ...]`

The third concept is the `aStack`, which is the object that we will be passing around (instead of passing around callbacks). It is a Javascript that contains two things:

1. An `aPath`
2. `last`, which is the value returned by the last asynchronous function executed.

`aStack = {
   aPath: ...
   last: ...
}`

`last` can have any value (even undefined).

A detail I haven't mentioned yet: the first element of an `aStep` must always be an `aFunction`.

The `aFunction` is a normal function (usually asynchronous, but not necessarily) that adheres to the following conventions:

1. Receives an `aStack` as its first element.
2. Whatever its execution path, as the last thing it does, the function calls either `aCall` or `aReturn` exactly once, passing the aStack to either of them.
3. aCall or aReturn are called exactly once (at the end of each execution path) and not before.

`aCall` and `aReturn` are two functions; I'll get to them in a minute. For now, you just need to understand that these conventions are exactly the same than those of Javascript callbacks, with the following differences:

1. You pass the `aStack` as the first argument, instead of the callback as the last argument.
2. You invoke the next function in the sequence indirectly through `aCall` and `aReturn`, instead of just invoking the callback.

To sum up, the elements of aStack are:

1. `aStep`: an array that contains as first element an `aFunction`.
2. `aPath`: an array of zero or more `aStep`s.
3. `aStack`: an object containing an `aPath` and `last`.
4. `aFunction`: a function that ends up with a call to `aCall` or `aReturn`.

## `aCall` and `aReturn`

The two main functions of aStack are `aCall` and `aReturn`. If you understand what they do, you can start using aStack with full confidence.

`aCall` takes two arguments: an `aStack` and an `aPath`/`aStep`. It does the following:

1. Creates the `aStack` if it is undefined. Default value for an `aStack` is `{aPath = []}`.
2. If the `aPath/aStep` turns out to be an `aStep`, it is wrapped in an array to become an `aPath`.
3. Validates the `aStack` and the `aPath`. If they don't pass the test, the function returns false.
4. `aStack.aPath = aPath.concat (aStack.aPath);`: the `aPath` of the stack is now the `aPath` received, plus what the `aPath` of the stack had before.
5. If `aStack.aPath`'s length is 0, there's nothing else to do. Return true.
6. We shift the first element from the `aStack.aPath` and name it `aStep`.
7. We validate this `aStep`. This step is redundant in the case that 2) was executed. If the validation returns false, the function returns false.
8. We shift the first element from the `aStep` and name it `aFunction`.
9. We place the `aStack` as the first element of the `aStep`. After this, the `aStep` contains the `aStack` as first element, plus all the other elements (arguments) it had in the first place.
10. We apply the `aFunction` with the `aStep` as its array of arguments. Notice that the `aStack` is the first argument passed to the `aFunction`! That's why we did 9) above.

To sum up, `aCall` takes two `aPath`s (one passed directly, the other one within the `aStack`), merges them, and executes the first `aFunction` in them, passing the `aStack`.

`aReturn` also takes two arguments: a return value and an aStack. It does the following:

1. Validate the aStack.
2. Set `aStack.last` to the `last` argument.
3. Call `aCall` with the `aStack` and an empty `aPath`.

As you can see, `aReturn` is far simpler than `aCall`.

## Understanding the conventions

By now, it should be clear why we have conventions/restrictions on aFunctions:

1. By specifying the `aStack` to be the first argument of any `aFunction`, we allow any number of arguments to be passed to a function. If we specified the `aStack` as the last argument (as it is done normally with callbacks), we should force every function to have the same number of arguments.
2. When the function is done doing its special purpose processing, a single `aCall` or `aReturn` is made.
3. You pass the aStack always. If it doesn't exist, it doesn't matter, aCall knows what to do. This allows `aFunctions` to be called by other `aFunctions`.

Notice that nothing prevents an `aFunction` from being synchronous! As long as you respect the conventions, the code will work.

## aCond

Imagine that you want your sequence to stop if any `aFunction` `aReturn`s `false` (or any other value, for that matter). It turns out this is very easy to use with aCond.

DOCUMENTATION COMING SOON!!

## aFork

DOCUMENTATION COMING SOON!!

## Source code

The complete source code is contained in `astack.js`. It is about 180 lines long.

## License

aStack is written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.
