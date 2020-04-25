<template>
  <div id="app" class="page-wrapper">
    <canvas id="canvasRender"></canvas>
    <div class="bottom-card">
      <div class="top">
        <h4 class="title">狐厂家园</h4>
        <div class="date" @click="showCalendar=true">
          <span class="text">{{dateStr}}</span>
          <van-icon name="arrow" />
        </div>
      </div>
      <div class="time-wrapper">
        <div class="time-slider">
          <span class="time">00:00</span>
          <van-slider v-model="time" @change="onTimeChange" :min="0" :max="dayLength"/>
          <span class="time">23:59</span>
        </div>
      </div>
    </div>
    <van-calendar v-model="showCalendar" :min-date="minDate" :max-date="maxDate" @confirm="onChoseDate" />
  </div>
</template>

<script>
import utils from './utils'
import Sun from './sun'

export default {
  data() {
    return {
      date: new Date(),
      time: 0,
      riseTime: 0,
      setTime: 0,
      noonTime: 0,
      dayLength: 24,
      minDate: new Date(2020, 0, 1),
      maxDate: new Date(2020, 12, 31),
      showCalendar: false
    }
  },
  mounted() {
    this.date = new Date()
    this.sun = new Sun({
      element: document.querySelector('#canvasRender'),
      lon: 116.3102867,
      lat: 39.9838423,
      date: this.date,
      time: this.time,
      dev: true
    })
    this.sun.init()
  },
  computed: {
    dateStr() {
      return utils.dateFormat(this.date, 'yyyy-MM-dd')
    },
    riseTimeStr() {
      return this.riseTime
    },
    setTimeStr() {
      return this.setTime
    },
    timeStr() {
      return '12:00'
    }
  },
  methods: {
    onChoseDate(val) {
      this.date = val
      this.showCalendar = false
      this.sun.date = val
    },
    onTimeChange(val) {
      this.sun.time = val
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
    left: 4vw;
    width: 92vw;
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
      margin: 10px 0;
      .time-slider {
        width: 66%;
        display: flex;
        align-items: center;
        .time {
          margin: 0 16px;
        }
      }
    }
  }
}
</style>
