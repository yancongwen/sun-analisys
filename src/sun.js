import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'stats.js'
import Earcut from 'earcut'
import utils from './utils'
const isDev = process.env.NODE_ENV !== 'production'

export default class Sun {
  constructor(options) {
    const {lon, lat, date, time, dev, element} = options
    this._isDev = dev && isDev // 在开发环境显示辅助线
    this._element = element // canvas 元素
    this._lon = utils.deg2rad(lon) // 经度弧度
    this._lat = utils.deg2rad(lat) // 纬度弧度
    this._date = date // 日期
    this._time = time // 时间（数字）
    this._R = 3000 // 太阳轨迹半径
  }

  init() {
    this._currentRotateRad = 0
    this._sunLightHeightRad = utils.getSunLightHeightRad(this._lat, this._date) // 正午时刻太阳高度角
    this._noonTimeNum = utils.getSunTime(this._lon, this._lat, this._date).noonTimeNum // 日中天时间（数字）
    this._initRender()
    this._initScene()
    this._initCamera()
    this._initLight()
    this._initControl()
    this._addSun()
    this._addBasePlane()
    this._addBuildings()
    // this._addSkyBox()
    if (this._isDev) {
      this._addHelper()
      this._addEarthAxis()
      this._addStats()
    }
    window.onresize = () => {
      this._onWindowResize()
    }
    this._render()
    this._rotate()
  }

  set date(value) {
    // 日期改变，太阳高度角改变，需要改变太阳的运动轨道
    this._date = value
    this._sunLightHeightRad = utils.getSunLightHeightRad(this._lat, this._date)
    this._sunMesh.position.y = this._R * Math.sin(this._sunLightHeightRad)
    this._sunMesh.position.z = this._R * Math.cos(this._sunLightHeightRad)
    this._directionalLight.position.set(
      0,
      this._R * Math.sin(this._sunLightHeightRad),
      this._R * Math.cos(this._sunLightHeightRad)
    )
    this._currentRotateRad = 0
    this._rotate()
  }

  set time(value) {
    // 时间改变，只需要改变光照角度
    this._time = value
    this._rotate()
  }

  // 根据当前时间旋转太阳和光照（绕着地轴转）
  _rotate() {
    const targetRoateRad = Math.PI * (this._time - this._noonTimeNum) / 12
    const rotateRad = targetRoateRad - this._currentRotateRad
    const earthAxisVector3 = new THREE.Vector3(0, Math.tan(this._lat), -1) // 地轴方向向量
    rotateAboutWorldAxis(this._sunMesh, earthAxisVector3, -rotateRad)
    rotateAboutWorldAxis(this._directionalLight, earthAxisVector3, -rotateRad)
    this._currentRotateRad = targetRoateRad
  }

  _render() {
    this._renderer.render(this._scene, this._camera)
    this._control.update()
    this._stats && this._stats.update()
    this._directionalLightHelper && this._directionalLightHelper.update()
    requestAnimationFrame(() => {
      this._render()
    })
  }

  _initRender() {
    let renderer = new THREE.WebGLRenderer({
      canvas: this._element,
      antialias: true, // 抗锯齿
      alpha: true // 透明度
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0xb9d3ff, 1)
    renderer.shadowMap.enabled = true
    // document.body.appendChild(renderer.domElement)
    this._renderer = renderer
  }

  _initScene() {
    let scene = new THREE.Scene()
    scene.background = new THREE.Color(0x222222)
    this._scene = scene
  }

  _initCamera() {
    let camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      50000
    )
    camera.position.set(0, 1600, -2400)
    camera.lookAt(this._scene.position)
    this._camera = camera
  }

  _initLight() {
    // 环境光
    let ambientLight = new THREE.AmbientLight(0x666666, 0.8)
    // 平行光
    let directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(
      0,
      this._R * Math.sin(this._sunLightHeightRad),
      this._R * Math.cos(this._sunLightHeightRad)
    )
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 10000
    directionalLight.shadow.camera.left = -500
    directionalLight.shadow.camera.right = 500
    directionalLight.shadow.camera.top = 500
    directionalLight.shadow.camera.bottom = -500
    directionalLight.shadow.mapSize.set(1024, 1024)
    directionalLight.castShadow = true

    this._scene.add(ambientLight)
    this._scene.add(directionalLight)
    this._directionalLight = directionalLight
  }

  _initControl() {
    const control = new OrbitControls(this._camera, this._renderer.domElement)
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
    this._control = control
  }

  _addHelper() {
    // 坐标轴
    const axesHelper = new THREE.AxesHelper(1000)
    this._scene.add(axesHelper)
    // 平行光辅助线
    this._directionalLightHelper = new THREE.DirectionalLightHelper(
      this._directionalLight,
      500,
      0xffff00
    )
    this._scene.add(this._directionalLightHelper)
  }

  // 辅助线：地轴的一条平行线
  _addEarthAxis() {
    const material = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1
    })
    const geometry = new THREE.Geometry()
    geometry.vertices.push(
      new THREE.Vector3(0, 1000 * Math.tan(this._lat), -1000),
      new THREE.Vector3(0, -1000 * Math.tan(this._lat), 1000)
    )
    const line = new THREE.Line(geometry, material)
    this._scene.add(line)
  }

  // 天空盒
  _addSkyBox() {
    this._scene.background = new THREE.CubeTextureLoader()
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

  // 太阳
  _addSun() {
    const sunGeometry = new THREE.SphereGeometry(20, 40, 40)
    const material = new THREE.MeshLambertMaterial({
      color: 0xff0000
    })
    const sunMesh = new THREE.Mesh(sunGeometry, material)
    sunMesh.name = '太阳'
    // sunMesh.translate(0, 1000 * Math.tan(sunLightHeightRad), 1000)
    sunMesh.position.y = this._R * Math.sin(this._sunLightHeightRad)
    sunMesh.position.z = this._R * Math.cos(this._sunLightHeightRad)
    this._scene.add(sunMesh)
    this._sunMesh = sunMesh
  }

  // 地平面
  _addBasePlane() {
    const planeGeometry = new THREE.PlaneGeometry(1000, 1000)
    const groundTexture = new THREE.TextureLoader().load('./images/map.jpg')
    const planeMaterial = new THREE.MeshLambertMaterial({
      map: groundTexture
    })
    const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial)
    planeMesh.name = '地图平面'
    planeMesh.rotateX(-Math.PI / 2)
    planeMesh.receiveShadow = true
    this._scene.add(planeMesh)
  }

  // 建筑
  _addBuildings() {
    const points = [
      [0, 0, 0],
      [100, 0, 0],
      [100, 0, 100],
      [0, 0, 100]
    ]
    const geometry = getGeometry(points, 300)
    // var texture = new THREE.TextureLoader().load('./static/images/map.jpg')
    const materialArr = [
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
    const facematerial = new THREE.MeshFaceMaterial(materialArr)
    const mesh = new THREE.Mesh(geometry, facematerial)
    mesh.name = '建筑'
    mesh.castShadow = true
    mesh.receiveShadow = true
    this._scene.add(mesh)
  }

  _onWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight
    this._camera.updateProjectionMatrix()
    this._renderer.setSize(window.innerWidth, window.innerHeight)
  }

  // WebGL 性能监测器
  _addStats() {
    const stats = new Stats()
    stats.showPanel(1) // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.style.top = ''
    stats.dom.style.bottom = '0'
    document.body.appendChild(stats.dom)
    this._stats = stats
  }
}

// 传入一个坐标串和高度，返回一个 Geometry
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
        //纹理编号
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

// 将物体绕着某一个轴旋转
function rotateAboutWorldAxis(object, axis, angle) {
  const rotationMatrix = new THREE.Matrix4()
  rotationMatrix.makeRotationAxis(axis.normalize(), angle)
  const currentPos = new THREE.Vector4(
    object.position.x,
    object.position.y,
    object.position.z,
    1
  )
  const newPos = currentPos.applyMatrix4(rotationMatrix)
  object.position.x = newPos.x
  object.position.y = newPos.y
  object.position.z = newPos.z
}
