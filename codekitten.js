var CodeKitten = (function(){
  // --------------------------------------
  // we just need the "each" function of underscore, so we'll roll our own.
  var _ = _||{};
  if(!_.each){
    var breaker = {};
    var ArrayProto     = Array.prototype;
    var ObjProto       = Object.prototype;
    var nativeForEach  = ArrayProto.forEach;
    var hasOwnProperty = ObjProto.hasOwnProperty;
    _.each = _.forEach = function(obj, iterator, context) {
      if (obj === null) return;
      if (nativeForEach && obj.forEach === nativeForEach) {
        obj.forEach(iterator, context);
      } else if (obj.length === +obj.length) {
        for (var i = 0, l = obj.length; i < l; i++) {
          if (iterator.call(context, obj[i], i, obj) === breaker) return;
        }
      } else {
        for (var key in obj) {
          if (_.has(obj, key)) {
            if (iterator.call(context, obj[key], key, obj) === breaker) return;
          }
        }
      }
    };
    _.has = function(obj, key) {
      return hasOwnProperty.call(obj, key);
    };
  }
  self._ = _;
  // --------------------------------------
  var running = false;
  return {
    find: function(name, txt, minLinesRepeated, maxToReport, progFn){
      if(running) return;
      running = true;
      var localTxt = txt+"\n";
      minLinesRepeated = minLinesRepeated||3;
      var maxLinesRepeated = 15;
      maxToReport      = (maxToReport===undefined)?3:maxToReport; 
      var minToCount   = 7; // min line length in set to be countable.
      var txtArrayOrig = localTxt.split("\n");
      // get multiline comment and prepend comment string on each...
      var localTxt2    = localTxt;
      localTxt2 = localTxt2.replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/g,
        function(match, contents, offset, s){
          var newMatch = "/"+match.replace(/\n/g, "\n//");
          return newMatch;
      });
      // okay, not do array manipulation.
      var txtArray     = localTxt2.split("\n");
      // 1. pre-process (trim whitespace. replace common swappables);
      for(var i=0; i<txtArray.length; i++){
        //txtArray[i] = $.trim(txtArray[i]);
        txtArray[i] = txtArray[i].replace(/(\'|\")/g, "\'");
        txtArray[i] = txtArray[i].replace(/\/\/.*/g, ""); // comment
        txtArray[i] = txtArray[i].replace(/(\s|\;|\,)/g, "").toLowerCase();
      }
      // 2. do search
      var scores = {}; // scores[linesused][atline] = val
      var linesToUse_Cap = Math.min(txtArray.length/2, maxLinesRepeated);
      var linePercent = 1.0/(linesToUse_Cap-minLinesRepeated+1);
      for(var linesToUse=minLinesRepeated; linesToUse < linesToUse_Cap; linesToUse++){
        var pComplete = 1.0*(linesToUse-minLinesRepeated)/(linesToUse_Cap-minLinesRepeated+0.01);
        if(progFn){
          progFn({progress: pComplete});
        }
        var initAtLine = txtArray.length-linesToUse-1;
        for(var atLine=initAtLine; atLine>=0 ; atLine--){
          if(atLine%500 === 0 && progFn){
            var pComplete2 = pComplete + (initAtLine-atLine)/initAtLine*linePercent;
            progFn({progress: pComplete2});
          }
          for(var compLine=atLine+linesToUse; compLine<txtArray.length-linesToUse; compLine++){
            var matched = false;
            var gtCount = true;
            for(var l=0; l<linesToUse; l++){
              if(txtArray[atLine+l].length < minToCount){
                gtCount = false;
              }
              if(txtArray[atLine+l] === txtArray[compLine+l]){
                matched = true;
              }else{
                matched = false;
                break;
              }  
            }
            if(matched && gtCount){
              scores[linesToUse] = scores[linesToUse]||{};
              scores[linesToUse][atLine] = scores[linesToUse][atLine]||[];
              scores[linesToUse][atLine].push(compLine);
              // now remove any matches that are subsets.
              for(var ltu=1; ltu<linesToUse; ltu++){
                for(var d=0; d<ltu; d++){
                  if(scores[ltu] && scores[ltu][atLine+d]){
                    delete scores[ltu][atLine+d];
                  }
                }
              }
              // now remove any matches that are multiples.
              for(var cl=0; cl<scores[linesToUse][atLine].length; cl++){
                if(scores[ltu] && scores[ltu][scores[linesToUse][atLine][cl]]){
                  //console.log("removing multiple via compline: "+scores[ltu][scores[linesToUse][atLine][cl]]);
                  delete scores[ltu][scores[linesToUse][atLine][cl]];
                }
              }
            }
          }
        }
      }
      //console.log(scores);
      var matches = [];
      _.each(scores, function(atcomp, linesToUse){
        _.each(atcomp, function(compLines, atLine){
          matches.push({linesToUse: linesToUse, compLines: compLines, atLine: atLine});
        });
      });
      matches.sort(function(a,b){
        if(parseInt(a.linesToUse,10) > parseInt(b.linesToUse,10)){
          return -1;
        }
        if(parseInt(a.linesToUse,10) < parseInt(b.linesToUse,10)){
          return 1;
        }
        if(a.compLines.length > b.compLines.length){
          return -1;
        }
        if(a.compLines.length < b.compLines.length){
          return 1;
        }
        return 0;
      });
      running = false;
      return {progress: 1, matches: matches, txtArrayOrig: txtArrayOrig, maxToReport: maxToReport, name: name};
    },
    print: function(a){
      var matches       = a.matches;
      var txtArrayOrig  = a.txtArrayOrig;
      var maxToReport   = a.maxToReport;
      var name          = a.name;
      for(var i=0; i<matches.length && i<maxToReport; i++){
        console.log("Code repeat ["+name+"] > @ line:"+matches[i].atLine+" for "+matches[i].linesToUse+" lines,  there are "+matches[i].compLines.length+" other occurances starting @ lines:", matches[i].compLines);
        var from = parseInt(matches[i].atLine,10);
        var to   = from+parseInt(matches[i].linesToUse,10);
        console.log("--- snippet ---\n"+txtArrayOrig.slice(from, to).join("\n")+"\n-----------------");
      }
    }
  };
})();
  
// websocket-safe test.
//setTimeout(function(){
//  var a = CodeKitten.find("_TEST_", "asdfasdf\nasdfasdf\nasdfasdfg\nadf\nasdfasdf\nasdfasdf",1,3);
//  CodeKitten.print(a);
//}, 1000);

// FOR USE AS A WEB WORKER! :)
self.addEventListener('message', function(e) {
  var d = e.data;
  var state = CodeKitten.find(d.name, d.code, d.minLinesRepeated, d.maxToReport, self.postMessage);
  self.postMessage(state);
});
self.console = {};
self.console.log = function(o){
  self.postMessage({fn:"log", obj: o});
};






