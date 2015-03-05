﻿(function () {

    function createVideoPlayer(self) {

        var timeout;
        var initialVolume;
        var fullscreenExited = false;
        var idleState = true;
        var remoteFullscreen = false;

        var muteButton = null;
        var unmuteButton = null;
        var volumeSlider = null;
        var positionSlider;
        var isPositionSliderActive;
        var currentTimeElement;

        self.currentSubtitleStreamIndex = null;

        self.getCurrentSubtitleStream = function () {
            return self.getSubtitleStream(self.currentSubtitleStreamIndex);
        };

        self.getSubtitleStream = function (index) {
            return self.currentMediaSource.MediaStreams.filter(function (s) {
                return s.Type == 'Subtitle' && s.Index == index;
            })[0];
        };

        self.remoteFullscreen = function () {

            if (remoteFullscreen) {
                exitFullScreenToWindow();
            } else {
                enterFullScreen();
            }

            remoteFullscreen = !remoteFullscreen;
        };

        self.toggleFullscreen = function () {
            if (self.isFullScreen()) {
                if (document.cancelFullScreen) {
                    document.cancelFullScreen();
                }
                else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                }
                else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                }
                $('#videoPlayer').removeClass('fullscreenVideo');
            } else {
                requestFullScreen(document.body);
            }
        };

        self.resetEnhancements = function () {
            $("#mediaPlayer").hide();
            $('#videoPlayer').removeClass('fullscreenVideo').removeClass('idlePlayer');
            $('.hiddenOnIdle').removeClass("inactive");
            $("video").remove();
        };

        self.exitFullScreen = function () {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozExitFullScreen) {
                document.mozExitFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }

            $('#videoPlayer').removeClass('fullscreenVideo');

            fullscreenExited = true;
        };

        self.isFullScreen = function () {
            return document.fullscreen || document.mozFullScreen || document.webkitIsFullScreen || document.msFullscreenElement ? true : false;
        };

        function onFlyoutClose() {
            $('.itemVideo').css('visibility', 'visible');
        }

        function onPopupOpen(elem) {
            elem.popup("open").parents(".ui-popup-container").css("margin-top", 30);

            if ($.browser.safari) {
                $('.itemVideo').css('visibility', 'hidden');
            }
        }

        self.showSubtitleMenu = function () {

            var elem = $('.videoSubtitlePopup').html(getSubtitleTracksHtml())
                .trigger('create')
                .popup("option", "positionTo", $('.videoSubtitleButton'))
                .off('popupafterclose', onFlyoutClose)
                .on('popupafterclose', onFlyoutClose);

            onPopupOpen(elem);
        };

        self.showLiveTvGuide = function () {
            var guideHours = 5;

            var startDate = new Date();
            startDate.setMinutes(startDate.getMinutes() >= 30 ? 30 : 0);

            var endDate = new Date(startDate.getTime());
            endDate.setHours(endDate.getHours() + guideHours);

            ApiClient.getLiveTvChannels().done(function (channels) {
                ApiClient.getLiveTvPrograms({
                    UserId: Dashboard.getCurrentUserId(),
                    MaxStartDate: endDate.toISOString(),
                    MinEndDate: startDate.toISOString(),
                    channelIds: channels.Items.map(function (c) {
                        return c.Id;
                    }).join(',')
                }).done(function (programs) {
                    var elem = $('.videoGuidePopup').html(getGuideFlyoutHtml(channels.Items, programs.Items, startDate, endDate))
                                                    .trigger('create')
                                                    .popup('option', 'positionTo', $('.videoControls'))
                                                    .off('popupafterclose', onFlyoutClose)
                                                    .on('popupafterclose', onFlyoutClose);

                    //onPopupOpen(elem);
                    elem.popup("open").parents(".ui-popup-container")
                        .css({ "top": "auto", "bottom": 46, "left": 20, "right": 20 });
                });
            });
        };

        self.showQualityFlyout = function () {

            var elem = $('.videoQualityPopup').html(getQualityFlyoutHtml())
                .trigger('create')
                .popup("option", "positionTo", $('.videoQualityButton'))
                .off('popupafterclose', onFlyoutClose)
                .on('popupafterclose', onFlyoutClose);

            onPopupOpen(elem);
        };

        self.showChaptersFlyout = function () {

            var elem = $('.videoChaptersPopup').html(getChaptersFlyoutHtml())
                .trigger('create')
                .popup("option", "positionTo", $('.videoChaptersButton'))
                .off('popupafterclose', onFlyoutClose)
                .on('popupafterclose', onFlyoutClose);

            onPopupOpen(elem);
        };

        self.showAudioTracksFlyout = function () {

            var elem = $('.videoAudioPopup').html(getAudioTracksHtml())
                .trigger('create')
                .popup("option", "positionTo", $('.videoAudioButton'))
                .off('popupafterclose', onFlyoutClose)
                .on('popupafterclose', onFlyoutClose);

            onPopupOpen(elem);
        };

        self.setAudioStreamIndex = function (index) {
            self.changeStream(self.getCurrentTicks(), { AudioStreamIndex: index });
        };

        self.supportsSubtitleStreamExternally = function (stream) {
            return stream.Type == 'Subtitle' && stream.IsTextSubtitleStream && stream.SupportsExternalStream;
        }

        self.setSubtitleStreamIndex = function (index) {

            if (!self.supportsTextTracks()) {

                self.changeStream(self.getCurrentTicks(), { SubtitleStreamIndex: index });
                self.currentSubtitleStreamIndex = index;
                return;
            }

            var currentStream = self.getCurrentSubtitleStream();

            var newStream = self.getSubtitleStream(index);

            if (!currentStream && !newStream) return;

            var selectedTrackElementIndex = -1;

            if (currentStream && !newStream) {

                if (!self.supportsSubtitleStreamExternally(currentStream)) {

                    // Need to change the transcoded stream to remove subs
                    self.changeStream(self.getCurrentTicks(), { SubtitleStreamIndex: -1 });
                }
            }
            else if (!currentStream && newStream) {

                if (self.supportsSubtitleStreamExternally(newStream)) {
                    selectedTrackElementIndex = index;
                } else {

                    // Need to change the transcoded stream to add subs
                    self.changeStream(self.getCurrentTicks(), { SubtitleStreamIndex: index });
                }
            }
            else if (currentStream && newStream) {

                if (self.supportsSubtitleStreamExternally(newStream)) {
                    selectedTrackElementIndex = index;

                    if (!self.supportsSubtitleStreamExternally(currentStream)) {
                        self.changeStream(self.getCurrentTicks(), { SubtitleStreamIndex: -1 });
                    }
                } else {

                    // Need to change the transcoded stream to add subs
                    self.changeStream(self.getCurrentTicks(), { SubtitleStreamIndex: index });
                }
            }

            self.setCurrentTrackElement(selectedTrackElementIndex);

            self.currentSubtitleStreamIndex = index;
        };

        self.setCurrentTrackElement = function (index) {

            var modes = ['disabled', 'showing', 'hidden'];

            var textStreams = self.currentMediaSource.MediaStreams.filter(function (s) {
                return self.supportsSubtitleStreamExternally(s);
            });

            var newStream = textStreams.filter(function (s) {
                return s.Index == index;
            })[0];

            var trackIndex = newStream ? textStreams.indexOf(newStream) : -1;

            console.log('Setting new text track index to: ' + trackIndex);

            var allTracks = self.currentMediaElement.textTracks; // get list of tracks

            for (var i = 0; i < allTracks.length; i++) {

                var mode;

                if (trackIndex == i) {
                    mode = 1; // show this track
                } else {
                    mode = 0; // hide all other tracks
                }

                console.log('Setting track ' + i + ' mode to: ' + mode);

                // Safari uses integers for the mode property
                // http://www.jwplayer.com/html5/scripting/
                var useNumericMode = false;

                if (!isNaN(allTracks[i].mode)) {
                    useNumericMode = true;
                }

                if (useNumericMode) {
                    allTracks[i].mode = mode;
                } else {
                    allTracks[i].mode = modes[mode];
                }
            }
        };

        self.updateTextStreamUrls = function (startPositionTicks) {

            if (!self.supportsTextTracks()) {
                return;
            }

            var allTracks = self.currentMediaElement.textTracks; // get list of tracks

            for (var i = 0; i < allTracks.length; i++) {

                var track = allTracks[i];

                // This throws an error in IE, but is fine in chrome
                // In IE it's not necessary anyway because changing the src seems to be enough
                try {
                    while (track.cues.length) {
                        track.removeCue(track.cues[0]);
                    }
                } catch (e) {
                    console.log('Error removing cue from textTrack');
                }
            }

            $('track', self.currentMediaElement).each(function () {

                var currentSrc = this.src;

                currentSrc = replaceQueryString(currentSrc, 'startPositionTicks', startPositionTicks);

                this.src = currentSrc;

            });
        };

        self.updateNowPlayingInfo = function (item) {

            if (!item) {
                throw new Error('item cannot be null');
            }

            var mediaControls = $("#videoPlayer");

            var state = self.getPlayerStateInternal(self.currentMediaElement, item, self.currentMediaSource);

            var url = "";

            if (state.NowPlayingItem.PrimaryImageTag) {

                url = ApiClient.getScaledImageUrl(state.NowPlayingItem.PrimaryImageItemId, {
                    type: "Primary",
                    width: 150,
                    tag: state.NowPlayingItem.PrimaryImageTag
                });
            }
            else if (state.NowPlayingItem.PrimaryImageTag) {

                url = ApiClient.getScaledImageUrl(state.NowPlayingItem.PrimaryImageItemId, {
                    type: "Primary",
                    width: 150,
                    tag: state.NowPlayingItem.PrimaryImageTag
                });
            }
            else if (state.NowPlayingItem.BackdropImageTag) {

                url = ApiClient.getScaledImageUrl(state.NowPlayingItem.BackdropItemId, {
                    type: "Backdrop",
                    height: 300,
                    tag: state.NowPlayingItem.BackdropImageTag,
                    index: 0
                });

            }
            else if (state.NowPlayingItem.ThumbImageTag) {

                url = ApiClient.getScaledImageUrl(state.NowPlayingItem.ThumbImageItemId, {
                    type: "Thumb",
                    height: 300,
                    tag: state.NowPlayingItem.ThumbImageTag
                });
            }

            var nowPlayingTextElement = $('.nowPlayingText', mediaControls);
            var nameHtml = self.getNowPlayingNameHtml(state);

            if (nameHtml.indexOf('<br/>') != -1) {
                nowPlayingTextElement.addClass('nowPlayingDoubleText');
            } else {
                nowPlayingTextElement.removeClass('nowPlayingDoubleText');
            }

            if (url) {
                $('.nowPlayingImage', mediaControls).html('<img src="' + url + '" />');
            } else {
                $('.nowPlayingImage', mediaControls).html('');
            }

            if (state.NowPlayingItem.LogoItemId) {

                url = ApiClient.getScaledImageUrl(state.NowPlayingItem.LogoItemId, {
                    type: "Logo",
                    height: 42,
                    tag: state.NowPlayingItem.LogoImageTag
                });

                $('.videoTopControlsLogo', mediaControls).html('<img src="' + url + '" />');
            } else {
                $('.videoTopControlsLogo', mediaControls).html('');
            }

            nowPlayingTextElement.html(nameHtml);
        };

        function onPositionSliderChange() {

            isPositionSliderActive = false;

            var newPercent = parseInt(this.value);

            var newPositionTicks = (newPercent / 100) * self.currentMediaSource.RunTimeTicks;

            self.changeStream(Math.floor(newPositionTicks));
        }

        $(function () {

            var parent = $("#mediaPlayer");
            muteButton = $('.muteButton', parent);
            unmuteButton = $('.unmuteButton', parent);
            currentTimeElement = $('.currentTime', parent);

            positionSlider = $(".positionSlider", parent).on('slidestart', function (e) {

                isPositionSliderActive = true;

            }).on('slidestop', onPositionSliderChange);

            volumeSlider = $('.volumeSlider', parent).on('slidestop', function () {

                var vol = this.value;

                updateVolumeButtons(vol);
                self.setVolume(vol * 100);
            });

            $('.videoChaptersPopup').on('click', '.mediaPopupOption', function () {

                var ticks = parseInt(this.getAttribute('data-positionticks'));

                self.changeStream(ticks);

                $('.videoChaptersPopup').popup('close');
            });

            $('.videoAudioPopup').on('click', '.mediaPopupOption', function () {

                if (!$(this).hasClass('selectedMediaPopupOption')) {
                    var index = parseInt(this.getAttribute('data-index'));

                    self.setAudioStreamIndex(index);
                }

                $('.videoAudioPopup').popup('close');
            });

            $('.videoSubtitlePopup').on('click', '.mediaPopupOption', function () {

                $('.videoSubtitlePopup').popup('close');

                if (!$(this).hasClass('selectedMediaPopupOption')) {

                    var index = parseInt(this.getAttribute('data-index'));

                    self.setSubtitleStreamIndex(index);
                }
            });

            $('.videoGuidePopup').on('click', '.guideChannel', function () {
                var channelId = this.getAttribute('data-channel-id');
                console.log(channelId);
                MediaController.play(channelId);
            });

            $('.videoQualityPopup').on('click', '.mediaPopupOption', function () {

                if (!$(this).hasClass('selectedMediaPopupOption')) {

                    var maxWidth = parseInt(this.getAttribute('data-maxwidth'));
                    var bitrate = parseInt(this.getAttribute('data-bitrate'));

                    AppSettings.maxStreamingBitrate(bitrate);

                    self.changeStream(self.getCurrentTicks(), {

                        MaxWidth: maxWidth,
                        Bitrate: bitrate
                    });
                }

                $('.videoQualityPopup').popup('close');
            });

            var trackChange = false;

            var tooltip = $('<div id="slider-tooltip"></div>');

            $(".videoControls .positionSliderContainer .slider").on("change", function (e) {
                if (!trackChange) return;

                var pct = $(this).val();

                var time = self.currentDurationTicks * (Number(pct) * .01);

                var tooltext = Dashboard.getDisplayTime(time);

                tooltip.text(tooltext);

                console.log("slidin", pct, self.currentDurationTicks, time);

            }).on("slidestart", function (e) {
                trackChange = true;

                var handle = $(".videoControls .positionSliderContainer .ui-slider-handle");

                handle.after(tooltip);
            }).on("slidestop", function (e) {
                trackChange = false;

                tooltip.remove();
            });

            $('.videoSubtitleButton').on('click', function () {

                self.showSubtitleMenu();
            });

            $('.videoGuideButton').on('click', function () {
                self.showLiveTvGuide();
            });

            $('.videoQualityButton').on('click', function () {

                self.showQualityFlyout();
            });

            $('.videoAudioButton').on('click', function () {

                self.showAudioTracksFlyout();
            });

            $('.videoChaptersButton').on('click', function () {

                self.showChaptersFlyout();
            });
        });

        function idleHandler() {

            if (timeout) {
                window.clearTimeout(timeout);
            }

            if (idleState == true) {
                $('.hiddenOnIdle').removeClass("inactive");
                $('#videoPlayer').removeClass('idlePlayer');
            }

            idleState = false;

            timeout = window.setTimeout(function () {
                idleState = true;
                $('.hiddenOnIdle').addClass("inactive");
                $('#videoPlayer').addClass('idlePlayer');
            }, 4000);
        }

        function updateVolumeButtons(vol) {

            if (vol) {
                muteButton.show();
                unmuteButton.hide();
            } else {
                muteButton.hide();
                unmuteButton.show();
            }
        }

        function requestFullScreen(element) {

            // Supports most browsers and their versions.
            var requestMethod = element.requestFullscreen || element.webkitRequestFullscreen || element.webkitRequestFullScreen || element.mozRequestFullScreen;

            if (requestMethod) { // Native full screen.
                requestMethod.call(element);
            } else {
                enterFullScreen();
            }

        }

        function enterFullScreen() {

            var player = $("#videoPlayer");

            player.addClass("fullscreenVideo");

            remoteFullscreen = true;

        }

        function exitFullScreenToWindow() {

            var player = $("#videoPlayer");

            player.removeClass("fullscreenVideo");

            remoteFullscreen = false;

        }

        function getChaptersFlyoutHtml() {

            var item = self.currentItem;
            var currentTicks = self.getCurrentTicks();
            var chapters = item.Chapters || [];

            var html = '';
            html += '<div class="videoPlayerPopupContent">';
            html += '<ul data-role="listview" data-inset="true"><li data-role="list-divider">' + Globalize.translate('HeaderScenes') + '</li>';
            html += '</ul>';

            html += '<div class="videoPlayerPopupScroller">';
            html += '<ul data-role="listview" data-inset="true">';

            var index = 0;

            html += chapters.map(function (chapter) {

                var cssClass = "mediaPopupOption";

                var selected = false;

                if (currentTicks >= chapter.StartPositionTicks) {
                    var nextChapter = chapters[index + 1];
                    selected = !nextChapter || currentTicks < nextChapter.StartPositionTicks;
                }

                var optionHtml = '<li><a data-positionticks="' + chapter.StartPositionTicks + '" class="' + cssClass + '" href="#" style="padding-top:0;padding-bottom:0;">';

                var imgUrl = "css/images/media/chapterflyout.png";

                if (chapter.ImageTag) {

                    optionHtml += '<img src="' + imgUrl + '" style="visibility:hidden;" />';
                    imgUrl = ApiClient.getScaledImageUrl(item.Id, {
                        width: 160,
                        tag: chapter.ImageTag,
                        type: "Chapter",
                        index: index
                    });
                    optionHtml += '<div class="videoChapterPopupImage" style="background-image:url(\'' + imgUrl + '\');"></div>';

                } else {
                    optionHtml += '<img src="' + imgUrl + '" />';
                }

                // TODO: Add some indicator if selected = true

                optionHtml += '<p style="margin:12px 0 0;">';

                var textLines = [];
                textLines.push(chapter.Name);
                textLines.push(Dashboard.getDisplayTime(chapter.StartPositionTicks));

                optionHtml += textLines.join('<br/>');

                optionHtml += '</p>';

                optionHtml += '</a></li>';

                index++;

                return optionHtml;

            }).join('');

            html += '</ul>';
            html += '</div>';

            html += '</div>';

            return html;
        }

        function getAudioTracksHtml() {

            var streams = self.currentMediaSource.MediaStreams.filter(function (currentStream) {
                return currentStream.Type == "Audio";
            });

            var currentIndex = getParameterByName('AudioStreamIndex', self.getCurrentSrc(self.currentMediaElement));

            var html = '';
            html += '<div class="videoPlayerPopupContent">';
            html += '<ul data-role="listview" data-inset="true"><li data-role="list-divider">' + Globalize.translate('HeaderAudioTracks') + '</li>';
            html += '</ul>';

            html += '<div class="videoPlayerPopupScroller">';
            html += '<ul data-role="listview" data-inset="true">';

            html += streams.map(function (stream) {

                var cssClass = "mediaPopupOption";

                var selected = stream.Index == currentIndex;

                if (selected) {
                    cssClass += ' selectedMediaPopupOption';
                }

                var optionHtml = '<li><a data-index="' + stream.Index + '" class="' + cssClass + '" href="#">';

                optionHtml += '<p style="margin:0;">';

                if (selected) {
                    optionHtml += '<img src="css/images/checkmarkgreen.png" style="width:18px;border-radius:3px;margin-right:.5em;vertical-align:middle;" />';
                }

                var textLines = [];
                textLines.push(stream.Language || Globalize.translate('LabelUnknownLanguage'));

                var attributes = [];

                if (stream.Codec) {
                    attributes.push(stream.Codec);
                }
                if (stream.Profile) {
                    attributes.push(stream.Profile);
                }

                if (stream.BitRate) {
                    attributes.push((Math.floor(stream.BitRate / 1000)) + ' kbps');
                }

                if (stream.Channels) {
                    attributes.push(stream.Channels + ' ch');
                }

                if (stream.IsDefault) {
                    attributes.push('(D)');
                }

                if (attributes.length) {
                    textLines.push(attributes.join('&nbsp;&#149;&nbsp;'));
                }

                optionHtml += textLines.join('<br/>');

                optionHtml += '</p>';

                optionHtml += '</a></li>';

                return optionHtml;

            }).join('');

            html += '</ul>';
            html += '</div>';

            html += '</div>';

            return html;
        }

        function getSubtitleTracksHtml() {

            var streams = self.currentMediaSource.MediaStreams.filter(function (currentStream) {
                return currentStream.Type == "Subtitle";
            });

            var currentIndex = self.currentSubtitleStreamIndex || -1;

            streams.unshift({
                Index: -1,
                Language: "Off"
            });

            var html = '';
            html += '<div class="videoPlayerPopupContent">';
            html += '<ul data-role="listview" data-inset="true"><li data-role="list-divider">' + Globalize.translate('HeaderSubtitles') + '</li>';
            html += '</ul>';

            html += '<div class="videoPlayerPopupScroller">';
            html += '<ul data-role="listview" data-inset="true">';

            html += streams.map(function (stream) {

                var cssClass = "mediaPopupOption";

                var selected = stream.Index == currentIndex;

                if (selected) {
                    cssClass += ' selectedMediaPopupOption';
                }

                var optionHtml = '<li><a data-index="' + stream.Index + '" class="' + cssClass + '" href="#">';

                optionHtml += '<p style="margin:0;">';

                if (selected) {
                    optionHtml += '<img src="css/images/checkmarkgreen.png" style="width:18px;border-radius:3px;margin-right:.5em;vertical-align:middle;" />';
                }

                var textLines = [];
                textLines.push(stream.Language || Globalize.translate('LabelUnknownLanguage'));

                if (stream.Codec) {
                    textLines.push(stream.Codec);
                }

                var attributes = [];

                if (stream.IsDefault) {
                    attributes.push('Default');
                }
                if (stream.IsForced) {
                    attributes.push('Forced');
                }
                if (stream.IsExternal) {
                    attributes.push('External');
                }

                if (attributes.length) {
                    textLines.push(attributes.join('&nbsp;&#149;&nbsp;'));
                }

                optionHtml += textLines.join('<br/>');

                optionHtml += '</p>';

                optionHtml += '</a></li>';

                return optionHtml;

            }).join('');

            html += '</ul>';
            html += '</div>';

            html += '</div>';

            return html;
        }

        function getGuideFlyoutHtml(channels, programs, startDate, endDate) {

            function getMinuteDiff(start, end) {
                return Math.floor((end - start) / 60000);
            }

            var guideMinutes = getMinuteDiff(startDate, endDate);

            var rowHeight = 46,
                minWidth = 6;

            function getTimePos(date) {
                return (Math.max(0, getMinuteDiff(startDate, Math.min(date, new Date(endDate.getTime() + 30 * 60 * 1000))))) * minWidth;
            }

            var html = '';

            html += '<div class="videoGuideContainer" style="overflow:auto;width:100%;height:' + (4.5 * rowHeight) + 'px;">';
            html += '<div class="videoGuide" style="margin-top:' + (rowHeight / 2) + 'px;margin-left:' + (30 * minWidth) + 'px;position:relative;height:' + (channels.length * rowHeight) + 'px;width:' + ((guideMinutes + 30) * minWidth) + 'px;">';

            for (var t = new Date(startDate.getTime()) ; t <= endDate; t.setTime(t.getTime() + (30 * 60 * 1000))) {
                html += '<div style="box-sizing:border-box;border:1px solid #ccc;border-bottom:0;border-right:0;position:absolute;bottom:100%;left:' + getTimePos(t) + 'px;width:' + (30 * minWidth) + 'px;line-height:' + (rowHeight / 2 - 1) + 'px;padding-left:6px;">' + LiveTvHelpers.getDisplayTime(t) + '</div>';
            }

            html += channels.map(function (c, i, a) {
                var channelId = c.Id;
                var channelHtml = '';

                channelHtml += '<div data-channel-id="' + channelId + '" class="guideChannel" style="cursor:pointer;box-sizing:border-box;position:absolute;top:' + (i * rowHeight) + 'px;right:100%;height:' + rowHeight + 'px;width:' + (minWidth * 30) + 'px;border-top:1px solid #ccc;padding:6px;">' + c.Name + '<br />' + c.Number + '</div>';

                channelHtml += programs.filter(function (p) {
                    return p.ChannelId === channelId
                }).map(function (p) {
                    var startPos = getTimePos(new Date(p.StartDate));
                    var endPos = getTimePos(new Date(p.EndDate));

                    var sD = new Date(p.StartDate);
                    var eD = new Date(p.EndDate);
                    console.log(sD.getHours() + ':' + sD.getMinutes() + ' - ' + eD.getHours() + ':' + eD.getMinutes());

                    return '<div data-channel-id="' + channelId + '" class="guideChannel" style="cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;box-sizing:border-box;position:absolute;top:' + (i * rowHeight) + 'px;left:' + startPos + 'px;height:' + rowHeight + 'px;width:' + (endPos - startPos) + 'px;border:1px solid #ccc;border-right:0;border-bottom:0;padding:6px;">' + p.Name + '<br />' + LiveTvHelpers.getDisplayTime(new Date(p.StartDate)) + ' - ' + LiveTvHelpers.getDisplayTime(new Date(p.EndDate)) + '</div>';
                }).join('');

                return channelHtml;
            }).join('');

            html += '</div>'; // .videoGuide
            html += '</div>'; // .videoPlayerPopupScroller

            return html;

            //html += '<ul data-role="listview" data-inset="true">';

            //html += channels.map(function (channel) {
            //    var cssClass = "mediaPopupOption";

            //    var channelHtml = '<li><a class="' + cssClass + '" href="#">';

            //    channelHtml += '<p style="margin:0;">';

            //    channelHtml += channel.Name;

            //    channelHtml += '</p>';

            //    channelHtml += '</a></li>';

            //    return channelHtml;
            //}).join('');

            //html += '</ul>';
        }

        function getQualityFlyoutHtml() {

            var currentSrc = self.getCurrentSrc(self.currentMediaElement).toLowerCase();
            var isStatic = currentSrc.indexOf('static=true') != -1;

            var options = getVideoQualityOptions(self.currentMediaSource.MediaStreams);

            if (isStatic) {
                options[0].name = "Direct";
            }

            var html = '';

            html += '<div class="videoPlayerPopupContent">';
            html += '<ul data-role="listview" data-inset="true"><li data-role="list-divider">' + Globalize.translate('HeaderVideoQuality') + '</li>';
            html += '</ul>';

            html += '<div class="videoPlayerPopupScroller">';
            html += '<ul data-role="listview" data-inset="true">';

            html += options.map(function (option) {

                var cssClass = "mediaPopupOption";

                if (option.selected) {
                    cssClass += ' selectedMediaPopupOption';
                }

                var optionHtml = '<li><a data-maxwidth="' + option.maxWidth + '" data-bitrate="' + option.bitrate + '" class="' + cssClass + '" href="#">';

                optionHtml += '<p style="margin:0;">';

                if (option.selected) {
                    optionHtml += '<img src="css/images/checkmarkgreen.png" style="width:18px;border-radius:3px;margin-right:.5em;vertical-align:middle;" />';
                }

                optionHtml += option.name;

                optionHtml += '</p>';

                optionHtml += '</a></li>';

                return optionHtml;

            }).join('');

            html += '</ul>';
            html += '</div>';

            html += '</div>';

            return html;
        }

        function getVideoQualityOptions(mediaStreams) {

            var videoStream = mediaStreams.filter(function (stream) {
                return stream.Type == "Video";
            })[0];

            var bitrateSetting = AppSettings.maxStreamingBitrate();

            var maxAllowedWidth = self.getMaxPlayableWidth();

            var options = [];

            // We have media info
            if (videoStream && videoStream.Width) {

                maxAllowedWidth = videoStream.Width;
            }

            // Some 1080- videos are reported as 1912?
            if (maxAllowedWidth >= 1900) {
                options.push({ name: '1080p - 30Mbps', maxWidth: 1920, bitrate: 30000000 });
                options.push({ name: '1080p - 25Mbps', maxWidth: 1920, bitrate: 25000000 });
                options.push({ name: '1080p - 20Mbps', maxWidth: 1920, bitrate: 20000000 });
                options.push({ name: '1080p - 15Mbps', maxWidth: 1920, bitrate: 15000000 });
                options.push({ name: '1080p - 10Mbps', maxWidth: 1920, bitrate: 10000000 });
                options.push({ name: '1080p - 8Mbps', maxWidth: 1920, bitrate: 8000000 });
                options.push({ name: '1080p - 6Mbps', maxWidth: 1920, bitrate: 6000000 });
                options.push({ name: '1080p - 5Mbps', maxWidth: 1920, bitrate: 5000000 });
            }
            else if (maxAllowedWidth >= 1260) {
                options.push({ name: '720p - 10Mbps', maxWidth: 1280, bitrate: 10000000 });
                options.push({ name: '720p - 8Mbps', maxWidth: 1280, bitrate: 8000000 });
                options.push({ name: '720p - 6Mbps', maxWidth: 1280, bitrate: 6000000 });
                options.push({ name: '720p - 5Mbps', maxWidth: 1280, bitrate: 5000000 });
            }
            else if (maxAllowedWidth >= 460) {
                options.push({ name: '480p - 4Mbps', maxWidth: 720, bitrate: 4000000 });
                options.push({ name: '480p - 3Mbps', maxWidth: 720, bitrate: 3000000 });
                options.push({ name: '480p - 2.5Mbps', maxWidth: 720, bitrate: 2500000 });
                options.push({ name: '480p - 2Mbps', maxWidth: 720, bitrate: 2000000 });
                options.push({ name: '480p - 1.5Mbps', maxWidth: 720, bitrate: 1500000 });
            }

            if (maxAllowedWidth >= 1260) {
                options.push({ name: '720p - 4Mbps', maxWidth: 1280, bitrate: 4000000 });
                options.push({ name: '720p - 3Mbps', maxWidth: 1280, bitrate: 3000000 });
                options.push({ name: '720p - 2Mbps', maxWidth: 1280, bitrate: 2000000 });

                // The extra 1 is because they're keyed off the bitrate value
                options.push({ name: '720p - 1Mbps', maxWidth: 1280, bitrate: 1000001 });
            }

            options.push({ name: '480p - 1.0Mbps', maxWidth: 720, bitrate: 1000000 });
            options.push({ name: '480p - 720kbps', maxWidth: 720, bitrate: 720000 });
            options.push({ name: '480p - 420kbps', maxWidth: 720, bitrate: 420000 });
            options.push({ name: '360p', maxWidth: 640, bitrate: 400000 });
            options.push({ name: '240p', maxWidth: 426, bitrate: 320000 });

            var i, length, option;
            var selectedIndex = -1;
            for (i = 0, length = options.length; i < length; i++) {

                option = options[i];

                if (selectedIndex == -1 && option.bitrate <= bitrateSetting) {
                    selectedIndex = i;
                }
            }

            if (selectedIndex == -1) {

                selectedIndex = options.length - 1;
            }

            options[selectedIndex].selected = true;

            return options;
        }

        function bindEventsForPlayback() {

            var hideElementsOnIdle = !$.browser.mobile;

            if (hideElementsOnIdle) {
                $('.itemVideo').off('mousemove.videoplayer keydown.videoplayer scroll.videoplayer', idleHandler);
                $('.itemVideo').on('mousemove.videoplayer keydown.videoplayer scroll.videoplayer', idleHandler).trigger('mousemove');
            }

            $(document).on('webkitfullscreenchange.videoplayer mozfullscreenchange.videoplayer fullscreenchange.videoplayer', function (e) {

                if (self.isFullScreen()) {
                    enterFullScreen();
                    idleState = true;

                } else {
                    exitFullScreenToWindow();
                }

                fullscreenExited = self.isFullScreen() == false;

            }).on("msfullscreenchange.videoplayer", function (e) {

                fullscreenExited = self.isFullScreen() == false;

            }).on("keyup.videoplayer", function (e) {

                if (fullscreenExited) {
                    $("#videoPlayer", $("#mediaPlayer")).removeClass("fullscreenVideo");
                    fullscreenExited = false;
                    return;
                }

                if (e.keyCode == 27) {
                    self.stop();
                }
            });

            // Stop playback on browser back button nav
            $(window).one("popstate.videoplayer", function () {
                self.stop();
                return;
            });

            if (hideElementsOnIdle) {
                $(document.body).on("mousemove.videplayer", "#itemVideo", function () {

                    idleHandler(this);
                });
            }
        }

        function unbindEventsForPlayback() {

            $(document).off('webkitfullscreenchange.videoplayer mozfullscreenchange.videoplayer fullscreenchange.videoplayer').off("msfullscreenchange.videoplayer").off("keyup.videoplayer");

            // Stop playback on browser back button nav
            $(window).off("popstate.videoplayer");

            $(document.body).off("mousemove.videplayer");

            $('.itemVideo').off('mousemove.videoplayer keydown.videoplayer scroll.videoplayer');
        }

        self.canAutoPlayVideo = function () {

            if ($.browser.msie || $.browser.mobile) {
                return false;
            }

            return true;
        };

        // Replace audio version
        self.cleanup = function (playerElement) {

            if (playerElement.tagName.toLowerCase() == 'video') {
                currentTimeElement.html('--:--');

                unbindEventsForPlayback();
            }
        };

        self.playVideo = function (item, mediaSource, startPosition) {

            var mediaStreams = mediaSource.MediaStreams || [];

            var subtitleStreams = mediaStreams.filter(function (s) {
                return s.Type == 'Subtitle';
            });

            var selectedSubtitleStream = subtitleStreams.filter(function (s) {
                return s.Index == mediaSource.DefaultSubtitleStreamIndex;

            })[0];

            var baseParams = {
                audioChannels: 2,
                StartTimeTicks: startPosition,
                AudioStreamIndex: mediaSource.DefaultAudioStreamIndex,
                deviceId: ApiClient.deviceId(),
                Static: false,
                mediaSourceId: mediaSource.Id,
                api_key: ApiClient.accessToken()
            };

            if (selectedSubtitleStream && (!self.supportsSubtitleStreamExternally(selectedSubtitleStream) || !self.supportsTextTracks())) {
                baseParams.SubtitleStreamIndex = mediaSource.DefaultSubtitleStreamIndex;
            }

            var mp4Quality = getVideoQualityOptions(mediaStreams).filter(function (opt) {
                return opt.selected;
            })[0];
            mp4Quality = $.extend(mp4Quality, self.getFinalVideoParams(mediaSource, mp4Quality.maxWidth, mp4Quality.bitrate, baseParams.AudioStreamIndex, baseParams.SubtitleStreamIndex, '.mp4'));

            var webmQuality = getVideoQualityOptions(mediaStreams).filter(function (opt) {
                return opt.selected;
            })[0];
            webmQuality = $.extend(webmQuality, self.getFinalVideoParams(mediaSource, webmQuality.maxWidth, webmQuality.bitrate, baseParams.AudioStreamIndex, baseParams.SubtitleStreamIndex, '.webm'));

            var m3U8Quality = getVideoQualityOptions(mediaStreams).filter(function (opt) {
                return opt.selected;
            })[0];
            m3U8Quality = $.extend(m3U8Quality, self.getFinalVideoParams(mediaSource, mp4Quality.maxWidth, mp4Quality.bitrate, baseParams.AudioStreamIndex, baseParams.SubtitleStreamIndex, '.mp4'));

            var isStatic = mp4Quality.isStatic;

            self.startTimeTicksOffset = isStatic ? 0 : startPosition || 0;

            var startPositionInSeekParam = startPosition ? (startPosition / 10000000) : 0;
            var seekParam = startPositionInSeekParam ? '#t=' + startPositionInSeekParam : '';

            var mp4VideoUrl = ApiClient.getUrl('Videos/' + item.Id + '/stream.mp4', $.extend({}, baseParams, {
                Static: isStatic,
                maxWidth: mp4Quality.maxWidth,
                videoBitrate: mp4Quality.videoBitrate,
                audioBitrate: mp4Quality.audioBitrate,
                VideoCodec: mp4Quality.videoCodec,
                AudioCodec: mp4Quality.audioCodec,
                profile: 'high',
                //EnableAutoStreamCopy: false,
                level: '41'
            }));

            if (isStatic && mediaSource.Protocol == 'Http' && !mediaSource.RequiredHttpHeaders.length) {
                mp4VideoUrl = mediaSource.Path;
            }

            if (isStatic) {
                mp4VideoUrl += seekParam;
            } else {
                mp4VideoUrl += "&ClientTime=" + new Date().getTime();
            }

            var webmVideoUrl = ApiClient.getUrl('Videos/' + item.Id + '/stream.webm', $.extend({}, baseParams, {
                VideoCodec: 'vpx',
                AudioCodec: 'Vorbis',
                maxWidth: webmQuality.maxWidth,
                videoBitrate: webmQuality.videoBitrate,
                audioBitrate: webmQuality.audioBitrate,
                EnableAutoStreamCopy: false,
                ClientTime: new Date().getTime()
            }));

            var hlsVideoUrl = ApiClient.getUrl('Videos/' + item.Id + '/master.m3u8', $.extend({}, baseParams, {
                maxWidth: m3U8Quality.maxWidth,
                videoBitrate: m3U8Quality.videoBitrate,
                audioBitrate: m3U8Quality.audioBitrate,
                VideoCodec: m3U8Quality.videoCodec,
                AudioCodec: m3U8Quality.audioCodec,
                profile: 'high',
                level: '41',
                StartTimeTicks: 0,
                ClientTime: new Date().getTime()

            })) + seekParam;

            //======================================================================================>

            // Create video player
            var html = '';

            var requiresNativeControls = !self.canAutoPlayVideo();

            // Can't autoplay in these browsers so we need to use the full controls
            if (requiresNativeControls) {
                html += '<video class="itemVideo" id="itemVideo" preload="none" autoplay="autoplay" controls="controls">';
            } else {

                // Chrome 35 won't play with preload none
                html += '<video class="itemVideo" id="itemVideo" preload="metadata" autoplay>';
            }

            if (!isStatic) {
                // HLS must be at the top for safari
                html += '<source type="application/x-mpegURL" src="' + hlsVideoUrl + '" />';
            }

            var mp4BeforeWebm = self.getVideoTranscodingExtension() != '.webm';

            if (mp4BeforeWebm) {
                html += '<source type="video/mp4" src="' + mp4VideoUrl + '" />';
            }

            // Have to put webm ahead of mp4 because it will play in fast forward in chrome
            // And firefox doesn't like fragmented mp4
            if (!isStatic) {

                html += '<source type="video/webm" src="' + webmVideoUrl + '" />';
            }

            if (!mp4BeforeWebm) {
                html += '<source type="video/mp4" src="' + mp4VideoUrl + '" />';
            }

            if (self.supportsTextTracks()) {
                var textStreams = subtitleStreams.filter(function (s) {
                    return self.supportsSubtitleStreamExternally(s);
                });

                for (var i = 0, length = textStreams.length; i < length; i++) {

                    var textStream = textStreams[i];
                    var textStreamUrl = ApiClient.getUrl('Videos/' + item.Id + '/' + mediaSource.Id + '/Subtitles/' + textStream.Index + '/Stream.vtt', {
                        startPositionTicks: (startPosition || 0),
                        api_key: ApiClient.accessToken()
                    });

                    var defaultAttribute = textStream.Index == mediaSource.DefaultSubtitleStreamIndex ? ' default' : '';

                    html += '<track kind="subtitles" src="' + textStreamUrl + '" srclang="' + (textStream.Language || 'und') + '"' + defaultAttribute + '></track>';
                }
            }

            html += '</video>';

            var mediaPlayerContainer = $("#mediaPlayer").show();
            var videoControls = $('.videoControls', mediaPlayerContainer);

            //show stop button
            $('#video-playButton', videoControls).hide();
            $('#video-pauseButton', videoControls).show();
            $('#video-previousTrackButton', videoControls).hide();
            $('#video-nextTrackButton', videoControls).hide();

            var videoElement = $('#videoElement', mediaPlayerContainer).prepend(html);

            $('.videoQualityButton', videoControls).show();

            if (mediaStreams.filter(function (s) {
                return s.Type == "Audio";
            }).length) {
                $('.videoAudioButton').show();
            } else {
                $('.videoAudioButton').hide();
            }

            if (subtitleStreams.length) {
                $('.videoSubtitleButton').show();
            } else {
                $('.videoSubtitleButton').hide();
            }

            if (item.Chapters && item.Chapters.length) {
                $('.videoChaptersButton').show();
            } else {
                $('.videoChaptersButton').hide();
            }

            if (item.Type == 'TvChannel') {
                $('.videoGuideButton').show();
            } else {
                $('.videoGuideButton').hide();
            }

            if (requiresNativeControls) {
                $('#video-fullscreenButton', videoControls).hide();
            } else {
                $('#video-fullscreenButton', videoControls).show();
            }

            if ($.browser.mobile) {
                $('.volumeSliderContainer', videoControls).addClass('hide');
                $('.muteButton', videoControls).addClass('hide');
                $('.unmuteButton', videoControls).addClass('hide');
            } else {
                $('.volumeSliderContainer', videoControls).removeClass('hide');
                $('.muteButton', videoControls).removeClass('hide');
                $('.unmuteButton', videoControls).removeClass('hide');
            }

            if (requiresNativeControls) {
                videoControls.addClass('hide');
            } else {
                videoControls.removeClass('hide');
            }

            var video = $("video", videoElement);

            initialVolume = self.getSavedVolume();

            video.each(function () {
                this.volume = initialVolume;
            });

            volumeSlider.val(initialVolume).slider('refresh');
            updateVolumeButtons(initialVolume);

            video.one("loadedmetadata.mediaplayerevent", function (e) {

                // TODO: This is not working in chrome. Is it too early?

                // Appending #t=xxx to the query string doesn't seem to work with HLS
                if (startPositionInSeekParam && this.currentSrc && this.currentSrc.toLowerCase().indexOf('.m3u8') != -1) {
                    this.currentTime = startPositionInSeekParam;
                }

            }).on("volumechange.mediaplayerevent", function (e) {

                var vol = this.volume;

                updateVolumeButtons(vol);

            }).one("playing.mediaplayerevent", function () {


                // For some reason this is firing at the start, so don't bind until playback has begun
                $(this).on("ended.playbackstopped", self.onPlaybackStopped).one('ended.playnext', self.playNextAfterEnded);

                self.onPlaybackStart(this, item, mediaSource);

            }).on("pause.mediaplayerevent", function (e) {

                $('#video-playButton', videoControls).show();
                $('#video-pauseButton', videoControls).hide();
                $("#pause", videoElement).show().addClass("fadeOut");
                setTimeout(function () {
                    $("#pause", videoElement).hide().removeClass("fadeOut");
                }, 300);

            }).on("playing.mediaplayerevent", function (e) {

                $('#video-playButton', videoControls).hide();
                $('#video-pauseButton', videoControls).show();
                $("#play", videoElement).show().addClass("fadeOut");
                setTimeout(function () {
                    $("#play", videoElement).hide().removeClass("fadeOut");
                }, 300);

            }).on("timeupdate.mediaplayerevent", function () {

                if (!isPositionSliderActive) {

                    self.setCurrentTime(self.getCurrentTicks(this), positionSlider, currentTimeElement);
                }

            }).on("error.mediaplayerevent", function () {

                self.stop();

                var errorCode = this.error ? this.error.code : '';
                console.log('Html5 Video error code: ' + errorCode);

                var errorMsg = Globalize.translate('MessageErrorPlayingVideo');

                if (item.Type == "TvChannel") {
                    errorMsg += '<p>';
                    errorMsg += Globalize.translate('MessageEnsureOpenTuner');
                    errorMsg += '</p>';
                }

                if ($.browser.msie && !$.browser.mobile && !self.canPlayWebm()) {
                    errorMsg += '<p>';
                    errorMsg += '<a href="https://tools.google.com/dlpage/webmmf/" target="_blank">';
                    errorMsg += Globalize.translate('MessageInternetExplorerWebm');
                    errorMsg += '</a>';
                    errorMsg += '</p>';
                }

                Dashboard.alert({
                    title: Globalize.translate('HeaderVideoError'),
                    message: errorMsg
                });


            }).on("click.mediaplayerevent", function (e) {

                if (this.paused) {
                    self.unpause();
                } else {
                    self.pause();
                }

            }).on("dblclick.mediaplayerevent", function () {

                self.toggleFullscreen();

            });

            bindEventsForPlayback();

            mediaPlayerContainer.trigger("create");

            fullscreenExited = false;

            self.currentSubtitleStreamIndex = mediaSource.DefaultSubtitleStreamIndex;

            $('body').addClass('bodyWithPopupOpen');

            return video[0];
        };
    }

    createVideoPlayer(MediaPlayer);

})();