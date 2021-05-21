import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer"
import Stats from 'stats.js'
import Earcut from 'earcut'
import utils from './utils'
const isDev = process.env.NODE_ENV !== 'production'

export default class Sun {
  constructor(options) {
    const { lon, lat, date, time, dev, element, baseMap, onRotate } = options
    this._isDev = dev && isDev // 在开发环境显示辅助线
    this._element = element // canvas 元素
    this._lon = utils.deg2rad(lon) // 经度弧度
    this._lat = utils.deg2rad(lat) // 纬度弧度
    this._date = date // 日期
    this._time = time // 时间（数字）
    this._baseMap = baseMap
    this._R = 2000 // 太阳轨迹半径
    this._floorHeight = 4 // 单层楼的高度
    this._floorColors = [0xffffff, 0xefefef]
    this._onRotate = onRotate
  }

  init() {
    if (this._scene) {
      return
    }
    this._currentRotateRad = 0
    this._sunLightHeightRad = utils.getSunLightHeightRad(this._lat, this._date) // 正午时刻太阳高度角
    this._noonTimeNum = utils.getSunTime(
      this._lon,
      this._lat,
      this._date
    ).noonTimeNum // 日中天时间（数字）
    this._initRender()
    this._initScene()
    this._initCamera()
    this._initLight()
    this._initControl()
    this._addSun()
    this._addBasePlane()
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

  // 添加建筑物，参数为geojson格式的对象
  addBuildings(data, name) {
    const group = new THREE.Group()
    group.name = name
    data.features.forEach(feature => {
      let points = feature.geometry.coordinates[0].map(point => {
        return [point[0], 0.1, -point[1]]
      })
      let building = this._creatBuilding(
        points,
        feature.properties.height,
        feature.properties.name
      )
      group.add(building)
    })
    this._scene.add(group)
  }

  destroy() {
    console.log('destroy')
    if (this._scene) {
      let children = this._scene.children
      children.forEach(item => {
        if (item.type === 'Group') {
          this._removeGroup(item)
        } else if (item.type === 'Mesh') {
          this._removeMesh(item)
        } else if (item instanceof THREE.Light) {
          this._scene.remove(item)
        }
      })
    }
    this._scene.dispose()
    this._render.dispose()
    this._scene = null
    this._renderer = null
    this._labelRenderer = null
    this._camera = null
    this._control = null
    this._ambientLight = null
    this._directionalLight = null
  }

  _removeMesh(mesh) {
    if (mesh.type === 'Mesh') {
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(item => {
          item.map && item.map.dispose()
          item.dispose()
        })
      } else {
        mesh.material.dispose()
      }
      this._scene.remove(mesh)
    }
  }

  _removeGroup(group) {
    if (group.type === 'Group') {
      group.children.forEach(item => {
        if (item.type === 'Mesh') {
          this._removeMesh(item)
        }
      })
      this._scene.remove(group)
    }
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
    const targetRoateRad = (Math.PI * (this._time - this._noonTimeNum)) / 12
    const rotateRad = targetRoateRad - this._currentRotateRad
    const earthAxisVector3 = new THREE.Vector3(0, Math.tan(this._lat), -1) // 地轴方向向量
    rotateAboutWorldAxis(this._sunMesh, earthAxisVector3, -rotateRad)
    rotateAboutWorldAxis(this._directionalLight, earthAxisVector3, -rotateRad)
    this._currentRotateRad = targetRoateRad
    // 环境光强度也要稍微调整一下
    this._ambientLight.intensity = 0.6
  }

  _render() {
    this._renderer.render(this._scene, this._camera)
		this._labelRenderer.render(this._scene, this._camera)
    this._control.update()
    this._stats && this._stats.update()
    this._directionalLightHelper && this._directionalLightHelper.update()
    //根据当前的位置计算与z轴负方向的夹角，即为正北方方向
    var direction = new THREE.Vector3(-this._camera.position.x, 0, -this._camera.position.z).normalize()
    // 弧度值
    var theta = Math.atan2(-direction.x, -direction.z)
    this._onRotate && this._onRotate(theta)
    requestAnimationFrame(() => {
      this._render()
    })
  }

  _initRender() {
    let renderer = new THREE.WebGLRenderer({
      canvas: this._element,
      antialias: true, // 抗锯齿
      logarithmicDepthBuffer: true, // 是否使用对数深度缓存
      alpha: true // 透明度
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0xb9d3ff, 1)
    renderer.shadowMap.enabled = true
    // renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // document.body.appendChild(renderer.domElement)
    this._renderer = renderer
    // CSS2DRenderer
    let labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(window.innerWidth, window.innerHeight)
		labelRenderer.domElement.style.position = 'absolute'
		labelRenderer.domElement.style.top = '0'
		labelRenderer.domElement.style.pointerEvents = 'none'
		document.body.appendChild(labelRenderer.domElement)
		this._labelRenderer = labelRenderer
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
    camera.position.set(0, 800, 800)
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
    this._ambientLight = ambientLight
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
      .setPath('./images/')
      .load([
        'center.png',
        'center.png',
        'top.png',
        'down.png',
        'center.png',
        'center.png'
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
    const planeGeometry = new THREE.PlaneGeometry(1024, 1024)
    const groundTexture = new THREE.TextureLoader().load(this._baseMap)
    const planeMaterial = new THREE.MeshLambertMaterial({
      // lightMapIntensity: 0,
      // emissiveIntensity: 0,
      // color: null,
      transparent: true,
      map: groundTexture
    })
    const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial)
    planeMesh.name = '地图平面'
    planeMesh.rotateX(-Math.PI / 2)
    planeMesh.receiveShadow = true
    planeMesh.castShadow = true
    this._scene.add(planeMesh)
  }

  // 建筑
  _creatBuilding(points, height, name) {
    const group = new THREE.Group()
    group.name = name
    points.reverse()
    // 分层创建
    for (let i = 0; i < height; i++) {
      group.add(this._creatBuildingFloor(points, i))
    }

    // 计算中心点坐标
    const center = computeCenter(points)
    // 添加 label
    const label = this._creatLabel(name, [center[0], height * this._floorHeight + 20, center[1]])
    group.add(label)
    return group
  }

  // 创建楼层
  _creatBuildingFloor(points, index) {
    const color = this._floorColors[index % 2]
    const geometry = getGeometry(points, this._floorHeight * index, this._floorHeight)
    const materialArr = [
      // 侧面
      new THREE.MeshLambertMaterial({
        color: color,
        transparent: true,
        opacity: 1,
        side: THREE.BackSide
      }),
      // 顶部
      new THREE.MeshLambertMaterial({
        color: 0xeeeeee,
        transparent: true,
        opacity: 1,
        side: THREE.BackSide
      })
    ]
    // const facematerial = new THREE.MeshFaceMaterial(materialArr)
    const mesh = new THREE.Mesh(geometry, materialArr)
    mesh.index = index
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  _creatLabel(title, position) {
    const div = document.createElement('div')
    div.className = 'css2DLabel'
    div.textContent = title
    const label = new CSS2DObject(div)
    label.position.copy({
      x: position[0],
      y: position[1],
      z: position[2]
    })
    return label
  }

  _onWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight
    this._camera.updateProjectionMatrix()
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._labelRenderer.setSize(window.innerWidth, window.innerHeight)
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
function getGeometry(points, baseHeight, floorHeight) {
  var topPoints = []
  let basePoints = JSON.parse(JSON.stringify(points))
  for (let i = 0; i < basePoints.length; i++) {
    basePoints[i][1] = baseHeight
    topPoints.push([basePoints[i][0], baseHeight + floorHeight, basePoints[i][2]])
  }
  var totalPoints = basePoints.concat(topPoints)
  var vertices = []
  for (let i = 0; i < totalPoints.length; i++) {
    vertices.push(
      new THREE.Vector3(totalPoints[i][0], totalPoints[i][1], totalPoints[i][2])
    )
  }
  var length = points.length
  var faces = []
  //侧面生成三角形
  for (let j = 0; j < length; j++) {
    if (j != length - 1) {
      faces.push(new THREE.Face3(j, j + 1, length + j + 1))
      faces.push(new THREE.Face3(length + j + 1, length + j, j))
    } else {
      faces.push(new THREE.Face3(j, 0, length))
      faces.push(new THREE.Face3(length, length + j, j))
    }
  }
  var data = []
  for (let i = 0; i < length; i++) {
    data.push(points[i][0], points[i][2])
  }
  var triangles = Earcut(data)
  if (triangles && triangles.length != 0) {
    for (let i = 0; i < triangles.length; i++) {
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
  // 纹理坐标
  // var t0 = new THREE.Vector2(0, 0)
  // var t1 = new THREE.Vector2(1, 0)
  // var t2 = new THREE.Vector2(1, 1)
  // var t3 = new THREE.Vector2(0, 1)
  // var uv1 = [t0, t1, t2]
  // var uv2 = [t2, t3, t0]
  // geometry.faceVertexUvs[0].push(uv1, uv2)
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

// 计算多边形中心点坐标
function computeCenter(points) {
  var count = points.length
  var x = 0
  var y = 0
  var f
  var j = count - 1
  var p1
  var p2

  for (var i = 0; i < count; j = i++) {
    p1 = points[i]
    p2 = points[j]
    f = p1[0] * p2[2] - p2[0] * p1[2]
    x += (p1[0] + p2[0]) * f
    y += (p1[2] + p2[2]) * f
  }

  f = computeArea(points) * 6
  return [x / f, y / f]
}

function computeArea(points) {
  var area = 0
  var count = points.length
  var j = count - 1
  var p1
  var p2

  for (var i = 0; i < count; j = i++) {
      p1 = points[i]
      p2 = points[j]
      area += p1[0] * p2[2]
      area -= p1[2] * p2[0]
  }
  area /= 2

  return area
}
