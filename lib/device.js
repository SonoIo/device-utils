;(function (window, factory) {

	"use strict";

	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['jquery', 'underscore', 'backbone'], function(){
			return factory.apply(window, arguments);
		});
	} else if (typeof module === 'object' && module.exports) {
		// CommonJS
		module.exports = factory.call(window, require('jquery'), require('underscore'), require('backbone'));
	} else {
		// Browser globals
		window.Device = factory.call(window, window.$, window._, window.Backbone);
	}
}(typeof global === 'object' ? global : this, function ($, _, Backbone) {

/*

# Device
Classe che aiuta l'interazione con i dispositivi mobile e i browser

## Events
### changeViewport
Generato quando cambia la dimensione della finestra o l'orientamento del browser

*/

// Classe per l'interazione con il device, fornisce tutte le
// utility per lavorare con i device mobili e i browser.
var Device = _.extend({}, Backbone.Events);

// Defaults

// Presumo che l'applicazione quando viene aperta sia attiva.
Device._active = true;


var force = {
	'retina': false,
	'osClass': null,
	'standalone': false
};

var appliedSettings = {};

Device.force = function (which, value) {
	force[which] = value;
	Device.bind();
}

// Restituisce una middleware che inietta device nello shared object
Device.middleware = function middleware() {
	var self = this;
	return function (shared, next) {
		shared.device = self;

		// Se mi trovo nel browser proseguo
		if ( !self.isMobileApp() ){
			next();
		}else{
			// Altrimenti se mi trovo nella Applicazioni cordova/phonegap aspetto l'evento on device ready
			document.addEventListener("deviceready", 
				function(e){
					next();
				}, false);
		}
	}
}

//
Device.testMediaQuery = function testMediaQuery( mq ) {

	var matchMedia = window.matchMedia || window.msMatchMedia;
	if ( matchMedia ) {
		return matchMedia(mq) && matchMedia(mq).matches || false;
	}

	return false;
}

// Restituisce lo stato attuale del viewport
Device.getViewport = function getViewport() {
	var orientation = undefined;
			
	if ( Device.getOS().name == 'iOS' && Device.testMediaQuery('(orientation: landscape)') )
		orientation = "landscape";
	else if ( Device.getOS().name == 'iOS' && Device.testMediaQuery('(orientation: portrait)'))
		orientation = "portrait";
	else if ( Device.getOS().name == 'Android' && window.innerHeight > window.innerWidth )
		orientation = "portrait";
	else if ( Device.getOS().name == 'Android' && window.innerHeight < window.innerWidth )
		orientation = "landscape";

	return {
		orientation: orientation,
		width: $(window).width(),
		height: $(window).height()
	}
	
}

// Verifica se il display in uso è un retina display o un display
// ad alta risoluzione generico
Device.isRetina = function isRetina() {
	if (force.retina)
		return true;

	if (window.matchMedia) { 
		var mq = window.matchMedia("only screen and (-moz-min-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)");
		if (mq && mq.matches) {
			return true;
		} 
	}
	return false;
}

// OS
Device.getOS = function getOS() {
	var result = null;
	var ua = navigator.userAgent;
	// Android test
	if (ua.indexOf("Android") >= 0) {
		var androidversion = parseFloat(ua.slice(ua.indexOf("Android") + 8));
		result = {
			name: 'Android',
			version: androidversion
		}
	}
	// iOS test
	else if (/iP(hone|od|ad)/.test(navigator.platform)) {
		// supports iOS 2.0 and later: <http://bit.ly/TJjs1V>
		var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
		result = {
			name: 'iOS',
			version: [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)]
		}
	}
	// is an App test
	else if (typeof global === 'object' && global.window.nwDispatcher && global.window.process && global.window.process.versions['node-webkit']){
		result = {
			name: 'Desktop',
			version: global.window.process.versions['node-webkit'].split(".")
		}
	}
	// Browser
	else {
		result = {
			name: 'browser',
			version: ['']
		}
	}
	return result;
}


// Ottiene le info sul browser
Device.getBrowser = function getBrowser(){
	var ua= navigator.userAgent, 
	N= navigator.appName, tem, 
	M= ua.match(/(opera|chrome|safari|firefox|msie|trident)\/?\s*([\d\.]+)/i) || [];
	M= M[2]? [M[1], M[2]]:[N, navigator.appVersion, '-?'];
	if(M && (tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];
	return {
		name: M[0] ? M[0] : null,
		version: M[1] ? M[1] : null
	};
}


// Window
Device.getWindow = function getWindow() {
	if (this.isDesktop()) {
		var gui = global.window.nwDispatcher.requireNwGui();
		var win = gui.Window.get();
		return win;
	}
	return window;
}


// GUI object of window
Device.getGui = function getGui() {
	if (this.isDesktop()) {
		var gui = global.window.nwDispatcher.requireNwGui();
		return gui;
	}
	return null;
}

// Get ppi
Device.getPPI = function getPPI(){
	// create an empty element
	var div = document.createElement("div");
	// give it an absolute size of one inch
	div.style.width="1in";
	// append it to the body
	var body = document.getElementsByTagName("body")[0];
	body.appendChild(div);
	// read the computed width
	var ppi = document.defaultView.getComputedStyle(div, null).getPropertyValue('width');
	// remove it again
	body.removeChild(div);
	// and return the value
	return parseFloat(ppi);
}

// Inch of screen
Device.getInchOfScreen = function getInchOfScreen(){
	
	// Get the pixels per inch horizontal  
	var ppi = Device.getPPI();
	
	var viewport = Device.getViewport();
	    
	// Get screen width and height  
	var width  = viewport.width;
	var height = viewport.height;
	    
	// Use some Pythagoras magic  
	var square_w = width * width;
	var square_h = height * height;
	          
	// Get the diagonal in pixels  
	var diagonal_p = Math.sqrt( square_w + square_h );
	    
	// Divide that through the pixels per inch and you got the diagonal.  
	return diagonal_p / ppi;
}



// Restituisce true se l'applicazione è in modalità standalone, 
// ovvero in full screen.
Device.isStandalone = function isStandalone() {
	return window.navigator.standalone;
}

Device.isTablet = function isTablet(){
	return Device.getInchOfScreen() >= 6.5;
}

Device.isSmartphone = function isSmartphone(){
	return Device.getInchOfScreen() < 6.5;
}

Device.isIpad = function isIpad(){
	return navigator.userAgent.match(/iPad/i);
}

Device.isIphone = function isIphone(){
	return navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPod/i);
}

Device.isAndroid = function isAndroid(){
	if ( !Device.isMobileApp() ){
		return navigator.userAgent.match(/Android/i);
	}else{
		return Device.getCordova().platformId.toLocaleLowerCase() === "android";
	}
}

Device.isMobileApp = function isMobileApp(){
	return typeof window.cordova !== "undefined" || typeof window.phonegap !== "undefined";
}

Device.isDesktop = function isDesktop() {
	if (typeof global === 'object')
		return !!global.window.nwDispatcher;
	return false;
}

Device.isBrowser = function isBrowser(){
	return !Device.isMobileApp() && !Device.isDesktop();
}

Device.getCordova = function getCordova() {
	return window.cordova || window.phonegap;
}

Device.isActive = function isActive() {
	return this._active;
}

Device.isFullscreen = function isFullscreen() {
	return document.fullscreen
		|| document.mozFullScreen
		|| document.webkitIsFullScreen
		|| document.msFullscreenElement;
}

Device.onOrientationChange = function onOrientationChange(event) {
	Device.trigger('changeViewport', Device.getViewport());
}

Device.onFocusBlur = function onFocusBlur(e) {
	if (Device._prevType != e.type) { // reduce double fire issues
		switch (e.type) {
			case 'blur':
				Device._active = false;
				Device.trigger('active', false);
				break;
			case 'focus':
				Device._active = true;
				Device.trigger('active', true);
				break;
		}
	}
	Device._prevType = e.type;
}

Device.onFullscreenChange = function onFullscreenChange(e) {
	var className = 'fullScreen ';
	switch (e.type) {
		case 'mozfullscreenchange':
			className += 'mozFullScreen';
			break;
		case 'webkitfullscreenchange':
			className += 'webkitFullScreen';
			break;
		case 'msfullscreenchange':
			className += 'msFullScreen';
			break;
	};

	if (Device.isFullscreen()) {
		$('html').addClass(className);
		Device.trigger('fullscreenchange', { 
			type: e.type,
			fullscreen: true 
		});
	}
	else {
		$('html').removeClass(className);
		Device.trigger('fullscreenchange', { 
			type: e.type,
			fullscreen: false 
		});
	}
}

Device.openExternalLink = function openExternalLink(url) {
	if (this.isDesktop()) {
		var gui = global.window.nwDispatcher.requireNwGui();
		gui.Shell.openExternal(url);
	}
	else {
		var newWin = window.open(url, '_blank');
		newWin.focus();
	}
}

Device.bind = function bind() {
	// Cleanup
	Device.destroy();

	if ( Device.isIpad() ){
		$('html').addClass('ipad');
	}

	if ( Device.isIphone() ){
		$('html').addClass('iphone');
	}

	if ( Device.isAndroid() ){
		$('html').addClass('android');
	} 

	if ( Device.isDesktop() ){
		$('html').addClass('desktop');
	}

	// OS version on HTML class (ios ios7, ios ios6, android android4, desktop desktop0 ...)
	var os = Device.getOS();
	var osClass = force.osClass || ( os.name.toLowerCase() + " " + os.name.toLowerCase() + os.version[0] );
	if (osClass) {
		$('html').addClass(osClass);
		appliedSettings.osClass = osClass;
	}
	// Standalone class
	if (Device.isStandalone() || force.standalone) {
		$('html').addClass('standalone');
		appliedSettings.standalone = 'standalone';
	}

	if (Device.isDesktop()) {
		var win = Device.getWindow();
		win.on('focus', function() {
			Device.onFocusBlur({ type: 'focus' });
		});
		win.on('blur', function() {
			Device.onFocusBlur({ type: 'blur' });
		});
	}

	// Focus finestra
	$(window).bind('focus blur', Device.onFocusBlur);

	// Device ruotato o finestra ridimensionata
	$(window).bind('orientationchange resize', Device.onOrientationChange);

	// Fullscreen
	$(window).bind('fullscreenchange mozfullscreenchange webkitfullscreenchange msfullscreenchange', Device.onFullscreenChange);
}

// Rimuove gli elementi collegati dalla classe device
Device.destroy = function destroy() {
	if (appliedSettings.iOSVersion)
		$('html').removeClass(appliedSettings.iOSVersion);
	if (appliedSettings.standalone)
		$('html').removeClass(appliedSettings.standalone);
}

Device.bind();

return Device;

}));