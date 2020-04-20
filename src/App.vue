<template>
  <div id="app">
    <!-- <img alt="Vue logo" src="./assets/logo.png" /> -->
  </div>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'stats.js'
import Earcut from 'earcut'
import utils from './utils'

const isDev = process.env.NODE_ENV !== 'production'

console.log(isDev)

var renderer,
  camera,
  scene,
  ambientLight,
  directionalLight,
  control,
  stats,
  sunMesh,
  mesh,
  directionalLightHelper

const date = new Date()
const dateStr = utils.dateFormat(date, 'yy-MM-dd')
const lon = utils.deg2rad(116.3102867)
const lat = utils.deg2rad(39.9838423)
// 赤纬
const declination = utils.getDeclination(date)
// 太阳高度角
const sunLightHeightRad = Math.PI / 2 - lat + declination
// 地轴方向
const earthAxisVector3 = new THREE.Vector3(0, Math.tan(lat), -1)
// 太阳轨迹半径
const R = 2000

function init() {
  initRender()
  initScene()
  initCamera()
  initLight()
  addSun()
  addBasePlane()
  addBuildings()
  // addSkyBox()
  initControls()
  initStats()
  initHelper()
  render()
  window.onresize = onWindowResize
}

function initScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x222222)
}

function initRender() {
  renderer = new THREE.WebGLRenderer({
    antialias: true, // 抗锯齿
    alpha: true // 透明度
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setClearColor(0xb9d3ff, 1) //设置背景颜色
  document.body.appendChild(renderer.domElement)
  renderer.shadowMap.enabled = true
}

function initCamera() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    50000
  )
  camera.position.set(0, 1600, 2400)
  camera.lookAt(scene.position)
  // camera.lookAt(new THREE.Vector3(0, 0, 0))
}

function initLight() {
  // 环境光
  ambientLight = new THREE.AmbientLight(0x666666, 0.8)
  scene.add(ambientLight)
  // 平行光
  directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(
    0,
    R * Math.sin(sunLightHeightRad),
    R * Math.cos(sunLightHeightRad)
  )
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 10000
  directionalLight.shadow.camera.left = -500
  directionalLight.shadow.camera.right = 500
  directionalLight.shadow.camera.top = 500
  directionalLight.shadow.camera.bottom = -500
  directionalLight.shadow.mapSize.set(1024, 1024)
  directionalLight.castShadow = true
  scene.add(directionalLight)
}

function initControls() {
  control = new OrbitControls(camera, renderer.domElement)
  control.enableDamping = true
  control.enableZoom = true
  control.enablePan = true
  control.autoRotate = false
  control.autoRotateSpeed = 0.5
  control.minPolarAngle = 0
  control.maxPolarAngle = Math.PI / 2 - 0.1
  control.minDistance = 100
  control.maxDistance = 10000
  // control.minZoom = 0.1
  // control.maxZoom = 100
}

function addBasePlane() {
  // 平面
  var planeGeometry = new THREE.PlaneGeometry(1000, 1000)
  var groundTexture = new THREE.TextureLoader().load('./images/map.jpg')
  var planeMaterial = new THREE.MeshLambertMaterial({
    map: groundTexture
  })
  var planeMesh = new THREE.Mesh(planeGeometry, planeMaterial)
  planeMesh.name = '地图平面'
  planeMesh.rotateX(-Math.PI / 2)
  planeMesh.receiveShadow = true
  scene.add(planeMesh)
}

function addSun() {
  // 太阳
  var sunGeometry = new THREE.SphereGeometry(20, 40, 40)
  var material = new THREE.MeshLambertMaterial({
    color: 0xff0000
  })
  sunMesh = new THREE.Mesh(sunGeometry, material)
  sunMesh.name = '太阳'
  // sunMesh.translate(0, 1000 * Math.tan(sunLightHeightRad), 1000)
  sunMesh.position.y = R * Math.sin(sunLightHeightRad)
  sunMesh.position.z = R * Math.cos(sunLightHeightRad)
  scene.add(sunMesh)
}

function addSkyBox() {
  scene.background = new THREE.CubeTextureLoader()
    .setPath('./static/images/')
    .load([
      'sky_px.jpg',
      'sky_nx.jpg',
      'sky_py.jpg',
      'sky_ny.jpg',
      'sky_pz.jpg',
      'sky_nz.jpg'
    ])
}

function render() {
  animate()
  renderer.render(scene, camera)
  control.update()
  stats && stats.update()
  directionalLightHelper && directionalLightHelper.update()
  requestAnimationFrame(render)
}

function animate() {
  rotateAboutWorldAxis(sunMesh, earthAxisVector3, -0.008)
  rotateAboutWorldAxis(directionalLight, earthAxisVector3, -0.008)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function initStats() {
  if (isDev) {
    stats = new Stats()
    stats.showPanel(1) // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.style.top = ''
    stats.dom.style.bottom = '0'
    document.body.appendChild(stats.dom)
  }
}

function initHelper() {
  if (isDev) {
    initEarthAxis()
    // 坐标轴
    var axesHelper = new THREE.AxesHelper(1000)
    scene.add(axesHelper)
    // 平行光辅助线
    directionalLightHelper = new THREE.DirectionalLightHelper(
      directionalLight,
      500,
      0xffff00
    )
    scene.add(directionalLightHelper)
  }
}

function initEarthAxis() {
  // 辅助线：地轴的一条平行线
  var material = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1
  })
  var geometry = new THREE.Geometry()
  geometry.vertices.push(
    new THREE.Vector3(0, 1000 * Math.tan(lat), -1000),
    new THREE.Vector3(0, -1000 * Math.tan(lat), 1000)
  )
  var line = new THREE.Line(geometry, material)
  scene.add(line)
}

init()

function rotateAboutWorldAxis(object, axis, angle) {
  var rotationMatrix = new THREE.Matrix4()
  rotationMatrix.makeRotationAxis(axis.normalize(), angle)
  var currentPos = new THREE.Vector4(
    object.position.x,
    object.position.y,
    object.position.z,
    1
  )
  var newPos = currentPos.applyMatrix4(rotationMatrix)
  object.position.x = newPos.x
  object.position.y = newPos.y
  object.position.z = newPos.z
}

function test() {
  let dates = ['2020-03-20', '2020-06-22', '2020-09-22', '2020-12-22']

  for (let dateStr of dates) {
    let date = new Date(dateStr)
    let d = utils.getDeclination(date)
    let { riseTime, setTime, noonTime, dayLength } = utils.getSunTime(
      lon,
      lat,
      date
    )
    console.log(dateStr, utils.rad2str(d))
    console.log(
      `日出：${riseTime}，日落：${setTime}，正午：${noonTime}，昼长：${utils.timeFormat(
        dayLength
      )}`
    )
  }
}

test()

function addBuildings() {
  let points = [
    [0, 0, 0],
    [100, 0, 0],
    [100, 0, 100],
    [0, 0, 100]
  ]
  let geometry = getGeometry(points, 300)
  var texture = new THREE.TextureLoader().load('./static/images/map.jpg')
  var materialArr = [
    new THREE.MeshLambertMaterial({
      color: 0xeeeeee,
      transparent: true,
      opacity: 0.98,
      side: THREE.BackSide
    }),
    new THREE.MeshLambertMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.98,
      side: THREE.BackSide
    })
  ]
  var facematerial = new THREE.MeshFaceMaterial(materialArr)
  mesh = new THREE.Mesh(geometry, facematerial)
  mesh.name = '建筑'
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
}

function getGeometry(points, height) {
  var topPoints = []
  for (var i = 0; i < points.length; i++) {
    topPoints.push([points[i][0], points[i][1] + height, points[i][2]])
  }
  var totalPoints = points.concat(topPoints)
  var vertices = []
  for (var i = 0; i < totalPoints.length; i++) {
    vertices.push(
      new THREE.Vector3(totalPoints[i][0], totalPoints[i][1], totalPoints[i][2])
    )
  }
  var length = points.length
  var faces = []
  //侧面生成三角形
  for (var j = 0; j < length; j++) {
    if (j != length - 1) {
      faces.push(new THREE.Face3(j, j + 1, length + j + 1))
      faces.push(new THREE.Face3(length + j + 1, length + j, j))
    } else {
      faces.push(new THREE.Face3(j, 0, length))
      faces.push(new THREE.Face3(length, length + j, j))
    }
  }
  var data = []
  for (var i = 0; i < length; i++) {
    data.push(points[i][0], points[i][2])
  }
  var triangles = Earcut(data)
  if (triangles && triangles.length != 0) {
    for (var i = 0; i < triangles.length; i++) {
      var tlength = triangles.length
      if (i % 3 == 0 && i < tlength - 2) {
        //底部的三角面
        let face1 = new THREE.Face3(
          triangles[i],
          triangles[i + 1],
          triangles[i + 2]
        )
        //顶部的三角面
        let face2 = new THREE.Face3(
          triangles[i] + length,
          triangles[i + 1] + length,
          triangles[i + 2] + length
        )
        face1.materialIndex = 1
        face2.materialIndex = 1
        faces.push(face1)
        faces.push(face2)
      }
    }
  }

  var geometry = new THREE.Geometry()
  geometry.vertices = vertices
  geometry.faces = faces
  geometry.computeFaceNormals() //自动计算法向量
  // geometry.faceVertexUvs[1] = geometry.faceVertexUvs[0]
  return geometry
}

export default {
  name: 'APP',
  data() {
    return {
      data: ''
    }
  }
}
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
