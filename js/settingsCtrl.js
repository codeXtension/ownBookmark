/**
 * Created by eelkhour on 27.11.2015.
 */

bookmarkApp.controller('settingsCtrl', function ($scope, $http, bookmarkService, $q) {
    $scope.bookmarkService = bookmarkService;

    var DATA_SAVED_WITH_SUCCESS = '<span class="fa fa-check" aria-hidden="true"></span>  Changes saved with success!';
    var DATA_SAVED_FAILURE = '<span class="fa fa-close" aria-hidden="true"></span>  Changes cannot be saved, please verify your input!';
    var INCORRECT_BOOKMARK_VERSION_ERROR = '<span class="fa fa-close" aria-hidden="true"></span>  Please install the correct Bookmark version from <a href="https://github.com/codeXtension/bookmarks" target="_blank">here</a>!';

    $scope.security = {};
    $scope.security.isLoggedIn = false;
    $scope.security.accessToken = '';

    $scope.app = {};
    $scope.app.username = '';
    $scope.app.password = '';
    $scope.app.serverUrl = '';
    $scope.app.isValidating = false;
    $scope.app.refreshRate = 60;
    $scope.app.displayLocalBookmarks = false;
    $scope.app.message = undefined;

    $scope.loadCredentials = function (callback) {
        $scope.bookmarkService.loadCredentials().then(
            function (app) {
                $scope.app.username = app.bookmarksData.username;
                $scope.app.password = '';
                $scope.app.serverUrl = app.bookmarksData.serverUrl;
                if (callback != null) {
                    callback(app);
                }
            });
    };

    var validateCredentials = function (value) {
        var deferred = $q.defer();
        $http({
            url: value.serverUrl + '/index.php/apps/bookmarks/public/rest/v1/bookmark',
            method: "POST",
            processData: false,
            contentType: false,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + window.btoa(value.username + ":" + value.password)
            }
        })
            .then(function (response) {
                    var data = {};
                    data.status = 'success';
                    data.isValid = true;
                    deferred.resolve(data);
                },
                function (errorResponse) {
                    var data = {};
                    if (errorResponse.status == 401) {
                        data.status = 'failure';
                        data.isValid = false;
                    } else {
                        data.status = 'error';
                        data.isValid = false;
                    }
                    deferred.resolve(data);
                });
        return deferred.promise;
    };

    $scope.saveCredentials = function (user) {
        user.isValidating = true;
        validateCredentials(user).then(function (response) {
            user.isValidating = false;
            if (response.isValid) {
                $scope.bookmarkService.saveCredentials(user);
                $.bootstrapGrowl(DATA_SAVED_WITH_SUCCESS, {type: 'success', width: 400, delay: 3000});
            } else {
                if (response.status == 'failure') {
                    $.bootstrapGrowl(DATA_SAVED_FAILURE, {type: 'danger', width: 450, delay: 3000});
                } else {
                    $.bootstrapGrowl(INCORRECT_BOOKMARK_VERSION_ERROR, {type: 'danger', width: 450, delay: 3000});
                }
            }
        });


    };

    $scope.saveSettings = function (app) {
        $scope.bookmarkService.setSettings(app.refreshRate, app.displayLocalBookmarks).then(function () {
            $scope.bookmarkService.reloadBookmark();
            $.bootstrapGrowl(DATA_SAVED_WITH_SUCCESS, {type: 'success', width: 400, delay: 3000});
        });

    };

    $scope.loadCredentials();
    $scope.bookmarkService.getSettings().then(function (value) {
        $scope.app.refreshRate = value.settings.refreshRate / (60 * 1000);
        $scope.app.displayLocalBookmarks = value.settings.displayLocalBookmarks;
    });

});