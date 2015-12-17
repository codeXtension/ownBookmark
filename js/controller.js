/**
 * Created by eelkhour on 24.11.2015.
 */
var bookmarkApp = angular.module('bookmarkApp', []);

var bookmarkUri = '/index.php/apps/bookmarks/bookmark';
var queryParam = '?page=%';
var tagCanvas;

// adding chrome-extension:// to the list of safe urls
bookmarkApp.config([
    '$compileProvider',
    function ($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|chrome):/);
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|chrome):/);
    }
]);

bookmarkApp.service('bookmarkService', function ($http, $q, $rootScope) {
    this.saveCredentials = function (appInfo) {
        chrome.storage.sync.set({'bookmarksData': appInfo}, function () {
            return 'Data saved with success!';
        });
    };

    this.setRefreshRate = function (value) {
        var deferred = $q.defer();
        var refreshRate = value * 1000;
        chrome.storage.sync.set({'refreshRate': refreshRate}, function () {
            console.log('refresh rate updated to ' + refreshRate + ' milli seconds.');
            deferred.resolve();
        });

        return deferred.promise;
    };

    this.getRefreshRate = function () {
        var deferred = $q.defer();
        chrome.storage.sync.get('refreshRate', function (item) {
            if (item == undefined || item.refreshRate == undefined) {
                item.refreshRate = 60;
            }
            deferred.resolve(item);
        });
        return deferred.promise;
    };

    this.loadFromCache = function () {
        var deferred = $q.defer();
        var allBookmarks = [];
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

        if (window.indexedDB) {
            this.connectToDB().then(function (db) {
                var objectStore = db.transaction(["bookmarks"]).objectStore("bookmarks");

                objectStore.openCursor().onsuccess = function (event) {
                    var cursor = event.target.result;

                    if (cursor) {
                        allBookmarks.push(cursor.value);
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

    this.saveToCache = function (data) {
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

    this.retrieveBookmarks = function (baseUrl, token, pagenumber) {
        var deferred = $q.defer();

        $http({
            url: baseUrl + bookmarkUri + queryParam.replace('%', pagenumber),
            method: "GET",
            processData: false,
            contentType: false,
            withCredentials: true,
            headers: {'requestToken': token}
        }).then(function (response) {
                data = response.data;
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
            if (tags.length == 1 && tags[0].trim().length == 0) {
                continue;
            }
            for (var j = 0; j < tags.length; j++) {
                if (this.indexOfTag(tags[j], allTags) == -1) {
                    var t = new TagNode(tags[j].trim());
                    t.setWeight(10);
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

    this.isLoggedIn = function (userId, serverUrl) {
        var deferred = $q.defer();

        var ocResult = {};
        ocResult.accessToken = '';
        ocResult.isLoggedIn = false;

        $http({
            url: serverUrl,
            method: "GET",
            withCredentials: true
        })
            .then(function (response) {
                    var requestToken = response.data.match(/data-requesttoken="(.*)"/);
                    var userToken = response.data.match(/data-user="(.*) data-requesttoken.*"/);
                    if (!requestToken || requestToken.length < 2) {
                        ocResult.isLoggedIn = false;
                        deferred.resolve(ocResult);
                    } else if (!userToken || userToken.length < 2 || (userToken.length == 2 && userToken[1].replace('"', '') != userId)) {
                        console.log('expected ' + userId);
                        ocResult.isLoggedIn = false;
                        deferred.resolve(ocResult);
                    } else {
                        var accessToken = requestToken[1];
                        var bookmarkUrl = serverUrl + bookmarkUri;

                        $http({
                            url: bookmarkUrl,
                            method: "GET",
                            withCredentials: true,
                            headers: {'requestToken': accessToken}
                        }).then(function (response) {
                            ocResult.isLoggedIn = true;
                            ocResult.accessToken = accessToken;
                            deferred.resolve(ocResult);
                        }, function (response) {
                            ocResult.isLoggedIn = false;
                            deferred.resolve(ocResult.isLoggedIn);
                        });
                    }
                }
            );

        return deferred.promise;
    };

    this.logout = function (serverUrl, accessToken) {
        var deferred = $q.defer();
        var logoutUrl = serverUrl + '/index.php?logout=true&requesttoken=' + accessToken;
        $http({
            url: logoutUrl,
            method: "GET",
            withCredentials: true
        }).then(function (response) {
            var requestToken = response.data.match(/data-requesttoken="(.*)"/);
            if (requestToken != undefined && requestToken.length == 2 && requestToken[1] == accessToken) {
                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }
        });

        return deferred.promise;
    };

    this.login = function (user, pwd, serverUrl) {
        var deferred = $q.defer();
        var requestToken = '';

        var ocResult = {};
        ocResult.accessToken = '';
        ocResult.isLoggedIn = false;

        $http({
            url: serverUrl,
            method: "GET",
            withCredentials: true
        })
            .then(function (response) {
                    requestToken = response.data.match(/data-requesttoken="(.*)"/);
                    if (!requestToken || requestToken.length < 2) {
                        ocResult.isLoggedIn = false;
                        deferred.resolve(ocResult.isLoggedIn);
                    }

                    $http({
                        url: serverUrl,
                        method: "POST",
                        processData: false,
                        contentType: false,
                        withCredentials: true,
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        data: $.param({'user': user, 'password': pwd, 'requesttoken': requestToken[1]})
                    })
                        .then(function (response) {
                                var rt = response.data.match(/data-requesttoken="(.*)"/);
                                var userToken = response.data.match(/data-user="(.*) data-requesttoken.*"/);
                                if (!rt || rt.length < 2) {
                                    ocResult.isLoggedIn = false;
                                    deferred.resolve(ocResult.isLoggedIn);
                                } else if (!userToken || userToken.length < 2 || (userToken.length == 2 && userToken[1].replace('"', '') != user)) {
                                    console.log('expected ' + user);
                                    ocResult.isLoggedIn = false;
                                    deferred.resolve(ocResult);
                                } else {
                                    var accessToken = rt[1];
                                    var bookmarkUrl = serverUrl + bookmarkUri;

                                    $http({
                                        url: bookmarkUrl,
                                        method: "GET",
                                        withCredentials: true,
                                        headers: {'requestToken': accessToken}
                                    }).then(function (response) {
                                        ocResult.isLoggedIn = true;
                                        ocResult.accessToken = accessToken;
                                        deferred.resolve(ocResult.isLoggedIn);
                                    }, function (response) {
                                        ocResult.isLoggedIn = false;
                                        deferred.resolve(ocResult.isLoggedIn);
                                    });
                                }
                            },
                            function (response) { // optional
                                ocResult.isLoggedIn = false;
                                deferred.resolve(ocResult.isLoggedIn);
                            }
                        );
                },
                function (response) { // optional
                    ocResult.isLoggedIn = false;
                    deferred.resolve(ocResult.isLoggedIn);
                }
            );

        return deferred.promise;
    };

    this.connectToDB = function () {
        var deferred = $q.defer();
        var db;
        var request = window.indexedDB.open("bookmarksApp", 1);
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
            var objectStore = db.createObjectStore("bookmarks", {keyPath: "id"});
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
    this.friends = [];

    this.setWeight = function (value) {
        this.weight = value;
    };
}