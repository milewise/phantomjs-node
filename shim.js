var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}
var __require = require;

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require.resolve = (function () {
    var core = {
        'assert': true,
        'events': true,
        'fs': true,
        'path': true,
        'vm': true
    };
    
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (core[x]) return x;
        var path = require.modules.path();
        var y = cwd || '.';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = Object_keys(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key)
    return res;
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = function (fn) {
    setTimeout(fn, 0);
};

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

require.modules["path"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "path";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["path"]._cached = module.exports;
    
    (function () {
        function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};
;
    }).call(module.exports);
    
    __require.modules["path"]._cached = module.exports;
    return module.exports;
};

require.modules["/node_modules/dnode-protocol/package.json"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/node_modules/dnode-protocol";
    var __filename = "/node_modules/dnode-protocol/package.json";
    
    var require = function (file) {
        return __require(file, "/node_modules/dnode-protocol");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/node_modules/dnode-protocol");
    };
    
    require.modules = __require.modules;
    __require.modules["/node_modules/dnode-protocol/package.json"]._cached = module.exports;
    
    (function () {
        module.exports = {"name":"dnode-protocol","description":"Implements the dnode protocol abstractly","version":"0.1.0","repository":"https://github.com/substack/dnode-protocol.git","author":{"name":"James Halliday","email":"mail@substack.net","url":"http://substack.net"},"main":"./index.js","dependencies":{"traverse":"0.5.x"},"scripts":{"test":"expresso"},"engines":{"node":">=0.2.0"}};
    }).call(module.exports);
    
    __require.modules["/node_modules/dnode-protocol/package.json"]._cached = module.exports;
    return module.exports;
};

require.modules["/node_modules/dnode-protocol/index.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/node_modules/dnode-protocol";
    var __filename = "/node_modules/dnode-protocol/index.js";
    
    var require = function (file) {
        return __require(file, "/node_modules/dnode-protocol");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/node_modules/dnode-protocol");
    };
    
    require.modules = __require.modules;
    __require.modules["/node_modules/dnode-protocol/index.js"]._cached = module.exports;
    
    (function () {
        var Traverse = require('traverse');
var EventEmitter = require('events').EventEmitter;
var stream = process.title === 'browser' ? {} : require('stream');

var exports = module.exports = function (wrapper) {
    var self = {};
    
    self.sessions = {};
    
    self.create = function () {
        var id = null;
        do {
            id = Math.floor(
                Math.random() * Math.pow(2,32)
            ).toString(16);
        } while (self.sessions[id]);
        
        var s = Session(id, wrapper);
        self.sessions[id] = s;
        return s;
    };
    
    self.destroy = function (id) {
        delete self.sessions[id];
    };
    
    return self;
};

var Session = exports.Session = function (id, wrapper) {
    var self = new EventEmitter;
    
    self.id = id;
    self.remote = {};
    
    var instance = self.instance =
        typeof(wrapper) == 'function'
            ? new wrapper(self.remote, self)
            : wrapper || {}
    ;
    
    self.localStore = new Store;
    self.remoteStore = new Store;
    
    self.localStore.on('cull', function (id) {
        self.emit('request', {
            method : 'cull',
            arguments : [id],
            callbacks : {}
        });
    });
    
    var scrubber = new Scrubber(self.localStore);
    
    self.start = function () {
        self.request('methods', [ instance ]);
    };
    
    self.request = function (method, args) {
        var scrub = scrubber.scrub(args);
        
        self.emit('request', {
            method : method,
            arguments : scrub.arguments,
            callbacks : scrub.callbacks,
            links : scrub.links
        });
    };
    
    self.parse = function (line) {
        var msg = null;
        try { msg = JSON.parse(line) }
        catch (err) {
            self.emit('error', new SyntaxError(
                'Error parsing JSON message: ' + JSON.stringify(line))
            );
            return;
        }
        
        try { self.handle(msg) }
        catch (err) { self.emit('error', err) }
    };
    
    self.handle = function (req) {
        var args = scrubber.unscrub(req, function (id) {
            if (!self.remoteStore.has(id)) {
                // create a new function only if one hasn't already been created
                // for a particular id
                self.remoteStore.add(function () {
                    self.request(id, [].slice.apply(arguments));
                }, id);
            }
            return self.remoteStore.get(id);
        });
        
        if (req.method === 'methods') {
            handleMethods(args[0]);
        }
        else if (req.method === 'error') {
            var methods = args[0];
            self.emit('remoteError', methods);
        }
        else if (req.method === 'cull') {
            args.forEach(function (id) {
                self.remoteStore.cull(args);
            });
        }
        else if (typeof req.method === 'string') {
            if (self.instance.propertyIsEnumerable(req.method)) {
                apply(self.instance[req.method], self.instance, args);
            }
            else {
                self.emit('error', new Error(
                    'Request for non-enumerable method: ' + req.method
                ));
            }
        }
        else if (typeof req.method == 'number') {
            apply(self.localStore.get(req.method), self.instance, args);
        }
    }
    
    function handleMethods (methods) {
        if (typeof methods != 'object') {
            methods = {};
        }
        
        // copy since assignment discards the previous refs
        Object.keys(self.remote).forEach(function (key) {
            delete self.remote[key];
        });
        
        Object.keys(methods).forEach(function (key) {
            self.remote[key] = methods[key];
        });
        
        self.emit('remote', self.remote);
        self.emit('ready');
    }
    
    function apply(f, obj, args) {
        try { f.apply(obj, args) }
        catch (err) { self.emit('error', err) }
    }
    
    return self;
};

// scrub callbacks out of requests in order to call them again later
var Scrubber = exports.Scrubber = function (store) {
    var self = {};
    store = store || new Store;
    self.callbacks = store.items;
    
    // Take the functions out and note them for future use
    self.scrub = function (obj) {
        var paths = {};
        var links = [];
        
        var args = Traverse(obj).map(function (node) {
            if (typeof(node) == 'function') {
                var i = store.indexOf(node);
                if (i >= 0 && !(i in paths)) {
                    // Keep previous function IDs only for the first function
                    // found. This is somewhat suboptimal but the alternatives
                    // are worse.
                    paths[i] = this.path;
                }
                else {
                    var id = store.add(node);
                    paths[id] = this.path;
                }
                
                this.update('[Function]');
            }
            else if (this.circular) {
                links.push({ from : this.circular.path, to : this.path });
                this.update('[Circular]');
            }
        });
        
        return {
            arguments : args,
            callbacks : paths,
            links : links
        };
    };
    
    // Replace callbacks. The supplied function should take a callback id and
    // return a callback of its own.
    self.unscrub = function (msg, f) {
        var args = msg.arguments || [];
        Object.keys(msg.callbacks || {}).forEach(function (strId) {
            var id = parseInt(strId,10);
            var path = msg.callbacks[id];
            args = setAt(args, path, f(id));
        });
        
        (msg.links || []).forEach(function (link) {
            var value = getAt(args, link.from);
            args = setAt(args, link.to, value);
        });
        
        return args;
    };
    
    function setAt (ref, path, value) {
        var node = ref;
        for (var i = 0; i < path.length - 1; i++) {
            var key = path[i];
            if (Object.propertyIsEnumerable.call(node, key)) {
                node = node[key];
            }
            else return undefined;
        };
        var last = path.slice(-1)[0];
        if (last === undefined) {
            return value;
        }
        else {
            node[last] = value;
            return ref;
        }
    }
    
    function getAt (node, path) {
        for (var i = 0; i < path.length; i++) {
            var key = path[i];
            if (Object.propertyIsEnumerable.call(node, key)) {
                node = node[key];
            }
            else return undefined;
        }
        return node;
    }
    
    return self;
}

var Store = exports.Store = function() {
    var self = new EventEmitter;
    var items = self.items = [];
    
    self.has = function (id) {
        return items[id] != undefined;
    };
    
    self.get = function (id) {
        if (!self.has(id)) return null;
        return wrap(items[id]);
    };
    
    self.add = function (fn, id) {
        if (id == undefined) id = items.length;
        items[id] = fn;
        return id;
    };
    
    self.cull = function (arg) {
        if (typeof arg == 'function') {
            arg = items.indexOf(arg);
        }
        delete items[arg];
        return arg;
    };
    
    self.indexOf = function (fn) {
        return items.indexOf(fn);
    };
    
    function wrap (fn) {
        return function() {
            fn.apply(this, arguments);
            autoCull(fn);
        };
    }
    
    function autoCull (fn) {
        if (typeof fn.times == 'number') {
            fn.times--;
            if (fn.times == 0) {
                var id = self.cull(fn);
                self.emit('cull', id);
            }
        }
    }
    
    return self;
};

var parseArgs = exports.parseArgs = function (argv) {
    var params = {};
    
    [].slice.call(argv).forEach(function (arg) {
        if (typeof arg === 'string') {
            if (arg.match(/^\d+$/)) {
                params.port = parseInt(arg, 10);
            }
            else if (arg.match('^/')) {
                params.path = arg;
            }
            else {
                params.host = arg;
            }
        }
        else if (typeof arg === 'number') {
            params.port = arg;
        }
        else if (typeof arg === 'function') {
            params.block = arg;
        }
        else if (typeof arg === 'object') {
            if (arg.__proto__ === Object.prototype) {
                // merge vanilla objects into params
                Object.keys(arg).forEach(function (key) {
                    params[key] = arg[key];
                });
            }
            else if (stream.Stream && arg instanceof stream.Stream) {
                params.stream = arg;
            }
            else {
                // and non-Stream, non-vanilla objects are probably servers
                params.server = arg;
            }
        }
        else if (typeof arg === 'undefined') {
            // ignore
        }
        else {
            throw new Error('Not sure what to do about '
                + typeof arg + ' objects');
        }
    });
    
    return params;
};
;
    }).call(module.exports);
    
    __require.modules["/node_modules/dnode-protocol/index.js"]._cached = module.exports;
    return module.exports;
};

require.modules["/node_modules/traverse/package.json"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/node_modules/traverse";
    var __filename = "/node_modules/traverse/package.json";
    
    var require = function (file) {
        return __require(file, "/node_modules/traverse");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/node_modules/traverse");
    };
    
    require.modules = __require.modules;
    __require.modules["/node_modules/traverse/package.json"]._cached = module.exports;
    
    (function () {
        module.exports = {"name":"traverse","version":"0.5.1","description":"Traverse and transform objects by visiting every node on a recursive walk","author":"James Halliday","license":"MIT/X11","main":"./index","repository":{"type":"git","url":"http://github.com/substack/js-traverse.git"},"devDependencies":{"expresso":"0.7.x"},"scripts":{"test":"expresso"}};
    }).call(module.exports);
    
    __require.modules["/node_modules/traverse/package.json"]._cached = module.exports;
    return module.exports;
};

require.modules["/node_modules/traverse/index.js"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/node_modules/traverse";
    var __filename = "/node_modules/traverse/index.js";
    
    var require = function (file) {
        return __require(file, "/node_modules/traverse");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, "/node_modules/traverse");
    };
    
    require.modules = __require.modules;
    __require.modules["/node_modules/traverse/index.js"]._cached = module.exports;
    
    (function () {
        module.exports = Traverse;
function Traverse (obj) {
    if (!(this instanceof Traverse)) return new Traverse(obj);
    this.value = obj;
}

Traverse.prototype.get = function (ps) {
    var node = this.value;
    for (var i = 0; i < ps.length; i ++) {
        var key = ps[i];
        if (!Object.hasOwnProperty.call(node, key)) {
            node = undefined;
            break;
        }
        node = node[key];
    }
    return node;
};

Traverse.prototype.set = function (ps, value) {
    var node = this.value;
    for (var i = 0; i < ps.length - 1; i ++) {
        var key = ps[i];
        if (!Object.hasOwnProperty.call(node, key)) node[key] = {};
        node = node[key];
    }
    node[ps[i]] = value;
    return value;
};

Traverse.prototype.map = function (cb) {
    return walk(this.value, cb, true);
};

Traverse.prototype.forEach = function (cb) {
    this.value = walk(this.value, cb, false);
    return this.value;
};

Traverse.prototype.reduce = function (cb, init) {
    var skip = arguments.length === 1;
    var acc = skip ? this.value : init;
    this.forEach(function (x) {
        if (!this.isRoot || !skip) {
            acc = cb.call(this, acc, x);
        }
    });
    return acc;
};

Traverse.prototype.paths = function () {
    var acc = [];
    this.forEach(function (x) {
        acc.push(this.path); 
    });
    return acc;
};

Traverse.prototype.nodes = function () {
    var acc = [];
    this.forEach(function (x) {
        acc.push(this.node);
    });
    return acc;
};

Traverse.prototype.clone = function () {
    var parents = [], nodes = [];
    
    return (function clone (src) {
        for (var i = 0; i < parents.length; i++) {
            if (parents[i] === src) {
                return nodes[i];
            }
        }
        
        if (typeof src === 'object' && src !== null) {
            var dst = copy(src);
            
            parents.push(src);
            nodes.push(dst);
            
            forEach(Object_keys(src), function (key) {
                dst[key] = clone(src[key]);
            });
            
            parents.pop();
            nodes.pop();
            return dst;
        }
        else {
            return src;
        }
    })(this.value);
};

function walk (root, cb, immutable) {
    var path = [];
    var parents = [];
    var alive = true;
    
    return (function walker (node_) {
        var node = immutable ? copy(node_) : node_;
        var modifiers = {};
        
        var keepGoing = true;
        
        var state = {
            node : node,
            node_ : node_,
            path : [].concat(path),
            parent : parents[parents.length - 1],
            parents : parents,
            key : path.slice(-1)[0],
            isRoot : path.length === 0,
            level : path.length,
            circular : null,
            update : function (x, stopHere) {
                if (!state.isRoot) {
                    state.parent.node[state.key] = x;
                }
                state.node = x;
                if (stopHere) keepGoing = false;
            },
            'delete' : function () {
                delete state.parent.node[state.key];
            },
            remove : function () {
                if (Array_isArray(state.parent.node)) {
                    state.parent.node.splice(state.key, 1);
                }
                else {
                    delete state.parent.node[state.key];
                }
            },
            keys : null,
            before : function (f) { modifiers.before = f },
            after : function (f) { modifiers.after = f },
            pre : function (f) { modifiers.pre = f },
            post : function (f) { modifiers.post = f },
            stop : function () { alive = false },
            block : function () { keepGoing = false }
        };
        
        if (!alive) return state;
        
        if (typeof node === 'object' && node !== null) {
            state.keys = Object_keys(node);
            
            state.isLeaf = state.keys.length == 0;
            
            for (var i = 0; i < parents.length; i++) {
                if (parents[i].node_ === node_) {
                    state.circular = parents[i];
                    break;
                }
            }
        }
        else {
            state.isLeaf = true;
        }
        
        state.notLeaf = !state.isLeaf;
        state.notRoot = !state.isRoot;
        
        // use return values to update if defined
        var ret = cb.call(state, state.node);
        if (ret !== undefined && state.update) state.update(ret);
        
        if (modifiers.before) modifiers.before.call(state, state.node);
        
        if (!keepGoing) return state;
        
        if (typeof state.node == 'object'
        && state.node !== null && !state.circular) {
            parents.push(state);
            
            forEach(state.keys, function (key, i) {
                path.push(key);
                
                if (modifiers.pre) modifiers.pre.call(state, state.node[key], key);
                
                var child = walker(state.node[key]);
                if (immutable && Object.hasOwnProperty.call(state.node, key)) {
                    state.node[key] = child.node;
                }
                
                child.isLast = i == state.keys.length - 1;
                child.isFirst = i == 0;
                
                if (modifiers.post) modifiers.post.call(state, child);
                
                path.pop();
            });
            parents.pop();
        }
        
        if (modifiers.after) modifiers.after.call(state, state.node);
        
        return state;
    })(root).node;
}

function copy (src) {
    if (typeof src === 'object' && src !== null) {
        var dst;
        
        if (Array_isArray(src)) {
            dst = [];
        }
        else if (src instanceof Date) {
            dst = new Date(src);
        }
        else if (src instanceof Boolean) {
            dst = new Boolean(src);
        }
        else if (src instanceof Number) {
            dst = new Number(src);
        }
        else if (src instanceof String) {
            dst = new String(src);
        }
        else if (Object.create && Object.getPrototypeOf) {
            dst = Object.create(Object.getPrototypeOf(src));
        }
        else if (src.__proto__ || src.constructor.prototype) {
            var proto = src.__proto__ || src.constructor.prototype || {};
            var T = function () {};
            T.prototype = proto;
            dst = new T;
            if (!dst.__proto__) dst.__proto__ = proto;
        }
        
        forEach(Object_keys(src), function (key) {
            dst[key] = src[key];
        });
        return dst;
    }
    else return src;
}

var Object_keys = Object.keys || function keys (obj) {
    var res = [];
    for (var key in obj) res.push(key)
    return res;
};

var Array_isArray = Array.isArray || function isArray (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

forEach(Object_keys(Traverse.prototype), function (key) {
    Traverse[key] = function (obj) {
        var args = [].slice.call(arguments, 1);
        var t = Traverse(obj);
        return t[key].apply(t, args);
    };
});
;
    }).call(module.exports);
    
    __require.modules["/node_modules/traverse/index.js"]._cached = module.exports;
    return module.exports;
};

require.modules["events"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "events";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["events"]._cached = module.exports;
    
    (function () {
        if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};
;
    }).call(module.exports);
    
    __require.modules["events"]._cached = module.exports;
    return module.exports;
};

require.modules["stream"] = function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = ".";
    var __filename = "stream";
    
    var require = function (file) {
        return __require(file, ".");
    };
    
    require.resolve = function (file) {
        return __require.resolve(name, ".");
    };
    
    require.modules = __require.modules;
    __require.modules["stream"]._cached = module.exports;
    
    (function () {
        // todo
;
    }).call(module.exports);
    
    __require.modules["stream"]._cached = module.exports;
    return module.exports;
};

(function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/";
    var __filename = "//Users/samg/Code/phantom";
    
    var require = function (file) {
        return __require(file, "/");
    };
    require.modules = __require.modules;
    
    (function() {
  var controlPage, fnwrap, mkweb, mkwrap, pageWrap, port, proto, s, server, webpage, _phantom;
  var __slice = Array.prototype.slice, __hasProp = Object.prototype.hasOwnProperty;
  mkweb = new Function("exports", "window", phantom.loadModuleSource('webpage'));
  webpage = {};
  mkweb.call({}, webpage, {});
  proto = require('dnode-protocol');
  port = phantom.args[0];
  controlPage = webpage.create();
  fnwrap = function(target) {
    return function() {
      return target.apply(this, arguments);
    };
  };
  mkwrap = function(src, pass, special) {
    var k, obj, _fn, _i, _len;
    if (pass == null) {
      pass = [];
    }
    if (special == null) {
      special = {};
    }
    obj = {
      set: function(key, val, cb) {
        if (cb == null) {
          cb = function() {};
        }
        return cb(src[key] = val);
      },
      get: function(key, cb) {
        return cb(src[key]);
      }
    };
    _fn = function(k) {
      return obj[k] = function() {
        var arg, args, i, _len2;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        for (i = 0, _len2 = args.length; i < _len2; i++) {
          arg = args[i];
          if (typeof arg === 'function') {
            args[i] = fnwrap(arg);
          }
        }
        return src[k].apply(src, args);
      };
    };
    for (_i = 0, _len = pass.length; _i < _len; _i++) {
      k = pass[_i];
      _fn(k);
    }
    for (k in special) {
      if (!__hasProp.call(special, k)) continue;
      obj[k] = special[k];
    }
    return obj;
  };
  pageWrap = function(page) {
    return mkwrap(page, ['open', 'includeJs', 'injectJs', 'render', 'sendEvent'], {
      evaluate: function(fn, cb) {
        if (cb == null) {
          cb = function() {};
        }
        return cb(page.evaluate(fn));
      }
    });
  };
  _phantom = mkwrap(phantom, ['exit', 'injectJS'], {
    createPage: function(cb) {
      return cb(pageWrap(webpage.create()));
    }
  });
  server = proto(_phantom);
  s = server.create();
  s.on('request', function(req) {
    var evil;
    evil = "function(){socket.send(" + (JSON.stringify(JSON.stringify(req))) + " + '\\n');}";
    return controlPage.evaluate(evil);
  });
  controlPage.onAlert = function(msg) {
    if (msg.slice(0, 6) !== "PCTRL ") {
      return;
    }
    return s.parse(msg.slice(6));
  };
  controlPage.onConsoleMessage = function() {
    var msg;
    msg = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return console.log.apply(console, msg);
  };
  controlPage.open("http://127.0.0.1:" + port + "/", function(status) {
    return s.start();
  });
}).call(this);
;
})();
