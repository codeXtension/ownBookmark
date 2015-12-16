/**
 * Created by eelkhour on 27.11.2015.
 */

bookmarkApp.controller('settingsCtrl', function ($scope, $http, bookmarkService, $q) {
    $scope.bookmarkService = bookmarkService;

    var DATA_SAVED_WITH_SUCCESS = '<span class="glyphicon glyphicon-floppy-saved" aria-hidden="true"></span>  Changes saved with success!';
    var DATA_SAVED_FAILURE = '<span class="glyphicon glyphicon-floppy-remove" aria-hidden="true"></span>  Changes cannot be saved, please verify your input!';
    var INCORRECT_BOOKMARK_VERSION_ERROR = '<span class="glyphicon glyphicon-floppy-remove" aria-hidden="true"></span>  Please install the correct Bookmark version from <a href="https://github.com/codeXtension/bookmarks" target="_blank">here</a>!';

    $scope.security = {};
    $scope.security.isLoggedIn = false;
    $scope.security.accessToken = '';

    $scope.app = {};
    $scope.app.username = '';
    $scope.app.password = '';
    $scope.app.serverUrl = '';
    $scope.app.isValidating = false;
    $scope.app.refreshRate = 60;
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

    $scope.login = function () {
        $scope.loadCredentials(function (app) {
                $scope.bookmarkService.isLoggedIn(app.bookmarksData.serverUrl).then(
                    function (result) {
                        if (!result.isLoggedIn) {
                            $scope.bookmarkService.login(app.bookmarksData.username, app.bookmarksData.password, app.bookmarksData.serverUrl).then(
                                function (result) {
                                    $scope.security.isLoggedIn = result.isLoggedIn;
                                    if (result.isLoggedIn) {
                                        $scope.app.message = "Login successful!";

                                    } else {
                                        $scope.app.message = "Login failed!"
                                    }
                                }
                            );
                        } else {
                            $scope.app.message = "Already logged in!";
                            $scope.security.isLoggedIn = true;
                        }
                    }
                );
            }
        );
    };

    $scope.isLoggedIn = function () {
        $scope.loadCredentials(function (app) {
                $scope.bookmarkService.isLoggedIn(app.bookmarksData.serverUrl).then(
                    function (result) {
                        $scope.security.isLoggedIn = result.isLoggedIn;
                        if (result.isLoggedIn) {
                            $scope.app.message = "You are logged in!";
                        }
                    }
                );
            }
        );
    };

    var validateCredentials = function (value) {
        var deferred = $q.defer();
        $http({
            url: value.serverUrl + '/index.php/apps/bookmarks/public/rest/v1/verifyuser',
            method: "POST",
            processData: false,
            contentType: false,
            withCredentials: true,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: $.param({'user': value.username, 'password': value.password})
        })
            .then(function (response) {
                    if (response.data.status == 'success') {
                        var data = {};
                        data.status = 'success';
                        data.isValid = true;
                        deferred.resolve(data);
                    } else {
                        var data = {};
                        data.status = 'failure';
                        data.isValid = false;
                        deferred.resolve(data);
                    }
                },
                function (errorResponse) {
                    var data = {};
                    data.status = 'error';
                    data.isValid = false;
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

    $scope.saveRefreshRate = function (app) {
        $scope.bookmarkService.setRefreshRate(app.refreshRate).then(function () {
            $.bootstrapGrowl(DATA_SAVED_WITH_SUCCESS, {type: 'success', width: 400, delay: 3000});
        });

    };

    $scope.loadCredentials();
    $scope.bookmarkService.getRefreshRate().then(function (value) {
        $scope.app.refreshRate = value.refreshRate / 1000;
    });

});