/*!
 * camera-controls
 * https://github.com/yomotsu/camera-controls
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.CameraControls = factory());
}(this, (function () { 'use strict';

	function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	// based on https://github.com/mrdoob/eventdispatcher.js/

	var EventDispatcher = function () {
		function EventDispatcher() {
			_classCallCheck$1(this, EventDispatcher);

			this._listeners = {};
		}

		EventDispatcher.prototype.addEventListener = function addEventListener(type, listener) {

			var listeners = this._listeners;

			if (listeners[type] === undefined) {

				listeners[type] = [];
			}

			if (listeners[type].indexOf(listener) === -1) {

				listeners[type].push(listener);
			}
		};

		EventDispatcher.prototype.hasEventListener = function hasEventListener(type, listener) {

			var listeners = this._listeners;

			return listeners[type] !== undefined && listeners[type].indexOf(listener) !== -1;
		};

		EventDispatcher.prototype.removeEventListener = function removeEventListener(type, listener) {

			var listeners = this._listeners;
			var listenerArray = listeners[type];

			if (listenerArray !== undefined) {

				var index = listenerArray.indexOf(listener);

				if (index !== -1) {

					listenerArray.splice(index, 1);
				}
			}
		};

		EventDispatcher.prototype.dispatchEvent = function dispatchEvent(event) {

			var listeners = this._listeners;
			var listenerArray = listeners[event.type];

			if (listenerArray !== undefined) {

				event.target = this;

				var array = listenerArray.slice(0);

				for (var i = 0, l = array.length; i < l; i++) {

					array[i].call(this, event);
				}
			}
		};

		return EventDispatcher;
	}();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var THREE = void 0;
	var _v2 = void 0;
	var _v3A = void 0;
	var _v3B = void 0;
	var _xColumn = void 0;
	var _yColumn = void 0;
	var _raycaster = void 0;
	var _sphericalA = void 0;
	var _sphericalB = void 0;
	var EPSILON = 0.001;
	var STATE = {
		NONE: -1,
		ROTATE: 0,
		DOLLY: 1,
		TRUCK: 2,
		TOUCH_ROTATE: 3,
		TOUCH_DOLLY_TRUCK: 4,
		TOUCH_TRUCK: 5
	};

	var CameraControls = function (_EventDispatcher) {
		_inherits(CameraControls, _EventDispatcher);

		CameraControls.install = function install(libs) {

			THREE = libs.THREE;
			_v2 = new THREE.Vector2();
			_v3A = new THREE.Vector3();
			_v3B = new THREE.Vector3();
			_xColumn = new THREE.Vector3();
			_yColumn = new THREE.Vector3();
			_raycaster = new THREE.Raycaster();
			_sphericalA = new THREE.Spherical();
			_sphericalB = new THREE.Spherical();
		};

		function CameraControls(object, domElement) {
			var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

			_classCallCheck(this, CameraControls);

			var _this = _possibleConstructorReturn(this, _EventDispatcher.call(this));

			_this.object = object;
			_this.enabled = true;
			_this._state = STATE.NONE;

			// How far you can dolly in and out ( PerspectiveCamera only )
			_this.minDistance = 0;
			_this.maxDistance = Infinity;

			// How far you can zoom in and out ( OrthographicCamera only )
			_this.minZoom = 0;
			_this.maxZoom = Infinity;

			_this.minPolarAngle = 0; // radians
			_this.maxPolarAngle = Math.PI; // radians
			_this.minAzimuthAngle = -Infinity; // radians
			_this.maxAzimuthAngle = Infinity; // radians
			_this.dampingFactor = 0.05;
			_this.draggingDampingFactor = 0.25;
			_this.dollySpeed = 1.0;
			_this.truckSpeed = 2.0;
			_this.dollyToCursor = false;
			_this.verticalDragToForward = false;

			_this.domElement = domElement;

			// the location of focus, where the object orbits around
			_this._target = new THREE.Vector3();
			_this._targetEnd = new THREE.Vector3();

			// rotation
			_this._spherical = new THREE.Spherical();
			_this._spherical.setFromVector3(_this.object.position);
			_this._sphericalEnd = new THREE.Spherical().copy(_this._spherical);

			// reset
			_this._target0 = _this._target.clone();
			_this._position0 = _this.object.position.clone();
			_this._zoom0 = _this.object.zoom;

			_this._needsUpdate = true;
			_this.update();

			if (!_this.domElement || options.ignoreDOMEventListeners) {

				_this._removeAllEventListeners = function () {};
			} else {
				var extractClientCoordFromEvent = function extractClientCoordFromEvent(event, out) {

					out.set(0, 0);

					if (event.touches) {

						for (var i = 0; i < event.touches.length; i++) {

							out.x += event.touches[i].clientX;
							out.y += event.touches[i].clientY;
						}

						out.x /= event.touches.length;
						out.y /= event.touches.length;
						return out;
					} else {

						out.set(event.clientX, event.clientY);
						return out;
					}
				};

				var _onMouseDown = function _onMouseDown(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					var prevState = scope._state;

					switch (event.button) {

						case THREE.MOUSE.LEFT:

							scope._state = STATE.ROTATE;
							break;

						case THREE.MOUSE.MIDDLE:

							scope._state = STATE.DOLLY;
							break;

						case THREE.MOUSE.RIGHT:

							scope._state = STATE.TRUCK;
							break;

					}

					if (prevState !== scope._state) {

						_startDragging(event);
					}
				};

				var _onTouchStart = function _onTouchStart(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					var prevState = scope._state;

					switch (event.touches.length) {

						case 1:
							// one-fingered touch: rotate

							scope._state = STATE.TOUCH_ROTATE;
							break;

						case 2:
							// two-fingered touch: dolly

							scope._state = STATE.TOUCH_DOLLY_TRUCK;
							break;

						case 3:
							// three-fingered touch: truck

							scope._state = STATE.TOUCH_TRUCK;
							break;

					}

					if (prevState !== scope._state) {

						_startDragging(event);
					}
				};

				var _onMouseWheel = function _onMouseWheel(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					// Ref: https://github.com/cedricpinson/osgjs/blob/00e5a7e9d9206c06fdde0436e1d62ab7cb5ce853/sources/osgViewer/input/source/InputSourceMouse.js#L89-L103
					var mouseDeltaFactor = 120;
					var deltaYFactor = navigator.platform.indexOf('Mac') === 0 ? -1 : -3;

					var delta = void 0;

					if (event.wheelDelta !== undefined) {

						delta = event.wheelDelta / mouseDeltaFactor;
					} else if (event.deltaMode === 1) {

						delta = event.deltaY / deltaYFactor;
					} else {

						delta = event.deltaY / (10 * deltaYFactor);
					}

					var x = void 0,
					    y = void 0;

					if (scope.dollyToCursor) {

						elementRect = scope.domElement.getBoundingClientRect();
						x = (event.clientX - elementRect.left) / elementRect.width * 2 - 1;
						y = (event.clientY - elementRect.top) / elementRect.height * -2 + 1;
					}

					_dollyInternal(-delta, x, y);
				};

				var _onContextMenu = function _onContextMenu(event) {

					if (!scope.enabled) return;

					event.preventDefault();
				};

				var _startDragging = function _startDragging(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					extractClientCoordFromEvent(event, _v2);

					elementRect = scope.domElement.getBoundingClientRect();
					dragStart.copy(_v2);

					if (scope._state === STATE.TOUCH_DOLLY_TRUCK) {

						// 2 finger pinch
						var dx = _v2.x - event.touches[1].pageX;
						var dy = _v2.y - event.touches[1].pageY;
						var distance = Math.sqrt(dx * dx + dy * dy);

						dollyStart.set(0, distance);

						// center coords of 2 finger truck
						var x = (event.touches[0].pageX + event.touches[1].pageX) * 0.5;
						var y = (event.touches[0].pageY + event.touches[1].pageY) * 0.5;

						dragStart.set(x, y);
					}

					document.addEventListener('mousemove', _dragging, { passive: false });
					document.addEventListener('touchmove', _dragging, { passive: false });
					document.addEventListener('mouseup', _endDragging);
					document.addEventListener('touchend', _endDragging);

					scope.dispatchEvent({
						type: 'controlstart',
						// x: _v2.x,
						// y: _v2.y,
						// state: scope._state,
						originalEvent: event
					});
				};

				var _dragging = function _dragging(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					extractClientCoordFromEvent(event, _v2);

					var deltaX = dragStart.x - _v2.x;
					var deltaY = dragStart.y - _v2.y;

					dragStart.copy(_v2);

					switch (scope._state) {

						case STATE.ROTATE:
						case STATE.TOUCH_ROTATE:

							var rotX = 2 * Math.PI * deltaX / elementRect.width;
							var rotY = 2 * Math.PI * deltaY / elementRect.height;
							scope.rotate(rotX, rotY, true);
							break;

						case STATE.DOLLY:
							// not implemented
							break;

						case STATE.TOUCH_DOLLY_TRUCK:

							var dx = _v2.x - event.touches[1].pageX;
							var dy = _v2.y - event.touches[1].pageY;
							var distance = Math.sqrt(dx * dx + dy * dy);
							var dollyDelta = dollyStart.y - distance;

							var touchDollyFactor = 8;

							var dollyX = scope.dollyToCursor ? (dragStart.x - elementRect.left) / elementRect.width * 2 - 1 : 0;
							var dollyY = scope.dollyToCursor ? (dragStart.y - elementRect.top) / elementRect.height * -2 + 1 : 0;
							_dollyInternal(dollyDelta / touchDollyFactor, dollyX, dollyY);

							dollyStart.set(0, distance);
							_truckInternal(deltaX, deltaY);
							break;

						case STATE.TRUCK:
						case STATE.TOUCH_TRUCK:

							_truckInternal(deltaX, deltaY);
							break;

					}

					scope.dispatchEvent({
						type: 'control',
						// x: _v2.x,
						// y: _v2.y,
						// deltaX,
						// deltaY,
						// state: scope._state,
						originalEvent: event
					});
				};

				var _endDragging = function _endDragging(event) {

					if (!scope.enabled) return;

					scope._state = STATE.NONE;

					document.removeEventListener('mousemove', _dragging);
					document.removeEventListener('touchmove', _dragging);
					document.removeEventListener('mouseup', _endDragging);
					document.removeEventListener('touchend', _endDragging);

					scope.dispatchEvent({
						type: 'controlend',
						// state: scope._state,
						originalEvent: event
					});
				};

				var _truckInternal = function _truckInternal(deltaX, deltaY) {

					if (scope.object.isPerspectiveCamera) {

						var offset = _v3A.copy(scope.object.position).sub(scope._target);
						// half of the fov is center to top of screen
						var fovInRad = scope.object.fov * THREE.Math.DEG2RAD;
						var targetDistance = offset.length() * Math.tan(fovInRad / 2);
						var truckX = scope.truckSpeed * deltaX * targetDistance / elementRect.height;
						var pedestalY = scope.truckSpeed * deltaY * targetDistance / elementRect.height;
						if (scope.verticalDragToForward) {

							scope.truck(truckX, 0, true);
							scope.forward(-pedestalY, true);
						} else {

							scope.truck(truckX, pedestalY, true);
						}
					} else if (scope.object.isOrthographicCamera) {

						// orthographic
						var _truckX = deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / elementRect.width;
						var _pedestalY = deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / elementRect.height;
						scope.truck(_truckX, _pedestalY, true);
					}
				};

				var _dollyInternal = function _dollyInternal(delta, x, y) {

					var dollyScale = Math.pow(0.95, -delta * scope.dollySpeed);

					if (scope.object.isPerspectiveCamera) {

						var distance = scope._sphericalEnd.radius * dollyScale - scope._sphericalEnd.radius;
						var prevRadius = scope._sphericalEnd.radius;

						scope.dolly(distance);

						if (scope.dollyToCursor && scope.object.isCamera) {

							var actualDistance = scope._sphericalEnd.radius - prevRadius;

							_v2.set(x, y);
							_raycaster.setFromCamera(_v2, scope.object);
							var angle = _raycaster.ray.direction.angleTo(_v3A.setFromSpherical(scope._sphericalEnd));
							var dist = prevRadius / -Math.cos(angle);
							_raycaster.ray.at(dist, _v3A);
							scope._targetEnd.lerp(_v3A, -actualDistance / scope._sphericalEnd.radius);
							scope._target.copy(scope._targetEnd);
						}
					} else if (scope.object.isOrthographicCamera) {

						scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
						scope.object.updateProjectionMatrix();
						scope._needsUpdate = true;
					}
				};

				var scope = _this;
				var dragStart = new THREE.Vector2();
				var dollyStart = new THREE.Vector2();
				var elementRect = void 0;

				_this.domElement.addEventListener('mousedown', _onMouseDown);
				_this.domElement.addEventListener('touchstart', _onTouchStart);
				_this.domElement.addEventListener('wheel', _onMouseWheel);
				_this.domElement.addEventListener('contextmenu', _onContextMenu);

				_this._removeAllEventListeners = function () {

					scope.domElement.removeEventListener('mousedown', _onMouseDown);
					scope.domElement.removeEventListener('touchstart', _onTouchStart);
					scope.domElement.removeEventListener('wheel', _onMouseWheel);
					scope.domElement.removeEventListener('contextmenu', _onContextMenu);
					document.removeEventListener('mousemove', _dragging);
					document.removeEventListener('touchmove', _dragging);
					document.removeEventListener('mouseup', _endDragging);
					document.removeEventListener('touchend', _endDragging);
				};
			}

			return _this;
		}

		// rotX in radian
		// rotY in radian


		CameraControls.prototype.rotate = function rotate(rotX, rotY, enableTransition) {

			this.rotateTo(this._sphericalEnd.theta + rotX, this._sphericalEnd.phi + rotY, enableTransition);
		};

		// rotX in radian
		// rotY in radian


		CameraControls.prototype.rotateTo = function rotateTo(rotX, rotY, enableTransition) {

			var theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, rotX));
			var phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, rotY));

			this._sphericalEnd.theta = theta;
			this._sphericalEnd.phi = phi;
			this._sphericalEnd.makeSafe();

			if (!enableTransition) {

				this._spherical.theta = this._sphericalEnd.theta;
				this._spherical.phi = this._sphericalEnd.phi;
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.dolly = function dolly(distance, enableTransition) {

			if (this.object.isOrthographicCamera) {

				console.warn('dolly is not available for OrthographicCamera');
				return;
			}

			this.dollyTo(this._sphericalEnd.radius + distance, enableTransition);
		};

		CameraControls.prototype.dollyTo = function dollyTo(distance, enableTransition) {

			if (this.object.isOrthographicCamera) {

				console.warn('dolly is not available for OrthographicCamera');
				return;
			}

			this._sphericalEnd.radius = THREE.Math.clamp(distance, this.minDistance, this.maxDistance);

			if (!enableTransition) {

				this._spherical.radius = this._sphericalEnd.radius;
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.pan = function pan(x, y, enableTransition) {

			console.log('`pan` has been renamed to `truck`');
			this.truck(x, y, enableTransition);
		};

		CameraControls.prototype.truck = function truck(x, y, enableTransition) {

			this.object.updateMatrix();

			_xColumn.setFromMatrixColumn(this.object.matrix, 0);
			_yColumn.setFromMatrixColumn(this.object.matrix, 1);
			_xColumn.multiplyScalar(x);
			_yColumn.multiplyScalar(-y);

			var offset = _v3A.copy(_xColumn).add(_yColumn);
			this._targetEnd.add(offset);

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.forward = function forward(distance, enableTransition) {

			_v3A.setFromMatrixColumn(this.object.matrix, 0);
			_v3A.crossVectors(this.object.up, _v3A);
			_v3A.multiplyScalar(distance);

			this._targetEnd.add(_v3A);

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.moveTo = function moveTo(x, y, z, enableTransition) {

			this._targetEnd.set(x, y, z);

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.fitTo = function fitTo(objectOrBox3, enableTransition) {
			var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};


			if (this.object.isOrthographicCamera) {

				console.warn('fitTo is not supported for OrthographicCamera');
				return;
			}

			var paddingLeft = options.paddingLeft || 0;
			var paddingRight = options.paddingRight || 0;
			var paddingBottom = options.paddingBottom || 0;
			var paddingTop = options.paddingTop || 0;

			var boundingBox = objectOrBox3.isBox3 ? objectOrBox3.clone() : new THREE.Box3().setFromObject(objectOrBox3);
			var size = boundingBox.getSize(_v3A);
			var boundingWidth = size.x + paddingLeft + paddingRight;
			var boundingHeight = size.y + paddingTop + paddingBottom;
			var boundingDepth = size.z;

			var distance = this.getDistanceToFit(boundingWidth, boundingHeight, boundingDepth);
			this.dollyTo(distance, enableTransition);

			var boundingBoxCenter = boundingBox.getCenter(_v3A);
			var cx = boundingBoxCenter.x - (paddingLeft * 0.5 - paddingRight * 0.5);
			var cy = boundingBoxCenter.y + (paddingTop * 0.5 - paddingBottom * 0.5);
			var cz = boundingBoxCenter.z;
			this.moveTo(cx, cy, cz, enableTransition);

			this._sanitizeSphericals();
			this.rotateTo(0, 90 * THREE.Math.DEG2RAD, enableTransition);
		};

		CameraControls.prototype.setLookAt = function setLookAt(positionX, positionY, positionZ, targetX, targetY, targetZ, enableTransition) {

			var position = _v3A.set(positionX, positionY, positionZ);
			var target = _v3B.set(targetX, targetY, targetZ);

			this._targetEnd.copy(target);
			this._sphericalEnd.setFromVector3(position.sub(target));
			this._sanitizeSphericals();

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
				this._spherical.copy(this._sphericalEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.lerpLookAt = function lerpLookAt(positionAX, positionAY, positionAZ, targetAX, targetAY, targetAZ, positionBX, positionBY, positionBZ, targetBX, targetBY, targetBZ, x, enableTransition) {

			var positionA = _v3A.set(positionAX, positionAY, positionAZ);
			var targetA = _v3B.set(targetAX, targetAY, targetAZ);
			_sphericalA.setFromVector3(positionA.sub(targetA));

			var targetB = _v3A.set(targetBX, targetBY, targetBZ);
			this._targetEnd.copy(targetA).lerp(targetB, x); // tricky

			var positionB = _v3B.set(positionBX, positionBY, positionBZ);
			_sphericalB.setFromVector3(positionB.sub(targetB));

			var deltaTheta = _sphericalB.theta - _sphericalA.theta;
			var deltaPhi = _sphericalB.phi - _sphericalA.phi;
			var deltaRadius = _sphericalB.radius - _sphericalA.radius;

			this._sphericalEnd.set(_sphericalA.radius + deltaRadius * x, _sphericalA.phi + deltaPhi * x, _sphericalA.theta + deltaTheta * x);

			this._sanitizeSphericals();

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
				this._spherical.copy(this._sphericalEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.setPosition = function setPosition(positionX, positionY, positionZ, enableTransition) {

			this.setLookAt(positionX, positionY, positionZ, this._targetEnd.x, this._targetEnd.y, this._targetEnd.z, enableTransition);
		};

		CameraControls.prototype.setTarget = function setTarget(targetX, targetY, targetZ, enableTransition) {

			var pos = this.getPosition(_v3A);
			this.setLookAt(pos.x, pos.y, pos.z, targetX, targetY, targetZ, enableTransition);
		};

		CameraControls.prototype.getDistanceToFit = function getDistanceToFit(width, height, depth) {

			var camera = this.object;
			var boundingRectAspect = width / height;
			var fov = camera.fov * THREE.Math.DEG2RAD;
			var aspect = camera.aspect;

			var heightToFit = boundingRectAspect < aspect ? height : width / aspect;
			return heightToFit * 0.5 / Math.tan(fov * 0.5) + depth * 0.5;
		};

		CameraControls.prototype.getTarget = function getTarget(out) {

			var _out = !!out && out.isVector3 ? out : new THREE.Vector3();
			return _out.copy(this._targetEnd);
		};

		CameraControls.prototype.getPosition = function getPosition(out) {

			var _out = !!out && out.isVector3 ? out : new THREE.Vector3();
			return _out.setFromSpherical(this._sphericalEnd).add(this._targetEnd);
		};

		CameraControls.prototype.reset = function reset(enableTransition) {

			this.setLookAt(this._position0.x, this._position0.y, this._position0.z, this._target0.x, this._target0.y, this._target0.z, enableTransition);
		};

		CameraControls.prototype.saveState = function saveState() {

			this._target0.copy(this._target);
			this._position0.copy(this.object.position);
			this._zoom0 = this.object.zoom;
		};

		CameraControls.prototype.update = function update(delta) {

			// var offset = new THREE.Vector3();
			// var quat = new THREE.Quaternion().setFromUnitVectors( this.object.up, new THREE.Vector3( 0, 1, 0 ) );
			// var quatInverse = quat.clone().inverse();

			var currentDampingFactor = this._state === STATE.NONE ? this.dampingFactor : this.draggingDampingFactor;
			var lerpRatio = 1.0 - Math.exp(-currentDampingFactor * delta / 0.016);

			var deltaTheta = this._sphericalEnd.theta - this._spherical.theta;
			var deltaPhi = this._sphericalEnd.phi - this._spherical.phi;
			var deltaRadius = this._sphericalEnd.radius - this._spherical.radius;
			var deltaTarget = _v3A.subVectors(this._targetEnd, this._target);

			if (Math.abs(deltaTheta) > EPSILON || Math.abs(deltaPhi) > EPSILON || Math.abs(deltaRadius) > EPSILON || Math.abs(deltaTarget.x) > EPSILON || Math.abs(deltaTarget.y) > EPSILON || Math.abs(deltaTarget.z) > EPSILON) {

				this._spherical.set(this._spherical.radius + deltaRadius * lerpRatio, this._spherical.phi + deltaPhi * lerpRatio, this._spherical.theta + deltaTheta * lerpRatio);

				this._target.add(deltaTarget.multiplyScalar(lerpRatio));
				this._needsUpdate = true;
			} else {

				this._spherical.copy(this._sphericalEnd);
				this._target.copy(this._targetEnd);
			}

			this._spherical.makeSafe();
			this.object.position.setFromSpherical(this._spherical).add(this._target);
			this.object.lookAt(this._target);

			var updated = this._needsUpdate;
			this._needsUpdate = false;

			if (updated) this.dispatchEvent({ type: 'update' });
			return updated;
		};

		CameraControls.prototype.toJSON = function toJSON() {

			return JSON.stringify({
				enabled: this.enabled,

				minDistance: this.minDistance,
				maxDistance: infinityToMaxNumber(this.maxDistance),
				minPolarAngle: this.minPolarAngle,
				maxPolarAngle: infinityToMaxNumber(this.maxPolarAngle),
				minAzimuthAngle: infinityToMaxNumber(this.minAzimuthAngle),
				maxAzimuthAngle: infinityToMaxNumber(this.maxAzimuthAngle),
				dampingFactor: this.dampingFactor,
				draggingDampingFactor: this.draggingDampingFactor,
				dollySpeed: this.dollySpeed,
				truckSpeed: this.truckSpeed,
				dollyToCursor: this.dollyToCursor,
				verticalDragToForward: this.verticalDragToForward,

				target: this._targetEnd.toArray(),
				position: this.object.position.toArray(),

				target0: this._target0.toArray(),
				position0: this._position0.toArray()
			});
		};

		CameraControls.prototype.fromJSON = function fromJSON(json, enableTransition) {

			var obj = JSON.parse(json);
			var position = new THREE.Vector3().fromArray(obj.position);

			this.enabled = obj.enabled;

			this.minDistance = obj.minDistance;
			this.maxDistance = maxNumberToInfinity(obj.maxDistance);
			this.minPolarAngle = obj.minPolarAngle;
			this.maxPolarAngle = maxNumberToInfinity(obj.maxPolarAngle);
			this.minAzimuthAngle = maxNumberToInfinity(obj.minAzimuthAngle);
			this.maxAzimuthAngle = maxNumberToInfinity(obj.maxAzimuthAngle);
			this.dampingFactor = obj.dampingFactor;
			this.draggingDampingFactor = obj.draggingDampingFactor;
			this.dollySpeed = obj.dollySpeed;
			this.truckSpeed = obj.truckSpeed;
			this.dollyToCursor = obj.dollyToCursor;
			this.verticalDragToForward = obj.verticalDragToForward;

			this._target0.fromArray(obj.target0);
			this._position0.fromArray(obj.position0);

			this._targetEnd.fromArray(obj.target);
			this._sphericalEnd.setFromVector3(position.sub(this._target0));

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
				this._spherical.copy(this._sphericalEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.dispose = function dispose() {

			this._removeAllEventListeners();
		};

		CameraControls.prototype._sanitizeSphericals = function _sanitizeSphericals() {

			this._sphericalEnd.theta = this._sphericalEnd.theta % (2 * Math.PI);
			this._spherical.theta += 2 * Math.PI * Math.round((this._sphericalEnd.theta - this._spherical.theta) / (2 * Math.PI));
		};

		return CameraControls;
	}(EventDispatcher);

	function infinityToMaxNumber(value) {

		if (isFinite(value)) return value;

		if (value < 0) return -Number.MAX_VALUE;

		return Number.MAX_VALUE;
	}

	function maxNumberToInfinity(value) {

		if (Math.abs(value) < Number.MAX_VALUE) return value;

		return value * Infinity;
	}

	return CameraControls;

})));
