/**
 * Created by eelkhour on 11.12.2015.
 */

bookmarkApp.controller('backgroundCtrl', function ($scope, $http, $q, bookmarkService) {
    $scope.bookmarkService = bookmarkService;
    $scope.allBookmarks = [];

    $scope.security = {};
    $scope.security.message = '';
    $scope.security.isLoggedIn = false;
    $scope.security.accessToken = '';

    $scope.app = {};
    $scope.app.username = '';
    $scope.app.password = '';
    $scope.app.serverUrl = '';


    $scope.$watchCollection('allBookmarks', function (newValue, oldValue) {
        initCurrentTab().then(function (tab) {
            if (tab != undefined) {
                toggleCloudIcon(tab, $scope.allBookmarks);
            }
        });
    });

    var initCurrentTab = function (tab) {
        var deferred = $q.defer();
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            deferred.resolve(tabs[0]);
        });

        return deferred.promise;
    };


    var loadCredentials = function (callback) {
        $scope.bookmarkService.loadCredentials().then(
            function (app) {
                $scope.app.username = app.bookmarksData.username;
                $scope.app.password = app.bookmarksData.password;
                $scope.app.serverUrl = app.bookmarksData.serverUrl;

                if (callback != null) {
                    callback(app);
                }
            });
    };

    var pollFromOC = function () {
        loadCredentials(function (app) {
                $scope.bookmarkService.retrieveBookmarks($scope.app).then(function (result) {
                    $scope.bookmarkService.saveToCache(result.data);
                    $scope.allBookmarks = result.data;
                });
            }
        );
    };

    var toggleCloudIcon = function (tab, allBookmarks) {
        var found = false;
        for (var i = 0; i < allBookmarks.length; i++) {
            if (allBookmarks[i].url == tab.url) {
                found = true;
                console.log(tab.url + ' found in allBookmarks at index' + i);
                break;
            }
        }

        if (found) {
            chrome.pageAction.setIcon({path: "../images/bookmark.png", tabId: tab.id});
        } else {
            chrome.pageAction.setIcon({path: "../images/bookmark_bw.png", tabId: tab.id});
            console.log(tab.url + ' not found in allBookmarks');
        }
    };

    pollFromOC();

    $scope.bookmarkService.getRefreshRate().then(function (value) {
        console.log('refresh rate:' + value.refreshRate);
        window.setInterval(function () {
            pollFromOC();
        }, value.refreshRate);
    });

    chrome.runtime.onInstalled.addListener(function () {
        // Replace all rules ...
        chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
            // With a new rule ...
            chrome.declarativeContent.onPageChanged.addRules([
                {
                    conditions: [
                        new chrome.declarativeContent.PageStateMatcher({
                            pageUrl: {schemes: ['http', 'https', 'ftp', '.']}
                        })
                    ],
                    // And shows the extension's page action.
                    actions: [new chrome.declarativeContent.ShowPageAction()]
                }
            ]);
        });
    });

    chrome.tabs.onCreated.addListener(function (tabId, changeInfo, tab) {
        toggleCloudIcon(tab, $scope.allBookmarks);
    });

    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        toggleCloudIcon(tab, $scope.allBookmarks);
    });

    chrome.tabs.onActivated.addListener(function (activeInfo) {
        chrome.tabs.get(activeInfo.tabId, function (tab) {
            toggleCloudIcon(tab, $scope.allBookmarks);
        });
    });

    initCurrentTab().then(function (tab) {
        toggleCloudIcon(tab, $scope.allBookmarks);
    });
});