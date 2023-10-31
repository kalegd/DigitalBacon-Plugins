if(!window.DigitalBacon) {
    console.error('Missing global DigitalBacon reference');
    throw new Error('Missing global DigitalBacon reference');
}

const { Assets, EditorHelpers, ProjectHandler, MenuInputs, getCamera, utils } = window.DigitalBacon;
const { CustomAssetEntity } = Assets;
const { CustomAssetEntityHelper, EditorHelperFactory } = EditorHelpers;
const { ColorInput, NumberInput, Vector2Input } = MenuInputs;
const { numberOr } = utils;

import * as THREE from 'three';

import {
    Clock,
	Color,
	Matrix4,
	Mesh,
	PerspectiveCamera,
	Plane,
    Quaternion,
    RepeatWrapping,
	ShaderMaterial,
    TextureLoader,
    UniformsLib,
	UniformsUtils,
    Vector2,
	Vector3,
	Vector4,
	WebGLRenderTarget,
	HalfFloatType
} from 'three';

const Water_1_M_Normal = 'https://cdn.jsdelivr.net/npm/digitalbacon-plugins@0.1.0/textures/Water_1_M_Normal.jpg';
const Water_2_M_Normal = 'https://cdn.jsdelivr.net/npm/digitalbacon-plugins@0.1.0/textures/Water_2_M_Normal.jpg';

class Reflector extends Mesh {

	constructor( geometry, options = {} ) {

		super( geometry );

		this.isReflector = true;

		this.type = 'Reflector';
		this.camera = new PerspectiveCamera();

		const scope = this;

		const color = ( options.color !== undefined ) ? new Color( options.color ) : new Color( 0x7F7F7F );
		const textureWidth = options.textureWidth || 512;
		const textureHeight = options.textureHeight || 512;
		const clipBias = options.clipBias || 0;
		const shader = options.shader || Reflector.ReflectorShader;
		const multisample = ( options.multisample !== undefined ) ? options.multisample : 4;

		//

		const reflectorPlane = new Plane();
		const normal = new Vector3();
		const reflectorWorldPosition = new Vector3();
		const cameraWorldPosition = new Vector3();
		const rotationMatrix = new Matrix4();
		const lookAtPosition = new Vector3( 0, 0, - 1 );
		const clipPlane = new Vector4();

		const view = new Vector3();
		const target = new Vector3();
		const q = new Vector4();

		const textureMatrix = new Matrix4();
        this._textureMatrix = textureMatrix;
		const virtualCamera = this.camera;

		const renderTarget = new WebGLRenderTarget( textureWidth, textureHeight, { samples: multisample, type: HalfFloatType } );

		const material = new ShaderMaterial( {
			name: ( shader.name !== undefined ) ? shader.name : 'unspecified',
			uniforms: UniformsUtils.clone( shader.uniforms ),
			fragmentShader: shader.fragmentShader,
			vertexShader: shader.vertexShader
		} );

		material.uniforms[ 'tDiffuse' ].value = renderTarget.texture;
		material.uniforms[ 'color' ].value = color;
		material.uniforms[ 'textureMatrix' ].value = textureMatrix;

		this.material = material;

		this.onBeforeRender = function ( renderer, scene, camera ) {

			reflectorWorldPosition.setFromMatrixPosition( scope.matrixWorld );
			cameraWorldPosition.setFromMatrixPosition( camera.matrixWorld );

			rotationMatrix.extractRotation( scope.matrixWorld );

			normal.set( 0, 0, 1 );
			normal.applyMatrix4( rotationMatrix );

			view.subVectors( reflectorWorldPosition, cameraWorldPosition );

			// Avoid rendering when reflector is facing away

			if ( view.dot( normal ) > 0 ) return;

			view.reflect( normal ).negate();
			view.add( reflectorWorldPosition );

			rotationMatrix.extractRotation( camera.matrixWorld );

			lookAtPosition.set( 0, 0, - 1 );
			lookAtPosition.applyMatrix4( rotationMatrix );
			lookAtPosition.add( cameraWorldPosition );

			target.subVectors( reflectorWorldPosition, lookAtPosition );
			target.reflect( normal ).negate();
			target.add( reflectorWorldPosition );

			virtualCamera.position.copy( view );
			virtualCamera.up.set( 0, 1, 0 );
			virtualCamera.up.applyMatrix4( rotationMatrix );
			virtualCamera.up.reflect( normal );
			virtualCamera.lookAt( target );

			virtualCamera.far = camera.far; // Used in WebGLBackground

			virtualCamera.updateMatrixWorld();
			virtualCamera.projectionMatrix.copy( camera.projectionMatrix );

			// Update the texture matrix
			textureMatrix.set(
				0.5, 0.0, 0.0, 0.5,
				0.0, 0.5, 0.0, 0.5,
				0.0, 0.0, 0.5, 0.5,
				0.0, 0.0, 0.0, 1.0
			);
			textureMatrix.multiply( virtualCamera.projectionMatrix );
			textureMatrix.multiply( virtualCamera.matrixWorldInverse );
			textureMatrix.multiply( scope.matrixWorld );

			// Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
			// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
			reflectorPlane.setFromNormalAndCoplanarPoint( normal, reflectorWorldPosition );
			reflectorPlane.applyMatrix4( virtualCamera.matrixWorldInverse );

			clipPlane.set( reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant );

			const projectionMatrix = virtualCamera.projectionMatrix;

			q.x = ( Math.sign( clipPlane.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
			q.y = ( Math.sign( clipPlane.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
			q.z = - 1.0;
			q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ];

			// Calculate the scaled plane vector
			clipPlane.multiplyScalar( 2.0 / clipPlane.dot( q ) );

			// Replacing the third row of the projection matrix
			projectionMatrix.elements[ 2 ] = clipPlane.x;
			projectionMatrix.elements[ 6 ] = clipPlane.y;
			projectionMatrix.elements[ 10 ] = clipPlane.z + 1.0 - clipBias;
			projectionMatrix.elements[ 14 ] = clipPlane.w;

			// Render
			scope.visible = false;

			const currentRenderTarget = renderer.getRenderTarget();

			const currentXrEnabled = renderer.xr.enabled;
			const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

			renderer.xr.enabled = false; // Avoid camera modification
			renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

			renderer.setRenderTarget( renderTarget );

			renderer.state.buffers.depth.setMask( true ); // make sure the depth buffer is writable so it can be properly cleared, see #18897

			if ( renderer.autoClear === false ) renderer.clear();
			renderer.render( scene, virtualCamera );

			renderer.xr.enabled = currentXrEnabled;
			renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

			renderer.setRenderTarget( currentRenderTarget );

			// Restore viewport

			const viewport = camera.viewport;

			if ( viewport !== undefined ) {

				renderer.state.viewport( viewport );

			}

			scope.visible = true;

		};

		this.getRenderTarget = function () {

			return renderTarget;

		};

		this.dispose = function () {

			renderTarget.dispose();
			scope.material.dispose();

		};

	}

}

Reflector.ReflectorShader = {

	name: 'ReflectorShader',

	uniforms: {

		'color': {
			value: null
		},

		'tDiffuse': {
			value: null
		},

		'textureMatrix': {
			value: null
		}

	},

	vertexShader: /* glsl */`
		uniform mat4 textureMatrix;
		varying vec4 vUv;

		#include <common>
		#include <logdepthbuf_pars_vertex>

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			#include <logdepthbuf_vertex>

		}`,

	fragmentShader: /* glsl */`
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		varying vec4 vUv;

		#include <logdepthbuf_pars_fragment>

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			#include <logdepthbuf_fragment>

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`
};

class Refractor extends Mesh {

	constructor( geometry, options = {} ) {

		super( geometry );

		this.isRefractor = true;

		this.type = 'Refractor';
		this.camera = new PerspectiveCamera();

		const scope = this;

		const color = ( options.color !== undefined ) ? new Color( options.color ) : new Color( 0x7F7F7F );
		const textureWidth = options.textureWidth || 512;
		const textureHeight = options.textureHeight || 512;
		const clipBias = options.clipBias || 0;
		const shader = options.shader || Refractor.RefractorShader;
		const multisample = ( options.multisample !== undefined ) ? options.multisample : 4;

		//

		const virtualCamera = this.camera;
		virtualCamera.matrixAutoUpdate = false;
		virtualCamera.userData.refractor = true;

		//

		const refractorPlane = new Plane();
		const textureMatrix = new Matrix4();

		// render target

		const renderTarget = new WebGLRenderTarget( textureWidth, textureHeight, { samples: multisample, type: HalfFloatType } );

		// material

		this.material = new ShaderMaterial( {
			uniforms: UniformsUtils.clone( shader.uniforms ),
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader,
			transparent: true // ensures, refractors are drawn from farthest to closest
		} );

		this.material.uniforms[ 'color' ].value = color;
		this.material.uniforms[ 'tDiffuse' ].value = renderTarget.texture;
		this.material.uniforms[ 'textureMatrix' ].value = textureMatrix;

		// functions

		const visible = ( function () {

			const refractorWorldPosition = new Vector3();
			const cameraWorldPosition = new Vector3();
			const rotationMatrix = new Matrix4();

			const view = new Vector3();
			const normal = new Vector3();

			return function visible( camera ) {

				refractorWorldPosition.setFromMatrixPosition( scope.matrixWorld );
				cameraWorldPosition.setFromMatrixPosition( camera.matrixWorld );

				view.subVectors( refractorWorldPosition, cameraWorldPosition );

				rotationMatrix.extractRotation( scope.matrixWorld );

				normal.set( 0, 0, 1 );
				normal.applyMatrix4( rotationMatrix );

				return view.dot( normal ) < 0;

			};

		} )();

		const updateRefractorPlane = ( function () {

			const normal = new Vector3();
			const position = new Vector3();
			const quaternion = new Quaternion();
			const scale = new Vector3();

			return function updateRefractorPlane() {

				scope.matrixWorld.decompose( position, quaternion, scale );
				normal.set( 0, 0, 1 ).applyQuaternion( quaternion ).normalize();

				// flip the normal because we want to cull everything above the plane

				normal.negate();

				refractorPlane.setFromNormalAndCoplanarPoint( normal, position );

			};

		} )();

		const updateVirtualCamera = ( function () {

			const clipPlane = new Plane();
			const clipVector = new Vector4();
			const q = new Vector4();

			return function updateVirtualCamera( camera ) {

				virtualCamera.matrixWorld.copy( camera.matrixWorld );
				virtualCamera.matrixWorldInverse.copy( virtualCamera.matrixWorld ).invert();
				virtualCamera.projectionMatrix.copy( camera.projectionMatrix );
				virtualCamera.far = camera.far; // used in WebGLBackground

				// The following code creates an oblique view frustum for clipping.
				// see: Lengyel, Eric. “Oblique View Frustum Depth Projection and Clipping”.
				// Journal of Game Development, Vol. 1, No. 2 (2005), Charles River Media, pp. 5–16

				clipPlane.copy( refractorPlane );
				clipPlane.applyMatrix4( virtualCamera.matrixWorldInverse );

				clipVector.set( clipPlane.normal.x, clipPlane.normal.y, clipPlane.normal.z, clipPlane.constant );

				// calculate the clip-space corner point opposite the clipping plane and
				// transform it into camera space by multiplying it by the inverse of the projection matrix

				const projectionMatrix = virtualCamera.projectionMatrix;

				q.x = ( Math.sign( clipVector.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
				q.y = ( Math.sign( clipVector.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
				q.z = - 1.0;
				q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ];

				// calculate the scaled plane vector

				clipVector.multiplyScalar( 2.0 / clipVector.dot( q ) );

				// replacing the third row of the projection matrix

				projectionMatrix.elements[ 2 ] = clipVector.x;
				projectionMatrix.elements[ 6 ] = clipVector.y;
				projectionMatrix.elements[ 10 ] = clipVector.z + 1.0 - clipBias;
				projectionMatrix.elements[ 14 ] = clipVector.w;

			};

		} )();

		// This will update the texture matrix that is used for projective texture mapping in the shader.
		// see: http://developer.download.nvidia.com/assets/gamedev/docs/projective_texture_mapping.pdf

		function updateTextureMatrix( camera ) {

			// this matrix does range mapping to [ 0, 1 ]

			textureMatrix.set(
				0.5, 0.0, 0.0, 0.5,
				0.0, 0.5, 0.0, 0.5,
				0.0, 0.0, 0.5, 0.5,
				0.0, 0.0, 0.0, 1.0
			);

			// we use "Object Linear Texgen", so we need to multiply the texture matrix T
			// (matrix above) with the projection and view matrix of the virtual camera
			// and the model matrix of the refractor

			textureMatrix.multiply( camera.projectionMatrix );
			textureMatrix.multiply( camera.matrixWorldInverse );
			textureMatrix.multiply( scope.matrixWorld );

		}

		//

		function render( renderer, scene, camera ) {

			scope.visible = false;

			const currentRenderTarget = renderer.getRenderTarget();
			const currentXrEnabled = renderer.xr.enabled;
			const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

			renderer.xr.enabled = false; // avoid camera modification
			renderer.shadowMap.autoUpdate = false; // avoid re-computing shadows

			renderer.setRenderTarget( renderTarget );
			if ( renderer.autoClear === false ) renderer.clear();
			renderer.render( scene, virtualCamera );

			renderer.xr.enabled = currentXrEnabled;
			renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
			renderer.setRenderTarget( currentRenderTarget );

			// restore viewport

			const viewport = camera.viewport;

			if ( viewport !== undefined ) {

				renderer.state.viewport( viewport );

			}

			scope.visible = true;

		}

		//

		this.onBeforeRender = function ( renderer, scene, camera ) {

			// ensure refractors are rendered only once per frame

			if ( camera.userData.refractor === true ) return;

			// avoid rendering when the refractor is viewed from behind

			if ( ! visible( camera ) === true ) return;

			// update

			updateRefractorPlane();

			updateTextureMatrix( camera );

			updateVirtualCamera( camera );

			render( renderer, scene, camera );

		};

		this.getRenderTarget = function () {

			return renderTarget;

		};

		this.dispose = function () {

			renderTarget.dispose();
			scope.material.dispose();

		};

	}

}

Refractor.RefractorShader = {

	uniforms: {

		'color': {
			value: null
		},

		'tDiffuse': {
			value: null
		},

		'textureMatrix': {
			value: null
		}

	},

	vertexShader: /* glsl */`

		uniform mat4 textureMatrix;

		varying vec4 vUv;

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

		uniform vec3 color;
		uniform sampler2D tDiffuse;

		varying vec4 vUv;

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`

};

/**
 * References:
 *	https://alex.vlachos.com/graphics/Vlachos-SIGGRAPH10-WaterFlow.pdf
 *	http://graphicsrunner.blogspot.de/2010/08/water-using-flow-maps.html
 *
 */

class Water extends Mesh {

	constructor( geometry, options = {} ) {

		super( geometry );

		this.isWater = true;

		this.type = 'Water';

		const scope = this;

		const color = ( options.color !== undefined ) ? new Color( options.color ) : new Color( 0xFFFFFF );
		const textureWidth = options.textureWidth || 512;
		const textureHeight = options.textureHeight || 512;
		const clipBias = options.clipBias || 0;
		const flowDirection = options.flowDirection || new Vector2( 1, 0 );
		this.flowSpeed = options.flowSpeed || 0.03;
		const reflectivity = options.reflectivity || 0.02;
		const scale = options.scale || 1;
		const shader = options.shader || Water.WaterShader;

		const textureLoader = new TextureLoader();

		const flowMap = options.flowMap || undefined;
		const normalMap0 = options.normalMap0 || textureLoader.load(Water_1_M_Normal);
		const normalMap1 = options.normalMap1 || textureLoader.load(Water_2_M_Normal);

		const cycle = 0.15; // a cycle of a flow map phase
		const halfCycle = cycle * 0.5;
		const textureMatrix = new Matrix4();
		const clock = new Clock();

		// internal components

		if ( Reflector === undefined ) {

			console.error( 'THREE.Water: Required component Reflector not found.' );
			return;

		}

		if ( Refractor === undefined ) {

			console.error( 'THREE.Water: Required component Refractor not found.' );
			return;

		}

		const reflector = new Reflector( geometry, {
			textureWidth: textureWidth,
			textureHeight: textureHeight,
			clipBias: clipBias
		} );

		const refractor = new Refractor( geometry, {
			textureWidth: textureWidth,
			textureHeight: textureHeight,
			clipBias: clipBias
		} );

		reflector.matrixAutoUpdate = false;
		refractor.matrixAutoUpdate = false;

		// material

		this.material = new ShaderMaterial( {
			uniforms: UniformsUtils.merge( [
				UniformsLib[ 'fog' ],
				shader.uniforms
			] ),
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader,
			transparent: true,
			fog: true
		} );

		if ( flowMap !== undefined ) {

			this.material.defines.USE_FLOWMAP = '';
			this.material.uniforms[ 'tFlowMap' ] = {
				type: 't',
				value: flowMap
			};

		} else {

			this.material.uniforms[ 'flowDirection' ] = {
				type: 'v2',
				value: flowDirection
			};

		}

		// maps

		normalMap0.wrapS = normalMap0.wrapT = RepeatWrapping;
		normalMap1.wrapS = normalMap1.wrapT = RepeatWrapping;

		this.material.uniforms[ 'tReflectionMap' ].value = reflector.getRenderTarget().texture;
		this.material.uniforms[ 'tRefractionMap' ].value = refractor.getRenderTarget().texture;
		this.material.uniforms[ 'tNormalMap0' ].value = normalMap0;
		this.material.uniforms[ 'tNormalMap1' ].value = normalMap1;

		// water

		this.material.uniforms[ 'color' ].value = color;
		this.material.uniforms[ 'reflectivity' ].value = reflectivity;
		this.material.uniforms[ 'textureMatrix' ].value = textureMatrix;
		this.material.uniforms[ 'reflectionTextureMatrix' ].value = reflector._textureMatrix;

		// inital values

		this.material.uniforms[ 'config' ].value.x = 0; // flowMapOffset0
		this.material.uniforms[ 'config' ].value.y = halfCycle; // flowMapOffset1
		this.material.uniforms[ 'config' ].value.z = halfCycle; // halfCycle
		this.material.uniforms[ 'config' ].value.w = scale; // scale

		// functions

		function updateTextureMatrix( camera ) {

			textureMatrix.set(
				0.5, 0.0, 0.0, 0.5,
				0.0, 0.5, 0.0, 0.5,
				0.0, 0.0, 0.5, 0.5,
				0.0, 0.0, 0.0, 1.0
			);

			textureMatrix.multiply( camera.projectionMatrix );
			textureMatrix.multiply( camera.matrixWorldInverse );
			textureMatrix.multiply( scope.matrixWorld );

		}

		function updateFlow() {

			const delta = clock.getDelta();
			const config = scope.material.uniforms[ 'config' ];

			config.value.x += scope.flowSpeed * delta; // flowMapOffset0
			config.value.y = config.value.x + halfCycle; // flowMapOffset1

			// Important: The distance between offsets should be always the value of "halfCycle".
			// Moreover, both offsets should be in the range of [ 0, cycle ].
			// This approach ensures a smooth water flow and avoids "reset" effects.

			if ( config.value.x >= cycle ) {

				config.value.x = 0;
				config.value.y = halfCycle;

			} else if ( config.value.y >= cycle ) {

				config.value.y = config.value.y - cycle;

			}

		}

		//

		this.onBeforeRender = function ( renderer, scene, camera ) {

			updateTextureMatrix( camera );
			updateFlow();

			scope.visible = false;

			reflector.matrixWorld.copy( scope.matrixWorld );
			refractor.matrixWorld.copy( scope.matrixWorld );

			reflector.onBeforeRender( renderer, scene, camera );
			refractor.onBeforeRender( renderer, scene, camera );

			scope.visible = true;

		};

	}

}

Water.WaterShader = {

	uniforms: {

		'color': {
			type: 'c',
			value: null
		},

		'reflectivity': {
			type: 'f',
			value: 0
		},

		'tReflectionMap': {
			type: 't',
			value: null
		},

		'tRefractionMap': {
			type: 't',
			value: null
		},

		'tNormalMap0': {
			type: 't',
			value: null
		},

		'tNormalMap1': {
			type: 't',
			value: null
		},

		'textureMatrix': {
			type: 'm4',
			value: null
		},

		'reflectionTextureMatrix': {
			type: 'm4',
			value: null
		},

		'config': {
			type: 'v4',
			value: new Vector4()
		}

	},

	vertexShader: /* glsl */`

		#include <common>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>

		uniform mat4 textureMatrix;
		uniform mat4 reflectionTextureMatrix;

		varying vec4 vCoord;
		varying vec4 vReflectionCoord;
		varying vec2 vUv;
		varying vec3 vToEye;

		void main() {

			vUv = uv;
			vCoord = textureMatrix * vec4( position, 1.0 );
			vReflectionCoord = reflectionTextureMatrix * vec4( position, 1.0 );

			vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
			vToEye = cameraPosition - worldPosition.xyz;

			vec4 mvPosition =  viewMatrix * worldPosition; // used in fog_vertex
			gl_Position = projectionMatrix * mvPosition;

			#include <logdepthbuf_vertex>
			#include <fog_vertex>

		}`,

	fragmentShader: /* glsl */`

		#include <common>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>

		uniform sampler2D tReflectionMap;
		uniform sampler2D tRefractionMap;
		uniform sampler2D tNormalMap0;
		uniform sampler2D tNormalMap1;

		#ifdef USE_FLOWMAP
			uniform sampler2D tFlowMap;
		#else
			uniform vec2 flowDirection;
		#endif

		uniform vec3 color;
		uniform float reflectivity;
		uniform vec4 config;

		varying vec4 vCoord;
		varying vec4 vReflectionCoord;
		varying vec2 vUv;
		varying vec3 vToEye;

		void main() {

			#include <logdepthbuf_fragment>

			float flowMapOffset0 = config.x;
			float flowMapOffset1 = config.y;
			float halfCycle = config.z;
			float scale = config.w;

			vec3 toEye = normalize( vToEye );

			// determine flow direction
			vec2 flow;
			#ifdef USE_FLOWMAP
				flow = texture2D( tFlowMap, vUv ).rg * 2.0 - 1.0;
			#else
				flow = flowDirection;
			#endif
			flow.x *= - 1.0;

			// sample normal maps (distort uvs with flowdata)
			vec4 normalColor0 = texture2D( tNormalMap0, ( vUv * scale ) + flow * flowMapOffset0 );
			vec4 normalColor1 = texture2D( tNormalMap1, ( vUv * scale ) + flow * flowMapOffset1 );

			// linear interpolate to get the final normal color
			float flowLerp = abs( halfCycle - flowMapOffset0 ) / halfCycle;
			vec4 normalColor = mix( normalColor0, normalColor1, flowLerp );

			// calculate normal vector
			vec3 normal = normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );

			// calculate the fresnel term to blend reflection and refraction maps
			float theta = max( dot( toEye, normal ), 0.0 );
			float reflectance = reflectivity + ( 1.0 - reflectivity ) * pow( ( 1.0 - theta ), 5.0 );

			// calculate final uv coords
			vec3 coord = vCoord.xyz / vCoord.w;
			vec2 uv = coord.xy + coord.z * normal.xz * 0.05;

			vec4 reflectColor = textureProj( tReflectionMap, vReflectionCoord );
			vec4 refractColor = texture2D( tRefractionMap, uv );

			// multiply water color with the mix of both textures
			gl_FragColor = vec4( color, 1.0 ) * mix( refractColor, reflectColor, reflectance );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>

		}`

};

export default class WaterAsset extends CustomAssetEntity {
    constructor(params = {}) {
        params['assetId'] = WaterAsset.assetId;
        super(params);
        this._color = new THREE.Color(
            numberOr(params['color'],  0x7f7f7f));
        this._flowDirection = params['flowDirection'] || [1, 1];
        this._flowSpeed = numberOr(params['flowSpeed'], 0.03);
        this._height = numberOr(params['height'], 1);
        this._width = numberOr(params['width'], 1);
        this._waterScale = numberOr(params['waterScale'], 1);
        this._createMesh();
    }

    _createMesh() {
        let geometry = new THREE.PlaneGeometry(this._width, this._height);
        let flowDirectionVec2 = new Vector2(this._flowDirection[0],
            this._flowDirection[1]);
        this._mesh = new Water(geometry, {
            color: this._color,
            flowDirection: flowDirectionVec2,
            flowSpeed: this._flowSpeed,
            scale: this._waterScale,
        });
        this._object.add(this._mesh);
    }

    _getDefaultName() {
        return WaterAsset.assetName;
    }

    _updateGeometry() {
        this._object.remove(this._mesh);
        utils.fullDispose(this._mesh);
        this._createMesh();
    }

    exportParams() {
        let params = super.exportParams();
        params['color'] = this._color.getHex();
        params['flowDirection'] = this._flowDirection;
        params['flowSpeed'] = this._flowSpeed;
        params['height'] = this._height;
        params['waterScale'] = this._waterScale;
        params['width'] = this._width;
        return params;
    }

    getColor() {
        return this._color.getHex();
    }

    getFlowDirection() {
        return this._flowDirection;
    }

    getFlowSpeed() {
        return this._flowSpeed;
    }

    getHeight() {
        return this._height;
    }

    getWaterScale() {
        return this._waterScale;
    }

    getWidth() {
        return this._width;
    }

    setColor(color) {
        this._color.set(color);
        this._mesh.material.uniforms['color'].value.set(color);
    }

    setFlowDirection(flowDirection) {
        this._flowDirection = flowDirection;
        this._mesh.material.uniforms['flowDirection'].value
            .fromArray(flowDirection);
    }

    setFlowSpeed(flowSpeed) {
        this._flowSpeed = flowSpeed;
        this._mesh.flowSpeed = flowSpeed;
    }

    setHeight(height) {
        this._height = height;
        this._updateGeometry(this._height, this._width);
    }

    setWaterScale(waterScale) {
        this._waterScale = waterScale;
        this._mesh.material.uniforms['config'].value.w = waterScale;
    }

    setWidth(width) {
        this._width = width;
        this._updateGeometry(this._height, this._width);
    }

    static assetId = 'b02d649a-b6ec-454b-8e8f-8561f0dadebc';
    static assetName = 'Water';
}

ProjectHandler.registerAsset(WaterAsset);

if(EditorHelpers) {
    class WaterAssetHelper extends CustomAssetEntityHelper {
        constructor(asset) {
            super(asset);
        }

        place(intersection) {
            let camera = getCamera();
            let vector3 = new THREE.Vector3();
            let object = intersection.object;
            let point = intersection.point;
            let face = intersection.face;
            object.updateMatrixWorld();
            let normal = intersection.face.normal.clone()
                .transformDirection(object.matrixWorld).clampLength(0, 0.001);
            if(camera.getWorldDirection(vector3).dot(normal) > 0)
                normal.negate();
            this._object.position.copy(normal).add(point);
            this._object.lookAt(normal.add(this._object.position));
            this.roundAttributes(true);
        }

        static fields = [
            { "parameter": "visualEdit" },
            { "parameter": "height", "name": "Height", "min": 0,
                "type": NumberInput },
            { "parameter": "width", "name": "Width", "min": 0,
                "type": NumberInput },
            { "parameter": "color", "name": "Color", "type": ColorInput },
            { "parameter": "flowSpeed", "name": "Flow Speed", "min": 0,
                "type": NumberInput },
            { "parameter": "flowDirection", "name": "Flow Direction",
                "type": Vector2Input },
            { "parameter": "waterScale", "name": "Water Scale", "min": 0,
                "type": NumberInput },
            { "parameter": "position" },
            { "parameter": "rotation" },
            { "parameter": "scale" },
        ];
    }

    EditorHelperFactory.registerEditorHelper(WaterAssetHelper,
        WaterAsset);
}
