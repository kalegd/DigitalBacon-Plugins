/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

if(!window.DigitalBacon) {
    console.error('Missing global DigitalBacon reference');
    throw new Error('Missing global DigitalBacon reference');
}

import * as THREE from 'three';

const { Assets, InputHandler, PartyMessageHelper, ProjectHandler, Scene, UserController, getDeviceType, isEditor } = window.DigitalBacon;
const { System } = Assets;
const deviceType = getDeviceType();

const AUDIO_QUANTITY = 3;
const SPEED = 10;
const WAVE_CHARGING = 'WAVE_CHARGING';
const WAVE_FIRED = 'WAVE_FIRED';
const TOPIC = 'KamehamehaSystem:Topic';
const COMPONENT_ASSET_ID = '8df1c185-59be-49ce-862f-f3070a7f2088';

export default class KamehamehaSystem extends System {
    constructor(params = {}) {
        params['assetId'] = KamehamehaSystem.assetId;
        super(params);
        this._waveAssets = {};
        this._chargingBlasts = {};
        this._firedBlasts = {};
    }

    _getDefaultName() {
        return KamehamehaSystem.assetName;
    }

    getDescription() {
        return "Adds ability to perform Kamehameha Wave";
    }

    _addSubscriptions() {
        if(isEditor()) return;
        this._listenForComponentAttached(COMPONENT_ASSET_ID, (message) => {
            let instance = ProjectHandler.getSessionAsset(message.id);
            let component = ProjectHandler.getSessionAsset(message.componentId);
            let type = component.getType();
            if(!(type in this._waveAssets)) this._waveAssets[type] = instance;
            if(type == 'BLAST' && deviceType == 'XR') {
                this._checkWaveFired = this._checkWaveFiredXR;
            }
        });
        this._listenForComponentDetached(COMPONENT_ASSET_ID, (message) => {
            let instance = ProjectHandler.getSessionAsset(message.id);
            let component = ProjectHandler.getSessionAsset(message.componentId);
            let type = component.getType();
            if(this._waveAssets[type] == instance)
                delete this._waveAssets[type];
        });
        PartyMessageHelper.registerBlockableHandler(TOPIC,
            (p, m) => {
                if(m.type == WAVE_CHARGING) {
                    this._handleBlastCreated(p, m);
                } else if(m.type == WAVE_FIRED) {
                    this._handleWaveFired(p, m);
                }
            });
    }

    _handleBlastCreated(peer, message) {
        let blast = ProjectHandler.getSessionAsset(message.id);
        blast.leftHand = peer.controller.getHand('LEFT');
        blast.rightHand = peer.controller.getHand('RIGHT');
        if(!blast || !blast.leftHand || !blast.rightHand) return;
        this._updateBlastPosition(blast);
        this._chargingBlasts[message.id] = blast;
        if(message.chargeAudioId) {
            let audio = ProjectHandler.getSessionAsset(message.chargeAudioId);
            if(audio) {
                blast.chargeAudio = audio;
                blast.chargeAudio.play(null, true);
            }
        }
        if(message.firedAudioId) {
            let audio = ProjectHandler.getSessionAsset(message.firedAudioId);
            if(audio) blast.firedAudio = audio;
        }
    }

    _handleWaveFired(peer, message) {
        let blast = ProjectHandler.getSessionAsset(message.id);
        if(!blast) return;
        blast.getObject().scale.set(2, 2, 2.8);
        delete this._chargingBlasts[message.id];
        this._firedBlasts[message.id] = blast;
        blast.firedAt = message.firedAt;
        if(blast.chargeAudio)
            blast.chargeAudio.getAudio().stop();
        if(blast.firedAudio)
            blast.firedAudio.play(null, true);
        this._updateFiredBlastPosition(blast);
    }

    _checkWaveFired() { }

    _checkWaveFiredXR() {
        let leftHand = UserController.getHand('LEFT');
        let rightHand = UserController.getHand('RIGHT');
        let leftPalmDirection = (leftHand && leftHand.isInScene())
            ? leftHand.getPalmDirection()
            : null;
        let rightPalmDirection = (rightHand && rightHand.isInScene())
            ? rightHand.getPalmDirection()
            : null;
        if(this._firing) {
            if(Date.now() - this._blast.firedAt > 5000) {
                this._firing = false;
            }
        } else if(this._charging) {
            if(!leftPalmDirection || !rightPalmDirection) {
                this._deleteChargingBlast(this._blast, false);
                this._charging = false;
            } else {
                let angle = leftPalmDirection.angleTo(rightPalmDirection);
                let distance = leftHand.getObject().position.distanceTo(
                    rightHand.getObject().position);
                if(distance > 0.3) {
                    this._deleteChargingBlast(this._blast, false);
                    this._charging = false;
                } else if(angle < 2.3) {
                    this._firing = true;
                    this._charging = false;
                    this._firedBlasts[this._blast.getId()] = this._blast;
                    delete this._chargingBlasts[this._blast.getId()];
                    this._blast.firedAt = Date.now();
                    this._blast.getObject().scale.set(2, 2, 2.8);
                    if(this._blast.chargeAudio)
                        this._blast.chargeAudio.getAudio().stop();
                    if(this._blast.firedAudio)
                        this._blast.firedAudio.play(null, true);
                    this._publish(this._blast, WAVE_FIRED);
                }
            }
        } else {
            if(!leftPalmDirection || !rightPalmDirection) return;
            let angle = leftPalmDirection.angleTo(rightPalmDirection);
            let distance = leftHand.getObject().position.distanceTo(
                rightHand.getObject().position);
            if(angle > 2.5 && distance < 0.15) {
                this._blast = this._waveAssets['BLAST'].clone();
                this._blast.leftHand = leftHand;
                this._blast.rightHand = rightHand;
                this._updateBlastPosition(this._blast);
                this._charging = true;
                this._chargingBlasts[this._blast.getId()] = this._blast;
                this._addAudio(this._blast);
                this._publish(this._blast, WAVE_CHARGING);
            }
        }
    }

    _addAudio(blast) {
        if(this._waveAssets['AUDIO_1']) {
            blast.chargeAudio = this._waveAssets['AUDIO_1'].clone();
            blast.chargeAudio.setPosition([0, 0, 0]);
            blast.chargeAudio.addTo(blast);
            blast.chargeAudio.play(null, true);
        }
        if(this._waveAssets['AUDIO_2']) {
            blast.firedAudio = this._waveAssets['AUDIO_2'].clone();
            blast.firedAudio.setPosition([0, 0, 0]);
            blast.firedAudio.addTo(blast);
        }
    }

    _deleteChargingBlast(blast, ignorePublish) {
        delete this._chargingBlasts[blast.getId()];
        ProjectHandler.deleteAsset(this._blast, true, ignorePublish);
        if(blast.chargeAudio) blast.chargeAudio.getAudio().stop();
    }

    _updateBlastPosition(blast) {
        let midpoint = new THREE.Vector3();
        let vec3 = new THREE.Vector3();
        blast.leftHand.getObject().getWorldPosition(midpoint);
        blast.rightHand.getObject().getWorldPosition(vec3);
        midpoint.add(vec3).divideScalar(2);
        blast.setPosition(midpoint.toArray());
    }

    _updateFiredBlastPosition(blast) {
        let midpoint = new THREE.Vector3();
        let vec3 = new THREE.Vector3();
        blast.leftHand.getObject().getWorldPosition(midpoint);
        blast.rightHand.getObject().getWorldPosition(vec3);
        midpoint.add(vec3).divideScalar(2);
        let length = (Date.now() - blast.firedAt) / 1000 * SPEED;
        let position = blast.getObject().position;
        position.copy(blast.leftHand.getPalmDirection())
            .add(blast.rightHand.getPalmDirection())
            .setLength(length);
        //UserController.getObject().localToWorld(position);
        position.add(midpoint);
        blast.getObject().lookAt(midpoint);
        if(!blast.wave) this._createWave(blast);
        blast.wave.scale.set(1, length, 1);
        blast.wave.scale.divideScalar(2.8);
        blast.wave.position.setZ(length / 2 / 2.8);
        if(Date.now() - blast.firedAt > 5000) {
            delete this._firedBlasts[blast.getId()];
            ProjectHandler.deleteAsset(blast, true, blast != this._blast);
            if(blast == this._blast) this._firing = false;
        }
    }

    _createWave(blast) {
        let geometry = new THREE.CylinderGeometry(0.1, 0.1, 1);
        let material = new THREE.MeshBasicMaterial(0xffffff);
        blast.wave = new THREE.Mesh(geometry, material);
        blast.getObject().add(blast.wave);
        blast.wave.rotation.set(Math.PI/2, 0, 0);
    }

    _publish(blast, type) {
        let message = {
            topic: TOPIC,
            id: blast.getId(),
            type: type,
        };
        if(type == WAVE_FIRED) {
            message['firedAt'] = blast.firedAt;
        } else {
            if(blast.chargeAudio)
                message['chargeAudioId'] = blast.chargeAudio.getId();
            if(blast.firedAudio)
                message['firedAudioId'] = blast.firedAudio.getId();
        }
        PartyMessageHelper.queuePublish(JSON.stringify(message));
    }

    addToScene() {
        super.addToScene();
        this._addSubscriptions();
    }

    update(timeDelta) {
        for(let blastId in this._chargingBlasts) {
            let blast = this._chargingBlasts[blastId];
            if(!blast.getObject().parent) {
                delete this._chargingBlasts[blastId];
            } else if(!blast.leftHand.isInScene()
                || !blast.rightHand.isInScene())
            {
                delete this._chargingBlasts[blastId];
                if(this._blast != blast) {
                    ProjectHandler.deleteAsset(blast, true, true);
                    if(blast.chargeAudio) blast.chargeAudio.getAudio().stop();
                }
            } else {
                this._updateBlastPosition(blast);
            }
        }
        for(let blastId in this._firedBlasts) {
            let blast = this._firedBlasts[blastId];
            if(!blast.getObject().parent) {
                delete this._firedBlasts[blastId];
            } else if(!blast.leftHand.isInScene()
                || !blast.rightHand.isInScene())
            {
                delete this._firedBlasts[blastId];
                if(this._blast != blast)
                    ProjectHandler.deleteAsset(blast, true, true);
            } else {
                this._updateFiredBlastPosition(blast);
            }
        }
        this._checkWaveFired();
    }

    static assetId = 'aaef7fd2-fc7c-4c0d-9a5d-ee115a3f2130';
    static assetName = 'Kamehameha System';
}

ProjectHandler.registerAsset(KamehamehaSystem);
