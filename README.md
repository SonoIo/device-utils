Device utils
======

Cross device utility for browser

## Install

```
  bower install device-utils --save
```

## Changelog

### 1.0.24
- Added the parent class iphone-x for models iPhone XS, XR, XS Max

### 1.0.23
- Bugfix for detect iPhone XS, XR, XS Max

### 1.0.22
- Added the "iphone-xs" class if it is an iPhone XS
- Added the "iphone-xs-max" class if it is an iPhone XS Max
- Added the "iphone-xr" class if it is an iPhone XR
- Added method for check device is high performance

### 1.0.21
- Added the "iphone-x" class if it is an iPhone X

### 1.0.20

- Add a new method "isIos"
- Add a new method "isIphoneX"

### 1.0.19

- Add a new method "isTouchDevice"
- Add param `force` for exclude cache


### 1.0.1

- New support to fullscreen mode. Device adds class `fullScreen` to the `html` tag. In addition it adds browser specific class like `mozFullScreen`, `webkitFullScreen`, `msfullscreenchange`.
