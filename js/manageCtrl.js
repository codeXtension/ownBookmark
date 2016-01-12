/**
 * Created by eelkhour on 12.12.2015.
 */
bookmarkApp.controller('manageCtrl', function ($scope, $http, $q, bookmarkService) {

    var ADD_URI = '/index.php/apps/bookmarks/public/rest/v1/bookmark/add';
    var UPDATE_URI = '/index.php/apps/bookmarks/public/rest/v1/bookmark/update';
    var DELETE_URI = '/index.php/apps/bookmarks/public/rest/v1/bookmark/delete';

    $scope.bookmarkService = bookmarkService;

    $scope.app = {};
    $scope.app.id = 0;
    $scope.app.url = '';
    $scope.app.title = '';
    $scope.app.tags = [];
    $scope.app.username = '';
    $scope.app.serverUrl = '';
    $scope.app.exists = false;
    $scope.app.dataSaved = undefined;
    $scope.app.isUpdating = false;

    $scope.allTags = [];

    $scope.loadItems = function (query) {
        var selectedTags = [];
        for (var i = 0; i < $scope.allTags.length; i++) {
            var tag = $scope.allTags[i];
            if (tag.text.toLowerCase().indexOf(query.toLowerCase()) > -1) {
                selectedTags.push(tag);
            }
        }
        return selectedTags;
    };

    $scope.saveBookmark = function () {
        $scope.app.isUpdating = true;
        var saveUri = ADD_URI;
        if ($scope.app.id > 0) {
            saveUri = UPDATE_URI;
        }

        var tags = [];

        for (var i = 0; i < $scope.app.tags.length; i++) {
            tags.push($scope.app.tags[i].text);
        }

        $http({
            url: $scope.app.serverUrl + saveUri,
            method: "POST",
            processData: false,
            contentType: false,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + window.btoa($scope.app.username + ":" + $scope.app.password)
            },
            data: $.param({
                'tags[]': tags,
                'url': $scope.app.url,
                'title': $scope.app.title,
                'description': '',
                'id': $scope.app.id
            })
        }).then(function (response) {
            $scope.bookmarkService.setNeedReloading(true).then(function () {
                $scope.app.dataSaved = true;
                $scope.app.isUpdating = false;
                window.close();
            });
            }, function (response) {
                $scope.app.dataSaved = false;
            $scope.app.isUpdating = false;
            }
        );

    };

    $scope.removeBookmark = function () {
        $scope.app.isUpdating = true;
        $http({
            url: $scope.app.serverUrl + DELETE_URI,
            method: "POST",
            processData: false,
            contentType: false,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + window.btoa($scope.app.username + ":" + $scope.app.password)
            },
            data: $.param({
                'id': $scope.app.id
            })
        }).then(function (response) {
            $scope.bookmarkService.setNeedReloading(true).then(function () {
                $scope.app.dataSaved = true;
                $scope.app.isUpdating = false;
                window.close();
            });
            }, function (response) {
                $scope.app.dataSaved = false;
            $scope.app.isUpdating = false;
            }
        );
    };

    $scope.bookmarkService.loadCachedBookmarks().then(function (allBookmarks) {
        $scope.allTags = $scope.bookmarkService.retrieveTags(allBookmarks);
    });

    var initCurrentTab = function () {
        var deferred = $q.defer();
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            deferred.resolve(tabs[0]);
        });

        return deferred.promise;
    };

    initCurrentTab().then(function (tab) {
        $scope.app.url = tab.url;
        $scope.app.title = tab.title;
        $scope.app.tags = [];
        $scope.app.exists = false;
        $scope.app.id = 0;

        $scope.bookmarkService.loadCredentials().then(
            function (app) {
                $scope.app.username = app.bookmarksData.username;
                $scope.app.password = app.bookmarksData.password;
                $scope.app.serverUrl = app.bookmarksData.serverUrl;
            });

        $scope.bookmarkService.loadCachedBookmarks().then(function (cachedBookmarks) {
            for (var i = 0; i < cachedBookmarks.length; i++) {
                if (cachedBookmarks[i].url == $scope.app.url) {
                    console.log(cachedBookmarks[i].tags);
                    for (var t = 0; t < cachedBookmarks[i].tags.length; t++) {
                        $scope.app.tags.push($scope.loadItems(cachedBookmarks[i].tags[t])[0]);
                    }
                    $scope.app.exists = true;
                    $scope.app.id = cachedBookmarks[i].id;
                    $scope.app.title = cachedBookmarks[i].title;
                    break;
                }
            }
        });
    });
});