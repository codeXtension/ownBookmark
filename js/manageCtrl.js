/**
 * Created by eelkhour on 12.12.2015.
 */
bookmarkApp.controller('manageCtrl', function ($scope, $http, $q, bookmarkService) {
    $scope.bookmarkService = bookmarkService;

    $scope.app = {};
    $scope.app.url = '';
    $scope.app.title = '';
    $scope.app.favIconUrl = '../images/logo.png';
    $scope.app.tags = [];

    $scope.allTags = [];

    var initCurrentTab = function (tab) {
        var deferred = $q.defer();
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            deferred.resolve(tabs[0]);
        });

        return deferred.promise;
    };

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

    initCurrentTab().then(function (tab) {
        $scope.app.url = tab.url;
        $scope.app.title = tab.title;
        if (tab.favIconUrl != undefined && tab.favIconUrl.indexOf('http') > -1) {
            $scope.app.favIconUrl = tab.favIconUrl;
        }
    });


    $scope.bookmarkService.loadCachedBookmarks().then(function (allBookmarks) {
        $scope.allTags = $scope.bookmarkService.retrieveTags(allBookmarks);
    });
});