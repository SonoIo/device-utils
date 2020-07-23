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

(function() {
	var throttle = function(type, name, obj) {
		obj = obj || window;
		var running = false;
		var func = function() {
			if (running) { return; }
			running = true;
			 window.requestAnimationFrame(function() {
				obj.dispatchEvent(new CustomEvent(name));
				running = false;
			});
		};
		obj.addEventListener(type, func);
	};

	/* init - you can init any event */
	throttle("resize", "optimizedResize");
})();

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
var deviceCache = {};

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
	var width       = $(window).width();
	var height      = $(window).height();

	if ( Device.getOS().name == 'iOS' && Device.testMediaQuery('(orientation: landscape)') )
		orientation = "landscape";
	else if ( Device.getOS().name == 'iOS' && Device.testMediaQuery('(orientation: portrait)'))
		orientation = "portrait";
	else if ( Device.getOS().name == 'Android' && window.innerHeight > window.innerWidth )
		orientation = "portrait";
	else if ( Device.getOS().name == 'Android' && window.innerHeight < window.innerWidth )
		orientation = "landscape";
	else if (window.innerHeight > window.innerWidth)
		orientation = "portrait";
	else if (window.innerHeight < window.innerWidth)
		orientation = "landscape";

	// Fix for Android device
	if ( !_.isUndefined(window.screen) && this.isAndroid() ){
		if ( _.isNumber(window.screen.width) )
			width = window.screen.width;
		if ( _.isNumber(window.screen.height) )
			height = window.screen.height;
	}

	return {
		orientation: orientation,
		width:  width,
		height: height
	}
}

// Verifica se il display in uso è un retina display o un display
// ad alta risoluzione generico
Device.isRetina = function isRetina() {
	if (force.retina)
		return true;

	if ( _.isBoolean(deviceCache.isRetina) )
		return deviceCache.isRetina;

	var r = false;
	if (window.matchMedia) {
		var mq = window.matchMedia("only screen and (-moz-min-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)");
		if (mq && mq.matches) {
			r = true;
		}
	}
	deviceCache.isRetina = r;
	return r;
}

// OS
Device.getOS = function getOS() {
	if ( _.isObject(deviceCache.os) )
		return deviceCache.os;

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
	else if (/iP(hone|od|ad)/.test(navigator.platform) || /iP(hone|od|ad)/.test(ua)) {
		// supports iOS 2.0 and later: <http://bit.ly/TJjs1V>
		var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
		result = {
			name: 'iOS',
			version: [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)]
		}
	}
	// iOS with device plugin
	else if (window.device && window.device.platform === 'iOS') {
		var v = window.device.version.split('.');
		result = {
			name: 'iOS',
			version: [parseInt(v[0], 10), parseInt(v[1] || 0), parseInt(v[2] || 0)]
		}
	}
	// Windows Phone test
	else if ( /Windows Phone/.test(ua) ) {

		var v = (navigator.appVersion).match(/Windows Phone (\d+).(\d+).?(\d+)?/);
		result = {
			name: 'Windows Phone',
			version: [parseInt(v[1], 10), parseInt(v[2], 10)]
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

	deviceCache.os = result;

	return result;
}


// Ottiene le info sul browser
Device.getBrowser = function getBrowser(){
	if ( _.isObject(deviceCache.browser) )
		return deviceCache.browser;

	var ua= navigator.userAgent,
	N= navigator.appName, tem,
	M= ua.match(/(opera|chrome|safari|firefox|msie|trident)\/?\s*([\d\.]+)/i) || [];
	M= M[2]? [M[1], M[2]]:[N, navigator.appVersion, '-?'];
	if(M && (tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];

	deviceCache.browser = {
		name: M[0] ? M[0] : null,
		version: M[1] ? M[1] : null
	};

	return deviceCache.browser;
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
	if ( _.isNumber(deviceCache.ppi) )
		return deviceCache.ppi;

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
	deviceCache.ppi = parseFloat(ppi);

	return deviceCache.ppi
}

// Inch of screen
Device.getInchOfScreen = function getInchOfScreen(force){
	if ( !force && _.isNumber(deviceCache.inchOfScreen) )
		return deviceCache.inchOfScreen;

	// var devicePixelRatio = window.devicePixelRatio || 1;
	// Get the pixels per inch horizontal
	// var ppi = Device.getPPI() * devicePixelRatio;
	var ppi = 160; // approximation

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
	deviceCache.inchOfScreen = diagonal_p / ppi;

	return deviceCache.inchOfScreen;

}



// Restituisce true se l'applicazione è in modalità standalone,
// ovvero in full screen.
Device.isStandalone = function isStandalone(force) {
	if ( !force && _.isBoolean(deviceCache.isStandalone) )
		return deviceCache.isStandalone;

	if ( window.navigator.standalone ){
		deviceCache.isStandalone = true;
	}else if (window.matchMedia('(display-mode: standalone)').matches) {
		deviceCache.isStandalone = true;
	}else{
		deviceCache.isStandalone = false;
	}

	return deviceCache.isStandalone;
}

Device.isTablet = function isTablet(force){
	if ( !force && _.isBoolean(deviceCache.isTablet) )
		return deviceCache.isTablet;
	deviceCache.isTablet = Device.getInchOfScreen(force) >= 6.5;
	return deviceCache.isTablet;
}

Device.isSmartphone = function isSmartphone(force){
	if ( !force && _.isBoolean(deviceCache.isSmartphone) )
		return deviceCache.isSmartphone;
	deviceCache.isSmartphone = Device.getInchOfScreen(force) < 6.5;
	return deviceCache.isSmartphone;
}

Device.isIpad = function isIpad(force){
	if ( !force && _.isBoolean(deviceCache.isIpad) )
		return deviceCache.isIpad;
	if (window.device && window.device.platform == 'iOS' && window.device.model) {
		deviceCache.isIpad = !!window.device.model.match(/iPad/i);
	} else {
		deviceCache.isIpad = !!navigator.userAgent.match(/iPad/i);
	}
	return deviceCache.isIpad;
}

Device.isIphone = function isIphone(force){
	if ( !force && _.isBoolean(deviceCache.isIphone) )
		return deviceCache.isIphone;
	if (window.device && window.device.platform == 'iOS' && window.device.model) {
		deviceCache.isIphone = !!window.device.model.match(/iPhone/i) || !!window.device.model.match(/iPod/i);
	} else {
		deviceCache.isIphone = !!navigator.userAgent.match(/iPhone/i) || !!navigator.userAgent.match(/iPod/i);
	}
	return deviceCache.isIphone;
}

Device.isIphoneX = function isIphoneX(force){
	if ( !force && _.isBoolean(deviceCache.isIphoneX) )
		return deviceCache.isIphoneX;

	var iOs = Device.isIos(force);
	if (!iOs){
		deviceCache.isIphoneX = false;
		return false;
	}

	var dpr = _.isNumber(devicePixelRatio) && !_.isNaN(devicePixelRatio) ? devicePixelRatio : 1;
	deviceCache.isIphoneX = screen.height * dpr == 2436; // @ref: https://developer.apple.com/ios/human-interface-guidelines/visual-design/adaptivity-and-layout/

	return deviceCache.isIphoneX;
}

Device.isIphoneXR = function isIphoneXR(force){
	if ( !force && _.isBoolean(deviceCache.isIphoneXR) )
		return deviceCache.isIphoneXR;

	var iOs = Device.isIos(force);
	if (!iOs){
		deviceCache.isIphoneXR = false;
		return false;
	}

	var dpr = _.isNumber(devicePixelRatio) && !_.isNaN(devicePixelRatio) ? devicePixelRatio : 1;
	deviceCache.isIphoneXR = screen.height * dpr == 1792; // @ref: https://developer.apple.com/ios/human-interface-guidelines/visual-design/adaptivity-and-layout/

	return deviceCache.isIphoneXR;
}

Device.isIphoneXS = function isIphoneXS(force){
	if ( !force && _.isBoolean(deviceCache.isIphoneXS) )
		return deviceCache.isIphoneXS;

	var iOs = Device.isIos(force);
	if (!iOs){
		deviceCache.isIphoneXS = false;
		return false;
	}

	var dpr = _.isNumber(devicePixelRatio) && !_.isNaN(devicePixelRatio) ? devicePixelRatio : 1;
	deviceCache.isIphoneXS = screen.height * dpr == 2436; // @ref: https://developer.apple.com/ios/human-interface-guidelines/visual-design/adaptivity-and-layout/

	return deviceCache.isIphoneXS;
}

Device.isIphoneXSMax = function isIphoneXSMax(force){
	if ( !force && _.isBoolean(deviceCache.isIphoneXSMax) )
		return deviceCache.isIphoneXSMax;

	var iOs = Device.isIos(force);
	if (!iOs){
		deviceCache.isIphoneXSMax = false;
		return false;
	}

	var dpr = _.isNumber(devicePixelRatio) && !_.isNaN(devicePixelRatio) ? devicePixelRatio : 1;
	deviceCache.isIphoneXSMax = screen.height * dpr == 2688; // @ref: https://developer.apple.com/ios/human-interface-guidelines/visual-design/adaptivity-and-layout/

	return deviceCache.isIphoneXSMax;
}

Device.isIphoneWithNotch = function isIphoneWithNotch(force) {
	return Device.isIphoneX(force)
		|| Device.isIphoneXR(force)
		|| Device.isIphoneXS(force)
		|| Device.isIphoneXSMax(force);
}

Device.isAndroid = function isAndroid(force){
	if ( !force && _.isBoolean(deviceCache.isAndroid) )
		return deviceCache.isAndroid;

	if ( !Device.isMobileApp() ){
		deviceCache.isAndroid = navigator.userAgent.match(/Android/i);
	}else{
		deviceCache.isAndroid = Device.getCordova().platformId.toLocaleLowerCase() === "android";
	}

	return deviceCache.isAndroid;
}

Device.isIos = function isIos(force) {
	if ( !force && _.isBoolean(deviceCache.isIos) )
		return deviceCache.isIos;

	if ( !Device.isMobileApp() ){
		deviceCache.isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
	}else{
		deviceCache.isIos = Device.getCordova().platformId.toLocaleLowerCase() === "ios";
	}

	return deviceCache.isIos;
}

Device.isWindowsPhone = function isWindowsPhone(force){
	if ( !force && _.isBoolean(deviceCache.isWindowsPhone) )
		return deviceCache.isWindowsPhone;

	if ( Device.isMobileApp() && Device.getCordova().platformId.toLocaleLowerCase() === "windowsphone" )
		deviceCache.isWindowsPhone = true
	else
		deviceCache.isWindowsPhone = navigator.userAgent.match(/Windows Phone/i);

	return deviceCache.isWindowsPhone;
}

Device.isMobileApp = function isMobileApp(){
	return typeof window.cordova !== "undefined" || typeof window.phonegap !== "undefined";
}

// @ref: https://stackoverflow.com/a/4819886
Device.isTouchDevice = function isTouchDevice(force){
	if ( !force && _.isBoolean(deviceCache.isTouchDevice) )
		return deviceCache.isTouchDevice;

	if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
		deviceCache.isTouchDevice = true;
	} else {
		deviceCache.isTouchDevice = false;
		// include the 'heartz' as a way to have a non matching MQ to help terminate the join
		// https://git.io/vznFH
		// var query = ['@media (', prefixes.join('touch-enabled),('), 'heartz', ')', '{#modernizr{top:9px;position:absolute}}'].join('');
		// testStyles(query, function(node) {
		// 	bool = node.offsetTop === 9;
		// });
	}
	return deviceCache.isTouchDevice;
}

Device.isDesktop = function isDesktop(force) {
	if ( !force && _.isBoolean(deviceCache.isDesktop) )
		return deviceCache.isDesktop;

	deviceCache.isDesktop = false;
	if (typeof global === 'object')
		deviceCache.isDesktop = !!global.window.nwDispatcher;

	return deviceCache.isDesktop;
}

Device.isBrowser = function isBrowser(force){
	return !Device.isMobileApp(force) && !Device.isDesktop(force);
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

Device.isHighPerformanceDevice = function isHighPerformanceDevice() {
	if (typeof deviceCache.isHighPerformanceDevice !== 'undefined')
		return deviceCache.isHighPerformanceDevice;

	let currentDevice = Device.getOS();
	let nameDevice    = currentDevice.name.toLowerCase();

	if (( Device.isIphone() && iPhoneVersion() <= 5) || (nameDevice == 'android' && currentDevice.version < 5) || nameDevice == 'windows phone') {
		deviceCache.isHighPerformanceDevice = false;
	}
	else {
		deviceCache.isHighPerformanceDevice = true;
	}

	return deviceCache.isHighPerformanceDevice;

	function iPhoneVersion() {
		var iHeight = window.screen.height;
		var iWidth = window.screen.width;
		if (iWidth === 320 && iHeight === 480) {
			return 4;
		}
		else if (iWidth === 375 && iHeight === 667) {
			return 6;
		}
		else if (iWidth === 414 && iHeight === 736) {
			return 6.5;
		}
		else if (iWidth === 320 && iHeight === 568) {
			return 5;
		}
		else if (iHeight <= 480) {
			return 3;
		}
		return 0;
	}
}

var orientationChangeTimeoutHandler;
Device.onOrientationChange = function onOrientationChange(event) {
	if (orientationChangeTimeoutHandler)
		clearTimeout(orientationChangeTimeoutHandler);

	orientationChangeTimeoutHandler = setTimeout(function() {
		orientationChangeTimeoutHandler = null;
		var viewport = Device.getViewport();
		Device.trigger('changeViewport', viewport);
	}, 100);
}

Device.onResizeViewport = function onResizeViewport(event) {
	Device.trigger('resizeViewport', Device.getViewport() );
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
		window.requestAnimationFrame(function(){
			document.documentElement.classList.add('ipad');
		});
	}

	if ( Device.isIphone() ){
		window.requestAnimationFrame(function(){
			document.documentElement.classList.add('iphone');
		});
	}

	if ( Device.isIphoneX() ){
		window.requestAnimationFrame(function(){
			document.documentElement.classList.add('iphone-x');
		});
	}

	if ( Device.isIphoneXR() ){
		window.requestAnimationFrame(function(){
			document.documentElement.classList.add('iphone-x');
			document.documentElement.classList.add('iphone-xr');
		});
	}

	if ( Device.isIphoneXS() ){
		window.requestAnimationFrame(function(){
			document.documentElement.classList.add('iphone-x');
			document.documentElement.classList.add('iphone-xs');
		});
	}

	if ( Device.isIphoneXSMax() ){
		window.requestAnimationFrame(function(){
			document.documentElement.classList.add('iphone-x');
			document.documentElement.classList.add('iphone-xs-max');
		});
	}

	if ( Device.isAndroid() ){
		window.requestAnimationFrame(function(){
			document.documentElement.classList.add('android');
		});
	}

	if ( Device.isDesktop() ){
		window.requestAnimationFrame(function(){
			document.documentElement.classList.add('desktop');
		});
	}

	if ( !Device.isTouchDevice() ){
		window.requestAnimationFrame(function(){
			document.documentElement.classList.add('no-touch');
		});
	}

	// OS version on HTML class (ios ios7, ios ios6, android android4, desktop desktop0 ...)
	var os = Device.getOS();
	var osClass = force.osClass || ( os.name.toLowerCase() + " " + os.name.toLowerCase() + (_.isArray(os.version) ? os.version[0] : parseInt(os.version)) );
	if (osClass) {
		window.requestAnimationFrame(function(){
			osClass.split(" ").forEach(function(aClass){
				document.documentElement.classList.add(aClass);
			});
		});
		appliedSettings.osClass = osClass;
	}
	// Standalone class
	if (Device.isStandalone() || force.standalone) {
		window.requestAnimationFrame(function(){
			document.documentElement.classList.add('standalone');
		});
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
	window.addEventListener("focus", Device.onFocusBlur);
	window.addEventListener("blur", Device.onFocusBlur);

	// Device ruotato o finestra ridimensionata
	window.addEventListener("orientationchange", Device.onOrientationChange);

	// Finestra ridimensionata
	// window.addEventListener("resize", Device.onResizeViewport);
	window.addEventListener("optimizedResize", Device.onResizeViewport);

	// Fullscreen
	if ( document.webkitIsFullScreen ){
		// document.addEventListener('fullscreenchange', Device.onFullscreenChange, false);
		document.addEventListener('webkitfullscreenchange', Device.onFullscreenChange, false);
		//
	}
	if ( document.mozFullScreen ){
		document.addEventListener('mozfullscreenchange', Device.onFullscreenChange, false);
	}
	if ( document.msFullscreenElement !== null ){
		document.addEventListener('MSFullscreenChange', Device.onFullscreenChange, false);
	}

}

// Rimuove gli elementi collegati dalla classe device
Device.destroy = function destroy() {

	window.removeEventListener("focus", Device.onFocusBlur);
	window.removeEventListener("blur", Device.onFocusBlur);
	window.removeEventListener("orientationchange", Device.onOrientationChange);
	window.removeEventListener("optimizedResize", Device.onResizeViewport);

	document.removeEventListener('webkitfullscreenchange', Device.onFullscreenChange);
	document.removeEventListener('mozfullscreenchange', Device.onFullscreenChange);
	document.removeEventListener('MSFullscreenChange', Device.onFullscreenChange);

	if (appliedSettings.iOSVersion){
		window.requestAnimationFrame(function(){
			document.documentElement.classList.remove(appliedSettings.iOSVersion);
		});
	}
	if (appliedSettings.standalone){
		window.requestAnimationFrame(function(){
			document.documentElement.classList.remove(appliedSettings.standalone);
		});
	}
}

Device.bind();

return Device;

}));
