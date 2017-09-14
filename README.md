Device utils
======

Cross device utility for browser

## Install

```
  bower install device-utils --save
```

## Changelog

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
