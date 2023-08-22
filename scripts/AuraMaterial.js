/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { Assets, EditorHelpers, ProjectHandler, MenuInputs, utils } = window.DigitalBacon;
const { Material } = Assets;
const { MaterialHelper, EditorHelperFactory } = EditorHelpers;
const { ColorInput } = MenuInputs;
const { numberOr } = utils;
import * as THREE from 'three';

export default class AuraMaterial extends Material {
    constructor(params = {}) {
        params['assetId'] = AuraMaterial.assetId;
        super(params);
        this._color = numberOr(params['color'], 0xffffff);
        this._createMaterial();
    }

    _getDefaultName() {
        return AuraMaterial.assetName;
    }

    _createMaterial() {
        let shader = AuraMaterial.AuraShader;
        this._material = new THREE.ShaderMaterial({
            name: shader.name,
            uniforms: THREE.UniformsUtils.clone(shader.uniforms),
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
        });
        this._material.uniforms['color'].value = new THREE.Color(this._color);
    }

    exportParams() {
        let params = super.exportParams();
        params['color'] = this._color;
        return params;
    }

    getColor() {
        return this._color;
    }

    setColor(color) {
        if(this._color == color) return;
        this._color = color;
        this._material.uniforms['color'].value.setHex(color);
    }

    static assetId = '1a52bbe0-eaad-463c-ae8b-fb35a5e01f43';
    static assetName = 'Aura Material';
}

AuraMaterial.AuraShader = {
    name: 'AuraShader',
    uniforms: {
        'color': { value: null },
    },
    vertexShader: /* glsl */`
        varying vec3 vNormal;
        void main() {
            vNormal = normalize( normalMatrix * normal );
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
    fragmentShader: /* glsl */`
        uniform vec3 color;
        varying vec3 vNormal;
        void main() {
            float intensity = pow( 0.7 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 4.0 );
            gl_FragColor = vec4(color,1.0) * intensity;
        }`
};

ProjectHandler.registerAsset(AuraMaterial);

if(EditorHelpers) {
    class AuraMaterialHelper extends MaterialHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "color", "name": "Color", "type": ColorInput },
        ];
    }

    EditorHelperFactory.registerEditorHelper(AuraMaterialHelper,
        AuraMaterial);
}
