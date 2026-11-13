(function($, undefined) {

	window.agendaObj = { };
	window.Agenda = function(id, calendars) {
		this._entries = new Array();
		this._count = 0;
		//this._baseURL = 'http://www.google.com/calendar/feeds/#ID#/public/full';
		this._baseURL = 'https://www.googleapis.com/calendar/v3/calendars/#ID#/events'
		//https://clients6.google.com/calendar/v3/calendars/garza.joseph.m@gmail.com/events?calendarId=garza.joseph.m%40gmail.com&singleEvents=true&timeZone=America%2FChicago&maxAttendees=1&maxResults=250&sanitizeHtml=true&timeMin=2015-07-26T00%3A00%3A00-05%3A00&timeMax=2015-09-06T00%3A00%3A00-05%3A00&key=AIzaSyBNlYH01_9Hc5S

		
		this._calendars = calendars | new Array();
		this._id = id;
		this._title = 'My Agenda';
		this._zone = 'America/Chicago';
		this._errorText = '';
		this._key = 'AIzaSyChH0hcCvFB2PhRvO2eFBPxnenATAs63Fc'
		agendaObj = this;
	};
	window.Agenda.prototype = {
		getEntries: function() {
			return this._entries;
		},
		getEntry: function(index) {
			if (this._entries.length == 0)
				return undefined;

			return this._entries[index % this._entries.length];
		},
		getCalendars: function() {
			/// <summary></summary>
			/// <returns></returns>

			return this._calendars;
		},
		setCalendars: function(newCalendarArray) {
			this._calendars = newCalendarArray;
		},
		getTitle: function() {
			return this._title;
		},
		setTitle: function(value) {
			this._title = value;
		},
		getID: function() {
			return this._id;
		},
		setID: function(value) {
			this._id = value;
		},
		render: function() {
			var i, j, html, results;
			var timeObj, t, dt;

			if (agendaObj._errorText.length > 0) {
				document.getElementById(agendaObj._id).innerHTML = '<h3>Error Loading Calendar</h3><p>' + agendaObj._errorText + '</p>';
			} else {
				html = '<h3>' + agendaObj._title + '</h3>';
				html += '<ul>';

				agendaObj.sort();
				dt = new Date();

				for (i = 0; i < agendaObj._entries.length; i++) {
					timeObj = agendaObj._entries[i].getTimes()[0];
					t = this._getTime(timeObj.getStartTime().getDate(), timeObj.getEndTime().getDate());

					html += '<li><a href="' + agendaObj._entries[i].getHtmlLink().getHref() + '">';

					//makes sure that the days match.
					if (dt.getDate() >= timeObj.getStartTime().getDate().getDate()) {

						var text = agendaObj._entries[i].getTitle().getText();

						//clean up some bad data
						switch (agendaObj._entries[i].getAuthors()[0].getName().getValue().toUpperCase()) {
						case 'PHASES OF THE MOON':
						case 'SUNRISE/SUNSET: DES MOINES':
                                //when getting the feed publicly it messes up the times.
							text = text.replace( /\d?\d\:\d\d[ap]m/g , this._correctTimeString);
						case 'WEATHER: DES MOINES':
						default:
							text = text.replace('des moines', 'Des Moines');
							break;
						}

						html += (t.length > 0) ? t + ' - ' : '';
						html += text;
						html += '</a></li>';
					}
				}

				html += '</ul>';

				// Output HTML and clear 'Loading...' screen
				document.getElementById(agendaObj._id).innerHTML = html;
			}
		},
		sort: function() {
			this._entries.sort(function(left, right) {

				var timeObj = left.getTimes()[0];
				var leftTime = agendaObj._getTime(timeObj.getStartTime().getDate(), timeObj.getEndTime().getDate());

				var timeObj = right.getTimes()[0];
				var rightTime = agendaObj._getTime(timeObj.getStartTime().getDate(), timeObj.getEndTime().getDate());

				return (leftTime > rightTime);
			});
		},
		_getTime: function(dtStart, dtEnd) {
			var t;
			dtEnd = dtEnd || dtStart;

			if (dtStart.getHours() === dtEnd.getHours() && dtEnd.getHours() === 0)
				t = '';
			else {
				t = dtStart.getHours().toString() + ':';
				t += ((dtStart.getMinutes() < 10) ? '0' : '') + dtStart.getMinutes();
			}

			return t;
			;
		},
		_callback: function(result) {
			///<summary>The callback method that will be called when getEventsFeed() returns feed data</summary>
			///<param name="result" type="Object"></param>
			var i;

			for (i = 0; i < result.feed.entry.length; i++) {
				agendaObj._entries.push(result.feed.entry[i]);
			}

			if (++this._count === calendars.length)
				agendaObj.render();
		},
		_error: function(error) {
			// Error handler to be invoked when getEventsFeed() produces an error
			agendaObj._errorText += error + '<br />';
			agendaObj._count++;
		},
		_correctTimeString: function(match) {
			var hour = parseInt(match);
			var correctHour = ((hour + 5) % 12 + 1);
			var iCol = match.indexOf(':');
			var ap = match.substring(iCol + 3, iCol + 4);

			return '' + correctHour + match.substring(iCol, iCol + 3)
				+ (correctHour > hour ? (ap == 'a' ? 'p' : 'a') : ap) + 'm';
		},
		load: function() {
			// Obtain a reference to the 'content' div
			var content = document.getElementById(this._id);

			// Create the calendar service object
			var calendarService = new google.gdata.calendar.CalendarService('com.appspot.interactivesampler');

			// The "public/full" feed is used to retrieve events from the named public
			// calendar with full projection.
			var startDate = new Date();
			startDate.setHours(0, 0, 0, 0); // reset the hours to zero, so we get those day long events.
			var endDate = new Date();
			endDate.setHours(23, 59, 59, 999);

			startDate = google.gdata.DateTime.toIso8601(startDate);
			endDate = google.gdata.DateTime.toIso8601(endDate);

			this._entries = new Array();
			this._count = 0;
			for (var i = 0; i < calendars.length; i++) {
				var feedUri = this._baseURL.replace('#ID#', calendars[i].id);
				feedUri += '?';
				feedUri += 'ctz=' + this._zone; //this is ignored sometimes, has something to do with access a private feed, publically or somee such.
				feedUri += '&start-min=' + startDate;
				feedUri += '&start-max=' + endDate;
				feedUri += '&key=' + this._key;

				// Submit the request using the calendar service object
				calendarService.getEventsFeed(feedUri,
					function(evt) { agendaObj._callback(evt); },
					function(evt) { agendaObj._error(evt); }
				);
			}
		}
	};
})(jQuery);