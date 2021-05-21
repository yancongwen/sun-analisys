/**
 * 将 Date 转化为指定格式的String
 */
export function dateFormat(date, fmt) {
  var o = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    'q+': Math.floor((date.getMonth() + 3) / 3),
    S: date.getMilliseconds()
  }
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      (date.getFullYear() + '').substr(4 - RegExp.$1.length)
    )
  }
  for (var k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
      )
    }
  }
  return fmt
}

// 时间转换
export function timeFormat(value, fmt = 'hh:mm') {
  let h = Math.floor(value)
  let m = Math.floor(value * 60 - h * 60)
  let s = Math.floor(value * 60 * 60 - h * 60 * 60 - m * 60)
  var o = {
    'h+': h,
    'm+': m,
    's+': s
  }
  for (var k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
      )
    }
  }
  return fmt
}

// 获取当年已过去的天数
export function getDays(date, decimal) {
  let year = date.getFullYear()
  let date0 = new Date(year + '/01/01')
  let days = (Date.parse(date) - date0) / (24 * 60 * 60 * 1000) + 1
  return decimal ? days : Math.round(days)
}

// 计算赤纬（单位为弧度）
export function getDeclination(date) {
  let n = getDays(date)
  let b = (2 * Math.PI * (n - 1)) / 365
  let result =
    0.006918 -
    0.399912 * Math.cos(b) +
    0.070257 * Math.sin(b) -
    0.006758 * Math.cos(2 * b) +
    0.000907 * Math.sin(2 * b) -
    0.002697 * Math.cos(3 * b) +
    0.00148 * Math.sin(3 * b)
  return result
}

// 计算正午时刻太阳高度角（单位为弧度）
export function getSunLightHeightRad(lat, date) {
  const declination = getDeclination(date)
  return Math.PI / 2 - lat + declination
}

// 计算昼长
export function getDayLength(date, lat) {
  let d = getDeclination(date)
  let result = 24 - (24 * Math.acos(Math.tan(d) * Math.tan(lat))) / Math.PI
  return result
}

// 计算日出时间、日落时间、正午时间、昼长等
export function getSunTime(lon, lat, date, zone = 8, fmt = 'hh:mm:ss') {
  let dayLength = getDayLength(date, lat) // 昼长
  let centerLon = deg2rad(15 * zone) // 时区中央经线
  let noonTimeNum = 12 + rad2deg(centerLon - lon) / 15 // 日中天时间
  let noonTime = timeFormat(noonTimeNum)
  let riseTime = timeFormat(noonTimeNum - dayLength / 2, fmt)
  let setTime = timeFormat(noonTimeNum + dayLength / 2, fmt)
  return { riseTime, setTime, noonTime, noonTimeNum, dayLength }
}

// 角度转弧度
export function deg2rad(deg) {
  return (Math.PI * deg) / 180
}

// 弧度转角度
export function rad2deg(rad) {
  return (rad * 180) / Math.PI
}

// 角度转度分秒字符串
export function deg2str(deg) {
  let value = Math.abs(deg)
  var v1 = Math.floor(value)
  var v2 = Math.floor((value - v1) * 60)
  var v3 = Math.round(((value - v1) * 3600) % 60)
  var result = `${v1}°${v2}′${v3}″`
  if (deg < 0) {
    result = '-' + result
  }
  return result
}

// 弧度转度分秒字符串
export function rad2str(rad) {
  return deg2str(rad2deg(rad))
}


// 函数防抖
export function debounce(fn, delay) {
  let timer = null
  return function() {
      let context = this
      let args = arguments
      timer && clearTimeout(timer)
      timer = setTimeout(() => {
          fn.apply(context, args)
      }, delay)
  }
}

// 函数节流（最后一次也执行）
export function throttle(fn, delay) {
  let lastTime = null
  let timeout
  return function() {
      let context = this
      let now = new Date()
      let arg = arguments
      if (now - lastTime - delay > 0) {
          if (timeout) {
              clearTimeout(timeout)
              timeout = null
          }
          fn.apply(context, arg)
          lastTime = now
      } else {
          clearTimeout(timeout)
          timeout = setTimeout(() => {
              fn.apply(context, arg)
          }, delay)
      }
  }
}

export default {
  debounce,
  throttle,
  dateFormat,
  timeFormat,
  getDays,
  getDeclination,
  getSunLightHeightRad,
  getDayLength,
  getSunTime,
  deg2rad,
  rad2deg,
  deg2str,
  rad2str
}
