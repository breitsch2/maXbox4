﻿var pas = { $libimports: {}};

var rtl = {

  version: 20200,

  quiet: false,
  debug_load_units: false,
  debug_rtti: false,

  $res : {},

  debug: function(){
    if (rtl.quiet || !console || !console.log) return;
    console.log(arguments);
  },

  error: function(s){
    rtl.debug('Error: ',s);
    throw s;
  },

  warn: function(s){
    rtl.debug('Warn: ',s);
  },

  checkVersion: function(v){
    if (rtl.version != v) throw "expected rtl version "+v+", but found "+rtl.version;
  },

  hiInt: Math.pow(2,53),

  hasString: function(s){
    return rtl.isString(s) && (s.length>0);
  },

  isArray: function(a) {
    return Array.isArray(a);
  },

  isFunction: function(f){
    return typeof(f)==="function";
  },

  isModule: function(m){
    return rtl.isObject(m) && rtl.hasString(m.$name) && (pas[m.$name]===m);
  },

  isImplementation: function(m){
    return rtl.isObject(m) && rtl.isModule(m.$module) && (m.$module.$impl===m);
  },

  isNumber: function(n){
    return typeof(n)==="number";
  },

  isObject: function(o){
    var s=typeof(o);
    return (typeof(o)==="object") && (o!=null);
  },

  isString: function(s){
    return typeof(s)==="string";
  },

  getNumber: function(n){
    return typeof(n)==="number"?n:NaN;
  },

  getChar: function(c){
    return ((typeof(c)==="string") && (c.length===1)) ? c : "";
  },

  getObject: function(o){
    return ((typeof(o)==="object") || (typeof(o)==='function')) ? o : null;
  },

  isTRecord: function(type){
    return (rtl.isObject(type) && type.hasOwnProperty('$new') && (typeof(type.$new)==='function'));
  },

  isPasClass: function(type){
    return (rtl.isObject(type) && type.hasOwnProperty('$classname') && rtl.isObject(type.$module));
  },

  isPasClassInstance: function(type){
    return (rtl.isObject(type) && rtl.isPasClass(type.$class));
  },

  hexStr: function(n,digits){
    return ("000000000000000"+n.toString(16).toUpperCase()).slice(-digits);
  },

  m_loading: 0,
  m_loading_intf: 1,
  m_intf_loaded: 2,
  m_loading_impl: 3, // loading all used unit
  m_initializing: 4, // running initialization
  m_initialized: 5,

  module: function(module_name, intfuseslist, intfcode, impluseslist){
    if (rtl.debug_load_units) rtl.debug('rtl.module name="'+module_name+'" intfuses='+intfuseslist+' impluses='+impluseslist);
    if (!rtl.hasString(module_name)) rtl.error('invalid module name "'+module_name+'"');
    if (!rtl.isArray(intfuseslist)) rtl.error('invalid interface useslist of "'+module_name+'"');
    if (!rtl.isFunction(intfcode)) rtl.error('invalid interface code of "'+module_name+'"');
    if (!(impluseslist==undefined) && !rtl.isArray(impluseslist)) rtl.error('invalid implementation useslist of "'+module_name+'"');

    if (pas[module_name])
      rtl.error('module "'+module_name+'" is already registered');

    var r = Object.create(rtl.tSectionRTTI);
    var module = r.$module = pas[module_name] = {
      $name: module_name,
      $intfuseslist: intfuseslist,
      $impluseslist: impluseslist,
      $state: rtl.m_loading,
      $intfcode: intfcode,
      $implcode: null,
      $impl: null,
      $rtti: r
    };
    if (impluseslist) module.$impl = {
          $module: module,
          $rtti: r
        };
  },

  exitcode: 0,

  run: function(module_name){
    try {
      if (!rtl.hasString(module_name)) module_name='program';
      if (rtl.debug_load_units) rtl.debug('rtl.run module="'+module_name+'"');
      rtl.initRTTI();
      var module = pas[module_name];
      if (!module) rtl.error('rtl.run module "'+module_name+'" missing');
      rtl.loadintf(module);
      rtl.loadimpl(module);
      if ((module_name=='program') || (module_name=='library')){
        if (rtl.debug_load_units) rtl.debug('running $main');
        var r = pas[module_name].$main();
        if (rtl.isNumber(r)) rtl.exitcode = r;
      }
    } catch(re) {
      if (!rtl.showUncaughtExceptions) {
        throw re
      } else {  
        if (!rtl.handleUncaughtException(re)) {
          rtl.showException(re);
          rtl.exitcode = 216;
        }  
      }
    } 
    return rtl.exitcode;
  },
  
  showException : function (re) {
    var errMsg = rtl.hasString(re.$classname) ? re.$classname : '';
    errMsg +=  ((errMsg) ? ': ' : '') + (re.hasOwnProperty('fMessage') ? re.fMessage : re);
    alert('Uncaught Exception : '+errMsg);
  },

  handleUncaughtException: function (e) {
    if (rtl.onUncaughtException) {
      try {
        rtl.onUncaughtException(e);
        return true;
      } catch (ee) {
        return false; 
      }
    } else {
      return false;
    }
  },

  loadintf: function(module){
    if (module.$state>rtl.m_loading_intf) return; // already finished
    if (rtl.debug_load_units) rtl.debug('loadintf: "'+module.$name+'"');
    if (module.$state===rtl.m_loading_intf)
      rtl.error('unit cycle detected "'+module.$name+'"');
    module.$state=rtl.m_loading_intf;
    // load interfaces of interface useslist
    rtl.loaduseslist(module,module.$intfuseslist,rtl.loadintf);
    // run interface
    if (rtl.debug_load_units) rtl.debug('loadintf: run intf of "'+module.$name+'"');
    module.$intfcode(module.$intfuseslist);
    // success
    module.$state=rtl.m_intf_loaded;
    // Note: units only used in implementations are not yet loaded (not even their interfaces)
  },

  loaduseslist: function(module,useslist,f){
    if (useslist==undefined) return;
    var len = useslist.length;
    for (var i = 0; i<len; i++) {
      var unitname=useslist[i];
      if (rtl.debug_load_units) rtl.debug('loaduseslist of "'+module.$name+'" uses="'+unitname+'"');
      if (pas[unitname]==undefined)
        rtl.error('module "'+module.$name+'" misses "'+unitname+'"');
      f(pas[unitname]);
    }
  },

  loadimpl: function(module){
    if (module.$state>=rtl.m_loading_impl) return; // already processing
    if (module.$state<rtl.m_intf_loaded) rtl.error('loadimpl: interface not loaded of "'+module.$name+'"');
    if (rtl.debug_load_units) rtl.debug('loadimpl: load uses of "'+module.$name+'"');
    module.$state=rtl.m_loading_impl;
    // load interfaces of implementation useslist
    rtl.loaduseslist(module,module.$impluseslist,rtl.loadintf);
    // load implementation of interfaces useslist
    rtl.loaduseslist(module,module.$intfuseslist,rtl.loadimpl);
    // load implementation of implementation useslist
    rtl.loaduseslist(module,module.$impluseslist,rtl.loadimpl);
    // Note: At this point all interfaces used by this unit are loaded. If
    //   there are implementation uses cycles some used units might not yet be
    //   initialized. This is by design.
    // run implementation
    if (rtl.debug_load_units) rtl.debug('loadimpl: run impl of "'+module.$name+'"');
    if (rtl.isFunction(module.$implcode)) module.$implcode(module.$impluseslist);
    // run initialization
    if (rtl.debug_load_units) rtl.debug('loadimpl: run init of "'+module.$name+'"');
    module.$state=rtl.m_initializing;
    if (rtl.isFunction(module.$init)) module.$init();
    // unit initialized
    module.$state=rtl.m_initialized;
  },

  createCallback: function(scope, fn){
    var cb;
    if (typeof(fn)==='string'){
      if (!scope.hasOwnProperty('$events')) scope.$events = {};
      cb = scope.$events[fn];
      if (cb) return cb;
      scope.$events[fn] = cb = function(){
        return scope[fn].apply(scope,arguments);
      };
    } else {
      cb = function(){
        return fn.apply(scope,arguments);
      };
    };
    cb.scope = scope;
    cb.fn = fn;
    return cb;
  },

  createSafeCallback: function(scope, fn){
    var cb;
    if (typeof(fn)==='string'){
      if (!scope.hasOwnProperty('$events')) scope.$events = {};
      cb = scope.$events[fn];
      if (cb) return cb;
      scope.$events[fn] = cb = function(){
        try{
          return scope[fn].apply(scope,arguments);
        } catch (err) {
          if (!rtl.handleUncaughtException(err)) throw err;
        }
      };
    } else {
      cb = function(){
        try{
          return fn.apply(scope,arguments);
        } catch (err) {
          if (!rtl.handleUncaughtException(err)) throw err;
        }
      };
    };
    cb.scope = scope;
    cb.fn = fn;
    return cb;
  },

  eqCallback: function(a,b){
    // can be a function or a function wrapper
    if (a===b){
      return true;
    } else {
      return (a!=null) && (b!=null) && (a.fn) && (a.scope===b.scope) && (a.fn===b.fn);
    }
  },

  initStruct: function(c,parent,name){
    if ((parent.$module) && (parent.$module.$impl===parent)) parent=parent.$module;
    c.$parent = parent;
    if (rtl.isModule(parent)){
      c.$module = parent;
      c.$name = name;
    } else {
      c.$module = parent.$module;
      c.$name = parent.$name+'.'+name;
    };
    return parent;
  },

  initClass: function(c,parent,name,initfn,rttiname){
    parent[name] = c;
    c.$class = c; // Note: o.$class === Object.getPrototypeOf(o)
    c.$classname = rttiname?rttiname:name;
    parent = rtl.initStruct(c,parent,name);
    c.$fullname = parent.$name+'.'+name;
    // rtti
    if (rtl.debug_rtti) rtl.debug('initClass '+c.$fullname);
    var t = c.$module.$rtti.$Class(c.$classname,{ "class": c });
    c.$rtti = t;
    if (rtl.isObject(c.$ancestor)) t.ancestor = c.$ancestor.$rtti;
    if (!t.ancestor) t.ancestor = null;
    // init members
    initfn.call(c);
  },

  createClass: function(parent,name,ancestor,initfn,rttiname){
    // create a normal class,
    // ancestor must be null or a normal class,
    // the root ancestor can be an external class
    var c = null;
    if (ancestor != null){
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
      // Note:
      // if root is an "object" then c.$ancestor === Object.getPrototypeOf(c)
      // if root is a "function" then c.$ancestor === c.__proto__, Object.getPrototypeOf(c) returns the root
    } else {
      c = { $ancestor: null };
      c.$create = function(fn,args){
        if (args == undefined) args = [];
        var o = Object.create(this);
        o.$init();
        try{
          if (typeof(fn)==="string"){
            o[fn].apply(o,args);
          } else {
            fn.apply(o,args);
          };
          o.AfterConstruction();
        } catch($e){
          // do not call BeforeDestruction
          if (o.Destroy) o.Destroy();
          o.$final();
          throw $e;
        }
        return o;
      };
      c.$destroy = function(fnname){
        this.BeforeDestruction();
        if (this[fnname]) this[fnname]();
        this.$final();
      };
    };
    rtl.initClass(c,parent,name,initfn,rttiname);
  },

  createClassExt: function(parent,name,ancestor,newinstancefnname,initfn,rttiname){
    // Create a class using an external ancestor.
    // If newinstancefnname is given, use that function to create the new object.
    // If exist call BeforeDestruction and AfterConstruction.
    var isFunc = rtl.isFunction(ancestor);
    var c = null;
    if (isFunc){
      // create pascal class descendent from JS function
      c = Object.create(ancestor.prototype);
      c.$ancestorfunc = ancestor;
      c.$ancestor = null; // no pascal ancestor
    } else if (ancestor.$func){
      // create pascal class descendent from a pascal class descendent of a JS function
      isFunc = true;
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
    } else {
      c = Object.create(ancestor);
      c.$ancestor = null; // no pascal ancestor
    }
    c.$create = function(fn,args){
      if (args == undefined) args = [];
      var o = null;
      if (newinstancefnname.length>0){
        o = this[newinstancefnname](fn,args);
      } else if(isFunc) {
        o = new this.$func(args);
      } else {
        o = Object.create(c);
      }
      if (o.$init) o.$init();
      try{
        if (typeof(fn)==="string"){
          this[fn].apply(o,args);
        } else {
          fn.apply(o,args);
        };
        if (o.AfterConstruction) o.AfterConstruction();
      } catch($e){
        // do not call BeforeDestruction
        if (o.Destroy) o.Destroy();
        if (o.$final) o.$final();
        throw $e;
      }
      return o;
    };
    c.$destroy = function(fnname){
      if (this.BeforeDestruction) this.BeforeDestruction();
      if (this[fnname]) this[fnname]();
      if (this.$final) this.$final();
    };
    rtl.initClass(c,parent,name,initfn,rttiname);
    if (isFunc){
      function f(){}
      f.prototype = c;
      c.$func = f;
    }
  },

  createHelper: function(parent,name,ancestor,initfn,rttiname){
    // create a helper,
    // ancestor must be null or a helper,
    var c = null;
    if (ancestor != null){
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
      // c.$ancestor === Object.getPrototypeOf(c)
    } else {
      c = { $ancestor: null };
    };
    parent[name] = c;
    c.$class = c; // Note: o.$class === Object.getPrototypeOf(o)
    c.$classname = rttiname?rttiname:name;
    parent = rtl.initStruct(c,parent,name);
    c.$fullname = parent.$name+'.'+name;
    // rtti
    var t = c.$module.$rtti.$Helper(c.$classname,{ "helper": c });
    c.$rtti = t;
    if (rtl.isObject(ancestor)) t.ancestor = ancestor.$rtti;
    if (!t.ancestor) t.ancestor = null;
    // init members
    initfn.call(c);
  },

  tObjectDestroy: "Destroy",

  free: function(obj,name){
    if (obj[name]==null) return null;
    obj[name].$destroy(rtl.tObjectDestroy);
    obj[name]=null;
  },

  freeLoc: function(obj){
    if (obj==null) return null;
    obj.$destroy(rtl.tObjectDestroy);
    return null;
  },

  hideProp: function(o,p,v){
    Object.defineProperty(o,p, {
      enumerable: false,
      configurable: true,
      writable: true
    });
    if(arguments.length>2){ o[p]=v; }
  },

  recNewT: function(parent,name,initfn,full){
    // create new record type
    var t = {};
    if (parent) parent[name] = t;
    var h = rtl.hideProp;
    if (full){
      rtl.initStruct(t,parent,name);
      t.$record = t;
      h(t,'$record');
      h(t,'$name');
      h(t,'$parent');
      h(t,'$module');
      h(t,'$initSpec');
    }
    initfn.call(t);
    if (!t.$new){
      t.$new = function(){ return Object.create(t); };
    }
    t.$clone = function(r){ return t.$new().$assign(r); };
    h(t,'$new');
    h(t,'$clone');
    h(t,'$eq');
    h(t,'$assign');
    return t;
  },

  is: function(instance,type){
    return type.isPrototypeOf(instance) || (instance===type);
  },

  isExt: function(instance,type,mode){
    // mode===1 means instance must be a Pascal class instance
    // mode===2 means instance must be a Pascal class
    // Notes:
    // isPrototypeOf and instanceof return false on equal
    // isPrototypeOf does not work for Date.isPrototypeOf(new Date())
    //   so if isPrototypeOf is false test with instanceof
    // instanceof needs a function on right side
    if (instance == null) return false; // Note: ==null checks for undefined too
    if ((typeof(type) !== 'object') && (typeof(type) !== 'function')) return false;
    if (instance === type){
      if (mode===1) return false;
      if (mode===2) return rtl.isPasClass(instance);
      return true;
    }
    if (type.isPrototypeOf && type.isPrototypeOf(instance)){
      if (mode===1) return rtl.isPasClassInstance(instance);
      if (mode===2) return rtl.isPasClass(instance);
      return true;
    }
    if ((typeof type == 'function') && (instance instanceof type)) return true;
    return false;
  },

  Exception: null,
  EInvalidCast: null,
  EAbstractError: null,
  ERangeError: null,
  EIntOverflow: null,
  EPropWriteOnly: null,

  raiseE: function(typename){
    var t = rtl[typename];
    if (t==null){
      var mod = pas.SysUtils;
      if (!mod) mod = pas.sysutils;
      if (mod){
        t = mod[typename];
        if (!t) t = mod[typename.toLowerCase()];
        if (!t) t = mod['Exception'];
        if (!t) t = mod['exception'];
      }
    }
    if (t){
      if (t.Create){
        throw t.$create("Create");
      } else if (t.create){
        throw t.$create("create");
      }
    }
    if (typename === "EInvalidCast") throw "invalid type cast";
    if (typename === "EAbstractError") throw "Abstract method called";
    if (typename === "ERangeError") throw "range error";
    throw typename;
  },

  as: function(instance,type){
    if((instance === null) || rtl.is(instance,type)) return instance;
    rtl.raiseE("EInvalidCast");
  },

  asExt: function(instance,type,mode){
    if((instance === null) || rtl.isExt(instance,type,mode)) return instance;
    rtl.raiseE("EInvalidCast");
  },

  createInterface: function(module, name, guid, fnnames, ancestor, initfn){
    //console.log('createInterface name="'+name+'" guid="'+guid+'" names='+fnnames);
    var i = ancestor?Object.create(ancestor):{};
    module[name] = i;
    i.$module = module;
    i.$name = name;
    i.$fullname = module.$name+'.'+name;
    i.$guid = guid;
    i.$guidr = null;
    i.$names = fnnames?fnnames:[];
    if (rtl.isFunction(initfn)){
      // rtti
      if (rtl.debug_rtti) rtl.debug('createInterface '+i.$fullname);
      var t = i.$module.$rtti.$Interface(name,{ "interface": i, module: module });
      i.$rtti = t;
      if (ancestor) t.ancestor = ancestor.$rtti;
      if (!t.ancestor) t.ancestor = null;
      initfn.call(i);
    }
    return i;
  },

  strToGUIDR: function(s,g){
    var p = 0;
    function n(l){
      var h = s.substr(p,l);
      p+=l;
      return parseInt(h,16);
    }
    p+=1; // skip {
    g.D1 = n(8);
    p+=1; // skip -
    g.D2 = n(4);
    p+=1; // skip -
    g.D3 = n(4);
    p+=1; // skip -
    if (!g.D4) g.D4=[];
    g.D4[0] = n(2);
    g.D4[1] = n(2);
    p+=1; // skip -
    for(var i=2; i<8; i++) g.D4[i] = n(2);
    return g;
  },

  guidrToStr: function(g){
    if (g.$intf) return g.$intf.$guid;
    var h = rtl.hexStr;
    var s='{'+h(g.D1,8)+'-'+h(g.D2,4)+'-'+h(g.D3,4)+'-'+h(g.D4[0],2)+h(g.D4[1],2)+'-';
    for (var i=2; i<8; i++) s+=h(g.D4[i],2);
    s+='}';
    return s;
  },

  createTGUID: function(guid){
    var TGuid = (pas.System)?pas.System.TGuid:pas.system.tguid;
    var g = rtl.strToGUIDR(guid,TGuid.$new());
    return g;
  },

  getIntfGUIDR: function(intfTypeOrVar){
    if (!intfTypeOrVar) return null;
    if (!intfTypeOrVar.$guidr){
      var g = rtl.createTGUID(intfTypeOrVar.$guid);
      if (!intfTypeOrVar.hasOwnProperty('$guid')) intfTypeOrVar = Object.getPrototypeOf(intfTypeOrVar);
      g.$intf = intfTypeOrVar;
      intfTypeOrVar.$guidr = g;
    }
    return intfTypeOrVar.$guidr;
  },

  addIntf: function (aclass, intf, map){
    function jmp(fn){
      if (typeof(fn)==="function"){
        return function(){ return fn.apply(this.$o,arguments); };
      } else {
        return function(){ rtl.raiseE('EAbstractError'); };
      }
    }
    if(!map) map = {};
    var t = intf;
    var item = Object.create(t);
    if (!aclass.hasOwnProperty('$intfmaps')) aclass.$intfmaps = {};
    aclass.$intfmaps[intf.$guid] = item;
    do{
      var names = t.$names;
      if (!names) break;
      for (var i=0; i<names.length; i++){
        var intfname = names[i];
        var fnname = map[intfname];
        if (!fnname) fnname = intfname;
        //console.log('addIntf: intftype='+t.$name+' index='+i+' intfname="'+intfname+'" fnname="'+fnname+'" old='+typeof(item[intfname]));
        item[intfname] = jmp(aclass[fnname]);
      }
      t = Object.getPrototypeOf(t);
    }while(t!=null);
  },

  getIntfG: function (obj, guid, query){
    if (!obj) return null;
    //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' query='+query);
    // search
    var maps = obj.$intfmaps;
    if (!maps) return null;
    var item = maps[guid];
    if (!item) return null;
    // check delegation
    //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' query='+query+' item='+typeof(item));
    if (typeof item === 'function') return item.call(obj); // delegate. Note: COM contains _AddRef
    // check cache
    var intf = null;
    if (obj.$interfaces){
      intf = obj.$interfaces[guid];
      //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' cache='+typeof(intf));
    }
    if (!intf){ // intf can be undefined!
      intf = Object.create(item);
      intf.$o = obj;
      if (!obj.$interfaces) obj.$interfaces = {};
      obj.$interfaces[guid] = intf;
    }
    if (typeof(query)==='object'){
      // called by queryIntfT
      var o = null;
      if (intf.QueryInterface(rtl.getIntfGUIDR(query),
          {get:function(){ return o; }, set:function(v){ o=v; }}) === 0){
        return o;
      } else {
        return null;
      }
    } else if(query===2){
      // called by TObject.GetInterfaceByStr
      if (intf.$kind === 'com') intf._AddRef();
    }
    return intf;
  },

  getIntfT: function(obj,intftype){
    return rtl.getIntfG(obj,intftype.$guid);
  },

  queryIntfT: function(obj,intftype){
    return rtl.getIntfG(obj,intftype.$guid,intftype);
  },

  queryIntfIsT: function(obj,intftype){
    var i = rtl.getIntfG(obj,intftype.$guid);
    if (!i) return false;
    if (i.$kind === 'com') i._Release();
    return true;
  },

  asIntfT: function (obj,intftype){
    var i = rtl.getIntfG(obj,intftype.$guid);
    if (i!==null) return i;
    rtl.raiseEInvalidCast();
  },

  intfIsIntfT: function(intf,intftype){
    return (intf!==null) && rtl.queryIntfIsT(intf.$o,intftype);
  },

  intfAsIntfT: function (intf,intftype){
    if (!intf) return null;
    var i = rtl.getIntfG(intf.$o,intftype.$guid);
    if (i) return i;
    rtl.raiseEInvalidCast();
  },

  intfIsClass: function(intf,classtype){
    return (intf!=null) && (rtl.is(intf.$o,classtype));
  },

  intfAsClass: function(intf,classtype){
    if (intf==null) return null;
    return rtl.as(intf.$o,classtype);
  },

  intfToClass: function(intf,classtype){
    if ((intf!==null) && rtl.is(intf.$o,classtype)) return intf.$o;
    return null;
  },

  // interface reference counting
  intfRefs: { // base object for temporary interface variables
    ref: function(id,intf){
      // called for temporary interface references needing delayed release
      var old = this[id];
      //console.log('rtl.intfRefs.ref: id='+id+' old="'+(old?old.$name:'null')+'" intf="'+(intf?intf.$name:'null')+' $o='+(intf?intf.$o:'null'));
      if (old){
        // called again, e.g. in a loop
        delete this[id];
        old._Release(); // may fail
      }
      if(intf) {
        this[id]=intf;
      }
      return intf;
    },
    free: function(){
      //console.log('rtl.intfRefs.free...');
      for (var id in this){
        if (this.hasOwnProperty(id)){
          var intf = this[id];
          if (intf){
            //console.log('rtl.intfRefs.free: id='+id+' '+intf.$name+' $o='+intf.$o.$classname);
            intf._Release();
          }
        }
      }
    }
  },

  createIntfRefs: function(){
    //console.log('rtl.createIntfRefs');
    return Object.create(rtl.intfRefs);
  },

  setIntfP: function(path,name,value,skipAddRef){
    var old = path[name];
    //console.log('rtl.setIntfP path='+path+' name='+name+' old="'+(old?old.$name:'null')+'" value="'+(value?value.$name:'null')+'"');
    if (old === value) return;
    if (old !== null){
      path[name]=null;
      old._Release();
    }
    if (value !== null){
      if (!skipAddRef) value._AddRef();
      path[name]=value;
    }
  },

  setIntfL: function(old,value,skipAddRef){
    //console.log('rtl.setIntfL old="'+(old?old.$name:'null')+'" value="'+(value?value.$name:'null')+'"');
    if (old !== value){
      if (value!==null){
        if (!skipAddRef) value._AddRef();
      }
      if (old!==null){
        old._Release();  // Release after AddRef, to avoid double Release if Release creates an exception
      }
    } else if (skipAddRef){
      if (old!==null){
        old._Release();  // value has an AddRef
      }
    }
    return value;
  },

  _AddRef: function(intf){
    //if (intf) console.log('rtl._AddRef intf="'+(intf?intf.$name:'null')+'"');
    if (intf) intf._AddRef();
    return intf;
  },

  _Release: function(intf){
    //if (intf) console.log('rtl._Release intf="'+(intf?intf.$name:'null')+'"');
    if (intf) intf._Release();
    return intf;
  },

  trunc: function(a){
    return a<0 ? Math.ceil(a) : Math.floor(a);
  },

  checkMethodCall: function(obj,type){
    if (rtl.isObject(obj) && rtl.is(obj,type)) return;
    rtl.raiseE("EInvalidCast");
  },

  oc: function(i){
    // overflow check integer
    if ((Math.floor(i)===i) && (i>=-0x1fffffffffffff) && (i<=0x1fffffffffffff)) return i;
    rtl.raiseE('EIntOverflow');
  },

  rc: function(i,minval,maxval){
    // range check integer
    if ((Math.floor(i)===i) && (i>=minval) && (i<=maxval)) return i;
    rtl.raiseE('ERangeError');
  },

  rcc: function(c,minval,maxval){
    // range check char
    if ((typeof(c)==='string') && (c.length===1)){
      var i = c.charCodeAt(0);
      if ((i>=minval) && (i<=maxval)) return c;
    }
    rtl.raiseE('ERangeError');
  },

  rcSetCharAt: function(s,index,c){
    // range check setCharAt
    if ((typeof(s)!=='string') || (index<0) || (index>=s.length)) rtl.raiseE('ERangeError');
    return rtl.setCharAt(s,index,c);
  },

  rcCharAt: function(s,index){
    // range check charAt
    if ((typeof(s)!=='string') || (index<0) || (index>=s.length)) rtl.raiseE('ERangeError');
    return s.charAt(index);
  },

  rcArrR: function(arr,index){
    // range check read array
    if (Array.isArray(arr) && (typeof(index)==='number') && (index>=0) && (index<arr.length)){
      if (arguments.length>2){
        // arr,index1,index2,...
        arr=arr[index];
        for (var i=2; i<arguments.length; i++) arr=rtl.rcArrR(arr,arguments[i]);
        return arr;
      }
      return arr[index];
    }
    rtl.raiseE('ERangeError');
  },

  rcArrW: function(arr,index,value){
    // range check write array
    // arr,index1,index2,...,value
    for (var i=3; i<arguments.length; i++){
      arr=rtl.rcArrR(arr,index);
      index=arguments[i-1];
      value=arguments[i];
    }
    if (Array.isArray(arr) && (typeof(index)==='number') && (index>=0) && (index<arr.length)){
      return arr[index]=value;
    }
    rtl.raiseE('ERangeError');
  },

  length: function(arr){
    return (arr == null) ? 0 : arr.length;
  },

  arrayRef: function(a){
    if (a!=null) rtl.hideProp(a,'$pas2jsrefcnt',1);
    return a;
  },

  arraySetLength: function(arr,defaultvalue,newlength){
    var stack = [];
    var s = 9999;
    for (var i=2; i<arguments.length; i++){
      var j = arguments[i];
      if (j==='s'){ s = i-2; }
      else {
        stack.push({ dim:j+0, a:null, i:0, src:null });
      }
    }
    var dimmax = stack.length-1;
    var depth = 0;
    var lastlen = 0;
    var item = null;
    var a = null;
    var src = arr;
    var srclen = 0, oldlen = 0;
    do{
      if (depth>0){
        item=stack[depth-1];
        src = (item.src && item.src.length>item.i)?item.src[item.i]:null;
      }
      if (!src){
        a = [];
        srclen = 0;
        oldlen = 0;
      } else if (src.$pas2jsrefcnt>0 || depth>=s){
        a = [];
        srclen = src.length;
        oldlen = srclen;
      } else {
        a = src;
        srclen = 0;
        oldlen = a.length;
      }
      lastlen = stack[depth].dim;
      a.length = lastlen;
      if (depth>0){
        item.a[item.i]=a;
        item.i++;
        if ((lastlen===0) && (item.i<item.a.length)) continue;
      }
      if (lastlen>0){
        if (depth<dimmax){
          item = stack[depth];
          item.a = a;
          item.i = 0;
          item.src = src;
          depth++;
          continue;
        } else {
          if (srclen>lastlen) srclen=lastlen;
          if (rtl.isArray(defaultvalue)){
            // array of dyn array
            for (var i=0; i<srclen; i++) a[i]=src[i];
            for (var i=oldlen; i<lastlen; i++) a[i]=[];
          } else if (rtl.isObject(defaultvalue)) {
            if (rtl.isTRecord(defaultvalue)){
              // array of record
              for (var i=0; i<srclen; i++) a[i]=defaultvalue.$clone(src[i]);
              for (var i=oldlen; i<lastlen; i++) a[i]=defaultvalue.$new();
            } else {
              // array of set
              for (var i=0; i<srclen; i++) a[i]=rtl.refSet(src[i]);
              for (var i=oldlen; i<lastlen; i++) a[i]={};
            }
          } else {
            for (var i=0; i<srclen; i++) a[i]=src[i];
            for (var i=oldlen; i<lastlen; i++) a[i]=defaultvalue;
          }
        }
      }
      // backtrack
      while ((depth>0) && (stack[depth-1].i>=stack[depth-1].dim)){
        depth--;
      };
      if (depth===0){
        if (dimmax===0) return a;
        return stack[0].a;
      }
    }while (true);
  },

  arrayEq: function(a,b){
    if (a===null) return b===null;
    if (b===null) return false;
    if (a.length!==b.length) return false;
    for (var i=0; i<a.length; i++) if (a[i]!==b[i]) return false;
    return true;
  },

  arrayClone: function(type,src,srcpos,endpos,dst,dstpos){
    // type: 0 for references, "refset" for calling refSet(), a function for new type()
    // src must not be null
    // This function does not range check.
    if(type === 'refSet') {
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = rtl.refSet(src[srcpos]); // ref set
    } else if (rtl.isTRecord(type)){
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = type.$clone(src[srcpos]); // clone record
    }  else {
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = src[srcpos]; // reference
    };
  },

  arrayConcat: function(type){
    // type: see rtl.arrayClone
    var a = [];
    var l = 0;
    for (var i=1; i<arguments.length; i++){
      var src = arguments[i];
      if (src !== null) l+=src.length;
    };
    a.length = l;
    l=0;
    for (var i=1; i<arguments.length; i++){
      var src = arguments[i];
      if (src === null) continue;
      rtl.arrayClone(type,src,0,src.length,a,l);
      l+=src.length;
    };
    return a;
  },

  arrayConcatN: function(){
    var a = null;
    for (var i=0; i<arguments.length; i++){
      var src = arguments[i];
      if (src === null) continue;
      if (a===null){
        a=rtl.arrayRef(src); // Note: concat(a) does not clone
      } else {
        a=a.concat(src);
      }
    };
    return a;
  },

  arrayCopy: function(type, srcarray, index, count){
    // type: see rtl.arrayClone
    // if count is missing, use srcarray.length
    if (srcarray === null) return [];
    if (index < 0) index = 0;
    if (count === undefined) count=srcarray.length;
    var end = index+count;
    if (end>srcarray.length) end = srcarray.length;
    if (index>=end) return [];
    if (type===0){
      return srcarray.slice(index,end);
    } else {
      var a = [];
      a.length = end-index;
      rtl.arrayClone(type,srcarray,index,end,a,0);
      return a;
    }
  },

  arrayInsert: function(item, arr, index){
    if (arr){
      arr.splice(index,0,item);
      return arr;
    } else {
      return [item];
    }
  },

  setCharAt: function(s,index,c){
    return s.substr(0,index)+c+s.substr(index+1);
  },

  getResStr: function(mod,name){
    var rs = mod.$resourcestrings[name];
    return rs.current?rs.current:rs.org;
  },

  createSet: function(){
    var s = {};
    for (var i=0; i<arguments.length; i++){
      if (arguments[i]!=null){
        s[arguments[i]]=true;
      } else {
        var first=arguments[i+=1];
        var last=arguments[i+=1];
        for(var j=first; j<=last; j++) s[j]=true;
      }
    }
    return s;
  },

  cloneSet: function(s){
    var r = {};
    for (var key in s) r[key]=true;
    return r;
  },

  refSet: function(s){
    rtl.hideProp(s,'$shared',true);
    return s;
  },

  includeSet: function(s,enumvalue){
    if (s.$shared) s = rtl.cloneSet(s);
    s[enumvalue] = true;
    return s;
  },

  excludeSet: function(s,enumvalue){
    if (s.$shared) s = rtl.cloneSet(s);
    delete s[enumvalue];
    return s;
  },

  diffSet: function(s,t){
    var r = {};
    for (var key in s) if (!t[key]) r[key]=true;
    return r;
  },

  unionSet: function(s,t){
    var r = {};
    for (var key in s) r[key]=true;
    for (var key in t) r[key]=true;
    return r;
  },

  intersectSet: function(s,t){
    var r = {};
    for (var key in s) if (t[key]) r[key]=true;
    return r;
  },

  symDiffSet: function(s,t){
    var r = {};
    for (var key in s) if (!t[key]) r[key]=true;
    for (var key in t) if (!s[key]) r[key]=true;
    return r;
  },

  eqSet: function(s,t){
    for (var key in s) if (!t[key]) return false;
    for (var key in t) if (!s[key]) return false;
    return true;
  },

  neSet: function(s,t){
    return !rtl.eqSet(s,t);
  },

  leSet: function(s,t){
    for (var key in s) if (!t[key]) return false;
    return true;
  },

  geSet: function(s,t){
    for (var key in t) if (!s[key]) return false;
    return true;
  },

  strSetLength: function(s,newlen){
    var oldlen = s.length;
    if (oldlen > newlen){
      return s.substring(0,newlen);
    } else if (s.repeat){
      // Note: repeat needs ECMAScript6!
      return s+' '.repeat(newlen-oldlen);
    } else {
       while (oldlen<newlen){
         s+=' ';
         oldlen++;
       };
       return s;
    }
  },

  spaceLeft: function(s,width){
    var l=s.length;
    if (l>=width) return s;
    if (s.repeat){
      // Note: repeat needs ECMAScript6!
      return ' '.repeat(width-l) + s;
    } else {
      while (l<width){
        s=' '+s;
        l++;
      };
      return s;
    };
  },

  floatToStr: function(d,w,p){
    // input 1-3 arguments: double, width, precision
    if (arguments.length>2){
      return rtl.spaceLeft(d.toFixed(p),w);
    } else {
	  // exponent width
	  var pad = "";
	  var ad = Math.abs(d);
	  if (((ad>1) && (ad<1.0e+10)) ||  ((ad>1.e-10) && (ad<1))) {
		pad='00';
	  } else if ((ad>1) && (ad<1.0e+100) || (ad<1.e-10)) {
		pad='0';
      }  	
	  if (arguments.length<2) {
	    w=24;		
      } else if (w<9) {
		w=9;
      }		  
      var p = w-8;
      var s=(d>0 ? " " : "" ) + d.toExponential(p);
      s=s.replace(/e(.)/,'E$1'+pad);
      return rtl.spaceLeft(s,w);
    }
  },

  valEnum: function(s, enumType, setCodeFn){
    s = s.toLowerCase();
    for (var key in enumType){
      if((typeof(key)==='string') && (key.toLowerCase()===s)){
        setCodeFn(0);
        return enumType[key];
      }
    }
    setCodeFn(1);
    return 0;
  },

  lw: function(l){
    // fix longword bitwise operation
    return l<0?l+0x100000000:l;
  },

  and: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) & (b / hi);
    var l = (a & low) & (b & low);
    return h*hi + l;
  },

  or: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) | (b / hi);
    var l = (a & low) | (b & low);
    return h*hi + l;
  },

  xor: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) ^ (b / hi);
    var l = (a & low) ^ (b & low);
    return h*hi + l;
  },

  shr: function(a,b){
    if (a<0) a += rtl.hiInt;
    if (a<0x80000000) return a >> b;
    if (b<=0) return a;
    if (b>54) return 0;
    return Math.floor(a / Math.pow(2,b));
  },

  shl: function(a,b){
    if (a<0) a += rtl.hiInt;
    if (b<=0) return a;
    if (b>54) return 0;
    var r = a * Math.pow(2,b);
    if (r <= rtl.hiInt) return r;
    return r % rtl.hiInt;
  },

  initRTTI: function(){
    if (rtl.debug_rtti) rtl.debug('initRTTI');

    // base types
    rtl.tTypeInfo = { name: "tTypeInfo", kind: 0, $module: null, attr: null };
    function newBaseTI(name,kind,ancestor){
      if (!ancestor) ancestor = rtl.tTypeInfo;
      if (rtl.debug_rtti) rtl.debug('initRTTI.newBaseTI "'+name+'" '+kind+' ("'+ancestor.name+'")');
      var t = Object.create(ancestor);
      t.name = name;
      t.kind = kind;
      rtl[name] = t;
      return t;
    };
    function newBaseInt(name,minvalue,maxvalue,ordtype){
      var t = newBaseTI(name,1 /* tkInteger */,rtl.tTypeInfoInteger);
      t.minvalue = minvalue;
      t.maxvalue = maxvalue;
      t.ordtype = ordtype;
      return t;
    };
    newBaseTI("tTypeInfoInteger",1 /* tkInteger */);
    newBaseInt("shortint",-0x80,0x7f,0);
    newBaseInt("byte",0,0xff,1);
    newBaseInt("smallint",-0x8000,0x7fff,2);
    newBaseInt("word",0,0xffff,3);
    newBaseInt("longint",-0x80000000,0x7fffffff,4);
    newBaseInt("longword",0,0xffffffff,5);
    newBaseInt("nativeint",-0x10000000000000,0xfffffffffffff,6);
    newBaseInt("nativeuint",0,0xfffffffffffff,7);
    newBaseTI("char",2 /* tkChar */);
    newBaseTI("string",3 /* tkString */);
    newBaseTI("tTypeInfoEnum",4 /* tkEnumeration */,rtl.tTypeInfoInteger);
    newBaseTI("tTypeInfoSet",5 /* tkSet */);
    newBaseTI("double",6 /* tkDouble */);
    newBaseTI("boolean",7 /* tkBool */);
    newBaseTI("tTypeInfoProcVar",8 /* tkProcVar */);
    newBaseTI("tTypeInfoMethodVar",9 /* tkMethod */,rtl.tTypeInfoProcVar);
    newBaseTI("tTypeInfoArray",10 /* tkArray */);
    newBaseTI("tTypeInfoDynArray",11 /* tkDynArray */);
    newBaseTI("tTypeInfoPointer",15 /* tkPointer */);
    var t = newBaseTI("pointer",15 /* tkPointer */,rtl.tTypeInfoPointer);
    t.reftype = null;
    newBaseTI("jsvalue",16 /* tkJSValue */);
    newBaseTI("tTypeInfoRefToProcVar",17 /* tkRefToProcVar */,rtl.tTypeInfoProcVar);

    // member kinds
    rtl.tTypeMember = { attr: null };
    function newMember(name,kind){
      var m = Object.create(rtl.tTypeMember);
      m.name = name;
      m.kind = kind;
      rtl[name] = m;
    };
    newMember("tTypeMemberField",1); // tmkField
    newMember("tTypeMemberMethod",2); // tmkMethod
    newMember("tTypeMemberProperty",3); // tmkProperty

    // base object for storing members: a simple object
    rtl.tTypeMembers = {};

    // tTypeInfoStruct - base object for tTypeInfoClass, tTypeInfoRecord, tTypeInfoInterface
    var tis = newBaseTI("tTypeInfoStruct",0);
    tis.$addMember = function(name,ancestor,options){
      if (rtl.debug_rtti){
        if (!rtl.hasString(name) || (name.charAt()==='$')) throw 'invalid member "'+name+'", this="'+this.name+'"';
        if (!rtl.is(ancestor,rtl.tTypeMember)) throw 'invalid ancestor "'+ancestor+':'+ancestor.name+'", "'+this.name+'.'+name+'"';
        if ((options!=undefined) && (typeof(options)!='object')) throw 'invalid options "'+options+'", "'+this.name+'.'+name+'"';
      };
      var t = Object.create(ancestor);
      t.name = name;
      this.members[name] = t;
      this.names.push(name);
      if (rtl.isObject(options)){
        for (var key in options) if (options.hasOwnProperty(key)) t[key] = options[key];
      };
      return t;
    };
    tis.addField = function(name,type,options){
      var t = this.$addMember(name,rtl.tTypeMemberField,options);
      if (rtl.debug_rtti){
        if (!rtl.is(type,rtl.tTypeInfo)) throw 'invalid type "'+type+'", "'+this.name+'.'+name+'"';
      };
      t.typeinfo = type;
      this.fields.push(name);
      return t;
    };
    tis.addFields = function(){
      var i=0;
      while(i<arguments.length){
        var name = arguments[i++];
        var type = arguments[i++];
        if ((i<arguments.length) && (typeof(arguments[i])==='object')){
          this.addField(name,type,arguments[i++]);
        } else {
          this.addField(name,type);
        };
      };
    };
    tis.addMethod = function(name,methodkind,params,result,flags,options){
      var t = this.$addMember(name,rtl.tTypeMemberMethod,options);
      t.methodkind = methodkind;
      t.procsig = rtl.newTIProcSig(params,result,flags);
      this.methods.push(name);
      return t;
    };
    tis.addProperty = function(name,flags,result,getter,setter,options){
      var t = this.$addMember(name,rtl.tTypeMemberProperty,options);
      t.flags = flags;
      t.typeinfo = result;
      t.getter = getter;
      t.setter = setter;
      // Note: in options: params, stored, defaultvalue
      t.params = rtl.isArray(t.params) ? rtl.newTIParams(t.params) : null;
      this.properties.push(name);
      if (!rtl.isString(t.stored)) t.stored = "";
      return t;
    };
    tis.getField = function(index){
      return this.members[this.fields[index]];
    };
    tis.getMethod = function(index){
      return this.members[this.methods[index]];
    };
    tis.getProperty = function(index){
      return this.members[this.properties[index]];
    };

    newBaseTI("tTypeInfoRecord",12 /* tkRecord */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoClass",13 /* tkClass */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoClassRef",14 /* tkClassRef */);
    newBaseTI("tTypeInfoInterface",18 /* tkInterface */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoHelper",19 /* tkHelper */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoExtClass",20 /* tkExtClass */,rtl.tTypeInfoClass);
  },

  tSectionRTTI: {
    $module: null,
    $inherited: function(name,ancestor,o){
      if (rtl.debug_rtti){
        rtl.debug('tSectionRTTI.newTI "'+(this.$module?this.$module.$name:"(no module)")
          +'"."'+name+'" ('+ancestor.name+') '+(o?'init':'forward'));
      };
      var t = this[name];
      if (t){
        if (!t.$forward) throw 'duplicate type "'+name+'"';
        if (!ancestor.isPrototypeOf(t)) throw 'typeinfo ancestor mismatch "'+name+'" ancestor="'+ancestor.name+'" t.name="'+t.name+'"';
      } else {
        t = Object.create(ancestor);
        t.name = name;
        t.$module = this.$module;
        this[name] = t;
      }
      if (o){
        delete t.$forward;
        for (var key in o) if (o.hasOwnProperty(key)) t[key]=o[key];
      } else {
        t.$forward = true;
      }
      return t;
    },
    $Scope: function(name,ancestor,o){
      var t=this.$inherited(name,ancestor,o);
      t.members = {};
      t.names = [];
      t.fields = [];
      t.methods = [];
      t.properties = [];
      return t;
    },
    $TI: function(name,kind,o){ var t=this.$inherited(name,rtl.tTypeInfo,o); t.kind = kind; return t; },
    $Int: function(name,o){ return this.$inherited(name,rtl.tTypeInfoInteger,o); },
    $Enum: function(name,o){ return this.$inherited(name,rtl.tTypeInfoEnum,o); },
    $Set: function(name,o){ return this.$inherited(name,rtl.tTypeInfoSet,o); },
    $StaticArray: function(name,o){ return this.$inherited(name,rtl.tTypeInfoArray,o); },
    $DynArray: function(name,o){ return this.$inherited(name,rtl.tTypeInfoDynArray,o); },
    $ProcVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoProcVar,o); },
    $RefToProcVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoRefToProcVar,o); },
    $MethodVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoMethodVar,o); },
    $Record: function(name,o){ return this.$Scope(name,rtl.tTypeInfoRecord,o); },
    $Class: function(name,o){ return this.$Scope(name,rtl.tTypeInfoClass,o); },
    $ClassRef: function(name,o){ return this.$inherited(name,rtl.tTypeInfoClassRef,o); },
    $Pointer: function(name,o){ return this.$inherited(name,rtl.tTypeInfoPointer,o); },
    $Interface: function(name,o){ return this.$Scope(name,rtl.tTypeInfoInterface,o); },
    $Helper: function(name,o){ return this.$Scope(name,rtl.tTypeInfoHelper,o); },
    $ExtClass: function(name,o){ return this.$Scope(name,rtl.tTypeInfoExtClass,o); }
  },

  newTIParam: function(param){
    // param is an array, 0=name, 1=type, 2=optional flags
    var t = {
      name: param[0],
      typeinfo: param[1],
      flags: (rtl.isNumber(param[2]) ? param[2] : 0)
    };
    return t;
  },

  newTIParams: function(list){
    // list: optional array of [paramname,typeinfo,optional flags]
    var params = [];
    if (rtl.isArray(list)){
      for (var i=0; i<list.length; i++) params.push(rtl.newTIParam(list[i]));
    };
    return params;
  },

  newTIProcSig: function(params,result,flags){
    var s = {
      params: rtl.newTIParams(params),
      resulttype: result?result:null,
      flags: flags?flags:0
    };
    return s;
  },

  addResource: function(aRes){
    rtl.$res[aRes.name]=aRes;
  },

  getResource: function(aName){
    var res = rtl.$res[aName];
    if (res !== undefined) {
      return res;
    } else {
      return null;
    }
  },

  getResourceList: function(){
    return Object.keys(rtl.$res);
  }
}

rtl.module("System",[],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  rtl.createClass(this,"TObject",null,function () {
    this.$init = function () {
    };
    this.$final = function () {
    };
    this.Create = function () {
      return this;
    };
    this.Destroy = function () {
    };
    this.Free = function () {
      this.$destroy("Destroy");
    };
    this.FieldAddress = function (aName) {
      var Result = null;
      Result = null;
      if (aName === "") return Result;
      var aClass = this.$class;
      var ClassTI = null;
      var myName = aName.toLowerCase();
      var MemberTI = null;
      while (aClass !== null) {
        ClassTI = aClass.$rtti;
        for (var i = 0, $end2 = ClassTI.fields.length - 1; i <= $end2; i++) {
          MemberTI = ClassTI.getField(i);
          if (MemberTI.name.toLowerCase() === myName) {
             return MemberTI;
          };
        };
        aClass = aClass.$ancestor ? aClass.$ancestor : null;
      };
      return Result;
    };
    this.AfterConstruction = function () {
    };
    this.BeforeDestruction = function () {
    };
  });
  this.vtInteger = 0;
  this.vtExtended = 3;
  this.vtWideChar = 9;
  this.vtCurrency = 12;
  this.vtUnicodeString = 18;
  this.vtNativeInt = 19;
  rtl.recNewT(this,"TVarRec",function () {
    this.VType = 0;
    this.VJSValue = undefined;
    this.$eq = function (b) {
      return (this.VType === b.VType) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue);
    };
    this.$assign = function (s) {
      this.VType = s.VType;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      return this;
    };
  });
  this.VarRecs = function () {
    var Result = [];
    var i = 0;
    var v = null;
    Result = [];
    while (i < arguments.length) {
      v = $mod.TVarRec.$new();
      v.VType = rtl.trunc(arguments[i]);
      i += 1;
      v.VJSValue = arguments[i];
      i += 1;
      Result.push($mod.TVarRec.$clone(v));
    };
    return Result;
  };
  this.IsConsole = false;
  this.OnParamCount = null;
  this.OnParamStr = null;
  this.Random = function (Range) {
    return Math.floor(Math.random()*Range);
  };
  this.Trunc = function (A) {
    if (!Math.trunc) {
      Math.trunc = function(v) {
        v = +v;
        if (!isFinite(v)) return v;
        return (v - v % 1) || (v < 0 ? -0 : v === 0 ? v : 0);
      };
    }
    $mod.Trunc = Math.trunc;
    return Math.trunc(A);
  };
  this.Int = function (A) {
    var Result = 0.0;
    Result = $mod.Trunc(A);
    return Result;
  };
  this.Copy = function (S, Index, Size) {
    if (Index<1) Index = 1;
    return (Size>0) ? S.substring(Index-1,Index+Size-1) : "";
  };
  this.Copy$1 = function (S, Index) {
    if (Index<1) Index = 1;
    return S.substr(Index-1);
  };
  this.Delete = function (S, Index, Size) {
    var h = "";
    if ((Index < 1) || (Index > S.get().length) || (Size <= 0)) return;
    h = S.get();
    S.set($mod.Copy(h,1,Index - 1) + $mod.Copy$1(h,Index + Size));
  };
  this.Pos = function (Search, InString) {
    return InString.indexOf(Search)+1;
  };
  this.Insert = function (Insertion, Target, Index) {
    var t = "";
    if (Insertion === "") return;
    t = Target.get();
    if (Index < 1) {
      Target.set(Insertion + t)}
     else if (Index > t.length) {
      Target.set(t + Insertion)}
     else Target.set($mod.Copy(t,1,Index - 1) + Insertion + $mod.Copy(t,Index,t.length));
  };
  this.upcase = function (c) {
    return c.toUpperCase();
  };
  this.val = function (S, NI, Code) {
    NI.set($impl.valint(S,-9007199254740991,9007199254740991,Code));
  };
  this.StringOfChar = function (c, l) {
    var Result = "";
    var i = 0;
    if ((l>0) && c.repeat) return c.repeat(l);
    Result = "";
    for (var $l = 1, $end = l; $l <= $end; $l++) {
      i = $l;
      Result = Result + c;
    };
    return Result;
  };
  this.Writeln = function () {
    var i = 0;
    var l = 0;
    var s = "";
    l = arguments.length - 1;
    if ($impl.WriteCallBack != null) {
      for (var $l = 0, $end = l; $l <= $end; $l++) {
        i = $l;
        $impl.WriteCallBack(arguments[i],i === l);
      };
    } else {
      s = $impl.WriteBuf;
      for (var $l1 = 0, $end1 = l; $l1 <= $end1; $l1++) {
        i = $l1;
        s = s + ("" + arguments[i]);
      };
      console.log(s);
      $impl.WriteBuf = "";
    };
  };
  $mod.$implcode = function () {
    $impl.WriteBuf = "";
    $impl.WriteCallBack = null;
    $impl.valint = function (S, MinVal, MaxVal, Code) {
      var Result = 0;
      var x = 0.0;
      if (S === "") {
        Code.set(1);
        return Result;
      };
      x = Number(S);
      if (isNaN(x)) {
        var $tmp = $mod.Copy(S,1,1);
        if ($tmp === "$") {
          x = Number("0x" + $mod.Copy$1(S,2))}
         else if ($tmp === "&") {
          x = Number("0o" + $mod.Copy$1(S,2))}
         else if ($tmp === "%") {
          x = Number("0b" + $mod.Copy$1(S,2))}
         else {
          Code.set(1);
          return Result;
        };
      };
      if (isNaN(x) || (x !== $mod.Int(x))) {
        Code.set(1)}
       else if ((x < MinVal) || (x > MaxVal)) {
        Code.set(2)}
       else {
        Result = $mod.Trunc(x);
        Code.set(0);
      };
      return Result;
    };
  };
  $mod.$init = function () {
    rtl.exitcode = 0;
  };
},[]);
rtl.module("RTLConsts",["System"],function () {
  "use strict";
  var $mod = this;
  $mod.$resourcestrings = {SArgumentMissing: {org: 'Missing argument in format "%s"'}, SInvalidFormat: {org: 'Invalid format specifier : "%s"'}, SInvalidArgIndex: {org: 'Invalid argument index in format: "%s"'}, SListCapacityError: {org: "List capacity (%s) exceeded."}, SListCountError: {org: "List count (%s) out of bounds."}, SListIndexError: {org: "List index (%s) out of bounds"}, SInvalidName: {org: 'Invalid component name: "%s"'}, SDuplicateName: {org: 'Duplicate component name: "%s"'}};
});
rtl.module("Types",["System"],function () {
  "use strict";
  var $mod = this;
  rtl.recNewT(this,"TPoint",function () {
    this.x = 0;
    this.y = 0;
    this.$eq = function (b) {
      return (this.x === b.x) && (this.y === b.y);
    };
    this.$assign = function (s) {
      this.x = s.x;
      this.y = s.y;
      return this;
    };
  });
  this.Point = function (x, y) {
    var Result = $mod.TPoint.$new();
    Result.x = x;
    Result.y = y;
    return Result;
  };
});
rtl.module("JS",["System","Types"],function () {
  "use strict";
  var $mod = this;
});
rtl.module("SysUtils",["System","RTLConsts","JS"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.FreeAndNil = function (Obj) {
    var o = null;
    o = Obj.get();
    if (o === null) return;
    Obj.set(null);
    o.$destroy("Destroy");
  };
  rtl.recNewT(this,"TFormatSettings",function () {
    this.CurrencyDecimals = 0;
    this.CurrencyFormat = 0;
    this.CurrencyString = "";
    this.DateSeparator = "";
    this.DecimalSeparator = "";
    this.LongDateFormat = "";
    this.LongTimeFormat = "";
    this.NegCurrFormat = 0;
    this.ShortDateFormat = "";
    this.ShortTimeFormat = "";
    this.ThousandSeparator = "";
    this.TimeAMString = "";
    this.TimePMString = "";
    this.TimeSeparator = "";
    this.TwoDigitYearCenturyWindow = 0;
    this.InitLocaleHandler = null;
    this.$new = function () {
      var r = Object.create(this);
      r.DateTimeToStrFormat = rtl.arraySetLength(null,"",2);
      r.LongDayNames = rtl.arraySetLength(null,"",7);
      r.LongMonthNames = rtl.arraySetLength(null,"",12);
      r.ShortDayNames = rtl.arraySetLength(null,"",7);
      r.ShortMonthNames = rtl.arraySetLength(null,"",12);
      return r;
    };
    this.$eq = function (b) {
      return (this.CurrencyDecimals === b.CurrencyDecimals) && (this.CurrencyFormat === b.CurrencyFormat) && (this.CurrencyString === b.CurrencyString) && (this.DateSeparator === b.DateSeparator) && rtl.arrayEq(this.DateTimeToStrFormat,b.DateTimeToStrFormat) && (this.DecimalSeparator === b.DecimalSeparator) && (this.LongDateFormat === b.LongDateFormat) && rtl.arrayEq(this.LongDayNames,b.LongDayNames) && rtl.arrayEq(this.LongMonthNames,b.LongMonthNames) && (this.LongTimeFormat === b.LongTimeFormat) && (this.NegCurrFormat === b.NegCurrFormat) && (this.ShortDateFormat === b.ShortDateFormat) && rtl.arrayEq(this.ShortDayNames,b.ShortDayNames) && rtl.arrayEq(this.ShortMonthNames,b.ShortMonthNames) && (this.ShortTimeFormat === b.ShortTimeFormat) && (this.ThousandSeparator === b.ThousandSeparator) && (this.TimeAMString === b.TimeAMString) && (this.TimePMString === b.TimePMString) && (this.TimeSeparator === b.TimeSeparator) && (this.TwoDigitYearCenturyWindow === b.TwoDigitYearCenturyWindow);
    };
    this.$assign = function (s) {
      this.CurrencyDecimals = s.CurrencyDecimals;
      this.CurrencyFormat = s.CurrencyFormat;
      this.CurrencyString = s.CurrencyString;
      this.DateSeparator = s.DateSeparator;
      this.DateTimeToStrFormat = s.DateTimeToStrFormat.slice(0);
      this.DecimalSeparator = s.DecimalSeparator;
      this.LongDateFormat = s.LongDateFormat;
      this.LongDayNames = s.LongDayNames.slice(0);
      this.LongMonthNames = s.LongMonthNames.slice(0);
      this.LongTimeFormat = s.LongTimeFormat;
      this.NegCurrFormat = s.NegCurrFormat;
      this.ShortDateFormat = s.ShortDateFormat;
      this.ShortDayNames = s.ShortDayNames.slice(0);
      this.ShortMonthNames = s.ShortMonthNames.slice(0);
      this.ShortTimeFormat = s.ShortTimeFormat;
      this.ThousandSeparator = s.ThousandSeparator;
      this.TimeAMString = s.TimeAMString;
      this.TimePMString = s.TimePMString;
      this.TimeSeparator = s.TimeSeparator;
      this.TwoDigitYearCenturyWindow = s.TwoDigitYearCenturyWindow;
      return this;
    };
    this.GetJSLocale = function () {
      return Intl.DateTimeFormat().resolvedOptions().locale;
    };
    this.Create = function () {
      var Result = $mod.TFormatSettings.$new();
      Result.$assign($mod.TFormatSettings.Create$1($mod.TFormatSettings.GetJSLocale()));
      return Result;
    };
    this.Create$1 = function (ALocale) {
      var Result = $mod.TFormatSettings.$new();
      Result.LongDayNames = $impl.DefaultLongDayNames.slice(0);
      Result.ShortDayNames = $impl.DefaultShortDayNames.slice(0);
      Result.ShortMonthNames = $impl.DefaultShortMonthNames.slice(0);
      Result.LongMonthNames = $impl.DefaultLongMonthNames.slice(0);
      Result.DateTimeToStrFormat[0] = "c";
      Result.DateTimeToStrFormat[1] = "f";
      Result.DateSeparator = "-";
      Result.TimeSeparator = ":";
      Result.ShortDateFormat = "yyyy-mm-dd";
      Result.LongDateFormat = "ddd, yyyy-mm-dd";
      Result.ShortTimeFormat = "hh:nn";
      Result.LongTimeFormat = "hh:nn:ss";
      Result.DecimalSeparator = ".";
      Result.ThousandSeparator = ",";
      Result.TimeAMString = "AM";
      Result.TimePMString = "PM";
      Result.TwoDigitYearCenturyWindow = 50;
      Result.CurrencyFormat = 0;
      Result.NegCurrFormat = 0;
      Result.CurrencyDecimals = 2;
      Result.CurrencyString = "$";
      if ($mod.TFormatSettings.InitLocaleHandler != null) $mod.TFormatSettings.InitLocaleHandler($mod.UpperCase(ALocale),$mod.TFormatSettings.$clone(Result));
      return Result;
    };
  },true);
  rtl.createClass(this,"Exception",pas.System.TObject,function () {
    this.LogMessageOnCreate = false;
    this.$init = function () {
      pas.System.TObject.$init.call(this);
      this.fMessage = "";
    };
    this.Create$1 = function (Msg) {
      this.fMessage = Msg;
      if (this.LogMessageOnCreate) pas.System.Writeln("Created exception ",this.$classname," with message: ",Msg);
      return this;
    };
    this.CreateFmt = function (Msg, Args) {
      this.Create$1($mod.Format(Msg,Args));
      return this;
    };
  });
  rtl.createClass(this,"EConvertError",this.Exception,function () {
  });
  this.TrimLeft = function (S) {
    return S.replace(/^[\s\uFEFF\xA0\x00-\x1f]+/,'');
  };
  this.UpperCase = function (s) {
    return s.toUpperCase();
  };
  this.LowerCase = function (s) {
    return s.toLowerCase();
  };
  this.CompareText = function (s1, s2) {
    var l1 = s1.toLowerCase();
    var l2 = s2.toLowerCase();
    if (l1>l2){ return 1;
    } else if (l1<l2){ return -1;
    } else { return 0; };
  };
  this.Format = function (Fmt, Args) {
    var Result = "";
    Result = $mod.Format$1(Fmt,Args,$mod.FormatSettings);
    return Result;
  };
  this.Format$1 = function (Fmt, Args, aSettings) {
    var Result = "";
    var ChPos = 0;
    var OldPos = 0;
    var ArgPos = 0;
    var DoArg = 0;
    var Len = 0;
    var Hs = "";
    var ToAdd = "";
    var Index = 0;
    var Width = 0;
    var Prec = 0;
    var Left = false;
    var Fchar = "";
    var vq = 0;
    function ReadFormat() {
      var Result = "";
      var Value = 0;
      function ReadInteger() {
        var Code = 0;
        var ArgN = 0;
        if (Value !== -1) return;
        OldPos = ChPos;
        while ((ChPos <= Len) && (Fmt.charAt(ChPos - 1) <= "9") && (Fmt.charAt(ChPos - 1) >= "0")) ChPos += 1;
        if (ChPos > Len) $impl.DoFormatError(1,Fmt);
        if (Fmt.charAt(ChPos - 1) === "*") {
          if (Index === 255) {
            ArgN = ArgPos}
           else {
            ArgN = Index;
            Index += 1;
          };
          if ((ChPos > OldPos) || (ArgN > (rtl.length(Args) - 1))) $impl.DoFormatError(1,Fmt);
          ArgPos = ArgN + 1;
          var $tmp = Args[ArgN].VType;
          if ($tmp === 0) {
            Value = Args[ArgN].VJSValue}
           else if ($tmp === 19) {
            Value = Args[ArgN].VJSValue}
           else {
            $impl.DoFormatError(1,Fmt);
          };
          ChPos += 1;
        } else {
          if (OldPos < ChPos) {
            pas.System.val(pas.System.Copy(Fmt,OldPos,ChPos - OldPos),{get: function () {
                return Value;
              }, set: function (v) {
                Value = v;
              }},{get: function () {
                return Code;
              }, set: function (v) {
                Code = v;
              }});
            if (Code > 0) $impl.DoFormatError(1,Fmt);
          } else Value = -1;
        };
      };
      function ReadIndex() {
        if (Fmt.charAt(ChPos - 1) !== ":") {
          ReadInteger()}
         else Value = 0;
        if (Fmt.charAt(ChPos - 1) === ":") {
          if (Value === -1) $impl.DoFormatError(2,Fmt);
          Index = Value;
          Value = -1;
          ChPos += 1;
        };
      };
      function ReadLeft() {
        if (Fmt.charAt(ChPos - 1) === "-") {
          Left = true;
          ChPos += 1;
        } else Left = false;
      };
      function ReadWidth() {
        ReadInteger();
        if (Value !== -1) {
          Width = Value;
          Value = -1;
        };
      };
      function ReadPrec() {
        if (Fmt.charAt(ChPos - 1) === ".") {
          ChPos += 1;
          ReadInteger();
          if (Value === -1) Value = 0;
          Prec = Value;
        };
      };
      Index = 255;
      Width = -1;
      Prec = -1;
      Value = -1;
      ChPos += 1;
      if (Fmt.charAt(ChPos - 1) === "%") {
        Result = "%";
        return Result;
      };
      ReadIndex();
      ReadLeft();
      ReadWidth();
      ReadPrec();
      Result = pas.System.upcase(Fmt.charAt(ChPos - 1));
      return Result;
    };
    function Checkarg(AT, err) {
      var Result = false;
      Result = false;
      if (Index === 255) {
        DoArg = ArgPos}
       else DoArg = Index;
      ArgPos = DoArg + 1;
      if ((DoArg > (rtl.length(Args) - 1)) || (Args[DoArg].VType !== AT)) {
        if (err) $impl.DoFormatError(3,Fmt);
        ArgPos -= 1;
        return Result;
      };
      Result = true;
      return Result;
    };
    Result = "";
    Len = Fmt.length;
    ChPos = 1;
    OldPos = 1;
    ArgPos = 0;
    while (ChPos <= Len) {
      while ((ChPos <= Len) && (Fmt.charAt(ChPos - 1) !== "%")) ChPos += 1;
      if (ChPos > OldPos) Result = Result + pas.System.Copy(Fmt,OldPos,ChPos - OldPos);
      if (ChPos < Len) {
        Fchar = ReadFormat();
        var $tmp = Fchar;
        if ($tmp === "D") {
          if (Checkarg(0,false)) {
            ToAdd = $mod.IntToStr(Args[DoArg].VJSValue)}
           else if (Checkarg(19,true)) ToAdd = $mod.IntToStr(Args[DoArg].VJSValue);
          Width = Math.abs(Width);
          Index = Prec - ToAdd.length;
          if (ToAdd.charAt(0) !== "-") {
            ToAdd = pas.System.StringOfChar("0",Index) + ToAdd}
           else pas.System.Insert(pas.System.StringOfChar("0",Index + 1),{get: function () {
              return ToAdd;
            }, set: function (v) {
              ToAdd = v;
            }},2);
        } else if ($tmp === "U") {
          if (Checkarg(0,false)) {
            ToAdd = $mod.IntToStr(Args[DoArg].VJSValue >>> 0)}
           else if (Checkarg(19,true)) ToAdd = $mod.IntToStr(Args[DoArg].VJSValue);
          Width = Math.abs(Width);
          Index = Prec - ToAdd.length;
          ToAdd = pas.System.StringOfChar("0",Index) + ToAdd;
        } else if ($tmp === "E") {
          if (Checkarg(12,false)) {
            ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue / 10000,$mod.TFloatFormat.ffExponent,3,Prec,aSettings)}
           else if (Checkarg(3,true)) ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue,$mod.TFloatFormat.ffExponent,3,Prec,aSettings);
        } else if ($tmp === "F") {
          if (Checkarg(12,false)) {
            ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue / 10000,$mod.TFloatFormat.ffFixed,9999,Prec,aSettings)}
           else if (Checkarg(3,true)) ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue,$mod.TFloatFormat.ffFixed,9999,Prec,aSettings);
        } else if ($tmp === "G") {
          if (Checkarg(12,false)) {
            ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue / 10000,$mod.TFloatFormat.ffGeneral,Prec,3,aSettings)}
           else if (Checkarg(3,true)) ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue,$mod.TFloatFormat.ffGeneral,Prec,3,aSettings);
        } else if ($tmp === "N") {
          if (Checkarg(12,false)) {
            ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue / 10000,$mod.TFloatFormat.ffNumber,9999,Prec,aSettings)}
           else if (Checkarg(3,true)) ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue,$mod.TFloatFormat.ffNumber,9999,Prec,aSettings);
        } else if ($tmp === "M") {
          if (Checkarg(12,false)) {
            ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue / 10000,$mod.TFloatFormat.ffCurrency,9999,Prec,aSettings)}
           else if (Checkarg(3,true)) ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue,$mod.TFloatFormat.ffCurrency,9999,Prec,aSettings);
        } else if ($tmp === "S") {
          if (Checkarg(18,false)) {
            Hs = Args[DoArg].VJSValue}
           else if (Checkarg(9,true)) Hs = Args[DoArg].VJSValue;
          Index = Hs.length;
          if ((Prec !== -1) && (Index > Prec)) Index = Prec;
          ToAdd = pas.System.Copy(Hs,1,Index);
        } else if ($tmp === "P") {
          if (Checkarg(0,false)) {
            ToAdd = $mod.IntToHex(Args[DoArg].VJSValue,8)}
           else if (Checkarg(0,true)) ToAdd = $mod.IntToHex(Args[DoArg].VJSValue,16);
        } else if ($tmp === "X") {
          if (Checkarg(0,false)) {
            vq = Args[DoArg].VJSValue;
            Index = 16;
          } else if (Checkarg(19,true)) {
            vq = Args[DoArg].VJSValue;
            Index = 31;
          };
          if (Prec > Index) {
            ToAdd = $mod.IntToHex(vq,Index)}
           else {
            Index = 1;
            while ((rtl.shl(1,Index * 4) <= vq) && (Index < 16)) Index += 1;
            if (Index > Prec) Prec = Index;
            ToAdd = $mod.IntToHex(vq,Prec);
          };
        } else if ($tmp === "%") ToAdd = "%";
        if (Width !== -1) if (ToAdd.length < Width) if (!Left) {
          ToAdd = pas.System.StringOfChar(" ",Width - ToAdd.length) + ToAdd}
         else ToAdd = ToAdd + pas.System.StringOfChar(" ",Width - ToAdd.length);
        Result = Result + ToAdd;
      };
      ChPos += 1;
      OldPos = ChPos;
    };
    return Result;
  };
  var Alpha = rtl.createSet(null,65,90,null,97,122,95);
  var AlphaNum = rtl.unionSet(Alpha,rtl.createSet(null,48,57));
  var Dot = ".";
  this.IsValidIdent = function (Ident, AllowDots, StrictDots) {
    var Result = false;
    var First = false;
    var I = 0;
    var Len = 0;
    Len = Ident.length;
    if (Len < 1) return false;
    First = true;
    Result = false;
    I = 1;
    while (I <= Len) {
      if (First) {
        if (!(Ident.charCodeAt(I - 1) in Alpha)) return Result;
        First = false;
      } else if (AllowDots && (Ident.charAt(I - 1) === Dot)) {
        if (StrictDots) {
          if (I >= Len) return Result;
          First = true;
        };
      } else if (!(Ident.charCodeAt(I - 1) in AlphaNum)) return Result;
      I = I + 1;
    };
    Result = true;
    return Result;
  };
  this.IntToStr = function (Value) {
    var Result = "";
    Result = "" + Value;
    return Result;
  };
  this.IntToHex = function (Value, Digits) {
    var Result = "";
    Result = "";
    if (Value < 0) if (Value<0) Value = 0xFFFFFFFF + Value + 1;
    Result=Value.toString(16);
    Result = $mod.UpperCase(Result);
    while (Result.length < Digits) Result = "0" + Result;
    return Result;
  };
  this.TFloatFormat = {"0": "ffFixed", ffFixed: 0, "1": "ffGeneral", ffGeneral: 1, "2": "ffExponent", ffExponent: 2, "3": "ffNumber", ffNumber: 3, "4": "ffCurrency", ffCurrency: 4};
  this.FloatToStrF$1 = function (Value, format, Precision, Digits, aSettings) {
    var Result = "";
    var TS = "";
    var DS = "";
    DS = aSettings.DecimalSeparator;
    TS = aSettings.ThousandSeparator;
    var $tmp = format;
    if ($tmp === $mod.TFloatFormat.ffGeneral) {
      Result = $impl.FormatGeneralFloat(Value,Precision,DS)}
     else if ($tmp === $mod.TFloatFormat.ffExponent) {
      Result = $impl.FormatExponentFloat(Value,Precision,Digits,DS)}
     else if ($tmp === $mod.TFloatFormat.ffFixed) {
      Result = $impl.FormatFixedFloat(Value,Digits,DS)}
     else if ($tmp === $mod.TFloatFormat.ffNumber) {
      Result = $impl.FormatNumberFloat(Value,Digits,DS,TS)}
     else if ($tmp === $mod.TFloatFormat.ffCurrency) Result = $impl.FormatNumberCurrency(Value * 10000,Digits,aSettings);
    if ((format !== $mod.TFloatFormat.ffCurrency) && (Result.length > 1) && (Result.charAt(0) === "-")) $impl.RemoveLeadingNegativeSign({get: function () {
        return Result;
      }, set: function (v) {
        Result = v;
      }},DS,TS);
    return Result;
  };
  this.OnGetEnvironmentVariable = null;
  this.OnGetEnvironmentString = null;
  this.OnGetEnvironmentVariableCount = null;
  this.TimeSeparator = "";
  this.DateSeparator = "";
  this.ShortDateFormat = "";
  this.LongDateFormat = "";
  this.ShortTimeFormat = "";
  this.LongTimeFormat = "";
  this.DecimalSeparator = "";
  this.ThousandSeparator = "";
  this.TimeAMString = "";
  this.TimePMString = "";
  this.ShortMonthNames = rtl.arraySetLength(null,"",12);
  this.LongMonthNames = rtl.arraySetLength(null,"",12);
  this.ShortDayNames = rtl.arraySetLength(null,"",7);
  this.LongDayNames = rtl.arraySetLength(null,"",7);
  this.FormatSettings = this.TFormatSettings.$new();
  this.CurrencyFormat = 0;
  this.NegCurrFormat = 0;
  this.CurrencyDecimals = 0;
  this.CurrencyString = "";
  $mod.$implcode = function () {
    $impl.DefaultShortMonthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    $impl.DefaultLongMonthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    $impl.DefaultShortDayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    $impl.DefaultLongDayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    $impl.feInvalidFormat = 1;
    $impl.feMissingArgument = 2;
    $impl.feInvalidArgIndex = 3;
    $impl.DoFormatError = function (ErrCode, fmt) {
      var $tmp = ErrCode;
      if ($tmp === 1) {
        throw $mod.EConvertError.$create("CreateFmt",[rtl.getResStr(pas.RTLConsts,"SInvalidFormat"),pas.System.VarRecs(18,fmt)])}
       else if ($tmp === 2) {
        throw $mod.EConvertError.$create("CreateFmt",[rtl.getResStr(pas.RTLConsts,"SArgumentMissing"),pas.System.VarRecs(18,fmt)])}
       else if ($tmp === 3) throw $mod.EConvertError.$create("CreateFmt",[rtl.getResStr(pas.RTLConsts,"SInvalidArgIndex"),pas.System.VarRecs(18,fmt)]);
    };
    $impl.maxdigits = 15;
    $impl.ReplaceDecimalSep = function (S, DS) {
      var Result = "";
      var P = 0;
      P = pas.System.Pos(".",S);
      if (P > 0) {
        Result = pas.System.Copy(S,1,P - 1) + DS + pas.System.Copy(S,P + 1,S.length - P)}
       else Result = S;
      return Result;
    };
    $impl.FormatGeneralFloat = function (Value, Precision, DS) {
      var Result = "";
      var P = 0;
      var PE = 0;
      var Q = 0;
      var Exponent = 0;
      if ((Precision === -1) || (Precision > 15)) Precision = 15;
      Result = rtl.floatToStr(Value,Precision + 7);
      Result = $mod.TrimLeft(Result);
      P = pas.System.Pos(".",Result);
      if (P === 0) return Result;
      PE = pas.System.Pos("E",Result);
      if (PE === 0) {
        Result = $impl.ReplaceDecimalSep(Result,DS);
        return Result;
      };
      Q = PE + 2;
      Exponent = 0;
      while (Q <= Result.length) {
        Exponent = ((Exponent * 10) + Result.charCodeAt(Q - 1)) - 48;
        Q += 1;
      };
      if (Result.charAt((PE + 1) - 1) === "-") Exponent = -Exponent;
      if (((P + Exponent) < PE) && (Exponent > -6)) {
        Result = rtl.strSetLength(Result,PE - 1);
        if (Exponent >= 0) {
          for (var $l = 0, $end = Exponent - 1; $l <= $end; $l++) {
            Q = $l;
            Result = rtl.setCharAt(Result,P - 1,Result.charAt((P + 1) - 1));
            P += 1;
          };
          Result = rtl.setCharAt(Result,P - 1,".");
          P = 1;
          if (Result.charAt(P - 1) === "-") P += 1;
          while ((Result.charAt(P - 1) === "0") && (P < Result.length) && (pas.System.Copy(Result,P + 1,DS.length) !== DS)) pas.System.Delete({get: function () {
              return Result;
            }, set: function (v) {
              Result = v;
            }},P,1);
        } else {
          pas.System.Insert(pas.System.Copy("00000",1,-Exponent),{get: function () {
              return Result;
            }, set: function (v) {
              Result = v;
            }},P - 1);
          Result = rtl.setCharAt(Result,P - Exponent - 1,Result.charAt(P - Exponent - 1 - 1));
          Result = rtl.setCharAt(Result,P - 1,".");
          if (Exponent !== -1) Result = rtl.setCharAt(Result,P - Exponent - 1 - 1,"0");
        };
        Q = Result.length;
        while ((Q > 0) && (Result.charAt(Q - 1) === "0")) Q -= 1;
        if (Result.charAt(Q - 1) === ".") Q -= 1;
        if ((Q === 0) || ((Q === 1) && (Result.charAt(0) === "-"))) {
          Result = "0"}
         else Result = rtl.strSetLength(Result,Q);
      } else {
        while (Result.charAt(PE - 1 - 1) === "0") {
          pas.System.Delete({get: function () {
              return Result;
            }, set: function (v) {
              Result = v;
            }},PE - 1,1);
          PE -= 1;
        };
        if (Result.charAt(PE - 1 - 1) === DS) {
          pas.System.Delete({get: function () {
              return Result;
            }, set: function (v) {
              Result = v;
            }},PE - 1,1);
          PE -= 1;
        };
        if (Result.charAt((PE + 1) - 1) === "+") {
          pas.System.Delete({get: function () {
              return Result;
            }, set: function (v) {
              Result = v;
            }},PE + 1,1)}
         else PE += 1;
        while (Result.charAt((PE + 1) - 1) === "0") pas.System.Delete({get: function () {
            return Result;
          }, set: function (v) {
            Result = v;
          }},PE + 1,1);
      };
      Result = $impl.ReplaceDecimalSep(Result,DS);
      return Result;
    };
    $impl.FormatExponentFloat = function (Value, Precision, Digits, DS) {
      var Result = "";
      var P = 0;
      DS = $mod.FormatSettings.DecimalSeparator;
      if ((Precision === -1) || (Precision > 15)) Precision = 15;
      Result = rtl.floatToStr(Value,Precision + 7);
      while (Result.charAt(0) === " ") pas.System.Delete({get: function () {
          return Result;
        }, set: function (v) {
          Result = v;
        }},1,1);
      P = pas.System.Pos("E",Result);
      if (P === 0) {
        Result = $impl.ReplaceDecimalSep(Result,DS);
        return Result;
      };
      P += 2;
      if (Digits > 4) Digits = 4;
      Digits = (Result.length - P - Digits) + 1;
      if (Digits < 0) {
        pas.System.Insert(pas.System.Copy("0000",1,-Digits),{get: function () {
            return Result;
          }, set: function (v) {
            Result = v;
          }},P)}
       else while ((Digits > 0) && (Result.charAt(P - 1) === "0")) {
        pas.System.Delete({get: function () {
            return Result;
          }, set: function (v) {
            Result = v;
          }},P,1);
        if (P > Result.length) {
          pas.System.Delete({get: function () {
              return Result;
            }, set: function (v) {
              Result = v;
            }},P - 2,2);
          break;
        };
        Digits -= 1;
      };
      Result = $impl.ReplaceDecimalSep(Result,DS);
      return Result;
    };
    $impl.FormatFixedFloat = function (Value, Digits, DS) {
      var Result = "";
      if (Digits === -1) {
        Digits = 2}
       else if (Digits > 18) Digits = 18;
      Result = rtl.floatToStr(Value,0,Digits);
      if ((Result !== "") && (Result.charAt(0) === " ")) pas.System.Delete({get: function () {
          return Result;
        }, set: function (v) {
          Result = v;
        }},1,1);
      Result = $impl.ReplaceDecimalSep(Result,DS);
      return Result;
    };
    $impl.FormatNumberFloat = function (Value, Digits, DS, TS) {
      var Result = "";
      var P = 0;
      if (Digits === -1) {
        Digits = 2}
       else if (Digits > 15) Digits = 15;
      Result = rtl.floatToStr(Value,0,Digits);
      if ((Result !== "") && (Result.charAt(0) === " ")) pas.System.Delete({get: function () {
          return Result;
        }, set: function (v) {
          Result = v;
        }},1,1);
      P = pas.System.Pos(".",Result);
      if (P <= 0) P = Result.length + 1;
      Result = $impl.ReplaceDecimalSep(Result,DS);
      P -= 3;
      if ((TS !== "") && (TS !== "\x00")) while (P > 1) {
        if (Result.charAt(P - 1 - 1) !== "-") pas.System.Insert(TS,{get: function () {
            return Result;
          }, set: function (v) {
            Result = v;
          }},P);
        P -= 3;
      };
      return Result;
    };
    $impl.RemoveLeadingNegativeSign = function (AValue, DS, aThousandSeparator) {
      var Result = false;
      var i = 0;
      var TS = "";
      var StartPos = 0;
      Result = false;
      StartPos = 2;
      TS = aThousandSeparator;
      for (var $l = StartPos, $end = AValue.get().length; $l <= $end; $l++) {
        i = $l;
        Result = (AValue.get().charCodeAt(i - 1) in rtl.createSet(48,DS.charCodeAt(),69,43)) || (AValue.get().charAt(i - 1) === TS);
        if (!Result) break;
      };
      if (Result && (AValue.get().charAt(0) === "-")) pas.System.Delete(AValue,1,1);
      return Result;
    };
    $impl.FormatNumberCurrency = function (Value, Digits, aSettings) {
      var Result = "";
      var Negative = false;
      var P = 0;
      var CS = "";
      var DS = "";
      var TS = "";
      DS = aSettings.DecimalSeparator;
      TS = aSettings.ThousandSeparator;
      CS = aSettings.CurrencyString;
      if (Digits === -1) {
        Digits = aSettings.CurrencyDecimals}
       else if (Digits > 18) Digits = 18;
      Result = rtl.floatToStr(Value / 10000,0,Digits);
      Negative = Result.charAt(0) === "-";
      if (Negative) pas.System.Delete({get: function () {
          return Result;
        }, set: function (v) {
          Result = v;
        }},1,1);
      P = pas.System.Pos(".",Result);
      if (TS !== "") {
        if (P !== 0) {
          Result = $impl.ReplaceDecimalSep(Result,DS)}
         else P = Result.length + 1;
        P -= 3;
        while (P > 1) {
          pas.System.Insert(TS,{get: function () {
              return Result;
            }, set: function (v) {
              Result = v;
            }},P);
          P -= 3;
        };
      };
      if (Negative) $impl.RemoveLeadingNegativeSign({get: function () {
          return Result;
        }, set: function (v) {
          Result = v;
        }},DS,TS);
      if (!Negative) {
        var $tmp = aSettings.CurrencyFormat;
        if ($tmp === 0) {
          Result = CS + Result}
         else if ($tmp === 1) {
          Result = Result + CS}
         else if ($tmp === 2) {
          Result = CS + " " + Result}
         else if ($tmp === 3) Result = Result + " " + CS;
      } else {
        var $tmp1 = aSettings.NegCurrFormat;
        if ($tmp1 === 0) {
          Result = "(" + CS + Result + ")"}
         else if ($tmp1 === 1) {
          Result = "-" + CS + Result}
         else if ($tmp1 === 2) {
          Result = CS + "-" + Result}
         else if ($tmp1 === 3) {
          Result = CS + Result + "-"}
         else if ($tmp1 === 4) {
          Result = "(" + Result + CS + ")"}
         else if ($tmp1 === 5) {
          Result = "-" + Result + CS}
         else if ($tmp1 === 6) {
          Result = Result + "-" + CS}
         else if ($tmp1 === 7) {
          Result = Result + CS + "-"}
         else if ($tmp1 === 8) {
          Result = "-" + Result + " " + CS}
         else if ($tmp1 === 9) {
          Result = "-" + CS + " " + Result}
         else if ($tmp1 === 10) {
          Result = Result + " " + CS + "-"}
         else if ($tmp1 === 11) {
          Result = CS + " " + Result + "-"}
         else if ($tmp1 === 12) {
          Result = CS + " " + "-" + Result}
         else if ($tmp1 === 13) {
          Result = Result + "-" + " " + CS}
         else if ($tmp1 === 14) {
          Result = "(" + CS + " " + Result + ")"}
         else if ($tmp1 === 15) Result = "(" + Result + " " + CS + ")";
      };
      return Result;
    };
  };
  $mod.$init = function () {
    $mod.ShortMonthNames = $impl.DefaultShortMonthNames.slice(0);
    $mod.LongMonthNames = $impl.DefaultLongMonthNames.slice(0);
    $mod.ShortDayNames = $impl.DefaultShortDayNames.slice(0);
    $mod.LongDayNames = $impl.DefaultLongDayNames.slice(0);
    $mod.FormatSettings.$assign($mod.TFormatSettings.Create());
    $mod.TimeSeparator = $mod.FormatSettings.TimeSeparator;
    $mod.DateSeparator = $mod.FormatSettings.DateSeparator;
    $mod.ShortDateFormat = $mod.FormatSettings.ShortDateFormat;
    $mod.LongDateFormat = $mod.FormatSettings.LongDateFormat;
    $mod.ShortTimeFormat = $mod.FormatSettings.ShortTimeFormat;
    $mod.LongTimeFormat = $mod.FormatSettings.LongTimeFormat;
    $mod.DecimalSeparator = $mod.FormatSettings.DecimalSeparator;
    $mod.ThousandSeparator = $mod.FormatSettings.ThousandSeparator;
    $mod.TimeAMString = $mod.FormatSettings.TimeAMString;
    $mod.TimePMString = $mod.FormatSettings.TimePMString;
    $mod.CurrencyFormat = $mod.FormatSettings.CurrencyFormat;
    $mod.NegCurrFormat = $mod.FormatSettings.NegCurrFormat;
    $mod.CurrencyDecimals = $mod.FormatSettings.CurrencyDecimals;
    $mod.CurrencyString = $mod.FormatSettings.CurrencyString;
  };
},[]);
rtl.module("Classes",["System","RTLConsts","Types","SysUtils","JS"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.$rtti.$MethodVar("TNotifyEvent",{procsig: rtl.newTIProcSig([["Sender",pas.System.$rtti["TObject"]]]), methodkind: 0});
  rtl.createClass(this,"EListError",pas.SysUtils.Exception,function () {
  });
  rtl.createClass(this,"EComponentError",pas.SysUtils.Exception,function () {
  });
  rtl.createClass(this,"TFPList",pas.System.TObject,function () {
    this.$init = function () {
      pas.System.TObject.$init.call(this);
      this.FList = [];
      this.FCount = 0;
      this.FCapacity = 0;
    };
    this.$final = function () {
      this.FList = undefined;
      pas.System.TObject.$final.call(this);
    };
    this.Get = function (Index) {
      var Result = undefined;
      if ((Index < 0) || (Index >= this.FCount)) this.RaiseIndexError(Index);
      Result = this.FList[Index];
      return Result;
    };
    this.SetCapacity = function (NewCapacity) {
      if (NewCapacity < this.FCount) this.$class.Error(rtl.getResStr(pas.RTLConsts,"SListCapacityError"),"" + NewCapacity);
      if (NewCapacity === this.FCapacity) return;
      this.FList = rtl.arraySetLength(this.FList,undefined,NewCapacity);
      this.FCapacity = NewCapacity;
    };
    this.SetCount = function (NewCount) {
      if (NewCount < 0) this.$class.Error(rtl.getResStr(pas.RTLConsts,"SListCountError"),"" + NewCount);
      if (NewCount > this.FCount) {
        if (NewCount > this.FCapacity) this.SetCapacity(NewCount);
      };
      this.FCount = NewCount;
    };
    this.RaiseIndexError = function (Index) {
      this.$class.Error(rtl.getResStr(pas.RTLConsts,"SListIndexError"),"" + Index);
    };
    this.Destroy = function () {
      this.Clear();
      pas.System.TObject.Destroy.call(this);
    };
    this.Add = function (Item) {
      var Result = 0;
      if (this.FCount === this.FCapacity) this.Expand();
      this.FList[this.FCount] = Item;
      Result = this.FCount;
      this.FCount += 1;
      return Result;
    };
    this.Clear = function () {
      if (rtl.length(this.FList) > 0) {
        this.SetCount(0);
        this.SetCapacity(0);
      };
    };
    this.Delete = function (Index) {
      if ((Index < 0) || (Index >= this.FCount)) this.$class.Error(rtl.getResStr(pas.RTLConsts,"SListIndexError"),"" + Index);
      this.FCount = this.FCount - 1;
      this.FList.splice(Index,1);
      this.FCapacity -= 1;
    };
    this.Error = function (Msg, Data) {
      throw $mod.EListError.$create("CreateFmt",[Msg,pas.System.VarRecs(18,Data)]);
    };
    this.Expand = function () {
      var Result = null;
      var IncSize = 0;
      if (this.FCount < this.FCapacity) return this;
      IncSize = 4;
      if (this.FCapacity > 3) IncSize = IncSize + 4;
      if (this.FCapacity > 8) IncSize = IncSize + 8;
      if (this.FCapacity > 127) IncSize += this.FCapacity >>> 2;
      this.SetCapacity(this.FCapacity + IncSize);
      Result = this;
      return Result;
    };
    this.IndexOf = function (Item) {
      var Result = 0;
      var C = 0;
      Result = 0;
      C = this.FCount;
      while ((Result < C) && (this.FList[Result] != Item)) Result += 1;
      if (Result >= C) Result = -1;
      return Result;
    };
    this.Last = function () {
      var Result = undefined;
      if (this.FCount === 0) {
        Result = null}
       else Result = this.Get(this.FCount - 1);
      return Result;
    };
    this.Remove = function (Item) {
      var Result = 0;
      Result = this.IndexOf(Item);
      if (Result !== -1) this.Delete(Result);
      return Result;
    };
  });
  rtl.createClass(this,"TPersistent",pas.System.TObject,function () {
  });
  this.TOperation = {"0": "opInsert", opInsert: 0, "1": "opRemove", opRemove: 1};
  this.TComponentStateItem = {"0": "csLoading", csLoading: 0, "1": "csReading", csReading: 1, "2": "csWriting", csWriting: 2, "3": "csDestroying", csDestroying: 3, "4": "csDesigning", csDesigning: 4, "5": "csAncestor", csAncestor: 5, "6": "csUpdating", csUpdating: 6, "7": "csFixups", csFixups: 7, "8": "csFreeNotification", csFreeNotification: 8, "9": "csInline", csInline: 9, "10": "csDesignInstance", csDesignInstance: 10};
  this.TComponentStyleItem = {"0": "csInheritable", csInheritable: 0, "1": "csCheckPropAvail", csCheckPropAvail: 1, "2": "csSubComponent", csSubComponent: 2, "3": "csTransient", csTransient: 3};
  rtl.createClass(this,"TComponent",this.TPersistent,function () {
    this.$init = function () {
      $mod.TPersistent.$init.call(this);
      this.FOwner = null;
      this.FName = "";
      this.FTag = 0;
      this.FComponents = null;
      this.FFreeNotifies = null;
      this.FComponentState = {};
      this.FComponentStyle = {};
    };
    this.$final = function () {
      this.FOwner = undefined;
      this.FComponents = undefined;
      this.FFreeNotifies = undefined;
      this.FComponentState = undefined;
      this.FComponentStyle = undefined;
      $mod.TPersistent.$final.call(this);
    };
    this.Insert = function (AComponent) {
      if (!(this.FComponents != null)) this.FComponents = $mod.TFPList.$create("Create");
      this.FComponents.Add(AComponent);
      AComponent.FOwner = this;
    };
    this.Remove = function (AComponent) {
      AComponent.FOwner = null;
      if (this.FComponents != null) {
        this.FComponents.Remove(AComponent);
        if (this.FComponents.FCount === 0) {
          this.FComponents.$destroy("Destroy");
          this.FComponents = null;
        };
      };
    };
    this.RemoveNotification = function (AComponent) {
      if (this.FFreeNotifies !== null) {
        this.FFreeNotifies.Remove(AComponent);
        if (this.FFreeNotifies.FCount === 0) {
          this.FFreeNotifies.$destroy("Destroy");
          this.FFreeNotifies = null;
          this.FComponentState = rtl.excludeSet(this.FComponentState,$mod.TComponentStateItem.csFreeNotification);
        };
      };
    };
    this.SetReference = function (Enable) {
      var aField = null;
      var aValue = null;
      var aOwner = null;
      if (this.FName === "") return;
      if (this.FOwner != null) {
        aOwner = this.FOwner;
        aField = this.FOwner.$class.FieldAddress(this.FName);
        if (aField != null) {
          if (Enable) {
            aValue = this}
           else aValue = null;
          aOwner["" + aField["name"]] = aValue;
        };
      };
    };
    this.ChangeName = function (NewName) {
      this.FName = NewName;
    };
    this.Notification = function (AComponent, Operation) {
      var C = 0;
      if (Operation === $mod.TOperation.opRemove) this.RemoveFreeNotification(AComponent);
      if (!(this.FComponents != null)) return;
      C = this.FComponents.FCount - 1;
      while (C >= 0) {
        rtl.getObject(this.FComponents.Get(C)).Notification(AComponent,Operation);
        C -= 1;
        if (C >= this.FComponents.FCount) C = this.FComponents.FCount - 1;
      };
    };
    this.SetDesigning = function (Value, SetChildren) {
      var Runner = 0;
      if (Value) {
        this.FComponentState = rtl.includeSet(this.FComponentState,$mod.TComponentStateItem.csDesigning)}
       else this.FComponentState = rtl.excludeSet(this.FComponentState,$mod.TComponentStateItem.csDesigning);
      if ((this.FComponents != null) && SetChildren) for (var $l = 0, $end = this.FComponents.FCount - 1; $l <= $end; $l++) {
        Runner = $l;
        rtl.getObject(this.FComponents.Get(Runner)).SetDesigning(Value,true);
      };
    };
    this.SetName = function (NewName) {
      if (this.FName === NewName) return;
      if ((NewName !== "") && !pas.SysUtils.IsValidIdent(NewName,false,false)) throw $mod.EComponentError.$create("CreateFmt",[rtl.getResStr(pas.RTLConsts,"SInvalidName"),pas.System.VarRecs(18,NewName)]);
      if (this.FOwner != null) {
        this.FOwner.ValidateRename(this,this.FName,NewName)}
       else this.ValidateRename(null,this.FName,NewName);
      this.SetReference(false);
      this.ChangeName(NewName);
      this.SetReference(true);
    };
    this.ValidateRename = function (AComponent, CurName, NewName) {
      if ((AComponent !== null) && (pas.SysUtils.CompareText(CurName,NewName) !== 0) && (AComponent.FOwner === this) && (this.FindComponent(NewName) !== null)) throw $mod.EComponentError.$create("CreateFmt",[rtl.getResStr(pas.RTLConsts,"SDuplicateName"),pas.System.VarRecs(18,NewName)]);
      if (($mod.TComponentStateItem.csDesigning in this.FComponentState) && (this.FOwner !== null)) this.FOwner.ValidateRename(AComponent,CurName,NewName);
    };
    this.ValidateContainer = function (AComponent) {
      AComponent.ValidateInsert(this);
    };
    this.ValidateInsert = function (AComponent) {
      if (AComponent === null) ;
    };
    this.Create$1 = function (AOwner) {
      this.FComponentStyle = rtl.createSet($mod.TComponentStyleItem.csInheritable);
      if (AOwner != null) AOwner.InsertComponent(this);
      return this;
    };
    this.Destroy = function () {
      var I = 0;
      var C = null;
      this.Destroying();
      if (this.FFreeNotifies != null) {
        I = this.FFreeNotifies.FCount - 1;
        while (I >= 0) {
          C = rtl.getObject(this.FFreeNotifies.Get(I));
          this.FFreeNotifies.Delete(I);
          C.Notification(this,$mod.TOperation.opRemove);
          if (this.FFreeNotifies === null) {
            I = 0}
           else if (I > this.FFreeNotifies.FCount) I = this.FFreeNotifies.FCount;
          I -= 1;
        };
        pas.SysUtils.FreeAndNil({p: this, get: function () {
            return this.p.FFreeNotifies;
          }, set: function (v) {
            this.p.FFreeNotifies = v;
          }});
      };
      this.DestroyComponents();
      if (this.FOwner !== null) this.FOwner.RemoveComponent(this);
      pas.System.TObject.Destroy.call(this);
    };
    this.BeforeDestruction = function () {
      if (!($mod.TComponentStateItem.csDestroying in this.FComponentState)) this.Destroying();
    };
    this.DestroyComponents = function () {
      var acomponent = null;
      while (this.FComponents != null) {
        acomponent = rtl.getObject(this.FComponents.Last());
        this.Remove(acomponent);
        acomponent.$destroy("Destroy");
      };
    };
    this.Destroying = function () {
      var Runner = 0;
      if ($mod.TComponentStateItem.csDestroying in this.FComponentState) return;
      this.FComponentState = rtl.includeSet(this.FComponentState,$mod.TComponentStateItem.csDestroying);
      if (this.FComponents != null) for (var $l = 0, $end = this.FComponents.FCount - 1; $l <= $end; $l++) {
        Runner = $l;
        rtl.getObject(this.FComponents.Get(Runner)).Destroying();
      };
    };
    this.FindComponent = function (AName) {
      var Result = null;
      var I = 0;
      Result = null;
      if ((AName === "") || !(this.FComponents != null)) return Result;
      for (var $l = 0, $end = this.FComponents.FCount - 1; $l <= $end; $l++) {
        I = $l;
        if (pas.SysUtils.CompareText(rtl.getObject(this.FComponents.Get(I)).FName,AName) === 0) {
          Result = rtl.getObject(this.FComponents.Get(I));
          return Result;
        };
      };
      return Result;
    };
    this.RemoveFreeNotification = function (AComponent) {
      this.RemoveNotification(AComponent);
      AComponent.RemoveNotification(this);
    };
    this.InsertComponent = function (AComponent) {
      AComponent.ValidateContainer(this);
      this.ValidateRename(AComponent,"",AComponent.FName);
      if (AComponent.FOwner !== null) AComponent.FOwner.RemoveComponent(AComponent);
      this.Insert(AComponent);
      if ($mod.TComponentStateItem.csDesigning in this.FComponentState) AComponent.SetDesigning(true,true);
      this.Notification(AComponent,$mod.TOperation.opInsert);
    };
    this.RemoveComponent = function (AComponent) {
      this.Notification(AComponent,$mod.TOperation.opRemove);
      this.Remove(AComponent);
      AComponent.SetDesigning(false,true);
      this.ValidateRename(AComponent,AComponent.FName,"");
    };
    var $r = this.$rtti;
    $r.addProperty("Name",6,rtl.string,"FName","SetName");
    $r.addProperty("Tag",0,rtl.nativeint,"FTag","FTag",{Default: 0});
  });
  $mod.$implcode = function () {
    $impl.ClassList = null;
  };
  $mod.$init = function () {
    $impl.ClassList = new Object();
  };
},[]);
rtl.module("Web",["System","Types","JS"],function () {
  "use strict";
  var $mod = this;
  rtl.createClass(this,"TJSKeyNames",pas.System.TObject,function () {
    this.ArrowDown = "ArrowDown";
    this.ArrowLeft = "ArrowLeft";
    this.ArrowRight = "ArrowRight";
    this.ArrowUp = "ArrowUp";
  });
  this.$rtti.$ExtClass("TJSHTMLAudioElement",{ancestor: this.$rtti["TJSHTMLMediaElement"], jsclass: "HTMLAudioElement"});
});
rtl.module("CustApp",["System","Classes","SysUtils","Types","JS"],function () {
  "use strict";
  var $mod = this;
  rtl.createClass(this,"TCustomApplication",pas.Classes.TComponent,function () {
    this.$init = function () {
      pas.Classes.TComponent.$init.call(this);
      this.FExceptObjectJS = undefined;
      this.FTerminated = false;
      this.FOptionChar = "";
      this.FCaseSensitiveOptions = false;
      this.FStopOnException = false;
      this.FExceptionExitCode = 0;
      this.FExceptObject = null;
    };
    this.$final = function () {
      this.FExceptObject = undefined;
      pas.Classes.TComponent.$final.call(this);
    };
    this.Create$1 = function (AOwner) {
      pas.Classes.TComponent.Create$1.call(this,AOwner);
      this.FOptionChar = "-";
      this.FCaseSensitiveOptions = true;
      this.FStopOnException = false;
      return this;
    };
    this.HandleException = function (Sender) {
      this.ShowException(this.FExceptObject);
      if (this.FStopOnException) this.Terminate$1(this.FExceptionExitCode);
      if (Sender === null) ;
    };
    this.Initialize = function () {
      this.FTerminated = false;
    };
    this.Run = function () {
      do {
        this.FExceptObject = null;
        this.FExceptObjectJS = null;
        try {
          this.DoRun();
        } catch ($e) {
          if (pas.SysUtils.Exception.isPrototypeOf($e)) {
            var E = $e;
            this.FExceptObject = E;
            this.FExceptObjectJS = E;
            this.HandleException(this);
          } else {
            this.FExceptObject = null;
            this.FExceptObjectJS = $e;
          }
        };
        break;
      } while (!this.FTerminated);
    };
    this.Terminate = function () {
      this.Terminate$1(rtl.exitcode);
    };
    this.Terminate$1 = function (AExitCode) {
      this.FTerminated = true;
      rtl.exitcode = AExitCode;
    };
  });
});
rtl.module("browserapp",["System","Classes","SysUtils","Types","JS","Web","CustApp"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  rtl.createClass(this,"TBrowserApplication",pas.CustApp.TCustomApplication,function () {
    this.DoRun = function () {
    };
    this.ShowException = function (E) {
      var S = "";
      if (E !== null) {
        S = E.$classname + ": " + E.fMessage}
       else if (this.FExceptObjectJS) S = this.FExceptObjectJS.toString();
      window.alert("Unhandled exception caught:" + S);
    };
    this.HandleException = function (Sender) {
      if (pas.SysUtils.Exception.isPrototypeOf(this.FExceptObject)) this.ShowException(this.FExceptObject);
      pas.CustApp.TCustomApplication.HandleException.call(this,Sender);
    };
  });
  this.ReloadEnvironmentStrings = function () {
    var I = 0;
    var S = "";
    var N = "";
    var A = [];
    var P = [];
    if ($impl.EnvNames != null) pas.SysUtils.FreeAndNil({p: $impl, get: function () {
        return this.p.EnvNames;
      }, set: function (v) {
        this.p.EnvNames = v;
      }});
    $impl.EnvNames = new Object();
    S = window.location.search;
    S = pas.System.Copy(S,2,S.length - 1);
    A = S.split("&");
    for (var $l = 0, $end = rtl.length(A) - 1; $l <= $end; $l++) {
      I = $l;
      P = A[I].split("=");
      N = pas.SysUtils.LowerCase(decodeURIComponent(P[0]));
      if (rtl.length(P) === 2) {
        $impl.EnvNames[N] = decodeURIComponent(P[1])}
       else if (rtl.length(P) === 1) $impl.EnvNames[N] = "";
    };
  };
  $mod.$implcode = function () {
    $impl.EnvNames = null;
    $impl.Params = [];
    $impl.ReloadParamStrings = function () {
      $impl.Params = rtl.arraySetLength($impl.Params,"",1);
      $impl.Params[0] = window.location.pathname;
    };
    $impl.GetParamCount = function () {
      var Result = 0;
      Result = rtl.length($impl.Params) - 1;
      return Result;
    };
    $impl.GetParamStr = function (Index) {
      var Result = "";
      Result = $impl.Params[Index];
      return Result;
    };
    $impl.MyGetEnvironmentVariable = function (EnvVar) {
      var Result = "";
      var aName = "";
      aName = pas.SysUtils.LowerCase(EnvVar);
      if ($impl.EnvNames.hasOwnProperty(aName)) {
        Result = "" + $impl.EnvNames[aName]}
       else Result = "";
      return Result;
    };
    $impl.MyGetEnvironmentVariableCount = function () {
      var Result = 0;
      Result = rtl.length(Object.getOwnPropertyNames($impl.EnvNames));
      return Result;
    };
    $impl.MyGetEnvironmentString = function (Index) {
      var Result = "";
      Result = "" + $impl.EnvNames[Object.getOwnPropertyNames($impl.EnvNames)[Index]];
      return Result;
    };
  };
  $mod.$init = function () {
    pas.System.IsConsole = true;
    pas.System.OnParamCount = $impl.GetParamCount;
    pas.System.OnParamStr = $impl.GetParamStr;
    $mod.ReloadEnvironmentStrings();
    $impl.ReloadParamStrings();
    pas.SysUtils.OnGetEnvironmentVariable = $impl.MyGetEnvironmentVariable;
    pas.SysUtils.OnGetEnvironmentVariableCount = $impl.MyGetEnvironmentVariableCount;
    pas.SysUtils.OnGetEnvironmentString = $impl.MyGetEnvironmentString;
  };
},[]);
rtl.module("upacman",["System","SysUtils","Classes","Types","Web","JS"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.TimerInterval = 20;
  this.GridXSize = 30;
  this.GridYSize = 33;
  this.DrawGrid = false;
  this.ControlCount = 5;
  this.ControlNames = ["left","right","down","up","pause"];
  this.TAudio = {"0": "aStart", aStart: 0, "1": "aDie", aDie: 1, "2": "aEatGhost", aEatGhost: 2, "3": "aEatPill", aEatPill: 3};
  this.$rtti.$Enum("TAudio",{minvalue: 0, maxvalue: 3, ordtype: 1, enumtype: this.TAudio});
  rtl.recNewT(this,"TSprite",function () {
    this.SpImg = null;
    this.Sx = 0.0;
    this.Sy = 0.0;
    this.Dir = "";
    this.Spd = 0.0;
    this.$new = function () {
      var r = Object.create(this);
      r.XY = pas.Types.TPoint.$new();
      r.StartPos = pas.Types.TPoint.$new();
      return r;
    };
    this.$eq = function (b) {
      return (this.SpImg === b.SpImg) && this.XY.$eq(b.XY) && (this.Sx === b.Sx) && (this.Sy === b.Sy) && (this.Dir === b.Dir) && (this.Spd === b.Spd) && this.StartPos.$eq(b.StartPos);
    };
    this.$assign = function (s) {
      this.SpImg = s.SpImg;
      this.XY.$assign(s.XY);
      this.Sx = s.Sx;
      this.Sy = s.Sy;
      this.Dir = s.Dir;
      this.Spd = s.Spd;
      this.StartPos.$assign(s.StartPos);
      return this;
    };
  });
  rtl.recNewT(this,"TCell",function () {
    this.WallType$a = {"0": "wtNone", wtNone: 0, "1": "wtEW", wtEW: 1, "2": "wtNS", wtNS: 2, "3": "wtNE", wtNE: 3, "4": "wtNW", wtNW: 4, "5": "wtSW", wtSW: 5, "6": "wtSE", wtSE: 6, "7": "wtNoGo", wtNoGo: 7};
    this.WallType = 0;
    this.PillType$a = {"0": "ptNone", ptNone: 0, "1": "ptPill", ptPill: 1, "2": "ptSuperPill", ptSuperPill: 2};
    this.PillType = 0;
    this.I = 0;
    this.Dirty = false;
    this.$eq = function (b) {
      return (this.WallType === b.WallType) && (this.PillType === b.PillType) && (this.I === b.I) && (this.Dirty === b.Dirty);
    };
    this.$assign = function (s) {
      this.WallType = s.WallType;
      this.PillType = s.PillType;
      this.I = s.I;
      this.Dirty = s.Dirty;
      return this;
    };
  });
  rtl.createClass(this,"TPacmanAudio",pas.System.TObject,function () {
    this.$init = function () {
      pas.System.TObject.$init.call(this);
      this.FOnLoaded = null;
      this.FLoaded = false;
      this.files = rtl.arraySetLength(null,null,4);
      this.filesOK = rtl.arraySetLength(null,false,4);
      this.Playing = rtl.arraySetLength(null,false,4);
    };
    this.$final = function () {
      this.FOnLoaded = undefined;
      this.files = undefined;
      this.filesOK = undefined;
      this.Playing = undefined;
      pas.System.TObject.$final.call(this);
    };
    this.AudioLoaded = function () {
      var AllLoaded = false;
      var A = 0;
      AllLoaded = true;
      for (A = 0; A <= 3; A++) AllLoaded = AllLoaded && this.filesOK[A];
      this.FLoaded = AllLoaded;
      if (this.FOnLoaded != null) this.FOnLoaded(this);
    };
    this.CheckEnd = function (Event) {
      var Result = false;
      var a = 0;
      for (a = 0; a <= 3; a++) if (this.files[a] === Event.target) this.Playing[a] = false;
      return Result;
    };
    this.CheckplayOK = function (Event) {
      var Result = false;
      var a = 0;
      for (a = 0; a <= 3; a++) if (this.files[a] === Event.target) {
        this.files[a].oncanplaythrough = null;
        this.filesOK[a] = true;
        this.AudioLoaded();
      };
      return Result;
    };
    this.LoadAudio = function () {
      var F = null;
      var A = 0;
      for (A = 0; A <= 3; A++) {
        F = document.getElementById("audio-" + $impl.AudioNames[A]);
        this.files[A] = F;
        this.filesOK[A] = F.readyState >= 3;
        if (!this.filesOK[A]) F.oncanplaythrough = rtl.createSafeCallback(this,"CheckplayOK");
      };
      this.AudioLoaded();
    };
    this.play = function (aAudio) {
      pas.System.Writeln("Attempting to play:",$impl.AudioNames[aAudio]);
      if (this.filesOK[aAudio]) {
        this.Playing[aAudio] = true;
        this.files[aAudio].play();
        this.files[aAudio].onended = rtl.createSafeCallback(this,"CheckEnd");
      };
    };
    this.DisableSound = function () {
      var a = 0;
      for (a = 0; a <= 3; a++) if (this.Playing[a]) {
        this.files[a].pause();
        this.files[a].currentTime = 0;
      };
    };
    this.Pause = function () {
      var a = 0;
      for (a = 0; a <= 3; a++) if (this.Playing[a] && !this.files[a].paused) this.files[a].pause();
    };
    this.Resume = function () {
      var a = 0;
      for (a = 0; a <= 3; a++) if (this.Playing[a] && this.files[a].paused) this.files[a].play();
    };
    var $r = this.$rtti;
    $mod.$rtti.$StaticArray("TPacmanAudio.files$a",{dims: [4], eltype: pas.Web.$rtti["TJSHTMLAudioElement"]});
    $r.addField("files",$mod.$rtti["TPacmanAudio.files$a"]);
    $mod.$rtti.$StaticArray("TPacmanAudio.filesOK$a",{dims: [4], eltype: rtl.boolean});
    $r.addField("filesOK",$mod.$rtti["TPacmanAudio.filesOK$a"]);
    $mod.$rtti.$StaticArray("TPacmanAudio.Playing$a",{dims: [4], eltype: rtl.boolean});
    $r.addField("Playing",$mod.$rtti["TPacmanAudio.Playing$a"]);
    $r.addMethod("LoadAudio",0,[]);
    $r.addMethod("play",0,[["aAudio",$mod.$rtti["TAudio"]]]);
    $r.addMethod("DisableSound",0,[]);
    $r.addMethod("Pause",0,[]);
    $r.addMethod("Resume",0,[]);
    $r.addProperty("Loaded",0,rtl.boolean,"FLoaded","FLoaded");
    $r.addProperty("OnLoaded",0,pas.Classes.$rtti["TNotifyEvent"],"FOnLoaded","FOnLoaded");
  });
  rtl.createClass(this,"TPacman",pas.Classes.TComponent,function () {
    this.Sprite$a$clone = function (a) {
      var b = [];
      b.length = 6;
      for (var c = 0; c < 6; c++) b[c] = $mod.TSprite.$clone(a[c]);
      return b;
    };
    this.Cells$a$clone = function (a) {
      var b = [];
      b.length = 30;
      for (var c = 0; c < 30; c++) {
        var d = b[c] = [];
        d.length = 34;
        var e = a[c];
        for (var f = 0; f < 34; f++) d[f] = $mod.TCell.$clone(e[f]);
      };
      return b;
    };
    this.$init = function () {
      pas.Classes.TComponent.$init.call(this);
      this.ImgGhost = rtl.arraySetLength(null,null,6);
      this.ImgBonus = null;
      this.SpriteTimer = 0;
      this.pnBonusBarOuter = null;
      this.pnBonusBarInner = null;
      this.pnScareBarOuter = null;
      this.pnScareBarInner = null;
      this.lbBonusCnt = null;
      this.lbLives = null;
      this.lbScore = null;
      this.lbStatus = null;
      this.lbHiscore = null;
      this.lbGhostCnt = null;
      this.FCanvasEl = null;
      this.FCanvas = null;
      this.FCBXSound = null;
      this.FBtnReset = null;
      this.FAudio = null;
      this.FAudioDisabled = false;
      this.FCanvasID = "";
      this.FResetID = "";
      this.Pause = false;
      this.LivesLeft = 0;
      this.BonusCnt = 0;
      this.GhostCnt = 0;
      this.BonusTimer = 0;
      this.ScareTimer = 0;
      this.PacMouthOpen = 0;
      this.PacMouthOpenDir = 0;
      this.PillsLeft = 0;
      this.PacmanDir = "";
      this.score = 0;
      this.HiScore = 0;
      this.Sprite = rtl.arraySetLength(null,$mod.TSprite,6);
      this.Cells = rtl.arraySetLength(null,$mod.TCell,30,34);
      this.FDying = false;
    };
    this.$final = function () {
      this.ImgGhost = undefined;
      this.ImgBonus = undefined;
      this.pnBonusBarOuter = undefined;
      this.pnBonusBarInner = undefined;
      this.pnScareBarOuter = undefined;
      this.pnScareBarInner = undefined;
      this.lbBonusCnt = undefined;
      this.lbLives = undefined;
      this.lbScore = undefined;
      this.lbStatus = undefined;
      this.lbHiscore = undefined;
      this.lbGhostCnt = undefined;
      this.FCanvasEl = undefined;
      this.FCanvas = undefined;
      this.FCBXSound = undefined;
      this.FBtnReset = undefined;
      this.FAudio = undefined;
      this.Sprite = undefined;
      this.Cells = undefined;
      pas.Classes.TComponent.$final.call(this);
    };
    this.CheckSound = function (Event) {
      var Result = false;
      Result = true;
      this.FAudioDisabled = !this.FCBXSound.checked;
      if (this.FAudioDisabled) {
        this.FAudio.DisableSound()}
       else if (!this.FAudio.FLoaded) {
        this.FAudio.FOnLoaded = null;
        this.FAudio.LoadAudio();
      };
      return Result;
    };
    this.DoAudioLoaded = function (Sender) {
      this.Start();
    };
    this.DoResetClick = function (aEvent) {
      var Result = false;
      Result = true;
      this.FDying = true;
      this.StopTimer();
      this.RestartGame();
      return Result;
    };
    this.InitAudio = function () {
      this.FAudio.LoadAudio();
    };
    this.MarkCellsDirty = function () {
      var n = 0;
      var maxn = 0;
      var x = 0;
      var y = 0;
      var i = 0;
      var j = 0;
      maxn = 4;
      if (this.BonusTimer > 0) maxn += 1;
      for (n = 0; n <= 4; n++) {
        x = this.Sprite[n].XY.x;
        y = this.Sprite[n].XY.y;
        for (i = -1; i <= 1; i++) for (j = -1; j <= 1; j++) this.Cells[x + i][y + j].Dirty = true;
      };
    };
    this.SolveMaze = function (P1, P2) {
      var Result = false;
      Result = this.SolveMazeStep1(pas.Types.TPoint.$clone(P1),pas.Types.TPoint.$clone(P2));
      if (Result) Result = this.SolveMazeStep2(pas.Types.TPoint.$clone(P1),pas.Types.TPoint.$clone(P2));
      if (Result) Result = this.SolveMazeStep3(pas.Types.TPoint.$clone(P1),pas.Types.TPoint.$clone(P2));
      return Result;
    };
    this.SolveMazeStep1 = function (P1, P2) {
      var Result = false;
      var x = 0;
      var y = 0;
      for (x = 0; x <= 29; x++) for (y = 0; y <= 32; y++) {
        if (this.Cells[x][y].WallType === $mod.TCell.WallType$a.wtNone) {
          this.Cells[x][y].I = 0}
         else this.Cells[x][y].I = -1;
      };
      Result = (this.Cells[P1.x][P1.y].I === 0) && (this.Cells[P2.x][P2.y].I === 0);
      return Result;
    };
    var SArr2$a$clone = function (a) {
      var b = [];
      b.length = 64;
      for (var c = 0; c < 64; c++) b[c] = pas.Types.TPoint.$clone(a[c]);
      return b;
    };
    this.SolveMazeStep2 = function (P1, P2) {
      var $Self = this;
      var Result = false;
      var SArr1 = rtl.arraySetLength(null,pas.Types.TPoint,64);
      var SArr2 = rtl.arraySetLength(null,pas.Types.TPoint,64);
      var SArr1Cnt = 0;
      var SArr2Cnt = 0;
      var SI = 0;
      var n = 0;
      function AddLS2(x, y) {
        if ((x < 0) || (x >= 30)) return;
        if ((y < 0) || (y >= 33)) return;
        if ($Self.Cells[x][y].I !== 0) return;
        $Self.Cells[x][y].I = SI;
        SArr2[SArr2Cnt].$assign(pas.Types.Point(x,y));
        SArr2Cnt += 1;
        if ((x === P2.x) && (y === P2.y)) Result = true;
      };
      SI = 10;
      Result = false;
      this.Cells[P1.x][P1.y].I = SI;
      SArr1Cnt = 1;
      SArr1[0].$assign(P1);
      do {
        SI += 1;
        SArr2Cnt = 0;
        for (var $l = 0, $end = SArr1Cnt - 1; $l <= $end; $l++) {
          n = $l;
          AddLS2(SArr1[n].x + 1,SArr1[n].y);
          AddLS2(SArr1[n].x,SArr1[n].y + 1);
          AddLS2(SArr1[n].x - 1,SArr1[n].y);
          AddLS2(SArr1[n].x,SArr1[n].y - 1);
        };
        for (var $l1 = 0, $end1 = SArr2Cnt - 1; $l1 <= $end1; $l1++) {
          n = $l1;
          SArr1[n].$assign(SArr2[n]);
        };
        SArr1Cnt = SArr2Cnt;
      } while (!(Result || (SArr2Cnt === 0)));
      return Result;
    };
    this.SolveMazeStep3 = function (P1, P2) {
      var $Self = this;
      var Result = false;
      var Rdy = false;
      var dP = pas.Types.TPoint.$new();
      var I = 0;
      function Check(x, y) {
        var It = 0;
        if ((x < 0) || (x >= 30)) return;
        if ((y < 0) || (y >= 33)) return;
        It = $Self.Cells[x][y].I;
        if ((It > 0) && (It < I)) {
          I = It;
          dP.$assign(pas.Types.Point(x,y));
        };
      };
      do {
        I = this.Cells[P2.x][P2.y].I;
        dP.$assign(P2);
        Check(P2.x + 1,P2.y);
        Check(P2.x - 1,P2.y);
        Check(P2.x,P2.y + 1);
        Check(P2.x,P2.y - 1);
        Rdy = (dP.x === P2.x) && (dP.y === P2.y);
        this.Cells[P2.x][P2.y].I = -this.Cells[P2.x][P2.y].I;
        P2.$assign(dP);
      } while (!Rdy);
      Result = (P2.x === P1.x) && (P2.y === P1.y);
      return Result;
    };
    this.line = function (x1, y1, x2, y2) {
      this.FCanvas.beginPath();
      this.FCanvas.moveTo(x1,y1);
      this.FCanvas.lineTo(x2,y2);
      this.FCanvas.stroke();
    };
    var Sze = 16;
    var HSze = rtl.trunc(16 / 2);
    this.DrawCells = function (DirtyOnly) {
      var $Self = this;
      function DoArc(x, y, r, a1, a2, anti) {
        $Self.FCanvas.beginPath();
        $Self.FCanvas.arc(x,y,r,a1,a2,anti);
        $Self.FCanvas.stroke();
      };
      var x = 0;
      var y = 0;
      var sx = 0;
      var sy = 0;
      var r = 0;
      var $with = this.FCanvas;
      if (DirtyOnly) {
        $with.strokeStyle = $impl.clBlack;
        $with.fillStyle = $impl.clBlack;
        for (x = 0; x <= 29; x++) for (y = 0; y <= 32; y++) if (this.Cells[x][y].Dirty || !DirtyOnly) {
          sx = x * 16;
          sy = y * 16;
          $with.fillRect(sx,sy,16,16);
        };
      } else {
        $with.fillStyle = "black";
        $with.fillRect(0,0,this.FCanvasEl.width,this.FCanvasEl.height);
        if (false) {
          $with.lineWidth = 2;
          $with.strokeStyle = "#202020";
          for (x = 0; x <= 30; x++) this.line(x * 16,0,x * 16,16 * 33);
          for (y = 0; y <= 33; y++) this.line(0,y * 16,16 * 30,y * 16);
        };
      };
      var $with1 = this.FCanvas;
      $with1.strokeStyle = $impl.clWhite;
      $with1.fillStyle = $impl.clWhite;
      for (x = 0; x <= 29; x++) for (y = 0; y <= 32; y++) if (this.Cells[x][y].Dirty || !DirtyOnly) {
        sx = (x * 16) + 8;
        sy = (y * 16) + 8;
        r = 0;
        var $tmp = this.Cells[x][y].PillType;
        if ($tmp === $mod.TCell.PillType$a.ptPill) {
          r = 2}
         else if ($tmp === $mod.TCell.PillType$a.ptSuperPill) r = 6;
        if (r > 0) {
          $with1.beginPath();
          $with1.arc(sx,sy,r,0,2 * Math.PI);
          $with1.fill();
        };
      };
      var $with2 = this.FCanvas;
      $with2.strokeStyle = $impl.clBlue;
      $with2.fillStyle = $impl.clBlue;
      $with2.lineWidth = rtl.trunc(16 / 4);
      for (x = 0; x <= 29; x++) for (y = 0; y <= 32; y++) if (this.Cells[x][y].Dirty || !DirtyOnly) {
        sx = x * 16;
        sy = y * 16;
        var $tmp1 = this.Cells[x][y].WallType;
        if ($tmp1 === $mod.TCell.WallType$a.wtEW) {
          this.line(sx,sy + 8,sx + 16,sy + 8)}
         else if ($tmp1 === $mod.TCell.WallType$a.wtNS) {
          this.line(sx + 8,sy,sx + 8,sy + 16)}
         else if ($tmp1 === $mod.TCell.WallType$a.wtSW) {
          DoArc(sx,sy + 16,16 / 2,0,(3 * Math.PI) / 2,true)}
         else if ($tmp1 === $mod.TCell.WallType$a.wtNE) {
          DoArc(sx + 16,sy,16 / 2,Math.PI / 2,Math.PI,false)}
         else if ($tmp1 === $mod.TCell.WallType$a.wtSE) {
          DoArc(sx + 16,sy + 16,16 / 2,Math.PI,(Math.PI * 3) / 2,false)}
         else if ($tmp1 === $mod.TCell.WallType$a.wtNW) DoArc(sx,sy,16 / 2,0,Math.PI / 2,false);
        this.Cells[x][y].Dirty = false;
      };
    };
    var Radius = 12;
    var Offset = 16;
    var EyeY = (16 * 2) / 3;
    var LeftEyeX = (16 * 2) / 3;
    var RightEyeX = (16 * 4) / 3;
    var MouthRadius = (16 * 1) / 3;
    var EyeRadius = 1.5;
    this.DrawPacman = function () {
      var $Self = this;
      var X = 0.0;
      var Y = 0.0;
      function Pie(aAngle) {
        var aStart = 0.0;
        var aEnd = 0.0;
        if ($Self.PacMouthOpen === 0) {
          aStart = 0;
          aEnd = 2 * Math.PI;
        } else {
          aStart = aAngle + (($Self.PacMouthOpen / 90) * (Math.PI / 2));
          if (aStart > (2 * Math.PI)) aStart = aStart - (2 * Math.PI);
          aEnd = aAngle - (($Self.PacMouthOpen / 90) * (Math.PI / 2));
        };
        var $with = $Self.FCanvas;
        $with.beginPath();
        $with.moveTo(X + 16,Y + 16);
        $with.arc(X + 16,Y + 16,12,aStart,aEnd);
        $with.lineTo(X + 16,Y + 16);
        $with.fill();
      };
      X = (this.Sprite[0].XY.x * 16) - (16 / 2);
      Y = (this.Sprite[0].XY.y * 16) - (16 / 2);
      if (this.PacMouthOpen > 40) {
        this.PacMouthOpenDir = -10}
       else if (this.PacMouthOpen < 2) this.PacMouthOpenDir = 10;
      this.PacMouthOpen += this.PacMouthOpenDir;
      var $with = this.FCanvas;
      $with.fillStyle = $impl.clYellow;
      $with.strokeStyle = $impl.clYellow;
      var $tmp = this.Sprite[0].Dir;
      if ($tmp === "E") {
        Pie(Math.PI)}
       else if ($tmp === "W") {
        Pie(0)}
       else if ($tmp === "N") {
        Pie((3 * Math.PI) / 2)}
       else if ($tmp === "S") {
        Pie(Math.PI / 2)}
       else {
        $with.beginPath();
        $with.arc(X + 16,Y + 16,12,0,2 * Math.PI);
        $with.fill();
        $with.fillStyle = $impl.clBlack;
        $with.strokeStyle = $impl.clBlack;
        $with.beginPath();
        $with.arc(X + 10.666666666666666,Y + 10.666666666666666,1.5,0,2 * Math.PI);
        $with.stroke();
        $with.beginPath();
        $with.arc(X + 21.333333333333332,Y + 10.666666666666666,1.5,0,2 * Math.PI);
        $with.stroke();
        $with.lineWidth = 3;
        $with.beginPath();
        $with.arc(X + 16,Y + 16,5.333333333333333,0,Math.PI);
        $with.stroke();
      };
    };
    this.CheckGameOver = function () {
      if (this.LivesLeft <= 0) {
        this.GameOver()}
       else this.RestartLevel();
    };
    this.StartTimer = function () {
      this.FDying = false;
      this.UpdateStatus("Playing");
      this.SpriteTimer = window.setInterval(rtl.createSafeCallback(this,"DoSpriteTimer"),20);
    };
    this.ShowText = function (aText, OnDone) {
      $impl.TFlashText.$create("Create$1",[this,aText,OnDone]);
    };
    this.UpdateScore = function () {
      if (this.score > this.HiScore) this.HiScore = this.score;
      this.lbScore.innerText = pas.SysUtils.IntToStr(this.score);
      this.lbHiscore.innerText = pas.SysUtils.IntToStr(this.HiScore);
      this.lbLives.innerText = pas.SysUtils.IntToStr(this.LivesLeft);
      this.lbBonusCnt.innerText = pas.SysUtils.IntToStr(this.BonusCnt);
      this.lbGhostCnt.innerText = pas.SysUtils.IntToStr(this.GhostCnt);
    };
    this.UpdateStatus = function (aText) {
      this.lbStatus.innerText = aText;
    };
    this.InitSprite = function (aSprite, aImg, aSpd) {
      aSprite.SpImg = aImg;
      aSprite.SpImg.width = 28;
      aSprite.SpImg.height = 28;
      aSprite.Dir = "-";
      aSprite.Spd = aSpd;
      aSprite.XY.$assign(pas.Types.Point(1,1));
      aSprite.Sx = 0;
      aSprite.Sy = 0;
      aSprite.StartPos.$assign(pas.Types.Point(2,2));
    };
    this.InitSprites = function () {
      var I = 0;
      this.Sprite[0].SpImg = null;
      for (I = 1; I <= 4; I++) this.InitSprite(this.Sprite[I],this.ImgGhost[I],0.2);
      this.Sprite[0].Spd = 0.25;
      this.InitSprite(this.Sprite[5],this.ImgBonus,0.04);
    };
    this.InitVars = function (aField) {
      var x = 0;
      var y = 0;
      var n = 0;
      this.PillsLeft = 0;
      this.score = 0;
      this.LivesLeft = 3;
      this.BonusCnt = 0;
      this.GhostCnt = 0;
      this.Pause = false;
      this.PacMouthOpen = 0;
      this.PacMouthOpenDir = 10;
      for (x = 0; x <= 29; x++) for (y = 0; y <= 32; y++) {
        var $tmp = aField[y].charAt((x + 1) - 1);
        if (($tmp === ".") || ($tmp === "o")) {
          this.PillsLeft += 1}
         else if ($tmp === "P") {
          this.Sprite[0].StartPos.$assign(pas.Types.Point(x,y))}
         else if ($tmp === "1") {
          this.Sprite[1].StartPos.$assign(pas.Types.Point(x,y))}
         else if ($tmp === "2") {
          this.Sprite[2].StartPos.$assign(pas.Types.Point(x,y))}
         else if ($tmp === "3") {
          this.Sprite[3].StartPos.$assign(pas.Types.Point(x,y))}
         else if ($tmp === "4") this.Sprite[4].StartPos.$assign(pas.Types.Point(x,y));
      };
      for (n = 0; n <= 4; n++) this.Sprite[n].XY.$assign(this.Sprite[n].StartPos);
      this.ScareTimer = 0;
      this.BonusTimer = 0;
    };
    var wsH = rtl.createSet(45,92,47);
    var wsV = rtl.createSet(124,92,47);
    this.InitCells = function (aField) {
      var x = 0;
      var y = 0;
      var c = "";
      for (y = 0; y <= 32; y++) for (x = 0; x <= 29; x++) {
        c = aField[y].charAt((x + 1) - 1);
        var $tmp = c;
        if ($tmp === "|") {
          this.Cells[x][y].WallType = $mod.TCell.WallType$a.wtNS}
         else if ($tmp === "-") {
          this.Cells[x][y].WallType = $mod.TCell.WallType$a.wtEW}
         else if ($tmp === "\\") {
          if ((aField[y].charCodeAt(x - 1) in wsH) && (aField[y + 1].charCodeAt((x + 1) - 1) in wsV)) {
            this.Cells[x][y].WallType = $mod.TCell.WallType$a.wtSW}
           else this.Cells[x][y].WallType = $mod.TCell.WallType$a.wtNE}
         else if ($tmp === "\/") {
          if ((aField[y].charCodeAt((x + 2) - 1) in wsH) && (aField[y + 1].charCodeAt((x + 1) - 1) in wsV)) {
            this.Cells[x][y].WallType = $mod.TCell.WallType$a.wtSE}
           else this.Cells[x][y].WallType = $mod.TCell.WallType$a.wtNW}
         else if ($tmp === "x") {
          this.Cells[x][y].WallType = $mod.TCell.WallType$a.wtNoGo}
         else {
          this.Cells[x][y].WallType = $mod.TCell.WallType$a.wtNone;
        };
        var $tmp1 = c;
        if ($tmp1 === ".") {
          this.Cells[x][y].PillType = $mod.TCell.PillType$a.ptPill}
         else if ($tmp1 === "o") {
          this.Cells[x][y].PillType = $mod.TCell.PillType$a.ptSuperPill}
         else {
          this.Cells[x][y].PillType = $mod.TCell.PillType$a.ptNone;
        };
      };
    };
    this.SetGhostScared = function (aScared) {
      var $Self = this;
      function DoImg(Idx, aImg, aSpeed) {
        $Self.Sprite[Idx].SpImg = aImg;
        $Self.Sprite[Idx].Spd = aSpeed;
      };
      var i = 0;
      if (aScared) {
        for (i = 1; i <= 4; i++) DoImg(i,this.ImgGhost[5],0.1);
      } else {
        for (i = 1; i <= 4; i++) DoImg(i,this.ImgGhost[i],0.2);
      };
    };
    this.GetGhostDir = function (aXY, aOldDir) {
      var Result = "";
      var BestDir = "";
      var D = "";
      var s = "";
      Result = "-";
      s = this.GetPossibleDir(pas.Types.TPoint.$clone(aXY));
      var $tmp = aOldDir;
      if ($tmp === "W") {
        D = "E"}
       else if ($tmp === "E") {
        D = "W"}
       else if ($tmp === "S") {
        D = "N"}
       else if ($tmp === "N") {
        D = "S"}
       else {
        D = "-";
      };
      if (s.length > 1) {
        BestDir = this.GetBestDir(pas.Types.TPoint.$clone(aXY));
        if ((this.ScareTimer === 0) && (BestDir !== "-")) {
          if (Math.random() < 0.5) s = BestDir;
        } else {
          pas.System.Delete({get: function () {
              return s;
            }, set: function (v) {
              s = v;
            }},pas.System.Pos(BestDir,s),1);
        };
      };
      if ((s.length > 1) && (pas.System.Pos(D,s) !== 0)) pas.System.Delete({get: function () {
          return s;
        }, set: function (v) {
          s = v;
        }},pas.System.Pos(D,s),1);
      if (s.length === 1) Result = s.charAt(0);
      if (s.length > 1) Result = s.charAt((1 + pas.System.Random(s.length)) - 1);
      return Result;
    };
    this.GetBestDir = function (aXY) {
      var Result = "";
      Result = "-";
      if (this.SolveMaze(pas.Types.TPoint.$clone(aXY),pas.Types.TPoint.$clone(this.Sprite[0].XY))) {
        if (this.Cells[aXY.x][aXY.y - 1].I < -10) Result = "N";
        if (this.Cells[aXY.x - 1][aXY.y].I < -10) Result = "E";
        if (this.Cells[aXY.x][aXY.y + 1].I < -10) Result = "S";
        if (this.Cells[aXY.x + 1][aXY.y].I < -10) Result = "W";
      };
      return Result;
    };
    this.GetPossibleDir = function (aXY) {
      var Result = "";
      Result = "";
      if (this.Cells[aXY.x][aXY.y - 1].WallType === $mod.TCell.WallType$a.wtNone) Result = Result + "N";
      if (this.Cells[aXY.x - 1][aXY.y].WallType === $mod.TCell.WallType$a.wtNone) Result = Result + "E";
      if (this.Cells[aXY.x][aXY.y + 1].WallType === $mod.TCell.WallType$a.wtNone) Result = Result + "S";
      if (this.Cells[aXY.x + 1][aXY.y].WallType === $mod.TCell.WallType$a.wtNone) Result = Result + "W";
      return Result;
    };
    this.GetPacmanDir = function (aXY, aOldDir) {
      var Result = "";
      var s = "";
      s = this.GetPossibleDir(pas.Types.TPoint.$clone(aXY));
      if (pas.System.Pos(this.PacmanDir,s) > 0) {
        s = this.PacmanDir}
       else if (pas.System.Pos(aOldDir,s) > 0) {
        s = aOldDir}
       else s = "-";
      Result = s.charAt(0);
      return Result;
    };
    this.GetRandomCellAndDir = function (aXY, aDir) {
      do {
        aXY.$assign(pas.Types.Point(1 + pas.System.Random(30 - 3),pas.System.Random(33 - 3)));
      } while (!(this.Cells[aXY.x][aXY.y].WallType === $mod.TCell.WallType$a.wtNone));
      aDir.set(this.GetGhostDir(pas.Types.TPoint.$clone(aXY),"-"));
    };
    this.StopTimer = function () {
      window.clearInterval(this.SpriteTimer);
    };
    this.EatPill = function (aXY) {
      this.score += 1;
      this.ClearCell(pas.Types.TPoint.$clone(aXY));
      this.PillsLeft -= 1;
      this.UpdateScore();
      this.PlaySound($mod.TAudio.aEatPill);
      if (this.PillsLeft === 0) this.NextLevel();
    };
    this.EatSuperPill = function (aXY) {
      this.ClearCell(pas.Types.TPoint.$clone(aXY));
      this.ScareTimer = 300;
      this.score += 10;
      this.PlaySound($mod.TAudio.aEatPill);
      this.UpdateScore();
      this.PillsLeft -= 1;
      if (this.PillsLeft === 0) this.NextLevel();
    };
    this.EatBonus = function () {
      this.BonusTimer = 0;
      this.score += 50;
      this.BonusCnt += 1;
      this.UpdateScore();
    };
    this.EatGhost = function (aGhost) {
      this.PlaySound($mod.TAudio.aEatGhost);
      aGhost.XY.$assign(aGhost.StartPos);
      this.score += 20;
      this.GhostCnt += 1;
      this.UpdateScore();
    };
    this.ClearCell = function (aXY) {
      var sx = 0;
      var sy = 0;
      this.Cells[aXY.x][aXY.y].PillType = $mod.TCell.PillType$a.ptNone;
      this.FCanvas.fillStyle = $impl.clBlack;
      sx = aXY.x * 16;
      sy = aXY.y * 16;
      this.FCanvas.fillRect(sx,sy,16,16);
    };
    this.MoveSprite = function (aSpriteInx) {
      var oXY = pas.Types.TPoint.$new();
      var $with = this.Sprite[aSpriteInx];
      oXY.$assign($with.XY);
      var $tmp = $with.Dir;
      if ($tmp === "N") {
        $with.Sy = $with.Sy - $with.Spd;
        if ($with.Sy <= -1) {
          $with.XY.y -= 1;
          $with.Sy = $with.Sy + 1;
        };
      } else if ($tmp === "E") {
        $with.Sx = $with.Sx - $with.Spd;
        if ($with.Sx <= -1) {
          $with.XY.x -= 1;
          $with.Sx = $with.Sx + 1;
        };
      } else if ($tmp === "S") {
        $with.Sy = $with.Sy + $with.Spd;
        if ($with.Sy >= 1) {
          $with.XY.y += 1;
          $with.Sy = $with.Sy - 1;
        };
      } else if ($tmp === "W") {
        $with.Sx = $with.Sx + $with.Spd;
        if ($with.Sx >= 1) {
          $with.XY.x += 1;
          $with.Sx = $with.Sx - 1;
        };
      } else {
        oXY.$assign(pas.Types.Point(0,0));
        $with.Sx = 0;
        $with.Sy = 0;
      };
      if (($with.XY.x !== oXY.x) || ($with.XY.y !== oXY.y)) {
        if (aSpriteInx === 0) {
          $with.Dir = this.GetPacmanDir(pas.Types.TPoint.$clone($with.XY),$with.Dir)}
         else $with.Dir = this.GetGhostDir(pas.Types.TPoint.$clone($with.XY),$with.Dir);
        if ($with.Dir.charCodeAt() in rtl.createSet(69,87)) {
          $with.Sy = 0}
         else $with.Sx = 0;
        if (aSpriteInx === 0) this.CollisionDetect($with.XY);
      };
      if ($with.XY.x > (30 - 3)) $with.XY.x = 2;
      if ($with.XY.x < 2) $with.XY.x = 30 - 3;
      if ($with.XY.y > (33 - 3)) $with.XY.y = 2;
      if ($with.XY.y < 2) $with.XY.y = 33 - 3;
      if (aSpriteInx !== 0) this.FCanvas.drawImage($with.SpImg,(($with.XY.x + $with.Sx + 0.5) * 16) - ($with.SpImg.width / 2),(($with.XY.y + $with.Sy + 0.5) * 16) - ($with.SpImg.height / 2));
    };
    this.DoBonusTimer = function () {
      var Result = false;
      var S = "";
      var w = 0;
      if (this.BonusTimer >= 0) {
        this.BonusTimer -= 1;
        if (this.BonusTimer <= 0) {
          this.BonusTimer = -500 - pas.System.Random(500);
        };
      } else {
        this.BonusTimer += 1;
        if (this.BonusTimer >= 0) {
          this.GetRandomCellAndDir(this.Sprite[5].XY,{p: this.Sprite[5], get: function () {
              return this.p.Dir;
            }, set: function (v) {
              this.p.Dir = v;
            }});
          this.BonusTimer = +300 + pas.System.Random(300);
        };
      };
      S = "background-color: ";
      w = rtl.trunc((this.BonusTimer * Math.round(this.pnBonusBarOuter.clientWidth)) / (2 * 300));
      if (this.BonusTimer > 0) {
        S = S + $impl.clLime + "; width: " + pas.SysUtils.IntToStr(w) + "px;"}
       else S = S + $impl.clRed + "; width: 0px;";
      this.pnBonusBarInner.setAttribute("style",S);
      Result = this.BonusTimer > 0;
      return Result;
    };
    this.DoScareTimer = function () {
      var S = "";
      var w = 0;
      if (this.ScareTimer >= 300) this.SetGhostScared(true);
      if (this.ScareTimer > 0) {
        this.ScareTimer -= 1;
        if (this.ScareTimer === 0) this.SetGhostScared(false);
        if (this.ScareTimer > rtl.trunc(300 / 5)) {
          S = "background-color: " + $impl.clLime}
         else S = "background-color: " + $impl.clRed;
        w = rtl.trunc((this.ScareTimer * this.pnScareBarOuter.clientWidth) / 300);
        S = S + "; width: " + pas.SysUtils.IntToStr(w) + "px;";
        this.pnScareBarInner.setAttribute("style",S);
      };
    };
    this.DrawScene = function () {
      var I = 0;
      this.DrawCells(false);
      for (I = 0; I <= 4; I++) this.MoveSprite(I);
      this.DrawPacman();
    };
    this.CollisionDetect = function (aXY) {
      var n = 0;
      var ix = 0;
      var dX = 0;
      var dY = 0;
      var $tmp = this.Cells[aXY.x][aXY.y].PillType;
      if ($tmp === $mod.TCell.PillType$a.ptPill) {
        this.EatPill(pas.Types.TPoint.$clone(aXY))}
       else if ($tmp === $mod.TCell.PillType$a.ptSuperPill) this.EatSuperPill(pas.Types.TPoint.$clone(aXY));
      ix = 0;
      for (n = 1; n <= 5; n++) {
        dX = this.Sprite[n].XY.x - aXY.x;
        dY = this.Sprite[n].XY.y - aXY.y;
        if ((Math.abs(dX) <= 1) && (Math.abs(dY) <= 1)) ix = n;
      };
      if ((ix === 5) && (this.BonusTimer > 0)) this.EatBonus();
      if (ix in rtl.createSet(null,1,4)) {
        if (this.ScareTimer > 0) {
          this.EatGhost(this.Sprite[ix])}
         else this.PacmanDies();
      };
    };
    this.RestartGame = function () {
      this.InitVars($impl.Level1Field.slice(0));
      this.InitCells($impl.Level1Field.slice(0));
      this.RestartLevel();
      this.UpdateStatus("Playing");
    };
    this.RestartLevel = function () {
      var n = 0;
      for (n = 0; n <= 4; n++) this.Sprite[n].XY.$assign(this.Sprite[n].StartPos);
      this.UpdateScore();
      this.SetGhostScared(false);
      this.DrawScene();
      this.PacmanDir = "-";
      this.DrawPacman();
      this.PlaySound($mod.TAudio.aStart);
      this.ShowText("GET READY !!!",rtl.createCallback(this,"StartTimer"));
      this.PacmanDir = "-";
    };
    this.PacmanDies = function () {
      if (this.FDying) return;
      this.FDying = true;
      this.StopTimer();
      this.PlaySound($mod.TAudio.aDie);
      this.LivesLeft -= 1;
      this.UpdateScore();
      this.PacmanDir = "-";
      this.UpdateStatus("You died");
      this.ShowText("YOU DIE !!!",rtl.createCallback(this,"CheckGameOver"));
    };
    this.NextLevel = function () {
      this.StopTimer();
      this.ShowText("YOU WIN !!!",rtl.createCallback(this,"RestartGame"));
      this.UpdateStatus("You win Max");
    };
    this.GameOver = function () {
      this.ShowText("YOU LOST !!!",rtl.createCallback(this,"RestartGame"));
      this.UpdateStatus("You lost Max");
    };
    this.PlaySound = function (aAudio) {
      if (!this.FAudioDisabled && this.FAudio.FLoaded) this.FAudio.play(aAudio);
    };
    this.DoSpriteTimer = function () {
      var n = 0;
      if (this.Pause === false) {
        this.MarkCellsDirty();
        this.DrawCells(true);
        for (n = 0; n <= 4; n++) this.MoveSprite(n);
        if (this.DoBonusTimer()) this.MoveSprite(5);
        this.DoScareTimer();
        this.DrawPacman();
      };
    };
    this.HandleKeyPress = function (k) {
      var Result = false;
      var aCode = "";
      Result = true;
      if (this.FDying) return Result;
      aCode = k.key;
      if (aCode === "") aCode = k.code;
      var $tmp = aCode;
      if (($tmp === "Right") || ($tmp === pas.Web.TJSKeyNames.ArrowRight)) {
        this.PacmanDir = "W"}
       else if (($tmp === "Up") || ($tmp === pas.Web.TJSKeyNames.ArrowUp)) {
        this.PacmanDir = "N"}
       else if (($tmp === "Left") || ($tmp === pas.Web.TJSKeyNames.ArrowLeft)) {
        this.PacmanDir = "E"}
       else if (($tmp === "Down") || ($tmp === pas.Web.TJSKeyNames.ArrowDown)) {
        this.PacmanDir = "S"}
       else if (($tmp === "P") || ($tmp === "KeyP")) this.Pause = !this.Pause;
      k.preventDefault();
      return Result;
    };
    var SControl = "control-";
    this.DoMouseClick = function (aEvent) {
      var Result = false;
      var S = "";
      Result = true;
      S = aEvent.currentTarget.id;
      aEvent.preventDefault();
      if (pas.System.Copy(S,1,SControl.length) === SControl) {
        pas.System.Delete({get: function () {
            return S;
          }, set: function (v) {
            S = v;
          }},1,SControl.length);
        var $tmp = S;
        if ($tmp === "left") {
          this.PacmanDir = "E"}
         else if ($tmp === "right") {
          this.PacmanDir = "W"}
         else if ($tmp === "down") {
          this.PacmanDir = "S"}
         else if ($tmp === "up") {
          this.PacmanDir = "N"}
         else if ($tmp === "pause") this.Pause = !this.Pause;
      };
      return Result;
    };
    this.Create$1 = function (aOwner) {
      pas.Classes.TComponent.Create$1.apply(this,arguments);
      this.FAudioDisabled = true;
      this.FAudio = $mod.TPacmanAudio.$create("Create");
      this.FAudio.FOnLoaded = rtl.createCallback(this,"DoAudioLoaded");
      this.SetupPacman();
      return this;
    };
    this.SetupPacman = function () {
      var $Self = this;
      function GetElement(aName) {
        var Result = null;
        Result = document.getElementById(aName);
        return Result;
      };
      var I = 0;
      var El = null;
      if (this.FCanvasID === "") this.FCanvasID = "my-canvas";
      if (this.FResetID === "") this.FResetID = "btn-reset";
      this.FCanvasEl = document.getElementById(this.FCanvasID);
      this.FCanvas = this.FCanvasEl.getContext("2d");
      this.FBtnReset = document.getElementById(this.FResetID);
      this.FCBXSound = GetElement("cbx-sound");
      this.FCBXSound.onchange = rtl.createSafeCallback($Self,"CheckSound");
      if (this.FBtnReset != null) this.FBtnReset.onclick = rtl.createSafeCallback($Self,"DoResetClick");
      this.FCanvasEl.width = Math.round(this.FCanvasEl.offsetWidth);
      this.FCanvasEl.height = Math.round(this.FCanvasEl.offsetHeight);
      for (I = 1; I <= 4; I++) this.ImgGhost[I] = GetElement("ghost" + pas.SysUtils.IntToStr(I));
      this.ImgGhost[5] = GetElement("ghost-scared");
      this.ImgBonus = GetElement("cherry");
      for (I = 1; I <= 5; I++) {
        El = GetElement("control-" + $mod.ControlNames[I - 1]);
        if (El != null) El.onclick = rtl.createSafeCallback($Self,"DoMouseClick");
      };
      this.pnBonusBarOuter = GetElement("bonus-outer");
      this.pnBonusBarInner = GetElement("bonus-inner");
      this.pnScareBarOuter = GetElement("scare-outer");
      this.pnScareBarInner = GetElement("scare-inner");
      this.lbScore = GetElement("score");
      this.lbStatus = GetElement("status");
      this.lbHiscore = GetElement("highscore");
      this.lbLives = GetElement("lives");
      this.lbBonusCnt = GetElement("bonus");
      this.lbGhostCnt = GetElement("ghosts");
      this.InitSprites();
      document.onkeydown = rtl.createSafeCallback($Self,"HandleKeyPress");
      if (!this.FAudioDisabled) this.InitAudio();
    };
    this.Start = function () {
      this.RestartGame();
    };
  });
  $mod.$implcode = function () {
    $impl.CellSize = 16;
    $impl.GhostSpeedScared = 0.10;
    $impl.GhostSpeedNormal = 0.20;
    $impl.PacmanSpeed = 0.25;
    $impl.BonusSpeed = 0.04;
    $impl.BonusTimeOut1 = 500;
    $impl.BonusTimeOut2 = 300;
    $impl.ScareTimeOut = 300;
    $impl.HuntFactor = 0.5;
    $impl.AudioNames = ["start","die","eatghost","eatpill"];
    $impl.Level1Field = ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","x\/------------\\\/------------\\x","x|............||............|x","x|.\/--\\.\/---\\.||.\/---\\.\/--\\.|x","x|o|xx|.|xxx|.||.|xxx|.|xx|o|x","x|.\\--\/.\\---\/.\\\/.\\---\/.\\--\/.|x","x|..........................|x","x|.\/--\\.\/\\.\/------\\.\/\\.\/--\\.|x","x|.\\--\/.||.\\--\\\/--\/.||.\\--\/.|x","x|......||....||....||......|x","x\\----\\.|\\--\\ || \/--\/|.\/----\/x","xxxxxx|.|\/--\/ \\\/ \\--\\|.|xxxxxx","xxxxxx|.||          ||.|xxxxxx","xxxxxx|.|| \/--  --\\ ||.|xxxxxx","------\/.\\\/ | 1 3  | \\\/.\\------","       .   |  2 4 |   .       ","------\\.\/\\ |      | \/\\.\/------","xxxxxx|.|| \\------\/ ||.|xxxxxx","xxxxxx|.||          ||.|xxxxxx","xxxxxx|.|| \/------\\ ||.|xxxxxx","x\/----\/.\\\/ \\--\\\/--\/ \\\/.\\----\\x","x|............||............|x","x|.\/--\\.\/---\\.||.\/---\\.\/--\\.|x","x|.\\-\\|.\\---\/.\\\/.\\---\/.|\/-\/.|x","x|o..||.......P........||..o|x","x\\-\\.||.\/\\.\/------\\.\/\\.||.\/-\/x","x\/-\/.\\\/.||.\\--\\\/--\/.||.\\\/.\\-\\x","x|......||....||....||......|x","x|.\/----\/\\--\\.||.\/--\/\\----\\.|x","x|.\\--------\/.\\\/.\\--------\/.|x","x|..........................|x","x\\--------------------------\/x","xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"];
    $impl.clBlack = "black";
    $impl.clWhite = "white";
    $impl.clRed = "red";
    $impl.clYellow = "#FFFF00";
    $impl.clBlue = "blue";
    $impl.clLime = "lime";
    rtl.createClass($impl,"TFlashText",pas.System.TObject,function () {
      this.$init = function () {
        pas.System.TObject.$init.call(this);
        this.FPacMan = null;
        this.FText = "";
        this.FFlashInterval = 0;
        this.FCount = 0;
        this.FonDone = null;
      };
      this.$final = function () {
        this.FPacMan = undefined;
        this.FonDone = undefined;
        pas.System.TObject.$final.call(this);
      };
      this.DoFlash = function () {
        var x = 0;
        var y = 0;
        var FS = null;
        if ((this.FCount % 2) === 0) {
          this.FPacMan.FCanvas.fillStyle = $impl.clRed}
         else this.FPacMan.FCanvas.fillStyle = $impl.clYellow;
        this.FPacMan.FCanvas.font = "40px Roboto";
        FS = this.FPacMan.FCanvas.measureText(this.FText);
        x = rtl.trunc(this.FPacMan.FCanvasEl.width / 2) - rtl.trunc(Math.round(FS.width) / 2);
        y = rtl.trunc(this.FPacMan.FCanvasEl.height / 2) - 20;
        this.FPacMan.FCanvas.fillText(this.FText,x,y);
        this.FCount += 1;
        if (this.FCount >= 10) {
          window.clearInterval(this.FFlashInterval);
          this.FPacMan.DrawScene();
          if (this.FonDone != null) this.FonDone();
          this.Free();
        };
      };
      this.Create$1 = function (aPacMan, aText, aOnDone) {
        this.FPacMan = aPacMan;
        this.FText = aText;
        this.FonDone = aOnDone;
        this.DoFlash();
        this.FFlashInterval = window.setInterval(rtl.createSafeCallback(this,"DoFlash"),150);
        return this;
      };
    });
  };
},[]);
rtl.module("program",["System","browserapp","JS","Classes","SysUtils","Web","upacman"],function () {
  "use strict";
  var $mod = this;
  rtl.createClass(this,"TMyApplication",pas.browserapp.TBrowserApplication,function () {
    this.$init = function () {
      pas.browserapp.TBrowserApplication.$init.call(this);
      this.FPacMan = null;
    };
    this.$final = function () {
      this.FPacMan = undefined;
      pas.browserapp.TBrowserApplication.$final.call(this);
    };
    this.DoRun = function () {
      this.FPacMan = pas.upacman.TPacman.$create("Create$1",[this]);
      this.FPacMan.Start();
      this.Terminate();
    };
    var $r = this.$rtti;
    $r.addField("FPacMan",pas.upacman.$rtti["TPacman"]);
    $r.addMethod("DoRun",0,[]);
  });
  this.Application = null;
  $mod.$main = function () {
    $mod.Application = $mod.TMyApplication.$create("Create$1",[null]);
    $mod.Application.Initialize();
    $mod.Application.Run();
  };
});
