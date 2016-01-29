/**
 * Created by eelkhour on 27.11.2015.
 */

bookmarkApp.controller('bookmarkCtrl', function ($scope, $http, bookmarkService, $q) {
        $scope.bookmarkService = bookmarkService;
        var refreshInterval;

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
        $scope.staticTagCloud = false;

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
                    if ($scope.staticTagCloud) {
                        drawStaticTagCloud();
                    } else {
                        drawDynamicTagCloud();
                    }
                }
            }, 0);

        });

        $scope.openOptions = function () {
            chrome.tabs.create({'url': "../html/settings.html"});
        };

        $scope.refresh = function () {
            $scope.bookmarkService.reloadBackground();
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
                $scope.filterText = '';
                updateCanvas($scope.selectedTags);
                $scope.$digest();
            }
        };

        $scope.goBackOneLevel = function () {
            $scope.filterText = '';
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

        var drawDynamicTagCloud = function () {
            $('#tagsCanvas').attr('width', window.innerWidth - 650);
            $('#tagsCanvas').attr('height', window.innerHeight - 50);
            tagCanvas = $('#tagsCanvas').tagcanvas({
                textColour: null,
                outlineColour: 'transparent',
                weightFrom: 'data-weight',
                weightSize: 6,
                zoom: 1.1,
                noTagsMessage: false,
                weightSizeMax: 14,
                weightSizeMin: 5,
                dragControl: true,
                weight: true,
                weightMode: 'size',
                outlineThickness: 0
            });

            if (!tagCanvas) {
                // TagCanvas failed to load
                $('#tagsContainer').hide();
            }
        };

        var drawStaticTagCloud = function () {
            $('#staticTagsCanvas').attr('width', window.innerWidth - 650);
            $('#staticTagsCanvas').attr('height', window.innerHeight - 50);
            var staticTags = [];
            for (var i = 0; i < $scope.filteredTags.length; i++) {
                var ft = [$scope.filteredTags[i].text, $scope.filteredTags[i].weight];
                staticTags.push(ft);
            }

            WordCloud($('#staticTagsCanvas')[0],
                {
                    list: staticTags,
                    minSize: 12,
                    backgroundColor: '#FDFCFC',
                    weightFactor: 5,
                    clearCanvas: true,
                    click: function (item, dimension, event) {
                        var retrievedTag = {};
                        retrievedTag.text = item[0];
                        $scope.toggleBookmarkWithTag(retrievedTag);
                    },
                    hover: function (item, dimension, event) {
                        console.log(item);
                    }
                });
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
            if ($scope.staticTagCloud) {
                drawStaticTagCloud();
            } else {
                $('#tagsCanvas').tagcanvas("reload");
            }
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
                if (tag.text.toLowerCase() == tagName.toLowerCase()) {
                    return tag;
                }
            }
            return undefined;
        };

        var loadCachedBookmarks = function () {
            $scope.bookmarkService.loadCachedBookmarks().then(function (allBookmarks) {
                $scope.allBookmarks = allBookmarks;
                if ($scope.displayLocalBookmarks) {
                    addLocalTags().then(function () {
                        $scope.allTags = $scope.bookmarkService.retrieveTags(allBookmarks);
                        prepareUI(allBookmarks);
                    });
                } else {
                    $scope.allTags = $scope.bookmarkService.retrieveTags(allBookmarks);
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
                        for (var i = 0; i < bookmarkTreeNodes[0].children[0].children.length; i++) {
                            var level0 = bookmarkTreeNodes[0].children[0].children[i];
                            scanLocalBookmarks(level0, []);
                        }
                        deferred.resolve();
                    }
                });
            return deferred.promise;
        };

        var scanLocalBookmarks = function (bookmarkNode, parentTags) {
            if (bookmarkNode.url != undefined) {
                var bookmark = {
                    url: bookmarkNode.url,
                    title: bookmarkNode.title,
                    tags: parentTags,
                    local: true,
                    color: '#91205a'
                };

                $scope.allBookmarks.push(bookmark);
            } else if (bookmarkNode.children != undefined) {
                var tempTag = parentTags.slice();
                tempTag.push(bookmarkNode.title);
                for (var n = 0; n < bookmarkNode.children.length; n++) {
                    scanLocalBookmarks(bookmarkNode.children[n], tempTag);
                }
            }
        };

        var initSettings = function () {
            $scope.bookmarkService.getSettings().then(function (value) {
                console.log('refresh rate:' + value.settings.refreshRate);
                $scope.displayLocalBookmarks = value.settings.displayLocalBookmarks;
                $scope.staticTagCloud = value.settings.staticTagCloud;
                clearInterval(refreshInterval);
                loadCachedBookmarks();
                refreshInterval = window.setInterval(function () {
                    loadCachedBookmarks();
                }, value.settings.refreshRate);
            });
        };

        $scope.bookmarkService.loadCredentials().then(
            function (app) {
                $scope.app.serverUrl = app.bookmarksData.serverUrl;
                $scope.app.username = app.bookmarksData.username;
                $scope.app.password = app.bookmarksData.password;
            });

        initSettings();

        chrome.storage.onChanged.addListener(function (changes, namespace) {
            for (key in changes) {
                if (key == 'reloadBookmark') {
                    initSettings();
                }
            }
        });

        chrome.bookmarks.onCreated.addListener(function (id, bookmark) {
            loadCachedBookmarks();
        });

        chrome.bookmarks.onRemoved.addListener(function (id, removeInfo) {
            loadCachedBookmarks();
        });

        chrome.bookmarks.onChanged.addListener(function (id, changeInfo) {
            loadCachedBookmarks();
        });

        chrome.bookmarks.onMoved.addListener(function (id, moveInfo) {
            loadCachedBookmarks();
        });
    }
);