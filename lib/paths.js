
var { indexedDB, IDBKeyRange } = require('sdk/indexed-db');


exports.checkDB = function () {
    var conn = indexedDB.open("domain-paths", "1");

    conn.onupgradeneeded = function(event) {
        console.log('The database needs to be upgraded');
        var db = conn.result;

        db.onerror = function(event) {
            console.error('Error opening database.');
            db.close();
            return;
        };

        db.onabort = function(event) {
            console.error('Database opening aborted!');
            db.close();
            return;
        };
        if(!db.objectStoreNames.contains('domain-paths')) {
            console.log('Upgrading Database...');
            var store = db.createObjectStore('domain-paths', {keyPath:'domain'});
            store.createIndex("paths", "paths", { unique: false });
            store.createIndex("domain", "domain", { unique: false });
        }

        db.onversionchange = function(event) {
            db.close();
            console.log('The database version has been updated; you should refresh this browser window.');
            return;
        };
    };
    return;
}

function open () {
    function promise(resolve, reject){
        var conn = indexedDB.open("domain-paths", "1");

        conn.onsuccess = function(ev) {
            db = ev.target.result;
            db.onerror = function(ev) {
                db.close();
                reject(new Error('Error opening database: ', ev.value));
            }

            resolve(db);
        };
    }

    return new Promise(promise);
}

exports.addPath = function addPath(path, domain) {

    function promise(resolve, reject){
        open()
        .then(lookup)
        .then(resolve);
    }

    function lookup(db){
        function promise(resolve, reject){
            var trans = db.transaction(['domain-paths'], "readwrite")
                .objectStore('domain-paths');
            var get = trans.get(domain);
            get.onsuccess = function(){
                write(trans, get, db)
                .then(resolve);
            };
            get.onerror = function(ev) {
                db.close();
                reject(new Error('Transaction failed: ', ev.value));
            };
        }

        return new Promise(promise);
    }

    function write(trans, get, db){
        function promise(resolve, reject){
            var key = Date.now();
            var res = get.result || {};
            var paths = res.paths || {};

            if(res.length){
                // looking for duplicated domain-path relationship
                var k;
                for(k in paths){
                    if(paths[k].path == path){
                        delete paths[k];
                        break;
                    }
                }
            }
            else{
                // creating new path list for this domain
                res.domain = domain;
                res.paths = paths;
            }

            paths[key] = {
                path: path,
                lastAccess: key
            };
            var update = trans.put(res);

            update.onsuccess = function(){
                db.close();
                resolve(key);
            };
            update.error = function(ev) {
                db.close();
                reject(new Error('Transaction failed: ', ev.value));
            };
        }

        return new Promise(promise);
    }

    return new Promise(promise);
};

exports.hasPath = function hasPath(key, domain) {

    function promise(resolve, reject){
        open()
        .then(function(db){
            var trans = db.transaction(['domain-paths'], "readwrite")
                .objectStore('domain-paths');
            var get = trans.get(domain);

            get.onsuccess = function(ev) {
                var res = get.result;
                var paths = res.paths;
                if(res && paths[key]){
                    //path found for this domain
                    paths[key].lastAccess = Date.now();

                    var update = trans.put(res);
                    update.onerror = function(ev){
                        /* ToDo: handle error */
                        db.close();
                        reject(new Error('Update failed: ', ev.value));
                    }

                    update.onsuccess = function(ev){
                        db.close();
                        resolve(paths[key].path);
                    }
                }
                else{
                    db.close();
                    reject(new Error('Denied access'));
                }
            };

            get.onerror = function(ev) {
                console.error();
                db.close();
                reject(new Error('Lookup failed: ' +ev.value));
            };
        });
    }

    return new Promise(promise);
};

exports.revoke = function revoke(domain, key, callback){
        
    function remove (db) {

        var trans = db.transaction(['domain-paths'], "readwrite")
            .objectStore('domain-paths');
        var get = trans.get(domain);

        get.onsuccess = function(ev) {
            console.log('Removing...');
            var res = get.result;
            var paths = res.paths;
            if(paths[key]){
                delete paths[key];
            }
            var update = trans.put(res);
            update.onsuccess = function(){
                db.close();
                callback();
            }
            update.onerror = function(ev) {
                console.error('Transaction failed: ', ev.value);
                db.close();
                callback(ev.value);
            };
            return;
        };

        get.onerror = function(ev) {
            console.error('Transaction failed: ', ev.value);
            db.close();
            callback(ev.value);
        };
        return;
    }

    open(remove);

    return;
}

exports.getDomainPaths = function getDomainPaths(domain){

    function promise(resolve, reject){
                
        function getList (db) {
            var trans = db.transaction(['domain-paths'], "readonly")
                .objectStore('domain-paths');
            var get = trans.get(domain);

            get.onsuccess = function(ev) {
                var res = get.result;
                var keys = [];
                db.close();
                if (res) {
                    var paths = res.paths;
                    var i;
                    for (i in paths){
                        keys.push(i);
                    }
                    resolve(keys);
                }
                else{
                    reject(new Error('error getting domain registry'));
                }
                return;
            };

            get.onerror = function(ev) {
                reject(new Error('Transaction failed: ', ev.value));
                db.close();
            };
        }

        open()
        .then(getList);
    }

    return new Promise(promise);
}

exports.getDomains = function getDomains(offset, limit, callback){
    open(getall);
            
    function getlist (db) {

        var domains = [];

        var keyRange = IDBKeyRange.bound(offset, limit);
        var trans = objectStore.openCursor(keyRange);

        trans.onsuccess = function(ev) {
            var cursor = ev.target.result;
            if (cursor) {
                domains.push(cursor.value);
                cursor.continue();
            }
            return;
        };

        trans.oncomplete = function(ev) {
            console.log('Finished getting domains');
            db.close();
            callback(domains);
        };

        trans.onerror = function(ev) {
            console.error('Transaction failed: ', ev.value);
            db.close();
            callback(ev.value);
        };
        return;
    }
    return;
}