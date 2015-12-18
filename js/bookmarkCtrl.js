/**
 * Created by eelkhour on 27.11.2015.
 */

bookmarkApp.controller('bookmarkCtrl', function ($scope, $http, bookmarkService, $q) {
        $scope.bookmarkService = bookmarkService;

        $scope.serverUrl = '';
        $scope.allBookmarks = [];
        $scope.allTags = [];
        $scope.filteredTags = [];
        $scope.selectedTags = [];
        $scope.selectedBookmarks = [];
        $scope.filterText = '';

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
                    tagCanvas = $('#tagsCanvas').tagcanvas({
                        textColour: null,
                        outlineColour: 'transparent',
                        weightFrom: 'data-weight',
                        weightSize: 5,
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

    $scope.openOptions = function(){
        chrome.tabs.create({'url': "../html/settings.html" } );
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
				addLocalTags();
				
                if ($scope.selectedTags.length == 0) {
                    $scope.filteredTags = $scope.allTags;
                }
            });
        };

        var addLocalTags = function () {
    		var bookmarkTreeNodes = chrome.bookmarks.getTree(
    				function(bookmarkTreeNodes) {
    					if(bookmarkTreeNodes[0].children && bookmarkTreeNodes[0].children[0].children) {
    						$('#bookmarks').append(addTags(bookmarkTreeNodes[0].children[0].children));
    					}
    				});
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
							url : bookmarkNodes[i].children[n].url,
							title : bookmarkNodes[i].children[n].title,
							tags : [bookmarkNodes[i].title],
						};
			
						$scope.allBookmarks.push(bookmark);
					}
        		}
        	}
            if ($scope.selectedTags.length == 0) {
                $scope.filteredTags = $scope.allTags;
            }
        };
		
        loadCachedBookmarks();

        $scope.bookmarkService.loadCredentials().then(
            function (app) {
                $scope.serverUrl = app.bookmarksData.serverUrl;
            });

        $scope.bookmarkService.getRefreshRate().then(function (value) {
            console.log('refresh rate:' + value.refreshRate);
            window.setInterval(function () {
                loadCachedBookmarks();
            }, value.refreshRate);
        });
    }
);