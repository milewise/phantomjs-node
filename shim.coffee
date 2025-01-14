
# Require gets overwritten by browserify, so we have to reimplement it from scratch - boo :(
mkweb = new Function "exports", "window", phantom.loadModuleSource('webpage')
webpage = {}
mkweb.call {}, webpage, {} 

proto = require 'dnode-protocol'

[port] = phantom.args

controlPage = webpage.create()

fnwrap = (target) -> -> target.apply this, arguments

mkwrap = (src, pass=[], special={}) ->
  obj =
    set: (key, val, cb=->) -> cb src[key] = val   
    get: (key, cb) -> cb src[key]

  for k in pass
    do (k) ->
      obj[k] = (args...) ->

        # This idempotent tomfoolery is required to stop PhantomJS from segfaulting
        args[i] = fnwrap arg for arg, i in args when typeof arg is 'function'
          
        src[k] args...

  for own k of special
    obj[k] = special[k]
  obj

pageWrap = (page) -> mkwrap page,
 ['open','includeJs','injectJs','render','sendEvent']
 evaluate: (fn, cb=->) -> cb page.evaluate fn

_phantom = mkwrap phantom,
  ['exit', 'injectJS'],
  createPage: (cb) -> cb pageWrap webpage.create()


server = proto _phantom
s = server.create()


s.on 'request', (req) ->
  #console.log "phantom sending request #{JSON.stringify req}"
  evil = "function(){socket.send(#{JSON.stringify JSON.stringify req} + '\\n');}"
  controlPage.evaluate evil

controlPage.onAlert = (msg) ->
  return unless msg[0..5] is "PCTRL "
  #console.log "phantom got request " + msg[6..]
  s.parse msg[6..]


controlPage.onConsoleMessage = (msg...) -> console.log msg...

controlPage.open "http://127.0.0.1:#{port}/", (status) ->
  #console.log 'Control page title is ' + controlPage.evaluate -> document.title
  s.start()

