/**
 * @file Attempts to convert your JavaScript to JSON.
 * @author Christopher Hiller <chiller@badwing.com>
 * @copyright 2014 Christopher Hiller
 * @license MIT
 */

/**
 * @module j2j
 * @description Attempts to convert your JavaScript to JSON.
 */

'use strict';

var defaults = require('defaults'),
  chalk = require('chalk'),
  error = chalk.red.bold,
  info = chalk.blue,
  warn = chalk.yellow,

  /**
   * @description Default # of spaces to indent JSON output
   * @constant
   * @private
   * @type {string}
   */
  DEFAULT_INDENT = 2,

  /**
   * @description Whether to turn off colors by default.
   * @private
   * @type {boolean}
   */
  DEFAULT_NOCOLOR = true,

  /**
   * @description Enable debug by default?
   * @constant
   * @private
   * @type {boolean}
   */
  DEFAULT_DEBUG = false,

  /**
   * @description Line #'s in output?
   * @constant
   * @private
   * @type {boolean}
   */
  DEFAULT_LINENOS = false,

  stringify = JSON.stringify;

/**
 * @summary Attempts to parse a string into JSONable.
 * @description If you pass something like `"{foo: 'bar'}"` into `JSON.stringify()`, it will of course
 * return `"{foo: 'bar'}"` because you gave it a string.  We need to give `JSON.stringify()` some actual
 * JavaScript.  So we attempt to evaluate the string as JS within a sandbox.  Because it's evaluated,
 * you can actually put expressions in it, call functions, etc., as long as everything is defined.
 * @param {String} s Raw string to evaluate
 * @param {(Object|Function)} opts See {@link module:j2j.options}.  Callback if function.
 * @param {Function} [callback] Callback to call with results from evaluation, if you don't like Promises.
 * @alias module:j2j.parse
 * @returns {Promise}
 */
var parse = function parse(s, opts, callback) {
  var sandbox = new (require('sandbox'))(),
    Q = require('q'),
    dfrd = Q.defer(),
    fn = '(function() { console.log((' + s + ')); return typeof function() { return (' + s +
      ');}();})();';

  opts = options(opts);

  opts.debug && console.info(info('Executing:\n' + fn));

  // log the evaluated string, get the evaluated type, and trap them.
  sandbox.run(fn, function (info) {
    if (["'object'", "'string'", "'number'"].indexOf(info.result) > -1) {
      return dfrd.resolve(info.console[0]);
    }
    opts.debug &&
    console.info(info('Sandbox output: \n' + stringify(info, null, parseInt(opts.indent, 10))));
    return dfrd.reject('input evaluated to ' + info.result + ', which is no good.');
  });

  return dfrd.promise
    .nodeify(typeof opts === 'function' ? opts : callback);
};

/**
 * @summary Given a JS variable, stringify it, with optional color
 * @description This function is synchronous.
 * @param {(Object|Array|string|number)} o Thing to stringify and output.
 * @param {Object} [opts] Options.  See {@link module:j2j.options}
 * @alias module:j2j.output
 * @returns {string}
 */
var output = function output(o, opts) {
  var out;

  opts = options(opts);

  out = stringify(o, null, parseInt(opts.indent, 10));
  if (process.stdout.isTTY && !opts['no-color'] && !opts.output) {
    try {
      out = require('cardinal').highlight(out, {
        json: true,
        linenos: opts['line-nos']
      });
    } catch (e) {
      console.warn(warn('Could not highlight!  Exception: "%s"'), e.message);
    }
  }
  return out;
};

/**
 * @description Merge options object with default options.
 * @param {(Object|Function)} [opts] Options!  If function, ignored.
 * @param {boolean} [opts.debug=false] Debug mode?
 * @param {number} [opts.indent=2] How many spaces to indent JSON output
 * @param {boolean} [opts.no-color] No colors? Even a little?  `false` in programmatic usage; `true` otherwise.
 * @param {boolean} [opts.line-nos] Display line numbers?
 * @returns {Object}
 * @alias module:j2j.options
 */
var options = function options(opts) {
  opts = typeof opts === 'function' ? {} : opts;
  return defaults(opts, {
    debug: DEFAULT_DEBUG,
    indent: DEFAULT_INDENT,
    'no-color': DEFAULT_NOCOLOR,
    'line-nos': DEFAULT_LINENOS
  });
};

/**
 * @summary Parses and generates output from a string, then writes the output somewhere.
 * @description Used by CLI.  Exits with nonzero code if error and `callback` is NOT specified.
 * @param {string} input String to parse
 * @param {(Object|Function)} [opts] See {@link module:j2j.options}.  Callback if function.
 * @param {Function} [callback] Optional callback if you don't want to use Promises.
 * @see module:j2j
 * @alias module:j2j.write
 * @returns {Promise}
 */
var write = function write(input, opts, callback) {
  return require('q')(function (input, opts) {

    opts = options(opts);

    return parse(input, opts)
      .then(function (s) {
        return output(s, opts);
      }, function (err) {
        if (opts.debug) {
          console.error(error(err));
        }
        throw new Error('cannot coerce input into anything JSON.stringify() can handle');
      })
      .then(function (out) {
        if (opts.output) {
          return require('graceful-fs').writeFileSync(opts.output, out);
        }
        process.stdout.write(out);
      }, function (err) {
        console.error(error(err));
        !callback && process.exit(1);
      });
  }(input, opts))
    .nodeify(typeof opts === 'function' ? opts : callback);
};

var _main = function _main() {
  var input,
    stdin,
    chunks = [],
    version = require(require('path').join(__dirname, 'package.json')).version,
    argv = require('yargs')

      .usage('Convert JavaScript to JSON.\nUsage: j2j ["<JavaScript>"] [options]')

      .example('echo "{foo: \'bar\'}" | j2j -i 0', 'Stringify JS object w/o indentation to STDOUT')
      .example('j2j "{foo: \'bar\'}" -i 0', 'Equivalent to above')
      .example('j2j "{foo: 2+2}"', 'Evaluate, stringify, indent & output to STDOUT')
      .example('j2j -f bar.js -o bar.json', 'Parse JS file & output to bar.json.  Good luck!')

      .describe('f', 'Read file for input')
      .alias('f', 'file')

      .describe('o', 'Output file; if not specified, STDOUT is used')
      .alias('o', 'output')

      .describe('C', 'Do not output color')
      .alias('C', 'no-color')
      .default('C', false)
      .boolean('C')

      .describe('i', 'Indentation (0 for none)')
      .default('i', DEFAULT_INDENT)
      .alias('i', 'indent')

      .describe('l', 'Display line numbers')
      .boolean('l')
      .default('l', false)
      .alias('l', 'line-nos')

      .describe('debug', 'Debug mode')
      .boolean('debug')
      .default('debug', false)

      .help('h')
      .alias('h', 'help')

      .version(version, 'v')
      .alias('v', 'version')
      .argv;

  input = argv.file ? require('graceful-fs').readFileSync(argv.file) : argv._[0];

  // nocolor will be false in CLI mode
  argv = defaults(argv, {
    'no-color': false
  });

  if (!input) {
    stdin = process.stdin;
    stdin.resume();
    stdin.setEncoding('utf8');

    stdin.on('data', function (chunk) {
      chunks.push(chunk);
    });

    stdin.on('end', function () {
      write(chunks.join(), argv);
    });
  }
  else {
    write(input, argv);
  }
};

/**
 * @summary Parses and generates output from a string.  Fulfills with output.
 * @description For programmatic use.  If for some reason you pass it a non-string,
 * it will just give you output, which is a shortcut for `JSON.stringify()`.
 * @param {string} input String to parse
 * @param {Object} [opts] See {@link module:j2j.options}
 * @param {Function} [callback] Optional callback if you don't want to use Promises.
 * @see module:j2j.write
 * @alias module:j2j
 * @returns {Promise}
 * @example
 * var j2j = require('j2j');
 *
 * j2j("{foo: 'bar', baz: 2}", {indent: false})
 *   .then(function(output) {
 *     expect(output).to.equal('{"foo":"bar","baz":2}');
 *   });
 */
var j2j = function j2j(input, opts, callback) {
  var Q = require('q');
  return Q(function (input, opts) {
    if (!input) {
      throw new Error('input parameter cannot be empty');
    }
    opts = options(opts);
    if (typeof input === 'string') {
      return output(input, opts);
    }
    return parse(input, opts)
      .then(function (o) {
        return output(o, opts);
      });
  }(input, opts))
    .nodeify(typeof opts === 'function' ? opts : callback);
};
j2j.parse = parse;
j2j.output = output;
j2j.write = write;
j2j.options = options;
j2j._main = _main;

module.exports = j2j;
