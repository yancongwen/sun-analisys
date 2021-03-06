# 光照分析
![Build and Deploy](https://github.com/yancongwen/sun-analisys/workflows/Build%20and%20Deploy/badge.svg?branch=master)

## 相关概念

### 太阳高度角
- 太阳高度角是指太阳光的入射方向和地平面之间的夹角
- 取值范围 0 ~ 90°，同一地点，一天内太阳高度角是不断变化的，日出日落时为0，在正天顶上为90°
- 正午时刻太阳高度角 = 90° - |该点纬度 - 太阳赤纬|
![太阳高度角](https://iknow-pic.cdn.bcebos.com/f636afc379310a5531a5867fbc4543a9832610b3)

### 太阳方位角
- 太阳方位角是指太阳光线在地平面上的投影与当地经线的夹角。描述的是太阳所在的方位。可近似地看作是竖立在地面上的直线在阳光下的阴影与正南方的夹角。方位角以目标物正北方向为零，顺时针方向逐渐变大，其取值范围是0  ~ 360°。
- 对于地球上任何位置，当太阳处于春分点或秋分点，即太阳赤纬是0°的时候，初升的太阳方位角是90°整，正午太阳方位角是180°，落日的时候太阳方位角是270°。

![太阳方位角](https://iknow-pic.cdn.bcebos.com/b90e7bec54e736d126ebd48390504fc2d4626944)

### 南北回归线
回归线，是太阳每年在地球上直射来回移动的分界线。南北回归线就是南纬和北纬纬度为23°26′的那条纬线(北回归线：23°26′N，南回归线23°26′S)。

### 太阳赤纬
太阳赤纬即太阳直射点纬度，范围介于南北回归线之间。

- 因赤纬值日变化很小，一年内任百何一天的赤纬角δ可用下式计算：
`sinδ=0.39795cos[0.98563(N-173)/180*pi]`
式中N为日数，自每年1月1日开始计算,δ单位为弧知度。
- 更准确的太阳道赤纬计算公式则为：
`δ=0.006918-0.399912*cos(b)+0.070257*sin(b)-0.006758*cos(2*b)+0.000907*sin(2*b)-0.002697*cos(3*b)+0.00148*sin(3*b)`
上式中，`b=2π*(N-1)/365`

### 春分、夏至、秋分、冬至
- 春分（3月20日或知21日）太阳直射赤道
- 夏至 (6月21日或22日) 太阳直射北回归线
- 秋分 (9月23日或24日) 太阳直射赤道
- 冬至 (12月21日或22日) 太阳直射南回归线

### 为了简化计算，制定以下假设
- 将地球看成球（实为不规则椭球）
- 将地球公转平面视为圆形 （实为椭球，有近地点和远地点）
- 将地球公转周期视为365天（实际上为366.2422个平星日，或者365.2422平太阳日）
- 将地球自转周期视为24小时（平太阳时）
- 太阳光是平行光，严格来讲，太阳光源是一个点光源，但是由于太阳和地球距离十分遥远，，所以太阳光到达地球时光线几乎是平行状态
- 一年365天，不考虑闰年
- 地表没有大气对于太阳光的折射作用
- 地表各地点无海拔高度的差异
- 昼长以太阳中心升落地平的时间来计算
- 假设一天内赤纬是不变的（实际上赤纬是时刻变化的）

## 日出日落时间如何计算
- 需要的参数：lon、lat、N，分别代表经度、纬度值、日期（1月1日表示N=1，2月15日表示N=46，12月31日表示N=365）
- 分析：
    - 首先确定时区为东八区（北京时间），东八区中央经线为东经120°，经线相差1°，时间相差 1/15 小时（4分钟）
    - 东经120° 中午12点时太阳在正南方向，即日上中天时间为 12时
    - 日上中天时间 = 12 +（120 - lon) / 15 = (日出时间 + 日落时间) / 2
    - 日出时间 = 日上中天时间 - 昼长 / 2
    - 日落时间 = 日上中天时间 + 昼长 / 2
    - 昼长 = 24 - 24 * arccos(tanδ * tan(lat)) / π
- 代码

```js
const lon = 120, lat = 30, date = 1, zone = 8
// 太阳赤纬角
let δ = 0.006918-0.399912*cos(b)+0.070257*sin(b)-0.006758*cos(2*b)+0.000907*sin(2*b)-0.002697*cos(3*b)+0.00148*sin(3*b)
// 日中天时间
let noneTime = 12 +（15 * zone - lon) / 15 = 12
// 昼长
let dayLength = 24 - 24 * arccos(tanδ * tan(lat)) / π
// 日升时间
let riseTime = noneTime - dayLength / 2
// 日落时间
let setTime = noneTime + dayLength / 2
```

## 太阳轨迹
将地球看做是静止的，那么太阳相对于地球的运动轨迹是怎样的呢？

一天的时间内，我们可以将地球相对于太阳的公转运动忽略，仅仅考虑地球的自转，那么太阳相对于地球的运动轨迹就是一个绕着地轴的圆形轨迹，相当于太阳绕着地轴转了一圈。


## 参考
- [根据经纬度和日期计算日出日落时间](https://blog.csdn.net/liu877260630/article/details/80482159?depth_1-utm_source=distribute.pc_relevant.none-task-blog-BlogCommendFromBaidu-1&utm_source=distribute.pc_relevant.none-task-blog-BlogCommendFromBaidu-1)
- [每天正午时间为什么不一样？](https://www.zhihu.com/question/380550909)
- [就算是同一个纬度，日出日落时间差也不一样](https://www.zhihu.com/question/22128754)
- [太阳视运动轨迹图解](https://wenku.baidu.com/view/7db2f8ab294ac850ad02de80d4d8d15abe2300d1.html)
- [昼夜长短变化规律](https://wenku.baidu.com/view/e622aacee87101f69f319535.html)
- [影响昼夜长短的其它因素](https://wenku.baidu.com/view/0e0d0c680875f46527d3240c844769eae109a34c.html)
