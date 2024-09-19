/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { Assets, AudioHandler, EditorHelpers, LibraryHandler, PartyHandler, ProjectHandler, PubSub, isEditor, utils } = window.DigitalBacon;
const { CustomAsset } = Assets;
const { CustomAssetHelper, EditorHelperFactory } = EditorHelpers;
const { AudioField, CheckboxField, NumberField, TextField } = CustomAssetHelper.FieldTypes;
const { numberOr } = utils;


import * as THREE from 'three';

export default class GlobalAudio extends CustomAsset {
    constructor(params = {}) {
        super(params);
        this._object = new THREE.Object3D();
        this._audioId = params['audioId'];
        this._autoplay = params['autoplay'] || false;
        this._loop = params['loop'] || false;
        this._volume = numberOr(params['volume'], 1);
        this.playTopic = params['playTopic'] || '';
        this.pauseTopic = params['pauseTopic'] || '';
        this.stopTopic = params['stopTopic'] || '';
        this._createAudio();
        if(!isEditor()) this._addPartySubscriptions();
    }

    _createAudio(assetId) {
        let audioBuffer = LibraryHandler.getBuffer(this._audioId);
        this._media = new THREE.Audio(AudioHandler.getListener());
        this._media.setLoop(this._loop);
        this._media.setVolume(this._volume);
        this._media.setBuffer(audioBuffer);
        this._object.add(this._media);
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
        params['pauseTopic'] = this._pauseTopic;
        params['playTopic'] = this._playTopic;
        params['stopTopic'] = this._stopTopic;
        return params;
    }

    get audioId() { return this._audioId; }
    get autoplay() { return this._autoplay; }
    get isPlaying() { return this._media.isPlaying; }
    get loop() { return this._loop; }
    get progress() {
        if(this._media.isPlaying) {
            this._media.pause();//pause() update audio._progress
            this._media.play();
        }
        return this._media._progress;
    }
    get playTopic() { return this._playTopic; }
    get pauseTopic() { return this._pauseTopic; }
    get stopTopic() { return this._stopTopic; }
    get volume() { return this._volume; }

    set audioId(audioId) {
        let audioBuffer = LibraryHandler.getBuffer(audioId);
        this._audioId = audioId;
        this._media.setBuffer(audioBuffer);
    }

    set autoplay(autoplay) {
        this._autoplay = autoplay;
        if(!isEditor()) this._media.autoplay = autoplay;
    }

    set loop(loop) {
        this._loop = loop;
        this._media.setLoop(loop);
    }

    set playTopic(playTopic) {
        if(this._playTopic) {
            PubSub.unsubscribe(this._id, this._playTopic);
        }
        this._playTopic = playTopic;
        if(this._playTopic) {
            PubSub.subscribe(this._id, this._playTopic, () => {
                if(!isEditor()) this.play(null, true);
            });
        }
    }

    set progress(position) {
        if(position != null) {
            this._media._progress = position || 0;
        }
    }

    set pauseTopic(pauseTopic) {
        if(this._pauseTopic) {
            PubSub.unsubscribe(this._id, this._pauseTopic);
        }
        this._pauseTopic = pauseTopic;
        if(this._pauseTopic) {
            PubSub.subscribe(this._id, this._pauseTopic, () => {
                if(!isEditor()) this.pause(null, true);
            });
        }
    }

    set stopTopic(stopTopic) {
        if(this._stopTopic) {
            PubSub.unsubscribe(this._id, this._stopTopic);
        }
        this._stopTopic = stopTopic;
        if(this._stopTopic) {
            PubSub.subscribe(this._id, this._stopTopic, () => {
                if(!isEditor()) this.stop(true);
            });
        }
    }

    set volume(volume) {
        this._volume = volume;
        this._media.setVolume(volume);
    }

    play(position, ignorePublish) {
        if(this._media.isPlaying) this._media.pause();
        this.progress = position;
        this._media.play();
        if(ignorePublish) return;
        position = new Float64Array([this.progress]);
        this.publishPartyMessage(PlayableMediaActions.PLAY, position);
    }

    pause(position, ignorePublish) {
        this._media.pause();
        this.progress = position;
        if(ignorePublish) return;
        position = new Float64Array([this.progress]);
        this.publishPartyMessage(PlayableMediaActions.PAUSE, position);
    }

    stop(ignorePublish) {
        this._media.pause();
        this.progress = 0;
        if(ignorePublish) return;
        this.publishPartyMessage(PlayableMediaActions.STOP);
    }

    _addPartySubscriptions() {
        PubSub.subscribe(this._id, 'PEER_READY', (message) => {
            this._onPeerReady(message.peer);
        });
        PubSub.subscribe(this._id, 'PARTY_STARTED', () => {
            this._onPartyStarted(PartyHandler.isHost());
        });
        PubSub.subscribe(this._id, 'SESSION_STARTED', () => {
            if(this._autoplay && !this._alreadyAutoplayed) {
                this.play(null, true);
                this._alreadyAutoplayed = true;
            }
        });
        PartyHandler.addInternalBufferMessageHandler(this._id, (p, m) => {
            let type = new Uint8Array(m, 0, 1);
            if(type[0] == PlayableMediaActions.PLAY) {
                let message = new Float64Array(m.slice(1));
                this.play(message[0], true);
            } else if(type[0] == PlayableMediaActions.PAUSE) {
                let message = new Float64Array(m.slice(1));
                this.pause(message[0], true);
            } else if(type[0] == PlayableMediaActions.STOP) {
                this.stop(true);
            }
        });
    }

    _onPeerReady(peer) {
        if(!PartyHandler.isHost()) return;
        let topic = (this.isPlaying) ? 'PLAY' : 'PAUSE';
        let position = new Float64Array([this.progress]);
        this.publishPartyMessage(topic, position, peer);
    }

    _onPartyStarted(isHost) {
        if(isHost) return;
        this.stop(true);
    }

    onRemoveFromProject() {
        this.stop(true);
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
            { "parameter": "playTopic", "name": "Play Event", "singleLine": true,
                "type": TextField },
            { "parameter": "pauseTopic", "name": "Pause Event", "singleLine": true,
                "type": TextField },
            { "parameter": "stopTopic", "name": "Stop Event", "singleLine": true,
                "type": TextField },
        ];
    }

    EditorHelperFactory.registerEditorHelper(GlobalAudioHelper,
        GlobalAudio);
}
