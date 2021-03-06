/**
 * Created by eelkhour on 24.11.2015.
 */
var bookmarkApp = angular.module('bookmarkApp', ['ngResource', 'ngTagsInput', 'ui.validate']);

var bookmarkUri = '/index.php/apps/bookmarks/public/rest/v1/bookmark';
var ADD_URI = '/index.php/apps/bookmarks/public/rest/v1/bookmark/add';
var UPDATE_URI = '/index.php/apps/bookmarks/public/rest/v1/bookmark/update';
var DELETE_URI = '/index.php/apps/bookmarks/public/rest/v1/bookmark/delete';

var tagCanvas;

// adding chrome-extension:// to the list of safe urls
bookmarkApp.config([
    '$compileProvider',
    function ($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|chrome|tel):/);
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|chrome|tel):/);
    }
]);

bookmarkApp.service('bookmarkService', function ($http, $q) {

    this.reloadBackground = function () {
        var deferred = $q.defer();
        chrome.storage.sync.set({'reloadBackground': new Date().getTime()}, function () {
            deferred.resolve();
        });

        return deferred.promise;
    };

    this.reloadBookmark = function () {
        var deferred = $q.defer();
        chrome.storage.sync.set({'reloadBookmark': new Date().getTime()}, function () {
            deferred.resolve();
        });

        return deferred.promise;
    };

    this.saveCredentials = function (appInfo) {
        chrome.storage.sync.set({'bookmarksData': appInfo}, function () {
            return 'Data saved with success!';
        });
    };

    this.setSettings = function (refreshRate, displayLocalBookmarks, staticTagCloud) {
        var deferred = $q.defer();

        var settings = {};
        settings.refreshRate = refreshRate * 60 * 1000;
        settings.displayLocalBookmarks = displayLocalBookmarks;
        settings.staticTagCloud = staticTagCloud;
        chrome.storage.sync.set({'settings': settings}, function () {
            deferred.resolve();
        });

        return deferred.promise;
    };

    this.getSettings = function () {
        var deferred = $q.defer();
        chrome.storage.sync.get('settings', function (item) {
            if (item == undefined || item.settings == undefined) {
                item.settings.refreshRate = 5 * 60 * 1000; // default value is 5 min.
                item.settings.displayLocalBookmarks = false;
                item.settings.staticTagCloud = false;
            }
            deferred.resolve(item);
        });
        return deferred.promise;
    };

    this.loadCachedBookmarks = function () {
        var deferred = $q.defer();
        var allBookmarks = [];
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

        if (window.indexedDB) {
            this.connectToDB().then(function (db) {
                var objectStore = db.transaction(["bookmarks"]).objectStore("bookmarks");

                objectStore.openCursor().onsuccess = function (event) {
                    var cursor = event.target.result;

                    if (cursor) {
                        var bookmark = cursor.value;
                        bookmark.color = '#2E6DA4';
                        allBookmarks.push(bookmark);
                        cursor.continue();
                    } else {
                        deferred.resolve(allBookmarks);
                        console.log("No more entries!");
                    }
                };
            });
        } else {
            deferred.reject();
        }

        return deferred.promise;
    };

    this.saveBookmarksToCache = function (data) {
        this.connectToDB().then(function (db) {
            db.transaction(["bookmarks"], "readwrite").objectStore("bookmarks").clear();
            for (i in data) {
                var request = db.transaction(["bookmarks"], "readwrite").objectStore("bookmarks").put(data[i]);

                request.onsuccess = function (event) {
                    console.log("record added to your database.");
                };

                request.onerror = function (event) {
                    console.error("Unable to add data, it arleady exists in your database! ");
                }
            }
        });
    };

    this.loadCredentials = function () {
        var deferred = $q.defer();
        chrome.storage.sync.get('bookmarksData', function (item) {
            deferred.resolve(item);
        });
        return deferred.promise;
    };

    this.retrieveBookmarks = function (userInfo) {
        var deferred = $q.defer();
        $http({
            url: userInfo.serverUrl + bookmarkUri,
            method: "POST",
            processData: false,
            contentType: false,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + window.btoa(userInfo.username + ":" + userInfo.password)
            },
            data: $.param({
                'select[]': ['tags', 'id']
            })
        }).then(function (response) {
                deferred.resolve(response);
            }, function (response) {
                deferred.reject(response);
            }
        );

        return deferred.promise;
    };

    this.retrieveTags = function (dataArray) {
        var allTags = [];

        for (var i = 0; i < dataArray.length; i++) {
            var tags = dataArray[i].tags;
            var isLocalTag = dataArray[i].local != undefined && dataArray[i].local;
            if (tags.length == 1 && tags[0].trim().length == 0) {
                continue;
            }
            for (var j = 0; j < tags.length; j++) {
                if (this.indexOfTag(tags[j], allTags) == -1) {
                    var t = new TagNode(tags[j].trim());
                    t.setWeight(10);
                    if (!isLocalTag) {
                        t.color = '#2E6DA4';
                    } else {
                        t.color = '#91205a';
                    }
                    t.friends = [];
                    allTags.push(t);
                } else {
                    allTags[this.indexOfTag(tags[j].trim(), allTags)].weight++;
                }
                var tag = allTags[this.indexOfTag(tags[j].trim(), allTags)];
                for (var k = 0; k < tags.length; k++) {
                    if (tag.text != tags[k].trim() && j != k && tag.friends.indexOf(tags[k]) == -1) {
                        tag.friends.push(tags[k].trim());
                    }
                }
            }
        }
        return allTags;
    };

    this.connectToDB = function () {
        var deferred = $q.defer();
        var db;
        var request = window.indexedDB.open("ownBookmarksApp", 1);
        request.onerror = function (event) {
            console.log("error: ");
            deferred.reject(db);
        };

        request.onsuccess = function (event) {
            db = request.result;
            console.log("success: " + db);
            deferred.resolve(db);
        };

        request.onupgradeneeded = function (event) {
            var db = event.target.result;
            db.createObjectStore("bookmarks", {keyPath: "id"});
        };

        return deferred.promise;
    };


    this.indexOfTag = function (tag, array) {
        if (array == undefined || tag == undefined) {
            return -1;
        }

        for (var j = 0; j < array.length; j++) {
            if (array[j].text != undefined && array[j].text == tag) {
                return j;
            }
        }
        return -1;
    };

    this.containsTag = function (leftTags, rightTags) {
        var found = 0;
        for (var i = 0; i < leftTags.length; i++) {
            for (var j = 0; j < rightTags.length; j++) {
                if (leftTags[i] == rightTags[j].text) {
                    found++;
                }
            }
        }
        if (found == rightTags.length) {
            return true;
        }

        return false;
    };
});

bookmarkApp.directive('ngRightClick', function ($parse) {
    return function (scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function (event) {
            scope.$apply(function () {
                event.preventDefault();
                fn(scope, {$event: event});
            });
        });
    };
});

bookmarkApp.directive('afterRender', ['$timeout', function ($timeout) {
    var def = {
        restrict: 'A',
        terminal: true,
        transclude: false,
        link: function (scope, element, attrs) {
            $timeout(scope.$eval(attrs.afterRender), 0);  //Calling a scoped method
        }
    };
    return def;
}]);

function TagNode(text) {
    this.text = text;
    this.weight = 1;
    this.color = 'blue';
    this.friends = [];

    this.setWeight = function (value) {
        this.weight = value;
    };
}