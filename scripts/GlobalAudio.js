/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { Assets, AudioHandler, EditorHelpers, LibraryHandler, ProjectHandler, isEditor, utils } = window.DigitalBacon;
const { CustomAsset } = Assets;
const { CustomAssetHelper, EditorHelperFactory } = EditorHelpers;
const { AudioField, CheckboxField, NumberField } = CustomAssetHelper.FieldTypes;
const { numberOr } = utils;


import * as THREE from 'three';

export default class GlobalAudio extends CustomAsset {
    constructor(params = {}) {
        super(params);
        this._audioId = params['audioId'];
        this._autoplay = params['autoplay'] || false;
        this._loop = params['loop'] || false;
        this._volume = numberOr(params['volume'], 1);
        this._createAudio();
    }

    _createAudio(assetId) {
        let audioBuffer = LibraryHandler.getBuffer(this._audioId);
        this._object = new THREE.Audio(AudioHandler.getListener());
        if(!isEditor) this._object.autoplay = this._autoplay;
        this._object.autoplay = this._autoplay;
        this._object.setLoop(this._loop);
        this._object.setVolume(this._volume);
        this._object.setBuffer(audioBuffer);
    }

    _getDefaultName() {
        return GlobalAudio.assetName;
    }

    clone(visualEditOverride) {
        let params = this._fetchCloneParams(visualEditOverride);
        return ProjectHandler.addNewAsset(this._assetId, params);
    }

    exportParams() {
        let params = super.exportParams();
        params['audioId'] = this._audioId;
        params['autoplay'] = this._autoplay;
        params['loop'] = this._loop;
        params['volume'] = this._volume;
        return params;
    }

    get audioId() { return this._audioId; }
    get autoplay() { return this._autoplay; }
    get loop() { return this._loop; }
    get volume() { return this._volume; }

    set audioId(audioId) {
        let audioBuffer = LibraryHandler.getBuffer(audioId);
        this._audioId = audioId;
        this._object.setBuffer(audioBuffer);
    }

    set autoplay(autoplay) {
        this._autoplay = autoplay;
        if(!isEditor) this._object.autoplay = autoplay;
    }

    set loop(loop) {
        this._loop = loop;
        this._object.setLoop(loop);
    }

    set volume(volume) {
        this._volume = volume;
        this._object.setVolume(volume);
    }

    static assetId = '88533b7f-b525-433f-8512-75cb0794d3d9';
    static assetName = 'Global Audio';
}

ProjectHandler.registerAsset(GlobalAudio);

if(EditorHelpers) {
    class GlobalAudioHelper extends CustomAssetHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "audioId", "name": "Audio", "type": AudioField },
            { "parameter": "autoplay", "name": "Auto Play",
                "suppressMenuFocusEvent": true, "type": CheckboxField },
            { "parameter": "loop", "name": "Loop",
                "suppressMenuFocusEvent": true, "type": CheckboxField },
            { "parameter": "volume", "name": "Volume", "min": 0,
                "type": NumberField },
        ];
    }

    EditorHelperFactory.registerEditorHelper(GlobalAudioHelper,
        GlobalAudio);
}
