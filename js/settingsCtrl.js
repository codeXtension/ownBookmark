/**
 * Created by eelkhour on 27.11.2015.
 */

bookmarkApp.controller('settingsCtrl', function ($scope, $http, bookmarkService) {
    $scope.bookmarkService = bookmarkService;

    var DATA_SAVED_WITH_SUCCESS = '<span class="glyphicon glyphicon-floppy-saved" aria-hidden="true"></span>  Changes saved with success!';

    $scope.security = {};
    $scope.security.isLoggedIn = false;
    $scope.security.accessToken = '';

    $scope.app = {};
    $scope.app.username = '';
    $scope.app.password = '';
    $scope.app.serverUrl = '';
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

<<<<<<< HEAD
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
=======
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
>>>>>>> refs/remotes/origin/master
    };

    $scope.saveCredentials = function (user) {
        $scope.bookmarkService.saveCredentials(user);
        $.bootstrapGrowl(DATA_SAVED_WITH_SUCCESS, {type: 'success', width: 400, delay: 3000});

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