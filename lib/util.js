

var {promised} = require('sdk/core/promise');
var window = require("sdk/window/utils").getMostRecentBrowserWindow();
var paths = require("./paths");

var {Ci, Cc} = require('chrome');
fp = Ci.nsIFilePicker;
var filePicker = Cc["@mozilla.org/filepicker;1"]
    .createInstance(fp);

exports.getAddr = function getAddr(data, domain){
    function promise (resolve, reject){
        var domain = data.domain.match(/\/\/([^:\/?#]*)/)[1];

        paths.hasPath(data.pathKey, domain)
        .then(function(addr){
            if(OS.File(addr).isDir){
                /* follow the given path */
                if (path instanceof 'Array'){
                    for(var i=0; i < data.path.length; i++){
                        addr = OS.Path.join(addr, data.path[i]);
                    }
                }
                else{
                    addr = OS.Path.join(addr, data.path);
                }
                resolve(addr);
            }
            else{
                /* not a dir, do nothing with the path */
                resolve(addr);
            }
        });
    }
    return new Promise(promise);
};

exports.promptPath = function promptPath(data){
    function promise(resolve, reject){
        data = data || {};
        data.mode = data.mode || 'modeGetFolder';
        filePicker.init(window, 'Select a working path for this application', fp[data.mode]);
        if(data.filter){
            filePicker.appendFilter(data.filterLabel, data.filter);
            filePicker.appendFilters(data.filterLabel);
        }
        filePicker.open(function(res){
            if(res === 0){
                if(data.mode == 'modeOpenMultiple'){
                    var files = filePicker.files;
                    var paths;
                    for(var i=0; i < files.length; i++){
                        paths[i] = files[i].paths;
                    }
                    resolve(paths);
                }
                else{
                    console.log('file picked ', filePicker.file.path);
                    resolve(filePicker.file.path);
                }
            }
        });
    }

    return new Promise(promise);
};