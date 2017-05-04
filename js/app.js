// Google's Map API callback function
var googleSuccess = function() {
    // List of locations
    var initLocations = [{
        name: 'Yokohama Stadium',
        lat: 35.443451,
        lng: 139.640113
    }, {
        name: 'Yamashita Park',
        lat: 35.445886,
        lng: 139.649658
    }, {
        name: 'Yokohama Marine Tower',
        lat: 35.443933,
        lng: 139.650898
    }, {
        name: 'Minato Mirai',
        lat: 35.457534,
        lng: 139.634873
    }, {
        name: 'Motomachi Park',
        lat: 35.438139,
        lng: 139.651360
    }, {
        name: 'Yokohama Landmark Tower',
        lat: 35.454942,
        lng: 139.631356
    }];

    var map,
        contentStr = "",
        markers = [],
        infowindow = new google.maps.InfoWindow({
            maxWidth: 200
        });

    // Location class
    var Location = function(data) {
        this.name = ko.observable(data.name);
        this.lat = ko.observable(data.lat);
        this.lng = ko.observable(data.lng);
    };

    var directionsService = new google.maps.DirectionsService();
    var directionsDisplay = new google.maps.DirectionsRenderer();

    // viewModel
    var viewModel = function() {

        var self = this;

        // Binding for responsive style (Hide/Show button)
        this.stylingClass = ko.observable(false);

        this.toggleStylingClass = function() {
            var previous = !self.stylingClass();
            self.stylingClass(previous);
        };

        this.locationList = ko.observableArray([]);

        initLocations.forEach(function(locItem) {
            self.locationList.push(new Location(locItem));
        });
        // Autocomplete filter
        // objectValue = ko.observable();
        // this.locList = initLocations;

        // $('#filter').autocomplete({
        //     lookup: initLocations,
        //     onSelect: function(selectedLoc) {
        //         // Keep only selected location on locationList
        //         self.locationList.removeAll();
        //         self.locationList.push(new Location(selectedLoc));
        //         // Make only correspondind maker visble
        //         for (var loc = 0; loc < markers.length; loc++) {
        //             markers[loc].setVisible(false);
        //             if (markers[loc].name === selectedLoc.name) {
        //                 markers[loc].setVisible(true);
        //             }
        //         }
        //     }
        // });
        // Update locations and markers based on Filter's input
        this.inputStr = ko.pureComputed({
            read: function() {
                return;
            },
            write: function(value) {
                // Keep only filtered locations on locationList
                // Hide all unrelated markers
                self.locationList.removeAll();
                for (var loc = 0; loc < markers.length; loc++) {
                    markers[loc].setVisible(false);
                    if (markers[loc].name.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
                        self.locationList.push(new Location(markers[loc]));
                        markers[loc].setVisible(true);
                    }
                }
            },
            owner: this
        });

        // Open infoWindow when clicked on List
        // Request articles from Wikipedia
        this.setLocation = function(clickedLoc) {
            var bouncingIndex = 0;
            // Update infoWindow's content & markers' animations
            for (var i = 0; i < markers.length; i++) {
                // Search for corresponding marker
                // Set animation = null and close infowindow if marker's
                // already bouncing
                // Else keep track of corresponding marker in markers array
                if (clickedLoc.name() === markers[i].name) {
                    if (markers[i].getAnimation() !== null) {
                        markers[i].setAnimation(null);
                        infowindow.close();
                    } else {
                        markers[i].setAnimation(google.maps.Animation.BOUNCE);
                        map.panTo(markers[i].getPosition());
                        bouncingIndex = i;
                    }
                } else {
                    markers[i].setAnimation(null);
                }
            }

            if (markers[bouncingIndex].getAnimation() !== null) {
                var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + clickedLoc.name() + '&format=json&callback=wikiCallback';
                contentStr = "";
                // Handle error
                var wikiRequestTimeout = setTimeout(function() {
                    contentStr = 'Failed to get wikipedia resources';
                    infowindow.setContent(contentStr);
                    infowindow.open(map, markers[bouncingIndex]);
                }, 3000);

                $.ajax({
                    url: wikiUrl,
                    async: true,
                    dataType: "jsonp",
                    success: function(response) {
                        var articleList = response[1];
                        contentStr = '<h6>Relevant Wikipedia Links</h6>';
                        if (articleList.length === 0)
                            contentStr = 'No article about this place yet';
                        else
                            for (var i = 0; i < articleList.length; i++) {
                                var articleStr = articleList[i];
                                var url = 'http://en.wikipedia.org/wiki/' + articleStr;
                                contentStr += '<li><a href="' + url + '" target="_blank">' + articleStr + '</a></li>';
                            }

                        clearTimeout(wikiRequestTimeout);

                        infowindow.setContent(contentStr);
                        infowindow.open(map, markers[bouncingIndex]);

                    }
                });
            }


        };

        // Direction Service using MVVM
        sta = ko.observable();
        des = ko.observable();

        this.onChangeHandler = function() {
            calculateAndDisplayRoute(directionsService, directionsDisplay, sta(), des());
        };

    };

    ko.applyBindings(new viewModel());

    // Draws marker on map and adds to markers[]

    function addMarker(location) {
        var loc = new google.maps.LatLng(location.lat, location.lng);
        var marker = new google.maps.Marker({
            position: loc,
            map: map,
            animation: google.maps.Animation.DROP,
            name: location.name,
            lat: location.lat,
            lng: location.lng
        });
        marker.addListener('click', toggleBounceInfo);
        markers.push(marker);

        // Opens infoWindow when clicked on marker
        // Requests articles from Wikipedia
        function toggleBounceInfo() {
            map.panTo(marker.getPosition());
            // Set animation = null and close infowindow if marker's
            // already bouncing
            if (marker.getAnimation() !== null) {
                marker.setAnimation(null);
                infowindow.close();
            } else {
                infowindow.close();
                for (var j = 0; j < markers.length; j++) {
                    if (markers[j] == marker) {
                        marker.setAnimation(google.maps.Animation.BOUNCE);
                    } else
                        markers[j].setAnimation(null);
                }
            }
            // Request wiki articles for selected location
            if (marker.getAnimation() !== null) {
                var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + marker.name + '&format=json&callback=wikiCallback';
                contentStr = "";

                var wikiRequestTimeout = setTimeout(function() {
                    contentStr = 'Failed to get wikipedia resources';
                    infowindow.setContent(contentStr);
                    infowindow.open(map, marker);
                }, 3000);

                $.ajax({
                    url: wikiUrl,
                    async: true,
                    dataType: "jsonp",
                    success: function(response) {
                        var articleList = response[1];
                        contentStr = '<h6>Relevant Wikipedia Links</h6>';
                        if (articleList.length === 0)
                            contentStr = 'No article about this place yet';
                        else
                            for (var i = 0; i < articleList.length; i++) {
                                var articleStr = articleList[i];
                                var url = 'http://en.wikipedia.org/wiki/' + articleStr;
                                contentStr += '<li><a href="' + url + '" target="_blank">' + articleStr + '</a></li>';
                            }

                        clearTimeout(wikiRequestTimeout);

                        infowindow.setContent(contentStr);
                        infowindow.open(map, marker);
                    }
                });
            }

        }

    }

    function initMap() {

        map = new google.maps.Map(document.getElementById('map'), {
            center: {
                lat: 35.452067,
                lng: 139.643478
            },
            zoom: 13,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
        initLocations.forEach(function(locItem) {
            addMarker(locItem);
        });
        // Add Filter box to map
        var $boxAdder = document.getElementById('filterBox');
        map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push($boxAdder);
        // Add Get Direction box to map
        $boxAdder = document.getElementById('floating-panel');
        map.controls[google.maps.ControlPosition.TOP_RIGHT].push($boxAdder);

        // Direction feature
        directionsDisplay.setMap(map);
    }

    function calculateAndDisplayRoute(directionsService, directionsDisplay, a, b) {
        directionsService.route({
            origin: a,
            destination: b,
            travelMode: google.maps.TravelMode.DRIVING
        }, function(response, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsDisplay.setDirections(response);
            } else {
                window.alert('Directions request failed due to ' + status);
            }
        });
    }

    initMap();
};

//  Handle error

var googleError = function() {
    document.getElementById('map').innerHTML = '<h2>Failed to load Google Map</h2>';
};