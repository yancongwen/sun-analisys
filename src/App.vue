<template>
  <div id="app" class="page-wrapper">
    <canvas id="canvasRender"></canvas>
    <div class="bottom-card">
      <div class="top">
        <h4 class="title">狐厂家园</h4>
        <div class="date" @click="showCalendar = true">
          <span class="text">{{ dateStr }}</span>
          <van-icon name="arrow" />
        </div>
      </div>
      <div class="time-wrapper">
        <div class="time-slider">
          <span class="time">00:00</span>
          <van-slider
            v-model="time"
            @change="onTimeChange"
            :min="0"
            :max="24"
            :step="0.0001"
            button-size="14px"
          />
          <span class="time">24:00</span>
          <span class="current-time">{{ timeStr }}</span>
        </div>
        <van-icon
          class="play"
          @click="play"
          :name="playing ? 'pause-circle-o' : 'play-circle-o'"
          size="24px"
        />
      </div>
      <div class="times">
        <p>
          日出时间<span class="value">{{ riseTimeStr }}</span>
        </p>
        <p>
          日落时间<span class="value">{{ setTimeStr }}</span>
        </p>
        <p>
          昼长<span class="value">{{ dayLengthStr }}</span>
        </p>
      </div>
      <div class="dates">
        <van-button
          class="btn"
          :class="{ active: dateStr === item.date }"
          plain
          size="mini"
          type="default"
          v-for="item in dates"
          :key="item.date"
          @click="choseDate(item.date)"
          >{{ item.name }}</van-button
        >
      </div>
    </div>
    <div class="loading" v-if="!loaded"></div>
    <van-calendar
      v-model="showCalendar"
      :min-date="minDate"
      :max-date="maxDate"
      @confirm="onChoseDate"
    />
  </div>
</template>

<script>
import utils from './utils'
import { wgs2gcj, lonlat2WebMercator } from './utils/geo'
import Sun from './sun'

const AMapKey = 'd0d18f5a3a5abeff6f97c818019b97eb'

let sunView = null
export default {
  data() {
    return {
      lon: CONFIG.lon,
      lat: CONFIG.lat,
      date: new Date(),
      time: 9, // 0-24
      riseTimeStr: '',
      setTimeStr: '',
      noonTimeStr: '',
      dayLengthStr: '',
      minDate: new Date(2020, 0, 1),
      maxDate: new Date(2020, 12, 31),
      showCalendar: false,
      playing: false,
      loaded: false,
      dates: [
        {
          name: '大寒',
          date: '2020-01-20'
        },
        {
          name: '春分',
          date: '2020-03-20'
        },
        {
          name: '夏至',
          date: '2020-06-21'
        },
        {
          name: '秋分',
          date: '2020-09-22'
        },
        {
          name: '立冬',
          date: '2020-11-07'
        },
        {
          name: '冬至',
          date: '2020-12-21'
        }
      ]
    }
  },
  computed: {
    dateStr() {
      return utils.dateFormat(this.date, 'yyyy-MM-dd')
    },
    timeStr() {
      return utils.timeFormat(this.time)
    }
  },
  mounted() {
    this.date = new Date()
    this.getSunTime()
    sunView = new Sun({
      element: document.querySelector('#canvasRender'),
      lon: this.lon,
      lat: this.lat,
      date: this.date,
      time: this.time,
      baseMap: `https://restapi.amap.com/v3/staticmap?location=${this.lon},${this.lat}&zoom=16&scale=1&size=1024*1024&key=${AMapKey}`,
      dev: false
    })
    sunView.init()
    this.loadBuildings()
    setTimeout(() => {
      this.loaded = true
      this.play()
    }, 1000)
  },
  destroyed() {
    sunView.destroy()
  },
  methods: {
    onChoseDate(val) {
      this.date = val
      this.showCalendar = false
      this.getSunTime()
      sunView.date = val
    },
    choseDate(dateStr) {
      this.date = new Date(dateStr)
      this.getSunTime()
      sunView.date = this.date
    },
    onTimeChange(val) {
      sunView.time = val
    },
    play() {
      this.playing = !this.playing
      clearTimeout(this.timer)
      this.timer = 0
      if (this.playing) {
        this.timer = setInterval(() => {
          let interval = 0.05
          if (this.time < 4 || this.time > 21) {
            interval = 0.5 // 晚上加速
          }
          this.time = this.time + interval
          if (this.time > 24) {
            this.time = 0
          }
          sunView.time = this.time
        }, 50)
      }
    },
    getSunTime() {
      let { riseTime, setTime, dayLength } = utils.getSunTime(
        utils.deg2rad(this.lon),
        utils.deg2rad(this.lat),
        this.date,
        8,
        'hh:mm'
      )
      this.riseTimeStr = riseTime
      this.setTimeStr = setTime
      this.dayLengthStr = utils
        .timeFormat(dayLength, 'h h m min')
        .replace(/\s+/g, '')
    },

    transformCoordinate(data) {
      const center = lonlat2WebMercator(this.lon, this.lat)
      // web 墨卡托投影有变形
      const p = Math.cos(utils.deg2rad(this.lat))
      data.features.forEach(feature => {
        let coordinates = feature.geometry.coordinates
        let newCoordinates = coordinates.map(ring => {
          let newRing = []
          ring.forEach(coordinate => {
            const newCoordinate = lonlat2WebMercator(...wgs2gcj(...coordinate))
            const x = Math.round((newCoordinate[0] - center[0]) * p * 100) / 100
            const y = Math.round((newCoordinate[1] - center[1]) * p * 100) / 100
            newRing.push([x, y])
          })
          return newRing
        })
        feature.geometry.coordinates = newCoordinates
      })
    },

    async loadBuildings() {
      let data = await fetch('./data/xj.json')
        .then(response => {
          return response.json()
        })
        .catch(console.error)
      // 坐标转换
      if (data && data.features && data.features.length) {
        this.transformCoordinate(data)
        sunView && sunView.addBuildings(data)
      }
    }
  }
}
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #333;
  overflow: hidden;
  font-size: 16px;
}
.page-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  .bottom-card {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    width: 92vw;
    max-width: 600px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 6px;
    padding: 12px;
    .top {
      display: flex;
      justify-content: space-between;
      line-height: 32px;
      .title {
        flex: 1;
        font-size: 18px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .date {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        width: 100px;
        font-size: 14px;
        .text {
          margin-right: 4px;
        }
      }
    }
    .time-wrapper {
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      justify-content: center;
      margin: 10px 0;
      line-height: 20px;
      .time-slider {
        flex: 1;
        display: flex;
        align-items: center;
        .time {
          font-size: 14px;
          margin: 0 10px;
        }
        .current-time {
          padding: 1px 4px 0;
          font-size: 14px;
          background: rgba(0, 0, 0, 0.08);
        }
      }
      .play {
        margin: 0 20px;
      }
    }
    .times {
      display: flex;
      flex-flow: row nowrap;
      justify-content: space-around;
      font-size: 14px;
      .value {
        margin-left: 4px;
        color: rgb(255, 58, 58);
      }
    }
    .dates {
      display: flex;
      justify-content: space-around;
      margin: 10px 0;
      .btn {
        font-size: 13px;
      }
      .active {
        border: none;
        color: #fff;
        background: linear-gradient(
          90deg,
          rgba(255, 102, 102, 1) 0%,
          rgba(255, 34, 34, 1) 100%
        );
      }
    }
  }
}
</style>
