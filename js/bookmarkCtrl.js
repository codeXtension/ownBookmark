/**
 * Created by eelkhour on 27.11.2015.
 */

bookmarkApp.controller('bookmarkCtrl', function ($scope, $http, bookmarkService, $q) {
        $scope.bookmarkService = bookmarkService;

        $scope.app = {};
        $scope.app.serverUrl = '';
        $scope.app.username = '';
        $scope.app.password = '';

        $scope.allBookmarks = [];
        $scope.allTags = [];
        $scope.filteredTags = [];
        $scope.selectedTags = [];
        $scope.selectedBookmarks = [];
        $scope.filterText = '';
        $scope.displayLocalBookmarks = false;

        $scope.$watchCollection('selectedTags', function () {
            window.setTimeout(function () {
                prepareSelectedBookmarks();
                if ($scope.selectedTags.length > 0 && $scope.selectedTags[0] != undefined) {
                    updateCanvas($scope.selectedTags);
                } else if ($scope.allTags.length > 0) {
                    $scope.filteredTags = $scope.allTags;
                }
                updateTags();
            }, 0);
        });

        $scope.$watch('filterText', function () {
            prepareSelectedBookmarks();
            if ($scope.filterText.trim().length == 0) {
                return;
            }
            var filteredBookmarks = [];
            for (var i = 0; i < $scope.selectedBookmarks.length; i++) {
                if ($scope.selectedBookmarks[i].title.toLowerCase().indexOf($scope.filterText.toLowerCase()) > -1) {
                    filteredBookmarks.push($scope.selectedBookmarks[i]);
                }
            }
            $scope.selectedBookmarks = filteredBookmarks;
        });

        $scope.$watchCollection('filteredTags', function (newValue, oldValue) {
            window.setTimeout(function () {
                if (newValue.length > 0) {
                    $('#tagsCanvas').attr('width', window.innerWidth - 650);
                    $('#tagsCanvas').attr('height', window.innerHeight - 50);
                    tagCanvas = $('#tagsCanvas').tagcanvas({
                        textColour: null,
                        outlineColour: 'transparent',
                        weightFrom: 'data-weight',
                        weightSize: 5,
                        zoom: 1.15,
                        noTagsMessage: false,
                        weightSizeMax: 15,
                        weightSizeMin: 7,
                        dragControl: true,
                        weight: true,
                        weightMode: 'size',
                        outlineThickness: 0
                    });

                    if (!tagCanvas) {
                        // TagCanvas failed to load
                        $('#tagsContainer').hide();
                    }
                }
            }, 0);

        });

        $scope.openOptions = function () {
            chrome.tabs.create({'url': "../html/settings.html"});
        };

        $scope.loadItems = function (query) {
            var selectedTags = [];
            for (var i = 0; i < $scope.filteredTags.length; i++) {
                var tag = $scope.filteredTags[i];
                if (tag.text.toLowerCase().indexOf(query.toLowerCase()) > -1) {
                    selectedTags.push(tag);
                }
            }
            return selectedTags;
        };

        $scope.toggleBookmarkWithTag = function (tag) {
            var t = findTagByText(tag.text, $scope.selectedTags);
            if ($scope.selectedTags.indexOf(t) == -1) {
                $scope.selectedTags.push(findTagByText(tag.text));
                updateCanvas($scope.selectedTags);
            }
        };

        $scope.goBackOneLevel = function () {
            if ($scope.selectedTags.length > 0) {
                var index = $scope.bookmarkService.indexOfTag($scope.selectedTags[0].text, $scope.allTags);
                $scope.selectedTags.splice($scope.selectedTags.length - 1, 1);
                if ($scope.selectedTags.length > 0) {
                    updateCanvas($scope.selectedTags);
                } else {
                    $scope.filteredTags = $scope.allTags;
                }
                updateTags();
            }
        };

        $scope.removeBookmark = function (bmk) {
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
                    'id': bmk.id
                })
            }).then(function (response) {
                    $scope.bookmarkService.retrieveBookmarks($scope.app).then(function (result) {
                        $scope.bookmarkService.saveBookmarksToCache(result.data);
                        var index = $scope.allBookmarks.indexOf(bmk);

                        if (index > -1) {
                            $scope.allBookmarks.splice(index, 1);
                            $scope.allTags = $scope.bookmarkService.retrieveTags($scope.allBookmarks);
                            if ($scope.displayLocalBookmarks) {
                                addLocalTags().then(function () {
                                    prepareUI($scope.allBookmarks);
                                });
                            } else {
                                prepareUI($scope.allBookmarks);
                            }
                        }
                        $scope.bookmarkService.setNeedReloading(new Date().getTime());
                    });
                }, function (response) {
                }
            );
        };

        var updateCanvas = function (tags) {
            var allFriends = [];
            allFriends = allFriends.concat(tags[0].friends);

            for (var i = 1; i < tags.length; i++) {
                if (tags[i] != undefined) {
                    allFriends = _.intersection(allFriends, tags[i].friends);
                }
            }

            allFriends = _.uniq(allFriends);

            for (var i = 0; i < allFriends.length; i++) {
                allFriends[i] = findTagByText(allFriends[i], $scope.allTags);
            }

            allFriends = _.difference(allFriends, tags);
            $scope.filteredTags = allFriends;
            if (allFriends.length == 0) {
                $scope.filteredTags = [''];
            }
            $('#tagsCanvas').tagcanvas("reload");
        };

        var prepareSelectedBookmarks = function () {
            $scope.selectedBookmarks = [];
            var dataArray = $scope.allBookmarks;

            for (var i = 0; i < dataArray.length; i++) {
                var tags = dataArray[i].tags;
                if ($scope.bookmarkService.containsTag(tags, $scope.selectedTags)) {
                    $scope.selectedBookmarks.push(dataArray[i]);
                }
            }
        };

        var updateTags = function (tag) {
            window.setTimeout(function () {
                $('#tagsInput :input').focus();
                $('#searchText').focus();
            }, 0);
        };

        var findTagByText = function (tagName, tags) {
            if (tags == undefined) {
                tags = $scope.allTags;
            }
            for (var i = 0; i < tags.length; i++) {
                var tag = tags[i];
                if (tag.text.toLowerCase().indexOf(tagName.toLowerCase()) > -1) {
                    return tag;
                }
            }
            return undefined;
        };

        var loadCachedBookmarks = function () {
            $scope.bookmarkService.loadCachedBookmarks().then(function (allBookmarks) {
                $scope.allBookmarks = allBookmarks;
                $scope.allTags = $scope.bookmarkService.retrieveTags(allBookmarks);
                if ($scope.displayLocalBookmarks) {
                    addLocalTags().then(function () {
                        prepareUI(allBookmarks);
                    });
                } else {
                    prepareUI(allBookmarks);
                }

            });
        };

        var prepareUI = function (allBookmarks) {
            if ($scope.selectedTags.length == 0) {
                $scope.filteredTags = $scope.allTags;
                $scope.selectedBookmarks = allBookmarks;
            } else {
                var tempSelectedTags = [];
                for (var i = 0; i < $scope.selectedTags.length; i++) {
                    var tag = findTagByText($scope.selectedTags[i].text, $scope.allTags);
                    if (tag != undefined) {
                        tempSelectedTags.push(findTagByText($scope.selectedTags[i].text, $scope.allTags));
                    }
                }

                $scope.selectedTags = tempSelectedTags;
            }
        };

        var addLocalTags = function () {
            var deferred = $q.defer();
            chrome.bookmarks.getTree(
                function (bookmarkTreeNodes) {
                    if (bookmarkTreeNodes[0].children && bookmarkTreeNodes[0].children[0].children) {
                        $('#bookmarks').append(addTags(bookmarkTreeNodes[0].children[0].children));
                        deferred.resolve();
                    }
                });
            return deferred.promise;
        };

        var addTags = function (bookmarkNodes) {
            for (i = 0; i < bookmarkNodes.length; i++) {
                if (bookmarkNodes[i].children && bookmarkNodes[i].children.length > 0) {
                    var t = new TagNode(bookmarkNodes[i].title);
                    t.setWeight(10);
                    t.friends = [];
                    t.color = '#91205a';
                    $scope.allTags.push(t);

                    for (n = 0; n < bookmarkNodes[i].children.length; n++) {
                        var bookmark = {
                            url: bookmarkNodes[i].children[n].url,
                            title: bookmarkNodes[i].children[n].title,
                            tags: [bookmarkNodes[i].title]
                        };

                        $scope.allBookmarks.push(bookmark);
                    }
                }
            }
        };

        loadCachedBookmarks();

        chrome.storage.onChanged.addListener(function (changes, namespace) {
            for (key in changes) {
                if (key == 'needsReloading') {
                    loadCachedBookmarks();
                }
            }
        });

        $scope.bookmarkService.loadCredentials().then(
            function (app) {
                $scope.app.serverUrl = app.bookmarksData.serverUrl;
                $scope.app.username = app.bookmarksData.username;
                $scope.app.password = app.bookmarksData.password;
            });

        $scope.bookmarkService.getSettings().then(function (value) {
            console.log('refresh rate:' + value.settings.refreshRate);
            $scope.displayLocalBookmarks = value.settings.displayLocalBookmarks;
            window.setInterval(function () {
                loadCachedBookmarks();
            }, value.settings.refreshRate);
        });
    }
);