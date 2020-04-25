import Vue from 'vue'
import App from './App.vue'
import { Calendar, Slider, Icon, Button } from 'vant'
import 'vant/lib/index.css'

Vue.use(Calendar)
Vue.use(Slider)
Vue.use(Icon)
Vue.use(Button)

Vue.config.productionTip = false

new Vue({
  render: h => h(App)
}).$mount('#app')
