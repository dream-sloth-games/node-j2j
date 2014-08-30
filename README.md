# j2j

**j2j** is a command-line utility to convert JavaScript to JSON.

It works best on plain ol' JavaScript objects, but anything that [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) consumes should work as well.

I wrote this because I often need to convert fairly static JS objects into `.json` files.  For example, taking the contents of a `Gruntfile.js`'s config and putting them into individual task files (a la [load-grunt-config](https://www.npmjs.org/package/load-grunt-config)).

Alternatively, you could do something like this by pasting the JS into a `node` console:

```
$ node
> console.log(JSON.stringify({
...   main: [
...     'Gruntfile.js',
...     '<%= mochacov.options.files %>'
...   ],
...   options: {
.....     jshintrc: true
.....   }
... }, null, 2));
```

...and copy/paste the output.  However, I wanted something automated (which I can integrate into my IDE).

This tool is *not* for converting 1,000 lines of JavaScript into JSON, though you could try.
 
## Example

```sh
$ j2j -o out.json <<EOF 
{
  main: [
    'Gruntfile.js',
    '<%= mochacov.options.files %>'
  ],
  options: {
    jshintrc: true
  }
}
EOF 
$ cat out.json
{
  "main": [
    "Gruntfile.js",
    "<%= mochacov.options.files %>"
  ],
  "options": {
    "jshintrc": true
  }
}
```

## Usage

**If no string is given and option `--file` is not used, j2j reads from STDIN.** 

For shorter inputs:

```sh
echo "input" | j2j [options]
```

```sh
j2j ["input"] [options] 
```

> If `input` is specified, it should be wrapped in quotes or double-quotes, unless you use the following method.

For longer inputs, I recommend:

```sh
j2j [options] <<EOF
input
EOF
```

### Caveats

- An *input of `foo` will fail*, because that appears to be a variable to the parser.  Use `'foo'` instead.
- The JavaScript you use as input *is evaluated* which means your code gets executed.  Thus, if your input is `2 + 2`, the JSON output will be `4`.  You could probably do all sorts of terrible and wonderful things with that.
- Don't worry, it's evaluated in a sandbox.

### All Options

- `-f, --file`: Read file instead of accepting a string.
- `-o, --output`: Output to file instead of STDOUT.
- `-C, --color`: Do not output color under any circumstances.  **Default: `false`**
- `-i, --indent`: Indentation level.  **Default: `2`**
- `-l, --line-nos`: Display line numbers.  **Default: `false`**
- `-h, --help`: Display help
- `-v, --version`: Display version
- `--debug`: Debug mode

### More Examples

Write to a file:

```sh
j2j > foo.json <<EOF
{foo: 'bar'}
EOF
```

Read from a file, and write to another file:

```sh
j2j --file foo.js --output foo.json
```

## Programmatic Usage

### j2j(input, opts, callback) 

**Parses and generates output from a string.  Fulfills with output.**

For programmatic use.  If for some reason you pass it a non-string,
it will just give you output, which is a shortcut for `JSON.stringify()`.

**Parameters**

**input**: `string`, String to parse

**opts**: `Object`, See [options](#j2joptionsopts-optsdebug-optsindent-optsno-color-optsline-nos)

**callback**: `function`, Optional callback if you don't want to use Promises.

**Returns**: `Promise`, See [Q docs](https://github.com/kriskowal/q/wiki/API-Reference)

**Example**:
```js
var j2j = require('j2j');

j2j("{foo: 'bar', baz: 2}", {indent: false})
  .then(function(output) {
    expect(output).to.equal('{"foo":"bar","baz":2}');
  });
```

### j2j.parse(s, opts, callback) 

**Attempts to parse a string into JSONable.**

If you pass something like `{foo: 'bar'}` into `JSON.stringify()`, it will of course return `"{foo: 'bar'}"` because you gave it a string.  We need to give `JSON.stringify()` some actual JavaScript.  So we attempt to evaluate the string as JS within a sandbox.  Because it's evaluated, you can actually put expressions in it, call functions, etc., as long as everything is defined.

**Parameters**

**s**: `String`, Raw string to evaluate

**opts**: `Object | function`, See [options](#j2joptionsopts-optsdebug-optsindent-optsno-color-optsline-nos).  Callback if function.

**callback**: `function`, Callback to call with results from evaluation, if you don't like Promises.

**Returns**: `Promise`, See [Q docs](https://github.com/kriskowal/q/wiki/API-Reference)


### j2j.output(o, opts)
 
**Given a JS variable, stringify it, with optional color**

This function is synchronous.

**Parameters**

**o**: `Object | Array | string | number`, Thing to stringify and output.

**opts**: `Object`, Options.  See [options](#j2joptionsopts-optsdebug-optsindent-optsno-color-optsline-nos)

**Returns**: `string`


### j2j.options(opts, opts.debug, opts.indent, opts.no-color, opts.line-nos) 

Merge options object with default options.

**Parameters**

**opts**: `Object | function`, Options!  If function, ignored.

**opts.debug**: `boolean`, Debug mode?

**opts.indent**: `number`, How many spaces to indent JSON output

**opts.no-color**: `boolean`, No colors? Even a little?  `false` in programmatic usage; `true` otherwise.

**opts.line-nos**: `boolean`, Display line numbers?

**Returns**: `Object`


### j2j.write(input, opts, callback) 

**Parses and generates output from a string, then writes the output somewhere.**

Used by CLI.  Exits with nonzero code if error and `callback` is NOT specified.

**Parameters**

**input**: `string`, String to parse

**opts**: `Object | function`, See [options](#j2joptionsopts-optsdebug-optsindent-optsno-color-optsline-nos).  Callback if function.

**callback**: `function`, Optional callback if you don't want to use Promises.

**Returns**: `Promise`, See [Q docs](https://github.com/kriskowal/q/wiki/API-Reference)

## Author

[Christopher Hiller](http://boneskull.github.io)

## License

MIT
